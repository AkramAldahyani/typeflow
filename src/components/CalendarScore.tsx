import { useState, type PointerEvent } from 'react';
import { useElementWidth } from '../hooks/hooks';
import { addDays, dayKey } from '../lib/history';
import type { RunSummary } from '../lib/stats';

const fmtShort = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const fmtLong = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

const mondayOf = (d: Date) => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  c.setDate(c.getDate() - ((c.getDay() + 6) % 7));
  return c;
};

/**
 * Twelve weeks of practice written as music: each week is a bar, each practised day a chord with one
 * note per session, and each day off a rest.
 */
export function CalendarScore({ byDay, today, weeks = 12 }: { byDay: Map<string, RunSummary[]>; today: Date; weeks?: number }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [tip, setTip] = useState<{ x: number; y: number; title: string; body: string } | null>(null);

  const start = addDays(mondayOf(today), -(weeks - 1) * 7);
  const perRow = width >= 760 ? 4 : width >= 440 ? 2 : 1;
  const rows = Math.ceil(weeks / perRow);
  const gap = 7;
  const rowH = 112;
  const mw = width / perRow;
  const todayKey = dayKey(today);
  const practisedDays = [...byDay.keys()].filter((k) => k >= dayKey(start)).length;

  return (
    <div ref={ref} className="cal-score">
      {width > 0 && (
        <svg width={width} height={rows * rowH} role="img" aria-label={`Practice calendar for the last ${weeks} weeks: ${practisedDays} days practised.`}>
          {Array.from({ length: weeks }, (_, w) => {
            const r = Math.floor(w / perRow);
            const c = w % perRow;
            const x0 = c * mw;
            const mid = r * rowH + 66;
            const weekStart = addDays(start, w * 7);
            const slot = (mw - 22) / 7;
            return (
              <g key={w}>
                <text className="cal-week" x={x0 + 10} y={mid - 2 * gap - 26}>
                  {fmtShort.format(weekStart)}
                </text>
                <g className="st-lines">
                  {[-2, -1, 0, 1, 2].map((i) => (
                    <line key={i} x1={x0} x2={x0 + mw} y1={mid + i * gap} y2={mid + i * gap} />
                  ))}
                </g>
                {c === 0 && <line className="st-edge" x1={x0 + 0.5} x2={x0 + 0.5} y1={mid - 2 * gap} y2={mid + 2 * gap} />}
                <line className="st-edge" x1={x0 + mw - 0.5} x2={x0 + mw - 0.5} y1={mid - 2 * gap} y2={mid + 2 * gap} />
                {Array.from({ length: 7 }, (_, d) => {
                  const date = addDays(weekStart, d);
                  const key = dayKey(date);
                  const x = x0 + 12 + slot * (d + 0.5);
                  if (key > todayKey) return null;
                  const runs = byDay.get(key) ?? [];
                  const isToday = key === todayKey;
                  const show = (e: PointerEvent<SVGGElement>) => {
                    const box = (e.currentTarget as SVGGElement).getBoundingClientRect();
                    const host = ref.current!.getBoundingClientRect();
                    const mins = Math.round(runs.reduce((a, r) => a + r.durationMs, 0) / 60000);
                    const best = Math.max(0, ...runs.map((r) => r.wpm));
                    setTip({
                      x: box.left - host.left + box.width / 2,
                      y: box.top - host.top,
                      title: isToday ? `Today, ${fmtShort.format(date)}` : fmtLong.format(date),
                      body: runs.length
                        ? `${runs.length} ${runs.length === 1 ? 'session' : 'sessions'}, ${Math.max(1, mins)} min, best ${best} wpm`
                        : isToday
                          ? 'Nothing yet today'
                          : 'Day off',
                    });
                  };
                  const n = Math.min(4, runs.length);
                  const pitches = [-2, 0, 2, 4].slice(0, n);
                  const yOf = (p: number) => mid - (p * gap) / 2;
                  return (
                    <g
                      key={d}
                      className={`cal-day${isToday ? ' is-today' : ''}${runs.length ? '' : ' is-rest'}`}
                      onPointerEnter={show}
                      onPointerLeave={() => setTip(null)}
                    >
                      <rect x={x - slot / 2} y={mid - 4 * gap} width={slot} height={8 * gap} fill="transparent" />
                      {n === 0 ? (
                        <rect className="cal-rest" x={x - 4} y={mid - gap * 0.55} width={8} height={gap * 0.55} rx={0.5} />
                      ) : (
                        <>
                          {pitches.map((p) => (
                            <ellipse key={p} cx={x} cy={yOf(p)} rx={gap * 0.62} ry={gap * 0.44} transform={`rotate(-20 ${x} ${yOf(p)})`} />
                          ))}
                          <line x1={x + gap * 0.56} x2={x + gap * 0.56} y1={yOf(pitches[0]) - 1} y2={yOf(pitches[n - 1]) - gap * 3.1} />
                        </>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      )}
      {tip && (
        <div className="chart-tip cal-tip" style={{ left: Math.min(Math.max(tip.x, 90), width - 90), top: tip.y - 58 }}>
          <span className="chart-tip-label">{tip.title}</span>
          <span className="chart-tip-value">{tip.body}</span>
        </div>
      )}
    </div>
  );
}
