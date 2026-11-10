import { expect, test, type Page } from '@playwright/test';

/** Rodada 2: uma tela, um chat, três interfaces. Os cenários seguem docs/09 (Txx). */

const box = (page: Page) => page.getByRole('textbox', { name: /Mensagem para/ });
const log = (page: Page) => page.locator('.transcript__list');
const said = (page: Page, re: RegExp | string) => log(page).getByText(re);

async function open(page: Page, query = '') {
  await page.goto(`/${query}`);
  await expect(page.getByRole('heading', { name: /Como posso ajudar/ })).toBeVisible();
}

async function send(page: Page, text: string) {
  await box(page).fill(text);
  await box(page).press('Enter');
}

/** Ajusta o mock (roteiros ocultos) sem abrir nenhum painel. */
async function demo(page: Page, patch: Record<string, unknown>) {
  await page.evaluate((p) => Object.assign(window.__chatDemo!.adapter.config, p), patch);
}

test('T03/T05 · abre direto na conversa; texto → etapas da Ana → resposta com avaliação 1–5', async ({ page }) => {
  await open(page);
  await expect(page.getByRole('img', { name: 'Grupo Anchieta' }).first()).toBeVisible();
  await expect(box(page)).toBeFocused();
  await expect(page.locator('.suggestion')).toHaveCount(4);
  await send(page, 'Estou com dúvidas sobre faltas');
  await expect(page.getByText('Enviando…')).toBeVisible();
  await expect(page.locator('.shimmer')).toHaveText(/Lendo sua mensagem|Consultando sua frequência|Conferindo o regulamento/);
  await expect(said(page, /Notas e Faltas/)).toBeVisible();
  await expect(page.locator('.thinking')).toHaveCount(0);
  await expect(page.getByText('Enviando…')).toHaveCount(0);
  await page.getByRole('button', { name: 'Nota 4 de 5: Boa' }).click();
  await expect(page.getByText('Avaliação enviada: Boa')).toBeVisible();
});

test('T03/T15 · histórico na gaveta, encerrada somente leitura, nova conversa volta à tela inicial', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: /Abrir conversas/ }).click();
  const drawer = page.getByRole('dialog', { name: 'Conversas' });
  await expect(drawer.locator('.conv-item')).toHaveCount(5);
  await drawer.getByRole('button', { name: /Declaração de matrícula/ }).click();
  await expect(page.getByText('Atendimento encerrado · Somente leitura')).toBeVisible();
  await expect(box(page)).toHaveCount(0);
  await expect(page.getByText('Sua resposta: 10. Obrigada!')).toBeVisible();
  await expect(said(page, /Agora você está falando com Marina, da nossa equipe de atendimento/)).toBeVisible();
  await page.getByRole('button', { name: 'Iniciar nova conversa' }).click();
  await expect(page.getByRole('heading', { name: /Como posso ajudar/ })).toBeVisible();
  await expect(box(page)).toBeVisible();
});

test('T04 · "Nova conversa" repetida não cria conversas vazias', async ({ page }) => {
  await open(page);
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: /Abrir conversas/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Nova conversa' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await page.getByRole('button', { name: /Abrir conversas/ }).click();
  await expect(page.getByRole('dialog').locator('.conv-item')).toHaveCount(5);
});

test('T06 · falha de envio → tentar novamente não duplica; editar devolve o texto', async ({ page }) => {
  await open(page);
  await demo(page, { failNextSend: true });
  await send(page, 'Onde vejo o calendário acadêmico?');
  await expect(page.getByText('Não enviada. Verifique sua conexão.')).toBeVisible();
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(said(page, /calendário acadêmico oficial/)).toBeVisible();
  await expect(log(page).locator('.msg[data-sender="student"]')).toHaveCount(1);

  await demo(page, { failNextSend: true });
  await send(page, 'mensagem com erro');
  await page.getByRole('button', { name: 'Editar' }).click();
  await expect(box(page)).toHaveValue('mensagem com erro');
  await expect(log(page).locator('.msg[data-sender="student"]')).toHaveCount(1);
});

