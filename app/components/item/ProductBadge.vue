<script setup lang="ts">
import { PRODUCT_META, isSubProduct, type Product } from '#shared/domain/products'

// Selo do subproduto (Word Plugin, Beni App) num item da release do ENSPACE.
// Item do ENSPACE não leva selo.
const props = defineProps<{ product?: Product, size?: 'sm' | 'md' }>()
const meta = computed(() => props.product && isSubProduct(props.product) ? PRODUCT_META[props.product] : undefined)
</script>

<template>
  <UTooltip v-if="meta" :text="`Item do ${meta.label}: também aparece na release do ${meta.label}`">
    <UBadge
      :label="meta.label"
      :icon="meta.icon"
      color="neutral"
      variant="outline"
      :size="size ?? 'sm'"
    />
  </UTooltip>
</template>
