// Sem a chave da senha, qualquer página leva para /entrar.
export default defineNuxtRouteMiddleware(async (to) => {
  const { key, restore } = usePanelKey()
  await restore()

  // O GitHub Pages serve /entrar como /entrar/; trata os dois iguais.
  const path = to.path.replace(/\/+$/, '') || '/'

  if (!key.value && path !== '/entrar') {
    return navigateTo({ path: '/entrar', query: path === '/' ? {} : { next: to.fullPath } })
  }
  if (key.value && path === '/entrar') {
    return navigateTo(safeNext(to.query.next))
  }
})
