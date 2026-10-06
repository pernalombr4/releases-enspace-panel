import type { Field, Item } from '@be-enlighten/enspace-sdk-schemas'
import {
  ReleaseItemSchema,
  ReleaseSchema,
  compareVersions,
  describeIssues,
  type Milestone,
  type Postponement,
  type ReleaseItem
} from '../domain/model'
import { isSubProduct, type Product } from '../domain/products'
import type { ItemKind, ItemOrigin, ItemStatus, Level, ReleaseHealth, ReleaseStage, ReleaseType } from '../domain/vocabulary'
import { describeChoice, isOneOf, matchRule, optionCatalog, type Choice, type OptionCatalog, type OptionRule } from './options'
import { requestsByDemand } from './requests'
import { count, day, relationLabel, relations, text, timestamp, type Relation } from './values'

// Converte as categorias do workspace "produtos" no formato do arquivo de dados
// do painel, seguindo docs/integracao-enspace.md (repositório de dados),
// seções 2 e 3. Os slugs de campo e os rótulos de opção são do Enspace, por
// isso ficam em português; o resto do código usa nomes em inglês.

/** Campos de Releases & Deploys (`releases_deploys`). */
export const RELEASE_FIELDS = {
  version: 'versao',
  type: 'tipo',
  status: 'status',
  targetDate: 'data_hora',
  deployedAt: 'data_deploy_real',
  deployConfirmed: 'deploy_confirmado',
  owner: 'responsavel',
  // Sugeridos na seção 5 da documentação. Lidos só quando existirem; até lá o
  // adiamento sai sem data original nem motivo. `motivo_adiamento` ("O que
  // aconteceu no deploy") é texto interno e nunca vai para o painel.
  originalDate: 'data_original',
  publicReason: 'motivo_publico'
} as const

/** Datas de Releases & Deploys que viram marcos da linha do tempo, nesta ordem. */
export const MILESTONE_FIELDS = [
  { field: 'data_abertura_escopo', label: 'Abertura do escopo' },
  { field: 'reuniao_data', label: 'Reunião de escopo' },
  { field: 'data_limite_resp', label: 'Prazo dos responsáveis' },
  { field: RELEASE_FIELDS.targetDate, label: 'Subida para produção' }
] as const

/** Campos de Demandas (`demandas`). Nada além destes é lido. */
export const DEMAND_FIELDS = {
  release: 'release_rel',
  title: 'titulo',
  kind: 'tipo',
  status: 'status',
  releaseState: 'release_estado',
  devStatus: 'dev_situacao',
  priority: 'prioridade',
  audience: 'alcance',
  origin: 'origem',
  clientCount: 'clientes_solicitantes_n',
  atRisk: 'risco_release',
  owner: 'responsavel_produto_rel',
  // Produto da demanda (lista "Produtos Enlighten", a mesma dos Chamados).
  product: 'produto',
  // Sugeridos na seção 5 ("O que é, para as áreas" e "O que muda para o
  // cliente"). Lidos só quando existirem; sem eles o painel mostra só o título.
  summary: 'resumo_areas',
  customerImpact: 'impacto_cliente'
} as const

interface ReleaseStatusEffect {
  stage?: ReleaseStage
  health?: ReleaseHealth
  /** Concluída: as demandas da release contam como liberadas. */
  completed?: boolean
  /** Cancelada: a release não aparece no painel. */
  hidden?: boolean
}

/** Status da release → fase (seção 2). */
export const RELEASE_STATUS_RULES: readonly OptionRule<ReleaseStatusEffect>[] = [
  { result: { stage: 'planning' }, labels: ['Planejada', 'Montagem do escopo', 'Escopo em discussão'], values: ['montagem_escopo'] },
  { result: { stage: 'development' }, labels: ['Distribuição de responsáveis', 'Em desenvolvimento'] },
  { result: { stage: 'testing' }, labels: ['Em homologação'] },
  { result: { stage: 'released', completed: true }, labels: ['Concluída'] },
  { result: { stage: 'testing', health: 'delayed' }, labels: ['Deploy falhou'] },
  { result: { hidden: true }, labels: ['Cancelada'] }
]

