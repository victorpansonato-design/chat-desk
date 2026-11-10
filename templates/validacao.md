# Relatório de validação — rodada 1

- **Commit / data / execução local:** sem commit (alterações locais em `main`) · 09/11/2026 · `npm run dev` → http://127.0.0.1:5173
- **Comandos executados e resultados:**
  - `npm run typecheck` → sem erros
  - `npm test` (Vitest) → **14/14** (deduplicação, reenvio, isolamento A/B, rascunho por conversa, encerrada somente leitura, encerrar durante envio, nova conversa sem duplicar, título, idempotência do mock, rota indisponível, entrada do atendente)
  - `npx playwright test` → **20/20** no Chrome desktop instalado (ver tabela)
  - `npm run build` → JS 224 KB (**69,8 KB gzip**), CSS 36,8 KB (8,0 KB gzip); sem biblioteca de animação
  - `npm run contraste` → 32 pares medidos (16 por tema), **0 abaixo** do mínimo depois de corrigir o rótulo do Enviar desabilitado (era 4,43:1)
  - `npm run capturas` → 22 imagens em `captures/prototipo/`, sem erros de página
  - CPU limitada a 6× (CDP) + `prefers-reduced-motion`: fluxo abrir → nova conversa → digitar → resposta → drawer concluído; 6 tarefas longas de 65 a 193 ms **sob limitação** (≈ 11–32 ms sem ela). Medição única, desktop
- **Navegadores e aparelhos realmente ensaiados:** Chrome estável no Windows 11 (desktop). **Nenhum aparelho real, nenhuma WebView, Safari, Firefox ou leitor de tela**
- **Emulação (separada de aparelho real):** viewports 320×640 e 1280–1500 px; `reducedMotion` emulado; microfone falso do Chrome (`--use-fake-device-for-media-stream`); CPU 6×

| Cenário Txx | Shell/canal | Resultado | Evidência | Defeito/limitação |
|---|---|---|---|---|
| T01 Abrir/fechar/reabrir | Portal | **Passou** | e2e T01/T02; foco volta ao launcher | — |
| T02 Expandir/recolher | Portal | **Passou** | e2e T01/T02; mesma instância (painel não remonta) | Posição de rolagem durante o expandir não é medida no teste |
| T03 Início/lista/histórico | Portal | **Passou** | e2e T03/T05/T15 | — |
| T04 Nova conversa repetida | Portal | **Passou** | e2e T04 + unitário | Regra real de criação depende da TI |
| T05 Texto e resposta | Portal, App, TD | **Passou** | e2e T03, T18 | Resposta do mock é fictícia |
| T06 Falha, editar, reenviar | Portal | **Passou** | e2e T06, T06b + unitário | — |
| T07 Recebimento lendo acima | Portal | **Passou** | e2e T07 (sem salto; botão "Nova mensagem") | — |
| T08 Atraso A→B | Portal | **Passou** | e2e T08 + unitário | — |
| T09 Anexos | Portal | **Parcial** | e2e T09: inválido, prévia, remover, progresso, envio | Falha de upload só pelo painel (sem teste automático); cancelar o seletor nativo não testado |
| T10 Microfone negado/sem suporte | Portal | **Passou** | e2e T10 | Simulado; permissão real do iOS/Android não testada |
| T11 Áudio local | Portal | **Passou (emulado)** | e2e T11 com microfone falso do Chrome | Codecs/MediaRecorder em iOS/WebView não verificados |
| T12 IA→espera→humano | Portal | **Passou** | e2e T12; sem tempo/posição inventados | Atendente é fictício e acionado pelo painel |
| T13 Indisponível/falha | Portal | **Passou** (indisponível) | e2e T13 | Modo "falha" verificado só manualmente |
| T14 Avaliação 0–10 | Portal | **Passou** | e2e T12 (0) e T14 (erro → retentativa, sem duplicar) | Valor 10 verificado nas fixtures/capturas |
| T15 Encerrada e nova | Portal | **Passou** | e2e T03/T15, T12 | — |
| T16 Teclado móvel, paisagem, safe area | App | **Não executado** | — | Requer aparelho real/WebView; só 320×640 emulado |
| T17 Teclado e foco | Portal | **Passou (parcial)** | e2e T17, T17b (Tab contido, Escape, retorno do foco, Enter/Shift+Enter) | Leitor de tela (NVDA/VoiceOver/TalkBack) não testado; IME testado só por código |
| T18 320 px e textos longos | Portal, App, TD | **Passou** | e2e T18 ×3 (sem rolagem horizontal; Enviar e rota humana visíveis) | Zoom de 200%/400% não testado |
| T19 Movimento reduzido | Portal | **Parcial** | e2e T19 + captura 19 | Cliques rápidos repetidos não automatizados |
| T20 Claro/escuro | 3 hosts | **Passou (medido)** | `npm run contraste` + capturas 01, 16 | Ausência de flash no carregamento não medida em vídeo |
| T21 Encerrar durante envio | Núcleo | **Passou (unitário)** | Reducer converge para "Não enviada: o atendimento foi encerrado" | Sem teste de navegador |
| T22 Voltar do app / trocar dúvida | App, TD | **Passou** | e2e T22 (rascunho preservado; TD sem rota humana) | Comportamento real é do hospedeiro |

## Revisão de experiência

