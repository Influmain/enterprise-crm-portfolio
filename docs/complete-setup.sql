-- ============================================
-- Enterprise CRM System - 완전한 프로덕션 스키마
-- ============================================
-- 기존 운영 시스템의 모든 것을 포함한 완전한 설치 스크립트
-- 실행 방법: Supabase Dashboard > SQL Editor에 전체 복사 후 실행
-- ============================================

-- UUID 확장 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 공통 함수: updated_at 자동 업데이트
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 1. users 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR NOT NULL UNIQUE,
  full_name VARCHAR,
  role VARCHAR NOT NULL CHECK (role IN ('admin', 'counselor')),
  phone VARCHAR,
  department VARCHAR,
  is_active BOOLEAN DEFAULT true,
  is_super_admin BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. upload_batches 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS upload_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR NOT NULL,
  file_type VARCHAR CHECK (file_type IN ('csv', 'xlsx')),
  total_rows INTEGER NOT NULL,
  processed_rows INTEGER DEFAULT 0,
  duplicate_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  column_mapping JSONB,
  upload_status VARCHAR DEFAULT 'processing' CHECK (upload_status IN ('processing', 'completed', 'failed', 'completed_with_errors')),
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_upload_batches_uploaded_by ON upload_batches(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_upload_batches_status ON upload_batches(upload_status);
CREATE INDEX IF NOT EXISTS idx_upload_batches_created_at ON upload_batches(created_at DESC);

-- ============================================
-- 3. lead_pool 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS lead_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_batch_id UUID REFERENCES upload_batches(id),
  name VARCHAR,
  phone VARCHAR NOT NULL,
  email VARCHAR,
  age INTEGER,
  gender VARCHAR CHECK (gender IN ('male', 'female', 'other')),
  address TEXT,
  interest_product VARCHAR,
  source VARCHAR,
  additional_data JSONB,
  contact_name VARCHAR,
  real_name VARCHAR,
  data_source VARCHAR,
  contact_script TEXT,
  data_date TIMESTAMP WITH TIME ZONE,
  extra_info TEXT,
  status VARCHAR DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'completed', 'returned')),
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_pool_phone ON lead_pool(phone);
CREATE INDEX IF NOT EXISTS idx_lead_pool_status ON lead_pool(status);
CREATE INDEX IF NOT EXISTS idx_lead_pool_created_at ON lead_pool(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_pool_upload_batch_id ON lead_pool(upload_batch_id);
CREATE INDEX IF NOT EXISTS idx_lead_pool_data_source ON lead_pool(data_source);
CREATE INDEX IF NOT EXISTS idx_lead_pool_additional_data ON lead_pool USING GIN (additional_data);

DROP TRIGGER IF EXISTS update_lead_pool_updated_at ON lead_pool;
CREATE TRIGGER update_lead_pool_updated_at
  BEFORE UPDATE ON lead_pool
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. lead_assignments 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS lead_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES lead_pool(id),
  counselor_id UUID REFERENCES users(id),
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  returned_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'working', 'completed', 'returned')),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_lead_assignments_lead_id ON lead_assignments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_counselor_id ON lead_assignments(counselor_id);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_status ON lead_assignments(status);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_assigned_at ON lead_assignments(assigned_at DESC);

-- ============================================
-- 5. counseling_activities 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS counseling_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES lead_assignments(id),
  contact_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  contact_method VARCHAR CHECK (contact_method IN ('phone', 'kakao', 'sms', 'email', 'meeting')),
  contact_result VARCHAR CHECK (contact_result IN ('connected', 'no_answer', 'busy', 'wrong_number', 'interested', 'not_interested', 'appointment_set')),
  call_result VARCHAR CHECK (call_result IN ('connected', 'no_answer', 'call_rejected', 'wrong_number', 'busy')),
  customer_reaction VARCHAR CHECK (customer_reaction IN ('interested', 'not_interested', 'maybe_later', 'refused')),
  summary TEXT,
  counseling_memo TEXT,
  actual_customer_name VARCHAR,
  customer_interest VARCHAR,
  investment_budget VARCHAR,
  next_contact_date TIMESTAMP WITH TIME ZONE,
  next_contact_hope TIMESTAMP WITH TIME ZONE,
  contract_status VARCHAR DEFAULT 'pending' CHECK (contract_status IN ('pending', 'contracted', 'failed')),
  contract_amount NUMERIC,
  commission_amount NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_counseling_activities_assignment_id ON counseling_activities(assignment_id);
CREATE INDEX IF NOT EXISTS idx_counseling_activities_contact_date ON counseling_activities(contact_date DESC);
CREATE INDEX IF NOT EXISTS idx_counseling_activities_contract_status ON counseling_activities(contract_status);
CREATE INDEX IF NOT EXISTS idx_counseling_activities_next_contact ON counseling_activities(next_contact_date);