export const RELEASE_TYPE_RULES: readonly OptionRule<ReleaseType>[] = [
  { result: 'major', labels: ['Major'] },
  { result: 'minor', labels: ['Minor'] },
  // Hotfix aparece como patch no calendário.
  { result: 'patch', labels: ['Patch', 'Hotfix'] }
]

type DeployOutcome = 'deployed' | 'postponed' | 'failed'

/** "O deploy subiu?" (`deploy_confirmado`). */
export const DEPLOY_RULES: readonly OptionRule<DeployOutcome>[] = [
  { result: 'deployed', labels: ['Subiu'], values: ['sim'] },
  { result: 'postponed', labels: ['Não subiu — foi adiado'], values: ['adiado'] },
  // Sem regra de adiamento na documentação: o painel não afirma nada.
  { result: 'failed', labels: ['Falhou', 'Deploy falhou'], values: ['falhou'] }
]

/** Demandas com estes status não entram no painel. */
export const EXCLUDED_DEMAND_STATUSES = ['Cancelado', 'Não reproduzível', 'cancelado', 'nao_reproduzivel'] as const

/** Status da demanda → status do item, depois das regras de release_estado e dev_situacao. */
export const DEMAND_STATUS_RULES: readonly OptionRule<ItemStatus>[] = [
  { result: 'blocked', labels: ['Bloqueado'], values: ['bloqueado'] },
  { result: 'ready', labels: ['Validada em teste', 'Concluído'], values: ['validada_teste', 'concluido'] },
  { result: 'testing', labels: ['Liberada para teste', 'Em revisão'], values: ['liberada_teste', 'em_revisao'] },
  { result: 'in_progress', labels: ['Em progresso'], values: ['em_progresso'] },
  // "Pronto" em Demandas é pronta para desenvolver (refinada), não para subir.
  { result: 'planned', labels: ['Backlog', 'Pronto'], values: ['backlog', 'pronto'] }
]

/** Situação da demanda na release (`release_estado`). */
export const RELEASE_STATE = {
  postponed: ['Removida do escopo', 'Não subiu — decidir destino'],
  released: ['Entregue na release'],
  atRisk: ['Em risco']
} as const

/** Situação dos desenvolvimentos da demanda (`dev_situacao`). */
export const DEV_STATUS = {
  released: ['Tudo em produção'],
  blocked: ['Tem item bloqueado']
} as const

export const KIND_RULES: readonly OptionRule<ItemKind>[] = [
  { result: 'fix', labels: ['Bug'] },
  { result: 'improvement', labels: ['Melhoria', 'Dívida técnica'], values: ['divida_tecnica'] },
  { result: 'innovation', labels: ['Nova funcionalidade', 'Automação'], values: ['nova_funcionalidade', 'solicitacao_automacao'] }
]

export const PRIORITY_RULES: readonly OptionRule<Level>[] = [
  { result: 'high', labels: ['Crítica', 'Urgente', 'Alta'], values: ['critica', 'urgente', 'alta'] },
  { result: 'medium', labels: ['Média'], values: ['media'] },
  { result: 'low', labels: ['Baixa'], values: ['baixa'] }
]

export const ORIGIN_RULES: readonly OptionRule<ItemOrigin>[] = [
  { result: 'client', labels: ['Cliente', 'Pedido de cliente', 'Externa', 'Externo'] },
  { result: 'internal', labels: ['Interna', 'Interno', 'Time interno', 'Produto'] }
]

/**
 * Produto da demanda → subproduto do item (seção 3). O item de Word Plugin ou
 * Beni App continua na release do ENSPACE e também aparece na release do
 * subproduto que sai com ela. Vazio ou ENSPACE: item do ENSPACE. O Beni App
 * ainda não é opção no workspace (seção 5): a regra pelo rótulo vale quando for.
 */
