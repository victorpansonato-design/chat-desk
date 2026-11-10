const DAY = 86_400_000;

export function timeOf(ts: number): string {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** "agora", "há 5 min", "hoje 14:02", "ontem", "há 3 dias", "09/09" */
export function relativeDate(ts: number, now = Date.now()): string {
  const diff = now - ts;
  if (diff < 60_000) return 'agora';
  if (diff < 3_600_000) return `há ${Math.floor(diff / 60_000)} min`;
  const d = new Date(ts);
  const today = new Date(now);
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) return `hoje, ${timeOf(ts)}`;
  if (diff < 2 * DAY && new Date(now - DAY).toDateString() === d.toDateString()) return 'ontem';
  if (diff < 7 * DAY) return `há ${Math.max(2, Math.floor(diff / DAY))} dias`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function dayLabel(ts: number, now = Date.now()): string {
  const d = new Date(ts);
  if (d.toDateString() === new Date(now).toDateString()) return 'Hoje';
  if (d.toDateString() === new Date(now - DAY).toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: d.getFullYear() === new Date(now).getFullYear() ? undefined : 'numeric' });
}

export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

export function duration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
