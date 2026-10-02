<script setup lang="ts">
import { ITEM_KIND } from '#shared/domain/labels'
import type { ItemKind } from '#shared/domain/vocabulary'

const props = defineProps<{ kind: ItemKind }>()
const meta = computed(() => ITEM_KIND[props.kind])
</script>

<template>
  <UBadge
    :label="meta.label"
    :icon="meta.icon"
    color="neutral"
    variant="outline"
    size="sm"
  />
</template>
