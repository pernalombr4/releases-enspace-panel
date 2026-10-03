<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { formatRelative } from '#shared/domain/format'
import { IMPACT_LABEL } from '#shared/domain/labels'
import type { ReleaseItem } from '#shared/domain/model'

const props = defineProps<{ items: ReleaseItem[], version: string, changed: Set<string> }>()

const ItemStatusBadge = resolveComponent('ItemStatusBadge')
const ItemKindBadge = resolveComponent('ItemKindBadge')
const ItemFlags = resolveComponent('ItemFlags')
const ULink = resolveComponent('ULink')

const now = useNow({ interval: 30_000 })
const { itemLink } = useItemLink()

const columns: TableColumn<ReleaseItem>[] = [{
  accessorKey: 'title',
  header: 'Item',
  cell: ({ row }) => h('div', { class: 'flex flex-col gap-1.5 min-w-64' }, [
    h(ULink, { to: itemLink(props.version, row.original.id), class: 'flex flex-col' }, () => [
      h('span', { class: 'font-mono text-xs text-muted' }, row.original.id),
      h('span', { class: 'font-medium text-highlighted whitespace-normal' }, row.original.title)
    ]),
    h(ItemFlags, { item: row.original }),
    row.original.movedTo ? h('span', { class: 'text-xs text-muted' }, `Movido para a ${row.original.movedTo}`) : null
  ])
}, {
  accessorKey: 'status',
  header: 'Status',
  cell: ({ row }) => h(ItemStatusBadge, { status: row.original.status })
}, {
  accessorKey: 'kind',
  header: 'Classificação',
  cell: ({ row }) => h(ItemKindBadge, { kind: row.original.kind })
}, {
  accessorKey: 'module',
  header: 'Área',
  cell: ({ row }) => row.original.module ?? '—'
}, {
  accessorKey: 'impact',
  header: 'Impacto',
  cell: ({ row }) => row.original.impact ? IMPACT_LABEL[row.original.impact] : '—'
}, {
  accessorKey: 'updatedAt',
  header: 'Atualizado',
  cell: ({ row }) => h('span', { class: 'text-muted whitespace-nowrap' }, formatRelative(row.original.updatedAt, now.value))
}]

function rowClass(row: { original: ReleaseItem }) {
  return props.changed.has(`${props.version}:${row.original.id}`) ? 'bg-primary/5' : ''
}
</script>

<template>
  <UTable
    :data="items"
    :columns="columns"
    :meta="{ class: { tr: rowClass } }"
    class="shrink-0"
  />
</template>
