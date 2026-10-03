/**
 * Servidor local que imita as rotas de leitura da API do Enspace usadas pela
 * sincronização, a partir de um arquivo como fixtures/enspace.json:
 *
 *   GET /ws/types/{slug}/items?_limit&_start&_sort=id:asc   (no máximo 100 por página)
 *   GET /ws/types/{slug}/items/count
 *   GET /ws/types/{slug}/fields
 *
 * Exige os headers x-api-key e en-workspace, como a API. Serve para rodar o SDK
 * de verdade sem rede: `pnpm sync --fixture` e os testes usam este servidor.
 */
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'

export interface FixtureFile {
  types: Record<string, { fields?: unknown[], items?: { id: number }[] }>
}

export interface FakeEnspaceOptions {
  apiKey: string
  workspace: string
  /** Itens por página que o servidor devolve no máximo, mesmo pedindo mais (a API corta em 100). */
  maxLimit?: number
  /** Soma à contagem, para simular uma lista que a API cortou sem avisar. */
  countDelta?: number
}

export interface FakeEnspace {
  url: string
  /** Requisições recebidas ("GET /ws/types/demandas/items?..."). */
  requests: string[]
  close(): Promise<void>
}

export async function startFakeEnspace(fixture: FixtureFile, options: FakeEnspaceOptions): Promise<FakeEnspace> {
  const requests: string[] = []
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1')
    requests.push(`${req.method} ${url.pathname}${url.search}`)
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json' })
      res.end(JSON.stringify(body))
    }

    if (req.method !== 'GET') return send(405, { message: 'Somente leitura' })
    if (req.headers['x-api-key'] !== options.apiKey) return send(401, { message: 'Unauthorized' })
    if (req.headers['en-workspace'] !== options.workspace) return send(403, { message: 'Workspace inválido' })

    const match = /^\/ws\/types\/([^/]+)\/(items|items\/count|fields)$/.exec(url.pathname)
    const type = match ? fixture.types[decodeURIComponent(match[1]!)] : undefined
    if (!match || !type) return send(404, { message: 'Not Found' })

    const items = [...(type.items ?? [])].sort((a, b) => a.id - b.id)
    if (match[2] === 'fields') return send(200, type.fields ?? [])
    if (match[2] === 'items/count') return send(200, items.length + (options.countDelta ?? 0))

    const limit = Math.min(Number(url.searchParams.get('_limit') ?? 100), options.maxLimit ?? 100)
    const start = Number(url.searchParams.get('_start') ?? 0)
    return send(200, items.slice(start, start + limit))
  })

  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    close: () => new Promise<void>((resolve, reject) => {
      server.closeAllConnections()
      server.close(error => (error ? reject(error) : resolve()))
    })
  }
}
