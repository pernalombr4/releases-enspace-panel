import type { Ticket } from '../domain/model'
import type { EnspaceRecord } from './mapping'

// Chamados do workspace "produtos" (Type `chamados`) atendidos pelas demandas.
// A ligação existe nos dois sentidos no Enspace e as duas valem:
//   demanda.chamados_origem   → chamados que originaram a demanda
//   chamado.demandas_geradas  → demandas geradas a partir do chamado
// Só entram chamados com cliente relacionado (campo `cliente`, relação com Clientes).

export const CHAMADO_FIELDS = {
  title: 'titulo',
  client: 'cliente',
  demandas: 'demandas_geradas'
} as const

/** Campo da demanda com os chamados de origem. */
export const DEMANDA_CHAMADOS_FIELD = 'chamados_origem'

interface Relation {
  id?: number | string
  display?: string
  reference?: string
}

function relations(value: unknown): Relation[] {
  if (!value) return []
  const list = Array.isArray(value) ? value : [value]
  return list.filter((v): v is Relation => typeof v === 'object' && v !== null)
}

/**
 * Nome exibido de uma relação, sem a referência que o Enspace anexa no fim:
 * "CLIENTE EXEMPLO LTDA (CLI0A1B2C)" → "CLIENTE EXEMPLO LTDA".
 */
export function relationLabel(value: unknown): string | undefined {
  const [first] = relations(value)
  const display = first?.display?.trim()
  if (!display) return undefined
  const ref = first?.reference
  const cleaned = ref ? display.replace(new RegExp(`\\s*\\(${ref}\\)$`), '') : display.replace(/\s*\([A-Z]{3}[0-9A-F]{8,}\)$/, '')
  return cleaned.trim() || undefined
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

/**
 * Chamados com cliente de cada demanda, indexados pelo id da demanda.
 * `demandas` e `chamados` são registros crus de GET /ws/types/{slug}/items.
 */
export function chamadosByDemanda(demandas: EnspaceRecord[], chamados: EnspaceRecord[]): Map<string, Ticket[]> {
  const chamadoById = new Map(chamados.map(c => [String(c.id), c]))
  const links = new Map<string, Set<string>>() // demanda → chamados

  const link = (demandaId: unknown, chamadoId: unknown) => {
    if (demandaId === undefined || chamadoId === undefined) return
    const set = links.get(String(demandaId)) ?? new Set<string>()
    set.add(String(chamadoId))
    links.set(String(demandaId), set)
  }

  for (const demanda of demandas) {
    for (const rel of relations(demanda.data?.[DEMANDA_CHAMADOS_FIELD])) link(demanda.id, rel.id)
  }
  for (const chamado of chamados) {
    for (const rel of relations(chamado.data?.[CHAMADO_FIELDS.demandas])) link(rel.id, chamado.id)
  }

  const result = new Map<string, Ticket[]>()
  for (const [demandaId, ids] of links) {
    const tickets = [...ids].flatMap((id) => {
      const chamado = chamadoById.get(id)
      const client = chamado ? relationLabel(chamado.data?.[CHAMADO_FIELDS.client]) : undefined
      if (!chamado || !client) return []
      return [{ ref: chamado.reference || String(chamado.id), title: text(chamado.data?.[CHAMADO_FIELDS.title]), client }]
    })
    if (tickets.length) result.set(demandaId, tickets.sort((a, b) => a.ref.localeCompare(b.ref)))
  }
  return result
}
