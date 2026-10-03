<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { CalendarDate, getLocalTimeZone, today, type DateValue } from '@internationalized/date'
import { breakpointsTailwind } from '@vueuse/core'
import { calendarEntries, hasDetails, undatedReleases, type CalendarEntry } from '#shared/domain/calendar'
import { formatDay, formatDayYear, formatWeekday } from '#shared/domain/format'
import { CALENDAR_STATUS_META, RELEASE_TYPE_META } from '#shared/domain/labels'
import { RELEASE_TYPES, type ReleaseType } from '#shared/domain/vocabulary'

useSeoMeta({ title: 'Calendário · ENSPACE Releases' })

const { releases } = useReleases()

// Filtro por tipo: os três começam ligados.
const activeTypes = ref<ReleaseType[]>([...RELEASE_TYPES])
function toggleType(type: ReleaseType) {
  activeTypes.value = activeTypes.value.includes(type)
    ? activeTypes.value.filter(t => t !== type)
    : [...activeTypes.value, type]
}

const entries = computed(() => calendarEntries(releases.value).filter(e => activeTypes.value.includes(e.type)))

const byDate = computed(() => {
  const map = new Map<string, CalendarEntry[]>()
  for (const entry of entries.value) map.set(entry.date, [...(map.get(entry.date) ?? []), entry])
  return map
})

/** Tipo de maior destaque no dia (major > minor > patch). */
function dayType(day: DateValue): ReleaseType | undefined {
  const list = byDate.value.get(day.toString())
  if (!list?.length) return undefined
  return list.reduce((top, e) => RELEASE_TYPE_META[e.type].rank > RELEASE_TYPE_META[top].rank ? e.type : top, list[0]!.type)
}

// Calendário: mês visível (placeholder) e dia selecionado.
const todayDate = today(getLocalTimeZone())
const placeholder = shallowRef<DateValue>(todayDate)
const selected = shallowRef<DateValue | undefined>()

const breakpoints = useBreakpoints(breakpointsTailwind)
const monthsShown = computed(() => breakpoints.greaterOrEqual('2xl').value ? 2 : 1)

const range = computed(() => {
  const start = new CalendarDate(placeholder.value.year, placeholder.value.month, 1)
  const end = start.add({ months: monthsShown.value }).subtract({ days: 1 })
  return { start: start.toString(), end: end.toString(), startDate: start, endDate: end }
})

const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' })
// "outubro de 2026", "outubro e novembro de 2026" ou "dezembro de 2026 e janeiro de 2027"
const periodLabel = computed(() => {
  const tz = getLocalTimeZone()
  const { startDate, endDate } = range.value
  const first = monthName.format(startDate.toDate(tz))
  if (monthsShown.value === 1) return `${first} de ${startDate.year}`
  const last = monthName.format(endDate.toDate(tz))
  return startDate.year === endDate.year
    ? `${first} e ${last} de ${endDate.year}`
    : `${first} de ${startDate.year} e ${last} de ${endDate.year}`
})

const selectedEntries = computed(() => selected.value ? byDate.value.get(selected.value.toString()) ?? [] : [])
const periodEntries = computed(() => entries.value.filter(e => e.date >= range.value.start && e.date <= range.value.end))
const showingDay = computed(() => selectedEntries.value.length > 0)
const listEntries = computed(() => showingDay.value ? selectedEntries.value : periodEntries.value)

function goToday() {
  placeholder.value = todayDate
  selected.value = undefined
}

// Histórico completo (a versão em texto do calendário), mais recente primeiro.
const history = computed(() => [...entries.value].reverse())
const undated = computed(() => undatedReleases(releases.value))

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const ReleaseTypeBadge = resolveComponent('ReleaseTypeBadge')

function detailsCell(entry: CalendarEntry) {
  return hasDetails(entry.release)
    ? h(UButton, { to: `/releases/${entry.release.version}`, label: 'Ver detalhes', trailingIcon: 'i-lucide-arrow-right', color: 'neutral', variant: 'ghost', size: 'sm' })
    : h('span', { class: 'text-xs text-dimmed' }, 'Sem detalhes registrados')
}

const columns: TableColumn<CalendarEntry>[] = [{
  accessorKey: 'date',
  header: 'Data',
  cell: ({ row }) => h('span', { class: 'whitespace-nowrap' }, formatDayYear(row.original.date))
}, {
  id: 'release',
  header: 'Release',
  cell: ({ row }) => h('div', { class: 'flex flex-col' }, [
    h('span', { class: 'font-medium text-highlighted' }, `Release ${row.original.release.version}`),
    row.original.release.name ? h('span', { class: 'text-xs text-muted' }, row.original.release.name) : null
  ])
}, {
  accessorKey: 'type',
  header: 'Tipo',
  cell: ({ row }) => h(ReleaseTypeBadge, { type: row.original.type })
}, {
  accessorKey: 'status',
  header: 'Situação',
  cell: ({ row }) => {
    const meta = CALENDAR_STATUS_META[row.original.status]
    return h(UBadge, { label: meta.label, icon: meta.icon, color: meta.color, variant: 'subtle' })
  }
}, {
  id: 'details',
  header: '',
  cell: ({ row }) => h('div', { class: 'text-right' }, detailsCell(row.original))
}]
</script>

