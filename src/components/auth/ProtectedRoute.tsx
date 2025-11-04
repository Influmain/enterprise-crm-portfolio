'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { PermissionType } from '@/lib/services/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'counselor';        // 기존 role 기반 권한
  requiredPermission?: PermissionType;          // 새로 추가: 세부 권한
  redirectTo?: string;                          // 리다이렉트할 경로
  allowSuperAdmin?: boolean;                    // 최고관리자 자동 허용 (기본: true)
}

export default function ProtectedRoute({ 
  children, 
  requiredRole,
  requiredPermission,
  redirectTo = '/login',
  allowSuperAdmin = true
}: ProtectedRouteProps) {
  const { user, userProfile, permissions, loading, permissionsLoading, hasPermission } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 로딩이 끝난 후에만 권한 검사
    if (!loading && !permissionsLoading) {
      console.log('ProtectedRoute 권한 검사:', { 
        user: user?.email, 
        profile: userProfile?.full_name, 
        role: userProfile?.role,
        is_super_admin: userProfile?.is_super_admin,
        permissions: permissions,
        requiredRole,
        requiredPermission
      });

      // 1. 로그인하지 않은 경우
      if (!user) {
        console.log('❌ 로그인 필요 → /login으로 리다이렉트');
        router.push(redirectTo);
        return;
      }

      // 2. 프로필이 없는 경우
      if (!userProfile) {
        console.log('❌ 프로필 없음 → /login으로 리다이렉트');
        router.push('/login');
        return;
      }

      // 3. 비활성 사용자
      if (!userProfile.is_active) {
        console.log('❌ 비활성 사용자 → /unauthorized로 리다이렉트');
        router.push('/unauthorized');
        return;
      }

      // 4. 최고관리자 자동 허용 (allowSuperAdmin이 true인 경우)
      if (allowSuperAdmin && userProfile.is_super_admin) {
        console.log('✅ 최고관리자 - 자동 허용');
        return;
      }

      // 5. 세부 권한 확인 (우선순위: requiredPermission > requiredRole)
      if (requiredPermission) {
        const hasRequiredPermission = hasPermission(requiredPermission);
        
        if (!hasRequiredPermission) {
          console.log(`❌ 권한 부족 (필요: ${requiredPermission}) → /unauthorized로 리다이렉트`);
          router.push('/unauthorized');
          return;
        }
        
        console.log(`✅ 권한 확인 완료: ${requiredPermission}`);
        return;
      }

      // 6. Role 기반 권한 확인 (하위 호환성)
      if (requiredRole) {
        if (userProfile.role !== requiredRole) {
          console.log(`❌ Role 권한 부족 (필요: ${requiredRole}, 현재: ${userProfile.role}) → /unauthorized로 리다이렉트`);
          router.push('/unauthorized');
          return;
        }
        
        console.log(`✅ Role 권한 확인 완료: ${requiredRole}`);
        return;
      }

      // 7. 권한 요구사항이 없는 경우 - 로그인만 확인
      console.log('✅ 로그인 사용자 - 접근 허용');
    }
  }, [user, userProfile, permissions, loading, permissionsLoading, router, requiredRole, requiredPermission, redirectTo, allowSuperAdmin, hasPermission]);

  // 로딩 중 화면
  if (loading || permissionsLoading) {
    return (
      <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-text-secondary">
            {loading ? '인증 확인 중...' : '권한 확인 중...'}
          </p>
        </div>
      </div>
    );
  }

  // 인증되지 않은 경우 (리다이렉트 처리 중)
  if (!user || !userProfile || !userProfile.is_active) {
    return (
      <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-secondary">페이지 이동 중...</p>
        </div>
      </div>
    );
  }

  // 권한 검사 중 (리다이렉트 처리 중)
  const hasRequiredAccess = (() => {
    // 최고관리자 자동 허용
    if (allowSuperAdmin && userProfile.is_super_admin) return true;
    
    // 세부 권한 확인
    if (requiredPermission) return hasPermission(requiredPermission);
    
    // Role 기반 권한 확인
    if (requiredRole) return userProfile.role === requiredRole;
    
    // 권한 요구사항 없음
    return true;
  })();

  if (!hasRequiredAccess) {
    return (
      <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-secondary">권한을 확인하는 중...</p>
        </div>
      </div>
    );
  }

  // 모든 검사를 통과한 경우 실제 컨텐츠 표시
  return <>{children}</>;
}

