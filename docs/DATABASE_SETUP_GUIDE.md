# 데이터베이스 설정 가이드

## 🚀 빠른 시작 (2단계로 완료!)

### 1단계: 환경 변수 설정

`.env.local` 파일을 프로젝트 루트에 생성:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

---

### 2단계: 데이터베이스 설치 (올인원!)

**Supabase Dashboard → SQL Editor**에서:

#### 📄 `docs/complete-setup.sql` 파일 전체를 복사해서 실행

이것만 실행하면 모든 것이 자동으로 생성됩니다:
- ✅ 12개 테이블 (users, upload_batches, lead_pool, lead_assignments, counseling_activities, consulting_memo_history, counselor_lead_stats, user_permissions, department_permissions, system_settings, notifications, deletion_logs)
- ✅ 모든 인덱스
- ✅ 3개 트리거 (users, lead_pool, counseling_activities의 updated_at 자동 업데이트)
- ✅ 5개 함수 (update_updated_at_column, check_duplicate_phones_final, insert_lead_batch_final, exec_sql, create_test_users)
- ✅ 4개 뷰 (counselor_leads_view, admin_leads_view, admin_counselor_assignment_view, admin_lead_summary)
- ✅ 기본 설정값

**끝!** 🎉

---

## 👥 사용자 추가하기

### 방법 1: Supabase Dashboard에서 추가 (권장)

1. **Supabase Dashboard** → **Authentication** → **Users**
2. **"Add user"** 클릭
3. 이메일/비밀번호 입력 후 **"Create User"**
4. 생성된 **UUID 복사**

5. **SQL Editor**에서 프로필 추가:

```sql
-- 최고관리자 추가
INSERT INTO users (id, email, full_name, department, role, is_super_admin)
VALUES (
  '복사한-UUID',
  'admin@yourcompany.com',
  '김대표',
  '본사',
  'admin',
  true
);

-- 영업사원 추가
INSERT INTO users (id, email, full_name, department, role)
VALUES (
  '복사한-UUID',
  'sales@yourcompany.com',
  '이영업',
  '영업1팀',
  'counselor'
);
```

---

### 방법 2: 데모 데이터 사용 (테스트용)

```sql
-- docs/demo-data-enhanced.sql 파일 실행
-- 주의: 로그인은 안 됨 (auth.users에 계정 없음)
```

---

## 📊 설치 확인

```sql
-- 테이블 확인
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 뷰 확인
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- 데이터 확인
SELECT COUNT(*) FROM users;
```

**예상 결과:**
- 테이블: 12개
- 뷰: 4개
- 함수: 5개
- 트리거: 3개

---

## 🔧 문제 해결

### 404 에러: View not found

**증상:**
```
counselor_leads_view not found
admin_leads_view not found
```

**해결:**
- `complete-setup.sql`을 다시 실행하세요.

---

### 403 에러: Permission denied

**증상:**
```
permission denied for table users
```

**해결:**
- Supabase에서 **Service Role Key**를 사용하고 있는지 확인
- 또는 RLS(Row Level Security) 정책 확인

---

### 영업사원이 안 보임

**해결:**

```sql
-- 최고관리자 권한 부여
UPDATE users
SET is_super_admin = true
WHERE email = 'your@email.com';
```

---

## 📁 파일 구조

```
docs/
├── complete-setup.sql           ⭐ 올인원 설치 파일 (필수)
├── demo-session-schema.sql      🎭 멀티 세션 스키마 (선택)
├── demo-data-enhanced.sql       📦 샘플 데이터 (선택)
├── DATABASE_SETUP_GUIDE.md      📖 이 파일
├── DEMO_SETUP.md                🎬 데모 환경 가이드
├── ARCHITECTURE.md              🏗️ 아키텍처 문서
└── BUSINESS_CASE.md             💼 비즈니스 케이스
```

---

## 🎯 다음 단계

1. ✅ 데이터베이스 설치 완료
2. ✅ 사용자 추가
3. 🔄 애플리케이션 실행: `npm run dev`
4. 🔄 로그인 테스트
5. 🔄 기능 확인

---

## 💡 추가 정보

### 데이터베이스 스키마

