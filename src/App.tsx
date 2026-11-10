import { useEffect, useMemo, useState } from 'react';
import { ChatProvider } from './core/ChatProvider';
import { MockAdapter, defaultMockConfig, type MockConfig } from './core/mockAdapter';
import { DemoPalette } from './stage/DemoPalette';
import { Stage, type HostId } from './stage/Stage';
import { usePresence } from './ui/motion';
import type { DeviceEnv } from './ui/types';

declare global {
  interface Window {
    /** Acesso ao mock para testes automatizados e roteiros. Só existe no protótipo. */
    __chatDemo?: { adapter: MockAdapter; setEnv(env: DeviceEnv): void };
  }
}

/**
 * Espaço de trabalho do protótipo: uma tela, um chat, três interfaces.
 * Parâmetros de URL (revisão e testes): view, panel=0, size=expanded, expediente=fora|relogio,
 * mic=denied|unsupported, motion=reduce, sessao=erro, roteiro=manual, roteiros=1.
 */
export function App() {
  const params = useMemo(() => new URLSearchParams(location.search), []);

  const adapter = useMemo(() => {
    const cfg: MockConfig = defaultMockConfig();
    const hours = params.get('expediente');
    if (hours === 'fora') cfg.hours = 'closed';
    if (hours === 'relogio') cfg.hours = 'clock';
    if (params.get('sessao') === 'erro') cfg.session = 'error';
    if (params.get('roteiro') === 'manual') cfg.autoAgent = false;
    return new MockAdapter(cfg);
  }, [params]);

  const view = params.get('view');
  const initialHost: HostId = view === 'app' || view === 'tira-duvidas' ? view : 'portal';
  const mic = params.get('mic');
  const [env, setEnv] = useState<DeviceEnv>({ mic: mic === 'denied' || mic === 'unsupported' ? mic : 'browser' });
  const [palette, setPalette] = useState(params.get('roteiros') === '1');
  const presence = usePresence(palette, 220);

  useEffect(() => {
    if (params.get('motion') === 'reduce') document.documentElement.dataset.motion = 'reduce';
  }, [params]);

  useEffect(() => {
    window.__chatDemo = { adapter, setEnv };
    return () => {
      delete window.__chatDemo;
    };
  }, [adapter]);

  // Roteiros de demonstração ficam ocultos: Ctrl + . (ou ⌘ + .) abre e fecha
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '.') {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <ChatProvider adapter={adapter}>
      <Stage initialHost={initialHost} initialOpen={params.get('panel') !== '0'} initialSize={params.get('size') === 'expanded' ? 'expanded' : 'compact'} env={env} />
      {presence.mounted && (
        <div className="palette-layer" data-visible={presence.visible}>
          <DemoPalette adapter={adapter} env={env} setEnv={setEnv} onClose={() => setPalette(false)} />
        </div>
      )}
    </ChatProvider>
  );
}