DROP TRIGGER IF EXISTS update_counseling_activities_updated_at ON counseling_activities;
CREATE TRIGGER update_counseling_activities_updated_at
  BEFORE UPDATE ON counseling_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. consulting_memo_history 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS consulting_memo_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES lead_assignments(id),
  memo TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_consulting_memo_history_assignment_id ON consulting_memo_history(assignment_id);
CREATE INDEX IF NOT EXISTS idx_consulting_memo_history_created_at ON consulting_memo_history(created_at DESC);

-- ============================================
-- 7. counselor_lead_stats 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS counselor_lead_stats (
  counselor_id UUID PRIMARY KEY REFERENCES auth.users(id),
  total_assigned INTEGER DEFAULT 0,
  currently_working INTEGER DEFAULT 0,
  completed_leads INTEGER DEFAULT 0,
  returned_leads INTEGER DEFAULT 0,
  total_contracts INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_counselor_lead_stats_updated_at ON counselor_lead_stats(updated_at DESC);

-- ============================================
-- 8. user_permissions 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  permission_type TEXT NOT NULL,
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, permission_type)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_type ON user_permissions(permission_type);
CREATE INDEX IF NOT EXISTS idx_user_permissions_is_active ON user_permissions(is_active);

-- ============================================
-- 9. department_permissions 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS department_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  department VARCHAR NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_department_permissions_user_id ON department_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_department_permissions_department ON department_permissions(department);

-- ============================================
-- 10. system_settings 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_settings_setting_key ON system_settings(setting_key);

-- 기본 설정값
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('phone_masking_enabled', 'true'::jsonb, '전화번호 마스킹 활성화'),
  ('auto_assignment_enabled', 'false'::jsonb, '자동 배정 활성화'),
  ('max_leads_per_counselor', '100'::jsonb, '영업사원당 최대 배정 고객 수'),
  ('data_retention_days', '365'::jsonb, '데이터 보관 기간 (일)')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================
-- 11. notifications 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type VARCHAR CHECK (type IN ('upload_complete', 'leads_assigned', 'deadline_reminder', 'security_alert')),
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================
-- 12. deletion_logs 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS deletion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_ids UUID[] NOT NULL,
  deleted_count INTEGER NOT NULL,
  deleted_by UUID NOT NULL REFERENCES auth.users(id),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  additional_info JSONB
);

CREATE INDEX IF NOT EXISTS idx_deletion_logs_deleted_by ON deletion_logs(deleted_by);
CREATE INDEX IF NOT EXISTS idx_deletion_logs_deleted_at ON deletion_logs(deleted_at DESC);
CREATE INDEX IF NOT EXISTS idx_deletion_logs_table_name ON deletion_logs(table_name);

-- ============================================
-- 비즈니스 로직 함수들
-- ============================================

-- 1. 전화번호 중복 체크 함수
CREATE OR REPLACE FUNCTION check_duplicate_phones_final(phone_list text[])
RETURNS TABLE(phone text, exists_in_db boolean, duplicate_in_list boolean, first_occurrence_index integer)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH phone_with_index AS (
    SELECT
      unnest(phone_list) as phone_number,
      generate_subscripts(phone_list, 1) as index
  ),
  phone_analysis AS (
    SELECT
      pwi.*,
      COUNT(*) OVER (PARTITION BY pwi.phone_number) > 1 as is_duplicate_in_list,
      ROW_NUMBER() OVER (PARTITION BY pwi.phone_number ORDER BY pwi.index) as occurrence_rank
    FROM phone_with_index pwi
  )
  SELECT
    pa.phone_number,
    EXISTS(
      SELECT 1 FROM public.lead_pool lp
      WHERE lp.phone = pa.phone_number
      AND lp.status != 'returned'
    ) as exists_in_db,
    pa.is_duplicate_in_list as duplicate_in_list,
    CASE
      WHEN pa.occurrence_rank = 1 THEN pa.index
      ELSE (SELECT MIN(pa2.index) FROM phone_analysis pa2 WHERE pa2.phone_number = pa.phone_number)
    END as first_occurrence_index
  FROM phone_analysis pa
  ORDER BY pa.index;
END;
$$;

-- 2. 배치 리드 삽입 함수
CREATE OR REPLACE FUNCTION insert_lead_batch_final(p_batch_id uuid, p_leads jsonb, p_uploaded_by uuid)
RETURNS TABLE(success_count integer, duplicate_count integer, error_count integer, duplicate_phones text[])
LANGUAGE plpgsql
AS $$
DECLARE
  lead_record JSONB;
  success_cnt INTEGER := 0;
  duplicate_cnt INTEGER := 0;
  error_cnt INTEGER := 0;
  duplicate_phones_arr TEXT[] := ARRAY[]::TEXT[];
  current_phone TEXT;
