# ENSPACE Releases: painel

Painel com o status em tempo real dos itens cotados para as próximas releases do ENSPACE, mantido pelo time de Produto para as demais áreas da empresa.

[![Nuxt UI](https://img.shields.io/badge/Made%20with-Nuxt%20UI-00DC82?logo=nuxt&labelColor=020420)](https://ui.nuxt.com)

- **Endereço:** <https://pernalombr4.github.io/releases-enspace-panel/>
- **Stack:** Nuxt 4 + [Nuxt UI](https://ui.nuxt.com), a partir do [template Dashboard](https://github.com/nuxt-ui-templates/dashboard), publicado como site estático no GitHub Pages.

## Este repositório não tem dados

Aqui fica **só a página**. Os itens das releases ficam no repositório privado `releases-enspace`. A cada alteração, o repositório privado:

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

```bash
pnpm install
pnpm demo:data   # gera public/data/releases.enc.json com dados fictícios (senha: demo)
pnpm dev         # http://localhost:3000
```

Antes de enviar código:

```bash
pnpm lint && pnpm typecheck && pnpm test
```

### Estrutura

```
app/                 páginas, layout e componentes (só componentes do Nuxt UI)
app/composables/     usePanelKey (senha → chave), useReleases (busca, decifra e atualiza)
shared/domain/       modelo e validação dos dados, status, cálculos, criptografia
shared/enspace/      mapeamento da API do Enspace (para a futura integração)
scripts/             encrypt-data.ts, usado pelo repositório privado
fixtures/demo.json   dados fictícios para desenvolvimento
```

### MCP do Nuxt e do Nuxt UI

O `.mcp.json` registra os servidores MCP oficiais (`https://ui.nuxt.com/mcp` e `https://nuxt.com/mcp`). Com eles, assistentes como o Claude Code consultam a documentação atual dos componentes ao trabalhar neste projeto.

## Endpoint de adiamento do Enspace

O "adiada ou não" pode vir de duas fontes:

1. **Arquivo de dados** (padrão): o bloco `postponement` de cada release, mantido no repositório privado.
2. **Endpoint do Enspace** (quando a integração estiver pronta): defina a variável do repositório **Settings → Secrets and variables → Actions → Variables → `POSTPONEMENT_URL`** e publique de novo. O painel passa a consultar esse endereço a cada atualização, e o que vier dele prevalece sobre o arquivo.

O leitor (`shared/enspace/postponement.ts`) já aceita as variações mais prováveis de formato: lista direta ou em envelope (`data`, `items`...), registro do Enspace (`{ data: {...} }`), campos em inglês ou português (`postponed`/`adiada`, `original_target_date`/`data_original`, `new_target_date`/`nova_data`, `reason`/`motivo`) e datas `AAAA-MM-DD` ou `DD/MM/AAAA`. Se o formato real for diferente, o ajuste fica em `FIELD_ALIASES` nesse arquivo. Como o navegador chama esse endereço diretamente, ele precisa ser público (sem chave de API) e aceitar CORS.

## Publicação

O workflow `.github/workflows/deploy.yml` roda lint, typecheck e testes, gera o site com `nuxt generate` e publica no GitHub Pages. Para funcionar, em **Settings → Pages → Build and deployment → Source**, escolha **GitHub Actions**.

## Licença

Baseado no template Dashboard do Nuxt UI (MIT); veja `LICENSE`.
