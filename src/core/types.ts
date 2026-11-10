/**
 * Modelo de domínio do Chat Anchieta (protótipo).
 * Contratos PROPOSTOS — não são nomes reais de API. Ver docs/08-arquitetura.md e docs/integracao.md.
 */

export type Channel = 'portal' | 'app' | 'tira-duvidas';

export type Sender = 'student' | 'ai' | 'agent' | 'system';

export interface Author {
  name: string;
  role: string;
}

export interface AttachmentMeta {
  name: string;
  size: number;
  mime: string;
  /** URL local (object URL ou data URL) só para pré-visualização no mock; nada é enviado. */
  previewUrl?: string;
  width?: number;
  height?: number;
}

/** Formulário de redefinição de senha (RELATADO com print do legado em 10/11/2026). */
export interface PasswordResetPayload {
  emailMasked: string;
  /** Validade do código atual (timestamp). */
  validUntil: number;
}

export type Content =
  | { kind: 'text'; text: string }
  | { kind: 'attachment'; file: AttachmentMeta }
  | { kind: 'audio'; durationSec: number; url?: string }
  | { kind: 'nps'; question: string }
  | { kind: 'event'; event: ConversationEvent; text: string }
  /**
   * Conteúdo rico vindo do backend. `password-reset` é renderizado; qualquer outro
   * `formType` cai num aviso neutro (ponto de extensão — docs/integracao.md).
   */
  | PasswordResetContent
  | { kind: 'form'; formType: string; title?: string; payload?: unknown };

export interface PasswordResetContent {
  kind: 'form';
  formType: 'password-reset';
  payload: PasswordResetPayload;
}

export function isPasswordReset(c: Content): c is PasswordResetContent {
  return c.kind === 'form' && c.formType === 'password-reset';
}

export type ConversationEvent =
  | 'handover-requested'
  | 'handover-queued'
  | 'handover-unavailable'
  | 'handover-failed'
  | 'handover-cancelled'
  | 'agent-joined'
  | 'closed';

/** Estado de entrega conhecido pelo cliente. Não existe "lido": o mock não tem confirmação de leitura. */
export type Delivery = 'pending' | 'sent' | 'failed';

/** Ações oferecidas junto de uma mensagem do serviço (ex.: aviso de fora do expediente). */
export type MessageActionId = 'continue-ai' | 'cancel-request';
export interface MessageAction {
  id: MessageActionId;
  label: string;
}

export type FormError = 'invalid-code' | 'expired' | 'network';
export interface FormState {
  status: 'idle' | 'submitting' | 'done' | 'cancelled';
  error?: FormError;
  /** Quando o código foi reenviado pela última vez (para o intervalo de reenvio). */
  resentAt?: number;
  resending?: boolean;
}

export interface Message {
  /** ID estável: clientId enquanto pendente, mantido como key mesmo após confirmação. */
  id: string;
  clientId?: string;
  serverId?: string;
  conversationId: string;
  sender: Sender;
  author?: Author;
  content: Content;
  createdAt: number;
  delivery?: Delivery;
  /** Motivo de falha conhecido. 'closed' = atendimento encerrado antes da confirmação. */
  failReason?: 'network' | 'closed';
  /** Progresso 0–1 de upload (mock). */
  progress?: number;
  replyTo?: { id: string; excerpt: string; senderLabel: string };
  /** Avaliação por resposta (OBSERVADO ao vivo: "Avaliar: 1 2 3 4 5"). */
  rating?: { value?: number; status: 'idle' | 'sending' | 'sent' | 'error' };
  /** Pesquisa 0–10 (OBSERVADO em histórico). */
  nps?: { value?: number; status: 'idle' | 'sending' | 'answered' | 'error' };
  /** Estado do formulário embutido (kind 'form'). */
  form?: FormState;
  actions?: MessageAction[];
  actionTaken?: MessageActionId;
  /** Reação do aluno (OBSERVADO no legado: botão ao lado da mensagem). */
  reaction?: 'like';
  /** Conteúdo fictício de demonstração. */
  demo?: boolean;
}

export type Attendance =
  /** Ana (assistente) responde. */
  | { mode: 'ai' }
  | { mode: 'requesting' }
  /** Na fila do Suporte ao Aluno. `ahead` = pessoas na frente (RELATADO: o serviço informa a posição). */
  | { mode: 'queued'; queue: string; ahead: number }
  /** Fora do expediente: pedido registrado; a Ana continua respondendo até a fila abrir (RELATADO). */
  | { mode: 'scheduled'; queue: string; opensAt: number }
  | { mode: 'agent'; agent: Author }
  | { mode: 'closed'; closedAt: number };

export interface Conversation {
  /** ID local até a criação no servidor; depois, ID do servidor. */
  id: string;
  /** Assunto vindo do backend, ou derivado do primeiro texto do aluno (só demonstração). */
  title?: string;
  channel: Channel;
  attendance: Attendance;
  createdAt: number;
  lastActivity: number;
  messages: Message[];
  /** true enquanto ainda não foi criada no servidor (nenhum envio). */
  local?: boolean;
}

export interface PendingAttachment {
  id: string;
  file: AttachmentMeta;
}

export interface Draft {
  text: string;
  replyTo?: Message['replyTo'];
  attachments: PendingAttachment[];
}

/**
 * Estado de resposta em andamento. A IA mostra a etapa em que está ("Consultando…");
 * uma pessoa da equipe mostra apenas que está digitando. São apresentações diferentes de propósito.
 */
export type Typing = false | { who: 'ai'; label: string; slow?: boolean } | { who: 'agent'; name: string };

export interface ChatState {
  status: 'loading' | 'ready' | 'error';
  conversations: Record<string, Conversation>;
  drafts: Record<string, Draft>;
  typing: Record<string, Typing>;
  /** Mensagens chegadas enquanto a conversa não estava em foco. */
  unread: Record<string, number>;
}

/** Eventos que o adapter emite (transporte real: websocket/polling — a definir com TI). */
export type AdapterEvent =
  | { type: 'message'; conversationId: string; message: Message }
  | { type: 'typing'; conversationId: string; typing: Typing }
  | { type: 'attendance'; conversationId: string; attendance: Attendance }
  | { type: 'progress'; conversationId: string; messageId: string; progress: number };

export interface SendResult {
  serverId: string;
  createdAt: number;
}

export type HandoverResult = 'accepted' | 'scheduled' | 'unavailable';
export type FormResult = 'ok' | 'invalid-code' | 'expired';

export interface ChatAdapter {
  loadConversations(): Promise<Conversation[]>;
  createConversation(channel: Channel, localId: string): Promise<{ id: string }>;
  /** Idempotente por clientId: reenviar a mesma tentativa não duplica. */
  sendMessage(conversationId: string, clientId: string, content: Content, replyTo?: Message['replyTo']): Promise<SendResult>;
  requestHandover(conversationId: string): Promise<HandoverResult>;
  /** Cancela um pedido registrado fora do expediente. */
  cancelHandover(conversationId: string): Promise<void>;
  closeConversation(conversationId: string): Promise<void>;
  submitNps(conversationId: string, messageId: string, value: number): Promise<void>;
  rateResponse(conversationId: string, messageId: string, value: number): Promise<void>;
  /** Só o código trafega. A senha nunca sai do componente no protótipo. */
  submitPasswordReset(conversationId: string, messageId: string, code: string): Promise<FormResult>;
  resendCode(conversationId: string, messageId: string): Promise<{ validUntil: number }>;
  subscribe(listener: (ev: AdapterEvent) => void): () => void;
}
