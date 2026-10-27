'use client';

import { useEffect } from 'react';
import { initTheme } from '@/utils/theme';

export function ThemeInitializer() {
  useEffect(() => {
    initTheme();
  }, []);

  return null;
}
