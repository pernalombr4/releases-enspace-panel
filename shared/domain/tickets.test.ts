import { describe, expect, it } from 'vitest'
import { ReleaseSchema } from './model'
import { releaseTickets, ticketSearchText } from './tickets'

const item = (id: string, status: string, tickets: unknown[]) => ({
  id, title: `Demanda ${id}`, kind: 'Correção', status, updatedAt: '2026-10-01T10:00:00Z', tickets
})

describe('releaseTickets', () => {
  const release = ReleaseSchema.parse({
    version: '3.2',
    items: [
      item('A', 'ready', [
        { ref: 'CHA0002', title: 'Exportação não baixa', client: 'Cliente Beta' },
        'REQ0001' // só o código, sem cliente: fica fora da lista para as áreas
      ]),
      item('B', 'testing', [
        { ref: 'CHA0001', title: 'Erro ao salvar', client: 'Cliente Alfa' },
        { ref: 'CHA0002', client: 'Cliente Beta' }
      ]),
      item('C', 'postponed', [{ ref: 'CHA0003', title: 'Adiado', client: 'Cliente Gama' }]),
      item('D', 'planned', [{ ref: 'CHA0004', title: 'Sem cliente' }])
    ]
  })

  it('lista só chamados com cliente, das demandas que estão na release', () => {
    expect(releaseTickets(release).map(t => [t.ref, t.client, t.title, t.items.map(i => i.id)])).toEqual([
      ['CHA0001', 'Cliente Alfa', 'Erro ao salvar', ['B']],
      ['CHA0002', 'Cliente Beta', 'Exportação não baixa', ['A', 'B']]
    ])
  })

  it('aceita códigos soltos e deixa referência, título e cliente pesquisáveis', () => {
    const [a] = release.items
    expect(a?.tickets?.[1]).toEqual({ ref: 'REQ0001' })
    expect(ticketSearchText(a!)).toBe('CHA0002 Exportação não baixa Cliente Beta REQ0001')
  })
})
