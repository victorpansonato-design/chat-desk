import { describe, expect, it } from 'vitest';
import { deriveTitle, findEmptyConversation, initialState, reducer, sortedConversations } from '../../src/core/reducer';
import { MockAdapter, defaultMockConfig } from '../../src/core/mockAdapter';
import { isSupportOpen, nextOpening, openingLabel, queueText } from '../../src/core/schedule';
import type { ChatState, Conversation, Message } from '../../src/core/types';

const conv = (id: string, extra: Partial<Conversation> = {}): Conversation => ({
  id,
  channel: 'portal',
  attendance: { mode: 'ai' },
  createdAt: 1,
  lastActivity: 1,
  messages: [],
  ...extra,
});

const studentMsg = (conversationId: string, clientId: string, text = 'oi'): Message => ({
  id: clientId,
  clientId,
  conversationId,
  sender: 'student',
  content: { kind: 'text', text },
  createdAt: 10,
  delivery: 'pending',
});

const aiMsg = (conversationId: string, id: string): Message => ({
  id,
  serverId: id,
  conversationId,
  sender: 'ai',
  content: { kind: 'text', text: 'resposta' },
  createdAt: 20,
});

function ready(...convs: Conversation[]): ChatState {
  return reducer(initialState, { type: 'loaded', conversations: convs });
}

describe('envio e deduplicação', () => {
  it('não duplica a mesma tentativa (clientId) nem o mesmo serverId', () => {
    let s = ready(conv('A'));
    s = reducer(s, { type: 'messageAdded', message: studentMsg('A', 'c1'), focused: true });
    s = reducer(s, { type: 'messageAdded', message: studentMsg('A', 'c1'), focused: true });
    s = reducer(s, { type: 'messageAdded', message: aiMsg('A', 's1'), focused: true });
    s = reducer(s, { type: 'messageAdded', message: { ...aiMsg('A', 'outro-id'), serverId: 's1' }, focused: true });
    expect(s.conversations.A.messages).toHaveLength(2);
  });

  it('falha → nova tentativa mantém a mesma mensagem e chega a "enviada" sem cópia', () => {
    let s = ready(conv('A'));
    s = reducer(s, { type: 'messageAdded', message: studentMsg('A', 'c1'), focused: true });
    s = reducer(s, { type: 'messageFailed', conversationId: 'A', clientId: 'c1', reason: 'network' });
    expect(s.conversations.A.messages[0].delivery).toBe('failed');
    s = reducer(s, { type: 'messageRetry', conversationId: 'A', clientId: 'c1' });
    expect(s.conversations.A.messages[0].delivery).toBe('pending');
    s = reducer(s, { type: 'messageSent', conversationId: 'A', clientId: 'c1', serverId: 'srv1', createdAt: 11 });
    expect(s.conversations.A.messages).toHaveLength(1);
    expect(s.conversations.A.messages[0]).toMatchObject({ delivery: 'sent', serverId: 'srv1' });
  });

  it('confirmação tardia não reverte uma mensagem já enviada para falha', () => {
    let s = ready(conv('A'));
    s = reducer(s, { type: 'messageAdded', message: studentMsg('A', 'c1'), focused: true });
    s = reducer(s, { type: 'messageSent', conversationId: 'A', clientId: 'c1', serverId: 'x', createdAt: 1 });
    s = reducer(s, { type: 'messageFailed', conversationId: 'A', clientId: 'c1', reason: 'network' });
    expect(s.conversations.A.messages[0].delivery).toBe('sent');
  });
});

describe('isolamento entre conversas', () => {
  it('resposta atrasada da conversa A não aparece em B e conta como não lida em A', () => {
    let s = ready(conv('A'), conv('B'));
    s = reducer(s, { type: 'messageAdded', message: aiMsg('A', 'late'), focused: false });
    expect(s.conversations.A.messages).toHaveLength(1);
    expect(s.conversations.B.messages).toHaveLength(0);
    expect(s.unread.A).toBe(1);
    expect(s.unread.B).toBeUndefined();
    s = reducer(s, { type: 'markRead', conversationId: 'A' });
    expect(s.unread.A).toBeUndefined();
  });

  it('evento de conversa desconhecida é ignorado', () => {
    const s0 = ready(conv('A'));
    const s1 = reducer(s0, { type: 'messageAdded', message: aiMsg('Z', 'z'), focused: true });
    expect(s1).toBe(s0);
  });

  it('rascunhos são independentes por conversa', () => {
    let s = ready(conv('A'), conv('B'));
    s = reducer(s, { type: 'draft', key: 'A', patch: { text: 'rascunho A' } });
    s = reducer(s, { type: 'draft', key: 'B', patch: { text: 'rascunho B' } });
    expect(s.drafts.A.text).toBe('rascunho A');
    expect(s.drafts.B.text).toBe('rascunho B');
  });
});