export const PRODUCT_RULES: readonly OptionRule<Product>[] = [
  { result: 'en-space', labels: ['ENSPACE'], values: ['en-space'] },
  { result: 'word-plugin', labels: ['Plugin Word', 'Word Plugin', 'Plugin para Word'], values: ['en-ms-plugin'] },
  { result: 'beni-app', labels: ['Beni App', 'App do Beni'] }
]

/** "Risco para a release?" = Sim. */
export const AT_RISK_YES = ['Sim', 'sim', 'true'] as const

/** Público "A definir" fica vazio. */
export const AUDIENCE_UNDEFINED = ['A definir'] as const

/** Release no formato do arquivo de dados (entrada do schema, antes dos cálculos do painel). */
export interface SyncedRelease {
  version: string
  type?: ReleaseType
  /** Fase que o status da release indica; o painel mostra a mais avançada entre esta e a das demandas. */
  stage?: ReleaseStage
  health?: ReleaseHealth
  targetDate?: string
  releasedAt?: string
  postponement?: Postponement
  owner?: string
  milestones?: Milestone[]
  items: ReleaseItem[]
}

export interface CategoryData {
  items: readonly Item[]
  fields: readonly Field[]
}

/** O que a sincronização lê do workspace. */
export interface EnspaceSnapshot {
  releases: CategoryData
  demands: CategoryData
  requests: CategoryData
}

export interface BuildStats {
  releases: number
  demands: number
  requests: number
  /** Demandas que entraram em alguma release. */
  items: number
  /** Demandas sem `release_rel`. */
  withoutRelease: number
  /** Demandas canceladas ou não reproduzíveis. */
  excluded: number
  /** Demandas ligadas a releases canceladas. */
  inCancelledRelease: number
}

export interface BuildResult {
  releases: SyncedRelease[]
  /** Versões canceladas no Enspace: saem do painel mesmo se estiverem no arquivo manual. */
  hiddenVersions: string[]
  warnings: string[]
  stats: BuildStats
}

/** "3.1.0" → "3.1" (o .0 final sai, para casar com o histórico); "3.0.4" fica igual. */
export function normalizeVersion(raw: string): string {
  const version = raw.trim().replace(/^v(?=\d)/i, '')
  return /^\d+\.\d+\.0$/.test(version) ? version.slice(0, -2) : version
}

/** "[KIS] Ajuste no filtro" → "Ajuste no filtro". */
export function stripClientPrefix(title: string): string {
  return title.replace(/^(?:\s*\[[^\]]*\]\s*)+(?:[-–—:]\s*)?/, '').trim()
}

/** Status do item pela tabela da seção 3 (vale a primeira regra que bater). */
export function demandStatus(input: {
  status?: Choice
  releaseState?: Choice
  devStatus?: Choice
  /** A release da demanda está Concluída. */
  releaseCompleted?: boolean
}): { status: ItemStatus, matched: boolean } {
  const { status, releaseState, devStatus } = input
  if (isOneOf(releaseState, RELEASE_STATE.postponed)) return { status: 'postponed', matched: true }
  if (isOneOf(releaseState, RELEASE_STATE.released) || isOneOf(devStatus, DEV_STATUS.released) || input.releaseCompleted) {
    return { status: 'released', matched: true }
  }
  if (isOneOf(devStatus, DEV_STATUS.blocked)) return { status: 'blocked', matched: true }
  if (!status) return { status: 'planned', matched: true }
  const rule = matchRule(status, DEMAND_STATUS_RULES)
  return rule ? { status: rule.result, matched: true } : { status: 'planned', matched: false }
}

/** Avisos agrupados por mensagem, com as referências dos registros afetados. */
class WarningLog {
  private readonly entries = new Map<string, Set<string>>()

