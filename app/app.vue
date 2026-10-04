<script setup lang="ts">
const colorMode = useColorMode()
// Fundo do modo escuro com o neutro do ENSPACE (space-900).
const color = computed(() => colorMode.value === 'dark' ? '#0E0916' : 'white')

useHead({
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { key: 'theme-color', name: 'theme-color', content: color }
  ],
  link: [{ rel: 'icon', type: 'image/svg+xml', href: `${useRuntimeConfig().app.baseURL}favicon.svg` }],
  htmlAttrs: { lang: 'pt-BR' }
})

useSeoMeta({
  title: 'ENSPACE Releases',
  description: 'Status em tempo real dos itens cotados para as próximas releases do ENSPACE.'
})
</script>

<template>
  <!-- EnApp (SDK do ENSPACE) abraça o UApp do Nuxt UI e define o idioma dos dois. -->
  <EnApp locale="pt-BR" :toaster="{ position: 'bottom-right' }">
    <NuxtLoadingIndicator />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </EnApp>
</template>