describe('atendimento e encerramento', () => {
  it('encerrada não aceita envio do aluno e não reabre', () => {
    let s = ready(conv('A', { attendance: { mode: 'closed', closedAt: 5 } }));
    s = reducer(s, { type: 'messageAdded', message: studentMsg('A', 'c9'), focused: true });
    expect(s.conversations.A.messages).toHaveLength(0);
    s = reducer(s, { type: 'attendance', conversationId: 'A', attendance: { mode: 'ai' } });
    expect(s.conversations.A.attendance.mode).toBe('closed');
  });

  it('encerrar durante envio converge para falha explícita (sem "enviada" falsa)', () => {
    let s = ready(conv('A', { attendance: { mode: 'agent', agent: { name: 'Marina', role: 'Equipe' } } }));
    s = reducer(s, { type: 'messageAdded', message: studentMsg('A', 'c1'), focused: true });
    s = reducer(s, { type: 'typing', conversationId: 'A', typing: { who: 'agent', name: 'Marina' } });
    s = reducer(s, { type: 'attendance', conversationId: 'A', attendance: { mode: 'closed', closedAt: 9 } });
    expect(s.conversations.A.messages[0]).toMatchObject({ delivery: 'failed', failReason: 'closed' });
    expect(s.typing.A).toBe(false);
    // reenvio não é permitido em conversa encerrada
    s = reducer(s, { type: 'messageRetry', conversationId: 'A', clientId: 'c1' });
    expect(s.conversations.A.messages[0].delivery).toBe('failed');
  });

  it('nova conversa: reutiliza a local vazia e não lista conversas vazias', () => {
    let s = ready(conv('A', { lastActivity: 5, messages: [aiMsg('A', 'm')] }));
    s = reducer(s, { type: 'conversationCreated', conversation: conv('local-1', { local: true }) });
    expect(findEmptyConversation(s)?.id).toBe('local-1');
    expect(sortedConversations(s).map((c) => c.id)).toEqual(['A']);
  });

  it('título deriva do primeiro texto do aluno, não da última mensagem', () => {
    const c = conv('A', {
      messages: [studentMsg('A', 'c1', 'Como pedir declaração?'), { ...aiMsg('A', 'n'), content: { kind: 'nps', question: 'De 0 a 10…' } }],
    });
    expect(deriveTitle(c)).toBe('Como pedir declaração?');
  });
});

describe('adapter mock', () => {
  it('é idempotente por clientId: reenvio não gera nova resposta', async () => {
    const mock = new MockAdapter({ ...defaultMockConfig(), replyLatencyMs: 10, autoAgent: false });
    const events: string[] = [];
    mock.subscribe((e) => e.type === 'message' && events.push(e.message.sender));
    await mock.createConversation('portal', 'X');
    const r1 = await mock.sendMessage('X', 'cli-1', { kind: 'text', text: 'oi' });
    const r2 = await mock.sendMessage('X', 'cli-1', { kind: 'text', text: 'oi' });
    expect(r2).toEqual(r1);
    await new Promise((r) => setTimeout(r, 80));
    expect(events.filter((s) => s === 'ai')).toHaveLength(1);
  });

  it('falha configurada vale uma vez', async () => {
    const mock = new MockAdapter({ ...defaultMockConfig(), replyLatencyMs: 10, failNextSend: true, autoAgent: false });
    await mock.createConversation('portal', 'X');
    await expect(mock.sendMessage('X', 'a', { kind: 'text', text: 'oi' })).rejects.toThrow();
    await expect(mock.sendMessage('X', 'a', { kind: 'text', text: 'oi' })).resolves.toBeTruthy();
  });

  it('rota indisponível não coloca a conversa em espera', async () => {
    const mock = new MockAdapter({ ...defaultMockConfig(), handover: 'unavailable' });
    await mock.createConversation('portal', 'X');
    await expect(mock.requestHandover('X')).resolves.toBe('unavailable');
    expect(mock.attendanceOf('X')).toBe('ai');
  });

  it('atendente só entra quando a conversa está em espera', async () => {
    const mock = new MockAdapter({ ...defaultMockConfig(), autoAgent: false });
    await mock.createConversation('portal', 'X');
    expect(mock.agentJoin('X')).toBe(false);
    await mock.requestHandover('X');
    expect(mock.attendanceOf('X')).toBe('queued');
    expect(mock.agentJoin('X')).toBe(true);
    expect(mock.attendanceOf('X')).toBe('agent');
  });
});