  add(message: string, ref?: string) {
    const refs = this.entries.get(message) ?? new Set<string>()
    if (ref) refs.add(ref)
    this.entries.set(message, refs)
  }

  list(): string[] {
    return [...this.entries].map(([message, refs]) => {
      if (!refs.size) return message
      const shown = [...refs].slice(0, 3).join(', ')
      const more = refs.size > 3 ? ` e mais ${refs.size - 3}` : ''
      return `${message} (${refs.size === 1 ? '1 registro' : `${refs.size} registros`}: ${shown}${more})`
    })
  }
}

type DataRecord = Pick<Item, 'id' | 'reference' | 'data' | 'updated_at' | 'created_at'>

function data(record: Pick<Item, 'data'>): Record<string, unknown> {
  return record.data && typeof record.data === 'object' ? record.data as Record<string, unknown> : {}
}

function refOf(record: Pick<Item, 'id' | 'reference'>): string {
  return record.reference || `#${record.id}`
}

/** Remove chaves vazias, para o arquivo gerado ficar igual ao escrito à mão. */
function compact<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T
}

/** Lê seleções de uma categoria, avisando sobre valores fora das opções do campo. */
class ChoiceReader {
  private readonly catalog: OptionCatalog

  constructor(fields: readonly Field[], private readonly category: string, private readonly warnings: WarningLog) {
    this.catalog = optionCatalog(fields)
  }

  one(record: DataRecord, refId: string): Choice | undefined {
    const { choices, unknown } = this.catalog.choices(refId, data(record)[refId])
    if (!choices.length) return undefined
    if (!this.catalog.hasField(refId)) {
      this.warnings.add(`${this.category}: o campo ${refId} não veio nas definições de campo; as regras usam só o valor`, refOf(record))
    } else {
      for (const choice of unknown) {
        this.warnings.add(`${this.category}: o valor ${describeChoice(choice)} do campo ${refId} não está entre as opções do campo`, refOf(record))
      }
    }
    if (choices.length > 1) this.warnings.add(`${this.category}: o campo ${refId} tem mais de uma opção marcada; vale a primeira`, refOf(record))
    return choices[0]
  }

  /** Seleção que precisa de regra: sem regra, avisa e devolve undefined. */
  mapped<T>(record: DataRecord, refId: string, rules: readonly OptionRule<T>[], fallback: string): T | undefined {
    const choice = this.one(record, refId)
    if (!choice) return undefined
    const rule = matchRule(choice, rules)
    if (!rule) this.warnings.add(`${this.category}: ${refId} ${describeChoice(choice)} sem regra no painel; ${fallback}`, refOf(record))
    return rule?.result
  }
}

interface ReleaseSlot {
  release: SyncedRelease
  completed: boolean
}

/**
 * Monta as releases do painel a partir das três categorias. Registros com
 * valores desconhecidos entram com o que der para ler e geram aviso; só um
 * registro que o schema do painel recusa fica de fora (também com aviso).
 */
