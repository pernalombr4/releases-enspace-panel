<script setup lang="ts">
const { data, error, refresh } = useReleases()
</script>

<template>
  <div v-if="data?.sample || error" class="flex flex-col gap-3">
    <UAlert
      v-if="data?.sample"
      color="info"
      variant="subtle"
      icon="i-lucide-info"
      title="Dados de exemplo"
      description="O conteúdo abaixo é ilustrativo e será trocado pelos itens oficiais levantados pelo time de Produto."
    />
    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="error.message"
      :description="data ? `Mostrando os últimos dados carregados. ${error.detail ?? ''}` : error.detail"
      :actions="[{ label: 'Tentar de novo', color: 'error', variant: 'outline', onClick: () => refresh() }]"
    />
  </div>
</template>
