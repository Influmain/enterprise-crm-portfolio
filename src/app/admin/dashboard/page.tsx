'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { designSystem } from '@/lib/design-system';
import { businessIcons } from '@/lib/design-system/icons';
import { useToastHelpers } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';

// 타입 정의 - 상담 페이지와 동일
interface CustomerGrade {
  grade: string;
  grade_memo?: string;
  grade_color: string;
  updated_at: string;
  updated_by: string;
  history: Array<{
    grade: string;
    date: string;
    memo?: string;
  }>;
}

// 회원등급 옵션 정의 - 상담 페이지와 동일
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

interface DashboardStats {
  totalCustomers: number;
  totalCounselors: number;
  totalContracts: number;
  totalRevenue: number;
  conversionRate: number;
  activeAssignments: number;
  notContactedCount: number;
  inProgressCount: number;
  paymentLikely: number;
  paymentComplete: number;
}

interface CounselorPerformance {
  counselor_id: string;
  counselor_name: string;
  total_assigned: number;
  contracted: number;
  total_revenue: number;
  conversion_rate: number;
  last_activity: string;
}

interface RecentContract {
  id: string;
  customer_name: string;
  counselor_name: string;
  contract_amount: number;
  contact_date: string;
  data_source: string;
}

function AdminDashboardContent() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const toast = useToastHelpers();
  
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalCounselors: 0,
    totalContracts: 0,
    totalRevenue: 0,
    conversionRate: 0,
    activeAssignments: 0,
    notContactedCount: 0,
    inProgressCount: 0,
    paymentLikely: 0,
    paymentComplete: 0
  });
  
  const [counselorPerformance, setCounselorPerformance] = useState<CounselorPerformance[]>([]);
  const [recentContracts, setRecentContracts] = useState<RecentContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // 권한 체크 - 상담 페이지와 동일 패턴
  useEffect(() => {
    if (user && userProfile?.role !== 'admin') {
      toast.error('접근 권한 없음', '관리자만 접근할 수 있습니다.')
      router.push('/login')
      return
    }
  }, [user, userProfile])

  // 뷰 테이블 적용한 전체 통계 로드 (상담원 대시보드와 동일한 방식)
  const loadOverallStats = async (): Promise<DashboardStats> => {
    // 총 고객 수
    const { count: totalCustomers } = await supabase
      .from('lead_pool')
      .select('*', { count: 'exact', head: true });

    // 총 영업사원 수
    const { count: totalCounselors } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'counselor')
      .eq('is_active', true);

    // 뷰 테이블에서 모든 배정 데이터 가져오기 (배치 처리)
    let allAssignments: any[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: batch } = await supabase
        .from('counselor_leads_view')
        .select('*')
        .range(from, from + batchSize - 1);

      if (batch && batch.length > 0) {
        allAssignments = allAssignments.concat(batch);
        from += batchSize;
        
        if (batch.length < batchSize) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    let totalContracts = 0;
    let totalRevenue = 0;
    let notContactedCount = 0;
    let inProgressCount = 0;
    let paymentLikely = 0;
    let paymentComplete = 0;

    // 뷰 데이터에서 통계 계산 (상담원 대시보드와 동일한 로직)
    allAssignments.forEach(assignment => {
      // 상태 계산
      if (!assignment.last_contact_date) {
        notContactedCount++;
      } else {
        if (assignment.latest_contract_status === 'contracted') {
          totalContracts++;
          totalRevenue += assignment.contract_amount || 0;
        } else {
          inProgressCount++;
        }
      }

      // 회원등급별 통계
      if (assignment.additional_data) {
        const additionalData = typeof assignment.additional_data === 'string' 
          ? JSON.parse(assignment.additional_data) 
          : assignment.additional_data;
        
        if (additionalData?.grade) {
          if (additionalData.grade === '결제[유력]') {
            paymentLikely++;
          } else if (additionalData.grade === '결제[완료]') {
            paymentComplete++;
          }
        }
      }
    });

    // 전환율 계산
    const conversionRate = totalCustomers ? (totalContracts / totalCustomers) * 100 : 0;

    return {
      totalCustomers: totalCustomers || 0,
      totalCounselors: totalCounselors || 0,
      totalContracts,
      totalRevenue,
      conversionRate,
      activeAssignments: allAssignments.length,
      notContactedCount,
      inProgressCount,
      paymentLikely,
      paymentComplete
    };
  };

  // v6 패턴 적용한 영업사원 성과 로드
  const loadCounselorPerformance = async (): Promise<CounselorPerformance[]> => {
    const { data: counselorsData } = await supabase
      .from('users')
      .select('id, full_name, email, role, phone, department, is_active')
      .eq('role', 'counselor')
      .eq('is_active', true)
      .order('full_name', { ascending: true });

    // 각 영업사원별 통계 계산 (v6 패턴)
    const enrichedCounselors = await Promise.all(
      counselorsData?.map(async (counselor) => {
        // 배정된 리드와 상담 기록 조회
        const { data: assignmentsData } = await supabase
          .from('lead_assignments')
          .select(`
            id,
            counseling_activities (
              contact_result,
              contract_status,
              contract_amount,
              contact_date
            )
          `)
          .eq('counselor_id', counselor.id)
          .eq('status', 'active');

        let contractedCount = 0;
        let totalContractAmount = 0;
        let lastActivityDate = '';

        // v6 패턴: assignment별 최신 기록만 집계
        assignmentsData?.forEach(assignment => {
          const activities = assignment.counseling_activities;
          if (activities && activities.length > 0) {
            // contact_date 기준 최신 기록만 사용
            const latestActivity = activities
              .sort((a, b) => new Date(b.contact_date).getTime() - new Date(a.contact_date).getTime())[0];
            
            // 최근 활동 날짜 추적
            if (latestActivity.contact_date && latestActivity.contact_date > lastActivityDate) {
              lastActivityDate = latestActivity.contact_date;
            }
            
            // 계약 집계 (최신 상태만)
            if (latestActivity.contract_status === 'contracted') {
              contractedCount++;
              totalContractAmount += latestActivity.contract_amount || 0;
            }
          }
        });

        return {
          counselor_id: counselor.id,
          counselor_name: counselor.full_name,
          total_assigned: assignmentsData?.length || 0,
          contracted: contractedCount,
          total_revenue: totalContractAmount,
          conversion_rate: assignmentsData?.length ? (contractedCount / assignmentsData.length) * 100 : 0,
          last_activity: lastActivityDate
        };
      }) || []
    );

    return enrichedCounselors;
  };

  // v6 패턴 적용한 최근 계약 로드
  const loadRecentContracts = async (): Promise<RecentContract[]> => {
    // 고유한 assignment별로 최신 계약만 조회
    const { data: assignmentsWithContracts } = await supabase
      .from('lead_assignments')
      .select(`
        id,
        lead_pool (
          id,
          contact_name,
          data_source
        ),
        users!counselor_id (
          full_name
        ),
        counseling_activities (
          id,
          contract_amount,
          contact_date,
          actual_customer_name,
          contract_status
        )
      `)
      .eq('status', 'active');

    if (!assignmentsWithContracts) return [];

    const uniqueContracts: RecentContract[] = [];

    // v6 패턴: assignment별로 최신 계약 상태만 추출
    assignmentsWithContracts.forEach(assignment => {
      const activities = assignment.counseling_activities;
      if (activities && activities.length > 0) {
        // contact_date 기준 최신 활동 찾기
        const latestActivity = activities
          .sort((a, b) => new Date(b.contact_date).getTime() - new Date(a.contact_date).getTime())[0];

        // 계약 완료된 경우만 포함
        if (latestActivity?.contract_status === 'contracted' && latestActivity.contract_amount) {
          uniqueContracts.push({
            id: latestActivity.id,
            customer_name: latestActivity.actual_customer_name || assignment.lead_pool?.contact_name || '고객명 미확인',
            counselor_name: assignment.users?.full_name || '영업사원 미확인',
            contract_amount: latestActivity.contract_amount,
            contact_date: latestActivity.contact_date,
            data_source: assignment.lead_pool?.data_source || '출처 미확인'
          });
        }
      }
    });

    // 날짜순 정렬 후 최대 10개만 반환
    return uniqueContracts
      .sort((a, b) => new Date(b.contact_date).getTime() - new Date(a.contact_date).getTime())
      .slice(0, 10);
  };

  // 통합 데이터 로드 함수
  const loadDashboardData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      console.log('관리자 대시보드 데이터 로드 시작');
      
      const [statsResult, counselorResult, contractsResult] = await Promise.all([
        loadOverallStats(),
        loadCounselorPerformance(),
        loadRecentContracts()
      ]);

      setStats(statsResult);
      setCounselorPerformance(counselorResult);
      setRecentContracts(contractsResult);
      setLastUpdated(new Date());
      
      toast.success('대시보드 업데이트 완료', '최신 데이터로 업데이트되었습니다.');
      
    } catch (error: any) {
      console.error('대시보드 데이터 로드 실패:', error);
      toast.error('데이터 로드 실패', error.message, {
        action: { label: '다시 시도', onClick: () => loadDashboardData() }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadDashboardData()
    }
  }, [user?.id]);

  // 등급별 배지 렌더링 - 상담 페이지와 동일
  const renderGradeBadge = (grade?: CustomerGrade) => {
    if (!grade) {
      return (
        <span className="px-1.5 py-0.5 rounded text-xs bg-bg-secondary text-text-tertiary">
          미분류
        </span>
      )
    }

    return (
      <span 
        className="px-1.5 py-0.5 rounded text-xs text-white font-medium"
        style={{ backgroundColor: grade.grade_color }}
      >
        {grade.grade}
      </span>
    )
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3 text-text-secondary">
            <businessIcons.team className="w-6 h-6 animate-spin" />
            <span>관리자 대시보드 로딩 중...</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* 헤더 - 컴팩트하게 */}
        <div className="mb-6">
          <h1 className={designSystem.components.typography.h2}>관리자 대시보드</h1>
          <p className="text-text-secondary mt-2">
            전체 비즈니스 현황과 영업사원 성과를 관리하세요
          </p>
          <p className="text-text-tertiary text-sm mt-1">
            마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')}
          </p>
        </div>

        {/* 핵심 통계 카드들 - 상담원 대시보드 스타일로 컴팩트 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">총 고객</p>
                <p className="text-xl font-bold text-text-primary">{stats.totalCustomers}</p>
              </div>
              <businessIcons.contact className="w-6 h-6 text-accent" />
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">활성 영업사원</p>
                <p className="text-xl font-bold text-text-primary">{stats.totalCounselors}</p>
              </div>
              <businessIcons.team className="w-6 h-6 text-accent" />
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">결제유력</p>
                <p className="text-xl font-bold text-accent">{stats.paymentLikely}</p>
              </div>
              <businessIcons.script className="w-6 h-6 text-accent" />
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">총 매출</p>
                <p className="text-xl font-bold text-success">
                  {(stats.totalRevenue / 10000).toFixed(0)}만원
                </p>
              </div>
              <businessIcons.assignment className="w-6 h-6 text-success" />
            </div>
          </div>
        </div>

        {/* 상세 현황 카드 - 컴팩트 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">전체 배정</p>
                <p className="text-xl font-bold text-text-primary">{stats.activeAssignments}</p>
              </div>
              <businessIcons.assignment className="w-6 h-6 text-accent" />
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">미접촉</p>
                <p className="text-xl font-bold text-text-primary">{stats.notContactedCount}</p>
              </div>
              <businessIcons.phone className="w-6 h-6 text-text-secondary" />
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">상담중</p>
                <p className="text-xl font-bold text-warning">{stats.inProgressCount}</p>
              </div>
              <businessIcons.message className="w-6 h-6 text-warning" />
            </div>
          </div>
        </div>

        {/* 새로고침 버튼 */}
        <div className="flex justify-end mb-6">
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className={designSystem.utils.cn(
              designSystem.components.button.secondary,
              "px-4 py-2"
            )}
          >
            <businessIcons.team className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>

        {/* 최근 계약 완료 테이블 */}
        <div className="bg-bg-primary border border-border-primary rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border-primary">
            <div className="flex items-center gap-2">
              <businessIcons.analytics className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-medium text-text-primary">최근 계약 완료</h3>
              <span className="text-xs text-text-secondary px-1.5 py-0.5 bg-bg-secondary rounded">
                {recentContracts.length}건
              </span>
            </div>
          </div>

          {recentContracts.length > 0 ? (
            <div className="overflow-auto" style={{ maxHeight: '50vh' }}>
              <table className="w-full table-fixed">
                <thead className="bg-bg-secondary sticky top-0 z-10">
                  <tr>
                    <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-16">
                      <div className="flex items-center justify-center gap-0.5">
                        <businessIcons.contact className="w-3 h-3" />
                        고객명
                      </div>
                    </th>
                    <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-14">
                      <div className="flex items-center justify-center gap-0.5">
                        <businessIcons.team className="w-3 h-3" />
                        영업사원
                      </div>
                    </th>
                    <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-16">
                      <div className="flex items-center justify-center gap-0.5">
                        <businessIcons.assignment className="w-3 h-3" />
                        계약금액
                      </div>
                    </th>
                    <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-12">
                      <div className="flex items-center justify-center gap-0.5">
                        <businessIcons.date className="w-3 h-3" />
                        계약일
                      </div>
                    </th>
                    <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-14">
                      <div className="flex items-center justify-center gap-0.5">
                        <businessIcons.script className="w-3 h-3" />
                        출처
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentContracts.map((contract) => (
                    <tr 
                      key={contract.id} 
                      className="border-b border-border-primary hover:bg-bg-hover transition-colors"
                    >
                      {/* 고객명 */}
                      <td className="py-1 px-1 text-center">
                        <div className="text-xs font-medium text-text-primary truncate">
                          {contract.customer_name}
                        </div>
                      </td>

                      {/* 영업사원 */}
                      <td className="py-1 px-1 text-center">
                        <div className="text-xs text-text-primary truncate">
                          {contract.counselor_name}
                        </div>
                      </td>

                      {/* 계약금액 */}
                      <td className="py-1 px-1 text-center">
                        <span className="font-bold text-success text-xs">
                          {(contract.contract_amount / 10000).toFixed(0)}만원
                        </span>
                      </td>

                      {/* 계약일 */}
                      <td className="py-1 px-1 text-center">
                        <span className="text-text-secondary text-xs whitespace-nowrap">
                          {new Date(contract.contact_date).toLocaleDateString('ko-KR', {
                            month: '2-digit',
                            day: '2-digit'
                          })}
                        </span>
                      </td>

                      {/* 출처 */}
                      <td className="py-1 px-1 text-center">
                        <div className="text-xs text-text-secondary truncate">
                          {contract.data_source}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <businessIcons.analytics className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">
                아직 계약 데이터가 없습니다
              </h3>
              <p className="text-text-secondary">
                영업사원이 계약을 완료하면 여기에 표시됩니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default function AdminDashboard() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}