// 권한 없음 페이지 컴포넌트 - 권한 정보 개선
export function UnauthorizedPage() {
  const { userProfile, permissions, signOut, isSuperAdmin } = useAuth();
  const router = useRouter();
  
  // 다른 계정으로 로그인 처리
  const handleSwitchAccount = async () => {
    try {
      console.log('다른 계정 로그인 시작');
      
      // 로그아웃 실행
      await signOut();
      console.log('로그아웃 완료 - 로그인 페이지로 이동');
      
      // 로그인 페이지로 리다이렉트
      router.push('/login');
      
    } catch (error) {
      console.error('계정 전환 실패:', error);
      // 오류가 있어도 강제로 로그인 페이지로 이동
      router.push('/login');
    }
  };
  
  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'admin':
        return isSuperAdmin ? '최고관리자' : '일반관리자';
      case 'counselor':
        return '영업사원';
      default:
        return '알 수 없음';
    }
  };
  
  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
      <div className="max-w-md w-full bg-bg-primary border border-border-primary rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">접근 권한이 없습니다</h1>
        <p className="text-text-secondary mb-6">
          현재 계정으로는 이 페이지에 접근할 수 있는 권한이 없습니다.
        </p>
        
        <div className="space-y-3">
         <button
  onClick={() => router.push('/admin/dashboard')}
  className="w-full px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
>
  대시보드로 돌아가기
</button>
          
          <button
            onClick={handleSwitchAccount}
            className="w-full px-4 py-2 bg-bg-secondary border border-border-primary text-text-primary rounded-lg hover:bg-bg-hover transition-colors"
          >
            다른 계정으로 로그인
          </button>
        </div>
        
        <div className="mt-6 p-3 bg-bg-secondary rounded-lg space-y-2">
          <p className="text-xs text-text-tertiary font-medium">현재 계정 정보</p>
          <div className="text-xs text-text-secondary space-y-1">
            <div>이름: {userProfile?.full_name || '알 수 없음'}</div>
            <div>역할: {getRoleLabel(userProfile?.role)}</div>
            <div>보유 권한: {permissions.length > 0 ? permissions.join(', ') : '없음'}</div>
          </div>
          
          {userProfile?.role === 'admin' && !isSuperAdmin && (
            <p className="text-xs text-warning mt-2">
              최고관리자에게 필요한 권한을 요청하세요.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* 
📝 사용법:

1. 기존 방식 (하위 호환성 유지):
<ProtectedRoute requiredRole="admin">
  <AdminComponent />
</ProtectedRoute>

2. 새로운 세부 권한 방식 (권장):
<ProtectedRoute requiredPermission="assignments">
  <AssignmentsComponent />
</ProtectedRoute>

3. 최고관리자 전용 (권한 무시):
<ProtectedRoute requiredPermission="settings" allowSuperAdmin={true}>
  <SettingsComponent />
</ProtectedRoute>

4. 최고관리자도 권한 필요한 경우:
<ProtectedRoute requiredPermission="special_audit" allowSuperAdmin={false}>
  <AuditComponent />
</ProtectedRoute>

🔄 마이그레이션 가이드:
- 기존 requiredRole="admin" → requiredPermission="구체적권한"
- 최고관리자는 기본적으로 모든 권한 자동 허용
- UnauthorizedPage에서 현재 권한 상태 확인 가능

🧪 테스트 시나리오:
1. 로그인 안 한 상태 → /login으로 리다이렉트
2. 일반관리자가 권한 없는 페이지 접근 → /unauthorized + 권한 정보 표시
3. 최고관리자가 모든 페이지 접근 → 정상 허용
4. 영업사원이 관리자 페이지 접근 → /unauthorized
5. 권한 로딩 중 → 로딩 화면 표시
*/