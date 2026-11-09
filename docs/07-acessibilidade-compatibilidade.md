# Acessibilidade, compatibilidade e desempenho

## Meta e medidas

Almejar WCAG 2.2 AA e validar a experiência real. Os itens abaixo são roteiro prioritário, não auditoria completa nem certificação. Fonte normativa: [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

| Área | Critério prático |
|---|---|
| Contraste | Texto normal ≥4.5:1; texto grande ≥3:1; componentes/estados relevantes ≥3:1 conforme critérios aplicáveis |
| Toque | Meta do projeto 44×44 CSS px para ações; WCAG 2.5.8 AA tem mínimo 24×24 com exceções; não confundir as duas medidas |
| Ampliação | Texto 200% e reflow equivalente a 320 CSS px sem perda de ações; verificar 400% de zoom em desktop |
| Foco | Visível, ordem coerente, não encoberto pelo composer, teclado ou cabeçalho |
| Histórico | Botão com nome e expanded; semântica de diálogo quando modal; conter foco só durante modal; Escape fecha e devolve foco |
| Widget | Não prender foco no chat quando modelo é não modal; se fullscreen modal, tornar fundo inerte com fallback |
| Transcript | Nome acessível e semântica log/lista adequada; anunciar respostas completas com moderação, não cada token |
| Estados | Status de envio/erro/humano com texto; avisos críticos acessíveis; sem sequência infinita de alerts |
| Formulários | Labels, mensagens de erro ligadas aos campos, sem placeholder como único rótulo |
| Avaliação | Grupo com pergunta, opções de 0–10 nomeadas e ordem previsível; seleção sem depender de cor |
| Áudio | Texto permanece opção principal; mensagens de áudio exigem alternativa acessível conforme conteúdo/contrato |
| Movimento | Respeitar `prefers-reduced-motion`; sem bounce ou flash; redução de movimento é requisito de projeto adicional |
| Tema | Claro/escuro com contraste medido em estados; respeitar escolha e evitar piscada ao iniciar |

## App, navegador e WebView

A mesma UI web não garante capacidades idênticas no app. Confirmar se hoje é iframe, WebView ou SDK nativo; não presumir. Validar proprietário de safe area, header e botão voltar para não aplicar offsets duas vezes.

- Altura: usar fallback de `vh` e melhoria com `dvh`; tratar área visual/teclado com cuidado. `VisualViewport` só quando disponível e necessário, sem aplicar deslocamento junto de um já feito pelo app.
- Composer e ações continuam visíveis com teclado, orientação paisagem, aumento de texto e safe areas. Input em torno de 16px evita zoom de foco indesejado em Safari, mas deve ser testado no contexto real.
- Microfone: detecção de capacidade, contexto seguro e permissão sob ação explícita. `MediaRecorder`/codecs variam. Permissão concedida ao app não garante permissão na WebView. Não prometer voz em todo aparelho.
- Upload: seletor nativo, cancelamento sem erro falso; `accept` é sugestão, servidor valida tipo/tamanho. Opções nativas podem ficar no idioma do sistema.
- Iframe: permissão de microfone, foco e tamanho dependem da política do host; TI define `allow`, origem e mensagens de resize. Validar origem em `postMessage`, nunca aceitar eventos indiscriminados.
- Navegação/links externos: definir com TI se abrem no app ou navegador. Sem interceptar toda navegação de maneira genérica.
- Rede/sessão: reconexão não duplica envio nem vaza conversa de outro aluno. Autenticação real é integração futura. Não persistir tokens ou conteúdo sensível em localStorage como solução padrão.

## Matriz mínima de ensaio proposta

| Grupo | Exemplos de cenário | Evidência necessária |
|---|---|---|
| Desktop | Chrome/Edge atuais e versão anterior; Firefox; Safari macOS disponível | Teclado, foco, compacto/expandido e zoom |
| iOS | Safari e WebView do app; dispositivo pequeno e atual | Teclado, safe area, microfone e anexo nativos |
| Android | Chrome e Samsung Internet; WebView do app em aparelho de entrada e atual | Memória/rede limitada, permissões e teclado |
| Acessibilidade | NVDA com navegador disponível; VoiceOver no iOS; TalkBack Android | Navegação e compreensão de eventos |
| Layout | Contêineres 320,360,390,768px; desktop 1280/1440px; paisagem | Sem overflow, ações e transcript legíveis |

Versões mínimas de OS/WebView devem vir dos dados reais de uso e da política de suporte da TI. Não inventar um mínimo. Sem esses dados, compatibilidade com aparelhos antigos fica pendência explicitada, com degradação progressiva desde a primeira versão.

## Desempenho

Sem vídeo, fonte remota ou animação pesada no runtime do aluno por padrão. Carregar captura de referência somente na documentação. Evitar parse de markdown de toda conversa a cada token, renders globais a cada tecla e virtualização prematura que prejudique leitura/scroll. Se histórico longo exigir paginação ou virtualização, medir e validar foco/âncora.

Metas propostas: abrir mock já carregado sem tarefa longa perceptível; interações locais em geral dentro de 200ms; nenhuma perda de rascunho. Medir separadamente download inicial, latência de rede/IA e resposta visual. Números não são resultados obtidos nem SLA. Registrar bundle, tarefas longas e percepção em aparelho de entrada quando houver aplicação.
