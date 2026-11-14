import { useEffect } from 'react';
import { Footer, Header } from './components/Header';
import { useHashRoute, useTheme } from './hooks/hooks';
import { Home } from './pages/Home';
import { Practice } from './pages/Practice';
import { Progress } from './pages/Progress';

const TITLES: Record<string, string> = {
  '/': 'TypeFlow',
  '/about': 'About TypeFlow',
  '/practice': 'Practice | TypeFlow',
  '/progress': 'Progress | TypeFlow',
};

export function App() {
  const { route, query } = useHashRoute();
  const { theme, toggle } = useTheme();

  useEffect(() => {
    document.title = TITLES[route];
    if (route === '/about') {
      requestAnimationFrame(() => document.getElementById('about')?.scrollIntoView({ block: 'start' }));
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [route]);

  const pageKey = route === '/about' ? '/' : route;

  return (
    <>
      <a href="#main" className="skip-link" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>
        Skip to content
      </a>
      <Header route={route} theme={theme} onToggleTheme={toggle} />
      <main id="main" tabIndex={-1} style={{ outline: 'none' }}>
        <div key={pageKey} className="page">
          {pageKey === '/' && <Home />}
          {pageKey === '/practice' && <Practice query={query} />}
          {pageKey === '/progress' && <Progress />}
        </div>
      </main>
      <Footer />
    </>
  );
}
