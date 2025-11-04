'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useToastHelpers } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import { designSystem } from '@/lib/design-system';
import { businessIcons } from '@/lib/design-system/icons';
import { departmentPermissionService } from '@/lib/services/departmentPermissions';
import { 
  Search, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  CheckSquare,
  Square,
  User,
  Phone,
  Calendar,
  MessageSquare,
  UserCheck,
  UserX,
  FileCheck,
  AlertTriangle,
  Edit,
  Trash2,
  Save,
  X,
  Plus,
  Tag,
  Building
} from 'lucide-react';

// 뷰 기반 타입 정의
interface Lead {
  id: string;
  phone: string;
  contact_name: string;
  real_name?: string;
  data_source: string;
  contact_script: string;
  data_date: string;
  extra_info: string;
  lead_status: 'available' | 'assigned' | 'contracted';
  created_at: string;
  upload_batch_id: string;
  additional_data?: any;
  
  // 뷰에서 직접 제공되는 배정/상담 정보
  assignment_id?: string;
  counselor_id?: string;
  counselor_name?: string;
  assigned_at?: string;
  latest_contact_result?: string;
  contract_status?: string;
  contract_amount?: number;
  last_contact_date?: string;
  counseling_memo?: string;
  actual_customer_name?: string;
  call_attempts?: number;
}

interface FilterOptions {
  statuses: string[]; // 다중 선택으로 변경
  startDate: string;
  endDate: string;
  departments: string[]; // 복수 선택으로 변경
  counselorId: string;
}

// 인라인 편집 상태
interface InlineEdit {
  leadId: string;
  field: 'grade' | 'memo' | 'customer_name';
  value: string;
}

