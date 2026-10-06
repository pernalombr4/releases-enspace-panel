import { ITEM_STATUS, RELEASE_STAGE } from '../domain/labels'
import { checkReleasesFile, compareReleases, compareVersions, type Release, type ReleaseItem } from '../domain/model'
import { DEFAULT_PRODUCT, PRODUCTS, PRODUCT_META, isSubProduct, releaseTitle, type Product } from '../domain/products'
import { canonical } from '../domain/vocabulary'
import { buildReleases, normalizeVersion, type BuildResult, type EnspaceSnapshot } from './mapping'
import { PANEL_TIME_ZONE } from './values'

// Junta o que veio do Enspace com o arquivo manual (a "base") e descreve o que
// mudou. Regras (docs/integracao-enspace.md, seção 6):
// - versão nos dois lugares: vale a do Enspace;
// - versão só na base (as releases antigas, por exemplo): continua;
// - versão cancelada no Enspace: sai, mesmo que esteja na base;
// - release de subproduto (Word Plugin, Beni App): continua, porque o Enspace
//   não tem releases de subproduto; os itens dela vêm da release do ENSPACE de
//   origem, pelo produto de cada demanda.
// O arquivo gerado é a entrada do schema (antes dos cálculos do painel), igual
// ao escrito à mão, e passa pela mesma validação de scripts/encrypt-data.ts.

export type ReleaseSource = 'enspace' | 'manual'
export type ReleaseChange = 'added' | 'removed' | 'changed' | 'unchanged'

type JsonObject = Record<string, unknown>

export interface ReleaseComparison {
  product: Product
  version: string
  /** De onde vem a release no resultado; vazio quando ela sai. */
  source?: ReleaseSource
  change: ReleaseChange
  before?: Release
  after?: Release
}

export interface SyncResult {
  /** Conteúdo do arquivo de dados depois da sincronização. */
  file: JsonObject
  /** As releases mudaram em relação à base? Sem mudança, o arquivo fica igual (inclusive o updatedAt). */
  changed: boolean
  build: BuildResult
  comparison: ReleaseComparison[]
}

export class SyncValidationError extends Error {
  constructor(what: string, detail: string) {
    super(`${what} não passou na validação do painel: ${detail}`)
    this.name = 'SyncValidationError'
  }
}

/** Mesmo conteúdo, ignorando a ordem das chaves. */
export function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b))
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortKeys((value as JsonObject)[key])]))
  }
  return value
}

