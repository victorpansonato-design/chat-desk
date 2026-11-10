import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { emptyDraft, findEmptyConversation, initialState, isReadonly, reducer } from './reducer';
import { MockError } from './mockAdapter';
import { isPasswordReset } from './types';
import type { ChatAdapter, ChatState, Channel, Content, Draft, Message, MessageActionId, PendingAttachment } from './types';

let localSeq = 0;
export const newClientId = (prefix = 'cli') => {
  localSeq += 1;
  const rnd = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${rnd}-${localSeq}`;
};

interface PendingSend {
  conversationId: string;
  content: Content;
  replyTo?: Message['replyTo'];
}

export interface ChatApi {
  state: ChatState;
  reload(): void;
  /** Abre (ou reutiliza) uma conversa vazia. Nunca cria entradas vazias repetidas. */
  newConversation(channel: Channel): string;
  /** ID vigente de uma conversa (o servidor pode trocar o ID local no primeiro envio). */
  resolve(conversationId: string): string;
  draftOf(conversationId: string): Draft;
  setDraft(conversationId: string, patch: Partial<Draft>): void;
  addAttachment(conversationId: string, attachment: PendingAttachment): void;
  removeAttachment(conversationId: string, id: string): void;
  /** Envia o rascunho; com `text`, envia esse texto (ex.: sugestão) sem tocar no rascunho. */
  send(conversationId: string, text?: string): void;
  sendAudio(conversationId: string, durationSec: number, url?: string): void;
  retry(conversationId: string, messageId: string): void;
  editFailed(conversationId: string, messageId: string): void;
  discardFailed(conversationId: string, messageId: string): void;
  requestHandover(conversationId: string): void;
  /** Ação oferecida numa mensagem do serviço (fora do expediente). */
  chooseAction(conversationId: string, messageId: string, action: MessageActionId): void;
  cancelHandover(conversationId: string): void;
  closeConversation(conversationId: string): Promise<void>;
  answerNps(conversationId: string, messageId: string, value: number): void;
  rate(conversationId: string, messageId: string, value: number): void;
  toggleReaction(conversationId: string, messageId: string): void;
  /** Envia só o código de verificação. A senha digitada fica no componente. */
  submitPasswordReset(conversationId: string, messageId: string, code: string): void;
  resendCode(conversationId: string, messageId: string): void;
  /** A interface informa qual conversa está visível (para contagem de não lidas). */
  setFocus(hostId: string, conversationId: string | null): void;
}

const Ctx = createContext<ChatApi | null>(null);

export function useChat(): ChatApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useChat fora do ChatProvider');
  return v;
}

export function ChatProvider({ adapter, children }: { adapter: ChatAdapter; children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [aliases, setAliases] = useState<Record<string, string>>({});
  const aliasRef = useRef(aliases);
  aliasRef.current = aliases;
  const pending = useRef(new Map<string, PendingSend>());
  const creating = useRef(new Map<string, Promise<string>>());
  const focus = useRef(new Map<string, string | null>());
  const lastEmpty = useRef<string | null>(null);
  const loadSeq = useRef(0);

  const resolveId = (id: string) => aliasRef.current[id] ?? id;
  const isFocused = (conversationId: string) => [...focus.current.values()].some((id) => id !== null && resolveId(id) === conversationId);
  const convOf = (id: string) => stateRef.current.conversations[resolveId(id)];
  const msgOf = (conversationId: string, messageId: string) => convOf(conversationId)?.messages.find((x) => x.id === messageId);

  const reload = useCallback(() => {
    const seq = ++loadSeq.current;
    dispatch({ type: 'loading' });
    adapter.loadConversations().then(
      // Resposta de um carregamento antigo (StrictMode, clique repetido) é descartada
      (conversations) => seq === loadSeq.current && dispatch({ type: 'loaded', conversations }),
      () => seq === loadSeq.current && dispatch({ type: 'loadFailed' }),
    );
  }, [adapter]);

  useEffect(() => {
    reload();
    return adapter.subscribe((ev) => {
      switch (ev.type) {
        case 'message':
          dispatch({ type: 'messageAdded', message: ev.message, focused: isFocused(ev.conversationId) });
          break;
        case 'typing':
          dispatch({ type: 'typing', conversationId: ev.conversationId, typing: ev.typing });
          break;
        case 'attendance':
          dispatch({ type: 'attendance', conversationId: ev.conversationId, attendance: ev.attendance });
          break;
        case 'progress':
          dispatch({ type: 'progress', conversationId: ev.conversationId, messageId: ev.messageId, progress: ev.progress });
          break;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, reload]);

  /**
   * Garante que a conversa exista no servidor antes do primeiro envio. Uma única criação por
   * conversa, mesmo com vários envios no mesmo instante (anexos + texto). Devolve o ID vigente.
   */
  const ensureCreated = useCallback(
    (conversationId: string): Promise<string> => {
      const id = resolveId(conversationId);
      const conv = stateRef.current.conversations[id];
      if (!conv?.local) return Promise.resolve(id);
      const running = creating.current.get(id);
      if (running) return running;
      const p = adapter
        .createConversation(conv.channel, id)
        .then((res) => {
          if (res.id !== id) {
            aliasRef.current = { ...aliasRef.current, [id]: res.id };
            setAliases(aliasRef.current);
            if (lastEmpty.current === id) lastEmpty.current = null;
            dispatch({ type: 'conversationRenamed', from: id, to: res.id });
          } else {
            dispatch({ type: 'conversationConfirmed', id });
          }
          return res.id;
        })
        .finally(() => creating.current.delete(id));
      creating.current.set(id, p);
      return p;
    },
    [adapter],
  );

  const transmit = useCallback(
    async (clientId: string) => {
      const p = pending.current.get(clientId);
      if (!p) return;
      try {
        const conversationId = await ensureCreated(p.conversationId);
        const res = await adapter.sendMessage(conversationId, clientId, p.content, p.replyTo);
        dispatch({ type: 'messageSent', conversationId, clientId, ...res });
        pending.current.delete(clientId);
      } catch (e) {
        const reason = e instanceof MockError && e.reason === 'closed' ? 'closed' : 'network';
        dispatch({ type: 'messageFailed', conversationId: resolveId(p.conversationId), clientId, reason });
      }
    },
    [adapter, ensureCreated],
  );

  const enqueue = useCallback(
    (conversationId: string, content: Content, replyTo?: Message['replyTo']) => {
      const clientId = newClientId();
      pending.current.set(clientId, { conversationId, content, replyTo });
      dispatch({
        type: 'messageAdded',
        focused: true,
        message: {
          id: clientId,
          clientId,
          conversationId,
          sender: 'student',
          content,
          createdAt: Date.now(),
          delivery: 'pending',
          progress: content.kind === 'text' ? undefined : 0,
          replyTo,
        },
      });
      void transmit(clientId);
    },
    [transmit],
  );

  const api = useMemo<ChatApi>(
    () => ({
      state,
      reload,
      resolve: (id) => aliases[id] ?? id,
      newConversation(channel) {
        const existing = findEmptyConversation(stateRef.current);
        if (existing) return existing.id;
        // Criada neste mesmo instante e ainda não refletida no estado: reutiliza
        if (lastEmpty.current && !stateRef.current.conversations[lastEmpty.current]) return lastEmpty.current;
        const id = newClientId('conv');
        const now = Date.now();
        lastEmpty.current = id;
        dispatch({
          type: 'conversationCreated',
          conversation: { id, channel, attendance: { mode: 'ai' }, createdAt: now, lastActivity: now, messages: [], local: true },
        });
        return id;
      },
      draftOf(conversationId) {
        return state.drafts[aliases[conversationId] ?? conversationId] ?? emptyDraft;
      },
      setDraft(conversationId, patch) {
        dispatch({ type: 'draft', key: resolveId(conversationId), patch });
      },
      addAttachment(conversationId, attachment) {
        dispatch({ type: 'draftAttach', key: resolveId(conversationId), attachment });
      },
      removeAttachment(conversationId, id) {
        dispatch({ type: 'draftDetach', key: resolveId(conversationId), id });
      },
      send(conversationId, override) {
        const conv = convOf(conversationId);
        if (!conv || isReadonly(conv)) return;
        if (override !== undefined) {
          if (override.trim()) enqueue(conv.id, { kind: 'text', text: override.trim() });
          return;
        }
        const draft = stateRef.current.drafts[conv.id] ?? emptyDraft;
        const text = draft.text.trim();
        if (!text && draft.attachments.length === 0) return;
        // A citação acompanha o texto; sem texto, vai no primeiro anexo (não se perde)
        draft.attachments.forEach((a, i) => enqueue(conv.id, { kind: 'attachment', file: a.file }, !text && i === 0 ? draft.replyTo : undefined));
        if (text) enqueue(conv.id, { kind: 'text', text }, draft.replyTo);
        dispatch({ type: 'draftClear', key: conv.id });
      },
      sendAudio(conversationId, durationSec, url) {
        const conv = convOf(conversationId);
        if (!conv || isReadonly(conv)) return;
        enqueue(conv.id, { kind: 'audio', durationSec, url });
      },
      retry(conversationId, messageId) {
        const conv = convOf(conversationId);
        const m = conv?.messages.find((x) => x.id === messageId);
        if (!conv || !m?.clientId || m.delivery !== 'failed' || isReadonly(conv)) return;
        dispatch({ type: 'messageRetry', conversationId: conv.id, clientId: m.clientId });
        void transmit(m.clientId); // mesma clientId → o servidor deduplica
      },
      editFailed(conversationId, messageId) {
        const conv = convOf(conversationId);
        const m = conv?.messages.find((x) => x.id === messageId);
        if (!conv || !m || m.delivery !== 'failed' || m.content.kind !== 'text') return;
        const draft = stateRef.current.drafts[conv.id] ?? emptyDraft;
        dispatch({ type: 'messageRemoved', conversationId: conv.id, id: messageId });
        if (m.clientId) pending.current.delete(m.clientId);
        dispatch({ type: 'draft', key: conv.id, patch: { text: draft.text ? `${m.content.text}\n${draft.text}` : m.content.text, replyTo: m.replyTo } });
      },
      discardFailed(conversationId, messageId) {
        const conv = convOf(conversationId);
        const m = conv?.messages.find((x) => x.id === messageId);
        if (!conv || !m || m.delivery !== 'failed') return;
        if (m.clientId) pending.current.delete(m.clientId);
        dispatch({ type: 'messageRemoved', conversationId: conv.id, id: messageId });
      },
      requestHandover(conversationId) {
        const conv = convOf(conversationId);
        if (!conv || conv.attendance.mode !== 'ai') return;
        // Marca "encaminhando" antes de qualquer espera: um segundo clique não passa pela guarda acima
        dispatch({ type: 'attendance', conversationId: conv.id, attendance: { mode: 'requesting' } });
        let id = conv.id;
        const back = () => dispatch({ type: 'attendance', conversationId: id, attendance: { mode: 'ai' }, onlyFrom: 'requesting' });
        ensureCreated(conv.id)
          .then((serverId) => {
            id = serverId;
            return adapter.requestHandover(serverId);
          })
          .then((r) => {
            if (r === 'unavailable') back();
          })
          .catch(() => {
            back();
            dispatch({
              type: 'messageAdded',
              focused: true,
              message: {
                id: newClientId('evt'),
                conversationId: id,
                sender: 'system',
                createdAt: Date.now(),
                content: { kind: 'event', event: 'handover-failed', text: 'Não foi possível chamar a equipe agora. Sua conversa continua aqui; tente novamente em instantes.' },
              },
            });
          });
      },
      chooseAction(conversationId, messageId, action) {
        const conv = convOf(conversationId);
        const m = conv?.messages.find((x) => x.id === messageId);
        if (!conv || !m || m.actionTaken || isReadonly(conv)) return;
        dispatch({ type: 'messagePatch', conversationId: conv.id, messageId, patch: { actionTaken: action } });
        if (action === 'cancel-request') void adapter.cancelHandover(conv.id).catch(() => undefined);
      },
      cancelHandover(conversationId) {
        const conv = convOf(conversationId);
        if (!conv || conv.attendance.mode !== 'scheduled') return;
        void adapter.cancelHandover(conv.id).catch(() => undefined);
      },
      closeConversation(conversationId) {
        return adapter.closeConversation(resolveId(conversationId));
      },
      answerNps(conversationId, messageId, value) {
        const conv = convOf(conversationId);
        const m = conv?.messages.find((x) => x.id === messageId);
        if (!conv || !m || m.nps?.status === 'sending' || m.nps?.status === 'answered') return; // sem envio duplicado
        const patch = (nps: Message['nps']) => dispatch({ type: 'messagePatch', conversationId: conv.id, messageId, patch: { nps } });
        patch({ value, status: 'sending' });
        adapter.submitNps(conv.id, messageId, value).then(
          () => patch({ value, status: 'answered' }),
          () => patch({ value, status: 'error' }),
        );
      },
      rate(conversationId, messageId, value) {
        const conv = convOf(conversationId);
        const m = conv?.messages.find((x) => x.id === messageId);
        if (!conv || !m || m.rating?.status === 'sending') return;
        const patch = (rating: Message['rating']) => dispatch({ type: 'messagePatch', conversationId: conv.id, messageId, patch: { rating } });
        patch({ value, status: 'sending' });
        adapter.rateResponse(conv.id, messageId, value).then(
          () => patch({ value, status: 'sent' }),
          () => patch({ value, status: 'error' }),
        );
      },
      toggleReaction(conversationId, messageId) {
        const m = msgOf(conversationId, messageId);
        if (!m) return;
        // Local no protótipo: o significado e o envio da reação dependem do contrato com a TI
        dispatch({ type: 'messagePatch', conversationId: resolveId(conversationId), messageId, patch: { reaction: m.reaction ? undefined : 'like' } });
      },
      submitPasswordReset(conversationId, messageId, code) {
        const conv = convOf(conversationId);
        const m = conv?.messages.find((x) => x.id === messageId);
        if (!conv || !m || isReadonly(conv) || m.form?.status === 'submitting' || m.form?.status === 'done') return;
        const patch = (form: Message['form']) => dispatch({ type: 'messagePatch', conversationId: conv.id, messageId, patch: { form } });
        const keep = { resentAt: m.form?.resentAt };
        patch({ ...keep, status: 'submitting' });
        adapter.submitPasswordReset(conv.id, messageId, code).then(
          (r) => patch(r === 'ok' ? { status: 'done' } : { ...keep, status: 'idle', error: r }),
          () => patch({ ...keep, status: 'idle', error: 'network' }),
        );
      },
      resendCode(conversationId, messageId) {
        const conv = convOf(conversationId);
        const m = conv?.messages.find((x) => x.id === messageId);
        if (!conv || !m || isReadonly(conv) || !isPasswordReset(m.content) || m.form?.resending || m.form?.status !== 'idle') return;
        const content = m.content;
        dispatch({ type: 'messagePatch', conversationId: conv.id, messageId, patch: { form: { ...m.form, resending: true } } });
        adapter.resendCode(conv.id, messageId).then(
          ({ validUntil }) =>
            dispatch({
              type: 'messagePatch',
              conversationId: conv.id,
              messageId,
              patch: { content: { ...content, payload: { ...content.payload, validUntil } }, form: { status: 'idle', resentAt: Date.now() } },
            }),
          () => dispatch({ type: 'messagePatch', conversationId: conv.id, messageId, patch: { form: { status: 'idle', error: 'network', resentAt: m.form?.resentAt } } }),
        );
      },
      setFocus(hostId, conversationId) {
        focus.current.set(hostId, conversationId);
        if (conversationId) dispatch({ type: 'markRead', conversationId: resolveId(conversationId) });
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, aliases, reload, adapter, enqueue, transmit, ensureCreated],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
