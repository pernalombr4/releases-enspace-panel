<script setup lang="ts">
import type { CommandPaletteGroup, CommandPaletteItem, NavigationMenuItem } from '@nuxt/ui'
import { releaseType } from '#shared/domain/calendar'
import { ITEM_STATUS, RELEASE_TYPE_META } from '#shared/domain/labels'
import { isPostponed } from '#shared/domain/metrics'

const config = useRuntimeConfig()
const { releases, nextRelease } = useReleases()
const { lock } = usePanelKey()
const { itemLink } = useItemLink()

const open = ref(false)
const close = () => {
  open.value = false
}

// O menu mostra só as releases ainda por vir; as já liberadas ficam no calendário.
const links = computed(() => [
  [{
    label: 'Calendário',
    icon: 'i-lucide-calendar-days',
    to: '/calendario',
    onSelect: close
  }, ...releases.value
    .filter(release => release.stage !== 'released')
    .map(release => ({
      label: `Release ${release.version}`,
      icon: 'i-lucide-calendar-range',
      to: `/releases/${release.version}`,
      badge: isPostponed(release)
        ? { label: 'Adiada', color: 'warning' as const, variant: 'subtle' as const }
        : release.version === nextRelease.value?.version ? 'Próxima' : undefined,
      onSelect: close
    }))],
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

const searchGroups = computed<CommandPaletteGroup<CommandPaletteItem>[]>(() => [{
  id: 'releases',
  label: 'Releases',
  items: releases.value.map(release => ({
    label: `Release ${release.version}`,
    suffix: [RELEASE_TYPE_META[releaseType(release)].label, release.name].filter(Boolean).join(' · '),
    icon: 'i-lucide-calendar-range',
    to: `/releases/${release.version}`
  }))
}, {
  id: 'pages',
  label: 'Páginas',
  items: [{ label: 'Calendário de releases', icon: 'i-lucide-calendar-days', to: '/calendario' }]
}, {
  id: 'items',
  label: 'Itens',
  items: releases.value.flatMap(release => release.items.map(item => ({
    label: item.title,
    suffix: `${item.id} · ${release.version} · ${ITEM_STATUS[item.status].label}`,
    icon: ITEM_STATUS[item.status].icon,
    to: itemLink(release.version, item.id)
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