test('T07 · lendo acima: resposta não puxa a rolagem e aparece "Nova mensagem"', async ({ page }) => {
  await open(page);
  await send(page, 'Estou com dúvidas sobre faltas');
  await expect(said(page, /Notas e Faltas/)).toBeVisible();
  await send(page, 'E sobre boleto?');
  await expect(said(page, /área financeira/)).toBeVisible();
  await send(page, 'Como falo com a secretaria?');
  const scroller = page.locator('.transcript__scroll');
  await scroller.evaluate((el) => (el.scrollTop = 0));
  await expect(page.getByRole('button', { name: 'Nova mensagem' })).toBeVisible();
  expect(await scroller.evaluate((el) => el.scrollTop)).toBeLessThan(40);
  await page.getByRole('button', { name: 'Nova mensagem' }).click();
  await expect(page.getByRole('button', { name: 'Nova mensagem' })).toHaveCount(0);
});

test('T08 · resposta atrasada da conversa A não aparece em B e marca não lida', async ({ page }) => {
  await open(page);
  await demo(page, { nextReplyDelayMs: 2500 });
  await send(page, 'Qual é o meu horário de aula?');
  await page.getByRole('button', { name: /Abrir conversas/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Calendário acadêmico/ }).click();
  await expect(page.getByRole('button', { name: /Abrir conversas \(1 mensagem nova\)/ })).toBeVisible({ timeout: 10_000 });
  await expect(said(page, /horários de aula aparecem/)).toHaveCount(0);
});

test('T12/T14/T15 · Ana → fila com posição → Marina assume → conteúdos da equipe → encerrar → pesquisa 0–10', async ({ page }) => {
  await open(page);
  await demo(page, { queueStepMs: 1200, agentReplyMs: 300, failNextNps: true });
  await send(page, 'Como peço uma declaração de matrícula?');
  await expect(said(page, /área de documentos/)).toBeVisible();
  await send(page, 'Quero falar com um atendente');
  await expect(said(page, /Sua conversa está na fila de Suporte ao Aluno e há 2 pessoas na sua frente/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Suporte ao Aluno' })).toBeVisible();
  await expect(page.getByText('Você é a próxima pessoa')).toBeVisible();
  await expect(said(page, 'Sua conversa foi transferida. Agora você está falando com Marina, da nossa equipe de atendimento.')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Marina/ })).toBeVisible();
  await expect(said(page, /Aqui é a Marina, do Suporte ao Aluno/)).toBeVisible();
  await expect(box(page)).toHaveAttribute('placeholder', 'Escreva para Marina');

  await send(page, 'Obrigada!');
  await expect(log(page).getByText('orientacoes-suporte-ao-aluno.pdf')).toBeVisible();
  await send(page, 'Pode explicar?');
  await expect(log(page).getByRole('button', { name: /Ouvir mensagem de voz/ })).toBeVisible();
  await send(page, 'Onde fica?');
  await log(page).getByRole('button', { name: /Ampliar imagem/ }).click();
  await expect(page.getByRole('dialog', { name: /Imagem/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: /Imagem/ })).toHaveCount(0);

  await page.getByRole('button', { name: 'Encerrar atendimento' }).click();
  await page.getByRole('button', { name: 'Encerrar', exact: true }).click();
  await expect(page.getByText('Atendimento encerrado · Somente leitura')).toBeVisible();
  await page.getByRole('button', { name: 'Nota 9', exact: true }).click();
  await expect(page.getByText('Não foi possível registrar sua resposta.')).toBeVisible();
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByText('Sua resposta: 9. Obrigada!')).toBeVisible();
  await expect(box(page)).toHaveCount(0);
});