/** "2026-10-03T13:40:00-03:00": a hora de Brasília, no formato do updatedAt escrito à mão. */
export function panelTimestamp(date: Date): string {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: PANEL_TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'longOffset'
  }).formatToParts(date).map(p => [p.type, p.value]))
  const offset = parts.timeZoneName === 'GMT' ? '+00:00' : String(parts.timeZoneName).replace('GMT', '')
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`
}

function releasesOf(file: JsonObject): JsonObject[] {
  return Array.isArray(file.releases) ? file.releases as JsonObject[] : []
}

/** Produto de uma release ainda no formato do arquivo (vazio é ENSPACE). */
function rawProduct(raw: JsonObject): Product {
  const product = raw.product === undefined ? DEFAULT_PRODUCT : canonical('product', raw.product)
  return Object.hasOwn(PRODUCT_META, String(product)) ? product as Product : DEFAULT_PRODUCT
}

/**
 * Sincroniza: monta as releases do Enspace, junta com a base e valida o
 * resultado. Lança SyncValidationError se a base ou o resultado forem
 * inválidos; nesse caso nada deve ser gravado.
 */
export function syncReleases(snapshot: EnspaceSnapshot, base: unknown, now = new Date()): SyncResult {
  const baseFile: JsonObject = base === undefined ? { sample: false, releases: [] } : base as JsonObject
  const baseCheck = checkReleasesFile(baseFile)
  if (!baseCheck.success) throw new SyncValidationError('O arquivo base', baseCheck.error)

  const build = buildReleases(snapshot)
  const fromEnspace = new Set(build.releases.map(r => r.version))
  const hidden = new Set(build.hiddenVersions)

  const merged: { product: Product, version: string, release: JsonObject }[] = [
    ...releasesOf(baseFile)
      .filter((raw) => {
        if (isSubProduct(rawProduct(raw))) return true
        const version = normalizeVersion(String(raw.version))
        return !fromEnspace.has(version) && !hidden.has(version)
      })
      .map(raw => ({ product: rawProduct(raw), version: String(raw.version), release: raw })),
    ...build.releases.map(release => ({ product: DEFAULT_PRODUCT, version: release.version, release: release as unknown as JsonObject }))
  ].sort(compareReleases)

  const releases = merged.map(m => m.release)
  const changed = !sameJson(releasesOf(baseFile), releases)
  const file: JsonObject = {
    sample: false,
    ...baseFile,
    ...(changed ? { updatedAt: panelTimestamp(now) } : {}),
    releases
  }

  const check = checkReleasesFile(file)
  if (!check.success) throw new SyncValidationError('O resultado da sincronização', check.error)

  return { file, changed, build, comparison: compare(baseCheck.data.releases, check.data.releases, releasesOf(baseFile), releases, fromEnspace) }
}

/** Itens iguais (código e status): a release de subproduto muda quando mudam os itens da de origem. */
function sameItems(a: Release, b: Release): boolean {
  const ids = (r: Release) => r.items.map(i => `${i.id}|${i.status}`).sort().join(',')
  return ids(a) === ids(b)
}

function compare(before: Release[], after: Release[], rawBefore: JsonObject[], rawAfter: JsonObject[], fromEnspace: Set<string>): ReleaseComparison[] {
  const key = (product: Product, version: unknown) => `${product}:${normalizeVersion(String(version))}`
  const parsedBefore = new Map(before.map(r => [key(r.product, r.version), r]))
  const parsedAfter = new Map(after.map(r => [key(r.product, r.version), r]))
  const rawB = new Map(rawBefore.map(r => [key(rawProduct(r), r.version), r]))
  const rawA = new Map(rawAfter.map(r => [key(rawProduct(r), r.version), r]))

  return [...new Set([...parsedBefore.keys(), ...parsedAfter.keys()])]
    .map((k): ReleaseComparison => {
      const b = parsedBefore.get(k)
      const a = parsedAfter.get(k)
      const change: ReleaseChange = !b ? 'added' : !a ? 'removed' : sameJson(rawB.get(k), rawA.get(k)) && sameItems(b, a) ? 'unchanged' : 'changed'
      const release = (a ?? b)!
      return {
        product: release.product,
        version: release.version,
        source: a ? (!isSubProduct(a.product) && fromEnspace.has(a.version) ? 'enspace' : 'manual') : undefined,
        change,
        before: b,
        after: a
      }
    })
    // ENSPACE primeiro; em cada produto, da versão mais nova para a mais antiga.
    .sort((x, y) => PRODUCTS.indexOf(x.product) - PRODUCTS.indexOf(y.product) || compareVersions(y.version, x.version))
}

// ---------------------------------------------------------------------------
// Relatório legível (impresso pelo scripts/sync-enspace.ts)

const CHANGE_LABEL: Record<ReleaseChange, string> = {
  added: 'nova',
  removed: 'sai',
  changed: 'alterada',
  unchanged: 'igual'
}

function formatDay(day: string | undefined): string {
  if (!day) return 'sem data'
  const [y, m, d] = day.split('-')
  return `${d}/${m}/${y}`
}

function dateLabel(release: Release | undefined): string {
  if (!release) return '—'
  if (release.releasedAt) return `${formatDay(release.releasedAt)} (saiu)`
  return formatDay(release.targetDate)
}

function stageLabel(release: Release | undefined): string {
  return release ? RELEASE_STAGE[release.stage].label : '—'
}

function postponementLabel(release: Release | undefined): string {
  const p = release?.postponement
  if (!p) return 'não informado'
  if (!p.postponed) return 'data mantida'
  return p.originalDate ? `adiada (data original ${formatDay(p.originalDate)})` : 'adiada'
}

/** "antes → depois", ou só o valor quando não mudou. */
function transition(before: string, after: string, change: ReleaseChange): string {
  if (change === 'added') return after
  if (change === 'removed') return before
  return before === after ? after : `${before} → ${after}`
}

function itemLabel(item: ReleaseItem): string {
  return `${item.id} ${item.title}`
}

function listSome(items: string[], max = 5): string {
  const shown = items.slice(0, max).join('; ')
  return items.length > max ? `${shown}; e mais ${items.length - max}` : shown
}

function table(rows: string[][]): string[] {
  const widths = rows[0]!.map((_, col) => Math.max(...rows.map(row => row[col]!.length)))
  return rows.map(row => row.map((cell, col) => (col === row.length - 1 ? cell : cell.padEnd(widths[col]!))).join('  ').trimEnd())
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

export interface ReportOptions {
  dryRun: boolean
  workspace: string
  /** Caminho do arquivo base, para o relatório. */
  basePath?: string
  /** Caminho de saída (quando não é simulação). */
  outPath?: string
  /** O arquivo de saída foi gravado? */
  written?: boolean
}

/** Relatório da sincronização: o que foi lido, a comparação release a release e os avisos. */
export function formatSyncReport(result: SyncResult, options: ReportOptions): string {
  const { build, comparison } = result
  const s = build.stats
  const count = (change: ReleaseChange) => comparison.filter(c => c.change === change).length
  const lines: string[] = []

  lines.push(options.dryRun
    ? 'Sincronização com o Enspace: simulação, nada foi gravado.'
    : 'Sincronização com o Enspace.')
  lines.push('')
  lines.push(`Lido do Enspace (workspace ${options.workspace}): ${plural(s.releases, 'release', 'releases')}, ${plural(s.demands, 'demanda', 'demandas')}, ${plural(s.requests, 'chamado', 'chamados')}.`)
  lines.push(`  Demandas: ${s.items} em releases, ${s.withoutRelease} sem release, ${plural(s.excluded, 'cancelada ou não reproduzível', 'canceladas ou não reproduzíveis')}, ${s.inCancelledRelease} em release cancelada.`)
  if (build.hiddenVersions.length) lines.push(`  Canceladas no Enspace, fora do painel: ${build.hiddenVersions.join(', ')}.`)
  const baseCount = comparison.filter(c => c.before).length
  lines.push(`Base: ${options.basePath ?? '(nenhuma)'}, ${plural(baseCount, 'release', 'releases')}.`)
  lines.push(`Resultado: ${plural(comparison.filter(c => c.after).length, 'release', 'releases')} (${plural(count('added'), 'nova', 'novas')}, ${plural(count('changed'), 'alterada', 'alteradas')}, ${count('removed')} saindo, ${plural(count('unchanged'), 'igual', 'iguais')}).`)
  lines.push('')

  lines.push(...table([
    ['Versão', 'Origem', 'Mudança', 'Itens', 'Fase', 'Data'],
    ...comparison.map(c => [
      releaseTitle(c).replace(/^Release /, ''),
      c.source === 'enspace' ? 'Enspace' : c.source === 'manual' ? 'manual' : '—',
      CHANGE_LABEL[c.change],
      transition(String(c.before?.items.length ?? 0), String(c.after?.items.length ?? 0), c.change),
      transition(stageLabel(c.before), stageLabel(c.after), c.change),
      transition(dateLabel(c.before), dateLabel(c.after), c.change)
    ])
  ]))

  const details = comparison.filter(c => c.change !== 'unchanged')
  if (details.length) {
    lines.push('', 'Mudanças')
    for (const c of details) lines.push(...describeChange(c))
  }

  if (!options.dryRun) {
    lines.push('')
    lines.push(options.written
      ? `Gravado em ${options.outPath}.`
      : `Sem mudanças: ${options.outPath ?? 'o arquivo'} fica como está.`)
  }

  lines.push('')
  if (build.warnings.length) {
    lines.push(`Avisos (${build.warnings.length})`)
    for (const warning of build.warnings) lines.push(`  - ${warning}`)
  } else {
    lines.push('Nenhum aviso.')
  }
  return lines.join('\n')
}

function describeChange(c: ReleaseComparison): string[] {
  const { before, after } = c
  const name = releaseTitle(c).replace(/^Release /, '')
  if (c.change === 'added') {
    return [`${name}: nova, vinda do Enspace (${plural(after?.items.length ?? 0, 'item', 'itens')}).`]
  }
  if (c.change === 'removed') {
    return [`${name}: sai do painel (cancelada no Enspace).`]
  }
  const origin = isSubProduct(c.product) ? after?.originVersion ?? before?.originVersion : undefined
  const lines = [origin
    ? `${name}: os itens vêm da release ${origin} do ENSPACE, marcados com o produto.`
    : `${name}: ${c.source === 'enspace' ? (before ? 'o Enspace substitui a versão da base' : 'vinda do Enspace') : 'alterada'}.`]
  const beforeItems = new Map((before?.items ?? []).map(i => [i.id, i]))
  const afterItems = new Map((after?.items ?? []).map(i => [i.id, i]))
  const removed = [...beforeItems.values()].filter(i => !afterItems.has(i.id))
  const added = [...afterItems.values()].filter(i => !beforeItems.has(i.id))
  const moved = [...afterItems.values()].flatMap((i) => {
    const old = beforeItems.get(i.id)
    return old && old.status !== i.status ? [`${i.id} ${ITEM_STATUS[old.status].label} → ${ITEM_STATUS[i.status].label}`] : []
  })

  const field = (label: string, b: string, a: string) => {
    if (b !== a) lines.push(`  ${label}: ${b} → ${a}`)
  }
  if (before?.items.length !== after?.items.length || removed.length || added.length) {
    lines.push(`  itens: ${before?.items.length ?? 0} → ${after?.items.length ?? 0} (${plural(removed.length, 'sai', 'saem')}, ${plural(added.length, 'entra', 'entram')})`)
  }
  field('fase', stageLabel(before), stageLabel(after))
  field('data prevista', formatDay(before?.targetDate), formatDay(after?.targetDate))
  field('data em que saiu', formatDay(before?.releasedAt), formatDay(after?.releasedAt))
  field('adiamento', postponementLabel(before), postponementLabel(after))
  field('tipo', before?.type ?? 'pela versão', after?.type ?? 'pela versão')
  field('responsável', before?.owner ?? 'sem responsável', after?.owner ?? 'sem responsável')
  if (removed.length) lines.push(`  saem: ${listSome(removed.map(itemLabel))}`)
  if (added.length) lines.push(`  entram: ${listSome(added.map(itemLabel))}`)
  if (moved.length) lines.push(`  status: ${listSome(moved)}`)
  return lines
}
