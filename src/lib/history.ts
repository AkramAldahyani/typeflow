import { gauss, mulberry32, pick, clamp } from './rng';
import type { Mode } from './generate';
import type { RunSummary, Trace } from './stats';

const KEY = 'tf-history-v1';

export function loadRuns(): RunSummary[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RunSummary[]) : [];
  } catch {
    return [];
  }
}

export function saveRun(run: RunSummary) {
  try {
    const runs = loadRuns();
    runs.push(run);
    localStorage.setItem(KEY, JSON.stringify(runs.slice(-200)));
  } catch {
    /* storage unavailable: the run still shows on screen */
  }
}

export function clearRuns() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const addDays = (d: Date, n: number) => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};

/** A plausible twelve weeks of practice for someone steadily improving. Deterministic. */
export function sampleHistory(today = new Date()): RunSummary[] {
  const rng = mulberry32(20261114);
  const runs: RunSummary[] = [];
  const DAYS = 84;
  const modes: [Mode, string][] = [
    ['time', '30 seconds of standard words'],
    ['time', '60 seconds of standard words'],
    ['words', '25 standard words'],
    ['quote', 'Jane Austen, Pride and Prejudice'],
    ['time', '60 seconds of demanding words'],
    ['quote', 'Henry David Thoreau, Walden'],
  ];
  const letters = 'eatnoirshldcumwfgypb';

  for (let ago = DAYS - 1; ago >= 1; ago--) {
    const progress = 1 - ago / DAYS;
    const streakRun = ago <= 10;
    const practised = streakRun || rng() < 0.45 + progress * 0.3;
    if (!practised) continue;
    const sessions = 1 + Math.floor(rng() * (streakRun ? 3 : 2.4));
    for (let s = 0; s < sessions; s++) {
      const day = addDays(today, -ago);
      day.setHours(7 + Math.floor(rng() * 14), Math.floor(rng() * 60), 0, 0);
      const [mode, label] = pick(rng, modes);
      const wpm = Math.round(clamp(gauss(rng, 47 + progress * 20, 3.6), 30, 95));
      const accuracy = Math.round(clamp(gauss(rng, 92.6 + progress * 3.8, 1.1), 85, 100) * 10) / 10;
      const rhythm = Math.round(clamp(gauss(rng, 63 + progress * 16, 3.5), 40, 98));
      const durationMs = mode === 'time' ? (label.startsWith('30') ? 30000 : 60000) : Math.round(gauss(rng, 32000, 7000));
      const chars = Math.round((wpm * 5 * durationMs) / 60000 / (accuracy / 100));
      const errors = Math.max(0, Math.round(chars * (1 - accuracy / 100)));
      const missed: Record<string, number> = {};
      for (let e = 0; e < errors; e++) {
        const k = rng() < 0.12 ? ' ' : letters[Math.floor(Math.abs(gauss(rng, 0, 6))) % letters.length];
        missed[k] = (missed[k] ?? 0) + 1;
      }
      runs.push({
        id: `sample-${ago}-${s}`,
        date: day.toISOString(),
        mode,
        label,
        durationMs,
        wpm,
        raw: wpm + Math.round(rng() * 6),
        accuracy,
        rhythm,
        errors,
        uncorrected: Math.round(errors * 0.2),
        chars,
        missed,
        trace: sampleTrace(rng, wpm, rhythm),
        sample: true,
      });
    }
  }
  return runs;
}

function sampleTrace(rng: () => number, wpm: number, rhythm: number): Trace {
  const base = 12000 / wpm;
  const spread = (100 - rhythm) / 100;
  const out: Trace = [];
  let t = 0;
  for (let i = 0; i < 70; i++) {
    if (i) t += Math.max(35, gauss(rng, base, base * spread * 0.9)) + (rng() < 0.03 ? 900 : 0);
    const space = i % 6 === 5;
    out.push([Math.round(t), rng() < 0.04 ? 1 : space ? 2 : 0]);
  }
  return out;
}
