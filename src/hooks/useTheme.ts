import { useState, useEffect } from 'react'
import { getInitialTheme, applyTheme, toggleTheme, type Theme } from '@/utils/theme'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  // Apply theme on mount and when theme changes
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggle = () => {
    setTheme((current) => toggleTheme(current))
  }

  return {
    theme,
    setTheme,
    toggle,
    isDark: theme === 'dark',
  }
}
