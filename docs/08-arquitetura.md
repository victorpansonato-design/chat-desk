# Arquitetura sugerida e integração futura

Nenhum backend foi inspecionado. Os contratos abaixo são propostas para evitar acoplamento, não nomes reais de endpoints.

## Separação de responsabilidades

| Camada | Responsabilidade |
|---|---|
| Hospedeiro | Portal flutuante, app ou página de dúvidas; tamanho, retorno, tema e contexto |
| Núcleo | Conversas, seleção, rascunhos, mensagens e estados do atendimento |
| Apresentação | Tokens, componentes, acessibilidade e movimento |
| Adapter de dados | Mocks agora; transporte autorizado posteriormente |

O portal deve poder expandir a mesma instância sem remontá-la. O app não deve copiar JSX da conversa. A página Tira-Dúvidas fornece contexto e sugestões por configuração, preservando restrições de capacidade confirmadas.

## Modelo conceitual

- `Conversation`: ID estável, assunto se disponível, contexto/canal, status de atendimento, última atividade e paginação do histórico.
- `Message`: ID do servidor ou client ID, conversation ID, remetente (`student`, `ai`, `agent`, `system`), conteúdo tipado, data e status de entrega conhecido.
- `Content`: texto/blocos, anexo, áudio, ações ou formulário tipado. Nunca executar HTML arbitrário recebido; sanitizar/renderizar por tipos.
- `Attendance`: IA, pedido de transferência, espera, humano, encerrado; estado persistente vindo do serviço. Avaliação separada, pois pode ocorrer perto do encerramento.
- `UI`: shell, aberta/fechada, compacta/expandida, tela atual, drawer e foco. Independente do atendimento.
- `Draft`: chave por conversation ID ou contexto da nova conversa; anexos temporários e gravação não devem migrar para outra conversa.

Não fazer um único enum com todas as combinações de tema, tela e atendimento. Estado de envio também é independente do estado de resposta/typing. Usar reducer ou máquina de estados apenas na complexidade necessária.

## Interface esperada do adapter, a confirmar

| Capacidade | Entradas/saídas conceituais | Pontos a confirmar com TI |
|---|---|---|
| Listar/abrir | Conversas, mensagens, cursor, status | Ordenação, paginação, acesso e sessão |
| Criar | Contexto → ID | Quando cria e como evitar chat vazio duplicado |
| Enviar | clientMessageId, conversationId, conteúdo → confirmação | Idempotência, erros e read receipts |
| Receber | Eventos por conversa com IDs/ordem | Streaming, polling, websocket e retomada |
| Upload/áudio | Metadados e payload permitido → referência | Tipos, limites, codecs, progresso e descarte |
| Transferência | Solicitação → status oficial | Times, horário, espera, cancelamento e continuidade |
| Avaliação | Escala 0–10 e ID → resultado | Gatilho, opcionalidade e possibilidade de alteração |
| Encerramento | Evento → somente leitura | Quem encerra e o que fazer com envio em trânsito |
| Tema/contexto | Configuração do host | Sincronização e botão voltar |

## Protótipo com cenários reproduzíveis

Usar `fixtures/scenarios.json` como catálogo e completar mensagens fictícias. Manter seletor de cenário em área de demonstração separada da interface do aluno. Ações do mock atualizam estados claramente fictícios; não mostrar “integrado” ou sucesso de upload real.

Simular atrasos e falhas determinísticos, sem sorteio que dificulte revisão. Testar mensagem recebida da conversa A após selecionar B, reenvio com mesma chave, upload cancelado e encerramento durante envio. Não adicionar Supabase, autenticação, OpenAI API ou novos serviços nesta rodada só porque estão disponíveis.

## Entrega posterior para TI

Entregar mapa dos componentes, tokens, adapters e eventos esperados, diferenças por canal e pendências. Integração real só começa com transporte, identidade/sessão, retenção, conteúdo rico e política de mídia confirmados. O protótipo não define regras institucionais nem prazos de atendimento.
