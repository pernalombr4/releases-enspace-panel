<script setup lang="ts">
import type { EnTableColumn } from '@be-enlighten/enspace-sdk-ui/base'
import { CalendarDate, getLocalTimeZone, today, type DateValue } from '@internationalized/date'
import { breakpointsTailwind } from '@vueuse/core'
import { calendarEntries, hasDetails, originalDateEntries, undatedReleases, type CalendarEntry } from '#shared/domain/calendar'
import { formatDay, formatDayYear, formatWeekday } from '#shared/domain/format'
import { CALENDAR_NEW_DATE_META, CALENDAR_STATUS_META, RELEASE_TYPE_META } from '#shared/domain/labels'
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

// Datas originais de releases adiadas: aparecem riscadas no calendário.
const moved = computed(() => originalDateEntries(releases.value).filter(e => activeTypes.value.includes(e.type)))

function groupByDate(list: CalendarEntry[]) {
  const map = new Map<string, CalendarEntry[]>()
  for (const entry of list) map.set(entry.date, [...(map.get(entry.date) ?? []), entry])
  return map
}

const byDate = computed(() => groupByDate(entries.value))
const movedByDate = computed(() => groupByDate(moved.value))
const isMovedDay = (day: DateValue) => movedByDate.value.has(day.toString())

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

const byDay = (a: CalendarEntry, b: CalendarEntry) => a.date.localeCompare(b.date)

// Release adiada aparece duas vezes na lista: na data original, riscada e com
// "Adiada", e na data nova, com "Nova data".
const listBadge = (entry: CalendarEntry) => entry.status === 'postponed' ? CALENDAR_NEW_DATE_META : CALENDAR_STATUS_META[entry.status]
const selectedEntries = computed(() => {
  const day = selected.value?.toString()
  return day ? [...byDate.value.get(day) ?? [], ...movedByDate.value.get(day) ?? []] : []
})
const periodEntries = computed(() => [...entries.value, ...moved.value]
  .filter(e => e.date >= range.value.start && e.date <= range.value.end)
  .sort(byDay))
const showingDay = computed(() => selectedEntries.value.length > 0)
const listEntries = computed(() => showingDay.value ? selectedEntries.value : periodEntries.value)

function goToday() {
  placeholder.value = todayDate
  selected.value = undefined
}

// Histórico completo (a versão em texto do calendário), mais recente primeiro.
const history = computed(() => [...entries.value].reverse())
const undated = computed(() => undatedReleases(releases.value))

// Histórico em EnTable (SDK do ENSPACE); cada célula sai de um slot #cell-{key}.
// O slot entrega a linha sem tipo: a situação passa por uma função tipada.
const statusMeta = (entry: CalendarEntry) => CALENDAR_STATUS_META[entry.status]
const columns: EnTableColumn[] = [
  { key: 'date', label: 'Data' },
  { key: 'release', label: 'Release' },
  { key: 'type', label: 'Tipo' },
  { key: 'status', label: 'Situação' },
  { key: 'details', label: '', align: 'right' }
]
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
          <!--
            Cada mês mostra só os próprios dias: sem os dias dos meses vizinhos
            (que repetiam as releases quando aparecem dois meses) e só com as
            semanas que o mês ocupa (5 na maioria, 6 quando o mês pede).
          -->
          <UCalendar
            v-model="selected"
            v-model:placeholder="placeholder"
            :number-of-months="monthsShown"
            :fixed-weeks="false"
            size="lg"
            color="neutral"
            variant="soft"
            :ui="{ cellTrigger: 'data-outside-view:invisible' }"
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
              <UBadge
                v-else-if="isMovedDay(day)"
                :label="String(day.day)"
                color="warning"
                variant="outline"
                size="lg"
                class="justify-center rounded-full line-through"
              />
              <template v-else>
                {{ day.day }}
              </template>
            </template>
          </UCalendar>

          <template #footer>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              <ReleaseTypeBadge v-for="type in RELEASE_TYPES" :key="type" :type="type" />
              <UTooltip text="Dia em que uma release adiada estava prevista">
                <UBadge
                  label="Data original"
                  color="warning"
                  variant="outline"
                  class="line-through"
                />
              </UTooltip>
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
            <li
              v-for="entry in listEntries"
              :key="`${entry.status}:${entry.release.version}`"
              class="flex items-start gap-4 p-4"
              :class="{ 'opacity-75': entry.status === 'moved' }"
            >
              <div class="w-12 shrink-0 text-center" :class="{ 'line-through': entry.status === 'moved' }">
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
                  <span class="font-medium text-highlighted" :class="{ 'line-through': entry.status === 'moved' }">Release {{ entry.release.version }}</span>
                  <ReleaseTypeBadge :type="entry.type" />
                  <UBadge
                    :label="listBadge(entry).label"
                    :icon="listBadge(entry).icon"
                    :color="listBadge(entry).color"
                    variant="subtle"
                  />
                </div>
                <p v-if="entry.release.name" class="text-sm text-muted">
                  {{ entry.release.name }}
                </p>
                <p v-if="entry.status === 'postponed' && entry.release.postponement?.originalDate" class="text-xs text-muted">
                  Antes prevista para {{ formatDayYear(entry.release.postponement.originalDate) }}
                </p>
                <p v-if="entry.status === 'moved'" class="text-xs text-muted">
                  {{ entry.release.targetDate ? `Adiada para ${formatDayYear(entry.release.targetDate)}` : 'Adiada; nova data a definir' }}
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

        <EnTable :columns="columns" :rows="history">
          <template #cell-date="{ row }">
            {{ formatDayYear(row.date) }}
          </template>
          <template #cell-release="{ row }">
            <div class="flex flex-col">
              <span class="font-medium text-highlighted">Release {{ row.release.version }}</span>
              <span v-if="row.release.name" class="text-xs text-muted">{{ row.release.name }}</span>
            </div>
          </template>
          <template #cell-type="{ row }">
            <ReleaseTypeBadge :type="row.type" />
          </template>
          <template #cell-status="{ row }">
            <UBadge
              :label="statusMeta(row).label"
              :icon="statusMeta(row).icon"
              :color="statusMeta(row).color"
              variant="subtle"
            />
          </template>
          <template #cell-details="{ row }">
            <UButton
              v-if="hasDetails(row.release)"
              :to="`/releases/${row.release.version}`"
              label="Ver detalhes"
              trailing-icon="i-lucide-arrow-right"
              color="neutral"
              variant="ghost"
              size="sm"
            />
            <span v-else class="text-xs text-dimmed">Sem detalhes registrados</span>
          </template>
        </EnTable>

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
