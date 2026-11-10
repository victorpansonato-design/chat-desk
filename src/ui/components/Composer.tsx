import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { newClientId, useChat } from '../../core/ChatProvider';
import type { Conversation } from '../../core/types';
import { duration, fileSize } from '../format';
import { Icon } from '../Icon';
import { Collapse, FadeSwitch } from '../motion';
import type { DeviceEnv } from '../types';
import { AudioPlayer } from './AudioPlayer';

/** Limites APENAS de demonstração — os reais dependem do contrato com a TI. */
const DEMO_MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = 'image/*,application/pdf,audio/*';
const accepted = (mime: string) => mime.startsWith('image/') || mime.startsWith('audio/') || mime === 'application/pdf';
const MAX_INPUT_PX = 152;
const LEVELS = 28;

type Rec =
  | { s: 'idle' }
  | { s: 'asking' }
  | { s: 'recording'; start: number }
  | { s: 'review'; url: string; sec: number }
  | { s: 'error'; kind: 'denied' | 'unsupported' | 'failed' };

interface Session {
  cancelled: boolean;
  stream?: MediaStream;
  recorder?: MediaRecorder;
  ctx?: AudioContext;
  chunks: Blob[];
}

interface Props {
  conversation: Conversation;
  env: DeviceEnv;
  autoFocus?: boolean;
}

