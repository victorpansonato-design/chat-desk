import { Fragment, type CSSProperties, type ReactNode } from 'react';

/**
 * Renderiza texto simples em parágrafos, listas "- " e **negrito**. Nunca interpreta HTML recebido.
 * Links http(s) viram âncoras seguras. `reveal` faz os blocos entrarem em cascata (resposta nova).
 */
const TOKEN_RE = /(https?:\/\/[^\s<>"')]+|\*\*[^*\n]+\*\*)/g;

function inline(text: string): ReactNode[] {
  return text.split(TOKEN_RE).map((p, i) => {
    if (i % 2 === 0) return <Fragment key={i}>{p}</Fragment>;
    if (p.startsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
    return (
      <a key={i} href={p} target="_blank" rel="noopener noreferrer">
        {p}
      </a>
    );
  });
}

export function RichText({ text, reveal = false }: { text: string; reveal?: boolean }) {
  const blocks = text.split(/\n{2,}/);
  let step = 0;
  const next = (): { className?: string; style?: CSSProperties } =>
    reveal ? { className: 'reveal', style: { '--i': step++ } as CSSProperties } : {};
  return (
    <>
      {blocks.map((block, bi) => {
        const lines = block.split('\n');
        if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
          return (
            <ul key={bi}>
              {lines.map((l, li) => (
                <li key={li} {...next()}>
                  {inline(l.replace(/^\s*[-•]\s+/, ''))}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={bi} {...next()}>
            {lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {inline(l)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}
