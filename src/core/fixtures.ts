import { SUPPORT_QUEUE, queueText, transferText } from './schedule';
import type { Author, Conversation, Message } from './types';

/**
 * Dados 100% fictícios. A estrutura espelha estados OBSERVADOS/RELATADOS (prints, sessão ao vivo
 * e textos enviados por CX), mas nenhum nome, e-mail ou dado acadêmico real foi reutilizado.
 */

export const STUDENT_NAME = 'Camila';
/** E-mail fictício, já mascarado como o serviço faz. */
export const STUDENT_EMAIL_MASKED = 'c***a@escolas.anchieta.br';

/** Persona da IA observada ao vivo: "Eu sou a Ana, assistente da UniAnchieta". */
export const AI_AUTHOR: Author = { name: 'Ana', role: 'Assistente' };

/** Atendente FICTÍCIO. Nome diferente de "Ana" para não confundir pessoa e IA. */
export const AGENT_AUTHOR: Author = { name: 'Marina', role: SUPPORT_QUEUE };

export const NPS_QUESTION = 'De 0 a 10, o quanto você recomendaria o atendimento da UniAnchieta a um amigo?';

/** "Print" fictício enviado pela atendente (SVG local, sem dado real). */
export const DEMO_PRINT_URL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
<rect width="640" height="400" fill="#F4F6FC"/>
<rect width="640" height="56" fill="#01184A"/>
<rect x="24" y="20" width="120" height="16" rx="8" fill="#ffffff" opacity=".85"/>
<rect x="520" y="18" width="96" height="20" rx="10" fill="#F1BC09"/>
<rect x="24" y="80" width="150" height="296" rx="12" fill="#ffffff" stroke="#E1E6F3"/>
<g fill="#C9D3E8"><rect x="40" y="100" width="110" height="10" rx="5"/><rect x="40" y="126" width="90" height="10" rx="5"/><rect x="40" y="152" width="104" height="10" rx="5"/><rect x="40" y="178" width="80" height="10" rx="5"/></g>
<rect x="36" y="198" width="126" height="30" rx="8" fill="#E5EDF5" stroke="#0051A0" stroke-width="2"/>
<rect x="48" y="208" width="84" height="10" rx="5" fill="#0051A0"/>
<rect x="198" y="80" width="418" height="132" rx="12" fill="#ffffff" stroke="#E1E6F3"/>
<rect x="218" y="100" width="170" height="14" rx="7" fill="#01184A"/>
<g fill="#C9D3E8"><rect x="218" y="130" width="360" height="10" rx="5"/><rect x="218" y="150" width="300" height="10" rx="5"/></g>
<rect x="218" y="174" width="132" height="26" rx="13" fill="#0051A0"/>
<rect x="198" y="228" width="200" height="148" rx="12" fill="#ffffff" stroke="#E1E6F3"/>
<rect x="416" y="228" width="200" height="148" rx="12" fill="#ffffff" stroke="#E1E6F3"/>
<g fill="#C9D3E8"><rect x="216" y="248" width="120" height="10" rx="5"/><rect x="216" y="270" width="160" height="10" rx="5"/><rect x="434" y="248" width="120" height="10" rx="5"/><rect x="434" y="270" width="160" height="10" rx="5"/></g>
</svg>`,
  );

const MIN = 60_000;
const DAY = 24 * 60 * MIN;

let seq = 0;
function msg(conversationId: string, at: number, sender: Message['sender'], text: string, extra: Partial<Message> = {}): Message {
  seq += 1;
  return {
    id: `${conversationId}-m${seq}`,
    serverId: `${conversationId}-s${seq}`,
    conversationId,
    sender,
    author: sender === 'ai' ? AI_AUTHOR : sender === 'agent' ? AGENT_AUTHOR : undefined,
    content: { kind: 'text', text },
    createdAt: at,
    delivery: sender === 'student' ? 'sent' : undefined,
    demo: sender === 'ai' || sender === 'agent' ? true : undefined,
    ...extra,
  };
}

function event(conversationId: string, at: number, ev: Extract<Message['content'], { kind: 'event' }>['event'], text: string): Message {
  seq += 1;
  return { id: `${conversationId}-e${seq}`, conversationId, sender: 'system', content: { kind: 'event', event: ev, text }, createdAt: at };
}

export function buildFixtures(now = Date.now()): Conversation[] {
  seq = 0;
  // 1 · Atendimento recente: Ana → fila → Suporte ao Aluno (texto, PDF, voz) → pesquisa 0–10 → encerrado
  const a = 'conv-declaracao';
  const t = now - 2 * DAY;
  const convA: Conversation = {
    id: a,
    title: 'Declaração de matrícula',
    channel: 'portal',
    createdAt: t,
    lastActivity: t + 40 * MIN,
    attendance: { mode: 'closed', closedAt: t + 40 * MIN },
    messages: [
      msg(a, t, 'student', 'Como consigo uma declaração de matrícula?'),
      msg(
        a,
        t + 1 * MIN,
        'ai',
        'Você pode solicitar a declaração de matrícula pelo Aluno Online, na área de documentos.\n\nSe a sua situação for diferente, a equipe do Suporte ao Aluno pode analisar o seu caso.',
        { rating: { value: 4, status: 'sent' } },
      ),
      msg(a, t + 3 * MIN, 'student', 'Prefiro falar com uma pessoa, por favor'),
      msg(
        a,
        t + 3 * MIN + 2000,
        'ai',
        'Certo, Camila. Vou chamar a equipe do Suporte ao Aluno.\n\nNão precisa fazer mais nada: assim que um atendente estiver disponível, ele continuará a conversa por aqui.',
      ),
      event(a, t + 4 * MIN, 'handover-queued', queueText(SUPPORT_QUEUE, 2)),
      event(a, t + 12 * MIN, 'agent-joined', transferText(AGENT_AUTHOR.name)),
      msg(a, t + 13 * MIN, 'agent', 'Olá, Camila! Aqui é a Marina, do Suporte ao Aluno. Li a sua conversa com a Ana e já vou te ajudar com a declaração.'),
      {
        ...msg(a, t + 15 * MIN, 'agent', ''),
        content: { kind: 'attachment', file: { name: 'orientacoes-declaracao.pdf', size: 184_320, mime: 'application/pdf' } },
      },
      { ...msg(a, t + 16 * MIN, 'agent', ''), content: { kind: 'audio', durationSec: 14 } },
      msg(a, t + 20 * MIN, 'student', 'Perfeito, muito obrigada!'),
      event(a, t + 40 * MIN, 'closed', 'Atendimento encerrado.'),
      { ...msg(a, t + 40 * MIN + 1000, 'system', ''), content: { kind: 'nps', question: NPS_QUESTION }, nps: { value: 10, status: 'answered' } },
      msg(a, t + 41 * MIN, 'ai', 'Obrigada pela sua avaliação! Ela nos ajuda a melhorar o atendimento.', { demo: false }),
    ],
  };

  // 2 · Redefinição de senha concluída (formulário somente leitura no histórico)
  const b = 'conv-acesso';
  const tb = now - 9 * DAY;
  const convB: Conversation = {
    id: b,
    title: 'Recuperar acesso ao AVA',
    channel: 'app',
    createdAt: tb,
    lastActivity: tb + 6 * MIN,
    attendance: { mode: 'closed', closedAt: tb + 6 * MIN },
    messages: [
      msg(b, tb, 'student', 'Não consigo entrar no AVA, esqueci minha senha'),
      msg(
        b,
        tb + 1 * MIN,
        'ai',
        `Olá, Camila! Tudo bem?\n\nEnviei um código de verificação para o seu e-mail (${STUDENT_EMAIL_MASKED}). Ele é válido por 10 minutos.\n\nPor favor, preencha o formulário abaixo com o código e a sua nova senha. A nova senha valerá também para o acesso ao AVA.`,
      ),
      {
        ...msg(b, tb + 1 * MIN + 1000, 'ai', ''),
        content: { kind: 'form', formType: 'password-reset', payload: { emailMasked: STUDENT_EMAIL_MASKED, validUntil: tb + 11 * MIN } },
        form: { status: 'done' },
      },
      msg(b, tb + 4 * MIN, 'ai', 'Pronto, Camila! Sua senha foi redefinida. Ela já vale para o Aluno Online e para o AVA.'),
      event(b, tb + 6 * MIN, 'closed', 'Atendimento encerrado.'),
    ],
  };

  const short = (id: string, daysAgo: number, title: string, q: string, ans: string, channel: Conversation['channel']): Conversation => {
    const tt = now - daysAgo * DAY;
    return {
      id,
      title,
      channel,
      createdAt: tt,
      lastActivity: tt + 5 * MIN,
      attendance: { mode: 'closed', closedAt: tt + 5 * MIN },
      messages: [msg(id, tt, 'student', q), msg(id, tt + MIN, 'ai', ans), event(id, tt + 5 * MIN, 'closed', 'Atendimento encerrado.')],
    };
  };

  return [
    convA,
    convB,
    short('conv-calendario', 61, 'Calendário acadêmico', 'Onde vejo o calendário acadêmico?',
      'O calendário acadêmico oficial fica disponível no Aluno Online. Posso ajudar em mais alguma coisa?', 'tira-duvidas'),
    short('conv-secretaria', 87, 'Contato com a secretaria', 'Como falo com a secretaria?',
      'Posso te orientar sobre os canais de contato. Se preferir, também posso chamar a equipe do Suporte ao Aluno.', 'portal'),
    short('conv-horario', 94, 'Horário de aula', 'Qual é o meu horário de aula?',
      'Seus horários de aula aparecem na área de horários do Aluno Online.', 'app'),
  ];
}

/** Sugestões iniciais. As três do Tira-Dúvidas foram OBSERVADAS (S11); as demais são PROPOSTAS. */
export const TIRA_DUVIDAS_SUGGESTIONS = [
  'Qual é o meu horário de aula?',
  'Onde vejo o calendário acadêmico?',
  'Como falo com a secretaria?',
  'Onde vejo meus boletos?',
];

export const HOME_SUGGESTIONS = [
  'Estou com dúvidas sobre faltas',
  'Esqueci minha senha',
  'Como peço uma declaração de matrícula?',
  'Onde vejo meus boletos?',
];
