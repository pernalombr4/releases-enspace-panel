<script setup lang="ts">
import { formatRelative } from '#shared/domain/format'

defineProps<{ collapsed?: boolean }>()

const config = useRuntimeConfig()
const { fetchedAt, error, loading, refresh } = useReleases()
const now = useNow({ interval: 1000 })

const state = computed(() => {
  if (error.value) return { color: 'error' as const, label: 'Sem conexão' }
  if (!fetchedAt.value) return { color: 'neutral' as const, label: 'Carregando' }
  const stale = now.value.getTime() - Date.parse(fetchedAt.value) > config.public.refreshSeconds * 3000
  return stale ? { color: 'warning' as const, label: 'Sincronizando' } : { color: 'success' as const, label: 'Ao vivo' }
})

const detail = computed(() => fetchedAt.value
  ? `atualizado ${formatRelative(fetchedAt.value, now.value)}`
  : 'buscando dados…')
</script>

<template>
  <div class="flex w-full items-center gap-2" role="status" aria-live="polite">
    <UTooltip :text="`${state.label} · ${detail}`" :disabled="!collapsed">
      <UChip
        :color="state.color"
        standalone
        inset
        size="xl"
        class="mx-1.5"
      />
    </UTooltip>

    <div v-if="!collapsed" class="min-w-0 flex-1 text-xs">
      <p class="font-medium text-highlighted">
        {{ state.label }}
      </p>
      <p class="truncate text-muted">
        {{ detail }}
      </p>
    </div>

    <UTooltip v-if="!collapsed" text="Atualizar agora">
      <UButton
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="ghost"
        size="sm"
        :loading="loading"
        aria-label="Atualizar agora"
        @click="refresh"
      />
    </UTooltip>
  </div>
</template>
