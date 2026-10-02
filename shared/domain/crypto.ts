// Criptografia do arquivo de dados com a senha compartilhada.
//
// O repositório privado gera `releases.enc.json` com esta mesma função
// (scripts/encrypt-data.ts) e o painel decifra no navegador. Usa só Web Crypto,
// disponível no Node 20+ e em todos os navegadores atuais.
//
// Chave: PBKDF2-SHA256 (600 mil iterações) sobre a senha + salt fixo da
// instalação. Dados: AES-256-GCM com IV aleatório a cada publicação. O salt fica
// estável para que a chave lembrada no navegador continue valendo quando os
// dados mudam; trocar a senha invalida todas as chaves lembradas.

export const ENCRYPTION_VERSION = 1
export const DEFAULT_ITERATIONS = 600_000

export interface EncryptedFile {
  v: typeof ENCRYPTION_VERSION
  kdf: 'PBKDF2-SHA256'
  cipher: 'AES-256-GCM'
  iterations: number
  /** base64 */
  salt: string
  /** base64 */
  iv: string
  /** base64 */
  data: string
  /** Quando o arquivo foi gerado (não é segredo; ajuda a saber se mudou). */
  publishedAt: string
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function isEncryptedFile(value: unknown): value is EncryptedFile {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return v.v === ENCRYPTION_VERSION && typeof v.salt === 'string' && typeof v.iv === 'string'
    && typeof v.data === 'string' && typeof v.iterations === 'number'
}

/** Deriva a chave AES a partir da senha. `extractable` permite lembrá-la no navegador. */
export async function deriveKey(
  password: string,
  salt: string,
  iterations = DEFAULT_ITERATIONS,
  extractable = false
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64(salt), iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    extractable,
    ['encrypt', 'decrypt']
  )
}

export async function exportKey(key: CryptoKey): Promise<string> {
  return toBase64(new Uint8Array(await crypto.subtle.exportKey('raw', key)))
}

export async function importKey(raw: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', fromBase64(raw), { name: 'AES-GCM' }, false, ['decrypt'])
}

export async function encryptJson(
  payload: unknown,
  password: string,
  salt: string,
  iterations = DEFAULT_ITERATIONS
): Promise<EncryptedFile> {
  const key = await deriveKey(password, salt, iterations)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(payload)))
  return {
    v: ENCRYPTION_VERSION,
    kdf: 'PBKDF2-SHA256',
    cipher: 'AES-256-GCM',
    iterations,
    salt,
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(cipher)),
    publishedAt: new Date().toISOString()
  }
}

export class WrongKeyError extends Error {
  constructor() {
    super('Senha incorreta.')
    this.name = 'WrongKeyError'
  }
}

/** Decifra o arquivo. Lança `WrongKeyError` se a chave não confere (o GCM autentica o conteúdo). */
export async function decryptJson(file: EncryptedFile, key: CryptoKey): Promise<unknown> {
  let plain: ArrayBuffer
  try {
    plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(file.iv) }, key, fromBase64(file.data))
  } catch {
    throw new WrongKeyError()
  }
  return JSON.parse(decoder.decode(plain))
}