function AdminLeadsPageContent() {
  const { user, userProfile, loading: authLoading, hasPermission, isSuperAdmin } = useAuth();
  const toast = useToastHelpers();
  const [mounted, setMounted] = useState(false);

  // 회원등급 옵션 정의
  const gradeOptions = [
    { value: '신규', label: '신규', color: '#3b82f6' },
    { value: '재상담 신청', label: '재상담 신청', color: '#8b5cf6' },
    { value: '무방 입장[안내]', label: '무방 입장[안내]', color: '#06b6d4' },
    { value: '무방 입장[완료]', label: '무방 입장[완료]', color: '#10b981' },
    { value: '관리', label: '관리', color: '#f59e0b' },
    { value: '결제[유력]', label: '결제[유력]', color: '#ef4444' },
    { value: '결제[완료]', label: '결제[완료]', color: '#22c55e' },
    { value: 'AS 신청', label: 'AS 신청', color: '#ec4899' },
    { value: '부재', label: '부재', color: '#6b7280' },
    { value: '[지속] 부재', label: '[지속] 부재', color: '#4b5563' },
    { value: '이탈[조짐]', label: '이탈[조짐]', color: '#f97316' },
    { value: '이탈', label: '이탈', color: '#dc2626' },
    { value: '불가', label: '불가', color: '#991b1b' },
    { value: '이관 DB', label: '이관 DB', color: '#7c3aed' }
  ];

  // 데이터 상태
  const [allLeads, setAllLeads] = useState<Lead[]>([]); // 전체 데이터
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]); // 필터링된 데이터
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    statuses: [],
    startDate: '',
    endDate: '',
    departments: [],
    counselorId: ''
  });

  // 통계 상태
  const [overallStats, setOverallStats] = useState({
    totalLeads: 0,
    totalAssigned: 0,
    totalUnassigned: 0,
    totalContracted: 0,
    totalRevenue: 0,
    totalCurrentMonth: 0
  });

  // 등급별 통계 상태
  const [gradeStats, setGradeStats] = useState<Record<string, number>>({});

  // 부서 및 영업사원 목록 상태
  const [departments, setDepartments] = useState<string[]>([]);
  const [counselors, setCounselors] = useState<any[]>([]);

  // 페이지네이션 상태 (클라이언트 사이드) - 50으로 변경
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50); // 50으로 변경
  
  // 정렬 상태
  const [sortColumn, setSortColumn] = useState<string>('data_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // 선택 상태
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  
  // 리드 추가 모달 상태
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [addingLead, setAddingLead] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // 벌크 숫자 삭제
  const [bulkDeleteCount, setBulkDeleteCount] = useState('');
  const [bulkDeleteMode, setBulkDeleteMode] = useState<'selected' | 'count'>('selected');

  // 벌크 등급 설정 상태
  const [showBulkGradeModal, setShowBulkGradeModal] = useState(false);
  const [bulkGradeValue, setBulkGradeValue] = useState('');
  const [bulkGradeMode, setBulkGradeMode] = useState<'selected' | 'count'>('selected');
  const [bulkGradeCount, setBulkGradeCount] = useState('');

  // 인라인 편집 상태
  const [inlineEdit, setInlineEdit] = useState<InlineEdit | null>(null);

  // 메모 히스토리 모달 상태
  const [showMemoHistoryModal, setShowMemoHistoryModal] = useState(false);
  const [selectedLeadForMemo, setSelectedLeadForMemo] = useState<Lead | null>(null);
  const [memoHistory, setMemoHistory] = useState<any[]>([]);
  const [loadingMemoHistory, setLoadingMemoHistory] = useState(false);

  // Hydration 오류 방지
  useEffect(() => {
    setMounted(true);
  }, []);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.getElementById('department-dropdown');
      const button = event.target as HTMLElement;

      if (dropdown && !dropdown.contains(button) && !button.closest('.department-filter-button')) {
        dropdown.classList.add('hidden');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 검색어 디바운싱
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
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
        .eq('is_active', true)
        .not('department', 'is', null);

      if (error) throw error;

      const uniqueDepartments = [...new Set(departmentData?.map(d => d.department).filter(Boolean))] as string[];
      // 한글 정렬 적용
      setDepartments(uniqueDepartments.sort((a, b) => a.localeCompare(b, 'ko-KR')));
    } catch (error) {
      console.error('부서 목록 로드 실패:', error);
    }
  }, []);

  // 영업사원 목록 로드
  const loadCounselors = useCallback(async () => {
    try {
      const { data: counselorsData, error } = await supabase
        .from('users')
        .select('id, full_name, email, department')
        .eq('role', 'counselor')
        .eq('is_active', true);

      if (error) throw error;

      // 클라이언트에서 한글 이름을 올바르게 정렬
      const sortedCounselors = (counselorsData || []).sort((a, b) => {
        // 부서명 먼저 정렬
        const deptCompare = (a.department || '').localeCompare(b.department || '', 'ko-KR');
        if (deptCompare !== 0) return deptCompare;

        // 같은 부서 내에서는 이름으로 정렬 (한글 정렬 지원)
        return (a.full_name || '').localeCompare(b.full_name || '', 'ko-KR');
      });

      setCounselors(sortedCounselors);
    } catch (error) {
      console.error('영업사원 목록 로드 실패:', error);
    }
  }, []);

  // 전체 데이터 로드
  const loadAllLeads = useCallback(async () => {
    try {
      setLoading(true);
      console.log('=== 전체 데이터 로드 시작 ===');

      if (!user?.id) {
        console.log('사용자 정보 없음');
        return;
      }

      let allData: Lead[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      // 접근 가능한 부서 확인 (설정된 권한 + 본인 부서)
      const accessibleDepartments = await departmentPermissionService.getAccessibleDepartments(user.id);
      console.log('접근 가능한 부서:', accessibleDepartments);

      // 접근 가능한 부서의 영업사원 ID 목록을 가져오기
      let allowedCounselorIds: string[] = [];
      if (!isSuperAdmin && accessibleDepartments.length > 0) {
        const { data: counselorsData } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'counselor')
          .eq('is_active', true)
          .in('department', accessibleDepartments);
        
        allowedCounselorIds = counselorsData?.map(c => c.id) || [];
        console.log('접근 가능한 영업사원 ID:', allowedCounselorIds.length + '명');
      }

      while (hasMore) {
        // 기본 쿼리 생성
        let query = supabase
          .from('admin_leads_view')
          .select('*')
          .order('created_at', { ascending: false });

        // 부서 권한이 있는 경우 필터링 적용
        if (!isSuperAdmin && accessibleDepartments.length > 0 && allowedCounselorIds.length > 0) {
          // 접근 가능한 영업사원의 리드 또는 미배정 리드만 조회
          console.log('부서 필터링 적용: 접근 가능한 영업사원 + 미배정');
          query = query.or(`counselor_id.in.(${allowedCounselorIds.join(',')}),counselor_id.is.null`);
        } else if (!isSuperAdmin && accessibleDepartments.length === 0) {
          // 접근 가능한 부서가 없으면 미배정 리드만
          console.log('접근 가능한 부서 없음 - 미배정 리드만 조회');
          query = query.is('counselor_id', null);
        }

        const { data: batch, error } = await query.range(from, from + batchSize - 1);

        if (error) throw error;

        if (batch && batch.length > 0) {
          // 뷰 데이터를 기존 인터페이스에 맞게 변환
          const enrichedBatch = batch.map(lead => ({
            ...lead,
            status: lead.lead_status,
            assignment_info: lead.assignment_id ? {
              counselor_name: lead.counselor_name || '알 수 없음',
              assigned_at: lead.assigned_at,
              latest_contact_result: lead.latest_contact_result,
              contract_amount: lead.contract_amount,
              actual_customer_name: lead.actual_customer_name
            } : undefined,
            customer_grade: (() => {
              if (lead.additional_data) {
                const additionalData = typeof lead.additional_data === 'string'
                  ? JSON.parse(lead.additional_data)
                  : lead.additional_data;

                if (additionalData && additionalData.grade) {
                  return {
                    ...additionalData,
                    grade: additionalData.grade,
                    history: Array.isArray(additionalData.history) ? additionalData.history : [],
                    grade_color: additionalData.grade_color || gradeOptions.find(g => g.value === additionalData.grade)?.color || '#6b7280',
                    grade_memo: additionalData.grade_memo,
                    updated_at: additionalData.updated_at,
                    updated_by: additionalData.updated_by
                  };
                }
              }
              return undefined;
            })()
          }));

          allData = allData.concat(enrichedBatch);
          from += batchSize;
          
          if (batch.length < batchSize) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      console.log(`전체 데이터 로드 완료: ${allData.length}개`);
      setAllLeads(allData);

    } catch (error) {
      console.error('전체 데이터 로드 실패:', error);
      const errorMessage = (error as Error)?.message || '알 수 없는 오류가 발생했습니다.';
      toast.error('데이터 로드 실패', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [toast, user?.id, isSuperAdmin]);

  // filteredLeads 기반 통계 계산 (필터링된 데이터 반영)
  const calculateFilteredStats = useCallback((leads: Lead[]) => {
    const totalLeads = leads.length;
    const totalAssigned = leads.filter(lead => lead.assignment_id).length;
    const totalUnassigned = totalLeads - totalAssigned;

    const contractedLeads = leads.filter(lead =>
      lead.contract_status === 'contracted'
    );

    const totalRevenue = contractedLeads.reduce((sum, lead) =>
      sum + (lead.contract_amount || 0), 0
    );

    // 당월 고객수 계산
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const totalCurrentMonth = leads.filter(lead => {
      const leadDate = new Date(lead.data_date || lead.created_at);
      return leadDate >= startOfMonth && leadDate <= endOfMonth;
    }).length;

    setOverallStats({
      totalLeads,
      totalAssigned,
      totalUnassigned,
      totalContracted: contractedLeads.length,
      totalRevenue,
      totalCurrentMonth
    });

    console.log(`통계 계산 완료 (필터링된 ${totalLeads}개): 배정 ${totalAssigned}, 계약 ${contractedLeads.length}, 매출 ${totalRevenue}, 당월 ${totalCurrentMonth}`);
  }, []);

  // 클라이언트 사이드 필터링
  const applyFilters = useCallback(() => {
    let filtered = [...allLeads];

    console.log('=== 클라이언트 필터링 시작 ===');
    console.log('전체 데이터:', allLeads.length);

    // 검색어 필터
    if (debouncedSearchTerm.trim()) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(lead => 
        lead.phone?.toLowerCase().includes(searchLower) ||
        lead.contact_name?.toLowerCase().includes(searchLower) ||
        lead.real_name?.toLowerCase().includes(searchLower) ||
        lead.actual_customer_name?.toLowerCase().includes(searchLower) ||
        lead.data_source?.toLowerCase().includes(searchLower)
      );
      console.log('검색어 필터 후:', filtered.length);
    }

    // 날짜 필터 (데이터 생성일 기준)
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(lead => {
        const leadDate = new Date(lead.data_date || lead.created_at);
        return leadDate >= startDate;
      });
      console.log('시작일 필터 후:', filtered.length);
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(lead => {
        const leadDate = new Date(lead.data_date || lead.created_at);
        return leadDate <= endDate;
      });
      console.log('종료일 필터 후:', filtered.length);
    }

    // 팀별 필터 (복수 선택)
    if (filters.departments.length > 0) {
      const departmentCounselors = counselors
        .filter(c => filters.departments.includes(c.department))
        .map(c => c.id);
      filtered = filtered.filter(lead =>
        lead.counselor_id && departmentCounselors.includes(lead.counselor_id)
      );
      console.log('팀 필터 후:', filtered.length);
    }

    // 영업사원별 필터
    if (filters.counselorId) {
      filtered = filtered.filter(lead => lead.counselor_id === filters.counselorId);
      console.log('영업사원 필터 후:', filtered.length);
    }

    // 등급 필터
    if (filters.statuses.length > 0) {
      filtered = filtered.filter(lead => {
        if (lead.additional_data) {
          const additionalData = typeof lead.additional_data === 'string' 
            ? JSON.parse(lead.additional_data) 
            : lead.additional_data;
          
          if (additionalData?.grade) {
            return filters.statuses.includes(additionalData.grade);
          } else {
            return filters.statuses.includes('미분류');
          }
        } else {
          return filters.statuses.includes('미분류');
        }
      });
      console.log('등급 필터 후:', filtered.length);
    }

    // 정렬 적용
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'data_date':
          aValue = new Date(a.data_date || a.created_at);
          bValue = new Date(b.data_date || b.created_at);
          break;
        case 'real_name':
          aValue = a.actual_customer_name || a.real_name || a.contact_name || '';
          bValue = b.actual_customer_name || b.real_name || b.contact_name || '';
          break;
        case 'phone':
          aValue = a.phone || '';
          bValue = b.phone || '';
          break;
        case 'data_source':
          aValue = a.data_source || '';
          bValue = b.data_source || '';
          break;
        case 'counselor_name':
          aValue = a.counselor_name || 'zzzz_미배정'; // 미배정을 맨 뒤로
          bValue = b.counselor_name || 'zzzz_미배정';
          break;
        default:
          aValue = a[sortColumn as keyof Lead] || '';
          bValue = b[sortColumn as keyof Lead] || '';
      }

      // 한글 정렬을 위한 localeCompare 사용
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const compare = aValue.localeCompare(bValue, 'ko-KR');
        return sortDirection === 'asc' ? compare : -compare;
      }

      // 날짜나 숫자의 경우 기존 방식 사용
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    console.log('최종 필터링 결과:', filtered.length);
    setFilteredLeads(filtered);
    setCurrentPage(1); // 필터 변경시 첫 페이지로

  }, [allLeads, debouncedSearchTerm, filters, counselors, sortColumn, sortDirection]);

  // 등급별 통계 계산 (전체 데이터 기준)
  const calculateGradeStats = useCallback(() => {
    const stats: Record<string, number> = {};
    gradeOptions.forEach(option => {
      stats[option.value] = 0;
    });

    let unclassifiedCount = 0;

    allLeads.forEach(lead => {
      if (lead.additional_data && lead.additional_data !== null) {
        const additionalData = typeof lead.additional_data === 'string'
          ? JSON.parse(lead.additional_data)
          : lead.additional_data;

        if (additionalData?.grade && stats.hasOwnProperty(additionalData.grade)) {
          stats[additionalData.grade]++;
        } else {
          unclassifiedCount++;
        }
      } else {
        unclassifiedCount++;
      }
    });

    stats['미분류'] = unclassifiedCount;
    setGradeStats(stats);
  }, [allLeads]); // filteredLeads → allLeads로 변경

  // 메모 히스토리 로드
  const loadMemoHistory = async (assignmentId: string) => {
    try {
      setLoadingMemoHistory(true);
      const { data, error } = await supabase
        .from('consulting_memo_history')
        .select(`
          id,
          memo,
          created_at,
          created_by,
          users:created_by(full_name)
        `)
        .eq('assignment_id', assignmentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const memos = data?.map((memo: any) => ({
        id: memo.id,
        memo: memo.memo,
        created_at: memo.created_at,
        created_by: memo.created_by,
        created_by_name: memo.users?.full_name || '알 수 없음'
      })) || [];

      setMemoHistory(memos);
    } catch (error) {
      console.error('메모 히스토리 로드 실패:', error);
      toast.error('메모 히스토리 로드 실패', '메모 히스토리를 불러올 수 없습니다.');
    } finally {
      setLoadingMemoHistory(false);
    }
  };

  // 메모 히스토리 모달 열기
  const openMemoHistoryModal = async (lead: Lead) => {
    if (!lead.assignment_id) {
      toast.warning('배정 정보 없음', '아직 배정되지 않은 리드입니다.');
      return;
    }

    setSelectedLeadForMemo(lead);
    setShowMemoHistoryModal(true);
    await loadMemoHistory(lead.assignment_id);
  };

  // 페이지네이션을 위한 현재 페이지 데이터
  const getCurrentPageLeads = () => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredLeads.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredLeads.length / pageSize);

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

  // 다중 등급 필터 토글
  const toggleGradeFilter = (grade: string) => {
    setFilters(prev => ({
      ...prev,
      statuses: prev.statuses.includes(grade)
        ? prev.statuses.filter(s => s !== grade)
        : [...prev.statuses, grade]
    }));
  };

  // 선택 관련 함수들
  const toggleSelectLead = (leadId: string) => {
    setSelectedLeads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    const currentPageLeads = getCurrentPageLeads();
    if (selectedLeads.size === currentPageLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(currentPageLeads.map(lead => lead.id)));
    }
  };

  // 등급별 배지 렌더링 함수
  const renderGradeBadge = (grade?: any) => {
    if (!grade) {
      return (
        <span className="px-1.5 py-0.5 rounded text-xs bg-bg-secondary text-text-tertiary whitespace-nowrap">
          미분류
        </span>
      );
    }

    const gradeOption = gradeOptions.find(g => g.value === grade.grade);
    return (
      <span 
        className="px-1.5 py-0.5 rounded text-xs text-white font-medium whitespace-nowrap"
        style={{ backgroundColor: gradeOption?.color || grade.grade_color || '#6b7280' }}
      >
        {grade.grade}
      </span>
    );
  };

  // 전화번호 마스킹 함수
  const maskPhoneNumber = (phone: string): string => {
    if (!phone) return '-';

    if (hasPermission('phone_unmask')) {
      return phone;
    }

    if (phone.length >= 8) {
      const start = phone.slice(0, 3);
      const end = phone.slice(-4);
      return start + '****' + end;
    }

    return phone.slice(0, 2) + '*'.repeat(phone.length - 2);
  };

  // 등급 수정 함수
  const handleGradeUpdate = async (leadId: string, newGrade: string) => {
    if (!user) {
      toast.error('인증 오류', '로그인이 필요합니다.');
      return;
    }

    try {
      const now = new Date().toISOString();
      const gradeOption = gradeOptions.find(g => g.value === newGrade);

      const gradeData = {
        grade: newGrade,
        grade_color: gradeOption?.color || '#6b7280',
        grade_memo: '',
        updated_at: now,
        updated_by: user.id
      };

      const { error } = await supabase
        .from('lead_pool')
        .update({
          additional_data: gradeData,
          updated_at: now
        })
        .eq('id', leadId);

      if (error) throw error;

      toast.success('등급 수정 완료', `등급이 "${newGrade}"로 변경되었습니다.`);

      // 데이터 새로고침
      await loadAllLeads();

    } catch (error) {
      console.error('등급 수정 실패:', error);
      const errorMessage = (error as Error)?.message || '알 수 없는 오류가 발생했습니다.';
      toast.error('등급 수정 실패', errorMessage);
    } finally {
      setInlineEdit(null);
    }
  };

  // 리드 추가 함수
