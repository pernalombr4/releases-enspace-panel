import { describe, expect, it } from 'vitest'
import { checkReleasesFile } from './model'

const item = (id: string) => ({ id, title: `Item ${id}`, status: 'planned', updatedAt: '2026-10-01T10:00:00-03:00' })

describe('checkReleasesFile', () => {
  it('aceita o arquivo válido e devolve os dados já calculados', () => {
    const result = checkReleasesFile({ releases: [{ version: '3.1', items: [item('A'), item('B')] }] })
    expect(result.success && result.data.releases[0]?.stage).toBe('planning')
  })

  it('lê o estado do registro das releases e recusa estado desconhecido', () => {
    const registry = { state: 'published', deployedAt: '2026-09-22', publishedAt: '2026-10-09', cardCount: 45 }
    const result = checkReleasesFile({ releases: [{ version: '3.1', releasedAt: '2026-09-22', registry }] })
    expect(result.success && result.data.releases[0]).toMatchObject({ stage: 'released', registry })
    expect(checkReleasesFile({ releases: [{ version: '3.1', registry: { state: 'aberta', cardCount: 0 } }] }))
      .toMatchObject({ success: false, error: expect.stringContaining('registry.state') })
  })

  it('recusa campos inválidos, versões repetidas e IDs repetidos na release', () => {
    expect(checkReleasesFile({ releases: [{ version: '' }] })).toMatchObject({ success: false, error: expect.stringContaining('campos inválidos') })
    expect(checkReleasesFile({ releases: [{ version: '3.1' }, { version: '3.1' }] })).toEqual({ success: false, error: 'versões repetidas: 3.1' })
    expect(checkReleasesFile({ releases: [{ version: '3.1', items: [item('A'), item('A')] }] })).toEqual({ success: false, error: 'IDs repetidos na release 3.1: A' })
  })
})
