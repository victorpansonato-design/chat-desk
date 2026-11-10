import { memo, useState, type CSSProperties } from 'react';
import { useChat } from '../../core/ChatProvider';
import { isPasswordReset } from '../../core/types';
import type { AttachmentMeta, Message } from '../../core/types';
import { fileSize, timeOf } from '../format';
import { Icon } from '../Icon';
import { Collapse, FadeSwitch } from '../motion';
import { AudioPlayer } from './AudioPlayer';
import { AgentAvatar, Orb } from './Orb';
import { PasswordReset } from './PasswordReset';
import { RichText } from './RichText';

export function excerptOf(m: Message): string {
  const c = m.content;
  if (c.kind === 'text') return c.text.replace(/\*\*/g, '').slice(0, 120);
  if (c.kind === 'attachment') return `Arquivo: ${c.file.name}`;
  if (c.kind === 'audio') return 'Mensagem de voz';
  if (c.kind === 'event') return c.text;
  if (c.kind === 'nps') return 'Pesquisa de satisfação';
  return 'Formulário';
}

export function senderLabel(m: Message): string {
  if (m.sender === 'student') return 'Você';
  if (m.sender === 'ai') return `${m.author?.name ?? 'Ana'}, assistente`;
  if (m.sender === 'agent') return `${m.author?.name ?? 'Atendente'}, do Suporte ao Aluno`;
  return 'Chat Anchieta';
}

/** Escala de satisfação em tons sóbrios: do tijolo ao verde, passando pelo ocre. */
const RATING_TONES = ['#a8443c', '#b9683a', '#a98a2c', '#6c8f48', '#2f7d57'];
const RATING_WORDS = ['Ruim', 'Fraca', 'Regular', 'Boa', 'Ótima'];
const npsTone = (v: number) => (v <= 6 ? RATING_TONES[Math.min(2, Math.floor(v / 3))] : v <= 8 ? RATING_TONES[3] : RATING_TONES[4]);
const tone = (c: string) => ({ '--tone': c }) as CSSProperties;

const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*\s*){1,3}$/u;

interface Props {
  m: Message;
  /** Primeira mensagem de uma sequência do mesmo remetente: mostra quem fala. */
  groupStart: boolean;
  groupEnd: boolean;
  readonly: boolean;
  /** Avaliação 1–5: só na resposta mais recente da Ana (ou onde já foi avaliada). */
  showRating: boolean;
  onReply(m: Message): void;
  onOpenImage(file: AttachmentMeta, from: HTMLElement): void;
}

