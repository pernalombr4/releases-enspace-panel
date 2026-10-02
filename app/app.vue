<script setup lang="ts">
const colorMode = useColorMode()
const color = computed(() => colorMode.value === 'dark' ? '#18181b' : 'white')

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
  <UApp :toaster="{ position: 'bottom-right' }">
    <NuxtLoadingIndicator />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
