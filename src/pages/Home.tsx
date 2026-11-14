import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { LiveStave, ScoreStave } from '../components/Stave';
import { TypingText } from '../components/TypingText';
import { TypingInput, type TypingInputHandle } from '../components/TypingInput';
import { useReducedMotion } from '../hooks/hooks';
import { useTypingSession } from '../hooks/useTypingSession';
import { DEMO_LINES, QUOTES } from '../lib/texts';
import { gauss, mulberry32 } from '../lib/rng';
import { computeResult, rhythmScore, synthKeystrokes } from '../lib/stats';
import type { Mode } from '../lib/generate';
import './home.css';

export function Home() {
  const demo = useRef<DemoHandle>(null);
  return (
    <>
      <section className="hero wrap" aria-labelledby="hero-title">
        <h1 id="hero-title" className="display hero-title">
          <span className="hero-line">Type with rhythm.</span>
          <span className="hero-line">Speed follows.</span>
        </h1>
        <div className="hero-sub">
          <p className="lede">
            TypeFlow writes every keystroke onto a stave as you type, so you can see where you rush, where you hesitate and when your hands settle into
            an even pace.
          </p>
          <div className="hero-ctas">
            <a href="#/practice" className="btn btn-primary">
              Start practising
            </a>
            <button type="button" className="btn btn-quiet" onClick={() => demo.current?.takeOver()}>
              Try the demo below
            </button>
          </div>
        </div>
        <HeroDemo ref={demo} />
      </section>

      <ReadingSection />
      <ModesSection />
      <WhySection />

      <section className="wrap closing" aria-labelledby="closing-title">
        <h2 id="closing-title" className="h2">
          Your first run takes thirty seconds.
        </h2>
        <a href="#/practice?mode=time" className="btn btn-primary">
          Start practising
        </a>
      </section>
    </>
  );
}

/* ------------------------------------------------------------------------------------------------ */

interface DemoHandle {
  takeOver: () => void;
}

/** The hero: a sentence typing itself onto the stave. Click it and it is yours to type. */
const HeroDemo = forwardRef<DemoHandle>(function HeroDemo(_, ref) {
  const session = useTypingSession();
  const { state, live } = session;
  const [line, setLine] = useState(0);
  const [mine, setMine] = useState(false);
  const [focused, setFocused] = useState(false);
  const [typing, setTyping] = useState(false);
  const typingTimer = useRef<number>();
  const input = useRef<TypingInputHandle>(null);
  const reduced = useReducedMotion();
  const { reset, insert, backspace } = session;

  // The ghost typist: human-ish timing, the odd slip and correction.
  useEffect(() => {
    if (mine) return;
    const text = DEMO_LINES[line];
    reset(text, null);
    if (reduced) return;
    const rng = mulberry32(line * 7919 + 17);
    const timers: number[] = [];
    let i = 0;
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));
    const step = () => {
      if (i >= text.length) {
        later(() => setLine((l) => (l + 1) % DEMO_LINES.length), 2800);
        return;
      }
      const ch = text[i];
      if (ch !== ' ' && i > 4 && rng() < 0.035) {
        insert(String.fromCharCode(97 + Math.floor(rng() * 26)));
        later(() => {
          backspace(false);
          later(() => {
            insert(ch);
            i++;
            later(step, 120);
          }, 170);
        }, 340);
        return;
      }
      insert(ch);
      i++;
      let gap = gauss(rng, 118, 26);
      if (ch === ' ' || text[i] === ' ') gap += 36;
      if (rng() < 0.04) gap += 520;
      later(step, Math.max(48, gap));
    };
    later(step, line === 0 ? 1500 : 600);
    return () => timers.forEach(clearTimeout);
  }, [line, mine, reduced, reset, insert, backspace]);

  const takeOver = useCallback(() => {
    setMine(true);
    reset(DEMO_LINES[line], null);
    requestAnimationFrame(() => input.current?.focus());
  }, [line, reset]);

  useImperativeHandle(ref, () => ({ takeOver }), [takeOver]);

  const onChar = (ch: string) => {
    if (!mine) return;
    if (state.phase === 'done') return;
    insert(ch);
    setTyping(true);
    window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => setTyping(false), 600);
  };

  const handBack = () => {
    setMine(false);
    setLine((l) => (l + 1) % DEMO_LINES.length);
  };

  const finishedMine = mine && state.phase === 'done';
  const rhythm = finishedMine ? rhythmScore(state.keystrokes) : null;

  return (
    <div
      className={`sheet hero-sheet${mine ? ' is-mine' : ''}`}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest('button, a')) return;
        e.preventDefault();
        if (!mine) takeOver();
        else input.current?.focus();
      }}
    >
      <div className="hero-sheet-head">
        <dl className="hero-stats">
          <div>
            <dt>wpm</dt>
            <dd>{live.wpm ?? 0}</dd>
          </div>
          <div>
            <dt>accuracy</dt>
            <dd>{live.accuracy ?? 100}%</dd>
          </div>
        </dl>
        <p className="hero-hint" aria-live="polite">
          {!mine && 'Click the text to type it yourself'}
          {mine && !finishedMine && (
            <>
              Your turn. <span className="kbd">Esc</span> hands it back.
            </>
          )}
          {finishedMine && (
            <>
              {live.wpm} wpm with a rhythm of {rhythm}.{' '}
              <a href="#/practice" className="hero-hint-link">
                Keep going in practice
              </a>
            </>
          )}
        </p>
      </div>
      <div className="hero-text">
        <TypingText target={state.target} typed={state.typed} typing={typing || (!mine && state.phase === 'running')} focused={!mine || focused} lines={2} />
      </div>
      <LiveStave keystrokes={state.keystrokes} startAt={state.startAt} endAt={state.endAt} running={state.phase === 'running'} height={112} gap={11} />
      {mine && (
        <TypingInput
          ref={input}
          label="Type the demo sentence"
          onChar={onChar}
          onBackspace={(w) => backspace(w)}
          onTab={() => reset(DEMO_LINES[line], null)}
          onEscape={handBack}
          onFocusChange={setFocused}
        />
      )}
    </div>
  );
});

