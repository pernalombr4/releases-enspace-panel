/** Abre o detalhe de um item (Slideover) mantendo a página atual. */
export function useItemLink() {
  const route = useRoute()

  function itemLink(version: string, id: string) {
    const samePage = route.params.version === version
    return samePage
      ? { path: route.path, query: { ...route.query, item: id } }
      : { path: `/releases/${version}/itens`, query: { item: id } }
  }

  return { itemLink }
}
