import { describe, expect, it } from 'vitest'
import { ReleaseSchema } from '../domain/model'
import { buildReleases } from './mapping'
import { applyPostponements, parsePostponements } from './postponement'

describe('parsePostponements', () => {
  it('lê lista direta com campos em inglês', () => {
    expect(parsePostponements([
      { version: '3.1', postponed: true, original_target_date: '2026-10-30', new_target_date: '2026-11-13', reason: 'Ajuste de escopo', postponed_at: '2026-10-05T12:00:00Z' },
      { version: '3.2', postponed: false }
    ])).toEqual([
      { version: '3.1', targetDate: '2026-11-13', postponement: { postponed: true, originalDate: '2026-10-30', reason: 'Ajuste de escopo', announcedAt: '2026-10-05T12:00:00Z' } },
      { version: '3.2', targetDate: undefined, postponement: { postponed: false, originalDate: undefined, reason: undefined, announcedAt: undefined } }
    ])
  })

  it('lê envelope do Enspace com campos em português e status textual', () => {
    const [update] = parsePostponements({
      data: [{ id: 7, updated_at: 'ontem', data: { versao: '3.1', status: { label: 'Adiada' }, data_original: '30/10/2026', motivo: 'Dependência externa' } }]
    })
    expect(update?.postponement).toEqual({ postponed: true, originalDate: '2026-10-30', reason: 'Dependência externa', announcedAt: undefined })
  })

  it('ignora registros sem versão ou sem a informação de adiamento', () => {
    expect(parsePostponements([{ postponed: true }, { version: '3.1' }])).toEqual([])
  })
})

describe('applyPostponements', () => {
  it('sobrepõe adiamento e nova data só na release correspondente', () => {
    const releases = [
      ReleaseSchema.parse({ version: '3.1', stage: 'development', targetDate: '2026-10-30' }),
      ReleaseSchema.parse({ version: '3.2', stage: 'planning', targetDate: '2026-12-11' })
    ]
    const [r31, r32] = applyPostponements(releases, parsePostponements([
      { version: '3.1', postponed: true, original_date: '2026-10-30', new_date: '2026-11-13' }
    ]))
    expect(r31?.postponement?.postponed).toBe(true)
    expect(r31?.targetDate).toBe('2026-11-13')
    expect(r32).toBe(releases[1])
  })
})

describe('campos de adiamento no Type de releases', () => {
  it('mapeia "adiada" sim/não, data original e motivo', () => {
    const { releases } = buildReleases([
      { id: 1, updated_at: '2026-10-01T10:00:00Z', data: { version: '3.1', stage: 'Em desenvolvimento', target_date: '2026-11-13', postponed: 'Sim', original_target_date: '2026-10-30', postponed_reason: 'Ajuste de escopo' } },
      { id: 2, updated_at: '2026-10-01T10:00:00Z', data: { version: '3.2', stage: 'Em planejamento' } }
    ], [])
    expect(releases[0]?.postponement).toEqual({ postponed: true, originalDate: '2026-10-30', reason: 'Ajuste de escopo', announcedAt: undefined })
    expect(releases[1]?.postponement).toBeUndefined()
  })
})
