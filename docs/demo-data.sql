-- ============================================
-- Enterprise CRM System - Demo Data
-- ============================================
-- 데모용 샘플 데이터
-- 실행 전: database-schema.sql을 먼저 실행하세요
-- ============================================

-- ============================================
-- 중요: 실제 사용 전 준비사항
-- ============================================
-- 1. Supabase Dashboard > Authentication에서 먼저 사용자 계정 생성
-- 2. 생성된 UUID를 아래 INSERT 문의 id 값으로 사용
-- 3. 데모 환경이므로 실제 운영에서는 사용하지 마세요
-- ============================================

-- ============================================
-- 1. 데모 사용자 생성
-- ============================================
-- 참고: auth.users는 Supabase Dashboard에서 먼저 생성해야 함
-- 여기서는 users 테이블에만 프로필 추가

-- 최고관리자
INSERT INTO users (id, email, full_name, phone, department, role, is_super_admin, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@demo.com', '최고관리자', '010-1111-1111', '경영지원팀', 'admin', true, true)
ON CONFLICT (id) DO NOTHING;

-- 일반관리자
INSERT INTO users (id, email, full_name, phone, department, role, is_super_admin, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000002', 'manager@demo.com', '김관리', '010-2222-2222', '영업팀', 'admin', false, true)
ON CONFLICT (id) DO NOTHING;

-- 영업사원
INSERT INTO users (id, email, full_name, phone, department, role, is_super_admin, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000003', 'counselor1@demo.com', '이영업', '010-3333-3333', '영업1팀', 'counselor', false, true),
  ('00000000-0000-0000-0000-000000000004', 'counselor2@demo.com', '박상담', '010-4444-4444', '영업1팀', 'counselor', false, true),
  ('00000000-0000-0000-0000-000000000005', 'counselor3@demo.com', '최영업', '010-5555-5555', '영업2팀', 'counselor', false, true),
  ('00000000-0000-0000-0000-000000000006', 'counselor4@demo.com', '정상담', '010-6666-6666', '영업2팀', 'counselor', false, true),
  ('00000000-0000-0000-0000-000000000007', 'counselor5@demo.com', '강영업', '010-7777-7777', '영업3팀', 'counselor', false, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. 관리자 권한 부여
-- ============================================

INSERT INTO user_permissions (user_id, permission_type, granted_by, is_active)
VALUES
  -- 일반관리자에게 모든 권한 부여
  ('00000000-0000-0000-0000-000000000002', 'dashboard', '00000000-0000-0000-0000-000000000001', true),
  ('00000000-0000-0000-0000-000000000002', 'leads', '00000000-0000-0000-0000-000000000001', true),
  ('00000000-0000-0000-0000-000000000002', 'counselors', '00000000-0000-0000-0000-000000000001', true),
  ('00000000-0000-0000-0000-000000000002', 'assignments', '00000000-0000-0000-0000-000000000001', true),
  ('00000000-0000-0000-0000-000000000002', 'upload', '00000000-0000-0000-0000-000000000001', true),
  ('00000000-0000-0000-0000-000000000002', 'consulting_monitor', '00000000-0000-0000-0000-000000000001', true),
  ('00000000-0000-0000-0000-000000000002', 'phone_unmask', '00000000-0000-0000-0000-000000000001', true),
  ('00000000-0000-0000-0000-000000000002', 'settings', '00000000-0000-0000-0000-000000000001', true)
ON CONFLICT (user_id, permission_type) DO NOTHING;

-- ============================================
-- 3. 샘플 고객 데이터 (lead_pool)
-- ============================================

INSERT INTO lead_pool (phone, contact_name, real_name, data_source, contact_script, data_date, status)
VALUES
  -- 미배정 고객
  ('010-1000-0001', '김철수', NULL, 'A데이터', '재테크 상담 희망', '2024-10-01', 'available'),
  ('010-1000-0002', '이영희', NULL, 'B데이터', '보험 가입 문의', '2024-10-02', 'available'),
  ('010-1000-0003', '박민수', NULL, 'A데이터', '투자 상품 관심', '2024-10-03', 'available'),
  ('010-1000-0004', '최지은', NULL, 'C데이터', '부동산 투자', '2024-10-04', 'available'),
  ('010-1000-0005', '정대현', NULL, 'B데이터', '연금 상담', '2024-10-05', 'available'),

  -- 배정된 고객
  ('010-2000-0001', '강민호', '강민호', 'A데이터', '재테크 상담 희망', '2024-09-01', 'assigned'),
  ('010-2000-0002', '조수연', '조수연', 'B데이터', '보험 가입 문의', '2024-09-02', 'assigned'),
  ('010-2000-0003', '윤지혜', '윤지혜', 'A데이터', '투자 상품 관심', '2024-09-03', 'assigned'),
  ('010-2000-0004', '임태훈', '임태훈', 'C데이터', '부동산 투자', '2024-09-04', 'assigned'),
  ('010-2000-0005', '한소희', '한소희', 'B데이터', '연금 상담', '2024-09-05', 'assigned'),
  ('010-2000-0006', '오준석', '오준석', 'A데이터', '재테크 상담', '2024-09-06', 'assigned'),
  ('010-2000-0007', '신예진', '신예진', 'B데이터', '보험 리모델링', '2024-09-07', 'assigned'),
  ('010-2000-0008', '배성민', '배성민', 'C데이터', '투자 포트폴리오', '2024-09-08', 'assigned'),
  ('010-2000-0009', '송하늘', '송하늘', 'A데이터', '노후 준비', '2024-09-09', 'assigned'),
  ('010-2000-0010', '장미래', '장미래', 'B데이터', '자녀 교육비', '2024-09-10', 'assigned'),

  -- 계약 완료 고객
  ('010-3000-0001', '김성공', '김성공', 'A데이터', '재테크 상담 희망', '2024-08-01', 'completed'),
  ('010-3000-0002', '이계약', '이계약', 'B데이터', '보험 가입 문의', '2024-08-02', 'completed'),
  ('010-3000-0003', '박완료', '박완료', 'A데이터', '투자 상품 관심', '2024-08-03', 'completed'),
  ('010-3000-0004', '최성사', '최성사', 'C데이터', '부동산 투자', '2024-08-04', 'completed'),
  ('010-3000-0005', '정수익', '정수익', 'B데이터', '연금 상담', '2024-08-05', 'completed'),
  ('010-3000-0006', '강매출', '강매출', 'A데이터', '재테크 상담', '2024-08-06', 'completed'),
  ('010-3000-0007', '조계약', '조계약', 'B데이터', '보험 리모델링', '2024-08-07', 'completed'),
  ('010-3000-0008', '윤완료', '윤완료', 'C데이터', '투자 포트폴리오', '2024-08-08', 'completed')
ON CONFLICT (phone) DO NOTHING;

-- ============================================
-- 4. 배정 데이터 (lead_assignments)
-- ============================================

-- 이영업 영업사원의 배정
INSERT INTO lead_assignments (lead_id, counselor_id, assigned_by, status)
SELECT
  lp.id,
  '00000000-0000-0000-0000-000000000003', -- 이영업
  '00000000-0000-0000-0000-000000000002', -- 김관리가 배정
  CASE
    WHEN lp.phone LIKE '010-3%' THEN 'completed'
    ELSE 'active'
  END
FROM lead_pool lp
WHERE lp.phone IN (
  '010-2000-0001', '010-2000-0002', -- 상담 중
  '010-3000-0001', '010-3000-0002'  -- 계약 완료
)
ON CONFLICT DO NOTHING;

-- 박상담 영업사원의 배정
INSERT INTO lead_assignments (lead_id, counselor_id, assigned_by, status)
SELECT
  lp.id,
  '00000000-0000-0000-0000-000000000004', -- 박상담
  '00000000-0000-0000-0000-000000000002',
  CASE
    WHEN lp.phone LIKE '010-3%' THEN 'completed'
    ELSE 'active'
  END
FROM lead_pool lp
WHERE lp.phone IN (
  '010-2000-0003', '010-2000-0004',
  '010-3000-0003', '010-3000-0004'
)
ON CONFLICT DO NOTHING;

-- 최영업 영업사원의 배정
INSERT INTO lead_assignments (lead_id, counselor_id, assigned_by, status)
SELECT
  lp.id,
  '00000000-0000-0000-0000-000000000005', -- 최영업
  '00000000-0000-0000-0000-000000000002',
  CASE
    WHEN lp.phone LIKE '010-3%' THEN 'completed'
    ELSE 'active'
  END
FROM lead_pool lp
WHERE lp.phone IN (
  '010-2000-0005', '010-2000-0006',
  '010-3000-0005', '010-3000-0006'
)
ON CONFLICT DO NOTHING;

-- 정상담 영업사원의 배정
INSERT INTO lead_assignments (lead_id, counselor_id, assigned_by, status)
SELECT
  lp.id,
  '00000000-0000-0000-0000-000000000006', -- 정상담
  '00000000-0000-0000-0000-000000000002',
  CASE
    WHEN lp.phone LIKE '010-3%' THEN 'completed'
    ELSE 'active'
  END
FROM lead_pool lp
WHERE lp.phone IN (
  '010-2000-0007', '010-2000-0008',
  '010-3000-0007', '010-3000-0008'
)
ON CONFLICT DO NOTHING;

-- 강영업 영업사원의 배정
INSERT INTO lead_assignments (lead_id, counselor_id, assigned_by, status)
SELECT
  lp.id,
  '00000000-0000-0000-0000-000000000007', -- 강영업
  '00000000-0000-0000-0000-000000000002',
  'active'
FROM lead_pool lp
WHERE lp.phone IN (
  '010-2000-0009', '010-2000-0010'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. 상담 기록 (counseling_activities)
-- ============================================

-- 계약 완료 고객의 상담 기록
INSERT INTO counseling_activities (
  assignment_id,
  contact_date,
  contact_method,
  actual_customer_name,
  counseling_memo,
  investment_budget,
  customer_interest,
  contract_status,
  contract_amount
)
SELECT
  la.id,
  CURRENT_DATE - INTERVAL '30 days',
  '전화',
  lp.real_name,
  JSON_BUILD_ARRAY(
    JSON_BUILD_OBJECT(
      'content', '초기 상담 완료. 관심도 높음.',
      'timestamp', (CURRENT_DATE - INTERVAL '30 days')::TEXT,
      'author', u.full_name
    ),
    JSON_BUILD_OBJECT(
      'content', '계약 완료. 월 50만원 납입.',
      'timestamp', (CURRENT_DATE - INTERVAL '20 days')::TEXT,
      'author', u.full_name
    )
  )::TEXT,
  '5,000만원',
  'payment_completed', -- 결제완료
  'contracted',
  5000000
FROM lead_assignments la
JOIN lead_pool lp ON la.lead_id = lp.id
JOIN users u ON la.counselor_id = u.id
WHERE lp.phone LIKE '010-3%'
LIMIT 8;

-- 상담 중 고객의 상담 기록
INSERT INTO counseling_activities (
  assignment_id,
  contact_date,
  contact_method,
  actual_customer_name,
  counseling_memo,
  investment_budget,
  customer_interest,
  contract_status,
  contract_amount
)
SELECT
  la.id,
  CURRENT_DATE - INTERVAL '5 days',
  '전화',
  lp.real_name,
  JSON_BUILD_ARRAY(
    JSON_BUILD_OBJECT(
      'content', '첫 상담. 관심 있어하시나 검토 시간 필요.',
      'timestamp', (CURRENT_DATE - INTERVAL '5 days')::TEXT,
      'author', u.full_name
    )
  )::TEXT,
  '3,000만원',
  CASE (RANDOM() * 5)::INT
    WHEN 0 THEN 'interested'
    WHEN 1 THEN 'reconsulting_requested'
    WHEN 2 THEN 'open_entry_guide'
    WHEN 3 THEN 'management'
    ELSE 'payment_probable'
  END,
  'pending',
  NULL
FROM lead_assignments la
JOIN lead_pool lp ON la.lead_id = lp.id
JOIN users u ON la.counselor_id = u.id
WHERE lp.phone LIKE '010-2%'
LIMIT 10;

-- ============================================
-- 6. 업로드 배치 이력
-- ============================================

INSERT INTO upload_batches (
  file_name,
  file_type,
  total_rows,
  processed_rows,
  duplicate_rows,
  upload_status,
  uploaded_by,
  completed_at
)
VALUES
  ('demo_leads_2024_10.xlsx', 'xlsx', 100, 95, 5, 'completed', '00000000-0000-0000-0000-000000000002', CURRENT_DATE - INTERVAL '10 days'),
  ('demo_leads_2024_09.csv', 'csv', 200, 190, 10, 'completed', '00000000-0000-0000-0000-000000000002', CURRENT_DATE - INTERVAL '40 days'),
  ('demo_leads_2024_08.xlsx', 'xlsx', 150, 145, 5, 'completed', '00000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '70 days')
ON CONFLICT DO NOTHING;

-- ============================================
-- 데모 데이터 생성 완료!
-- ============================================
-- 이제 다음 계정으로 로그인해보세요:
--
-- 최고관리자: admin@demo.com / demo1234
-- 일반관리자: manager@demo.com / demo1234
-- 영업사원: counselor1@demo.com / demo1234
--
-- ============================================
