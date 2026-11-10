import { useEffect, useId, useRef } from 'react';
import { deriveTitle } from '../../core/reducer';
import type { Attendance, Conversation } from '../../core/types';
import { brand } from '../brand';
import { relativeDate } from '../format';
import { Icon } from '../Icon';

export function statusLabel(a: Attendance): string {
  switch (a.mode) {
    case 'ai':
      return 'Com a Ana';
    case 'requesting':
    case 'queued':
      return 'Na fila do Suporte';
    case 'scheduled':
      return 'Pedido registrado';
    case 'agent':
      return 'Com atendente';
    case 'closed':
      return 'Encerrada';
  }
}

interface ListProps {
  conversations: Conversation[];
  activeId: string | null;
  unread: Record<string, number>;
  onOpen(id: string): void;
}

export function ConversationList({ conversations, activeId, unread, onOpen }: ListProps) {
  if (conversations.length === 0) {
    return (
      <div className="list-empty">
        <Icon name="chat" size={26} />
        <p>Suas conversas aparecem aqui.</p>
      </div>
    );
  }
  return (
    <ul className="conv-list">
      {conversations.map((c) => {
        const n = unread[c.id] ?? 0;
        return (
          <li key={c.id}>
            <button type="button" className="conv-item" aria-current={c.id === activeId ? 'true' : undefined} onClick={() => onOpen(c.id)}>
              <span className="conv-item__title">{deriveTitle(c)}</span>
              <span className="conv-item__meta">
                <span className="status" data-mode={c.attendance.mode}>
                  {statusLabel(c.attendance)}
                </span>
                <span aria-hidden="true">·</span>
                <span>{relativeDate(c.lastActivity)}</span>
              </span>
              {n > 0 && (
                <span className="badge" aria-label={`${n} ${n === 1 ? 'mensagem nova' : 'mensagens novas'}`}>
                  {n}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

interface PanelProps extends ListProps {
  onNew(): void;
  /** Gaveta modal (espaço estreito). Em espaço largo, o mesmo painel fica fixo ao lado. */
  onClose?: () => void;
}

export function HistoryPanel({ onNew, onClose, ...list }: PanelProps) {
  const titleId = useId();
  return (
    <>
      {/* Só aparece na variação "sem logo" do gradiente (CSS) */}
      <img className="history__logo" src={brand.logoUrl} alt={brand.wordmark} width={112} height={Math.round(112 / brand.logoRatio)} />
      <div className="history__head">
        <h2 id={titleId}>Conversas</h2>
        {onClose && (
          <button type="button" className="icon-btn" aria-label="Fechar conversas" onClick={onClose} data-autofocus>
            <Icon name="close" />
          </button>
        )}
      </div>
      <button type="button" className="btn btn--soft btn--block history__new" onClick={onNew}>
        <Icon name="compose" size={18} /> Nova conversa
      </button>
      <nav className="history__list" aria-labelledby={titleId}>
        <ConversationList {...list} />
      </nav>
    </>
  );
}

/** Gaveta modal: contém o foco enquanto aberta, Escape fecha, o foco volta ao acionador (docs/07). */
export function HistoryDrawer({ visible, ...panel }: PanelProps & { visible: boolean; onClose(): void }) {
  const ref = useRef<HTMLDivElement>(null);
  // Captura o acionador na renderização — antes de o restante virar inert (que remove o foco dele)
  const triggerRef = useRef<HTMLElement | null | undefined>(undefined);
  if (triggerRef.current === undefined) triggerRef.current = document.activeElement as HTMLElement | null;
  const { onClose } = panel;

  useEffect(() => {
    const trigger = triggerRef.current;
    const el = ref.current;
    el?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !el) return;
      const items = [...el.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const root = el.getRootNode() as Document | ShadowRoot;
      if (e.shiftKey && root.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && root.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    el?.addEventListener('keydown', onKey);
    return () => {
      el?.removeEventListener('keydown', onKey);
      if (trigger && trigger.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [onClose]);

  return (
    <div className="drawer-layer" data-visible={visible}>
      <div className="drawer-scrim" onClick={onClose} aria-hidden="true" />
      <div className="drawer" role="dialog" aria-modal="true" aria-label="Conversas" ref={ref}>
        <HistoryPanel {...panel} />
      </div>
    </div>
  );
}
