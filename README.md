# ENSPACE Releases: painel

Painel com o status em tempo real dos itens cotados para as próximas releases do ENSPACE, mantido pelo time de Produto para as demais áreas da empresa.

[![Nuxt UI](https://img.shields.io/badge/Made%20with-Nuxt%20UI-00DC82?logo=nuxt&labelColor=020420)](https://ui.nuxt.com)

- **Endereço:** <https://pernalombr4.github.io/releases-enspace-panel/>
- **Stack:** Nuxt 4 + [Nuxt UI](https://ui.nuxt.com), a partir do [template Dashboard](https://github.com/nuxt-ui-templates/dashboard), publicado como site estático no GitHub Pages.

## Este repositório não tem dados

Aqui fica **só a página**. Os itens das releases ficam no repositório privado `releases-enspace`, editados à mão ou trazidos do Enspace pela sincronização (`scripts/sync-enspace.ts`, veja abaixo). A cada alteração, o repositório privado:

1. valida o arquivo de dados;
2. criptografa o arquivo com a senha do painel (`scripts/encrypt-data.ts`);
3. envia o resultado para `data/releases.enc.json` aqui, o que dispara a publicação.

O navegador baixa esse arquivo e só consegue abri-lo com a senha. A senha nunca é enviada nem guardada: o painel guarda apenas a chave derivada dela, no navegador de quem entrou ("Lembrar neste dispositivo"), e o botão **Sair** apaga essa chave.

**Criptografia:** PBKDF2-SHA256 (600 mil iterações) e AES-256-GCM, só com Web Crypto (`shared/domain/crypto.ts`). Como o arquivo é público, a proteção depende da força da senha. Por isso o script exige no mínimo 12 caracteres; uma frase com 4 ou 5 palavras é o ideal.

Enquanto `data/releases.enc.json` não existir, a publicação usa os dados fictícios de `fixtures/demo.json`, com a senha `demo`.

## O que o painel mostra

- **Visão geral da release:** fase, saúde (no prazo, em atenção ou atrasada), data de subida com contagem regressiva, próximo marco, % de itens prontos, distribuição por status, linha do tempo, pontos de atenção para as áreas e atualizações recentes.
- **Itens:** quadro por status ou lista, com busca e filtros (tudo fica na URL, para compartilhar a visão), e detalhes do item numa gaveta lateral.
- **Calendário:** todas as releases (passadas e futuras) num calendário com destaque por tipo (**major** sólido, **minor** suave, **patch** contornado), filtro por tipo, lista do período e histórico completo em tabela. Releases antigas podem ter só versão e data; nesse caso aparecem como "sem detalhes registrados".
- **Busca global (Ctrl/⌘ + K)** por release ou item.
- **Adiamento público:** cada release mostra se foi **adiada** ou teve a **data mantida**. Quando adiada, aparecem a data original, a nova data e o motivo.
- **Como ler o painel:** glossário dos status.
- **Atualização automática** a cada 60 s, pausada com a aba em segundo plano. Itens que mudaram ficam destacados por alguns segundos.

## Desenvolvimento

Use o **pnpm 10** (o `packageManager` fixa a versão 10.28.0). O pnpm 12 não roda no Windows da dona do repositório.

```bash
pnpm install
pnpm demo:data   # gera public/data/releases.enc.json com dados fictícios (senha: demo)
pnpm dev         # http://localhost:3000
```

Antes de enviar código:

```bash
pnpm lint && pnpm typecheck && pnpm test
```

O `pnpm typecheck` confere o app e o `shared/` (pelo Nuxt) e os scripts (por `scripts/tsconfig.json`).

### Estrutura

```
app/                   páginas, layout e componentes (só componentes do Nuxt UI)
app/composables/       usePanelKey (senha → chave), useReleases (busca, decifra e atualiza)
shared/domain/         modelo e validação dos dados, status, cálculos, criptografia
shared/enspace/        leitura do Enspace pelo SDK e conversão para o modelo do painel
scripts/               encrypt-data.ts e sync-enspace.ts, usados pelo repositório privado
fixtures/demo.json     dados fictícios para desenvolvimento
fixtures/enspace.json  workspace fictício do Enspace, para testar a sincronização sem a API
```

Em `shared/enspace/`:

| Arquivo | O que faz |
|---|---|
| `client.ts` | Cliente do SDK a partir das variáveis de ambiente; `listAll` pagina e confere a contagem. |
| `mapping.ts` | Releases & Deploys e Demandas → releases e itens do painel. |
| `requests.ts` | Chamados com cliente relacionado, ligados às demandas. |
| `options.ts` | Rótulo de cada opção de seleção, pelas definições de campo. |
| `values.ts` | Leitores de valor: datas (`Date` ou texto), relações, números. |
| `sync.ts` | Junta com o arquivo manual, valida e monta o relatório. |
| `postponement.ts` | Endpoint de adiamento, lido pelo navegador (veja abaixo). |

### Nomes

Código, workflows, secrets e mensagens de commit dos bots ficam em inglês (regra de 03/10/2026). O que vem do Enspace fica como está lá, em português: slugs de categoria e de campo (`releases_deploys`, `release_rel`) e valores de opção (`montagem_escopo`). Texto para pessoas (telas, README, documentação) fica em português.

### MCP do Nuxt e do Nuxt UI

O `.mcp.json` registra os servidores MCP oficiais (`https://ui.nuxt.com/mcp` e `https://nuxt.com/mcp`). Com eles, assistentes como o Claude Code consultam a documentação atual dos componentes ao trabalhar neste projeto.

## Sincronização com o Enspace

`pnpm sync` (`scripts/sync-enspace.ts`) gera o arquivo de dados a partir do workspace `produtos` do Enspace. O workflow **Sync from ENSPACE**, do repositório privado, roda o comando. As regras de conversão, campo a campo, estão no `docs/integracao-enspace.md` de lá.

Todo acesso ao Enspace passa pelo SDK oficial (`@be-enlighten/enspace-sdk-core` e `@be-enlighten/enspace-sdk-schemas`): autenticação por token, erros tipados e nova tentativa automática em erro 5xx, 429 e falha de rede. A sincronização só lê o Enspace, nunca grava lá. Os passos:

1. Lê as categorias Releases & Deploys, Demandas e Chamados, de 100 em 100, e a contagem de cada uma. Se a contagem não bater com o que veio, para com erro: a API corta listas sem avisar.
2. Lê as definições de campo, para trocar o valor de cada seleção pelo rótulo. Valor fora das opções, ou sem regra no painel, vira aviso.
3. Junta com o arquivo manual (`--base`):
   - versão nos dois: vale a do Enspace;
   - versão só no arquivo manual: continua;
   - versão cancelada no Enspace: sai.
4. Valida o resultado como o `encrypt-data.ts` e grava em `--out`. Se as releases não mudaram, o arquivo fica como está.

| Variável | Padrão |
|---|---|
| `ENSPACE_API_KEY` | obrigatória: token só de leitura |
| `ENSPACE_API_URL` | `https://api.leif.enspace.io` |
| `ENSPACE_WORKSPACE` | `produtos` |

```bash
# Comparação, sem gravar: por release, origem, itens, fase, datas e o que entra e sai
ENSPACE_API_KEY=... pnpm sync --base ../releases-enspace/data/releases.json --dry-run

# Grava o arquivo
ENSPACE_API_KEY=... pnpm sync --base ../releases-enspace/data/releases.json --out ../releases-enspace/data/releases.json

# Sem a API: um servidor local imita o Enspace com o workspace fictício
pnpm sync --fixture fixtures/enspace.json --base ../releases-enspace/data/releases.json --dry-run
```

O comando sai com código 1, sem gravar nada, quando a leitura falha, a lista vem incompleta ou o resultado não passa na validação. Os avisos aparecem no fim.

## Endpoint de adiamento do Enspace

O "adiada ou não" pode vir de 2 fontes:

1. **Arquivo de dados** (padrão): o bloco `postponement` de cada release, mantido no repositório privado.
2. **Endpoint do Enspace** (quando a integração estiver pronta): defina a variável do repositório **Settings → Secrets and variables → Actions → Variables → `POSTPONEMENT_URL`** e publique de novo. O painel passa a consultar esse endereço a cada atualização, e o que vier dele prevalece sobre o arquivo.

O leitor (`shared/enspace/postponement.ts`) já aceita as variações mais prováveis de formato: lista direta ou em envelope (`data`, `items`...), registro do Enspace (`{ data: {...} }`), campos em inglês ou português (`postponed`/`adiada`, `original_target_date`/`data_original`, `new_target_date`/`nova_data`, `reason`/`motivo`) e datas `AAAA-MM-DD` ou `DD/MM/AAAA`. Se o formato real for diferente, o ajuste fica em `FIELD_ALIASES` nesse arquivo. Como o navegador chama esse endereço diretamente, ele precisa ser público (sem chave de API) e aceitar CORS.

## Publicação

O workflow **Deploy panel** (`.github/workflows/deploy.yml`) roda lint, typecheck e testes, gera o site com `nuxt generate` e publica no GitHub Pages. Para funcionar, em **Settings → Pages → Build and deployment → Source**, escolha **GitHub Actions**.

## Licença

Baseado no template Dashboard do Nuxt UI (MIT); veja `LICENSE`.
