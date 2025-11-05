-- ============================================
-- 데모 사용자를 auth.users에 자동 생성
-- ============================================
-- 주의: 이 스크립트는 Supabase의 auth.users 테이블에 직접 접근합니다.
-- 실행 전에 demo-data-enhanced.sql을 먼저 실행하세요.
-- ============================================

-- 최고관리자
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'admin@demo.com',
  crypt('demo1234', gen_salt('bf')), -- bcrypt 해시
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"김대표"}'::jsonb,
  false,
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO NOTHING;

-- 일반관리자 1
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud
) VALUES (
  '00000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'manager1@demo.com',
  crypt('demo1234', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"이팀장"}'::jsonb,
  false,
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO NOTHING;

-- 영업사원 1
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud
) VALUES (
  '00000000-0000-0000-0000-000000000003'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'sales1@demo.com',
  crypt('demo1234', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"김영업"}'::jsonb,
  false,
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 확인
-- ============================================
SELECT
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email LIKE '%@demo.com'
ORDER BY created_at;
