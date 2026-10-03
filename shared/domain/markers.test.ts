import { describe, expect, it } from 'vitest'
import { hasMarker, itemMarkers } from './markers'
import { ReleaseItemSchema } from './model'

const item = (over: Record<string, unknown>) => ReleaseItemSchema.parse({
  id: 'A',
  title: 'Item',
  kind: 'Melhoria',
  status: 'Planejado',
  updatedAt: '2026-10-01T10:00:00Z',
  ...over
})

describe('itemMarkers', () => {
  it('não mostra nada para um item sem marcadores', () => {
    expect(itemMarkers(item({}))).toEqual([])
  })

  it('mostra risco primeiro e ajusta os rótulos ao caso', () => {
    const markers = itemMarkers(item({ origin: 'Cliente', clientCount: 3, atRisk: true, tickets: ['REQ1', 'REQ2'], beta: true }))
    expect(markers.map(m => [m.key, m.label])).toEqual([
      ['atRisk', 'Em risco'],
      ['client', 'Pedido de 3 clientes'],
      ['beta', 'Beta'],
      ['tickets', '2 solicitações']
    ])
  })

  it('considera pedido de cliente pela origem ou pela contagem', () => {
    expect(hasMarker(item({ origin: 'client' }), 'client')).toBe(true)
    expect(hasMarker(item({ clientCount: 1 }), 'client')).toBe(true)
    expect(hasMarker(item({ origin: 'Interna' }), 'client')).toBe(false)
    expect(itemMarkers(item({ origin: 'client', tickets: ['REQ1'] })).map(m => m.label)).toEqual(['Pedido de cliente', 'Solicitação'])
  })
})
