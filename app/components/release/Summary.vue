<script setup lang="ts">
import { formatDateTime, formatDayYear } from '#shared/domain/format'
import type { Release } from '#shared/domain/model'
import { releaseTitle } from '#shared/domain/products'

const props = defineProps<{ release: Release, eyebrow: string }>()

const postponedText = computed(() => {
  const info = props.release.postponement
  if (!info?.postponed) return undefined
  const from = info.originalDate ? `prevista para ${formatDayYear(info.originalDate)}` : 'prevista'
  const to = props.release.targetDate ? `foi adiada para ${formatDayYear(props.release.targetDate)}` : 'foi adiada; a nova data ainda será definida'
  return [
    `A subida ${from} ${to}.`,
    info.reason && `Motivo: ${info.reason}`,
    info.announcedAt && `Comunicado em ${formatDateTime(info.announcedAt)}.`
  ].filter(Boolean).join(' ')
})
</script>

<template>
  <UPageCard
    :title="release.name ? `${releaseTitle(release)} · ${release.name}` : releaseTitle(release)"
    :description="release.summary"
    variant="subtle"
  >
    <template #leading>
      <span class="text-xs font-semibold uppercase tracking-wide text-primary">{{ eyebrow }}</span>
    </template>

    <div class="flex flex-col gap-3">
      <ReleaseBadges :release="release" />
      <ReleaseCompanions :release="release" />
      <UAlert
        v-if="postponedText"
        color="warning"
        variant="subtle"
        icon="i-lucide-calendar-x"
        title="Release adiada"
        :description="postponedText"
      />
      <UAlert
        v-if="release.healthNote"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        :description="release.healthNote"
      />
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
          size="sm"
        />
      </div>
    </div>
  </UPageCard>
</template>
