<script setup lang="ts">
import type { EnTableColumn } from '@be-enlighten/enspace-sdk-ui/base'
import { plural } from '#shared/domain/format'
import type { Release } from '#shared/domain/model'
import { releaseTickets } from '#shared/domain/tickets'

const props = defineProps<{ release: Release }>()
const { itemLink } = useItemLink()

// Só chamados com cliente relacionado, das demandas que estão nesta release.
const tickets = computed(() => releaseTickets(props.release))
const clients = computed(() => new Set(tickets.value.map(t => t.client)).size)

const columns: EnTableColumn[] = [
  { key: 'ref', label: 'Chamado' },
  { key: 'title', label: 'Título' },
  { key: 'client', label: 'Cliente' },
  { key: 'items', label: 'Demanda na release' }
]
</script>

<template>
  <section class="flex flex-col gap-2">
    <div class="flex items-center gap-2">
      <UIcon name="i-lucide-ticket" class="size-4 shrink-0 text-muted" />
      <h3 class="text-sm font-medium text-highlighted">
        Chamados de clientes atendidos
      </h3>
      <UBadge
        :label="String(tickets.length)"
        color="neutral"
        variant="subtle"
        size="sm"
      />
    </div>
    <p class="ps-6 text-xs text-muted">
      CS e Suporte podem avisar cada cliente. Só entram chamados com cliente relacionado{{ tickets.length ? ` (${plural(clients, 'cliente', 'clientes')})` : '' }}.
    </p>
    <EnTable v-if="tickets.length" :columns="columns" :rows="tickets">
      <template #cell-ref="{ row }">
        <span class="font-mono text-xs text-highlighted">{{ row.ref }}</span>
      </template>
      <template #cell-title="{ row }">
        {{ row.title ?? '—' }}
      </template>
      <template #cell-client="{ row }">
        <span class="font-medium text-highlighted">{{ row.client }}</span>
      </template>
      <template #cell-items="{ row }">
        <div class="flex flex-col gap-1.5">
          <div v-for="item in row.items" :key="item.id" class="flex flex-col items-start gap-1">
            <ULink :to="itemLink(release.version, item.id)" class="text-sm">
              <span class="font-mono text-xs text-muted">{{ item.id }} </span>{{ item.title }}
            </ULink>
            <ItemStatusBadge :status="item.status" size="sm" />
          </div>
        </div>
      </template>
    </EnTable>
    <p v-else class="ps-6 text-sm text-dimmed">
      Nenhum chamado de cliente vinculado às demandas desta release.
    </p>
  </section>
</template>
