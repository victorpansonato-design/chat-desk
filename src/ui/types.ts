import type { Channel } from '../core/types';

/** Estado de navegação da interface — independente da conversa e do atendimento. */
export interface ChatUi {
  /** Conversa aberta. `null` até o carregamento; depois, sempre há uma (a vazia é a tela inicial). */
  activeId: string | null;
  historyOpen: boolean;
}

/** O que muda de um hospedeiro para outro. Todo o resto é o mesmo núcleo. */
export interface HostConfig {
  id: string;
  channel: Channel;
  studentName?: string;
  suggestions: string[];
  /** Controles que pertencem ao contêiner do portal. */
  size?: 'compact' | 'expanded';
  onToggleSize?: () => void;
  onClose?: () => void;
}

/** Simulação do ambiente do dispositivo (roteiros de demonstração). Não altera o adapter. */
export interface DeviceEnv {
  mic: 'browser' | 'denied' | 'unsupported';
}

export interface ScrollMemory {
  top: number;
  atBottom: boolean;
}
