<script setup lang="ts">
import { formatRelative } from '#shared/domain/format'
import { ITEM_STATUS } from '#shared/domain/labels'
import { recentUpdates } from '#shared/domain/metrics'
import { PRODUCT_META, itemKey, releaseTitle, type Product } from '#shared/domain/products'

// Movimentações nas releases do mesmo produto da release aberta.
const props = defineProps<{ product: Product }>()

const { releases, changed } = useReleases()
const { itemLink } = useItemLink()
const now = useNow({ interval: 30_000 })

const updates = computed(() => recentUpdates(releases.value.filter(r => r.product === props.product), 6))
</script>

<template>
  <UCard :ui="{ body: 'p-2 sm:p-2' }">
    <template #header>
      <div>
        <h2 class="font-semibold text-highlighted">
          Atualizações recentes
        </h2>
        <p class="text-sm text-muted">
          Últimas movimentações nas releases do {{ PRODUCT_META[product].label }}
        </p>
      </div>
    </template>

    <ul v-if="updates.length" class="flex flex-col">
      <li v-for="{ item, release } in updates" :key="itemKey(release, item.id)">
        <ULink
          :to="itemLink(release, item.id)"
          class="flex items-start gap-3 rounded-md p-2 hover:bg-elevated/50"
          :class="changed.has(itemKey(release, item.id)) ? 'bg-primary/5' : ''"
        >
          <UIcon
            :name="ITEM_STATUS[item.status].icon"
            class="mt-0.5 size-4 shrink-0"
            :class="TEXT_COLOR[ITEM_STATUS[item.status].color]"
          />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-medium text-highlighted">{{ item.title }}</span>
            <span class="block text-xs text-muted">{{ ITEM_STATUS[item.status].label }} · {{ releaseTitle(release) }} · {{ item.id }}</span>
          </span>
          <span class="shrink-0 text-xs text-muted">{{ formatRelative(item.updatedAt, now) }}</span>
        </ULink>
      </li>
    </ul>
    <UEmpty
      v-else
      icon="i-lucide-history"
      title="Sem movimentações ainda"
      variant="naked"
    />
  </UCard>
</template>
