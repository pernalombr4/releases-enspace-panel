import { describe, expect, it } from 'vitest'
import { ReleaseSchema } from './model'
import { furthestStage, itemProgress, stageFromItems } from './progress'

const items = (...statuses: string[]) => statuses.map((status, i) => ({
  id: String(i),
  title: `Item ${i}`,
  kind: 'Melhoria',
  status,
  updatedAt: '2026-10-01T10:00:00Z'
}))

describe('itemProgress', () => {
  it('avança por etapa até ficar pronto', () => {
    expect(['planned', 'in_progress', 'testing', 'ready', 'released'].map(status => itemProgress({ status: status as never })))
      .toEqual([0, 33, 67, 100, 100])
  })

  it('bloqueado fica onde parou (desenvolvimento) e adiado não conta', () => {
    expect(itemProgress({ status: 'blocked' })).toBe(33)
    expect(itemProgress({ status: 'postponed' })).toBeUndefined()
  })
})

describe('stageFromItems', () => {
  it('acompanha o andamento das demandas', () => {
    const stage = (...s: string[]) => stageFromItems(ReleaseSchema.parse({ version: '3.2', items: items(...s) }).items)
    expect(stage()).toBe('planning')
    expect(stage('planned', 'planned')).toBe('planning')
    expect(stage('planned', 'in_progress')).toBe('development')
    expect(stage('planned', 'blocked')).toBe('development')
    expect(stage('testing', 'ready')).toBe('testing')
    expect(stage('ready', 'released', 'postponed')).toBe('ready')
    expect(stage('released', 'released')).toBe('released')
  })
})

describe('fase da release', () => {
  it('mostra a mais avançada entre a informada e a dos itens', () => {
    expect(furthestStage('planning', 'testing')).toBe('testing')
    expect(furthestStage('code_freeze', 'development')).toBe('code_freeze')
  })

  it('é calculada ao ler o arquivo', () => {
    const r = ReleaseSchema.parse({ version: '3.2', items: items('testing', 'ready') })
    expect(r.stage).toBe('testing')
    const informed = ReleaseSchema.parse({ version: '3.2', stage: 'Em homologação', items: items('planned') })
    expect(informed.stage).toBe('testing')
    expect(ReleaseSchema.parse({ version: '3.0.2', releasedAt: '2026-08-20' }).stage).toBe('released')
  })
})
