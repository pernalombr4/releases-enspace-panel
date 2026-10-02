<script setup lang="ts">
import { BOARD_ORDER, ITEM_STATUS, RELEASE_HEALTH_META, RELEASE_STAGE } from '#shared/domain/labels'
import { RELEASE_HEALTH, RELEASE_STAGES } from '#shared/domain/vocabulary'

useSeoMeta({ title: 'Como ler o painel · ENSPACE Releases' })

const statuses = [...BOARD_ORDER.filter(s => s !== 'blocked'), 'blocked' as const, 'postponed' as const]
</script>

<template>
  <UDashboardPanel id="guide" :ui="{ body: 'lg:py-12' }">
    <template #header>
      <UDashboardNavbar title="Como ler o painel">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="mx-auto flex w-full flex-col gap-4 sm:gap-6 lg:max-w-3xl">
        <UPageCard
          title="Status dos itens"
          description="Cada item cotado para uma release passa por estas etapas."
          variant="subtle"
        >
          <dl class="flex flex-col gap-3">
            <div v-for="s in statuses" :key="s" class="grid gap-1 sm:grid-cols-[13rem_1fr] sm:gap-4">
              <dt><ItemStatusBadge :status="s" /></dt>
              <dd class="text-sm text-muted">
                {{ ITEM_STATUS[s].description }}
              </dd>
            </div>
          </dl>
        </UPageCard>

        <UPageCard title="Fases da release" variant="subtle">
          <dl class="flex flex-col gap-3">
            <div v-for="s in RELEASE_STAGES" :key="s" class="grid gap-1 sm:grid-cols-[13rem_1fr] sm:gap-4">
              <dt>
                <UBadge
                  :label="RELEASE_STAGE[s].label"
                  :icon="RELEASE_STAGE[s].icon"
                  color="neutral"
                  variant="outline"
                />
              </dt>
              <dd class="text-sm text-muted">
                {{ RELEASE_STAGE[s].description }}
              </dd>
            </div>
          </dl>
        </UPageCard>

        <UPageCard
          title="Saúde da release"
          description="Informada pelo time de Produto; quando não informada, o painel calcula pelo prazo e pelos bloqueios."
          variant="subtle"
        >
          <dl class="flex flex-col gap-3">
            <div v-for="h in RELEASE_HEALTH" :key="h" class="grid gap-1 sm:grid-cols-[13rem_1fr] sm:gap-4">
              <dt>
                <UBadge
                  :label="RELEASE_HEALTH_META[h].label"
                  :icon="RELEASE_HEALTH_META[h].icon"
                  :color="RELEASE_HEALTH_META[h].color"
                  variant="subtle"
                />
              </dt>
              <dd class="text-sm text-muted">
                {{ RELEASE_HEALTH_META[h].description }}
              </dd>
            </div>
          </dl>
        </UPageCard>

        <UPageCard
          title="Como o progresso é calculado"
          description="Itens “Pronto para release” e “Liberado” contam como concluídos. Itens adiados saem da conta. O painel se atualiza sozinho a cada minuto."
          variant="subtle"
          icon="i-lucide-chart-no-axes-column-increasing"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
