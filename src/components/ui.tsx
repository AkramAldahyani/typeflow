import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="logo-mark">
      <ellipse cx="8.6" cy="17.2" rx="5" ry="3.6" transform="rotate(-22 8.6 17.2)" fill="currentColor" />
      <rect x="12.6" y="2.5" width="2.2" height="14.6" rx="1.1" className="logo-stem" />
    </svg>
  );
}

export function Logo() {
  return (
    <a href="#/" className="logo" aria-label="TypeFlow home">
      <LogoMark />
      <span className="logo-word">TypeFlow</span>
    </a>
  );
}

const paths = {
  restart: 'M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5',
  sun: 'M12 4V2.5M12 21.5V20M4 12H2.5M21.5 12H20M6.3 6.3 5.2 5.2M18.8 18.8l-1.1-1.1M6.3 17.7l-1.1 1.1M18.8 5.2l-1.1 1.1M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z',
  shuffle: 'M3 7h3.5c2 0 3.2 1 4.3 2.7l2.4 4.6c1 1.7 2.3 2.7 4.3 2.7H21M3 17h3.5c1.3 0 2.3-.5 3.1-1.3M17.5 4 21 7l-3.5 3M17.5 14l3.5 3-3.5 3M13.7 8.3c.8-.8 1.8-1.3 3.1-1.3H21',
  edit: 'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z',
  trash: 'M5 7h14M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3',
};

export function Icon({ name, size = 18 }: { name: keyof typeof paths; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={paths[name]} />
    </svg>
  );
}

interface SegOption<T> {
  value: T;
  label: ReactNode;
}

/** Radio group with a sliding indicator. Arrow keys move the selection. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  size = 'md',
}: {
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  size?: 'sm' | 'md';
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const btns = useRef(new Map<T, HTMLButtonElement>());
  const [ind, setInd] = useState<{ x: number; w: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = btns.current.get(value);
      if (el) setInd({ x: el.offsetLeft, w: el.offsetWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrap.current) ro.observe(wrap.current);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [value, options.length]);

  const onKey = (e: KeyboardEvent) => {
    const i = options.findIndex((o) => o.value === value);
    let n = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % options.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + options.length) % options.length;
    if (n >= 0) {
      e.preventDefault();
      onChange(options[n].value);
      btns.current.get(options[n].value)?.focus();
    }
  };

  return (
    <div ref={wrap} className={`seg seg-${size}`} role="radiogroup" aria-label={label} onKeyDown={onKey}>
      {ind && <span className="seg-ind" style={{ transform: `translateX(${ind.x}px)`, width: ind.w }} aria-hidden />}
      {options.map((o) => (
        <button
          key={String(o.value)}
          ref={(el) => {
            if (el) btns.current.set(o.value, el);
            else btns.current.delete(o.value);
          }}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          className="seg-btn"
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A figure set on the page rather than in a box: value, then a quiet label beneath. */
export function Figure({ value, unit, label, tone }: { value: ReactNode; unit?: string; label: ReactNode; tone?: 'rose' | 'cobalt' }) {
  return (
    <div className="figure">
      <div className={`figure-value${tone ? ` is-${tone}` : ''}`}>
        {value}
        {unit && <span className="figure-unit">{unit}</span>}
      </div>
      <div className="figure-label">{label}</div>
    </div>
  );
}
