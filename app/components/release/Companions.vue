<script setup lang="ts">
import type { Release } from '#shared/domain/model'
import { PRODUCT_META, companionReleases, isSubProduct, releasePath, releaseTitle } from '#shared/domain/products'

// Liga a release do ENSPACE às dos subprodutos que saem com ela, e vice-versa.
const props = defineProps<{ release: Release }>()
const { releases } = useReleases()

const origin = computed(() => isSubProduct(props.release.product)
  ? releases.value.find(r => r.product === 'en-space' && r.version === props.release.originVersion)
  : undefined)
const companions = computed(() => companionReleases(props.release, releases.value))
const verb = computed(() => props.release.stage === 'released' ? 'Saiu' : 'Sai')
</script>

<template>
  <div v-if="origin" class="flex flex-wrap items-center gap-2 text-sm text-muted">
    <span>{{ verb }} junto com a release {{ origin.version }} do ENSPACE.{{ release.items.length ? ' Os itens desta versão também estão nela.' : '' }}</span>
    <UButton
      :to="releasePath(origin)"
      :label="releaseTitle(origin)"
      :icon="PRODUCT_META[origin.product].icon"
      trailing-icon="i-lucide-arrow-right"
      color="neutral"
      variant="outline"
      size="sm"
    />
  </div>
  <div v-else-if="companions.length" class="flex flex-wrap items-center gap-2 text-sm text-muted">
    <span>{{ companions.length === 1 ? 'Também sai' : 'Também saem' }} com esta release:</span>
    <UButton
      v-for="companion in companions"
      :key="companion.product"
      :to="releasePath(companion)"
      :label="releaseTitle(companion)"
      :icon="PRODUCT_META[companion.product].icon"
      trailing-icon="i-lucide-arrow-right"
      color="neutral"
      variant="outline"
      size="sm"
    />
  </div>
</template>
