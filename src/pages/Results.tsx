import { useEffect, useMemo, useRef } from 'react';
import { ScoreStave } from '../components/Stave';
import { LineChart } from '../components/LineChart';
import { NotationKey } from '../components/NotationKey';
import { Figure, Icon } from '../components/ui';
import { formatClock, tempoName, type RunResult } from '../lib/stats';
import { loadRuns, sampleHistory } from '../lib/history';

function QuarterNote() {
  return (
    <svg width="14" height="22" viewBox="0 0 14 22" aria-hidden className="metro-note">
      <ellipse cx="5.4" cy="17.4" rx="4.6" ry="3.3" transform="rotate(-20 5.4 17.4)" fill="currentColor" />
      <rect x="9.1" y="1" width="1.4" height="16" fill="currentColor" />
    </svg>
  );
}

export function Results({ result, onAgain, onRetry }: { result: RunResult; onAgain: () => void; onRetry: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    // Focus the heading, not a button, so a stray Space or Enter right after the run can't start a new one.
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Tab is the only key that starts the next run. Once focus is on a control, Tab moves focus as usual.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
      const active = document.activeElement;
      if (active && active !== document.body && active !== heading.current) return;
      e.preventDefault();
      onAgain();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onAgain]);

  // Compare with the last 30 days, sample history included so a first run still has context.
  const delta = useMemo(() => {
    const cutoff = Date.now() - 30 * 86400000;
    const past = [...sampleHistory(), ...loadRuns()].filter((r) => r.id !== result.id && new Date(r.date).getTime() > cutoff);
    if (past.length < 3) return null;
    const avg = past.reduce((a, r) => a + r.wpm, 0) / past.length;
    return Math.round(result.wpm - avg);
  }, [result]);

  const seconds = result.series.length;
  const step = seconds <= 20 ? 5 : seconds <= 60 ? 10 : 30;
  const points = result.series.map((y, i) => ({ x: i + 1, y, label: `${i + 1} s` }));
  const xTicks = Array.from({ length: Math.floor(seconds / step) }, (_, i) => ({ x: (i + 1) * step, label: `${(i + 1) * step}s` }));

  return (
    <section className="results" aria-labelledby="results-title">
      <div className="results-head">
        <div className="results-title-block">
          <p className="results-label">{result.label}</p>
          <p className="tempo-mark">
            <span className="tempo-name">{tempoName(result.wpm)}</span>
            <span className="metronome" title="Keystrokes per minute">
              <QuarterNote /> = {result.kpm}
            </span>
          </p>
          <h1 id="results-title" ref={heading} tabIndex={-1} className="results-wpm">
            {result.wpm}
            <span className="results-wpm-unit">words per minute</span>
          </h1>
          {delta != null && (
            <p className={`results-delta${delta > 0 ? ' is-up' : ''}`}>
              {delta > 0
                ? `${delta} wpm above your 30-day average.`
                : delta < 0
                  ? `${-delta} wpm under your 30-day average. Steady runs bring it back.`
                  : 'Right on your 30-day average.'}
            </p>
          )}
        </div>
        <div className="results-actions">
          <button type="button" className="btn btn-primary" onClick={onAgain}>
            Practise again <span className="kbd kbd-on-dark">Tab</span>
          </button>
          <button type="button" className="btn btn-quiet" onClick={onRetry}>
            <Icon name="restart" size={16} /> Retry this text
          </button>
          <a href="#/progress" className="btn btn-text">
            See your progress
          </a>
        </div>
      </div>

      <div className="sheet results-sheet">
        <div className="results-sheet-head">
          <h2 className="h3">Your run, as written</h2>
          <span className="muted">{formatClock(result.durationMs)} played</span>
        </div>
        <ScoreStave keystrokes={result.keystrokes} durationMs={result.durationMs} label={`Score of your run: ${result.keystrokes.length} keystrokes over ${formatClock(result.durationMs)}`} />
        <NotationKey withPause className="results-key" />
      </div>

      <div className="results-figures">
        <Figure value={result.accuracy.toFixed(1)} unit="%" label="Accuracy, counting every wrong key" />
        <Figure value={result.rhythm} unit="/ 100" label="Rhythm: how evenly you typed" tone="cobalt" />
        <Figure
          value={result.errors}
          label={result.uncorrected ? `Mistakes, ${result.uncorrected} left unfixed` : result.errors ? 'Mistakes, all fixed' : 'Mistakes'}
          tone={result.errors ? 'rose' : undefined}
        />
        <Figure value={result.raw} unit="wpm" label="Raw speed, mistakes included" />
        <Figure value={result.chars} label="Characters typed" />
        <Figure value={formatClock(result.durationMs)} label="Time" />
      </div>

      <div className="results-grid">
        <div className="results-panel">
          <h2 className="h3">Speed through the run</h2>
          <p className="muted results-panel-sub">Words per minute, second by second.</p>
          {points.length > 2 ? (
            <LineChart points={points} unit="wpm" xTicks={xTicks} height={200} ariaLabel="Speed over the run in words per minute" />
          ) : (
            <p className="muted">This run was too short to chart.</p>
          )}
        </div>
        <div className="results-panel">
          <h2 className="h3">Notes on this run</h2>
          <ul className="insights">
            {result.insights.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