describe('rodada 2: fila, expediente, senha e indicador', () => {
  it('o "pensando" da Ana some quando a conversa vai para a fila', () => {
    let s = ready(conv('A'));
    s = reducer(s, { type: 'typing', conversationId: 'A', typing: { who: 'ai', label: 'Lendo sua mensagem' } });
    s = reducer(s, { type: 'attendance', conversationId: 'A', attendance: { mode: 'queued', queue: 'Suporte ao Aluno', ahead: 2 } });
    expect(s.typing.A).toBe(false);
    s = reducer(s, { type: 'typing', conversationId: 'A', typing: { who: 'ai', label: 'x' } });
    expect(s.typing.A).toBe(false);
  });

  it('reversão para a IA só vale a partir de "encaminhando"', () => {
    let s = ready(conv('A', { attendance: { mode: 'agent', agent: { name: 'Marina', role: 'Suporte ao Aluno' } } }));
    s = reducer(s, { type: 'attendance', conversationId: 'A', attendance: { mode: 'ai' }, onlyFrom: 'requesting' });
    expect(s.conversations.A.attendance.mode).toBe('agent');
  });

  it('troca de ID pelo servidor migra conversa, rascunho e não lidas', () => {
    let s = ready(conv('local', { local: true, messages: [studentMsg('local', 'c1')] }));
    s = reducer(s, { type: 'draft', key: 'local', patch: { text: 'rascunho' } });
    s = reducer(s, { type: 'conversationRenamed', from: 'local', to: 'srv-9' });
    expect(s.conversations.local).toBeUndefined();
    expect(s.conversations['srv-9'].messages[0].conversationId).toBe('srv-9');
    expect(s.drafts['srv-9'].text).toBe('rascunho');
  });

  it('fila informa a posição e a atendente só assume a partir da fila', async () => {
    const mock = new MockAdapter({ ...defaultMockConfig(), queueStepMs: 15, agentReplyMs: 5 });
    const seen: string[] = [];
    mock.subscribe((e) => e.type === 'attendance' && seen.push(e.attendance.mode === 'queued' ? 'q' + e.attendance.ahead : e.attendance.mode));
    await mock.createConversation('portal', 'X');
    await expect(mock.requestHandover('X')).resolves.toBe('accepted');
    await new Promise((r) => setTimeout(r, 120));
    expect(seen).toEqual(['requesting', 'q2', 'q1', 'q0', 'agent']);
    mock.dispose();
  });

  it('pedidos simultâneos geram um único encaminhamento', async () => {
    const mock = new MockAdapter({ ...defaultMockConfig(), autoAgent: false });
    let events = 0;
    mock.subscribe((e) => e.type === 'message' && events++);
    await mock.createConversation('portal', 'X');
    await Promise.all([mock.requestHandover('X'), mock.requestHandover('X')]);
    expect(events).toBe(1);
  });

  it('fora do expediente registra o pedido e permite cancelar', async () => {
    const mock = new MockAdapter({ ...defaultMockConfig(), hours: 'closed' });
    await mock.createConversation('portal', 'X');
    await expect(mock.requestHandover('X')).resolves.toBe('scheduled');
    expect(mock.attendanceOf('X')).toBe('scheduled');
    await mock.cancelHandover('X');
    expect(mock.attendanceOf('X')).toBe('ai');
  });

  it('encerrar durante o encaminhamento não reabre a conversa', async () => {
    const mock = new MockAdapter({ ...defaultMockConfig(), autoAgent: false });
    await mock.createConversation('portal', 'X');
    const p = mock.requestHandover('X');
    mock.closeByService('X');
    await p;
    expect(mock.attendanceOf('X')).toBe('closed');
  });

  it('expediente: próxima abertura e textos', () => {
    const sat = new Date(2026, 10, 7, 15, 0); // sábado, 15h
    expect(isSupportOpen(sat)).toBe(false);
    const opens = nextOpening(sat);
    expect(opens.getDay()).toBe(1);
    expect(openingLabel(opens, sat)).toBe('segunda-feira (09/11), às 08:00');
    expect(openingLabel(nextOpening(new Date(2026, 10, 9, 23, 0)), new Date(2026, 10, 9, 23, 0))).toBe('amanhã (10/11), às 08:00');
    expect(queueText('Suporte ao Aluno', 0)).toContain('você é a próxima pessoa a ser atendida');
  });
});
