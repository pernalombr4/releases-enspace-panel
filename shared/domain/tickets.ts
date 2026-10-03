import type { Release, ReleaseItem, Ticket } from './model'

// Chamados atendidos por uma release, para CS e Suporte: só os que têm cliente
// relacionado, vindos das demandas que estão na release (adiadas ficam de fora).

export interface ClientTicket {
  ref: string
  title?: string
  client: string
  /** Demandas da release que atendem o chamado (normalmente uma). */
  items: ReleaseItem[]
}

export function hasClient(ticket: Ticket): ticket is Ticket & { client: string } {
  return Boolean(ticket.client)
}

export function releaseTickets(release: Release): ClientTicket[] {
  const byRef = new Map<string, ClientTicket>()
  for (const item of release.items) {
    if (item.status === 'postponed') continue
    for (const ticket of item.tickets ?? []) {
      if (!hasClient(ticket)) continue
      const found = byRef.get(ticket.ref)
      if (found) {
        if (!found.items.includes(item)) found.items.push(item)
        found.title ??= ticket.title
      } else {
        byRef.set(ticket.ref, { ref: ticket.ref, title: ticket.title, client: ticket.client, items: [item] })
      }
    }
  }
  return [...byRef.values()].sort((a, b) => a.client.localeCompare(b.client, 'pt-BR') || a.ref.localeCompare(b.ref))
}

/** Texto pesquisável dos chamados do item (referência, título e cliente). */
export function ticketSearchText(item: ReleaseItem): string {
  return (item.tickets ?? []).flatMap(t => [t.ref, t.title, t.client]).filter(Boolean).join(' ')
}
