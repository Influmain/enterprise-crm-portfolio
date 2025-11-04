'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthContext'
import { useToastHelpers } from '@/components/ui/Toast'
import LoginModal from '@/components/auth/LoginModal'
import { designSystem } from '@/lib/design-system'
import { ArrowLeft, BarChart3 } from 'lucide-react'

export default function LoginPage() {
  // 🔧 변수명 수정: profile -> userProfile
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()
  const toast = useToastHelpers()
  const [mounted, setMounted] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 🔧 단순화된 리다이렉트 로직 (Toast 중복 제거)
  useEffect(() => {
    if (user && userProfile && mounted && !redirecting) {
      console.log('로그인 상태 감지 - 리다이렉트 준비')
      setRedirecting(true)
      
      const dashboardPath = userProfile.role === 'admin' ? '/admin/dashboard' : '/counselor/dashboard'
      
      // 🔧 단순한 안내 메시지 (액션 버튼 제거)
      toast.info(
        '로그인 완료',
        `${userProfile.full_name || user.email}님, 대시보드로 이동합니다.`
      )
      
      // 🔧 즉시 리다이렉트 (지연 제거)
      router.push(dashboardPath)
    }
  }, [user, userProfile, mounted, redirecting, router, toast])

  // 🔧 LoginModal 성공 콜백 단순화
  const handleLoginSuccess = () => {
    console.log('로그인 성공 콜백 - AuthContext가 자동 처리')
    // AuthContext에서 모든 상태 업데이트 처리
    // 별도 리다이렉트나 Toast 불필요
  }

  const handleClose = () => {
    router.push('/')
  }

  // 로딩 중
  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">로그인 상태 확인 중...</p>
        </div>
      </div>
    )
  }

  // 🔧 리다이렉트 중 표시
  if (redirecting) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-success border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">대시보드로 이동 중...</p>
        </div>
      </div>
    )
  }

  // 이미 로그인된 경우 안내 화면
  if (user && userProfile) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-success/10 rounded-xl flex items-center justify-center mx-auto mb-6">
            <BarChart3 className="w-8 h-8 text-success" />
          </div>
          
          <h1 className={designSystem.components.typography.h3 + " mb-4"}>
            로그인 완료
          </h1>
          
          <p className="text-text-secondary mb-6">
            {userProfile.full_name || user.email}님으로 로그인되어 있습니다.
          </p>
          
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                const dashboardPath = userProfile.role === 'admin' ? '/admin/dashboard' : '/counselor/dashboard'
                router.push(dashboardPath)
              }}
              className={designSystem.components.button.primary}
            >
              대시보드로 이동
            </button>
            
            <button
              onClick={() => router.push('/')}
              className={designSystem.components.button.secondary}
            >
              홈페이지로 이동
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 로그인이 필요한 경우
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* 상단 네비게이션 */}
      <header className="flex items-center justify-between p-6">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">홈페이지로 돌아가기</span>
        </button>
        
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-medium text-text-primary">CRM System</div>
            <div className="text-xs text-text-secondary">로그인 페이지</div>
          </div>
        </div>
      </header>

      {/* 중앙 로그인 영역 */}
      <div className="flex items-center justify-center min-h-[calc(100vh-120px)] px-4">
        <div className="w-full max-w-md">
          {/* 페이지 제목 */}
          <div className="text-center mb-8">
            <h1 className={designSystem.components.typography.h2 + " mb-2"}>
              CRM 시스템 로그인
            </h1>
            <p className="text-text-secondary">
              계정에 로그인하여 리드 관리를 시작하세요
            </p>
          </div>

          {/* 🔧 LoginModal 단순화 */}
          <div className="relative">
            <LoginModal 
              isOpen={true} 
              onClose={handleClose}
              onSuccess={handleLoginSuccess}
            />
          </div>

          {/* 추가 안내 */}
          <div className="mt-8 text-center">
            <div className="p-4 bg-bg-secondary rounded-lg">
              <p className="text-sm text-text-secondary mb-2">
                URL 직접 접근
              </p>
              <p className="text-xs text-text-tertiary">
                이 페이지는 북마크하거나 직접 URL로 접근할 때 사용됩니다.
                <br />
                홈페이지에서는 모달 방식으로 더 편리하게 로그인할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 푸터 */}
      <footer className="text-center p-6 border-t border-border-primary">
        <p className="text-xs text-text-tertiary">
          2025 CRM Lead Management System
        </p>
      </footer>
    </div>
  )
}