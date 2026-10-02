import { describe, expect, it } from 'vitest'
import { buildReleases, day, text, type EnspaceRecord } from './mapping'

describe('text', () => {
  it('extrai rótulos de selects, usuários e relações', () => {
    expect(text({ label: 'Em testes', value: 'testing' })).toBe('Em testes')
    expect(text({ id: 9, name: 'Ana' })).toBe('Ana')
    expect(text([{ id: 1, data: { version: '3.1' } }])).toBe('3.1')
    expect(text('  ')).toBeUndefined()
  })
})

describe('day', () => {
  it('normaliza formatos de data', () => {
    expect(day('2026-10-30T03:00:00.000Z')).toBe('2026-10-30')
    expect(day('30/10/2026')).toBe('2026-10-30')
    expect(day('amanhã')).toBeUndefined()
  })
})

describe('buildReleases', () => {
  const releaseRecord: EnspaceRecord = {
    id: 10,
    reference: 'REL-3.1',
    status: 'Em desenvolvimento',
    updated_at: '2026-10-01T10:00:00Z',
    data: {
      version: '3.1',
      name: 'Dashboards',
      target_date: '2026-10-30',
      code_freeze_date: '2026-10-16'
    }
  }

  const itemRecord = (over: Partial<EnspaceRecord> & { data: Record<string, unknown> }): EnspaceRecord => ({
    id: 1,
    reference: 'ENS-1',
    status: 'Planejado',
    updated_at: '2026-10-02T10:00:00Z',
    ...over
  })

  it('agrupa itens na release e usa o status do registro como padrão', () => {
    const { releases, warnings } = buildReleases(
      [releaseRecord],
      [
        itemRecord({ data: { release: [{ id: 10, data: { version: '3.1' } }], title: 'Widgets', kind: 'Melhoria' } }),
        itemRecord({
          id: 2,
          reference: 'ENS-2',
          data: { release: '3.1', title: 'SSO', status: { label: 'Bloqueado' }, needs_communication: 'Sim' }
        })
      ]
    )

    expect(warnings).toEqual([])
    expect(releases).toHaveLength(1)
    const [r] = releases
    expect(r?.stage).toBe('development')
    expect(r?.milestones.map(m => m.label)).toEqual(['Code freeze', 'Subida para produção'])
    expect(r?.items.map(i => [i.id, i.status, i.kind])).toEqual([
      ['ENS-1', 'planned', 'improvement'],
      ['ENS-2', 'blocked', 'feature']
    ])
    expect(r?.items[1]?.needsCommunication).toBe(true)
  })

  it('cria release mínima para versão não cadastrada e reporta registros inválidos', () => {
    const { releases, warnings } = buildReleases(
      [],
      [
        itemRecord({ data: { release: '3.2', title: 'Novo' } }),
        itemRecord({ id: 3, reference: 'ENS-3', data: { title: 'Sem release' } }),
        itemRecord({ id: 4, reference: 'ENS-4', status: 'xyz', data: { release: '3.2', title: 'Status estranho' } })
      ]
    )
    expect(releases.map(r => [r.version, r.items.length])).toEqual([['3.2', 1]])
    expect(warnings).toHaveLength(2)
    expect(warnings[0]).toContain('ENS-3')
    expect(warnings[1]).toContain('ENS-4')
  })
})
