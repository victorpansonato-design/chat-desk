# Chat Desk · Grupo Anchieta

Pacote de descoberta e direção para reformular **a experiência do aluno** no Chat Anchieta. Preparado em 09/11/2026 para implementação no VS Code com Claude Code e Codex.

**Este repositório contém o protótipo React + TypeScript + Vite e o briefing de descoberta.** OBSERVADO: a base inicial reúne 20 prints e o registro de inspeção curta em [templates/descoberta.md](templates/descoberta.md). A paridade continua parcial; prints não provam animações, regras de negócio ou entrega de mensagens.

## Publicação de demonstração

RELATADO: em 10/11/2026, Victor solicitou organizar este repositório no GitHub e fazer deploy na Vercel, autorizando a publicação após a primeira rodada local. O escopo continua sendo um protótipo com dados fictícios e atendimento simulado.

Configuração versionada: Node.js 24 (`.nvmrc`), instalação `npm ci`, build `npm run build`, saída `dist` e framework Vite. A branch de produção é `main`. Veja [docs/deploy.md](docs/deploy.md) para validação, publicação e recuperação.

## Protótipo local (rodada 2 · 10/11/2026)

Protótipo funcional com **dados fictícios e nenhuma integração real**. A rodada 2 refez toda a interface: uma tela só, um único chat que se transforma entre as três interfaces, tema claro por padrão (escuro opcional), fonte Inter. A paridade com o legado continua **parcial**, baseada em prints, textos enviados por CX e numa inspeção curta.

```bash
npm ci               # Node.js 24
npm run dev          # http://127.0.0.1:5173
```

À esquerda: logotipo, troca de interface (**Aluno Online · Aplicativo · Tira-Dúvidas**) e tema. O chat abre direto na conversa; o histórico fica no menu (ou em coluna, quando há espaço).

Como ver cada fluxo, escrevendo no chat:

| Fluxo | O que escrever |
|---|---|
| Etapas da Ana e avaliação 1–5 | "Estou com dúvidas sobre faltas" |
| Redefinição de senha | "Esqueci minha senha" (qualquer código de 6 números; 000000 simula erro) |
| Fila → atendente → PDF, voz, imagem → encerrar → pesquisa 0–10 | "Quero falar com um atendente" e continue respondendo |
| Fora do expediente | abra com `?expediente=fora` e peça um atendente |

Roteiros ocultos (falhas, microfone, expediente, movimento reduzido): **Ctrl + .** Parâmetros: `?view=app|tira-duvidas`, `&theme=dark`, `&panel=0`, `&size=expanded`, `&expediente=fora`, `&mic=denied`, `&motion=reduce`.

Foto da Ana: salve o arquivo em `src/assets/ana.png` e ela substitui o símbolo azul em todo o chat.

| Verificação | Comando |
|---|---|
| Tipos | `npm run typecheck` |
| Lógica (Vitest) | `npm test` |
| Navegador sobre o build de produção (Chrome instalado) | `npm run test:e2e` |
| Tipos, lógica, contraste e auditoria de dependências | `npm run check` |
| Contraste dos dois temas | `npm run contraste` |
| Capturas (com o dev rodando) | `npm run capturas` |

Resultados, lacunas e decisões: [templates/validacao.md](templates/validacao.md), [templates/descoberta.md](templates/descoberta.md), [templates/decisoes.md](templates/decisoes.md) e [docs/integracao.md](docs/integracao.md).

## Comece aqui

1. Abra este repositório no VS Code.
2. Peça ao agente para ler [prompt.md](prompt.md). Ele orienta a descoberta, a reconstrução funcional de referência e o redesign local.
3. Se houver acesso ao sistema atual, faça a inspeção curta de [docs/03-inspecao.md](docs/03-inspecao.md), com login realizado pelo próprio usuário.
4. Sem acesso, o agente deve continuar com dados fictícios e registrar hipóteses. Não deve alegar paridade integral.

