'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { designSystem } from '@/lib/design-system';
import { businessIcons } from '@/lib/design-system/icons';
import { supabase, leadAssignmentService, leadPoolService } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import { useToastHelpers } from '@/components/ui/Toast';
import { departmentPermissionService } from '@/lib/services/departmentPermissions';
import { 
  RefreshCw, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  CheckSquare,
  Square,
  Phone,
  User,
  Calendar,
  MessageSquare,
  Building,
  FileText,
  UserCheck,
  UserX,
  AlertTriangle,
  X
} from 'lucide-react';

interface Lead {
  id: string;
  phone: string;
  contact_name: string;
  real_name?: string;
  data_source: string;
  contact_script: string;
  data_date: string;
  created_at: string;
  batch_name: string;
  upload_batch_id: string;
}

interface Counselor {
  id: string;
  full_name: string;
  email: string;
  department: string;
  assigned_count: number;
  active_count: number;
  completed_count: number;
}

interface Assignment {
  id: string;
  lead_id: string;
  counselor_id: string;
  assigned_at: string;
  status: string;
  lead: Lead & {
    assignment_id?: string;
    counselor_name?: string;
    latest_contact_result?: string;
    contract_status?: string;
    contract_amount?: number;
    last_contact_date?: string;
    counseling_memo?: string;
    actual_customer_name?: string;
    call_attempts?: number;
    customer_grade?: {
      grade: string;
      grade_color: string;
    };
  };
  counselor: Counselor;
}

