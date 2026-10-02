<script setup lang="ts">
import { formatDateTime, formatRelative } from '#shared/domain/format'
import { IMPACT_LABEL, ITEM_STATUS, PRIORITY_LABEL } from '#shared/domain/labels'

const route = useRoute()
const router = useRouter()
const { releases } = useReleases()
const now = useNow({ interval: 30_000 })

const version = computed(() => typeof route.params.version === 'string' ? route.params.version : undefined)
const item = computed(() => {
  const id = route.query.item
  if (typeof id !== 'string' || !version.value) return undefined
  return releases.value.find(r => r.version === version.value)?.items.find(i => i.id === id)
})

const open = computed({
  get: () => Boolean(item.value),
  set: (value) => {
    if (!value) {
      const { item: _, ...query } = route.query
      router.replace({ query })
    }
  }
})

const facts = computed(() => {
  const i = item.value
  if (!i) return []
  return [
    ['Área do produto', i.module],
    ['Impacto para clientes', i.impact && IMPACT_LABEL[i.impact]],
    ['Prioridade', i.priority && PRIORITY_LABEL[i.priority]],
    ['Quem recebe', i.audience],
    ['Solicitado por', i.requestedBy],
    ['Responsável', i.owner]
  ].filter((fact): fact is [string, string] => Boolean(fact[1]))
})
</script>

<template>
  <USlideover
    v-model:open="open"
    :title="item?.title"
    :description="item ? `${item.id} · Release ${version}` : undefined"
  >
    <template v-if="item" #body>
      <div class="flex flex-col gap-5">
        <div class="flex flex-col gap-2">
          <div class="flex flex-wrap gap-2">
            <ItemStatusBadge :status="item.status" />
            <ItemKindBadge :kind="item.kind" />
          </div>
          <p class="text-sm text-muted">
            {{ ITEM_STATUS[item.status].description }}
          </p>
        </div>

        <UAlert
          v-if="item.note"
          :color="item.status === 'blocked' ? 'error' : 'neutral'"
          variant="subtle"
          :icon="item.status === 'blocked' ? 'i-lucide-octagon-alert' : 'i-lucide-info'"
          :title="item.status === 'blocked' ? 'Motivo do bloqueio' : 'Observação'"
          :description="item.note"
        />
        <UAlert
          v-if="item.movedTo"
          color="neutral"
          variant="subtle"
          icon="i-lucide-calendar-clock"
          :title="`Movido para a release ${item.movedTo}`"
        />

        <section v-if="item.summary">
          <h3 class="mb-1 text-xs font-semibold uppercase text-muted">
            O que é
          </h3>
          <p class="text-sm text-default">
            {{ item.summary }}
          </p>
        </section>

        <section v-if="item.customerImpact">
          <h3 class="mb-1 text-xs font-semibold uppercase text-muted">
            O que muda para o cliente
          </h3>
          <p class="text-sm text-default">
            {{ item.customerImpact }}
          </p>
        </section>

        <ItemFlags :item="item" />

        <USeparator />

        <dl class="grid grid-cols-2 gap-4 text-sm">
          <div v-for="[label, value] in facts" :key="label">
            <dt class="text-xs text-muted">
              {{ label }}
            </dt>
            <dd class="font-medium text-highlighted">
              {{ value }}
            </dd>
          </div>
          <div class="col-span-2">
            <dt class="text-xs text-muted">
              Última atualização
            </dt>
            <dd class="font-medium text-highlighted">
              {{ formatDateTime(item.updatedAt) }} ({{ formatRelative(item.updatedAt, now) }})
            </dd>
          </div>
        </dl>

        <div v-if="item.links?.length" class="flex flex-wrap gap-2">
          <UButton
            v-for="link in item.links"
            :key="link.url"
            :to="link.url"
            target="_blank"
            :label="link.label"
            trailing-icon="i-lucide-arrow-up-right"
            color="neutral"
            variant="outline"
          />
        </div>
      </div>
    </template>
  </USlideover>
</template>