export function buildReleases(snapshot: EnspaceSnapshot): BuildResult {
  const warnings = new WarningLog()
  const stats: BuildStats = {
    releases: snapshot.releases.items.length,
    demands: snapshot.demands.items.length,
    requests: snapshot.requests.items.length,
    items: 0,
    withoutRelease: 0,
    excluded: 0,
    inCancelledRelease: 0
  }

  // 1. Releases
  const releaseChoices = new ChoiceReader(snapshot.releases.fields, 'Releases & Deploys', warnings)
  const byVersion = new Map<string, ReleaseSlot>()
  const byRecord = new Map<string, ReleaseSlot>()
  const cancelledRecords = new Set<string>()
  const cancelledVersions = new Set<string>()

  for (const record of [...snapshot.releases.items].sort((a, b) => a.id - b.id)) {
    const fields = data(record)
    const rawVersion = text(fields[RELEASE_FIELDS.version])
    if (!rawVersion) {
      warnings.add('Releases & Deploys: registro sem versao; fica fora do painel', refOf(record))
      continue
    }
    const version = normalizeVersion(rawVersion)
    const effect = releaseChoices.mapped(record, RELEASE_FIELDS.status, RELEASE_STATUS_RULES, 'a fase vem só das demandas') ?? {}
    if (effect.hidden) {
      cancelledRecords.add(String(record.id))
      if (record.reference) cancelledRecords.add(record.reference)
      cancelledVersions.add(version)
      continue
    }

    const existing = byVersion.get(version)
    if (existing) {
      warnings.add(`Releases & Deploys: a versão ${version} aparece em mais de um registro; valem os dados do primeiro e as demandas de todos`, refOf(record))
      byRecord.set(String(record.id), existing)
      if (record.reference) byRecord.set(record.reference, existing)
      continue
    }

    const targetDate = day(fields[RELEASE_FIELDS.targetDate])
    const deploy = releaseChoices.mapped(record, RELEASE_FIELDS.deployConfirmed, DEPLOY_RULES, 'o painel não informa adiamento')
    const postponement: Postponement | undefined = deploy === 'deployed'
      ? { postponed: false }
      : deploy === 'postponed'
        ? compact({ postponed: true, originalDate: day(fields[RELEASE_FIELDS.originalDate]), reason: text(fields[RELEASE_FIELDS.publicReason]) })
        : undefined
    const milestones: Milestone[] = MILESTONE_FIELDS.flatMap(({ field, label }) => {
      const date = day(fields[field])
      return date ? [{ label, date }] : []
    })

    const release: SyncedRelease = compact({
      version,
      type: releaseChoices.mapped(record, RELEASE_FIELDS.type, RELEASE_TYPE_RULES, 'o tipo vem da versão'),
      stage: effect.stage,
      health: effect.health,
      targetDate,
      releasedAt: deploy === 'deployed' ? day(fields[RELEASE_FIELDS.deployedAt]) ?? targetDate : undefined,
      postponement,
      owner: relationLabel(fields[RELEASE_FIELDS.owner]),
      milestones: milestones.length ? milestones : undefined,
      items: []
    })
    const slot = { release, completed: effect.completed === true }
    byVersion.set(version, slot)
    byRecord.set(String(record.id), slot)
    if (record.reference) byRecord.set(record.reference, slot)
  }

  // 2. Demandas
  const demandChoices = new ChoiceReader(snapshot.demands.fields, 'Demandas', warnings)
  const tickets = requestsByDemand(snapshot.demands.items, snapshot.requests.items)

  for (const record of [...snapshot.demands.items].sort((a, b) => a.id - b.id)) {
    const links = relations(data(record)[DEMAND_FIELDS.release])
    const [link] = links
    if (!link) {
      stats.withoutRelease += 1
      continue
    }
    const status = demandChoices.one(record, DEMAND_FIELDS.status)
    if (isOneOf(status, EXCLUDED_DEMAND_STATUSES)) {
      stats.excluded += 1
      continue
    }
    if (links.length > 1) warnings.add('Demandas: ligada a mais de uma release; vale a primeira', refOf(record))

    const slot = findRelease(byRecord, link)
    if (!slot) {
      if (isCancelled(cancelledRecords, link)) {
        stats.inCancelledRelease += 1
      } else {
        warnings.add(`Demandas: release_rel aponta para "${link.display ?? link.reference ?? link.id}", que não está em Releases & Deploys; a demanda fica fora`, refOf(record))
      }
      continue
    }

    const item = mapDemand(record, { status, slot, choices: demandChoices, warnings, tickets: tickets.get(String(record.id)) })
    const parsed = ReleaseItemSchema.safeParse(item)
    if (!parsed.success) {
      warnings.add(`Demandas: registro recusado pelo painel: ${describeIssues(parsed.error)}`, refOf(record))
      continue
    }
    slot.release.items.push(item)
    stats.items += 1
  }

  // 3. Cada release é validada já com as suas demandas.
  const releases = [...byVersion.values()].flatMap(({ release }) => {
    const parsed = ReleaseSchema.safeParse(release)
    if (parsed.success) return [release]
    warnings.add(`Releases & Deploys: a versão ${release.version} foi recusada pelo painel: ${describeIssues(parsed.error)}`)
    return []
  }).sort((a, b) => compareVersions(a.version, b.version))

  return {
    releases,
    hiddenVersions: [...cancelledVersions].filter(v => !byVersion.has(v)).sort(compareVersions),
    warnings: warnings.list(),
    stats
  }
}

