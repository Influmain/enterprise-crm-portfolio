-- =====================================
-- 데모 세션 Multi-Tenancy 스키마
-- =====================================
-- 목적: 여러 업체가 동시에 독립적으로 데모를 사용할 수 있도록 세션 격리

-- =====================================
-- 1. 데모 세션 테이블 생성
-- =====================================

CREATE TABLE IF NOT EXISTS demo_sessions (
  id TEXT PRIMARY KEY, -- 9자리 세션 ID (예: ABC123XYZ)
  name TEXT, -- 세션 이름 (예: "삼성전자 데모", "LG 데모")
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'), -- 7일 후 자동 만료
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}' -- 추가 정보 (회사명, 담당자 등)
);

-- 인덱스
CREATE INDEX idx_demo_sessions_active ON demo_sessions(is_active);
CREATE INDEX idx_demo_sessions_expires ON demo_sessions(expires_at);

COMMENT ON TABLE demo_sessions IS '데모 세션 관리 테이블 - 각 업체별 독립 데모 환경';
COMMENT ON COLUMN demo_sessions.id IS '9자리 고유 세션 ID';
COMMENT ON COLUMN demo_sessions.expires_at IS '세션 만료일 (기본 7일)';


-- =====================================
-- 2. 기존 테이블에 demo_session_id 추가
-- =====================================

-- users 테이블
ALTER TABLE users
ADD COLUMN IF NOT EXISTS demo_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_users_demo_session
ON users(demo_session_id);

-- lead_pool 테이블
ALTER TABLE lead_pool
ADD COLUMN IF NOT EXISTS demo_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_lead_pool_demo_session
ON lead_pool(demo_session_id);

-- lead_assignments 테이블
ALTER TABLE lead_assignments
ADD COLUMN IF NOT EXISTS demo_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_lead_assignments_demo_session
ON lead_assignments(demo_session_id);

-- counseling_activities 테이블
ALTER TABLE counseling_activities
ADD COLUMN IF NOT EXISTS demo_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_counseling_activities_demo_session
ON counseling_activities(demo_session_id);

-- upload_batches 테이블
ALTER TABLE upload_batches
ADD COLUMN IF NOT EXISTS demo_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_upload_batches_demo_session
ON upload_batches(demo_session_id);

-- user_permissions 테이블
ALTER TABLE user_permissions
ADD COLUMN IF NOT EXISTS demo_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_user_permissions_demo_session
ON user_permissions(demo_session_id);

-- department_permissions 테이블
ALTER TABLE department_permissions
ADD COLUMN IF NOT EXISTS demo_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_department_permissions_demo_session
ON department_permissions(demo_session_id);


-- =====================================
-- 3. 세션 ID 생성 함수
-- =====================================

CREATE OR REPLACE FUNCTION generate_demo_session_id()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 혼동 방지 (I, O, 0, 1 제외)
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..9 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_demo_session_id() IS '9자리 랜덤 세션 ID 생성 (혼동 방지 문자 제외)';


-- =====================================
-- 4. 데모 세션 생성 함수
-- =====================================

