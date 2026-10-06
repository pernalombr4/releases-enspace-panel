<script setup lang="ts">
import type { CommandPaletteGroup, CommandPaletteItem, NavigationMenuItem } from '@nuxt/ui'
import { releaseType } from '#shared/domain/calendar'
import { ITEM_STATUS, RELEASE_TYPE_META } from '#shared/domain/labels'
import { isPostponed } from '#shared/domain/metrics'
import type { Release } from '#shared/domain/model'
import { PRODUCT_META, isSubProduct, releasePath, releaseTitle } from '#shared/domain/products'

const config = useRuntimeConfig()
const { releases, nextOf } = useReleases()
const { selected, products, shows } = useProductFilter()
const { lock } = usePanelKey()
const { itemLink } = useItemLink()

const open = ref(false)
const close = () => {
  open.value = false
}

function releaseLink(release: Release, badge?: NavigationMenuItem['badge']): NavigationMenuItem {
  return {
    label: `Release ${release.version}`,
    icon: PRODUCT_META[release.product].icon,
    to: releasePath(release),
    badge: badge ?? (isPostponed(release)
      ? { label: 'Adiada', color: 'warning' as const, variant: 'subtle' as const }
      : release.version === nextOf(release.product)?.version ? 'Próxima' : undefined),
    onSelect: close
  }
}

// O menu mostra, por produto, só as releases ainda por vir; as já liberadas
// ficam no calendário. Produto sem release prevista mostra a última que saiu.
const releaseLinks = computed(() => products.value.flatMap((product): NavigationMenuItem[] => {
  const upcoming = releases.value.filter(r => r.product === product && r.stage !== 'released')
  const last = nextOf(product)
  const entries = upcoming.length
    ? upcoming.map(r => releaseLink(r))
    : last ? [releaseLink(last, { label: 'Última', color: 'neutral' as const, variant: 'subtle' as const })] : []
  if (!entries.length) return []
  return [{ label: PRODUCT_META[product].label, type: 'label' as const }, ...entries]
}))

const links = computed(() => [
  [{
    label: 'Calendário',
    icon: 'i-lucide-calendar-days',
    to: '/calendario',
    onSelect: close
  }, ...releaseLinks.value],
  [{
    label: 'Como ler o painel',
    icon: 'i-lucide-book-open',
    to: '/como-ler',
    onSelect: close
  }, {
    label: 'Abrir o Enspace',
    icon: 'i-lucide-external-link',
    to: config.public.enspaceAppUrl,
    target: '_blank'
  }]
] satisfies NavigationMenuItem[][])

// A busca segue o produto escolhido. Com os 3, o item de subproduto aparece uma
// vez só, na release do ENSPACE (a do subproduto repete os mesmos itens).
const searchReleases = computed(() => releases.value.filter(r => shows(r.product)))
const searchGroups = computed<CommandPaletteGroup<CommandPaletteItem>[]>(() => [{
  id: 'releases',
  label: 'Releases',
  items: searchReleases.value.map(release => ({
    label: releaseTitle(release),
    suffix: [RELEASE_TYPE_META[releaseType(release)].label, release.name].filter(Boolean).join(' · '),
    icon: PRODUCT_META[release.product].icon,
    to: releasePath(release)
  }))
}, {
  id: 'pages',
  label: 'Páginas',
  items: [{ label: 'Calendário de releases', icon: 'i-lucide-calendar-days', to: '/calendario' }]
}, {
  id: 'items',
  label: 'Itens',
  items: searchReleases.value
    .filter(release => selected.value !== 'all' || !isSubProduct(release.product))
    .flatMap(release => release.items.map(item => ({
      label: item.title,
      suffix: [item.id, releaseTitle(release), item.product && isSubProduct(item.product) ? PRODUCT_META[item.product].label : undefined, ITEM_STATUS[item.status].label]
        .filter(Boolean).join(' · '),
      icon: ITEM_STATUS[item.status].icon,
      to: itemLink(release, item.id)
    })))
}])

async function signOut() {
  lock()
  await navigateTo('/entrar')
}
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default flex-col items-stretch gap-1' }"
    >
      <template #header="{ collapsed }">
        <NuxtLink to="/" class="flex items-center gap-2 px-1.5" aria-label="ENSPACE Releases, início">
          <UIcon name="i-lucide-gantt-chart" class="size-5 shrink-0 text-primary" />
          <template v-if="!collapsed">
            <span class="font-bold tracking-widest text-highlighted">ENSPACE</span>
            <UBadge label="Releases" variant="subtle" size="sm" />
          </template>
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <ProductMenu :collapsed="collapsed" />

        <UDashboardSearchButton :collapsed="collapsed" label="Buscar item…" class="bg-transparent ring-default" />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[1]"
          orientation="vertical"
          tooltip
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <LiveStatus :collapsed="collapsed" />
        <div class="flex items-center gap-1" :class="collapsed ? 'flex-col' : ''">
          <UColorModeButton />
          <UTooltip text="Sair deste dispositivo">
            <UButton
              icon="i-lucide-log-out"
              color="neutral"
              variant="ghost"
              :label="collapsed ? undefined : 'Sair'"
              aria-label="Sair deste dispositivo"
              @click="signOut"
            />
          </UTooltip>
        </div>
      </template>
    </UDashboardSidebar>

    <UDashboardSearch
      :groups="searchGroups"
      placeholder="Buscar release ou item…"
      :color-mode="false"
    />

    <slot />

    <ItemSlideover />
  </UDashboardGroup>
</template>
