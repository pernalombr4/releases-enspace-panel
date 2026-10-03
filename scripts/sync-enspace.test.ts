import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { checkReleasesFile } from '../shared/domain/model'
import { startFakeEnspace, type FakeEnspace, type FixtureFile } from './fake-enspace'
import { UsageError, main, parseArgs } from './sync-enspace'

// Ponta a ponta: o SDK de verdade lendo um servidor local com fixtures/enspace.json.
// Nenhuma chamada sai da máquina; a "chave" só existe para o servidor falso.

const FIXTURE = join(import.meta.dirname, '..', 'fixtures', 'enspace.json')
const NOW = new Date('2026-10-03T16:40:00.000Z')

/** Arquivo manual fictício: duas releases antigas, a 3.1 com itens próprios e a 3.2. */
const BASE = {
  sample: false,
  updatedAt: '2026-10-01T10:00:00-03:00',
  releases: [
    { version: '2.15', releasedAt: '2026-06-17' },
    { version: '3.0', releasedAt: '2026-08-25', summary: 'Release antiga, só no arquivo manual.' },
    {
      version: '3.0.3',
      targetDate: '2026-09-25',
      items: [{ id: 'M-1', title: 'Item manual', status: 'planned', updatedAt: '2026-09-20T10:00:00-03:00' }]
    },
    {
      version: '3.1',
      targetDate: '2026-10-06',
      postponement: { postponed: true, originalDate: '2026-09-29' },
      items: [
        { id: '3.1-01', title: 'Item manual A', status: 'ready', updatedAt: '2026-10-01T10:00:00-03:00' },
        { id: '3.1-02', title: 'Item manual B', status: 'ready', updatedAt: '2026-10-01T10:00:00-03:00' }
      ]
    },
    { version: '3.2', targetDate: '2026-10-27', items: [] }
  ]
}

function capture() {
  const out: string[] = []
  const err: string[] = []
  return { io: { log: (m: string) => out.push(m), error: (m: string) => err.push(m) }, out, err }
}

let dir: string
let basePath: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'sync-enspace-'))
  basePath = join(dir, 'releases.json')
  await writeFile(basePath, `${JSON.stringify(BASE, null, 2)}\n`)
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('parseArgs', () => {
  it('lê as opções nas duas grafias e ignora o "--" do pnpm', () => {
    expect(parseArgs(['--', '--base', 'a.json', '--out=b.json'])).toEqual({ base: 'a.json', out: 'b.json', dryRun: false })
    expect(parseArgs(['--dry-run', '--fixture', 'f.json'])).toEqual({ dryRun: true, fixture: 'f.json' })
  })

  it('recusa opção desconhecida, caminho vazio e falta de --out sem --dry-run', () => {
    expect(() => parseArgs(['--dry-run', '--force'])).toThrow(UsageError)
    expect(() => parseArgs(['--base', '--dry-run'])).toThrow('--base precisa de um caminho')
    expect(() => parseArgs(['--base', 'a.json'])).toThrow('Informe --out ou use --dry-run')
  })
})

describe('pnpm sync --fixture (SDK contra o servidor local)', () => {
  it('--dry-run mostra a comparação e não grava nada', async () => {
    const { io, out, err } = capture()
    const code = await main(['--fixture', FIXTURE, '--base', basePath, '--dry-run'], {}, io, NOW)
    expect(err).toEqual([])
    expect(code).toBe(0)
    const report = out.join('\n')
    expect(report).toContain('simulação, nada foi gravado')
    expect(report).toContain('3 releases, 8 demandas, 2 chamados')
    expect(report).toMatch(/3\.1\s+Enspace\s+alterada\s+2 → 1/)
    expect(report).toMatch(/3\.0\.4\s+Enspace\s+nova\s+3/)
    expect(report).toMatch(/3\.0\.3\s+—\s+sai/)
    expect(report).toMatch(/2\.15\s+manual\s+igual/)
    expect(report).toContain('Avisos (2)')
    expect(JSON.parse(await readFile(basePath, 'utf8'))).toEqual(BASE)
  })

  it('grava a saída validada: Enspace vence, só na base continua, cancelada sai', async () => {
    const outPath = join(dir, 'out', 'releases.json')
    const { io, err } = capture()
    expect(await main(['--fixture', FIXTURE, '--base', basePath, '--out', outPath], {}, io, NOW)).toBe(0)
    expect(err).toEqual([])

    const written = JSON.parse(await readFile(outPath, 'utf8'))
    expect(checkReleasesFile(written).success).toBe(true)
    expect(written.updatedAt).toBe('2026-10-03T13:40:00-03:00')
    expect(written.releases.map((r: { version: string }) => r.version)).toEqual(['2.15', '3.0', '3.0.4', '3.1', '3.2'])

    const r31 = written.releases.find((r: { version: string }) => r.version === '3.1')
    expect(r31).toEqual({
      version: '3.1',
      type: 'minor',
      stage: 'planning',
      postponement: { postponed: true },
      milestones: [{ label: 'Abertura do escopo', date: '2026-09-01' }],
      items: [{
        id: 'DEM00000000000000000000000000011',
        title: 'Exportação de relatório em PDF corta a última coluna',
        kind: 'fix',
        status: 'ready',
        priority: 'high',
        audience: 'Todos os clientes',
        origin: 'client',
        clientCount: 1,
        owner: 'Pessoa de Produto',
        tickets: [{ ref: 'CHA00000000000000000000000000031', title: 'PDF corta a última coluna', client: 'CLIENTE ALFA LTDA' }],
        updatedAt: '2026-10-02T19:12:00.000Z'
      }]
    })
    // Texto interno do Enspace nunca chega ao arquivo.
    expect(JSON.stringify(written)).not.toMatch(/Texto interno|Texto do cliente|Alguém por e-mail/)
  })

  it('sem mudanças, não regrava a base', async () => {
    const { io } = capture()
    expect(await main(['--fixture', FIXTURE, '--base', basePath, '--out', basePath], {}, io, NOW)).toBe(0)
    const first = await readFile(basePath, 'utf8')
    const before = await stat(basePath)

    const second = capture()
    expect(await main(['--fixture', FIXTURE, '--base', basePath, '--out', basePath], {}, second.io, new Date('2026-10-04T12:00:00Z'))).toBe(0)
    expect(second.out.join('\n')).toContain('Sem mudanças')
    expect(await readFile(basePath, 'utf8')).toBe(first)
    expect((await stat(basePath)).mtimeMs).toBe(before.mtimeMs)
  })
})

