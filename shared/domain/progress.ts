import type { ReleaseItem } from './model'
import { RELEASE_STAGES, type ItemStatus, type ReleaseStage } from './vocabulary'

// A release é feita das suas demandas: o andamento e a fase dela saem do
// status de cada item. Este módulo só importa tipos do modelo, para o schema
// poder usá-lo ao montar a release.

/** Etapas que um item percorre até ficar pronto. */
export const ITEM_STEPS = ['planned', 'in_progress', 'testing', 'ready'] as const satisfies readonly ItemStatus[]

/**
 * Em que etapa o item está (índice de ITEM_STEPS). Bloqueado conta como em
 * desenvolvimento; liberado, como pronto. Adiado sai da release.
 */
export const ITEM_STEP_INDEX: Record<Exclude<ItemStatus, 'postponed'>, number> = {
  planned: 0,
  in_progress: 1,
  blocked: 1,
  testing: 2,
  ready: 3,
  released: 3
}

/** Andamento do item de 0 a 100, ou undefined para item adiado. */
export function itemProgress(item: Pick<ReleaseItem, 'status'>): number | undefined {
  if (item.status === 'postponed') return undefined
  return Math.round((ITEM_STEP_INDEX[item.status] / (ITEM_STEPS.length - 1)) * 100)
}

/**
 * Fase da release pelo andamento dos itens:
 * todos planejados → em planejamento; algum começou → em desenvolvimento;
 * todos em testes ou além → em homologação; todos prontos → pronta para subir;
 * todos liberados → liberada.
 */
export function stageFromItems(items: Pick<ReleaseItem, 'status'>[]): ReleaseStage {
  const scoped = items.filter(i => i.status !== 'postponed')
  if (!scoped.length) return 'planning'
  const all = (statuses: ItemStatus[]) => scoped.every(i => statuses.includes(i.status))
  if (all(['released'])) return 'released'
  if (all(['ready', 'released'])) return 'ready'
  if (all(['testing', 'ready', 'released'])) return 'testing'
  if (all(['planned'])) return 'planning'
  return 'development'
}

/** A fase mais avançada entre a informada pelo time e a que os itens mostram. */
export function furthestStage(a: ReleaseStage, b: ReleaseStage): ReleaseStage {
  return RELEASE_STAGES.indexOf(a) >= RELEASE_STAGES.indexOf(b) ? a : b
}
