import { useEffect, useState } from 'react';
import { Icon, Logo } from './ui';
import type { Route, Theme } from '../hooks/hooks';

const LINKS: { to: Route; label: string }[] = [
  { to: '/practice', label: 'Practice' },
  { to: '/progress', label: 'Progress' },
  { to: '/about', label: 'About' },
];

export function Header({ route, theme, onToggleTheme }: { route: Route; theme: Theme; onToggleTheme: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}>
      <div className="wrap header-row">
        <Logo />
        <nav className="nav" aria-label="Main">
          {LINKS.map((l) => (
            <a key={l.to} href={`#${l.to}`} className="nav-link" aria-current={route === l.to ? 'page' : undefined}>
              {l.label}
            </a>
          ))}
          <button
            type="button"
            className="icon-btn"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to day theme' : 'Switch to night theme'}
            title={theme === 'dark' ? 'Day theme' : 'Night theme'}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-row">
        <Logo />
        <p className="footer-note">A practice instrument for typists. Your sessions are saved in this browser and nowhere else.</p>
        <nav className="footer-links" aria-label="Footer">
          <a href="#/practice">Practice</a>
          <a href="#/progress">Progress</a>
          <a href="#/about">About</a>
        </nav>
      </div>
    </footer>
  );
}
