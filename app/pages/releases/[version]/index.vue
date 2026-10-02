<script setup lang="ts">
import type { Release } from '#shared/domain/model'

defineProps<{ release: Release, eyebrow: string }>()
</script>

<template>
  <div class="flex flex-col gap-4 sm:gap-6">
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
</template>
