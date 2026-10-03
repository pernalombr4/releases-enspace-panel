<script setup lang="ts">
import { RELEASE_TYPE_META } from '#shared/domain/labels'
import type { ReleaseType } from '#shared/domain/vocabulary'

const props = defineProps<{ type: ReleaseType }>()
const meta = computed(() => RELEASE_TYPE_META[props.type])
</script>

<template>
  <UTooltip :text="meta.description">
    <UBadge :label="meta.label" :color="meta.color" :variant="meta.variant" />
  </UTooltip>
</template>
