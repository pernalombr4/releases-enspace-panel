import type { Milestone, Release, ReleaseItem } from './model'
import { itemProgress } from './progress'
import type { ItemKind, ItemStatus, ReleaseHealth } from './vocabulary'
import { ITEM_KINDS, ITEM_STATUSES } from './vocabulary'

/** A uma semana da subida, os itens deveriam estar, em média, ao menos em testes. */
const EXPECTED_A_WEEK_BEFORE = itemProgress({ status: 'testing' }) ?? 0

const DAY_MS = 86_400_000

/** Itens que contam para a release (adiados ficam de fora). */
export function scopedItems(release: Release): ReleaseItem[] {
  return release.items.filter(item => item.status !== 'postponed')
}

export function countByStatus(items: ReleaseItem[]): Record<ItemStatus, number> {
  const counts = Object.fromEntries(ITEM_STATUSES.map(s => [s, 0])) as Record<ItemStatus, number>
  for (const item of items) counts[item.status] += 1
  return counts
}

/** Itens por classificação; `none` conta os ainda sem classificação. */
export function countByKind(items: ReleaseItem[]): Record<ItemKind | 'none', number> {
  const counts = Object.fromEntries([...ITEM_KINDS, 'none'].map(k => [k, 0])) as Record<ItemKind | 'none', number>
  for (const item of items) counts[item.kind ?? 'none'] += 1
  return counts
}

export interface Progress {
  /** Prontos para release + liberados. */
  done: number
  total: number
  /** Andamento de 0 a 100: média do andamento de cada item (ver itemProgress). */
  percent: number
}

/** Andamento da release a partir das suas demandas; adiadas ficam de fora. */
export function releaseProgress(release: Release): Progress {
  const items = scopedItems(release)
  const done = items.filter(i => i.status === 'ready' || i.status === 'released').length
  const total = items.length
  const sum = items.reduce((acc, item) => acc + (itemProgress(item) ?? 0), 0)
  return { done, total, percent: total === 0 ? 0 : Math.round(sum / total) }
}

/** "2026-10-30" interpretado como data local (sem deslocar o dia por fuso). */
export function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

/** Dias inteiros de hoje até a data (negativo quando já passou). */
export function daysUntil(day: string, now: Date): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((parseDay(day).getTime() - today.getTime()) / DAY_MS)
}

/** Release oficialmente adiada (informado pelo time ou pelo Enspace). */
export function isPostponed(release: Release): boolean {
  return release.postponement?.postponed === true
}

/**
 * Saúde da release. O valor informado pelo time de Produto sempre vence;
 * sem ele, o painel deduz a partir do prazo, dos bloqueios e dos itens em risco.
 */
export function releaseHealth(release: Release, now: Date): ReleaseHealth {
  if (release.health) return release.health
  if (release.stage === 'released') return 'on_track'
  // Adiada e sem nova data: não há prazo a cumprir ainda.
  if (isPostponed(release) && !release.targetDate) return 'delayed'

  const items = scopedItems(release)
  const warning = items.some(i => i.status === 'blocked' || i.atRisk)
  if (!release.targetDate) return warning ? 'at_risk' : 'on_track'

  const days = daysUntil(release.targetDate, now)
  if (days < 0) return 'delayed'

  // Sem itens publicados ainda, não há progresso para avaliar.
  const { percent, total } = releaseProgress(release)
  if (warning || (days <= 7 && total > 0 && percent < EXPECTED_A_WEEK_BEFORE)) return 'at_risk'
  return 'on_track'
}

/** Próximo marco ainda não concluído, em ordem de data. */
export function nextMilestone(release: Release, now: Date): Milestone | undefined {
  return [...release.milestones]
    .sort((a, b) => a.date.localeCompare(b.date))
    .find(m => !isMilestoneDone(m, now))
}

export function isMilestoneDone(milestone: Milestone, now: Date): boolean {
  return milestone.done ?? daysUntil(milestone.date, now) < 0
}

/** Release a destacar por padrão: a primeira ainda não liberada. */
export function defaultRelease(releases: Release[]): Release | undefined {
  return releases.find(r => r.stage !== 'released') ?? releases[releases.length - 1]
}

export interface ItemUpdate {
  item: ReleaseItem
  version: string
}

export function recentUpdates(releases: Release[], limit: number): ItemUpdate[] {
  return releases
    .flatMap(release => release.items.map(item => ({ item, version: release.version })))
    .sort((a, b) => Date.parse(b.item.updatedAt) - Date.parse(a.item.updatedAt))
    .slice(0, limit)
}

/** Assinatura usada para destacar itens que mudaram desde a última busca. */
export function itemSignature(item: ReleaseItem): string {
  return `${item.status}|${item.updatedAt}|${item.title}|${item.note ?? ''}|${item.atRisk ? 'risco' : ''}`
}

export function changedItemIds(previous: Release[], next: Release[]): Set<string> {
  const before = new Map<string, string>()
  for (const r of previous) for (const i of r.items) before.set(`${r.version}:${i.id}`, itemSignature(i))

  const changed = new Set<string>()
  for (const r of next) {
    for (const i of r.items) {
      const key = `${r.version}:${i.id}`
      const sig = before.get(key)
      if (sig !== undefined && sig !== itemSignature(i)) changed.add(key)
      if (sig === undefined && previous.length > 0) changed.add(key)
    }
  }
  return changed
}