- **Clareza de IA/humano e espera:** cabeçalho sempre diz quem atende ("Ana · Assistente de IA", "Encaminhando…", "Aguardando a equipe de atendimento", "Marina · Equipe de atendimento", "Atendimento encerrado"), com ponto de cor **e** texto. Eventos ficam registrados no histórico. Não há tempo de espera, posição na fila nem pessoa "online" simulada.
- **Histórico/nova conversa/readonly:** uma única fonte para aba, drawer e barra lateral; título pelo assunto; encerrada sem composer e com "Iniciar nova conversa".
- **Rascunho/scroll/recebimento em outra conversa:** rascunho por conversa sobrevive a fechar, expandir, trocar de conversa e voltar no app; posição de leitura memorizada por conversa e por hospedeiro; resposta atrasada vai para a conversa certa e marca não lida.
- **Teclado/foco/reduced motion:** drawer modal com foco contido e retorno; foco movido só em navegação feita pelo aluno; animações de 100–220 ms só com transform/opacity; reduced motion zera as animações.
- **Contraste e zoom:** contraste medido (acima). Zoom não verificado.
- **Bundle/tarefas longas/desempenho observado:** ~70 KB gzip; tarefas longas modestas sob CPU 6×. Sem medição em aparelho de entrada.
- **Paridade:** **parcial, baseada em prints e inspeção curta.** Animações do legado não foram medidas nem clonadas. Reação (F26) e menu "mais" (F27) não foram implementados.

## Entrega para Victor

- **URL local:** http://127.0.0.1:5173 (abas: Aluno Online · App · Tira-Dúvidas · Três canais · Referência do legado; botão **Cenários** para os estados)
- **Comando:** `npm install` (primeira vez) e `npm run dev`
- **Pendências de integração:** ver "Pendências para TI" em `templates/descoberta.md` e `docs/integracao.md`
- **Próximos passos sugeridos:** ensaio em aparelhos reais (iOS/Android, WebView do app); leitor de tela; teste formativo com 5–8 estudantes (docs/01); validar marca, mascote e textos com o CX
- Nenhum deploy, publicação ou integração real nesta rodada.


---

# Relatório de validação — rodada 2 (10/11/2026)

Substitui os resultados acima: a interface foi refeita e os testes de navegador, reescritos.

- **Execução:** sem commit (alterações locais em `main`) · `npm run dev` → http://127.0.0.1:5173
- **Comandos e resultados:**
  - `npm run typecheck` → sem erros
  - `npm test` → **22/22** (os 14 da rodada 1 mais: indicador da Ana não fica preso, reversão só a partir de "encaminhando", troca de ID pelo servidor, fila com posição, pedidos simultâneos, fora do expediente e cancelamento, encerrar durante o encaminhamento, cálculo do expediente)
  - `npx playwright test` → **21/21** no Chrome desktop
  - `npm run build` → JS 243 KB (**76 KB gzip**), CSS 56 KB (12 KB gzip); sem biblioteca de animação
  - `npm run contraste` → 26 pares (15 claro, 11 escuro), **0 abaixo** do mínimo
  - `npm run capturas` → 21 imagens em `captures/prototipo/`, sem erros de página
- **Ensaiado de verdade:** Chrome estável no Windows 11 (desktop). **Nenhum aparelho real, WebView, Safari, Firefox ou leitor de tela.**
- **Emulado:** 320×640; movimento reduzido; microfone falso do Chrome.

| Cenário | Resultado | Limitação |
|---|---|---|
| T01/T02 abrir, fechar, expandir | Passou | — |
| T03/T05 texto, etapas, resposta, avaliação | Passou | Respostas fictícias |
| T04 nova conversa repetida | Passou | — |
| T06 falha, reenviar, editar | Passou | — |
| T07 lendo acima | Passou | — |
| T08 atraso entre conversas | Passou | — |
| T09 anexos | Passou | Falha de upload sem teste automático |
| T10 microfone negado/sem suporte | Passou | Simulado |
| T11 áudio | Passou (emulado) | iOS/WebView não verificados |
| T12/T14/T15 fila → atendente → conteúdos → encerrar → pesquisa | Passou | Atendente fictícia e automática |
| T13 fora do expediente e cancelamento; rota indisponível | Passou | "Falha ao chamar" só manual |
| Senha: validação, código incorreto, conclusão | Passou | Código expirado e reenvio sem teste automático |
| T16 teclado móvel, paisagem, safe area | **Não executado** | Requer aparelho real |
| T17 teclado e foco | Passou (parcial) | Leitor de tela não testado |
| T18 320 px | Passou ×3 | Zoom 200/400% não testado |
| T19 movimento reduzido | Passou | — |
| T20 claro/escuro | Passou (medido) | — |
| T21 encerrar durante envio | Passou (unitário) | — |
| T22 troca de interface mantém conversa e rascunho | Passou | — |

**Não medido:** fluidez das transições (não há medição de quadros; avaliação só visual por capturas estáticas), desempenho em aparelho de entrada, e a transformação entre interfaces com CPU limitada. A transformação anima largura e altura (causa reflow a cada quadro): aceitável no desktop ensaiado, a verificar em aparelhos modestos.

**Defeitos da rodada 1 corrigidos (auditoria do núcleo):** indicador "escrevendo" preso ao ir para a fila; encaminhamento duplicado por clique duplo; encerramento desfeito por encaminhamento tardio; criações paralelas da conversa no primeiro envio; microfone que gravava mesmo após cancelar a permissão; URLs locais não liberadas; contagem de "novas mensagens" vazando entre conversas; conversa vazia órfã no histórico; citação perdida em envio só com anexos; falta de mapeamento do ID local para o ID do servidor.
