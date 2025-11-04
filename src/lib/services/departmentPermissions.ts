// /lib/services/departmentPermissions.ts
import { supabase } from '@/lib/supabase';

// 부서 권한 인터페이스
export interface DepartmentPermission {
  id?: string;
  user_id: string;
  department: string;
  granted_by: string;
  granted_at?: string;
  is_active: boolean;
}

// DB 기반 부서별 데이터 필터링 서비스
export const departmentPermissionService = {
  // 사용자의 부서 권한 조회 (DB 기반)
  async getUserDepartmentPermissions(userId: string): Promise<string[]> {
    try {
      console.log('=== DB 기반 부서 권한 조회 시작 ===');
      console.log('사용자 ID:', userId);

      // 최고관리자인지 확인
      const { data: user } = await supabase
        .from('users')
        .select('is_super_admin')
        .eq('id', userId)
        .single();

      console.log('사용자 정보:', user);

      // 최고관리자는 모든 부서 접근 가능
      if (user?.is_super_admin) {
        console.log('최고관리자로 확인 - 모든 부서 접근 가능');
        const { data: departments } = await supabase
          .from('users')
          .select('department')
          .eq('role', 'counselor')
          .eq('is_active', true)
          .not('department', 'is', null);
        
        const uniqueDepts = [...new Set(departments?.map(d => d.department).filter(Boolean))] as string[];
        console.log('모든 부서:', uniqueDepts);
        return uniqueDepts;
      }

      // DB에서 부서 권한 조회
      console.log('일반 관리자 - DB에서 권한 조회');
      const { data: permissions, error } = await supabase
        .from('department_permissions')
        .select('department')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        console.error('DB 부서 권한 조회 실패:', error);
        return [];
      }

      const userPermissions = permissions?.map(p => p.department) || [];
      console.log(`사용자 ${userId}의 DB 부서 권한:`, userPermissions);
      
      return userPermissions;
    } catch (error) {
      console.error('부서 권한 조회 실패:', error);
      return [];
    }
  },

  // 사용자에게 부서 권한 부여 (DB 기반)
  async saveDepartmentPermissions(
    userId: string,
    departments: string[],
    grantedBy: string
  ): Promise<void> {
    try {
      console.log('=== DB 기반 부서 권한 저장 시작 ===');
      console.log('사용자 ID:', userId);
      console.log('부서 목록:', departments);
      console.log('권한 부여자:', grantedBy);

      // 1. 기존 권한 모두 비활성화
      const { error: deactivateError } = await supabase
        .from('department_permissions')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (deactivateError) {
        console.error('기존 권한 비활성화 실패:', deactivateError);
        throw deactivateError;
      }

      // 2. 새로운 권한 추가
      if (departments.length > 0) {
        const newPermissions = departments.map(dept => ({
          user_id: userId,
          department: dept,
          granted_by: grantedBy,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        const { error: insertError } = await supabase
          .from('department_permissions')
          .upsert(newPermissions, {
            onConflict: 'user_id, department'
          });

        if (insertError) {
          console.error('새 권한 저장 실패:', insertError);
          throw insertError;
        }
      }

      console.log(`✅ DB 부서 권한 저장 완료: ${userId} -> [${departments.join(', ')}]`);
    } catch (error) {
      console.error('❌ DB 부서 권한 저장 실패:', error);
      throw error;
    }
  },

  // 사용자가 접근할 수 있는 부서 목록 조회 (설정된 권한 + 본인 부서)
  async getAccessibleDepartments(userId: string): Promise<string[]> {
    try {
      console.log('=== 접근 가능한 부서 조회 시작 ===');
      
      // 1. 설정된 부서 권한 조회
      const allowedDepartments = await this.getUserDepartmentPermissions(userId);
      console.log('설정된 부서 권한:', allowedDepartments);
      
      // 2. 사용자 본인의 정보 조회
      const { data: userInfo, error: userError } = await supabase
        .from('users')
        .select('department, is_super_admin, role')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('사용자 정보 조회 실패:', userError);
        return allowedDepartments; // 설정된 권한만 반환
      }

      console.log('사용자 전체 정보:', userInfo);

      // 최고관리자면 허용된 모든 부서 반환 (이미 getUserDepartmentPermissions에서 처리됨)
      if (userInfo?.is_super_admin) {
        console.log('최고관리자 - 설정된 권한 반환');
        return allowedDepartments;
      }

      // 3. 설정된 권한 부서 + 본인 부서 합치기
      const accessibleDepartments = [...allowedDepartments];
      
      // 사용자가 관리자이고 부서 정보가 있으면 본인 부서 추가
      if (userInfo?.role === 'admin' && userInfo?.department) {
        if (!accessibleDepartments.includes(userInfo.department)) {
          accessibleDepartments.push(userInfo.department);
          console.log('본인 부서 추가:', userInfo.department);
        } else {
          console.log('본인 부서는 이미 권한에 포함됨:', userInfo.department);
        }
      } else if (userInfo?.role === 'admin' && !userInfo?.department) {
        console.log('관리자이지만 부서 정보 없음');
      } else {
        console.log('관리자가 아님 - 역할:', userInfo?.role);
      }

      console.log('최종 접근 가능한 부서 목록:', accessibleDepartments);
      return accessibleDepartments;
    } catch (error) {
      console.error('접근 가능한 부서 조회 실패:', error);
      // 오류 발생 시 설정된 권한만이라도 반환
      return await this.getUserDepartmentPermissions(userId);
    }
  },

  // 리드 데이터에 부서별 필터링 적용
  async getFilteredLeads(userId: string, baseQuery: any) {
    try {
      const accessibleDepartments = await this.getAccessibleDepartments(userId);
      
      // 접근 가능한 부서가 없으면 미배정 리드만
      if (accessibleDepartments.length === 0) {
        console.log('접근 가능한 부서 없음 - 미배정 리드만 조회');
        return baseQuery
          .is('counselor_department', null); // 미배정 리드만
      }

      console.log(`부서 필터링 적용: [${accessibleDepartments.join(', ')}] + 미배정`);
      
      // 접근 가능한 부서 또는 미배정 리드 조회
      return baseQuery.or(
        `counselor_department.in.(${accessibleDepartments.join(',')}),counselor_department.is.null`
      );
    } catch (error) {
      console.error('부서별 리드 필터링 실패:', error);
      return baseQuery;
    }
  },

  // 영업사원 데이터에 부서별 필터링 적용
  async getFilteredCounselors(userId: string, baseQuery: any) {
    try {
      // getUserDepartmentPermissions 대신 getAccessibleDepartments 사용 (본인 부서 포함)
      const allowedDepartments = await this.getAccessibleDepartments(userId);
      
      if (allowedDepartments.length === 0) {
        console.log('부서 권한 없음 - 영업사원 조회 불가');
        return baseQuery.eq('id', 'non-existent'); // 빈 결과 반환
      }

      console.log(`영업사원 부서 필터링 적용: [${allowedDepartments.join(', ')}]`);
      return baseQuery.in('department', allowedDepartments);
    } catch (error) {
      console.error('부서별 영업사원 필터링 실패:', error);
      return baseQuery;
    }
  },

  // 배정 데이터에 부서별 필터링 적용
  async getFilteredAssignments(userId: string, baseQuery: any) {
    try {
      // getUserDepartmentPermissions 대신 getAccessibleDepartments 사용 (본인 부서 포함)
      const allowedDepartments = await this.getAccessibleDepartments(userId);
      
      if (allowedDepartments.length === 0) {
        console.log('부서 권한 없음 - 배정 조회 불가');
        return baseQuery.eq('id', 'non-existent'); // 빈 결과 반환
      }

      console.log(`배정 부서 필터링 적용: [${allowedDepartments.join(', ')}]`);
      return baseQuery.in('counselor_department', allowedDepartments);
    } catch (error) {
      console.error('부서별 배정 필터링 실패:', error);
      return baseQuery;
    }
  },

  // 현재 사용자가 특정 부서에 접근 가능한지 확인
  async canAccessDepartment(userId: string, department: string): Promise<boolean> {
    try {
      // getUserDepartmentPermissions 대신 getAccessibleDepartments 사용 (본인 부서 포함)
      const allowedDepartments = await this.getAccessibleDepartments(userId);
      return allowedDepartments.includes(department);
    } catch (error) {
      console.error('부서 접근 권한 확인 실패:', error);
      return false;
    }
  },

  // DB에서 모든 사용자의 부서 권한 조회 (관리자 설정 페이지용)
  async getAllUserDepartmentPermissions(): Promise<Record<string, string[]>> {
    try {
      console.log('=== 모든 사용자 부서 권한 조회 ===');
      
      const { data: permissions, error } = await supabase
        .from('department_permissions')
        .select('user_id, department')
        .eq('is_active', true);

      if (error) {
        console.error('모든 사용자 부서 권한 조회 실패:', error);
        return {};
      }

      // user_id별로 부서 목록 그룹화
      const permissionsMap: Record<string, string[]> = {};
      permissions?.forEach(perm => {
        if (!permissionsMap[perm.user_id]) {
          permissionsMap[perm.user_id] = [];
        }
        permissionsMap[perm.user_id].push(perm.department);
      });

      console.log('모든 사용자 부서 권한:', permissionsMap);
      return permissionsMap;
    } catch (error) {
      console.error('모든 사용자 부서 권한 조회 실패:', error);
      return {};
    }
  }
};