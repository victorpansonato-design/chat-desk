import { AGENT_AUTHOR, AI_AUTHOR, DEMO_PRINT_URL, NPS_QUESTION, STUDENT_EMAIL_MASKED, STUDENT_NAME, buildFixtures } from './fixtures';
import { aiAnswers } from './reducer';
import { SUPPORT_QUEUE, isSupportOpen, nextOpening, outOfHoursText, queueText, transferText } from './schedule';
import { isPasswordReset } from './types';
import type {
  AdapterEvent,
  Attendance,
  ChatAdapter,
  Content,
  Conversation,
  ConversationEvent,
  FormResult,
  HandoverResult,
  Message,
  SendResult,
} from './types';

/**
 * Adapter MOCK — nenhuma operação real. Atrasos e falhas são determinísticos (nunca sorteados).
 * Com `autoAgent`, o roteiro do Suporte ao Aluno anda sozinho: a fila avança, a atendente
 * fictícia assume e responde, para que o ciclo completo seja revisável sem painel de controle.
 */
export interface MockConfig {
  /** Tempo total em que a Ana "pensa" antes de responder. */
  replyLatencyMs: number;
  /** Atraso extra aplicado apenas à PRÓXIMA resposta (resposta lenta; atraso entre conversas). */
  nextReplyDelayMs: number;
  failNextSend: boolean;
  failNextUpload: boolean;
  failNextNps: boolean;
  failNextForm: boolean;
  /** Disponibilidade da rota humana. */
  handover: 'available' | 'unavailable' | 'error';
  /** Expediente do Suporte ao Aluno: fixo (demonstração) ou pelo relógio do dispositivo. */
  hours: 'open' | 'closed' | 'clock';
  session: 'ok' | 'error';
  /** Roteiro automático da fila e da atendente fictícia. */
  autoAgent: boolean;
  queueStepMs: number;
  agentReplyMs: number;
}

export const defaultMockConfig = (): MockConfig => ({
  replyLatencyMs: 2600,
  nextReplyDelayMs: 0,
  failNextSend: false,
  failNextUpload: false,
  failNextNps: false,
  failNextForm: false,
  handover: 'available',
  hours: 'open',
  session: 'ok',
  autoAgent: true,
  queueStepMs: 3200,
  agentReplyMs: 1900,
});

export class MockError extends Error {
  constructor(public reason: 'network' | 'closed' | 'session') {
    super(reason);
  }
}

const WANTS_HUMAN = /(humano|atendente|pessoa|algu[eé]m da equipe|suporte ao aluno)/i;
const WANTS_PASSWORD = /(senha|n[aã]o consigo (entrar|acessar)|recuperar (o )?acesso)/i;
const WANTS_CANCEL = /cancel/i;
const WANTS_END = /^\s*(quero |pode |por favor,? )?(encerrar|finalizar)( o| meu)?( atendimento| a conversa| chat)?[.! ]*$/i;

/**
 * Etapas exibidas enquanto a Ana prepara a resposta (PROPOSTO). No real, cada rótulo deve
 * corresponder a uma etapa verdadeira do serviço; aqui seguem o assunto da pergunta.
 */
export function thinkingStages(content: Content): string[] {
  if (content.kind === 'attachment') return ['Recebendo o arquivo', 'Lendo o arquivo', 'Escrevendo a resposta'];
  if (content.kind === 'audio') return ['Ouvindo sua mensagem', 'Escrevendo a resposta'];
  const text = content.kind === 'text' ? content.text.toLowerCase() : '';
  const middle = WANTS_PASSWORD.test(text)
    ? ['Verificando seu cadastro', 'Enviando o código de verificação']
    : WANTS_HUMAN.test(text)
      ? ['Verificando o Suporte ao Aluno']
      : /falta|frequ[eê]ncia/.test(text)
        ? ['Consultando sua frequência', 'Conferindo o regulamento acadêmico']
        : /declara|document|hist[oó]rico|atestado/.test(text)
          ? ['Consultando a Secretaria']
          : /boleto|mensalidade|pagamento|financeir/.test(text)
            ? ['Consultando o Financeiro']
            : /calend[aá]rio|prova|recesso/.test(text)
              ? ['Consultando o calendário acadêmico']
              : /hor[aá]rio|aula|sala/.test(text)
                ? ['Consultando sua grade de aulas']
                : /^(oi|ol[aá]|bom dia|boa tarde|boa noite)(?![a-zà-ú])/.test(text)
                  ? []
                  : ['Buscando nas informações da UniAnchieta'];
  return ['Lendo sua mensagem', ...middle, 'Escrevendo a resposta'];
}

