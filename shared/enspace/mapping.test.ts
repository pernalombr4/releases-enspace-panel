import type { Item } from '@be-enlighten/enspace-sdk-schemas'
import { describe, expect, it } from 'vitest'
import { releaseHealth } from '../domain/metrics'
import { ReleaseSchema, ReleasesFileSchema } from '../domain/model'
import { buildReleases, demandStatus, normalizeVersion, stripClientPrefix, type EnspaceSnapshot } from './mapping'
import { DEMAND_FIELD_DEFS, RELEASE_FIELD_DEFS, REQUEST_FIELD_DEFS, item, ref, relation } from './testing'

// Cada teste monta um workspace fictício no formato que o SDK entrega:
// relações { id, display, reference }, seleções pelo valor e datas como Date.

const ana = relation(7, 'Ana Souza', ref('PES', 7))
const D = (id: number) => ref('DEM', id)
const R = (id: number) => ref('REL', id)

function release(id: number, data: Record<string, unknown>): Item {
  return item(id, R(id), { tipo: 'minor', status: 'st_dev', ...data })
}

/** Demanda ligada à release `releaseId` (null = sem release). */
function demand(id: number, releaseId: number | null, data: Record<string, unknown> = {}): Item {
  return item(id, D(id), {
    titulo: `Demanda ${id}`,
    status: 'em_progresso',
    ...(releaseId === null ? {} : { release_rel: relation(releaseId, `Minor ${releaseId}`, R(releaseId)) }),
    ...data
  })
}

function snapshot(releases: Item[], demands: Item[] = [], requests: Item[] = []): EnspaceSnapshot {
  return {
    releases: { items: releases, fields: RELEASE_FIELD_DEFS },
    demands: { items: demands, fields: DEMAND_FIELD_DEFS },
    requests: { items: requests, fields: REQUEST_FIELD_DEFS }
  }
}

describe('normalizeVersion', () => {
  it('tira o .0 final e mantém os patches', () => {
    expect(normalizeVersion('3.1.0')).toBe('3.1')
    expect(normalizeVersion('3.0.0')).toBe('3.0')
    expect(normalizeVersion('3.10.0')).toBe('3.10')
    expect(normalizeVersion(' v3.2.0 ')).toBe('3.2')
    expect(normalizeVersion('3.0.4')).toBe('3.0.4')
    expect(normalizeVersion('3.1')).toBe('3.1')
  })
})

describe('stripClientPrefix', () => {
  it('remove prefixos de cliente entre colchetes', () => {
    expect(stripClientPrefix('[KIS] Ajuste no filtro')).toBe('Ajuste no filtro')
    expect(stripClientPrefix('[KIS][BP] - Ajuste no filtro')).toBe('Ajuste no filtro')
    expect(stripClientPrefix('Ajuste no filtro [KIS]')).toBe('Ajuste no filtro [KIS]')
  })
})

describe('demandStatus (tabela da seção 3, na ordem)', () => {
  const opt = (value: string, label?: string) => ({ value, label })

  it.each([
    ['Removida do escopo vence tudo', { releaseState: opt('re_out', 'Removida do escopo'), status: opt('concluido'), releaseCompleted: true }, 'postponed'],
    ['Não subiu — decidir destino', { releaseState: opt('re_decide', 'Não subiu — decidir destino') }, 'postponed'],
    ['Entregue na release', { releaseState: opt('re_done', 'Entregue na release'), status: opt('bloqueado') }, 'released'],
    ['Tudo em produção', { devStatus: opt('ds_prod', 'Tudo em produção'), status: opt('em_progresso') }, 'released'],
    ['release Concluída', { releaseCompleted: true, status: opt('backlog') }, 'released'],
    ['status Bloqueado', { status: opt('bloqueado', 'Bloqueado') }, 'blocked'],
    ['Tem item bloqueado', { devStatus: opt('ds_block', 'Tem item bloqueado'), status: opt('validada_teste') }, 'blocked'],
    ['Validada em teste', { status: opt('validada_teste', 'Validada em teste') }, 'ready'],
    ['Concluído', { status: opt('concluido', 'Concluído') }, 'ready'],
    ['Liberada para teste', { status: opt('liberada_teste', 'Liberada para teste') }, 'testing'],
    ['Em revisão', { status: opt('em_revisao', 'Em revisão') }, 'testing'],
    ['Em progresso', { status: opt('em_progresso', 'Em progresso') }, 'in_progress'],
    ['Backlog', { status: opt('backlog', 'Backlog') }, 'planned'],
    ['Pronto (pronta para desenvolver)', { status: opt('pronto', 'Pronto') }, 'planned'],
    ['vazio', {}, 'planned'],
    ['rótulo renomeado com valor conhecido', { status: opt('validada_teste') }, 'ready'],
    ['valor desconhecido com rótulo conhecido', { status: opt('x9', 'Em revisão') }, 'testing']
  ] as const)('%s', (_, input, expected) => {
    expect(demandStatus(input)).toEqual({ status: expected, matched: true })
  })

  it('valor sem regra conta como Planejado e avisa', () => {
    expect(demandStatus({ status: opt('aguardando', 'Aguardando cliente') })).toEqual({ status: 'planned', matched: false })
  })
})

