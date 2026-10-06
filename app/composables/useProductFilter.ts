import { createSharedComposable } from '@vueuse/core'
import { PRODUCTS, type Product } from '#shared/domain/products'

/** Produto escolhido no seletor do menu, ou os 3. */
export type ProductFilter = Product | 'all'

const STORAGE_KEY = 'enspace-releases:produto'

/** Na URL: ?produto=word. "todos" e "enspace" deixam o link legível. */
export const PRODUCT_QUERY: Record<ProductFilter, string> = {
  'all': 'todos',
  'en-space': 'enspace',
  'word-plugin': 'word',
  'beni-app': 'beni'
}

export function productFilterFromQuery(value: unknown): ProductFilter | undefined {
  return (Object.keys(PRODUCT_QUERY) as ProductFilter[]).find(key => PRODUCT_QUERY[key] === value)
}

function isFilter(value: unknown): value is ProductFilter {
  return value === 'all' || PRODUCTS.includes(value as Product)
}

// Preferência de quem vê, neste navegador. Sem acesso ao armazenamento (janela
// anônima, dados bloqueados), o painel abre com os 3 produtos.
function readStored(): ProductFilter {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return isFilter(value) ? value : 'all'
  } catch {
    return 'all'
  }
}

function store(value: ProductFilter) {
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Sem armazenamento: a escolha vale até fechar a aba.
  }
}

const _useProductFilter = () => {
  const selected = ref<ProductFilter>(readStored())
  watch(selected, store)

  /** Produtos visíveis, na ordem ENSPACE, Word Plugin, Beni App. */
  const products = computed<Product[]>(() => selected.value === 'all' ? [...PRODUCTS] : [selected.value])
  const shows = (product: Product) => selected.value === 'all' || selected.value === product

  return { selected, products, shows }
}

export const useProductFilter = createSharedComposable(_useProductFilter)
