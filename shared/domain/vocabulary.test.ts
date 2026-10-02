import { describe, expect, it } from 'vitest'
import { canonical } from './vocabulary'

describe('canonical', () => {
  it('aceita a chave ou o rótulo em português, sem acento e caixa', () => {
    expect(canonical('status', 'in_progress')).toBe('in_progress')
    expect(canonical('status', 'Em desenvolvimento')).toBe('in_progress')
    expect(canonical('status', 'EM HOMOLOGAÇÃO')).toBe('testing')
    expect(canonical('status', 'Liberado')).toBe('released')
    expect(canonical('kind', 'Correção')).toBe('fix')
    expect(canonical('level', 'média')).toBe('medium')
    expect(canonical('stage', 'Code Freeze')).toBe('code_freeze')
    expect(canonical('health', 'No prazo')).toBe('on_track')
  })

  it('devolve o valor original quando não reconhece', () => {
    expect(canonical('status', 'qualquer coisa')).toBe('qualquer coisa')
    expect(canonical('status', 3)).toBe(3)
  })
})
