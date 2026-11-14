import { useMemo, useState } from 'react';
import { CalendarScore } from '../components/CalendarScore';
import { KeyHeat } from '../components/KeyHeat';
import { LineChart } from '../components/LineChart';
import { MiniStave } from '../components/Stave';
import { Figure, Icon, Segmented } from '../components/ui';
import { addDays, clearRuns, dayKey, loadRuns, sampleHistory } from '../lib/history';
import { keyName, type RunSummary } from '../lib/stats';
import './progress.css';

type Metric = 'wpm' | 'accuracy' | 'rhythm';

const METRICS: { value: Metric; label: string; unit: string; format: (n: number) => string }[] = [
  { value: 'wpm', label: 'Speed', unit: 'wpm', format: (n) => String(Math.round(n)) },
  { value: 'accuracy', label: 'Accuracy', unit: '%', format: (n) => n.toFixed(n % 1 ? 1 : 0) },
  { value: 'rhythm', label: 'Rhythm', unit: 'of 100', format: (n) => String(Math.round(n)) },
];

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const spell = (n: number) => WORDS[n] ?? String(n);
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

const fmtDay = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const fmtTime = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const fmtShort = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

function when(iso: string, today: Date) {
  const d = new Date(iso);
  const k = dayKey(d);
  if (k === dayKey(today)) return `Today, ${fmtTime.format(d)}`;
  if (k === dayKey(addDays(today, -1))) return `Yesterday, ${fmtTime.format(d)}`;
  return fmtDay.format(d);
}

