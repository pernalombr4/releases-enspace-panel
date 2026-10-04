# Painel de releases do ENSPACE

**A spec do agente `painel-releases` fica no repositório privado `releases-enspace`, em
`AGENTE_PAINEL_RELEASES.md`. Leia inteira antes de qualquer ação; em conflito, ela vence.** Este repositório é público:
aqui fica só a página, e nada de dado de release, nome de cliente ou chave entra nele.

O essencial, para a sessão que só tiver este repositório aberto:

## Interface: primeiro o SDK do ENSPACE, depois o Nuxt UI

1. **SDK do ENSPACE antes de tudo** (`@be-enlighten/enspace-sdk-ui`, só os componentes base):
   - `EnApp` na raiz (já em `app/app.vue`; não acrescente outro `UApp`);
   - tabela é `EnTable`, com slots `#cell-{key}` e `columnSizing` (layout fixo: coluna sem largura fica com 150px);
   - o slot entrega a linha sem tipo: acesso a mapa tipado passa por função no script.
2. **Exceção registrada:** o quadro de itens é composto com Nuxt UI. O `EnKanbanBoard` deixa todo cartão arrastável e
   não aceita conteúdo próprio no cartão, e o painel só mostra status.
3. **Depois, só Nuxt UI.** Nenhuma outra biblioteca de componente. Dúvida de componente: skill `nuxt-ui` e MCP `nuxt-ui`
   (`.mcp.json`) antes de qualquer CSS próprio.
4. **Ícones vão no bundle** (`icon.provider: 'none'`): ícone novo, inclusive de componente do SDK, entra na lista
   `nuxtUiIcons` do `nuxt.config.ts`.
5. **Cores do ENSPACE** (`app/app.config.ts` e a paleta `space` em `main.css`), iguais às do portal de documentação.
6. **O módulo de dados do SDK fica fora do navegador.** A leitura do ENSPACE é do robô `scripts/sync-enspace.ts`, pelo
   `@be-enlighten/enspace-sdk-core`, no GitHub Actions do repositório privado, 1 vez por dia no máximo.

## Nomes e commits

- Nome técnico em inglês; português só no que vive no ENSPACE (slug, valor de opção) e no texto que a pessoa lê.
- Commits em português, no estilo do histórico ("Área: o que mudou"). **Nunca** adicione `Co-Authored-By` (nem outra
  linha que coloque o Claude como coautor) em commit ou PR.

## Texto de tela (regras de escrita da redatora)

- Comece pelo objetivo; voz ativa; verbo específico, presente do indicativo.
- Sem dupla negativa, sem "com sucesso", "vale notar", "basicamente" e afins.
- Números em dígitos. Uma ideia por frase. Status nunca só por cor: ícone mais palavra.

## Antes de enviar

```bash
pnpm lint && pnpm typecheck && pnpm test
```

pnpm 10 (`packageManager`); o pnpm 12 não roda no Windows da redatora. Mudança visual: `pnpm demo:data` e `pnpm dev`
(senha de demonstração `demo`).
