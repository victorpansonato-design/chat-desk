# Integração futura — mapa do protótipo para a TI

> Atualizado na rodada 2 (10/11/2026). Onde este texto divergir do código, vale o código.

Protótipo local, só com mock. Os nomes abaixo são do **código do protótipo**, não de endpoints reais. Contratos de serviço continuam PROPOSTOS (docs/08).

## Camadas

| Camada | Onde | Responsabilidade |
|---|---|---|
| Domínio | `src/core/types.ts`, `src/core/reducer.ts` | Conversa, mensagem, atendimento, rascunho; reducer puro e testado (`tests/unit`) |
| Orquestração | `src/core/ChatProvider.tsx` | Liga o reducer ao adapter: envio idempotente, reenvio, transferência, avaliações e foco por hospedeiro |
| Adapter | `src/core/mockAdapter.ts` (implementa `ChatAdapter`) | **Trocar aqui** pelo transporte real |
| Apresentação | `src/ui/ChatApp.tsx` + `src/ui/components/*` + `src/styles/*.css` | Núcleo único: Início, Conversas, Conversa, drawer, composer, renderer |
| Hospedeiros | `src/stage/Stage.tsx` | Um contêiner único que assume a forma de cada canal (painel do portal, tela do app, página de ajuda). O chat nunca é remontado |
| Demonstração | `src/App.tsx`, `src/stage/DemoPalette.tsx` | Espaço de trabalho e roteiros ocultos (Ctrl + .). **Não entra em produção** |

O estado de UI (`ChatUi`: tela, conversa ativa, drawer) e a memória de rolagem pertencem a cada hospedeiro. O estado da conversa e do atendimento pertence ao provider. Fechar, expandir e trocar tema não tocam a conversa.

## Contrato do adapter (`ChatAdapter`)

| Método/evento | Uso no protótipo | A confirmar com a TI |
|---|---|---|
| `loadConversations()` | Lista inicial e retomada; falha leva ao estado "Não foi possível carregar" | Paginação, ordenação, sessão |
| `createConversation(channel, localId)` | Chamado só no **1º envio** (conversa local até lá) | Momento de criação; mapeamento ID local → servidor |
| `sendMessage(convId, clientId, content, replyTo?)` | **Idempotente por `clientId`**; "Tentar novamente" reutiliza o mesmo ID | Idempotência real, erros, limites |
| `requestHandover(convId)` → `accepted` / `unavailable` | Provider marca `requesting`; o serviço emite `queued` e eventos | Horário, times, cancelamento, Tira-Dúvidas |
| `closeConversation(convId)` | "Encerrar atendimento", com confirmação | Quem pode encerrar |
| `submitNps(convId, msgId, value)` | Escala 0–10, retentativa sem duplicar | Gatilho, opcionalidade |
| `rateResponse(convId, msgId, value)` | Avaliação 1–5 por resposta (observada ao vivo) | Semântica, edição |
| `subscribe(listener)` | Eventos `message`, `typing`, `attendance`, `progress` | Websocket/polling, ordem, reconexão, streaming |

Respostas de uma conversa desconhecida são ignoradas. Uma mensagem só vai para a conversa indicada pelo próprio evento, nunca para "a conversa aberta".

## Conteúdo tipado (renderer)

`Content` aceita `text`, `attachment`, `audio`, `nps`, `event` e **`form`**. O renderer nunca interpreta HTML: texto vira parágrafos, listas com "- " e links http(s) seguros.

**Ponto de extensão `form`:** hoje mostra um aviso neutro ("Este tipo de conteúdo ainda não é exibido no protótipo…"). Para integrar, crie um componente por `formType` em `MessageItem.tsx`, com rótulos, erros ligados aos campos e envio pelo adapter. **Não reconstrua o formulário de troca de senha a partir do print**: falta um exemplo autorizado do conteúdo real.

## Contrato dos hospedeiros (`HostConfig`)

| Campo | Portal | App | Tira-Dúvidas |
|---|---|---|---|
| `showHome` | sim | sim | não (abre na conversa, S11) |
| `handover` | sim | sim | **não por padrão** (não validado) |
| `suggestions` | — | — | 3 sugestões observadas |
| `onToggleSize` / `onClose` | sim (expandir some em tela ≤ 520 px) | — (voltar é nativo) | — |
| Tema | herdado | herdado | controle da página (observado) |

O App fornece cabeçalho "Atendimento", voltar e safe areas. O chat **não duplica** esses elementos. No protótipo, o voltar recua a navegação do chat sem perder dados; o comportamento real é decisão do app.

## Marca

`src/ui/brand.ts` recebe `logoUrl` e `mascotUrl` oficiais. Sem eles, o produto mostra a marca em texto e um avatar neutro. Não usar o logo comemorativo de 85 anos sem validação.

## O que não está pronto para produção

Autenticação, sessão, persistência entre dispositivos, upload real, transcrição, streaming, telemetria, internacionalização e testes em WebView/aparelhos reais. O painel de cenários e as fixtures são exclusivos da demonstração.


## Acréscimos da rodada 2

| Item | No protótipo | A confirmar com a TI |
|---|---|---|
| `Attendance` | `ai`, `requesting`, `queued { queue, ahead }`, `scheduled { queue, opensAt }`, `agent`, `closed` | Como chegam a posição na fila e a data de abertura |
| `Typing` | IA: `{ who: 'ai', label }` (etapa exibida com brilho); pessoa: `{ who: 'agent', name }` | Quais etapas reais o serviço expõe; sem isso, usar um rótulo único |
| `cancelHandover` | Cancela o pedido registrado fora do expediente | Regra de cancelamento |
| `submitPasswordReset(convId, msgId, code)` / `resendCode` | **Só o código trafega.** A senha fica no componente e é descartada | Contrato real de troca de senha (onde a senha é enviada, com que proteção), validade, limite de tentativas |
| `conversationRenamed` | Migra conversa, rascunho e não lidas quando o servidor devolve outro ID | Se o servidor troca o ID |
| `Message.actions` | Botões junto de uma mensagem do serviço ("Continuar com a IA · Cancelar pedido") | Formato real |
| `Message.reaction` | Local, não enviado | Significado e persistência |
| Expediente | `src/core/schedule.ts` (seg–sex 08–22h, sáb 09–13h, texto de CX) | A regra é do serviço |

A rota humana não tem botão: o aluno pede por texto e o serviço decide. O campo `handover` do hospedeiro foi removido.
