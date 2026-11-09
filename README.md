# Chat Desk · Grupo Anchieta

Pacote de descoberta e direção para reformular **a experiência do aluno** no Chat Anchieta. Preparado em 09/11/2026 para implementação no VS Code com Claude Code e Codex.

**Este repositório começa como briefing executável. Não contém o novo aplicativo.** Não houve acesso autenticado ao chat nem reprodução ao vivo dos seus fluxos. As evidências atuais são os 20 prints fornecidos pelo responsável de CX. Prints não provam animações, regras de negócio ou entrega de mensagens.

## Comece aqui

1. Abra este repositório no VS Code.
2. Peça ao agente para ler [prompt.md](prompt.md). Ele orienta a descoberta, a reconstrução funcional de referência e o redesign local.
3. Se houver acesso ao sistema atual, faça a inspeção curta de [docs/03-inspecao.md](docs/03-inspecao.md), com login realizado pelo próprio usuário.
4. Sem acesso, o agente deve continuar com dados fictícios e registrar hipóteses. Não deve alegar paridade integral.

**Comando para colar no Claude Code ou no Codex:**

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
| [templates](templates) | Registros de descoberta, decisões e validação |

## Três canais, um produto

- **Aluno Online:** chat flutuante compacto e expandido, com retorno ao launcher.
- **App Grupo Anchieta:** a mesma experiência dentro do espaço disponível no aplicativo; cabeçalho e permissões nativos são responsabilidade da integração.
- **Tira-Dúvidas:** chat embutido na página de ajuda; preservar contexto e ação “Trocar tipo de dúvida”.

O entorno do portal, a área do atendente e a inteligência/backend não entram no redesign desta rodada. O nome de trabalho continua **Chat Anchieta**; “Tira-Dúvidas” é contexto de acesso, não uma nova IA inventada.
