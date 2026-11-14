import type { ReactNode } from 'react';
import { Note } from './Stave';

function Glyph({ children, width = 30 }: { children: ReactNode; width?: number }) {
  return (
    <svg width={width} height={34} viewBox={`0 0 ${width} 34`} aria-hidden className="nk-glyph">
      <g className="st-lines">
        {[-2, -1, 0, 1, 2].map((i) => (
          <line key={i} x1={0} x2={width} y1={17 + i * 5} y2={17 + i * 5} />
        ))}
      </g>
      {children}
    </svg>
  );
}

/** Explains how to read the stave. Shown under the practice sheet and on results. */
export function NotationKey({ className, withPause }: { className?: string; withPause?: boolean }) {
  const gap = 5;
  return (
    <ul className={`notation-key ${className ?? ''}`} aria-label="How to read the stave">
      <li>
        <Glyph>
          <Note x={15} pitch={0} kind="ok" mid={17} gap={gap} />
        </Glyph>
        A keystroke on your own pace
      </li>
      <li>
        <Glyph width={36}>
          <Note x={10} pitch={3} kind="ok" mid={17} gap={gap} />
          <Note x={26} pitch={-3} kind="ok" mid={17} gap={gap} />
        </Glyph>
        Higher when quicker, lower when slower
      </li>
      <li>
        <Glyph>
          <Note x={15} pitch={0} kind="err" mid={17} gap={gap} />
        </Glyph>
        A mistake
      </li>
      <li>
        <Glyph>
          <Note x={15} pitch={0} kind="bar" mid={17} gap={gap} />
        </Glyph>
        A space between words
      </li>
      {withPause && (
        <li>
          <Glyph>
            <g className="st-fermata">
              <path d="M 9 10 A 6 6 0 0 1 21 10" />
              <circle cx={15} cy={8.4} r={1} />
            </g>
          </Glyph>
          A pause longer than a second
        </li>
      )}
    </ul>
  );
}
