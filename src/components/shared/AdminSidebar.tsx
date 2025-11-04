'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/lib/auth/AuthContext'
import { designSystem } from '@/lib/design-system'
import { businessIcons } from '@/lib/design-system/icons'
import { 
  User, 
  LogOut, 
  ChevronRight,
  Sun,
  Moon,
  Shield,
  Edit
} from 'lucide-react'

interface AdminSidebarProps {
  className?: string
}

export default function AdminSidebar({ className }: AdminSidebarProps) {
  const { isDark, toggle: toggleTheme } = useTheme()
  const { user, userProfile, signOut } = useAuth()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  // 관리자 네비게이션 메뉴
  const navigationItems = [
    {
      href: '/admin/dashboard',
      label: '대시보드',
      icon: businessIcons.dashboard
    },
    {
      href: '/admin/upload',
      label: '데이터 업로드',
      icon: businessIcons.upload
    },
    {
      href: '/admin/leads',
      label: '리드 관리',
      icon: businessIcons.contact
    },
    {
      href: '/admin/counselors',
      label: '영업사원 관리',
      icon: businessIcons.team
    },
    {
      href: '/admin/assignments',
      label: '배정 관리',
      icon: businessIcons.assignment
    },
    {
      href: '/admin/consulting-monitor',
      label: '상담 모니터링',
      icon: businessIcons.analytics
    },
    {
      href: '/admin/settings',
      label: '시스템 설정',
      icon: businessIcons.settings
    }
  ]

  // 현재 경로가 활성 상태인지 확인
  const isActiveRoute = (href: string) => {
    return pathname === href || pathname?.startsWith(href + '/')
  }

  // 배지 컴포넌트 렌더링
  const renderBadge = (badge?: string, badgeType?: string) => {
    if (!badge) return null
    
    const badgeClass = badgeType === 'error' 
      ? designSystem.components.badge.error
      : badgeType === 'warning' 
      ? designSystem.components.badge.warning
      : badgeType === 'success'
      ? designSystem.components.badge.success
      : designSystem.components.badge.info
    
    return <span className={badgeClass}>{badge}</span>
  }

  // 사용자 이름 표시 로직
  const displayName = userProfile?.full_name || user?.email?.split('@')[0] || '관리자'
  const displayRole = userProfile?.role === 'admin' ? '시스템 관리자' : userProfile?.department || '관리자'

  // 로그아웃 핸들러
  const handleLogout = async () => {
    setIsProfileOpen(false)
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('로그아웃 오류:', error)
      router.push('/login')
    }
  }

  // 프로필 변경 모달 열기
  const handleProfileEdit = () => {
    setIsProfileOpen(false)
    setShowProfileModal(true)
  }

  return (
    <>
      <aside className={designSystem.utils.cn('w-72 bg-bg-secondary border-r border-border-primary flex-shrink-0 h-screen fixed left-0 top-0 flex flex-col', className)}>
        {/* 로고 섹션 */}
        <div className="p-6 border-b border-border-primary flex-shrink-0">
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center shadow-sm">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={designSystem.components.typography.h5}>
                관리자 시스템
              </h1>
              <p className={designSystem.components.typography.caption}>
                System Management
              </p>
            </div>
          </Link>
        </div>

        {/* 네비게이션 섹션 */}
        <nav className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-2">
            {navigationItems.map((item) => {
              const isActive = isActiveRoute(item.href)
              const IconComponent = item.icon
              
              return (
                <Link 
                  key={item.href}
                  href={item.href} 
                  className={designSystem.utils.cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                    isActive 
                      ? designSystem.colors.accent.default
                      : designSystem.utils.cn(designSystem.colors.text.secondary, 'hover:bg-bg-hover hover:text-text-primary')
                  )}
                >
                  <IconComponent className="w-5 h-5" />
                  <span className="flex-1">{item.label}</span>
                  {renderBadge(item.badge, item.badgeType)}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* 하단 프로필 & 설정 섹션 */}
        <div className="p-6 border-t border-border-primary space-y-3 flex-shrink-0">
          {/* 프로필 메뉴 */}
          <div className="relative">
            {/* 프로필 버튼 */}
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className={designSystem.utils.cn('flex items-center gap-3 px-3 py-3 rounded-lg transition-colors w-full', designSystem.colors.text.secondary, 'hover:bg-bg-hover', isProfileOpen && 'bg-bg-hover')}
            >
              <div className="w-10 h-10 bg-bg-tertiary rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className={designSystem.utils.cn('text-sm font-medium truncate', designSystem.colors.text.primary)}>
                  {displayName}
                </div>
                <div className={designSystem.utils.cn('text-xs', designSystem.colors.text.tertiary)}>
                  {displayRole}
                </div>
              </div>
              <ChevronRight 
                className={designSystem.utils.cn('w-4 h-4 flex-shrink-0 transition-transform', isProfileOpen && 'rotate-90')} 
              />
            </button>

            {/* 드롭다운 메뉴 */}
            {isProfileOpen && (
              <div className={designSystem.utils.cn('mt-2 py-2 space-y-1', designSystem.components.animation.slideUp)}>
                {/* 프로필 변경 */}
                <button 
                  onClick={handleProfileEdit}
                  className={designSystem.utils.cn('flex items-center gap-3 px-6 py-2 text-sm transition-colors w-full text-left', designSystem.colors.text.secondary, 'hover:bg-bg-hover hover:text-text-primary')}
                >
                  <Edit className="w-4 h-4" />
                  프로필 변경
                </button>

                {/* 테마 토글 */}
                <button
                  onClick={() => {
                    toggleTheme()
                    setIsProfileOpen(false)
                  }}
                  className={designSystem.utils.cn('flex items-center gap-3 px-6 py-2 text-sm transition-colors w-full text-left', designSystem.colors.text.secondary, 'hover:bg-bg-hover hover:text-text-primary')}
                >
                  {isDark ? (
                    <Sun className="w-4 h-4" />
                  ) : (
                    <Moon className="w-4 h-4" />
                  )}
                  {isDark ? '라이트 모드' : '다크 모드'}
                </button>

                {/* 구분선 */}
                <div className="mx-6 border-t border-border-primary my-2"></div>

                {/* 로그아웃 */}
                <button 
                  className={designSystem.utils.cn('flex items-center gap-3 px-6 py-2 text-sm transition-colors w-full text-left', designSystem.colors.status.error.text, 'hover:bg-bg-hover')}
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" />
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* 프로필 변경 모달 */}
      {showProfileModal && (
        <AdminProfileModal 
          user={user}
          userProfile={userProfile}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </>
  )
}

// 관리자 프로필 변경 모달 컴포넌트
interface AdminProfileModalProps {
  user: any
  userProfile: any
  onClose: () => void
}

function AdminProfileModal({ user, userProfile, onClose }: AdminProfileModalProps) {
  const [formData, setFormData] = useState({
    full_name: userProfile?.full_name || '',
    phone: userProfile?.phone || '',
    department: userProfile?.department || '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [loading, setLoading] = useState(false)
  const [showPasswordFields, setShowPasswordFields] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      if (!user || !user.id) {
        alert('로그인이 필요합니다.');
        return;
      }

      // 비밀번호 검증
      if (showPasswordFields) {
        if (!formData.current_password || !formData.new_password) {
          alert('현재 비밀번호와 새 비밀번호를 입력해주세요.')
          return
        }
        if (formData.new_password !== formData.confirm_password) {
          alert('새 비밀번호가 일치하지 않습니다.')
          return
        }
        if (formData.new_password.length < 6) {
          alert('비밀번호는 최소 6자리 이상이어야 합니다.')
          return
        }
      }

      const requestData: any = {
        user_id: user.id,
        full_name: formData.full_name,
        phone: formData.phone,
        department: formData.department
      }

      if (showPasswordFields && formData.new_password) {
        requestData.current_password = formData.current_password
        requestData.new_password = formData.new_password
      }

      const response = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error)

      alert('프로필이 성공적으로 업데이트되었습니다.')
      onClose()
      window.location.reload()

    } catch (error: any) {
      alert(error.message || '프로필 업데이트 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-bg-primary border border-border-primary rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4 text-text-primary">관리자 프로필 변경</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 이름 */}
          <div>
            <label className="block text-sm font-medium mb-2 text-text-primary">이름</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* 전화번호 */}
          <div>
            <label className="block text-sm font-medium mb-2 text-text-primary">전화번호</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="010-1234-5678"
            />
          </div>

          {/* 부서 */}
          <div>
            <label className="block text-sm font-medium mb-2 text-text-primary">부서</label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
              className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="IT팀"
            />
          </div>

          {/* 비밀번호 변경 토글 */}
          <div className="flex items-center justify-between pt-2">
            <label className="text-sm font-medium text-text-primary">비밀번호 변경</label>
            <button
              type="button"
              onClick={() => setShowPasswordFields(!showPasswordFields)}
              className="text-sm text-accent hover:text-accent/80 transition-colors"
            >
              {showPasswordFields ? '취소' : '변경하기'}
            </button>
          </div>

          {/* 비밀번호 필드들 */}
          {showPasswordFields && (
            <div className="space-y-3 pt-2 border-t border-border-primary">
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">현재 비밀번호</label>
                <input
                  type="password"
                  value={formData.current_password}
                  onChange={(e) => setFormData(prev => ({ ...prev, current_password: e.target.value }))}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">새 비밀번호</label>
                <input
                  type="password"
                  value={formData.new_password}
                  onChange={(e) => setFormData(prev => ({ ...prev, new_password: e.target.value }))}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  minLength={6}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">새 비밀번호 확인</label>
                <input
                  type="password"
                  value={formData.confirm_password}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirm_password: e.target.value }))}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
          )}

          {/* 버튼들 */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {loading ? '저장 중...' : '변경사항 저장'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm bg-bg-secondary text-text-primary rounded-lg hover:bg-bg-hover transition-colors"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}