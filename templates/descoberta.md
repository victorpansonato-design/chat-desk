# Registro de descoberta — rodada 1

- **Data / responsável / branch:** 09/11/2026 · Claude Code (sessão de Victor) · `main` (sem commit nesta rodada)
- **Ambiente e canal:** Aluno Online, produção (`app.anchieta.br/aluno-online/inicio`), widget flutuante
- **Viewport CSS / escala / tema / OS / navegador:** 1384×749 CSS px · DPR 1 · tema claro · Windows 11 · Chrome (perfil temporário isolado, fora do repositório, encerrado após a sessão)
- **Acesso autenticado:** realizado pelo usuário. A janela já estava autenticada; nenhuma senha, OTP ou cookie foi pedido ou salvo
- **Perguntas neutras enviadas (máximo 2):** "Olá" e "Estou com dúvidas sobre faltas", escolhidas e autorizadas explicitamente por Victor
- **Operações com efeito real:** abrir o launcher, criar uma nova conversa e enviar as 2 mensagens (autorizado). **Não** houve transferência para humano, avaliação, anexo, áudio, encerramento nem cliques no portal fora do chat. A conversa criada **ficou aberta** na conta do aluno
- **Paridade:** **parcial, baseada em prints e numa inspeção curta.** Não houve clonagem de animações nem do funcionamento integral

## Observações da sessão ao vivo (sanitizadas)

| Item | Grau | O que foi visto |
|---|---|---|
| Implementação | OBSERVADO | Widget em `/chat-aws/chat-widget.js`, host `#chat-aws-widget` com shadow root **open**; objeto global `ChatAwsWidget` com `init/open/close/back/destroy` |
| Reinicialização | OBSERVADO (inspeção) | O widget foi removido e recriado ao conectar a ferramenta de inspeção (CDP), voltando fechado. Causa não determinada; pode ser artefato da inspeção. Vale a TI verificar se ocorre em foco/visibilidade |
| Persona da IA | OBSERVADO | Resposta: "Eu sou a Ana, assistente da UniAnchieta". Balão do launcher: "Olá, eu sou a Ana! Como posso te ajudar?" |
| Resposta | OBSERVADO | Indicador "digitando" (três pontos) logo após o envio; resposta em **bloco único**, sem streaming. 1ª resposta em ~2,3 s; a 2ª, mais longa e personalizada, levou mais de 6 s (tempo exato não medido) |
| Conteúdo personalizado | OBSERVADO | A 2ª resposta usou dados acadêmicos do aluno, em lista de linhas com "- " exibida como texto corrido. **Conteúdo não registrado** |
| Avaliação por resposta | OBSERVADO | "Avaliar: 1 2 3 4 5" abaixo de cada resposta da IA (função ausente dos prints) |
| Entrega | OBSERVADO | ✓ simples na mensagem do aluno, com avatar/foto do aluno à direita |
| Funções vistas apenas no DOM | VISTO NO DOM | "Já resolveu o que precisava? · Encerrar atendimento"; barra de resposta/citação ("Cancelar resposta"); aviso de formulário dispensável; gravação com timer, "Cancelar" e "Enviar áudio"; botão de reação nas mensagens da IA; botão "mais" nas do aluno; rótulo "Anexar foto, documento ou áudio" |

## Funções (F01–F28)

A tabela completa, com evidência, grau e tratamento no redesign, está em `src/demo/Baseline.tsx` (`COVERAGE`) e aparece na aba **Referência do legado** do protótipo. Resumo das decisões para o mock:

