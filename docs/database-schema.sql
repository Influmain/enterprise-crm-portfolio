-- ============================================
-- Enterprise CRM System - Database Schema
-- ============================================
-- Supabase PostgreSQL 스키마 정의
-- 실행 방법: Supabase Dashboard > SQL Editor에 복사 후 실행
-- ============================================

-- UUID 확장 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. users 테이블
-- ============================================
-- 참고: auth.users는 Supabase Auth가 자동 생성
-- users 테이블은 추가 프로필 정보 저장

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  department TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'counselor')),
  is_super_admin BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 2. lead_pool 테이블 (고객 데이터)
-- ============================================

CREATE TABLE IF NOT EXISTS lead_pool (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT NOT NULL UNIQUE,
  contact_name TEXT,
  real_name TEXT,
  data_source TEXT,
  contact_script TEXT,
  data_date TEXT,
  extra_info TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'completed', 'returned')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_lead_pool_phone ON lead_pool(phone);
CREATE INDEX IF NOT EXISTS idx_lead_pool_status ON lead_pool(status);
CREATE INDEX IF NOT EXISTS idx_lead_pool_created_at ON lead_pool(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_pool_data_source ON lead_pool(data_source);

-- 자동 업데이트 트리거
CREATE TRIGGER lead_pool_updated_at
  BEFORE UPDATE ON lead_pool
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 3. lead_assignments 테이블 (배정 관리)
-- ============================================

CREATE TABLE IF NOT EXISTS lead_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES lead_pool(id) ON DELETE CASCADE,
  counselor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'working', 'completed', 'returned')),
  notes TEXT
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_assignments_counselor ON lead_assignments(counselor_id);
CREATE INDEX IF NOT EXISTS idx_assignments_lead ON lead_assignments(lead_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON lead_assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_assigned_at ON lead_assignments(assigned_at DESC);

-- ============================================
-- 4. counseling_activities 테이블 (상담 기록)
-- ============================================

CREATE TABLE IF NOT EXISTS counseling_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES lead_assignments(id) ON DELETE CASCADE,
  contact_date DATE NOT NULL,
  contact_method TEXT,
  actual_customer_name TEXT,
  counseling_memo TEXT, -- JSON 배열로 메모 히스토리 저장
  investment_budget TEXT,
  customer_interest TEXT, -- 고객등급 (14단계)
  contract_status TEXT DEFAULT 'pending' CHECK (contract_status IN ('pending', 'contracted', 'failed')),
  contract_amount NUMERIC(15, 2),
  commission_amount NUMERIC(15, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_activities_assignment ON counseling_activities(assignment_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact_date ON counseling_activities(contact_date DESC);
CREATE INDEX IF NOT EXISTS idx_activities_contract_status ON counseling_activities(contract_status);
CREATE INDEX IF NOT EXISTS idx_activities_customer_interest ON counseling_activities(customer_interest);

-- 자동 업데이트 트리거
CREATE TRIGGER counseling_activities_updated_at
  BEFORE UPDATE ON counseling_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 5. user_permissions 테이블 (권한 관리)
-- ============================================

CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_type TEXT NOT NULL,
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, permission_type)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_permissions_type ON user_permissions(permission_type);
CREATE INDEX IF NOT EXISTS idx_permissions_is_active ON user_permissions(is_active);

-- ============================================
-- 6. department_permissions 테이블 (부서 권한)
-- ============================================

CREATE TABLE IF NOT EXISTS department_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_dept_permissions_user ON department_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_dept_permissions_dept ON department_permissions(department);

-- ============================================
-- 7. upload_batches 테이블 (업로드 이력)
-- ============================================

CREATE TABLE IF NOT EXISTS upload_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('csv', 'xlsx')),
  total_rows INTEGER NOT NULL,
  processed_rows INTEGER DEFAULT 0,
  duplicate_rows INTEGER DEFAULT 0,
  upload_status TEXT NOT NULL DEFAULT 'processing' CHECK (upload_status IN ('processing', 'completed', 'failed')),
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_upload_batches_user ON upload_batches(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_upload_batches_status ON upload_batches(upload_status);
CREATE INDEX IF NOT EXISTS idx_upload_batches_created_at ON upload_batches(created_at DESC);

-- ============================================
-- Row Level Security (RLS) - 준비 중
-- ============================================
-- 참고: 현재는 클라이언트 사이드에서 권한 체크
-- 향후 RLS로 데이터베이스 레벨에서 보안 강화 예정

-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE lead_pool ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE lead_assignments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE counseling_activities ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 스키마 생성 완료
-- ============================================
-- 다음 단계: demo-data.sql 실행하여 샘플 데이터 추가
