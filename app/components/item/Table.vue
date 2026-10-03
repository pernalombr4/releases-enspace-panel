<script setup lang="ts">
import type { EnTableColumn } from '@be-enlighten/enspace-sdk-ui/base'
import { formatRelative } from '#shared/domain/format'
import { IMPACT_LABEL } from '#shared/domain/labels'
import type { ReleaseItem } from '#shared/domain/model'

const props = defineProps<{ items: ReleaseItem[], version: string, changed: Set<string> }>()

const now = useNow({ interval: 30_000 })
const { itemLink } = useItemLink()

// Lista padrão do ENSPACE (EnTable do SDK). Cada célula sai de um slot #cell-{key}.
const columns: EnTableColumn[] = [
  { key: 'title', label: 'Item' },
  { key: 'status', label: 'Status' },
  { key: 'progress', label: 'Andamento' },
  { key: 'kind', label: 'Classificação' },
  { key: 'module', label: 'Área' },
  { key: 'impact', label: 'Impacto' },
  { key: 'updatedAt', label: 'Atualizado' }
]
// O EnTable tem layout fixo: sem largura, cada coluna fica com 150px. Item é a
// mais larga; a soma (1080px) cabe na área de conteúdo de uma tela de 1440px.
const columnSizing = { title: 320, status: 160, progress: 120, kind: 130, module: 130, impact: 90, updatedAt: 130 }

// O slot do EnTable entrega a linha sem tipo: os acessos passam por funções tipadas.
const isChanged = (item: ReleaseItem) => props.changed.has(`${props.version}:${item.id}`)
const impactLabel = (item: ReleaseItem) => item.impact ? IMPACT_LABEL[item.impact] : '—'
</script>

<template>
  <EnTable
    :columns="columns"
    :rows="items"
    :column-sizing="columnSizing"
    class="shrink-0"
  >
    <template #cell-title="{ row }">
      <div class="flex flex-col gap-1.5">
        <ULink :to="itemLink(version, row.id)" class="flex flex-col">
          <span class="font-mono text-xs text-muted">{{ row.id }}</span>
          <span class="font-medium text-highlighted">{{ row.title }}</span>
        </ULink>
        <ItemFlags :item="row" />
        <span v-if="row.movedTo" class="text-xs text-muted">Movido para a {{ row.movedTo }}</span>
      </div>
    </template>
    <template #cell-status="{ row }">
      <ItemStatusBadge :status="row.status" />
    </template>
    <template #cell-progress="{ row }">
      <div class="w-28">
        <ItemProgress :item="row" />
      </div>
    </template>
    <template #cell-kind="{ row }">
      <ItemKindBadge :kind="row.kind" />
    </template>
    <template #cell-module="{ row }">
      {{ row.module ?? '—' }}
    </template>
    <template #cell-impact="{ row }">
      {{ impactLabel(row) }}
    </template>
    <template #cell-updatedAt="{ row }">
      <span v-if="isChanged(row)" class="font-medium text-primary">Atualizado agora</span>
      <span v-else class="text-muted">{{ formatRelative(row.updatedAt, now) }}</span>
    </template>
  </EnTable>
</template>
