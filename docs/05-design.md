# Direção visual, componentes e responsividade

## Caráter

Profissional, confiável e contemporâneo. Azul como assinatura institucional; conversa e leitura como prioridade. Tecnologia percebida por estados consistentes, clareza e acabamento. Evitar excesso de gradiente, glow, vidro, robôs decorativos, orbes, letras minúsculas e cartões dentro de cartões.

O azul **#0051A0** é semente de trabalho do contexto de CX; **#133A9E** pode aparecer no entorno já existente. Confirmar ambos com a TI/brandbook antes de consolidar. Não afirmar que esta paleta é um manual oficial. Os prints apresentam logo comemorativo de 85 anos e mascote; conservar como evidência, solicitar ativos atuais para o produto. Não redesenhar a marca.

## Tokens iniciais propostos, ajustáveis após medição

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| brand.primary | #0051A0 | #82BBFF | Acentos e texto de marca; validar contraste por uso |
| surface.base | #FFFFFF | #111827 | Área da conversa |
| surface.secondary | #F4F7FB | #1C2535 | Separação suave |
| text.primary | #172333 | #F4F7FB | Corpo |
| text.secondary | #536174 | #BCC8D9 | Apoio legível |
| border.default | #D5DFEC | #425169 | Divisórias; controles podem exigir tom mais forte |
| action.fill | #0051A0 | #0051A0 | Botão principal com texto branco, testar estados |

Não usar azul claro como texto em fundo branco sem medir. Estados de foco e borda de campo ativo precisam contraste suficiente. Tokens de erro/sucesso dependem da mesma validação; nunca comunicar só por cor.

Tipografia: fonte institucional se licenciada e entregue; fallback `system-ui` de boa leitura. Corpo da conversa em torno de 16px, entrelinha 1.5–1.6; metadados 12–13px quando ainda legíveis. Não usar 9px para disclaimer. Escala de espaços 4/8/12/16/24/32; raios contidos de 10–16px são ponto de partida, não especificação pixel-perfect do legado.

## Componentes necessários

| Componente | Estados/regras |
|---|---|
| Launcher | Fechado/aberto; nome acessível; sem pulso permanente |
| Header | IA/espera/humano; histórico; expandir/recolher quando aplicável; fechar sem encerrar |
| Welcome | Saudação simples, ação clara, recente, sugestões onde evidenciadas |
| ConversationList | Vazia/carregando/erro/com itens; assunto, data e status |
| HistoryDrawer | Selecionada, novo chat, fechar, foco e retorno |
| Message | Aluno, IA, humano, sistema; horário; status sem ambiguidade |
| Composer | Vazio/multilinha/pendente/falha/indisponível/readonly |
| Attachment | Seleção, preview, removido, progresso e erro; limites por contrato |
| Audio | Permissão negada/indisponível/gravação/revisão; detalhes ainda propostos |
| HandoverNotice | Pedido/aceito/espera/erro/entrada real do humano |
| Rating | 11 opções 0–10, escolhido/enviando/erro/respondido |
| ClosedConversation | Somente leitura e nova conversa com ID distinto |
| ThemeAdapter | Tema herdado/manual conforme hospedeiro; sem flash claro/escuro |

A identidade de humano deve ter nome e papel, mesmo sem foto. Não usar foto fictícia para sugerir disponibilidade de pessoa real.

## Mesmo núcleo em três hospedeiros

| Hospedeiro | Layout e regras |
|---|---|
| Portal compacto | Painel à direita; largura inicial sugerida 360–400 CSS px limitada ao espaço disponível, altura limitada ao viewport; launcher separado |
| Portal expandido | Mais largura útil, por exemplo 600–720px; expandir não deve remontar a conversa |
| App | Preencher a área concedida pelo app; não duplicar título “Atendimento”, safe areas ou botão voltar nativos |
| Tira-Dúvidas | Chat embutido em área central, com título/contexto externos e ação de trocar contexto preservada |

Abaixo de largura útil suficiente, painel ocupa a área disponível com margens/safe areas adequadas. Nunca forçar 360px dentro de um contêiner de 320px. Preferir `width:100%` com max-width. O breakpoint vem **do contêiner**, não apenas da tela: widget de 380px num monitor grande precisa do mesmo comportamento estreito. Container queries com fallback por largura do adapter quando necessário; não obrigar recursos novos sem fallback.

O modelo da conversa é compartilhado. As diferenças de sugestões, tema, retorno e contexto do Tira-Dúvidas podem ser configuração de canal evidenciada; não impor paridade de capacidades desconhecidas, sobretudo humano no Tira-Dúvidas sem validação.

## Refinamento obrigatório

Mensagens longas, links extensos, nomes grandes, arquivos com nome comprido e escala 0–10 não podem quebrar o layout. A escala pode usar grade responsiva mantendo ordem e alvos amplos, sem scroll horizontal obrigatório. Campo fixado à base do shell com área de conversa flexível `min-height:0`, evitando rolagem dupla.
