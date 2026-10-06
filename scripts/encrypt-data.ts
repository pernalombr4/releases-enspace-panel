/**
 * Valida e criptografa o arquivo de releases para publicação.
 *
 *   PANEL_PASSWORD=... PANEL_SALT=... pnpm encrypt <entrada.json> <saida.enc.json>
 *   pnpm demo:data      (dados de demonstração, senha "demo", para rodar localmente)
 *
 * Usado pelo repositório privado de dados no GitHub Actions.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { encryptJson } from '../shared/domain/crypto'
import { checkReleasesFile } from '../shared/domain/model'

const DEMO = { password: 'demo', salt: 'ZGVtby1zYWx0LWVuc3BhY2UtcmVsZWFzZXM=' }
const MIN_PASSWORD_LENGTH = 12

function fail(message: string): never {
  console.error(`✖ ${message}`)
  process.exit(1)
}

const [input, output] = process.argv.slice(2).filter(a => !a.startsWith('--'))
const demo = process.argv.includes('--demo')
if (!input || !output) fail('Uso: encrypt-data <entrada.json> <saida.enc.json>')

// trim: igual ao painel, que ignora espaços nas pontas da senha digitada
const password = demo ? DEMO.password : process.env.PANEL_PASSWORD?.trim()
const salt = demo ? DEMO.salt : process.env.PANEL_SALT
if (!password) fail('Defina PANEL_PASSWORD (a senha do painel).')
if (!salt) fail('Defina PANEL_SALT (valor fixo em base64, gerado uma vez).')
if (!demo && password.length < MIN_PASSWORD_LENGTH) {
  fail(`A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`)
}

let json: unknown
try {
  json = JSON.parse(await readFile(input, 'utf8'))
} catch (error) {
  fail(`Não foi possível ler ${input} como JSON: ${(error as Error).message}`)
}

// Mesma validação da sincronização com o Enspace (scripts/sync-enspace.ts).
const parsed = checkReleasesFile(json)
if (!parsed.success) fail(`${input}: ${parsed.error}`)

const encrypted = await encryptJson(parsed.data, password, salt)
await mkdir(dirname(output), { recursive: true })
await writeFile(output, `${JSON.stringify(encrypted)}\n`)

// Os itens de subproduto aparecem também na release do subproduto: contam 1 vez, na do ENSPACE.
const items = parsed.data.releases.filter(r => r.product === 'en-space').reduce((n, r) => n + r.items.length, 0)
console.log(`✔ ${output}: ${parsed.data.releases.length} releases, ${items} itens${demo ? ' (demonstração, senha "demo")' : ''}`)
