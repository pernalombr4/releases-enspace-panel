import type { UiColor } from '#shared/domain/labels'

/** Classes estáticas de texto por cor semântica (o Tailwind precisa vê-las por extenso). */
export const TEXT_COLOR: Record<UiColor, string> = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  success: 'text-success',
  info: 'text-info',
  warning: 'text-warning',
  error: 'text-error',
  neutral: 'text-muted'
}
