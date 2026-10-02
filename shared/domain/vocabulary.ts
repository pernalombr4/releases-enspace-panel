// Vocabulário controlado do painel. As chaves (em inglês) são o que o código usa;
// os aliases permitem que o JSON manual e os campos do Enspace usem os rótulos
// em português que o time já fala no dia a dia ("Em desenvolvimento", "QA"...).

export const ITEM_STATUSES = [
  'planned',
  'in_progress',
  'testing',
  'ready',
  'released',
  'blocked',
  'postponed'
] as const
export type ItemStatus = (typeof ITEM_STATUSES)[number]

export const ITEM_KINDS = [
  'feature',
  'improvement',
  'fix',
  'integration',
  'security',
  'performance'
] as const
export type ItemKind = (typeof ITEM_KINDS)[number]

export const LEVELS = ['high', 'medium', 'low'] as const
export type Level = (typeof LEVELS)[number]

export const RELEASE_STAGES = [
  'planning',
  'development',
  'code_freeze',
  'testing',
  'released'
] as const
export type ReleaseStage = (typeof RELEASE_STAGES)[number]

export const RELEASE_HEALTH = ['on_track', 'at_risk', 'delayed'] as const
export type ReleaseHealth = (typeof RELEASE_HEALTH)[number]

const ALIASES = {
  status: {
    planned: ['planejado', 'cotado', 'a fazer', 'to do', 'todo', 'backlog', 'nao iniciado'],
    in_progress: ['em desenvolvimento', 'desenvolvimento', 'em andamento', 'doing', 'in progress', 'dev'],
    testing: ['em testes', 'testes', 'teste', 'qa', 'em qa', 'homologacao', 'em homologacao', 'code review', 'review'],
    ready: ['pronto', 'pronto para release', 'pronto para subida', 'aprovado', 'done', 'concluido'],
    released: ['liberado', 'em producao', 'publicado', 'entregue', 'no ar'],
    blocked: ['bloqueado', 'impedido', 'impedimento'],
    postponed: ['adiado', 'movido', 'fora da release', 'descopado', 'despriorizado']
  },
  kind: {
    feature: ['nova funcionalidade', 'funcionalidade', 'novidade', 'nova feature'],
    improvement: ['melhoria', 'evolucao', 'ajuste'],
    fix: ['correcao', 'bug', 'bugfix', 'hotfix'],
    integration: ['integracao', 'integracoes'],
    security: ['seguranca', 'compliance', 'lgpd'],
    performance: ['desempenho', 'otimizacao']
  },
  level: {
    high: ['alta', 'alto', 'critica', 'critico'],
    medium: ['media', 'medio', 'moderado', 'moderada'],
    low: ['baixa', 'baixo']
  },
  stage: {
    planning: ['planejamento', 'em planejamento'],
    development: ['desenvolvimento', 'em desenvolvimento'],
    code_freeze: ['code freeze', 'congelamento', 'congelada'],
    testing: ['homologacao', 'em homologacao', 'testes', 'em testes', 'qa'],
    released: ['liberada', 'publicada', 'em producao', 'no ar']
  },
  health: {
    on_track: ['no prazo', 'ok', 'on track', 'em dia'],
    at_risk: ['em atencao', 'atencao', 'em risco', 'risco'],
    delayed: ['atrasada', 'atrasado', 'atraso']
  }
} satisfies Record<string, Record<string, string[]>>

type Vocab = keyof typeof ALIASES

/** "Em Homologação " -> "em homologacao" */
export function simplify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/**
 * Converte um valor livre (chave ou rótulo em português) na chave canônica.
 * Retorna o valor original quando não reconhece, para que a validação acuse o erro.
 */
export function canonical(vocab: Vocab, value: unknown): unknown {
  if (typeof value !== 'string') return value
  const needle = simplify(value)
  for (const [key, aliases] of Object.entries(ALIASES[vocab])) {
    if (simplify(key) === needle || aliases.includes(needle)) return key
  }
  return value
}
