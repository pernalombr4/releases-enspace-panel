import { PostponementSchema, type Postponement, type Release } from '../domain/model'
import { bool, day, text } from './values'

// Leitura do endpoint de adiamento de releases do Enspace.
//
// O formato do endpoint ainda não foi definido. Esta função aceita as
// variações mais prováveis (lista direta ou em envelope; campos em inglês ou
// português; registro no formato { data: {...} } do Enspace). Quando o endpoint
// existir, ajuste só os nomes em FIELD_ALIASES, se precisar.

const FIELD_ALIASES = {
  version: ['version', 'release', 'versao', 'release_version'],
  postponed: ['postponed', 'is_postponed', 'adiada', 'adiado'],
  status: ['status', 'situacao'],
  originalDate: ['original_target_date', 'original_date', 'previous_date', 'data_original'],
  targetDate: ['new_target_date', 'new_date', 'target_date', 'nova_data'],
  reason: ['postponed_reason', 'reason', 'motivo'],
  announcedAt: ['postponed_at', 'announced_at', 'updated_at']
} as const

/** Só informa adiamento quando o campo "adiada" foi preenchido (sim ou não). */
export function postponementFrom(value: {
  postponed?: boolean
  originalDate?: string
  reason?: string
  announcedAt?: string
}) {
  if (value.postponed === undefined) return undefined
  return {
    postponed: value.postponed,
    originalDate: value.originalDate,
    reason: value.reason,
    // Data de comunicação inválida não deve derrubar a informação de adiamento.
    announcedAt: value.announcedAt && !Number.isNaN(Date.parse(value.announcedAt)) ? value.announcedAt : undefined
  }
}

export interface PostponementUpdate {
  version: string
  postponement: Postponement
  /** Nova data de subida, quando o endpoint informar. */
  targetDate?: string
}

function pick(source: Record<string, unknown>, names: readonly string[]): unknown {
  for (const name of names) {
    if (source[name] !== undefined && source[name] !== null) return source[name]
  }
  return undefined
}

function records(json: unknown): Record<string, unknown>[] {
  const list = Array.isArray(json)
    ? json
    : json && typeof json === 'object'
      ? ['data', 'items', 'results', 'releases'].map(k => (json as Record<string, unknown>)[k]).find(Array.isArray) ?? [json]
      : []
  return (list as unknown[]).filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === 'object')
}

export function parsePostponements(json: unknown): PostponementUpdate[] {
  return records(json).flatMap((record) => {
    const source = { ...record, ...(record.data && typeof record.data === 'object' ? record.data as Record<string, unknown> : {}) }
    const version = text(pick(source, FIELD_ALIASES.version))
    if (!version) return []

    const status = text(pick(source, FIELD_ALIASES.status))?.toLowerCase()
    const postponed = bool(pick(source, FIELD_ALIASES.postponed))
      ?? (status ? /adiad|postpon/.test(status) : undefined)

    const parsed = PostponementSchema.safeParse(postponementFrom({
      postponed,
      originalDate: day(pick(source, FIELD_ALIASES.originalDate)),
      reason: text(pick(source, FIELD_ALIASES.reason)),
      announcedAt: text(pick(source, FIELD_ALIASES.announcedAt))
    }))
    if (!parsed.success) return []

    return [{ version, postponement: parsed.data, targetDate: day(pick(source, FIELD_ALIASES.targetDate)) }]
  })
}

/** Aplica as informações do endpoint por cima dos dados publicados (o endpoint é a fonte mais recente). */
export function applyPostponements(releases: Release[], updates: PostponementUpdate[]): Release[] {
  if (!updates.length) return releases
  const byVersion = new Map(updates.map(u => [u.version, u]))
  // O endpoint fala das releases do ENSPACE; a do subproduto sobe no mesmo dia
  // que a sua release de origem e segue o mesmo adiamento.
  return releases.map((release) => {
    const update = byVersion.get(release.product === 'en-space' ? release.version : release.originVersion ?? '')
    if (!update) return release
    return {
      ...release,
      postponement: update.postponement,
      targetDate: update.targetDate ?? release.targetDate
    }
  })
}
