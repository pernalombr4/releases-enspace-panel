import { productFromSlug } from '#shared/domain/products'

/**
 * Release aberta na rota: /releases/3.1 (ENSPACE) ou /releases/word/1.1.0
 * (subproduto). Usada pela página da release e pelo detalhe do item.
 */
export function useRouteRelease() {
  const route = useRoute()
  const { releases } = useReleases()

  const product = computed(() => productFromSlug(route.params.product))
  const version = computed(() => typeof route.params.version === 'string' ? route.params.version : undefined)
  const release = computed(() => releases.value.find(r => r.product === product.value && r.version === version.value))

  return { product, version, release }
}
