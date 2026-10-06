import { describe, expect, it } from 'vitest'
import { checkReleasesFile, compareReleases, ReleasesFileSchema } from './model'
import { companionReleases, productFromSlug, releaseKey, releasePath, releaseTitle } from './products'

const item = (id: string, status: string, product?: string) => ({ id, title: `Item ${id}`, status, product, updatedAt: '2026-10-01T10:00:00-03:00' })

const file = {
  releases: [
    { version: '3.0', releasedAt: '2026-08-25' },
    {
      version: '3.1',
      targetDate: '2026-10-06',
      owner: 'Time de Produto',
      postponement: { postponed: true, originalDate: '2026-09-29' },
      milestones: [{ label: 'Subida para produção', date: '2026-10-06' }],
      items: [item('A', 'ready'), item('B', 'testing', 'Plugin para Word'), item('C', 'ready', 'beni-app'), item('D', 'ready', 'word-plugin')]
    },
    { product: 'word-plugin', version: '1.0.0', originVersion: '3.0', summary: 'O plugin.' },
    { product: 'Word Plugin', version: '1.1.0', originVersion: '3.1' },
    { product: 'beni-app', version: '1.0.0', originVersion: '3.0' },
    { product: 'beni-app', version: '1.1.0', type: 'minor', originVersion: '3.1' }
  ]
}

describe('releases de subproduto', () => {
  const { releases } = ReleasesFileSchema.parse(file)
  const find = (product: string, version: string) => releases.find(r => r.product === product && r.version === version)!

  it('trazem os itens da release do ENSPACE de origem marcados com o produto, que continuam lá', () => {
    expect(find('word-plugin', '1.1.0').items.map(i => i.id)).toEqual(['B', 'D'])
    expect(find('beni-app', '1.1.0').items.map(i => i.id)).toEqual(['C'])
    expect(find('en-space', '3.1').items.map(i => i.id)).toEqual(['A', 'B', 'C', 'D'])
  })

  it('herdam a data, o adiamento, o responsável e os marcos da origem', () => {
    const word = find('word-plugin', '1.1.0')
    expect(word.targetDate).toBe('2026-10-06')
    expect(word.postponement).toEqual({ postponed: true, originalDate: '2026-09-29' })
    expect(word.owner).toBe('Time de Produto')
    expect(word.milestones).toEqual([{ label: 'Subida para produção', date: '2026-10-06' }])
  })

  it('a fase sai dos próprios itens; com a origem liberada, ficam liberadas', () => {
    expect(find('word-plugin', '1.1.0').stage).toBe('testing')
    expect(find('beni-app', '1.1.0').stage).toBe('ready')
    expect(find('word-plugin', '1.0.0')).toMatchObject({ stage: 'released', releasedAt: '2026-08-25', items: [] })
  })

  it('dão o mesmo resultado lidas de novo (o arquivo publicado já vem ligado)', () => {
    expect(ReleasesFileSchema.parse(JSON.parse(JSON.stringify({ releases }))).releases).toEqual(releases)
  })

  it('sem produto, a release é do ENSPACE', () => {
    expect(find('en-space', '3.0').product).toBe('en-space')
  })

  it('a release do ENSPACE lista as de subproduto que saem com ela', () => {
    expect(companionReleases(find('en-space', '3.1'), releases).map(releaseKey)).toEqual(['word-plugin:1.1.0', 'beni-app:1.1.0'])
    expect(companionReleases(find('word-plugin', '1.1.0'), releases)).toEqual([])
  })

  it('ordenam por produto e depois por versão', () => {
    expect([...releases].reverse().sort(compareReleases).map(releaseKey)).toEqual([
      'en-space:3.0', 'en-space:3.1', 'word-plugin:1.0.0', 'word-plugin:1.1.0', 'beni-app:1.0.0', 'beni-app:1.1.0'
    ])
  })
})

describe('checkReleasesFile com subprodutos', () => {
  it('aceita a mesma versão em produtos diferentes', () => {
    expect(checkReleasesFile(file).success).toBe(true)
  })

  it('recusa release de subproduto sem origem, com origem inexistente, com itens próprios ou repetida', () => {
    const check = (extra: object) => checkReleasesFile({ releases: [...file.releases, extra] })
    expect(check({ product: 'word-plugin', version: '1.2.0' })).toEqual({ success: false, error: 'Word Plugin 1.2.0: informe em originVersion a release do ENSPACE com que ela sai' })
    expect(check({ product: 'word-plugin', version: '1.2.0', originVersion: '3.2' })).toEqual({ success: false, error: 'Word Plugin 1.2.0: a release 3.2 do ENSPACE (originVersion) não está no arquivo' })
    expect(check({ product: 'word-plugin', version: '1.1.0', originVersion: '3.1' })).toEqual({ success: false, error: 'versões repetidas no Word Plugin: 1.1.0' })
    expect(check({ product: 'beni-app', version: '1.1.1', originVersion: '3.1' })).toEqual({ success: false, error: 'Beni App 1.1.0 e Beni App 1.1.1 saem da mesma release 3.1 do ENSPACE; é 1 release do subproduto por release do ENSPACE' })
    expect(checkReleasesFile({ releases: [file.releases[0], { product: 'beni-app', version: '1.0.0', originVersion: '3.0', items: [item('X', 'ready')] }] }))
      .toEqual({ success: false, error: 'Beni App 1.0.0: os itens ficam na release 3.0 do ENSPACE, com "product": "beni-app"' })
    expect(checkReleasesFile({ releases: [{ version: '3.0', originVersion: '2.15' }] })).toEqual({ success: false, error: 'Release 3.0: originVersion só vale para release de subproduto' })
    expect(checkReleasesFile({ releases: [{ product: 'sdk', version: '0.1.0' }] })).toMatchObject({ success: false, error: expect.stringContaining('campos inválidos') })
  })
})

describe('endereço e nome', () => {
  it('o ENSPACE fica em /releases/3.1; os subprodutos, com o trecho do portal de documentação', () => {
    expect(releasePath({ product: 'en-space', version: '3.1' })).toBe('/releases/3.1')
    expect(releasePath({ product: 'word-plugin', version: '1.1.0' })).toBe('/releases/word/1.1.0')
    expect(releasePath({ product: 'beni-app', version: '1.0.0' })).toBe('/releases/beni/1.0.0')
    expect(releaseTitle({ product: 'en-space', version: '3.1' })).toBe('Release 3.1')
    expect(releaseTitle({ product: 'beni-app', version: '1.1.0' })).toBe('Beni App 1.1.0')
    expect([undefined, 'word', 'beni', 'sdk'].map(productFromSlug)).toEqual(['en-space', 'word-plugin', 'beni-app', undefined])
  })
})
