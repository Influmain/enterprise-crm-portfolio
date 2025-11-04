// /lib/services/permissions.ts
import { supabase } from '@/lib/supabase';

// 권한 타입 정의
export type PermissionType = 
  | 'assignments'        // 배정 관리
  | 'consulting_monitor' // 상담 모니터링  
  | 'counselors'         // 영업사원 관리
  | 'dashboard'          // 대시보드
  | 'leads'              // 리드 관리
  | 'settings'           // 설정
  | 'upload'             // 데이터 업로드
  | 'phone_unmask';      // 전화번호 마스킹 해제

// 권한 설명 매핑
export const PERMISSION_LABELS: Record<PermissionType, string> = {
  assignments: '배정 관리',
  consulting_monitor: '상담 모니터링',
  counselors: '영업사원 관리', 
  dashboard: '대시보드',
  leads: '리드 관리',
  settings: '시스템 설정',
  upload: '데이터 업로드',
  phone_unmask: '전화번호 마스킹 해제'
};

// 권한 설명
export const PERMISSION_DESCRIPTIONS: Record<PermissionType, string> = {
  assignments: '고객을 영업사원에게 배정하고 관리할 수 있습니다',
  consulting_monitor: '영업사원의 상담 현황을 실시간으로 모니터링할 수 있습니다',
  counselors: '영업사원을 추가, 수정, 삭제할 수 있습니다',
  dashboard: '관리자 대시보드에 접근할 수 있습니다',
  leads: '고객(리드) 데이터를 조회하고 관리할 수 있습니다',
  settings: '시스템 설정을 변경할 수 있습니다',
  upload: '고객 데이터를 업로드할 수 있습니다',
  phone_unmask: '마스킹된 전화번호를 볼 수 있습니다'
};

// 페이지별 권한 매핑
export const PAGE_PERMISSIONS: Record<string, PermissionType> = {
  '/admin/assignments': 'assignments',
  '/admin/consulting-monitor': 'consulting_monitor', 
  '/admin/counselors': 'counselors',
  '/admin/dashboard': 'dashboard',
  '/admin/leads': 'leads',
  '/admin/settings': 'settings',
  '/admin/upload': 'upload'
};

// 사용자 권한 타입
export interface UserPermission {
  id: string;
  user_id: string;
  permission_type: PermissionType;
  granted_by: string;
  granted_at: string;
  is_active: boolean;
}

// 권한이 있는 사용자 정보
export interface UserWithPermissions {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  department?: string | null;
  role: string;
  is_super_admin: boolean;
  is_active: boolean;
  permissions: PermissionType[];
}

// 권한 관리 서비스
export const permissionService = {
  // 사용자의 모든 권한 조회
  async getUserPermissions(userId: string): Promise<PermissionType[]> {
    const { data, error } = await supabase
      .from('user_permissions')
      .select('permission_type')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw error;
    return data?.map(p => p.permission_type as PermissionType) || [];
  },

  // 특정 권한 확인
  async hasPermission(userId: string, permission: PermissionType): Promise<boolean> {
    // 최고관리자는 모든 권한 보유
    const { data: user } = await supabase
      .from('users')
      .select('is_super_admin')
      .eq('id', userId)
      .single();

    if (user?.is_super_admin) return true;

    const { data, error } = await supabase
      .from('user_permissions')
      .select('id')
      .eq('user_id', userId)
      .eq('permission_type', permission)
      .eq('is_active', true)
      .single();

    return !error && !!data;
  },

  // 사용자에게 권한 부여
  async grantPermission(
    userId: string, 
    permission: PermissionType, 
    grantedBy: string
  ): Promise<void> {
    const { error } = await supabase
      .from('user_permissions')
      .upsert({
        user_id: userId,
        permission_type: permission,
        granted_by: grantedBy,
        is_active: true
      }, {
        onConflict: 'user_id,permission_type'
      });

    if (error) throw error;
  },

  // 사용자의 권한 제거
  async revokePermission(userId: string, permission: PermissionType): Promise<void> {
    const { error } = await supabase
      .from('user_permissions')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('permission_type', permission);

    if (error) throw error;
  },

  // 모든 관리자 사용자와 권한 조회
  async getAllAdminsWithPermissions(): Promise<UserWithPermissions[]> {
    // 관리자 사용자들 조회
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, phone, department, role, is_super_admin, is_active')
      .eq('role', 'admin')
      .eq('is_active', true)
      .order('full_name');

    if (usersError) throw usersError;

    if (!users || users.length === 0) return [];

    // 각 사용자의 권한 조회
    const usersWithPermissions = await Promise.all(
      users.map(async (user) => {
        const permissions = await this.getUserPermissions(user.id);
        return {
          ...user,
          permissions
        };
      })
    );

    return usersWithPermissions;
  },

  // 권한 기록 조회 (감사 목적)
  async getPermissionHistory(userId?: string): Promise<any[]> {
    let query = supabase
      .from('user_permissions')
      .select(`
        *,
        user:users!user_id(email, full_name),
        granter:users!granted_by(email, full_name)
      `)
      .order('granted_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // 대량 권한 부여/제거
  async bulkUpdatePermissions(
    userId: string,
    permissions: PermissionType[],
    grantedBy: string
  ): Promise<void> {
    // 기존 권한 모두 비활성화
    await supabase
      .from('user_permissions')
      .update({ is_active: false })
      .eq('user_id', userId);

    // 새 권한들 부여
    if (permissions.length > 0) {
      const permissionRecords = permissions.map(permission => ({
        user_id: userId,
        permission_type: permission,
        granted_by: grantedBy,
        is_active: true
      }));

      const { error } = await supabase
        .from('user_permissions')
        .upsert(permissionRecords, {
          onConflict: 'user_id,permission_type'
        });

      if (error) throw error;
    }
  }
};

// 시스템 설정 서비스
export const systemSettingsService = {
  // 설정 조회
  async getSetting(key: string): Promise<any> {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', key)
      .single();

    if (error) throw error;
    return data?.setting_value;
  },

  // 설정 업데이트
  async updateSetting(
    key: string, 
    value: any, 
    updatedBy: string
  ): Promise<void> {
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        setting_key: key,
        setting_value: value,
        updated_by: updatedBy
      }, {
        onConflict: 'setting_key'
      });

    if (error) throw error;
  },

  // 모든 설정 조회
  async getAllSettings(): Promise<Record<string, any>> {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value');

    if (error) throw error;

    const settings: Record<string, any> = {};
    data?.forEach(item => {
      settings[item.setting_key] = item.setting_value;
    });

    return settings;
  }
};