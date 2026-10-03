import { Field, Item } from '@be-enlighten/enspace-sdk-schemas'

// Registros fictícios no formato que o SDK entrega, para os testes. Os
// schemas do próprio SDK conferem cada registro (e preenchem os padrões).

/** Mesma expressão que o SDK usa para transformar strings ISO em Date. */
const SDK_ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/

/** Faz com um JSON o que o SDK faz com toda resposta 2xx: strings ISO viram Date. */
export function reviveLikeSdk<T>(value: T): T {
  if (typeof value === 'string') {
    return (SDK_ISO_DATE.test(value) && !Number.isNaN(new Date(value).getTime()) ? new Date(value) : value) as T
  }
  if (Array.isArray(value)) return value.map(reviveLikeSdk) as T
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, reviveLikeSdk(v)])) as T
  }
  return value
}

let nextFieldId = 1

/** Referência no formato do Enspace (32 caracteres): ref('DEM', 10) → "DEM00000000000000000000000000010". */
export function ref(prefix: string, id: number): string {
  return prefix + String(id).padStart(32 - prefix.length, '0')
}

/** Item de uma categoria, como o SDK devolve (datas já como Date). */
export function item(id: number, reference: string, data: Record<string, unknown>, updatedAt = '2026-10-02T13:00:00.000Z'): Item {
  return Item.parse({
    id,
    reference,
    created_at: '2026-09-01T12:00:00.000Z',
    updated_at: updatedAt,
    status: 'active',
    data: reviveLikeSdk(data)
  })
}

/** Definição de campo de seleção, com as opções [valor, rótulo]. */
export function selectField(refId: string, options: [value: string, label: string][]): Field {
  return Field.parse({
    id: nextFieldId++,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    item_type: 1,
    refId,
    name: refId,
    label: refId,
    type: 'EnlDropdown',
    options: options.map(([value, label]) => ({ value, label }))
  })
}

/** Definição de campo sem opções (texto, data, relação, número). */
export function plainField(refId: string, type: Field['type'] = 'inputText'): Field {
  return Field.parse({
    id: nextFieldId++,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    item_type: 1,
    refId,
    name: refId,
    type
  })
}

/** Relação como a API devolve: o display traz a referência no fim. */
export function relation(id: number, name: string, reference: string) {
  return { id, display: `${name} (${reference})`, reference }
}

/** Definições de campo de Releases & Deploys. Os valores de status são inventados de propósito: só montagem_escopo é conhecido. */
export const RELEASE_FIELD_DEFS: Field[] = [
  plainField('versao'),
  selectField('tipo', [['hotfix', 'Hotfix'], ['patch', 'Patch'], ['minor', 'Minor'], ['major', 'Major']]),
  selectField('status', [
    ['st_plan', 'Planejada'],
    ['montagem_escopo', 'Montagem do escopo'],
    ['st_disc', 'Escopo em discussão'],
    ['st_dist', 'Distribuição de responsáveis'],
    ['st_dev', 'Em desenvolvimento'],
    ['st_homolog', 'Em homologação'],
    ['st_done', 'Concluída'],
    ['st_fail', 'Deploy falhou'],
    ['st_cancel', 'Cancelada']
  ]),
  selectField('deploy_confirmado', [['sim', 'Subiu'], ['adiado', 'Não subiu — foi adiado'], ['falhou', 'Não subiu — falhou']]),
  plainField('data_hora', 'EnlCalendar'),
  plainField('data_deploy_real', 'EnlCalendar'),
  plainField('data_abertura_escopo', 'EnlCalendar'),
  plainField('reuniao_data', 'EnlCalendar'),
  plainField('data_limite_resp', 'EnlCalendar'),
  plainField('responsavel', 'EnRel'),
  plainField('motivo_adiamento', 'EnTextArea')
]

/** Definições de campo de Demandas, com os valores reais de status, tipo e prioridade. */
export const DEMAND_FIELD_DEFS: Field[] = [
  plainField('titulo'),
  selectField('tipo', [
    ['bug', 'Bug'],
    ['divida_tecnica', 'Dívida técnica'],
    ['melhoria', 'Melhoria'],
    ['nova_funcionalidade', 'Nova funcionalidade'],
    ['solicitacao_automacao', 'Automação']
  ]),
  selectField('status', [
    ['backlog', 'Backlog'],
    ['bloqueado', 'Bloqueado'],
    ['cancelado', 'Cancelado'],
    ['concluido', 'Concluído'],
    ['em_progresso', 'Em progresso'],
    ['em_revisao', 'Em revisão'],
    ['liberada_teste', 'Liberada para teste'],
    ['nao_reproduzivel', 'Não reproduzível'],
    ['pronto', 'Pronto'],
    ['validada_teste', 'Validada em teste']
  ]),
  selectField('prioridade', [['alta', 'Alta'], ['baixa', 'Baixa'], ['critica', 'Crítica'], ['media', 'Média'], ['urgente', 'Urgente']]),
  selectField('release_estado', [
    ['re_plan', 'Planejada na release'],
    ['re_risk', 'Em risco'],
    ['re_out', 'Removida do escopo'],
    ['re_decide', 'Não subiu — decidir destino'],
    ['re_done', 'Entregue na release']
  ]),
  selectField('dev_situacao', [['ds_wip', 'Em andamento'], ['ds_prod', 'Tudo em produção'], ['ds_block', 'Tem item bloqueado']]),
  selectField('risco_release', [['sim', 'Sim'], ['nao', 'Não']]),
  selectField('alcance', [['al_all', 'Todos os clientes'], ['al_one', 'Um cliente específico'], ['al_tbd', 'A definir']]),
  selectField('origem', [['or_client', 'Cliente'], ['or_internal', 'Interna']]),
  plainField('clientes_solicitantes_n', 'EnlNumber'),
  plainField('release_rel', 'EnRel'),
  plainField('chamados_origem', 'EnRelMulti'),
  plainField('responsavel_produto_rel', 'EnRel')
]

export const REQUEST_FIELD_DEFS: Field[] = [
  plainField('titulo'),
  plainField('cliente', 'EnRel'),
  plainField('cliente_informado'),
  plainField('demandas_geradas', 'EnRelMulti')
]
