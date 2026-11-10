import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useChat } from '../core/ChatProvider';
import { HOME_SUGGESTIONS, STUDENT_NAME, TIRA_DUVIDAS_SUGGESTIONS } from '../core/fixtures';
import { brand } from '../ui/brand';
import { ChatApp } from '../ui/ChatApp';
import { useTouchSimulator } from './touch';
import { Icon, type IconName } from '../ui/Icon';
import { Collapse, FadeSwitch } from '../ui/motion';
import type { ChatUi, DeviceEnv, HostConfig, ScrollMemory } from '../ui/types';

export type HostId = 'portal' | 'app' | 'tira-duvidas';

const HOSTS: { id: HostId; label: string; icon: IconName }[] = [
  { id: 'portal', label: 'Aluno Online', icon: 'globe' },
  { id: 'app', label: 'Aplicativo', icon: 'phone' },
  { id: 'tira-duvidas', label: 'Tira-Dúvidas', icon: 'help' },
];

/** Abaixo desta largura de janela, o chat ocupa a tela inteira (sem moldura de navegador ou de aparelho). */
const SMALL_QUERY = '(max-width: 900px)';

/** iPhone de referência: tela lógica 393 × 852, cantos 55, moldura de 11. */
const PHONE = { w: 393, h: 852, bezel: 11, radius: 58 };
const BROWSER_BAR = 46;
const TD_HEADING = 156;

interface Geometry {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  s: number;
  bezel: number;
}

/**
 * Geometria do contêiner do chat em cada interface. É UM elemento só: ao trocar de interface,
 * posição, tamanho, cantos e moldura são interpolados — o chat se transforma, não é trocado.
 */
function geometry(host: HostId, open: boolean, size: 'compact' | 'expanded', W: number, H: number, small: boolean): Geometry {
  if (small) {
    if (host === 'portal' && !open) return { x: W - 76, y: H - 76, w: 60, h: 60, r: 30, s: 1, bezel: 0 };
    return { x: 0, y: 0, w: W, h: H, r: 0, s: 1, bezel: 0 };
  }
  const m = 20;
  const bx = m;
  const by = m;
  const bw = W - 2 * m;
  const bh = H - 2 * m;
  if (host === 'app') {
    const ow = PHONE.w + 2 * PHONE.bezel;
    const oh = PHONE.h + 2 * PHONE.bezel;
    const s = Math.min(1, (H - 36) / oh);
    return { x: (W - ow * s) / 2, y: (H - oh * s) / 2, w: ow, h: oh, r: PHONE.radius, s, bezel: PHONE.bezel };
  }
  if (host === 'tira-duvidas') {
    const w = Math.min(1040, bw - 96);
    const top = by + BROWSER_BAR + TD_HEADING;
    return { x: bx + (bw - w) / 2, y: top, w, h: Math.max(360, by + bh - 32 - top), r: 20, s: 1, bezel: 0 };
  }
  const gap = 24;
  if (!open) return { x: bx + bw - gap - 64, y: by + bh - gap - 64, w: 64, h: 64, r: 32, s: 1, bezel: 0 };
  const maxH = bh - BROWSER_BAR - 2 * gap;
  const w = size === 'expanded' ? Math.min(1080, bw - 2 * gap) : 408;
  const h = size === 'expanded' ? maxH : Math.min(700, maxH);
  return { x: bx + bw - gap - w, y: by + bh - gap - h, w, h, r: 22, s: 1, bezel: 0 };
}

interface StageProps {
  initialHost: HostId;
  initialOpen: boolean;
  initialSize: 'compact' | 'expanded';
  env: DeviceEnv;
}

