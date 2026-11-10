import { useEffect, useId, useRef, useState } from 'react';
import { useChat } from '../../core/ChatProvider';
import type { FormError, Message, PasswordResetPayload } from '../../core/types';
import { timeOf } from '../format';
import { Icon } from '../Icon';
import { Collapse, FadeSwitch } from '../motion';

/** Regra do legado (print de 10/11/2026): "A senha deve ter entre 8 e 29 caracteres." */
const MIN = 8;
const MAX = 29;
const RESEND_COOLDOWN_MS = 30_000;

const SERVER_ERRORS: Record<FormError, string> = {
  'invalid-code': 'O código não confere. Verifique o e-mail e digite novamente.',
  expired: 'Este código expirou. Peça um novo código para continuar.',
  network: 'Não foi possível concluir agora. Verifique sua conexão e tente novamente.',
};

interface Props {
  m: Message;
  payload: PasswordResetPayload;
  /** Conversa encerrada: o formulário fica como registro, sem ação. */
  readonly: boolean;
}

/**
 * Redefinição de senha dentro da conversa. Só o código de verificação é enviado ao adapter;
 * a senha fica neste componente e é descartada ao concluir (protótipo sem integração real).
 */
export function PasswordReset({ m, payload, readonly }: Props) {
  const api = useChat();
  const uid = useId();
  const form = m.form ?? { status: 'idle' as const };
  const [code, setCode] = useState('');
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState({ pass: false, confirm: false });
  const [errors, setErrors] = useState<{ code?: string; pass?: string; confirm?: string }>({});
  const [now, setNow] = useState(() => Date.now());
  const codeRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  const busy = form.status === 'submitting';
  const done = form.status === 'done';
  const cooldownEnd = (form.resentAt ?? m.createdAt) + RESEND_COOLDOWN_MS;
  const cooling = now < cooldownEnd;
  const expired = now > payload.validUntil;

  // Relógio só enquanto é necessário (contagem do reenvio, validade) e a conversa está ativa
  useEffect(() => {
    if (done || readonly) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [done, readonly]);

  // Concluído: a senha não permanece na memória do componente
  useEffect(() => {
    if (done) {
      setPass('');
      setConfirm('');
      setCode('');
    }
  }, [done]);

  // Erro vindo do serviço sobre o código: devolve o foco ao campo
  useEffect(() => {
    if (form.error === 'invalid-code' || form.error === 'expired') codeRef.current?.focus({ preventScroll: true });
  }, [form.error]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const next: typeof errors = {};
    if (code.length !== 6) next.code = 'Digite os 6 números do código que enviamos por e-mail.';
    if (pass.length < MIN || pass.length > MAX) next.pass = `A senha deve ter entre ${MIN} e ${MAX} caracteres.`;
    if (!next.pass && confirm !== pass) next.confirm = 'As duas senhas precisam ser iguais.';
    setErrors(next);
    if (next.code) codeRef.current?.focus();
    else if (next.pass) passRef.current?.focus();
    else if (next.confirm) confirmRef.current?.focus();
    else api.submitPasswordReset(m.conversationId, m.id, code);
  }

  const lengthOk = pass.length >= MIN && pass.length <= MAX;
  const matchOk = confirm.length > 0 && confirm === pass;
  const serverError = form.error ? SERVER_ERRORS[form.error] : null;
  const left = Math.max(0, Math.ceil((cooldownEnd - now) / 1000));

  return (
    <section className="pwd" aria-labelledby={`${uid}-title`} data-done={done || undefined}>
      <header className="pwd__head">
        <span className="pwd__icon" data-done={done || undefined} aria-hidden="true">
          <FadeSwitch id={done ? 'ok' : 'lock'}>
            <Icon name={done ? 'check' : 'lock'} size={20} />
          </FadeSwitch>
        </span>
        <div>
          <h4 id={`${uid}-title`} className="pwd__title">
            {done ? 'Senha redefinida' : 'Redefinir senha'}
          </h4>
          <p className="pwd__sub">
            {done ? (
              'A nova senha já vale para o Aluno Online e para o AVA.'
            ) : readonly ? (
              'Este formulário não está mais disponível: o atendimento foi encerrado.'
            ) : (
              <>
                Enviamos um código para <strong>{payload.emailMasked}</strong>. Ele vale até as {timeOf(payload.validUntil)}.
              </>
            )}
          </p>
        </div>
      </header>

      <Collapse open={!done && !readonly} ms={420}>
        <form className="pwd__form" onSubmit={submit} noValidate aria-busy={busy}>
          <Collapse open={!!serverError || (expired && !form.error)}>
            <p className="pwd__alert" role="alert">
              <Icon name="alert" size={18} />
              <span>{serverError ?? SERVER_ERRORS.expired}</span>
            </p>
          </Collapse>

          <div className="field" data-invalid={!!errors.code || undefined}>
            <label htmlFor={`${uid}-code`}>Código recebido por e-mail</label>
            <input
              ref={codeRef}
              id={`${uid}-code`}
              className="field__input field__input--code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={11}
              placeholder="000000"
              value={code}
              disabled={busy}
              aria-invalid={!!errors.code}
              aria-describedby={errors.code ? `${uid}-code-err` : undefined}
              onChange={(e) => {
                // Aceita colar com espaços ou hífens; guarda só os números
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                if (errors.code) setErrors((x) => ({ ...x, code: undefined }));
              }}
            />
            <FieldError id={`${uid}-code-err`} text={errors.code} />
          </div>

          <div className="field" data-invalid={!!errors.pass || undefined}>
            <label htmlFor={`${uid}-pass`}>Nova senha</label>
            <div className="field__wrap">
              <input
                ref={passRef}
                id={`${uid}-pass`}
                className="field__input"
                type={show.pass ? 'text' : 'password'}
                autoComplete="new-password"
                maxLength={64}
                value={pass}
                disabled={busy}
                aria-invalid={!!errors.pass}
                aria-describedby={`${uid}-rule${errors.pass ? ` ${uid}-pass-err` : ''}`}
                onChange={(e) => {
                  setPass(e.target.value);
                  if (errors.pass) setErrors((x) => ({ ...x, pass: undefined }));
                }}
              />
              <button type="button" className="field__toggle" onClick={() => setShow((s) => ({ ...s, pass: !s.pass }))} aria-pressed={show.pass} aria-label={show.pass ? 'Ocultar nova senha' : 'Mostrar nova senha'}>
                {show.pass ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <p id={`${uid}-rule`} className="field__rule" data-ok={lengthOk || undefined}>
              <Icon name="check" size={14} />
              Entre {MIN} e {MAX} caracteres
            </p>
            <FieldError id={`${uid}-pass-err`} text={errors.pass} />
          </div>

          <div className="field" data-invalid={!!errors.confirm || undefined}>
            <label htmlFor={`${uid}-confirm`}>Confirmar nova senha</label>
            <div className="field__wrap">
              <input
                ref={confirmRef}
                id={`${uid}-confirm`}
                className="field__input"
                type={show.confirm ? 'text' : 'password'}
                autoComplete="new-password"
                maxLength={64}
                value={confirm}
                disabled={busy}
                aria-invalid={!!errors.confirm}
                aria-describedby={errors.confirm ? `${uid}-confirm-err` : undefined}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  if (errors.confirm) setErrors((x) => ({ ...x, confirm: undefined }));
                }}
              />
              <button type="button" className="field__toggle" onClick={() => setShow((s) => ({ ...s, confirm: !s.confirm }))} aria-pressed={show.confirm} aria-label={show.confirm ? 'Ocultar confirmação da senha' : 'Mostrar confirmação da senha'}>
                {show.confirm ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <p className="field__rule" data-ok={matchOk || undefined}>
              <Icon name="check" size={14} />
              As duas senhas são iguais
            </p>
            <FieldError id={`${uid}-confirm-err`} text={errors.confirm} />
          </div>

          <button type="submit" className="btn btn--primary btn--block pwd__submit" disabled={busy} data-busy={busy || undefined}>
            <span className="btn__spinner" aria-hidden="true" />
            <span>{busy ? 'Confirmando…' : 'Confirmar'}</span>
          </button>

          <div className="pwd__foot">
            <button type="button" className="link" disabled={cooling || form.resending || busy} onClick={() => api.resendCode(m.conversationId, m.id)}>
              {form.resending ? 'Reenviando…' : 'Reenviar código'}
            </button>
            {cooling && !form.resending && (
              <span className="pwd__cooldown" aria-hidden="true">
                disponível em 0:{String(left).padStart(2, '0')}
              </span>
            )}
            {form.resentAt && !cooling && <span className="pwd__cooldown">Novo código enviado.</span>}
          </div>

          <p className="pwd__demo">
            Protótipo: use qualquer código de 6 números (000000 simula código incorreto). A senha não é enviada nem guardada.
          </p>
        </form>
      </Collapse>
    </section>
  );
}

function FieldError({ id, text }: { id: string; text?: string }) {
  return (
    <Collapse open={!!text} ms={200}>
      <p id={id} className="field__error" role="alert">
        {text}
      </p>
    </Collapse>
  );
}
