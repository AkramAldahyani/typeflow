import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export type Route = '/' | '/practice' | '/progress' | '/about';
const ROUTES: Route[] = ['/', '/practice', '/progress', '/about'];

function parseHash(): { route: Route; query: URLSearchParams } {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  const route = (ROUTES as string[]).includes(path) ? (path as Route) : '/';
  return { route, query: new URLSearchParams(qs ?? '') };
}

export function useHashRoute() {
  const [state, setState] = useState(parseHash);
  useEffect(() => {
    const onChange = () => setState(parseHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return state;
}

export const navigate = (to: string) => {
  window.location.hash = to;
};

export type Theme = 'light' | 'dark';

export function useTheme() {
  const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const [theme, setTheme] = useState<Theme>(() => {
    const set = document.documentElement.dataset.theme;
    if (set === 'light' || set === 'dark') return set;
    return media?.matches ? 'dark' : 'light';
  });
  const toggle = useCallback(() => {
    setTheme((t) => {
      const next: Theme = t === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem('tf-theme', next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);
  return { theme, toggle };
}

/** Width of an element, kept in sync with ResizeObserver. */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Object state persisted to localStorage, merged over defaults so new fields survive old saves. */
export function usePersistentState<T extends object>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? { ...initial, ...JSON.parse(raw) } : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }, [key, value]);
  return [value, setValue] as const;
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return reduced;
}

/** Re-render once web fonts finish loading so text measurements are correct. */
export function useFontsReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    document.fonts?.ready.then(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, []);
  return ready;
}
