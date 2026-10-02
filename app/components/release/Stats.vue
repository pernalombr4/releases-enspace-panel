<script setup lang="ts">
import { formatCountdown, formatDay, formatDayYear, plural } from '#shared/domain/format'
import { countByStatus, nextMilestone, releaseProgress, scopedItems } from '#shared/domain/metrics'
import type { Release } from '#shared/domain/model'

const props = defineProps<{ release: Release }>()
const now = useNow({ interval: 60_000 })

const stats = computed(() => {
  const r = props.release
  const progress = releaseProgress(r)
  const counts = countByStatus(scopedItems(r))
  const milestone = nextMilestone(r, now.value)
  const released = r.stage === 'released'

  return [{
    title: released ? 'Liberada em' : 'Subida prevista',
    icon: 'i-lucide-calendar-days',
    value: released && r.releasedAt ? formatDayYear(r.releasedAt) : r.targetDate ? formatDay(r.targetDate) : 'A definir',
    badge: !released && r.targetDate ? { label: formatCountdown(r.targetDate, now.value), color: 'neutral' as const } : undefined
  }, {
    title: 'Progresso',
    icon: 'i-lucide-chart-no-axes-column-increasing',
    value: `${progress.percent}%`,
    badge: { label: `${progress.done} de ${progress.total} prontos`, color: 'primary' as const }
  }, {
    title: 'Próximo marco',
    icon: 'i-lucide-flag',
    value: milestone ? milestone.label : released ? 'Concluída' : 'A definir',
    badge: milestone ? { label: formatDay(milestone.date), color: 'neutral' as const } : undefined
  }, {
    title: 'Bloqueios',
    icon: 'i-lucide-octagon-alert',
    value: String(counts.blocked),
    badge: counts.blocked
      ? { label: plural(counts.blocked, 'item parado', 'itens parados'), color: 'error' as const }
      : { label: 'nenhum', color: 'success' as const }
  }]
})
</script>

<template>
  <UPageGrid class="gap-4 sm:gap-6 lg:grid-cols-4 lg:gap-px">
    <UPageCard
      v-for="stat in stats"
      :key="stat.title"
      :icon="stat.icon"
      :title="stat.title"
      variant="subtle"
      :ui="{
        container: 'gap-y-1.5',
        wrapper: 'items-start',
        leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col',
        title: 'font-normal text-muted text-xs uppercase'
      }"
      class="hover:z-1 lg:rounded-none lg:first:rounded-l-lg lg:last:rounded-r-lg"
    >
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-2xl font-semibold text-highlighted">
          {{ stat.value }}
        </span>
        <UBadge
          v-if="stat.badge"
          :label="stat.badge.label"
          :color="stat.badge.color"
          variant="subtle"
          class="text-xs"
        />
      </div>
    </UPageCard>
  </UPageGrid>
</template>
