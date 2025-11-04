'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { designSystem } from '@/lib/design-system';
import { businessIcons } from '@/lib/design-system/icons';
import { supabase } from '@/lib/supabase';
import { useToastHelpers } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth/AuthContext';
import { permissionService, PermissionType } from '@/lib/services/permissions';
import { departmentPermissionService } from '@/lib/services/departmentPermissions';
import { 
  UserPlus, Users, CheckCircle, XCircle, RefreshCw, 
  Edit2, Trash2, Building2, Mail, Phone, AlertTriangle,
  Search, ChevronLeft, ChevronRight, CheckSquare, Square,
  User, Calendar, Filter, X, Plus, Tag, Eye, EyeOff
} from 'lucide-react';

interface Counselor {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  department?: string;
  is_active: boolean;
  created_at: string;
}

interface NewCounselorForm {
  korean_name: string;
  english_id: string;
  phone: string;
  department: string;
  password: string;
  auto_generated?: boolean;
}

interface FilterOptions {
  departments: string[];
  statuses: string[];
  searchTerm: string;
}

// 권한 확인 컴포넌트
function PermissionChecker({ children }: { children: React.ReactNode }) {
  const { user, userProfile, isAdmin, isSuperAdmin } = useAuth();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    const checkPermission = async () => {
      if (!user || !userProfile) {
        setHasPermission(false);
        return;
      }
      
      if (isSuperAdmin) {
        setHasPermission(true);
        return;
      }
      
      if (isAdmin) {
        try {
          const hasAccess = await permissionService.hasPermission(user.id, 'counselors');
          setHasPermission(hasAccess);
        } catch (error) {
          console.error('권한 확인 실패:', error);
          setHasPermission(false);
        }
      } else {
        setHasPermission(false);
      }
    };
    
    checkPermission();
  }, [user, userProfile, isAdmin, isSuperAdmin]);

  if (hasPermission === null) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-accent" />
            <p className={designSystem.components.typography.body}>권한을 확인하는 중...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (hasPermission === false) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="max-w-md w-full text-center">
            <div className="w-24 h-24 bg-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-12 h-12 text-text-tertiary" />
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-4">접근 권한이 없습니다</h3>
            <p className="text-text-secondary mb-6">
              영업사원 관리는 '영업사원 관리' 권한이 있는 관리자만 접근할 수 있습니다.
            </p>
            <div className="p-4 bg-bg-secondary rounded-lg space-y-2">
              <p className="text-sm text-text-tertiary">
                현재 계정: {userProfile?.full_name || '알 수 없음'} ({userProfile?.role || '알 수 없음'})
              </p>
              {isAdmin && !isSuperAdmin && (
                <p className="text-xs text-text-secondary">
                  최고관리자에게 '영업사원 관리' 권한을 요청하세요.
                </p>
              )}
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return <>{children}</>;
}

