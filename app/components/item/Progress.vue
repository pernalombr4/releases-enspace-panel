<script setup lang="ts">
import { ITEM_STATUS } from '#shared/domain/labels'
import type { ReleaseItem } from '#shared/domain/model'
import { ITEM_STEP_INDEX, ITEM_STEPS, itemProgress } from '#shared/domain/progress'

const props = defineProps<{ item: ReleaseItem, steps?: boolean }>()

// Com `steps`, a barra mostra o nome de cada etapa (usado no detalhe do item).
const STEP_LABELS = ITEM_STEPS.map(s => s === 'ready' ? 'Pronto' : ITEM_STATUS[s].label)

const step = computed(() => props.item.status === 'postponed' ? undefined : ITEM_STEP_INDEX[props.item.status])
const percent = computed(() => itemProgress(props.item))
const color = computed(() => ITEM_STATUS[props.item.status].color)
</script>

<template>
  <UTooltip v-if="step !== undefined && !steps" :text="`Andamento do item: ${percent}%`">
    <UProgress
      :model-value="step"
      :max="ITEM_STEPS.length - 1"
      :color="color"
      size="xs"
    />
  </UTooltip>
  <UProgress
    v-else-if="step !== undefined"
    :model-value="step"
    :max="STEP_LABELS"
    :color="color"
    size="sm"
  />
</template>
