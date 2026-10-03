<script setup lang="ts">
import { releaseType } from '#shared/domain/calendar'
import { POSTPONEMENT_META, RELEASE_HEALTH_META, RELEASE_STAGE } from '#shared/domain/labels'
import { releaseHealth } from '#shared/domain/metrics'
import type { Release } from '#shared/domain/model'

const props = defineProps<{ release: Release }>()
const now = useNow({ interval: 60_000 })

const stage = computed(() => RELEASE_STAGE[props.release.stage])
const health = computed(() => RELEASE_HEALTH_META[releaseHealth(props.release, now.value)])
const automatic = computed(() => !props.release.health && props.release.stage !== 'released')

// Só afirma "adiada" ou "data mantida" quando essa informação foi publicada.
const postponement = computed(() => {
  const info = props.release.postponement
  if (!info || props.release.stage === 'released') return undefined
  return info.postponed ? POSTPONEMENT_META.postponed : POSTPONEMENT_META.kept
})
</script>

<template>
  <div class="flex flex-wrap items-center gap-1.5">
    <ReleaseTypeBadge :type="releaseType(release)" />
    <UTooltip :text="stage.description">
      <UBadge
        :label="stage.label"
        :icon="stage.icon"
        color="neutral"
        variant="outline"
      />
    </UTooltip>
    <UTooltip v-if="postponement" :text="postponement.description">
      <UBadge
        :label="postponement.label"
        :icon="postponement.icon"
        :color="postponement.color"
        :variant="release.postponement?.postponed ? 'solid' : 'outline'"
      />
    </UTooltip>
    <UTooltip v-if="release.stage !== 'released'" :text="automatic ? `${health.description} (calculado pelo prazo e pelos bloqueios)` : health.description">
      <UBadge
        :label="health.label"
        :icon="health.icon"
        :color="health.color"
        variant="subtle"
      />
    </UTooltip>
  </div>
</template>
