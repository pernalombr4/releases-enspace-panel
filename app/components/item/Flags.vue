<script setup lang="ts">
import { itemMarkers } from '#shared/domain/markers'
import type { ReleaseItem } from '#shared/domain/model'

const props = defineProps<{ item: ReleaseItem }>()

const markers = computed(() => itemMarkers(props.item))
</script>

<template>
  <div v-if="markers.length || item.audience" class="flex flex-wrap gap-1">
    <UTooltip v-for="marker in markers" :key="marker.key" :text="marker.description">
      <UBadge
        :label="marker.label"
        :icon="marker.icon"
        :color="marker.color"
        variant="soft"
        size="sm"
      />
    </UTooltip>
    <UTooltip v-if="item.audience" text="Quem recebe a mudança">
      <UBadge
        :label="item.audience"
        icon="i-lucide-users"
        color="neutral"
        variant="soft"
        size="sm"
      />
    </UTooltip>
  </div>
</template>
