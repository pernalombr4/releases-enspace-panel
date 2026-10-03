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

    <p v-if="release.summary" class="text-sm text-default">
      {{ release.summary }}
    </p>

    <div v-if="release.links?.length" class="flex flex-wrap gap-2">
      <UButton
        v-for="link in release.links"
        :key="link.url"
        :to="link.url"
        target="_blank"
        :label="link.label"
        trailing-icon="i-lucide-arrow-up-right"
        color="neutral"
        variant="outline"
      />
    </div>

    <UAlert
      v-if="release.summary || release.links?.length"
      color="neutral"
      variant="subtle"
      icon="i-lucide-info"
      description="Os itens desta release não foram registrados no painel. O detalhamento está nas release notes."
    />
    <UEmpty
      v-else
      icon="i-lucide-file-question"
      title="Sem detalhes registrados"
      description="Esta release está no calendário, mas os itens e o resumo dela não foram registrados."
      :actions="[{ label: 'Ver calendário', icon: 'i-lucide-calendar-days', to: '/calendario', color: 'neutral', variant: 'outline' }]"
      variant="naked"
    />
  </UPageCard>
</template>