const handleAddLead = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  
  if (!user) {
    toast.error('인증 오류', '로그인이 필요합니다.');
    return;
  }
  
  setAddingLead(true);
  
  try {
    const formData = new FormData(e.currentTarget);
    
    const newLead = {
      phone: formData.get('phone') as string,
      contact_name: '미입력', // 기본값으로 설정
      contact_script: formData.get('contact_script') as string,
      data_source: formData.get('data_source') as string,
      status: 'available',
      uploaded_by: user.id,
      // upload_batch_id 제거 - nullable이므로 null로 처리
      created_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('lead_pool')
      .insert(newLead);
    
    if (error) throw error;
    
    toast.success('리드 추가 완료', '새로운 고객이 추가되었습니다.');
    setShowAddLeadModal(false);
    
    // 폼 리셋
    (e.target as HTMLFormElement).reset();

    // 데이터 새로고침 (통계는 자동으로 재계산됨)
    await loadAllLeads();
    
  } catch (error) {
    console.error('리드 추가 실패:', error);
    const errorMessage = (error as Error)?.message || '알 수 없는 오류가 발생했습니다.';
    toast.error('리드 추가 실패', errorMessage);
  } finally {
    setAddingLead(false);
  }
};

// 개선된 벌크 삭제 함수
const handleBulkDelete = async () => {
  if (selectedLeads.size > 0) {
    setShowBulkDeleteModal(true);
    setBulkDeleteMode('selected');
  } else {
    setShowBulkDeleteModal(true);
    setBulkDeleteMode('count');
  }
};

// 벌크 등급 설정 함수
const handleBulkGrade = async () => {
  if (selectedLeads.size > 0) {
    setShowBulkGradeModal(true);
    setBulkGradeMode('selected');
  } else {
    setShowBulkGradeModal(true);
    setBulkGradeMode('count');
  }
};

// 벌크 등급 설정 실행 함수
const executeBulkGrade = async () => {
  if (!bulkGradeValue) {
    toast.warning('등급 선택 필요', '설정할 등급을 선택해주세요.');
    return;
  }

  setLoading(true);

  try {
    let leadIdsToUpdate: string[] = [];

    if (bulkGradeMode === 'selected') {
      leadIdsToUpdate = Array.from(selectedLeads);
    } else {
      const updateCount = parseInt(bulkGradeCount);
      if (isNaN(updateCount) || updateCount <= 0) {
        toast.warning('입력 오류', '올바른 숫자를 입력해주세요.');
        return;
      }

      leadIdsToUpdate = filteredLeads
        .slice(0, Math.min(updateCount, filteredLeads.length))
        .map(lead => lead.id);
    }

    if (leadIdsToUpdate.length === 0) {
      toast.warning('선택 확인', '등급을 설정할 데이터가 없습니다.');
      return;
    }

    const now = new Date().toISOString();
    const gradeOption = gradeOptions.find(g => g.value === bulkGradeValue);

    const gradeData = {
      grade: bulkGradeValue,
      grade_color: gradeOption?.color || '#6b7280',
      grade_memo: '',
      updated_at: now,
      updated_by: user?.id,
      history: []
    };

    // 배치 처리로 등급 업데이트 (50개씩)
    const BATCH_SIZE = 50;
    let totalUpdated = 0;
    let failedIds: string[] = [];

    for (let i = 0; i < leadIdsToUpdate.length; i += BATCH_SIZE) {
      const batch = leadIdsToUpdate.slice(i, i + BATCH_SIZE);

      try {
        const { error } = await supabase
          .from('lead_pool')
          .update({
            additional_data: gradeData,
            updated_at: now
          })
          .in('id', batch);

        if (error) {
          console.error('배치 등급 업데이트 실패:', error);
          failedIds.push(...batch);
        } else {
          totalUpdated += batch.length;
          console.log(`배치 ${i/BATCH_SIZE + 1}: ${batch.length}개 등급 업데이트 완료`);
        }

      } catch (error) {
        console.error('배치 등급 업데이트 중 오류:', error);
        failedIds.push(...batch);
      }
    }

    // 실패한 업데이트가 있으면 경고
    if (failedIds.length > 0) {
      console.warn('등급 업데이트 실패한 리드 ID:', failedIds);
      toast.warning('일부 업데이트 실패', `${failedIds.length}개 리드 등급 업데이트 중 오류가 발생했습니다.`);
    }

    toast.success(
      '등급 설정 완료',
      `${totalUpdated}개의 리드 등급이 "${bulkGradeValue}"로 설정되었습니다.`
    );

    setSelectedLeads(new Set());
    setShowBulkGradeModal(false);
    setBulkGradeValue('');
    setBulkGradeCount('');

    // 데이터 새로고침
    await loadAllLeads();

  } catch (error) {
    console.error('벌크 등급 설정 실패:', error);
    const errorMessage = (error as Error)?.message || '알 수 없는 오류가 발생했습니다.';
    toast.error('등급 설정 실패', errorMessage);
  } finally {
    setLoading(false);
  }
};