export function Progress() {
  const [mine, setMine] = useState<RunSummary[]>(loadRuns);
  const [metric, setMetric] = useState<Metric>('wpm');
  const today = useMemo(() => new Date(), []);
  const sample = useMemo(() => sampleHistory(today), [today]);

  const runs = useMemo(() => [...sample, ...mine].sort((a, b) => a.date.localeCompare(b.date)), [sample, mine]);

  const byDay = useMemo(() => {
    const m = new Map<string, RunSummary[]>();
    for (const r of runs) {
      const k = dayKey(new Date(r.date));
      m.set(k, [...(m.get(k) ?? []), r]);
    }
    return m;
  }, [runs]);

  const stats = useMemo(() => {
    let d = today;
    if (!byDay.has(dayKey(d))) d = addDays(d, -1);
    let streak = 0;
    while (byDay.has(dayKey(d))) {
      streak++;
      d = addDays(d, -1);
    }
    const inRange = (from: number, to: number) =>
      runs.filter((r) => {
        const t = new Date(r.date).getTime();
        return t >= addDays(today, -from).getTime() && t < addDays(today, -to + 1).getTime();
      });
    const recent = inRange(7, 0);
    const monthAgo = inRange(35, 28);
    const lastMonth = inRange(30, 0);
    const missed: Record<string, number> = {};
    for (const r of lastMonth) for (const [k, n] of Object.entries(r.missed)) missed[k] = (missed[k] ?? 0) + n;
    const topKeys = Object.entries(missed)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => keyName(k));
    return {
      streak,
      best: Math.max(0, ...runs.map((r) => r.wpm)),
      bestRun: runs.reduce<RunSummary | null>((m, r) => (!m || r.wpm > m.wpm ? r : m), null),
      change: Math.round(avg(recent.map((r) => r.wpm)) - avg(monthAgo.map((r) => r.wpm))),
      accuracy: avg(lastMonth.map((r) => r.accuracy)),
      rhythm: Math.round(avg(lastMonth.map((r) => r.rhythm))),
      totalMin: Math.round(runs.reduce((a, r) => a + r.durationMs, 0) / 60000),
      sessions: runs.length,
      missed,
      topKeys,
    };
  }, [runs, byDay, today]);

  const points = useMemo(() => {
    const out: { x: number; y: number; label: string }[] = [];
    for (let ago = 41; ago >= 0; ago--) {
      const d = addDays(today, -ago);
      const day = byDay.get(dayKey(d));
      if (!day) continue;
      out.push({ x: 41 - ago, y: avg(day.map((r) => r[metric])), label: fmtDay.format(d) });
    }
    return out;
  }, [byDay, metric, today]);

  const xTicks = [41, 28, 14, 0].map((ago) => ({ x: 41 - ago, label: ago === 0 ? 'Today' : fmtShort.format(addDays(today, -ago)) }));
  const m = METRICS.find((x) => x.value === metric)!;
  const recent = [...runs].reverse().slice(0, 7);
  const hours = Math.floor(stats.totalMin / 60);

  const headline =
    stats.streak > 0 ? `${cap(spell(stats.streak))} ${stats.streak === 1 ? 'day' : 'days'} in a row.` : 'A fresh start today.';
  const sub =
    stats.change > 1
      ? `Your average speed is up ${stats.change} wpm on a month ago.`
      : stats.change < -1
        ? `Your average speed is ${-stats.change} wpm under a month ago. Shorter, steadier sessions help.`
        : 'Your speed has held steady over the past month.';

  return (
    <div className="wrap progress">
      <header className="progress-head">
        <h1 className="h2 progress-title">
          {headline} {sub}
        </h1>
        <div className="progress-figures">
          <Figure value={stats.streak} unit={stats.streak === 1 ? 'day' : 'days'} label="Current streak" tone="cobalt" />
          <Figure value={stats.best} unit="wpm" label="Best speed" />
          <Figure value={stats.accuracy.toFixed(1)} unit="%" label="Accuracy this month" />
          <Figure value={stats.rhythm} unit="/ 100" label="Rhythm this month" />
          <Figure value={hours ? `${hours}h ${stats.totalMin % 60}m` : `${stats.totalMin}m`} label={`Practised over ${stats.sessions} sessions`} />
        </div>
      </header>

      <section className="progress-section" aria-labelledby="cal-title">
        <div className="progress-section-head">
          <h2 id="cal-title" className="h3">
            The last twelve weeks
          </h2>
          <p className="muted">Each bar is a week. A chord is a day you practised, one note per session. A rest is a day off.</p>
        </div>
        <div className="sheet progress-sheet">
          <CalendarScore byDay={byDay} today={today} />
        </div>
      </section>

      <section className="progress-section progress-split" aria-labelledby="trend-title">
        <div className="trend">
          <div className="progress-section-head trend-head">
            <div>
              <h2 id="trend-title" className="h3">
                How your playing has changed
              </h2>
              <p className="muted">Daily average over the last six weeks.</p>
            </div>
            <Segmented size="sm" label="Measure" options={METRICS.map(({ value, label }) => ({ value, label }))} value={metric} onChange={setMetric} />
          </div>
          <LineChart key={metric} points={points} unit={m.unit} format={m.format} xTicks={xTicks} height={260} ariaLabel={`${m.label} by day over six weeks`} />
        </div>
        <div className="keys">
          <div className="progress-section-head">
            <h2 className="h3">Keys to practise</h2>
            <p className="muted">
              {stats.topKeys.length
                ? `Most missed this month: ${stats.topKeys.join(', ')}. Darker keys slip more often.`
                : 'No missed keys this month.'}
            </p>
          </div>
          <KeyHeat missed={stats.missed} />
          <a href="#/practice?mode=words" className="btn btn-quiet keys-cta">
            Drill with a words run
          </a>
        </div>
      </section>

      <section className="progress-section" aria-labelledby="recent-title">
        <div className="progress-section-head">
          <h2 id="recent-title" className="h3">
            Recent sessions
          </h2>
        </div>
        <ol className="sessions">
          {recent.map((r) => (
            <li key={r.id} className="session">
              <div className="session-when">
                <span>{when(r.date, today)}</span>
                {!r.sample && <span className="session-tag">Yours</span>}
              </div>
              <div className="session-label">{r.label}</div>
              <div className="session-stave">
                {r.trace && (
                  <MiniStave keystrokes={r.trace.slice(-34).map(([t, f]) => ({ t, ok: f !== 1, expected: f === 2 ? ' ' : 'a' }))} label={`Score excerpt for ${r.label}`} />
                )}
              </div>
              <dl className="session-nums">
                <div>
                  <dt>wpm</dt>
                  <dd>{r.wpm}</dd>
                </div>
                <div>
                  <dt>accuracy</dt>
                  <dd>{r.accuracy.toFixed(1)}%</dd>
                </div>
                <div>
                  <dt>rhythm</dt>
                  <dd>{r.rhythm}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
        <div className="progress-note">
          <p className="muted">
            {mine.length
              ? `${mine.length} of these sessions are yours. The rest is sample history, there to show how TypeFlow tracks progress.`
              : 'Everything here is sample history for now. Your own sessions appear as soon as you finish a run.'}
          </p>
          {mine.length > 0 && (
            <button
              type="button"
              className="btn btn-text"
              onClick={() => {
                if (window.confirm('Clear your saved sessions from this browser? Sample history stays.')) {
                  clearRuns();
                  setMine([]);
                }
              }}
            >
              <Icon name="trash" size={16} /> Clear my sessions
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