<template>
  <UDashboardPanel id="calendar">
    <template #header>
      <UDashboardNavbar title="Calendário de releases">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UButton
            label="Hoje"
            icon="i-lucide-calendar-check"
            color="neutral"
            variant="outline"
            @click="goToday"
          />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <span class="text-sm text-muted">Mostrar</span>
          <UTooltip v-for="type in RELEASE_TYPES" :key="type" :text="RELEASE_TYPE_META[type].description">
            <UButton
              :label="RELEASE_TYPE_META[type].label"
              :color="activeTypes.includes(type) ? RELEASE_TYPE_META[type].color : 'neutral'"
              :variant="activeTypes.includes(type) ? RELEASE_TYPE_META[type].variant : 'ghost'"
              :aria-pressed="activeTypes.includes(type)"
              size="sm"
              :icon="activeTypes.includes(type) ? 'i-lucide-check' : undefined"
              @click="toggleType(type)"
            />
          </UTooltip>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <PanelNotices />

      <div class="grid gap-4 sm:gap-6 xl:grid-cols-[auto_minmax(0,1fr)]">
        <UCard>
          <UCalendar
            v-model="selected"
            v-model:placeholder="placeholder"
            :number-of-months="monthsShown"
            size="lg"
            color="neutral"
          >
            <!-- O dia com release vira um selo no estilo do tipo: major sólido, minor suave, patch contornado. -->
            <template #day="{ day }">
              <UBadge
                v-if="dayType(day)"
                :label="String(day.day)"
                :color="RELEASE_TYPE_META[dayType(day)!].color"
                :variant="RELEASE_TYPE_META[dayType(day)!].variant"
                size="lg"
                class="justify-center rounded-full font-semibold"
              />
              <template v-else>
                {{ day.day }}
              </template>
            </template>
          </UCalendar>

          <template #footer>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              <ReleaseTypeBadge v-for="type in RELEASE_TYPES" :key="type" :type="type" />
              <span>Clique num dia marcado para ver a release.</span>
            </div>
          </template>
        </UCard>

        <UCard :ui="{ body: 'p-0 sm:p-0' }">
          <template #header>
            <div class="flex items-center justify-between gap-2">
              <h2 class="font-semibold text-highlighted first-letter:uppercase">
                {{ showingDay && selected ? `Releases em ${formatDayYear(selected.toString())}` : periodLabel }}
              </h2>
              <UButton
                v-if="showingDay"
                label="Ver o período todo"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="selected = undefined"
              />
            </div>
          </template>

          <ul v-if="listEntries.length" class="divide-y divide-default">
            <li v-for="entry in listEntries" :key="entry.release.version" class="flex items-start gap-4 p-4">
              <div class="w-12 shrink-0 text-center">
                <p class="text-xs uppercase text-muted">
                  {{ formatWeekday(entry.date) }}
                </p>
                <p class="text-xl font-semibold text-highlighted">
                  {{ entry.date.slice(8, 10) }}
                </p>
                <p class="text-xs text-muted">
                  {{ formatDay(entry.date).split(' ')[1] }}
                </p>
              </div>

              <div class="flex min-w-0 flex-1 flex-col gap-1">
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="font-medium text-highlighted">Release {{ entry.release.version }}</span>
                  <ReleaseTypeBadge :type="entry.type" />
                  <UBadge
                    :label="CALENDAR_STATUS_META[entry.status].label"
                    :icon="CALENDAR_STATUS_META[entry.status].icon"
                    :color="CALENDAR_STATUS_META[entry.status].color"
                    variant="subtle"
                  />
                </div>
                <p v-if="entry.release.name" class="text-sm text-muted">
                  {{ entry.release.name }}
                </p>
                <p v-if="entry.status === 'postponed' && entry.release.postponement?.originalDate" class="text-xs text-muted">
                  Antes prevista para {{ formatDayYear(entry.release.postponement.originalDate) }}
                </p>
              </div>

              <UButton
                v-if="hasDetails(entry.release)"
                :to="`/releases/${entry.release.version}`"
                label="Detalhes"
                trailing-icon="i-lucide-arrow-right"
                color="neutral"
                variant="ghost"
                size="sm"
              />
              <span v-else class="shrink-0 pt-1 text-xs text-dimmed">Sem detalhes registrados</span>
            </li>
          </ul>
          <UEmpty
            v-else
            icon="i-lucide-calendar"
            title="Nenhuma release neste período"
            description="Use as setas do calendário para ver outros meses."
            variant="naked"
            class="py-12"
          />
        </UCard>
      </div>

      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <template #header>
          <div>
            <h2 class="font-semibold text-highlighted">
              Todas as releases
            </h2>
            <p class="text-sm text-muted">
              Histórico e próximas datas, da mais recente para a mais antiga
            </p>
          </div>
        </template>

        <UTable :data="history" :columns="columns" />

        <template v-if="undated.length" #footer>
          <p class="text-sm text-muted">
            Sem data definida ainda:
            <span v-for="(release, index) in undated" :key="release.version">
              {{ index ? ', ' : '' }}Release {{ release.version }}
            </span>
          </p>
        </template>
      </UCard>
    </template>
  </UDashboardPanel>
</template>
