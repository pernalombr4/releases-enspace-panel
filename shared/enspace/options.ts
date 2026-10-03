import type { Field } from '@be-enlighten/enspace-sdk-schemas'
import { normalizeLabel } from './values'

// Seleções do Enspace chegam pelo VALOR da opção (`montagem_escopo`,
// `nova_funcionalidade`…), não pelo rótulo. Os rótulos vêm das definições de
// campo lidas na mesma sincronização (`fields.list()`), e as regras de
// docs/integracao-enspace.md são conferidas contra o rótulo normalizado e
// também contra os valores já conhecidos. Assim uma opção renomeada ou um valor
// que ainda não conhecemos vira aviso, nunca erro.

/** Opção escolhida num campo de seleção. */
export interface Choice {
  value: string
  /** Rótulo da opção nas definições do campo; vazio quando o valor não está lá. */
  label?: string
}

/** Uma regra da documentação: os rótulos (e valores conhecidos) que levam a `result`. */
export interface OptionRule<T> {
  result: T
  labels: readonly string[]
  /** Valores da API já vistos para esta regra, quando diferem do rótulo normalizado. */
  values?: readonly string[]
}

/** Primeira regra cujo rótulo ou valor conhecido bate com a opção escolhida. */
export function matchRule<T>(choice: Choice, rules: readonly OptionRule<T>[]): OptionRule<T> | undefined {
  const keys = new Set([normalizeLabel(choice.value), ...(choice.label ? [normalizeLabel(choice.label)] : [])])
  return rules.find(rule => [...rule.labels, ...(rule.values ?? [])].some(candidate => keys.has(normalizeLabel(candidate))))
}

/** A opção bate com algum destes rótulos ou valores? */
export function isOneOf(choice: Choice | undefined, candidates: readonly string[]): boolean {
  return choice !== undefined && matchRule(choice, [{ result: true, labels: candidates }]) !== undefined
}

/** "Rótulo (valor)" para avisos; só o valor quando não há rótulo. */
export function describeChoice(choice: Choice): string {
  return choice.label && choice.label !== choice.value ? `"${choice.label}" (${choice.value})` : `"${choice.value}"`
}

/** Valor cru de uma seleção: texto, número, `{ value, label }` ou lista disso. */
function rawChoices(raw: unknown): { value: string, label?: string }[] {
  if (raw === null || raw === undefined || raw === '') return []
  if (Array.isArray(raw)) return raw.flatMap(rawChoices)
  if (typeof raw === 'string') return raw.trim() ? [{ value: raw.trim() }] : []
  if (typeof raw === 'number' || typeof raw === 'boolean') return [{ value: String(raw) }]
  if (typeof raw === 'object' && !(raw instanceof Date)) {
    const obj = raw as Record<string, unknown>
    const value = obj.value ?? obj.id
    if (typeof value === 'string' || typeof value === 'number') {
      return [{ value: String(value), label: typeof obj.label === 'string' ? obj.label : undefined }]
    }
  }
  return []
}

export interface OptionCatalog {
  /** Opções escolhidas no campo, com o rótulo resolvido; `unknown` lista as que não estão nas definições. */
  choices(refId: string, raw: unknown): { choices: Choice[], unknown: Choice[] }
  /** O campo existe nas definições lidas? */
  hasField(refId: string): boolean
}

/** Catálogo de rótulos de uma categoria, a partir das definições de campo do Enspace. */
export function optionCatalog(fields: readonly Pick<Field, 'refId' | 'options'>[]): OptionCatalog {
  const byField = new Map<string, Map<string, string>>()
  for (const field of fields) {
    const labels = new Map<string, string>()
    for (const option of field.options ?? []) {
      labels.set(option.value, option.label)
      for (const child of option.children ?? []) labels.set(child.value, child.label)
    }
    byField.set(field.refId, labels)
  }

  return {
    hasField: refId => byField.has(refId),
    choices(refId, raw) {
      const labels = byField.get(refId)
      const choices: Choice[] = []
      const unknown: Choice[] = []
      for (const { value, label } of rawChoices(raw)) {
        const known = labels?.get(value)
        const choice = { value, label: known ?? label }
        choices.push(choice)
        if (known === undefined) unknown.push(choice)
      }
      return { choices, unknown }
    }
  }
}
