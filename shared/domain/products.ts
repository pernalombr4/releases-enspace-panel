import type { Release } from './model'
import { furthestStage, stageFromItems } from './progress'

// Os 3 produtos do ENSPACE, cada um com as suas releases (INSTRUCOES_PROJETO_CLAUDE.md,
// seção 3.5, do pipeline de release notes). As chaves são as do `release.project`
// das release notes. O SDK do ENSPACE é produto futuro, sem release: não entra.

export const PRODUCTS = ['en-space', 'word-plugin', 'beni-app'] as const
export type Product = (typeof PRODUCTS)[number]

export const DEFAULT_PRODUCT: Product = 'en-space'

/** Subprodutos: a release sai junto com uma release do ENSPACE e tem numeração própria. */
export type SubProduct = Exclude<Product, 'en-space'>

export const PRODUCT_META: Record<Product, {
  label: string
  /** Trecho da URL do painel: /releases/word/1.1.0. O ENSPACE fica sem trecho (/releases/3.1). */
  slug?: string
  /** Mesmos ícones do seletor de produto do portal de documentação. */
  icon: string
  description: string
}> = {
  'en-space': {
    label: 'ENSPACE',
    icon: 'i-lucide-layout-grid',
    description: 'A plataforma ENSPACE.'
  },
  'word-plugin': {
    label: 'Word Plugin',
    slug: 'word',
    icon: 'i-lucide-file-type',
    description: 'O plugin do ENSPACE para o Microsoft Word. Cada versão sai junto com uma release do ENSPACE.'
  },
  'beni-app': {
    label: 'Beni App',
    slug: 'beni',
    icon: 'i-lucide-bot',
    description: 'O aplicativo do Beni. Cada versão sai junto com uma release do ENSPACE.'
  }
}

export function isSubProduct(product: Product): product is SubProduct {
  return product !== DEFAULT_PRODUCT
}

/** "word" → "word-plugin"; vazio → ENSPACE; trecho desconhecido → undefined. */
export function productFromSlug(slug: unknown): Product | undefined {
  if (slug === undefined || slug === null || slug === '') return DEFAULT_PRODUCT
  return PRODUCTS.find(p => PRODUCT_META[p].slug === slug)
}

interface ReleaseRef {
  product: Product
  version: string
}

/** Chave única da release: a versão só se repete entre produtos (Word 1.0.0 e Beni 1.0.0). */
export function releaseKey(release: ReleaseRef): string {
  return `${release.product}:${release.version}`
}

/** "/releases/3.1" para o ENSPACE; "/releases/word/1.1.0" para o Word Plugin. */
export function releasePath(release: ReleaseRef): string {
  const slug = PRODUCT_META[release.product].slug
  return slug ? `/releases/${slug}/${release.version}` : `/releases/${release.version}`
}

/** "Release 3.1" para o ENSPACE; "Word Plugin 1.1.0" para os subprodutos. */
export function releaseTitle(release: ReleaseRef): string {
  return isSubProduct(release.product)
    ? `${PRODUCT_META[release.product].label} ${release.version}`
    : `Release ${release.version}`
}

/**
 * O item de subproduto sai nas 2 releases: fica na release do ENSPACE, marcado
 * com `product`, e também aparece na release do subproduto que sai com ela
 * (`originVersion`). A release do subproduto herda da de origem as datas, o
 * adiamento, o responsável e os marcos que não informar, porque sobe no mesmo
 * dia. Sem a release de origem, fica como está (a validação acusa).
 */
export function linkSubProducts(releases: Release[]): Release[] {
  const origins = new Map(releases.filter(r => !isSubProduct(r.product)).map(r => [r.version, r]))
  return releases.map((release) => {
    if (!isSubProduct(release.product) || !release.originVersion) return release
    const origin = origins.get(release.originVersion)
    if (!origin) return release
    const items = origin.items.filter(item => item.product === release.product)
    const releasedAt = release.releasedAt ?? origin.releasedAt
    return {
      ...release,
      targetDate: release.targetDate ?? origin.targetDate,
      releasedAt,
      postponement: release.postponement ?? origin.postponement,
      owner: release.owner ?? origin.owner,
      milestones: release.milestones.length ? release.milestones : origin.milestones,
      items,
      stage: origin.stage === 'released' || releasedAt
        ? 'released'
        : furthestStage(release.stage, stageFromItems(items))
    }
  })
}

/** Chave de um item numa release, para destacar o que mudou: "word-plugin:1.1.0:3.1-02". */
export function itemKey(release: ReleaseRef, id: string): string {
  return `${releaseKey(release)}:${id}`
}

/** Releases de subproduto que saem com esta release do ENSPACE. */
export function companionReleases<R extends ReleaseRef & { originVersion?: string }>(release: ReleaseRef, releases: R[]): R[] {
  if (isSubProduct(release.product)) return []
  return releases.filter(r => isSubProduct(r.product) && r.originVersion === release.version)
}