BEGIN
  FOR lead_record IN SELECT * FROM jsonb_array_elements(p_leads)
  LOOP
    BEGIN
      current_phone := lead_record->>'phone';

      -- DB 중복 체크
      IF EXISTS(
        SELECT 1 FROM public.lead_pool
        WHERE phone = current_phone
        AND status != 'returned'
      ) THEN
        duplicate_cnt := duplicate_cnt + 1;
        duplicate_phones_arr := array_append(duplicate_phones_arr, current_phone);
        CONTINUE;
      END IF;

      -- 전화번호 유효성 검사
      IF current_phone IS NULL OR current_phone !~ '^010-[0-9]{4}-[0-9]{4}$' THEN
        error_cnt := error_cnt + 1;
        CONTINUE;
      END IF;

      -- 리드 삽입
      INSERT INTO public.lead_pool (
        upload_batch_id,
        phone,
        name,
        contact_name,
        data_source,
        contact_script,
        extra_info,
        data_date,
        uploaded_by,
        status
      ) VALUES (
        p_batch_id,
        current_phone,
        COALESCE(lead_record->>'customer_name', '미상'),
        lead_record->>'contact_name',
        lead_record->>'data_source',
        lead_record->>'contact_script',
        lead_record->>'extra_info',
        COALESCE((lead_record->>'data_date')::TIMESTAMP WITH TIME ZONE, NOW()),
        p_uploaded_by,
        'available'
      );

      success_cnt := success_cnt + 1;

    EXCEPTION WHEN OTHERS THEN
      error_cnt := error_cnt + 1;
    END;
  END LOOP;

  -- 배치 상태 업데이트
  UPDATE public.upload_batches
  SET
    processed_rows = success_cnt,
    duplicate_rows = duplicate_cnt,
    error_rows = error_cnt,
    upload_status = CASE
      WHEN error_cnt = 0 THEN 'completed'
      ELSE 'completed_with_errors'
    END,
    completed_at = NOW()
  WHERE id = p_batch_id;

  RETURN QUERY SELECT success_cnt, duplicate_cnt, error_cnt, duplicate_phones_arr;
END;
$$;

-- 3. 동적 SQL 실행 함수 (읽기 전용)
CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_json jsonb;
BEGIN
  -- 읽기 전용 쿼리만 허용
  IF upper(trim(sql_query)) NOT LIKE 'SELECT%'
     AND upper(trim(sql_query)) NOT LIKE 'WITH%' THEN
    RAISE EXCEPTION '읽기 전용 쿼리(SELECT)만 실행할 수 있습니다.';
  END IF;

  -- 동적 SQL 실행
  EXECUTE 'SELECT jsonb_agg(row_to_json(t)::jsonb) FROM (' || sql_query || ') t'
  INTO result_json;

  RETURN COALESCE(result_json, '[]'::jsonb);
END;
$$;

-- 4. 테스트 사용자 생성 함수
CREATE OR REPLACE FUNCTION create_test_users()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  admin_uuid UUID := '11111111-1111-1111-1111-111111111111';
  counselor1_uuid UUID := '22222222-2222-2222-2222-222222222222';
  counselor2_uuid UUID := '33333333-3333-3333-3333-333333333333';
BEGIN
  -- 이미 존재하는지 확인
  IF EXISTS (SELECT 1 FROM users WHERE email = 'admin@company.com') THEN
    RETURN '✅ 테스트 사용자가 이미 존재합니다';
  END IF;

  -- 테스트 사용자 삽입
  INSERT INTO users (id, email, full_name, phone, department, role, is_active) VALUES
  (admin_uuid, 'admin@company.com', '김관리자', '010-0000-0001', 'IT팀', 'admin', true),
  (counselor1_uuid, 'counselor1@company.com', '이상담원', '010-1111-1111', '영업1팀', 'counselor', true),
  (counselor2_uuid, 'counselor2@company.com', '박상담원', '010-2222-2222', '영업2팀', 'counselor', true);

  RETURN '🎉 테스트 사용자 3명이 성공적으로 생성되었습니다';
END;
$$;

-- ============================================
-- 뷰 생성
-- ============================================

