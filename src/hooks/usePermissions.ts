// 수정된 /hooks/usePermissions.ts
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { PermissionType, systemSettingsService } from '@/lib/services/permissions';

// 권한 훅 - AuthContext와 연동하여 중복 제거
export const usePermissions = () => {
  const { 
    permissions, 
    hasPermission, 
    canAccessPage, 
    isSuperAdmin, 
    permissionsLoading,
    refreshPermissions 
  } = useAuth();

  // AuthContext의 권한 시스템을 그대로 사용
  return {
    permissions,
    loading: permissionsLoading,
    hasPermission,
    canAccessPage,
    isSuperAdmin,
    refreshPermissions
  };
};

// 시스템 설정 훅 - 기존 로직 유지
export const useSystemSettings = () => {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // 설정 로드
  const loadSettings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const allSettings = await systemSettingsService.getAllSettings();
      setSettings(allSettings);
    } catch (error) {
      console.error('설정 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [user]);

  // 설정 업데이트
  const updateSetting = async (key: string, value: any): Promise<void> => {
    if (!user) return;

    try {
      await systemSettingsService.updateSetting(key, value, user.id);
      setSettings(prev => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error('설정 업데이트 실패:', error);
      throw error;
    }
  };

  // 전화번호 마스킹 여부 확인
  const isPhoneMaskingEnabled = (): boolean => {
    return settings.phone_masking_enabled === true;
  };

  return {
    settings,
    loading,
    loadSettings,
    updateSetting,
    isPhoneMaskingEnabled
  };
};

// 전화번호 마스킹 유틸리티 훅 - AuthContext 연동으로 수정
export const usePhoneMasking = () => {
  const { hasPermission } = useAuth();
  const { isPhoneMaskingEnabled } = useSystemSettings();

  // 전화번호 마스킹 처리
  const maskPhone = (phone: string): string => {
    if (!phone) return '';
    
    // 마스킹이 비활성화되어 있거나 권한이 있으면 원본 반환
    if (!isPhoneMaskingEnabled() || hasPermission('phone_unmask')) {
      return phone;
    }

    // 010-1234-5678 -> 010-****-5678 형태로 마스킹
    const cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.length >= 8) {
      return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3');
    }
    
    // 길이가 짧으면 중간 부분 마스킹
    if (cleaned.length >= 7) {
      return cleaned.replace(/(\d{3})(\d+)(\d{2})/, '$1-***-$3');
    }
    
    return phone.replace(/\d/g, '*');
  };

  return {
    maskPhone,
    canSeeFullPhone: hasPermission('phone_unmask')
  };
};

// 컴포넌트에서 직접 권한 체크용 유틸리티 훅
export const usePagePermission = (requiredPermission: PermissionType) => {
  const { hasPermission, isSuperAdmin, userProfile } = useAuth();
  
  const hasAccess = isSuperAdmin || hasPermission(requiredPermission);
  const isLoading = !userProfile; // 프로필이 없으면 로딩 중
  
  return {
    hasAccess,
    isLoading,
    canView: hasAccess,
    shouldRedirect: !isLoading && !hasAccess
  };
};