<script setup lang="ts">
import { RELEASE_HEALTH_META, RELEASE_STAGE } from '#shared/domain/labels'
import { releaseHealth } from '#shared/domain/metrics'
import type { Release } from '#shared/domain/model'

const props = defineProps<{ release: Release }>()
const now = useNow({ interval: 60_000 })

const stage = computed(() => RELEASE_STAGE[props.release.stage])
const health = computed(() => RELEASE_HEALTH_META[releaseHealth(props.release, now.value)])
const automatic = computed(() => !props.release.health && props.release.stage !== 'released')
</script>

<template>
  <div class="flex flex-wrap items-center gap-1.5">
    <UTooltip :text="stage.description">
      <UBadge
        :label="stage.label"
        :icon="stage.icon"
        color="neutral"
        variant="outline"
      />
    </UTooltip>
    <UTooltip :text="automatic ? `${health.description} (calculado pelo prazo e pelos bloqueios)` : health.description">
      <UBadge
        :label="health.label"
        :icon="health.icon"
        :color="health.color"
        variant="subtle"
      />
    </UTooltip>
  </div>
</template>