/* ------------------------------------------------------------------------------------------------ */

const EXAMPLE_TEXT = 'the river kept its own time through the valley';

function useExample(kind: 'steady' | 'rushing' | 'hesitating') {
  return useMemo(() => {
    const rng = mulberry32(kind === 'steady' ? 11 : kind === 'rushing' ? 23 : 37);
    const words = EXAMPLE_TEXT.split(' ');
    const wordStart = new Set<number>();
    let p = 0;
    for (const w of words) {
      wordStart.add(p);
      p += w.length + 1;
    }
    const gap = (i: number, ch: string) => {
      if (kind === 'steady') return gauss(rng, 150, 11);
      if (kind === 'rushing') return ch === ' ' || EXAMPLE_TEXT[i - 1] === ' ' ? gauss(rng, 330, 60) : gauss(rng, 72, 12);
      const startsLong = wordStart.has(i) && (EXAMPLE_TEXT.slice(i).split(' ')[0]?.length ?? 0) >= 5;
      return startsLong ? gauss(rng, 1150, 120) : gauss(rng, 175, 34);
    };
    const ks = synthKeystrokes(EXAMPLE_TEXT, rng, gap, kind === 'hesitating' ? 0.07 : kind === 'rushing' ? 0.05 : 0);
    const dur = ks[ks.length - 1].t + 180;
    const r = computeResult({ target: EXAMPLE_TEXT, typed: ks.map((k) => k.typed).join(''), keystrokes: ks, durationMs: dur, mode: 'words', label: kind });
    return { ks, dur, wpm: r.wpm, rhythm: r.rhythm };
  }, [kind]);
}

function Example({ kind, title, body }: { kind: 'steady' | 'rushing' | 'hesitating'; title: string; body: string }) {
  const ex = useExample(kind);
  return (
    <figure className="example">
      <ScoreStave
        keystrokes={ex.ks}
        durationMs={ex.dur}
        rowMs={ex.dur}
        gap={8}
        rowHeight={92}
        showTimes={false}
        label={`${title}: example score`}
      />
      <figcaption>
        <h3 className="h3">{title}</h3>
        <p className="example-stats">
          {ex.wpm} wpm, rhythm {ex.rhythm}
        </p>
        <p className="body-copy">{body}</p>
      </figcaption>
    </figure>
  );
}

