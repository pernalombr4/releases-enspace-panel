<script setup lang="ts">
import type { TimelineItem } from '@nuxt/ui'
import { formatCountdown, formatDay } from '#shared/domain/format'
import { daysUntil, isMilestoneDone } from '#shared/domain/metrics'
import type { Release } from '#shared/domain/model'

const props = defineProps<{ release: Release }>()
const now = useNow({ interval: 60_000 })

const milestones = computed(() => [...props.release.milestones].sort((a, b) => a.date.localeCompare(b.date)))
const nextIndex = computed(() => milestones.value.findIndex(m => !isMilestoneDone(m, now.value)))

const items = computed<TimelineItem[]>(() => milestones.value.map((m, index) => {
  const done = isMilestoneDone(m, now.value)
  const days = daysUntil(m.date, now.value)
  return {
    value: index,
    date: formatDay(m.date),
    title: m.label,
    description: done ? 'Concluído' : days === 0 ? 'Hoje' : formatCountdown(m.date, now.value),
    icon: done ? 'i-lucide-check' : index === nextIndex.value ? 'i-lucide-flag' : 'i-lucide-circle'
  }
}))

// O Timeline marca como concluídos os itens antes do ativo.
const active = computed(() => nextIndex.value === -1 ? milestones.value.length - 1 : nextIndex.value)
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="font-semibold text-highlighted">
        Linha do tempo
      </h2>
    </template>

    <UTimeline
      v-if="items.length"
      :items="items"
      :model-value="active"
      size="sm"
    />
    <UEmpty
      v-else
      icon="i-lucide-calendar-range"
      title="Marcos ainda não definidos"
      variant="naked"
    />
  </UCard>
</template>
