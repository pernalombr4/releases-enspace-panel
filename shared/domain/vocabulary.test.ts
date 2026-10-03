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

  it('classifica itens em correção, melhoria ou inovação, inclusive os tipos do Enspace', () => {
    expect(canonical('kind', 'Inovação')).toBe('innovation')
    expect(canonical('kind', 'nova_funcionalidade')).toBe('innovation')
    expect(canonical('kind', 'solicitacao_automacao')).toBe('innovation')
    expect(canonical('kind', 'feature')).toBe('innovation')
    expect(canonical('kind', 'integration')).toBe('innovation')
    expect(canonical('kind', 'melhoria')).toBe('improvement')
    expect(canonical('kind', 'divida_tecnica')).toBe('improvement')
    expect(canonical('kind', 'performance')).toBe('improvement')
    expect(canonical('kind', 'bug')).toBe('fix')
    expect(canonical('origin', 'Cliente')).toBe('client')
    expect(canonical('origin', 'interna')).toBe('internal')
  })

  it('devolve o valor original quando não reconhece', () => {
    expect(canonical('status', 'qualquer coisa')).toBe('qualquer coisa')
    expect(canonical('status', 3)).toBe(3)
  })
})
