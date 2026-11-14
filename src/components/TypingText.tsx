import { memo, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { useFontsReady } from '../hooks/hooks';
import './typing-text.css';

interface Props {
  target: string;
  typed: string;
  /** True while the caret should stop blinking because keys are arriving. */
  typing: boolean;
  focused: boolean;
  lines?: number;
}

interface WordSpan {
  start: number;
  text: string;
}

function splitWords(target: string): WordSpan[] {
  const out: WordSpan[] = [];
  let start = 0;
  for (let i = 0; i <= target.length; i++) {
    if (i === target.length || target[i] === ' ') {
      // Attach the trailing space to the word so wrapping happens after it.
      const end = Math.min(target.length, i + 1);
      if (end > start) out.push({ start, text: target.slice(start, end) });
      start = end;
    }
  }
  return out;
}

const Word = memo(function Word({
  word,
  typedPart,
  refs,
}: {
  word: WordSpan;
  typedPart: string;
  refs: MutableRefObject<(HTMLSpanElement | null)[]>;
}) {
  return (
    <span className="tt-word">
      {Array.from(word.text, (ch, j) => {
        const i = word.start + j;
        const state = j >= typedPart.length ? 'todo' : typedPart[j] === ch ? 'ok' : 'err';
        return (
          <span
            key={j}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className={`tt-ch tt-${state}${ch === ' ' ? ' tt-space' : ''}`}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
});

/**
 * The practice text. Each character is a span so the caret can be placed precisely on a proportional serif.
 * Shows three lines and scrolls so the active line stays second.
 */
export function TypingText({ target, typed, typing, focused, lines = 3 }: Props) {
  const words = useMemo(() => splitWords(target), [target]);
  const innerRef = useRef<HTMLDivElement>(null);
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [caret, setCaret] = useState({ x: 0, y: 0, h: 0 });
  const [shift, setShift] = useState(0);
  const [animate, setAnimate] = useState(false);
  const fontsReady = useFontsReady();

  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner || !target.length) return;
    const measure = () => {
      const idx = Math.min(typed.length, target.length - 1);
      const el = charRefs.current[idx];
      if (!el) return;
      const atEnd = typed.length >= target.length;
      const lineH = parseFloat(getComputedStyle(inner).lineHeight) || 40;
      const x = el.offsetLeft + (atEnd ? el.offsetWidth : 0);
      const y = el.offsetTop;
      setCaret({ x, y, h: el.offsetHeight });
      const line = Math.round(y / lineH);
      setShift(Math.max(0, line - 1) * lineH);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [typed.length, target, fontsReady]);

  // Avoid sliding the caret in from 0,0 on first paint or after a reset.
  useLayoutEffect(() => {
    if (typed.length === 0) {
      setAnimate(false);
      const id = requestAnimationFrame(() => setAnimate(true));
      return () => cancelAnimationFrame(id);
    }
  }, [typed.length === 0, target]);

  const last = typed.length - 1;
  const lastWrong = last >= 0 && typed[last] !== target[last];

  return (
    <div className="tt" style={{ ['--tt-lines' as string]: lines }}>
      <div ref={innerRef} className="tt-inner" style={{ transform: `translateY(${-shift}px)` }}>
        {words.map((w) => (
          <Word key={w.start} word={w} typedPart={typed.slice(w.start, w.start + w.text.length)} refs={charRefs} />
        ))}
        <span
          className={`tt-caret${focused ? '' : ' is-hidden'}${animate ? ' is-animated' : ''}`}
          style={{ transform: `translate(${caret.x}px, ${caret.y + caret.h * 0.1}px)`, height: caret.h * 0.86 }}
          aria-hidden
        >
          {/* Alternating class names restart the pulse on every keystroke. */}
          <span className={`tt-caret-bar${typing ? ` is-typing tt-pulse-${typed.length % 2}` : ' is-idle'}${lastWrong ? ' is-wrong' : ''}`} />
        </span>
      </div>
    </div>
  );
}
