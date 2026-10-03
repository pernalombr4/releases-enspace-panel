import { createEnspace } from '@be-enlighten/enspace-sdk-core'
import type { Field, Item } from '@be-enlighten/enspace-sdk-schemas'
import type { EnspaceSnapshot } from './mapping'

// Acesso ao Enspace, sempre pelo SDK oficial (@be-enlighten/enspace-sdk-core):
// autenticação por API key, erros tipados e nova tentativa automática em 5xx,
// 429 e falha de rede. A sincronização só lê.

export const ENSPACE_DEFAULTS = {
  apiUrl: 'https://api.leif.enspace.io',
  workspace: 'produtos'
} as const

/** Slugs das categorias lidas no workspace (dados do Enspace, por isso em português). */
export const CATEGORY_SLUGS = {
  releases: 'releases_deploys',
  demands: 'demandas',
  requests: 'chamados'
} as const

/** Máximo que a API aceita por página. */
export const PAGE_SIZE = 100

export interface EnspaceSettings {
  apiKey: string
  apiUrl: string
  workspace: string
}

export class MissingApiKeyError extends Error {
  constructor() {
    super('Defina ENSPACE_API_KEY (token só de leitura do Enspace).')
    this.name = 'MissingApiKeyError'
  }
}

/** Configuração a partir das variáveis de ambiente (ENSPACE_API_KEY obrigatória). */
export function settingsFromEnv(env: Record<string, string | undefined>): EnspaceSettings {
  const apiKey = env.ENSPACE_API_KEY?.trim()
  if (!apiKey) throw new MissingApiKeyError()
  return {
    apiKey,
    apiUrl: env.ENSPACE_API_URL?.trim() || ENSPACE_DEFAULTS.apiUrl,
    workspace: env.ENSPACE_WORKSPACE?.trim() || ENSPACE_DEFAULTS.workspace
  }
}

/** O pedaço do SDK que a sincronização usa: um `TypeScope` do SDK já cumpre esta interface. */
export interface CategoryReader {
  items: {
    list(query: { _limit: number, _start: number, _sort: string }): Promise<Item[]>
    count(): Promise<unknown>
  }
  fields: {
    list(): Promise<Field[]>
  }
}

export interface WorkspaceReader {
  category(slug: string): CategoryReader
}

/** Leitor do workspace pelo SDK. */
export function createWorkspaceReader(settings: EnspaceSettings): WorkspaceReader {
  const enspace = createEnspace({
    baseUrl: settings.apiUrl,
    auth: { type: 'api-key', key: settings.apiKey },
    retry: { maxAttempts: 4, backoff: 'exponential', baseDelayMs: 1000, retryMethods: 'idempotent' },
    timeoutMs: 30_000
  })
  const workspace = enspace.workspaces.workspace(settings.workspace)
  return { category: slug => workspace.types.type(slug) }
}

export class IncompleteListError extends Error {
  constructor(slug: string, detail: string) {
    super(`A leitura de ${slug} veio incompleta: ${detail}. Nada foi gravado.`)
    this.name = 'IncompleteListError'
  }
}

/** O SDK tipa count() como número, mas outras rotas do Enspace devolvem { count }. */
function countValue(slug: string, value: unknown): number {
  const n = typeof value === 'object' && value !== null ? (value as { count?: unknown }).count : value
  const parsed = typeof n === 'string' ? Number(n) : n
  if (typeof parsed !== 'number' || !Number.isInteger(parsed) || parsed < 0) {
    throw new IncompleteListError(slug, `a contagem veio num formato inesperado (${JSON.stringify(value)})`)
  }
  return parsed
}

/**
 * Todos os itens de uma categoria, em páginas de `pageSize` ordenadas por id,
 * até vir uma página curta. No fim compara com items.count(): a API corta
 * listas sem avisar, e uma leitura incompleta apagaria itens do painel.
 */
export async function listAll(reader: CategoryReader, slug: string, pageSize = PAGE_SIZE): Promise<Item[]> {
  const items: Item[] = []
  const seen = new Set<string>()
  for (let start = 0; ; start += pageSize) {
    const page = await reader.items.list({ _limit: pageSize, _start: start, _sort: 'id:asc' })
    if (!Array.isArray(page)) throw new IncompleteListError(slug, 'a página não veio como lista')
    for (const item of page) {
      const id = String(item.id)
      if (seen.has(id)) throw new IncompleteListError(slug, `o registro ${item.reference || id} veio em duas páginas`)
      seen.add(id)
      items.push(item)
    }
    if (page.length < pageSize) break
  }
  const total = countValue(slug, await reader.items.count())
  if (total !== items.length) {
    throw new IncompleteListError(slug, `vieram ${items.length} registros, mas a contagem diz ${total}`)
  }
  return items
}

/** Lê as três categorias e as definições de campo, uma chamada de cada vez. */
export async function readWorkspace(reader: WorkspaceReader): Promise<EnspaceSnapshot> {
  const read = async (slug: string) => {
    const category = reader.category(slug)
    const items = await listAll(category, slug)
    const fields = await category.fields.list()
    return { items, fields: Array.isArray(fields) ? fields : [] }
  }
  return {
    releases: await read(CATEGORY_SLUGS.releases),
    demands: await read(CATEGORY_SLUGS.demands),
    requests: await read(CATEGORY_SLUGS.requests)
  }
}
