<script setup lang="ts">
import { releaseType } from '#shared/domain/calendar'
import { formatDayYear } from '#shared/domain/format'
import type { Release } from '#shared/domain/model'

const props = defineProps<{ release: Release }>()

const when = computed(() => {
  const r = props.release
  if (r.releasedAt) return `Liberada em ${formatDayYear(r.releasedAt)}.`
  if (r.targetDate) return `Prevista para ${formatDayYear(r.targetDate)}.`
  return 'Data ainda não definida.'
})
</script>

<template>
  <UPageCard :title="`Release ${release.version}`" :description="when" variant="subtle">
    <div class="flex flex-wrap gap-1.5">
      <ReleaseTypeBadge :type="releaseType(release)" />
    </div>
    <UEmpty
      icon="i-lucide-file-question"
      title="Sem detalhes registrados"
      description="Esta release está no calendário, mas os itens e o resumo dela não foram registrados."
      :actions="[{ label: 'Ver calendário', icon: 'i-lucide-calendar-days', to: '/calendario', color: 'neutral', variant: 'outline' }]"
      variant="naked"
    />
  </UPageCard>
</template>
