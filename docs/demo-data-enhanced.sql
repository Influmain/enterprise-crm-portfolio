-- ============================================
-- Enterprise CRM System - Enhanced Demo Data
-- ============================================
-- 상용 데모를 위한 강화된 샘플 데이터
-- 실행 전: database-schema.sql을 먼저 실행하세요
-- ============================================

-- ============================================
-- 중요: 실제 사용 전 준비사항
-- ============================================
-- 1. Supabase Dashboard > Authentication에서 먼저 사용자 계정 생성
-- 2. 생성된 UUID를 아래 INSERT 문의 id 값으로 사용
-- 3. 데모 환경이므로 실제 운영에서는 사용하지 마세요
-- 4. 비밀번호는 모두 "demo1234"로 설정하세요
-- ============================================

-- 기존 데모 데이터 초기화 (선택사항)
-- DELETE FROM counseling_activities;
-- DELETE FROM lead_assignments;
-- DELETE FROM lead_pool;
-- DELETE FROM user_permissions;
-- DELETE FROM upload_batches;
-- DELETE FROM users WHERE email LIKE '%demo.com';

-- ============================================
-- 1. 데모 사용자 생성
-- ============================================

-- 최고관리자
INSERT INTO users (id, email, full_name, phone, department, role, is_super_admin, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@demo.com', '김대표', '010-1000-0001', '경영지원팀', 'admin', true, true)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  is_active = EXCLUDED.is_active;

-- 일반관리자들
INSERT INTO users (id, email, full_name, phone, department, role, is_super_admin, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000002', 'manager1@demo.com', '이팀장', '010-1000-0002', '영업1팀', 'admin', false, true),
  ('00000000-0000-0000-0000-000000000008', 'manager2@demo.com', '박팀장', '010-1000-0008', '영업2팀', 'admin', false, true)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  is_active = EXCLUDED.is_active;

-- 영업사원들 (총 10명)
INSERT INTO users (id, email, full_name, phone, department, role, is_super_admin, is_active)
VALUES
  -- 영업1팀 (5명)
  ('00000000-0000-0000-0000-000000000003', 'sales1@demo.com', '김영업', '010-2000-0001', '영업1팀', 'counselor', false, true),
  ('00000000-0000-0000-0000-000000000004', 'sales2@demo.com', '박상담', '010-2000-0002', '영업1팀', 'counselor', false, true),
  ('00000000-0000-0000-0000-000000000005', 'sales3@demo.com', '최영업', '010-2000-0003', '영업1팀', 'counselor', false, true),
  ('00000000-0000-0000-0000-000000000009', 'sales4@demo.com', '정영업', '010-2000-0004', '영업1팀', 'counselor', false, true),
  ('00000000-0000-0000-0000-000000000010', 'sales5@demo.com', '홍상담', '010-2000-0005', '영업1팀', 'counselor', false, true),

  -- 영업2팀 (5명)
  ('00000000-0000-0000-0000-000000000006', 'sales6@demo.com', '강영업', '010-3000-0001', '영업2팀', 'counselor', false, true),
  ('00000000-0000-0000-0000-000000000007', 'sales7@demo.com', '송상담', '010-3000-0002', '영업2팀', 'counselor', false, true),
  ('00000000-0000-0000-0000-000000000011', 'sales8@demo.com', '윤영업', '010-3000-0003', '영업2팀', 'counselor', false, true),
  ('00000000-0000-0000-0000-000000000012', 'sales9@demo.com', '장상담', '010-3000-0004', '영업2팀', 'counselor', false, true),
  ('00000000-0000-0000-0000-000000000013', 'sales10@demo.com', '임영업', '010-3000-0005', '영업2팀', 'counselor', false, true)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  is_active = EXCLUDED.is_active;

-- ============================================
-- 2. 관리자 권한 부여
-- ============================================

INSERT INTO user_permissions (user_id, permission_type, granted_by, is_active)
VALUES
  -- 이팀장 (영업1팀) - 모든 권한
  ('00000000-0000-0000-0000-000000000002', 'dashboard', '00000000-0000-0000-0000-000000000001', true),
  ('00000000-0000-0000-0000-000000000002', 'leads', '00000000-0000-0000-0000-000000000001', true),
  ('00000000-0000-0000-0000-000000000002', 'counselors', '00000000-0000-0000-0000-000000000001', true),
  ('00000000-0000-0000-0000-000000000002', 'assignments', '00000000-0000-0000-0000-000000000001', true),
  ('00000000-0000-0000-0000-000000000002', 'upload', '00000000-0000-0000-0000-000000000001', true),
  ('00000000-0000-0000-0000-000000000002', 'consulting_monitor', '00000000-0000-0000-0000-000000000001', true),
  ('00000000-0000-0000-0000-000000000002', 'phone_unmask', '00000000-0000-0000-0000-000000000001', true),
  ('00000000-0000-0000-0000-000000000002', 'settings', '00000000-0000-0000-0000-000000000001', true),

  -- 박팀장 (영업2팀) - 제한된 권한 (설정 권한 없음, 전화번호 마스킹 해제 없음)
  ('00000000-0000-0000-0000-000000000008', 'dashboard', '00000000-0000-0000-0000-000000000001', true),
  ('00000000-0000-0000-0000-000000000008', 'leads', '00000000-0000-0000-0000-000000000001', true),
  ('00000000-0000-0000-0000-000000000008', 'counselors', '00000000-0000-0000-0000-000000000001', true),
  ('00000000-0000-0000-0000-000000000008', 'assignments', '00000000-0000-0000-0000-000000000001', true),
  ('00000000-0000-0000-0000-000000000008', 'upload', '00000000-0000-0000-0000-000000000001', true),
  ('00000000-0000-0000-0000-000000000008', 'consulting_monitor', '00000000-0000-0000-0000-000000000001', true)
ON CONFLICT (user_id, permission_type) DO UPDATE SET
  is_active = EXCLUDED.is_active;

-- ============================================
-- 3. 부서별 접근 권한 설정
-- ============================================

INSERT INTO department_permissions (admin_id, department, granted_by, is_active)
VALUES
  -- 이팀장은 영업1팀만 관리
  ('00000000-0000-0000-0000-000000000002', '영업1팀', '00000000-0000-0000-0000-000000000001', true),

  -- 박팀장은 영업2팀만 관리
  ('00000000-0000-0000-0000-000000000008', '영업2팀', '00000000-0000-0000-0000-000000000001', true)
ON CONFLICT (admin_id, department) DO UPDATE SET
  is_active = EXCLUDED.is_active;

-- ============================================
-- 4. 샘플 고객 데이터 (lead_pool) - 총 80명
-- ============================================

-- 미배정 고객 (20명) - 신규 리드
INSERT INTO lead_pool (phone, contact_name, real_name, data_source, contact_script, data_date, status)
VALUES
  ('010-5000-0001', '김철수', NULL, 'A데이터', '재테크 상담 희망', '2024-11-01', 'available'),
  ('010-5000-0002', '이영희', NULL, 'B데이터', '보험 가입 문의', '2024-11-01', 'available'),
  ('010-5000-0003', '박민수', NULL, 'A데이터', '투자 상품 관심', '2024-11-01', 'available'),
  ('010-5000-0004', '최지은', NULL, 'C데이터', '부동산 투자', '2024-11-02', 'available'),
  ('010-5000-0005', '정대현', NULL, 'B데이터', '연금 상담', '2024-11-02', 'available'),
  ('010-5000-0006', '강민호', NULL, 'A데이터', '적금 상담', '2024-11-02', 'available'),
  ('010-5000-0007', '조수연', NULL, 'B데이터', '펀드 투자', '2024-11-02', 'available'),
  ('010-5000-0008', '윤지혜', NULL, 'C데이터', '암보험 문의', '2024-11-03', 'available'),
  ('010-5000-0009', '임태훈', NULL, 'A데이터', '저축보험', '2024-11-03', 'available'),
  ('010-5000-0010', '한소희', NULL, 'B데이터', '변액보험', '2024-11-03', 'available'),
  ('010-5000-0011', '오준석', NULL, 'A데이터', '실손보험', '2024-11-03', 'available'),
  ('010-5000-0012', '신예진', NULL, 'C데이터', '운전자보험', '2024-11-03', 'available'),
  ('010-5000-0013', '배성민', NULL, 'B데이터', '종신보험', '2024-11-04', 'available'),
  ('010-5000-0014', '송하늘', NULL, 'A데이터', '건강보험', '2024-11-04', 'available'),
  ('010-5000-0015', '장미래', NULL, 'B데이터', '어린이보험', '2024-11-04', 'available'),
  ('010-5000-0016', '허준영', NULL, 'C데이터', '교육보험', '2024-11-04', 'available'),
  ('010-5000-0017', '나현우', NULL, 'A데이터', '연금보험', '2024-11-04', 'available'),
  ('010-5000-0018', '도서현', NULL, 'B데이터', '즉시연금', '2024-11-04', 'available'),
  ('010-5000-0019', '류민정', NULL, 'C데이터', '종합자산관리', '2024-11-04', 'available'),
  ('010-5000-0020', '문지훈', NULL, 'A데이터', 'ISA 계좌', '2024-11-04', 'available')
ON CONFLICT (phone) DO NOTHING;

-- 배정된 고객 - 상담 진행 중 (30명)
INSERT INTO lead_pool (phone, contact_name, real_name, data_source, contact_script, data_date, status)
VALUES
  -- 영업1팀 배정 (15명)
  ('010-6000-0001', '김진우', '김진우', 'A데이터', '재테크 상담', '2024-10-15', 'assigned'),
  ('010-6000-0002', '이수진', '이수진', 'B데이터', '보험 리모델링', '2024-10-15', 'assigned'),
  ('010-6000-0003', '박준호', '박준호', 'C데이터', '투자 포트폴리오', '2024-10-16', 'assigned'),
  ('010-6000-0004', '최유나', '최유나', 'A데이터', '노후 준비', '2024-10-16', 'assigned'),
  ('010-6000-0005', '정호석', '정호석', 'B데이터', '자녀 교육비', '2024-10-17', 'assigned'),
  ('010-6000-0006', '강서윤', '강서윤', 'C데이터', '주택 마련', '2024-10-17', 'assigned'),
  ('010-6000-0007', '조민재', '조민재', 'A데이터', '창업 자금', '2024-10-18', 'assigned'),
  ('010-6000-0008', '윤하은', '윤하은', 'B데이터', '결혼 자금', '2024-10-18', 'assigned'),
  ('010-6000-0009', '임동현', '임동현', 'C데이터', '목돈 마련', '2024-10-19', 'assigned'),
  ('010-6000-0010', '한예림', '한예림', 'A데이터', '여행 자금', '2024-10-19', 'assigned'),
  ('010-6000-0011', '오태영', '오태영', 'B데이터', '자동차 구매', '2024-10-20', 'assigned'),
  ('010-6000-0012', '신다은', '신다은', 'C데이터', '병원비 대비', '2024-10-20', 'assigned'),
  ('010-6000-0013', '배현수', '배현수', 'A데이터', '긴급 자금', '2024-10-21', 'assigned'),
  ('010-6000-0014', '송지아', '송지아', 'B데이터', '노후 대비', '2024-10-21', 'assigned'),
  ('010-6000-0015', '장우진', '장우진', 'C데이터', '세금 절감', '2024-10-22', 'assigned'),

  -- 영업2팀 배정 (15명)
  ('010-6000-0016', '허진아', '허진아', 'A데이터', '재무 설계', '2024-10-15', 'assigned'),
  ('010-6000-0017', '나성훈', '나성훈', 'B데이터', '보험 정리', '2024-10-15', 'assigned'),
  ('010-6000-0018', '도현지', '도현지', 'C데이터', '펀드 가입', '2024-10-16', 'assigned'),
  ('010-6000-0019', '류승우', '류승우', 'A데이터', '적금 상담', '2024-10-16', 'assigned'),
  ('010-6000-0020', '문소영', '문소영', 'B데이터', '대출 상담', '2024-10-17', 'assigned'),
  ('010-6000-0021', '서준혁', '서준혁', 'C데이터', '부동산 투자', '2024-10-17', 'assigned'),
  ('010-6000-0022', '안유진', '안유진', 'A데이터', '해외 펀드', '2024-10-18', 'assigned'),
  ('010-6000-0023', '양민호', '양민호', 'B데이터', '채권 투자', '2024-10-18', 'assigned'),
  ('010-6000-0024', '엄채원', '엄채원', 'C데이터', '주식 투자', '2024-10-19', 'assigned'),
  ('010-6000-0025', '여태민', '여태민', 'A데이터', '가상화폐', '2024-10-19', 'assigned'),
  ('010-6000-0026', '원다혜', '원다혜', 'B데이터', '골드 투자', '2024-10-20', 'assigned'),
  ('010-6000-0027', '유준서', '유준서', 'C데이터', '외화 예금', '2024-10-20', 'assigned'),
  ('010-6000-0028', '이서연', '이서연', 'A데이터', 'ETF 투자', '2024-10-21', 'assigned'),
  ('010-6000-0029', '장민석', '장민석', 'B데이터', '리츠 투자', '2024-10-21', 'assigned'),
  ('010-6000-0030', '전수빈', '전수빈', 'C데이터', '신탁 상품', '2024-10-22', 'assigned')
ON CONFLICT (phone) DO NOTHING;

-- 계약 완료 고객 (30명) - 실적 데이터
INSERT INTO lead_pool (phone, contact_name, real_name, data_source, contact_script, data_date, status)
VALUES
  -- 9월 계약 (10건)
  ('010-7000-0001', '김성공', '김성공', 'A데이터', '재테크 상담', '2024-08-15', 'completed'),
  ('010-7000-0002', '이계약', '이계약', 'B데이터', '보험 가입', '2024-08-16', 'completed'),
  ('010-7000-0003', '박완료', '박완료', 'C데이터', '투자 상품', '2024-08-17', 'completed'),
  ('010-7000-0004', '최성사', '최성사', 'A데이터', '부동산 투자', '2024-08-18', 'completed'),
  ('010-7000-0005', '정수익', '정수익', 'B데이터', '연금 상담', '2024-08-19', 'completed'),
  ('010-7000-0006', '강매출', '강매출', 'C데이터', '재테크 상담', '2024-08-20', 'completed'),
  ('010-7000-0007', '조계약', '조계약', 'A데이터', '보험 리모델링', '2024-08-21', 'completed'),
  ('010-7000-0008', '윤완료', '윤완료', 'B데이터', '투자 포트폴리오', '2024-08-22', 'completed'),
  ('010-7000-0009', '임성공', '임성공', 'C데이터', '노후 준비', '2024-08-23', 'completed'),
  ('010-7000-0010', '한실적', '한실적', 'A데이터', '자녀 교육비', '2024-08-24', 'completed'),

  -- 10월 계약 (10건)
  ('010-7000-0011', '오계약', '오계약', 'B데이터', '주택 마련', '2024-09-10', 'completed'),
  ('010-7000-0012', '신완료', '신완료', 'C데이터', '창업 자금', '2024-09-11', 'completed'),
  ('010-7000-0013', '배성사', '배성사', 'A데이터', '결혼 자금', '2024-09-12', 'completed'),
  ('010-7000-0014', '송매출', '송매출', 'B데이터', '목돈 마련', '2024-09-13', 'completed'),
  ('010-7000-0015', '장수익', '장수익', 'C데이터', '자동차 구매', '2024-09-14', 'completed'),
  ('010-7000-0016', '허계약', '허계약', 'A데이터', '병원비 대비', '2024-09-15', 'completed'),
  ('010-7000-0017', '나완료', '나완료', 'B데이터', '긴급 자금', '2024-09-16', 'completed'),
  ('010-7000-0018', '도성공', '도성공', 'C데이터', '노후 대비', '2024-09-17', 'completed'),
  ('010-7000-0019', '류실적', '류실적', 'A데이터', '세금 절감', '2024-09-18', 'completed'),
  ('010-7000-0020', '문계약', '문계약', 'B데이터', '재무 설계', '2024-09-19', 'completed'),

  -- 11월 계약 (10건) - 최근 실적
  ('010-7000-0021', '서성사', '서성사', 'C데이터', '보험 정리', '2024-10-05', 'completed'),
  ('010-7000-0022', '안완료', '안완료', 'A데이터', '펀드 가입', '2024-10-06', 'completed'),
  ('010-7000-0023', '양매출', '양매출', 'B데이터', '적금 상담', '2024-10-07', 'completed'),
  ('010-7000-0024', '엄수익', '엄수익', 'C데이터', '대출 상담', '2024-10-08', 'completed'),
  ('010-7000-0025', '여계약', '여계약', 'A데이터', '부동산 투자', '2024-10-09', 'completed'),
  ('010-7000-0026', '원성공', '원성공', 'B데이터', '해외 펀드', '2024-10-10', 'completed'),
  ('010-7000-0027', '유완료', '유완료', 'C데이터', '채권 투자', '2024-10-11', 'completed'),
  ('010-7000-0028', '이실적', '이실적', 'A데이터', '주식 투자', '2024-10-12', 'completed'),
  ('010-7000-0029', '장계약', '장계약', 'B데이터', 'ETF 투자', '2024-10-13', 'completed'),
  ('010-7000-0030', '전성사', '전성사', 'C데이터', '리츠 투자', '2024-10-14', 'completed')
ON CONFLICT (phone) DO NOTHING;

-- ============================================
-- 5. 배정 데이터 (lead_assignments) - 실제 업무 패턴 반영
-- ============================================

-- 영업1팀 배정 (김영업 - sales1@demo.com)
INSERT INTO lead_assignments (lead_id, counselor_id, assigned_by, status, assigned_at)
SELECT
  lp.id,
  '00000000-0000-0000-0000-000000000003', -- 김영업
  '00000000-0000-0000-0000-000000000002', -- 이팀장이 배정
  CASE
    WHEN lp.phone LIKE '010-7%' THEN 'completed'
    WHEN lp.phone LIKE '010-6000-000[1-3]' THEN 'working'
    ELSE 'active'
  END,
  CASE
    WHEN lp.phone LIKE '010-7%' THEN CURRENT_TIMESTAMP - INTERVAL '45 days'
    ELSE CURRENT_TIMESTAMP - INTERVAL '10 days'
  END
FROM lead_pool lp
WHERE lp.phone IN (
  '010-6000-0001', '010-6000-0002', '010-6000-0003', -- 상담 중
  '010-7000-0001', '010-7000-0002', '010-7000-0011', '010-7000-0021' -- 계약 완료
)
ON CONFLICT DO NOTHING;

-- 박상담 (sales2@demo.com)
INSERT INTO lead_assignments (lead_id, counselor_id, assigned_by, status, assigned_at)
SELECT
  lp.id,
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000002',
  CASE
    WHEN lp.phone LIKE '010-7%' THEN 'completed'
    WHEN lp.phone LIKE '010-6000-000[4-6]' THEN 'working'
    ELSE 'active'
  END,
  CASE
    WHEN lp.phone LIKE '010-7%' THEN CURRENT_TIMESTAMP - INTERVAL '42 days'
    ELSE CURRENT_TIMESTAMP - INTERVAL '9 days'
  END
FROM lead_pool lp
WHERE lp.phone IN (
  '010-6000-0004', '010-6000-0005', '010-6000-0006',
  '010-7000-0003', '010-7000-0004', '010-7000-0012', '010-7000-0022'
)
ON CONFLICT DO NOTHING;

-- 최영업 (sales3@demo.com)
INSERT INTO lead_assignments (lead_id, counselor_id, assigned_by, status, assigned_at)
SELECT
  lp.id,
  '00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000002',
  CASE
    WHEN lp.phone LIKE '010-7%' THEN 'completed'
    WHEN lp.phone LIKE '010-6000-000[7-9]' THEN 'working'
    ELSE 'active'
  END,
  CASE
    WHEN lp.phone LIKE '010-7%' THEN CURRENT_TIMESTAMP - INTERVAL '40 days'
    ELSE CURRENT_TIMESTAMP - INTERVAL '8 days'
  END
FROM lead_pool lp
WHERE lp.phone IN (
  '010-6000-0007', '010-6000-0008', '010-6000-0009',
  '010-7000-0005', '010-7000-0006', '010-7000-0013', '010-7000-0023'
)
ON CONFLICT DO NOTHING;

-- 정영업 (sales4@demo.com)
INSERT INTO lead_assignments (lead_id, counselor_id, assigned_by, status, assigned_at)
SELECT
  lp.id,
  '00000000-0000-0000-0000-000000000009',
  '00000000-0000-0000-0000-000000000002',
  CASE
    WHEN lp.phone LIKE '010-7%' THEN 'completed'
    WHEN lp.phone LIKE '010-6000-001[0-2]' THEN 'working'
    ELSE 'active'
  END,
  CASE
    WHEN lp.phone LIKE '010-7%' THEN CURRENT_TIMESTAMP - INTERVAL '38 days'
    ELSE CURRENT_TIMESTAMP - INTERVAL '7 days'
  END
FROM lead_pool lp
WHERE lp.phone IN (
  '010-6000-0010', '010-6000-0011', '010-6000-0012',
  '010-7000-0007', '010-7000-0014', '010-7000-0024'
)
ON CONFLICT DO NOTHING;

-- 홍상담 (sales5@demo.com)
INSERT INTO lead_assignments (lead_id, counselor_id, assigned_by, status, assigned_at)
SELECT
  lp.id,
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000002',
  CASE
    WHEN lp.phone LIKE '010-7%' THEN 'completed'
    WHEN lp.phone LIKE '010-6000-001[3-5]' THEN 'working'
    ELSE 'active'
  END,
  CASE
    WHEN lp.phone LIKE '010-7%' THEN CURRENT_TIMESTAMP - INTERVAL '36 days'
    ELSE CURRENT_TIMESTAMP - INTERVAL '6 days'
  END
FROM lead_pool lp
WHERE lp.phone IN (
  '010-6000-0013', '010-6000-0014', '010-6000-0015',
  '010-7000-0008', '010-7000-0015', '010-7000-0025'
)
ON CONFLICT DO NOTHING;

-- 영업2팀 배정 (강영업 - sales6@demo.com)
INSERT INTO lead_assignments (lead_id, counselor_id, assigned_by, status, assigned_at)
SELECT
  lp.id,
  '00000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000008', -- 박팀장이 배정
  CASE
    WHEN lp.phone LIKE '010-7%' THEN 'completed'
    WHEN lp.phone LIKE '010-6000-001[6-8]' THEN 'working'
    ELSE 'active'
  END,
  CASE
    WHEN lp.phone LIKE '010-7%' THEN CURRENT_TIMESTAMP - INTERVAL '44 days'
    ELSE CURRENT_TIMESTAMP - INTERVAL '10 days'
  END
FROM lead_pool lp
WHERE lp.phone IN (
  '010-6000-0016', '010-6000-0017', '010-6000-0018',
  '010-7000-0009', '010-7000-0016', '010-7000-0026'
)
ON CONFLICT DO NOTHING;

-- 송상담 (sales7@demo.com)
INSERT INTO lead_assignments (lead_id, counselor_id, assigned_by, status, assigned_at)
SELECT
  lp.id,
  '00000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000008',
  CASE
    WHEN lp.phone LIKE '010-7%' THEN 'completed'
    WHEN lp.phone LIKE '010-6000-001[9]|010-6000-002[0-1]' THEN 'working'
    ELSE 'active'
  END,
  CASE
    WHEN lp.phone LIKE '010-7%' THEN CURRENT_TIMESTAMP - INTERVAL '41 days'
    ELSE CURRENT_TIMESTAMP - INTERVAL '9 days'
  END
FROM lead_pool lp
WHERE lp.phone IN (
  '010-6000-0019', '010-6000-0020', '010-6000-0021',
  '010-7000-0010', '010-7000-0017', '010-7000-0027'
)
ON CONFLICT DO NOTHING;

-- 윤영업 (sales8@demo.com)
INSERT INTO lead_assignments (lead_id, counselor_id, assigned_by, status, assigned_at)
SELECT
  lp.id,
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000008',
  CASE
    WHEN lp.phone LIKE '010-7%' THEN 'completed'
    WHEN lp.phone LIKE '010-6000-002[2-4]' THEN 'working'
    ELSE 'active'
  END,
  CASE
    WHEN lp.phone LIKE '010-7%' THEN CURRENT_TIMESTAMP - INTERVAL '39 days'
    ELSE CURRENT_TIMESTAMP - INTERVAL '8 days'
  END
FROM lead_pool lp
WHERE lp.phone IN (
  '010-6000-0022', '010-6000-0023', '010-6000-0024',
  '010-7000-0018', '010-7000-0028'
)
ON CONFLICT DO NOTHING;

-- 장상담 (sales9@demo.com)
INSERT INTO lead_assignments (lead_id, counselor_id, assigned_by, status, assigned_at)
SELECT
  lp.id,
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000008',
  CASE
    WHEN lp.phone LIKE '010-7%' THEN 'completed'
    WHEN lp.phone LIKE '010-6000-002[5-7]' THEN 'working'
    ELSE 'active'
  END,
  CASE
    WHEN lp.phone LIKE '010-7%' THEN CURRENT_TIMESTAMP - INTERVAL '37 days'
    ELSE CURRENT_TIMESTAMP - INTERVAL '7 days'
  END
FROM lead_pool lp
WHERE lp.phone IN (
  '010-6000-0025', '010-6000-0026', '010-6000-0027',
  '010-7000-0019', '010-7000-0029'
)
ON CONFLICT DO NOTHING;

-- 임영업 (sales10@demo.com)
INSERT INTO lead_assignments (lead_id, counselor_id, assigned_by, status, assigned_at)
SELECT
  lp.id,
  '00000000-0000-0000-0000-000000000013',
  '00000000-0000-0000-0000-000000000008',
  CASE
    WHEN lp.phone LIKE '010-7%' THEN 'completed'
    WHEN lp.phone LIKE '010-6000-002[8-9]|010-6000-0030' THEN 'working'
    ELSE 'active'
  END,
  CASE
    WHEN lp.phone LIKE '010-7%' THEN CURRENT_TIMESTAMP - INTERVAL '35 days'
    ELSE CURRENT_TIMESTAMP - INTERVAL '6 days'
  END
FROM lead_pool lp
WHERE lp.phone IN (
  '010-6000-0028', '010-6000-0029', '010-6000-0030',
  '010-7000-0020', '010-7000-0030'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. 상담 기록 (counseling_activities) - 14단계 고객 등급 포함
-- ============================================

-- 계약 완료 고객의 상담 기록 (customer_grade 포함)
INSERT INTO counseling_activities (
  assignment_id,
  contact_date,
  contact_method,
  actual_customer_name,
  counseling_memo,
  investment_budget,
  customer_grade,
  contract_status,
  contract_amount,
  commission_amount
)
SELECT
  la.id,
  CURRENT_DATE - INTERVAL '30 days',
  '전화',
  lp.real_name,
  JSON_BUILD_ARRAY(
    JSON_BUILD_OBJECT(
      'content', '초기 상담 완료. 관심도 매우 높음. 재상담 희망.',
      'timestamp', (CURRENT_DATE - INTERVAL '30 days')::TEXT,
      'author', u.full_name
    ),
    JSON_BUILD_OBJECT(
      'content', '상품 설명 완료. 긍정적 반응. 가족과 상의 후 결정 예정.',
      'timestamp', (CURRENT_DATE - INTERVAL '25 days')::TEXT,
      'author', u.full_name
    ),
    JSON_BUILD_OBJECT(
      'content', '계약 완료! 월 50만원 납입. 고객 만족도 매우 높음.',
      'timestamp', (CURRENT_DATE - INTERVAL '20 days')::TEXT,
      'author', u.full_name
    )
  )::TEXT,
  CASE (RANDOM() * 5)::INT
    WHEN 0 THEN '3,000만원'
    WHEN 1 THEN '5,000만원'
    WHEN 2 THEN '1억원'
    WHEN 3 THEN '2억원'
    ELSE '7,000만원'
  END,
  'payment_completed', -- 결제완료 (14단계 중 최고 등급)
  'contracted',
  CASE (RANDOM() * 5)::INT
    WHEN 0 THEN 3000000
    WHEN 1 THEN 5000000
    WHEN 2 THEN 10000000
    WHEN 3 THEN 20000000
    ELSE 7000000
  END,
  CASE (RANDOM() * 5)::INT
    WHEN 0 THEN 300000
    WHEN 1 THEN 500000
    WHEN 2 THEN 1000000
    WHEN 3 THEN 2000000
    ELSE 700000
  END
FROM lead_assignments la
JOIN lead_pool lp ON la.lead_id = lp.id
JOIN users u ON la.counselor_id = u.id
WHERE lp.phone LIKE '010-7%'
LIMIT 30;

-- 상담 중 고객의 상담 기록 (다양한 customer_grade)
INSERT INTO counseling_activities (
  assignment_id,
  contact_date,
  contact_method,
  actual_customer_name,
  counseling_memo,
  investment_budget,
  customer_grade,
  contract_status,
  contract_amount,
  next_contact_date
)
SELECT
  la.id,
  CURRENT_DATE - INTERVAL '5 days',
  CASE (RANDOM() * 3)::INT
    WHEN 0 THEN '전화'
    WHEN 1 THEN '카카오톡'
    ELSE '문자'
  END,
  lp.real_name,
  JSON_BUILD_ARRAY(
    JSON_BUILD_OBJECT(
      'content', CASE (RANDOM() * 5)::INT
        WHEN 0 THEN '첫 상담. 관심 있어하시나 검토 시간 필요.'
        WHEN 1 THEN '상품 설명 완료. 가격 부담 언급. 할인 가능 여부 문의.'
        WHEN 2 THEN '재상담 진행. 긍정적 반응. 다음주 재연락 예정.'
        WHEN 3 THEN '고객 관심도 높음. 계약 가능성 높음. 서류 준비 중.'
        ELSE '상담 완료. 가족과 상의 후 연락 주시기로 함.'
      END,
      'timestamp', (CURRENT_DATE - INTERVAL '5 days')::TEXT,
      'author', u.full_name
    )
  )::TEXT,
  CASE (RANDOM() * 6)::INT
    WHEN 0 THEN '1,000만원'
    WHEN 1 THEN '3,000만원'
    WHEN 2 THEN '5,000만원'
    WHEN 3 THEN '1억원'
    WHEN 4 THEN '2억원'
    ELSE '미정'
  END,
  CASE (RANDOM() * 13)::INT
    WHEN 0 THEN 'interested' -- 관심있음
    WHEN 1 THEN 'reconsulting_requested' -- 재상담 요청
    WHEN 2 THEN 'open_entry_guide' -- 오픈+개설안내
    WHEN 3 THEN 'management' -- 운용
    WHEN 4 THEN 'payment_probable' -- 납입가능성
    WHEN 5 THEN 'payment_scheduled' -- 납입예정
    WHEN 6 THEN 'document_delivered' -- 서류전달
    WHEN 7 THEN 'visiting_requested' -- 방문요청
    WHEN 8 THEN 'contract_pending' -- 계약대기
    WHEN 9 THEN 'contract_in_progress' -- 계약진행중
    WHEN 10 THEN 'payment_in_progress' -- 납입진행중
    WHEN 11 THEN 'payment_scheduled_this_month' -- 이번달 납입 예정
    ELSE 'payment_scheduled_next_month' -- 다음달 납입 예정
  END,
  'pending',
  NULL,
  CURRENT_DATE + INTERVAL '3 days' + (RANDOM() * 7)::INT * INTERVAL '1 day'
FROM lead_assignments la
JOIN lead_pool lp ON la.lead_id = lp.id
JOIN users u ON la.counselor_id = u.id
WHERE lp.phone LIKE '010-6%'
LIMIT 30;

-- ============================================
-- 7. 업로드 배치 이력
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
  ('demo_leads_2024_11_batch1.xlsx', 'xlsx', 50, 48, 2, 'completed', '00000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '5 days'),
  ('demo_leads_2024_11_batch2.csv', 'csv', 80, 75, 5, 'completed', '00000000-0000-0000-0000-000000000002', CURRENT_DATE - INTERVAL '10 days'),
  ('demo_leads_2024_10.xlsx', 'xlsx', 100, 95, 5, 'completed', '00000000-0000-0000-0000-000000000002', CURRENT_DATE - INTERVAL '30 days'),
  ('demo_leads_2024_09.csv', 'csv', 200, 190, 10, 'completed', '00000000-0000-0000-0000-000000000008', CURRENT_DATE - INTERVAL '60 days'),
  ('demo_leads_2024_08.xlsx', 'xlsx', 150, 145, 5, 'completed', '00000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '90 days')
ON CONFLICT DO NOTHING;

-- ============================================
-- 데모 데이터 생성 완료!
-- ============================================
--
-- 【데모 계정 로그인 정보】
-- ※ 비밀번호는 모두 "demo1234"입니다
--
-- 1. 최고관리자 (모든 권한)
--    Email: admin@demo.com
--    Name: 김대표
--
-- 2. 일반관리자 (영업1팀)
--    Email: manager1@demo.com
--    Name: 이팀장
--    부서: 영업1팀만 접근 가능
--
-- 3. 일반관리자 (영업2팀)
--    Email: manager2@demo.com
--    Name: 박팀장
--    부서: 영업2팀만 접근 가능
--    제한: 설정 권한 없음, 전화번호 마스킹 해제 불가
--
-- 4. 영업사원 (영업1팀)
--    - sales1@demo.com (김영업)
--    - sales2@demo.com (박상담)
--    - sales3@demo.com (최영업)
--    - sales4@demo.com (정영업)
--    - sales5@demo.com (홍상담)
--
-- 5. 영업사원 (영업2팀)
--    - sales6@demo.com (강영업)
--    - sales7@demo.com (송상담)
--    - sales8@demo.com (윤영업)
--    - sales9@demo.com (장상담)
--    - sales10@demo.com (임영업)
--
-- 【데이터 통계】
-- - 총 사용자: 13명 (관리자 3명, 영업사원 10명)
-- - 총 고객: 80명
--   ㄴ 미배정: 20명
--   ㄴ 상담중: 30명
--   ㄴ 계약완료: 30명
-- - 총 배정: 60건
-- - 총 상담기록: 60건
-- - 업로드 배치: 5건
--
-- ============================================
