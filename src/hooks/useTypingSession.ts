import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { countCorrect, wpmOf, type Keystroke } from '../lib/stats';

export type Phase = 'idle' | 'running' | 'done';

export interface SessionState {
  target: string;
  typed: string;
  keystrokes: Keystroke[];
  phase: Phase;
  startAt: number | null;
  endAt: number | null;
  limitMs: number | null;
  corrections: number;
}

type Action =
  | { type: 'insert'; ch: string; at: number }
  | { type: 'back'; word: boolean }
  | { type: 'reset'; target: string; limitMs: number | null }
  | { type: 'append'; text: string }
  | { type: 'finish'; at: number };

const initial = (target: string, limitMs: number | null): SessionState => ({
  target,
  typed: '',
  keystrokes: [],
  phase: 'idle',
  startAt: null,
  endAt: null,
  limitMs,
  corrections: 0,
});

function reducer(s: SessionState, a: Action): SessionState {
  switch (a.type) {
    case 'reset':
      return initial(a.target, a.limitMs);
    case 'append':
      return { ...s, target: s.target + a.text };
    case 'finish':
      if (s.phase !== 'running') return s;
      return { ...s, phase: 'done', endAt: a.at };
    case 'insert': {
      if (s.phase === 'done') return s;
      const startAt = s.startAt ?? a.at;
      if (s.limitMs && a.at - startAt >= s.limitMs) return { ...s, phase: 'done', endAt: startAt + s.limitMs };
      const index = s.typed.length;
      if (index >= s.target.length) return s;
      const expected = s.target[index];
      const k: Keystroke = { t: a.at - startAt, index, expected, typed: a.ch, ok: a.ch === expected };
      const typed = s.typed + a.ch;
      const done = typed.length >= s.target.length;
      return {
        ...s,
        startAt,
        typed,
        keystrokes: [...s.keystrokes, k],
        phase: done ? 'done' : 'running',
        endAt: done ? a.at : null,
      };
    }
    case 'back': {
      if (s.phase !== 'running' || !s.typed.length) return s;
      let typed = s.typed;
      if (a.word) {
        typed = typed.replace(/\s+$/, '');
        typed = typed.replace(/\S+$/, '');
      } else typed = typed.slice(0, -1);
      return { ...s, typed, corrections: s.corrections + 1 };
    }
  }
}

/**
 * The typing engine. Character-level: each position in the target is compared with what was typed there.
 * Every wrong key counts as a mistake, even if it is corrected later.
 */
export function useTypingSession(onFinish?: (s: SessionState) => void) {
  const [state, dispatch] = useReducer(reducer, initial('', null));
  const [now, setNow] = useState(0);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  // Clock while running; also enforces the time limit when no keys are pressed.
  useEffect(() => {
    if (state.phase !== 'running' || state.startAt == null) return;
    const startAt = state.startAt;
    const id = window.setInterval(() => {
      const t = performance.now();
      setNow(t);
      if (state.limitMs && t - startAt >= state.limitMs) dispatch({ type: 'finish', at: startAt + state.limitMs });
    }, 100);
    return () => window.clearInterval(id);
  }, [state.phase, state.startAt, state.limitMs]);

  const stateRef = useRef(state);
  stateRef.current = state;
  useEffect(() => {
    if (state.phase === 'done') finishRef.current?.(stateRef.current);
  }, [state.phase]);

  const insert = useCallback((ch: string) => dispatch({ type: 'insert', ch, at: performance.now() }), []);
  const backspace = useCallback((word = false) => dispatch({ type: 'back', word }), []);
  const reset = useCallback((target: string, limitMs: number | null = null) => dispatch({ type: 'reset', target, limitMs }), []);
  const append = useCallback((text: string) => dispatch({ type: 'append', text }), []);

  const elapsed =
    state.startAt == null ? 0 : state.phase === 'done' && state.endAt != null ? state.endAt - state.startAt : Math.max(0, now - state.startAt);

  const live = useMemo(() => {
    const correct = countCorrect(state.target, state.typed);
    const okKeys = state.keystrokes.filter((k) => k.ok).length;
    const total = state.keystrokes.length;
    return {
      wpm: elapsed > 1500 ? Math.round(wpmOf(correct, elapsed)) : null,
      accuracy: total ? Math.round((okKeys / total) * 100) : null,
      errors: total - okKeys,
    };
  }, [state.target, state.typed, state.keystrokes, elapsed]);

  return { state, insert, backspace, reset, append, elapsed, live };
}
