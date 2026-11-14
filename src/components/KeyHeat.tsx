const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

/** Keyboard map shaded by how often each key was missed. */
export function KeyHeat({ missed }: { missed: Record<string, number> }) {
  const max = Math.max(1, ...Object.values(missed));
  const cell = (k: string, label = k) => {
    const n = missed[k] ?? 0;
    const level = n / max;
    return (
      <li
        key={k}
        className={`kh-key${k === ' ' ? ' kh-space' : ''}${level > 0.55 ? ' is-hot' : ''}`}
        style={{ ['--heat' as string]: `${Math.round(level * 100)}%` }}
        title={`${k === ' ' ? 'Space' : k.toUpperCase()}: ${n} ${n === 1 ? 'miss' : 'misses'}`}
      >
        <span aria-hidden>{label}</span>
        <span className="sr-only">
          {k === ' ' ? 'Space' : k}: {n} misses
        </span>
      </li>
    );
  };
  return (
    <div className="key-heat">
      {ROWS.map((row, i) => (
        <ul key={row} className="kh-row" style={{ paddingLeft: `${i * 4.2}%` }}>
          {[...row].map((k) => cell(k))}
        </ul>
      ))}
      <ul className="kh-row" style={{ paddingLeft: '18%', paddingRight: '18%' }}>
        {cell(' ', 'space')}
      </ul>
    </div>
  );
}
