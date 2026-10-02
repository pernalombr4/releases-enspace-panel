import {
  ReleaseItemSchema,
  ReleaseSchema,
  compareVersions,
  describeIssues,
  type Link,
  type Milestone,
  type Release
} from '../domain/model'

// Converte os registros da API do Enspace (GET /ws/types/{slug}/items) no modelo
// do painel. Cada registro tem a forma:
//   { id, reference, status, created_at, updated_at, type: {...}, data: { <campo>: valor } }
// Os nomes de campo abaixo são a estrutura sugerida em docs/integracao-enspace.md;
// se os slugs criados no Enspace forem outros, ajuste só estes mapas.

export interface EnspaceRecord {
  id: number | string
  reference?: string | null
  status?: unknown
  created_at?: string
  updated_at?: string
  data?: Record<string, unknown> | null
}

export const RELEASE_FIELDS = {
  version: 'version',
  name: 'name',
  summary: 'summary',
  stage: 'stage',
  health: 'health',
  healthNote: 'health_note',
  targetDate: 'target_date',
  releasedAt: 'released_at',
  owner: 'owner',
  releaseNotesUrl: 'release_notes_url'
} as const

/** Campos de data do Type de release que viram marcos na linha do tempo. */
export const MILESTONE_FIELDS: { field: string, label: string }[] = [
  { field: 'scope_closed_date', label: 'Escopo fechado' },
  { field: 'code_freeze_date', label: 'Code freeze' },
  { field: 'homologation_date', label: 'Início da homologação' },
  { field: 'target_date', label: 'Subida para produção' },
  { field: 'communication_date', label: 'Comunicação aos clientes' }
]

export const ITEM_FIELDS = {
  release: 'release',
  title: 'title',
  summary: 'summary',
  customerImpact: 'customer_impact',
  kind: 'kind',
  module: 'module',
  status: 'status',
  priority: 'priority',
  impact: 'impact',
  requestedBy: 'requested_by',
  owner: 'owner',
  audience: 'audience',
  beta: 'beta',
  needsCommunication: 'needs_communication',
  needsTraining: 'needs_training',
  movedTo: 'moved_to',
  note: 'public_note',
  link: 'link'
} as const

/** Extrai texto de valores simples, selects ({label}), usuários ({name}) e relações. */
export function text(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'string') return value.trim() || undefined
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    const parts = value.map(text).filter((v): v is string => Boolean(v))
    return parts.length ? parts.join(', ') : undefined
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    for (const key of ['label', 'name', 'title', 'value', 'version', 'reference']) {
      const found = text(obj[key])
      if (found) return found
    }
    if (obj.data && typeof obj.data === 'object') return text(obj.data)
  }
  return undefined
}

/** Primeiro valor de uma relação (ex.: o item aponta para uma release). */
function first(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value
}

export function bool(value: unknown): boolean | undefined {
  if (value === null || value === undefined || value === '') return undefined
  if (typeof value === 'boolean') return value
  const t = text(value)?.toLowerCase()
  if (t === undefined) return undefined
  return ['true', '1', 'sim', 'yes', 's', 'y'].includes(t)
}

/** Aceita "2026-10-30", "2026-10-30T00:00:00Z" ou "30/10/2026". */
export function day(value: unknown): string | undefined {
  const t = text(value)
  if (!t) return undefined
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(t)
  if (iso) return iso[1]
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(t)
  if (br) return `${br[3]}-${br[2]}-${br[1]}`
  return undefined
}

function link(value: unknown, label: string): Link[] | undefined {
  const url = text(value)
  return url && /^https?:\/\//.test(url) ? [{ label, url }] : undefined
}

function field(record: EnspaceRecord, name: string): unknown {
  return record.data?.[name]
}

function recordLabel(record: EnspaceRecord): string {
  return record.reference ? `${record.reference}` : `#${record.id}`
}

export function mapItem(record: EnspaceRecord): { version?: string, input: unknown } {
  const f = ITEM_FIELDS
  const get = (name: string) => field(record, name)
  return {
    version: text(first(get(f.release))),
    input: {
      id: record.reference || String(record.id),
      title: text(get(f.title)),
      summary: text(get(f.summary)),
      customerImpact: text(get(f.customerImpact)),
      kind: text(get(f.kind)) ?? 'feature',
      module: text(get(f.module)),
      // O status pode ser um campo próprio ou o status do fluxo do registro.
      status: text(get(f.status)) ?? text(record.status),
      priority: text(get(f.priority)),
      impact: text(get(f.impact)),
      requestedBy: text(get(f.requestedBy)),
      owner: text(get(f.owner)),
      audience: text(get(f.audience)),
      beta: bool(get(f.beta)),
      needsCommunication: bool(get(f.needsCommunication)),
      needsTraining: bool(get(f.needsTraining)),
      movedTo: text(first(get(f.movedTo))),
      note: text(get(f.note)),
      links: link(get(f.link), 'Abrir no Enspace'),
      updatedAt: record.updated_at ?? record.created_at ?? new Date(0).toISOString()
    }
  }
}

export function mapRelease(record: EnspaceRecord): unknown {
  const f = RELEASE_FIELDS
  const get = (name: string) => field(record, name)
  const milestones: Milestone[] = MILESTONE_FIELDS.flatMap(({ field: name, label }) => {
    const date = day(get(name))
    return date ? [{ label, date }] : []
  })
  return {
    version: text(get(f.version)),
    name: text(get(f.name)),
    summary: text(get(f.summary)),
    stage: text(get(f.stage)) ?? text(record.status) ?? 'planning',
    health: text(get(f.health)),
    healthNote: text(get(f.healthNote)),
    targetDate: day(get(f.targetDate)),
    releasedAt: day(get(f.releasedAt)),
    owner: text(get(f.owner)),
    milestones,
    links: link(get(f.releaseNotesUrl), 'Release notes'),
    items: []
  }
}

/**
 * Monta as releases a partir dos registros dos dois Types. Registros inválidos
 * são ignorados e reportados em `warnings`, para um item mal preenchido não
 * derrubar o painel inteiro.
 */
export function buildReleases(
  releaseRecords: EnspaceRecord[],
  itemRecords: EnspaceRecord[]
): { releases: Release[], warnings: string[] } {
  const warnings: string[] = []
  const byVersion = new Map<string, Release>()

  for (const record of releaseRecords) {
    const parsed = ReleaseSchema.safeParse(mapRelease(record))
    if (!parsed.success) {
      warnings.push(`Release ${recordLabel(record)}: ${describeIssues(parsed.error)}`)
      continue
    }
    byVersion.set(parsed.data.version, parsed.data)
  }

  for (const record of itemRecords) {
    const { version, input } = mapItem(record)
    if (!version) {
      warnings.push(`Item ${recordLabel(record)}: sem release associada`)
      continue
    }
    const parsed = ReleaseItemSchema.safeParse(input)
    if (!parsed.success) {
      warnings.push(`Item ${recordLabel(record)}: ${describeIssues(parsed.error)}`)
      continue
    }
    let release = byVersion.get(version)
    if (!release) {
      // Item aponta para uma versão ainda não cadastrada: cria uma release mínima.
      release = ReleaseSchema.parse({ version, stage: 'planning' })
      byVersion.set(version, release)
    }
    release.items.push(parsed.data)
  }

  const releases = [...byVersion.values()].sort((a, b) => compareVersions(a.version, b.version))
  return { releases, warnings }
}
