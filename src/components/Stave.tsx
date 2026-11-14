import { memo, useEffect, useId, useMemo, useRef } from 'react';
import { computePitches, formatClock, type Keystroke } from '../lib/stats';
import { useElementWidth } from '../hooks/hooks';
import './stave.css';

export type NoteKind = 'ok' | 'err' | 'bar';

interface NoteProps {
  x: number;
  pitch: number;
  kind: NoteKind;
  mid: number;
  gap: number;
  fresh?: boolean;
}

/** A single keystroke drawn as notation: a note head with stem, a cross for a mistake, a thin bar line for a space. */
export const Note = memo(function Note({ x, pitch, kind, mid, gap, fresh }: NoteProps) {
  const top = mid - 2 * gap;
  const bottom = mid + 2 * gap;
  if (kind === 'bar') {
    return <line className={fresh ? 'st-bar st-fresh' : 'st-bar'} x1={x} x2={x} y1={top} y2={bottom} />;
  }
  const y = mid - (pitch * gap) / 2;
  if (kind === 'err') {
    const r = gap * 0.5;
    return (
      <g className={fresh ? 'st-err st-fresh' : 'st-err'}>
        <line x1={x - r} y1={y - r} x2={x + r} y2={y + r} />
        <line x1={x - r} y1={y + r} x2={x + r} y2={y - r} />
      </g>
    );
  }
  const rx = gap * 0.6;
  const ry = gap * 0.43;
  const stemUp = pitch < 0;
  const sx = stemUp ? x + rx * 0.92 : x - rx * 0.92;
  const stemLen = gap * 3.1;
  return (
    <g className={fresh ? 'st-note st-fresh' : 'st-note'}>
      <ellipse cx={x} cy={y} rx={rx} ry={ry} transform={`rotate(-20 ${x} ${y})`} />
      <line x1={sx} x2={sx} y1={stemUp ? y - 1 : y + 1} y2={stemUp ? y - stemLen : y + stemLen} />
    </g>
  );
});

const kindOf = (k: Pick<Keystroke, 'ok' | 'expected'>): NoteKind => (!k.ok ? 'err' : k.expected === ' ' ? 'bar' : 'ok');

function StaffLines({ x1, x2, mid, gap, className }: { x1: number; x2: number; mid: number; gap: number; className?: string }) {
  return (
    <g className={className ?? 'st-lines'}>
      {[-2, -1, 0, 1, 2].map((i) => (
        <line key={i} x1={x1} x2={x2} y1={mid + i * gap} y2={mid + i * gap} />
      ))}
    </g>
  );
}

function Fermata({ x, y, gap }: { x: number; y: number; gap: number }) {
  const w = gap * 1.1;
  return (
    <g className="st-fermata">
      <path d={`M ${x - w} ${y} A ${w} ${w} 0 0 1 ${x + w} ${y}`} />
      <circle cx={x} cy={y - gap * 0.28} r={gap * 0.17} />
    </g>
  );
}

/* ------------------------------------------------------------------------------------------------ */

interface LiveProps {
  keystrokes: Keystroke[];
  startAt: number | null;
  endAt: number | null;
  running: boolean;
  windowMs?: number;
  height?: number;
  gap?: number;
  label?: string;
}

/**
 * The live score. Notes are laid out on a time axis and the whole group slides left under a fixed playhead,
 * driven by requestAnimationFrame so React only re-renders when a key is pressed.
 */
