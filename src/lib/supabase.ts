// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://okgrsbpznpmynillzoid.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rZ3JzYnB6bnBteW5pbGx6b2lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NTcxMDUsImV4cCI6MjA3MDEzMzEwNX0.WQT3j3zQblUbYHdzfuC_nGbSvhYuTESSQGFIE6iWMFo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================
// 새 스키마 타입 정의
// ============================================

// 사용자 타입
export interface User {
  id: string
  email: string
  full_name?: string
  role: 'admin' | 'counselor'
  phone?: string
  department?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// 업로드 배치 타입
export interface UploadBatch {
  id: string
  file_name: string
  file_type: 'csv' | 'xlsx'
  total_rows: number
  processed_rows: number
  duplicate_rows: number
  error_rows: number
  column_mapping?: Record<string, string>
  upload_status: 'processing' | 'completed' | 'failed' | 'completed_with_errors'
  uploaded_by?: string
  created_at: string
  completed_at?: string
}

// 리드 풀 타입 (업로드된 원본 리드)
export interface LeadPool {
  id: string
  upload_batch_id: string
  name?: string
  phone: string
  email?: string
  age?: number
  gender?: 'male' | 'female' | 'other'
  address?: string
  interest_product?: string
  source?: string
  additional_data?: Record<string, any>
  // 실제 업무 구조 칼럼들
  contact_name?: string        // 접근용 이름 (이상호, 해밀턴 등)
  data_source?: string         // DB 제공업체 (상호회사, 대구회사)
  contact_script?: string      // 접근 내용 (코인, 주식 등)
  data_date?: string          // 데이터 생성일
  extra_info?: string         // 기타 정보
  status: 'available' | 'assigned' | 'completed' | 'returned'
  uploaded_by?: string
  created_at: string
  updated_at: string
}

// 리드 배정 타입
export interface LeadAssignment {
  id: string
  lead_id: string
  counselor_id: string
  assigned_by: string
  assigned_at: string
  returned_at?: string
  status: 'active' | 'working' | 'completed' | 'returned'
  notes?: string
}

// 상담 활동 타입 (상담원 수기 입력)
export interface CounselingActivity {
  id: string
  assignment_id: string
  contact_date: string
  contact_method?: 'phone' | 'kakao' | 'sms' | 'email' | 'meeting'
  contact_result?: 'connected' | 'no_answer' | 'busy' | 'wrong_number' | 'interested' | 'not_interested' | 'appointment_set'
  summary?: string
  next_contact_date?: string
  // 상담원 수기 입력 필드들
  call_result?: 'connected' | 'no_answer' | 'call_rejected' | 'wrong_number' | 'busy'
  customer_reaction?: 'interested' | 'not_interested' | 'maybe_later' | 'refused'
  counseling_memo?: string
  actual_customer_name?: string
  customer_interest?: string
  investment_budget?: string
  next_contact_hope?: string
  contract_status: 'pending' | 'contracted' | 'failed'
  contract_amount?: number
  commission_amount?: number
  created_at: string
  updated_at: string
}

// ============================================
// 업로드 배치 서비스
// ============================================
export const uploadBatchService = {
  // 배치 생성
  async create(batch: Omit<UploadBatch, 'id' | 'created_at' | 'completed_at'>) {
    const { data, error } = await supabase
      .from('upload_batches')
      .insert([batch])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // 배치 상태 업데이트
  async updateStatus(id: string, updates: Partial<UploadBatch>) {
    const { data, error } = await supabase
      .from('upload_batches')
      .update({ ...updates, completed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // 모든 배치 조회
  async getAll() {
    const { data, error } = await supabase
      .from('upload_batches')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  }
}

// ============================================
// 리드 풀 서비스
// ============================================
export const leadPoolService = {
  // 모든 리드 조회
  async getAll() {
    const { data, error } = await supabase
      .from('lead_pool')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // available 상태 리드만 조회 (배정용)
  async getAvailable() {
    const { data, error } = await supabase
      .from('lead_pool')
      .select('*')
      .eq('status', 'available')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // 리드 배치 생성 (업로드용)
  async createBatch(leads: Omit<LeadPool, 'id' | 'created_at' | 'updated_at'>[]) {
    const { data, error } = await supabase
      .from('lead_pool')
      .insert(leads)
      .select()
    
    if (error) throw error
    return data
  },

  // 전화번호 중복 검사
  async checkDuplicatePhones(phones: string[]) {
    const { data, error } = await supabase
      .from('lead_pool')
      .select('phone')
      .in('phone', phones)
      .neq('status', 'returned')
    
    if (error) throw error
    return data
  },

  // 리드 상태 업데이트
  async updateStatus(id: string, status: LeadPool['status']) {
    const { data, error } = await supabase
      .from('lead_pool')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // 특정 배치의 리드들 조회
  async getByBatch(batchId: string) {
    const { data, error } = await supabase
      .from('lead_pool')
      .select('*')
      .eq('upload_batch_id', batchId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  }
}

// ============================================
// 리드 배정 서비스
// ============================================
export const leadAssignmentService = {
  // 리드 배정
  async assign(leadId: string, counselorId: string, assignedBy: string, notes?: string) {
    const { data, error } = await supabase
      .from('lead_assignments')
      .insert([{
        lead_id: leadId,
        counselor_id: counselorId,
        assigned_by: assignedBy,
        status: 'active',
        notes
      }])
      .select()
      .single()
    
    if (error) throw error

    // 리드 상태도 assigned로 변경
    await leadPoolService.updateStatus(leadId, 'assigned')
    
    return data
  },

  // 상담원별 배정된 리드 조회
  async getByCounselor(counselorId: string) {
    const { data, error } = await supabase
      .from('lead_assignments')
      .select(`
        *,
        lead:lead_pool(*),
        counselor:users(full_name)
      `)
      .eq('counselor_id', counselorId)
      .in('status', ['active', 'working'])
      .order('assigned_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // 모든 배정 현황 조회 (관리자용)
  async getAll() {
    const { data, error } = await supabase
      .from('lead_assignments')
      .select(`
        *,
        lead:lead_pool(*),
        counselor:users(full_name),
        assigner:users!assigned_by(full_name)
      `)
      .order('assigned_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // 배정 상태 업데이트
  async updateStatus(id: string, status: LeadAssignment['status']) {
    const { data, error } = await supabase
      .from('lead_assignments')
      .update({ status })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}

// ============================================
// 상담 활동 서비스
// ============================================
export const counselingActivityService = {
  // 상담 기록 생성
  async create(activity: Omit<CounselingActivity, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('counseling_activities')
      .insert([activity])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // 배정별 상담 기록 조회
  async getByAssignment(assignmentId: string) {
    const { data, error } = await supabase
      .from('counseling_activities')
      .select('*')
      .eq('assignment_id', assignmentId)
      .order('contact_date', { ascending: false })
    
    if (error) throw error
    return data
  },

  // 상담원별 상담 기록 조회
  async getByCounselor(counselorId: string) {
    const { data, error } = await supabase
      .from('counseling_activities')
      .select(`
        *,
        assignment:lead_assignments(
          *,
          lead:lead_pool(*)
        )
      `)
      .eq('assignment.counselor_id', counselorId)
      .order('contact_date', { ascending: false })
    
    if (error) throw error
    return data
  },

  // 상담 기록 업데이트
  async update(id: string, updates: Partial<CounselingActivity>) {
    const { data, error } = await supabase
      .from('counseling_activities')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}

// ============================================
// 사용자 서비스
// ============================================
export const userService = {
  // 모든 상담원 조회
  async getCounselors() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'counselor')
      .eq('is_active', true)
      .order('full_name', { ascending: true })
    
    if (error) throw error
    return data
  },

  // 사용자 조회
  async getById(id: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  }
}

// ============================================
// 대시보드 통계 서비스
// ============================================
export const dashboardService = {
  // 관리자 대시보드 통계
  async getAdminStats() {
    const { data, error } = await supabase
      .from('admin_lead_summary')
      .select('*')
      .single()
    
    if (error) throw error
    return data
  },

  // 상담원별 배정 현황
  async getCounselorAssignmentStats() {
    const { data, error } = await supabase
      .from('admin_counselor_assignment_view')
      .select('*')
    
    if (error) throw error
    return data
  }
}