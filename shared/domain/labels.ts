import type { ItemKind, ItemStatus, Level, ReleaseHealth, ReleaseStage } from './vocabulary'

/** Cores semânticas do Nuxt UI (definidas em app.config.ts). */
export type UiColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

interface Meta {
  label: string
  description: string
  color: UiColor
  icon: string
}

// Ordem das colunas do quadro: segue o fluxo de trabalho.
export const BOARD_ORDER: ItemStatus[] = ['blocked', 'planned', 'in_progress', 'testing', 'ready', 'released']

// Ordem da distribuição: do mais perto de chegar ao mais distante.
export const PROGRESS_ORDER: ItemStatus[] = ['released', 'ready', 'testing', 'in_progress', 'planned', 'blocked']

export const ITEM_STATUS: Record<ItemStatus, Meta> = {
  planned: {
    label: 'Planejado',
    description: 'Cotado para esta release, mas ainda não começou a ser desenvolvido.',
    color: 'neutral',
    icon: 'i-lucide-circle-dashed'
  },
  in_progress: {
    label: 'Em desenvolvimento',
    description: 'O time está construindo a funcionalidade.',
    color: 'info',
    icon: 'i-lucide-hammer'
  },
  testing: {
    label: 'Em testes',
    description: 'Desenvolvimento concluído; passando por QA e homologação.',
    color: 'secondary',
    icon: 'i-lucide-test-tube-diagonal'
  },
  ready: {
    label: 'Pronto para release',
    description: 'Aprovado nos testes e aguardando a data de subida.',
    color: 'primary',
    icon: 'i-lucide-package-check'
  },
  released: {
    label: 'Liberado',
    description: 'Já está disponível em produção para os clientes.',
    color: 'success',
    icon: 'i-lucide-rocket'
  },
  blocked: {
    label: 'Bloqueado',
    description: 'Parado por um impedimento (dependência externa, decisão pendente...). Veja a observação do item.',
    color: 'error',
    icon: 'i-lucide-octagon-alert'
  },
  postponed: {
    label: 'Adiado',
    description: 'Saiu desta release e foi movido para uma próxima. Não entra no cálculo de progresso.',
    color: 'neutral',
    icon: 'i-lucide-calendar-clock'
  }
}

export const ITEM_KIND: Record<ItemKind, { label: string, icon: string }> = {
  feature: { label: 'Nova funcionalidade', icon: 'i-lucide-sparkles' },
  improvement: { label: 'Melhoria', icon: 'i-lucide-trending-up' },
  fix: { label: 'Correção', icon: 'i-lucide-wrench' },
  integration: { label: 'Integração', icon: 'i-lucide-plug' },
  security: { label: 'Segurança', icon: 'i-lucide-shield-check' },
  performance: { label: 'Performance', icon: 'i-lucide-gauge' }
}

export const IMPACT_LABEL: Record<Level, string> = {
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo'
}

export const PRIORITY_LABEL: Record<Level, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa'
}

export const RELEASE_STAGE: Record<ReleaseStage, Omit<Meta, 'color'>> = {
  planning: {
    label: 'Em planejamento',
    description: 'Escopo sendo definido; itens ainda podem entrar ou sair.',
    icon: 'i-lucide-list-todo'
  },
  development: {
    label: 'Em desenvolvimento',
    description: 'Escopo fechado e itens em construção.',
    icon: 'i-lucide-code-xml'
  },
  code_freeze: {
    label: 'Code freeze',
    description: 'Nada novo entra; só correções até a subida.',
    icon: 'i-lucide-snowflake'
  },
  testing: {
    label: 'Em homologação',
    description: 'Release completa sendo validada antes de ir para produção.',
    icon: 'i-lucide-test-tube-diagonal'
  },
  released: {
    label: 'Liberada',
    description: 'Publicada em produção.',
    icon: 'i-lucide-rocket'
  }
}

export const RELEASE_HEALTH_META: Record<ReleaseHealth, Meta> = {
  on_track: {
    label: 'No prazo',
    description: 'Sem riscos conhecidos para a data de subida.',
    color: 'success',
    icon: 'i-lucide-circle-check'
  },
  at_risk: {
    label: 'Em atenção',
    description: 'Há bloqueios ou pouco tempo para o que falta; a data pode mudar.',
    color: 'warning',
    icon: 'i-lucide-triangle-alert'
  },
  delayed: {
    label: 'Atrasada',
    description: 'A data prevista passou ou foi oficialmente adiada.',
    color: 'error',
    icon: 'i-lucide-clock-alert'
  }
}
