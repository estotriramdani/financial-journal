'use client';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_KEY = 'finjrnl_theme';

export function getSavedTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  return (localStorage.getItem(THEME_KEY) as ThemeMode) || 'system';
}

export function applyTheme(mode: ThemeMode) {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;
  const isDark =
    mode === 'dark' ||
    (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  localStorage.setItem(THEME_KEY, mode);
  window.dispatchEvent(new CustomEvent('finjrnl:theme-changed', { detail: { mode, isDark } }));
}

export function initTheme() {
  if (typeof window === 'undefined') return;
  const saved = getSavedTheme();
  applyTheme(saved);

  // Listen to system changes if set to system
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getSavedTheme() === 'system') {
      applyTheme('system');
    }
  });
}