test('T13 · fora do expediente: pedido registrado, Ana continua, cancelar pedido', async ({ page }) => {
  await open(page, '?expediente=fora');
  await send(page, 'Quero falar com um atendente');
  await expect(said(page, /Nossa equipe não está atendendo agora\. Atendemos segunda a sexta, das 08:00 às 22:00; sábado, das 09:00 às 13:00\./)).toBeVisible();
  await expect(said(page, /Deixei seu pedido registrado: .+ \(\d\d\/\d\d\), às \d\d:00, sua conversa entra na fila/)).toBeVisible();
  await expect(page.getByText(/Pedido registrado · a fila abre/)).toBeVisible();
  await expect(page.getByRole('heading', { name: /Ana/ })).toBeVisible();
  await log(page).getByRole('button', { name: 'Cancelar pedido' }).click();
  await expect(said(page, /cancelei o pedido/)).toBeVisible();
  await expect(page.getByText(/Pedido registrado · a fila abre/)).toHaveCount(0);
});

test('T13b · rota indisponível mantém a conversa com a Ana', async ({ page }) => {
  await open(page);
  await demo(page, { handover: 'unavailable' });
  await send(page, 'Quero falar com um atendente');
  await expect(said(page, /não é possível chamar a equipe/)).toBeVisible();
  await expect(page.getByRole('heading', { name: /Ana/ })).toBeVisible();
});

test('Senha · validação, código incorreto e conclusão', async ({ page }) => {
  await open(page);
  await send(page, 'Esqueci minha senha');
  const form = page.getByRole('region', { name: 'Redefinir senha' });
  await expect(form).toBeVisible({ timeout: 10_000 });
  await form.getByRole('button', { name: 'Confirmar' }).click();
  await expect(form.getByText('Digite os 6 números do código')).toBeVisible();
  await form.getByLabel('Código recebido por e-mail').fill('000 000');
  await form.getByLabel('Nova senha', { exact: true }).fill('curta');
  await form.getByRole('button', { name: 'Confirmar' }).click();
  await expect(form.getByText('A senha deve ter entre 8 e 29 caracteres.')).toBeVisible();
  await form.getByLabel('Nova senha', { exact: true }).fill('senha-ficticia-1');
  await form.getByLabel('Confirmar nova senha').fill('senha-ficticia-2');
  await form.getByRole('button', { name: 'Confirmar' }).click();
  await expect(form.getByText('As duas senhas precisam ser iguais.')).toBeVisible();
  await form.getByLabel('Confirmar nova senha').fill('senha-ficticia-1');
  await form.getByRole('button', { name: 'Mostrar nova senha' }).click();
  await expect(form.getByLabel('Nova senha', { exact: true })).toHaveAttribute('type', 'text');
  await form.getByRole('button', { name: 'Confirmar' }).click();
  await expect(form.getByText('O código não confere.')).toBeVisible();
  await form.getByLabel('Código recebido por e-mail').fill('123456');
  await form.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByRole('region', { name: 'Senha redefinida' })).toBeVisible();
  await expect(said(page, /Sua senha foi redefinida/)).toBeVisible();
  await expect(page.getByLabel('Nova senha', { exact: true })).toHaveCount(0);
});

test('T09 · anexo inválido avisa; válido mostra prévia, remove e envia com progresso', async ({ page }) => {
  await open(page);
  const input = page.locator('input[type="file"]');
  await input.setInputFiles({ name: 'planilha.xlsx', mimeType: 'application/vnd.ms-excel', buffer: Buffer.from('x') });
  await expect(page.getByText('Não foi possível anexar este arquivo.')).toBeVisible();
  await input.setInputFiles({ name: 'comprovante.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 teste') });
  await expect(page.getByRole('list', { name: 'Arquivos para enviar' }).getByText('comprovante.pdf')).toBeVisible();
  await page.getByRole('button', { name: 'Remover comprovante.pdf' }).click();
  await expect(page.getByRole('list', { name: 'Arquivos para enviar' })).toHaveCount(0);
  await input.setInputFiles({ name: 'comprovante.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 teste') });
  await page.getByRole('button', { name: 'Enviar mensagem' }).click();
  await expect(page.getByRole('progressbar', { name: 'Enviando arquivo' })).toBeVisible();
  await expect(said(page, /Recebi o arquivo “comprovante.pdf”/)).toBeVisible({ timeout: 10_000 });
});