export const MessageItem = memo(function MessageItem({ m, groupStart, groupEnd, readonly, showRating, onReply, onOpenImage }: Props) {
  const api = useChat();
  // Só o que acabou de chegar entra animado; histórico aberto não se move
  const [fresh] = useState(() => Date.now() - m.createdAt < 2500);
  const c = m.content;
  const cid = m.conversationId;

  if (c.kind === 'event') {
    if (c.event === 'agent-joined') {
      return (
        <li className="handoff" data-new={fresh || undefined}>
          <div className="handoff__rule" aria-hidden="true">
            <span />
            <span className="handoff__pair">
              <Orb size={22} />
              <Icon name="chevronRight" size={14} />
              <AgentAvatar name={agentNameFrom(c.text)} size={22} />
            </span>
            <span />
          </div>
          <p className="handoff__text">{c.text}</p>
          <time className="handoff__time" dateTime={new Date(m.createdAt).toISOString()}>
            {timeOf(m.createdAt)}
          </time>
        </li>
      );
    }
    if (c.event === 'closed') {
      return (
        <li className="divider" data-new={fresh || undefined}>
          <span>
            <Icon name="lock" size={14} />
            {c.text} · {timeOf(m.createdAt)}
          </span>
        </li>
      );
    }
    const tone = c.event === 'handover-queued' ? 'team' : c.event === 'handover-failed' || c.event === 'handover-unavailable' ? 'warn' : 'info';
    return (
      <li className="notice-msg" data-tone={tone} data-new={fresh || undefined}>
        <span className="notice-msg__icon" aria-hidden="true">
          <Icon name={tone === 'team' ? 'headset' : tone === 'warn' ? 'alert' : 'info'} size={18} />
        </span>
        <div>
          <p>{c.text}</p>
          <time dateTime={new Date(m.createdAt).toISOString()}>{timeOf(m.createdAt)}</time>
        </div>
      </li>
    );
  }

  if (c.kind === 'nps') {
    const nps = m.nps ?? { status: 'idle' as const };
    const answered = nps.status === 'answered';
    return (
      <li className="nps" data-new={fresh || undefined}>
        <p className="nps__eyebrow">Pesquisa de satisfação</p>
        <p className="nps__q" id={`${m.id}-q`}>
          {c.question}
        </p>
        <FadeSwitch id={answered ? 'done' : 'ask'}>
          {answered ? (
            <p className="nps__done" role="status">
              <span className="nps__value" style={tone(npsTone(nps.value ?? 10))}>{nps.value}</span>
              Sua resposta: {nps.value}. Obrigada!
            </p>
          ) : (
            <>
              <div className="nps__scale" role="group" aria-labelledby={`${m.id}-q`}>
                {Array.from({ length: 11 }, (_, v) => (
                  <button
                    key={v}
                    type="button"
                    className="nps__btn"
                    style={tone(npsTone(v))}
                    data-selected={nps.value === v || undefined}
                    disabled={nps.status === 'sending'}
                    aria-label={`Nota ${v}`}
                    onClick={() => api.answerNps(cid, m.id, v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <div className="nps__anchors" aria-hidden="true">
                <span>Nada provável</span>
                <span>Muito provável</span>
              </div>
              <Collapse open={nps.status === 'error'}>
                <p className="nps__error" role="alert">
                  Não foi possível registrar sua resposta.{' '}
                  <button type="button" className="link" onClick={() => nps.value !== undefined && api.answerNps(cid, m.id, nps.value)}>
                    Tentar novamente
                  </button>
                </p>
              </Collapse>
            </>
          )}
        </FadeSwitch>
      </li>
    );
  }

  const mine = m.sender === 'student';
  const failed = m.delivery === 'failed';
  const pending = m.delivery === 'pending';
  const isEmoji = c.kind === 'text' && EMOJI_ONLY.test(c.text.trim());
  const plain = (m.sender === 'ai' && (c.kind === 'text' || c.kind === 'form')) || isEmoji;
  const canAct = !readonly && !mine && (c.kind === 'text' || c.kind === 'attachment' || c.kind === 'audio');

  return (
    <li
      className="msg"
      data-sender={m.sender}
      data-kind={c.kind}
      data-start={groupStart || undefined}
      data-end={groupEnd || undefined}
      data-new={fresh || undefined}
      data-failed={failed || undefined}
    >
      <span className="sr-only">{senderLabel(m)}: </span>

      {groupStart && m.sender === 'ai' && (
        <div className="msg__who" aria-hidden="true">
          <Orb size={24} />
          <span className="msg__name">{m.author?.name ?? 'Ana'}</span>        </div>
      )}
      {groupStart && m.sender === 'agent' && (
        <div className="msg__who msg__who--agent" aria-hidden="true">
          <AgentAvatar name={m.author?.name ?? 'A'} size={24} />
          <span className="msg__name">{m.author?.name ?? 'Atendente'}</span>
          <span className="tag tag--team">{m.author?.role ?? 'Suporte ao Aluno'}</span>
        </div>
      )}

      <div className="msg__row">
        <div className={`msg__body${plain ? ' msg__body--plain' : ''}${isEmoji ? ' msg__body--emoji' : ''}`}>
          {m.replyTo && (
            <blockquote className="quote">
              <span className="quote__who">{m.replyTo.senderLabel}</span>
              <span className="quote__text">{m.replyTo.excerpt}</span>
            </blockquote>
          )}

          {c.kind === 'text' && <RichText text={c.text} reveal={fresh && !mine} />}

          {c.kind === 'attachment' &&
            (c.file.mime.startsWith('image/') && c.file.previewUrl ? (
              <button type="button" className="thumb" onClick={(e) => onOpenImage(c.file, e.currentTarget)} aria-label={`Ampliar imagem ${c.file.name}`}>
                <img src={c.file.previewUrl} alt="" width={c.file.width} height={c.file.height} loading="lazy" />
              </button>
            ) : (
              <div className="file">
                <span className="file__icon" aria-hidden="true">
                  <Icon name="file" size={22} />
                </span>
                <span className="file__text">
                  <span className="file__name">{c.file.name}</span>
                  <span className="file__meta">
                    {c.file.mime === 'application/pdf' ? 'PDF' : 'Arquivo'} · {fileSize(c.file.size)}
                  </span>
                </span>
              </div>
            ))}

          {c.kind === 'audio' && <AudioPlayer seed={m.id} durationSec={c.durationSec} url={c.url} />}

          {c.kind === 'form' &&
            (isPasswordReset(c) ? (
              <PasswordReset m={m} payload={c.payload} readonly={readonly} />
            ) : (
              <p className="form-fallback">
                <Icon name="info" size={18} />
                Este tipo de conteúdo ainda não é exibido neste chat.
              </p>
            ))}

          {pending && m.progress !== undefined && (
            <span className="upload" role="progressbar" aria-label="Enviando arquivo" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(m.progress * 100)}>
              <i style={{ transform: `scaleX(${Math.max(0.04, m.progress)})` }} />
            </span>
          )}

          {m.actions && (
            <div className="msg__actions" role="group" aria-label="Opções">
              {m.actions.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={`btn btn--small ${a.id === 'cancel-request' ? 'btn--ghost' : 'btn--soft'}`}
                  data-chosen={m.actionTaken === a.id || undefined}
                  disabled={!!m.actionTaken || readonly}
                  onClick={() => api.chooseAction(cid, m.id, a.id)}
                >
                  {m.actionTaken === a.id && <Icon name="check" size={16} />}
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {canAct && (
          <div className="msg__tools">
            <button type="button" className="tool" onClick={() => onReply(m)} aria-label="Responder a esta mensagem">
              <Icon name="reply" size={16} />
            </button>
            <button type="button" className="tool" data-on={!!m.reaction || undefined} aria-pressed={!!m.reaction} onClick={() => api.toggleReaction(cid, m.id)} aria-label="Curtir esta mensagem">
              <Icon name="like" size={16} />
            </button>
          </div>
        )}
      </div>

      {m.reaction && !canAct && (
        <span className="msg__reaction" aria-label="Você curtiu">
          <Icon name="like" size={14} />
        </span>
      )}

      <Collapse open={failed}>
        <div className="failed" role="alert">
          <p>
            <Icon name="alert" size={16} />
            {m.failReason === 'closed' ? 'Não enviada: o atendimento foi encerrado.' : 'Não enviada. Verifique sua conexão.'}
          </p>
          <div className="failed__actions">
            {m.failReason !== 'closed' && (
              <button type="button" className="btn btn--small btn--soft" onClick={() => api.retry(cid, m.id)}>
                <Icon name="refresh" size={16} /> Tentar novamente
              </button>
            )}
            {c.kind === 'text' && m.failReason !== 'closed' && (
              <button type="button" className="btn btn--small btn--ghost" onClick={() => api.editFailed(cid, m.id)}>
                Editar
              </button>
            )}
            <button type="button" className="btn btn--small btn--ghost" onClick={() => api.discardFailed(cid, m.id)}>
              Descartar
            </button>
          </div>
        </div>
      </Collapse>

      {(groupEnd || pending) && !failed && (
        <div className="msg__meta">
          <time dateTime={new Date(m.createdAt).toISOString()}>{timeOf(m.createdAt)}</time>
          {mine && (
            <FadeSwitch id={pending ? 'pending' : 'sent'} className="msg__delivery">
              {pending ? (
                <span>Enviando…</span>
              ) : (
                <span className="msg__sent">
                  <Icon name="check" size={13} />
                  <span className="sr-only">Enviada</span>
                </span>
              )}
            </FadeSwitch>
          )}
        </div>
      )}

      {m.rating && (
        <Collapse open={showRating || m.rating.value !== undefined}>
          <Rating m={m} readonly={readonly} />
        </Collapse>
      )}
    </li>
  );
});

function agentNameFrom(text: string): string {
  return /falando com ([^,]+),/.exec(text)?.[1] ?? 'Atendente';
}

/** OBSERVADO ao vivo: "Avaliar: 1 2 3 4 5" abaixo de cada resposta da IA. */
function Rating({ m, readonly }: { m: Message; readonly: boolean }) {
  const api = useChat();
  const r = m.rating!;
  const sent = r.status === 'sent';
  return (
    <div className="rating" role="group" aria-label="Avaliar esta resposta de 1 a 5">
      <FadeSwitch id={sent ? 'sent' : 'ask'}>
        {sent ? (
          <span className="rating__done">
            <i style={tone(RATING_TONES[(r.value ?? 5) - 1])}>{r.value}</i> Avaliação enviada: {RATING_WORDS[(r.value ?? 5) - 1]}
          </span>
        ) : (
          <>
            <span className="rating__label">{r.status === 'error' ? 'Não foi possível avaliar. Tente de novo:' : 'Esta resposta ajudou?'}</span>
            <span className="rating__scale">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                type="button"
                className="rating__btn"
                style={tone(RATING_TONES[v - 1])}
                title={RATING_WORDS[v - 1]}
                data-selected={r.value === v || undefined}
                disabled={readonly || r.status === 'sending'}
                aria-label={`Nota ${v} de 5: ${RATING_WORDS[v - 1]}`}
                onClick={() => api.rate(m.conversationId, m.id, v)}
              >
                {v}
              </button>
            ))}
            </span>
          </>
        )}
      </FadeSwitch>
    </div>
  );
}
