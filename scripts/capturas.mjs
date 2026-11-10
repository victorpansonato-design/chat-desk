// Regenera captures/prototipo (dados fictícios). Requer o servidor local: npm run dev
import { chromium } from '@playwright/test';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';

const OUT = 'captures/prototipo';
mkdirSync(OUT, { recursive: true });
for (const f of readdirSync(OUT)) if (f.endsWith('.png')) rmSync(`${OUT}/${f}`);

const browser = await chromium.launch({ channel: 'chrome', args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const errors = [];

async function scene(name, query, steps = async () => {}, viewport = { width: 1440, height: 900 }) {
  const page = await browser.newPage({ viewport });
  page.on('pageerror', (e) => errors.push(`${name}: ${e}`));
  await page.goto(`http://127.0.0.1:5173/${query}`);
  await page.locator('.shell[data-ready] .hero').waitFor({ state: 'attached' });
  await page.waitForTimeout(900);
  await steps(page);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  await page.close();
  console.log('ok', name);
}

const say = async (page, text) => {
  await page.getByRole('textbox', { name: /Mensagem para/ }).fill(text);
  await page.keyboard.press('Enter');
};
const fast = (page) => page.evaluate(() => Object.assign(window.__chatDemo.adapter.config, { queueStepMs: 600, agentReplyMs: 400 }));
const sameConversation = async (page) => {
  await say(page, 'Estou com dúvidas sobre faltas');
  await page.locator('.transcript__list').getByText(/Notas e Faltas/).waitFor();
};

await scene('01-aluno-online-inicio', '');
await scene('02-aplicativo-inicio', '?view=app');
await scene('03-tira-duvidas-inicio', '?view=tira-duvidas');
await scene('04-aluno-online-conversa', '', sameConversation);
await scene('05-aplicativo-conversa', '?view=app', sameConversation);
await scene('06-tira-duvidas-conversa', '?view=tira-duvidas', sameConversation);
await scene('07-aluno-online-expandido', '?size=expanded', sameConversation);
await scene('08-aluno-online-fechado', '?panel=0');
await scene('09-ana-preparando-resposta', '?view=app', async (p) => {
  await say(p, 'Estou com dúvidas sobre faltas');
  await p.locator('.shimmer').waitFor();
  await p.waitForTimeout(900);
});
await scene('10-fila-do-suporte', '?view=app', async (p) => {
  await say(p, 'Quero falar com um atendente');
  await p.getByText(/pessoas na sua frente/).last().waitFor({ timeout: 15000 });
});
await scene('11-atendente-assumiu', '?view=app', async (p) => {
  await fast(p);
  await say(p, 'Quero falar com um atendente');
  await p.locator('.transcript__list').getByText(/Aqui é a Marina/).waitFor({ timeout: 20000 });
});
await scene('12-equipe-pdf-voz-imagem', '?view=app', async (p) => {
  await fast(p);
  await say(p, 'Quero falar com um atendente');
  await p.locator('.transcript__list').getByText(/Aqui é a Marina/).waitFor({ timeout: 20000 });
  for (const t of ['Obrigada', 'Pode explicar?', 'Onde fica?']) {
    await say(p, t);
    await p.waitForTimeout(1500);
  }
  await p.getByRole('button', { name: /Ampliar imagem/ }).waitFor();
});
await scene('13-encerrado-pesquisa', '?view=app', async (p) => {
  await fast(p);
  await say(p, 'Quero falar com um atendente');
  await p.locator('.transcript__list').getByText(/Aqui é a Marina/).waitFor({ timeout: 20000 });
  await p.getByRole('button', { name: 'Encerrar atendimento' }).click();
  await p.getByRole('button', { name: 'Encerrar', exact: true }).click();
  await p.locator('.nps').waitFor();
});
await scene('14-fora-do-expediente', '?view=app&expediente=fora', async (p) => {
  await say(p, 'Quero falar com um atendente');
  await p.getByText(/Pedido registrado · a fila/).waitFor({ timeout: 15000 });
});
await scene('15-redefinir-senha', '?view=app', async (p) => {
  await say(p, 'Esqueci minha senha');
  await p.getByRole('region', { name: 'Redefinir senha' }).waitFor({ timeout: 15000 });
  await p.waitForTimeout(600);
});
await scene('16-senha-redefinida', '', async (p) => {
  await say(p, 'Esqueci minha senha');
  const f = p.getByRole('region', { name: 'Redefinir senha' });
  await f.waitFor({ timeout: 15000 });
  await f.getByLabel('Código recebido por e-mail').fill('123456');
  await f.getByLabel('Nova senha', { exact: true }).fill('senha-ficticia-1');
  await f.getByLabel('Confirmar nova senha').fill('senha-ficticia-1');
  await f.getByRole('button', { name: 'Confirmar' }).click();
  await p.getByRole('region', { name: 'Senha redefinida' }).waitFor();
});
await scene('17-falha-de-envio', '', async (p) => {
  await p.evaluate(() => (window.__chatDemo.adapter.config.failNextSend = true));
  await say(p, 'Onde vejo o calendário acadêmico?');
  await p.locator('.failed').waitFor();
});
await scene('18-gravando-audio', '', async (p) => {
  await p.getByRole('button', { name: 'Gravar mensagem de voz' }).click();
  await p.waitForTimeout(1500);
});
await scene('19-historico-gaveta', '?view=app', async (p) => {
  await p.getByRole('button', { name: /Abrir conversas/ }).click();
});
await scene('20-tema-escuro', '?view=app&theme=dark', sameConversation);
await scene('21-tela-pequena-320', '?view=app', sameConversation, { width: 320, height: 640 });

await browser.close();
if (errors.length) {
  console.error('Erros de página:\n' + errors.join('\n'));
  process.exit(1);
}
