'use client'

import { useState, useEffect } from 'react'

export type ThemeMode = 'light' | 'dark'

interface UseThemeReturn {
  theme: ThemeMode
  isDark: boolean
  isLight: boolean
  toggle: () => void
  setTheme: (theme: ThemeMode) => void
  systemTheme: ThemeMode
}

export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<ThemeMode>('light')
  const [systemTheme, setSystemTheme] = useState<ThemeMode>('light')
  const [mounted, setMounted] = useState(false)

  // 시스템 테마 감지
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }

    setSystemTheme(mediaQuery.matches ? 'dark' : 'light')
    mediaQuery.addEventListener('change', handleSystemThemeChange)

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
    }
  }, [])

  // 초기 테마 설정
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as ThemeMode | null
    const initialTheme = savedTheme || systemTheme

    setThemeState(initialTheme)
    applyTheme(initialTheme)
    setMounted(true)
  }, [systemTheme])

  // 테마 적용 함수
  const applyTheme = (newTheme: ThemeMode) => {
    const root = document.documentElement
    
    if (newTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }

  // 테마 변경 함수
  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme)
    applyTheme(newTheme)
    localStorage.setItem('theme', newTheme)
  }

  // 테마 토글 함수
  const toggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
  }

  // 서버사이드 렌더링 중에는 기본값 반환
  if (!mounted) {
    return {
      theme: 'light',
      isDark: false,
      isLight: true,
      toggle: () => {},
      setTheme: () => {},
      systemTheme: 'light'
    }
  }

  return {
    theme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    toggle,
    setTheme,
    systemTheme
  }
}

// 편의 함수들
export const themeUtils = {
  // 현재 테마 확인
  getCurrentTheme: (): ThemeMode => {
    if (typeof window === 'undefined') return 'light'
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  },

  // 시스템 테마 확인
  getSystemTheme: (): ThemeMode => {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  },

  // 저장된 테마 확인
  getSavedTheme: (): ThemeMode | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('theme') as ThemeMode | null
  },

  // 테마 직접 적용
  applyTheme: (theme: ThemeMode) => {
    if (typeof window === 'undefined') return
    
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }
}

export default useTheme