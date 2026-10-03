/**
 * Sincroniza o arquivo de dados com o Enspace (workspace produtos), pelo SDK oficial.
 *
 *   ENSPACE_API_KEY=... pnpm sync --base ../data/releases.json --out ../data/releases.json
 *   ENSPACE_API_KEY=... pnpm sync --base ../data/releases.json --dry-run
 *   pnpm sync --fixture fixtures/enspace.json --base <arquivo> --dry-run    (sem API nem chave)
 *
 * Lê Releases & Deploys, Demandas e Chamados com as definições de campo,
 * converte pelas regras de docs/integracao-enspace.md, junta com a base (versão
 * nos dois lugares: vale a do Enspace; só na base: continua) e valida com o
 * mesmo schema de scripts/encrypt-data.ts. Com --dry-run, só mostra a
 * comparação. Sem mudanças nas releases, a saída igual à base não é regravada.
 *
 * Variáveis: ENSPACE_API_KEY (obrigatória, menos com --fixture),
 * ENSPACE_API_URL (padrão https://api.leif.enspace.io) e ENSPACE_WORKSPACE
 * (padrão produtos). Sai com código 1 se a leitura ou a validação falharem;
 * nesse caso nada é gravado.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { EnspaceError } from '@be-enlighten/enspace-sdk-core'
import {
  ENSPACE_DEFAULTS,
  IncompleteListError,
  MissingApiKeyError,
  createWorkspaceReader,
  readWorkspace,
  settingsFromEnv,
  type EnspaceSettings
} from '../shared/enspace/client'
import { SyncValidationError, formatSyncReport, syncReleases } from '../shared/enspace/sync'
import { startFakeEnspace, type FakeEnspace, type FixtureFile } from './fake-enspace'

export interface SyncArgs {
  base?: string
  out?: string
  dryRun: boolean
  fixture?: string
}

export class UsageError extends Error {
  constructor(message: string) {
    super(`${message}\nUso: pnpm sync [--base <manual.json>] (--out <saida.json> | --dry-run) [--fixture <enspace.json>]`)
    this.name = 'UsageError'
  }
}

export function parseArgs(argv: string[]): SyncArgs {
  const args: SyncArgs = { dryRun: false }
  const valueOptions = { '--base': 'base', '--out': 'out', '--fixture': 'fixture' } as const
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!
    if (arg === '--') continue
    if (arg === '--dry-run') {
      args.dryRun = true
      continue
    }
    const [name, inline] = arg.split(/=(.*)/s) as [string, string | undefined]
    const key = valueOptions[name as keyof typeof valueOptions]
    if (!key) throw new UsageError(`Opção desconhecida: ${arg}`)
    const value = inline ?? argv[++i]
    if (!value || value.startsWith('--')) throw new UsageError(`${name} precisa de um caminho.`)
    args[key] = value
  }
  if (!args.dryRun && !args.out) throw new UsageError('Informe --out ou use --dry-run.')
  return args
}

export interface Io {
  log(message: string): void
  error(message: string): void
}

/** Mensagem de erro sem detalhes da requisição (que poderiam levar headers). */
function describeError(error: unknown): string {
  if (error instanceof EnspaceError) {
    const hint = error.status === 401 || error.status === 403 ? ' Confira o token em ENSPACE_API_KEY e o workspace.' : ''
    return `Falha ao ler o Enspace: ${error.message} (${error.name}, status ${error.status}).${hint}`
  }
  if (error instanceof IncompleteListError || error instanceof MissingApiKeyError || error instanceof SyncValidationError || error instanceof UsageError) {
    return error.message
  }
  return `Falha inesperada: ${error instanceof Error ? error.message : String(error)}`
}

async function readJson(path: string, what: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    throw new UsageError(`Não foi possível ler ${what} ${path} como JSON: ${(error as Error).message}`)
  }
}

export async function main(argv: string[], env: Record<string, string | undefined>, io: Io = console, now = new Date()): Promise<number> {
  let fake: FakeEnspace | undefined
  try {
    const args = parseArgs(argv)
    const base = args.base ? await readJson(args.base, 'a base') : undefined

    let settings: EnspaceSettings
    if (args.fixture) {
      // Servidor local com o workspace fictício: o SDK roda de verdade, sem rede e sem chave real.
      const workspace = env.ENSPACE_WORKSPACE?.trim() || ENSPACE_DEFAULTS.workspace
      fake = await startFakeEnspace(await readJson(args.fixture, 'o fixture') as FixtureFile, { apiKey: 'fixture', workspace })
      settings = { apiKey: 'fixture', apiUrl: fake.url, workspace }
    } else {
      settings = settingsFromEnv(env)
    }

    const snapshot = await readWorkspace(createWorkspaceReader(settings))
    const result = syncReleases(snapshot, base, now)

    let written = false
    if (!args.dryRun && args.out) {
      const sameFile = args.base !== undefined && resolve(args.out) === resolve(args.base)
      if (result.changed || !sameFile) {
        await mkdir(dirname(resolve(args.out)), { recursive: true })
        await writeFile(args.out, `${JSON.stringify(result.file, null, 2)}\n`)
        written = true
      }
    }

    io.log(formatSyncReport(result, {
      dryRun: args.dryRun,
      workspace: args.fixture ? `${settings.workspace}, fixture ${args.fixture}` : settings.workspace,
      basePath: args.base,
      outPath: args.out,
      written
    }))
    return 0
  } catch (error) {
    io.error(`✖ ${describeError(error)}`)
    return 1
  } finally {
    await fake?.close()
  }
}

const invoked = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : ''
if (import.meta.url === invoked) {
  process.exitCode = await main(process.argv.slice(2), process.env)
}