function CounselorsPageContent() {
  const { user, userProfile, isSuperAdmin } = useAuth();
  const toast = useToastHelpers();
  const [mounted, setMounted] = useState(false);
  
  // 상태 선언
  const [allCounselors, setAllCounselors] = useState<Counselor[]>([]); // 전체 데이터
  const [filteredCounselors, setFilteredCounselors] = useState<Counselor[]>([]); // 필터링된 데이터
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCounselors, setSelectedCounselors] = useState<Set<string>>(new Set());
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  // 필터 상태
  const [filters, setFilters] = useState<FilterOptions>({
    departments: [],
    statuses: [],
    searchTerm: ''
  });
  
  const [departments, setDepartments] = useState<string[]>([]); // 부서 목록
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20; // 더 콤팩트한 페이징
  
  // 정렬 상태
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const [bulkEditForm, setBulkEditForm] = useState({
    full_name: '',
    phone: '',
    department: ''
  });
  
  // 삭제된 사용자 복구 관련 상태
  const [showDeletedCounselors, setShowDeletedCounselors] = useState(false);
  const [deletedCounselors, setDeletedCounselors] = useState<Counselor[]>([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);
  const [newCounselor, setNewCounselor] = useState<NewCounselorForm>({
    korean_name: '',
    english_id: '',
    phone: '',
    department: '',
    password: '',
    auto_generated: false
  });

  // Hydration 오류 방지
  useEffect(() => {
    setMounted(true);
  }, []);

  // 검색어 디바운싱
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 부서 목록 로드
  const loadDepartments = useCallback(async () => {
    try {
      const { data: departmentData, error } = await supabase
        .from('users')
        .select('department')
        .eq('role', 'counselor')
        .not('department', 'is', null);

      if (error) throw error;

      const uniqueDepartments = [...new Set(departmentData?.map(d => d.department).filter(Boolean))] as string[];
      setDepartments(uniqueDepartments.sort());
    } catch (error) {
      console.error('부서 목록 로드 실패:', error);
    }
  }, []);

  // 전체 영업사원 데이터 로드
  const loadAllCounselors = useCallback(async () => {
    setLoading(true);
    try {
      console.log('전체 영업사원 조회 시작...');

      if (!user?.id) {
        console.log('사용자 정보 없음');
        return;
      }

      // 기본 쿼리 생성 (모든 사용자) - deleted_at 조건 제외
      let query = supabase
        .from('users')
        .select('*')
        .eq('role', 'counselor')
        .order('full_name', { ascending: true });

      // 부서별 필터링 적용 (설정된 권한 + 본인 부서)
      const accessibleDepartments = await departmentPermissionService.getAccessibleDepartments(user.id);
      console.log('접근 가능한 부서:', accessibleDepartments);

      if (!isSuperAdmin && accessibleDepartments.length > 0) {
        // 접근 가능한 부서의 영업사원만 조회
        console.log('부서 필터링 적용: 접근 가능한 부서 -', accessibleDepartments.join(', '));
        query = query.in('department', accessibleDepartments);
      } else if (!isSuperAdmin && accessibleDepartments.length === 0) {
        // 접근 가능한 부서가 없으면 빈 결과 반환
        console.log('접근 가능한 부서 없음 - 영업사원 조회 불가');
        setAllCounselors([]);
        return;
      }

      const { data: counselorsData, error: counselorsError } = await query;
      
      // 클라이언트 사이드에서 deleted_at이 null인 것만 필터링
      let filteredCounselors = counselorsData || [];
      if (filteredCounselors.length > 0 && 'deleted_at' in filteredCounselors[0]) {
        filteredCounselors = filteredCounselors.filter(counselor => !counselor.deleted_at);
      }

      if (counselorsError) {
        console.error('영업사원 조회 에러:', counselorsError);
        throw new Error('영업사원 조회 실패: ' + counselorsError.message);
      }

      console.log('조회된 영업사원 수:', filteredCounselors.length);
      setAllCounselors(filteredCounselors);
      
    } catch (error: any) {
      console.error('영업사원 로드 실패:', error);
      const errorMessage = error?.message || '알 수 없는 오류';
      
      toast.error(
        '데이터 로드 실패', 
        '영업사원 목록을 불러오는 중 오류가 발생했습니다: ' + errorMessage,
        {
          action: {
            label: '다시 시도',
            onClick: () => loadAllCounselors()
          }
        }
      );
    } finally {
      setLoading(false);
    }
  }, [toast, user?.id, isSuperAdmin]);

  // 삭제된 영업사원 목록 로드
  const loadDeletedCounselors = async () => {
    setLoadingDeleted(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('인증이 필요합니다.');

      const response = await fetch('/api/admin/restore-user', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '삭제된 영업사원 조회 실패');
      }

      const { deletedUsers } = await response.json();
      // 영업사원만 필터링
      const deletedCounselorData = (deletedUsers || []).filter((user: any) => user.role === 'counselor');
      setDeletedCounselors(deletedCounselorData);
    } catch (error: any) {
      console.error('삭제된 영업사원 조회 실패:', error);
      toast.error('조회 실패', error.message);
    } finally {
      setLoadingDeleted(false);
    }
  };

  // 영업사원 복구
  const restoreCounselor = async (userId: string, userName: string) => {
    if (!confirm(`${userName}님의 계정을 복구하시겠습니까?`)) return;

    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('인증이 필요합니다.');

      const response = await fetch('/api/admin/restore-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          user_id: userId,
          restored_by: user?.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '복구 실패');
      }

      const result = await response.json();
      toast.success('복구 완료', result.message);
      
      // 목록 새로고침
      await loadDeletedCounselors();
      await loadAllCounselors();
      await loadDepartments();
    } catch (error: any) {
      console.error('복구 실패:', error);
      toast.error('복구 실패', error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 영업사원 완전 삭제
  const permanentlyDeleteCounselor = async (userId: string, userName: string) => {
    const confirmationText = `DELETE ${userName}`;
    const userInput = prompt(
      `⚠️ 경고: ${userName}님의 계정을 완전히 삭제합니다.\n\n` +
      `이 작업은 되돌릴 수 없으며, Auth 계정과 모든 관련 데이터가 영구적으로 삭제됩니다.\n\n` +
      `계속하려면 다음 텍스트를 정확히 입력하세요:\n` +
      `"${confirmationText}"`
    );

    if (!userInput || userInput !== confirmationText) {
      if (userInput !== null) {
        toast.error('취소됨', '확인 텍스트가 일치하지 않습니다.');
      }
      return;
    }

    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('인증이 필요합니다.');

      const response = await fetch('/api/admin/permanently-delete-user', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          user_id: userId,
          confirmation_text: confirmationText
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '완전 삭제 실패');
      }

      const result = await response.json();
      toast.success('완전 삭제 완료', result.message);
      
      // 목록 새로고침
      await loadDeletedCounselors();
      await loadAllCounselors();
      await loadDepartments();
    } catch (error: any) {
      console.error('완전 삭제 실패:', error);
      toast.error('완전 삭제 실패', error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 클라이언트 사이드 필터링
  const applyFilters = useCallback(() => {
    let filtered = [...allCounselors];

    // 검색어 필터
    if (debouncedSearchTerm.trim()) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(counselor => 
        counselor.full_name?.toLowerCase().includes(searchLower) ||
        counselor.email?.toLowerCase().includes(searchLower) ||
        counselor.department?.toLowerCase().includes(searchLower) ||
        counselor.phone?.toLowerCase().includes(searchLower)
      );
    }

    // 부서 필터 (다중 선택)
    if (filters.departments.length > 0) {
      filtered = filtered.filter(counselor => {
        const dept = counselor.department && counselor.department.trim() ? counselor.department : '미지정';
        return filters.departments.includes(dept);
      });
    }

    // 상태 필터
    if (filters.statuses.length > 0) {
      filtered = filtered.filter(counselor => {
        const status = counselor.is_active ? '활성' : '비활성';
        return filters.statuses.includes(status);
      });
    }

    // 정렬 적용
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'full_name':
          aValue = a.full_name || '';
          bValue = b.full_name || '';
          break;
        case 'department':
          aValue = a.department || '';
          bValue = b.department || '';
          break;
        default:
          aValue = a[sortColumn as keyof Counselor] || '';
          bValue = b[sortColumn as keyof Counselor] || '';
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredCounselors(filtered);
    setCurrentPage(1);
  }, [allCounselors, debouncedSearchTerm, filters, sortColumn, sortDirection]);

  // 부서별 통계
  const getDepartmentStats = () => {
    const stats: Record<string, number> = {};
    allCounselors.forEach(counselor => {
      const dept = counselor.department && counselor.department.trim() ? counselor.department : '미지정';
      stats[dept] = (stats[dept] || 0) + 1;
    });
    return stats;
  };

  // 상태별 통계
  const getStatusStats = () => {
    return {
      '활성': allCounselors.filter(c => c.is_active).length,
      '비활성': allCounselors.filter(c => !c.is_active).length
    };
  };

  const departmentStats = getDepartmentStats();
  const statusStats = getStatusStats();

  // 페이지네이션을 위한 현재 페이지 데이터
  const getCurrentPageCounselors = () => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredCounselors.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredCounselors.length / pageSize);
  const currentPageCounselors = getCurrentPageCounselors();

  // 정렬 변경 핸들러
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // 정렬 아이콘 렌더링
  const renderSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <span className="text-text-tertiary text-xs ml-0.5">↕</span>;
    }
    return sortDirection === 'asc' ? 
      <span className="text-accent text-xs ml-0.5">↑</span> : 
      <span className="text-accent text-xs ml-0.5">↓</span>;
  };

  // 다중 부서 필터 토글
  const toggleDepartmentFilter = (department: string) => {
    setFilters(prev => ({
      ...prev,
      departments: prev.departments.includes(department)
        ? prev.departments.filter(d => d !== department)
        : [...prev.departments, department]
    }));
  };

  // 다중 상태 필터 토글
  const toggleStatusFilter = (status: string) => {
    setFilters(prev => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter(s => s !== status)
        : [...prev.statuses, status]
    }));
  };

  // 영업사원 선택/해제
  const toggleCounselorSelection = (counselorId: string) => {
    setSelectedCounselors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(counselorId)) {
        newSet.delete(counselorId);
      } else {
        newSet.add(counselorId);
      }
      return newSet;
    });
  };

  // 전체 선택/해제 (현재 페이지 기준)
  const toggleSelectAll = () => {
    if (selectedCounselors.size === currentPageCounselors.length && currentPageCounselors.length > 0) {
      setSelectedCounselors(new Set());
    } else {
      setSelectedCounselors(new Set(currentPageCounselors.map(counselor => counselor.id)));
    }
  };

  // 텍스트 하이라이트 함수
  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;
    
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);
    
    if (index === -1) return text;
    
    return (
      <>
        {text.substring(0, index)}
        <span className="bg-accent-light text-accent font-medium rounded px-0.5">
          {text.substring(index, index + query.length)}
        </span>
        {text.substring(index + query.length)}
      </>
    );
  };

  // 임시 비밀번호 생성 함수
  const generateTempPassword = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // 전화번호 자동 포맷팅 함수
  const formatPhoneNumber = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length === 11 && numbers.startsWith('010')) {
      return numbers.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    }
    
    if (numbers.length === 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
    }
    
    if (numbers.length === 9) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})/, '$1-$2-$3');
    }
    
    return value;
  };

  // 비밀번호 리셋 함수
  const handlePasswordReset = async (counselorId: string, counselorName: string, counselorEmail: string) => {
    const confirmReset = () => {
      performPasswordReset(counselorId, counselorName, counselorEmail);
    };

    const message = counselorName + '님의 비밀번호를 리셋하시겠습니까?\n\n새로운 임시 비밀번호가 생성되어 표시됩니다.\n기존 비밀번호는 더 이상 사용할 수 없습니다.';

    toast.info(
      '비밀번호 리셋 확인',
      message,
      {
        action: {
          label: '리셋 실행',
          onClick: confirmReset
        },
        duration: 0
      }
    );
  };

  const performPasswordReset = async (counselorId: string, counselorName: string, counselorEmail: string) => {
    setActionLoading(true);
    try {
      const tempPassword = generateTempPassword();
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('세션이 만료되었습니다. 다시 로그인해주세요.');

      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + session.access_token
        },
        body: JSON.stringify({
          userId: counselorId,
          newPassword: tempPassword
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '비밀번호 리셋에 실패했습니다.');
      }

      const successMessage = counselorName + '님의 새 로그인 정보:\n\n아이디: ' + counselorEmail + '\n비밀번호: ' + tempPassword + '\n\n⚠️ 이 비밀번호를 영업사원에게 안전하게 전달해주세요.\n영업사원은 로그인 후 비밀번호를 변경하는 것을 권장합니다.';

      toast.success(
        '비밀번호 리셋 완료',
        successMessage,
        {
          action: {
            label: '비밀번호 복사',
            onClick: () => {
              navigator.clipboard.writeText(tempPassword);
              toast.info('복사 완료', '새 비밀번호가 클립보드에 복사되었습니다.');
            }
          },
          duration: 30000
        }
      );

    } catch (error: any) {
      console.error('비밀번호 리셋 실패:', error);
      
      let errorMessage = error.message || '비밀번호 리셋 중 오류가 발생했습니다.';
      
      if (errorMessage.includes('User not found')) {
        errorMessage = '해당 사용자를 찾을 수 없습니다.';
      } else if (errorMessage.includes('session')) {
        errorMessage = '세션이 만료되었습니다. 다시 로그인해주세요.';
      }
      
      toast.error(
        '비밀번호 리셋 실패',
        errorMessage,
        {
          action: {
            label: '다시 시도',
            onClick: () => performPasswordReset(counselorId, counselorName, counselorEmail)
          }
        }
      );
    } finally {
      setActionLoading(false);
    }
  };

  // 새 영업사원 추가
  const handleAddCounselor = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCounselor.korean_name || !newCounselor.english_id || !newCounselor.password) {
      toast.warning('입력 오류', '이름, 로그인 ID, 비밀번호는 필수입니다.');
      return;
    }

    if (newCounselor.password.length < 6) {
      toast.warning('비밀번호 오류', '비밀번호는 최소 6자리 이상이어야 합니다.');
      return;
    }

    if (!user || !userProfile?.role || userProfile.role !== 'admin') {
      toast.error('권한 오류', '관리자만 영업사원 계정을 생성할 수 있습니다.');
      return;
    }

    // counselors 권한이 없는 일반 관리자 체크
    if (!isSuperAdmin) {
      try {
        const hasPermission = await permissionService.hasPermission(user.id, 'counselors');
        if (!hasPermission) {
          toast.error('권한 오류', '상담원 관리 권한이 없습니다. 최고관리자에게 권한을 요청하세요.');
          return;
        }
      } catch (error) {
        console.error('권한 확인 실패:', error);
        toast.error('권한 확인 실패', '권한을 확인하는 중 오류가 발생했습니다.');
        return;
      }
    }

    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('세션이 만료되었습니다. 다시 로그인해주세요.');

      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + session.access_token
        },
        body: JSON.stringify({
          email: newCounselor.english_id,
          password: newCounselor.password,
          full_name: newCounselor.korean_name,
          phone: newCounselor.phone,
          department: newCounselor.department,
          role: 'counselor',
          created_by: user.id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '영업사원 계정 생성에 실패했습니다.');
      }

      const successMessage = newCounselor.korean_name + '님의 계정이 생성되었습니다.\n\n로그인 정보:\n아이디: ' + newCounselor.english_id + '\n비밀번호: ' + newCounselor.password + '\n\n계정 정보를 영업사원에게 전달해주세요.';

      toast.success(
        '영업사원 계정 생성 완료', 
        successMessage,
        {
          action: {
            label: '목록 새로고침',
            onClick: () => setShowAddForm(false)
          },
          duration: 15000
        }
      );
      
      setNewCounselor({ korean_name: '', english_id: '', phone: '', department: '', password: '', auto_generated: false });
      setShowAddForm(false);
      await loadAllCounselors();
      await loadDepartments();

    } catch (error: any) {
      console.error('영업사원 계정 생성 실패:', error);
      
      let errorMessage = error.message || '영업사원 계정 생성 중 오류가 발생했습니다.';
      
      if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
        errorMessage = '이미 등록된 이메일입니다. 다른 아이디를 사용해주세요.';
      } else if (errorMessage.includes('invalid email')) {
        errorMessage = '유효하지 않은 이메일 형식입니다.';
      } else if (errorMessage.includes('weak password')) {
        errorMessage = '비밀번호가 너무 약합니다. 더 복잡한 비밀번호를 사용해주세요.';
      }
      
      toast.error(
        '계정 생성 실패', 
        errorMessage,
        {
          action: {
            label: '다시 시도',
            onClick: () => handleAddCounselor(e)
          }
        }
      );
    } finally {
      setActionLoading(false);
    }
  };

  // 벌크 활성화/비활성화
  const handleBulkToggleActive = async (isActive: boolean) => {
    const action = isActive ? '활성화' : '비활성화';
    const selectedIds = Array.from(selectedCounselors);
    const selectedNames = allCounselors
      .filter(c => selectedIds.includes(c.id))
      .map(c => c.full_name);

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: isActive })
        .in('id', selectedIds);

      if (error) throw error;

      const successMessage = selectedIds.length + '명의 영업사원이 ' + action + '되었습니다.\n\n' + selectedNames.join(', ');

      toast.success(
        action + ' 완료',
        successMessage,
        {
          action: {
            label: '목록 새로고침',
            onClick: () => loadAllCounselors()
          }
        }
      );
      
      setSelectedCounselors(new Set());
      await loadAllCounselors();

    } catch (error: any) {
      console.error('벌크 ' + action + ' 실패:', error);
      
      toast.error(
        action + ' 실패',
        error.message || '영업사원 ' + action + ' 중 오류가 발생했습니다.',
        {
          action: {
            label: '다시 시도',
            onClick: () => handleBulkToggleActive(isActive)
          }
        }
      );
    } finally {
      setActionLoading(false);
    }
  };

  // 벌크 수정
  const handleBulkEdit = () => {
    const selectedIds = Array.from(selectedCounselors);
    if (selectedIds.length === 1) {
      const selectedCounselor = allCounselors.find(c => c.id === selectedIds[0]);
      if (selectedCounselor) {
        setBulkEditForm({
          full_name: selectedCounselor.full_name || '',
          phone: selectedCounselor.phone || '',
          department: selectedCounselor.department || ''
        });
      }
    } else {
      setBulkEditForm({
        full_name: '',
        phone: '',
        department: ''
      });
    }
    setShowBulkEditModal(true);
  };

  // 벌크 수정 실행
  const handleBulkEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const updateData: any = {};
    if (bulkEditForm.full_name.trim()) updateData.full_name = bulkEditForm.full_name.trim();
    if (bulkEditForm.phone.trim()) updateData.phone = bulkEditForm.phone.trim();
    if (bulkEditForm.department.trim()) updateData.department = bulkEditForm.department.trim();

    if (Object.keys(updateData).length === 0) {
      toast.warning('입력 오류', '수정할 정보를 입력해주세요.');
      return;
    }

    const selectedIds = Array.from(selectedCounselors);
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update(updateData)
        .in('id', selectedIds);

      if (error) throw error;

      const updatedFields = Object.keys(updateData).join(', ');
      const selectedNames = allCounselors
        .filter(c => selectedIds.includes(c.id))
        .map(c => c.full_name);

      const successMessage = selectedIds.length + '명의 영업사원 정보가 업데이트되었습니다.\n\n수정된 항목: ' + updatedFields + '\n대상: ' + selectedNames.join(', ');

      toast.success(
        '정보 수정 완료',
        successMessage,
        {
          action: {
            label: '목록 보기',
            onClick: () => setShowBulkEditModal(false)
          }
        }
      );
      
      setShowBulkEditModal(false);
      setBulkEditForm({ full_name: '', phone: '', department: '' });
      setSelectedCounselors(new Set());
      await loadAllCounselors();
      await loadDepartments();

    } catch (error: any) {
      console.error('벌크 수정 실패:', error);
      
      toast.error(
        '정보 수정 실패',
        error.message || '영업사원 정보 수정 중 오류가 발생했습니다.',
        {
          action: {
            label: '다시 시도',
            onClick: () => handleBulkEditSubmit(e)
          }
        }
      );
    } finally {
      setActionLoading(false);
    }
  };

  // 벌크 삭제  
  const handleBulkDelete = async () => {
    const selectedIds = Array.from(selectedCounselors);
    const selectedCounselorNames = allCounselors
      .filter(c => selectedIds.includes(c.id))
      .map(c => c.full_name);

    setActionLoading(true);
    try {
      const { data: assignments } = await supabase
        .from('lead_assignments')
        .select('counselor_id, lead_id')
        .in('counselor_id', selectedIds)
        .in('status', ['active', 'working']);

      if (assignments && assignments.length > 0) {
        const assignedCounselors = new Set(assignments.map(a => a.counselor_id));
        const assignedNames = allCounselors
          .filter(c => assignedCounselors.has(c.id))
          .map(c => c.full_name);
        
        const warningMessage = '다음 영업사원들은 현재 배정된 고객을 가지고 있어 삭제할 수 없습니다:\n\n' + assignedNames.join(', ') + '\n\n먼저 고객을 재배정하거나 완료 처리해주세요.';
        
        toast.warning(
          '삭제 불가',
          warningMessage,
          {
            action: {
              label: '배정 관리로 이동',
              onClick: () => window.location.href = '/admin/assignments'
            }
          }
        );
        return;
      }

      // 소프트 삭제로 변경
      const { error } = await supabase
        .from('users')
        .update({
          is_active: false,
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id
        })
        .in('id', selectedIds);

      if (error) throw error;

      const successMessage = selectedIds.length + '명의 영업사원이 비활성화되었습니다 (복구 가능).\n\n비활성화된 영업사원: ' + selectedCounselorNames.join(', ');

      toast.success(
        '비활성화 완료',
        successMessage,
        {
          action: {
            label: '목록 새로고침',
            onClick: () => loadAllCounselors()
          }
        }
      );
      
      setSelectedCounselors(new Set());
      await loadAllCounselors();
      await loadDepartments();

    } catch (error: any) {
      console.error('벌크 삭제 실패:', error);
      
      toast.error(
        '삭제 실패',
        error.message || '영업사원 삭제 중 오류가 발생했습니다.',
        {
          action: {
            label: '다시 시도',
            onClick: () => handleBulkDelete()
          }
        }
      );
    } finally {
      setActionLoading(false);
    }
  };

  // 필터 적용
  useEffect(() => {
    if (allCounselors.length > 0) {
      applyFilters();
    }
  }, [applyFilters]);

  // 초기 데이터 로드
  useEffect(() => {
    if (mounted && user) {
      Promise.all([
        loadDepartments(),
        loadAllCounselors()
      ]);
    }
  }, [mounted, user]);

  if (!mounted) return null;

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-accent" />
            <p className={designSystem.components.typography.body}>영업사원 목록을 불러오는 중...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className={designSystem.components.typography.h2}>영업사원 관리</h1>
          <p className={designSystem.components.typography.bodySm}>
            영업사원 계정을 생성하고 관리합니다.
          </p>
        </div>

        {/* 통계 카드 - 콤팩트 버전 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">전체</p>
                <p className="text-2xl font-bold text-text-primary">{allCounselors.length}</p>
              </div>
              <Users className="w-8 h-8 text-accent" />
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">활성</p>
                <p className="text-2xl font-bold text-success">{statusStats['활성']}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">비활성</p>
                <p className="text-2xl font-bold text-warning">{statusStats['비활성']}</p>
              </div>
              <XCircle className="w-8 h-8 text-warning" />
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">부서</p>
                <p className="text-2xl font-bold text-accent">{departments.length}</p>
              </div>
              <Building2 className="w-8 h-8 text-accent" />
            </div>
          </div>
        </div>

        {/* 삭제된 영업사원 복구 섹션 */}
        <div className={designSystem.utils.cn(designSystem.components.card.base, "p-6 mb-6")}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-warning" />
              <h3 className={designSystem.components.typography.h4}>삭제된 영업사원 복구</h3>
              <span className="text-sm text-text-secondary">(관리자 전용)</span>
            </div>
            <button
              onClick={() => {
                setShowDeletedCounselors(!showDeletedCounselors);
                if (!showDeletedCounselors && deletedCounselors.length === 0) {
                  loadDeletedCounselors();
                }
              }}
              className={designSystem.components.button.secondary}
            >
              {showDeletedCounselors ? (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  숨기기
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  삭제된 영업사원 보기
                </>
              )}
            </button>
          </div>

          {showDeletedCounselors && (
            <div className="space-y-3">
              {loadingDeleted ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-accent mr-3" />
                  <span className="text-text-secondary">삭제된 영업사원 조회 중...</span>
                </div>
              ) : deletedCounselors.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
                  <h4 className="text-md font-medium text-text-primary mb-1">삭제된 영업사원이 없습니다</h4>
                  <p className="text-sm text-text-secondary">모든 영업사원이 활성 상태입니다.</p>
                </div>
              ) : (
                deletedCounselors.map((deletedCounselor) => (
                  <div
                    key={deletedCounselor.id}
                    className="border border-border-primary rounded-lg p-3 bg-bg-secondary/20"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="w-4 h-4 text-text-secondary" />
                          <span className="font-medium text-text-primary">{deletedCounselor.full_name}</span>
                          <XCircle className="w-4 h-4 text-warning" />
                          <span className="text-xs text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                            삭제됨
                          </span>
                        </div>
                        <div className="text-sm text-text-secondary grid grid-cols-1 md:grid-cols-3 gap-1">
                          <div>이메일: {deletedCounselor.email}</div>
                          {(deletedCounselor as any).department && (
                            <div>부서: {(deletedCounselor as any).department}</div>
                          )}
                          {(deletedCounselor as any).deleted_at && (
                            <div>삭제일: {new Date((deletedCounselor as any).deleted_at).toLocaleDateString('ko-KR')}</div>
                          )}
                        </div>
                      </div>
                      <div className="ml-4 flex gap-2">
                        <button
                          onClick={() => restoreCounselor(deletedCounselor.id, deletedCounselor.full_name)}
                          disabled={actionLoading}
                          className={designSystem.utils.cn(
                            designSystem.components.button.primary,
                            "text-sm px-3 py-1.5"
                          )}
                        >
                          {actionLoading ? (
                            <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                          ) : (
                            <RefreshCw className="w-3 h-3 mr-1" />
                          )}
                          복구
                        </button>
                        <button
                          onClick={() => permanentlyDeleteCounselor(deletedCounselor.id, deletedCounselor.full_name)}
                          disabled={actionLoading}
                          className={designSystem.utils.cn(
                            "px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors",
                            "bg-red-50 hover:bg-red-100 text-red-700 border-red-200",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                          )}
                        >
                          {actionLoading ? (
                            <Trash2 className="w-3 h-3 animate-pulse mr-1" />
                          ) : (
                            <Trash2 className="w-3 h-3 mr-1" />
                          )}
                          완전 삭제
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 필터 섹션 */}
        <div className="mb-6">
          {/* 부서별 필터 */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-text-secondary" />
              <span className="text-sm font-medium text-text-primary">부서 필터</span>
              <span className="text-xs text-text-secondary">
                ({filters.departments.length > 0 ? `${filters.departments.length}개 선택됨` : '전체'})
              </span>
              {filters.departments.length > 0 && (
                <button
                  onClick={() => setFilters(prev => ({...prev, departments: []}))}
                  className="text-xs text-accent hover:text-accent/80 underline"
                >
                  전체 선택 해제
                </button>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              {/* 부서 필터 버튼들 */}
              {departments.map(dept => (
                <button
                  key={dept}
                  onClick={() => toggleDepartmentFilter(dept)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                    filters.departments.includes(dept)
                      ? 'bg-accent text-white border-accent font-medium'
                      : 'bg-bg-primary border-border-primary text-text-secondary hover:border-accent/50'
                  }`}
                >
                  {dept} ({departmentStats[dept] || 0})
                </button>
              ))}

              {/* 미지정 부서 */}
              {departmentStats['미지정'] > 0 && (
                <button
                  onClick={() => toggleDepartmentFilter('미지정')}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                    filters.departments.includes('미지정')
                      ? 'bg-warning text-white border-warning font-medium'
                      : 'bg-bg-primary border-border-primary text-text-secondary hover:border-accent/50'
                  }`}
                >
                  미지정 ({departmentStats['미지정']})
                </button>
              )}
            </div>
          </div>

          {/* 상태별 필터 */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4 text-text-secondary" />
              <span className="text-sm font-medium text-text-primary">상태 필터</span>
              <span className="text-xs text-text-secondary">
                ({filters.statuses.length > 0 ? `${filters.statuses.length}개 선택됨` : '전체'})
              </span>
              {filters.statuses.length > 0 && (
                <button
                  onClick={() => setFilters(prev => ({...prev, statuses: []}))}
                  className="text-xs text-accent hover:text-accent/80 underline"
                >
                  전체 선택 해제
                </button>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => toggleStatusFilter('활성')}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                  filters.statuses.includes('활성')
                    ? 'bg-success text-white border-success font-medium'
                    : 'bg-bg-primary border-border-primary text-text-secondary hover:border-accent/50'
                }`}
              >
                활성 ({statusStats['활성']})
              </button>

              <button
                onClick={() => toggleStatusFilter('비활성')}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                  filters.statuses.includes('비활성')
                    ? 'bg-warning text-white border-warning font-medium'
                    : 'bg-bg-primary border-border-primary text-text-secondary hover:border-accent/50'
                }`}
              >
                비활성 ({statusStats['비활성']})
              </button>
            </div>
          </div>
        </div>

        {/* 벌크 액션 바 */}
        {selectedCounselors.size > 0 && (
          <div className="sticky top-0 bg-bg-primary border border-border-primary p-3 z-10 shadow-sm mb-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-primary">
                {selectedCounselors.size}명 선택됨
              </span>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleBulkEdit}
                  disabled={actionLoading}
                  className="px-2 py-1.5 text-xs bg-bg-secondary text-text-primary rounded hover:bg-bg-hover transition-colors"
                >
                  <Edit2 className="w-3 h-3 mr-1 inline" />
                  정보 수정
                </button>

                <button
                  onClick={() => handleBulkToggleActive(true)}
                  disabled={actionLoading}
                  className="px-2 py-1.5 text-xs bg-success text-white rounded hover:bg-success/90 transition-colors"
                >
                  <CheckCircle className="w-3 h-3 mr-1 inline" />
                  활성화
                </button>

                <button
                  onClick={() => handleBulkToggleActive(false)}
                  disabled={actionLoading}
                  className="px-2 py-1.5 text-xs bg-warning text-white rounded hover:bg-warning/90 transition-colors"
                >
                  <XCircle className="w-3 h-3 mr-1 inline" />
                  비활성화
                </button>

                <button
                  onClick={handleBulkDelete}
                  disabled={actionLoading}
                  className="px-2 py-1.5 text-xs bg-error text-white rounded hover:bg-error/90 transition-colors"
                >
                  <Trash2 className="w-3 h-3 mr-1 inline" />
                  삭제
                </button>

                <button
                  onClick={() => setSelectedCounselors(new Set())}
                  className="px-2 py-1.5 text-xs bg-bg-secondary text-text-primary rounded hover:bg-bg-hover transition-colors"
                >
                  선택 해제
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 제목과 검색 영역 - 콤팩트 버전 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-medium text-text-primary">영업사원 목록</h3>
            <span className="text-xs text-text-secondary px-1.5 py-0.5 bg-bg-secondary rounded">
              필터링: {filteredCounselors.length}명 / 전체: {allCounselors.length}명
            </span>
            {loading && (
              <span className="text-xs text-accent animate-pulse">로딩 중...</span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* 검색 */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-text-secondary" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="이름, 이메일, 부서로 검색..."
                className="pl-7 pr-3 py-1 w-48 text-xs border border-border-primary rounded bg-bg-primary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            {/* 액션 버튼들 */}
            <button
              onClick={() => {
                loadDepartments();
                loadAllCounselors();
                toast.info('새로고침', '영업사원 목록이 업데이트되었습니다.');
              }}
              disabled={loading}
              className="px-3 py-2 text-xs rounded font-medium transition-colors bg-bg-secondary text-text-primary hover:bg-bg-hover disabled:opacity-50"
            >
              <RefreshCw className={loading ? "w-3 h-3 mr-1 inline animate-spin" : "w-3 h-3 mr-1 inline"} />
              새로고침
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-3 py-2 text-xs bg-accent text-white rounded hover:bg-accent/90 transition-colors font-medium"
            >
              <UserPlus className="w-3 h-3 mr-1 inline" />
              영업사원 추가
            </button>
          </div>
        </div>

        {/* 영업사원 추가 폼 - 콤팩트 버전 */}
        {showAddForm && (
          <div className="bg-bg-primary border border-border-primary rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-text-primary">새 영업사원 계정 생성</h4>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-text-tertiary hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleAddCounselor} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-text-primary">한글 이름 *</label>
                <input
                  type="text"
                  value={newCounselor.korean_name}
                  onChange={(e) => setNewCounselor(prev => ({ ...prev, korean_name: e.target.value }))}
                  className="w-full px-2 py-1.5 text-xs border border-border-primary rounded bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="홍길동"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium mb-1 text-text-primary">로그인 ID *</label>
                <input
                  type="email"
                  value={newCounselor.english_id}
                  onChange={(e) => setNewCounselor(prev => ({ 
                    ...prev, 
                    english_id: e.target.value
                  }))}
                  className="w-full px-2 py-1.5 text-xs border border-border-primary rounded bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="lee1234@crm.com"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium mb-1 text-text-primary">비밀번호 *</label>
                <input
                  type="password"
                  value={newCounselor.password}
                  onChange={(e) => setNewCounselor(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-2 py-1.5 text-xs border border-border-primary rounded bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="최소 6자리"
                  required
                  minLength={6}
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium mb-1 text-text-primary">전화번호</label>
                <input
                  type="tel"
                  value={newCounselor.phone}
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value);
                    setNewCounselor(prev => ({ ...prev, phone: formatted }));
                  }}
                  className="w-full px-2 py-1.5 text-xs border border-border-primary rounded bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="010-1234-5678"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium mb-1 text-text-primary">부서</label>
                <input
                  type="text"
                  value={newCounselor.department}
                  onChange={(e) => setNewCounselor(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full px-2 py-1.5 text-xs border border-border-primary rounded bg-bg-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="영업팀"
                  list="department-suggestions"
                />
                <datalist id="department-suggestions">
                  {departments.map(dept => (
                    <option key={dept} value={dept} />
                  ))}
                </datalist>
              </div>
              
              <div className="flex gap-1">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 px-2 py-1.5 text-xs rounded font-medium transition-colors bg-accent text-white hover:bg-accent/90 disabled:bg-bg-secondary disabled:text-text-tertiary disabled:cursor-not-allowed"
                >
                  {actionLoading ? (
                    <RefreshCw className="w-3 h-3 animate-spin mx-auto" />
                  ) : (
                    <Plus className="w-3 h-3 mx-auto" />
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 영업사원 목록 테이블 - 콤팩트 버전 */}
        <div className="bg-bg-primary border border-border-primary rounded-lg overflow-hidden">
          {currentPageCounselors.length > 0 ? (
            <>
              <div className="overflow-auto" style={{ maxHeight: '65vh' }}>
                <table className="w-full table-fixed">
                  <thead className="bg-bg-secondary sticky top-0 z-10">
                    <tr>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-8">
                        <button
                          onClick={toggleSelectAll}
                          className="flex items-center justify-center w-3 h-3 mx-auto"
                        >
                          {selectedCounselors.size === currentPageCounselors.length && currentPageCounselors.length > 0 ? (
                            <CheckSquare className="w-3 h-3 text-accent" />
                          ) : (
                            <Square className="w-3 h-3 text-text-tertiary" />
                          )}
                        </button>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-20 cursor-pointer hover:bg-bg-hover transition-colors"
                          onClick={() => handleSort('full_name')}>
                        <div className="flex items-center justify-center gap-0.5">
                          <User className="w-3 h-3" />
                          이름{renderSortIcon('full_name')}
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-32">
                        <div className="flex items-center justify-center gap-0.5">
                          <Mail className="w-3 h-3" />
                          이메일
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-24">
                        <div className="flex items-center justify-center gap-0.5">
                          <Phone className="w-3 h-3" />
                          전화번호
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-20 cursor-pointer hover:bg-bg-hover transition-colors"
                          onClick={() => handleSort('department')}>
                        <div className="flex items-center justify-center gap-0.5">
                          <Building2 className="w-3 h-3" />
                          부서{renderSortIcon('department')}
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-16">
                        <div className="flex items-center justify-center gap-0.5">
                          <CheckCircle className="w-3 h-3" />
                          상태
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-16 cursor-pointer hover:bg-bg-hover transition-colors"
                          onClick={() => handleSort('created_at')}>
                        <div className="flex items-center justify-center gap-0.5">
                          <Calendar className="w-3 h-3" />
                          생성일{renderSortIcon('created_at')}
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-12">
                        <div className="flex items-center justify-center gap-0.5">
                          <RefreshCw className="w-3 h-3" />
                          액션
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPageCounselors.map((counselor) => (
                      <tr key={counselor.id} className="border-b border-border-primary hover:bg-bg-hover transition-colors">
                        {/* 선택 체크박스 */}
                        <td className="py-1 px-1 text-center">
                          <button
                            onClick={() => toggleCounselorSelection(counselor.id)}
                            className="flex items-center justify-center w-3 h-3 mx-auto"
                          >
                            {selectedCounselors.has(counselor.id) ? (
                              <CheckSquare className="w-3 h-3 text-accent" />
                            ) : (
                              <Square className="w-3 h-3 text-text-tertiary" />
                            )}
                          </button>
                        </td>

                        {/* 이름 */}
                        <td className="py-1 px-1 text-center">
                          <div className="text-xs font-medium text-text-primary truncate">
                            {highlightText(counselor.full_name, debouncedSearchTerm)}
                          </div>
                        </td>

                        {/* 이메일 */}
                        <td className="py-1 px-1 text-center">
                          <div className="text-xs text-text-secondary truncate">
                            {highlightText(counselor.email, debouncedSearchTerm)}
                          </div>
                        </td>

                        {/* 전화번호 */}
                        <td className="py-1 px-1 text-center">
                          <div className="text-xs font-mono text-text-primary truncate">
                            {counselor.phone ? (
                              highlightText(counselor.phone, debouncedSearchTerm)
                            ) : (
                              <span className="text-text-tertiary">-</span>
                            )}
                          </div>
                        </td>

                        {/* 부서 */}
                        <td className="py-1 px-1 text-center">
                          <div className="text-xs text-text-primary truncate">
                            {counselor.department && counselor.department.trim() ? (
                              <span className="px-1.5 py-0.5 rounded bg-accent-light text-accent">
                                {highlightText(counselor.department, debouncedSearchTerm)}
                              </span>
                            ) : (
                              <span className="text-text-tertiary italic">미지정</span>
                            )}
                          </div>
                        </td>

                        {/* 상태 */}
                        <td className="py-1 px-1 text-center">
                          <span className={
                            counselor.is_active 
                              ? "px-1.5 py-0.5 text-xs rounded bg-success-light text-success font-medium"
                              : "px-1.5 py-0.5 text-xs rounded bg-error-light text-error font-medium"
                          }>
                            {counselor.is_active ? '활성' : '비활성'}
                          </span>
                        </td>

                        {/* 생성일 */}
                        <td className="py-1 px-1 text-center">
                          <span className="text-text-secondary text-xs whitespace-nowrap">
                            {new Date(counselor.created_at).toLocaleDateString('ko-KR', {
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </span>
                        </td>

                        {/* 액션 */}
                        <td className="py-1 px-1 text-center">
                          <button
                            onClick={() => handlePasswordReset(counselor.id, counselor.full_name, counselor.email)}
                            disabled={actionLoading}
                            className="p-0.5 text-text-tertiary hover:text-accent transition-colors disabled:opacity-50"
                            title="비밀번호 리셋"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 페이지네이션 - 콤팩트 버전 */}
              {totalPages > 1 && (
                <div className="p-3 border-t border-border-primary bg-bg-secondary">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-text-secondary">
                      총 {filteredCounselors.length.toLocaleString()}개 중 {((currentPage - 1) * pageSize + 1).toLocaleString()}-{Math.min(currentPage * pageSize, filteredCounselors.length).toLocaleString()}개 표시
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="px-2 py-1 text-xs border border-border-primary rounded bg-bg-primary text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-hover transition-colors"
                      >
                        첫페이지
                      </button>
                      
                      <button
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-2 py-1 text-xs border border-border-primary rounded bg-bg-primary text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-hover transition-colors"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      
                      <span className="px-2 py-1 text-xs text-white bg-accent rounded">
                        {currentPage} / {totalPages}
                      </span>
                      
                      <button
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-2 py-1 text-xs border border-border-primary rounded bg-bg-primary text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-hover transition-colors"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                      
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="px-2 py-1 text-xs border border-border-primary rounded bg-bg-primary text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-hover transition-colors"
                      >
                        마지막
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">
                {loading ? '데이터 로드 중...' : filteredCounselors.length === 0 && allCounselors.length > 0 ? '필터 조건에 맞는 영업사원이 없습니다' : '등록된 영업사원이 없습니다'}
              </h3>
              <p className="text-text-secondary mb-4">
                {loading ? '잠시만 기다려주세요.' : filteredCounselors.length === 0 && allCounselors.length > 0 ? '필터 조건을 변경해보세요.' : '새 영업사원을 추가해보세요.'}
              </p>
              
              {(filters.departments.length > 0 || filters.statuses.length > 0 || searchTerm) && (
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setFilters(prev => ({...prev, departments: []}))}
                    className="px-3 py-1.5 text-xs bg-bg-secondary text-text-primary rounded hover:bg-bg-hover transition-colors"
                  >
                    부서 필터 해제
                  </button>
                  <button
                    onClick={() => setFilters(prev => ({...prev, statuses: []}))}
                    className="px-3 py-1.5 text-xs bg-bg-secondary text-text-primary rounded hover:bg-bg-hover transition-colors"
                  >
                    상태 필터 해제
                  </button>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="px-3 py-1.5 text-xs bg-bg-secondary text-text-primary rounded hover:bg-bg-hover transition-colors"
                  >
                    검색어 지우기
                  </button>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilters({departments: [], statuses: [], searchTerm: ''});
                    }}
                    className="px-3 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent/90 transition-colors"
                  >
                    전체 초기화
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 벌크 수정 모달 - 콤팩트 버전 */}
        {showBulkEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-bg-primary border border-border-primary rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-text-primary">
                  {selectedCounselors.size === 1 ? '영업사원 정보 수정' : selectedCounselors.size + '명 일괄 수정'}
                </h3>
                <button
                  onClick={() => setShowBulkEditModal(false)}
                  className="text-text-tertiary hover:text-text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <form onSubmit={handleBulkEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-text-primary">이름</label>
                  <input
                    type="text"
                    value={bulkEditForm.full_name}
                    onChange={(e) => setBulkEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder={selectedCounselors.size > 1 ? "변경할 경우에만 입력" : "이름을 입력하세요"}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-text-primary">전화번호</label>
                  <input
                    type="tel"
                    value={bulkEditForm.phone}
                    onChange={(e) => {
                      const formatted = formatPhoneNumber(e.target.value);
                      setBulkEditForm(prev => ({ ...prev, phone: formatted }));
                    }}
                    className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder={selectedCounselors.size > 1 ? "변경할 경우에만 입력" : "전화번호를 입력하세요"}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-text-primary">부서</label>
                  <input
                    type="text"
                    value={bulkEditForm.department}
                    onChange={(e) => setBulkEditForm(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder={selectedCounselors.size > 1 ? "변경할 경우에만 입력" : "부서를 입력하세요"}
                    list="bulk-edit-department-suggestions"
                  />
                  <datalist id="bulk-edit-department-suggestions">
                    {departments.map(dept => (
                      <option key={dept} value={dept} />
                    ))}
                  </datalist>
                </div>

                {selectedCounselors.size > 1 && (
                  <div className="p-3 bg-accent-light rounded-lg">
                    <p className="text-sm text-text-secondary">
                      다중 선택 시 빈 칸은 변경되지 않습니다. 변경할 정보만 입력하세요.
                    </p>
                  </div>
                )}
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-2 text-sm rounded font-medium transition-colors bg-accent text-white hover:bg-accent/90 disabled:bg-bg-secondary disabled:text-text-tertiary disabled:cursor-not-allowed"
                  >
                    {actionLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin mr-2 inline" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2 inline" />
                    )}
                    수정 완료
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBulkEditModal(false);
                      setBulkEditForm({ full_name: '', phone: '', department: '' });
                    }}
                    className="px-4 py-2 text-sm bg-bg-secondary text-text-primary rounded hover:bg-bg-hover transition-colors font-medium"
                  >
                    취소
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

// 메인 컴포넌트
export default function CounselorsPage() {
  return (
    <ProtectedRoute requiredPermission="counselors">
      <PermissionChecker>
        <CounselorsPageContent />
      </PermissionChecker>
    </ProtectedRoute>
  );
}