describe('buildReleases: releases (seção 2)', () => {
  it('converte versão, tipo, datas, marcos e responsável', () => {
    const { releases, warnings } = buildReleases(snapshot([
      release(502, {
        versao: '3.1.0',
        tipo: 'minor',
        status: 'montagem_escopo',
        // 19h em Brasília
        data_hora: '2026-10-06T22:00:00.000Z',
        data_abertura_escopo: '2026-09-01',
        reuniao_data: '2026-09-08',
        data_limite_resp: '2026-09-15',
        responsavel: ana,
        titulo: 'Minor 3.1.0',
        descricao: 'Texto interno'
      }),
      release(501, { versao: '3.0.4', tipo: 'hotfix' })
    ]))

    expect(warnings).toEqual([])
    expect(releases).toEqual([
      { version: '3.0.4', type: 'patch', stage: 'development', items: [] },
      {
        version: '3.1',
        type: 'minor',
        stage: 'planning',
        targetDate: '2026-10-06',
        owner: 'Ana Souza',
        milestones: [
          { label: 'Abertura do escopo', date: '2026-09-01' },
          { label: 'Reunião de escopo', date: '2026-09-08' },
          { label: 'Prazo dos responsáveis', date: '2026-09-15' },
          { label: 'Subida para produção', date: '2026-10-06' }
        ],
        items: []
      }
    ])
  })

  it.each([
    ['Planejada', 'st_plan', 'planning', undefined],
    ['Montagem do escopo', 'montagem_escopo', 'planning', undefined],
    ['Escopo em discussão', 'st_disc', 'planning', undefined],
    ['Distribuição de responsáveis', 'st_dist', 'development', undefined],
    ['Em desenvolvimento', 'st_dev', 'development', undefined],
    ['Em homologação', 'st_homolog', 'testing', undefined],
    ['Concluída', 'st_done', 'released', undefined],
    ['Deploy falhou', 'st_fail', 'testing', 'delayed']
  ])('status %s vira a fase certa', (_, value, stage, health) => {
    const [r] = buildReleases(snapshot([release(1, { versao: '3.2.0', status: value })])).releases
    expect(r?.stage).toBe(stage)
    expect(r?.health).toBe(health)
  })

  it('Cancelada não aparece, e as demandas dela também não', () => {
    const result = buildReleases(snapshot(
      [release(1, { versao: '2.9.0', status: 'st_cancel' }), release(2, { versao: '3.2.0' })],
      [demand(10, 1), demand(11, 2)]
    ))
    expect(result.releases.map(r => r.version)).toEqual(['3.2'])
    expect(result.hiddenVersions).toEqual(['2.9'])
    expect(result.stats.inCancelledRelease).toBe(1)
    expect(result.warnings).toEqual([])
  })

  it('deploy_confirmado: Subiu marca não adiada e usa a data real (ou a prevista)', () => {
    const { releases } = buildReleases(snapshot([
      release(1, { versao: '3.0.0', status: 'st_done', deploy_confirmado: 'sim', data_hora: '2026-08-24T21:00:00.000Z', data_deploy_real: '2026-08-25T02:30:00.000Z' }),
      release(2, { versao: '3.0.1', status: 'st_done', deploy_confirmado: 'sim', data_hora: '2026-08-28' })
    ]))
    expect(releases[0]).toMatchObject({ version: '3.0', postponement: { postponed: false }, targetDate: '2026-08-24', releasedAt: '2026-08-24' })
    expect(releases[1]).toMatchObject({ version: '3.0.1', releasedAt: '2026-08-28' })
  })

  it('deploy_confirmado: adiado marca adiada sem publicar o texto interno', () => {
    const { releases } = buildReleases(snapshot([
      release(1, { versao: '3.1.0', deploy_confirmado: 'adiado', motivo_adiamento: 'Pipeline do cliente X quebrou', data_hora: '2026-10-06' }),
      // Com os campos sugeridos na seção 5, data original e motivo público entram.
      release(2, { versao: '3.2.0', deploy_confirmado: 'adiado', data_original: '2026-10-27', motivo_publico: 'Ajuste de escopo' })
    ]))
    expect(releases[0]?.postponement).toEqual({ postponed: true })
    expect(JSON.stringify(releases)).not.toContain('Pipeline')
    expect(releases[1]?.postponement).toEqual({ postponed: true, originalDate: '2026-10-27', reason: 'Ajuste de escopo' })
  })

  it('deploy_confirmado vazio ou falhou: o painel não afirma nada', () => {
    const { releases, warnings } = buildReleases(snapshot([
      release(1, { versao: '3.1.0' }),
      release(2, { versao: '3.2.0', deploy_confirmado: 'falhou' })
    ]))
    expect(releases.map(r => r.postponement)).toEqual([undefined, undefined])
    expect(releases.map(r => r.releasedAt)).toEqual([undefined, undefined])
    expect(warnings).toEqual([])
  })

  it('versão repetida: avisa e junta as demandas na primeira', () => {
    const { releases, warnings } = buildReleases(snapshot(
      [release(1, { versao: '3.1.0' }), release(2, { versao: '3.1' })],
      [demand(10, 1), demand(11, 2)]
    ))
    expect(releases).toHaveLength(1)
    expect(releases[0]?.items.map(i => i.id)).toEqual([D(10), D(11)])
    expect(warnings[0]).toContain('a versão 3.1 aparece em mais de um registro')
  })

  it('release sem versão fica fora, com aviso', () => {
    const { releases, warnings } = buildReleases(snapshot([release(1, { versao: '  ' })]))
    expect(releases).toEqual([])
    expect(warnings).toEqual([`Releases & Deploys: registro sem versao; fica fora do painel (1 registro: ${R(1)})`])
  })
})

