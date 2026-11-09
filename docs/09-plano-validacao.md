# Plano de ação e validação

## Etapas e entregas

| Etapa | Trabalho | Saída revisável | Condição de avanço |
|---|---|---|---|
| 0 · Preparação | Ler pacote, examinar repo e referências | Resumo de escopo e lacunas | Nenhuma nova função assumida como fato |
| 1 · Descoberta | Inspeção curta opcional e inventário | Registro de descoberta e evidências | Cobertura declarada; sem acesso não bloqueia mocks |
| 2 · Baseline | Recriar funções visíveis com dados fictícios | Referência funcional mínima, capturas e mapa | Funções F01–F20 rastreadas, limitações explícitas |
| 3 · Direção | Comparar A/B internamente, tokens e composição | Decisão curta e um caminho escolhido | Identidade, clareza e acessibilidade consideradas |
| 4 · Construção | Núcleo único + três hospedeiros | Protótipo local navegável | Mesmos estados e dados nos três contextos |
| 5 · Robustez | Erros, teclado, mídia, humano, movimento | Cenários completos e recuperação | Sem perda de estado, foco ou mensagem |
| 6 · Revisão | Testes funcionais e visuais apropriados | Relatório, capturas e vídeos reais | Sem bloqueadores; pendências honestas |
| 7 · Entrega local | Iniciar servidor e instruções | URL, comando e resumo de verificação | Victor pode experimentar; encerrar rodada |

Baseline não significa reconstruir infraestrutura antiga. Pode ser um modo de referência ou rota de demonstração; não perpetuar duas bases de implementação. Não publicar automaticamente após terminar.

## Cenários de aceite prioritários

| ID | Cenário | Esperado |
|---|---|---|
| T01 | Abrir, fechar e reabrir no portal | Rascunho, conversa e posição preservados |
| T02 | Expandir/recolher durante leitura | Mesma conversa, sem remontagem ou salto ao fim |
| T03 | Navegar início/lista/histórico/voltar | Destinos claros; seleção coerente |
| T04 | Criar conversa repetidamente | Sem duplicação indevida de chats vazios; decisão documentada |
| T05 | Enviar texto e receber resposta | Pendente, confirmação real do mock e conteúdo estável |
| T06 | Falha, editar e tentar de novo | Texto preservado e sem mensagem duplicada |
| T07 | Receber mensagem enquanto lê acima | Não puxar scroll; informar novas mensagens |
| T08 | Atraso de resposta ao trocar A→B | Mensagem pertence a A, sem aparecer em B |
| T09 | Anexo permitido, cancelado, inválido e falho | Preview/remover/erro e recuperação claros |
| T10 | Microfone negado e não suportado | Explicação e texto disponível; sem loop de permissão |
| T11 | Áudio local em cenário suportado | Gravar/revisar/cancelar/enviar propostos sem fingir legado verificado |
| T12 | IA→transferência→espera→humano | Contexto mantido, nome/papel e aviso, sem tempo inventado |
| T13 | Transferência indisponível/falha | Estado honesto e caminho permitido; sem pessoa fictícia online |
| T14 | Avaliar 0 e 10 e simular erro | Escala completa, seleção acessível e sem envio duplicado |
| T15 | Conversa encerrada e nova conversa | Readonly verdadeiro; novo ID, histórico intacto |
| T16 | Teclado móvel, paisagem e safe area | Composer/fechar/voltar acessíveis; sem rolagem dupla |
| T17 | Tab, Shift+Tab, Escape, foco e leitor de tela | Ordem coerente e anúncios moderados |
| T18 | 320px, zoom, nomes/links longos e NPS | Sem corte, sobreposição ou scroll horizontal do shell |
| T19 | Reduced motion e cliques rápidos | Sem bounce, fila de animações ou overlay preso |
| T20 | Claro/escuro nos três hospedeiros | Contraste e identidade consistentes, sem flash |
| T21 | Encerrar durante envio/upload | Estado convergente; não mostrar envio aceito sem confirmação |
| T22 | Voltar no app/trocar tipo de dúvida | Comportamento delegado ao host, sem perder dados silenciosamente |

## Verificação técnica proporcional

Quando houver código, executar typecheck/build/lint configurados no projeto. Testes automatizados devem cobrir a lógica com risco real: deduplicação, isolamento por conversa, envio falho, atendimento/encerramento e retorno de foco. Testes de navegador devem atravessar pelo menos texto→histórico→encerrada→nova e IA→humano no mock. Não escrever dezenas de testes que repetem CSS ou copiam a implementação.

Inspecionar manualmente no navegador os três shells, teclado, rolagem e reduced motion. Auditoria automática de acessibilidade auxilia, mas não substitui teclado/leitor de tela. Emulação de celular não valida permissão nativa ou WebView. Marcar os ensaios em aparelho real como pendentes quando não realizados.

## Definição de pronto para revisão de CX/TI

- Todos os requisitos observados têm componente/cenário ou justificativa explícita de lacuna.
- Nenhuma tela principal é um botão sem efeito; estados de mídia/integração simulados estão identificados no ambiente de demonstração.
- Nenhum dado real, segredo ou serviço de produção envolvido.
- Mesmo núcleo nos três canais, incluindo erro e encerramento.
- Design, movimento e acessibilidade revisados além da tela inicial.
- Relatório cita o que foi testado e o que não foi; sem “100% compatível” ou “clone fiel” sem evidência.
