<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { formatCountdown, formatDay } from '#shared/domain/format'
import { scopedItems } from '#shared/domain/metrics'

const route = useRoute()
const { data, releases, nextRelease } = useReleases()
const now = useNow({ interval: 60_000 })

const version = computed(() => String(route.params.version))
const release = computed(() => releases.value.find(r => r.version === version.value))

const eyebrow = computed(() => {
  if (!release.value) return ''
  if (release.value.stage === 'released') return 'Liberada'
  return release.value.version === nextRelease.value?.version ? 'Próxima release' : 'Em seguida'
})

const links = computed(() => [[{
  label: 'Visão geral',
  icon: 'i-lucide-layout-dashboard',
  to: `/releases/${version.value}`,
  exact: true
}, {
  label: 'Itens',
  icon: 'i-lucide-list-checks',
  to: `/releases/${version.value}/itens`,
  badge: release.value ? String(scopedItems(release.value).length) : undefined
}]] satisfies NavigationMenuItem[][])

useSeoMeta({ title: () => `Release ${version.value} · ENSPACE Releases` })
</script>

<template>
  <UDashboardPanel id="release">
    <template #header>
      <UDashboardNavbar :title="`Release ${version}`">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #trailing>
          <ReleaseBadges v-if="release" :release="release" class="hidden sm:flex" />
        </template>

        <template #right>
          <UBadge
            v-if="release?.targetDate && release.stage !== 'released'"
            :label="`Subida ${formatDay(release.targetDate)} · ${formatCountdown(release.targetDate, now)}`"
            icon="i-lucide-calendar-days"
            color="neutral"
            variant="outline"
          />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <UNavigationMenu :items="links" highlight class="-mx-1 flex-1" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <PanelNotices />
      <NuxtPage v-if="release" :release="release" :eyebrow="eyebrow" />
      <UEmpty
        v-else-if="data"
        icon="i-lucide-search-x"
        :title="`A release ${version} não está no painel`"
        description="Ela pode ter sido renomeada ou ainda não foi cadastrada."
        :actions="[{ label: 'Ver a próxima release', to: '/' }]"
      />
      <div v-else class="flex justify-center py-24">
        <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-muted" />
      </div>
    </template>
  </UDashboardPanel>
</template>
