# Inspeção do legado e uso do Craft Anything

## Objetivo

Documentar a superfície autorizada antes de alterar sua apresentação. A inspeção distingue o que foi realmente observado do que foi apenas inferido. Não é necessário copiar todo o frontend antigo em produção para planejar o redesign.

## Sessão curta, 20–30 minutos como estimativa

1. Victor abre o ambiente e autentica pessoalmente. Não compartilhar senha, OTP ou cookies no chat, arquivos ou repo.
2. Registrar URL sem tokens, data, canal, tema, viewport em CSS pixels, navegador/OS e escala. A resolução de um print não equivale ao viewport CSS do aparelho.
3. Sem enviar: abrir launcher → início → mensagens → conversa encerrada autorizada → histórico → voltar → nova conversa → expandir/recolher. Gravar os movimentos e anotar foco e posição de scroll.
4. Se necessário, enviar no máximo duas perguntas neutras, por exemplo “Onde vejo o calendário acadêmico?” e “Como encontro meu horário de aula?”. Registrar a resposta sem dados pessoais e sem interpretar regras acadêmicas a partir dela.
5. Observar seletor de anexo e estado de permissão sem enviar arquivos pessoais. Não conceder permissões inesperadas por conveniência. Testes reais de áudio podem usar ambiente de homologação e autorização específica.
6. Não acionar atendimento humano nem protocolo para descobrir a fila. Consultar histórico ou pedir à TI exemplos de homologação.
7. Coletar evidências sanitizadas e preencher `templates/descoberta.md`. Não capturar HAR por padrão: pode conter sessão e dados de aluno.

## Capturas desejadas

Vídeos reais de abertura/fechamento, expansão, troca de aba, histórico, chegada de resposta e teclado. Gravar por ação, com começo e fim visíveis, sem acelerar. Separar capturas do legado das do protótipo. Um vídeo promocional de fornecedor não prova timing de interface. Guardar mídia identificável fora do repo até sanitizar.

## Craft Anything — avaliação em 09/11/2026

Fontes lidas: [README](https://github.com/storytold/craft-anything/blob/main/README.md) e [integração Claude Code](https://github.com/storytold/craft-anything/blob/main/docs/claude-code.md). As afirmações seguintes são descrições do mantenedor, não resultados de teste desta equipe.

O projeto oferece CLI/MCP e um ciclo de estudar, construir e comparar. Distingue observação visual (Clean room) e inspeção interna (Deep). O README o classifica como **early alpha**; o adapter Codex é descrito como existente, mas ainda sem verificação em instalação real. Há ressalvas de cobertura também na documentação da integração Claude. Portanto, não tratar como clonador garantido nem como base obrigatória.

**Decisão recomendada:** browser e inventário manual estruturado primeiro. Usar Craft Anything só se reduzir trabalho de captura/comparação no ambiente de Victor. Não instalar nesta preparação. Não ativar Deep automaticamente. Não importar o repositório inteiro como dependência do produto.

Se Victor escolher usá-lo, revisar versão e documentação atuais, confirmar origem/release, instalar no ambiente dele e começar por inspeção visual. Os comandos documentados `craft-anything-cli doctor` e `craft-anything-cli commands` ajudam a verificar instalação e capacidades. Evitar um comando genérico de rebuild que gere produto antes de entender o escopo. Nenhuma integração ou comando foi executado neste pacote.

## Condição para avançar

Com inspeção: produzir baseline funcional com cobertura declarada. Sem inspeção: avançar com a evidência dos prints e cenários propostos. Só bloquear uma parte que dependa de regra desconhecida; não bloquear o redesign inteiro. Publicar internamente o quadro de pendências para TI, nunca uma alegação de clone completo sem demonstração.
