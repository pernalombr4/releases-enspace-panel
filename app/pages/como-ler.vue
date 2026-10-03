<script setup lang="ts">
import { BOARD_ORDER, ITEM_KIND, ITEM_STATUS, KIND_ORDER, POSTPONEMENT_META, RELEASE_HEALTH_META, RELEASE_STAGE, RELEASE_TYPE_META } from '#shared/domain/labels'
import { MARKER_KEYS, MARKER_META } from '#shared/domain/markers'
import { RELEASE_HEALTH, RELEASE_STAGES, RELEASE_TYPES } from '#shared/domain/vocabulary'

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

        <UPageCard
          title="Classificação dos itens"
          description="Todo item é uma correção, uma melhoria ou uma inovação."
          variant="subtle"
        >
          <dl class="flex flex-col gap-3">
            <div v-for="k in KIND_ORDER" :key="k" class="grid gap-1 sm:grid-cols-[13rem_1fr] sm:gap-4">
              <dt><ItemKindBadge :kind="k" size="md" /></dt>
              <dd class="text-sm text-muted">
                {{ ITEM_KIND[k].description }}
              </dd>
            </div>
          </dl>
        </UPageCard>

        <UPageCard
          title="Marcadores"
          description="Selos que aparecem nos itens quando se aplicam. Na página de itens, dá para filtrar por eles."
          variant="subtle"
        >
          <dl class="flex flex-col gap-3">
            <div v-for="m in MARKER_KEYS" :key="m" class="grid gap-1 sm:grid-cols-[13rem_1fr] sm:gap-4">
              <dt>
                <UBadge
                  :label="MARKER_META[m].label"
                  :icon="MARKER_META[m].icon"
                  :color="MARKER_META[m].color"
                  variant="soft"
                />
              </dt>
              <dd class="text-sm text-muted">
                {{ MARKER_META[m].description }}
              </dd>
            </div>
            <div class="grid gap-1 sm:grid-cols-[13rem_1fr] sm:gap-4">
              <dt>
                <UBadge
                  label="Todos os clientes"
                  icon="i-lucide-users"
                  color="neutral"
                  variant="soft"
                />
              </dt>
              <dd class="text-sm text-muted">
                Quem recebe a mudança: todos os clientes, alguns clientes, um cliente específico ou só uso interno.
              </dd>
            </div>
          </dl>
        </UPageCard>

        <UPageCard
          title="Tipos de release"
          description="No calendário, cada tipo tem um destaque diferente. Quando não é informado, o tipo vem da versão: 3.0 é major, 3.1 é minor e 3.1.2 é patch."
          variant="subtle"
        >
          <dl class="flex flex-col gap-3">
            <div v-for="t in RELEASE_TYPES" :key="t" class="grid gap-1 sm:grid-cols-[13rem_1fr] sm:gap-4">
              <dt><ReleaseTypeBadge :type="t" /></dt>
              <dd class="text-sm text-muted">
                {{ RELEASE_TYPE_META[t].description }}
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
          title="Adiamento"
          description="Indica publicamente se a data de subida da release foi adiada ou mantida. Quando adiada, o resumo da release mostra a data original, a nova data e o motivo, e o calendário mostra a data original riscada."
          variant="subtle"
        >
          <dl class="flex flex-col gap-3">
            <div v-for="meta in [POSTPONEMENT_META.postponed, POSTPONEMENT_META.kept]" :key="meta.label" class="grid gap-1 sm:grid-cols-[13rem_1fr] sm:gap-4">
              <dt>
                <UBadge
                  :label="meta.label"
                  :icon="meta.icon"
                  :color="meta.color"
                  :variant="meta === POSTPONEMENT_META.postponed ? 'solid' : 'outline'"
                />
              </dt>
              <dd class="text-sm text-muted">
                {{ meta.description }}
              </dd>
            </div>
          </dl>
        </UPageCard>

        <UPageCard
          title="Saúde da release"
          description="Informada pelo time de Produto; quando não informada, o painel calcula pelo prazo, pelos bloqueios e pelos itens em risco."
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
