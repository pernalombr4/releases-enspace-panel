<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { PRODUCTS, PRODUCT_META } from '#shared/domain/products'
import type { ProductFilter } from '~/composables/useProductFilter'

// Seletor de produto do menu, no formato do seletor de times do template
// Dashboard do Nuxt UI: as áreas veem um produto ou os 3.
defineProps<{ collapsed?: boolean }>()

const route = useRoute()
const { selected } = useProductFilter()
const { product: routeProduct } = useRouteRelease()

const ALL = { label: 'Todos os produtos', icon: 'i-lucide-layers' }
const current = computed(() => selected.value === 'all' ? ALL : PRODUCT_META[selected.value])

async function choose(value: ProductFilter) {
  selected.value = value
  // Numa release de outro produto, vai para a próxima release do escolhido.
  const onOtherRelease = route.params.version !== undefined && value !== 'all' && routeProduct.value !== value
  if (onOtherRelease) await navigateTo('/')
}

const items = computed<DropdownMenuItem[][]>(() => [
  [{
    ...ALL,
    type: 'checkbox',
    checked: selected.value === 'all',
    onUpdateChecked: (checked: boolean) => checked && choose('all')
  }],
  PRODUCTS.map(product => ({
    label: PRODUCT_META[product].label,
    icon: PRODUCT_META[product].icon,
    type: 'checkbox' as const,
    checked: selected.value === product,
    onUpdateChecked: (checked: boolean) => checked && choose(product)
  }))
])
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-56' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      :label="collapsed ? undefined : current.label"
      :icon="current.icon"
      :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'"
      :aria-label="`Produto: ${current.label}. Trocar o produto`"
      color="neutral"
      variant="outline"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :ui="{ trailingIcon: 'text-dimmed ms-auto' }"
    />
  </UDropdownMenu>
</template>