**Comando histórico da primeira rodada local (a publicação foi autorizada posteriormente):**

> Leia @prompt.md e execute o projeto por etapas, respeitando @AGENTS.md. Comece pelo inventário e pelas evidências em references/current. Se eu disponibilizar o navegador autenticado, faça a inspeção curta prevista; se não, prossiga com mocks e registre as lacunas. Construa primeiro a referência funcional mínima e depois a proposta visual em um único sistema responsivo para os três canais. Verifique no navegador, rode localmente e encerre com URL, evidências e pendências. Não publique nem conecte serviços reais nesta rodada.

## Mapa do pacote

| Arquivo/pasta | Para que serve |
|---|---|
| [prompt.md](prompt.md) | Instrução principal de implementação, com autonomia e limites |
| [AGENTS.md](AGENTS.md) / [CLAUDE.md](CLAUDE.md) | Regras persistentes para os agentes |
| [docs/01-produto.md](docs/01-produto.md) | Objetivos, públicos, escopo e critérios de sucesso |
| [docs/02-inventario.md](docs/02-inventario.md) | Funções observadas, lacunas e rastreabilidade |
| [docs/03-inspecao.md](docs/03-inspecao.md) | Inspeção autenticada curta e avaliação do Craft Anything |
| [docs/04-experiencia.md](docs/04-experiencia.md) | Brainstorming, arquitetura de informação e fluxos |
| [docs/05-design.md](docs/05-design.md) | Direção de identidade, componentes e responsividade |
| [docs/06-movimento.md](docs/06-movimento.md) | Contrato de movimento e estabilidade |
| [docs/07-acessibilidade-compatibilidade.md](docs/07-acessibilidade-compatibilidade.md) | Acessibilidade, WebView, aparelhos e desempenho |
| [docs/08-arquitetura.md](docs/08-arquitetura.md) | Arquitetura sugerida, dados e contratos futuros |
| [docs/09-plano-validacao.md](docs/09-plano-validacao.md) | Etapas, cenários e critérios de aceite |
| [docs/10-conteudo.md](docs/10-conteudo.md) | Linguagem e exemplos de mensagens |
| [references/README.md](references/README.md) | Curadoria comentada e limites das fontes |
| [references/current/INDEX.md](references/current/INDEX.md) | Galeria dos 20 prints recortados |
| [references/products](references/products) | Capturas reais de ChatGPT e Intercom/Fin |
| [references/videos/README.md](references/videos/README.md) | Vídeo oficial referenciado e plano de captura real |
| [research/fontes.md](research/fontes.md) | Fontes, data, escopo e proveniência |
| [fixtures/scenarios.json](fixtures/scenarios.json) | Cenários fictícios para o futuro protótipo |
| [templates](templates) | Registros de descoberta, decisões e validação (preenchidos na rodada 1) |
| [src](src) | Protótipo: `core` (domínio + adapter mock), `ui` (núcleo único do chat), `stage` (espaço de trabalho, as três interfaces e roteiros ocultos) |
| [tests](tests) | Testes unitários (`unit`) e de navegador (`e2e`) |
| [docs/integracao.md](docs/integracao.md) | Mapa do protótipo para a TI: adapter, renderer, hospedeiros |
| [captures/prototipo](captures/prototipo) | Capturas do protótipo (dados fictícios) |

## Três canais, um produto

- **Aluno Online:** chat flutuante compacto e expandido, com retorno ao launcher.
- **App Grupo Anchieta:** a mesma experiência dentro do espaço disponível no aplicativo; cabeçalho e permissões nativos são responsabilidade da integração.
- **Tira-Dúvidas:** chat embutido na página de ajuda; preservar contexto e ação “Trocar tipo de dúvida”.

O entorno do portal, a área do atendente e a inteligência/backend não entram no redesign desta rodada. O nome de trabalho continua **Chat Anchieta**; “Tira-Dúvidas” é contexto de acesso, não uma nova IA inventada.