describe('buildReleases: demandas (seção 3)', () => {
  const base = [release(1, { versao: '3.1.0' })]

  it('entra pelo id da relação release_rel (objeto ou lista); sem release fica fora', () => {
    const { releases, stats } = buildReleases(snapshot(base, [
      demand(10, 1),
      demand(11, null, { release_rel: [relation(1, 'Minor 3.1.0', R(1))] }),
      demand(12, null, { release_rel: { reference: R(1), display: 'Minor 3.1.0' } }),
      demand(13, null)
    ]))
    expect(releases[0]?.items.map(i => i.id)).toEqual([D(10), D(11), D(12)])
    expect(stats).toMatchObject({ demands: 4, items: 3, withoutRelease: 1 })
  })

  it('cancelada e não reproduzível ficam fora', () => {
    const { releases, stats } = buildReleases(snapshot(base, [
      demand(10, 1, { status: 'cancelado' }),
      demand(11, 1, { status: 'nao_reproduzivel' }),
      demand(12, 1, { status: 'backlog' })
    ]))
    expect(releases[0]?.items.map(i => i.id)).toEqual([D(12)])
    expect(stats.excluded).toBe(2)
  })

  it('demanda que aponta para release inexistente fica fora, com aviso', () => {
    const { releases, warnings } = buildReleases(snapshot(base, [demand(10, 99)]))
    expect(releases[0]?.items).toEqual([])
    expect(warnings).toEqual([`Demandas: release_rel aponta para "Minor 99 (${R(99)})", que não está em Releases & Deploys; a demanda fica fora (1 registro: ${D(10)})`])
  })

  it('converte título, classificação, prioridade, público, origem, responsável e data', () => {
    const { releases, warnings } = buildReleases(snapshot(base, [
      demand(10, 1, {
        titulo: '[KIS] Exportar dashboard em PDF',
        tipo: 'nova_funcionalidade',
        prioridade: 'critica',
        alcance: 'al_one',
        origem: 'or_client',
        clientes_solicitantes_n: 3,
        responsavel_produto_rel: ana,
        descricao: 'O cliente X pediu',
        email_solicitante: 'alguem@cliente.com',
        risco_release_motivo: 'Depende do cliente X'
      }),
      demand(11, 1, { tipo: 'bug', prioridade: 'urgente', alcance: 'al_tbd', origem: 'or_internal' }),
      demand(12, 1, { tipo: 'divida_tecnica', prioridade: 'alta' }),
      demand(13, 1, { tipo: 'melhoria', prioridade: 'media' }),
      demand(14, 1, { tipo: 'solicitacao_automacao', prioridade: 'baixa', alcance: 'al_all' }),
      demand(15, 1, {})
    ].map((d, i) => (i === 0 ? { ...d, updated_at: new Date('2026-10-02T16:12:00.000Z') } : d))))

    expect(warnings).toEqual([])
    const items = releases[0]?.items ?? []
    expect(items[0]).toEqual({
      id: D(10),
      title: 'Exportar dashboard em PDF',
      kind: 'innovation',
      status: 'in_progress',
      priority: 'high',
      audience: 'Um cliente específico',
      origin: 'client',
      clientCount: 3,
      owner: 'Ana Souza',
      updatedAt: '2026-10-02T16:12:00.000Z'
    })
    expect(items.map(i => [i.kind, i.priority, i.audience, i.origin])).toEqual([
      ['innovation', 'high', 'Um cliente específico', 'client'],
      ['fix', 'high', undefined, 'internal'],
      ['improvement', 'high', undefined, undefined],
      ['improvement', 'medium', undefined, undefined],
      ['innovation', 'low', 'Todos os clientes', undefined],
      [undefined, undefined, undefined, undefined]
    ])
    // Nada dos campos internos chega ao arquivo.
    expect(JSON.stringify(releases)).not.toMatch(/cliente X|@cliente\.com/)
  })

  it('em risco por risco_release = Sim (seleção ou chave) ou release_estado = Em risco; a release fica Em atenção', () => {
    const { releases } = buildReleases(snapshot(
      [release(1, { versao: '3.1.0', data_hora: '2026-12-01' })],
      [
        demand(10, 1, { risco_release: 'sim' }),
        demand(11, 1, { risco_release: true }),
        demand(12, 1, { release_estado: 're_risk' }),
        demand(13, 1, { risco_release: 'nao', release_estado: 're_plan' })
      ]
    ))
    expect(releases[0]?.items.map(i => i.atRisk)).toEqual([true, true, true, undefined])
    const parsed = ReleaseSchema.parse(releases[0])
    expect(releaseHealth(parsed, new Date('2026-10-03T12:00:00Z'))).toBe('at_risk')
  })

  it('release Concluída: as demandas contam como liberadas e a fase fica Liberada', () => {
    const { releases } = buildReleases(snapshot(
      [release(1, { versao: '3.0.0', status: 'st_done' })],
      [demand(10, 1, { status: 'backlog' }), demand(11, 1, { status: 'em_progresso', release_estado: 're_out' })]
    ))
    expect(releases[0]?.items.map(i => i.status)).toEqual(['released', 'postponed'])
    expect(ReleaseSchema.parse(releases[0]).stage).toBe('released')
  })

  it('a fase da release é a mais avançada entre o status e as demandas', () => {
    const { releases } = buildReleases(snapshot(
      [release(1, { versao: '3.1.0', status: 'montagem_escopo' })],
      [demand(10, 1, { status: 'validada_teste' }), demand(11, 1, { status: 'liberada_teste' })]
    ))
    expect(releases[0]?.stage).toBe('planning')
    expect(ReleaseSchema.parse(releases[0]).stage).toBe('testing')
  })

  it('traz os chamados de clientes da demanda', () => {
    const chamado = item(101, 'CHA00000000000000000000000000001', {
      titulo: 'Exportação não baixa o arquivo',
      cliente: relation(1, 'CLIENTE ALFA LTDA', 'CLI0000000000000000000000000000A1'),
      relato: 'Texto do cliente'
    })
    const { releases } = buildReleases(snapshot(base, [demand(10, 1, { chamados_origem: [relation(101, 'Exportação', chamado.reference)] })], [chamado]))
    expect(releases[0]?.items[0]?.tickets).toEqual([{ ref: 'CHA00000000000000000000000000001', title: 'Exportação não baixa o arquivo', client: 'CLIENTE ALFA LTDA' }])
  })

  it('demanda sem título usa a referência e avisa', () => {
    const { releases, warnings } = buildReleases(snapshot(base, [demand(10, 1, { titulo: '[KIS]' })]))
    expect(releases[0]?.items[0]?.title).toBe(D(10))
    expect(warnings).toEqual([`Demandas: sem titulo; o painel mostra a referência (1 registro: ${D(10)})`])
  })
})

