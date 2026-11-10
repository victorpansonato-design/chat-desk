import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { AttachmentMeta, Conversation, Message, Typing } from '../../core/types';
import { dayLabel } from '../format';
import { Icon } from '../Icon';
import { Collapse, prefersReducedMotion, usePresence } from '../motion';
import type { ScrollMemory } from '../types';
import { MessageItem } from './MessageItem';
import { Thinking } from './Thinking';

const NEAR_BOTTOM_PX = 72; // limiar proposto em docs/06

interface Props {
  conversation: Conversation;
  typing: Typing;
  readonly: boolean;
  memory: Map<string, ScrollMemory>;
  /** Tela inicial (boas-vindas, sugestões, conversa recente) enquanto a conversa está vazia. */
  empty: ReactNode;
  onReply(m: Message): void;
  onOpenImage(file: AttachmentMeta, from: HTMLElement): void;
}

function announceText(m: Message): string | null {
  const c = m.content;
  if (m.sender === 'student') return null;
  if (c.kind === 'event') return c.text;
  if (c.kind === 'nps') return `Pesquisa: ${c.question}`;
  if (c.kind === 'text') return `${m.author?.name ?? 'Chat Anchieta'} respondeu: ${c.text.replace(/\*\*/g, '').slice(0, 180)}`;
  if (c.kind === 'audio') return `${m.author?.name ?? 'A equipe'} enviou uma mensagem de voz.`;
  if (c.kind === 'attachment') return `${m.author?.name ?? 'A equipe'} enviou o arquivo ${c.file.name}.`;
  return 'A Ana enviou um formulário.';
}

/**
 * Histórico de uma conversa. É montado por conversa (key = id): a contagem de mensagens,
 * o "novas mensagens" e os anúncios nunca vazam de uma conversa para outra.
 */
export function Transcript({ conversation, typing, readonly, memory, empty, onReply, onOpenImage }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const lastCount = useRef(conversation.messages.length);
  const [unseen, setUnseen] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const messages = conversation.messages;
  const isEmpty = messages.length === 0;
  const pill = usePresence(unseen > 0, 220);
  const lastUnseen = useRef(1);
  if (unseen > 0) lastUnseen.current = unseen;

  const scrollToBottom = useCallback((smooth: boolean) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto' });
    atBottom.current = true;
    setUnseen(0);
  }, []);

  // Restaura a posição de leitura desta conversa ao montar
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const saved = memory.get(conversation.id);
    if (!saved || saved.atBottom) {
      el.scrollTop = el.scrollHeight;
      atBottom.current = true;
    } else {
      el.scrollTop = saved.top;
      atBottom.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    atBottom.current = near;
    if (near) setUnseen(0);
    memory.set(conversation.id, { top: el.scrollTop, atBottom: near });
  };

  // Chegada de mensagens: segue o fim só se o aluno já estava no fim ou acabou de enviar
  useLayoutEffect(() => {
    const prev = lastCount.current;
    lastCount.current = messages.length;
    if (messages.length <= prev) return;
    const added = messages.slice(prev);
    const ownSend = added.some((m) => m.sender === 'student' && m.delivery === 'pending');
    if (ownSend || atBottom.current) scrollToBottom(prev > 0);
    else setUnseen((n) => n + added.filter((m) => m.sender !== 'student').length);
    const last = [...added].reverse().map(announceText).find(Boolean);
    if (last) setAnnouncement(last);
  }, [messages, scrollToBottom]);

  // Indicador de resposta em preparo: mantém o fim apenas se o aluno estava lá
  useLayoutEffect(() => {
    if (typing && atBottom.current) scrollToBottom(true);
  }, [typing, scrollToBottom]);

  // Mudanças de tamanho (hospedeiro mudando de forma, teclado, conteúdo crescendo) não tiram o aluno do fim
  useEffect(() => {
    const el = scroller.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      if (atBottom.current) el.scrollTop = el.scrollHeight;
    });
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, []);

  const lastRateable = readonly ? undefined : [...messages].reverse().find((m) => m.rating)?.id;
  let lastDay = '';

  return (
    <div className="transcript">
      <div className="transcript__scroll" ref={scroller} onScroll={onScroll} tabIndex={0} aria-label="Mensagens da conversa">
        <div className="transcript__inner" data-empty={isEmpty || undefined}>
          <Collapse open={isEmpty} className="transcript__empty" ms={460}>
            {empty}
          </Collapse>
          <div role="log" aria-live="off" aria-label="Histórico de mensagens">
            <ol className="transcript__list">
              {messages.map((m, i) => {
                const d = dayLabel(m.createdAt);
                const showDay = d !== lastDay;
                lastDay = d;
                const prev = messages[i - 1];
                const next = messages[i + 1];
                const breaks = (a: Message | undefined, b: Message) =>
                  !a || a.sender !== b.sender || a.content.kind === 'event' || a.content.kind === 'nps' || Math.abs(b.createdAt - a.createdAt) > 5 * 60_000;
                const groupStart = showDay || breaks(prev, m);
                const groupEnd = !next || breaks(m, next) || dayLabel(next.createdAt) !== d;
                return (
                  <Day key={m.id} label={showDay ? d : null}>
                    <MessageItem
                      m={m}
                      groupStart={groupStart}
                      groupEnd={groupEnd}
                      readonly={readonly}
                      showRating={m.id === lastRateable}
                      onReply={onReply}
                      onOpenImage={onOpenImage}
                    />
                  </Day>
                );
              })}
            </ol>
          </div>
          <Collapse open={!!typing} className="transcript__thinking" ms={200}>
            {typing ? <Thinking typing={typing} /> : null}
          </Collapse>
        </div>
      </div>
      {pill.mounted && (
        <button type="button" className="new-pill" data-visible={pill.visible} onClick={() => scrollToBottom(true)}>
          <Icon name="arrowDown" size={16} />
          {lastUnseen.current === 1 ? 'Nova mensagem' : `${lastUnseen.current} novas mensagens`}
        </button>
      )}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </div>
  );
}

function Day({ label, children }: { label: string | null; children: ReactNode }) {
  return (
    <>
      {label && (
        <li className="day-sep">
          <span>{label}</span>
        </li>
      )}
      {children}
    </>
  );
}
