import type { Attendance, ChatState, Conversation, Draft, Message, PendingAttachment, Typing } from './types';

export type Action =
  | { type: 'loaded'; conversations: Conversation[] }
  | { type: 'loadFailed' }
  | { type: 'loading' }
  | { type: 'draft'; key: string; patch: Partial<Draft> }
  | { type: 'draftClear'; key: string }
  /** Atualizações funcionais dos anexos: não dependem de uma cópia antiga do rascunho. */
  | { type: 'draftAttach'; key: string; attachment: PendingAttachment }
  | { type: 'draftDetach'; key: string; id: string }
  | { type: 'conversationCreated'; conversation: Conversation }
  | { type: 'conversationConfirmed'; id: string }
  /** O servidor devolveu um ID diferente do local: migra a conversa e tudo que é indexado por ela. */
  | { type: 'conversationRenamed'; from: string; to: string }
  | { type: 'messageAdded'; message: Message; focused: boolean }
  | { type: 'messageSent'; conversationId: string; clientId: string; serverId: string; createdAt: number }
  | { type: 'messageFailed'; conversationId: string; clientId: string; reason: 'network' | 'closed' }
  | { type: 'messageRetry'; conversationId: string; clientId: string }
  | { type: 'messageRemoved'; conversationId: string; id: string }
  | { type: 'messagePatch'; conversationId: string; messageId: string; patch: Partial<Message> }
  | { type: 'progress'; conversationId: string; messageId: string; progress: number }
  | { type: 'typing'; conversationId: string; typing: Typing }
  /** `onlyFrom`: aplica só se o modo atual for esse (evita regressão com respostas fora de ordem). */
  | { type: 'attendance'; conversationId: string; attendance: Attendance; onlyFrom?: Attendance['mode'] }
  | { type: 'markRead'; conversationId: string };

export const initialState: ChatState = {
  status: 'loading',
  conversations: {},
  drafts: {},
  typing: {},
  unread: {},
};

export const emptyDraft: Draft = { text: '', attachments: [] };

function updateConv(state: ChatState, id: string, fn: (c: Conversation) => Conversation): ChatState {
  const c = state.conversations[id];
  if (!c) return state; // resposta de conversa desconhecida: ignorada, nunca cai em outra conversa
  const next = fn(c);
  return next === c ? state : { ...state, conversations: { ...state.conversations, [id]: next } };
}

function updateMsg(c: Conversation, match: (m: Message) => boolean, fn: (m: Message) => Message): Conversation {
  let changed = false;
  const messages = c.messages.map((m) => {
    if (!match(m)) return m;
    changed = true;
    return fn(m);
  });
  return changed ? { ...c, messages } : c;
}

/** Título derivado do primeiro texto do aluno — apenas demonstração (docs/04). */
export function deriveTitle(c: Conversation): string {
  if (c.title) return c.title;
  const first = c.messages.find((m) => m.sender === 'student' && m.content.kind === 'text');
  if (first && first.content.kind === 'text') return first.content.text.slice(0, 80);
  const att = c.messages.find((m) => m.sender === 'student');
  if (att?.content.kind === 'attachment') return `Anexo: ${att.content.file.name}`;
  if (att?.content.kind === 'audio') return 'Mensagem de voz';
  return 'Nova conversa';
}

export function isReadonly(c: Conversation | undefined): boolean {
  return !!c && c.attendance.mode === 'closed';
}

/** A IA responde nestes modos; nos demais, quem lê é a equipe. */
export function aiAnswers(a: Attendance): boolean {
  return a.mode === 'ai' || a.mode === 'scheduled';
}

function moveKey<T>(rec: Record<string, T>, from: string, to: string): Record<string, T> {
  if (!(from in rec)) return rec;
  const { [from]: value, ...rest } = rec;
  return { ...rest, [to]: value };
}

