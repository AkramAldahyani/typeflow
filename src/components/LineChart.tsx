import { useId, useMemo, useState } from 'react';
import { useElementWidth } from '../hooks/hooks';
import './chart.css';

export interface Point {
  x: number;
  y: number;
  /** Shown in the tooltip heading. */
  label: string;
}

interface Props {
  points: Point[];
  height?: number;
  unit: string;
  format?: (y: number) => string;
  xTicks?: { x: number; label: string }[];
  /** Fixed y domain; otherwise padded around the data. */
  domain?: [number, number];
  ariaLabel: string;
}

function niceTicks(lo: number, hi: number, count = 4) {
  const span = hi - lo || 1;
  const raw = span / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => span / s <= count) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}

/** Smooth path through points (Catmull–Rom converted to cubic Béziers). */
function smoothPath(pts: [number, number][]) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const t = 0.18;
    d += ` C ${p1[0] + (p2[0] - p0[0]) * t} ${p1[1] + (p2[1] - p0[1]) * t}, ${p2[0] - (p3[0] - p1[0]) * t} ${p2[1] - (p3[1] - p1[1]) * t}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

export function LineChart({ points, height = 220, unit, format = (y) => String(Math.round(y)), xTicks, domain, ariaLabel }: Props) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId().replace(/:/g, '');
  const pad = { l: 34, r: 12, t: 14, b: xTicks ? 28 : 10 };

  const geo = useMemo(() => {
    if (!points.length || width === 0) return null;
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs) || 1;
    let [y0, y1] = domain ?? [Math.min(...ys), Math.max(...ys)];
    if (!domain) {
      const padY = Math.max(2, (y1 - y0) * 0.18);
      y0 = Math.floor(y0 - padY);
      y1 = Math.ceil(y1 + padY);
    }
    const sx = (x: number) => pad.l + ((x - x0) / (x1 - x0 || 1)) * (width - pad.l - pad.r);
    const sy = (y: number) => pad.t + (1 - (y - y0) / (y1 - y0 || 1)) * (height - pad.t - pad.b);
    const pts = points.map((p) => [sx(p.x), sy(p.y)] as [number, number]);
    const line = smoothPath(pts);
    const area = `${line} L ${pts[pts.length - 1][0]} ${height - pad.b} L ${pts[0][0]} ${height - pad.b} Z`;
    return { sx, sy, pts, line, area, ticks: niceTicks(y0, y1) };
  }, [points, width, height, domain, pad.b, pad.l, pad.r, pad.t]);

  const onMove = (clientX: number, rect: DOMRect) => {
    if (!geo) return;
    const x = clientX - rect.left;
    let best = 0;
    geo.pts.forEach((p, i) => {
      if (Math.abs(p[0] - x) < Math.abs(geo.pts[best][0] - x)) best = i;
    });
    setHover(best);
  };

  const h = hover != null && geo ? geo.pts[hover] : null;

  return (
    <div ref={ref} className="chart">
      {geo && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={ariaLabel}
          onPointerMove={(e) => onMove(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={`fill-${gid}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--cobalt)" stopOpacity="0.16" />
              <stop offset="1" stopColor="var(--cobalt)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {geo.ticks.map((t) => (
            <g key={t} className="chart-grid">
              <line x1={pad.l} x2={width - pad.r} y1={geo.sy(t)} y2={geo.sy(t)} />
              <text x={pad.l - 8} y={geo.sy(t) + 4} textAnchor="end">
                {format(t)}
              </text>
            </g>
          ))}
          {xTicks?.map((t) => (
            <text key={t.x} className="chart-xtick" x={geo.sx(t.x)} y={height - 8} textAnchor="middle">
              {t.label}
            </text>
          ))}
          <path d={geo.area} fill={`url(#fill-${gid})`} />
          <path d={geo.line} className="chart-line" />
          {h && (
            <g className="chart-hover">
              <line x1={h[0]} x2={h[0]} y1={pad.t} y2={height - pad.b} />
              <circle cx={h[0]} cy={h[1]} r={4.5} />
            </g>
          )}
        </svg>
      )}
      {h && hover != null && (
        <div
          className="chart-tip"
          style={{ left: Math.min(Math.max(h[0], 70), width - 70), top: Math.max(0, h[1] - 64) }}
          role="status"
        >
          <span className="chart-tip-label">{points[hover].label}</span>
          <span className="chart-tip-value">
            {format(points[hover].y)} {unit}
          </span>
        </div>
      )}
    </div>
  );
}
