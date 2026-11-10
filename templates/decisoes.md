# Registro de decisões

| Data | Decisão | Evidência/alternativas | Motivo | Impacto nos três canais | Revisar quando |
|---|---|---|---|---|---|
| 09/11/2026 | Um núcleo e três hospedeiros | Briefing do CX | Consistência e manutenção | Layout/configuração adaptáveis | Contratos dos hosts confirmados |
| 09/11/2026 | Craft Anything opcional | README e docs do projeto | Alpha e cobertura ainda não ensaiada | Sem dependência no runtime | Se inspeção manual não bastar |
| 09/11/2026 | Sem imagens de conceito geradas | Pedido explícito | Liberdade visual para Claude | Só evidências reais | Mudança explícita do briefing |
| 09/11/2026 | **Stack:** React 18 + TypeScript + Vite; Vitest e Playwright; nenhuma biblioteca de UI ou de animação | Repositório vazio; prompt §3 | Leve (~70 KB gzip de JS), sem dependência pesada; CSS resolve o movimento | Mesmo bundle nos três | TI definir a stack de produção |
| 09/11/2026 | **Direção A · Conversa em primeiro plano** (escolhida) × B · Central de atendimento | docs/04 | A reduz atrito e mantém a conversa como núcleo; B exigiria categorias de serviço não evidenciadas (inventaria um catálogo) | Início enxuto com "Iniciar conversa" + retomada; conversa ocupa a área útil | Teste com estudantes |
| 09/11/2026 | **Rota humana sempre rotulada** ("Falar com atendente" / "Atendente") no cabeçalho, no modo IA; pedido por texto continua funcionando | S06 (pedido por texto) + Intercom | O aluno não precisa conhecer uma "frase secreta" | Portal e App; **Tira-Dúvidas desligado por padrão** (não validado, docs/05), com chave no painel | Confirmação de rota humana no Tira-Dúvidas |
| 09/11/2026 | **"Ana" é a IA**; o atendente fictício passa a ser **Marina** (as fixtures diziam "Ana") | Inspeção ao vivo: "Eu sou a Ana, assistente da UniAnchieta" | Evitar confundir pessoa com IA | Autor "Ana · Assistente de IA" × "Marina · Equipe de atendimento", com balão e avatar distintos | Nome real via evento do serviço |
| 09/11/2026 | **Uma lista de conversas** (aba "Conversas" + drawer + barra lateral) sobre a mesma fonte; aba renomeada de "Mensagens" para "Conversas" | F03, F05, F07 | Remove a duplicidade visual sem remover funções; drawer ganhou "Início" (antes não havia caminho da conversa para o Início) | Barra lateral fixa quando o **contêiner** tem ≥ 760 px (Tira-Dúvidas largo) | Teste de navegação |
| 09/11/2026 | **Título = assunto do backend ou 1º texto do aluno** (não a última mensagem) | S03/S07: títulos repetidos com a pergunta de avaliação | Reconhecer atendimentos antigos | Igual nos três | Backend fornecer assunto |
| 09/11/2026 | **Nova conversa reutiliza a conversa local vazia**; o ID só é criado no servidor no 1º envio | T04 | Evitar entradas vazias repetidas | Igual | Regra de criação pela TI |
| 09/11/2026 | **Entrega:** só "Enviando…" e "Enviada" (✓); sem ✓✓ | F11; prompt §6 | Não inventar confirmação de leitura | Igual | Contrato de leitura |
| 09/11/2026 | **Espera sem tempo ou posição:** "Aguardando alguém da equipe assumir. Não é preciso repetir sua dúvida" | prompt §6 | Expectativa verdadeira | Igual | Dados reais de fila |
| 09/11/2026 | **Encerrar atendimento** só com atendente e com confirmação inline | DOM (F24); condição não vista | Ação irreversível; "Fechar" não encerra | Igual | Regra da TI |
| 09/11/2026 | **Enter envia, Shift+Enter quebra linha** em ponteiro fino; em toque, Enter quebra linha e o envio é pelo botão; IME nunca envia durante a composição | prompt §6 | Sem envio acidental; regra explicada no campo e no texto acessível | Igual | Teste em aparelho real |
| 09/11/2026 | **Áudio = mensagem gravada** (gravar → revisar → enviar), não conversa por voz; permissão é a nativa | S13 + DOM | Preservar o que existe sem inventar voz em tempo real | Igual; "sem suporte" oferece texto e anexo | Contrato de áudio |
| 09/11/2026 | **Formulário:** só ponto de extensão (`content.kind = 'form'`) com aviso neutro | F18; prompt §5 | Não inventar campos de troca de senha | Igual | Exemplo autorizado de formulário |
| 09/11/2026 | **Marca:** sem logo nem mascote no protótipo; avatar neutro (ícone de balão) e marca em texto; slot em `src/ui/brand.ts` | Ativos atuais não entregues; logo de 85 anos não validado | Não redesenhar a marca nem reutilizar ativo sem validação | Igual | Entrega dos ativos oficiais |
| 09/11/2026 | **Tokens** a partir de #0051A0, com contraste medido (15 de 16 pares ≥ AA no tema claro, 16/16 no escuro; o único abaixo foi corrigido) | docs/05 | Contraste forte nos dois temas | Igual | Brandbook |
| 09/11/2026 | **Respostas fictícias marcadas** com "Exemplo fictício" | docs/10 | Não confundir o mock com a base oficial | Igual | Integração |
| 09/11/2026 | **Painel de cenários separado** da interface do aluno (palco escuro neutro) | docs/08 | Demonstrar estados sem simular uma pessoa real online | — | — |