// 실제 삭제 실행 함수
const executeBulkDelete = async () => {
  setLoading(true);
  
  // 로딩 표시를 위한 약간의 지연
  await new Promise(resolve => setTimeout(resolve, 100));
  
  let logId: string | null = null;
  
  try {
    let leadIdsToDelete: string[] = [];
    
    if (bulkDeleteMode === 'selected') {
      leadIdsToDelete = Array.from(selectedLeads);
    } else {
      const deleteCount = parseInt(bulkDeleteCount);
      if (isNaN(deleteCount) || deleteCount <= 0) {
        toast.warning('입력 오류', '올바른 숫자를 입력해주세요.');
        return;
      }
      
      // 필터링된 전체 데이터에서 삭제 (현재 페이지에 제한받지 않음)
      leadIdsToDelete = filteredLeads
        .slice(0, Math.min(deleteCount, filteredLeads.length))
        .map(lead => lead.id);
    }
    
    if (leadIdsToDelete.length === 0) {
      toast.warning('선택 확인', '삭제할 데이터가 없습니다.');
      return;
    }

    // 삭제 시작 로그 기록
    const deleteReason = bulkDeleteMode === 'selected' 
      ? `선택 삭제 (${leadIdsToDelete.length}개)` 
      : `숫자 입력 삭제 (${leadIdsToDelete.length}개)`;

    const { data: logEntry, error: logError } = await supabase
      .from('deletion_logs')
      .insert({
        table_name: 'lead_pool',
        record_ids: leadIdsToDelete,
        deleted_count: 0, // 아직 삭제 전
        deleted_by: user?.id || '',
        reason: `${deleteReason} - 시작`,
        additional_info: {
          mode: bulkDeleteMode,
          filter_applied: filters.statuses.length > 0 || searchTerm.length > 0,
          total_filtered: filteredLeads.length,
          user_agent: navigator.userAgent
        }
      })
      .select()
      .single();

    if (logError) {
      console.warn('삭제 로그 기록 실패:', logError);
    } else {
      logId = logEntry.id;
      console.log('삭제 로그 시작 기록:', logId);
    }
    
    // 삭제 진행률 표시
    toast.info('삭제 중...', `${leadIdsToDelete.length}개 데이터 삭제 중입니다.`, {
      duration: 0
    });
    
    // 배치 처리로 삭제 (50개씩) - 개선된 버전
    const BATCH_SIZE = 50;
    let totalDeleted = 0;
    let failedIds: string[] = [];

    for (let i = 0; i < leadIdsToDelete.length; i += BATCH_SIZE) {
      const batch = leadIdsToDelete.slice(i, i + BATCH_SIZE);
      
      try {
        // 1. 삭제 전 존재하는 리드만 확인
        const { data: existingLeads, error: checkError } = await supabase
          .from('lead_pool')
          .select('id')
          .in('id', batch);

        if (checkError) {
          console.error('리드 존재 확인 실패:', checkError);
          failedIds.push(...batch);
          continue;
        }

        const existingIds = existingLeads?.map(lead => lead.id) || [];
        if (existingIds.length === 0) {
          console.log('삭제할 리드가 이미 존재하지 않음:', batch);
          continue;
        }

        // 2. lead_assignments 삭제 (실제 존재하는 리드만)
        const { error: assignmentError } = await supabase
          .from('lead_assignments')
          .delete()
          .in('lead_id', existingIds);

        if (assignmentError) {
          console.error('배정 기록 삭제 실패:', assignmentError);
        }
        
        // 3. lead_pool 삭제 (실제 존재하는 리드만)
        const { data: deletedLeads, error: deleteError } = await supabase
          .from('lead_pool')
          .delete()
          .in('id', existingIds)
          .select('id'); // 실제 삭제된 ID 반환

        if (deleteError) {
          console.error('리드 삭제 실패:', deleteError);
          failedIds.push(...existingIds);
        } else {
          // 실제 삭제된 개수만 카운트
          const actualDeletedCount = deletedLeads?.length || 0;
          totalDeleted += actualDeletedCount;
          
          console.log(`배치 ${i/BATCH_SIZE + 1}: ${actualDeletedCount}/${existingIds.length}개 삭제 완료`);
        }

      } catch (error) {
        console.error('배치 삭제 중 오류:', error);
        failedIds.push(...batch);
      }
    }

    // 실패한 삭제가 있으면 경고
    if (failedIds.length > 0) {
      console.warn('삭제 실패한 리드 ID:', failedIds);
      toast.warning('일부 삭제 실패', `${failedIds.length}개 리드 삭제 중 오류가 발생했습니다.`);
    }

    // 성공 로그 업데이트
    if (logId) {
      await supabase
        .from('deletion_logs')
        .update({ 
          deleted_count: totalDeleted,
          reason: `${deleteReason} - 완료`,
          additional_info: {
            mode: bulkDeleteMode,
            filter_applied: filters.statuses.length > 0 || searchTerm.length > 0,
            total_filtered: filteredLeads.length,
            completed_at: new Date().toISOString(),
            user_agent: navigator.userAgent
          }
        })
        .eq('id', logId);
    }
    
    toast.success(
      '삭제 완료', 
      `${totalDeleted}개의 리드가 삭제되었습니다.`
    );
    
    setSelectedLeads(new Set());
    setShowBulkDeleteModal(false);
    setBulkDeleteCount('');

    // 데이터 새로고침 (통계는 자동으로 재계산됨)
    await loadAllLeads();
    
  } catch (error) {
    console.error('벌크 삭제 실패:', error);

    // 실패 로그 기록/업데이트
    const errorMessage = (error as Error)?.message || '알 수 없는 오류가 발생했습니다.';
    
    if (logId) {
      // 기존 로그 업데이트
      await supabase
        .from('deletion_logs')
        .update({ 
          reason: `삭제 실패: ${errorMessage}`,
          additional_info: {
            mode: bulkDeleteMode,
            error: errorMessage,
            failed_at: new Date().toISOString(),
            user_agent: navigator.userAgent
          }
        })
        .eq('id', logId);
    } else {
      // 새 실패 로그 생성
      await supabase
        .from('deletion_logs')
        .insert({
          table_name: 'lead_pool',
          record_ids: [],
          deleted_count: 0,
          deleted_by: user?.id || '',
          reason: `삭제 실패: ${errorMessage}`,
          additional_info: {
            mode: bulkDeleteMode,
            error: errorMessage,
            user_agent: navigator.userAgent
          }
        });
    }
    
    toast.error('삭제 실패', errorMessage);
  } finally {
    setLoading(false);
  }
};

  // 필터 적용 (의존성 배열에 따라)
  useEffect(() => {
    if (allLeads.length > 0) {
      applyFilters();
    }
  }, [applyFilters]);

  // 등급별 통계 계산
  useEffect(() => {
    calculateGradeStats();
  }, [calculateGradeStats]);

  // filteredLeads 변경 시 통계 재계산
  useEffect(() => {
    if (filteredLeads.length > 0 || allLeads.length > 0) {
      calculateFilteredStats(filteredLeads);
    }
  }, [filteredLeads, calculateFilteredStats, allLeads.length]);

  // 초기 데이터 로드
  useEffect(() => {
    if (!authLoading && user && mounted) {
      Promise.all([
        loadDepartments(),
        loadCounselors(),
        loadAllLeads()
      ]);
    }
  }, [authLoading, user, mounted]);

  if (!mounted) return null;

  // 현재 페이지 데이터
  const currentPageLeads = getCurrentPageLeads();

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className={designSystem.components.typography.h2}>고객 리드 관리 (클라이언트 필터링)</h1>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">전체 고객</p>
                <p className="text-2xl font-bold text-text-primary">{overallStats.totalLeads.toLocaleString()}</p>
              </div>
              <User className="w-8 h-8 text-accent" />
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">당월 고객</p>
                <p className="text-2xl font-bold text-blue-500">{overallStats.totalCurrentMonth.toLocaleString()}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">배정 완료</p>
                <p className="text-2xl font-bold text-success">{overallStats.totalAssigned.toLocaleString()}</p>
              </div>
              <UserCheck className="w-8 h-8 text-success" />
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">미배정</p>
                <p className="text-2xl font-bold text-warning">{overallStats.totalUnassigned.toLocaleString()}</p>
              </div>
              <UserX className="w-8 h-8 text-warning" />
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">계약완료</p>
                <p className="text-2xl font-bold text-success">{overallStats.totalContracted.toLocaleString()}</p>
              </div>
              <FileCheck className="w-8 h-8 text-success" />
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">총 매출</p>
                <p className="text-xl font-bold text-accent">
                  {overallStats.totalRevenue > 0 
                    ? `${(overallStats.totalRevenue / 10000).toFixed(0)}만원`
                    : '0원'
                  }
                </p>
              </div>
              <businessIcons.analytics className="w-8 h-8 text-accent" />
            </div>
          </div>
        </div>

        {/* 필터 섹션 */}
        <div className="mb-6">
          {/* 팀별/영업사원별 필터 */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-text-secondary text-sm">팀별 조회:</span>
              <div className="relative">
                <button
                  onClick={() => {
                    const dropdown = document.getElementById('department-dropdown');
                    if (dropdown) {
                      dropdown.classList.toggle('hidden');
                    }
                  }}
                  className="department-filter-button px-2 py-1.5 text-sm border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent min-w-32 text-left flex items-center justify-between"
                >
                  <span>
                    {filters.departments.length === 0
                      ? '전체 팀'
                      : filters.departments.length === 1
                        ? filters.departments[0]
                        : `${filters.departments.length}개 팀 선택됨`
                    }
                  </span>
                  <ChevronRight className="w-3 h-3 transform rotate-90" />
                </button>
                <div
                  id="department-dropdown"
                  className="hidden absolute top-full left-0 mt-1 bg-bg-primary border border-border-primary rounded-lg shadow-lg z-20 min-w-40 max-h-48 overflow-y-auto"
                >
                  <div className="p-2 space-y-1">
                    <label className="flex items-center gap-2 p-1.5 hover:bg-bg-hover rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.departments.length === 0}
                        onChange={() => {
                          setFilters(prev => ({...prev, departments: [], counselorId: ''}));
                        }}
                        className="w-3 h-3 text-accent bg-bg-primary border-border-primary rounded focus:ring-accent"
                      />
                      <span className="text-sm text-text-primary">전체 팀</span>
                    </label>
                    {departments.map(dept => (
                      <label key={dept} className="flex items-center gap-2 p-1.5 hover:bg-bg-hover rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.departments.includes(dept)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters(prev => ({
                                ...prev,
                                departments: [...prev.departments, dept],
                                counselorId: ''
                              }));
                            } else {
                              setFilters(prev => ({
                                ...prev,
                                departments: prev.departments.filter(d => d !== dept),
                                counselorId: ''
                              }));
                            }
                          }}
                          className="w-3 h-3 text-accent bg-bg-primary border-border-primary rounded focus:ring-accent"
                        />
                        <span className="text-sm text-text-primary">{dept}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-text-secondary text-sm">영업사원별:</span>
              <select
                value={filters.counselorId}
                onChange={(e) => setFilters(prev => ({...prev, counselorId: e.target.value}))}
                className="px-2 py-1.5 text-sm border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">전체 영업사원</option>
                {counselors
                  .filter(c => filters.departments.length === 0 || filters.departments.includes(c.department))
                  .map(counselor => (
                    <option key={counselor.id} value={counselor.id}>
                      {counselor.full_name} ({counselor.department})
                    </option>
                  ))
                }
              </select>
            </div>

            {/* 데이터 생성일 필터 */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-text-secondary text-sm">생성일:</span>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({...prev, startDate: e.target.value}))}
                  className="px-2 py-1.5 text-sm border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <span className="text-text-secondary">~</span>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({...prev, endDate: e.target.value}))}
                  className="px-2 py-1.5 text-sm border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                />
                {(filters.startDate || filters.endDate) && (
                  <button
                    onClick={() => setFilters(prev => ({...prev, startDate: '', endDate: ''}))}
                    className="text-xs text-accent hover:text-accent/80 underline"
                  >
                    초기화
                  </button>
                )}
              </div>
              
              {/* 빠른 날짜 선택 버튼 */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const today = new Date();
                    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                    setFilters(prev => ({...prev, startDate: todayStr, endDate: todayStr}));
                  }}
                  className="px-2 py-1 text-xs bg-bg-secondary text-text-primary rounded hover:bg-bg-hover transition-colors"
                >
                  당일
                </button>
                <button
                  onClick={() => {
                    const now = new Date();
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    const startStr = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}-${String(startOfMonth.getDate()).padStart(2, '0')}`;
                    const endStr = `${endOfMonth.getFullYear()}-${String(endOfMonth.getMonth() + 1).padStart(2, '0')}-${String(endOfMonth.getDate()).padStart(2, '0')}`;
                    setFilters(prev => ({...prev, startDate: startStr, endDate: endStr}));
                  }}
                  className="px-2 py-1 text-xs bg-bg-secondary text-text-primary rounded hover:bg-bg-hover transition-colors"
                >
                  당월
                </button>
                <button
                  onClick={() => {
                    const now = new Date();
                    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                    const startStr = `${startOfLastMonth.getFullYear()}-${String(startOfLastMonth.getMonth() + 1).padStart(2, '0')}-${String(startOfLastMonth.getDate()).padStart(2, '0')}`;
                    const endStr = `${endOfLastMonth.getFullYear()}-${String(endOfLastMonth.getMonth() + 1).padStart(2, '0')}-${String(endOfLastMonth.getDate()).padStart(2, '0')}`;
                    setFilters(prev => ({...prev, startDate: startStr, endDate: endStr}));
                  }}
                  className="px-2 py-1 text-xs bg-bg-secondary text-text-primary rounded hover:bg-bg-hover transition-colors"
                >
                  전월
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                loadAllLeads();
              }}
              disabled={loading}
              className={designSystem.utils.cn(
                designSystem.components.button.secondary,
                "px-4 py-2"
              )}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </button>
          </div>
        </div>

        {/* 등급 필터 버튼 그룹 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-text-secondary" />
            <span className="text-sm font-medium text-text-primary">등급 필터</span>
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
            {/* 미분류 버튼 */}
            <button
              onClick={() => toggleGradeFilter('미분류')}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                filters.statuses.includes('미분류')
                  ? 'bg-bg-secondary border-accent text-accent font-medium'
                  : 'bg-bg-primary border-border-primary text-text-secondary hover:border-accent/50'
              }`}
            >
              미분류
            </button>

            {/* 등급 버튼들 */}
            {gradeOptions.map(grade => (
              <button
                key={grade.value}
                onClick={() => toggleGradeFilter(grade.value)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                  filters.statuses.includes(grade.value)
                    ? 'text-white font-medium border-transparent'
                    : 'bg-bg-primary border-border-primary text-text-secondary hover:border-accent/50'
                }`}
                style={filters.statuses.includes(grade.value) ? {
                  backgroundColor: grade.color,
                  borderColor: grade.color
                } : {}}
              >
                {grade.label}
              </button>
            ))}
          </div>
        </div>

        {/* 제목과 검색 영역 */}
        <div className="flex items-center justify-between mb-3">
  <div className="flex items-center gap-2">
    <businessIcons.team className="w-3 h-3 text-accent" />
    <h3 className="text-xs font-medium text-text-primary">고객 리드 목록</h3>
    <span className="text-xs text-text-secondary px-1.5 py-0.5 bg-bg-secondary rounded">
      필터링: {filteredLeads.length.toLocaleString()}명 / 전체: {allLeads.length.toLocaleString()}명
    </span>
    {loading && (
      <span className="text-xs text-accent animate-pulse">로딩 중...</span>
    )}
  </div>
  
  <div className="flex items-center gap-2">
{/* 벌크 등급 설정 버튼 */}
      <button
        onClick={handleBulkGrade}
        className={`px-3 py-1 text-xs ${
          selectedLeads.size > 0
            ? 'bg-success text-white'
            : 'bg-accent text-white'
        } rounded hover:opacity-90 flex items-center gap-1 font-medium`}
      >
        <Tag className="w-3 h-3" />
        {selectedLeads.size > 0
          ? `${selectedLeads.size}개 등급설정`
          : '벌크 등급설정'
        }
      </button>

{/* 벌크 삭제 버튼 - 항상 표시 */}
      <button
  onClick={handleBulkDelete}
  className={`px-3 py-1 text-xs ${
    selectedLeads.size > 0
      ? 'bg-error text-white'
      : 'bg-warning text-white'
  } rounded hover:opacity-90 flex items-center gap-1 font-medium`}
>
  <Trash2 className="w-3 h-3" />
  {selectedLeads.size > 0
    ? `${selectedLeads.size}개 삭제`
    : '벌크 삭제'
  }
</button>

    {/* 리드 추가 버튼 - 이 부분 추가 */}
    <button
      onClick={() => setShowAddLeadModal(true)}
      className="px-3 py-1 text-xs bg-accent text-white rounded hover:bg-accent/90 flex items-center gap-1 font-medium"
    >
      <Plus className="w-3 h-3" />
      리드 추가
    </button>
    
    {/* 기존 검색 입력 */}
    <div className="relative">
      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-text-secondary" />
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="고객명, 전화번호, DB출처로 검색..."
        className="pl-7 pr-3 py-1 w-48 text-xs border border-border-primary rounded bg-bg-primary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent"
      />
    </div>
  </div>
</div>

        {/* 고객 리드 테이블 */}
        <div className="bg-bg-primary border border-border-primary rounded-lg overflow-hidden">
          {currentPageLeads.length > 0 ? (
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
                          {selectedLeads.size === currentPageLeads.length && currentPageLeads.length > 0 ? (
                            <CheckSquare className="w-3 h-3 text-accent" />
                          ) : (
                            <Square className="w-3 h-3 text-text-tertiary" />
                          )}
                        </button>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-16 cursor-pointer hover:bg-bg-hover transition-colors"
                          onClick={() => handleSort('data_date')}>
                        <div className="flex items-center justify-center gap-0.5">
                          <Calendar className="w-3 h-3" />
                          데이터 생성일{renderSortIcon('data_date')}
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-24 cursor-pointer hover:bg-bg-hover transition-colors"
                          onClick={() => handleSort('counselor_name')}>
                        <div className="flex items-center justify-center gap-0.5">
                          <UserCheck className="w-3 h-3" />
                          영업사원{renderSortIcon('counselor_name')}
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-16 cursor-pointer hover:bg-bg-hover transition-colors"
                          onClick={() => handleSort('assigned_at')}>
                        <div className="flex items-center justify-center gap-0.5">
                          <Calendar className="w-3 h-3" />
                          배정일{renderSortIcon('assigned_at')}
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-20 cursor-pointer hover:bg-bg-hover transition-colors"
                          onClick={() => handleSort('data_source')}>
                        <div className="flex items-center justify-center gap-0.5">
                          <Building className="w-3 h-3" />
                          DB출처{renderSortIcon('data_source')}
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-24">
                        <div className="flex items-center justify-center gap-0.5">
                          <businessIcons.assignment className="w-3 h-3" />
                          등급
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-20 cursor-pointer hover:bg-bg-hover transition-colors"
                          onClick={() => handleSort('real_name')}>
                        <div className="flex items-center justify-center gap-0.5">
                          <User className="w-3 h-3" />
                          고객명{renderSortIcon('real_name')}
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-20 cursor-pointer hover:bg-bg-hover transition-colors"
                          onClick={() => handleSort('phone')}>
                        <div className="flex items-center justify-center gap-0.5">
                          <Phone className="w-3 h-3" />
                          전화번호{renderSortIcon('phone')}
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-24">
                        <div className="flex items-center justify-center gap-0.5">
                          <MessageSquare className="w-3 h-3" />
                          관심분야
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-28">
                        <div className="flex items-center justify-center gap-0.5">
                          <businessIcons.message className="w-3 h-3" />
                          상담메모
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-10">
                        <div className="flex items-center justify-center gap-0.5">
                          <businessIcons.phone className="w-3 h-3" />
                          <span className="leading-tight">횟수</span>
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-16">
                        <div className="flex items-center justify-center gap-0.5">
                          <businessIcons.date className="w-3 h-3" />
                          최근상담
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-20">
                        <div className="flex items-center justify-center gap-0.5">
                          <businessIcons.script className="w-3 h-3" />
                          계약금액
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-12">
                        <div className="flex items-center justify-center gap-0.5">
                          <businessIcons.contact className="w-3 h-3" />
                          액션
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPageLeads.map((lead) => (
                      <tr key={lead.id} className="border-b border-border-primary hover:bg-bg-hover transition-colors">
                        {/* 선택 체크박스 */}
                        <td className="py-1 px-1 text-center">
                          <button
                            onClick={() => toggleSelectLead(lead.id)}
                            className="flex items-center justify-center w-3 h-3 mx-auto"
                          >
                            {selectedLeads.has(lead.id) ? (
                              <CheckSquare className="w-3 h-3 text-accent" />
                            ) : (
                              <Square className="w-3 h-3 text-text-tertiary" />
                            )}
                          </button>
                        </td>

                        {/* 데이터 생성일 */}
                        <td className="py-1 px-1 text-center">
                          <span className="text-text-secondary text-xs whitespace-nowrap">
                            {lead.data_date ? new Date(lead.data_date).toLocaleDateString('ko-KR', {
                              month: '2-digit',
                              day: '2-digit'
                            }) : '-'}
                          </span>
                        </td>

                        {/* 영업사원 */}
                        <td className="py-1 px-1 text-center">
                          <div className="w-24 mx-auto">
                            {lead.counselor_name ? (
                              <div className="text-xs flex items-center justify-center gap-1">
                                <div className="w-1.5 h-1.5 bg-success rounded-full flex-shrink-0"></div>
                                <span className="text-success font-medium truncate">
                                  {lead.counselor_name}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <div className="w-1.5 h-1.5 bg-text-tertiary rounded-full"></div>
                                <span className="text-text-tertiary text-xs">미배정</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 배정일 */}
                        <td className="py-1 px-1 text-center">
                          <span className="text-text-secondary text-xs whitespace-nowrap">
                            {lead.assigned_at ? new Date(lead.assigned_at).toLocaleDateString('ko-KR', {
                              month: '2-digit',
                              day: '2-digit'
                            }) : '-'}
                          </span>
                        </td>

                        {/* DB출처 */}
                        <td className="py-1 px-1 text-center">
                          <div className="w-20 mx-auto">
                            <span className="text-text-primary text-xs truncate font-medium">
                              {lead.data_source || '-'}
                            </span>
                          </div>
                        </td>

                        {/* 회원등급 */}
                        <td className="py-1 px-1 text-center">
                          <div className="w-24 mx-auto">
                            {inlineEdit?.leadId === lead.id && inlineEdit.field === 'grade' ? (
                              <select
                                value={(() => {
                                  if (lead.additional_data) {
                                    const additionalData = typeof lead.additional_data === 'string'
                                      ? JSON.parse(lead.additional_data)
                                      : lead.additional_data;
                                    return additionalData?.grade || '미분류';
                                  }
                                  return '미분류';
                                })()}
                                onChange={(e) => handleGradeUpdate(lead.id, e.target.value)}
                                onBlur={() => setInlineEdit(null)}
                                autoFocus
                                className="w-full text-xs h-6 px-2 bg-bg-primary text-text-primary border border-accent rounded focus:outline-none focus:ring-2 focus:ring-accent-light"
                              >
                                <option value="미분류">미분류</option>
                                {gradeOptions.map(option => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <button
                                onClick={() => setInlineEdit({ leadId: lead.id, field: 'grade', value: '' })}
                                className="w-full hover:bg-bg-hover rounded transition-colors"
                                title="등급 변경하기"
                              >
                                {renderGradeBadge(lead.additional_data)}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 고객명 */}
                        <td className="py-1 px-1 text-center">
                          <div className="w-20 mx-auto">
                            <div className="text-xs whitespace-nowrap truncate">
                              {lead.actual_customer_name ? (
                                <span className="text-text-primary font-medium">{lead.actual_customer_name}</span>
                              ) : lead.real_name ? (
                                <span className="text-text-primary">{lead.real_name}</span>
                              ) : lead.contact_name ? (
                                <span className="text-text-secondary">{lead.contact_name}</span>
                              ) : (
                                <span className="text-text-tertiary">미확인</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 전화번호 */}
                        <td className="py-1 px-1 text-center">
                          <div className="font-mono text-text-primary font-medium text-xs truncate">
                            {maskPhoneNumber(lead.phone)}
                          </div>
                        </td>

                        {/* 관심분야 */}
                        <td className="py-1 px-1 text-center relative">
                          <div className="w-24 group mx-auto">
                            {lead.contact_script ? (
                              <>
                                <div className="text-text-primary text-xs truncate cursor-help px-1">
                                  {lead.contact_script}
                                </div>
                                <div className="absolute left-0 top-full mt-1 p-2 bg-black/90 text-white text-xs rounded shadow-lg z-20 max-w-80 break-words opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                  {lead.contact_script}
                                </div>
                              </>
                            ) : (
                              <span className="text-text-tertiary text-xs">미확인</span>
                            )}
                          </div>
                        </td>

                        {/* 상담메모 */}
                        <td className="py-1 px-1 text-center relative">
                          <div className="w-28 mx-auto">
                            {lead.assignment_id ? (
                              <button
                                onClick={() => openMemoHistoryModal(lead)}
                                className="group w-full text-left hover:bg-bg-hover rounded px-1 transition-colors"
                                title="메모 히스토리 보기"
                              >
                                {lead.counseling_memo ? (
                                  <div className="text-text-primary text-xs truncate cursor-pointer">
                                    📝 {lead.counseling_memo}
                                  </div>
                                ) : (
                                  <span className="text-text-tertiary text-xs">📝 메모보기</span>
                                )}
                              </button>
                            ) : (
                              <span className="text-text-tertiary text-xs">-</span>
                            )}
                          </div>
                        </td>

                        {/* 상담 횟수 */}
                        <td className="py-1 px-1 text-center">
                          <span className="font-medium text-text-primary text-xs">
                            {lead.call_attempts || 0}
                          </span>
                        </td>

                        {/* 최근 상담 */}
                        <td className="py-1 px-1 text-center">
                          <span className="text-text-secondary text-xs whitespace-nowrap">
                            {lead.last_contact_date 
                              ? new Date(lead.last_contact_date).toLocaleDateString('ko-KR', {
                                  month: '2-digit',
                                  day: '2-digit'
                                })
                              : '-'
                            }
                          </span>
                        </td>

                        {/* 계약금액 */}
                        <td className="py-1 px-1 text-center">
                          {lead.contract_amount ? (
                            <span className="font-medium text-success text-xs">
                              {(lead.contract_amount / 10000).toFixed(0)}만
                            </span>
                          ) : (
                            <span className="text-text-tertiary text-xs">-</span>
                          )}
                        </td>

                        {/* 액션 */}
                        <td className="py-1 px-1 text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            <button
                              onClick={() => setEditingLead(lead)}
                              className="p-0.5 text-text-tertiary hover:text-accent transition-colors"
                              title="전체 정보 수정"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="p-3 border-t border-border-primary bg-bg-secondary">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-text-secondary">
                      총 {filteredLeads.length.toLocaleString()}개 중 {((currentPage - 1) * pageSize + 1).toLocaleString()}-{Math.min(currentPage * pageSize, filteredLeads.length).toLocaleString()}개 표시 (페이지당 {pageSize}개)
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
              <User className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">
                {loading ? '데이터 로드 중...' : filteredLeads.length === 0 && allLeads.length > 0 ? '필터 조건에 맞는 결과가 없습니다' : '데이터가 없습니다'}
              </h3>
              <p className="text-text-secondary">
                {loading ? '잠시만 기다려주세요.' : filteredLeads.length === 0 && allLeads.length > 0 ? '필터 조건을 변경해보세요.' : '새로운 고객 데이터를 업로드해주세요.'}
              </p>
            </div>
          )}
        </div>

        {/* 리드 추가 모달 */}
        {showAddLeadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-bg-primary border border-border-primary rounded-xl w-full max-w-md mx-auto">
              <div className="p-6 border-b border-border-primary">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-text-primary">리드 수동 추가</h3>
                  <button
                    onClick={() => setShowAddLeadModal(false)}
                    className="p-1 hover:bg-bg-hover rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-text-secondary" />
                  </button>
                </div>
                <p className="text-sm text-text-secondary mt-1">
                  전화번호와 DB출처를 입력하세요.
                </p>
              </div>

              <form onSubmit={handleAddLead} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-text-primary">
                    전화번호 <span className="text-error">*</span>
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    required
                    pattern="[0-9]{3}-[0-9]{3,4}-[0-9]{4}"
                    placeholder="010-0000-0000"
                    className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <p className="text-xs text-text-secondary mt-1">형식: 010-0000-0000</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-text-primary">
                    DB출처 <span className="text-error">*</span>
                  </label>
                  <input
                    name="data_source"
                    type="text"
                    required
                    placeholder="DB출처를 입력하세요 (예: 네이버광고, 카카오광고, 수동입력 등)"
                    className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-text-primary">
                    관심분야
                  </label>
                  <textarea
                    name="contact_script"
                    rows={3}
                    placeholder="고객의 관심분야나 문의내용을 입력하세요"
                    className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border-primary">
                  <button
                    type="button"
                    onClick={() => setShowAddLeadModal(false)}
                    disabled={addingLead}
                    className="px-4 py-2 bg-bg-secondary text-text-primary rounded-lg hover:bg-bg-hover transition-colors disabled:opacity-50"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={addingLead}
                    className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {addingLead ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        추가 중...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        추가
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 전체 정보 수정 모달 */}
        {editingLead && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-bg-primary border border-border-primary rounded-xl w-full max-w-2xl mx-auto">
              <div className="p-6 border-b border-border-primary">
                <h3 className="text-lg font-semibold text-text-primary">고객 정보 수정</h3>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  
                  const dataDateValue = formData.get('data_date') as string;
                  const updatedLead = {
                    phone: formData.get('phone') as string,
                    contact_name: formData.get('contact_name') as string,
                    data_source: formData.get('data_source') as string,
                    contact_script: formData.get('contact_script') as string,
                    extra_info: formData.get('extra_info') as string,
                    data_date: dataDateValue || null,
                  };
                  
                  supabase
                    .from('lead_pool')
                    .update(updatedLead)
                    .eq('id', editingLead.id)
                    .then(({ error }) => {
                      if (error) {
                        toast.error('수정 실패', error.message);
                      } else {
                        toast.success('수정 완료', '고객 정보가 수정되었습니다.');
                        setEditingLead(null);
                        loadAllLeads(); // 전체 데이터 다시 로드
                      }
                    });
                }}
                className="p-6 space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-text-primary">전화번호 *</label>
                    <input
                      name="phone"
                      type="tel"
                      defaultValue={editingLead.phone}
                      required
                      className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-text-primary">고객명</label>
                    <input
                      name="contact_name"
                      type="text"
                      defaultValue={editingLead.contact_name}
                      className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-text-primary">데이터 출처</label>
                  <input
                    name="data_source"
                    type="text"
                    defaultValue={editingLead.data_source || ''}
                    className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-text-primary">관심분야</label>
                  <textarea
                    name="contact_script"
                    defaultValue={editingLead.contact_script || ''}
                    rows={3}
                    className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-text-primary">기타 정보</label>
                  <textarea
                    name="extra_info"
                    defaultValue={editingLead.extra_info || ''}
                    rows={2}
                    className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-text-primary">데이터 생성일</label>
                  <input
                    name="data_date"
                    type="date"
                    defaultValue={editingLead.data_date ? new Date(editingLead.data_date).toISOString().slice(0, 10) : ''}
                    className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <p className="text-xs text-text-tertiary mt-1">
                    고객 데이터가 실제로 생성된 날짜를 수정할 수 있습니다.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingLead(null)}
                    className="px-4 py-2 bg-bg-secondary text-text-primary rounded-lg hover:bg-bg-hover transition-colors"
                  >
                    취소
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
                  >
                    저장
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 벌크 등급 설정 모달 */}
        {showBulkGradeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-bg-primary border border-border-primary rounded-xl w-full max-w-md mx-auto">
              <div className="p-6 border-b border-border-primary">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                    <Tag className="w-5 h-5 text-accent" />
                    벌크 등급 설정
                  </h3>
                  <button
                    onClick={() => {
                      setShowBulkGradeModal(false);
                      setBulkGradeValue('');
                      setBulkGradeCount('');
                    }}
                    className="p-1 hover:bg-bg-hover rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-text-secondary" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* 등급 선택 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-3 text-text-primary">
                    설정할 등급 선택 <span className="text-error">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {gradeOptions.map(grade => (
                      <button
                        key={grade.value}
                        onClick={() => setBulkGradeValue(grade.value)}
                        className={`px-3 py-2 text-xs rounded-lg border transition-all text-left ${
                          bulkGradeValue === grade.value
                            ? 'text-white font-medium border-transparent'
                            : 'bg-bg-primary border-border-primary text-text-secondary hover:border-accent/50'
                        }`}
                        style={bulkGradeValue === grade.value ? {
                          backgroundColor: grade.color,
                          borderColor: grade.color
                        } : {}}
                      >
                        {grade.label}
                      </button>
                    ))}
                  </div>
                </div>

                {bulkGradeMode === 'selected' ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                      <p className="text-sm text-text-primary mb-2">
                        선택한 <span className="font-bold text-accent">{selectedLeads.size}개</span>의 리드 등급을 설정하시겠습니까?
                      </p>
                      {bulkGradeValue && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-text-secondary">설정될 등급:</span>
                          <span
                            className="px-2 py-1 text-xs text-white font-medium rounded"
                            style={{ backgroundColor: gradeOptions.find(g => g.value === bulkGradeValue)?.color || '#6b7280' }}
                          >
                            {bulkGradeValue}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="text-center">
                      <button
                        onClick={() => {
                          setBulkGradeMode('count');
                          setSelectedLeads(new Set());
                        }}
                        className="text-xs text-accent hover:underline"
                      >
                        숫자로 입력하여 설정하기
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-text-primary">
                        등급 설정할 리드 개수 입력
                      </label>
                      <input
                        type="number"
                        value={bulkGradeCount}
                        onChange={(e) => setBulkGradeCount(e.target.value)}
                        placeholder="설정할 개수를 입력하세요"
                        min="1"
                        max={filteredLeads.length}
                        className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                      <p className="text-xs text-text-secondary mt-1">
                        필터링된 전체 {filteredLeads.length.toLocaleString()}개 중에서 상위 {bulkGradeCount || 'N'}개의 등급이 설정됩니다.
                      </p>
                    </div>

                    {bulkGradeCount && parseInt(bulkGradeCount) > 0 && bulkGradeValue && (
                      <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                        <p className="text-sm text-text-primary mb-2">
                          필터링된 전체 데이터에서 상위 <span className="font-bold text-accent">
                            {Math.min(parseInt(bulkGradeCount), filteredLeads.length)}개
                          </span>의 리드 등급이 설정됩니다.
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-text-secondary">설정될 등급:</span>
                          <span
                            className="px-2 py-1 text-xs text-white font-medium rounded"
                            style={{ backgroundColor: gradeOptions.find(g => g.value === bulkGradeValue)?.color || '#6b7280' }}
                          >
                            {bulkGradeValue}
                          </span>
                        </div>
                      </div>
                    )}

                    {selectedLeads.size > 0 && (
                      <div className="text-center">
                        <button
                          onClick={() => setBulkGradeMode('selected')}
                          className="text-xs text-accent hover:underline"
                        >
                          선택한 항목으로 전환 ({selectedLeads.size}개)
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border-primary">
                  <button
                    onClick={() => {
                      setShowBulkGradeModal(false);
                      setBulkGradeValue('');
                      setBulkGradeCount('');
                    }}
                    disabled={loading}
                    className="px-4 py-2 bg-bg-secondary text-text-primary rounded-lg hover:bg-bg-hover transition-colors disabled:opacity-50"
                  >
                    취소
                  </button>
                  <button
                    onClick={executeBulkGrade}
                    disabled={
                      loading ||
                      !bulkGradeValue ||
                      (bulkGradeMode === 'count' && (!bulkGradeCount || parseInt(bulkGradeCount) <= 0)) ||
                      (bulkGradeMode === 'selected' && selectedLeads.size === 0)
                    }
                    className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        설정 중...
                      </>
                    ) : (
                      <>
                        <Tag className="w-4 h-4" />
                        등급 설정
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 벌크 삭제 모달 */}
{showBulkDeleteModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-bg-primary border border-border-primary rounded-xl w-full max-w-md mx-auto">
      <div className="p-6 border-b border-border-primary">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            벌크 삭제 확인
          </h3>
          <button
            onClick={() => {
              setShowBulkDeleteModal(false);
              setBulkDeleteCount('');
            }}
            className="p-1 hover:bg-bg-hover rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>
      </div>

      <div className="p-6">
        {bulkDeleteMode === 'selected' ? (
          <div className="space-y-4">
            <div className="p-4 bg-error/10 border border-error/20 rounded-lg">
              <p className="text-sm text-text-primary mb-2">
                선택한 <span className="font-bold text-error">{selectedLeads.size}개</span>의 리드를 삭제하시겠습니까?
              </p>
              <p className="text-xs text-text-secondary">
                이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
            
            <div className="text-center">
              <button
                onClick={() => {
                  setBulkDeleteMode('count');
                  setSelectedLeads(new Set());
                }}
                className="text-xs text-accent hover:underline"
              >
                숫자로 입력하여 삭제하기
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-text-primary">
                삭제할 리드 개수 입력
              </label>
              <input
  type="number"
  value={bulkDeleteCount}
  onChange={(e) => setBulkDeleteCount(e.target.value)}
  placeholder="삭제할 개수를 입력하세요"
  min="1"
  max={filteredLeads.length} // 전체 필터링 데이터 개수로 변경
  className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
/>
<p className="text-xs text-text-secondary mt-1">
  필터링된 전체 {filteredLeads.length.toLocaleString()}개 중에서 상위 {bulkDeleteCount || 'N'}개가 삭제됩니다.
</p>
            </div>
            
{bulkDeleteCount && parseInt(bulkDeleteCount) > 0 && (
  <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
    <p className="text-sm text-text-primary">
      필터링된 전체 데이터에서 상위 <span className="font-bold text-warning">
        {Math.min(parseInt(bulkDeleteCount), filteredLeads.length)}개
      </span>의 리드가 삭제됩니다.
    </p>
  </div>
)}
            
            {selectedLeads.size > 0 && (
              <div className="text-center">
                <button
                  onClick={() => setBulkDeleteMode('selected')}
                  className="text-xs text-accent hover:underline"
                >
                  선택한 항목 삭제로 전환 ({selectedLeads.size}개)
                </button>
              </div>
            )}
          </div>
        )}
        
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border-primary">
          <button
            onClick={() => {
              setShowBulkDeleteModal(false);
              setBulkDeleteCount('');
            }}
            disabled={loading}
            className="px-4 py-2 bg-bg-secondary text-text-primary rounded-lg hover:bg-bg-hover transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={executeBulkDelete}
            disabled={
              loading || 
              (bulkDeleteMode === 'count' && (!bulkDeleteCount || parseInt(bulkDeleteCount) <= 0))
            }
            className="px-4 py-2 bg-error text-white rounded-lg hover:bg-error/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                삭제 중...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                삭제 확인
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  </div>
)}

        {/* 메모 히스토리 모달 */}
        {showMemoHistoryModal && selectedLeadForMemo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-bg-primary border border-border-primary rounded-xl w-full max-w-2xl mx-auto max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b border-border-primary">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">상담 메모 히스토리</h3>
                    <p className="text-sm text-text-secondary mt-1">
                      {selectedLeadForMemo.actual_customer_name || selectedLeadForMemo.real_name || selectedLeadForMemo.contact_name || '고객'} ({selectedLeadForMemo.phone})
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowMemoHistoryModal(false);
                      setSelectedLeadForMemo(null);
                      setMemoHistory([]);
                    }}
                    className="p-1 hover:bg-bg-hover rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-text-secondary" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {loadingMemoHistory ? (
                  <div className="text-center py-8">
                    <RefreshCw className="w-8 h-8 text-accent mx-auto mb-2 animate-spin" />
                    <p className="text-text-secondary">메모 히스토리를 불러오는 중...</p>
                  </div>
                ) : memoHistory.length > 0 ? (
                  <div className="space-y-4">
                    {memoHistory.map((memo, index) => (
                      <div key={memo.id} className="bg-bg-secondary rounded-lg p-4 border border-border-primary">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <span className="bg-accent text-white px-2 py-1 rounded text-xs font-medium">
                              #{memoHistory.length - index}
                            </span>
                            <span className="text-text-secondary text-sm">
                              {memo.created_by_name}
                            </span>
                          </div>
                          <span className="text-text-tertiary text-sm">
                            {new Date(memo.created_at).toLocaleString('ko-KR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="text-text-primary whitespace-pre-wrap leading-relaxed">
                          {memo.memo}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-text-primary mb-2">메모가 없습니다</h3>
                    <p className="text-text-secondary">아직 상담 메모가 기록되지 않았습니다.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default function AdminLeadsPage() {
  return (
    <ProtectedRoute requiredPermission="leads">
      <AdminLeadsPageContent />
    </ProtectedRoute>
  );
}