<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { plural } from '#shared/domain/format'
import type { Release } from '#shared/domain/model'
import { releaseTickets, type ClientTicket } from '#shared/domain/tickets'

const props = defineProps<{ release: Release }>()
const { itemLink } = useItemLink()

// Só chamados com cliente relacionado, das demandas que estão nesta release.
const tickets = computed(() => releaseTickets(props.release))
const clients = computed(() => new Set(tickets.value.map(t => t.client)).size)

const ULink = resolveComponent('ULink')
const ItemStatusBadge = resolveComponent('ItemStatusBadge')

const columns: TableColumn<ClientTicket>[] = [{
  accessorKey: 'ref',
  header: 'Chamado',
  cell: ({ row }) => h('span', { class: 'font-mono text-xs text-highlighted' }, row.original.ref)
}, {
  accessorKey: 'title',
  header: 'Título',
  cell: ({ row }) => h('span', { class: 'block min-w-56 whitespace-normal' }, row.original.title ?? '—')
}, {
  accessorKey: 'client',
  header: 'Cliente',
  cell: ({ row }) => h('span', { class: 'block min-w-40 whitespace-normal font-medium text-highlighted' }, row.original.client)
}, {
  id: 'items',
  header: 'Demanda na release',
  cell: ({ row }) => h('div', { class: 'flex min-w-56 flex-col gap-1.5' }, row.original.items.map(item =>
    h('div', { class: 'flex flex-col items-start gap-1' }, [
      h(ULink, { to: itemLink(props.release.version, item.id), class: 'whitespace-normal text-sm' }, () => [
        h('span', { class: 'font-mono text-xs text-muted' }, `${item.id} `),
        item.title
      ]),
      h(ItemStatusBadge, { status: item.status, size: 'sm' })
    ])
  ))
}]
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
    <UTable v-if="tickets.length" :data="tickets" :columns="columns" />
    <p v-else class="ps-6 text-sm text-dimmed">
      Nenhum chamado de cliente vinculado às demandas desta release.
    </p>
  </section>
</template>