describe('buildReleases: valores desconhecidos', () => {
  it('avisam e nunca derrubam a sincronização', () => {
    const fields = RELEASE_FIELD_DEFS.map(f => (f.refId === 'status'
      ? { ...f, options: [...(f.options ?? []), { value: 'st_wait', label: 'Aguardando aprovação' }] }
      : f))
    const result = buildReleases({
      releases: { items: [release(1, { versao: '3.1.0', status: 'st_wait', tipo: 'gigante' })], fields },
      demands: {
        items: [
          demand(10, 1, { status: 'aguardando_cliente', tipo: 'pesquisa', prioridade: 'altissima' }),
          demand(11, 1, { status: 'aguardando_cliente', origem: 'or_parceiro' }),
          demand(12, 1, { release_estado: 're_novo', dev_situacao: 'ds_novo' })
        ],
        fields: DEMAND_FIELD_DEFS
      },
      requests: { items: [], fields: [] }
    })

    const [r] = result.releases
    expect(r?.stage).toBeUndefined()
    expect(r?.type).toBeUndefined()
    expect(r?.items.map(i => [i.status, i.kind, i.priority, i.origin])).toEqual([
      ['planned', undefined, undefined, undefined],
      ['planned', undefined, undefined, undefined],
      ['in_progress', undefined, undefined, undefined]
    ])
    expect(result.warnings).toEqual([
      `Releases & Deploys: status "Aguardando aprovação" (st_wait) sem regra no painel; a fase vem só das demandas (1 registro: ${R(1)})`,
      `Releases & Deploys: o valor "gigante" do campo tipo não está entre as opções do campo (1 registro: ${R(1)})`,
      `Releases & Deploys: tipo "gigante" sem regra no painel; o tipo vem da versão (1 registro: ${R(1)})`,
      `Demandas: o valor "aguardando_cliente" do campo status não está entre as opções do campo (2 registros: ${D(10)}, ${D(11)})`,
      `Demandas: status "aguardando_cliente" sem regra no painel; conta como Planejado (2 registros: ${D(10)}, ${D(11)})`,
      `Demandas: o valor "pesquisa" do campo tipo não está entre as opções do campo (1 registro: ${D(10)})`,
      `Demandas: tipo "pesquisa" sem regra no painel; fica sem classificação (1 registro: ${D(10)})`,
      `Demandas: o valor "altissima" do campo prioridade não está entre as opções do campo (1 registro: ${D(10)})`,
      `Demandas: prioridade "altissima" sem regra no painel; fica sem prioridade (1 registro: ${D(10)})`,
      `Demandas: o valor "or_parceiro" do campo origem não está entre as opções do campo (1 registro: ${D(11)})`,
      `Demandas: origem "or_parceiro" sem regra no painel; fica sem origem (1 registro: ${D(11)})`,
      `Demandas: o valor "re_novo" do campo release_estado não está entre as opções do campo (1 registro: ${D(12)})`,
      `Demandas: o valor "ds_novo" do campo dev_situacao não está entre as opções do campo (1 registro: ${D(12)})`
    ])
  })

  it('sem as definições de campo, as regras casam pelo valor e avisam', () => {
    const result = buildReleases({
      releases: { items: [release(1, { versao: '3.1.0', status: 'montagem_escopo', tipo: 'minor' })], fields: [] },
      demands: { items: [demand(10, 1, { status: 'validada_teste' })], fields: [] },
      requests: { items: [], fields: [] }
    })
    expect(result.releases[0]).toMatchObject({ stage: 'planning', type: 'minor', items: [{ status: 'ready' }] })
    expect(result.warnings).toContain(`Demandas: o campo status não veio nas definições de campo; as regras usam só o valor (1 registro: ${D(10)})`)
  })
})

describe('buildReleases: datas como Date ou string', () => {
  it('dá o mesmo resultado com o JSON cru e com o que o SDK entrega', () => {
    const data = { versao: '3.1.0', data_hora: '2026-10-07T01:30:00.000Z', data_abertura_escopo: '2026-09-01', deploy_confirmado: 'sim', data_deploy_real: '2026-10-07' }
    const revived = buildReleases(snapshot([release(1, data)]))
    const raw = buildReleases(snapshot([{ ...release(1, {}), data: { tipo: 'minor', status: 'st_dev', ...data } }]))
    expect(revived.releases[0]?.milestones?.[1]).toEqual({ label: 'Subida para produção', date: '2026-10-06' })
    expect(raw.releases).toEqual(revived.releases)
  })
})

describe('buildReleases: resultado', () => {
  it('passa no schema do arquivo de dados', () => {
    const { releases } = buildReleases(snapshot(
      [release(1, { versao: '3.1.0', data_hora: '2026-10-06' }), release(2, { versao: '3.0.4', tipo: 'hotfix' })],
      [demand(10, 1), demand(11, 2, { status: 'validada_teste' })]
    ))
    expect(ReleasesFileSchema.safeParse({ releases }).success).toBe(true)
  })
})
