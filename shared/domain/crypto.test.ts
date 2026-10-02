import { describe, expect, it } from 'vitest'
import { WrongKeyError, decryptJson, deriveKey, encryptJson, exportKey, importKey, isEncryptedFile } from './crypto'

const SALT = 'c2FsdC1kZS10ZXN0ZS0xMjM0'
const ITERATIONS = 1_000 // baixo só para o teste ficar rápido

describe('crypto', () => {
  it('cifra e decifra com a mesma senha', async () => {
    const file = await encryptJson({ ok: true, texto: 'Olá' }, 'senha-longa-de-teste', SALT, ITERATIONS)
    expect(isEncryptedFile(file)).toBe(true)
    expect(file.data).not.toContain('Olá')

    const key = await deriveKey('senha-longa-de-teste', SALT, ITERATIONS)
    expect(await decryptJson(file, key)).toEqual({ ok: true, texto: 'Olá' })
  })

  it('recusa senha errada', async () => {
    const file = await encryptJson({ ok: true }, 'senha-certa-123', SALT, ITERATIONS)
    const wrong = await deriveKey('senha-errada-123', SALT, ITERATIONS)
    await expect(decryptJson(file, wrong)).rejects.toBeInstanceOf(WrongKeyError)
  })

  it('a chave lembrada continua valendo quando os dados são publicados de novo', async () => {
    const key = await deriveKey('senha-longa-de-teste', SALT, ITERATIONS, true)
    const remembered = await importKey(await exportKey(key))
    const next = await encryptJson({ versao: 2 }, 'senha-longa-de-teste', SALT, ITERATIONS)
    expect(await decryptJson(next, remembered)).toEqual({ versao: 2 })
  })
})