CREATE OR REPLACE FUNCTION create_demo_session(
  p_session_name TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE (
  session_id TEXT,
  session_name TEXT,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_session_id TEXT;
  v_session_name TEXT;
BEGIN
  -- 고유 세션 ID 생성
  LOOP
    v_session_id := generate_demo_session_id();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM demo_sessions WHERE id = v_session_id);
  END LOOP;

  -- 세션 이름 기본값
  v_session_name := COALESCE(p_session_name, '데모 세션 ' || v_session_id);

  -- 세션 생성
  INSERT INTO demo_sessions (id, name, metadata)
  VALUES (v_session_id, v_session_name, p_metadata);

  RETURN QUERY
  SELECT v_session_id, v_session_name, NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_demo_session IS '새 데모 세션 생성 및 고유 ID 반환';


-- =====================================
-- 5. 템플릿 데이터를 새 세션으로 복사하는 함수
-- =====================================

CREATE OR REPLACE FUNCTION initialize_demo_session_data(
  p_session_id TEXT
)
RETURNS JSON AS $$
DECLARE
  v_template_session_id TEXT := 'TEMPLATE'; -- 템플릿 데이터의 세션 ID
  v_users_count INTEGER;
  v_leads_count INTEGER;
  v_assignments_count INTEGER;
  v_activities_count INTEGER;
  v_result JSON;
BEGIN
  -- 1. Users 복사
  INSERT INTO users (
    id, email, name, role, department_id, department_name,
    is_active, phone, hire_date, demo_session_id
  )
  SELECT
    gen_random_uuid(), -- 새 UUID 생성
    email,
    name,
    role,
    department_id,
    department_name,
    is_active,
    phone,
    hire_date,
    p_session_id -- 새 세션 ID
  FROM users
  WHERE demo_session_id = v_template_session_id;

  GET DIAGNOSTICS v_users_count = ROW_COUNT;

  -- 2. Lead Pool 복사
  INSERT INTO lead_pool (
    phone, name, age, gender, source, status, upload_batch_id,
    created_at, updated_at, demo_session_id
  )
  SELECT
    phone, name, age, gender, source, status, upload_batch_id,
    created_at, updated_at, p_session_id
  FROM lead_pool
  WHERE demo_session_id = v_template_session_id;

  GET DIAGNOSTICS v_leads_count = ROW_COUNT;

  -- 3. Lead Assignments 복사 (user_id는 새로 매핑 필요)
  -- 이 부분은 복잡하므로 기본 데모에서는 생략하고 필요시 구현
  v_assignments_count := 0;

  -- 4. Counseling Activities 복사 (마찬가지로 필요시 구현)
  v_activities_count := 0;

  -- 5. Upload Batches 복사
  INSERT INTO upload_batches (
    file_name, total_rows, success_count, duplicate_count, error_count,
    uploaded_by, uploaded_at, demo_session_id
  )
  SELECT
    file_name, total_rows, success_count, duplicate_count, error_count,
    uploaded_by, uploaded_at, p_session_id
  FROM upload_batches
  WHERE demo_session_id = v_template_session_id;

  -- 6. Permissions 복사
  INSERT INTO user_permissions (
    user_id, can_view_leads, can_edit_leads, can_delete_leads,
    can_assign_leads, can_upload_data, can_export_data,
    can_view_reports, can_manage_users, can_configure_system,
    can_unmask_phone, demo_session_id
  )
  SELECT
    user_id, can_view_leads, can_edit_leads, can_delete_leads,
    can_assign_leads, can_upload_data, can_export_data,
    can_view_reports, can_manage_users, can_configure_system,
    can_unmask_phone, p_session_id
  FROM user_permissions
  WHERE demo_session_id = v_template_session_id;

  INSERT INTO department_permissions (
    department_id, can_view_leads, can_edit_leads, can_delete_leads,
    can_assign_leads, can_upload_data, can_export_data,
    can_view_reports, can_manage_users, can_configure_system,
    can_unmask_phone, demo_session_id
  )
  SELECT
    department_id, can_view_leads, can_edit_leads, can_delete_leads,
    can_assign_leads, can_upload_data, can_export_data,
    can_view_reports, can_manage_users, can_configure_system,
    can_unmask_phone, p_session_id
  FROM department_permissions
  WHERE demo_session_id = v_template_session_id;

  -- 결과 반환
  v_result := json_build_object(
    'session_id', p_session_id,
    'users_copied', v_users_count,
    'leads_copied', v_leads_count,
    'assignments_copied', v_assignments_count,
    'activities_copied', v_activities_count,
    'status', 'success'
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION initialize_demo_session_data IS '템플릿 데이터를 새 세션으로 복사';


-- =====================================
-- 6. 세션 삭제 함수 (데이터 정리)
-- =====================================

CREATE OR REPLACE FUNCTION delete_demo_session(p_session_id TEXT)
RETURNS JSON AS $$
DECLARE
  v_deleted_count INTEGER := 0;
  v_result JSON;
BEGIN
  -- 1. 관련 데이터 삭제
  DELETE FROM counseling_activities WHERE demo_session_id = p_session_id;
  DELETE FROM lead_assignments WHERE demo_session_id = p_session_id;
  DELETE FROM lead_pool WHERE demo_session_id = p_session_id;
  DELETE FROM upload_batches WHERE demo_session_id = p_session_id;
  DELETE FROM user_permissions WHERE demo_session_id = p_session_id;
  DELETE FROM department_permissions WHERE demo_session_id = p_session_id;
  DELETE FROM users WHERE demo_session_id = p_session_id;

  -- 2. 세션 삭제
  DELETE FROM demo_sessions WHERE id = p_session_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  v_result := json_build_object(
    'session_id', p_session_id,
    'deleted', v_deleted_count > 0,
    'status', 'success'
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION delete_demo_session IS '데모 세션 및 관련 데이터 완전 삭제';


-- =====================================
-- 7. 만료된 세션 자동 정리 함수
-- =====================================

CREATE OR REPLACE FUNCTION cleanup_expired_demo_sessions()
RETURNS JSON AS $$
DECLARE
  v_expired_sessions TEXT[];
  v_session_id TEXT;
  v_deleted_count INTEGER := 0;
  v_result JSON;
BEGIN
  -- 만료된 세션 목록
  SELECT ARRAY_AGG(id) INTO v_expired_sessions
  FROM demo_sessions
  WHERE expires_at < NOW() OR is_active = FALSE;

  -- 각 세션 삭제
  IF v_expired_sessions IS NOT NULL THEN
    FOREACH v_session_id IN ARRAY v_expired_sessions
    LOOP
      PERFORM delete_demo_session(v_session_id);
      v_deleted_count := v_deleted_count + 1;
    END LOOP;
  END IF;

  v_result := json_build_object(
    'deleted_sessions_count', v_deleted_count,
    'deleted_session_ids', COALESCE(v_expired_sessions, ARRAY[]::TEXT[]),
    'cleaned_at', NOW(),
    'status', 'success'
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_demo_sessions IS '만료된 데모 세션 자동 정리 (크론잡용)';


-- =====================================
-- 8. 세션 접근 시간 업데이트 함수
-- =====================================

CREATE OR REPLACE FUNCTION update_demo_session_access(p_session_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE demo_sessions
  SET last_accessed_at = NOW()
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_demo_session_access IS '세션 마지막 접근 시간 업데이트';


-- =====================================
-- 9. 활성 세션 목록 조회 뷰
-- =====================================

CREATE OR REPLACE VIEW active_demo_sessions AS
SELECT
  id,
  name,
  created_at,
  last_accessed_at,
  expires_at,
  (expires_at - NOW()) AS time_remaining,
  is_active,
  metadata
FROM demo_sessions
WHERE is_active = TRUE
  AND expires_at > NOW()
ORDER BY last_accessed_at DESC;

COMMENT ON VIEW active_demo_sessions IS '활성 데모 세션 목록';


-- =====================================
-- 10. 테스트 데이터: 템플릿 세션 생성
-- =====================================

-- 템플릿 세션 생성 (실제 데모 데이터의 기준)
INSERT INTO demo_sessions (id, name, is_active, metadata)
VALUES (
  'TEMPLATE',
  '기본 템플릿 세션',
  TRUE,
  '{"description": "모든 새 데모 세션의 기준이 되는 템플릿 데이터", "do_not_delete": true}'
)
ON CONFLICT (id) DO NOTHING;

-- 기존 데모 데이터를 TEMPLATE 세션으로 표시
UPDATE users SET demo_session_id = 'TEMPLATE' WHERE demo_session_id IS NULL;
UPDATE lead_pool SET demo_session_id = 'TEMPLATE' WHERE demo_session_id IS NULL;
UPDATE lead_assignments SET demo_session_id = 'TEMPLATE' WHERE demo_session_id IS NULL;
UPDATE counseling_activities SET demo_session_id = 'TEMPLATE' WHERE demo_session_id IS NULL;
UPDATE upload_batches SET demo_session_id = 'TEMPLATE' WHERE demo_session_id IS NULL;
UPDATE user_permissions SET demo_session_id = 'TEMPLATE' WHERE demo_session_id IS NULL;
UPDATE department_permissions SET demo_session_id = 'TEMPLATE' WHERE demo_session_id IS NULL;


-- =====================================
-- 11. 사용 예시
-- =====================================

/*
-- 새 데모 세션 생성
SELECT * FROM create_demo_session('삼성전자 데모', '{"company": "Samsung", "contact": "홍길동"}');
-- 결과: session_id = 'ABC123XYZ'

-- 세션 데이터 초기화 (템플릿 복사)
SELECT initialize_demo_session_data('ABC123XYZ');

-- 활성 세션 목록 조회
SELECT * FROM active_demo_sessions;

-- 세션 접근 시간 업데이트
SELECT update_demo_session_access('ABC123XYZ');

-- 만료된 세션 정리
SELECT cleanup_expired_demo_sessions();

-- 특정 세션 삭제
SELECT delete_demo_session('ABC123XYZ');
*/
