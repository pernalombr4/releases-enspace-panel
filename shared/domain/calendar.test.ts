import { describe, expect, it } from 'vitest'
import { calendarEntries, hasDetails, originalDateEntries, releaseType, undatedReleases } from './calendar'
import { ReleasesFileSchema, ReleaseSchema } from './model'

describe('releaseType', () => {
  it('deduz o tipo pela versão', () => {
    expect(releaseType({ version: '3.0' })).toBe('major')
    expect(releaseType({ version: '4.0.0' })).toBe('major')
    expect(releaseType({ version: '3.1' })).toBe('minor')
    expect(releaseType({ version: '3.1.0' })).toBe('minor')
    expect(releaseType({ version: '3.1.2' })).toBe('patch')
    expect(releaseType({ version: 'v3.0.1' })).toBe('patch')
  })

  it('respeita o tipo informado, inclusive em português', () => {
    expect(releaseType(ReleaseSchema.parse({ version: '3.2', type: 'Hotfix' }))).toBe('patch')
    expect(releaseType(ReleaseSchema.parse({ version: '3.2', type: 'major' }))).toBe('major')
  })
})

describe('releases antigas só com versão e data', () => {
  it('são válidas e ficam como liberadas, sem detalhes', () => {
    const file = ReleasesFileSchema.parse({ releases: [{ version: '3.0.2', releasedAt: '2026-08-20' }] })
    const [release] = file.releases
    expect(release?.stage).toBe('released')
    expect(release && hasDetails(release)).toBe(false)
  })

  it('sem data nenhuma, ficam em planejamento e fora do calendário', () => {
    const release = ReleaseSchema.parse({ version: '3.3' })
    expect(release.stage).toBe('planning')
    expect(calendarEntries([release])).toEqual([])
    expect(undatedReleases([release])).toEqual([release])
  })
})

describe('calendarEntries', () => {
  it('ordena por data e marca liberada, adiada ou prevista', () => {
    const releases = [
      ReleaseSchema.parse({ version: '3.2', targetDate: '2026-12-11', postponement: { postponed: true, originalDate: '2026-12-04' } }),
      ReleaseSchema.parse({ version: '3.0.1', releasedAt: '2026-07-02' }),
      ReleaseSchema.parse({ version: '3.1', stage: 'development', targetDate: '2026-10-30', items: [] })
    ]
    expect(calendarEntries(releases).map(e => [e.date, e.release.version, e.type, e.status])).toEqual([
      ['2026-07-02', '3.0.1', 'patch', 'released'],
      ['2026-10-30', '3.1', 'minor', 'planned'],
      ['2026-12-11', '3.2', 'minor', 'postponed']
    ])
  })
})

describe('releases futuras', () => {
  it('sempre têm página, mesmo antes de os itens serem publicados', () => {
    expect(hasDetails(ReleaseSchema.parse({ version: '3.1', targetDate: '2026-10-06' }))).toBe(true)
  })
})

describe('originalDateEntries', () => {
  it('marca a data original das releases adiadas', () => {
    const releases = [
      ReleaseSchema.parse({ version: '3.1', targetDate: '2026-10-06', postponement: { postponed: true, originalDate: '2026-09-29' } }),
      ReleaseSchema.parse({ version: '3.2', targetDate: '2026-10-27', postponement: { postponed: false } })
    ]
    expect(originalDateEntries(releases).map(e => [e.date, e.release.version, e.status])).toEqual([
      ['2026-09-29', '3.1', 'moved']
    ])
  })
})
