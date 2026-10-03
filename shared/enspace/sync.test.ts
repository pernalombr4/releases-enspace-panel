import { describe, expect, it } from 'vitest'
import type { EnspaceSnapshot } from './mapping'
import { SyncValidationError, formatSyncReport, panelTimestamp, sameJson, syncReleases } from './sync'
import { DEMAND_FIELD_DEFS, RELEASE_FIELD_DEFS, item, ref, relation } from './testing'

const NOW = new Date('2026-10-03T16:40:00.000Z')

function snapshot(releases: Record<string, unknown>[], demands: { releaseId: number, data?: Record<string, unknown> }[] = []): EnspaceSnapshot {
  return {
    releases: { items: releases.map((data, i) => item(i + 1, ref('REL', i + 1), { tipo: 'minor', status: 'st_dev', ...data })), fields: RELEASE_FIELD_DEFS },
    demands: {
      items: demands.map(({ releaseId, data }, i) => item(100 + i, ref('DEM', 100 + i), {
        titulo: `Demanda ${100 + i}`,
        status: 'em_progresso',
        release_rel: relation(releaseId, 'Release', ref('REL', releaseId)),
        ...data
      })),
      fields: DEMAND_FIELD_DEFS
    },
    requests: { items: [], fields: [] }
  }
}

const base = {
  sample: false,
  updatedAt: '2026-10-01T10:00:00-03:00',
  releases: [
    { version: '3.0', releasedAt: '2026-08-25', links: [{ label: 'Release notes', url: 'https://exemplo.com/3-0' }] },
    { version: '3.1', targetDate: '2026-10-06', items: [{ id: 'A', title: 'Manual', status: 'ready', updatedAt: '2026-10-01T10:00:00-03:00' }] }
  ]
}

describe('panelTimestamp e sameJson', () => {
  it('formata no horário de Brasília', () => {
    expect(panelTimestamp(NOW)).toBe('2026-10-03T13:40:00-03:00')
    expect(panelTimestamp(new Date('2026-01-01T02:05:09.000Z'))).toBe('2025-12-31T23:05:09-03:00')
  })

  it('compara conteúdo sem olhar a ordem das chaves', () => {
    expect(sameJson({ a: 1, b: [{ c: 1, d: 2 }] }, { b: [{ d: 2, c: 1 }], a: 1 })).toBe(true)
    expect(sameJson([1, 2], [2, 1])).toBe(false)
  })
})

describe('syncReleases', () => {
  it('Enspace vence na mesma versão; só na base continua; ordem por versão', () => {
    const result = syncReleases(snapshot([{ versao: '3.1.0' }, { versao: '3.2.0' }], [{ releaseId: 1 }]), base, NOW)
    expect(result.changed).toBe(true)
    expect(result.file.updatedAt).toBe('2026-10-03T13:40:00-03:00')
    const releases = result.file.releases as { version: string, items?: { id: string }[] }[]
    expect(releases.map(r => r.version)).toEqual(['3.0', '3.1', '3.2'])
    expect(releases[0]).toBe(base.releases[0])
    expect(releases[1]?.items?.map(i => i.id)).toEqual([ref('DEM', 100)])
    expect(result.comparison.map(c => [c.version, c.source, c.change])).toEqual([
      ['3.2', 'enspace', 'added'],
      ['3.1', 'enspace', 'changed'],
      ['3.0', 'manual', 'unchanged']
    ])
  })

  it('versão cancelada no Enspace sai mesmo estando na base', () => {
    const result = syncReleases(snapshot([{ versao: '3.1.0', status: 'st_cancel' }]), base, NOW)
    expect((result.file.releases as { version: string }[]).map(r => r.version)).toEqual(['3.0'])
    expect(result.comparison.find(c => c.version === '3.1')).toMatchObject({ change: 'removed', source: undefined })
  })

  it('sem mudança nas releases, mantém o updatedAt da base', () => {
    const first = syncReleases(snapshot([{ versao: '3.1.0' }]), base, NOW)
    const second = syncReleases(snapshot([{ versao: '3.1.0' }]), first.file, new Date('2026-10-04T09:50:00Z'))
    expect(second.changed).toBe(false)
    expect(second.file).toEqual(first.file)
    expect(second.comparison.every(c => c.change === 'unchanged')).toBe(true)
  })

  it('sem base, o arquivo tem só as releases do Enspace', () => {
    const result = syncReleases(snapshot([{ versao: '3.1.0' }]), undefined, NOW)
    expect(result.file).toEqual({ sample: false, updatedAt: '2026-10-03T13:40:00-03:00', releases: [{ version: '3.1', type: 'minor', stage: 'development', items: [] }] })
  })

  it('recusa base inválida', () => {
    expect(() => syncReleases(snapshot([]), { releases: [{ version: '3.1', items: [{ id: 'x' }] }] }, NOW)).toThrow(SyncValidationError)
  })
})

describe('formatSyncReport', () => {
  it('mostra origem, itens, fase e datas de cada release, as mudanças e os avisos', () => {
    const result = syncReleases(snapshot(
      [{ versao: '3.1.0', status: 'montagem_escopo', deploy_confirmado: 'adiado' }, { versao: '3.2.0', data_hora: '2026-10-27' }],
      [{ releaseId: 1, data: { status: 'validada_teste' } }, { releaseId: 2, data: { status: 'aguardando' } }]
    ), base, NOW)
    const report = formatSyncReport(result, { dryRun: true, workspace: 'produtos', basePath: 'data/releases.json' })
    expect(report).toContain('simulação, nada foi gravado')
    expect(report).toContain('Base: data/releases.json, 2 releases.')
    expect(report).toContain('Resultado: 3 releases (1 nova, 1 alterada, 0 saindo, 1 igual).')
    expect(report).toMatch(/3\.2\s+Enspace\s+nova\s+1\s+Em desenvolvimento\s+27\/10\/2026/)
    expect(report).toMatch(/3\.1\s+Enspace\s+alterada\s+1\s+Pronta para subir\s+06\/10\/2026 → sem data/)
    expect(report).toMatch(/3\.0\s+manual\s+igual\s+0\s+Liberada\s+25\/08\/2026 \(saiu\)/)
    expect(report).toContain('  itens: 1 → 1 (1 sai, 1 entra)')
    expect(report).toContain('  adiamento: não informado → adiada')
    expect(report).toContain(`  entram: ${ref('DEM', 100)} Demanda 100`)
    expect(report).toContain('Avisos (2)')
  })

  it('sem simulação, diz se gravou', () => {
    const result = syncReleases(snapshot([]), base, NOW)
    expect(formatSyncReport(result, { dryRun: false, workspace: 'produtos', outPath: 'x.json', written: false })).toContain('Sem mudanças: x.json fica como está.')
    expect(formatSyncReport(result, { dryRun: false, workspace: 'produtos', outPath: 'x.json', written: true })).toContain('Gravado em x.json.')
  })
})
