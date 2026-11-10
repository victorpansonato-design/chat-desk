import { useEffect, type RefObject } from 'react';

const DRAG_START_PX = 6;
const FRICTION = 0.95; // por quadro (~60 Hz)

function scrollableFrom(start: Element | null, root: Element): HTMLElement | null {
  for (let el = start; el && el !== root.parentElement; el = el.parentElement) {
    if (!(el instanceof HTMLElement)) continue;
    const oy = getComputedStyle(el).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) return el;
  }
  return null;
}

/**
 * Simula o toque na interface Aplicativo quando vista no computador: arrastar com o mouse
 * rola a tela (com inércia, como o dedo), um arrasto não vira clique e a roda do mouse é
 * ignorada. Só afeta o protótipo; num aparelho real, o toque é nativo.
 */
export function useTouchSimulator(ref: RefObject<HTMLElement>, enabled: boolean) {
  useEffect(() => {
    const root = ref.current;
    if (!root || !enabled) return;

    let target: HTMLElement | null = null;
    let startY = 0;
    let lastY = 0;
    let lastT = 0;
    let velocity = 0; // px por ms, no espaço do conteúdo
    let dragging = false;
    let suppressClick = false;
    let raf = 0;

    const scale = () => root.getBoundingClientRect().width / root.offsetWidth || 1;

    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      cancelAnimationFrame(raf);
      root.dataset.pressing = '';
      target = scrollableFrom(e.target as Element, root);
      startY = lastY = e.clientY;
      lastT = e.timeStamp;
      velocity = 0;
      dragging = false;
    };

    const move = (e: PointerEvent) => {
      if (!target || !(e.buttons & 1)) return;
      if (!dragging) {
        if (Math.abs(e.clientY - startY) < DRAG_START_PX) return;
        dragging = true;
        getSelection()?.removeAllRanges();
      }
      const dy = (e.clientY - lastY) / scale();
      const dt = Math.max(1, e.timeStamp - lastT);
      target.scrollTop -= dy;
      velocity = 0.7 * (-dy / dt) + 0.3 * velocity;
      lastY = e.clientY;
      lastT = e.timeStamp;
      e.preventDefault();
    };

    const up = (e: PointerEvent) => {
      delete root.dataset.pressing;
      const el = target;
      target = null;
      if (!dragging || !el) return;
      dragging = false;
      suppressClick = true;
      setTimeout(() => (suppressClick = false), 0);
      if (e.timeStamp - lastT > 80) return; // parou antes de soltar: sem inércia
      let v = velocity * 16;
      const glide = () => {
        if (Math.abs(v) < 0.3) return;
        el.scrollTop += v;
        v *= FRICTION;
        raf = requestAnimationFrame(glide);
      };
      raf = requestAnimationFrame(glide);
    };

    // Um arrasto nunca aciona o botão que estava sob o "dedo"
    const click = (e: MouseEvent) => {
      if (!suppressClick) return;
      e.stopPropagation();
      e.preventDefault();
    };
    const wheel = (e: WheelEvent) => e.preventDefault();
    const dragstart = (e: DragEvent) => e.preventDefault();

    root.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    root.addEventListener('click', click, true);
    root.addEventListener('wheel', wheel, { passive: false });
    root.addEventListener('dragstart', dragstart);
    return () => {
      cancelAnimationFrame(raf);
      delete root.dataset.pressing;
      root.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      root.removeEventListener('click', click, true);
      root.removeEventListener('wheel', wheel);
      root.removeEventListener('dragstart', dragstart);
    };
  }, [ref, enabled]);
}