function AssignmentsPageContent() {
  const { user, userProfile, hasPermission, isSuperAdmin } = useAuth();
  const toast = useToastHelpers();
  
  // 기본 데이터 상태
  const [availableLeads, setAvailableLeads] = useState<Lead[]>([]);
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'assign' | 'manage'>('assign');
  
  // 통계 상태 추가
  const [totalLeadsInDB, setTotalLeadsInDB] = useState(0);

  // 선택 관련 상태
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedCounselor, setSelectedCounselor] = useState<string>('');
  
  // 숫자 배정 관련 상태
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkAssignCount, setBulkAssignCount] = useState('');
  const [bulkAssignMode, setBulkAssignMode] = useState<'selected' | 'count'>('selected');
  
  // 재배정 관련 상태
  const [selectedCounselorForView, setSelectedCounselorForView] = useState<string>('');
  const [counselorAssignments, setCounselorAssignments] = useState<Assignment[]>([]);
  const [selectedAssignments, setSelectedAssignments] = useState<string[]>([]);
  const [newDepartmentForReassign, setNewDepartmentForReassign] = useState<string>('');
  const [newCounselorForReassign, setNewCounselorForReassign] = useState<string>('');
  const [loadingCounselorData, setLoadingCounselorData] = useState(false);
  
  // 숫자 재배정 관련 상태
  const [showBulkReassignModal, setShowBulkReassignModal] = useState(false);
  const [bulkReassignCount, setBulkReassignCount] = useState('');
  const [bulkReassignMode, setBulkReassignMode] = useState<'selected' | 'count'>('selected');

  // 재배정 필터 상태
  const [reassignFilters, setReassignFilters] = useState({
    contractStatus: 'all',
    selectedDepartmentForView: ''
  });

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const itemsPerPage = 300;

  // 재배정 페이지네이션 상태
  const [reassignPage, setReassignPage] = useState(1);
  const [reassignTotalCount, setReassignTotalCount] = useState(0);
  const [reassignTotalPages, setReassignTotalPages] = useState(0);
  const reassignItemsPerPage = 200;

  // 검색 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [reassignSearchTerm, setReassignSearchTerm] = useState('');
  const [debouncedReassignSearchTerm, setDebouncedReassignSearchTerm] = useState('');

  // 부서 목록 상태
  const [departments, setDepartments] = useState<string[]>([]);

  // 등급 옵션 (재배정 관리용)
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

  // 검색어 디바운싱
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedReassignSearchTerm(reassignSearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [reassignSearchTerm]);

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

  // 텍스트 하이라이트 함수
  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;
    
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('(' + escapedQuery + ')', 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-accent-light text-accent font-medium rounded px-0.5">
          {part}
        </span>
      ) : part
    );
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

  // 전체 DB 고객 수 로드 함수
  const loadTotalLeadsCount = async () => {
    try {
      let allLeads: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: batch } = await supabase
          .from('lead_pool')
          .select('id', { count: 'exact' })
          .range(from, from + batchSize - 1);
        
        if (batch && batch.length > 0) {
          allLeads = allLeads.concat(batch);
          from += batchSize;
          
          if (batch.length < batchSize) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }
      
      setTotalLeadsInDB(allLeads.length);
    } catch (error) {
      console.error('전체 고객 수 조회 실패:', error);
    }
  };

  // 부서 목록 로드
  const loadDepartments = async () => {
    try {
      const { data: departmentData, error } = await supabase
        .from('users')
        .select('department')
        .eq('role', 'counselor')
        .eq('is_active', true)
        .not('department', 'is', null);

      if (error) throw error;

      const uniqueDepartments = [...new Set(departmentData?.map(d => d.department).filter(Boolean))] as string[];
      setDepartments(uniqueDepartments.sort());
    } catch (error) {
      console.error('부서 목록 로드 실패:', error);
    }
  };

  // 영업사원 데이터 로드
  const loadCounselors = async () => {
    try {
      // 기본 쿼리 생성
      let query = supabase
        .from('users')
        .select('*')
        .eq('role', 'counselor')
        .eq('is_active', true)
        .order('department', { ascending: true })
        .order('full_name', { ascending: true });

      // 부서별 필터링 적용
      if (user?.id) {
        const accessibleDepartments = await departmentPermissionService.getAccessibleDepartments(user.id);
        
        if (!isSuperAdmin && accessibleDepartments.length > 0) {
          // 접근 가능한 부서의 영업사원만 조회
          console.log('영업사원 부서 필터링 적용:', accessibleDepartments.join(', '));
          query = query.in('department', accessibleDepartments);
        } else if (!isSuperAdmin && accessibleDepartments.length === 0) {
          // 접근 가능한 부서가 없으면 빈 결과 반환
          console.log('접근 가능한 부서 없음 - 영업사원 조회 불가');
          setCounselors([]);
          return;
        }
      }

      const { data: counselorsData, error: counselorsError } = await query;

      if (counselorsError) throw counselorsError;

      const counselorsWithStats = await Promise.all(
        (counselorsData || []).map(async (counselor) => {
          const { count: activeCount } = await supabase
            .from('lead_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('counselor_id', counselor.id)
            .eq('status', 'active');

          return {
            ...counselor,
            assigned_count: activeCount || 0,
            active_count: activeCount || 0,
            completed_count: 0
          };
        })
      );

      setCounselors(counselorsWithStats);
    } catch (error) {
      console.error('영업사원 로드 실패:', error);
      toast.error('영업사원 로드 실패', '영업사원 목록을 불러오는 중 오류가 발생했습니다.');
    }
  };

  // 사용 가능한 고객 로드
  const loadAvailableLeads = async (page: number = 1, searchQuery: string = '') => {
    try {
      console.log('=== 배정 가능 고객 로드 (배치 처리) ===');
      
      const startRange = (page - 1) * itemsPerPage;
      const endRange = startRange + itemsPerPage - 1;

      let query = supabase
        .from('lead_pool')
        .select(`
          id, phone, contact_name, data_source, contact_script,
          created_at, upload_batch_id, status, data_date, real_name
        `, { count: 'exact' })
        .eq('status', 'available')
        .order('created_at', { ascending: false });

      if (searchQuery.trim()) {
        query = query.or(`phone.ilike.%${searchQuery}%,contact_name.ilike.%${searchQuery}%,data_source.ilike.%${searchQuery}%,real_name.ilike.%${searchQuery}%`);
      }

      query = query.range(startRange, endRange);

      const { data: leadsData, error: leadsError, count } = await query;

      if (leadsError) throw leadsError;

      const uniqueBatchIds = [...new Set(leadsData?.map(lead => lead.upload_batch_id).filter(Boolean))] as string[];
      
      let batchMap: Record<string, string> = {};
      if (uniqueBatchIds.length > 0) {
        const { data: batchesData } = await supabase
          .from('upload_batches')
          .select('id, file_name')
          .in('id', uniqueBatchIds);
        
        if (batchesData) {
          batchMap = batchesData.reduce((acc, batch) => {
            acc[batch.id] = batch.file_name;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      const leadsWithBatch = (leadsData || []).map(lead => ({
        ...lead,
        batch_name: lead.upload_batch_id ? (batchMap[lead.upload_batch_id] || 'Unknown Batch') : 'No Batch'
      }));

      setAvailableLeads(leadsWithBatch);
      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      setCurrentPage(page);

      console.log(`페이지 ${page}: ${leadsWithBatch.length}개 로드, 총: ${count}개`);

    } catch (error) {
      console.error('고객 로드 실패:', error);
      toast.error('고객 로드 실패', `고객을 불러오는 중 오류가 발생했습니다: ${error.message}`);
    }
  };

  // 개선된 배정 함수 - 모달 표시
  const handleAssign = async () => {
    if (!selectedCounselor) {
      toast.warning('선택 확인', '영업사원을 선택해주세요.');
      return;
    }

    if (selectedLeads.length > 0) {
      setShowBulkAssignModal(true);
      setBulkAssignMode('selected');
    } else {
      setShowBulkAssignModal(true);
      setBulkAssignMode('count');
    }
  };

  // 실제 배정 실행 함수
  const executeBulkAssign = async () => {
    if (!selectedCounselor) {
      toast.warning('선택 확인', '영업사원을 선택해주세요.');
      return;
    }

    if (!user?.id) {
      toast.error('인증 오류', '로그인이 필요합니다.');
      return;
    }

    setActionLoading(true);
    try {
      let leadsToAssign: string[] = [];
      
      if (bulkAssignMode === 'selected') {
        leadsToAssign = selectedLeads;
      } else {
        const assignCount = parseInt(bulkAssignCount);
        if (isNaN(assignCount) || assignCount <= 0) {
          toast.warning('입력 오류', '올바른 숫자를 입력해주세요.');
          return;
        }
        
        leadsToAssign = availableLeads
          .slice(0, Math.min(assignCount, availableLeads.length))
          .map(lead => lead.id);
      }

      if (leadsToAssign.length === 0) {
        toast.warning('선택 확인', '배정할 고객이 없습니다.');
        return;
      }

      const counselorName = counselors.find(c => c.id === selectedCounselor)?.full_name;
      
      console.log(`=== 배치 배정 시작: ${leadsToAssign.length}개 ===`);

      const assignmentRecords = leadsToAssign.map(leadId => ({
        lead_id: leadId,
        counselor_id: selectedCounselor,
        assigned_by: user.id,
        assigned_at: new Date().toISOString(),
        status: 'active'
      }));

      const { error: assignError } = await supabase
        .from('lead_assignments')
        .insert(assignmentRecords);

      if (assignError) throw assignError;

      const { error: updateError } = await supabase
        .from('lead_pool')
        .update({ status: 'assigned' })
        .in('id', leadsToAssign);

      if (updateError) throw updateError;

      toast.success(
        '고객 배정 완료', 
        `${leadsToAssign.length}개의 고객이 ${counselorName} 영업사원에게 성공적으로 배정되었습니다.`,
        {
          action: {
            label: '배정 현황 보기',
            onClick: () => setActiveTab('manage')
          }
        }
      );
      
      setSelectedLeads([]);
      setSelectedDepartment('');
      setSelectedCounselor('');
      setShowBulkAssignModal(false);
      setBulkAssignCount('');
      
      await loadAvailableLeads(currentPage, debouncedSearchTerm);
      await loadCounselors();
      await loadTotalLeadsCount();

    } catch (error) {
      console.error('배정 실패:', error);
      toast.error(
        '고객 배정 실패', 
        error.message || '알 수 없는 오류가 발생했습니다.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  // 특정 영업사원의 배정 목록 로드
  const loadCounselorAssignments = async (counselorId: string, page: number = 1, searchQuery: string = '') => {
    if (!counselorId) {
      setCounselorAssignments([]);
      setReassignTotalCount(0);
      return;
    }

    setLoadingCounselorData(true);
    try {
      console.log(`=== 영업사원 ${counselorId}의 배정 목록 로드 (뷰 기반) ===`);
      
      const startRange = (page - 1) * reassignItemsPerPage;
      const endRange = startRange + reassignItemsPerPage - 1;

      let query = supabase
        .from('admin_leads_view')
        .select('*', { count: 'exact' })
        .eq('counselor_id', counselorId)
        .not('assignment_id', 'is', null)
        .order('assigned_at', { ascending: false });

      if (reassignFilters.contractStatus !== 'all') {
        if (reassignFilters.contractStatus === '미분류') {
          query = query.or('additional_data.is.null,additional_data.not.cs.{"grade"}');
        } else {
          query = query.contains('additional_data', { grade: reassignFilters.contractStatus });
        }
      }

      if (searchQuery.trim()) {
        query = query.or(`phone.ilike.%${searchQuery}%,contact_name.ilike.%${searchQuery}%,real_name.ilike.%${searchQuery}%,actual_customer_name.ilike.%${searchQuery}%`);
      }

      query = query.range(startRange, endRange);

      const { data: viewData, error, count } = await query;

      if (error) throw error;

      console.log(`영업사원 배정 뷰: ${viewData?.length || 0}개 (페이지 ${page})`);

      const enrichedAssignments = (viewData || []).map(lead => ({
        id: lead.assignment_id || lead.id,
        lead_id: lead.id,
        counselor_id: lead.counselor_id,
        assigned_at: lead.assigned_at,
        status: 'active',
        lead: {
          ...lead,
          customer_grade: (() => {
            if (lead.additional_data) {
              const additionalData = typeof lead.additional_data === 'string'
                ? JSON.parse(lead.additional_data)
                : lead.additional_data;

              if (additionalData && additionalData.grade) {
                return {
                  grade: additionalData.grade,
                  grade_color: additionalData.grade_color || gradeOptions.find(g => g.value === additionalData.grade)?.color || '#6b7280',
                  history: Array.isArray(additionalData.history) ? additionalData.history : []
                };
              }
            }
            return undefined;
          })()
        },
        counselor: {
          id: lead.counselor_id,
          full_name: lead.counselor_name || '알 수 없음',
          email: '',
          department: '',
          assigned_count: 0,
          active_count: 0,
          completed_count: 0
        }
      }));

      setCounselorAssignments(enrichedAssignments);
      setReassignTotalCount(count || 0);
      setReassignTotalPages(Math.ceil((count || 0) / reassignItemsPerPage));
      setReassignPage(page);
      setSelectedAssignments([]);

    } catch (error) {
      console.error('영업사원 배정 목록 로드 실패:', error);
      toast.error('배정 목록 로드 실패', '영업사원의 배정 목록을 불러오는 중 오류가 발생했습니다.');
      setCounselorAssignments([]);
    } finally {
      setLoadingCounselorData(false);
    }
  };

  // 개선된 재배정 함수
  const handleReassign = async () => {
    if (!newCounselorForReassign) {
      toast.warning('선택 확인', '새로운 영업사원을 선택해주세요.');
      return;
    }

    if (selectedAssignments.length > 0) {
      setShowBulkReassignModal(true);
      setBulkReassignMode('selected');
    } else {
      setShowBulkReassignModal(true);
      setBulkReassignMode('count');
    }
  };

  // 실제 재배정 실행 함수
  const executeBulkReassign = async () => {
    if (!newCounselorForReassign) {
      toast.warning('선택 확인', '새로운 영업사원을 선택해주세요.');
      return;
    }

    if (!user?.id) {
      toast.error('인증 오류', '로그인이 필요합니다.');
      return;
    }

    setActionLoading(true);
    try {
      let assignmentsToReassign: string[] = [];
      
      if (bulkReassignMode === 'selected') {
        assignmentsToReassign = selectedAssignments;
      } else {
        const reassignCount = parseInt(bulkReassignCount);
        if (isNaN(reassignCount) || reassignCount <= 0) {
          toast.warning('입력 오류', '올바른 숫자를 입력해주세요.');
          return;
        }
        
        assignmentsToReassign = counselorAssignments
          .slice(0, Math.min(reassignCount, counselorAssignments.length))
          .map(assignment => assignment.id);
      }

      if (assignmentsToReassign.length === 0) {
        toast.warning('선택 확인', '재배정할 고객이 없습니다.');
        return;
      }

      console.log(`=== 배치 재배정 시작: ${assignmentsToReassign.length}개 ===`);

      const leadIds = assignmentsToReassign.map(assignmentId => {
        const assignment = counselorAssignments.find(a => a.id === assignmentId);
        return assignment?.lead_id;
      }).filter(Boolean);

      const { error: deleteError } = await supabase
        .from('lead_assignments')
        .delete()
        .in('id', assignmentsToReassign);

      if (deleteError) throw deleteError;

      const newAssignmentRecords = leadIds.map(leadId => ({
        lead_id: leadId,
        counselor_id: newCounselorForReassign,
        assigned_by: user.id,
        assigned_at: new Date().toISOString(),
        status: 'active'
      }));

      const { error: insertError } = await supabase
        .from('lead_assignments')
        .insert(newAssignmentRecords);

      if (insertError) throw insertError;

      const oldCounselor = counselors.find(c => c.id === selectedCounselorForView)?.full_name;
      const newCounselor = counselors.find(c => c.id === newCounselorForReassign)?.full_name;
      
      toast.success(
        '고객 재배정 완료',
        `${assignmentsToReassign.length}개 고객이 ${oldCounselor}에서 ${newCounselor}으로 재배정되었습니다.`
      );
      
      await loadCounselorAssignments(selectedCounselorForView, reassignPage, debouncedReassignSearchTerm);
      await loadCounselors();
      setSelectedAssignments([]);
      setNewDepartmentForReassign('');
      setNewCounselorForReassign('');
      setShowBulkReassignModal(false);
      setBulkReassignCount('');

    } catch (error) {
      console.error('재배정 실패:', error);
      toast.error('고객 재배정 실패', error.message || '알 수 없는 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  // 미배정 처리 함수
  const handleUnassign = async () => {
    if (selectedAssignments.length === 0) {
      toast.warning('선택 확인', '미배정 처리할 고객을 선택해주세요.');
      return;
    }

    const confirmMessage = `선택한 ${selectedAssignments.length}개 고객의 배정을 취소하시겠습니까?\n해당 고객들은 다시 배정 가능한 상태가 됩니다.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setActionLoading(true);
    try {
      console.log(`=== 미배정 처리 시작: ${selectedAssignments.length}개 ===`);

      const leadIds = selectedAssignments.map(assignmentId => {
        const assignment = counselorAssignments.find(a => a.id === assignmentId);
        return assignment?.lead_id;
      }).filter(Boolean);

      const { error: deleteError } = await supabase
        .from('lead_assignments')
        .delete()
        .in('id', selectedAssignments);

      if (deleteError) throw deleteError;

      const { error: updateError } = await supabase
        .from('lead_pool')
        .update({ status: 'available' })
        .in('id', leadIds);

      if (updateError) throw updateError;

      const counselorName = counselors.find(c => c.id === selectedCounselorForView)?.full_name;
      
      toast.success(
        '미배정 처리 완료',
        `${selectedAssignments.length}개 고객이 ${counselorName}에서 미배정 상태로 변경되었습니다.`,
        {
          action: {
            label: '배정 가능 목록 보기',
            onClick: () => setActiveTab('assign')
          }
        }
      );
      
      await loadCounselorAssignments(selectedCounselorForView, reassignPage, debouncedReassignSearchTerm);
      await loadCounselors();
      await loadTotalLeadsCount();
      setSelectedAssignments([]);

    } catch (error) {
      console.error('미배정 처리 실패:', error);
      toast.error(
        '미배정 처리 실패',
        error.message || '알 수 없는 오류가 발생했습니다.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const toggleAssignmentSelection = (assignmentId: string) => {
    setSelectedAssignments(prev => 
      prev.includes(assignmentId) 
        ? prev.filter(id => id !== assignmentId)
        : [...prev, assignmentId]
    );
  };

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const toggleSelectAllLeads = () => {
    if (selectedLeads.length === availableLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(availableLeads.map(lead => lead.id));
    }
  };

  const toggleSelectAllAssignments = () => {
    if (selectedAssignments.length === counselorAssignments.length) {
      setSelectedAssignments([]);
    } else {
      setSelectedAssignments(counselorAssignments.map(assignment => assignment.id));
    }
  };

  const filteredCounselors = counselors.filter(counselor => 
    !selectedDepartment || counselor.department === selectedDepartment
  );

  const filteredCounselorsForReassign = counselors.filter(counselor => 
    (!newDepartmentForReassign || counselor.department === newDepartmentForReassign) &&
    counselor.id !== selectedCounselorForView
  );

  const filteredCounselorsForView = counselors.filter(counselor =>
    !reassignFilters.selectedDepartmentForView || counselor.department === reassignFilters.selectedDepartmentForView
  );

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadDepartments(),
        loadCounselors(),
        loadAvailableLeads(1, ''),
        loadTotalLeadsCount()
      ]);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      toast.error('데이터 로드 실패', '페이지 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'assign') {
      loadAvailableLeads(currentPage, debouncedSearchTerm);
    }
  }, [activeTab, currentPage, debouncedSearchTerm]);

  useEffect(() => {
    if (selectedCounselorForView) {
      loadCounselorAssignments(selectedCounselorForView, reassignPage, debouncedReassignSearchTerm);
    }
  }, [selectedCounselorForView, reassignPage, debouncedReassignSearchTerm, reassignFilters]);

  useEffect(() => {
    setSelectedCounselor('');
  }, [selectedDepartment]);

  useEffect(() => {
    setNewCounselorForReassign('');
  }, [newDepartmentForReassign]);

  useEffect(() => {
    setSelectedCounselorForView('');
  }, [reassignFilters.selectedDepartmentForView]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-accent" />
            <p className={designSystem.components.typography.body}>데이터를 불러오는 중...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className={designSystem.components.typography.h2}>고객 배정 관리</h1>
          <p className={designSystem.components.typography.bodySm}>
            영업사원에게 고객을 배정하고 관리합니다.
          </p>
        </div>

        {/* 탭 네비게이션 */}
        <div className="mb-6">
          <div className="border-b border-border-primary">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('assign')}
                className={designSystem.utils.cn(
                  "py-2 px-1 border-b-2 font-medium text-sm",
                  activeTab === 'assign'
                    ? "border-accent text-accent"
                    : "border-transparent text-text-secondary hover:text-text-primary hover:border-border-secondary"
                )}
              >
                신규 배정
              </button>
              <button
                onClick={() => setActiveTab('manage')}
                className={designSystem.utils.cn(
                  "py-2 px-1 border-b-2 font-medium text-sm",
                  activeTab === 'manage'
                    ? "border-accent text-accent"
                    : "border-transparent text-text-secondary hover:text-text-primary hover:border-border-secondary"
                )}
              >
                재배정 관리
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'assign' ? (
          <>
            {/* 상단 통계 요약 */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
              <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content)}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary">전체 고객</p>
                    <p className="text-2xl font-bold text-text-primary">{totalLeadsInDB.toLocaleString()}</p>
                  </div>
                  <businessIcons.analytics className="w-8 h-8 text-text-tertiary" />
                </div>
              </div>

              <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content)}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary">배정 대기</p>
                    <p className="text-2xl font-bold text-text-primary">{totalCount.toLocaleString()}</p>
                  </div>
                  <businessIcons.contact className="w-8 h-8 text-text-tertiary" />
                </div>
              </div>

              <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content)}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary">활성 영업사원</p>
                    <p className="text-2xl font-bold text-text-primary">{counselors.length}</p>
                  </div>
                  <businessIcons.team className="w-8 h-8 text-text-tertiary" />
                </div>
              </div>

              <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content)}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary">선택된 고객</p>
                    <p className="text-2xl font-bold text-accent">{selectedLeads.length}</p>
                  </div>
                  <businessIcons.success className="w-8 h-8 text-accent" />
                </div>
              </div>

              <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content)}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary">배정된 고객</p>
                    <p className="text-2xl font-bold text-text-primary">{counselors.reduce((sum, c) => sum + c.active_count, 0)}</p>
                  </div>
                  <businessIcons.assignment className="w-8 h-8 text-text-tertiary" />
                </div>
              </div>
            </div>

            {/* 벌크 액션 바 - 상시 표시 */}
            <div className="sticky top-0 bg-bg-primary border border-border-primary p-3 z-10 shadow-sm mb-6 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-primary">
                  {selectedLeads.length > 0 ? `${selectedLeads.length}개 고객 선택됨` : '고객을 선택하거나 숫자로 배정하세요'}
                </span>
                
                <div className="flex items-center space-x-2">
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="px-2 py-1.5 text-xs border border-border-primary rounded bg-bg-primary text-text-primary"
                  >
                    <option value="">부서 선택</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  
                  <select
                    value={selectedCounselor}
                    onChange={(e) => setSelectedCounselor(e.target.value)}
                    disabled={!selectedDepartment}
                    className="px-2 py-1.5 text-xs border border-border-primary rounded bg-bg-primary text-text-primary disabled:opacity-50"
                  >
                    <option value="">영업사원 선택</option>
                    {filteredCounselors.map(counselor => (
                      <option key={counselor.id} value={counselor.id}>
                        {counselor.full_name} ({counselor.active_count}개)
                      </option>
                    ))}
                  </select>
                  
                  <button
                    onClick={handleAssign}
                    disabled={!selectedCounselor || actionLoading}
                    className={designSystem.utils.cn(
                      "px-3 py-1.5 text-xs rounded font-medium transition-colors",
                      !selectedCounselor || actionLoading
                        ? "bg-bg-secondary text-text-tertiary cursor-not-allowed"
                        : "bg-accent text-white hover:bg-accent/90"
                    )}
                  >
                    {actionLoading ? (
                      <RefreshCw className="w-3 h-3 animate-spin mr-1 inline" />
                    ) : (
                      <businessIcons.success className="w-3 h-3 mr-1 inline" />
                    )}
                    {selectedLeads.length > 0 ? `${selectedLeads.length}개 배정` : '숫자로 배정'}
                  </button>
                  
                  {selectedLeads.length > 0 && (
                    <button
                      onClick={() => setSelectedLeads([])}
                      className="px-2 py-1.5 text-xs bg-bg-secondary text-text-primary rounded hover:bg-bg-hover transition-colors"
                    >
                      선택 해제
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 제목과 검색 영역 */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <businessIcons.contact className="w-3 h-3 text-accent" />
                <h3 className="text-xs font-medium text-text-primary">배정 가능한 고객</h3>
                <span className="text-xs text-text-secondary px-1.5 py-0.5 bg-bg-secondary rounded">
                  전체 {totalCount.toLocaleString()}명 (페이지당 {itemsPerPage}명)
                </span>
                {loading && (
                  <span className="text-xs text-accent animate-pulse">로딩 중...</span>
                )}
              </div>
              
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-text-secondary" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="전화번호, 고객명, DB출처로 검색..."
                  className="pl-7 pr-3 py-1 w-48 text-xs border border-border-primary rounded bg-bg-primary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            {/* 고객 목록 테이블 */}
            <div className="bg-bg-primary border border-border-primary rounded-lg overflow-hidden">
              {availableLeads.length > 0 ? (
                <>
                  <div className="overflow-auto" style={{ maxHeight: '65vh' }}>
                    <table className="w-full table-fixed">
                      <thead className="bg-bg-secondary sticky top-0 z-10">
                        <tr>
                          <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-8">
                            <button
                              onClick={toggleSelectAllLeads}
                              className="flex items-center justify-center w-3 h-3 mx-auto"
                            >
                              {selectedLeads.length === availableLeads.length && availableLeads.length > 0 ? (
                                <CheckSquare className="w-3 h-3 text-accent" />
                              ) : (
                                <Square className="w-3 h-3 text-text-tertiary" />
                              )}
                            </button>
                          </th>
                          <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-20">
                            <div className="flex items-center justify-center gap-0.5">
                              <Phone className="w-3 h-3" />
                              연락처
                            </div>
                          </th>
                          <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-16">
                            <div className="flex items-center justify-center gap-0.5">
                              <User className="w-3 h-3" />
                              고객명
                            </div>
                          </th>
                          <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-24">
                            <div className="flex items-center justify-center gap-0.5">
                              <MessageSquare className="w-3 h-3" />
                              관심분야
                            </div>
                          </th>
                          <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-20">
                            <div className="flex items-center justify-center gap-0.5">
                              <Building className="w-3 h-3" />
                              DB 출처
                            </div>
                          </th>
                          <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-20">
                            <div className="flex items-center justify-center gap-0.5">
                              <FileText className="w-3 h-3" />
                              배치명
                            </div>
                          </th>
                          <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-16">
                            <div className="flex items-center justify-center gap-0.5">
                              <Calendar className="w-3 h-3" />
                              데이터 생성일
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {availableLeads.map((lead) => (
                          <tr key={lead.id} className="border-b border-border-primary hover:bg-bg-hover transition-colors">
                            <td className="py-1 px-1 text-center">
                              <button
                                onClick={() => toggleLeadSelection(lead.id)}
                                className="flex items-center justify-center w-3 h-3 mx-auto"
                              >
                                {selectedLeads.includes(lead.id) ? (
                                  <CheckSquare className="w-3 h-3 text-accent" />
                                ) : (
                                  <Square className="w-3 h-3 text-text-tertiary" />
                                )}
                              </button>
                            </td>

                            <td className="py-1 px-1 text-center">
                              <div className="font-mono text-text-primary font-medium text-xs truncate">
                                {highlightText(maskPhoneNumber(lead.phone), debouncedSearchTerm)}
                              </div>
                            </td>

                            <td className="py-1 px-1 text-center">
                              <div className="text-xs whitespace-nowrap truncate">
                                {lead.real_name || lead.contact_name ? (
                                  <span className="text-text-primary">{highlightText(lead.real_name || lead.contact_name, debouncedSearchTerm)}</span>
                                ) : (
                                  <span className="text-text-tertiary">미확인</span>
                                )}
                              </div>
                            </td>

                            <td className="py-1 px-1 text-center relative">
                              <div className="w-24 group mx-auto">
                                {lead.contact_script ? (
                                  <>
                                    <div className="text-text-primary text-xs truncate cursor-help">
                                      {lead.contact_script}
                                    </div>
                                    <div className="absolute left-0 top-full mt-1 p-2 bg-black/90 text-white text-xs rounded shadow-lg z-10 max-w-80 break-words opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                      {lead.contact_script}
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-text-tertiary text-xs">미확인</span>
                                )}
                              </div>
                            </td>

                            <td className="py-1 px-1 text-center">
                              <div className="text-xs whitespace-nowrap truncate">
                                <span className="text-text-primary font-medium">
                                  {highlightText(lead.data_source, debouncedSearchTerm)}
                                </span>
                              </div>
                            </td>

                            <td className="py-1 px-1 text-center">
                              <div className="text-xs whitespace-nowrap truncate">
                                <span className="text-text-tertiary">
                                  {lead.batch_name}
                                </span>
                              </div>
                            </td>

                            <td className="py-1 px-1 text-center">
                              <span className="text-text-secondary text-xs whitespace-nowrap">
                                {lead.data_date ? new Date(lead.data_date).toLocaleDateString('ko-KR', { 
                                  month: '2-digit', 
                                  day: '2-digit' 
                                }) : '-'}
                              </span>
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
                          총 {totalCount.toLocaleString()}개 중 {((currentPage - 1) * itemsPerPage + 1).toLocaleString()}-{Math.min(currentPage * itemsPerPage, totalCount).toLocaleString()}개 표시
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
                  <businessIcons.contact className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-text-primary mb-2">배정 가능한 고객이 없습니다</h3>
                  <p className="text-text-secondary">관리자가 고객을 등록하면 여기에 표시됩니다.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* 재배정 관리 헤더 */}
            <div className="mb-6">
              <h3 className={designSystem.components.typography.h4}>재배정 관리</h3>
              <p className={designSystem.components.typography.bodySm}>
                영업사원을 선택하여 해당 영업사원의 고객을 다른 영업사원에게 재배정할 수 있습니다.
              </p>
            </div>

            {/* 필터 및 영업사원 선택 */}
            <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content, 'mb-6')}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">부서 선택</label>
                  <select
                    value={reassignFilters.selectedDepartmentForView}
                    onChange={(e) => setReassignFilters(prev => ({ ...prev, selectedDepartmentForView: e.target.value }))}
                    className="w-full px-2 py-1.5 text-xs border border-border-primary rounded bg-bg-primary text-text-primary"
                  >
                    <option value="">전체 부서</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">영업사원 선택</label>
                  <select
                    value={selectedCounselorForView}
                    onChange={(e) => {
                      setSelectedCounselorForView(e.target.value);
                      setReassignPage(1);
                      setReassignSearchTerm('');
                    }}
                    className="w-full px-2 py-1.5 text-xs border border-border-primary rounded bg-bg-primary text-text-primary"
                    disabled={loadingCounselorData}
                  >
                    <option value="">영업사원을 선택하세요</option>
                    {filteredCounselorsForView.map(counselor => (
                      <option key={counselor.id} value={counselor.id}>
                        {counselor.full_name} ({counselor.active_count}개)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">계약상태 필터</label>
                  <select
                    value={reassignFilters.contractStatus}
                    onChange={(e) => setReassignFilters(prev => ({ ...prev, contractStatus: e.target.value }))}
                    className="w-full px-2 py-1.5 text-xs border border-border-primary rounded bg-bg-primary text-text-primary"
                  >
                    <option value="all">전체</option>
                    {gradeOptions.map(grade => (
                      <option key={grade.value} value={grade.value}>
                        {grade.label}
                      </option>
                    ))}
                    <option value="미분류">미분류</option>
                  </select>
                </div>
                
                {selectedCounselorForView && (
                  <div className="flex items-center gap-2 pt-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-accent">{reassignTotalCount}</div>
                      <div className="text-xs text-text-secondary">총 배정</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-text-primary">{selectedAssignments.length}</div>
                      <div className="text-xs text-text-secondary">선택됨</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 재배정 액션 바 - 상시 표시 */}
            {selectedCounselorForView && (
              <div className="sticky top-0 bg-bg-primary border border-border-primary p-3 z-10 shadow-sm mb-6 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-primary">
                    {selectedAssignments.length > 0 ? `${selectedAssignments.length}개 고객 선택됨` : '고객을 선택하거나 숫자로 재배정하세요'}
                  </span>
                  
                  <div className="flex items-center space-x-2">
                    {/* 미배정 처리 버튼 */}
                    <button
                      onClick={handleUnassign}
                      disabled={selectedAssignments.length === 0 || actionLoading}
                      className={designSystem.utils.cn(
                        "px-3 py-1.5 text-xs rounded font-medium transition-colors",
                        selectedAssignments.length === 0 || actionLoading
                          ? "bg-bg-secondary text-text-tertiary cursor-not-allowed"
                          : "bg-warning text-white hover:bg-warning/90"
                      )}
                    >
                      {actionLoading ? (
                        <RefreshCw className="w-3 h-3 animate-spin mr-1 inline" />
                      ) : (
                        <UserX className="w-3 h-3 mr-1 inline" />
                      )}
                      미배정 처리
                    </button>

                    {/* 구분선 */}
                    <div className="w-px h-6 bg-border-primary"></div>
                    
                    <select
                      value={newDepartmentForReassign}
                      onChange={(e) => setNewDepartmentForReassign(e.target.value)}
                      className="px-2 py-1.5 text-xs border border-border-primary rounded bg-bg-primary text-text-primary"
                    >
                      <option value="">부서 선택</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                    
                    <select
                      value={newCounselorForReassign}
                      onChange={(e) => setNewCounselorForReassign(e.target.value)}
                      disabled={!newDepartmentForReassign}
                      className="px-2 py-1.5 text-xs border border-border-primary rounded bg-bg-primary text-text-primary disabled:opacity-50"
                    >
                      <option value="">새 영업사원 선택</option>
                      {filteredCounselorsForReassign.map(counselor => (
                        <option key={counselor.id} value={counselor.id}>
                          {counselor.full_name} ({counselor.active_count}개)
                        </option>
                      ))}
                    </select>
                    
                    <button
                      onClick={handleReassign}
                      disabled={!newCounselorForReassign || actionLoading}
                      className={designSystem.utils.cn(
                        "px-3 py-1.5 text-xs rounded font-medium transition-colors",
                        !newCounselorForReassign || actionLoading
                          ? "bg-bg-secondary text-text-tertiary cursor-not-allowed"
                          : "bg-accent text-white hover:bg-accent/90"
                      )}
                    >
                      {actionLoading ? (
                        <RefreshCw className="w-3 h-3 animate-spin mr-1 inline" />
                      ) : (
                        <RefreshCw className="w-3 h-3 mr-1 inline" />
                      )}
                      {selectedAssignments.length > 0 
                        ? `${selectedAssignments.length}개 재배정` 
                        : '숫자로 재배정'
                      }
                    </button>
                    
                    {selectedAssignments.length > 0 && (
                      <button
                        onClick={() => setSelectedAssignments([])}
                        className="px-2 py-1.5 text-xs bg-bg-secondary text-text-primary rounded hover:bg-bg-hover transition-colors"
                      >
                        선택 해제
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 영업사원별 고객 목록 */}
            {selectedCounselorForView ? (
              loadingCounselorData ? (
                <div className="bg-bg-primary border border-border-primary rounded-lg p-8 text-center">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-accent" />
                  <p className="text-text-secondary">영업사원의 배정 목록을 불러오는 중...</p>
                </div>
              ) : (
                <>
                  {/* 제목과 검색 영역 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <businessIcons.team className="w-3 h-3 text-accent" />
                      <h3 className="text-xs font-medium text-text-primary">
                        {counselors.find(c => c.id === selectedCounselorForView)?.full_name || ''}의 배정 고객
                      </h3>
                      <span className="text-xs text-text-secondary px-1.5 py-0.5 bg-bg-secondary rounded">
                        전체 {reassignTotalCount.toLocaleString()}명 (페이지당 {reassignItemsPerPage}명)
                      </span>
                      {loadingCounselorData && (
                        <span className="text-xs text-accent animate-pulse">로딩 중...</span>
                      )}
                    </div>
                    
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-text-secondary" />
                      <input
                        type="text"
                        value={reassignSearchTerm}
                        onChange={(e) => setReassignSearchTerm(e.target.value)}
                        placeholder="고객명, 전화번호로 검색..."
                        className="pl-7 pr-3 py-1 w-48 text-xs border border-border-primary rounded bg-bg-primary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                  </div>

                  <div className="bg-bg-primary border border-border-primary rounded-lg overflow-hidden">
                    {counselorAssignments.length > 0 ? (
                      <>
                        <div className="overflow-auto" style={{ maxHeight: '65vh' }}>
                          <table className="w-full table-fixed">
                            <thead className="bg-bg-secondary sticky top-0 z-10">
                              <tr>
                                <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-8">
                                  <button
                                    onClick={toggleSelectAllAssignments}
                                    className="flex items-center justify-center w-3 h-3 mx-auto"
                                  >
                                    {selectedAssignments.length === counselorAssignments.length && counselorAssignments.length > 0 ? (
                                      <CheckSquare className="w-3 h-3 text-accent" />
                                    ) : (
                                      <Square className="w-3 h-3 text-text-tertiary" />
                                    )}
                                  </button>
                                </th>
                                <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-16">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <Calendar className="w-3 h-3" />
                                    배정일
                                  </div>
                                </th>
                                <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-16">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <businessIcons.assignment className="w-3 h-3" />
                                    등급
                                  </div>
                                </th>
                                <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-16">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <User className="w-3 h-3" />
                                    고객명
                                  </div>
                                </th>
                                <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-20">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <Phone className="w-3 h-3" />
                                    전화번호
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
                                    횟수
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
                              </tr>
                            </thead>
                            <tbody>
                              {counselorAssignments.map((assignment) => (
                                <tr key={assignment.id} className="border-b border-border-primary hover:bg-bg-hover transition-colors">
                                  <td className="py-1 px-1 text-center">
                                    <button
                                      onClick={() => toggleAssignmentSelection(assignment.id)}
                                      className="flex items-center justify-center w-3 h-3 mx-auto"
                                    >
                                      {selectedAssignments.includes(assignment.id) ? (
                                        <CheckSquare className="w-3 h-3 text-accent" />
                                      ) : (
                                        <Square className="w-3 h-3 text-text-tertiary" />
                                      )}
                                    </button>
                                  </td>

                                  <td className="py-1 px-1 text-center">
                                    <span className="text-text-secondary text-xs whitespace-nowrap">
                                      {assignment.assigned_at ? 
                                        new Date(assignment.assigned_at).toLocaleDateString('ko-KR', {
                                          month: '2-digit',
                                          day: '2-digit'
                                        }) : 
                                        new Date(assignment.lead.created_at).toLocaleDateString('ko-KR', {
                                          month: '2-digit',
                                          day: '2-digit'
                                        })
                                      }
                                    </span>
                                  </td>

                                  <td className="py-1 px-1 text-center">
                                    {renderGradeBadge(assignment.lead.customer_grade)}
                                  </td>

                                  <td className="py-1 px-1 text-center">
                                    <div className="text-xs whitespace-nowrap truncate">
                                      {assignment.lead.actual_customer_name ? (
                                        <span className="text-text-primary font-medium">{assignment.lead.actual_customer_name}</span>
                                      ) : assignment.lead.real_name ? (
                                        <span className="text-text-primary">{assignment.lead.real_name}</span>
                                      ) : assignment.lead.contact_name ? (
                                        <span className="text-text-secondary">{assignment.lead.contact_name}</span>
                                      ) : (
                                        <span className="text-text-tertiary">미확인</span>
                                      )}
                                    </div>
                                  </td>

                                  <td className="py-1 px-1 text-center">
                                    <div className="font-mono text-text-primary font-medium text-xs truncate">
                                      {maskPhoneNumber(assignment.lead?.phone || '')}
                                    </div>
                                  </td>

                                  <td className="py-1 px-1 text-center relative">
                                    <div className="w-24 group mx-auto">
                                      {assignment.lead?.contact_script ? (
                                        <>
                                          <div className="text-text-primary text-xs truncate cursor-help px-1">
                                            {assignment.lead.contact_script}
                                          </div>
                                          <div className="absolute left-0 top-full mt-1 p-2 bg-black/90 text-white text-xs rounded shadow-lg z-20 max-w-80 break-words opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                            {assignment.lead.contact_script}
                                          </div>
                                        </>
                                      ) : (
                                        <span className="text-text-tertiary text-xs">미확인</span>
                                      )}
                                    </div>
                                  </td>

                                  <td className="py-1 px-1 text-center relative">
                                    <div className="w-28 group mx-auto">
                                      {assignment.lead.counseling_memo ? (
                                        <>
                                          <div className="text-text-primary text-xs truncate cursor-help px-1">
                                            {assignment.lead.counseling_memo}
                                          </div>
                                          <div className="absolute left-0 top-full mt-1 p-2 bg-black/90 text-white text-xs rounded shadow-lg z-20 max-w-80 break-words opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                            {assignment.lead.counseling_memo}
                                          </div>
                                        </>
                                      ) : (
                                        <span className="text-text-tertiary text-xs">-</span>
                                      )}
                                    </div>
                                  </td>

                                  <td className="py-1 px-1 text-center">
                                    <span className="font-medium text-text-primary text-xs">
                                      {assignment.lead.call_attempts || 0}
                                    </span>
                                  </td>

                                  <td className="py-1 px-1 text-center">
                                    <span className="text-text-secondary text-xs whitespace-nowrap">
                                      {assignment.lead.last_contact_date 
                                        ? new Date(assignment.lead.last_contact_date).toLocaleDateString('ko-KR', {
                                            month: '2-digit',
                                            day: '2-digit'
                                          })
                                        : '-'
                                      }
                                    </span>
                                  </td>

                                  <td className="py-1 px-1 text-center">
                                    {assignment.lead.contract_amount ? (
                                      <span className="font-medium text-success text-xs">
                                        {(assignment.lead.contract_amount / 10000).toFixed(0)}만
                                      </span>
                                    ) : (
                                      <span className="text-text-tertiary text-xs">-</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* 페이지네이션 */}
                        {reassignTotalPages > 1 && (
                          <div className="p-3 border-t border-border-primary bg-bg-secondary">
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-text-secondary">
                                총 {reassignTotalCount.toLocaleString()}개 중 {((reassignPage - 1) * reassignItemsPerPage + 1).toLocaleString()}-{Math.min(reassignPage * reassignItemsPerPage, reassignTotalCount).toLocaleString()}개 표시
                              </div>
                              
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setReassignPage(1)}
                                  disabled={reassignPage === 1}
                                  className="px-2 py-1 text-xs border border-border-primary rounded bg-bg-primary text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-hover transition-colors"
                                >
                                  첫페이지
                                </button>
                                
                                <button
                                  onClick={() => setReassignPage(reassignPage - 1)}
                                  disabled={reassignPage === 1}
                                  className="px-2 py-1 text-xs border border-border-primary rounded bg-bg-primary text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-hover transition-colors"
                                >
                                  <ChevronLeft className="w-3 h-3" />
                                </button>
                                
                                <span className="px-2 py-1 text-xs text-white bg-accent rounded">
                                  {reassignPage} / {reassignTotalPages}
                                </span>
                                
                                <button
                                  onClick={() => setReassignPage(reassignPage + 1)}
                                  disabled={reassignPage === reassignTotalPages}
                                  className="px-2 py-1 text-xs border border-border-primary rounded bg-bg-primary text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-hover transition-colors"
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                                
                                <button
                                  onClick={() => setReassignPage(reassignTotalPages)}
                                  disabled={reassignPage === reassignTotalPages}
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
                        <businessIcons.team className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-text-primary mb-2">배정된 고객이 없습니다</h3>
                        <p className="text-text-secondary">해당 영업사원에게 배정된 고객이 없습니다.</p>
                      </div>
                    )}
                  </div>
                </>
              )
            ) : (
              <div className="bg-bg-primary border border-border-primary rounded-lg p-12 text-center">
                <div className="text-6xl mb-4">👆</div>
                <h4 className={designSystem.components.typography.h5}>영업사원을 선택하세요</h4>
                <p className="text-text-secondary mt-2">
                  위에서 영업사원을 선택하면 해당 영업사원의 배정된 고객 목록을 확인할 수 있습니다.
                </p>
              </div>
            )}
          </>
        )}

        {/* 벌크 배정 모달 */}
        {showBulkAssignModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-bg-primary border border-border-primary rounded-xl w-full max-w-md mx-auto">
              <div className="p-6 border-b border-border-primary">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-accent" />
                    고객 배정 확인
                  </h3>
                  <button
                    onClick={() => {
                      setShowBulkAssignModal(false);
                      setBulkAssignCount('');
                    }}
                    className="p-1 hover:bg-bg-hover rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-text-secondary" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="mb-4 p-3 bg-accent/10 rounded-lg">
                  <p className="text-sm text-text-primary">
                    배정 대상: <span className="font-bold">{counselors.find(c => c.id === selectedCounselor)?.full_name}</span>
                  </p>
                </div>

                {bulkAssignMode === 'selected' ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                      <p className="text-sm text-text-primary mb-2">
                        선택한 <span className="font-bold text-success">{selectedLeads.length}개</span>의 고객을 배정하시겠습니까?
                      </p>
                    </div>
                    
                    <div className="text-center">
                      <button
                        onClick={() => {
                          setBulkAssignMode('count');
                          setSelectedLeads([]);
                        }}
                        className="text-xs text-accent hover:underline"
                      >
                        숫자로 입력하여 배정하기
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-text-primary">
                        배정할 고객 수 입력
                      </label>
                      <input
                        type="number"
                        value={bulkAssignCount}
                        onChange={(e) => setBulkAssignCount(e.target.value)}
                        placeholder="배정할 개수를 입력하세요"
                        min="1"
                        max={availableLeads.length}
                        className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                      <p className="text-xs text-text-secondary mt-1">
                        현재 페이지의 상위 {bulkAssignCount || 'N'}개 고객이 배정됩니다.
                        (최대: {availableLeads.length}개)
                      </p>
                    </div>
                    
                    {bulkAssignCount && parseInt(bulkAssignCount) > 0 && (
                      <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                        <p className="text-sm text-text-primary">
                          상위 <span className="font-bold text-success">
                            {Math.min(parseInt(bulkAssignCount), availableLeads.length)}개
                          </span>의 고객이 배정됩니다.
                        </p>
                      </div>
                    )}
                    
                    {selectedLeads.length > 0 && (
                      <div className="text-center">
                        <button
                          onClick={() => setBulkAssignMode('selected')}
                          className="text-xs text-accent hover:underline"
                        >
                          선택한 항목 배정으로 전환 ({selectedLeads.length}개)
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border-primary">
                  <button
                    onClick={() => {
                      setShowBulkAssignModal(false);
                      setBulkAssignCount('');
                    }}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-bg-secondary text-text-primary rounded-lg hover:bg-bg-hover transition-colors disabled:opacity-50"
                  >
                    취소
                  </button>
                  <button
                    onClick={executeBulkAssign}
                    disabled={
                      actionLoading || 
                      (bulkAssignMode === 'count' && (!bulkAssignCount || parseInt(bulkAssignCount) <= 0))
                    }
                    className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {actionLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        배정 중...
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4" />
                        배정 확인
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 벌크 재배정 모달 */}
        {showBulkReassignModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-bg-primary border border-border-primary rounded-xl w-full max-w-md mx-auto">
              <div className="p-6 border-b border-border-primary">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-accent" />
                    고객 재배정 확인
                  </h3>
                  <button
                    onClick={() => {
                      setShowBulkReassignModal(false);
                      setBulkReassignCount('');
                    }}
                    className="p-1 hover:bg-bg-hover rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-text-secondary" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="mb-4 space-y-2">
                  <div className="p-3 bg-warning/10 rounded-lg">
                    <p className="text-sm text-text-primary">
                      기존 영업사원: <span className="font-bold">{counselors.find(c => c.id === selectedCounselorForView)?.full_name}</span>
                    </p>
                  </div>
                  <div className="p-3 bg-success/10 rounded-lg">
                    <p className="text-sm text-text-primary">
                      새 영업사원: <span className="font-bold">{counselors.find(c => c.id === newCounselorForReassign)?.full_name}</span>
                    </p>
                  </div>
                </div>

                {bulkReassignMode === 'selected' ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                      <p className="text-sm text-text-primary mb-2">
                        선택한 <span className="font-bold text-accent">{selectedAssignments.length}개</span>의 고객을 재배정하시겠습니까?
                      </p>
                    </div>
                    
                    <div className="text-center">
                      <button
                        onClick={() => {
                          setBulkReassignMode('count');
                          setSelectedAssignments([]);
                        }}
                        className="text-xs text-accent hover:underline"
                      >
                        숫자로 입력하여 재배정하기
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-text-primary">
                        재배정할 고객 수 입력
                      </label>
                      <input
                        type="number"
                        value={bulkReassignCount}
                        onChange={(e) => setBulkReassignCount(e.target.value)}
                        placeholder="재배정할 개수를 입력하세요"
                        min="1"
                        max={counselorAssignments.length}
                        className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                      <p className="text-xs text-text-secondary mt-1">
                        현재 영업사원의 상위 {bulkReassignCount || 'N'}개 고객이 재배정됩니다.
                        (최대: {counselorAssignments.length}개)
                      </p>
                    </div>
                    
                    {bulkReassignCount && parseInt(bulkReassignCount) > 0 && (
                      <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                        <p className="text-sm text-text-primary">
                          상위 <span className="font-bold text-accent">
                            {Math.min(parseInt(bulkReassignCount), counselorAssignments.length)}개
                          </span>의 고객이 재배정됩니다.
                        </p>
                      </div>
                    )}
                    
                    {selectedAssignments.length > 0 && (
                      <div className="text-center">
                        <button
                          onClick={() => setBulkReassignMode('selected')}
                          className="text-xs text-accent hover:underline"
                        >
                          선택한 항목 재배정으로 전환 ({selectedAssignments.length}개)
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border-primary">
                  <button
                    onClick={() => {
                      setShowBulkReassignModal(false);
                      setBulkReassignCount('');
                    }}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-bg-secondary text-text-primary rounded-lg hover:bg-bg-hover transition-colors disabled:opacity-50"
                  >
                    취소
                  </button>
                  <button
                    onClick={executeBulkReassign}
                    disabled={
                      actionLoading || 
                      (bulkReassignMode === 'count' && (!bulkReassignCount || parseInt(bulkReassignCount) <= 0))
                    }
                    className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {actionLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        재배정 중...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        재배정 확인
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default function AssignmentsPage() {
  return (
    <ProtectedRoute requiredPermission="assignments">
      <AssignmentsPageContent />
    </ProtectedRoute>
  );
}