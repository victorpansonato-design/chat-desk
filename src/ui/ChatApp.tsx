import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useChat } from '../core/ChatProvider';
import { deriveTitle, isReadonly, sortedConversations } from '../core/reducer';
import type { Conversation, Message } from '../core/types';
import { brand } from './brand';
import { relativeDate } from './format';
import { Icon } from './Icon';
import { FadeSwitch, useWidth, usePresence } from './motion';
import type { ChatUi, DeviceEnv, HostConfig, ScrollMemory } from './types';
import { AttendanceBar } from './components/AttendanceBar';
import { Composer } from './components/Composer';
import { HistoryDrawer, HistoryPanel, statusLabel } from './components/History';
import { Lightbox, type LightboxTarget } from './components/Lightbox';
import { excerptOf } from './components/MessageItem';
import { AgentAvatar, Orb } from './components/Orb';
import { Transcript } from './components/Transcript';

/** Largura do CONTÊINER (não da tela) a partir da qual o histórico vira coluna fixa. */
const WIDE_PX = 760;
const COMPACT_PX = 380;

export interface ChatAppProps {
  host: HostConfig;
  ui: ChatUi;
  setUi: (fn: (u: ChatUi) => ChatUi) => void;
  env: DeviceEnv;
  /** O chat está visível (painel aberto). Usado para a contagem de não lidas. */
  visible: boolean;
  memory: Map<string, ScrollMemory>;
}

/**
 * Núcleo único do Chat Anchieta. Uma só tela: a conversa. A conversa vazia É a tela inicial
 * (saudação, sugestões, conversa recente); o histórico vive numa gaveta (ou coluna, com espaço).
 */
