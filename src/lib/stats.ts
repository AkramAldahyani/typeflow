import { clamp } from './rng';
import type { Mode } from './generate';

/** One key press, timed from the first key of the run. */
export interface Keystroke {
  t: number;
  index: number;
  expected: string;
  typed: string;
  ok: boolean;
}

export interface Pause {
  t: number;
  ms: number;
  word: string;
}

/** Compact keystroke trace kept with saved runs, enough to redraw a mini score. [ms, flag] where flag 0 = ok, 1 = mistake, 2 = space. */
export type Trace = [number, 0 | 1 | 2][];

export interface RunSummary {
  id: string;
  date: string;
  mode: Mode;
  label: string;
  durationMs: number;
  wpm: number;
  raw: number;
  accuracy: number;
  rhythm: number;
  errors: number;
  uncorrected: number;
  chars: number;
  missed: Record<string, number>;
  trace?: Trace;
  sample?: boolean;
}

export interface RunResult extends RunSummary {
  keystrokes: Keystroke[];
  target: string;
  typed: string;
  series: number[];
  pauses: Pause[];
  insights: string[];
  kpm: number;
}

const PAUSE_MS = 1000;
const IGNORE_GAP_MS = 1500;

export const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

const cv = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const sd = Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
  return m ? sd / m : 0;
};

/**
 * Staff position for each keystroke: 0 is the middle line, positive is higher.
 * A key that lands quicker than your recent pace sits higher; a slower one sits lower.
 */
export function computePitches(ks: { t: number }[]): number[] {
  const out: number[] = [];
  const recent: number[] = [];
  for (let i = 0; i < ks.length; i++) {
    if (i === 0) {
      out.push(0);
      continue;
    }
    const gap = ks[i].t - ks[i - 1].t;
    let p = 0;
    if (recent.length >= 3) {
      const ref = median(recent);
      const ratio = Math.max(20, gap) / ref;
      p = Math.round(clamp(-Math.log2(ratio) * 2.6, -4, 4));
    }
    if (gap < IGNORE_GAP_MS) {
      recent.push(gap);
      if (recent.length > 24) recent.shift();
    }
    out.push(p);
  }
  return out;
}

const intervals = (ks: { t: number }[]) => {
  const out: number[] = [];
  for (let i = 1; i < ks.length; i++) {
    const d = ks[i].t - ks[i - 1].t;
    if (d < IGNORE_GAP_MS) out.push(d);
  }
  return out;
};

/** 0–100. How evenly spaced the keystrokes are, ignoring deliberate pauses. */
export function rhythmScore(ks: { t: number }[]) {
  const iv = intervals(ks);
  if (iv.length < 8) return 0;
  const sorted = [...iv].sort((a, b) => a - b);
  const trimmed = sorted.slice(0, Math.max(8, Math.floor(sorted.length * 0.96)));
  return Math.round(clamp(100 * Math.exp(-0.75 * cv(trimmed)), 0, 100));
}

export function tempoName(wpm: number) {
  if (wpm < 20) return 'Grave';
  if (wpm < 32) return 'Largo';
  if (wpm < 45) return 'Andante';
  if (wpm < 58) return 'Moderato';
  if (wpm < 75) return 'Allegro';
  if (wpm < 95) return 'Vivace';
  return 'Presto';
}

export function countCorrect(target: string, typed: string) {
  let n = 0;
  for (let i = 0; i < typed.length; i++) if (typed[i] === target[i]) n++;
  return n;
}

export const wpmOf = (correctChars: number, ms: number) => (ms > 0 ? correctChars / 5 / (ms / 60000) : 0);

export const formatClock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const keyName = (k: string) => (k === ' ' ? 'the space bar' : k);

const listJoin = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

