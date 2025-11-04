'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface DemoSessionContextType {
  sessionId: string | null
  isLoading: boolean
  updateSessionAccess: () => Promise<void>
  clearSession: () => void
}

const DemoSessionContext = createContext<DemoSessionContextType | undefined>(undefined)

export function DemoSessionProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // 1. URL 파라미터에서 세션 ID 확인
    const urlSessionId = searchParams.get('session')

    if (urlSessionId) {
      // URL에서 온 세션 ID를 쿠키에 저장
      document.cookie = `demo_session_id=${urlSessionId}; path=/; max-age=${7 * 24 * 60 * 60}`
      setSessionId(urlSessionId)
      setIsLoading(false)
      return
    }

    // 2. 쿠키에서 세션 ID 확인
    const cookies = document.cookie.split(';')
    const sessionCookie = cookies.find(c => c.trim().startsWith('demo_session_id='))

    if (sessionCookie) {
      const cookieSessionId = sessionCookie.split('=')[1]
      setSessionId(cookieSessionId)
      setIsLoading(false)
      return
    }

    // 3. 세션 ID가 없으면 데모 시작 페이지로 리다이렉트
    // (단, 이미 /demo/start 페이지에 있거나 로그인 페이지가 아니면 건너뜀)
    const currentPath = window.location.pathname
    if (currentPath !== '/demo/start' && currentPath !== '/login') {
      // 일반 사용자는 세션 없이도 사용 가능 (기존 동작 유지)
      setSessionId('TEMPLATE') // 기본 템플릿 세션 사용
    }

    setIsLoading(false)
  }, [searchParams, router])

  // 세션 마지막 접근 시간 업데이트
  const updateSessionAccess = async () => {
    if (!sessionId || sessionId === 'TEMPLATE') return

    try {
      await supabase.rpc('update_demo_session_access', {
        p_session_id: sessionId
      })
    } catch (error) {
      console.error('세션 접근 시간 업데이트 실패:', error)
    }
  }

  // 세션 클리어
  const clearSession = () => {
    document.cookie = 'demo_session_id=; path=/; max-age=0'
    setSessionId(null)
    router.push('/demo/start')
  }

  // 5분마다 세션 접근 시간 업데이트
  useEffect(() => {
    if (!sessionId || sessionId === 'TEMPLATE') return

    const interval = setInterval(() => {
      updateSessionAccess()
    }, 5 * 60 * 1000) // 5분

    // 초기 업데이트
    updateSessionAccess()

    return () => clearInterval(interval)
  }, [sessionId])

  return (
    <DemoSessionContext.Provider value={{ sessionId, isLoading, updateSessionAccess, clearSession }}>
      {children}
    </DemoSessionContext.Provider>
  )
}

export function useDemoSession() {
  const context = useContext(DemoSessionContext)
  if (context === undefined) {
    throw new Error('useDemoSession must be used within a DemoSessionProvider')
  }
  return context
}