**핵심 테이블:**
- `users` - 사용자 정보 (관리자, 영업사원)
- `upload_batches` - 파일 업로드 이력
- `lead_pool` - 고객 데이터
- `lead_assignments` - 고객 배정
- `counseling_activities` - 상담 기록
- `consulting_memo_history` - 상담 메모 이력
- `counselor_lead_stats` - 영업사원 통계
- `user_permissions` - 권한 관리
- `department_permissions` - 부서별 권한
- `system_settings` - 시스템 설정
- `notifications` - 알림
- `deletion_logs` - 삭제 로그

**뷰:**
- `counselor_leads_view` - 영업사원용 고객 목록
- `admin_leads_view` - 관리자용 고객 목록
- `admin_counselor_assignment_view` - 상담원별 배정 현황
- `admin_lead_summary` - 리드 전체 요약 통계

**함수:**
- `update_updated_at_column` - updated_at 자동 업데이트
- `check_duplicate_phones_final` - 전화번호 중복 체크
- `insert_lead_batch_final` - 배치 리드 삽입
- `exec_sql` - 동적 SQL 실행 (읽기 전용)
- `create_test_users` - 테스트 사용자 생성

### 테스트 사용자 생성

설치 후 다음 함수를 실행하여 테스트 사용자를 생성할 수 있습니다:

```sql
SELECT create_test_users();
```

이 함수는 다음 3명의 테스트 사용자를 생성합니다:
- 관리자 (admin@company.com)
- 상담원1 (counselor1@company.com)
- 상담원2 (counselor2@company.com)

**주의:** 이 사용자들은 `users` 테이블에만 생성됩니다. 실제 로그인을 위해서는 Supabase Authentication에서 동일한 이메일로 사용자를 생성해야 합니다.

---

## 🎭 Multi-Tenancy (데모 세션)

여러 업체가 동시에 독립적으로 데모를 사용할 수 있는 멀티 테넌시 기능을 제공합니다.

### 기능 개요

- **데이터 격리**: 각 업체별로 완전히 독립된 데모 환경
- **자동 세션 관리**: 9자리 세션 ID (예: ABC123XYZ)
- **자동 만료**: 7일 후 자동 삭제
- **템플릿 복사**: 기본 데모 데이터를 새 세션으로 자동 복사

### 설치 방법

1. **기본 스키마 설치** (위의 `complete-setup.sql` 실행)
2. **멀티 세션 스키마 추가**:

```bash
# Supabase Dashboard → SQL Editor에서 실행
docs/demo-session-schema.sql
```

### 주요 기능

**1. 새 데모 세션 생성**
```sql
SELECT * FROM create_demo_session('삼성전자 데모', '{"company": "Samsung"}');
-- 결과: session_id = 'ABC123XYZ'
```

**2. 세션 데이터 초기화** (템플릿 복사)
```sql
SELECT initialize_demo_session_data('ABC123XYZ');
```

**3. 활성 세션 목록 조회**
```sql
SELECT * FROM active_demo_sessions;
```

**4. 만료된 세션 자동 정리**
```sql
SELECT cleanup_expired_demo_sessions();
```

**5. 특정 세션 삭제**
```sql
SELECT delete_demo_session('ABC123XYZ');
```

### 추가된 테이블/함수

- **테이블**: `demo_sessions`
- **컬럼**: 모든 주요 테이블에 `demo_session_id` 추가
- **함수**:
  - `generate_demo_session_id()` - 9자리 랜덤 ID 생성
  - `create_demo_session()` - 새 세션 생성
  - `initialize_demo_session_data()` - 템플릿 데이터 복사
  - `delete_demo_session()` - 세션 삭제
  - `cleanup_expired_demo_sessions()` - 만료 세션 정리
  - `update_demo_session_access()` - 접근 시간 업데이트
- **뷰**: `active_demo_sessions` - 활성 세션 목록

### 사용 시나리오

1. **영업 데모**: 잠재 고객사마다 독립된 데모 환경 제공
2. **교육/훈련**: 각 교육 세션마다 새로운 환경 생성
3. **A/B 테스팅**: 다양한 시나리오 테스트

자세한 내용은 `DEMO_SETUP.md` 파일을 참조하세요.

---

## 🆘 지원

문제가 발생하면:
1. 브라우저 콘솔 확인
2. Supabase Logs 확인
3. 모든 마이그레이션 파일이 실행되었는지 확인

---

**설치 시간:** 약 1분
**난이도:** ⭐ (매우 쉬움)

`complete-setup.sql` 하나만 실행하면 끝! 🚀
