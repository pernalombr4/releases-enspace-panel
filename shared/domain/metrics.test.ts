import { describe, expect, it } from 'vitest'
import { changedItemIds, daysUntil, defaultRelease, releaseHealth, releaseProgress } from './metrics'
import { ReleaseSchema, compareVersions, type Release } from './model'

const item = (id: string, status: string, updatedAt = '2026-10-01T10:00:00Z') => ({
  id,
  title: `Item ${id}`,
  kind: 'feature',
  status,
  updatedAt
})

const release = (over: Record<string, unknown>): Release =>
  ReleaseSchema.parse({ version: '3.1', stage: 'development', ...over })

const now = new Date(2026, 9, 2, 12) // 02/10/2026, horário local

describe('releaseProgress', () => {
  it('conta prontos e liberados como concluídos e ignora adiados', () => {
    const r = release({
      items: [item('a', 'released'), item('b', 'ready'), item('c', 'testing'), item('d', 'postponed')]
    })
    expect(releaseProgress(r)).toEqual({ done: 2, total: 3, percent: 67 })
  })

  it('não divide por zero sem itens', () => {
    expect(releaseProgress(release({})).percent).toBe(0)
  })
})

describe('daysUntil', () => {
  it('conta dias de calendário independentemente da hora', () => {
    expect(daysUntil('2026-10-02', now)).toBe(0)
    expect(daysUntil('2026-10-30', now)).toBe(28)
    expect(daysUntil('2026-09-30', now)).toBe(-2)
  })
})

describe('releaseHealth', () => {
  it('respeita o valor informado pelo time', () => {
    expect(releaseHealth(release({ health: 'Em atenção', targetDate: '2026-12-01' }), now)).toBe('at_risk')
  })

  it('marca atraso quando a data passou e a release não saiu', () => {
    expect(releaseHealth(release({ targetDate: '2026-09-30' }), now)).toBe('delayed')
  })

  it('marca atenção com item bloqueado', () => {
    const r = release({ targetDate: '2026-12-01', items: [item('a', 'blocked')] })
    expect(releaseHealth(r, now)).toBe('at_risk')
  })

  it('marca atenção quando falta pouco e o progresso é baixo', () => {
    const r = release({ targetDate: '2026-10-06', items: [item('a', 'in_progress'), item('b', 'ready')] })
    expect(releaseHealth(r, now)).toBe('at_risk')
  })

  it('fica no prazo sem riscos', () => {
    const r = release({ targetDate: '2026-12-01', items: [item('a', 'in_progress')] })
    expect(releaseHealth(r, now)).toBe('on_track')
  })
})

describe('defaultRelease', () => {
  it('escolhe a primeira não liberada', () => {
    const rs = [
      release({ version: '3.0', stage: 'released' }),
      release({ version: '3.1' }),
      release({ version: '3.2', stage: 'planning' })
    ]
    expect(defaultRelease(rs)?.version).toBe('3.1')
  })
})

describe('changedItemIds', () => {
  it('detecta itens que mudaram de status entre duas buscas', () => {
    const before = [release({ items: [item('a', 'in_progress'), item('b', 'planned')] })]
    const after = [
      release({ items: [item('a', 'testing', '2026-10-02T10:00:00Z'), item('b', 'planned')] })
    ]
    expect([...changedItemIds(before, after)]).toEqual(['3.1:a'])
  })
})

describe('compareVersions', () => {
  it('ordena numericamente', () => {
    expect(['3.10', '3.2', '3.1'].sort(compareVersions)).toEqual(['3.1', '3.2', '3.10'])
  })
})

describe('adiamento', () => {
  it('release adiada sem nova data fica atrasada', () => {
    const r = release({ postponement: { postponed: true, originalDate: '2026-10-30' } })
    expect(releaseHealth(r, now)).toBe('delayed')
  })

  it('release adiada com nova data é avaliada pela nova data', () => {
    const r = release({ targetDate: '2026-12-01', postponement: { postponed: true, originalDate: '2026-10-30' } })
    expect(releaseHealth(r, now)).toBe('on_track')
  })
})
