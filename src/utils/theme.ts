export type Theme = 'light' | 'dark'

const THEME_KEY = 'app-theme'

/**
 * Get the current theme from localStorage or system preference
 */
export function getInitialTheme(): Theme {
  // Check localStorage first
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark') {
    return stored
  }

  // Fall back to system preference
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }

  return 'light'
}

/**
 * Apply theme to the document
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement

  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }

  // Save to localStorage
  localStorage.setItem(THEME_KEY, theme)
}

/**
 * Toggle between light and dark theme
 */
export function toggleTheme(currentTheme: Theme): Theme {
  const newTheme = currentTheme === 'light' ? 'dark' : 'light'
  applyTheme(newTheme)
  return newTheme
}
