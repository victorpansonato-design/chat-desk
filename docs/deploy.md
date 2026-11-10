# GitHub e Vercel · demonstração

OBSERVADO · 10/11/2026: [demonstração publicada](https://chat-desk-khaki.vercel.app) no [projeto Chat Desk](https://vercel.com/victor-capitani/chat-desk). Status `READY`; página, JavaScript e CSS responderam HTTP 200. Os 23 testes de navegador passaram também na URL de produção. Os hashes dos ativos publicados coincidem com o build local validado.

## Escopo e autorização

RELATADO · 10/11/2026: pedido explícito de Victor para corrigir o repositório e publicar na Vercel. Esse pedido substitui a restrição de publicação da primeira rodada. O produto continua sendo somente a experiência do aluno, com adapter mock e dados fictícios; não há backend, autenticação acadêmica ou atendimento real.

OBSERVADO antes da correção: `main` continha o briefing; a implementação estava em `feat/prototipo-chat-anchieta`; não havia workflow de validação nem projeto Chat Desk na equipe Vercel conectada.

## Execução reproduzível

Use Node.js 24 (também em `.nvmrc` e `package.json`).

```sh
npm ci
npm run check
npm run test:e2e
```

`check` valida tipos, executa testes unitários, mede os pares de contraste definidos no projeto e audita dependências. `test:e2e` gera o build e testa a pasta `dist` por `vite preview` em `http://127.0.0.1:5174`. Localmente usa Chrome instalado; no GitHub Actions usa Chromium instalado pelo Playwright.

Para testar uma publicação existente, defina `BASE_URL` com a URL HTTPS e execute `npx playwright test`; nesse caso nenhum servidor local é iniciado. A suíte usa apenas o mock e mídia fictícia do navegador.

## Configuração da Vercel

| Item | Valor |
|---|---|
| Equipe | Victor Capitani (`victor-capitani`) |
| Repositório | `victorpansonato-design/chat-desk` |
| Projeto Vercel | `chat-desk` (`prj_cKewtrW3m5DJdHZGTimomfiHUBJ9`) |
| URL | `https://chat-desk-khaki.vercel.app` |
| Branch de produção | `main` |
| Diretório raiz | Raiz do repositório |
| Framework | Vite |
| Node.js | 24.x |
| Instalação | `npm ci` |
| Build | `npm run build` |
| Saída | `dist` |
| Variáveis secretas necessárias | Nenhuma |

`vercel.json` registra os comandos e cabeçalhos. O protótipo possui aviso visível de simulação e diretivas `noindex, nofollow`; essas diretivas não são controle de acesso. O bundle servido contém somente a aplicação compilada e seus ativos. `.vercelignore` exclui referências, capturas, vídeos locais e arquivos de ambiente dos uploads por CLI.

OBSERVADO: o código não faz requisições para APIs acadêmicas. Temas e variações visuais são guardados no armazenamento local; mensagens e arquivos do mock ficam na memória da página.

## Validação e atualização

O workflow `.github/workflows/validate.yml` executa as verificações em pushes para `main` e para a branch do protótipo, além de pull requests. Não precisa de token da Vercel. Ações estão fixadas por SHA e recebem somente permissão de leitura do repositório.

PROPOSTO para próximas entregas: usar uma branch e revisar o resultado dos testes e do preview antes de levar as alterações à `main`. A integração Git da Vercel constrói as atualizações; o workflow é uma verificação independente, não um bloqueio de promoção configurado na Vercel.

Após o deploy, conferir status `READY`, SHA do commit, URL de produção, cabeçalhos, carregamento dos ativos e os três hospedeiros. Não declarar integração real nem compatibilidade com WebViews apenas com base nos testes em Chromium.

Para recuperar uma versão, selecionar uma publicação anterior validada no projeto Vercel e executar o rollback. Depois alinhar `main` por um commit de reversão e publicar novamente; não reescrever o histórico remoto. Um rollback pode desativar a atribuição automática de domínios, exigindo promoção explícita na próxima entrega.

## Limites

Sem monitoramento externo adicionado nesta rodada. Logs de funções não cobrem erros no navegador, e este projeto é estático. CI e testes de navegador verificam os fluxos simulados; testes com alunos, leitores de tela e WebViews reais continuam pendentes.
