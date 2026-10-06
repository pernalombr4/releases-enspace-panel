<script setup lang="ts">
import { releasePath } from '#shared/domain/products'

// A página inicial leva para a próxima release do produto escolhido no menu
// (com os 3 produtos, a do ENSPACE) assim que os dados chegam.
const { data, error, nextOf } = useReleases()
const { selected } = useProductFilter()

const nextRelease = computed(() => nextOf(selected.value === 'all' ? 'en-space' : selected.value))

watchEffect(() => {
  if (nextRelease.value) navigateTo(releasePath(nextRelease.value), { replace: true })
})
</script>

<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar title="Releases">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <PanelNotices />
      <UEmpty
        v-if="data && !nextRelease"
        icon="i-lucide-calendar-range"
        title="Nenhuma release cadastrada ainda"
      />
      <div v-else-if="!error" class="flex justify-center py-24">
        <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-muted" />
      </div>
    </template>
  </UDashboardPanel>
</template>
