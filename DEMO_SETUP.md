# 🚀 데모 환경 설정 가이드

Enterprise CRM 시스템을 상용 데모 환경으로 구축하는 완벽한 가이드입니다.

## ✨ 새로운 기능: Multi-Tenancy 데모 세션

**여러 업체가 동시에 독립적으로 데모를 사용할 수 있습니다!**

- 각 업체별로 독립된 데모 환경 자동 생성
- 데이터 완전 격리 (다른 업체의 데이터와 섞이지 않음)
- 자동 세션 관리 (7일 후 자동 삭제)
- 간단한 세션 ID로 접근 (예: ABC123XYZ)

👉 자세한 내용은 [데모 세션 Multi-Tenancy](#데모-세션-multi-tenancy) 섹션을 참조하세요.

---

## 📋 목차

1. [사전 준비사항](#사전-준비사항)
2. [Supabase 프로젝트 설정](#supabase-프로젝트-설정)
3. [데이터베이스 스키마 구성](#데이터베이스-스키마-구성)
4. [**데모 세션 Multi-Tenancy**](#데모-세션-multi-tenancy) ⭐ 신규
5. [데모 데이터 설치](#데모-데이터-설치)
6. [환경 변수 설정](#환경-변수-설정)
7. [로컬 실행](#로컬-실행)
8. [데모 계정 정보](#데모-계정-정보)
9. [배포 (Vercel)](#배포-vercel)
10. [문제 해결](#문제-해결)

---

## 사전 준비사항

### 필수 도구 설치

```bash
# Node.js 18.17 이상 확인
node --version

# npm 확인
npm --version

# Git 확인
git --version
```

### 필요한 계정

1. **Supabase** 계정 - https://supabase.com
2. **Vercel** 계정 (배포용) - https://vercel.com
3. **GitHub** 계정 (선택사항)

---

## Supabase 프로젝트 설정

### 1. Supabase 프로젝트 생성

1. [Supabase Dashboard](https://supabase.com/dashboard)에 로그인
2. **New Project** 클릭
3. 프로젝트 정보 입력:
   - **Name**: `enterprise-crm-demo` (또는 원하는 이름)
   - **Database Password**: 안전한 비밀번호 생성 (저장해두세요!)
   - **Region**: `Northeast Asia (Tokyo)` 권장 (한국과 가까움)
4. **Create new project** 클릭
5. 프로젝트 생성 완료 (약 2분 소요)

### 2. API 키 확인

프로젝트 생성 후:

1. 좌측 메뉴에서 **Settings** → **API** 클릭
2. 다음 정보를 복사해두세요:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public** 키
   - **service_role** 키 (Show 버튼 클릭 후 복사)

---

## 데이터베이스 스키마 구성

### 1. SQL Editor 열기

1. 좌측 메뉴에서 **SQL Editor** 클릭
2. **New query** 클릭

### 2. 스키마 실행

```bash
# 로컬에서 파일 내용 복사
cat docs/database-schema.sql
```

1. 위 명령어로 출력된 SQL을 복사
2. Supabase SQL Editor에 붙여넣기
3. **Run** 버튼 클릭 (또는 Cmd/Ctrl + Enter)
4. 성공 메시지 확인: `Success. No rows returned`

### 3. 테이블 확인

1. 좌측 메뉴에서 **Table Editor** 클릭
2. 다음 테이블들이 생성되었는지 확인:
   - `users`
   - `lead_pool`
   - `lead_assignments`
   - `counseling_activities`
   - `user_permissions`
   - `department_permissions`
   - `upload_batches`

---

## 데모 세션 Multi-Tenancy

### 🎯 개요

여러 업체가 동시에 데모를 사용할 때 데이터가 섞이지 않도록 **세션 기반 격리** 시스템을 구현했습니다.

### 주요 특징

- ✅ **독립 환경**: 각 데모 세션마다 완전히 독립된 데이터 공간
- ✅ **자동 관리**: 세션 생성, 데이터 복사, 자동 삭제까지 모두 자동화
- ✅ **간편 접근**: 9자리 세션 ID로 쉽게 접근 (예: ABC123XYZ)
- ✅ **보안**: 다른 세션의 데이터는 절대 보이지 않음

### 1. 데모 세션 스키마 설치

```bash
# 로컬에서 파일 내용 복사
cat docs/demo-session-schema.sql
```

1. Supabase **SQL Editor**에서 **New query** 클릭
2. 위 파일의 내용을 복사해서 붙여넣기
3. **Run** 버튼 클릭

**설치 내용**:
- `demo_sessions` 테이블 생성
- 모든 테이블에 `demo_session_id` 컬럼 추가
- 세션 관리 함수들 생성 (create, delete, cleanup 등)
- 기존 데이터를 `TEMPLATE` 세션으로 표시

### 2. 데모 세션 사용 방법

#### 방법 1: 웹 UI로 세션 생성 (추천)

1. 브라우저에서 `/demo/start` 접속
2. "새 데모 시작" 버튼 클릭
3. 세션 ID 자동 생성 및 데이터 복사
4. 로그인 페이지로 자동 이동

#### 방법 2: SQL로 직접 세션 생성

```sql
-- 1. 새 세션 생성
SELECT * FROM create_demo_session('삼성전자 데모', '{"company": "Samsung"}');
-- 결과: session_id = 'ABC123XYZ'

-- 2. 템플릿 데이터 복사
SELECT initialize_demo_session_data('ABC123XYZ');

-- 3. 활성 세션 확인
SELECT * FROM active_demo_sessions;
```

### 3. 세션 관리

#### 활성 세션 조회

```sql
SELECT * FROM active_demo_sessions
ORDER BY last_accessed_at DESC;
```

#### 특정 세션 삭제

```sql
SELECT delete_demo_session('ABC123XYZ');
```

#### 만료된 세션 자동 정리 (크론잡)

```sql
SELECT cleanup_expired_demo_sessions();
```

**권장**: Vercel Cron Jobs 또는 Supabase Edge Functions로 매일 실행 설정

### 4. 관리자 UI

로그인 후 **데모 세션 관리** 메뉴에서:

- 전체 활성 세션 조회
- 세션 삭제
- 만료 세션 일괄 정리
- 세션별 통계 확인

### 5. 세션 플로우

```
[고객사 A]
  └─ /demo/start → 세션 A (ABC123) 생성
     └─ 로그인 → 세션 A의 데이터만 보임
        ├─ 리드 80개 (세션 A)
        ├─ 영업사원 10명 (세션 A)
        └─ 독립적으로 데이터 수정

[고객사 B] (동시 접속)
  └─ /demo/start → 세션 B (XYZ789) 생성
     └─ 로그인 → 세션 B의 데이터만 보임
        ├─ 리드 80개 (세션 B) ← 고객사 A와 완전 분리!
        ├─ 영업사원 10명 (세션 B)
        └─ 독립적으로 데이터 수정
```

### 6. 코드 마이그레이션

기존 코드에서 Supabase 쿼리를 사용하는 부분은 `useSupabaseWithSession` Hook으로 변경:

**Before**:
```typescript
import { supabase } from '@/lib/supabase'

const { data } = await supabase.from('lead_pool').select('*')
```

**After**:
```typescript
import { useSupabaseWithSession } from '@/hooks/useSupabaseWithSession'

const supabase = useSupabaseWithSession()
const { data } = await supabase.from('lead_pool').select('*')
// 자동으로 demo_session_id 필터 추가됨!
```

자세한 마이그레이션 가이드는 `docs/DEMO_SESSION_MIGRATION_GUIDE.md` 참조

---

## 데모 데이터 설치

### 1. 사용자 계정 생성 (Authentication)

**중요**: 데모 SQL을 실행하기 전에 Supabase Authentication에서 사용자를 먼저 생성해야 합니다.

1. 좌측 메뉴에서 **Authentication** → **Users** 클릭
2. **Add user** → **Create new user** 클릭

다음 사용자들을 생성하세요 (비밀번호는 모두 `demo1234`):

#### 관리자 계정

| Email | UUID | 이름 | 역할 |
|-------|------|------|------|
| admin@demo.com | `00000000-0000-0000-0000-000000000001` | 김대표 | 최고관리자 |
| manager1@demo.com | `00000000-0000-0000-0000-000000000002` | 이팀장 | 영업1팀 관리자 |
| manager2@demo.com | `00000000-0000-0000-0000-000000000008` | 박팀장 | 영업2팀 관리자 |

#### 영업사원 계정 (영업1팀)

| Email | UUID | 이름 |
|-------|------|------|
| sales1@demo.com | `00000000-0000-0000-0000-000000000003` | 김영업 |
| sales2@demo.com | `00000000-0000-0000-0000-000000000004` | 박상담 |
| sales3@demo.com | `00000000-0000-0000-0000-000000000005` | 최영업 |
| sales4@demo.com | `00000000-0000-0000-0000-000000000009` | 정영업 |
| sales5@demo.com | `00000000-0000-0000-0000-000000000010` | 홍상담 |

#### 영업사원 계정 (영업2팀)

| Email | UUID | 이름 |
|-------|------|------|
| sales6@demo.com | `00000000-0000-0000-0000-000000000006` | 강영업 |
| sales7@demo.com | `00000000-0000-0000-0000-000000000007` | 송상담 |
| sales8@demo.com | `00000000-0000-0000-0000-000000000011` | 윤영업 |
| sales9@demo.com | `00000000-0000-0000-0000-000000000012` | 장상담 |
| sales10@demo.com | `00000000-0000-0000-0000-000000000013` | 임영업 |

**UUID 설정 방법**:

Supabase에서는 기본적으로 UUID를 자동 생성하지만, 데모 데이터와 일치시키려면:

1. Supabase Dashboard → **SQL Editor**
2. 각 사용자에 대해 다음 SQL 실행:

```sql
-- 예시: admin@demo.com 계정의 UUID 업데이트
UPDATE auth.users
SET id = '00000000-0000-0000-0000-000000000001'
WHERE email = 'admin@demo.com';
```

또는 간단하게:

1. 사용자를 생성하고 자동 생성된 UUID를 확인
2. `docs/demo-data-enhanced.sql` 파일에서 해당 UUID를 실제 UUID로 교체

### 2. 데모 데이터 SQL 실행

1. **SQL Editor**로 돌아가기
2. **New query** 클릭
3. 다음 중 하나를 선택:
   - **기본 데모 데이터**: `docs/demo-data.sql`
   - **강화된 데모 데이터**: `docs/demo-data-enhanced.sql` ⭐ 권장

```bash
# 강화된 데모 데이터 복사
cat docs/demo-data-enhanced.sql
```

4. SQL을 붙여넣고 **Run** 클릭
5. 성공 메시지 확인

### 3. 데이터 확인

**Table Editor**에서 확인:

- **users**: 13명 (관리자 3명, 영업사원 10명)
- **lead_pool**: 80명 (미배정 20, 상담중 30, 계약완료 30)
- **lead_assignments**: 60건
- **counseling_activities**: 60건
- **upload_batches**: 5건

---

## 환경 변수 설정

### 1. 환경 변수 파일 생성

이미 `.env.local` 파일이 생성되어 있습니다. 내용을 확인하고 실제 Supabase 정보로 업데이트하세요:

```bash
# .env.local 파일 확인
cat .env.local
```

### 2. Supabase 정보 업데이트

`.env.local` 파일을 편집하여 실제 Supabase 프로젝트 정보로 교체:

```env
# Supabase Configuration for Demo
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**중요**:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon public 키
- `SUPABASE_SERVICE_ROLE_KEY`: service_role 키 (주의: 절대 공개하지 마세요!)

### 3. .env.local이 .gitignore에 포함되었는지 확인

```bash
# .gitignore 확인
grep ".env.local" .gitignore
```

출력이 있으면 OK! (보안상 중요)

---

## 로컬 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

### 3. 브라우저에서 확인

```
http://localhost:3000
```

---

## 데모 계정 정보

### 🔑 로그인 정보

**비밀번호는 모두 `demo1234`**

### 1. 최고관리자 (모든 권한)

```
Email: admin@demo.com
이름: 김대표
권한: 전체 시스템 관리, 모든 부서 접근
```

**테스트 시나리오**:
- 대시보드: 전체 실적 현황 확인
- 리드 관리: 모든 고객 데이터 조회/수정
- 상담원 관리: 계정 생성/삭제/권한 설정
- 데이터 업로드: 엑셀/CSV 파일 업로드
- 상담 모니터: 전체 상담 활동 실시간 모니터링
- 시스템 설정: 관리자 권한 부여

### 2. 일반 관리자 - 영업1팀 (이팀장)

```
Email: manager1@demo.com
이름: 이팀장
부서: 영업1팀
권한: 영업1팀 관리, 전체 기능 접근
```

**테스트 시나리오**:
- 영업1팀 소속 상담원만 조회 가능
- 리드 배정: 영업1팀 상담원에게만 배정
- 실적 분석: 영업1팀 통계 확인

### 3. 일반 관리자 - 영업2팀 (박팀장)

```
Email: manager2@demo.com
이름: 박팀장
부서: 영업2팀
권한: 영업2팀 관리, 제한된 기능
제한: 시스템 설정 불가, 전화번호 마스킹 해제 불가
```

**테스트 시나리오**:
- 영업2팀 소속 상담원만 조회 가능
- 전화번호 마스킹: 항상 `010-****-****` 형태로 표시
- 설정 메뉴: 접근 불가 (권한 없음)

### 4. 영업사원 (김영업)

```
Email: sales1@demo.com
이름: 김영업
부서: 영업1팀
```

**테스트 시나리오**:
- 개인 대시보드: 나의 실적, KPI 확인
- 상담 관리: 배정받은 고객만 조회
- 상담 기록: 고객 정보 입력, 14단계 등급 설정
- 메모 히스토리: 상담 내용 누적 기록

### 5. 다른 영업사원 계정들

```
영업1팀:
- sales2@demo.com (박상담)
- sales3@demo.com (최영업)
- sales4@demo.com (정영업)
- sales5@demo.com (홍상담)

영업2팀:
- sales6@demo.com (강영업)
- sales7@demo.com (송상담)
- sales8@demo.com (윤영업)
- sales9@demo.com (장상담)
- sales10@demo.com (임영업)
```

---

## 주요 기능 데모 시나리오

### 📊 대시보드 확인

1. `admin@demo.com`으로 로그인
2. 실시간 KPI 카드 확인:
   - 총 고객 수: 80명
   - 활성 영업사원: 10명
   - 계약 건수: 30건
   - 총 매출액
3. 영업사원별 성과 분석 차트 확인
4. 최근 계약 내역 테이블 확인

### 👥 리드 관리

1. 좌측 메뉴 → **리드 관리** 클릭
2. 검색 필터:
   - 전화번호 검색: `010-5000-0001`
   - 상태 필터: `미배정`, `배정됨`, `계약완료`
   - 데이터 출처: `A데이터`, `B데이터`, `C데이터`
3. 리드 배정:
   - 미배정 고객 선택
   - 영업사원 선택
   - 배정 완료

### 🎯 상담 모니터

1. **상담 모니터** 메뉴 클릭
2. 전체 상담 활동 실시간 확인
3. 필터링:
   - 고객 등급: 14단계 등급별
   - 상담 상태: `pending`, `contracted`, `failed`
4. 전화번호 마스킹:
   - 기본: `010-****-****`
   - 권한 있는 관리자: 마스킹 해제 버튼 표시

### 📁 데이터 업로드

1. **데이터 업로드** 메뉴 클릭
2. 4단계 업로드 프로세스:
   - Step 1: 파일 선택 (CSV/XLSX)
   - Step 2: 미리보기 & 컬럼 매핑
   - Step 3: 중복 검사
   - Step 4: 처리 완료 리포트
3. 업로드 이력 확인

### 👤 상담원 화면

1. `sales1@demo.com`으로 로그인
2. **나의 대시보드**:
   - 개인 KPI: 배정 수, 계약 수, 전환율
   - 활동 타임라인
   - 고객 상태별 분포
3. **상담 관리**:
   - 배정받은 고객 리스트
   - 상담 기록 입력:
     - 실제 고객명
     - 투자 예산
     - 14단계 등급 선택
     - 상담 메모 (히스토리 누적)
     - 다음 연락일 설정

---

## 배포 (Vercel)

### 1. GitHub에 푸시

```bash
git add .
git commit -m "feat: 데모 환경 설정 완료"
git push origin main
```

### 2. Vercel 배포

1. [Vercel Dashboard](https://vercel.com/dashboard) 로그인
2. **New Project** 클릭
3. GitHub 저장소 선택
4. **Environment Variables** 설정:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
5. **Deploy** 클릭
6. 배포 완료 후 URL 확인 (예: `https://enterprise-crm-demo.vercel.app`)

### 3. 커스텀 도메인 설정 (선택사항)

1. Vercel 프로젝트 → **Settings** → **Domains**
2. 원하는 도메인 추가 (예: `crm-demo.yourdomain.com`)

---

## 문제 해결

### ❌ "Missing Supabase environment variables" 오류

**원인**: `.env.local` 파일이 없거나 환경 변수가 잘못됨

**해결**:
```bash
# .env.local 파일 확인
cat .env.local

# 환경 변수가 올바른지 확인
# 프로젝트 루트에서 실행
npm run dev
```

### ❌ 로그인 후 "Unauthorized" 오류

**원인**: Supabase Authentication에 사용자가 없거나 `users` 테이블에 프로필이 없음

**해결**:
1. Supabase Dashboard → **Authentication** → **Users**에서 사용자 확인
2. **SQL Editor**에서 확인:
   ```sql
   SELECT * FROM users WHERE email = 'admin@demo.com';
   ```
3. 데이터가 없으면 `demo-data-enhanced.sql` 다시 실행

### ❌ 데이터가 표시되지 않음

**원인**: Row Level Security (RLS) 정책 문제 또는 데이터 미입력

**해결**:
1. **SQL Editor**에서 RLS 비활성화 (데모용):
   ```sql
   ALTER TABLE users DISABLE ROW LEVEL SECURITY;
   ALTER TABLE lead_pool DISABLE ROW LEVEL SECURITY;
   ALTER TABLE lead_assignments DISABLE ROW LEVEL SECURITY;
   ALTER TABLE counseling_activities DISABLE ROW LEVEL SECURITY;
   ```
2. 데이터 확인:
   ```sql
   SELECT COUNT(*) FROM lead_pool;
   SELECT COUNT(*) FROM users;
   ```

### ❌ 빌드 실패 (Type 오류)

**원인**: TypeScript 타입 체크 오류

**해결**:
```bash
# 타입 체크
npm run build

# 오류 확인 후 수정
# 또는 임시로 타입 체크 건너뛰기 (권장하지 않음)
```

### ❌ Supabase 연결 실패

**원인**: 네트워크 문제 또는 잘못된 URL/키

**해결**:
1. Supabase Dashboard → **Settings** → **API**에서 키 재확인
2. `.env.local` 파일 업데이트
3. 개발 서버 재시작:
   ```bash
   # Ctrl+C로 서버 종료 후
   npm run dev
   ```

---

## 🎯 데모 프레젠테이션 팁

### 1. 스토리텔링 순서

1. **관리자 로그인** (`admin@demo.com`)
   - 전체 대시보드 보여주기
   - "80명의 고객, 10명의 영업사원, 30건의 계약"

2. **리드 관리**
   - 검색/필터링 기능 시연
   - 실시간 통계 자동 계산 강조

3. **데이터 업로드**
   - 엑셀 파일 업로드 시연 (샘플 엑셀 미리 준비)
   - 중복 제거 로직 설명

4. **상담 모니터**
   - 14단계 고객 등급 시스템 설명
   - 전화번호 마스킹 보안 기능

5. **영업사원 로그인** (`sales1@demo.com`)
   - 개인 대시보드 전환
   - 상담 기록 입력 시연
   - 메모 히스토리 기능

### 2. 강조할 포인트

- **실시간 데이터**: 모든 통계가 자동 계산됨
- **권한 관리**: 부서별/역할별 접근 제어
- **보안**: 전화번호 마스킹, 권한 기반 접근
- **확장성**: 10,000+ 리드 처리 가능한 서버 사이드 페이지네이션
- **UX**: 직관적인 인터페이스, 빠른 검색/필터링

### 3. 질문 대비

**Q: 실제 운영 환경에서도 이렇게 빠른가요?**
A: 네, Next.js 서버 컴포넌트와 Supabase PostgreSQL의 인덱싱으로 10,000+ 데이터도 빠르게 처리합니다.

**Q: 보안은 어떻게 되나요?**
A: Row Level Security, 권한 기반 접근 제어, 전화번호 마스킹 등 다층 보안 시스템을 적용했습니다.

**Q: 커스터마이징 가능한가요?**
A: 네, 고객사 요구사항에 맞춰 컬럼, 워크플로우, 권한 체계를 자유롭게 수정할 수 있습니다.

**Q: 가격은 얼마인가요?**
A: (비즈니스 모델에 따라 답변 준비)

---

## 📞 지원

문제가 발생하면:

1. **문서 확인**: `README.md`, `docs/ARCHITECTURE.md`
2. **로그 확인**: 브라우저 개발자 도구 콘솔
3. **Supabase 로그**: Supabase Dashboard → **Logs**

---

## ✅ 데모 체크리스트

배포 전 확인:

- [ ] Supabase 프로젝트 생성 완료
- [ ] 데이터베이스 스키마 실행 완료
- [ ] Authentication 사용자 생성 완료 (최소 3명)
- [ ] 데모 데이터 SQL 실행 완료
- [ ] `.env.local` 파일 설정 완료
- [ ] 로컬에서 `npm run dev` 실행 성공
- [ ] 관리자 로그인 테스트 완료
- [ ] 영업사원 로그인 테스트 완료
- [ ] 대시보드 데이터 표시 확인
- [ ] 리드 검색/필터링 작동 확인
- [ ] Vercel 배포 완료 (선택사항)
- [ ] 프레젠테이션 시나리오 준비 완료

---

## 🎉 데모 준비 완료!

모든 단계를 완료하셨다면 이제 상용 데모로 사용할 준비가 완료되었습니다.

**데모 URL**: `http://localhost:3000` (또는 Vercel URL)

**추천 시연 순서**:
1. 관리자 대시보드 (2분)
2. 리드 관리 & 배정 (3분)
3. 상담 모니터링 (2분)
4. 영업사원 화면 (3분)
5. 데이터 업로드 (2분)
6. Q&A (8분)

**총 예상 시간**: 20분

---

**제작**: Enterprise CRM Team
**버전**: 1.0.0
**최종 업데이트**: 2024-11-04