Registre alterações de arquitetura de informação e funções como proposta, sem reescrever evidência histórica.

## Publicação autorizada · 10/11/2026

- RELATADO: Victor pediu a organização do GitHub e o deploy na Vercel, substituindo a restrição de publicação da primeira rodada.
- PROPOSTO: publicar o mesmo protótipo estático em `main`, com Node.js 24, configuração Vercel e CI versionados. Permanecem dados fictícios e adapter mock.
- PROPOSTO: aviso visível de atendimento simulado nos três canais e exclusão de indexação para distinguir a demonstração do atendimento oficial.
- OBSERVADO: vídeo local em `src/ref_video/` não versionado. Foi preservado no disco e incluído no ignore; não deve ser enviado ao GitHub nem ao deploy.


## Rodada 2 — 10/11/2026 (redesign completo, a pedido de CX)

Substitui as decisões visuais da rodada 1. O domínio (envio idempotente, rascunho por conversa, encerrada somente leitura) foi mantido e corrigido.

| Decisão | Motivo | Estado |
|---|---|---|
| Uma tela só; **um único chat** que se transforma entre Aluno Online, Aplicativo e Tira-Dúvidas (posição, tamanho, cantos e moldura interpolados) | Pedido de CX: troca contínua, sem teleporte. Também prova que é o mesmo núcleo | PROPOSTO |
| Removidos do espaço de trabalho: referência do legado, painel de cenários e tema no cabeçalho. Roteiros ficam ocultos (Ctrl + .) | Pedido de CX: manter só a interface do chat | — |
| **Tema claro por padrão**, escuro opcional (botão na lateral). Topo azul Anchieta que se desfaz no branco | Pedido de CX; coincide com a recomendação de legibilidade para público amplo (NN/g) | PROPOSTO |
| Cores sóbrias, sem brilho neon: azul #0051A0 e marinho #01184A (CSS público da instituição); ouro #F1BC09 só para a equipe humana | Pedido de CX; identidade existente | VERIFICADO no CSS público |
| Fonte **Inter** (a mesma dos sites e do Aluno Online) | Pedido de CX por fonte séria no estilo da referência enviada; é a fonte da própria marca | VERIFICADO |
| O chat abre **direto na conversa**. A conversa vazia é a tela inicial: logotipo, saudação, 4 dúvidas rápidas, conversa recente. Histórico no menu | Pedido de CX: a tela Início/Mensagens do app não ajuda | PROPOSTO |
| **Sem atalho para o suporte**: nem frase na tela inicial, nem botão "Falar com atendente". O aluno pede uma pessoa escrevendo | Decisão de CX: não incentivar a ida ao suporte logo de início | DECIDIDO por CX |
| Ana × Suporte ao Aluno: Ana em azul, com selo "IA" e sem balão; equipe em ouro, com inicial, selo "Suporte ao Aluno" e balão creme. O cabeçalho muda de identidade e o campo passa a dizer "Escreva para Marina" | Critério central: nunca confundir IA com pessoa | PROPOSTO |
| Mensagem de transferência mantida literalmente: "Sua conversa foi transferida. Agora você está falando com {nome}, da nossa equipe de atendimento." | Texto real informado por CX | RELATADO |
| Fila com posição ("há 2 pessoas na sua frente" → "você é a próxima pessoa") no texto do serviço e na faixa acima do campo | Texto real informado por CX. Revoga a decisão da rodada 1 de não mostrar posição | RELATADO |
| Fora do expediente: texto literal de CX, com data calculada, ações "Continuar com a IA · Cancelar pedido"; a Ana continua respondendo | Texto real informado por CX | RELATADO |
| **Formulário de redefinição de senha implementado** (código, nova senha, confirmação, Mostrar, 8–29 caracteres, Reenviar código) | Pedido explícito de CX com print autorizado. Revoga a restrição da rodada 1. Só o código vai ao adapter; a senha nunca sai do componente | RELATADO (print) |
| Etapas da Ana com brilho no texto: "Lendo sua mensagem" → etapa do assunto ("Consultando sua frequência", "Consultando a Secretaria", "Consultando o Financeiro", "Verificando seu cadastro"…) → "Escrevendo a resposta" | Pedido de CX (referência em vídeo). No real, cada rótulo precisa corresponder a uma etapa verdadeira do serviço | PROPOSTO |
| A resposta entra bloco a bloco (fade), não letra por letra | AGENTS.md proíbe digitação letra por letra | PROPOSTO |
| Avaliação 1–5 só na resposta mais recente (ou onde já foi avaliada) | Reduz ruído; o legado mostra em todas | PROPOSTO — validar com CX |
| Reação "curtir" e responder citando, ao lado da mensagem | Aparecem nos prints do legado. A reação é local: significado e envio dependem da TI | HIPÓTESE |
| Atendente fictícia continua **Marina** | Dados fictícios (AGENTS.md); "Larissa" veio de um exemplo real | — |
| Foto da Ana: ponto de entrada em `src/assets/ana.png` | A imagem enviada no chat não chegou como arquivo ao repositório | PENDENTE |
