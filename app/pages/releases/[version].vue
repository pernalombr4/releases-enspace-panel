<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { formatCountdown, formatDay } from '#shared/domain/format'
import { isPostponed, scopedItems } from '#shared/domain/metrics'
import { PRODUCT_META, releasePath, releaseTitle } from '#shared/domain/products'

// O ENSPACE fica em /releases/3.1; os subprodutos, em /releases/word/1.1.0 e
// /releases/beni/1.1.0, os mesmos trechos das releases no portal de documentação.
definePageMeta({ path: '/releases/:product(word|beni)?/:version' })

const { data, nextOf } = useReleases()
const { product, version, release } = useRouteRelease()
const { selected } = useProductFilter()
const now = useNow({ interval: 60_000 })

const title = computed(() => product.value && version.value ? releaseTitle({ product: product.value, version: version.value }) : 'Release')
const path = computed(() => product.value && version.value ? releasePath({ product: product.value, version: version.value }) : '/')

// Quem escolheu um produto no menu e abre a release de outro passa a ver o menu desse outro.
watch(product, (value) => {
  if (value && selected.value !== 'all' && selected.value !== value) selected.value = value
}, { immediate: true })

const eyebrow = computed(() => {
  if (!release.value) return ''
  if (release.value.stage === 'released') return 'Liberada'
  return release.value.version === nextOf(release.value.product)?.version ? 'Próxima release' : 'Em seguida'
})

const links = computed(() => [[{
  label: 'Visão geral',
  icon: 'i-lucide-layout-dashboard',
  to: path.value,
  exact: true
}, {
  label: 'Itens',
  icon: 'i-lucide-list-checks',
  to: `${path.value}/itens`,
  badge: release.value ? String(scopedItems(release.value).length) : undefined
}]] satisfies NavigationMenuItem[][])

useSeoMeta({ title: () => `${title.value} · ENSPACE Releases` })
</script>

<template>
  <UDashboardPanel id="release">
    <template #header>
      <UDashboardNavbar :title="title" :icon="product && product !== 'en-space' ? PRODUCT_META[product].icon : undefined">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #trailing>
          <ReleaseBadges v-if="release" :release="release" class="hidden sm:flex" />
        </template>

        <template #right>
          <UBadge
            v-if="release && release.stage !== 'released' && (release.targetDate || isPostponed(release))"
            :label="release.targetDate
              ? `${isPostponed(release) ? 'Nova data' : 'Subida'} ${formatDay(release.targetDate)} · ${formatCountdown(release.targetDate, now)}`
              : 'Nova data a definir'"
            :icon="isPostponed(release) ? 'i-lucide-calendar-x' : 'i-lucide-calendar-days'"
            :color="isPostponed(release) ? 'warning' : 'neutral'"
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
        :title="`${title} não está no painel`"
        description="Ela pode ter sido renomeada ou ainda não foi cadastrada."
        :actions="[{ label: 'Ver a próxima release', to: '/' }]"
      />
      <div v-else class="flex justify-center py-24">
        <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-muted" />
      </div>
    </template>
  </UDashboardPanel>
</template>