-- counselor_leads_view
CREATE OR REPLACE VIEW counselor_leads_view AS
SELECT
  la.id AS assignment_id,
  la.lead_id,
  la.counselor_id,
  la.assigned_at,
  la.status AS assignment_status,
  lp.phone,
  lp.contact_name,
  lp.real_name,
  lp.data_source,
  lp.contact_script,
  lp.additional_data,
  lp.created_at AS lead_created_at,
  lp.status AS lead_status,
  ca.contact_date AS last_contact_date,
  ca.contact_result AS latest_contact_result,
  ca.contract_status AS latest_contract_status,
  ca.contract_amount,
  ca.actual_customer_name,
  ca.counseling_memo,
  ca.contact_method AS latest_contact_method,
  ca.investment_budget,
  ca.next_contact_date,
  (
    SELECT COUNT(*)::INTEGER
    FROM counseling_activities ca_count
    WHERE ca_count.assignment_id = la.id
  ) AS call_attempts
FROM lead_assignments la
INNER JOIN lead_pool lp ON la.lead_id = lp.id
LEFT JOIN LATERAL (
  SELECT *
  FROM counseling_activities ca_sub
  WHERE ca_sub.assignment_id = la.id
  ORDER BY ca_sub.contact_date DESC
  LIMIT 1
) ca ON TRUE;

-- admin_leads_view
CREATE OR REPLACE VIEW admin_leads_view AS
SELECT
  lp.id,
  lp.phone,
  lp.contact_name,
  lp.real_name,
  lp.name,
  lp.data_source,
  lp.contact_script,
  lp.data_date,
  lp.extra_info,
  lp.status AS lead_status,
  lp.additional_data,
  lp.created_at,
  lp.updated_at,
  lp.upload_batch_id,
  la.id AS assignment_id,
  la.counselor_id,
  u.full_name AS counselor_name,
  u.department AS counselor_department,
  la.assigned_by,
  la.assigned_at,
  la.status AS assignment_status,
  la.notes AS assignment_notes,
  ca.id AS activity_id,
  ca.contact_date AS last_contact_date,
  ca.contact_method,
  ca.contact_result AS latest_contact_result,
  ca.actual_customer_name,
  ca.counseling_memo,
  ca.investment_budget,
  ca.customer_interest,
  ca.contract_status,
  ca.contract_amount,
  ca.commission_amount,
  (
    SELECT COUNT(*)::INTEGER
    FROM counseling_activities ca_count
    WHERE ca_count.assignment_id = la.id
  ) AS call_attempts
FROM lead_pool lp
LEFT JOIN lead_assignments la ON lp.id = la.lead_id AND la.status != 'returned'
LEFT JOIN users u ON la.counselor_id = u.id
LEFT JOIN LATERAL (
  SELECT *
  FROM counseling_activities ca_sub
  WHERE ca_sub.assignment_id = la.id
  ORDER BY ca_sub.contact_date DESC
  LIMIT 1
) ca ON TRUE;

-- admin_counselor_assignment_view
CREATE OR REPLACE VIEW admin_counselor_assignment_view AS
SELECT
  u.id AS counselor_id,
  u.full_name AS counselor_name,
  u.department,
  u.is_active,
  COUNT(DISTINCT la.id) AS total_assigned,
  COUNT(DISTINCT CASE WHEN la.status = 'active' THEN la.id END) AS active_assignments,
  COUNT(DISTINCT CASE WHEN la.status = 'completed' THEN la.id END) AS completed_assignments,
  MAX(la.assigned_at) AS last_assignment_date,
  COUNT(DISTINCT CASE WHEN ca.contract_status = 'contracted' THEN ca.id END) AS total_contracts
FROM users u
LEFT JOIN lead_assignments la ON u.id = la.counselor_id
LEFT JOIN counseling_activities ca ON la.id = ca.assignment_id
WHERE u.role = 'counselor'
GROUP BY u.id, u.full_name, u.department, u.is_active;

-- admin_lead_summary
CREATE OR REPLACE VIEW admin_lead_summary AS
SELECT
  COUNT(*) AS total_leads,
  COUNT(CASE WHEN status = 'available' THEN 1 END) AS available_leads,
  COUNT(CASE WHEN status = 'assigned' THEN 1 END) AS assigned_leads,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_leads,
  COUNT(CASE WHEN status = 'returned' THEN 1 END) AS returned_leads,
  COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) AS today_uploaded,
  COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) AS week_uploaded,
  COUNT(DISTINCT data_source) AS total_data_sources,
  COUNT(DISTINCT contact_name) AS total_contact_names
FROM lead_pool;

-- ============================================
-- 설치 완료!
-- ============================================
SELECT '✅ Enterprise CRM 프로덕션 데이터베이스 설치 완료!' AS status,
       '📋 12개 테이블 생성' AS tables,
       '⚡ 5개 함수 생성' AS functions,
       '🔔 3개 트리거 생성' AS triggers,
       '👁️ 4개 뷰 생성' AS views;
