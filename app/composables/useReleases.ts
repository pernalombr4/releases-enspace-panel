import { createSharedComposable, useDocumentVisibility, useIntervalFn } from '@vueuse/core'
import { WrongKeyError, decryptJson, isEncryptedFile, type EncryptedFile } from '#shared/domain/crypto'
import { changedItemIds, defaultRelease } from '#shared/domain/metrics'
import { ReleasesFileSchema, compareReleases, describeIssues, type ReleasesFile } from '#shared/domain/model'
import type { Product } from '#shared/domain/products'
import { applyPostponements, parsePostponements, type PostponementUpdate } from '#shared/enspace/postponement'

export interface LoadError {
  message: string
  detail?: string
}

const HIGHLIGHT_MS = 10_000

/**
 * Busca o arquivo criptografado, decifra com a chave da sessão e mantém
 * atualizado: consulta a cada `refreshSeconds`, pausa com a aba em segundo
 * plano e atualiza ao voltar. Em falha, mantém os últimos dados na tela.
 */
const _useReleases = () => {
  const config = useRuntimeConfig()
  const { key, lock } = usePanelKey()
  const route = useRoute()

  const file = shallowRef<EncryptedFile | null>(null)
  const data = shallowRef<ReleasesFile | null>(null)
  const error = ref<LoadError | null>(null)
  const loading = ref(false)
  const fetchedAt = ref<string | null>(null)
  const changed = ref<Set<string>>(new Set())
  const postponements = shallowRef<PostponementUpdate[]>([])

  const url = `${config.app.baseURL}${config.public.dataUrl}`

  async function fetchFile(): Promise<EncryptedFile> {
    const json = await $fetch<unknown>(url, { query: { t: Date.now() }, cache: 'no-store', responseType: 'json' })
    if (!isEncryptedFile(json)) throw new Error('O arquivo de dados não está no formato esperado.')
    return json
  }

  async function decrypt(encrypted: EncryptedFile) {
    if (!key.value) return
    const parsed = ReleasesFileSchema.safeParse(await decryptJson(encrypted, key.value))
    if (!parsed.success) {
      error.value = { message: 'Os dados publicados têm campos inválidos.', detail: describeIssues(parsed.error) }
      return
    }
    const next = { ...parsed.data, releases: [...parsed.data.releases].sort(compareReleases) }
    if (data.value) {
      const diff = changedItemIds(data.value.releases, next.releases)
      if (diff.size) changed.value = diff
    }
    data.value = next
    error.value = null
  }

  /**
   * Endpoint de adiamento do Enspace (opcional, NUXT_PUBLIC_POSTPONEMENT_URL).
   * Quando configurado, sobrepõe o "adiada ou não" publicado no arquivo.
   * Uma falha aqui não interrompe o painel: fica valendo o último dado.
   */
  async function refreshPostponements() {
    const endpoint = config.public.postponementUrl
    if (!endpoint) return
    try {
      postponements.value = parsePostponements(await $fetch<unknown>(endpoint, { query: { t: Date.now() }, cache: 'no-store' }))
    } catch (err) {
      console.warn('Não foi possível ler o endpoint de adiamento das releases.', err)
    }
  }

  async function refresh() {
    if (loading.value) return
    loading.value = true
    void refreshPostponements()
    try {
      const encrypted = await fetchFile()
      fetchedAt.value = new Date().toISOString()
      const isNew = encrypted.publishedAt !== file.value?.publishedAt || encrypted.iv !== file.value?.iv
      file.value = encrypted
      if (isNew || !data.value) await decrypt(encrypted)
    } catch (err) {
      if (err instanceof WrongKeyError) {
        // A senha mudou: a chave lembrada não abre mais os dados.
        lock()
        data.value = null
        await navigateTo({ path: '/entrar', query: { next: route.fullPath, motivo: 'senha' } })
        return
      }
      error.value = { message: 'Não foi possível atualizar os dados.', detail: err instanceof Error ? err.message : undefined }
    } finally {
      loading.value = false
    }
  }

  const visibility = useDocumentVisibility()
  useIntervalFn(() => {
    if (visibility.value === 'visible' && key.value) void refresh()
  }, config.public.refreshSeconds * 1000)

  watch(visibility, (state) => {
    const stale = !fetchedAt.value || Date.now() - Date.parse(fetchedAt.value) > config.public.refreshSeconds * 500
    if (state === 'visible' && key.value && stale) void refresh()
  })

  // immediate: ao recarregar a página, a chave já vem restaurada antes daqui.
  watch(key, (value) => {
    if (value) void refresh()
    else data.value = null
  }, { immediate: true })

  watch(changed, (value) => {
    if (value.size) setTimeout(() => (changed.value = new Set()), HIGHLIGHT_MS)
  })

  const releases = computed(() => applyPostponements(data.value?.releases ?? [], postponements.value))
  /** Próxima release do ENSPACE. */
  const nextRelease = computed(() => defaultRelease(releases.value))
  /** Próxima release de um produto (a última, se todas já saíram). */
  const nextOf = (product: Product) => defaultRelease(releases.value, product)

  return { file, data, releases, nextRelease, nextOf, error, loading, fetchedAt, changed, refresh, fetchFile }
}

export const useReleases = createSharedComposable(_useReleases)
