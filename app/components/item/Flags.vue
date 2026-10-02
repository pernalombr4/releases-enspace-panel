<script setup lang="ts">
import type { ReleaseItem } from '#shared/domain/model'

const props = defineProps<{ item: ReleaseItem }>()

const flags = computed(() => [
  props.item.beta && { label: 'Beta', icon: 'i-lucide-flask-conical', hint: 'Liberação em beta' },
  props.item.needsCommunication && { label: 'Comunicação', icon: 'i-lucide-megaphone', hint: 'Pede comunicação a clientes' },
  props.item.needsTraining && { label: 'Treinamento', icon: 'i-lucide-graduation-cap', hint: 'Pede treinamento interno' }
].filter((flag): flag is { label: string, icon: string, hint: string } => Boolean(flag)))
</script>

<template>
  <div v-if="flags.length" class="flex flex-wrap gap-1">
    <UTooltip v-for="flag in flags" :key="flag.label" :text="flag.hint">
      <UBadge
        :label="flag.label"
        :icon="flag.icon"
        color="neutral"
        variant="soft"
        size="sm"
      />
    </UTooltip>
  </div>
</template>
