import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/**
 * Primitivas de movimento. Regra do produto: nada aparece ou some "de uma vez".
 * Toda entrada, saída e troca passa por uma transição contínua e interrompível
 * (docs/06). Com movimento reduzido, viram fades curtos, sem deslocamento.
 */

export function prefersReducedMotion(): boolean {
  if (typeof document === 'undefined') return false;
  if (document.documentElement.dataset.motion === 'reduce') return true;
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Mantém o elemento montado durante a saída. `visible` muda um quadro depois de montar. */
export function usePresence(open: boolean, exitMs = 240) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);
  useEffect(() => {
    if (open) {
      setMounted(true);
      let second = 0;
      const first = requestAnimationFrame(() => {
        second = requestAnimationFrame(() => setVisible(true));
      });
      return () => {
        cancelAnimationFrame(first);
        cancelAnimationFrame(second);
      };
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), exitMs);
    return () => clearTimeout(t);
  }, [open, exitMs]);
  return { mounted: mounted || open, visible: visible && open };
}

/** Abre e fecha em altura sem medir o conteúdo (grade 0fr → 1fr). Mantém o conteúdo durante a saída. */
export function Collapse({ open, children, className = '', ms = 280 }: { open: boolean; children: ReactNode; className?: string; ms?: number }) {
  const { mounted, visible } = usePresence(open, ms);
  const last = useRef<ReactNode>(children);
  if (open) last.current = children;
  if (!mounted) return null;
  return (
    <div className={`collapse ${className}`} data-open={visible} aria-hidden={!open || undefined}>
      <div className="collapse__inner">{open ? children : last.current}</div>
    </div>
  );
}

/**
 * Troca de conteúdo sem corte: o conteúdo antigo sai (fade curto), o novo entra.
 * Enquanto a chave não muda, o conteúdo atualiza normalmente.
 */
export function FadeSwitch({
  id,
  children,
  className = '',
  ms = 150,
  style,
}: {
  id: string;
  children: ReactNode;
  className?: string;
  ms?: number;
  style?: CSSProperties;
}) {
  const [shown, setShown] = useState<{ id: string; node: ReactNode }>({ id, node: children });
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const latest = useRef({ id, children });
  latest.current = { id, children };

  useEffect(() => {
    if (id === shown.id) {
      setPhase('in');
      return;
    }
    if (prefersReducedMotion()) {
      setShown({ id, node: children });
      return;
    }
    setPhase('out');
    const t = setTimeout(() => {
      setShown({ id: latest.current.id, node: latest.current.children });
      setPhase('in');
    }, ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, shown.id, ms]);

  return (
    <div className={`fade-switch ${className}`} data-phase={phase} style={style}>
      <div className="fade-switch__item" key={shown.id}>
        {id === shown.id ? children : shown.node}
      </div>
    </div>
  );
}

/** Largura do contêiner (não da tela): o layout responde ao espaço que o hospedeiro oferece. */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.offsetWidth); // sem a escala do hospedeiro (o celular pode estar reduzido)
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}