function findRelease(byRecord: Map<string, ReleaseSlot>, link: Relation): ReleaseSlot | undefined {
  return (link.id !== undefined ? byRecord.get(String(link.id)) : undefined)
    ?? (link.reference ? byRecord.get(link.reference) : undefined)
}

function isCancelled(cancelled: Set<string>, link: Relation): boolean {
  return (link.id !== undefined && cancelled.has(String(link.id))) || (link.reference !== undefined && cancelled.has(link.reference))
}

function mapDemand(record: DataRecord, context: {
  status?: Choice
  slot: ReleaseSlot
  choices: ChoiceReader
  warnings: WarningLog
  tickets?: ReleaseItem['tickets']
}): ReleaseItem {
  const { choices, warnings } = context
  const fields = data(record)
  const ref = refOf(record)

  const rawTitle = text(fields[DEMAND_FIELDS.title])
  const title = rawTitle ? stripClientPrefix(rawTitle) : ''
  if (!title) warnings.add('Demandas: sem titulo; o painel mostra a referência', ref)

  const releaseState = choices.one(record, DEMAND_FIELDS.releaseState)
  const devStatus = choices.one(record, DEMAND_FIELDS.devStatus)
  const { status, matched } = demandStatus({
    status: context.status,
    releaseState,
    devStatus,
    releaseCompleted: context.slot.completed
  })
  if (!matched && context.status) {
    warnings.add(`Demandas: status ${describeChoice(context.status)} sem regra no painel; conta como Planejado`, ref)
  }

  const rawRisk = fields[DEMAND_FIELDS.atRisk]
  const riskFlag = typeof rawRisk === 'boolean' ? rawRisk : isOneOf(choices.one(record, DEMAND_FIELDS.atRisk), AT_RISK_YES)
  const audience = choices.one(record, DEMAND_FIELDS.audience)
  const product = choices.mapped(record, DEMAND_FIELDS.product, PRODUCT_RULES, 'conta como item do ENSPACE')

  return compact({
    id: record.reference || String(record.id),
    title: title || record.reference || String(record.id),
    kind: choices.mapped(record, DEMAND_FIELDS.kind, KIND_RULES, 'fica sem classificação'),
    status,
    product: product && isSubProduct(product) ? product : undefined,
    summary: text(fields[DEMAND_FIELDS.summary]),
    customerImpact: text(fields[DEMAND_FIELDS.customerImpact]),
    priority: choices.mapped(record, DEMAND_FIELDS.priority, PRIORITY_RULES, 'fica sem prioridade'),
    audience: audience && !isOneOf(audience, AUDIENCE_UNDEFINED) ? audience.label : undefined,
    origin: choices.mapped(record, DEMAND_FIELDS.origin, ORIGIN_RULES, 'fica sem origem'),
    clientCount: count(fields[DEMAND_FIELDS.clientCount]),
    atRisk: riskFlag || isOneOf(releaseState, RELEASE_STATE.atRisk) ? true : undefined,
    owner: relationLabel(fields[DEMAND_FIELDS.owner]),
    tickets: context.tickets,
    updatedAt: timestamp(record.updated_at) ?? timestamp(record.created_at) ?? new Date(0).toISOString()
  })
}
