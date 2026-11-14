import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LiveStave } from '../components/Stave';
import { TypingText } from '../components/TypingText';
import { TypingInput, type TypingInputHandle } from '../components/TypingInput';
import { Icon, Segmented } from '../components/ui';
import { NotationKey } from '../components/NotationKey';
import { usePersistentState } from '../hooks/hooks';
import { useTypingSession, type SessionState } from '../hooks/useTypingSession';
import { buildText, DEFAULT_CONFIG, MODES, TIME_OPTIONS, WORD_OPTIONS, wordStream, type Difficulty, type Mode, type QuoteLength } from '../lib/generate';
import { mulberry32, randomSeed } from '../lib/rng';
import { computeResult, formatClock, toSummary, type RunResult } from '../lib/stats';
import { saveRun } from '../lib/history';
import { Results } from './Results';
import './practice.css';

const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: 'time', label: 'Timed' },
  { value: 'words', label: 'Words' },
  { value: 'quote', label: 'Quote' },
  { value: 'custom', label: 'Custom' },
];
const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: 'gentle', label: 'Gentle' },
  { value: 'standard', label: 'Standard' },
  { value: 'demanding', label: 'Demanding' },
];
const QUOTE_OPTIONS: { value: QuoteLength; label: string }[] = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
];

const isEditable = (el: Element | null) =>
  !!el && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || (el as HTMLElement).isContentEditable);