export function Stage({ initialHost, initialOpen, initialSize, env }: StageProps) {
  const api = useChat();
  const [host, setHost] = useState<HostId>(initialHost);
  const [open, setOpen] = useState(initialOpen);
  const [size, setSize] = useState(initialSize);
  const [ui, setUi] = useState<ChatUi>({ activeId: null, historyOpen: false });
  const memory = useRef(new Map<string, ScrollMemory>()).current;
  const stage = useRef<HTMLElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [resizing, setResizing] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'));
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('chat-anchieta-tema', theme);
    } catch {
      // armazenamento indisponível: o tema vale só para esta visita
    }
  }, [theme]);
  const [grad, setGrad] = useState<GradId>(() => {
    try {
      const saved = localStorage.getItem('chat-anchieta-gradiente');
      return GRADS.some((g) => g.id === saved) ? (saved as GradId) : 'atual';
    } catch {
      return 'atual';
    }
  });
  useEffect(() => {
    document.documentElement.dataset.grad = grad;
    try {
      localStorage.setItem('chat-anchieta-gradiente', grad);
    } catch {
      // armazenamento indisponível: a escolha vale só para esta visita
    }
  }, [grad]);

  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const read = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    read();
    let t: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver(() => {
      // Redimensionar a janela acompanha na hora; a transição fica só para trocas de interface
      setResizing(true);
      read();
      clearTimeout(t);
      t = setTimeout(() => setResizing(false), 160);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      clearTimeout(t);
    };
  }, []);

  const [small, setSmall] = useState(() => matchMedia(SMALL_QUERY).matches);
  useEffect(() => {
    const mq = matchMedia(SMALL_QUERY);
    const on = () => setSmall(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  const visible = host !== 'portal' || open;
  const g = geometry(host, open, size, box.w, box.h, small);
  const ready = box.w > 0;

  const config = useMemo<HostConfig>(
    () => ({
      id: 'chat',
      channel: host,
      studentName: STUDENT_NAME,
      suggestions: host === 'tira-duvidas' ? TIRA_DUVIDAS_SUGGESTIONS : HOME_SUGGESTIONS,
      size,
      onToggleSize: host === 'portal' && !small ? () => setSize((s) => (s === 'compact' ? 'expanded' : 'compact')) : undefined,
      onClose: host === 'portal' ? () => setOpen(false) : undefined,
    }),
    [host, size, small],
  );

  // Abrir leva o foco ao campo de mensagem; fechar devolve o foco ao botão que abre
  const wasVisible = useRef(visible);
  useEffect(() => {
    if (wasVisible.current === visible) return;
    wasVisible.current = visible;
    if (!visible) {
      launcher.current?.focus({ preventScroll: true });
      return;
    }
    const t = setTimeout(() => {
      const root = shell.current;
      (root?.querySelector<HTMLElement>('.composer__input') ?? root?.querySelector<HTMLElement>('[data-screen-focus]'))?.focus({ preventScroll: true });
    }, 420);
    return () => clearTimeout(t);
  }, [visible]);

  /** Voltar do aplicativo (controle nativo): recua dentro do chat sem perder nada. */
  const onBack = useCallback(() => {
    if (ui.historyOpen) {
      setUi((u) => ({ ...u, historyOpen: false }));
      return;
    }
    const active = ui.activeId ? api.state.conversations[api.resolve(ui.activeId)] : undefined;
    if (active && active.messages.length > 0) setUi((u) => ({ ...u, activeId: api.newConversation('app') }));
  }, [api, ui]);

  const touch = host === 'app' && !small;
  useTouchSimulator(shell, touch);

  const style = {
    '--x': `${g.x}px`,
    '--y': `${g.y}px`,
    '--w': `${g.w}px`,
    '--h': `${g.h}px`,
    '--r': `${g.r}px`,
    '--s': g.s,
    '--bezel': `${g.bezel}px`,
  } as CSSProperties;

  return (
    <div className="ws" data-small={small || undefined}>
      <div className="ws__glow" aria-hidden="true" />

      <aside className="rail">
        <img className="rail__logo" src={brand.logoUrl} alt={brand.wordmark} width={154} height={Math.round(154 / brand.logoRatio)} />
        <div className="rail__body">
          <p className="rail__eyebrow">Chat Anchieta</p>
          <HostSwitch host={host} onChange={setHost} />
          <GradSwitch grad={grad} onChange={setGrad} />
        </div>
        <button type="button" className="btn btn--small btn--ghost rail__theme" style={{ marginTop: 'auto' }} onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))} aria-label={`Mudar para o tema ${theme === 'light' ? 'escuro' : 'claro'}`}>
          <FadeSwitch id={theme}>{theme === 'light' ? 'Tema claro' : 'Tema escuro'}</FadeSwitch>
        </button>
      </aside>

      <main className="stage" ref={stage} data-host={host}>
        <Scenes host={host} />

        <div
          ref={shell}
          className="shell"
          data-host={host}
          data-open={visible}
          data-ready={(ready && !resizing) || undefined}
          data-small={small || undefined}
          data-touch={touch || undefined}
          style={{ ...style, visibility: ready ? 'visible' : 'hidden' }}
        >
          <div className="shell__hardware" aria-hidden="true">
            <i className="hw hw--action" />
            <i className="hw hw--up" />
            <i className="hw hw--down" />
            <i className="hw hw--power" />
          </div>

          <div className="shell__screen">
            <NativeHeader active={host === 'app'} onBack={onBack} />
            <div className="shell__chat" ref={(el) => void (el && (el.inert = !visible))}>
              <ChatApp host={config} ui={ui} setUi={setUi} env={env} visible={visible} memory={memory} />
            </div>
            <span className="shell__homebar" aria-hidden="true" />
          </div>

          <span className="shell__island" aria-hidden="true" />

          <button ref={launcher} type="button" className="launcher" onClick={() => setOpen(true)} aria-label="Abrir Chat Anchieta" tabIndex={visible ? -1 : 0} aria-hidden={visible || undefined}>
            <Icon name="chat" size={28} />
          </button>
          <span className="launcher__hint" aria-hidden="true">
            Olá, eu sou a Ana!
          </span>
        </div>
      </main>
    </div>
  );
}

