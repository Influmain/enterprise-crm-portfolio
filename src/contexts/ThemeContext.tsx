'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface ThemeContextType {
  isDark: boolean
  toggleTheme: () => void
  setTheme: (theme: 'light' | 'dark') => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  // 초기 테마 설정
  useEffect(() => {
    setMounted(true)
    
    // 저장된 테마 확인
    const savedTheme = localStorage.getItem('theme')
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && systemDark)
    
    setIsDark(shouldBeDark)
    applyTheme(shouldBeDark)
  }, [])

  // 테마 적용 함수
  const applyTheme = (dark: boolean) => {
    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // 테마 토글
  const toggleTheme = () => {
    const newTheme = !isDark
    setIsDark(newTheme)
    applyTheme(newTheme)
    localStorage.setItem('theme', newTheme ? 'dark' : 'light')
  }

  // 테마 직접 설정
  const setTheme = (theme: 'light' | 'dark') => {
    const dark = theme === 'dark'
    setIsDark(dark)
    applyTheme(dark)
    localStorage.setItem('theme', theme)
  }

  // 서버사이드 렌더링 중에는 빈 div 반환
  if (!mounted) {
    return <div suppressHydrationWarning>{children}</div>
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// 테마 훅
export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export default ThemeContext