export function Practice({ query }: { query: URLSearchParams }) {
  const [config, setConfig] = usePersistentState('tf-config', DEFAULT_CONFIG);
  const [seed, setSeed] = useState(randomSeed);
  const [result, setResult] = useState<RunResult | null>(null);
  const [focused, setFocused] = useState(false);
  const [typing, setTyping] = useState(false);
  const [editing, setEditing] = useState(false);
  const typingTimer = useRef<number>();
  const inputRef = useRef<TypingInputHandle>(null);
  const streamRef = useRef<(n: number) => string[]>();

  // Deep links like #/practice?mode=quote pick the mode.
  const queryMode = query.get('mode') as Mode | null;
  useEffect(() => {
    if (queryMode && MODES.includes(queryMode)) setConfig((c) => ({ ...c, mode: queryMode }));
  }, [queryMode, setConfig]);

  const text = useMemo(() => buildText(config, seed), [config, seed]);
  const limitMs = config.mode === 'time' ? config.time * 1000 : null;

  const onFinish = useCallback(
    (s: SessionState) => {
      if (s.startAt == null || s.endAt == null || s.keystrokes.length < 2) return;
      const r = computeResult({
        target: s.target,
        typed: s.typed,
        keystrokes: s.keystrokes,
        durationMs: s.endAt - s.startAt,
        mode: config.mode,
        label: text.label,
      });
      saveRun(toSummary(r));
      setResult(r);
    },
    [config.mode, text.label],
  );

  const session = useTypingSession(onFinish);
  const { state, live, elapsed } = session;

  const begin = useCallback(
    (t: string) => {
      session.reset(t, limitMs);
      streamRef.current = wordStream(config.difficulty, mulberry32(seed ^ 0x5bd1e995));
      setResult(null);
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [limitMs, config.difficulty, seed],
  );

  useEffect(() => {
    begin(text.text);
  }, [text, begin]);

  // Timed mode never runs out of words.
  useEffect(() => {
    if (config.mode !== 'time' || !streamRef.current) return;
    if (state.target.length - state.typed.length < 120) session.append(' ' + streamRef.current(30).join(' '));
  }, [state.typed.length, state.target.length, config.mode, session]);

  // Quiet the rest of the page while a run is underway.
  useEffect(() => {
    if (state.phase === 'running') document.body.dataset.focus = 'on';
    else delete document.body.dataset.focus;
    return () => {
      delete document.body.dataset.focus;
    };
  }, [state.phase]);

  const newText = useCallback(() => setSeed(randomSeed()), []);
  const retry = useCallback(() => begin(text.text), [begin, text.text]);

  const onChar = useCallback(
    (ch: string) => {
      session.insert(ch);
      setTyping(true);
      window.clearTimeout(typingTimer.current);
      typingTimer.current = window.setTimeout(() => setTyping(false), 650);
    },
    [session],
  );

  // Start typing from anywhere on the page.
  useEffect(() => {
    if (result || editing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
      if (isEditable(document.activeElement)) return;
      const active = document.activeElement as HTMLElement | null;
      if (active && active.closest('button, a, [role="radio"]') && e.key === ' ') return;
      e.preventDefault();
      inputRef.current?.focus();
      onChar(e.key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [result, editing, onChar]);

  const update = <K extends keyof typeof config>(key: K, value: (typeof config)[K]) => setConfig((c) => ({ ...c, [key]: value }));

  if (result) {
    return (
      <div className="wrap practice">
        <Results result={result} onAgain={newText} onRetry={retry} />
      </div>
    );
  }

  const running = state.phase === 'running';
  const progress =
    config.mode === 'time' ? Math.min(1, elapsed / (limitMs ?? 1)) : state.target.length ? state.typed.length / state.target.length : 0;
  const clock = config.mode === 'time' ? formatClock((limitMs ?? 0) - elapsed) : formatClock(elapsed);
  const wordsDone = state.typed.split(' ').length - (state.typed.endsWith(' ') || !state.typed ? 1 : 0);
  const totalWords = state.target.split(' ').length;

  return (
    <div className="wrap practice" data-running={running || undefined}>
      <div className="practice-options">
        <Segmented label="Practice mode" options={MODE_OPTIONS} value={config.mode} onChange={(v) => update('mode', v)} />
        <div className="options-sub" key={config.mode}>
          {config.mode === 'time' && (
            <Segmented
              size="sm"
              label="Duration"
              options={TIME_OPTIONS.map((t) => ({ value: t, label: `${t}s` }))}
              value={config.time}
              onChange={(v) => update('time', v)}
            />
          )}
          {config.mode === 'words' && (
            <Segmented
              size="sm"
              label="Number of words"
              options={WORD_OPTIONS.map((w) => ({ value: w, label: String(w) }))}
              value={config.words}
              onChange={(v) => update('words', v)}
            />
          )}
          {config.mode === 'quote' && (
            <Segmented size="sm" label="Passage length" options={QUOTE_OPTIONS} value={config.quoteLength} onChange={(v) => update('quoteLength', v)} />
          )}
          {config.mode === 'custom' && (
            <button type="button" className="btn btn-text" onClick={() => setEditing((e) => !e)} aria-expanded={editing}>
              <Icon name="edit" size={16} />
              {editing ? 'Close editor' : 'Edit your text'}
            </button>
          )}
        </div>
        <div className="options-diff">
          <Segmented size="sm" label="Difficulty" options={DIFFICULTY_OPTIONS} value={config.difficulty} onChange={(v) => update('difficulty', v)} />
        </div>
      </div>

      {config.mode === 'custom' && editing && (
        <CustomEditor
          initial={config.customText}
          onCancel={() => setEditing(false)}
          onSave={(t) => {
            update('customText', t);
            setEditing(false);
          }}
        />
      )}

      <section
        className={`sheet practice-sheet${focused ? ' is-focused' : ''}`}
        aria-label="Typing practice"
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <div className="ps-head">
          <p className="ps-label">{text.label}</p>
          <dl className="ps-stats">
            <div className="ps-stat ps-clock">
              <dt className="sr-only">{config.mode === 'time' ? 'Time left' : 'Time'}</dt>
              <dd>{clock}</dd>
            </div>
            <div className="ps-stat">
              <dt>wpm</dt>
              <dd>{live.wpm ?? '0'}</dd>
            </div>
            <div className="ps-stat">
              <dt>accuracy</dt>
              <dd>{live.accuracy == null ? '100%' : `${live.accuracy}%`}</dd>
            </div>
            <div className={`ps-stat${live.errors ? ' has-errors' : ''}`}>
              <dt>{live.errors === 1 ? 'mistake' : 'mistakes'}</dt>
              <dd>{live.errors}</dd>
            </div>
          </dl>
        </div>

        <div
          className="ps-progress"
          role="progressbar"
          aria-label={config.mode === 'time' ? 'Time used' : 'Text completed'}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <span style={{ transform: `scaleX(${progress})` }} />
        </div>

        <div className="ps-text">
          <TypingText target={state.target} typed={state.typed} typing={typing} focused={focused} />
          <div className={`ps-veil${focused ? '' : ' is-visible'}`} aria-hidden={focused}>
            <span>{state.phase === 'idle' ? 'Click here or just start typing' : 'Click here to keep typing'}</span>
          </div>
        </div>

        <LiveStave keystrokes={state.keystrokes} startAt={state.startAt} endAt={state.endAt} running={running} />

        <div className="ps-foot">
          <p className="ps-hint">
            {config.mode === 'time' ? (
              <span>{running ? 'Keep going until the clock runs out.' : 'The clock starts with your first key.'}</span>
            ) : (
              <span>
                {wordsDone} of {totalWords} words
              </span>
            )}
          </p>
          <div className="ps-actions">
            <button type="button" className="btn btn-text" onClick={retry} title="Start this text again">
              <Icon name="restart" size={16} /> Restart
            </button>
            <button type="button" className="btn btn-text" onClick={newText} title="New text (Tab)">
              <Icon name="shuffle" size={16} /> New text <span className="kbd">Tab</span>
            </button>
          </div>
        </div>

        <TypingInput
          ref={inputRef}
          label="Type the text shown"
          onChar={onChar}
          onBackspace={session.backspace}
          onTab={newText}
          onFocusChange={setFocused}
        />
      </section>

      <NotationKey className="practice-key" />
    </div>
  );
}

function CustomEditor({ initial, onSave, onCancel }: { initial: string; onSave: (t: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const trimmed = value.trim();
  return (
    <form
      className="custom-editor"
      onSubmit={(e) => {
        e.preventDefault();
        if (trimmed) onSave(trimmed);
      }}
    >
      <label htmlFor="custom-text" className="h3">
        Your practice text
      </label>
      <p className="muted custom-help">Paste or write up to 2,000 characters. Line breaks become spaces and curly quotes become straight ones.</p>
      <textarea
        id="custom-text"
        ref={ref}
        value={value}
        maxLength={2000}
        rows={5}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && trimmed) onSave(trimmed);
        }}
      />
      <div className="custom-row">
        <span className="muted custom-count">{value.length.toLocaleString()} / 2,000</span>
        <button type="button" className="btn btn-text" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={!trimmed}>
          Use this text
        </button>
      </div>
    </form>
  );
}