test('T10 · microfone negado ou sem suporte não bloqueia o texto', async ({ page }) => {
  await open(page, '?mic=denied');
  await page.getByRole('button', { name: 'Gravar mensagem de voz' }).click();
  await expect(page.getByText('O microfone está desativado.')).toBeVisible();
  await expect(box(page)).toBeEnabled();
  await page.evaluate(() => window.__chatDemo!.setEnv({ mic: 'unsupported' }));
  await page.getByRole('button', { name: 'Fechar aviso' }).click();
  await page.getByRole('button', { name: 'Gravar mensagem de voz' }).click();
  await expect(page.getByText('Gravação de áudio indisponível neste dispositivo.')).toBeVisible();
});

test('T11 · áudio: gravar → revisar → enviar (microfone falso do Chrome)', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Gravar mensagem de voz' }).click();
  await expect(page.getByText('Gravando áudio')).toBeAttached();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Parar e revisar' }).click();
  await page.getByRole('button', { name: 'Enviar áudio' }).click();
  await expect(log(page).getByRole('button', { name: /Ouvir mensagem de voz/ })).toBeVisible();
  await expect(said(page, /Recebi sua mensagem de voz/)).toBeVisible({ timeout: 10_000 });
});

test('T01/T02 · portal: fechar vira o botão, reabrir preserva rascunho; expandir mantém a mesma instância', async ({ page }) => {
  await open(page);
  await box(page).fill('rascunho que não pode sumir');
  await page.getByRole('button', { name: 'Expandir chat' }).click();
  await expect(page.locator('.chat[data-wide]')).toBeVisible();
  await expect(box(page)).toHaveValue('rascunho que não pode sumir');
  await page.getByRole('button', { name: 'Recolher chat' }).click();
  await page.getByRole('button', { name: /Fechar chat/ }).click();
  const launcher = page.getByRole('button', { name: 'Abrir Chat Anchieta' });
  await expect(launcher).toBeFocused();
  await launcher.click();
  await expect(box(page)).toHaveValue('rascunho que não pode sumir');
  await expect(box(page)).toBeFocused();
});

test('T22 · trocar de interface transforma o mesmo chat: conversa e rascunho continuam', async ({ page }) => {
  await open(page);
  await send(page, 'Olá');
  await expect(said(page, /Eu sou a Ana, assistente da UniAnchieta/)).toBeVisible();
  await box(page).fill('continua aqui');
  await page.locator('.chat').evaluate((el) => ((el as HTMLElement).dataset.same = '1'));

  await page.getByRole('button', { name: 'Aplicativo' }).click();
  await expect(page.locator('.shell[data-host="app"]')).toBeVisible();
  await expect(page.getByText('Atendimento', { exact: true })).toBeVisible();
  await expect(box(page)).toHaveValue('continua aqui');
  await expect(page.locator('.chat[data-same="1"]')).toHaveCount(1);

  await page.getByRole('button', { name: 'Tira-Dúvidas' }).click();
  await expect(page.getByRole('heading', { name: 'Tira-Dúvidas' })).toBeVisible();
  await expect(said(page, /Eu sou a Ana/)).toBeVisible();
  await expect(box(page)).toHaveValue('continua aqui');

  await page.getByRole('button', { name: 'Aplicativo' }).click();
  await page.getByRole('button', { name: 'Voltar (controle do aplicativo)' }).click();
  await expect(page.getByRole('heading', { name: /Como posso ajudar/ })).toBeVisible();
});