/* ——————————————————————————— Troca de interface ——————————————————————————— */

function HostSwitch({ host, onChange }: { host: HostId; onChange(h: HostId): void }) {
  const root = useRef<HTMLDivElement>(null);
  const [fill, setFill] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // O preenchimento é um elemento só, que desliza e se ajusta ao botão ativo
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const measure = () => {
      const b = el.querySelector<HTMLElement>('[aria-pressed="true"]');
      if (b) setFill({ x: b.offsetLeft, y: b.offsetTop, w: b.offsetWidth, h: b.offsetHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [host]);

  return (
    <div className="switch" ref={root} role="group" aria-label="Interface do chat">
      {fill && <span className="switch__fill" aria-hidden="true" style={{ transform: `translate(${fill.x}px, ${fill.y}px)`, width: fill.w, height: fill.h }} />}
      {HOSTS.map((h) => (
        <button key={h.id} type="button" className="switch__btn" aria-pressed={h.id === host} onClick={() => onChange(h.id)}>
          <Icon name={h.icon} size={20} />
          <span>{h.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ——————————————————————————— Variações do gradiente (comparação de proposta) ——————————————————————————— */

type GradId = 'atual' | 'alto' | 'longo' | 'sem-logo';

const GRADS: { id: GradId; label: string }[] = [
  { id: 'atual', label: 'Atual' },
  { id: 'alto', label: 'Curto' },
  { id: 'longo', label: 'Longo' },
  { id: 'sem-logo', label: 'Sem logo' },
];

function GradSwitch({ grad, onChange }: { grad: GradId; onChange(g: GradId): void }) {
  return (
    <div className="grads" role="group" aria-label="Variação do gradiente">
      {GRADS.map((g) => (
        <button key={g.id} type="button" className="grads__btn" data-grad={g.id} aria-pressed={g.id === grad} onClick={() => onChange(g.id)}>
          <i className="grads__swatch" aria-hidden="true" />
          <span>{g.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ——————————————————————————— Cenários de fundo ——————————————————————————— */

/** Entorno de cada canal — fora do escopo do redesign, desenhado só como contexto neutro. */
function Scenes({ host }: { host: HostId }) {
  const [note, setNote] = useState(false);
  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(false), 3200);
    return () => clearTimeout(t);
  }, [note]);
  const web = host !== 'app';
  return (
    <div className="browser" data-on={web} aria-hidden={!web || undefined}>
      <div className="browser__bar">
        <span className="browser__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="browser__address">
          <Icon name="lock" size={13} />
          <FadeSwitch id={host === 'tira-duvidas' ? 'td' : 'portal'}>{host === 'tira-duvidas' ? 'Tira-Dúvidas · Grupo Anchieta' : 'Aluno Online · Grupo Anchieta'}</FadeSwitch>
        </span>
      </div>
      <div className="browser__page">
        <div className="page page--portal" data-on={host === 'portal'} aria-hidden="true">
          <div className="page__nav">
            {[72, 54, 64, 48, 60, 52].map((w, i) => (
              <i key={i} style={{ width: `${w}%` }} />
            ))}
          </div>
          <div className="page__main">
            <i className="page__title" />
            <div className="page__cards">
              <i />
              <i />
              <i />
            </div>
            <i className="page__block" />
          </div>
        </div>
        <div className="page page--td" data-on={host === 'tira-duvidas'} ref={(el) => void (el && (el.inert = host !== 'tira-duvidas'))}>
          <p className="page__eyebrow">Central de ajuda</p>
          <h1 className="page__h1">Tira-Dúvidas</h1>
          <div className="page__row">
            <p className="page__lead">Converse com a Ana, assistente da UniAnchieta.</p>
            <button type="button" className="btn btn--small btn--ghost" onClick={() => setNote(true)}>
              Trocar tipo de dúvida
            </button>
          </div>
          <Collapse open={note} ms={220}>
            <p className="page__note" role="status">
              A troca de tipo de dúvida pertence à página de ajuda e fica fora deste protótipo.
            </p>
          </Collapse>
        </div>
      </div>
    </div>
  );
}

/* ——————————————————————————— Cabeçalho nativo do aplicativo ——————————————————————————— */

function NativeHeader({ active, onBack }: { active: boolean; onBack(): void }) {
  const [time, setTime] = useState(() => clock());
  useEffect(() => {
    const t = setInterval(() => setTime(clock()), 20_000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="native" ref={(el) => void (el && (el.inert = !active))} aria-hidden={!active || undefined}>
      <div className="native__status" aria-hidden="true">
        <span className="native__time">{time}</span>
        <span className="native__sys">
          <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
            <rect x="0" y="8" width="3" height="4" rx="1" />
            <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
            <rect x="10" y="3" width="3" height="9" rx="1" />
            <rect x="15" y="0" width="3" height="12" rx="1" />
          </svg>
          <svg width="17" height="12" viewBox="0 0 17 12" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
            <path d="M1.5 4.3a10 10 0 0114 0" />
            <path d="M4 6.9a6.4 6.4 0 019 0" />
            <circle cx="8.5" cy="10" r="1.2" fill="currentColor" stroke="none" />
          </svg>
          <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
            <rect x="0.5" y="0.5" width="22" height="12" rx="3.8" stroke="currentColor" opacity=".45" />
            <rect x="2" y="2" width="19" height="9" rx="2.5" fill="currentColor" />
            <path d="M24.5 4.5v4c.9-.3 1.5-1.1 1.5-2s-.6-1.7-1.5-2z" fill="currentColor" opacity=".5" />
          </svg>
        </span>
      </div>
      <div className="native__nav">
        <button type="button" className="native__back" onClick={onBack} aria-label="Voltar (controle do aplicativo)">
          <Icon name="chevronLeft" size={22} />
        </button>
        <span className="native__title">Atendimento</span>
      </div>
    </div>
  );
}

function clock(): string {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
