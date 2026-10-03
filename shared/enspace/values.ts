// Leitores dos valores que a API do Enspace devolve em `item.data`.
//
// Pelo SDK (@be-enlighten/enspace-sdk-core), toda string com cara de data ISO
// chega como `Date`, inclusive as datas sem hora ("2026-10-06" vira meia-noite
// UTC). Por isso os leitores de data aceitam `Date` e string. Relações chegam
// como `{ id, display, reference }` (um objeto ou uma lista) e seleções chegam
// pelo valor da opção, não pelo rótulo (ver options.ts).

/** Fuso usado para saber em que dia cai uma data com hora. */
export const PANEL_TIME_ZONE = 'America/Sao_Paulo'

const dayInPanelZone = new Intl.DateTimeFormat('en-CA', {
  timeZone: PANEL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

export interface Relation {
  id?: number | string
  display?: string
  reference?: string
}

function isRelation(value: unknown): value is Relation {
  return typeof value === 'object' && value !== null && !(value instanceof Date) && !Array.isArray(value)
}

/** Relações de um campo, sempre como lista (o Enspace manda um objeto ou uma lista). */
export function relations(value: unknown): Relation[] {
  if (value === null || value === undefined || value === '') return []
  const list = Array.isArray(value) ? value : [value]
  return list.filter(isRelation)
}

/**
 * Nome exibido de uma relação, sem a referência que o Enspace anexa no fim:
 * "CLIENTE EXEMPLO LTDA (CLI0A1B2C)" → "CLIENTE EXEMPLO LTDA".
 */
export function relationLabel(value: unknown): string | undefined {
  const [first] = relations(value)
  const display = first?.display?.trim()
  if (!display) return undefined
  const ref = first?.reference?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const cleaned = ref
    ? display.replace(new RegExp(`\\s*\\(${ref}\\)$`), '')
    : display.replace(/\s*\([A-Z]{3}[0-9A-F]{8,}\)$/, '')
  return cleaned.trim() || undefined
}

/** Extrai texto de valores simples, selects ({label}), usuários ({name}) e relações. */
export function text(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'string') return value.trim() || undefined
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value.toISOString()
  if (Array.isArray(value)) {
    const parts = value.map(text).filter((v): v is string => Boolean(v))
    return parts.length ? parts.join(', ') : undefined
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    for (const key of ['label', 'display', 'name', 'title', 'value', 'version', 'reference']) {
      const found = text(obj[key])
      if (found) return found
    }
    if (obj.data && typeof obj.data === 'object') return text(obj.data)
  }
  return undefined
}

export function bool(value: unknown): boolean | undefined {
  if (value === null || value === undefined || value === '') return undefined
  if (typeof value === 'boolean') return value
  const t = text(value)?.toLowerCase()
  if (t === undefined) return undefined
  return ['true', '1', 'sim', 'yes', 's', 'y'].includes(t)
}

/** Inteiro maior ou igual a zero (aceita número ou texto numérico). */
export function count(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN
  return Number.isInteger(n) && n >= 0 ? n : undefined
}

/**
 * Dia (AAAA-MM-DD) de uma data do Enspace.
 *
 * - Data sem hora ("2026-10-30", ou o `Date` que o SDK faz dela: meia-noite
 *   UTC) é o próprio dia.
 * - Data com hora vale o dia no horário de Brasília: um deploy às 22h de
 *   30/10 (01:00Z do dia 31) é do dia 30.
 * - Também aceita "30/10/2026".
 *
 * Uma string e o `Date` que o SDK faz dela dão sempre o mesmo dia.
 */
export function day(value: unknown): string | undefined {
  if (value instanceof Date) return dayOfDate(value)
  const t = text(value)
  if (!t) return undefined
  const dateOnly = /^(\d{4}-\d{2}-\d{2})$/.exec(t)
  if (dateOnly) return dateOnly[1]
  // Com fuso (Z ou ±hh:mm): o instante decide o dia, igual ao Date do SDK.
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}.*(?:Z|[+-]\d{2}:?\d{2})$/.test(t)) return dayOfDate(new Date(t))
  // Sem fuso: hora local de quem preencheu, vale o dia escrito.
  const local = /^(\d{4}-\d{2}-\d{2})[T ]\d{2}:\d{2}/.exec(t)
  if (local) return local[1]
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(t)
  if (br) return `${br[3]}-${br[2]}-${br[1]}`
  return undefined
}

function dayOfDate(date: Date): string | undefined {
  if (Number.isNaN(date.getTime())) return undefined
  const iso = date.toISOString()
  // Meia-noite UTC exata: é como o SDK entrega uma data sem hora.
  if (iso.endsWith('T00:00:00.000Z')) return iso.slice(0, 10)
  return dayInPanelZone.format(date)
}

/** Data e hora em ISO 8601 (o SDK entrega `Date`; o arquivo do painel guarda texto). */
export function timestamp(value: unknown): string | undefined {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value.toISOString()
  if (typeof value === 'string' && value.trim() && !Number.isNaN(Date.parse(value))) return value.trim()
  return undefined
}

const CONNECTIVES = new Set(['a', 'o', 'e', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas', 'para', 'foi'])

/**
 * Forma comparável de um rótulo ou valor de opção: minúsculas, sem acentos,
 * pontuação vira espaço e conectivos (de, do, em, para…) saem.
 * "Montagem do escopo", "montagem_escopo" e "MONTAGEM DE ESCOPO" ficam iguais;
 * "Não subiu — foi adiado" vira "nao subiu adiado".
 */
export function normalizeLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(word => word && !CONNECTIVES.has(word))
    .join(' ')
}