function wordAt(text: string, index: number) {
  let i = index;
  if (text[i] === ' ') i++;
  let a = i;
  let b = i;
  while (a > 0 && text[a - 1] !== ' ') a--;
  while (b < text.length && text[b] !== ' ') b++;
  return text.slice(a, b).replace(/[^\w'-]/g, '');
}

export function toTrace(ks: Keystroke[], max = 90): Trace {
  const slice = ks.slice(-max);
  const t0 = slice[0]?.t ?? 0;
  return slice.map((k) => [Math.round(k.t - t0), k.ok ? (k.expected === ' ' ? 2 : 0) : 1]);
}

export function computeResult(args: {
  target: string;
  typed: string;
  keystrokes: Keystroke[];
  durationMs: number;
  mode: Mode;
  label: string;
}): RunResult {
  const { target, typed, keystrokes: ks, mode, label } = args;
  const durationMs = Math.max(1, args.durationMs);
  const correct = countCorrect(target, typed);
  const okKeys = ks.filter((k) => k.ok).length;
  const errors = ks.length - okKeys;
  const uncorrected = typed.length - correct;
  const wpm = Math.round(wpmOf(correct, durationMs));
  const raw = Math.round(wpmOf(ks.length, durationMs));
  const accuracy = ks.length ? Math.round((okKeys / ks.length) * 1000) / 10 : 0;
  const rhythm = rhythmScore(ks);
  const kpm = Math.round(ks.length / (durationMs / 60000));

  const missed: Record<string, number> = {};
  for (const k of ks) if (!k.ok) missed[k.expected.toLowerCase()] = (missed[k.expected.toLowerCase()] ?? 0) + 1;

  // Speed per second, lightly smoothed.
  const secs = Math.max(1, Math.ceil(durationMs / 1000));
  const perSec = new Array(secs).fill(0);
  for (const k of ks) if (k.ok) perSec[Math.min(secs - 1, Math.floor(k.t / 1000))]++;
  const series = perSec.map((_, i) => {
    const w = perSec.slice(Math.max(0, i - 1), i + 2);
    return Math.round((mean(w) * 60) / 5);
  });

  const pauses: Pause[] = [];
  for (let i = 1; i < ks.length; i++) {
    const gap = ks[i].t - ks[i - 1].t;
    if (gap >= PAUSE_MS) pauses.push({ t: ks[i].t, ms: gap, word: wordAt(target, ks[i].index) });
  }

  const insights: string[] = [];
  if (series.length >= 8) {
    const half = Math.floor(series.length / 2);
    const a = mean(series.slice(1, half));
    const b = mean(series.slice(half));
    const diff = Math.round(b - a);
    if (diff >= 4) insights.push(`You finished ${diff} wpm faster than you started. You warmed into it.`);
    else if (diff <= -4) insights.push(`You slowed by ${-diff} wpm in the second half. A shorter session may help you hold your pace.`);
    else insights.push('Your speed held within a few wpm from start to finish.');
  }
  if (durationMs >= 20000) {
    let best = { cv: Infinity, from: 0 };
    for (let from = 0; from + 10000 <= durationMs; from += 5000) {
      const win = ks.filter((k) => k.t >= from && k.t < from + 10000);
      const c = cv(intervals(win));
      if (win.length > 12 && c < best.cv) best = { cv: c, from };
    }
    if (best.cv < Infinity)
      insights.push(`Your steadiest stretch ran from ${formatClock(best.from)} to ${formatClock(best.from + 10000)}.`);
  }
  if (pauses.length === 0) insights.push('You never stopped for longer than a second.');
  else {
    const longest = pauses.reduce((m, p) => (p.ms > m.ms ? p : m));
    const times = pauses.length === 1 ? 'once' : `${pauses.length} times`;
    insights.push(
      `You paused ${times} for more than a second${longest.word ? `, longest before “${longest.word}”` : ''}. Pauses show as fermatas above the stave.`,
    );
  }
  const top = Object.entries(missed)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => keyName(k));
  if (errors === 0) insights.push('No mistakes on this run.');
  else insights.push(`Most mistakes landed on ${listJoin(top)}.`);

  return {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    date: new Date().toISOString(),
    mode,
    label,
    durationMs,
    wpm,
    raw,
    accuracy,
    rhythm,
    errors,
    uncorrected,
    chars: typed.length,
    missed,
    trace: toTrace(ks),
    keystrokes: ks,
    target,
    typed,
    series,
    pauses,
    insights,
    kpm,
  };
}

export function toSummary(r: RunResult): RunSummary {
  const { keystrokes: _k, target: _t, typed: _y, series: _s, pauses: _p, insights: _i, kpm: _m, ...summary } = r;
  return summary;
}

/** Fake keystrokes for illustrations and sample history. */
export function synthKeystrokes(
  text: string,
  rng: () => number,
  gapFor: (i: number, ch: string) => number,
  errorRate = 0,
): Keystroke[] {
  const out: Keystroke[] = [];
  let t = 0;
  for (let i = 0; i < text.length; i++) {
    if (i > 0) t += gapFor(i, text[i]);
    const ok = text[i] === ' ' ? rng() > errorRate / 3 : rng() > errorRate;
    out.push({ t, index: i, expected: text[i], typed: ok ? text[i] : 'x', ok });
  }
  return out;
}
