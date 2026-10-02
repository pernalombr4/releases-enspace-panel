<script setup lang="ts">
import type { ProgressGroupItem } from '@nuxt/ui'
import { plural } from '#shared/domain/format'
import { ITEM_STATUS, PROGRESS_ORDER } from '#shared/domain/labels'
import { countByStatus, releaseProgress } from '#shared/domain/metrics'
import type { Release } from '#shared/domain/model'

const props = defineProps<{ release: Release }>()

const counts = computed(() => countByStatus(props.release.items))
const progress = computed(() => releaseProgress(props.release))

const segments = computed<ProgressGroupItem[]>(() => PROGRESS_ORDER
  .filter(status => counts.value[status] > 0)
  .map(status => ({
    label: `${ITEM_STATUS[status].label} · ${counts.value[status]}`,
    value: counts.value[status],
    color: ITEM_STATUS[status].color,
    icon: ITEM_STATUS[status].icon
  })))
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <h2 class="font-semibold text-highlighted">
          Itens por status
        </h2>
        <span class="text-sm text-muted">{{ plural(progress.total, 'item cotado', 'itens cotados') }}</span>
      </div>
    </template>

    <div v-if="progress.total" class="flex flex-col gap-4">
      <div class="flex items-baseline gap-2">
        <span class="text-4xl font-bold text-highlighted">{{ progress.percent }}%</span>
        <span class="text-sm text-muted">{{ progress.done }} de {{ progress.total }} prontos ou liberados</span>
      </div>
      <UProgressGroup :items="segments" :max="progress.total" size="lg" />
      <p v-if="counts.postponed" class="text-xs text-muted">
        {{ plural(counts.postponed, 'item adiado não entra', 'itens adiados não entram') }} na conta.
      </p>
    </div>
    <UEmpty
      v-else
      icon="i-lucide-inbox"
      title="Nenhum item cotado ainda"
      variant="naked"
    />
  </UCard>
</template>
