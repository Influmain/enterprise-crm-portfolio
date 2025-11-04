'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import { useToastHelpers } from '@/components/ui/Toast'
import { designSystem } from '@/lib/design-system'
import { RefreshCw, X, LogIn, AtSign } from 'lucide-react'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const { signIn } = useAuth()
  const toast = useToastHelpers()
  
  const [userId, setUserId] = useState('')
  const [useCustomEmail, setUseCustomEmail] = useState(false)
  const [customEmail, setCustomEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // 최종 이메일 계산
  const getFinalEmail = () => {
    if (useCustomEmail) {
      return customEmail.trim()
    }
    return userId.trim() ? `${userId.trim()}@crm.com` : ''
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const finalEmail = getFinalEmail()
    
    if (!finalEmail || !password) {
      toast.warning('입력 오류', '이메일과 비밀번호를 모두 입력해주세요.')
      return
    }

    // 이메일 형식 검증
    if (useCustomEmail && !finalEmail.includes('@')) {
      toast.warning('이메일 형식 오류', '올바른 이메일 형식을 입력해주세요.')
      return
    }

    setLoading(true)
    
    try {
      const { error } = await signIn(finalEmail, password)

      if (error) {
        throw error
      }

      toast.success('로그인 성공', '환영합니다!')
      
      onClose()
      onSuccess?.()

    } catch (error) {
      console.error('로그인 실패:', error)
      
      let errorMessage = '로그인 중 오류가 발생했습니다.'
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.'
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = '이메일 인증이 필요합니다.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast.error(
        '로그인 실패',
        errorMessage,
        {
          action: { 
            label: '다시 시도', 
            onClick: () => {
              setPassword('')
              document.querySelector('input[type="password"]')?.focus()
            }
          }
        }
      )
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setUserId('')
      setCustomEmail('')
      setPassword('')
      setUseCustomEmail(false)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-primary border border-border-primary rounded-xl w-full max-w-md mx-auto shadow-2xl">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-border-primary">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
              <LogIn className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">로그인</h2>
              <p className="text-sm text-text-secondary">계정에 로그인하여 시작하세요</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-bg-hover text-text-secondary transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 로그인 폼 */}
        <div className="p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            {/* 이메일 입력 영역 */}
            <div>
              <label className="block text-sm font-medium mb-2 text-text-primary">
                이메일 주소
              </label>
              
              {useCustomEmail ? (
                // 직접 입력 모드
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
                  placeholder="이메일 주소 입력"
                  disabled={loading}
                  required
                />
              ) : (
                // crm.com 고정 모드
                <div className="flex items-center">
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="flex-1 px-4 py-3 border border-border-primary rounded-l-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
                    placeholder="사용자 ID"
                    disabled={loading}
                    required
                  />
                  <div className="px-4 py-3 bg-bg-secondary border-t border-r border-b border-border-primary rounded-r-lg text-text-secondary flex items-center gap-1">
                    <AtSign className="w-4 h-4" />
                    <span>crm.com</span>
                  </div>
                </div>
              )}

              {/* 입력 방식 전환 */}
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setUseCustomEmail(!useCustomEmail)}
                  disabled={loading}
                  className="text-xs text-accent hover:underline transition-colors"
                >
                  {useCustomEmail ? 'crm.com 도메인 사용' : '다른 이메일 사용'}
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-text-primary">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
                placeholder="비밀번호를 입력하세요"
                disabled={loading}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !getFinalEmail()}
              className={designSystem.utils.cn(
                "w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2",
                loading || !getFinalEmail()
                  ? "bg-bg-hover text-text-secondary cursor-not-allowed" 
                  : "bg-accent text-white hover:bg-accent/90 active:scale-[0.98]"
              )}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  로그인 중...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  로그인
                </>
              )}
            </button>
          </form>

          {/* 시스템 상태 */}
          <div className="mt-6 p-3 bg-bg-secondary rounded-lg">
            <div className="flex items-center justify-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
              <span className="text-text-secondary">시스템 정상 운영 중</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}