describe('pnpm sync pelas variáveis de ambiente', () => {
  let fake: FakeEnspace | undefined
  const fixture = async () => JSON.parse(await readFile(FIXTURE, 'utf8')) as FixtureFile

  afterEach(async () => {
    await fake?.close()
    fake = undefined
  })

  it('usa ENSPACE_API_URL, ENSPACE_API_KEY e ENSPACE_WORKSPACE', async () => {
    fake = await startFakeEnspace(await fixture(), { apiKey: 'chave-de-teste', workspace: 'produtos' })
    const { io, err } = capture()
    const code = await main(['--base', basePath, '--dry-run'], { ENSPACE_API_URL: fake.url, ENSPACE_API_KEY: 'chave-de-teste' }, io, NOW)
    expect(err).toEqual([])
    expect(code).toBe(0)
    // Uma página, a contagem e as definições de campo de cada categoria.
    expect(fake.requests).toEqual(['releases_deploys', 'demandas', 'chamados'].flatMap(slug => [
      `GET /ws/types/${slug}/items?_limit=100&_start=0&_sort=id:asc`,
      `GET /ws/types/${slug}/items/count`,
      `GET /ws/types/${slug}/fields`
    ]))
  })

  it('falha sem gravar quando a API corta a lista', async () => {
    fake = await startFakeEnspace(await fixture(), { apiKey: 'chave-de-teste', workspace: 'produtos', countDelta: 5 })
    const outPath = join(dir, 'nao-deve-existir.json')
    const { io, err } = capture()
    const code = await main(['--base', basePath, '--out', outPath], { ENSPACE_API_URL: fake.url, ENSPACE_API_KEY: 'chave-de-teste' }, io, NOW)
    expect(code).toBe(1)
    expect(err.join('\n')).toContain('A leitura de releases_deploys veio incompleta: vieram 3 registros, mas a contagem diz 8')
    await expect(stat(outPath)).rejects.toThrow()
  })

  it('falha com token recusado, sem mostrar o token', async () => {
    fake = await startFakeEnspace(await fixture(), { apiKey: 'chave-de-teste', workspace: 'produtos' })
    const { io, err } = capture()
    const code = await main(['--dry-run'], { ENSPACE_API_URL: fake.url, ENSPACE_API_KEY: 'token-errado' }, io, NOW)
    expect(code).toBe(1)
    expect(err.join('\n')).toMatch(/Falha ao ler o Enspace: .*status 401.*ENSPACE_API_KEY/)
    expect(err.join('\n')).not.toContain('token-errado')
  })

  it('falha sem ENSPACE_API_KEY, antes de qualquer chamada', async () => {
    const { io, err } = capture()
    expect(await main(['--dry-run'], {}, io, NOW)).toBe(1)
    expect(err).toEqual(['✖ Defina ENSPACE_API_KEY (token só de leitura do Enspace).'])
  })

  it('falha quando a base é inválida', async () => {
    await writeFile(basePath, JSON.stringify({ releases: [{ version: '3.1' }, { version: '3.1' }] }))
    const { io, err } = capture()
    expect(await main(['--fixture', FIXTURE, '--base', basePath, '--dry-run'], {}, io, NOW)).toBe(1)
    expect(err.join('\n')).toContain('O arquivo base não passou na validação do painel: versões repetidas: 3.1')
  })
})
