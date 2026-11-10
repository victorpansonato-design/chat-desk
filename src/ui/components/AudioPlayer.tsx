import { useEffect, useMemo, useRef, useState } from 'react';
import { duration as fmt } from '../format';
import { Icon } from '../Icon';

const BARS = 34;

/** Forma de onda decorativa e determinística (mesma mensagem → mesmo desenho). Não é a onda real do áudio. */
function waveform(seed: string): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return Array.from({ length: BARS }, (_, i) => {
    h = Math.imul(h ^ (h >>> 13), 1274126177) + i;
    const n = ((h >>> 8) & 0xff) / 255;
    const envelope = 0.55 + 0.45 * Math.sin((i / (BARS - 1)) * Math.PI);
    return 0.22 + 0.78 * n * envelope;
  });
}

interface Props {
  seed: string;
  durationSec: number;
  /** Sem URL (mensagem de voz fictícia da equipe), a reprodução é apenas simulada. */
  url?: string;
  label?: string;
}

export function AudioPlayer({ seed, durationSec, url, label = 'Mensagem de voz' }: Props) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0); // segundos
  const [total, setTotal] = useState(durationSec);
  const bars = useMemo(() => waveform(seed), [seed]);

  // Reprodução simulada quando não há arquivo
  useEffect(() => {
    if (url || !playing) return;
    const started = performance.now() - pos * 1000;
    let raf = 0;
    const tick = () => {
      const t = (performance.now() - started) / 1000;
      if (t >= total) {
        setPos(0);
        setPlaying(false);
        return;
      }
      setPos(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, url, total]);

  function toggle() {
    const el = audio.current;
    if (!url || !el) {
      setPlaying((p) => !p);
      return;
    }
    if (el.paused) void el.play().catch(() => setPlaying(false));
    else el.pause();
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * total;
    setPos(t);
    if (url && audio.current) audio.current.currentTime = t;
  }

  const progress = total > 0 ? Math.min(1, pos / total) : 0;

  return (
    <div className="audio" data-playing={playing || undefined}>
      {url && (
        <audio
          ref={audio}
          src={url}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setPos(0);
          }}
          onTimeUpdate={(e) => setPos(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setTotal(e.currentTarget.duration)}
        />
      )}
      <button type="button" className="audio__play" onClick={toggle} aria-label={playing ? `Pausar ${label.toLowerCase()}` : `Ouvir ${label.toLowerCase()}, ${fmt(total)}`}>
        <Icon name={playing ? 'pause' : 'play'} size={18} />
      </button>
      <div className="audio__main">
        <div className="audio__wave" onClick={seek} aria-hidden="true">
          {bars.map((b, i) => (
            <i key={i} style={{ height: `${Math.round(b * 100)}%` }} data-on={(i + 0.5) / BARS <= progress || undefined} />
          ))}
        </div>
        <div className="audio__meta">
          <span>{label}</span>
          <span className="audio__time">{fmt(playing || pos > 0 ? pos : total)}</span>
        </div>
      </div>
    </div>
  );
}
