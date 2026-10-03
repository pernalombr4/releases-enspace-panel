<script setup lang="ts">
import { hasDetails } from '#shared/domain/calendar'
import type { Release } from '#shared/domain/model'

defineProps<{ release: Release, eyebrow: string }>()
</script>

<template>
  <div v-if="hasDetails(release)" class="flex flex-col gap-4 sm:gap-6">
    <ReleaseSummary :release="release" :eyebrow="eyebrow" />
    <ReleaseStats :release="release" />

    <div class="grid gap-4 sm:gap-6 lg:grid-cols-2">
      <ReleaseDistribution :release="release" />
      <ReleaseTimeline :release="release" />
    </div>

    <div class="grid gap-4 sm:gap-6 lg:grid-cols-2">
      <ReleaseAttention :release="release" />
      <ReleaseRecentUpdates />
    </div>
  </div>

  <!-- Releases antigas registradas só com versão e data -->
  <ReleaseNoDetails v-else :release="release" />
</template>
