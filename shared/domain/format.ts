import { daysUntil, parseDay } from './metrics'

const dayFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
const dayYearFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
const weekdayFmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
const dateTimeFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit'
})

const clean = (s: string) => s.replace(/\./g, '').replace(/ de /g, ' ')

/** "30 out" */
export function formatDay(day: string): string {
  return clean(dayFmt.format(parseDay(day)))
}

/** "30 out 2026" */
export function formatDayYear(day: string): string {
  return clean(dayYearFmt.format(parseDay(day)))
}

/** "sex" */
export function formatWeekday(day: string): string {
  return clean(weekdayFmt.format(parseDay(day)))
}

/** "02 out, 18:40" */
export function formatDateTime(iso: string): string {
  return clean(dateTimeFmt.format(new Date(iso)))
}

/** "faltam 28 dias", "é hoje", "há 3 dias" */
export function formatCountdown(day: string, now: Date): string {
  const days = daysUntil(day, now)
  if (days === 0) return 'é hoje'
  if (days === 1) return 'é amanhã'
  if (days > 1) return `faltam ${days} dias`
  if (days === -1) return 'foi ontem'
  return `há ${-days} dias`
}

/** "agora", "há 45 s", "há 3 min", "há 2 h", "há 4 dias" */
export function formatRelative(iso: string, now: Date): string {
  const seconds = Math.max(0, Math.round((now.getTime() - Date.parse(iso)) / 1000))
  if (seconds < 10) return 'agora'
  if (seconds < 60) return `há ${seconds} s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours} h`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'ontem' : `há ${days} dias`
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}
