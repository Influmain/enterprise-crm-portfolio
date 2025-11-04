// lib/statsService.js
import { supabase } from './supabase'

/**
 * 실시간 통계 데이터를 가져오는 서비스
 * 현재 테이블 구조에 맞춰 구현 (점진적 개선)
 */
export class StatsService {
  
  /**
   * 대시보드 통계 데이터 조회
   * 현재 가능한 컬럼들로만 구현
   */
  static async getDashboardStats() {
    try {
      const today = new Date().toISOString().split('T')[0]
      const now = new Date()
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000)
      
      // 1. 총 리드 수
      const { count: totalLeads, error: totalError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
      
      if (totalError) {
        console.error('총 리드 수 조회 오류:', totalError)
      }

      // 2. 오늘 업로드된 리드 수
      const { count: todayUploads, error: todayError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfToday.toISOString())
        .lt('created_at', endOfToday.toISOString())
      
      if (todayError) {
        console.error('오늘 업로드 수 조회 오류:', todayError)
      }

      // 3. 미배분 리드 수 (현재는 전체 리드 = 미배분으로 가정)
      // 나중에 assigned_to 컬럼 추가되면 수정 예정
      const unassigned = totalLeads || 0

      // 4. 처리중 리드 수 (현재는 임시로 0, 나중에 status 컬럼 추가되면 수정)
      const processing = 0

      console.log('통계 데이터:', {
        totalLeads: totalLeads || 0,
        todayUploads: todayUploads || 0,
        unassigned,
        processing
      })

      return {
        totalLeads: totalLeads || 0,
        todayUploads: todayUploads || 0,
        unassigned,
        processing
      }
      
    } catch (error) {
      console.error('통계 데이터 조회 오류:', error)
      return {
        totalLeads: 0,
        todayUploads: 0,
        unassigned: 0,
        processing: 0
      }
    }
  }

  /**
   * 지난주 대비 성장률 계산 (현재 테이블 구조에 맞춤)
   */
  static async getGrowthRate() {
    try {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)

      // 이번주 리드 수 (지난 7일)
      const { count: thisWeek } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', lastWeek.toISOString())
        .lt('created_at', today.toISOString())

      // 지난주 리드 수 (14일 전 ~ 7일 전)
      const { count: lastWeekCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', twoWeeksAgo.toISOString())
        .lt('created_at', lastWeek.toISOString())

      if (lastWeekCount === 0) return thisWeek > 0 ? 100 : 0
      
      const growthRate = ((thisWeek - lastWeekCount) / lastWeekCount) * 100
      return Math.round(growthRate * 10) / 10 // 소수점 1자리
      
    } catch (error) {
      console.error('성장률 계산 오류:', error)
      return 0
    }
  }

  /**
   * 실시간 구독 설정 (기본 구현)
   */
  static subscribeToLeadChanges(callback) {
    const subscription = supabase
      .channel('leads_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'leads' },
        (payload) => {
          console.log('리드 데이터 변경 감지:', payload)
          callback(payload)
        }
      )
      .subscribe()

    return subscription
  }

  /**
   * 테스트용 샘플 데이터 생성 (개발 단계에서만 사용)
   */
  static async createSampleData() {
    const sampleLeads = [
      {
        db_source: '테스트DB',
        expert: '김상담',
        phone: '010-1234-5678',
        interest_type: '투자상품',
        contact_date: new Date().toISOString().split('T')[0],
        memo: '테스트 데이터 1'
      },
      {
        db_source: '테스트DB',
        expert: '이상담',
        phone: '010-9876-5432',
        interest_type: '보험상품',
        contact_date: new Date().toISOString().split('T')[0],
        memo: '테스트 데이터 2'
      }
    ]

    try {
      const { data, error } = await supabase
        .from('leads')
        .insert(sampleLeads)
        .select()

      if (error) throw error
      
      console.log('샘플 데이터 생성 완료:', data)
      return data
    } catch (error) {
      console.error('샘플 데이터 생성 실패:', error)
      return null
    }
  }
}

// 사용 예시:
// const stats = await StatsService.getDashboardStats()
// const growthRate = await StatsService.getGrowthRate()
// await StatsService.createSampleData() // 개발 단계에서만