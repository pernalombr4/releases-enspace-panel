<script setup lang="ts">
import { ITEM_KIND } from '#shared/domain/labels'
import type { ItemKind } from '#shared/domain/vocabulary'

const props = defineProps<{ kind?: ItemKind, size?: 'sm' | 'md' }>()
const meta = computed(() => props.kind ? ITEM_KIND[props.kind] : undefined)
</script>

<template>
  <UTooltip v-if="meta" :text="meta.description">
    <UBadge
      :label="meta.label"
      :icon="meta.icon"
      :color="meta.color"
      variant="outline"
      :size="size ?? 'sm'"
    />
  </UTooltip>
  <UBadge
    v-else
    label="Sem classificação"
    icon="i-lucide-circle-help"
    color="neutral"
    variant="outline"
    :size="size ?? 'sm'"
    class="text-dimmed"
  />
</template>
