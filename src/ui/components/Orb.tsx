import type { CSSProperties } from 'react';
import { brand } from '../brand';

/**
 * Símbolo da Ana (assistente). Usa a miniatura oficial (src/assets/ana.png) quando presente;
 * sem ela, cai no orbe abstrato. O aviso "A Ana é uma IA" fica no rodapé do composer.
 */
export function Orb({ size = 28, active = false }: { size?: number; active?: boolean }) {
  if (brand.anaUrl) {
    return (
      <span className="orb orb--photo" data-active={active || undefined} style={{ '--orb': `${size}px` } as CSSProperties} aria-hidden="true">
        <img src={brand.anaUrl} alt="" width={size} height={size} />
      </span>
    );
  }
  return (
    <span className="orb" data-active={active || undefined} style={{ '--orb': `${size}px` } as CSSProperties} aria-hidden="true">
      <span className="orb__swirl" />
      <span className="orb__shine" />
    </span>
  );
}

/** Pessoa da equipe: iniciais em um círculo com anel dourado (nunca o símbolo da IA). */
export function AgentAvatar({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <span className="agent-avatar" style={{ '--av': `${size}px` } as CSSProperties} aria-hidden="true">
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
