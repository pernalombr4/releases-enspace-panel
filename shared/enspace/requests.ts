import type { Item } from '@be-enlighten/enspace-sdk-schemas'
import type { Ticket } from '../domain/model'
import { relationLabel, relations, text } from './values'

// Chamados do workspace "produtos" (categoria `chamados`) atendidos pelas
// demandas. A ligação existe nos dois sentidos no Enspace e as duas valem:
//   demanda.chamados_origem   → chamados que originaram a demanda
//   chamado.demandas_geradas  → demandas geradas a partir do chamado
// Só entram chamados com cliente relacionado (campo `cliente`, relação com
// Clientes); o texto livre `cliente_informado` não conta. Do chamado só saem
// referência, título e cliente: relato, anexos, e-mails e notas ficam de fora.

/** Campos da categoria `chamados` (slugs do Enspace). */
export const REQUEST_FIELDS = {
  title: 'titulo',
  client: 'cliente',
  demands: 'demandas_geradas'
} as const

/** Campo da demanda com os chamados de origem. */
export const DEMAND_REQUESTS_FIELD = 'chamados_origem'

type RecordLike = Pick<Item, 'id' | 'reference' | 'data'>

function field(record: RecordLike, name: string): unknown {
  return (record.data as Record<string, unknown> | null | undefined)?.[name]
}

/**
 * Chamados com cliente de cada demanda, indexados pelo id da demanda.
 * `demands` e `requests` são os itens das categorias `demandas` e `chamados`.
 */
export function requestsByDemand(demands: readonly RecordLike[], requests: readonly RecordLike[]): Map<string, Ticket[]> {
  const requestById = new Map(requests.map(r => [String(r.id), r]))
  const links = new Map<string, Set<string>>() // demanda → chamados

  const link = (demandId: unknown, requestId: unknown) => {
    if (demandId === undefined || demandId === null || requestId === undefined || requestId === null) return
    const set = links.get(String(demandId)) ?? new Set<string>()
    set.add(String(requestId))
    links.set(String(demandId), set)
  }

  for (const demand of demands) {
    for (const rel of relations(field(demand, DEMAND_REQUESTS_FIELD))) link(demand.id, rel.id)
  }
  for (const request of requests) {
    for (const rel of relations(field(request, REQUEST_FIELDS.demands))) link(rel.id, request.id)
  }

  const result = new Map<string, Ticket[]>()
  for (const [demandId, ids] of links) {
    const tickets = [...ids].flatMap((id) => {
      const request = requestById.get(id)
      const client = request ? relationLabel(field(request, REQUEST_FIELDS.client)) : undefined
      if (!request || !client) return []
      return [{ ref: request.reference || String(request.id), title: text(field(request, REQUEST_FIELDS.title)), client }]
    })
    if (tickets.length) result.set(demandId, tickets.sort((a, b) => a.ref.localeCompare(b.ref)))
  }
  return result
}
