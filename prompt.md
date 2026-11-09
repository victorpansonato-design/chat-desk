# Missão para Claude Code / Codex — Chat Desk

Você atua como designer de produto sênior, especialista em experiência conversacional, acessibilidade e engenharia de frontend. Crie localmente a reformulação visual do **Chat Anchieta**, preservando o escopo funcional do atendimento ao aluno do Grupo Anchieta. A instituição tem mais de 86 anos de tradição, conforme briefing do responsável de CX. O resultado deve transmitir confiança, capacidade tecnológica e facilidade de uso, com identidade institucional azul.

## 1. Resultado esperado

Um protótipo funcional e refinado, com dados fictícios, que mostre **o mesmo produto** no Aluno Online, App Grupo Anchieta e Tira-Dúvidas. Mesmos componentes, estados e linguagem; os canais mudam o contêiner e a integração. Nada de três versões independentes.

A instituição atende por IA e também por equipe humana. O aluno deve entender quem está atendendo, o que está acontecendo e como obter ajuda humana, sem recomeçar a explicação. A interface deve funcionar para pessoas com diferentes níveis de familiaridade digital, idades, capacidades e condições de acesso. Não associe capacidade de uso a região do país.

## 2. Leitura obrigatória, nesta ordem

1. `AGENTS.md`, `README.md`, `docs/01-produto.md`.
2. `references/current/INDEX.md`: abra os arquivos de imagem; não se limite aos nomes.
3. `docs/02-inventario.md`, `docs/03-inspecao.md`.
4. `references/README.md` e as três imagens em `references/products/`.
5. `docs/04-experiencia.md` a `docs/10-conteudo.md`.
6. `fixtures/scenarios.json` e os registros em `templates/`.

Escreva um resumo curto do que entendeu, do que está comprovado e das lacunas. Depois execute. Não exija que Victor decida detalhes de implementação rotineiros.

## 3. Primeiro, conhecer e preservar

Inspecione arquivos, dependências e orientações existentes antes de escolher stack. O pacote inicial não possui aplicação nem API. Se continuar vazio, React + TypeScript + Vite é uma opção leve, não uma obrigação institucional.

Se Victor disponibilizar o navegador autenticado, aplique `docs/03-inspecao.md`. Ele fará o login. Observe controles e estados com até duas perguntas neutras. Não inicie transferência para atendente humano, pesquisa, troca de senha ou outra transação real só para testar. Use histórico autorizado e mocks para o restante.

Se o acesso não vier, prossiga. Preencha o registro de descoberta e mantenha o rótulo “paridade parcial baseada em prints”. Não finja ter clonado animações ou funcionamento integral.

Crie primeiro uma referência funcional mínima do legado, usando os estados observados. Ela serve para conferir alcance e evitar perder funções. Não gaste uma rodada polindo defeitos antigos. Registre telas e transições cobertas. Depois construa o redesign sobre o mesmo modelo de domínio.

## 4. Direção criativa e liberdade

Você deve propor e materializar uma direção visual própria para o Anchieta. Este briefing não fornece uma imagem final para copiar. Explore internamente duas possibilidades de composição, compare pelos critérios de clareza, alcance das ações e continuidade, escolha uma e implemente. Não peça autorização para cada espaçamento ou ícone.

Referência principal: ChatGPT, pela hierarquia de conversa, composição e clareza do campo de mensagem. Referência complementar: Intercom/Fin, pela experiência de suporte híbrido e adaptação do messenger. Claude aparece apenas como material audiovisual complementar, com limites de escopo em `references/videos/README.md`. Não importar funcionalidades de artifacts, geração de imagens, modelos, projetos ou planos.

Use azul institucional como acento, superfícies limpas, contraste forte, ícones familiares e tipografia legível. Modernidade deve aparecer na qualidade da resposta e dos estados. Preserve a marca e a mascote existentes quando houver ativo adequado; não invente novo nome, logo, personagem ou selo de aniversário. Não use logo “85 anos” como ativo novo sem validação.

## 5. Fluxos obrigatórios

Implemente o caminho inicial → mensagens/histórico → conversa/nova conversa. Preserve a distinção entre início e conversa. Não remova uma função ao eliminar um elemento duplicado.

Cubra texto, sugestões do Tira-Dúvidas, anexos, entrada por áudio (sem confundir gravação com conversa de voz), início de transferência, espera, entrada do atendente, avaliação 0–10 e conversa encerrada somente leitura. As telas de áudio, upload, espera e erros ainda não evidenciadas devem estar identificadas como proposta no registro de descoberta. Nenhuma operação real deve ser feita pelos mocks.

O botão de anexo observado abre opções nativas no iOS. Reutilize o seletor nativo onde aplicável; não redesenhe um diálogo do sistema operacional como se fosse parte do chat. O mesmo vale para permissão de microfone e teclado. Sem suporte de mídia, ofereça texto e anexo compatível.

Não crie um formulário de troca de senha com base na mensagem do print: ela menciona um formulário, mas ele não aparece. Preserve a capacidade do renderer de receber esse tipo de conteúdo futuramente, com ponto de integração documentado.

## 6. Engenharia de experiência

- Um núcleo de conversa e adapters/shells de hospedagem. Estado de abertura/tamanho/rota separado do estado da conversa e do atendimento.
- Persistir rascunho por conversa e preservar posição de leitura. Fechar, expandir, abrir histórico e trocar tema não apagam a conversa.
- Auto-scroll só se o aluno já estiver no fim ou acabar de enviar. Caso contrário, sinalizar novas mensagens. Sem salto na chegada de imagem ou teclado.
- Chaves estáveis, reservas de espaço para mídia e tratamento de respostas atrasadas de outra conversa.
- Envio pendente/falho com tentativa explícita e sem duplicação. Não inventar confirmação de leitura do servidor.
- Estado de IA distinto do estado de atendente; texto de expectativa verdadeiro. Não prometer tempo, posição na fila ou disponibilidade sem dados.
- Composer acessível, com rótulo visível/contextual; botão enviar identificável. Multilinha e IME sem envio acidental; comportamento de Enter consistente e explicado.
- Acesso humano identificável enquanto houver rota disponível; em mock demonstrar estados de disponibilidade, sem simular uma pessoa real online.
- Sem dependência obrigatória de animação, hover, arraste, rede rápida ou tela grande.

## 7. Verificação e entrega da rodada

Execute o plano de `docs/09-plano-validacao.md`. No mínimo: testes de estados de envio e transição para humano/encerrada, verificação de teclado/foco, responsive e rolagem. Capturas não substituem interação real; emulação não certifica WebView de iOS/Android. Não declarar compatibilidade universal.

Abra e verifique a interface no navegador. Capture os três hospedeiros com a mesma conversa e demonstre o ciclo completo. Em performance limitada e reduced motion a UI deve continuar legível e previsível. Escolha a biblioteca de animação apenas se CSS e as dependências existentes não resolverem; sem biblioteca pesada por padrão.

Preencha os registros de decisão e validação. Corrija bloqueadores antes de encerrar. Entregue URL local funcionando, comando para iniciar, resumo do que foi implementado, testes executados e lacunas. Encerre a rodada para Victor experimentar. Não publique.

## Critério decisivo

A proposta só está pronta para apresentação se o aluno conseguir começar, entender a resposta, pedir ajuda humana, localizar um atendimento antigo e recuperar-se de uma falha com clareza — no mesmo produto nos três canais. Refinamento visual é necessário em todos os estados, não apenas na tela inicial.
