'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { designSystem } from '@/lib/design-system';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { businessIcons } from '@/lib/design-system/icons';
import { useToastHelpers } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import AdminLayout from '@/components/layout/AdminLayout';
import { departmentPermissionService } from '@/lib/services/departmentPermissions';
import {
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Phone,
  User,
  Calendar,
  MessageSquare,
  Building,
  FileText,
  UserCheck,
  AlertTriangle,
  X
} from 'lucide-react';

// 타입 정의
interface Counselor {
  id: string
  name: string
  email: string
  department: string
  assigned_count: number
  in_progress_count: number
  completed_count: number
  contracted_count: number
  total_contract_amount: number
}

interface CounselorLead {
  assignment_id: string
  lead_id: string
  phone: string
  actual_customer_name?: string
  real_name?: string
  contact_name?: string
  data_source: string
  contact_script: string
  assigned_at: string
  last_contact_date?: string
  call_attempts: number
  latest_contact_result?: string
  latest_contract_status?: string
  contract_amount?: number
  status: 'not_contacted' | 'in_progress' | 'completed' | 'contracted'
  counseling_memo?: string
  customer_reaction?: string
  customer_grade?: {
    grade: string
    grade_color: string
  }
}

function CounselingMonitorContent() {
  const { user, userProfile, hasPermission, isAdmin, isSuperAdmin } = useAuth()
  const toast = useToastHelpers()
  const router = useRouter()
  
  // 상태 관리
  const [counselors, setCounselors] = useState<Counselor[]>([])
  const [selectedCounselor, setSelectedCounselor] = useState<string>('')
  const [counselorLeads, setCounselorLeads] = useState<CounselorLead[]>([])
  const [loading, setLoading] = useState(true)
  const [leadsLoading, setLeadsLoading] = useState(false)
  
  // 필터 상태
  const [contractFilter, setContractFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')

  // 페이징 상태
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const itemsPerPage = 300

  // 부서 목록
  const [departments, setDepartments] = useState<string[]>([])

  // 마운트 상태 (Hydration 방지)
  const [mounted, setMounted] = useState(false)

  // 메모 히스토리 모달 상태
  const [showMemoHistoryModal, setShowMemoHistoryModal] = useState(false)
  const [selectedLeadForMemo, setSelectedLeadForMemo] = useState<CounselorLead | null>(null)
  const [memoHistory, setMemoHistory] = useState<any[]>([])
  const [loadingMemoHistory, setLoadingMemoHistory] = useState(false)

  // 등급 옵션
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
    setMounted(true)
  }, [])

  // 권한 체크 함수 추가
  const checkAdminPermission = () => {
    if (!userProfile) {
      toast.error('인증 오류', '사용자 정보를 확인할 수 없습니다.')
      router.push('/login')
      return false
    }

    if (!isAdmin && !isSuperAdmin) {
      toast.error('접근 권한 없음', '관리자만 접근할 수 있는 페이지입니다.')
      router.push('/admin/dashboard')
      return false
    }

    if (!hasPermission('consulting_monitor')) {
      toast.error('기능 권한 없음', '상담 모니터링 기능에 대한 권한이 없습니다.')
      router.push('/admin/dashboard')  
      return false
    }

    return true
  }

  // 전화번호 마스킹 함수
  const maskPhoneNumber = (phone: string): string => {
    if (!phone) return '-'
    
    if (hasPermission('phone_unmask')) {
      return phone
    }
    
    if (phone.length >= 8) {
      const start = phone.slice(0, 3)
      const end = phone.slice(-4)
      return start + '****' + end
    }
    
    return phone.slice(0, 2) + '*'.repeat(phone.length - 2)
  }

  // 고객명 마스킹 함수 (마스킹 제거)
  const displayCustomerName = (name: string | null): string => {
    if (!name || name === '고객명 미확인') return '고객명 미확인'
    return name
  }

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

  // 부서 목록 로드
  const loadDepartments = async () => {
    try {
      if (!user?.id) return;

      // 사용자가 접근할 수 있는 부서 목록 조회
      const accessibleDepartments = await departmentPermissionService.getAccessibleDepartments(user.id);
      
      if (accessibleDepartments.length === 0) {
        setDepartments([]);
        return;
      }

      // 접근 가능한 부서에 영업사원이 있는지 확인
      let query = supabase
        .from('users')
        .select('department')
        .eq('role', 'counselor')
        .eq('is_active', true)
        .not('department', 'is', null)
        .in('department', accessibleDepartments);

      const { data: departmentData, error } = await query;

      if (error) throw error;

      const uniqueDepartments = [...new Set(departmentData?.map(d => d.department).filter(Boolean))] as string[];
      setDepartments(uniqueDepartments.sort());
    } catch (error) {
      console.error('부서 목록 로드 실패:', error);
    }
  };

  // 데이터 로드
  useEffect(() => {
    if (mounted && userProfile) {
      if (checkAdminPermission()) {
        loadDepartments();
        loadCounselors()
      }
    }
  }, [mounted, userProfile])

  // 영업사원 선택 시 리드 로드
  useEffect(() => {
    if (selectedCounselor && mounted) {
      setCurrentPage(1)
      loadCounselorLeads(selectedCounselor, 1)
    }
  }, [selectedCounselor, contractFilter, debouncedSearchTerm])

  // 영업사원 목록 로드 (성능 최적화)
  const loadCounselors = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('users')
        .select('id, full_name, email, role, phone, department, is_active')
        .eq('role', 'counselor')
        .eq('is_active', true);

      // 부서 권한 기반 필터링 적용
      if (user?.id) {
        const accessibleDepartments = await departmentPermissionService.getAccessibleDepartments(user.id);
        
        if (accessibleDepartments.length === 0) {
          console.log('부서 권한 없음 - 영업사원 조회 불가');
          setCounselors([]);
          return;
        }
        
        console.log(`영업사원 부서 필터링 적용: [${accessibleDepartments.join(', ')}]`);
        query = query.in('department', accessibleDepartments);
      }

      // 부서 필터 적용
      if (departmentFilter) {
        query = query.eq('department', departmentFilter);
      }

      const { data: counselorsData, error: counselorsError } = await query
        .order('department', { ascending: true })
        .order('full_name', { ascending: true });

      if (counselorsError) throw counselorsError

      // 각 영업사원별 통계를 순차적으로 계산
      const enrichedCounselors: Counselor[] = []
      
      for (const counselor of counselorsData || []) {
        try {
          // 배정된 리드 수
          const { count: assignedCount } = await supabase
            .from('lead_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('counselor_id', counselor.id)
            .eq('status', 'active')

          // admin_leads_view를 사용한 통계 계산
          const { data: statsData } = await supabase
            .from('admin_leads_view')
            .select('latest_contact_result, contract_status, contract_amount, additional_data')
            .eq('counselor_id', counselor.id)
            .not('assignment_id', 'is', null);

          let inProgressCount = 0
          let completedCount = 0  
          let contractedCount = 0
          let totalContractAmount = 0

          statsData?.forEach(lead => {
            if (lead.contract_status === 'contracted') {
              contractedCount++
              totalContractAmount += lead.contract_amount || 0
            } else if (lead.contract_status === 'failed') {
              completedCount++
            } else if (lead.latest_contact_result) {
              inProgressCount++
            }
          });

          enrichedCounselors.push({
            id: counselor.id,
            name: counselor.full_name,
            email: counselor.email,
            department: counselor.department || '미지정',
            assigned_count: assignedCount || 0,
            in_progress_count: inProgressCount,
            completed_count: completedCount,
            contracted_count: contractedCount,
            total_contract_amount: totalContractAmount
          })

        } catch (error) {
          console.error(`영업사원 ${counselor.full_name} 통계 계산 오류:`, error)
          enrichedCounselors.push({
            id: counselor.id,
            name: counselor.full_name,
            email: counselor.email,
            department: counselor.department || '미지정',
            assigned_count: 0,
            in_progress_count: 0,
            completed_count: 0,
            contracted_count: 0,
            total_contract_amount: 0
          })
        }
      }

      setCounselors(enrichedCounselors)
      
      // 첫 번째 영업사원 자동 선택
      if (enrichedCounselors.length > 0 && !selectedCounselor) {
        setSelectedCounselor(enrichedCounselors[0].id)
      }

      toast.success('영업사원 목록 로드 완료', `${enrichedCounselors.length}명의 영업사원을 불러왔습니다.`)

    } catch (error: any) {
      console.error('영업사원 데이터 로드 오류:', error)
      toast.error('데이터 로드 실패', error.message, {
        action: { label: '다시 시도', onClick: () => loadCounselors() }
      })
    } finally {
      setLoading(false)
    }
  }

  // admin_leads_view를 사용한 최적화된 리드 로드
  const loadCounselorLeads = async (counselorId: string, page: number = 1) => {
    setLeadsLoading(true)
    try {
      const startRange = (page - 1) * itemsPerPage
      const endRange = startRange + itemsPerPage - 1

      let query = supabase
        .from('admin_leads_view')
        .select('*', { count: 'exact' })
        .eq('counselor_id', counselorId)
        .not('assignment_id', 'is', null)
        .order('assigned_at', { ascending: false });

      // 계약상태(등급) 필터 적용
      if (contractFilter !== 'all') {
        if (contractFilter === '미분류') {
          query = query.or('additional_data.is.null,additional_data.not.cs.{"grade"}');
        } else {
          query = query.contains('additional_data', { grade: contractFilter });
        }
      }

      // 검색어 적용
      if (debouncedSearchTerm.trim()) {
        query = query.or(`phone.ilike.%${debouncedSearchTerm}%,contact_name.ilike.%${debouncedSearchTerm}%,real_name.ilike.%${debouncedSearchTerm}%,actual_customer_name.ilike.%${debouncedSearchTerm}%`);
      }

      // 페이지네이션 적용
      query = query.range(startRange, endRange);

      const { data: leadsData, error: leadsError, count } = await query;

      if (leadsError) throw leadsError

      // admin_leads_view 데이터를 CounselorLead 형태로 변환
      const enrichedLeads: CounselorLead[] = (leadsData || []).map(lead => {
        // 상태 계산
        let status: CounselorLead['status'] = 'not_contacted'
        if (lead.contract_status === 'contracted') {
          status = 'contracted'
        } else if (lead.contract_status === 'failed') {
          status = 'completed'
        } else if (lead.latest_contact_result) {
          status = 'in_progress'
        }

        // 등급 정보 추출
        let customer_grade = undefined;
        if (lead.additional_data) {
          const additionalData = typeof lead.additional_data === 'string'
            ? JSON.parse(lead.additional_data)
            : lead.additional_data;

          if (additionalData && additionalData.grade) {
            customer_grade = {
              grade: additionalData.grade,
              grade_color: additionalData.grade_color || gradeOptions.find(g => g.value === additionalData.grade)?.color || '#6b7280',
              history: Array.isArray(additionalData.history) ? additionalData.history : []
            };
          }
        }

        return {
          assignment_id: lead.assignment_id || lead.id,
          lead_id: lead.id,
          phone: lead.phone,
          actual_customer_name: lead.actual_customer_name,
          real_name: lead.real_name,
          contact_name: lead.contact_name,
          data_source: lead.data_source || '미지정',
          contact_script: lead.contact_script || '',
          assigned_at: lead.assigned_at,
          last_contact_date: lead.last_contact_date,
          call_attempts: lead.call_attempts || 0,
          latest_contact_result: lead.latest_contact_result,
          latest_contract_status: lead.contract_status,
          contract_amount: lead.contract_amount,
          status,
          counseling_memo: lead.counseling_memo,
          customer_reaction: lead.customer_reaction,
          customer_grade
        }
      });

      setCounselorLeads(enrichedLeads)
      setTotalCount(count || 0)
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
      setCurrentPage(page)

    } catch (error: any) {
      console.error('영업사원 리드 데이터 로드 오류:', error)
      toast.error('리드 데이터 로드 실패', error.message)
    } finally {
      setLeadsLoading(false)
    }
  }

  // 메모 히스토리 로드
  const loadMemoHistory = async (assignmentId: string) => {
    try {
      setLoadingMemoHistory(true)
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
        .order('created_at', { ascending: false })

      if (error) throw error

      const memos = data?.map((memo: any) => ({
        id: memo.id,
        memo: memo.memo,
        created_at: memo.created_at,
        created_by: memo.created_by,
        created_by_name: memo.users?.full_name || '알 수 없음'
      })) || []

      setMemoHistory(memos)
    } catch (error) {
      console.error('메모 히스토리 로드 실패:', error)
      toast.error('메모 히스토리 로드 실패', '메모 히스토리를 불러올 수 없습니다.')
    } finally {
      setLoadingMemoHistory(false)
    }
  }

  // 메모 히스토리 모달 열기
  const openMemoHistoryModal = async (lead: CounselorLead) => {
    if (!lead.assignment_id) {
      toast.warning('배정 정보 없음', '아직 배정되지 않은 리드입니다.')
      return
    }

    setSelectedLeadForMemo(lead)
    setShowMemoHistoryModal(true)
    await loadMemoHistory(lead.assignment_id)
  }

  // 선택된 영업사원 정보
  const selectedCounselorInfo = counselors.find(c => c.id === selectedCounselor)

  // 상태별 스타일
  const getStatusBadge = (status: CounselorLead['status']) => {
    const styles = {
      not_contacted: 'bg-bg-secondary text-text-primary',
      in_progress: 'bg-accent/10 text-accent',
      completed: 'bg-text-secondary/10 text-text-secondary',
      contracted: 'bg-accent/20 text-accent font-medium'
    }
    
    const labels = {
      not_contacted: '미접촉',
      in_progress: '상담중',
      completed: '완료',
      contracted: '계약'
    }
    
    return (
      <span className={`px-1.5 py-0.5 rounded text-xs ${styles[status]}`}>
        {labels[status]}
      </span>
    )
  }

  // 최근 활동 시간 계산
  const getTimeAgo = (dateString: string | null) => {
    if (!dateString) return '미접촉'
    
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffMins < 60) {
      return `${diffMins}분 전`
    } else if (diffHours < 24) {
      return `${diffHours}시간 전`
    } else {
      return `${diffDays}일 전`
    }
  }

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    if (selectedCounselor) {
      loadCounselorLeads(selectedCounselor, page)
    }
  }

  // 부서 필터 변경시 영업사원 목록 재로드
  useEffect(() => {
    if (mounted && userProfile) {
      loadCounselors();
      setSelectedCounselor('');
    }
  }, [departmentFilter]);

  // Hydration 방지
  if (!mounted) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3 text-text-secondary">
            <businessIcons.team className="w-6 h-6" />
            <span>로딩 중...</span>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3 text-text-secondary">
            <businessIcons.team className="w-6 h-6 animate-spin" />
            <span>영업사원 데이터 로딩 중...</span>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className={designSystem.components.typography.h2}>상담 현황 실시간 모니터링</h1>
          <p className="text-text-secondary mt-2">
            영업사원별 실시간 진행상황을 모니터링하세요
          </p>
        </div>

        {/* 영업사원 선택 및 필터 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-xs font-medium text-text-primary mb-1">부서 선택</label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
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
              value={selectedCounselor}
              onChange={(e) => setSelectedCounselor(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-border-primary rounded bg-bg-primary text-text-primary"
            >
              <option value="">영업사원을 선택하세요</option>
              {counselors.map(counselor => (
                <option key={counselor.id} value={counselor.id}>
                  {counselor.name} ({counselor.assigned_count}건)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-primary mb-1">계약상태 필터</label>
            <select
              value={contractFilter}
              onChange={(e) => setContractFilter(e.target.value)}
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
          
          <button
            onClick={() => {
              if (checkAdminPermission()) {
                loadCounselors()
                if (selectedCounselor) {
                  loadCounselorLeads(selectedCounselor, currentPage)
                }
              }
            }}
            disabled={loading || leadsLoading}
            className={designSystem.utils.cn(
              "px-2 py-1.5 text-xs rounded font-medium transition-colors mt-5",
              loading || leadsLoading
                ? "bg-bg-secondary text-text-tertiary cursor-not-allowed"
                : "bg-accent text-white hover:bg-accent/90"
            )}
          >
            <RefreshCw className={`w-3 h-3 mr-1 inline ${(loading || leadsLoading) ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>

        {/* 선택된 영업사원 현황 */}
        {selectedCounselorInfo && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-xs">배정</p>
                  <p className="text-lg font-bold text-text-primary">{selectedCounselorInfo.assigned_count}</p>
                </div>
                <businessIcons.contact className="w-6 h-6 text-text-secondary" />
              </div>
            </div>

            <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-xs">미접촉</p>
                  <p className="text-lg font-bold text-text-primary">
                    {selectedCounselorInfo.assigned_count - selectedCounselorInfo.in_progress_count - selectedCounselorInfo.completed_count - selectedCounselorInfo.contracted_count}
                  </p>
                </div>
                <businessIcons.phone className="w-6 h-6 text-text-secondary" />
              </div>
            </div>

            <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-xs">상담중</p>
                  <p className="text-lg font-bold text-accent">{selectedCounselorInfo.in_progress_count}</p>
                </div>
                <businessIcons.message className="w-6 h-6 text-accent" />
              </div>
            </div>

            <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-xs">계약</p>
                  <p className="text-lg font-bold text-accent">{selectedCounselorInfo.contracted_count}</p>
                </div>
                <businessIcons.script className="w-6 h-6 text-accent" />
              </div>
            </div>

            <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-xs">총 매출</p>
                  <p className="text-sm font-bold text-accent">
                    {selectedCounselorInfo.total_contract_amount > 0 
                      ? `${(selectedCounselorInfo.total_contract_amount / 10000).toFixed(0)}만원`
                      : '0원'
                    }
                  </p>
                </div>
                <businessIcons.date className="w-6 h-6 text-accent" />
              </div>
            </div>
          </div>
        )}

        {/* 추가 필터 및 검색 */}
        {selectedCounselor && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              {/* 빈 공간 - 기존 상태 필터 제거됨 */}
            </div>
            
            {/* 검색창 */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-text-secondary" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="고객명, 전화번호로 검색..."
                className="pl-7 pr-3 py-1 w-48 text-xs border border-border-primary rounded bg-bg-primary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
        )}

        {/* 제목과 검색 영역 */}
        {selectedCounselor && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <businessIcons.team className="w-3 h-3 text-accent" />
              <h3 className="text-xs font-medium text-text-primary">
                {selectedCounselorInfo?.name}님의 배정 고객
              </h3>
              <span className="text-xs text-text-secondary px-1.5 py-0.5 bg-bg-secondary rounded">
                전체 {totalCount.toLocaleString()}명 (페이지당 {itemsPerPage}명)
              </span>
              {!hasPermission('phone_unmask') && (
                <span className="text-xs text-text-tertiary bg-bg-secondary px-1.5 py-0.5 rounded">
                  전화번호 마스킹됨
                </span>
              )}
              {leadsLoading && (
                <span className="text-xs text-accent animate-pulse">로딩 중...</span>
              )}
            </div>
          </div>
        )}

        {/* 영업사원 리드 목록 */}
        {selectedCounselor && (
          <div className="bg-bg-primary border border-border-primary rounded-lg overflow-hidden">
            {leadsLoading ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-8 h-8 text-text-tertiary mx-auto mb-2 animate-spin" />
                <p className="text-text-secondary">상담 데이터 로딩 중...</p>
              </div>
            ) : counselorLeads.length > 0 ? (
              <>
                <div className="overflow-auto" style={{ maxHeight: '65vh' }}>
                  <table className="w-full table-fixed">
                    <thead className="bg-bg-secondary sticky top-0 z-10">
                      <tr>
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
                        <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-16">
                          <div className="flex items-center justify-center gap-0.5">
                            <businessIcons.team className="w-3 h-3" />
                            상태
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
                      {counselorLeads.map((lead) => (
                        <tr key={lead.assignment_id} className="border-b border-border-primary hover:bg-bg-hover transition-colors">
                          {/* 배정일 */}
                          <td className="py-1 px-1 text-center">
                            <span className="text-text-secondary text-xs whitespace-nowrap">
                              {new Date(lead.assigned_at).toLocaleDateString('ko-KR', {
                                month: '2-digit',
                                day: '2-digit'
                              })}
                            </span>
                          </td>

                          {/* 회원등급 */}
                          <td className="py-1 px-1 text-center">
                            {renderGradeBadge(lead.customer_grade)}
                          </td>

                          {/* 고객명 */}
                          <td className="py-1 px-1 text-center">
                            <div className="text-xs whitespace-nowrap truncate">
                              {lead.actual_customer_name ? (
                                <span className="text-text-primary font-medium">
                                  {highlightText(lead.actual_customer_name, debouncedSearchTerm)}
                                </span>
                              ) : lead.real_name ? (
                                <span className="text-text-primary">
                                  {highlightText(lead.real_name, debouncedSearchTerm)}
                                </span>
                              ) : lead.contact_name ? (
                                <span className="text-text-secondary">
                                  {highlightText(lead.contact_name, debouncedSearchTerm)}
                                </span>
                              ) : (
                                <span className="text-text-tertiary">미확인</span>
                              )}
                            </div>
                          </td>

                          {/* 전화번호 */}
                          <td className="py-1 px-1 text-center">
                            <div className="font-mono text-text-primary font-medium text-xs truncate">
                              {highlightText(maskPhoneNumber(lead.phone), debouncedSearchTerm)}
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
                              {lead.call_attempts}
                            </span>
                          </td>

                          {/* 최근 상담 */}
                          <td className="py-1 px-1 text-center">
                            <div className="text-xs">
                              <span className="text-text-secondary whitespace-nowrap">
                                {lead.last_contact_date 
                                  ? new Date(lead.last_contact_date).toLocaleDateString('ko-KR', {
                                      month: '2-digit',
                                      day: '2-digit'
                                    })
                                  : '-'
                                }
                              </span>
                              {lead.customer_reaction && (
                                <div className="text-text-tertiary mt-0.5 truncate">
                                  {lead.customer_reaction}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 상태 */}
                          <td className="py-1 px-1 text-center">
                            {getStatusBadge(lead.status)}
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
                          onClick={() => handlePageChange(1)}
                          disabled={currentPage === 1}
                          className="px-2 py-1 text-xs border border-border-primary rounded bg-bg-primary text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-hover transition-colors"
                        >
                          첫페이지
                        </button>
                        
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="px-2 py-1 text-xs border border-border-primary rounded bg-bg-primary text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-hover transition-colors"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                        
                        <span className="px-2 py-1 text-xs text-white bg-accent rounded">
                          {currentPage} / {totalPages}
                        </span>
                        
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="px-2 py-1 text-xs border border-border-primary rounded bg-bg-primary text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-hover transition-colors"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                        
                        <button
                          onClick={() => handlePageChange(totalPages)}
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
                <h3 className="text-lg font-medium text-text-primary mb-2">
                  배정된 고객이 없습니다
                </h3>
                <p className="text-text-secondary">
                  영업사원에게 고객을 배정하면 여기에 표시됩니다.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 영업사원 미선택 시 */}
        {!selectedCounselor && (
          <div className="text-center py-12">
            <businessIcons.team className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">
              영업사원을 선택해주세요
            </h3>
            <p className="text-text-secondary">
              위에서 영업사원을 선택하면 해당 영업사원의 실시간 진행상황을 확인할 수 있습니다.
            </p>
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
                      setShowMemoHistoryModal(false)
                      setSelectedLeadForMemo(null)
                      setMemoHistory([])
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
  )
}

export default function CounselingMonitorPage() {
  return (
    <ProtectedRoute requiredPermission="consulting_monitor">
      <CounselingMonitorContent />
    </ProtectedRoute>
  );
}