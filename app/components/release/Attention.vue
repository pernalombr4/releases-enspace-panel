<script setup lang="ts">
import type { Release, ReleaseItem } from '#shared/domain/model'

const props = defineProps<{ release: Release }>()
const { itemLink } = useItemLink()

interface Group {
  key: string
  title: string
  hint: string
  icon: string
  color: 'error' | 'neutral'
  items: ReleaseItem[]
}

const groups = computed(() => {
  const active = props.release.items.filter(i => i.status !== 'postponed')
  const all: Group[] = [{
    key: 'blocked',
    title: 'Bloqueios',
    hint: 'Podem atrasar ou tirar o item da release',
    icon: 'i-lucide-octagon-alert',
    color: 'error',
    items: active.filter(i => i.status === 'blocked')
  }, {
    key: 'communication',
    title: 'Pedem comunicação a clientes',
    hint: 'Marketing e CS',
    icon: 'i-lucide-megaphone',
    color: 'neutral',
    items: active.filter(i => i.needsCommunication)
  }, {
    key: 'training',
    title: 'Pedem treinamento interno',
    hint: 'CS, Suporte e Implantação',
    icon: 'i-lucide-graduation-cap',
    color: 'neutral',
    items: active.filter(i => i.needsTraining)
  }, {
    key: 'beta',
    title: 'Saem em beta',
    hint: 'Disponível para um grupo restrito',
    icon: 'i-lucide-flask-conical',
    color: 'neutral',
    items: active.filter(i => i.beta)
  }]
  return all.filter(g => g.items.length)
})
</script>

<template>
  <UCard>
    <template #header>
      <div>
        <h2 class="font-semibold text-highlighted">
          Para as áreas
        </h2>
        <p class="text-sm text-muted">
          O que CS, Suporte, Comercial e Marketing precisam saber
        </p>
      </div>
    </template>

    <div v-if="groups.length" class="flex flex-col gap-5">
      <div v-for="group in groups" :key="group.key" class="flex flex-col gap-1">
        <div class="flex items-center gap-2">
          <UIcon :name="group.icon" class="size-4 shrink-0" :class="group.color === 'error' ? 'text-error' : 'text-muted'" />
          <h3 class="text-sm font-medium text-highlighted">
            {{ group.title }}
          </h3>
          <UBadge
            :label="String(group.items.length)"
            :color="group.color"
            variant="subtle"
            size="sm"
          />
        </div>
        <p class="ps-6 text-xs text-muted">
          {{ group.hint }}
        </p>
        <ul class="ps-4">
          <li v-for="item in group.items" :key="item.id">
            <UButton
              :to="itemLink(release.version, item.id)"
              color="neutral"
              variant="ghost"
              size="sm"
              block
              class="justify-start text-left"
            >
              <span class="font-mono text-xs text-muted">{{ item.id }}</span>
              <span class="truncate">{{ item.title }}</span>
            </UButton>
            <p v-if="group.key === 'blocked' && item.note" class="ps-2 pb-1 text-xs text-muted">
              {{ item.note }}
            </p>
          </li>
        </ul>
      </div>
    </div>
    <UEmpty
      v-else
      icon="i-lucide-circle-check"
      title="Nada pendente para as outras áreas nesta release"
      variant="naked"
    />
  </UCard>
</template>
