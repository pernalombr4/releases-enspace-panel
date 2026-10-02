import { z } from 'zod'
import {
  ITEM_KINDS,
  ITEM_STATUSES,
  LEVELS,
  RELEASE_HEALTH,
  RELEASE_STAGES,
  canonical
} from './vocabulary'

// Schema único usado tanto para o JSON manual (public/data/releases.json) quanto
// para validar o que vem do Enspace depois do mapeamento. Os tipos do app são
// derivados daqui, então o formato do dado só é definido em um lugar.

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'use o formato AAAA-MM-DD')

const timestamp = z
  .string()
  .refine(v => !Number.isNaN(Date.parse(v)), 'data/hora inválida (use ISO 8601)')

const enumOf = <T extends readonly [string, ...string[]]>(
  vocab: Parameters<typeof canonical>[0],
  values: T
) => z.preprocess(v => canonical(vocab, v), z.enum(values))

const optionalText = z
  .string()
  .trim()
  .transform(v => (v === '' ? undefined : v))
  .optional()

const LinkSchema = z.object({
  label: z.string().min(1),
  url: z.url()
})

const MilestoneSchema = z.object({
  label: z.string().min(1),
  date: isoDate,
  done: z.boolean().optional()
})

export const ReleaseItemSchema = z.object({
  /** Referência visível, ex.: "ENS-1201". */
  id: z.string().min(1),
  title: z.string().min(1),
  /** O que é, em linguagem de negócio. */
  summary: optionalText,
  /** O que muda para o cliente / para as áreas. */
  customerImpact: optionalText,
  kind: enumOf('kind', ITEM_KINDS),
  /** Área do produto (Dashboards, Formulários, Integrações...). */
  module: optionalText,
  status: enumOf('status', ITEM_STATUSES),
  priority: enumOf('level', LEVELS).optional(),
  impact: enumOf('level', LEVELS).optional(),
  /** Cliente ou área que pediu. */
  requestedBy: optionalText,
  /** Squad / pessoa responsável. */
  owner: optionalText,
  /** Quem recebe: "Todos os clientes", "Plano Enterprise", "Beta fechado"... */
  audience: optionalText,
  beta: z.boolean().optional(),
  needsCommunication: z.boolean().optional(),
  needsTraining: z.boolean().optional(),
  /** Versão de destino quando o item foi adiado. */
  movedTo: optionalText,
  /** Observação pública: motivo de bloqueio, próximos passos... */
  note: optionalText,
  links: z.array(LinkSchema).optional(),
  updatedAt: timestamp
})

export const ReleaseSchema = z.object({
  version: z.string().min(1),
  name: optionalText,
  summary: optionalText,
  stage: enumOf('stage', RELEASE_STAGES),
  /** Quando vazio, o painel calcula a partir de prazo e bloqueios. */
  health: enumOf('health', RELEASE_HEALTH).optional(),
  healthNote: optionalText,
  targetDate: isoDate.optional(),
  releasedAt: isoDate.optional(),
  owner: optionalText,
  milestones: z.array(MilestoneSchema).default([]),
  links: z.array(LinkSchema).optional(),
  items: z.array(ReleaseItemSchema).default([])
})

export const ReleasesFileSchema = z.object({
  /** Marca o conteúdo como ilustrativo; o painel mostra um aviso. */
  sample: z.boolean().default(false),
  /** Quando o time de Produto atualizou o arquivo pela última vez. */
  updatedAt: timestamp.optional(),
  releases: z.array(ReleaseSchema)
})

export type Link = z.infer<typeof LinkSchema>
export type Milestone = z.infer<typeof MilestoneSchema>
export type ReleaseItem = z.infer<typeof ReleaseItemSchema>
export type Release = z.infer<typeof ReleaseSchema>
export type ReleasesFile = z.infer<typeof ReleasesFileSchema>

/** Formata erros do zod em linhas legíveis para quem editou o JSON. */
export function describeIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 5)
    .map(issue => `${issue.path.join('.') || '(raiz)'}: ${issue.message}`)
    .join('\n')
}

/** Compara versões "3.10" > "3.2" numericamente. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(/[.-]/).map(n => Number.parseInt(n, 10))
  const pb = b.split(/[.-]/).map(n => Number.parseInt(n, 10))
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0
    const y = pb[i] ?? 0
    if (Number.isNaN(x) || Number.isNaN(y)) return a.localeCompare(b)
    if (x !== y) return x - y
  }
  return 0
}