| Função | Grau | Evidência sanitizada | Lacuna | Decisão para mock |
|---|---|---|---|---|
| F01–F08 Launcher, Início, abas, tamanhos, lista, nova conversa, drawer, conversa vazia | OBSERVADO | S01–S10, S12, S18, S20 + ao vivo | Duração de animações; regra de criação de conversa | Mantidas; "Nova conversa" reutiliza conversa local vazia (PROPOSTO) |
| F09 Sugestões | OBSERVADO | S11 | Outros canais | Só no Tira-Dúvidas, por configuração |
| F10–F11 Mensagens e ✓/✓✓ | OBSERVADO visual | S05, S06, S19 + ao vivo | Contrato de leitura | Só "Enviando…" e "Enviada"; sem confirmação de leitura |
| F12 Anexo | OBSERVADO | S17 + DOM | Tipos/limites/upload | Seletor nativo; limites **de demonstração** (imagem/PDF/áudio, 10 MB) rotulados |
| F13 Áudio | OBSERVADO parcial | S13 + DOM | Codec, envio, transcrição | **PROPOSTO:** gravar → revisar → enviar, com estados negado e sem suporte |
| F15 Transferência | OBSERVADO em histórico | S06 | Fila, cancelamento, horário | Botão rotulado + pedido por texto; espera sem tempo nem posição (PROPOSTO) |
| F16 Pesquisa 0–10 | OBSERVADO em histórico | S06, S19 | Gatilho, opcionalidade | Escala preservada; erro e retentativa (PROPOSTO) |
| F17 Encerrada | OBSERVADO | S05, S06, S19 | Quem encerra | Somente leitura real; nova conversa com novo ID |
| F18 Formulário | OBSERVADO só texto | S05 + DOM | Formato do conteúdo | Ponto de extensão `form` com aviso neutro; **sem formulário de senha** |
| F21 Avaliação 1–5 | OBSERVADO | Ao vivo | Semântica e edição | Grupo "Avaliar resposta" discreto |
| F22 Digitando / bloco | OBSERVADO | Ao vivo | Streaming futuro | "Ana está escrevendo…" + aviso de demora |
| F23 Responder/citar | VISTO NO DOM | DOM | Visual e regras | Ação "Responder" com citação (PROPOSTO) |
| F24 Encerrar atendimento | VISTO NO DOM | DOM | Quando aparece | Exibido com atendente, com confirmação (HIPÓTESE de condição) |
| F26–F27 Reação e menu "mais" | VISTO NO DOM | DOM | Significado | **Não implementados** |

## Telas e transições propostas (sem evidência do legado)

Registradas como PROPOSTO: encaminhando, aguardando a equipe, rota indisponível e falha de encaminhamento; falha de envio com Tentar novamente/Editar/Descartar; upload com progresso, erro e cancelamento; gravação e revisão de áudio; microfone negado e sem suporte; resposta lenta; aviso de novas mensagens; falha de sessão; confirmação de encerramento; barra lateral de conversas em contêiner largo.

## Medidas de movimento

| Ação | Arquivo/vídeo | Início/fim | Duração medida | Interrupção e scroll | Limitações |
|---|---|---|---|---|---|
| Envio → "digitando" | — (registro de mutações do DOM) | clique em Enviar → 1º nó | ~0,02 s | Não avaliado | Uma amostra, desktop |
| Envio → resposta curta | — (registro de mutações do DOM) | clique em Enviar → resposta | ~2,3 s | Não avaliado | Uma amostra; inclui latência da IA |

Não foram gravados vídeos. As durações em `docs/06-movimento.md` continuam sendo propostas.

## Pendências para TI

1. Contrato de mensagens/eventos do `chat-aws`: IDs, idempotência de envio, ordem e reconexão; se haverá streaming.
2. Semântica de ✓/✓✓ e se existe confirmação de leitura real.
3. Avaliação 1–5 por resposta: o que mede, se é editável, onde é registrada.
4. Transferência: disponibilidade antecipada (horário, times), estado de fila, cancelamento; se o Tira-Dúvidas tem rota humana.
5. Quando aparece "Encerrar atendimento" e quem pode encerrar.
6. Anexos e áudio: tipos, tamanho, codecs, múltiplos arquivos, retenção; se o áudio é transcrito.
7. Formato do conteúdo de formulário (aviso de formulário observado no DOM).
8. App: iframe, WebView ou SDK; dono do cabeçalho, do voltar e das safe areas; permissão de microfone na WebView.
9. Reinicialização do widget ao mudar foco/visibilidade (observada durante a inspeção).
10. Ativos oficiais: logo vetorial atual e mascote "Ana" com licença de uso no produto.
