# Inventário funcional e de evidências

IDs abaixo apontam para `references/current/INDEX.md`. “Observado” confirma a presença visual; entrega, persistência e regras de servidor continuam não verificadas.

| ID função | Função/estado | Evidência | Grau | Implicação para o redesign |
|---|---|---|---|---|
| F01 | Launcher no canto inferior direito | S01 | OBSERVADO | Abrir/fechar sem perder contexto; preservar área de toque |
| F02 | Início com saudação, marca e mensagem recente | S01,S02,S20 | OBSERVADO | Manter boas-vindas e retomar atendimento |
| F03 | Navegação Início/Mensagens | S01–S04,S18,S20 | OBSERVADO | Preservar destinos mesmo se organização mudar |
| F04 | Compactar/expandir/fechar | S01–S10 | OBSERVADO | Presença dos controles; duração e comportamento pendentes |
| F05 | Lista de mensagens com data e encerramento | S03,S04,S18 | OBSERVADO | Estado legível e acesso ao histórico |
| F06 | Criar conversa por CTA e “+” | S03,S04,S07,S08,S18 | OBSERVADO | Ações convergem para mesma intenção; regra de criação pendente |
| F07 | Histórico lateral sobreposto e conversa selecionada | S07,S08,S12,S15 | OBSERVADO | Foco, backdrop e retorno preservados |
| F08 | Conversa vazia com composer | S09,S10 | OBSERVADO | Convite claro; não fabricar saudação enviada |
| F09 | Sugestões de perguntas institucionais | S11 | OBSERVADO | Preservar contexto Tira-Dúvidas; demais canais a validar |
| F10 | Mensagens de aluno e bot, avatar e horário | S05,S06,S19 | OBSERVADO | Distinguir remetente sem depender de cor |
| F11 | Marcas de envio/leitura | S05,S06,S19 | OBSERVADO visual | Significado exato deve vir do contrato, não do desenho |
| F12 | Botão de anexar e opções nativas iOS | S09,S10,S17 | OBSERVADO | Tipos, limites e upload efetivo pendentes |
| F13 | Botão microfone e permissão iOS | S09,S10,S13 | OBSERVADO | Gravação/transcrição/reprodução não vistas |
| F14 | Composer com teclado aberto | S14,S16 | OBSERVADO | Cabeçalho do chat parece sair do recorte; causa não determinada |
| F15 | Pedido de humano, aviso de transferência e entrada | S06 | OBSERVADO em histórico | Fluxo ativo e fila ainda precisam inspeção |
| F16 | Pesquisa 0–10, resposta e agradecimento | S06,S19 | OBSERVADO em histórico | Preservar escala, pergunta e semântica; não renomear para CSAT |
| F17 | Encerrada/somente leitura e nova conversa | S05,S06,S19 | OBSERVADO | Ocultar envio ativo; manter leitura e CTA |
| F18 | Mensagem sobre código de senha e formulário | S05,S06,S19 | OBSERVADO só texto | Não há formulário visível; não reconstruir campos inventados |
| F19 | Tema escuro e controle de tema em Tira-Dúvidas | S11–S20 | OBSERVADO | Persistência/herança de tema pendentes |
| F20 | “Trocar tipo de dúvida” no Tira-Dúvidas | S11 | OBSERVADO | Preservar contexto e destino; contrato ainda desconhecido |

## Lacunas prioritárias

| Lacuna | Como verificar | Se indisponível |
|---|---|---|
| DOM/iframe/WebView e dono do cabeçalho | TI e inspeção autorizada | Shell provisório com contrato explícito |
| Estados de nova conversa e retomada | Abrir/fechar sem enviar | Simular e registrar hipótese |
| Áudio: gravação, transcrição ou arquivo | Inspeção sem envio real / TI | Fluxo local proposto, texto sempre disponível |
| Anexo: extensões, tamanho, múltiplos, progresso | TI e seletor observado | Configuração externa, limites de demonstração rotulados |
| Resposta: streaming, blocos completos, typing | Até duas perguntas neutras | Renderer com estratégia configurável; sem falsa animação do legado |
| Atendimento humano: fila, disponibilidade, cancelamento | TI e histórico | Apenas cenários simulados; não inventar posição/tempo |
| Avaliação: gatilho, edição, opcionalidade | TI e histórico | Mock da escala, sem obrigatoriedade nova |
| Memória entre canais/dispositivos | Contrato de sessão com TI | Não prometer continuidade cross-device |
| Persistência e ordem de mensagens | Contrato/API | Adapter mock com IDs e cenários de atraso |
| Formulários e conteúdos ricos | Coletar exemplo autorizado | Ponto de extensão, sem formulário de senha fictício |

## Sinais de melhoria, não diagnósticos comprovados

Há títulos de histórico repetidos com a pergunta de avaliação; investigar se decorrem da última mensagem usada como título. Metadados e disclaimer aparecem pequenos nos prints; medir em CSS real antes de afirmar violação. O tema escuro e o cabeçalho externo do app ocupam espaço importante; validar com teclado e ampliação. Há dois acessos ao histórico/lista: simplificar navegação mantendo todas as capacidades. Não copiar os defeitos visuais como obrigação de fidelidade.
