<script setup lang="ts">
import { ITEM_STATUS } from '#shared/domain/labels'
import type { ItemStatus } from '#shared/domain/vocabulary'

const props = defineProps<{ status: ItemStatus, size?: 'sm' | 'md' }>()
const meta = computed(() => ITEM_STATUS[props.status])
</script>

<template>
  <UTooltip :text="meta.description">
    <UBadge
      :label="meta.label"
      :icon="meta.icon"
      :color="meta.color"
      variant="subtle"
      :size="size ?? 'md'"
    />
  </UTooltip>
</template>