export class MockAdapter implements ChatAdapter {
  private listeners = new Set<(ev: AdapterEvent) => void>();
  private server = new Map<string, Conversation>();
  private processed = new Map<string, SendResult>();
  private inFlight = new Map<string, Promise<SendResult>>();
  private handovers = new Map<string, Promise<HandoverResult>>();
  /** Última execução de resposta da IA por conversa: só ela fala (evita respostas concorrentes). */
  private runs = new Map<string, number>();
  private agentChain = new Map<string, Promise<void>>();
  private agentStep = new Map<string, number>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private disposed = false;
  private counter = 0;

  constructor(public config: MockConfig = defaultMockConfig(), now = Date.now()) {
    for (const c of buildFixtures(now)) this.server.set(c.id, structuredClone(c));
  }

  /** Cancela temporizadores pendentes (testes e desmontagem). */
  dispose() {
    this.disposed = true;
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
    this.listeners.clear();
  }

  private wait(ms: number) {
    return new Promise<void>((resolve) => {
      const t = setTimeout(() => {
        this.timers.delete(t);
        resolve();
      }, ms);
      this.timers.add(t);
    });
  }

  private later(ms: number, fn: () => void) {
    const t = setTimeout(() => {
      this.timers.delete(t);
      if (!this.disposed) fn();
    }, ms);
    this.timers.add(t);
  }

