import { describe, expect, it } from 'vitest'
import { requestsByDemand } from './requests'
import { item, ref, relation } from './testing'

// Registros fictícios no formato da API (GET /ws/types/{slug}/items), já como o SDK entrega.
const requests = [
  item(101, 'CHA00000000000000000000000000001', { titulo: 'Exportação não baixa o arquivo', cliente: relation(1, 'CLIENTE ALFA LTDA', 'CLI00000000000000000000000000A1') }),
  item(102, 'CHA00000000000000000000000000002', {
    titulo: 'Erro ao salvar formulário',
    cliente: [relation(2, 'CLIENTE BETA SA', 'CLI00000000000000000000000000B2')],
    demandas_geradas: [relation(11, 'Demanda 11', ref('DEM', 11))]
  }),
  item(103, 'CHA00000000000000000000000000003', { titulo: 'Sem cliente relacionado', cliente_informado: 'Alguém', demandas_geradas: relation(10, 'Demanda 10', ref('DEM', 10)) }),
  item(104, 'CHA00000000000000000000000000004', { titulo: 'Chamado sem título', cliente: relation(1, 'CLIENTE ALFA LTDA', 'CLI00000000000000000000000000A1') })
]

const demands = [
  item(10, ref('DEM', 10), {
    chamados_origem: [
      relation(101, 'Exportação não baixa o arquivo', 'CHA00000000000000000000000000001'),
      { id: 103 },
      { id: 999, display: 'Chamado apagado' }
    ]
  }),
  item(11, ref('DEM', 11), {}),
  item(12, ref('DEM', 12), { chamados_origem: relation(104, 'Chamado sem título', 'CHA00000000000000000000000000004') })
]

describe('requestsByDemand', () => {
  it('liga pelos dois lados e só traz chamados com cliente relacionado', () => {
    const map = requestsByDemand(demands, requests)
    expect(map.get('10')).toEqual([{ ref: 'CHA00000000000000000000000000001', title: 'Exportação não baixa o arquivo', client: 'CLIENTE ALFA LTDA' }])
    expect(map.get('11')).toEqual([{ ref: 'CHA00000000000000000000000000002', title: 'Erro ao salvar formulário', client: 'CLIENTE BETA SA' }])
    expect(map.get('12')?.[0]?.client).toBe('CLIENTE ALFA LTDA')
  })

  it('não cria entrada para demanda sem chamado de cliente', () => {
    const map = requestsByDemand([item(20, ref('DEM', 20), { chamados_origem: [{ id: 103 }] })], requests)
    expect(map.has('20')).toBe(false)
  })
})
