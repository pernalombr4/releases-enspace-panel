import { z } from 'zod'
import { furthestStage, stageFromItems } from './progress'
import {
  ITEM_KINDS,
  ITEM_ORIGINS,
  ITEM_STATUSES,
  LEVELS,
  RELEASE_HEALTH,
  RELEASE_STAGES,
  RELEASE_TYPES,
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

/**
 * Chamado (ou solicitação) atendido pelo item. Aceita só o código ("REQ…") ou
 * o chamado completo vindo do Enspace: referência original, título e cliente.
 */
const TicketSchema = z.union([
  z.string().trim().min(1).transform((ref): { ref: string, title?: string, client?: string } => ({ ref })),
  z.object({
    /** Referência original, ex.: "CHAE51BA7F0F9E7468CADFB1DD61DCD6". */
    ref: z.string().trim().min(1),
    title: optionalText,
    /** Cliente relacionado ao chamado. */
    client: optionalText
  })
])

export const ReleaseItemSchema = z.object({
  /** Referência visível, ex.: "ENS-1201". */
  id: z.string().min(1),
  title: z.string().min(1),
  /** O que é, em linguagem de negócio. */
  summary: optionalText,
  /** O que muda para o cliente / para as áreas. */
  customerImpact: optionalText,
  /** Correção, melhoria ou inovação. Vazio = "sem classificação". */
  kind: enumOf('kind', ITEM_KINDS).optional(),
  /** Área do produto (Dashboards, Formulários, Integrações...). */
  module: optionalText,
  status: enumOf('status', ITEM_STATUSES),
  priority: enumOf('level', LEVELS).optional(),
  impact: enumOf('level', LEVELS).optional(),
  /** Cliente ou área que pediu. */
  requestedBy: optionalText,
  /** Pedido de cliente ou interno. Só a origem: o nome do cliente não vai para o painel. */
  origin: enumOf('origin', ITEM_ORIGINS).optional(),
  /** Quantos clientes pediram, sem nomes. */
  clientCount: z.number().int().min(0).optional(),
  /** Pode não entrar nesta release; o motivo vai em `note`. */
  atRisk: z.boolean().optional(),
  /** Chamados atendidos pelo item, para CS e Suporte saberem o que foi resolvido e para quem. */
  tickets: z.array(TicketSchema).optional(),
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

/**
 * Adiamento oficial da release, comunicado publicamente no painel.
 * A nova data de subida é a própria `targetDate` da release.
 */
export const PostponementSchema = z.object({
  /** true = release adiada; false = data mantida. */
  postponed: z.boolean(),
  /** Data de subida antes do adiamento (AAAA-MM-DD). */
  originalDate: isoDate.optional(),
  /** Motivo, em linguagem pública. */
  reason: optionalText,
  /** Quando o adiamento foi comunicado. */
  announcedAt: timestamp.optional()
})

export const ReleaseSchema = z.object({
  version: z.string().min(1),
  /** major, minor ou patch. Quando vazio, é deduzido da versão (3.0 → major, 3.1 → minor, 3.1.2 → patch). */
  type: enumOf('releaseType', RELEASE_TYPES).optional(),
  name: optionalText,
  summary: optionalText,
  /**
   * Fase informada pelo time. O painel mostra a mais avançada entre esta e a que
   * os itens indicam (ver stageFromItems). Vazio: "released" se houver releasedAt,
   * senão "planning".
   */
  stage: enumOf('stage', RELEASE_STAGES).optional(),
  /** Quando vazio, o painel calcula a partir de prazo e bloqueios. */
  health: enumOf('health', RELEASE_HEALTH).optional(),
  healthNote: optionalText,
  targetDate: isoDate.optional(),
  releasedAt: isoDate.optional(),
  /** Adiada ou não. Sem este bloco, o painel não afirma nada sobre adiamento. */
  postponement: PostponementSchema.optional(),
  owner: optionalText,
  milestones: z.array(MilestoneSchema).default([]),
  links: z.array(LinkSchema).optional(),
  items: z.array(ReleaseItemSchema).default([])
}).transform(release => ({
  ...release,
  stage: furthestStage(
    release.stage ?? (release.releasedAt ? 'released' : 'planning'),
    stageFromItems(release.items)
  )
}))

export const ReleasesFileSchema = z.object({
  /** Marca o conteúdo como ilustrativo; o painel mostra um aviso. */
  sample: z.boolean().default(false),
  /** Quando o time de Produto atualizou o arquivo pela última vez. */
  updatedAt: timestamp.optional(),
  releases: z.array(ReleaseSchema)
})

export type Link = z.infer<typeof LinkSchema>
export type Ticket = z.infer<typeof TicketSchema>
export type Milestone = z.infer<typeof MilestoneSchema>
export type Postponement = z.infer<typeof PostponementSchema>
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
