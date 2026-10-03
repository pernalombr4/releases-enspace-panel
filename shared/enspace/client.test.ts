import type { Field, Item } from '@be-enlighten/enspace-sdk-schemas'
import { describe, expect, it } from 'vitest'
import {
  CATEGORY_SLUGS,
  ENSPACE_DEFAULTS,
  IncompleteListError,
  MissingApiKeyError,
  listAll,
  readWorkspace,
  settingsFromEnv,
  type CategoryReader
} from './client'
import { item, plainField, ref } from './testing'

/** Categoria falsa que pagina como a API: `maxLimit` imita o corte silencioso. */
function fakeCategory(items: Item[], options: { maxLimit?: number, count?: unknown, ignoreStart?: boolean, fields?: Field[] } = {}) {
  const calls: { _limit: number, _start: number, _sort: string }[] = []
  const reader: CategoryReader = {
    items: {
      async list(query) {
        calls.push(query)
        const limit = Math.min(query._limit, options.maxLimit ?? Infinity)
        const start = options.ignoreStart ? 0 : query._start
        return [...items].sort((a, b) => a.id - b.id).slice(start, start + limit)
      },
      async count() {
        return options.count ?? items.length
      }
    },
    fields: { list: async () => options.fields ?? [] }
  }
  return { reader, calls }
}

const many = (n: number) => Array.from({ length: n }, (_, i) => item(i + 1, ref('DEM', i + 1), {}))

describe('settingsFromEnv', () => {
  it('exige ENSPACE_API_KEY e usa os padrões para o resto', () => {
    expect(() => settingsFromEnv({})).toThrow(MissingApiKeyError)
    expect(() => settingsFromEnv({ ENSPACE_API_KEY: '  ' })).toThrow(MissingApiKeyError)
    expect(settingsFromEnv({ ENSPACE_API_KEY: 'k' })).toEqual({ apiKey: 'k', apiUrl: ENSPACE_DEFAULTS.apiUrl, workspace: 'produtos' })
    expect(settingsFromEnv({ ENSPACE_API_KEY: 'k', ENSPACE_API_URL: 'http://127.0.0.1:9', ENSPACE_WORKSPACE: 'outro' }))
      .toEqual({ apiKey: 'k', apiUrl: 'http://127.0.0.1:9', workspace: 'outro' })
  })
})

describe('listAll', () => {
  it('pagina de 100 em 100, ordenado por id, até a página curta', async () => {
    const { reader, calls } = fakeCategory(many(250))
    const items = await listAll(reader, 'demandas')
    expect(items).toHaveLength(250)
    expect(calls).toEqual([
      { _limit: 100, _start: 0, _sort: 'id:asc' },
      { _limit: 100, _start: 100, _sort: 'id:asc' },
      { _limit: 100, _start: 200, _sort: 'id:asc' }
    ])
  })

  it('com múltiplo exato de 100, pede uma página vazia no fim', async () => {
    const { reader, calls } = fakeCategory(many(200))
    expect(await listAll(reader, 'demandas')).toHaveLength(200)
    expect(calls).toHaveLength(3)
  })

  it('falha quando a API corta a página sem avisar', async () => {
    const { reader } = fakeCategory(many(150), { maxLimit: 50 })
    await expect(listAll(reader, 'demandas')).rejects.toThrow(new IncompleteListError('demandas', 'vieram 50 registros, mas a contagem diz 150'))
  })

  it('falha quando a contagem não bate', async () => {
    const { reader } = fakeCategory(many(3), { count: 4 })
    await expect(listAll(reader, 'chamados')).rejects.toThrow('vieram 3 registros, mas a contagem diz 4')
  })

  it('falha quando a paginação repete registros', async () => {
    const { reader } = fakeCategory(many(150), { ignoreStart: true })
    await expect(listAll(reader, 'demandas')).rejects.toThrow('veio em duas páginas')
  })

  it('aceita a contagem como número ou { count }', async () => {
    expect(await listAll(fakeCategory(many(2), { count: { count: 2 } }).reader, 'x')).toHaveLength(2)
    await expect(listAll(fakeCategory(many(2), { count: 'muitos' }).reader, 'x')).rejects.toThrow('formato inesperado')
  })
})

describe('readWorkspace', () => {
  it('lê as três categorias com as definições de campo', async () => {
    const categories: Record<string, ReturnType<typeof fakeCategory>> = {
      [CATEGORY_SLUGS.releases]: fakeCategory([item(1, ref('REL', 1), { versao: '3.1.0' })], { fields: [plainField('versao')] }),
      [CATEGORY_SLUGS.demands]: fakeCategory(many(120)),
      [CATEGORY_SLUGS.requests]: fakeCategory([])
    }
    const snapshot = await readWorkspace({ category: slug => categories[slug]!.reader })
    expect(snapshot.releases.items).toHaveLength(1)
    expect(snapshot.releases.fields.map(f => f.refId)).toEqual(['versao'])
    expect(snapshot.demands.items).toHaveLength(120)
    expect(snapshot.requests).toEqual({ items: [], fields: [] })
  })
})
