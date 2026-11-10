import type { Typing } from '../../core/types';
import { FadeSwitch } from '../motion';
import { AgentAvatar, Orb } from './Orb';

/**
 * Resposta em preparo. Duas apresentações diferentes, de propósito:
 * a Ana mostra a etapa em que está, com brilho percorrendo o texto;
 * uma pessoa da equipe mostra apenas que está digitando.
 */
export function Thinking({ typing }: { typing: Exclude<Typing, false> }) {
  if (typing.who === 'agent') {
    return (
      <div className="thinking thinking--agent" role="status">
        <AgentAvatar name={typing.name} size={26} />
        <span className="thinking__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="sr-only">{typing.name} está digitando…</span>
      </div>
    );
  }
  return (
    <div className="thinking" role="status">
      <Orb size={26} active />
      <FadeSwitch id={typing.label} className="thinking__label" ms={130}>
        <span className="shimmer" data-text={typing.label}>
          {typing.label}
        </span>
      </FadeSwitch>
    </div>
  );
}
