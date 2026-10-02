/** Só aceita caminhos internos fora da tela de login (evita redirecionar para fora do painel ou em loop). */
export function safeNext(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/'
  return /^\/entrar(\/|\?|$)/.test(value) ? '/' : value
}
