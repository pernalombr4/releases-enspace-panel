<script setup lang="ts">
// A página inicial leva para a próxima release assim que os dados chegam.
const { data, error, nextRelease } = useReleases()

watchEffect(() => {
  if (nextRelease.value) navigateTo(`/releases/${nextRelease.value.version}`, { replace: true })
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
