import { describe, expect, it } from 'vitest'
import { reviveLikeSdk } from './testing'
import { bool, count, day, normalizeLabel, relationLabel, relations, text, timestamp } from './values'

describe('day', () => {
  it('aceita string sem hora, com hora, com fuso e no formato brasileiro', () => {
    expect(day('2026-10-30')).toBe('2026-10-30')
    expect(day('2026-10-30T03:00:00.000Z')).toBe('2026-10-30')
    expect(day('2026-10-30T10:00')).toBe('2026-10-30')
    expect(day('30/10/2026')).toBe('2026-10-30')
    expect(day('amanhã')).toBeUndefined()
    expect(day(undefined)).toBeUndefined()
  })

  it('aceita o Date que o SDK entrega', () => {
    // Data sem hora: o SDK entrega meia-noite UTC, que é o próprio dia.
    expect(day(new Date('2026-10-06'))).toBe('2026-10-06')
    // Data com hora: vale o dia em Brasília (22h de 30/10 = 01:00Z de 31/10).
    expect(day(new Date('2026-10-31T01:00:00.000Z'))).toBe('2026-10-30')
    expect(day(new Date('2026-10-30T15:00:00.000Z'))).toBe('2026-10-30')
    expect(day(new Date('x'))).toBeUndefined()
  })

  it('dá o mesmo dia para a string e para o Date que o SDK faz dela', () => {
    for (const value of ['2026-10-06', '2026-10-06T00:00:00.000Z', '2026-10-31T01:00:00Z', '2026-10-30T22:00:00-03:00', '2026-10-30T23:59:59.999-03:00']) {
      const revived = reviveLikeSdk(value)
      expect(revived).toBeInstanceOf(Date)
      expect(day(revived)).toBe(day(value))
    }
  })
})

describe('timestamp', () => {
  it('devolve ISO 8601 para Date e mantém strings válidas', () => {
    expect(timestamp(new Date('2026-10-02T16:12:00.000Z'))).toBe('2026-10-02T16:12:00.000Z')
    expect(timestamp('2026-10-02T13:12:00-03:00')).toBe('2026-10-02T13:12:00-03:00')
    expect(timestamp('ontem')).toBeUndefined()
    expect(timestamp(null)).toBeUndefined()
  })
})

describe('relações', () => {
  const cliente = { id: 1, display: 'CLIENTE ALFA LTDA (CLI0000000000000000000000000000A1)', reference: 'CLI0000000000000000000000000000A1' }

  it('aceita objeto ou lista e ignora o resto', () => {
    expect(relations(cliente)).toEqual([cliente])
    expect(relations([cliente, 'x', null])).toEqual([cliente])
    expect(relations(new Date())).toEqual([])
    expect(relations('')).toEqual([])
  })

  it('tira a referência que o Enspace anexa ao nome', () => {
    expect(relationLabel(cliente)).toBe('CLIENTE ALFA LTDA')
    expect(relationLabel([{ display: 'Nome sem referência' }])).toBe('Nome sem referência')
    expect(relationLabel({ display: 'Ana Souza (PES0A1B2C3D4E)' })).toBe('Ana Souza')
    expect(relationLabel(null)).toBeUndefined()
  })
})

describe('text, bool e count', () => {
  it('lê os formatos simples', () => {
    expect(text({ label: 'Em testes', value: 'testing' })).toBe('Em testes')
    expect(text('  ')).toBeUndefined()
    expect(text(new Date('2026-10-02T16:12:00.000Z'))).toBe('2026-10-02T16:12:00.000Z')
    expect(bool('Sim')).toBe(true)
    expect(bool('não')).toBe(false)
    expect(bool('')).toBeUndefined()
    expect(count(3)).toBe(3)
    expect(count('2')).toBe(2)
    expect(count(-1)).toBeUndefined()
    expect(count('dois')).toBeUndefined()
  })
})

describe('normalizeLabel', () => {
  it('iguala rótulo e valor da opção', () => {
    expect(normalizeLabel('Montagem do escopo')).toBe(normalizeLabel('montagem_escopo'))
    expect(normalizeLabel('Validada em teste')).toBe(normalizeLabel('validada_teste'))
    expect(normalizeLabel('Não reproduzível')).toBe('nao reproduzivel')
    expect(normalizeLabel('Não subiu — foi adiado')).toBe('nao subiu adiado')
    expect(normalizeLabel('  EM   Homologação ')).toBe('homologacao')
  })

  it('mantém diferentes os rótulos que são diferentes', () => {
    expect(normalizeLabel('Concluído')).not.toBe(normalizeLabel('Concluída'))
    expect(normalizeLabel('Não subiu — decidir destino')).not.toBe(normalizeLabel('Não subiu — foi adiado'))
  })
})
