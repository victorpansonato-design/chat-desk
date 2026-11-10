import { useEffect, useLayoutEffect, useRef } from 'react';
import type { AttachmentMeta } from '../../core/types';
import { Icon } from '../Icon';
import { prefersReducedMotion } from '../motion';

export interface LightboxTarget {
  file: AttachmentMeta;
  /** Miniatura de origem: a imagem cresce a partir dela e volta para ela ao fechar. */
  from: HTMLElement;
}

const EASE = 'cubic-bezier(0.2, 0, 0, 1)';
const SCRIM = 'rgba(2, 7, 18, 0.88)';
const CLEAR = 'rgba(2, 7, 18, 0)';

export function Lightbox({ target, onClose }: { target: LightboxTarget; onClose(): void }) {
  const layer = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const closing = useRef(false);

  /** Transformação que leva a imagem ampliada de volta ao lugar e ao tamanho da miniatura. */
  const toThumb = () => {
    const a = target.from.getBoundingClientRect();
    const b = img.current!.getBoundingClientRect();
    if (!b.width || !b.height) return 'none';
    // O hospedeiro pode estar em escala (celular reduzido): converte a distância para o espaço local
    const k = b.width / (img.current!.offsetWidth || b.width);
    const dx = (a.left + a.width / 2 - (b.left + b.width / 2)) / k;
    const dy = (a.top + a.height / 2 - (b.top + b.height / 2)) / k;
    return `translate(${dx}px, ${dy}px) scale(${a.width / b.width}, ${a.height / b.height})`;
  };

  useLayoutEffect(() => {
    if (prefersReducedMotion() || !img.current || !layer.current) return;
    img.current.animate([{ transform: toThumb() }, { transform: 'none' }], { duration: 420, easing: EASE });
    layer.current.animate([{ backgroundColor: CLEAR }, { backgroundColor: SCRIM }], { duration: 300, easing: 'ease-out' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    if (prefersReducedMotion() || !img.current || !layer.current || !target.from.isConnected) {
      onClose();
      return;
    }
    layer.current.animate([{ backgroundColor: SCRIM }, { backgroundColor: CLEAR }], { duration: 300, easing: 'ease-in', fill: 'forwards' });
    img.current.animate([{ transform: 'none' }, { transform: toThumb() }], { duration: 320, easing: EASE, fill: 'forwards' }).onfinish = onClose;
  };

  useEffect(() => {
    const trigger = target.from;
    const el = layer.current;
    el?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' && e.key !== 'Tab') return;
      e.preventDefault(); // um único controle: o foco não sai do diálogo
      if (e.key === 'Escape') close();
    };
    el?.addEventListener('keydown', onKey);
    return () => {
      el?.removeEventListener('keydown', onKey);
      if (trigger.isConnected) trigger.focus({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="lightbox" ref={layer} role="dialog" aria-modal="true" aria-label={`Imagem ${target.file.name}`} onClick={close}>
      <button type="button" className="icon-btn lightbox__close" aria-label="Fechar imagem" onClick={close}>
        <Icon name="close" />
      </button>
      <img ref={img} src={target.file.previewUrl} alt={target.file.name} width={target.file.width} height={target.file.height} onClick={(e) => e.stopPropagation()} />
    </div>
  );
}
