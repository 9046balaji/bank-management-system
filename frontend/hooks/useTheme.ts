/**
 * Theme Hook
 * Manages dark/light mode theme with system preference detection
 */

import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'aura_theme_preference';

export interface UseThemeReturn {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  isDark: boolean;
  isLight: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

/**
 * Get the system's preferred color scheme
 */
function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Get the stored theme preference
 */
function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      return stored;
    }
  } catch {
    // localStorage might not be available
  }
  
  return 'system';
}

/**
 * Resolve the actual theme based on preference
 */
function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}

/**
 * Apply theme to document
 */
function applyTheme(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  
  const root = document.documentElement;
  
  if (theme === 'dark') {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }
  
  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute(
      'content',
      theme === 'dark' ? '#1f2937' : '#ffffff'
    );
  }
}

/**
 * useTheme Hook
 * 
 * @example
 * const { theme, resolvedTheme, isDark, setTheme, toggleTheme } = useTheme();
 * 
 * // Toggle between light/dark
 * <button onClick={toggleTheme}>Toggle Theme</button>
 * 
 * // Set specific theme
 * <select value={theme} onChange={(e) => setTheme(e.target.value)}>
 *   <option value="light">Light</option>
 *   <option value="dark">Dark</option>
 *   <option value="system">System</option>
 * </select>
 */
export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => 
    resolveTheme(getStoredTheme())
  );

  // Apply theme changes
  useEffect(() => {
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);
    applyTheme(resolved);
    
    // Store preference
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // localStorage might not be available
    }
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light';
      setResolvedTheme(newTheme);
      applyTheme(newTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Set theme handler
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      // If system, switch to the opposite of current resolved
      if (current === 'system') {
        return resolvedTheme === 'dark' ? 'light' : 'dark';
      }
      // Otherwise toggle between light and dark
      return current === 'dark' ? 'light' : 'dark';
    });
  }, [resolvedTheme]);

  return {
    theme,
    resolvedTheme,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
    setTheme,
    toggleTheme,
  };
}

/**
 * Theme Context for global theme access
 * Use this if you need theme state in class components or outside React
 */
export interface ThemeContextValue extends UseThemeReturn {}

// Initialize theme on module load (prevents flash of wrong theme)
if (typeof window !== 'undefined') {
  const initialTheme = resolveTheme(getStoredTheme());
  applyTheme(initialTheme);
}

export default useTheme;
