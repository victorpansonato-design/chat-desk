# Movimento natural e estabilidade

Todas as durações abaixo são **propostas**, não medidas do legado nem do ChatGPT. Fluidez é continuidade de contexto, não obrigatoriedade de animar tudo.

## Contrato inicial

| Ação | Proposta | Duração inicial | Reduced motion |
|---|---|---|---|
| Abrir/fechar painel | Fade e deslocamento de 8–12px a partir da posição de repouso | 180–240ms | Sem deslocamento; imediato ou fade até 80ms |
| Histórico lateral | Deslizamento contido e backdrop discreto | 180–220ms | Troca sem movimento; manter foco |
| Expandir/recolher | Contêiner mantém âncora e preserva scroll, rascunho e conteúdo | 220–280ms | Redimensionamento direto e estável |
| Trocar tela/aba | Fade curto sem sobreposição de leitura | 120–180ms | Imediato |
| Mensagem nova | Entrada discreta sem rebater toda a lista | 120–160ms | Inserção direta |
| Foco/hover/pressionado | Cor e borda, sem salto de dimensões | 80–120ms | Cor imediata |
| Preview de anexo | Espaço reservado e entrada leve | 120–180ms | Inserção direta |
| Estado IA → humano | Atualizar identificação no mesmo lugar e adicionar evento | 120–180ms | Troca direta com anúncio acessível |

Curva sugerida para entrada: `cubic-bezier(0.2, 0, 0, 1)`. Saídas podem ser um pouco mais curtas. Não é necessário spring. Não animar `all`; limitar propriedades explicitamente. Transform/opacity para entradas; animação de tamanho só em contêiner delimitado e depois de medir impacto.

## Regras de preenchimento

Se a API entregar streaming real, inserir blocos incrementalmente sem reescrever a mensagem inteira a cada token. Se entregar tudo de uma vez, mostrar conteúdo pronto com transição discreta. **Não simular digitação letra por letra**: atrasa leitura, causa reflow e falsa percepção de processamento. Não reproduzir “raciocínio” da IA.

Loading informa o que acontece sem inventar progresso. Skeleton só para conteúdo com estrutura previsível e área reservada, sem brilho pulsante contínuo. Espera prolongada precisa de texto útil; não de uma animação infinita como única explicação.

## Invariantes contra teleportes

- IDs e keys estáveis; expandir/fechar drawer não remonta transcript nem composer.
- Uma posição de leitura por conversa. Trocar de conversa restaura a posição correspondente.
- Mídia recebe dimensão reservada/aspect ratio. Não crescer mensagem acima da área lida sem preservar âncora.
- O scroll acompanha novas respostas apenas quando o leitor está perto do fim (limiar inicial proposto: 64px, testar). Ao ler acima, mostrar botão “Novas mensagens”.
- Foco não pula para mensagens recebidas nem ao concluir upload. Drawer devolve foco ao acionador; fechar painel devolve ao launcher.
- Cliques repetidos convergem para o estado solicitado; interromper animação sem fila de movimentos. Mudança de orientação, teclado e reduced motion durante transição não podem deixar overlay invisível bloqueando a tela.
- Não animar a chegada do teclado do sistema. Reagir à área visível sem duplo deslocamento.
- Animação nunca adia habilitar ação, envio ou leitura. Funcionalidade completa com transições desativadas.

## Como validar

Observar abrir/fechar repetido, expandir com mensagem longa, trocar conversa enquanto chega resposta, abrir teclado e receber anexo ao ler acima. Gravar o protótipo em 1x e observar travamentos/reflow. Em computador lento, verificar com CPU limitada; em aparelho real validar teclado e WebView. Não afirmar 60fps sem medição. Evitar blur/sombra grande animada e `will-change` permanente.
