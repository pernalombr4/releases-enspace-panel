import { releasePath, type Product } from '#shared/domain/products'

/** Abre o detalhe de um item (Slideover) mantendo a página atual. */
export function useItemLink() {
  const route = useRoute()
  const { product, version } = useRouteRelease()

  function itemLink(release: { product: Product, version: string }, id: string) {
    const samePage = product.value === release.product && version.value === release.version
    return samePage
      ? { path: route.path, query: { ...route.query, item: id } }
      : { path: `${releasePath(release)}/itens`, query: { item: id } }
  }

  return { itemLink }
}
