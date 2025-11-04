'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface DemoSession {
  session_id: string
  session_name: string
  created_at: string
}

export default function DemoStartPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionName, setSessionName] = useState('')

  const createDemoSession = async () => {
    setLoading(true)
    setError(null)

    try {
      // 1. 새 데모 세션 생성
      const { data: sessionData, error: sessionError } = await supabase
        .rpc('create_demo_session', {
          p_session_name: sessionName || null,
          p_metadata: {}
        })

      if (sessionError) throw sessionError

      const session = sessionData[0] as DemoSession
      const sessionId = session.session_id

      // 2. 템플릿 데이터 복사
      const { error: initError } = await supabase
        .rpc('initialize_demo_session_data', {
          p_session_id: sessionId
        })

      if (initError) throw initError

      // 3. 세션 ID를 쿠키에 저장
      document.cookie = `demo_session_id=${sessionId}; path=/; max-age=${7 * 24 * 60 * 60}` // 7일

      // 4. 로그인 페이지로 리다이렉트
      router.push(`/login?session=${sessionId}`)
    } catch (err: any) {
      console.error('데모 세션 생성 실패:', err)
      setError(err.message || '세션 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent/10 via-bg-primary to-success/10 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-text-primary mb-4">
            Enterprise CRM 데모
          </h1>
          <p className="text-lg text-text-secondary">
            독립적인 데모 환경에서 CRM 시스템을 체험해보세요
          </p>
        </div>

        {/* 메인 카드 */}
        <div className="bg-bg-primary border border-border-primary rounded-xl shadow-xl p-8 mb-6">
          <div className="space-y-6">
            {/* 설명 */}
            <div className="bg-gradient-to-r from-accent/5 to-success/5 border border-accent/20 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-text-primary mb-3">
                데모 세션이란?
              </h2>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1">✓</span>
                  <span>각 업체별로 독립된 데모 환경이 생성됩니다</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-1">✓</span>
                  <span>다른 데모 사용자와 데이터가 섞이지 않습니다</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-info mt-1">✓</span>
                  <span>80개의 샘플 리드, 10명의 영업사원 데이터 제공</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-warning mt-1">✓</span>
                  <span>세션은 7일간 유효하며 자동으로 삭제됩니다</span>
                </li>
              </ul>
            </div>

            {/* 세션 이름 입력 */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                세션 이름 (선택사항)
              </label>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="예: 삼성전자 데모, LG전자 데모"
                className="w-full px-4 py-3 bg-bg-secondary border border-border-primary rounded-lg
                         text-text-primary placeholder-text-tertiary
                         focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
                         transition-all"
                disabled={loading}
              />
              <p className="mt-2 text-xs text-text-tertiary">
                입력하지 않으면 자동으로 세션 ID가 이름으로 사용됩니다
              </p>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-error/10 border border-error/30 rounded-lg p-4">
                <p className="text-sm text-error">{error}</p>
              </div>
            )}

            {/* 시작 버튼 */}
            <button
              onClick={createDemoSession}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-accent to-accent-dark
                       text-white font-semibold rounded-lg
                       hover:shadow-lg hover:scale-[1.02]
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                       transition-all duration-200
                       flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>데모 환경 생성 중...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>새 데모 시작하기</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 기능 소개 */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="text-accent text-2xl mb-2">📊</div>
            <h3 className="font-semibold text-text-primary mb-1">실시간 대시보드</h3>
            <p className="text-xs text-text-secondary">
              KPI, 차트, 실적 현황을 한눈에 확인
            </p>
          </div>
          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="text-success text-2xl mb-2">👥</div>
            <h3 className="font-semibold text-text-primary mb-1">고객 관리</h3>
            <p className="text-xs text-text-secondary">
              리드 배정, 14단계 등급, 상담 기록
            </p>
          </div>
          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="text-info text-2xl mb-2">🔒</div>
            <h3 className="font-semibold text-text-primary mb-1">권한 관리</h3>
            <p className="text-xs text-text-secondary">
              부서별/역할별 접근 제어 시스템
            </p>
          </div>
        </div>

        {/* 푸터 */}
        <div className="text-center mt-8 text-sm text-text-tertiary">
          <p>이미 세션 ID가 있으신가요?</p>
          <button
            onClick={() => router.push('/login')}
            className="text-accent hover:underline mt-1"
          >
            로그인 페이지로 이동
          </button>
        </div>
      </div>
    </div>
  )
}
