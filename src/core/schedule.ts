/**
 * Expediente do Suporte ao Aluno — RELATADO por CX em 10/11/2026 (texto do aviso de fora do expediente).
 * No real, a regra é do serviço; aqui ela só alimenta o mock e a apresentação da data.
 */
export const SUPPORT_QUEUE = 'Suporte ao Aluno';
export const SUPPORT_HOURS_TEXT = 'Atendemos segunda a sexta, das 08:00 às 22:00; sábado, das 09:00 às 13:00.';

/** [abre, fecha] em horas, por dia da semana (0 = domingo). */
const HOURS: Record<number, [number, number] | null> = {
  0: null,
  1: [8, 22],
  2: [8, 22],
  3: [8, 22],
  4: [8, 22],
  5: [8, 22],
  6: [9, 13],
};

export function isSupportOpen(at: Date): boolean {
  const h = HOURS[at.getDay()];
  if (!h) return false;
  const t = at.getHours() + at.getMinutes() / 60;
  return t >= h[0] && t < h[1];
}

/** Próxima abertura estritamente depois de `from`. */
export function nextOpening(from: Date): Date {
  for (let i = 0; i <= 7; i++) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    const h = HOURS[d.getDay()];
    if (!h) continue;
    d.setHours(h[0], 0, 0, 0);
    if (d.getTime() > from.getTime()) return d;
  }
  return from; // inalcançável: há expediente em 6 dos 7 dias
}

const two = (n: number) => String(n).padStart(2, '0');

function dayDiff(a: Date, b: Date): number {
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((start(a) - start(b)) / 86_400_000);
}

/** "amanhã (09/11), às 08:00" · "hoje (09/11), às 08:00" · "segunda-feira (11/11), às 08:00" */
export function openingLabel(opens: Date, now: Date): string {
  const diff = dayDiff(opens, now);
  const day = diff === 0 ? 'hoje' : diff === 1 ? 'amanhã' : opens.toLocaleDateString('pt-BR', { weekday: 'long' });
  return `${day} (${two(opens.getDate())}/${two(opens.getMonth() + 1)}), às ${two(opens.getHours())}:${two(opens.getMinutes())}`;
}

/** Versão curta para a faixa de atendimento: "amanhã, 08:00". */
export function openingShort(opens: Date, now: Date): string {
  const diff = dayDiff(opens, now);
  const day = diff === 0 ? 'hoje' : diff === 1 ? 'amanhã' : opens.toLocaleDateString('pt-BR', { weekday: 'long' });
  return `${day}, ${two(opens.getHours())}:${two(opens.getMinutes())}`;
}

export function outOfHoursText(opens: Date, now: Date): string {
  return [
    `Nossa equipe não está atendendo agora. ${SUPPORT_HOURS_TEXT}`,
    `Deixei seu pedido registrado: ${openingLabel(opens, now)}, sua conversa entra na fila de atendimento e um atendente responde aqui mesmo.`,
    'Até lá, pode continuar falando comigo. Se resolver antes, é só me avisar que eu cancelo o pedido.',
  ].join('\n\n');
}

export function queueText(queue: string, ahead: number): string {
  const position =
    ahead <= 0
      ? 'você é a próxima pessoa a ser atendida'
      : ahead === 1
        ? 'há 1 pessoa na sua frente'
        : `há ${ahead} pessoas na sua frente`;
  return `Sua conversa está na fila de ${queue} e ${position}. Pode continuar escrevendo por aqui: o atendente lê tudo quando assumir, então não precisa repetir.`;
}

export function transferText(agentName: string): string {
  return `Sua conversa foi transferida. Agora você está falando com ${agentName}, da nossa equipe de atendimento.`;
}
