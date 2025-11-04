'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import AdminLayout from '@/components/layout/AdminLayout'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useToastHelpers } from '@/components/ui/Toast'
import { RefreshCw, Trash2, Calendar, Clock, Database } from 'lucide-react'

interface DemoSession {
  id: string
  name: string
  created_at: string
  last_accessed_at: string
  expires_at: string
  time_remaining: string
  is_active: boolean
  metadata: any
}

function DemoSessionsPageContent() {
  const toast = useToastHelpers()
  const [sessions, setSessions] = useState<DemoSession[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('active_demo_sessions')
        .select('*')
        .order('last_accessed_at', { ascending: false })

      if (error) throw error

      setSessions(data || [])
    } catch (error: any) {
      console.error('세션 조회 실패:', error)
      toast.error('세션 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const deleteSession = async (sessionId: string) => {
    if (!confirm(`세션 ${sessionId}를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return
    }

    setDeleting(sessionId)
    try {
      const { error } = await supabase.rpc('delete_demo_session', {
        p_session_id: sessionId
      })

      if (error) throw error

      toast.success('세션이 삭제되었습니다.')
      fetchSessions()
    } catch (error: any) {
      console.error('세션 삭제 실패:', error)
      toast.error('세션 삭제에 실패했습니다.')
    } finally {
      setDeleting(null)
    }
  }

  const cleanupExpiredSessions = async () => {
    if (!confirm('만료된 모든 세션을 정리하시겠습니까?')) {
      return
    }

    try {
      const { data, error } = await supabase.rpc('cleanup_expired_demo_sessions')

      if (error) throw error

      const result = data as any
      toast.success(`${result.deleted_sessions_count}개의 세션이 정리되었습니다.`)
      fetchSessions()
    } catch (error: any) {
      console.error('세션 정리 실패:', error)
      toast.error('세션 정리에 실패했습니다.')
    }
  }

  const formatTimeRemaining = (timeRemaining: string) => {
    // PostgreSQL interval 형식 파싱 (예: "6 days 23:59:59")
    const match = timeRemaining.match(/(\d+) days?/)
    if (match) {
      return `${match[1]}일 남음`
    }
    return timeRemaining
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  return (
    <AdminLayout>
      <div className="p-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">데모 세션 관리</h1>
            <p className="text-sm text-text-secondary mt-1">
              활성 데모 세션을 모니터링하고 관리합니다
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={cleanupExpiredSessions}
              className="px-4 py-2 bg-warning/10 border border-warning/30 text-warning rounded-lg
                       hover:bg-warning/20 transition-colors flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              만료 세션 정리
            </button>

            <button
              onClick={fetchSessions}
              disabled={loading}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark
                       transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </button>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 rounded-lg p-4">
            <div className="text-sm text-text-secondary mb-1">전체 세션</div>
            <div className="text-3xl font-bold text-accent">{sessions.length}</div>
          </div>
          <div className="bg-gradient-to-br from-success/10 to-success/5 border border-success/20 rounded-lg p-4">
            <div className="text-sm text-text-secondary mb-1">활성 세션</div>
            <div className="text-3xl font-bold text-success">
              {sessions.filter(s => s.is_active).length}
            </div>
          </div>
          <div className="bg-gradient-to-br from-info/10 to-info/5 border border-info/20 rounded-lg p-4">
            <div className="text-sm text-text-secondary mb-1">템플릿 세션</div>
            <div className="text-3xl font-bold text-info">
              {sessions.filter(s => s.id === 'TEMPLATE').length}
            </div>
          </div>
        </div>

        {/* 세션 테이블 */}
        <div className="bg-bg-primary border border-border-primary rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-bg-secondary border-b border-border-primary">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                  세션 ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                  세션 이름
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                  생성일
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                  마지막 접근
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                  만료일
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">
                  상태
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-primary">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-text-secondary">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    로딩 중...
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-text-secondary">
                    활성 세션이 없습니다.
                  </td>
                </tr>
              ) : (
                sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-bg-secondary transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-text-primary">
                          {session.id}
                        </span>
                        {session.id === 'TEMPLATE' && (
                          <span className="px-2 py-0.5 bg-warning/10 text-warning text-xs rounded">
                            템플릿
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary">
                      {session.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(session.created_at).toLocaleDateString('ko-KR')}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(session.last_accessed_at).toLocaleString('ko-KR')}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      <div>
                        <div>{new Date(session.expires_at).toLocaleDateString('ko-KR')}</div>
                        <div className="text-xs text-text-tertiary">
                          {formatTimeRemaining(session.time_remaining)}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          session.is_active
                            ? 'bg-success/10 text-success'
                            : 'bg-error/10 text-error'
                        }`}
                      >
                        {session.is_active ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {session.id !== 'TEMPLATE' && (
                        <button
                          onClick={() => deleteSession(session.id)}
                          disabled={deleting === session.id}
                          className="px-3 py-1.5 bg-error/10 border border-error/30 text-error rounded
                                   hover:bg-error/20 transition-colors text-sm
                                   disabled:opacity-50 disabled:cursor-not-allowed
                                   flex items-center gap-1 ml-auto"
                        >
                          <Trash2 className="w-3 h-3" />
                          {deleting === session.id ? '삭제 중...' : '삭제'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 도움말 */}
        <div className="mt-6 bg-info/5 border border-info/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-info mb-2">세션 관리 안내</h3>
          <ul className="text-xs text-text-secondary space-y-1">
            <li>• 세션은 생성 후 7일간 유효합니다</li>
            <li>• TEMPLATE 세션은 삭제할 수 없습니다 (모든 새 세션의 기준 데이터)</li>
            <li>• 만료된 세션은 "만료 세션 정리" 버튼으로 일괄 삭제할 수 있습니다</li>
            <li>• 세션을 삭제하면 해당 세션의 모든 데이터(리드, 상담 기록 등)가 함께 삭제됩니다</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  )
}

export default function DemoSessionsPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <DemoSessionsPageContent />
    </ProtectedRoute>
  )
}
