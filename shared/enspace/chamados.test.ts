import { describe, expect, it } from 'vitest'
import { chamadosByDemanda, relationLabel } from './chamados'
import { buildReleases, type EnspaceRecord } from './mapping'

// Registros fictícios no formato da API (GET /ws/types/{slug}/items).
const cliente = (nome: string, ref: string) => ({ id: 1, display: `${nome} (${ref})`, reference: ref })

const chamados: EnspaceRecord[] = [
  { id: 101, reference: 'CHA00000000000000000000000000001', data: { titulo: 'Exportação não baixa o arquivo', cliente: cliente('CLIENTE ALFA LTDA', 'CLI0000000000000000000000000000A1') } },
  { id: 102, reference: 'CHA00000000000000000000000000002', data: { titulo: 'Erro ao salvar formulário', cliente: cliente('CLIENTE BETA SA', 'CLI0000000000000000000000000000B2'), demandas_geradas: [{ id: 11, display: 'Demanda 11', reference: 'DEM11' }] } },
  { id: 103, reference: 'CHA00000000000000000000000000003', data: { titulo: 'Sem cliente relacionado', cliente_informado: 'Alguém' } }
]

const demandas: EnspaceRecord[] = [
  { id: 10, reference: 'DEM10', data: { chamados_origem: [{ id: 101, display: 'Exportação não baixa o arquivo (CHA…1)', reference: 'CHA00000000000000000000000000001' }, { id: 103 }] } },
  { id: 11, reference: 'DEM11', data: {} }
]

describe('relationLabel', () => {
  it('tira a referência que o Enspace anexa ao nome', () => {
    expect(relationLabel(cliente('CLIENTE ALFA LTDA', 'CLI0000000000000000000000000000A1'))).toBe('CLIENTE ALFA LTDA')
    expect(relationLabel([{ display: 'Nome sem referência' }])).toBe('Nome sem referência')
    expect(relationLabel(null)).toBeUndefined()
  })
})

describe('chamadosByDemanda', () => {
  it('liga pelos dois lados e só traz chamados com cliente', () => {
    const map = chamadosByDemanda(demandas, chamados)
    expect(map.get('10')).toEqual([{ ref: 'CHA00000000000000000000000000001', title: 'Exportação não baixa o arquivo', client: 'CLIENTE ALFA LTDA' }])
    expect(map.get('11')).toEqual([{ ref: 'CHA00000000000000000000000000002', title: 'Erro ao salvar formulário', client: 'CLIENTE BETA SA' }])
  })

  it('chega aos itens montados pelo buildReleases', () => {
    const items = demandas.map((d, i) => ({ ...d, updated_at: '2026-10-01T10:00:00Z', data: { ...d.data, release: '3.2', title: `Demanda ${i}`, status: 'Planejado' } }))
    const { releases } = buildReleases([], items, chamados)
    expect(releases[0]?.items.map(i => i.tickets?.map(t => t.client))).toEqual([['CLIENTE ALFA LTDA'], ['CLIENTE BETA SA']])
  })
})