export function LiveStave({ keystrokes, startAt, endAt, running, windowMs: maxWindow = 6500, height = 104, gap = 10, label }: LiveProps) {
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();
  // Keep note density readable on narrow screens: show less time rather than squeezing notes together.
  const windowMs = Math.max(2400, Math.min(maxWindow, width * 6.5));
  const groupRef = useRef<SVGGElement>(null);
  const uid = useId().replace(/:/g, '');
  const pitches = useMemo(() => computePitches(keystrokes), [keystrokes]);
  const mid = height / 2;
  const playX = Math.max(0, width * 0.8);
  const pxPerMs = (width * 0.76) / windowMs;

  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    const place = (elapsed: number) => g.setAttribute('transform', `translate(${(playX - elapsed * pxPerMs).toFixed(2)} 0)`);
    if (!running || startAt == null) {
      place(startAt != null && endAt != null ? endAt - startAt : 0);
      return;
    }
    let raf = 0;
    const loop = () => {
      place(performance.now() - startAt);
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [running, startAt, endAt, playX, pxPerMs]);

  const lastT = keystrokes.length ? keystrokes[keystrokes.length - 1].t : 0;
  const visibleFrom = lastT - windowMs * 1.4;
  const lastPitch = pitches[pitches.length - 1] ?? 0;
  const lastKind = keystrokes.length ? kindOf(keystrokes[keystrokes.length - 1]) : 'ok';

  return (
    <div ref={wrapRef} className="stave stave-live" aria-hidden={label ? undefined : true} role={label ? 'img' : undefined} aria-label={label}>
      {width > 0 && (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <defs>
            <linearGradient id={`${uid}-fade`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.14" stopColor="#fff" stopOpacity="1" />
            </linearGradient>
            <mask id={`${uid}-mask`} maskUnits="userSpaceOnUse" x={0} y={-20} width={width} height={height + 40}>
              <rect x={0} y={-20} width={width} height={height + 40} fill={`url(#${uid}-fade)`} />
            </mask>
          </defs>
          <StaffLines x1={0} x2={playX} mid={mid} gap={gap} />
          <StaffLines x1={playX} x2={width} mid={mid} gap={gap} className="st-lines st-ahead" />
          <g className="st-scroll" mask={`url(#${uid}-mask)`}>
            <g ref={groupRef}>
              {keystrokes.map((k, i) =>
                k.t < visibleFrom ? null : (
                  <Note key={i} x={k.t * pxPerMs} pitch={pitches[i]} kind={kindOf(k)} mid={mid} gap={gap} fresh={i >= keystrokes.length - 1} />
                ),
              )}
            </g>
          </g>
          <g className={running ? 'st-playhead is-running' : 'st-playhead'}>
            <line x1={playX} x2={playX} y1={mid - gap * 3.4} y2={mid + gap * 3.4} />
            <circle
              cx={playX}
              cy={lastKind === 'ok' ? mid - (lastPitch * gap) / 2 : mid}
              r={3.2}
              style={{ transition: 'cy 160ms cubic-bezier(.2,.8,.2,1)' }}
            />
          </g>
        </svg>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------ */

interface ScoreProps {
  keystrokes: Pick<Keystroke, 't' | 'ok' | 'expected'>[];
  durationMs: number;
  /** Fixed number of rows, or pick automatically from the duration. */
  rowMs?: number;
  gap?: number;
  rowHeight?: number;
  showTimes?: boolean;
  showPauses?: boolean;
  finalBar?: boolean;
  className?: string;
  label: string;
}

const ROW_CHOICES = [4000, 5000, 10000, 15000, 20000, 30000, 60000];

/** A finished run laid out as sheet music, wrapped over several staves. */
export function ScoreStave({
  keystrokes,
  durationMs,
  rowMs,
  gap = 9,
  rowHeight = 92,
  showTimes = true,
  showPauses = true,
  finalBar = true,
  className,
  label,
}: ScoreProps) {
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();
  const pitches = useMemo(() => computePitches(keystrokes), [keystrokes]);
  const per = rowMs ?? ROW_CHOICES.find((r) => Math.ceil(durationMs / r) <= (width < 560 ? 8 : 6)) ?? 60000;
  const rows = Math.max(1, Math.ceil(durationMs / per));
  const gutter = showTimes ? 44 : 4;
  const right = 6;
  const usable = Math.max(10, width - gutter - right);
  const pxPerMs = usable / per;
  const height = rows * rowHeight;

  return (
    <div ref={wrapRef} className={`stave stave-score ${className ?? ''}`} role="img" aria-label={label}>
      {width > 0 && (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          {Array.from({ length: rows }, (_, r) => {
            const mid = r * rowHeight + rowHeight / 2 + (showPauses ? 4 : 0);
            const from = r * per;
            const isLast = r === rows - 1;
            const endX = isLast ? gutter + Math.min(usable, ((durationMs - from) / per) * usable) + 4 : gutter + usable;
            return (
              <g key={r}>
                {showTimes && (
                  <text className="st-time" x={0} y={mid + 4}>
                    {formatClock(from)}
                  </text>
                )}
                <StaffLines x1={gutter} x2={endX} mid={mid} gap={gap} />
                <line className="st-edge" x1={gutter} x2={gutter} y1={mid - 2 * gap} y2={mid + 2 * gap} />
                {isLast && finalBar ? (
                  <g className="st-final">
                    <line x1={endX - 5} x2={endX - 5} y1={mid - 2 * gap} y2={mid + 2 * gap} />
                    <rect x={endX - 3} y={mid - 2 * gap} width={3} height={4 * gap} />
                  </g>
                ) : (
                  <line className="st-edge" x1={endX} x2={endX} y1={mid - 2 * gap} y2={mid + 2 * gap} />
                )}
              </g>
            );
          })}
          {keystrokes.map((k, i) => {
            const r = Math.min(rows - 1, Math.floor(k.t / per));
            const mid = r * rowHeight + rowHeight / 2 + (showPauses ? 4 : 0);
            const x = gutter + 8 + (k.t - r * per) * pxPerMs * ((usable - 12) / usable);
            const pause = showPauses && i > 0 && k.t - keystrokes[i - 1].t >= 1000;
            return (
              <g key={i}>
                <Note x={x} pitch={pitches[i]} kind={kindOf(k)} mid={mid} gap={gap} />
                {pause && <Fermata x={x} y={mid - gap * 3.6} gap={gap} />}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

/** One-line score for compact places like history rows. */
export function MiniStave({ keystrokes, label }: { keystrokes: Pick<Keystroke, 't' | 'ok' | 'expected'>[]; label: string }) {
  const dur = keystrokes.length ? keystrokes[keystrokes.length - 1].t + 200 : 1000;
  return (
    <ScoreStave
      keystrokes={keystrokes}
      durationMs={dur}
      rowMs={dur}
      gap={5}
      rowHeight={46}
      showTimes={false}
      showPauses={false}
      finalBar={false}
      className="stave-mini"
      label={label}
    />
  );
}