export function reducer(state: ChatState, action: Action): ChatState {
  switch (action.type) {
    case 'loading':
      return { ...state, status: 'loading' };
    case 'loaded': {
      const conversations = { ...state.conversations };
      for (const c of action.conversations) {
        // Não sobrescreve conversa já alterada nesta sessão
        if (!conversations[c.id]) conversations[c.id] = c;
      }
      return { ...state, status: 'ready', conversations };
    }
    case 'loadFailed':
      return { ...state, status: 'error' };
    case 'draft': {
      const prev = state.drafts[action.key] ?? emptyDraft;
      return { ...state, drafts: { ...state.drafts, [action.key]: { ...prev, ...action.patch } } };
    }
    case 'draftClear': {
      if (!(action.key in state.drafts)) return state;
      const drafts = { ...state.drafts };
      delete drafts[action.key];
      return { ...state, drafts };
    }
    case 'draftAttach': {
      const prev = state.drafts[action.key] ?? emptyDraft;
      return { ...state, drafts: { ...state.drafts, [action.key]: { ...prev, attachments: [...prev.attachments, action.attachment] } } };
    }
    case 'draftDetach': {
      const prev = state.drafts[action.key];
      if (!prev) return state;
      return { ...state, drafts: { ...state.drafts, [action.key]: { ...prev, attachments: prev.attachments.filter((a) => a.id !== action.id) } } };
    }
    case 'conversationCreated':
      if (state.conversations[action.conversation.id]) return state;
      return { ...state, conversations: { ...state.conversations, [action.conversation.id]: action.conversation } };
    case 'conversationConfirmed':
      return updateConv(state, action.id, (c) => (c.local ? { ...c, local: false } : c));
    case 'conversationRenamed': {
      const { from, to } = action;
      const c = state.conversations[from];
      if (!c || from === to || state.conversations[to]) return state;
      const { [from]: _old, ...others } = state.conversations;
      return {
        ...state,
        conversations: {
          ...others,
          [to]: { ...c, id: to, local: false, messages: c.messages.map((m) => ({ ...m, conversationId: to })) },
        },
        drafts: moveKey(state.drafts, from, to),
        typing: moveKey(state.typing, from, to),
        unread: moveKey(state.unread, from, to),
      };
    }
    case 'messageAdded': {
      const { message } = action;
      const conv = state.conversations[message.conversationId];
      if (!conv) return state;
      // Deduplicação: mesma id, clientId ou serverId já presente → ignora
      const dup = conv.messages.some(
        (m) =>
          m.id === message.id ||
          (message.clientId && m.clientId === message.clientId) ||
          (message.serverId && m.serverId === message.serverId),
      );
      if (dup) return state;
      // Encerrada: só aceita eventos/mensagens vindos do serviço, nunca envio do aluno
      if (conv.attendance.mode === 'closed' && message.sender === 'student') return state;
      const next = updateConv(state, conv.id, (c) => ({
        ...c,
        messages: [...c.messages, message],
        lastActivity: Math.max(c.lastActivity, message.createdAt),
      }));
      if (message.sender !== 'student' && !action.focused) {
        return { ...next, unread: { ...next.unread, [conv.id]: (next.unread[conv.id] ?? 0) + 1 } };
      }
      return next;
    }
    case 'messageSent':
      return updateConv(state, action.conversationId, (c) =>
        updateMsg(
          c,
          (m) => m.clientId === action.clientId,
          (m) => ({ ...m, delivery: 'sent', serverId: action.serverId, progress: undefined, failReason: undefined }),
        ),
      );
    case 'messageFailed':
      return updateConv(state, action.conversationId, (c) =>
        updateMsg(
          c,
          (m) => m.clientId === action.clientId && m.delivery !== 'sent',
          (m) => ({ ...m, delivery: 'failed', failReason: action.reason, progress: undefined }),
        ),
      );
    case 'messageRetry':
      return updateConv(state, action.conversationId, (c) =>
        isReadonly(c)
          ? c
          : updateMsg(
              c,
              (m) => m.clientId === action.clientId && m.delivery === 'failed',
              (m) => ({ ...m, delivery: 'pending', failReason: undefined }),
            ),
      );
    case 'messageRemoved':
      return updateConv(state, action.conversationId, (c) => {
        const messages = c.messages.filter((m) => m.id !== action.id);
        return messages.length === c.messages.length ? c : { ...c, messages };
      });
    case 'messagePatch':
      return updateConv(state, action.conversationId, (c) =>
        updateMsg(c, (m) => m.id === action.messageId, (m) => ({ ...m, ...action.patch })),
      );
    case 'progress':
      return updateConv(state, action.conversationId, (c) =>
        updateMsg(
          c,
          (m) => m.id === action.messageId && m.delivery === 'pending',
          (m) => ({ ...m, progress: action.progress }),
        ),
      );
    case 'typing': {
      const c = state.conversations[action.conversationId];
      if (!c) return state;
      // Indicador da IA só faz sentido enquanto ela responde; em fila/atendente/encerrada é descartado
      if (action.typing && action.typing.who === 'ai' && !aiAnswers(c.attendance)) return state;
      if (action.typing && c.attendance.mode === 'closed') return state;
      return { ...state, typing: { ...state.typing, [action.conversationId]: action.typing } };
    }
    case 'attendance': {
      const current = state.conversations[action.conversationId];
      if (!current) return state;
      if (current.attendance.mode === 'closed') return state; // encerrada não reabre (docs/04)
      if (action.onlyFrom && current.attendance.mode !== action.onlyFrom) return state;
      let next = updateConv(state, action.conversationId, (c) => ({ ...c, attendance: action.attendance }));
      // Ao sair do modo em que a IA responde, o "pensando" dela não pode ficar preso na tela
      const t = next.typing[action.conversationId];
      if (t && ((t.who === 'ai' && !aiAnswers(action.attendance)) || action.attendance.mode === 'closed')) {
        next = { ...next, typing: { ...next.typing, [action.conversationId]: false } };
      }
      if (action.attendance.mode === 'closed') {
        // Envio ainda pendente quando o atendimento foi encerrado converge para falha explícita
        next = updateConv(next, action.conversationId, (c) =>
          updateMsg(
            c,
            (m) => m.delivery === 'pending',
            (m) => ({ ...m, delivery: 'failed', failReason: 'closed', progress: undefined }),
          ),
        );
      }
      return next;
    }
    case 'markRead': {
      if (!state.unread[action.conversationId]) return state;
      const unread = { ...state.unread };
      delete unread[action.conversationId];
      return { ...state, unread };
    }
  }
}

/**
 * Conversa vazia reutilizável (evita criar várias "Nova conversa" vazias — T04).
 * Vale também para a conversa que ficou vazia depois de descartar a única mensagem que falhou.
 */
export function findEmptyConversation(state: ChatState): Conversation | undefined {
  return Object.values(state.conversations).find((c) => c.messages.length === 0 && c.attendance.mode === 'ai');
}

export function sortedConversations(state: ChatState): Conversation[] {
  return Object.values(state.conversations)
    .filter((c) => c.messages.length > 0)
    .sort((a, b) => b.lastActivity - a.lastActivity);
}
