import type { UiColor } from './labels'
import type { ReleaseItem } from './model'
import { hasClient } from './tickets'

// Marcadores dos itens: avisos curtos que aparecem como selos no card, na lista
// e no detalhe, e que servem de filtro na página de itens.

export const MARKER_KEYS = ['atRisk', 'client', 'communication', 'training', 'beta', 'tickets'] as const
export type MarkerKey = (typeof MARKER_KEYS)[number]

interface MarkerMeta {
  /** Rótulo do filtro e do guia. */
  label: string
  description: string
  icon: string
  color: UiColor
}

export const MARKER_META: Record<MarkerKey, MarkerMeta> = {
  atRisk: {
    label: 'Em risco',
    description: 'Pode não entrar nesta release. O motivo aparece no detalhe do item.',
    icon: 'i-lucide-triangle-alert',
    color: 'warning'
  },
  client: {
    label: 'Pedido de cliente',
    description: 'Nasceu de um pedido de cliente. CS e Comercial podem avisar quem pediu.',
    icon: 'i-lucide-handshake',
    color: 'info'
  },
  communication: {
    label: 'Comunicação',
    description: 'Pede comunicação a clientes (Marketing e CS).',
    icon: 'i-lucide-megaphone',
    color: 'neutral'
  },
  training: {
    label: 'Treinamento',
    description: 'Pede treinamento interno (CS, Suporte e Implantação).',
    icon: 'i-lucide-graduation-cap',
    color: 'neutral'
  },
  beta: {
    label: 'Beta',
    description: 'Sai em beta, para um grupo restrito.',
    icon: 'i-lucide-flask-conical',
    color: 'neutral'
  },
  tickets: {
    label: 'Chamado vinculado',
    description: 'Atende chamados (ou solicitações). Referência, título e cliente aparecem no detalhe do item e em "Para as áreas"; entram na busca.',
    icon: 'i-lucide-ticket',
    color: 'neutral'
  }
}

export function hasMarker(item: ReleaseItem, key: MarkerKey): boolean {
  switch (key) {
    case 'atRisk': return item.atRisk === true
    case 'client': return item.origin === 'client' || clientCount(item) > 0
    case 'communication': return item.needsCommunication === true
    case 'training': return item.needsTraining === true
    case 'beta': return item.beta === true
    case 'tickets': return (item.tickets?.length ?? 0) > 0
  }
}

/** Clientes que pediram: o número informado ou, sem ele, os clientes distintos dos chamados. */
function clientCount(item: ReleaseItem): number {
  return item.clientCount ?? new Set((item.tickets ?? []).filter(hasClient).map(t => t.client)).size
}

export interface ItemMarker extends MarkerMeta {
  key: MarkerKey
}

/** Marcadores do item, com rótulo ajustado ao caso ("Pedido de 3 clientes", "2 solicitações"). */
export function itemMarkers(item: ReleaseItem): ItemMarker[] {
  return MARKER_KEYS.filter(key => hasMarker(item, key)).map((key) => {
    const meta = { key, ...MARKER_META[key] }
    if (key === 'client' && clientCount(item) > 1) return { ...meta, label: `Pedido de ${clientCount(item)} clientes` }
    if (key === 'tickets') {
      const n = item.tickets?.length ?? 0
      return { ...meta, label: n === 1 ? 'Chamado' : `${n} chamados` }
    }
    return meta
  })
}
