import { useEffect, useReducer, useRef } from 'react';
import type { MockAdapter, MockConfig } from '../core/mockAdapter';
import { Icon } from '../ui/Icon';
import type { DeviceEnv } from '../ui/types';

interface Props {
  adapter: MockAdapter;
  env: DeviceEnv;
  setEnv(env: DeviceEnv): void;
  onClose(): void;
}

/**
 * Roteiros de demonstração — ficam OCULTOS (Ctrl + . abre). Servem para revisar estados que
 * dependem do serviço ou do aparelho: fora do expediente, falhas, microfone, movimento reduzido.
 * Nada aqui existe no produto; cada controle altera só o adapter mock ou o ambiente simulado.
 */
export function DemoPalette({ adapter, env, setEnv, onClose }: Props) {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const ref = useRef<HTMLDivElement>(null);
  const cfg = adapter.config;
  const set = (patch: Partial<MockConfig>) => {
    Object.assign(cfg, patch);
    bump();
  };

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('select, input, button')?.focus();
    return () => prev?.focus?.();
  }, []);

  const motion = document.documentElement.dataset.motion === 'reduce';

  return (
    <div className="palette" role="dialog" aria-label="Roteiros de demonstração" ref={ref} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="palette__head">
        <h2>Roteiros de demonstração</h2>
        <button type="button" className="icon-btn icon-btn--small" aria-label="Fechar roteiros" onClick={onClose}>
          <Icon name="close" size={16} />
        </button>
      </div>
      <p className="palette__note">Só para revisão. Não faz parte do produto.</p>

      <label className="palette__field">
        Expediente do Suporte ao Aluno
        <select
          value={cfg.hours}
          onChange={(e) => {
            const hours = e.target.value as MockConfig['hours'];
            set({ hours });
            if (hours === 'open') adapter.openQueueForScheduled();
          }}
        >
          <option value="open">Aberto (fila e atendente)</option>
          <option value="closed">Fechado (pedido registrado)</option>
          <option value="clock">Pelo relógio deste aparelho</option>
        </select>
      </label>
      <label className="palette__field">
        Rota humana
        <select value={cfg.handover} onChange={(e) => set({ handover: e.target.value as MockConfig['handover'] })}>
          <option value="available">Disponível</option>
          <option value="unavailable">Indisponível</option>
          <option value="error">Falha ao chamar</option>
        </select>
      </label>
      <label className="palette__field">
        Microfone
        <select value={env.mic} onChange={(e) => setEnv({ mic: e.target.value as DeviceEnv['mic'] })}>
          <option value="browser">Permissão do navegador</option>
          <option value="denied">Negado</option>
          <option value="unsupported">Sem suporte</option>
        </select>
      </label>

      <label className="palette__check">
        <input type="checkbox" checked={cfg.failNextSend} onChange={(e) => set({ failNextSend: e.target.checked })} />
        Próximo envio falha
      </label>
      <label className="palette__check">
        <input type="checkbox" checked={cfg.failNextUpload} onChange={(e) => set({ failNextUpload: e.target.checked })} />
        Próximo upload falha
      </label>
      <label className="palette__check">
        <input type="checkbox" checked={cfg.failNextForm} onChange={(e) => set({ failNextForm: e.target.checked })} />
        Próxima redefinição de senha falha
      </label>
      <label className="palette__check">
        <input type="checkbox" checked={cfg.failNextNps} onChange={(e) => set({ failNextNps: e.target.checked })} />
        Próxima pesquisa 0–10 falha
      </label>
      <label className="palette__check">
        <input type="checkbox" checked={cfg.nextReplyDelayMs > 0} onChange={(e) => set({ nextReplyDelayMs: e.target.checked ? 7000 : 0 })} />
        Próxima resposta da Ana demora
      </label>
      <label className="palette__check">
        <input
          type="checkbox"
          checked={motion}
          onChange={(e) => {
            if (e.target.checked) document.documentElement.dataset.motion = 'reduce';
            else delete document.documentElement.dataset.motion;
            bump();
          }}
        />
        Movimento reduzido
      </label>
    </div>
  );
}