  subscribe(listener: (ev: AdapterEvent) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(ev: AdapterEvent) {
    if (this.disposed) return;
    const c = this.server.get(ev.conversationId);
    if (ev.type === 'attendance') {
      // Encerrada nunca reabre: nenhuma transição tardia sobrescreve o estado final
      if (!c || c.attendance.mode === 'closed') return;
      c.attendance = ev.attendance;
    }
    if (ev.type === 'message') {
      if (!c) return;
      c.messages.push(ev.message);
    }
    for (const l of this.listeners) l(ev);
  }

  private nextId(prefix: string) {
    this.counter += 1;
    return `${prefix}-${Date.now().toString(36)}-${this.counter}`;
  }

  private modeOf(id: string): Attendance['mode'] | undefined {
    return this.server.get(id)?.attendance.mode;
  }

  private supportOpen(): boolean {
    if (this.config.hours === 'clock') return isSupportOpen(new Date());
    return this.config.hours === 'open';
  }

  async loadConversations(): Promise<Conversation[]> {
    await this.wait(350);
    if (this.config.session === 'error') throw new MockError('session');
    return [...this.server.values()].map((c) => structuredClone(c));
  }

  async createConversation(channel: Conversation['channel'], localId: string) {
    await this.wait(120);
    if (!this.server.has(localId)) {
      this.server.set(localId, {
        id: localId,
        channel,
        attendance: { mode: 'ai' },
        createdAt: Date.now(),
        lastActivity: Date.now(),
        messages: [],
      });
    }
    return { id: localId };
  }

  sendMessage(conversationId: string, clientId: string, content: Content): Promise<SendResult> {
    // Idempotência: mesma tentativa (clientId) devolve o mesmo resultado, concluída ou em andamento
    const done = this.processed.get(clientId);
    if (done) return Promise.resolve(done);
    const running = this.inFlight.get(clientId);
    if (running) return running;
    const p = this.doSend(conversationId, clientId, content).finally(() => this.inFlight.delete(clientId));
    this.inFlight.set(clientId, p);
    return p;
  }

  private async doSend(conversationId: string, clientId: string, content: Content): Promise<SendResult> {
    const isUpload = content.kind === 'attachment' || content.kind === 'audio';
    if (isUpload) {
      for (const p of [0.2, 0.45, 0.7, 0.9]) {
        await this.wait(240);
        if (this.modeOf(conversationId) === 'closed') throw new MockError('closed');
        this.emit({ type: 'progress', conversationId, messageId: clientId, progress: p });
      }
      if (this.config.failNextUpload) {
        this.config.failNextUpload = false;
        throw new MockError('network');
      }
    } else {
      await this.wait(420);
    }
    if (this.config.failNextSend) {
      this.config.failNextSend = false;
      throw new MockError('network');
    }
    const conv = this.server.get(conversationId);
    if (!conv) throw new MockError('network');
    if (conv.attendance.mode === 'closed') throw new MockError('closed');

    const result = { serverId: this.nextId('srv'), createdAt: Date.now() };
    this.processed.set(clientId, result);
    void this.afterStudentMessage(conv, content);
    return result;
  }

  // ——— Ana (assistente) ———

  private async afterStudentMessage(conv: Conversation, content: Content) {
    // RELATADO (print de 10/11/2026): ao pedir para encerrar, o chat fecha o atendimento e envia a pesquisa 0–10
    if (content.kind === 'text' && WANTS_END.test(content.text)) {
      await this.wait(500);
      if (conv.attendance.mode === 'closed') return;
      this.say(conv.id, `Tudo bem, ${STUDENT_NAME}. Vou encerrar este atendimento. Se precisar de algo mais, é só iniciar uma nova conversa.`);
      await this.wait(700);
      this.closeByService(conv.id, true);
      return;
    }
    if (conv.attendance.mode === 'agent') {
      if (this.config.autoAgent) this.agentReply(conv.id);
      return;
    }
    if (!aiAnswers(conv.attendance)) return; // na fila, a equipe lê tudo quando assumir

    const run = (this.runs.get(conv.id) ?? 0) + 1;
    this.runs.set(conv.id, run);
    const current = () => this.runs.get(conv.id) === run;
    const live = () => current() && aiAnswers(conv.attendance);
    /** Só quem ainda é a execução vigente limpa o indicador; uma mais nova passa a ser dona dele. */
    const stop = () => {
      if (current()) this.emit({ type: 'typing', conversationId: conv.id, typing: false });
    };

    const extra = this.config.nextReplyDelayMs;
    this.config.nextReplyDelayMs = 0;
    const stages = thinkingStages(content);
    const per = this.config.replyLatencyMs / stages.length;
    for (const label of stages) {
      if (!live()) return stop();
      this.emit({ type: 'typing', conversationId: conv.id, typing: { who: 'ai', label } });
      await this.wait(per);
    }
    if (extra > 0 && live()) {
      this.emit({ type: 'typing', conversationId: conv.id, typing: { who: 'ai', label: 'Ainda estou verificando, só mais um instante', slow: true } });
      await this.wait(extra);
    }
    if (!live()) return stop();
    stop();

    const text = content.kind === 'text' ? content.text : '';
    if (conv.attendance.mode === 'scheduled' && WANTS_CANCEL.test(text)) {
      await this.cancelHandover(conv.id);
      return;
    }
    if (WANTS_HUMAN.test(text)) {
      if (conv.attendance.mode === 'scheduled') {
        this.say(conv.id, 'Seu pedido já está registrado: quando o expediente abrir, sua conversa entra na fila do Suporte ao Aluno. Até lá, sigo por aqui com você.');
        return;
      }
      if (this.config.handover === 'available' && this.supportOpen()) {
        this.say(
          conv.id,
          `Certo, ${STUDENT_NAME}. Vou chamar a equipe do Suporte ao Aluno.\n\nNão precisa fazer mais nada: assim que um atendente estiver disponível, ele continuará a conversa por aqui.`,
        );
      }
      await this.requestHandover(conv.id).catch(() => {
        this.event(conv.id, 'handover-failed', 'Não foi possível chamar a equipe agora. Sua conversa continua aqui; tente novamente em instantes.');
      });
      return;
    }
    if (WANTS_PASSWORD.test(text)) {
      this.say(
        conv.id,
        `Olá, ${STUDENT_NAME}! Tudo bem?\n\nEnviei um código de verificação para o seu e-mail (${STUDENT_EMAIL_MASKED}). Ele é válido por 10 minutos.\n\nPor favor, preencha o formulário abaixo com o código e a sua nova senha. A nova senha valerá também para o acesso ao AVA.`,
      );
      const id = this.nextId('form');
      this.emit({
        type: 'message',
        conversationId: conv.id,
        message: {
          id,
          serverId: id,
          conversationId: conv.id,
          sender: 'ai',
          author: AI_AUTHOR,
          content: { kind: 'form', formType: 'password-reset', payload: { emailMasked: STUDENT_EMAIL_MASKED, validUntil: Date.now() + 10 * 60_000 } },
          createdAt: Date.now(),
          form: { status: 'idle' },
          demo: true,
        },
      });
      return;
    }
    this.say(conv.id, replyFor(content), true);
  }

  private say(conversationId: string, text: string, rateable = false, extra: Partial<Message> = {}) {
    const id = this.nextId('ai');
    this.emit({
      type: 'message',
      conversationId,
      message: {
        id,
        serverId: id,
        conversationId,
        sender: 'ai',
        author: AI_AUTHOR,
        content: { kind: 'text', text },
        createdAt: Date.now(),
        rating: rateable ? { status: 'idle' } : undefined,
        demo: true,
        ...extra,
      },
    });
  }

  private event(conversationId: string, event: ConversationEvent, text: string) {
    const id = this.nextId('evt');
    this.emit({
      type: 'message',
      conversationId,
      message: { id, serverId: id, conversationId, sender: 'system', content: { kind: 'event', event, text }, createdAt: Date.now() },
    });
  }

  private setAttendance(conversationId: string, attendance: Attendance) {
    this.emit({ type: 'attendance', conversationId, attendance });
  }

  // ——— Suporte ao Aluno (rota humana) ———

  requestHandover(conversationId: string): Promise<HandoverResult> {
    const running = this.handovers.get(conversationId);
    if (running) return running; // clique duplo ou pedido por texto + botão: um único encaminhamento
    const p = this.doHandover(conversationId).finally(() => this.handovers.delete(conversationId));
    this.handovers.set(conversationId, p);
    return p;
  }

  private async doHandover(conversationId: string): Promise<HandoverResult> {
    const start = this.modeOf(conversationId);
    if (start === 'queued' || start === 'agent') return 'accepted';
    if (start === 'scheduled') return 'scheduled';
    if (start !== 'ai' && start !== 'requesting') return 'unavailable';
    if (start === 'ai') this.setAttendance(conversationId, { mode: 'requesting' });
    await this.wait(800);
    // Revalida depois da espera: a conversa pode ter sido encerrada nesse intervalo
    if (this.modeOf(conversationId) !== 'requesting') return 'unavailable';

    if (this.config.handover === 'error') {
      this.setAttendance(conversationId, { mode: 'ai' });
      throw new MockError('network');
    }
    if (this.config.handover === 'unavailable') {
      this.setAttendance(conversationId, { mode: 'ai' });
      this.event(conversationId, 'handover-unavailable', 'No momento, não é possível chamar a equipe por aqui. Você pode continuar com a Ana ou tentar novamente mais tarde.');
      return 'unavailable';
    }
    if (!this.supportOpen()) {
      const now = new Date();
      const opens = nextOpening(now);
      this.setAttendance(conversationId, { mode: 'scheduled', queue: SUPPORT_QUEUE, opensAt: opens.getTime() });
      this.say(conversationId, outOfHoursText(opens, now), false, {
        actions: [
          { id: 'continue-ai', label: 'Continuar com a IA' },
          { id: 'cancel-request', label: 'Cancelar pedido' },
        ],
      });
      return 'scheduled';
    }
    this.enterQueue(conversationId);
    return 'accepted';
  }

  private enterQueue(conversationId: string) {
    const ahead = 2;
    this.setAttendance(conversationId, { mode: 'queued', queue: SUPPORT_QUEUE, ahead });
    this.event(conversationId, 'handover-queued', queueText(SUPPORT_QUEUE, ahead));
    if (this.config.autoAgent) this.advanceQueue(conversationId);
  }

  private advanceQueue(conversationId: string) {
    this.later(this.config.queueStepMs, () => {
      const c = this.server.get(conversationId);
      if (!c || c.attendance.mode !== 'queued') return;
      if (c.attendance.ahead > 0) {
        this.setAttendance(conversationId, { ...c.attendance, ahead: c.attendance.ahead - 1 });
        this.advanceQueue(conversationId);
      } else {
        this.agentJoin(conversationId);
      }
    });
  }

  async cancelHandover(conversationId: string) {
    await this.wait(400);
    if (this.modeOf(conversationId) !== 'scheduled') return;
    this.setAttendance(conversationId, { mode: 'ai' });
    this.say(conversationId, 'Pronto, cancelei o pedido de atendimento. Sigo por aqui com você: é só escrever.');
  }

  /** O expediente abriu: pedidos registrados entram na fila (demonstração). */
  openQueueForScheduled() {
    for (const c of this.server.values()) {
      if (c.attendance.mode === 'scheduled') this.enterQueue(c.id);
    }
  }

  agentJoin(conversationId: string) {
    if (this.modeOf(conversationId) !== 'queued') return false;
    this.setAttendance(conversationId, { mode: 'agent', agent: AGENT_AUTHOR });
    this.event(conversationId, 'agent-joined', transferText(AGENT_AUTHOR.name));
    if (this.config.autoAgent) {
      this.agentSpeak(conversationId, [
        { kind: 'text', text: `Olá, ${STUDENT_NAME}! Aqui é a ${AGENT_AUTHOR.name}, do Suporte ao Aluno. Li a sua conversa com a Ana e já vou te ajudar.` },
      ]);
    }
    return true;
  }

  /** Roteiro fictício: mostra como texto, PDF, voz, imagem e emoji da equipe aparecem para o aluno. */
  private agentReply(conversationId: string) {
    const step = this.agentStep.get(conversationId) ?? 0;
    this.agentStep.set(conversationId, step + 1);
    const script: Content[][] = [
      [
        { kind: 'text', text: 'Entendi. Já estou verificando isso para você.' },
        { kind: 'attachment', file: { name: 'orientacoes-suporte-ao-aluno.pdf', size: 184_320, mime: 'application/pdf' } },
      ],
      [{ kind: 'audio', durationSec: 14 }],
      [
        { kind: 'attachment', file: { name: 'onde-encontrar.png', size: 96_256, mime: 'image/png', previewUrl: DEMO_PRINT_URL, width: 640, height: 400 } },
        { kind: 'text', text: '😊' },
      ],
    ];
    this.agentSpeak(
      conversationId,
      script[step] ?? [{ kind: 'text', text: 'Certo! Se precisar de mais alguma coisa, é só escrever. Quando terminar, você pode encerrar o atendimento aqui embaixo.' }],
    );
  }

  private agentSpeak(conversationId: string, contents: Content[]) {
    const run = async () => {
      for (const content of contents) {
        if (this.modeOf(conversationId) !== 'agent') return;
        this.emit({ type: 'typing', conversationId, typing: { who: 'agent', name: AGENT_AUTHOR.name } });
        await this.wait(this.config.agentReplyMs);
        this.emit({ type: 'typing', conversationId, typing: false });
        if (this.modeOf(conversationId) !== 'agent') return;
        this.pushAgent(conversationId, content);
      }
    };
    const chain = (this.agentChain.get(conversationId) ?? Promise.resolve()).then(run);
    this.agentChain.set(conversationId, chain);
  }

  private pushAgent(conversationId: string, content: Content) {
    const id = this.nextId('agt');
    this.emit({
      type: 'message',
      conversationId,
      message: { id, serverId: id, conversationId, sender: 'agent', author: AGENT_AUTHOR, content, createdAt: Date.now(), demo: true },
    });
  }

  /** Mensagem avulsa da atendente fictícia (testes e roteiros). */
  agentMessage(conversationId: string, text: string) {
    if (this.modeOf(conversationId) !== 'agent') return false;
    this.pushAgent(conversationId, { kind: 'text', text });
    return true;
  }

  async closeConversation(conversationId: string) {
    await this.wait(450);
    this.closeByService(conversationId);
  }

  sendNps(conversationId: string) {
    if (!this.server.has(conversationId)) return false;
    const id = this.nextId('nps');
    this.emit({
      type: 'message',
      conversationId,
      message: { id, serverId: id, conversationId, sender: 'system', content: { kind: 'nps', question: NPS_QUESTION }, createdAt: Date.now(), nps: { status: 'idle' } },
    });
    return true;
  }

  /** Encerramento (pelo aluno ou pelo serviço). Depois de atendimento humano, segue a pesquisa 0–10. */
  closeByService(conversationId: string, survey = false) {
    const c = this.server.get(conversationId);
    if (!c || c.attendance.mode === 'closed') return false;
    const hadAgent = c.attendance.mode === 'agent';
    this.setAttendance(conversationId, { mode: 'closed', closedAt: Date.now() });
    this.emit({ type: 'typing', conversationId, typing: false });
    this.event(conversationId, 'closed', 'Atendimento encerrado.');
    if (hadAgent || survey) this.sendNps(conversationId);
    return true;
  }

  async submitNps(conversationId: string, _messageId: string, _value: number) {
    await this.wait(600);
    if (this.config.failNextNps) {
      this.config.failNextNps = false;
      throw new MockError('network');
    }
    await this.wait(250);
    this.say(conversationId, 'Obrigada pela sua avaliação! Ela nos ajuda a melhorar o atendimento.', false, { demo: false });
  }

  async rateResponse() {
    await this.wait(350);
  }

  // ——— Redefinição de senha (formulário embutido) ———

  private formOf(conversationId: string, messageId: string) {
    const m = this.server.get(conversationId)?.messages.find((x) => x.id === messageId);
    return m && isPasswordReset(m.content) ? m : undefined;
  }

  /**
   * Só o código chega aqui; a senha digitada não sai do componente.
   * Demonstração: qualquer código de 6 dígitos é aceito, exceto 000000 (código incorreto).
   */
  async submitPasswordReset(conversationId: string, messageId: string, code: string): Promise<FormResult> {
    await this.wait(900);
    if (this.config.failNextForm) {
      this.config.failNextForm = false;
      throw new MockError('network');
    }
    const m = this.formOf(conversationId, messageId);
    if (!m || this.modeOf(conversationId) === 'closed') throw new MockError('closed');
    if (isPasswordReset(m.content) && Date.now() > m.content.payload.validUntil) return 'expired';
    if (!/^\d{6}$/.test(code) || code === '000000') return 'invalid-code';
    m.form = { status: 'done' };
    this.say(conversationId, `Pronto, ${STUDENT_NAME}! Sua senha foi redefinida. Ela já vale para o Aluno Online e para o AVA.\n\nPosso ajudar em mais alguma coisa?`);
    return 'ok';
  }

  async resendCode(conversationId: string, messageId: string) {
    await this.wait(700);
    const m = this.formOf(conversationId, messageId);
    if (!m || this.modeOf(conversationId) === 'closed') throw new MockError('closed');
    const validUntil = Date.now() + 10 * 60_000;
    m.content = { kind: 'form', formType: 'password-reset', payload: { emailMasked: STUDENT_EMAIL_MASKED, validUntil } };
    return { validUntil };
  }

  attendanceOf(conversationId: string): Attendance['mode'] | undefined {
    return this.modeOf(conversationId);
  }
}

function replyFor(content: Content): string {
  if (content.kind === 'attachment') {
    return `Recebi o arquivo “${content.file.name}”. Como posso ajudar com ele?\n\nNeste protótipo, o arquivo não sai do seu dispositivo.`;
  }
  if (content.kind === 'audio') {
    return 'Recebi sua mensagem de voz. Neste protótipo, o áudio não é enviado nem transcrito. Se preferir, você também pode escrever sua dúvida.';
  }
  const text = content.kind === 'text' ? content.text.toLowerCase() : '';
  // Sem \b: em JS ele não reconhece "á" como letra ("olá" falharia)
  if (/^(oi|ol[aá]|bom dia|boa tarde|boa noite)(?![a-zà-ú])/.test(text)) {
    return `Olá, ${STUDENT_NAME}! Eu sou a Ana, assistente da UniAnchieta. Como posso ajudar você hoje?`;
  }
  if (/falta|frequ[eê]ncia/.test(text)) {
    return 'Posso ajudar com isso.\n\nPara acompanhar a sua frequência, vale conferir:\n\n- as faltas lançadas em cada disciplina, em **Notas e Faltas** no Aluno Online;\n- a carga horária de cada disciplina;\n- as orientações da coordenação do seu curso.\n\nSe o seu caso for específico, posso chamar a equipe do Suporte ao Aluno.';
  }
  if (/declara|document|atestado/.test(text)) {
    return 'Você pode solicitar a declaração de matrícula pelo Aluno Online, na área de documentos. Depois do pedido, ela fica disponível para baixar no mesmo lugar.\n\nSe a sua situação for diferente, a equipe do Suporte ao Aluno pode analisar o seu caso.';
  }
  if (/boleto|mensalidade|pagamento|financeir/.test(text)) {
    return 'Os boletos e a situação das mensalidades ficam na área financeira do Aluno Online.\n\nSe precisar negociar ou revisar um valor, posso chamar a equipe do Suporte ao Aluno.';
  }
  if (/calend[aá]rio/.test(text)) {
    return 'O calendário acadêmico oficial fica disponível no Aluno Online. Posso ajudar em mais alguma coisa?';
  }
  if (/hor[aá]rio/.test(text)) {
    return 'Seus horários de aula aparecem na área de horários do Aluno Online.';
  }
  if (/secretaria/.test(text)) {
    return 'Posso te orientar sobre os canais de contato com a secretaria. Se preferir, também posso chamar a equipe do Suporte ao Aluno.';
  }
  return 'Entendi. Neste protótipo eu respondo com textos de exemplo; no atendimento real, a resposta vem das informações oficiais da UniAnchieta.\n\nPosso ajudar em mais alguma coisa?';
}
