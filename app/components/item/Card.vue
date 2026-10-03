<script setup lang="ts">
import { formatRelative } from '#shared/domain/format'
import { IMPACT_LABEL } from '#shared/domain/labels'
import type { ReleaseItem } from '#shared/domain/model'

const props = defineProps<{ item: ReleaseItem, version: string, changed?: boolean }>()

const now = useNow({ interval: 30_000 })
const { itemLink } = useItemLink()

const meta = computed(() => [
  props.item.module,
  props.item.impact && `Impacto ${IMPACT_LABEL[props.item.impact].toLowerCase()}`
].filter(Boolean).join(' · '))
</script>

<template>
  <UPageCard
    :to="itemLink(version, item.id)"
    variant="outline"
    :highlight="changed"
    :ui="{ container: 'p-3 sm:p-3 gap-y-2', title: 'text-sm', description: 'text-xs' }"
  >
    <template #title>
      <span class="block font-mono text-xs text-muted">{{ item.id }}</span>
      {{ item.title }}
    </template>

    <template #description>
      {{ meta }}
    </template>

    <UAlert
      v-if="(item.status === 'blocked' || item.atRisk) && item.note"
      :color="item.status === 'blocked' ? 'error' : 'warning'"
      variant="subtle"
      :description="item.note"
      :ui="{ root: 'p-2', description: 'text-xs' }"
    />

    <div class="flex flex-wrap gap-1">
      <ItemKindBadge :kind="item.kind" />
      <ItemFlags :item="item" class="contents" />
    </div>

    <p class="text-xs text-dimmed">
      <span v-if="changed" class="font-medium text-primary">Atualizado agora</span>
      <span v-else>Atualizado {{ formatRelative(item.updatedAt, now) }}</span>
    </p>
  </UPageCard>
</template>