test('T17 · gaveta: foco contido, Escape fecha e devolve o foco; Shift+Enter quebra linha', async ({ page }) => {
  await open(page);
  const trigger = page.getByRole('button', { name: /Abrir conversas/ });
  await trigger.click();
  const drawer = page.getByRole('dialog', { name: 'Conversas' });
  await expect(drawer.getByRole('button', { name: 'Fechar conversas' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  expect(await drawer.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(drawer).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await box(page).click();
  await page.keyboard.type('linha 1');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.type('linha 2');
  await expect(box(page)).toHaveValue('linha 1\nlinha 2');
  await expect(log(page).locator('.msg')).toHaveCount(0);
});

for (const view of ['portal', 'app', 'tira-duvidas']) {
  test(`T18 · 320 px sem rolagem horizontal (${view})`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await open(page, `?view=${view}`);
    await send(page, 'Preciso de ajuda com um texto bem comprido para verificar a quebra de linha em tela estreita');
    await expect(log(page).locator('.msg[data-sender="ai"]')).toBeVisible({ timeout: 10_000 });
    const overflow = await page.evaluate(() => {
      const chat = document.querySelector('.chat')!;
      return { doc: document.documentElement.scrollWidth - innerWidth, chat: chat.scrollWidth - chat.clientWidth };
    });
    expect(overflow.doc).toBeLessThanOrEqual(0);
    expect(overflow.chat).toBeLessThanOrEqual(0);
    await expect(page.getByRole('button', { name: 'Enviar mensagem' })).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Falar com atendente' })).toHaveCount(0); // sem atalho para o suporte
  });
}

test('T19 · movimento reduzido: fluxo completo sem animações de deslocamento', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  await send(page, 'Olá');
  await expect(said(page, /Eu sou a Ana/)).toBeVisible();
  const anim = await page.locator('.msg[data-sender="ai"]').evaluate((el) => getComputedStyle(el).animationDuration);
  expect(parseFloat(anim)).toBeLessThan(0.01);
  await page.getByRole('button', { name: 'Aplicativo' }).click();
  await expect(page.locator('.shell[data-host="app"]')).toBeVisible();
});

test('Sessão · falha de carregamento oferece nova tentativa', async ({ page }) => {
  await page.goto('/?sessao=erro');
  await expect(page.getByText('Não foi possível carregar o atendimento agora.')).toBeVisible();
  await demo(page, { session: 'ok' });
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('heading', { name: /Como posso ajudar/ })).toBeVisible();
});

test('Encerrar por texto · a Ana encerra e envia a pesquisa 0–10', async ({ page }) => {
  await open(page);
  await send(page, 'Olá');
  await expect(said(page, /Eu sou a Ana/)).toBeVisible();
  await send(page, 'Encerrar atendimento');
  await expect(said(page, /Vou encerrar este atendimento/)).toBeVisible();
  await expect(page.getByText('Atendimento encerrado · Somente leitura')).toBeVisible();
  await page.getByRole('button', { name: 'Nota 10', exact: true }).click();
  await expect(page.getByText('Sua resposta: 10. Obrigada!')).toBeVisible();
});

test('Aplicativo · simulador de toque: arrastar rola, a roda não rola, arrasto não vira clique', async ({ page }) => {
  await open(page, '?view=app');
  await page.getByRole('button', { name: /Abrir conversas/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Declaração de matrícula/ }).click();
  const scroller = page.locator('.transcript__scroll');
  await expect(page.getByText('Atendimento encerrado · Somente leitura')).toBeVisible();
  const bottom = await scroller.evaluate((el) => el.scrollTop);
  expect(bottom).toBeGreaterThan(100);
  const b = (await scroller.boundingBox())!;
  const x = b.x + b.width / 2;
  await page.mouse.move(x, b.y + 80);
  await page.mouse.down();
  await page.mouse.move(x, b.y + 260, { steps: 8 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  const dragged = await scroller.evaluate((el) => el.scrollTop);
  expect(dragged).toBeLessThan(bottom - 100);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(200);
  expect(await scroller.evaluate((el) => el.scrollTop)).toBe(dragged);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
