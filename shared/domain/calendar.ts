import { isPostponed } from './metrics'
import type { Release } from './model'
import type { ReleaseType } from './vocabulary'

/** Tipo informado ou deduzido da versão: 3.0 → major, 3.1 → minor, 3.1.2 → patch. */
export function releaseType(release: Pick<Release, 'version' | 'type'>): ReleaseType {
  if (release.type) return release.type
  const [, minor = 0, patch = 0] = release.version
    .replace(/^v/i, '')
    .split(/[.-]/)
    .map(part => Number.parseInt(part, 10) || 0)
  if (patch > 0) return 'patch'
  if (minor > 0) return 'minor'
  return 'major'
}

/** Data que vai para o calendário: a real, se já saiu; senão a prevista. */
export function releaseDate(release: Release): string | undefined {
  return release.releasedAt ?? release.targetDate
}

/**
 * Há algo a mostrar além da data? Releases antigas podem ter só versão e data;
 * as que ainda não saíram sempre têm página, mesmo antes de os itens serem publicados.
 */
export function hasDetails(release: Release): boolean {
  return showsOverview(release) || Boolean(release.summary) || release.milestones.length > 0 || Boolean(release.links?.length)
}

/**
 * Painel completo (andamento, itens, para as áreas) para releases futuras ou com
 * itens registrados. Releases antigas sem itens mostram só o resumo e as release notes.
 */
export function showsOverview(release: Release): boolean {
  return release.stage !== 'released' || release.items.length > 0
}

/** `moved` marca a data original de uma release adiada. */
export type CalendarStatus = 'released' | 'postponed' | 'planned' | 'moved'

export interface CalendarEntry {
  date: string
  release: Release
  type: ReleaseType
  status: CalendarStatus
}

export function calendarStatus(release: Release): CalendarStatus {
  if (release.stage === 'released' || release.releasedAt) return 'released'
  if (isPostponed(release)) return 'postponed'
  return 'planned'
}

/** Releases com data, em ordem cronológica. */
export function calendarEntries(releases: Release[]): CalendarEntry[] {
  return releases
    .flatMap((release) => {
      const date = releaseDate(release)
      return date ? [{ date, release, type: releaseType(release), status: calendarStatus(release) }] : []
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Datas originais das releases adiadas, para o calendário mostrar de onde cada uma saiu. */
export function originalDateEntries(releases: Release[]): CalendarEntry[] {
  return releases
    .flatMap((release) => {
      const date = isPostponed(release) ? release.postponement?.originalDate : undefined
      return date && date !== releaseDate(release)
        ? [{ date, release, type: releaseType(release), status: 'moved' as const }]
        : []
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Releases sem data (ainda sem previsão), para não sumirem do histórico. */
export function undatedReleases(releases: Release[]): Release[] {
  return releases.filter(release => !releaseDate(release))
}
