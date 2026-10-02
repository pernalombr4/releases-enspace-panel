<script setup lang="ts">
import type { Release } from '#shared/domain/model'

defineProps<{ release: Release, eyebrow: string }>()
</script>

<template>
  <UPageCard
    :title="release.name ? `Release ${release.version} · ${release.name}` : `Release ${release.version}`"
    :description="release.summary"
    variant="subtle"
  >
    <template #leading>
      <span class="text-xs font-semibold uppercase tracking-wide text-primary">{{ eyebrow }}</span>
    </template>

    <div class="flex flex-col gap-3">
      <ReleaseBadges :release="release" />
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
