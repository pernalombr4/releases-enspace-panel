import { describe, expect, it } from 'vitest'
import { describeChoice, isOneOf, matchRule, optionCatalog } from './options'
import { selectField } from './testing'

const catalog = optionCatalog([
  selectField('status', [['st_dev', 'Em desenvolvimento'], ['montagem_escopo', 'Montagem do escopo']]),
  selectField('alcance', [['al_all', 'Todos os clientes']])
])

describe('optionCatalog', () => {
  it('resolve o rótulo pelo valor que a API manda', () => {
    expect(catalog.choices('status', 'st_dev')).toEqual({ choices: [{ value: 'st_dev', label: 'Em desenvolvimento' }], unknown: [] })
  })

  it('separa valores que não estão nas opções do campo', () => {
    expect(catalog.choices('status', 'st_novo')).toEqual({ choices: [{ value: 'st_novo', label: undefined }], unknown: [{ value: 'st_novo', label: undefined }] })
  })

  it('aceita lista, objeto { value, label } e vazio', () => {
    expect(catalog.choices('alcance', ['al_all']).choices).toEqual([{ value: 'al_all', label: 'Todos os clientes' }])
    expect(catalog.choices('alcance', { value: 'al_all', label: 'Outro rótulo' }).choices).toEqual([{ value: 'al_all', label: 'Todos os clientes' }])
    expect(catalog.choices('alcance', null)).toEqual({ choices: [], unknown: [] })
  })

  it('sabe quais campos vieram nas definições', () => {
    expect(catalog.hasField('status')).toBe(true)
    expect(catalog.hasField('origem')).toBe(false)
  })
})

describe('matchRule', () => {
  const rules = [
    { result: 'planning', labels: ['Montagem do escopo'] },
    { result: 'development', labels: ['Em desenvolvimento'] }
  ]

  it('casa pelo rótulo normalizado, mesmo com valor desconhecido', () => {
    expect(matchRule({ value: 'st_dev', label: 'EM DESENVOLVIMENTO' }, rules)?.result).toBe('development')
  })

  it('casa pelo valor quando o rótulo não veio', () => {
    expect(matchRule({ value: 'montagem_escopo' }, rules)?.result).toBe('planning')
    expect(matchRule({ value: 'em_desenvolvimento' }, rules)?.result).toBe('development')
  })

  it('não casa o que não está nas regras', () => {
    expect(matchRule({ value: 'st_x', label: 'Aguardando aprovação' }, rules)).toBeUndefined()
    expect(isOneOf(undefined, ['Sim'])).toBe(false)
  })

  it('descreve a opção para os avisos', () => {
    expect(describeChoice({ value: 'st_dev', label: 'Em desenvolvimento' })).toBe('"Em desenvolvimento" (st_dev)')
    expect(describeChoice({ value: 'st_x' })).toBe('"st_x"')
  })
})