function ReadingSection() {
  return (
    <section className="wrap section reading" aria-labelledby="reading-title">
      <div className="section-intro">
        <h2 id="reading-title" className="h2">
          Learn to read your own score
        </h2>
        <p className="lede">
          Each note is one keystroke. Its height shows whether it came quicker or slower than your own pace, so an even line means an even hand. Here
          are three typists on the same sentence.
        </p>
      </div>
      <div className="examples">
        <Example kind="steady" title="Steady" body="Notes hug the middle line at even spacing. Nothing to fix here: this is flow." />
        <Example kind="rushing" title="Rushing" body="High bursts inside words, long gaps between them. Fast fingers, slow transitions." />
        <Example kind="hesitating" title="Hesitating" body="Pauses before longer words, marked by fermatas, with mistakes clustered just after." />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------------ */

const MODE_INFO: { mode: Mode; name: string; summary: string; options: string; preview: string; cta: string }[] = [
  {
    mode: 'time',
    name: 'Timed',
    summary: 'Type against the clock. The best way to warm up and to compare one day with the next.',
    options: '15, 30, 60 or 120 seconds',
    preview: 'place every hand would follow long line before thought light study near open',
    cta: 'Start a timed run',
  },
  {
    mode: 'words',
    name: 'Words',
    summary: 'A fixed number of words at your own pace. The run ends when the last word lands.',
    options: '10, 25, 50 or 100 words',
    preview: 'sound river keep along example quiet carry those children mountain begin',
    cta: 'Start a words run',
  },
  {
    mode: 'quote',
    name: 'Quote',
    summary: 'A passage from a classic book, with its capitals and punctuation intact.',
    options: 'Short, medium or long passages',
    preview: QUOTES[0].text,
    cta: 'Start a quote',
  },
  {
    mode: 'custom',
    name: 'Custom',
    summary: 'Paste anything you want to practise: your notes, a speech you are learning, the opening of a story.',
    options: 'Any text up to 2,000 characters',
    preview: 'Paste anything you want to practise here: a paragraph from your notes, or a speech you are learning.',
    cta: 'Write your own text',
  },
];

function ModesSection() {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const info = MODE_INFO[active];
  const move = (n: number) => {
    const i = (n + MODE_INFO.length) % MODE_INFO.length;
    setActive(i);
    tabs.current[i]?.focus();
  };

  return (
    <section className="wrap section modes" aria-labelledby="modes-title">
      <div className="section-intro">
        <h2 id="modes-title" className="h2">
          Four ways to practise
        </h2>
        <p className="lede">
          Every mode comes in three difficulties. Gentle sticks to short lowercase words. Demanding adds capitals, punctuation and numbers.
        </p>
      </div>
      <div className="modes-body">
        <div className="modes-list" role="tablist" aria-label="Practice modes" aria-orientation="vertical">
          {MODE_INFO.map((m, i) => (
            <button
              key={m.mode}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              id={`mode-tab-${m.mode}`}
              role="tab"
              type="button"
              aria-selected={i === active}
              aria-controls="mode-panel"
              tabIndex={i === active ? 0 : -1}
              className="mode-tab"
              onClick={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                  e.preventDefault();
                  move(i + 1);
                }
                if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                  e.preventDefault();
                  move(i - 1);
                }
              }}
            >
              <span className="mode-name">{m.name}</span>
              <span className="mode-options">{m.options}</span>
            </button>
          ))}
        </div>
        <div id="mode-panel" role="tabpanel" aria-labelledby={`mode-tab-${info.mode}`} className="sheet mode-panel" key={info.mode}>
          <p className="mode-summary">{info.summary}</p>
          <p className="mode-preview" aria-hidden>
            <span className="mode-preview-typed">{info.preview.slice(0, 18)}</span>
            <span className="mode-preview-caret" />
            {info.preview.slice(18)}
          </p>
          <a className="btn btn-primary" href={`#/practice?mode=${info.mode}`}>
            {info.cta}
          </a>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------------ */

const PRINCIPLES = [
  {
    title: 'Rhythm comes first',
    body: 'Every run gets a rhythm score from how evenly you type. Raise it and your speed rises with it, without forcing.',
  },
  {
    title: 'A quiet page',
    body: 'While you type, the screen holds the text, your caret and four numbers. Menus fade back until you stop.',
  },
  {
    title: 'Every mistake counts',
    body: 'Accuracy includes the keys you went back and fixed. The score shows exactly where each slip happened.',
  },
  {
    title: 'Stays on your device',
    body: 'No account and no uploads. Your sessions are saved in this browser and nowhere else.',
  },
];

function WhySection() {
  return (
    <section id="about" className="wrap section why" aria-labelledby="why-title">
      <div className="why-grid">
        <div className="why-intro">
          <h2 id="why-title" className="h2">
            Built around the way typing improves
          </h2>
          <p className="lede">
            Most typing sites hand you a speed and a score. But speed is a result. Underneath it sits rhythm: the even spacing between keystrokes that
            lets your hands move without second-guessing. TypeFlow is built around that.
          </p>
        </div>
        <dl className="principles">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="principle">
              <dt className="h3">{p.title}</dt>
              <dd className="body-copy">{p.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
