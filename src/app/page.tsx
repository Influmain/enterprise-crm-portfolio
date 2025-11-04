'use client'

import Link from 'next/link'
import { useTheme } from '@/hooks/useTheme'
import { designSystem } from '@/lib/design-system'
import { useAuth } from '@/lib/auth/AuthContext'
import { useToastHelpers } from '@/components/ui/Toast'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import LoginModal from '@/components/auth/LoginModal'
import { LogIn, Sun, Moon, BarChart3, Shield } from 'lucide-react'

export default function HomePage() {
  const { isDark, toggle: toggleTheme } = useTheme()
  const { user, userProfile, loading, signOut } = useAuth()
  const toast = useToastHelpers()
  const router = useRouter()
  
  const [mounted, setMounted] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    const handleCacheManagement = () => {
      const CACHE_VERSION = 'crm-v1.2.0'
      const storedVersion = localStorage.getItem('crm_cache_version')
      
      if (storedVersion !== CACHE_VERSION) {
        console.log('캐시 버전 업데이트:', storedVersion, '→', CACHE_VERSION)
        try {
          localStorage.clear()
          sessionStorage.clear()
          localStorage.setItem('crm_cache_version', CACHE_VERSION)
        } catch (error) {
          console.warn('캐시 정리 중 오류:', error)
        }
      }
    }

    handleCacheManagement()
  }, [])

  useEffect(() => {
    if (!loading && user && userProfile && !redirecting && mounted) {
      const dashboardPath = userProfile.role === 'admin' ? '/admin/dashboard' : '/counselor/dashboard'
      console.log('홈페이지 자동 리다이렉트:', userProfile.role, '→', dashboardPath)
      
      setRedirecting(true)
      
      setTimeout(() => {
        router.push(dashboardPath)
      }, 500)
    }
  }, [loading, user, userProfile, redirecting, router, mounted])

  const handleLoginSuccess = () => {
    console.log('로그인 성공 - AuthContext가 자동 처리')
  }

  const handleAutoSignOut = async () => {
    console.log('프로필 오류로 인한 자동 로그아웃 실행')
    await signOut()
    toast.info('세션 재설정', '프로필 문제로 인해 로그아웃되었습니다. 다시 로그인해주세요.')
    router.push('/login')
  }

  const activeProfile = userProfile

  const isLoading = !mounted || loading
  const isRedirecting = user && userProfile && redirecting
  const hasProfileError = user && !userProfile && !loading && mounted
  const isLoggedIn = user && activeProfile

  // 로딩 상태
  if (isLoading || isRedirecting) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">
            {isLoading ? 'CRM 시스템 로딩 중...' : '대시보드로 이동 중...'}
          </p>
          {isRedirecting && (
            <p className="text-text-tertiary text-sm mt-2">
              {userProfile.role === 'admin' ? '관리자' : '영업사원'} 계정으로 로그인됨
            </p>
          )}
        </div>
      </div>
    )
  }

  // 프로필 오류 상태
  if (hasProfileError) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-warning" />
          </div>
          
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            프로필 로드 중 문제 발생
          </h2>
          
          <p className="text-text-secondary mb-6 leading-relaxed">
            사용자 프로필 정보를 불러올 수 없습니다.
            다시 로그인하시거나 잠시 후 시도해주세요.
          </p>
          
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push('/login')}
              className="px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
            >
              로그인 페이지로 이동
            </button>
            
            <button
              onClick={handleAutoSignOut}
              className="px-6 py-3 border border-border-primary text-text-primary rounded-lg hover:bg-bg-hover transition-colors"
            >
              세션 재설정
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 메인 페이지 렌더링
  return (
    <div className={designSystem.components.layout.page}>
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md mx-auto p-8">
          {/* 로고 및 제목 */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <BarChart3 className="w-10 h-10 text-white" />
            </div>
            <h1 className={designSystem.components.typography.h2}>
              CRM 관리 시스템
            </h1>
            <p className="text-text-secondary mt-2">
              리드 관리 및 상담 업무 솔루션
            </p>
          </div>

          {/* 로그인 상태에 따른 컨텐츠 */}
          {isLoggedIn ? (
            <div className="bg-bg-primary border border-border-primary rounded-xl p-6 text-center">
              <div className="mb-4">
                <p className="text-text-primary font-medium">
                  {activeProfile.full_name || user.email}
                </p>
                <p className="text-text-secondary text-sm">
                  {activeProfile.role === 'admin' ? '관리자' : '영업사원'} 계정
                </p>
              </div>
              
              <button
                onClick={() => {
                  const dashboardPath = activeProfile.role === 'admin' ? '/admin/dashboard' : '/counselor/dashboard'
                  router.push(dashboardPath)
                }}
                className={designSystem.utils.cn(
                  designSystem.components.button.primary,
                  'w-full mb-3'
                )}
              >
                대시보드로 이동
                <BarChart3 className="w-4 h-4 ml-2" />
              </button>
              
              <button
                onClick={signOut}
                className={designSystem.utils.cn(
                  designSystem.components.button.secondary,
                  'w-full text-sm'
                )}
              >
                로그아웃
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 로그인 버튼 */}
              <button
                onClick={() => setShowLoginModal(true)}
                className={designSystem.utils.cn(
                  designSystem.components.button.primary,
                  'w-full py-4 text-lg shadow-lg hover:shadow-xl transition-all'
                )}
              >
                <LogIn className="w-5 h-5 mr-2" />
                시스템 로그인
              </button>

              {/* 데모 시작 버튼 */}
              <Link
                href="/demo/start"
                className={designSystem.utils.cn(
                  'w-full py-4 text-lg flex items-center justify-center rounded-lg',
                  'bg-gradient-to-r from-success to-success-dark text-white',
                  'shadow-md hover:shadow-lg transition-all',
                  'hover:scale-[1.02]'
                )}
              >
                <BarChart3 className="w-5 h-5 mr-2" />
                데모 체험하기
              </Link>

              {/* 시스템 상태 */}
              <div className="bg-bg-secondary rounded-lg p-4">
                <div className="flex items-center justify-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
                  <span className="text-text-secondary">서비스 정상 운영 중</span>
                </div>
              </div>
            </div>
          )}

          {/* 테마 토글 */}
          <div className="flex justify-center mt-8">
            <button
              onClick={toggleTheme}
              className={designSystem.utils.cn(
                'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
                'bg-bg-secondary hover:bg-bg-hover text-text-secondary'
              )}
              title={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
            >
              {isDark ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* 푸터 */}
        <footer className="absolute bottom-0 left-0 right-0 p-6 text-center">
          <p className="text-text-tertiary text-sm">
            CRM Lead Management System
          </p>
        </footer>
      </main>

      {/* 로그인 모달 */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  )
}