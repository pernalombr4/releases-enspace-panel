import { createSharedComposable } from '@vueuse/core'
import { decryptJson, deriveKey, exportKey, importKey, type EncryptedFile } from '#shared/domain/crypto'

const STORAGE_KEY = 'releases-enspace-panel:key'

interface StoredKey {
  salt: string
  iterations: number
  key: string
}

function read(): StoredKey | null {
  for (const storage of [localStorage, sessionStorage]) {
    try {
      const raw = storage.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw) as StoredKey
    } catch {
      // armazenamento indisponível (aba anônima, bloqueio)
    }
  }
  return null
}

function write(value: StoredKey, remember: boolean) {
  clear()
  try {
    (remember ? localStorage : sessionStorage).setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // sem armazenamento: a chave vale só enquanto a página estiver aberta
  }
}

function clear() {
  for (const storage of [localStorage, sessionStorage]) {
    try {
      storage.removeItem(STORAGE_KEY)
    } catch {
      // ignora
    }
  }
}

/**
 * Chave de leitura dos dados. A senha nunca é guardada: só a chave derivada,
 * no navegador da pessoa (localStorage com "lembrar", sessionStorage sem).
 */
const _usePanelKey = () => {
  const key = shallowRef<CryptoKey | null>(null)
  const salt = ref<string | null>(null)
  const restored = ref(false)

  async function restore() {
    if (restored.value) return
    restored.value = true
    const stored = read()
    if (!stored) return
    try {
      key.value = await importKey(stored.key)
      salt.value = stored.salt
    } catch {
      clear()
    }
  }

  /** Valida a senha contra o arquivo publicado e guarda a chave. Lança `WrongKeyError`. */
  async function unlock(password: string, file: EncryptedFile, remember: boolean) {
    const derived = await deriveKey(password, file.salt, file.iterations, true)
    await decryptJson(file, derived)
    const raw = await exportKey(derived)
    write({ salt: file.salt, iterations: file.iterations, key: raw }, remember)
    key.value = await importKey(raw)
    salt.value = file.salt
  }

  function lock() {
    clear()
    key.value = null
    salt.value = null
  }

  return { key, salt, restore, unlock, lock }
}

export const usePanelKey = createSharedComposable(_usePanelKey)