export function Composer({ conversation, env, autoFocus }: Props) {
  const api = useChat();
  const draft = api.draftOf(conversation.id);
  const ta = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const [fileError, setFileError] = useState(false);
  const [rec, setRec] = useState<Rec>({ s: 'idle' });
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array(LEVELS).fill(0.08));
  const session = useRef<Session | null>(null);
  const reviewUrl = useRef<string | null>(null);

  const coarse = useMemo(() => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches, []);
  const att = conversation.attendance;
  const target =
    att.mode === 'agent'
      ? `${att.agent.name}, do Suporte ao Aluno`
      : att.mode === 'queued' || att.mode === 'requesting'
        ? 'a equipe do Suporte ao Aluno'
        : 'Ana, assistente';
  const placeholder = att.mode === 'agent' ? `Escreva para ${att.agent.name}` : att.mode === 'queued' || att.mode === 'requesting' ? 'Escreva para o Suporte ao Aluno' : 'Pergunte à Ana';
  const hint =
    att.mode === 'agent'
      ? `Você está falando com ${att.agent.name}, do Suporte ao Aluno.`
      : att.mode === 'queued' || att.mode === 'requesting'
        ? 'Pode continuar escrevendo: o atendente lê tudo quando assumir.'
        : 'A Ana é uma IA e pode cometer erros.';
  const canSend = draft.text.trim().length > 0 || draft.attachments.length > 0;

  // Altura automática com transição: mede o destino e anima a partir da altura atual
  useLayoutEffect(() => {
    const el = ta.current;
    if (!el) return;
    const from = el.offsetHeight;
    el.style.height = 'auto';
    const to = Math.min(el.scrollHeight, MAX_INPUT_PX);
    el.style.height = `${from}px`;
    void el.offsetHeight;
    el.style.height = `${to}px`;
    el.style.overflowY = el.scrollHeight > MAX_INPUT_PX ? 'auto' : 'hidden';
  }, [draft.text, rec.s]);

  useEffect(() => {
    if (autoFocus && !coarse) ta.current?.focus({ preventScroll: true });
  }, [autoFocus, coarse]);

  // Cronômetro da gravação
  useEffect(() => {
    if (rec.s !== 'recording') return;
    const t = setInterval(() => setElapsed((Date.now() - rec.start) / 1000), 250);
    return () => clearInterval(t);
  }, [rec]);

  // Ao sair (trocar de conversa, fechar): solta o microfone e as URLs locais
  useEffect(
    () => () => {
      const s = session.current;
      if (s) {
        s.cancelled = true;
        release(s);
      }
      if (reviewUrl.current) URL.revokeObjectURL(reviewUrl.current);
    },
    [],
  );

  function release(s: Session) {
    if (s.recorder?.state === 'recording') s.recorder.stop();
    s.stream?.getTracks().forEach((t) => t.stop());
    void s.ctx?.close().catch(() => undefined);
    s.stream = undefined;
    s.ctx = undefined;
  }

  function send() {
    if (!canSend) return;
    api.send(conversation.id);
    setFileError(false);
    ta.current?.focus({ preventScroll: true });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter' || e.shiftKey) return;
    if (e.nativeEvent.isComposing || e.keyCode === 229) return; // IME: nunca envia durante composição
    if (coarse) return; // toque: Enter quebra linha, envio pelo botão
    e.preventDefault();
    send();
  }

  async function onFiles(list: FileList | null) {
    setFileError(false);
    const f = list?.[0];
    if (fileInput.current) fileInput.current.value = '';
    if (!f) return; // seletor cancelado: sem erro falso
    if (!accepted(f.type) || f.size > DEMO_MAX_BYTES || f.size === 0) {
      setFileError(true);
      return;
    }
    const previewUrl = URL.createObjectURL(f);
    let width: number | undefined;
    let height: number | undefined;
    if (f.type.startsWith('image/')) {
      await new Promise<void>((res) => {
        const img = new Image();
        img.onload = () => {
          width = img.naturalWidth;
          height = img.naturalHeight;
          res();
        };
        img.onerror = () => res();
        img.src = previewUrl;
      });
    }
    api.addAttachment(conversation.id, { id: newClientId('att'), file: { name: f.name, size: f.size, mime: f.type, previewUrl, width, height } });
  }

  function removeAttachment(id: string) {
    const a = draft.attachments.find((x) => x.id === id);
    if (a?.file.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(a.file.previewUrl);
    api.removeAttachment(conversation.id, id);
  }

  async function startRecording() {
    setFileError(false);
    if (env.mic === 'unsupported' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setRec({ s: 'error', kind: 'unsupported' });
      return;
    }
    if (env.mic === 'denied') {
      setRec({ s: 'error', kind: 'denied' });
      return;
    }
    const s: Session = { cancelled: false, chunks: [] };
    session.current = s;
    setRec({ s: 'asking' });
    try {
      // Permissão nativa do navegador/sistema — não é redesenhada pelo chat
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.stream = stream;
      if (s.cancelled) {
        release(s); // cancelou (ou saiu) enquanto a permissão era pedida: nada começa
        return;
      }
      const recorder = new MediaRecorder(stream);
      s.recorder = recorder;
      recorder.ondataavailable = (e) => e.data.size && s.chunks.push(e.data);
      const start = Date.now();
      recorder.onstop = () => {
        s.stream?.getTracks().forEach((t) => t.stop());
        void s.ctx?.close().catch(() => undefined);
        if (s.cancelled) return;
        const blob = new Blob(s.chunks, { type: recorder.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        reviewUrl.current = url;
        setRec({ s: 'review', url, sec: Math.max(1, (Date.now() - start) / 1000) });
      };
      recorder.start();
      meter(s, stream);
      setElapsed(0);
      setRec({ s: 'recording', start });
    } catch (err) {
      release(s);
      if (s.cancelled) return;
      const name = (err as DOMException)?.name;
      setRec({ s: 'error', kind: name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'failed' });
    }
  }

  /** Nível real do microfone: confirma para a pessoa que a voz está sendo captada. */
  function meter(s: Session, stream: MediaStream) {
    try {
      const ctx = new AudioContext();
      s.ctx = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      let last = 0;
      const tick = (t: number) => {
        if (s.cancelled || s.recorder?.state !== 'recording') return;
        if (t - last > 90) {
          last = t;
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (const v of buf) sum += ((v - 128) / 128) ** 2;
          const level = Math.min(1, 0.08 + Math.sqrt(sum / buf.length) * 3.2);
          setLevels((prev) => [...prev.slice(1), level]);
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch {
      // Sem medidor: a gravação continua normalmente
    }
  }

  function stopRecording(cancel: boolean) {
    const s = session.current;
    if (!s) return;
    s.cancelled = cancel;
    if (s.recorder?.state === 'recording') s.recorder.stop();
    else release(s);
    if (cancel) {
      setRec({ s: 'idle' });
      setLevels(Array(LEVELS).fill(0.08));
    }
  }

  function discardReview() {
    if (reviewUrl.current) URL.revokeObjectURL(reviewUrl.current);
    reviewUrl.current = null;
    setRec({ s: 'idle' });
    setLevels(Array(LEVELS).fill(0.08));
  }

  function sendAudio() {
    if (rec.s !== 'review') return;
    api.sendAudio(conversation.id, rec.sec, rec.url);
    reviewUrl.current = null; // a URL passa a pertencer à mensagem
    setRec({ s: 'idle' });
    setLevels(Array(LEVELS).fill(0.08));
  }

  const view = rec.s === 'recording' || rec.s === 'asking' ? 'rec' : rec.s === 'review' ? 'review' : 'text';
  const micError = rec.s === 'error' ? rec.kind : null;

  return (
    <div className="composer-wrap">
      <Collapse open={!!micError}>
        <div className="notice notice--warn" role="alert">
          <Icon name="info" size={18} />
          <p>
            {micError === 'denied' && 'O microfone está desativado. Você pode continuar por texto ou anexar um arquivo.'}
            {micError === 'unsupported' && 'Gravação de áudio indisponível neste dispositivo. Você pode escrever ou anexar um arquivo.'}
            {micError === 'failed' && 'Não foi possível iniciar a gravação. Você pode continuar por texto.'}
          </p>
          <button type="button" className="icon-btn icon-btn--small" aria-label="Fechar aviso" onClick={() => setRec({ s: 'idle' })}>
            <Icon name="close" size={16} />
          </button>
        </div>
      </Collapse>
      <Collapse open={fileError}>
        <div className="notice notice--error" role="alert">
          <Icon name="alert" size={18} />
          <p>
            Não foi possível anexar este arquivo.
            <small>Neste protótipo: imagem, PDF ou áudio de até 10 MB.</small>
          </p>
          <button type="button" className="icon-btn icon-btn--small" aria-label="Fechar aviso" onClick={() => setFileError(false)}>
            <Icon name="close" size={16} />
          </button>
        </div>
      </Collapse>

      <div className="composer" data-team={att.mode === 'agent' || att.mode === 'queued' || undefined}>
        <Collapse open={!!draft.replyTo}>
          <div className="composer__reply">
            <Icon name="reply" size={16} />
            <div>
              <span className="composer__reply-who">Respondendo a {draft.replyTo?.senderLabel}</span>
              <span className="composer__reply-text">{draft.replyTo?.excerpt}</span>
            </div>
            <button type="button" className="icon-btn icon-btn--small" aria-label="Cancelar resposta" onClick={() => api.setDraft(conversation.id, { replyTo: undefined })}>
              <Icon name="close" size={16} />
            </button>
          </div>
        </Collapse>

        <Collapse open={draft.attachments.length > 0}>
          <ul className="composer__files" aria-label="Arquivos para enviar">
            {draft.attachments.map((a) => (
              <li key={a.id} className="chip-file">
                {a.file.mime.startsWith('image/') && a.file.previewUrl ? <img src={a.file.previewUrl} alt="" width={36} height={36} /> : <Icon name="file" size={20} />}
                <span className="chip-file__name" title={a.file.name}>
                  {a.file.name}
                </span>
                <span className="chip-file__size">{fileSize(a.file.size)}</span>
                <button type="button" className="icon-btn icon-btn--small" aria-label={`Remover ${a.file.name}`} onClick={() => removeAttachment(a.id)}>
                  <Icon name="close" size={16} />
                </button>
              </li>
            ))}
          </ul>
        </Collapse>

        <FadeSwitch id={view} className="composer__stage">
          {view === 'rec' ? (
            <div className="rec" role="status">
              <span className="rec__dot" aria-hidden="true" />
              {rec.s === 'asking' ? (
                <span className="rec__label">Aguardando permissão do microfone…</span>
              ) : (
                <>
                  <span className="sr-only">Gravando áudio</span>
                  <span className="rec__levels" aria-hidden="true">
                    {levels.map((l, i) => (
                      <i key={i} style={{ transform: `scaleY(${l})` }} />
                    ))}
                  </span>
                  <span className="rec__time">{duration(elapsed)}</span>
                </>
              )}
              <div className="rec__actions">
                <button type="button" className="btn btn--small btn--ghost" onClick={() => stopRecording(true)}>
                  Cancelar
                </button>
                {rec.s === 'recording' && (
                  <button type="button" className="btn btn--small btn--primary" onClick={() => stopRecording(false)}>
                    <Icon name="stop" size={16} /> Parar e revisar
                  </button>
                )}
              </div>
            </div>
          ) : view === 'review' && rec.s === 'review' ? (
            <div className="rec rec--review">
              <AudioPlayer seed={rec.url} durationSec={rec.sec} url={rec.url} label="Prévia do áudio" />
              <div className="rec__actions">
                <button type="button" className="btn btn--small btn--ghost" onClick={discardReview}>
                  <Icon name="trash" size={16} /> Descartar
                </button>
                <button type="button" className="btn btn--small btn--primary" onClick={sendAudio}>
                  <Icon name="arrowUp" size={16} /> Enviar áudio
                </button>
              </div>
            </div>
          ) : (
            <div className="composer__row">
              <input ref={fileInput} type="file" accept={ACCEPT} hidden tabIndex={-1} onChange={(e) => void onFiles(e.target.files)} />
              <button type="button" className="icon-btn composer__tool" onClick={() => fileInput.current?.click()} aria-label="Anexar arquivo (imagem, PDF ou áudio)">
                <Icon name="attach" />
              </button>
              <textarea
                ref={ta}
                className="composer__input"
                rows={1}
                value={draft.text}
                placeholder={placeholder}
                aria-label={`Mensagem para ${target}`}
                aria-describedby={hintId}
                enterKeyHint={coarse ? 'enter' : 'send'}
                onChange={(e) => api.setDraft(conversation.id, { text: e.target.value })}
                onKeyDown={onKeyDown}
              />
              <button type="button" className="icon-btn composer__tool" onClick={() => void startRecording()} aria-label="Gravar mensagem de voz">
                <Icon name="mic" />
              </button>
              <button type="button" className="send" onClick={send} disabled={!canSend} aria-label="Enviar mensagem">
                <Icon name="arrowUp" size={20} />
              </button>
            </div>
          )}
        </FadeSwitch>
      </div>

      <div className="composer__hint" id={hintId}>
        <FadeSwitch id={hint}>{hint}</FadeSwitch>
        <span className="sr-only">{coarse ? ' Toque em Enviar para mandar a mensagem.' : ' Enter envia. Shift+Enter cria nova linha.'}</span>
      </div>
    </div>
  );
}
