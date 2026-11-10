import { useEffect, useState, type ReactNode } from 'react';
import { useChat } from '../../core/ChatProvider';
import { openingShort } from '../../core/schedule';
import type { Conversation } from '../../core/types';
import { Icon } from '../Icon';
import { Collapse, FadeSwitch } from '../motion';

interface Props {
  conversation: Conversation;
}

/**
 * Faixa de atendimento, logo acima do campo de mensagem: diz em que pé está o atendimento
 * humano e oferece a única ação que faz sentido naquele momento: acompanhar a fila, cancelar o
 * pedido ou encerrar. Com a Ana, a faixa não aparece: o aluno pede uma pessoa escrevendo
 * (decisão de CX em 10/11/2026 — não incentivar a ida ao suporte logo de início).
 */
export function AttendanceBar({ conversation: c }: Props) {
  const api = useChat();
  const a = c.attendance;
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    setConfirmEnd(false);
    setEnding(false);
  }, [a.mode]);

  const key = a.mode === 'ai' ? 'none' : a.mode === 'agent' && confirmEnd ? 'agent-confirm' : a.mode;

  let body: ReactNode = null;
  if (a.mode === 'requesting') {
    body = (
      <span className="att__text" role="status">
        <span className="att__spinner" aria-hidden="true" />
        Chamando o Suporte ao Aluno…
      </span>
    );
  } else if (a.mode === 'queued') {
    body = (
      <div className="att__queue" role="status">
        <span className="att__pulse" aria-hidden="true" />
        <span className="att__stack">
          <span className="att__text">Na fila de {a.queue}</span>
          <FadeSwitch id={String(a.ahead)} className="att__strong">
            {a.ahead <= 0 ? 'Você é a próxima pessoa' : a.ahead === 1 ? '1 pessoa na sua frente' : `${a.ahead} pessoas na sua frente`}
          </FadeSwitch>
        </span>
      </div>
    );
  } else if (a.mode === 'scheduled') {
    body = (
      <>
        <span className="att__text" role="status">
          <Icon name="clock" size={16} />
          Pedido registrado · a fila abre {openingShort(new Date(a.opensAt), new Date())}
        </span>
        <button type="button" className="btn btn--small btn--ghost" onClick={() => api.cancelHandover(c.id)}>
          Cancelar pedido
        </button>
      </>
    );
  } else if (key === 'agent') {
    body = (
      <>
        <span className="att__text">Já resolveu o que precisava?</span>
        <button type="button" className="btn btn--small btn--ghost" onClick={() => setConfirmEnd(true)}>
          Encerrar atendimento
        </button>
      </>
    );
  } else if (key === 'agent-confirm') {
    body = (
      <>
        <span className="att__text">Encerrar? Você ainda poderá ler esta conversa.</span>
        <span className="att__actions">
          <button type="button" className="btn btn--small btn--ghost" onClick={() => setConfirmEnd(false)} disabled={ending}>
            Continuar
          </button>
          <button
            type="button"
            className="btn btn--small btn--danger"
            disabled={ending}
            onClick={() => {
              setEnding(true);
              void api.closeConversation(c.id).catch(() => setEnding(false));
            }}
          >
            {ending ? 'Encerrando…' : 'Encerrar'}
          </button>
        </span>
      </>
    );
  }

  return (
    <Collapse open={key !== 'none' && a.mode !== 'closed'}>
      <div className="att" data-mode={a.mode}>
        <FadeSwitch id={key} className="att__switch">
          <div className="att__row">{body}</div>
        </FadeSwitch>
      </div>
    </Collapse>
  );
}
