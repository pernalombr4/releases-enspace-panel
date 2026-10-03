<script setup lang="ts">
import { plural } from '#shared/domain/format'
import { BOARD_ORDER, ITEM_KIND, ITEM_STATUS, KIND_ORDER } from '#shared/domain/labels'
import { MARKER_KEYS, MARKER_META, hasMarker, type MarkerKey } from '#shared/domain/markers'
import type { Release, ReleaseItem } from '#shared/domain/model'
import { ticketSearchText } from '#shared/domain/tickets'
import { ITEM_STATUSES, simplify } from '#shared/domain/vocabulary'

const props = defineProps<{ release: Release }>()

const route = useRoute()
const router = useRouter()
const { changed } = useReleases()

const ALL = 'todos'
const UNCLASSIFIED = 'sem-classificacao'

/** Filtros espelhados na URL, para a visão poder ser compartilhada por link. */
function queryRef(name: string, fallback: string) {
  return computed({
    get: () => typeof route.query[name] === 'string' ? route.query[name] as string : fallback,
    set: (value: string) => {
      router.replace({ query: { ...route.query, [name]: value === fallback ? undefined : value } })
    }
  })
}

const search = queryRef('busca', '')
const kind = queryRef('tipo', ALL)
const area = queryRef('area', ALL)
const status = queryRef('status', ALL)
const marker = queryRef('marcador', ALL)
const view = queryRef('visao', 'quadro')

const kindItems = computed(() => [
  { label: 'Todas as classificações', value: ALL },
  ...KIND_ORDER.filter(k => props.release.items.some(i => i.kind === k)).map(k => ({ label: ITEM_KIND[k].plural, value: k, icon: ITEM_KIND[k].icon })),
  ...props.release.items.some(i => !i.kind) ? [{ label: 'Sem classificação', value: UNCLASSIFIED, icon: 'i-lucide-circle-help' }] : []
])
const markerItems = computed(() => [
  { label: 'Todos os marcadores', value: ALL },
  ...MARKER_KEYS.filter(k => props.release.items.some(i => hasMarker(i, k))).map(k => ({ label: MARKER_META[k].label, value: k, icon: MARKER_META[k].icon }))
])
const areaItems = computed(() => [
  { label: 'Todas as áreas', value: ALL },
  ...[...new Set(props.release.items.map(i => i.module).filter((m): m is string => Boolean(m)))].sort().map(m => ({ label: m, value: m }))
])
const statusItems = [
  { label: 'Todos os status', value: ALL },
  ...ITEM_STATUSES.map(s => ({ label: ITEM_STATUS[s].label, value: s }))
]
const viewItems = [
  { label: 'Quadro', value: 'quadro', icon: 'i-lucide-columns-3' },
  { label: 'Lista', value: 'lista', icon: 'i-lucide-list' }
]

function matches(item: ReleaseItem) {
  if (kind.value !== ALL && (item.kind ?? UNCLASSIFIED) !== kind.value) return false
  if (area.value !== ALL && item.module !== area.value) return false
  if (status.value !== ALL && item.status !== status.value) return false
  if (marker.value !== ALL && !hasMarker(item, marker.value as MarkerKey)) return false
  if (search.value) {
    const haystack = simplify([item.id, item.title, item.summary, item.module, item.customerImpact, item.owner, item.requestedBy, item.note, item.audience, ticketSearchText(item)].filter(Boolean).join(' '))
    return simplify(search.value).split(' ').every(term => haystack.includes(term))
  }
  return true
}

const byRecent = (a: ReleaseItem, b: ReleaseItem) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)

const filtered = computed(() => props.release.items.filter(matches))
const scoped = computed(() => filtered.value.filter(i => i.status !== 'postponed'))
const postponed = computed(() => filtered.value.filter(i => i.status === 'postponed'))
const hasFilters = computed(() => Boolean(search.value) || [kind, area, status, marker].some(f => f.value !== ALL))

// A coluna de bloqueados só aparece quando há algum.
const columns = computed(() => BOARD_ORDER
  .filter(s => s !== 'blocked' || scoped.value.some(i => i.status === 'blocked'))
  .map(s => ({ status: s, meta: ITEM_STATUS[s], items: scoped.value.filter(i => i.status === s).sort(byRecent) })))

const listItems = computed(() => [...scoped.value]
  .sort((a, b) => BOARD_ORDER.indexOf(a.status) - BOARD_ORDER.indexOf(b.status) || byRecent(a, b)))

function clearFilters() {
  router.replace({ query: { ...route.query, busca: undefined, tipo: undefined, area: undefined, status: undefined, marcador: undefined } })
}

const isChanged = (id: string) => changed.value.has(`${props.release.version}:${id}`)
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center gap-2">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Buscar por título, código, chamado, cliente…"
        class="w-full sm:max-w-xs"
      />
      <USelect v-model="kind" :items="kindItems" class="min-w-44" />
      <USelect v-model="status" :items="statusItems" class="min-w-44" />
      <USelect v-model="marker" :items="markerItems" class="min-w-44" />
      <USelect
        v-if="areaItems.length > 1"
        v-model="area"
        :items="areaItems"
        class="min-w-40"
      />
      <UButton
        v-if="hasFilters"
        label="Limpar filtros"
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        @click="clearFilters"
      />
      <span v-if="hasFilters" class="text-sm text-muted">{{ plural(filtered.length, 'resultado', 'resultados') }}</span>

      <UTabs
        v-model="view"
        :items="viewItems"
        :content="false"
        size="sm"
        class="ms-auto"
      />
    </div>

    <UEmpty
      v-if="!filtered.length"
      icon="i-lucide-search-x"
      :title="release.items.length ? 'Nenhum item com esses filtros' : 'Nenhum item cotado para esta release ainda'"
      :actions="hasFilters ? [{ label: 'Limpar filtros', color: 'neutral', variant: 'outline', onClick: clearFilters }] : undefined"
    />

    <template v-else>
      <div v-if="view === 'quadro' && scoped.length" class="flex gap-4 overflow-x-auto pb-2">
        <section
          v-for="column in columns"
          :key="column.status"
          class="flex w-72 shrink-0 flex-col gap-2 rounded-lg bg-elevated/50 p-2"
          :aria-label="column.meta.label"
        >
          <div class="flex items-center gap-2 px-1 py-0.5">
            <UIcon :name="column.meta.icon" class="size-4 shrink-0" :class="TEXT_COLOR[column.meta.color]" />
            <h3 class="text-sm font-medium text-highlighted">
              {{ column.meta.label }}
            </h3>
            <UBadge
              :label="String(column.items.length)"
              color="neutral"
              variant="subtle"
              size="sm"
              class="ms-auto"
            />
          </div>
          <ItemCard
            v-for="item in column.items"
            :key="item.id"
            :item="item"
            :version="release.version"
            :changed="isChanged(item.id)"
          />
          <p v-if="!column.items.length" class="px-1 py-4 text-center text-xs text-dimmed">
            Nenhum item
          </p>
        </section>
      </div>

      <ItemTable
        v-else-if="scoped.length"
        :items="listItems"
        :version="release.version"
        :changed="changed"
      />

      <UCollapsible v-if="postponed.length" class="flex flex-col gap-2">
        <UButton
          :label="`Adiados — saíram desta release (${postponed.length})`"
          icon="i-lucide-calendar-clock"
          trailing-icon="i-lucide-chevron-down"
          color="neutral"
          variant="ghost"
          class="self-start"
          :ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200' }"
        />
        <template #content>
          <ItemTable :items="postponed" :version="release.version" :changed="changed" />
        </template>
      </UCollapsible>
    </template>
  </div>
</template>