export function ChatApp({ host, ui, setUi, env, visible, memory }: ChatAppProps) {
  const api = useChat();
  const { state } = api;
  const [rootRef, width] = useWidth<HTMLDivElement>();
  useRecentEnd(rootRef);
  const wide = width >= WIDE_PX;
  const compact = width > 0 && width < COMPACT_PX;
  const mainRef = useRef<HTMLDivElement>(null);
  const [light, setLight] = useState<LightboxTarget | null>(null);

  const conversations = sortedConversations(state);
  const activeId = ui.activeId ? api.resolve(ui.activeId) : null;
  const active = activeId ? state.conversations[activeId] : undefined;
  const unreadElsewhere = Object.entries(state.unread).reduce((n, [id, v]) => (id === activeId ? n : n + v), 0);
  const drawer = usePresence(ui.historyOpen && !wide, 320);

  useEffect(() => {
    api.setFocus(host.id, visible ? activeId : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, activeId, host.id]);

  // Abre direto na conversa: assim que os dados chegam, há uma conversa vazia pronta para escrever
  useEffect(() => {
    if (state.status === 'ready' && !active) {
      const id = api.newConversation(host.channel);
      setUi((u) => ({ ...u, activeId: id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, active]);

  // Gaveta aberta torna o restante inerte (modal); em espaço largo ela dá lugar à coluna fixa.
  // useLayoutEffect: o inert precisa sair ANTES de a gaveta devolver o foco ao acionador.
  useLayoutEffect(() => {
    if (mainRef.current) mainRef.current.inert = ui.historyOpen && !wide;
    if (wide && ui.historyOpen) setUi((u) => ({ ...u, historyOpen: false }));
  }, [ui.historyOpen, wide, setUi]);

  // Foco previsível ao trocar de conversa — somente quando a troca veio de uma ação do aluno
  const userNav = useRef<'title' | 'composer' | null>(null);
  useEffect(() => {
    const where = userNav.current;
    userNav.current = null;
    if (!where || !visible) return;
    const t = setTimeout(() => {
      const el = mainRef.current?.querySelector<HTMLElement>(where === 'composer' ? '.composer__input' : '[data-screen-focus]');
      (el ?? mainRef.current?.querySelector<HTMLElement>('[data-screen-focus]'))?.focus({ preventScroll: true });
    }, 190); // depois da troca de conteúdo (FadeSwitch)
    return () => clearTimeout(t);
  }, [activeId, visible]);

  const openConversation = useCallback(
    (id: string) => {
      userNav.current = 'title';
      setUi((u) => ({ ...u, activeId: id, historyOpen: false }));
    },
    [setUi],
  );
  const newConversation = useCallback(() => {
    const id = api.newConversation(host.channel);
    userNav.current = 'composer';
    setUi((u) => ({ ...u, activeId: id, historyOpen: false }));
  }, [api, host.channel, setUi]);
  const closeHistory = useCallback(() => setUi((u) => ({ ...u, historyOpen: false })), [setUi]);
  const openHistory = useCallback(() => setUi((u) => ({ ...u, historyOpen: true })), [setUi]);

  const historyProps = { conversations, activeId, unread: state.unread, onOpen: openConversation, onNew: newConversation };
  const failed = state.status === 'error';
  const loading = !failed && !active;
  const isHome = !!active && active.messages.length === 0;
  const mode = active?.attendance.mode ?? 'ai';

  return (
    <div
      ref={rootRef}
      className="chat"
      data-wide={wide || undefined}
      data-compact={compact || undefined}
      data-home={isHome || loading || undefined}
      data-team={mode === 'agent' || mode === 'queued' || mode === 'requesting' || undefined}
      data-channel={host.channel}
    >
      <div className="chat__aurora" aria-hidden="true" />

      <aside className="chat__side" aria-label="Histórico de conversas" ref={(el) => void (el && (el.inert = !wide))}>
        <div className="chat__side-in">
          <HistoryPanel {...historyProps} />
        </div>
      </aside>

      <div className="chat__main" ref={mainRef}>
        <header className="bar">
          <button
            type="button"
            className="icon-btn bar__menu"
            onClick={openHistory}
            disabled={wide}
            aria-label={`Abrir conversas${unreadElsewhere ? ` (${unreadElsewhere} ${unreadElsewhere === 1 ? 'mensagem nova' : 'mensagens novas'})` : ''}`}
            aria-haspopup="dialog"
          >
            <Icon name="menu" />
            {unreadElsewhere > 0 && <span className="badge badge--dot" aria-hidden="true" />}
          </button>
          <Identity conversation={active} compact={compact} hid={host.id} />
          <div className="bar__actions">
            <button type="button" className="icon-btn" onClick={newConversation} disabled={isHome || loading} aria-label="Nova conversa">
              <Icon name="compose" />
            </button>
            {host.onToggleSize && (
              <button type="button" className="icon-btn bar__size" onClick={host.onToggleSize} aria-label={host.size === 'expanded' ? 'Recolher chat' : 'Expandir chat'}>
                <FadeSwitch id={host.size ?? 'compact'} ms={110}>
                  <Icon name={host.size === 'expanded' ? 'collapse' : 'expand'} />
                </FadeSwitch>
              </button>
            )}
            {host.onClose && (
              <button type="button" className="icon-btn" onClick={host.onClose} aria-label="Fechar chat (a conversa continua salva)">
                <Icon name="close" />
              </button>
            )}
          </div>
        </header>

        <FadeSwitch id={failed ? 'error' : active ? active.id : 'loading'} className="chat__view">
          {failed ? (
            <ErrorState onRetry={api.reload} />
          ) : !active ? (
            <LoadingState />
          ) : (
            <ConversationView
              key={active.id}
              host={host}
              conversation={active}
              conversations={conversations}
              env={env}
              wide={wide}
              memory={memory}
              autoFocus={visible}
              onOpen={openConversation}
              onHistory={openHistory}
              onNew={newConversation}
              onOpenImage={(file, from) => setLight({ file, from })}
            />
          )}
        </FadeSwitch>
      </div>

      {drawer.mounted && <HistoryDrawer {...historyProps} visible={drawer.visible} onClose={closeHistory} />}
      {light && <Lightbox target={light} onClose={() => setLight(null)} />}
    </div>
  );
}

/* ——————————————————————————— Quem atende ——————————————————————————— */

function Identity({ conversation: c, compact, hid }: { conversation?: Conversation; compact: boolean; hid: string }) {
  const a = c?.attendance ?? { mode: 'ai' as const };
  const key = a.mode === 'agent' ? `agent:${a.agent.name}` : a.mode === 'queued' || a.mode === 'requesting' ? 'team' : a.mode === 'closed' ? 'closed' : 'ai';
  let avatar: ReactNode;
  let name: ReactNode;
  let sub: string;
  if (a.mode === 'agent') {
    avatar = <AgentAvatar name={a.agent.name} size={36} />;
    name = (
      <>
        {a.agent.name} <span className="tag tag--team">Equipe</span>
      </>
    );
    sub = compact ? 'Suporte ao Aluno' : 'Suporte ao Aluno · atendimento humano';
  } else if (a.mode === 'queued' || a.mode === 'requesting') {
    avatar = (
      <span className="ident__icon ident__icon--team">
        <Icon name="headset" size={20} />
      </span>
    );
    name = 'Suporte ao Aluno';
    sub = a.mode === 'queued' ? 'Você está na fila de atendimento' : 'Chamando a equipe…';
  } else if (a.mode === 'closed') {
    avatar = (
      <span className="ident__icon">
        <Icon name="lock" size={18} />
      </span>
    );
    name = c ? deriveTitle(c) : brand.product;
    sub = 'Atendimento encerrado';
  } else {
    avatar = <Orb size={36} />;
    name = (
      <>
        Ana
      </>
    );
    sub = compact ? 'Assistente' : 'Assistente da UniAnchieta';
  }
  return (
    <FadeSwitch id={key} className="ident">
      <div className="ident__in">
        {avatar}
        <div className="ident__text">
          <h2 id={`${hid}-title`} className="ident__name" tabIndex={-1} data-screen-focus>
            {name}
          </h2>
          <p className="ident__sub" aria-live="polite">
            {sub}
          </p>
        </div>
      </div>
    </FadeSwitch>
  );
}

/* ——————————————————————————— Conversa ——————————————————————————— */

interface ConvProps {
  host: HostConfig;
  conversation: Conversation;
  conversations: Conversation[];
  env: DeviceEnv;
  wide: boolean;
  memory: Map<string, ScrollMemory>;
  autoFocus: boolean;
  onOpen(id: string): void;
  onHistory(): void;
  onNew(): void;
  onOpenImage(file: LightboxTarget['file'], from: HTMLElement): void;
}

function ConversationView({ host, conversation: c, conversations, env, wide, memory, autoFocus, onOpen, onHistory, onNew, onOpenImage }: ConvProps) {
  const api = useChat();
  const readonly = isReadonly(c);
  const root = useRef<HTMLElement>(null);

  const onReply = useCallback(
    (m: Message) => {
      api.setDraft(c.id, { replyTo: { id: m.id, excerpt: excerptOf(m), senderLabel: m.sender === 'student' ? 'você' : (m.author?.name ?? 'Chat Anchieta') } });
      root.current?.querySelector<HTMLElement>('.composer__input')?.focus({ preventScroll: true });
    },
    [api, c.id],
  );

  const hero = (
    <Hero
      host={host}
      recent={conversations.find((x) => x.attendance.mode !== 'closed') ?? conversations[0]}
      total={conversations.length}
      showAll={!wide}
      onOpen={onOpen}
      onHistory={onHistory}
      onSuggestion={(text) => api.send(c.id, text)}
    />
  );

  return (
    <section className="conv" ref={root} aria-labelledby={`${host.id}-title`}>
      <Transcript conversation={c} typing={api.state.typing[c.id] ?? false} readonly={readonly} memory={memory} empty={hero} onReply={onReply} onOpenImage={onOpenImage} />
      <footer className="conv__foot">
        <FadeSwitch id={readonly ? 'closed' : 'open'}>
          {readonly ? (
            <div className="closed-bar">
              <p>
                <Icon name="lock" size={16} /> Atendimento encerrado · Somente leitura
              </p>
              <button type="button" className="btn btn--primary" onClick={onNew}>
                <Icon name="compose" size={18} /> Iniciar nova conversa
              </button>
            </div>
          ) : (
            <>
              <AttendanceBar conversation={c} />
              <Composer conversation={c} env={env} autoFocus={autoFocus && c.messages.length === 0} />
            </>
          )}
        </FadeSwitch>
      </footer>
    </section>
  );
}

/* ——————————————————————————— Tela inicial (conversa vazia) ——————————————————————————— */

interface HeroProps {
  host: HostConfig;
  recent?: Conversation;
  total: number;
  showAll: boolean;
  onOpen(id: string): void;
  onHistory(): void;
  onSuggestion(text: string): void;
}

function Hero({ host, recent, total, showAll, onOpen, onHistory, onSuggestion }: HeroProps) {
  return (
    <div className="hero">
      <img className="hero__logo" src={brand.logoUrl} alt={brand.wordmark} width={132} height={Math.round(132 / brand.logoRatio)} />
      <h3 className="hero__title">
        <span className="hero__hello">{host.studentName ? `Olá, ${host.studentName}.` : 'Olá.'}</span>
        <span>Como posso ajudar?</span>
      </h3>
      <p className="hero__lead">
        Sou a <strong>Ana</strong>, assistente da UniAnchieta.
      </p>

      <div className="suggestions" role="group" aria-label="Sugestões para começar">
        {host.suggestions.map((s) => (
          <button key={s} type="button" className="suggestion" onClick={() => onSuggestion(s)}>
            <span>{s}</span>
            <Icon name="arrowUp" size={16} className="suggestion__go" />
          </button>
        ))}
      </div>

      {recent && (
        <div className="recent">
          <div className="recent__head">
            <p className="recent__label">{recent.attendance.mode === 'closed' ? 'Conversa recente' : 'Continuar conversa'}</p>
            {showAll && total > 1 && (
              <button type="button" className="link recent__all" onClick={onHistory}>
                Ver todas ({total})
              </button>
            )}
          </div>
          <button type="button" className="recent__card" onClick={() => onOpen(recent.id)}>
            <span className="recent__icon" aria-hidden="true">
              <Icon name="history" size={18} />
            </span>
            <span className="recent__text">
              <span className="recent__title">{deriveTitle(recent)}</span>
              <span className="recent__meta">
                {statusLabel(recent.attendance)} · {relativeDate(recent.lastActivity)}
              </span>
            </span>
            <Icon name="chevronRight" size={18} className="recent__go" />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Onde terminam as sugestões (--sugg-end) e o último bloco da tela inicial (--recent-end: card de conversa
 * recente, ou as sugestões quando não há conversa), na posição visível a partir do topo do chat e sem a
 * escala do hospedeiro (acompanha a rolagem). Usados pela variação "longo" do gradiente para o branco
 * começar e terminar exatamente ali em qualquer largura.
 */
function useRecentEnd(rootRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const sugg = root.querySelector<HTMLElement>('.suggestions');
      const last = root.querySelector<HTMLElement>('.recent__card') ?? sugg;
      if (!sugg || !last) return;
      const top = root.getBoundingClientRect().top;
      const scale = root.getBoundingClientRect().height / root.offsetHeight || 1;
      const px = (el: HTMLElement) => `${Math.round((el.getBoundingClientRect().bottom - top) / scale)}px`;
      root.style.setProperty('--sugg-end', px(sugg));
      root.style.setProperty('--recent-end', px(last));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    const mo = new MutationObserver(() => {
      measure();
      root.querySelectorAll('.hero').forEach((h) => ro.observe(h));
    });
    mo.observe(root, { childList: true, subtree: true });
    root.querySelectorAll('.hero').forEach((h) => ro.observe(h));
    // A tela inicial entra subindo 12px (animação): mede de novo quando ela termina
    root.addEventListener('animationend', measure);
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    root.addEventListener('scroll', onScroll, true);
    measure();
    return () => {
      ro.disconnect();
      mo.disconnect();
      root.removeEventListener('animationend', measure);
      root.removeEventListener('scroll', onScroll, true);
      cancelAnimationFrame(frame);
    };
  }, [rootRef]);
}

/* ——————————————————————————— Estados de sessão ——————————————————————————— */

function LoadingState() {
  return (
    <section className="conv conv--state" aria-busy="true" aria-label="Carregando atendimento">
      <div className="skeleton" aria-hidden="true">
        <span className="skeleton__logo" />
        <span className="skeleton__line skeleton__line--title" />
        <span className="skeleton__line" />
        <span className="skeleton__chips">
          <i />
          <i />
          <i />
        </span>
      </div>
      <p className="sr-only" role="status">
        Carregando suas conversas…
      </p>
    </section>
  );
}

function ErrorState({ onRetry }: { onRetry(): void }) {
  return (
    <section className="conv conv--state" aria-labelledby="err-title">
      <div className="error-state" role="alert">
        <span className="error-state__icon" aria-hidden="true">
          <Icon name="alert" size={26} />
        </span>
        <h3 id="err-title">Não foi possível carregar o atendimento agora.</h3>
        <p>Verifique sua conexão e tente novamente. O que você já escreveu continua guardado nesta página.</p>
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          <Icon name="refresh" size={18} /> Tentar novamente
        </button>
      </div>
    </section>
  );
}
