import { useState, useEffect } from 'react'

const THEME_KEY = 'albion_theme'

export function useDarkMode() {
  const [darkMode, setDarkMode] = useState(() => {
    // Tenta carregar do localStorage
    const saved = localStorage.getItem(THEME_KEY)
    if (saved !== null) {
      return saved === 'dark'
    }
    // Fallback para preferência do sistema
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    // Aplica classe no document
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    // Salva preferência
    localStorage.setItem(THEME_KEY, darkMode ? 'dark' : 'light')
  }, [darkMode])

  const toggleDarkMode = () => setDarkMode(prev => !prev)

  return { darkMode, toggleDarkMode }
}
