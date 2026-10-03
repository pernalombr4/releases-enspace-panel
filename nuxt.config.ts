// https://nuxt.com/docs/api/configuration/nuxt-config
const nuxtUiIcons = [
  'arrow-down', 'arrow-left', 'arrow-right', 'arrow-up', 'arrow-up-right', 'check', 'chevron-down',
  'chevron-left', 'chevron-right', 'chevron-up', 'chevrons-left', 'chevrons-right', 'circle-alert',
  'circle-check', 'circle-x', 'copy', 'copy-check', 'ellipsis', 'eye', 'eye-off', 'grip-vertical',
  'info', 'loader-circle', 'menu', 'minus', 'monitor', 'moon', 'panel-left-close', 'panel-left-open',
  'plus', 'rotate-ccw', 'search', 'sun', 'triangle-alert', 'x',
  // Usados pelo EnTable do SDK do ENSPACE (ordenação, estado vazio).
  'chevrons-up-down', 'inbox'
].map(name => `lucide:${name}`)

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    // Componentes do ENSPACE, sobre o mesmo Nuxt UI 4: EnApp na raiz e EnTable
    // nas tabelas. Só os componentes base: o painel lê um arquivo estático, e o
    // módulo de dados (@be-enlighten/enspace-sdk-vue/nuxt, com Keycloak) fica fora.
    '@be-enlighten/enspace-sdk-ui/nuxt',
    '@vueuse/nuxt'
  ],

  // Site estático (GitHub Pages): sem servidor, tudo roda no navegador.
  ssr: false,

  devtools: {
    enabled: true
  },

  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      meta: [{ name: 'robots', content: 'noindex, nofollow' }]
    }
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      // Arquivo criptografado publicado pelo repositório privado de dados.
      dataUrl: 'data/releases.enc.json',
      refreshSeconds: 60,
      enspaceAppUrl: 'https://be.enspace.io',
      // Endpoint do Enspace que informa se cada release foi adiada (definido na integração).
      postponementUrl: ''
    }
  },

  compatibilityDate: '2026-06-30',

  nitro: {
    preset: 'github_pages'
  },

  enspaceUi: {
    // Sem o módulo de dados de propósito: cala o aviso do build.
    dataModuleCheck: false
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  // Ícones embutidos no bundle: o site não depende da API do Iconify.
  icon: {
    provider: 'none',
    clientBundle: {
      scan: { globInclude: ['app/**/*.{vue,ts}', 'shared/**/*.ts'] },
      icons: nuxtUiIcons
    }
  }
})
