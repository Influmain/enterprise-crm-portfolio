# 🏗️ 시스템 아키텍처

> Enterprise CRM System의 기술적 설계 및 구현 상세

---

## 목차

1. [시스템 개요](#시스템-개요)
2. [기술 스택](#기술-스택)
3. [데이터베이스 설계](#데이터베이스-설계)
4. [인증 시스템](#인증-시스템)
5. [권한 관리](#권한-관리)
6. [핵심 패턴](#핵심-패턴)
7. [API 설계](#api-설계)
8. [성능 최적화](#성능-최적화)
9. [보안](#보안)

---

## 시스템 개요

### 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────┐
│                    클라이언트 (브라우저)                   │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ 관리자 UI    │  │ 영업사원 UI   │  │ 로그인 UI     │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────┘
                            │
                            ↓ HTTPS
┌─────────────────────────────────────────────────────────┐
│              Next.js 15 (App Router)                      │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Server Components (RSC)                         │   │
│  │  - 대시보드 페이지                                  │
│  │  - 고객 관리 페이지                                 │
│  │  - 영업사원 관리 페이지                              │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Client Components                                │   │
│  │  - 상담 기록 모달                                    │
│  │  - 데이터 업로드 워크플로우                           │
│  │  - 실시간 차트 및 통계                                │
│  └──────────────────────────────────────────────────┘   │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  API Routes                                       │   │
│  │  - /api/admin/*                                   │   │
│  │  - /api/user/*                                    │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            │
                            ↓ REST API / Real-time
┌─────────────────────────────────────────────────────────┐
│                   Supabase (BaaS)                         │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ PostgreSQL   │  │ Auth         │  │ Storage      │   │
│  │ Database     │  │ (JWT)        │  │ (미래)       │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 레이어 구조

```
┌────────────────────────────────────┐
│   Presentation Layer               │  ← UI 컴포넌트, 페이지
├────────────────────────────────────┤
│   Business Logic Layer             │  ← 서비스, 권한, 상태 관리
├────────────────────────────────────┤
│   Data Access Layer                │  ← Supabase Client, API
├────────────────────────────────────┤
│   Database Layer                   │  ← PostgreSQL (Supabase)
└────────────────────────────────────┘
```

---

## 기술 스택

### Frontend

| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 15.4.6 | 프레임워크 (App Router) |
| React | 19.1.0 | UI 라이브러리 |
| TypeScript | 5.x | 타입 안정성 |
| Tailwind CSS | v4 | 스타일링 |
| Zustand | 5.0.7 | 상태 관리 (클라이언트) |
| React Hook Form | 7.62.0 | 폼 검증 |
| Recharts | 3.1.2 | 차트 및 그래프 |
| Lucide React | 0.536.0 | 아이콘 라이브러리 |
| XLSX | latest | 엑셀 import/export |

### Backend

| 기술 | 용도 |
|------|------|
| Supabase | BaaS (Backend as a Service) |
| PostgreSQL | 데이터베이스 |
| Supabase Auth | 인증 (JWT) |
| Next.js API Routes | 서버사이드 로직 |

### DevOps

| 기술 | 용도 |
|------|------|
| Vercel | 배포 및 호스팅 |
| Git | 버전 관리 |
| npm | 패키지 관리 |

---

## 데이터베이스 설계

### ERD (Entity Relationship Diagram)

```
┌─────────────────────┐
│     users           │
│─────────────────────│
│ id (PK, UUID)       │◄─────┐
│ email               │      │
│ full_name           │      │
│ phone               │      │
│ department          │      │
│ role                │      │
│ is_super_admin      │      │
│ is_active           │      │
│ created_at          │      │
│ updated_at          │      │
└─────────────────────┘      │
         │                   │
         │ 1:N               │
         ↓                   │
┌─────────────────────┐      │
│ lead_assignments    │      │
│─────────────────────│      │
│ id (PK)             │      │
│ lead_id (FK)        │──┐   │
│ counselor_id (FK)   │  │   │
│ assigned_by (FK)    │──┘   │
│ assigned_at         │      │
│ status              │      │
│ notes               │      │
└─────────────────────┘      │
         │                   │
         │ 1:1               │
         ↓                   │
┌─────────────────────┐      │
│     lead_pool       │      │
│─────────────────────│      │
│ id (PK, UUID)       │      │
│ phone (UNIQUE)      │      │
│ contact_name        │      │
│ real_name           │      │
│ data_source         │      │
│ contact_script      │      │
│ data_date           │      │
│ extra_info          │      │
│ status              │      │
│ created_at          │      │
│ updated_at          │      │
└─────────────────────┘      │
                             │
┌─────────────────────┐      │
│ counseling_activities│     │
│─────────────────────│      │
│ id (PK, UUID)       │      │
│ assignment_id (FK)  │──────┘
│ contact_date        │
│ contact_method      │
│ actual_customer_name│
│ counseling_memo     │
│ investment_budget   │
│ customer_interest   │
│ contract_status     │
│ contract_amount     │
│ commission_amount   │
│ created_at          │
│ updated_at          │
└─────────────────────┘

┌─────────────────────┐      ┌─────────────────────┐
│ user_permissions    │      │ department_permissions│
│─────────────────────│      │─────────────────────│
│ id (PK)             │      │ id (PK)             │
│ user_id (FK)        │      │ user_id (FK)        │
│ permission_type     │      │ department          │
│ granted_by (FK)     │      │ granted_by (FK)     │
│ granted_at          │      │ granted_at          │
│ is_active           │      │ is_active           │
└─────────────────────┘      └─────────────────────┘
```

### 주요 테이블 상세

#### 1. users (사용자)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
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
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_department ON users(department);
CREATE INDEX idx_users_is_active ON users(is_active);
```

**역할**:
- `admin`: 관리자 (일반 or 최고)
- `counselor`: 영업사원

#### 2. lead_pool (고객 데이터)

```sql
CREATE TABLE lead_pool (
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
CREATE INDEX idx_lead_pool_phone ON lead_pool(phone);
CREATE INDEX idx_lead_pool_status ON lead_pool(status);
CREATE INDEX idx_lead_pool_created_at ON lead_pool(created_at DESC);
```

**상태**:
- `available`: 배정 가능
- `assigned`: 배정됨
- `completed`: 계약 완료
- `returned`: 반환됨

#### 3. lead_assignments (배정)

```sql
CREATE TABLE lead_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES lead_pool(id) ON DELETE CASCADE,
  counselor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'working', 'completed', 'returned')),
  notes TEXT
);

-- 인덱스
CREATE INDEX idx_assignments_counselor ON lead_assignments(counselor_id);
CREATE INDEX idx_assignments_lead ON lead_assignments(lead_id);
CREATE INDEX idx_assignments_status ON lead_assignments(status);
```

#### 4. counseling_activities (상담 기록)

```sql
CREATE TABLE counseling_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES lead_assignments(id) ON DELETE CASCADE,
  contact_date DATE NOT NULL,
  contact_method TEXT,
  actual_customer_name TEXT,
  counseling_memo TEXT,
  investment_budget TEXT,
  customer_interest TEXT,
  contract_status TEXT DEFAULT 'pending' CHECK (contract_status IN ('pending', 'contracted', 'failed')),
  contract_amount NUMERIC(15, 2),
  commission_amount NUMERIC(15, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_activities_assignment ON counseling_activities(assignment_id);
CREATE INDEX idx_activities_contact_date ON counseling_activities(contact_date DESC);
CREATE INDEX idx_activities_contract_status ON counseling_activities(contract_status);
```

#### 5. user_permissions (권한)

```sql
CREATE TABLE user_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_type TEXT NOT NULL,
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, permission_type)
);

-- 인덱스
CREATE INDEX idx_permissions_user ON user_permissions(user_id);
CREATE INDEX idx_permissions_type ON user_permissions(permission_type);
```

**권한 타입**:
- `assignments`: 배정 관리
- `consulting_monitor`: 상담 모니터링
- `counselors`: 영업사원 관리
- `dashboard`: 대시보드
- `leads`: 리드 관리
- `settings`: 시스템 설정
- `upload`: 데이터 업로드
- `phone_unmask`: 전화번호 마스킹 해제

---

## 인증 시스템

### v8 AuthContext 아키텍처

**파일**: `src/lib/auth/AuthContext.tsx`

#### 핵심 기능

1. **프로필 로드 재시도 로직**
   ```typescript
   const fetchUserProfile = async (userId: string, retryCount = 0) => {
     try {
       const { data, error } = await supabase
         .from('users')
         .select('*')
         .eq('id', userId)
         .single();

       if (error && retryCount < 2) {
         await new Promise(resolve => setTimeout(resolve, 1000));
         return fetchUserProfile(userId, retryCount + 1);
       }

       return data;
     } catch (error) {
       // 에러 처리
     }
   };
   ```

2. **8초 타임아웃 + 자동 재시도**
   ```typescript
   const loadUserWithTimeout = Promise.race([
     loadUser(),
     new Promise((_, reject) =>
       setTimeout(() => reject(new Error('Timeout')), 8000)
     )
   ]);
   ```

3. **스마트 리다이렉트**
   - 홈페이지(`/`)와 로그인 페이지에서만 리다이렉트
   - 무한 루프 방지

4. **토큰 갱신 안정화**
   ```typescript
   supabase.auth.onAuthStateChange((event, session) => {
     if (event === 'TOKEN_REFRESHED') {
       // 세션 업데이트
     }
   });
   ```

### 인증 플로우

```
1. 사용자 로그인 (이메일 + 비밀번호)
   ↓
2. Supabase Auth 검증
   ↓
3. JWT 토큰 발급
   ↓
4. users 테이블에서 프로필 조회 (최대 2회 재시도)
   ↓
5. 권한 정보 로드 (user_permissions, department_permissions)
   ↓
6. AuthContext에 저장
   ↓
7. 역할별 페이지로 리다이렉트
   - admin → /admin/dashboard
   - counselor → /counselor/dashboard
```

---

## 권한 관리

### 3단계 역할 체계

```
최고관리자 (is_super_admin = true)
  ├─ 모든 권한 자동 부여
  ├─ 권한 부여/해제 가능
  └─ 삭제 불가

일반관리자 (role = 'admin', is_super_admin = false)
  ├─ user_permissions 기반 권한
  ├─ 부서별 접근 제어
  └─ 소프트 삭제 가능

영업사원 (role = 'counselor')
  ├─ 자신의 데이터만 접근
  ├─ 배정된 고객만 조회
  └─ 상담 기록 입력
```

### 권한 확인 로직

**파일**: `src/lib/services/permissions.ts`

```typescript
export const checkPermission = async (
  userId: string,
  permissionType: PermissionType
): Promise<boolean> => {
  // 1. 최고관리자 확인
  const { data: user } = await supabase
    .from('users')
    .select('is_super_admin, role')
    .eq('id', userId)
    .single();

  if (user?.is_super_admin) {
    return true; // 최고관리자는 모든 권한
  }

  // 2. 일반관리자 권한 확인
  if (user?.role === 'admin') {
    const { data: permission } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', userId)
      .eq('permission_type', permissionType)
      .eq('is_active', true)
      .single();

    return !!permission;
  }

  // 3. 영업사원은 권한 없음
  return false;
};
```

### 부서 권한 시스템

**파일**: `src/lib/services/departmentPermissions.ts`

```typescript
// 관리자가 접근 가능한 부서 목록
export const getAllowedDepartments = (userId: string): string[] => {
  // 1. 본인 부서는 기본 접근
  const userDepartment = getCurrentUserDepartment();

  // 2. DB에서 추가 권한 조회
  const { data: permissions } = await supabase
    .from('department_permissions')
    .select('department')
    .eq('user_id', userId)
    .eq('is_active', true);

  // 3. 통합 반환
  return [userDepartment, ...permissions.map(p => p.department)];
};
```

---

## 핵심 패턴

### 1. v6 데이터 집계 패턴 (중복 방지)

**문제**:
- 1개의 assignment가 여러 개의 상담기록(counseling_activities)을 가질 수 있음
- `flatMap().reduce()`로 집계 시 assignment가 중복 카운트됨

**해결책**:
```typescript
// ❌ 잘못된 방법 (중복 발생)
const totalContracts = assignments.flatMap(a => a.counseling_activities)
  .filter(activity => activity.contract_status === 'contracted')
  .length;

// ✅ 올바른 방법 (v6 패턴)
const totalContracts = assignments.filter(assignment => {
  const activities = assignment.counseling_activities;
  if (!activities || activities.length === 0) return false;

  // assignment별 최신 기록만 확인
  const latestActivity = activities.sort(
    (a, b) => new Date(b.contact_date) - new Date(a.contact_date)
  )[0];

  return latestActivity?.contract_status === 'contracted';
}).length;
```

### 2. 서버사이드 페이징

**성능 문제**: 고객 데이터가 10,000건 이상일 때 한 번에 로드 시 메모리 부족

**해결책**:
```typescript
const PAGE_SIZE = 50;

const fetchLeads = async (page: number) => {
  const startIndex = page * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE - 1;

  const { data, count } = await supabase
    .from('lead_pool')
    .select('*', { count: 'exact' })
    .range(startIndex, endIndex)
    .order('created_at', { ascending: false });

  return {
    leads: data,
    totalCount: count,
    totalPages: Math.ceil(count / PAGE_SIZE)
  };
};
```

### 3. 메모 히스토리 (무한 스택)

**데이터 구조**:
```typescript
interface MemoHistory {
  content: string;
  timestamp: string;
  author: string;
}

// counseling_memo를 JSON 배열로 저장
counseling_memo: JSON.stringify([
  {
    content: "첫 번째 메모",
    timestamp: "2024-01-01T10:00:00Z",
    author: "김영업"
  },
  {
    content: "두 번째 메모 (수정)",
    timestamp: "2024-01-02T14:30:00Z",
    author: "김영업"
  }
])
```

### 4. 디자인 시스템

**파일**: `src/lib/design-system/index.ts`

```typescript
// 색상 변수 (2rule.md 준수)
export const COLORS = {
  text: {
    primary: 'text-gray-900 dark:text-gray-100',
    secondary: 'text-gray-600 dark:text-gray-400',
    tertiary: 'text-gray-500 dark:text-gray-500',
  },
  bg: {
    primary: 'bg-white dark:bg-gray-900',
    secondary: 'bg-gray-50 dark:bg-gray-800',
    tertiary: 'bg-gray-100 dark:bg-gray-700',
    hover: 'hover:bg-gray-100 dark:hover:bg-gray-800',
  },
  border: {
    primary: 'border-gray-200 dark:border-gray-700',
    secondary: 'border-gray-300 dark:border-gray-600',
  },
  status: {
    accent: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
  }
};
```

---

## API 설계

### RESTful API 엔드포인트

#### 관리자 API

| Method | Endpoint | 설명 | 권한 |
|--------|----------|------|------|
| POST | `/api/admin/create-user` | 사용자 생성 | admin |
| PATCH | `/api/admin/update-user` | 사용자 정보 수정 | admin |
| DELETE | `/api/admin/delete-user` | 소프트 삭제 | admin |
| DELETE | `/api/admin/permanently-delete-user` | 영구 삭제 | super_admin |
| POST | `/api/admin/restore-user` | 삭제 복구 | admin |
| POST | `/api/admin/reset-password` | 비밀번호 초기화 | admin |

#### 사용자 API

| Method | Endpoint | 설명 | 권한 |
|--------|----------|------|------|
| PATCH | `/api/user/update-profile` | 프로필 수정 | user |

### API 응답 형식

**성공 응답**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "message": "작업이 완료되었습니다."
}
```

**에러 응답**:
```json
{
  "success": false,
  "error": "PERMISSION_DENIED",
  "message": "권한이 없습니다.",
  "details": {
    "required": "admin",
    "current": "counselor"
  }
}
```

---

## 성능 최적화

### 1. React Server Components (RSC)

- 대시보드 통계: 서버에서 계산 후 HTML 전송
- 초기 로딩 속도 50% 개선

### 2. 스마트 캐싱

```typescript
// localStorage + sessionStorage 이중 저장
const cachePermissions = (userId: string, permissions: Permission[]) => {
  const cacheData = {
    permissions,
    timestamp: Date.now(),
    expiresIn: 3600000 // 1시간
  };

  localStorage.setItem(`permissions_${userId}`, JSON.stringify(cacheData));
  sessionStorage.setItem(`permissions_${userId}`, JSON.stringify(cacheData));
};
```

### 3. 지연 로딩

```typescript
// 동적 import로 필요한 컴포넌트만 로드
const DataUploadModal = dynamic(() => import('./DataUploadModal'), {
  loading: () => <LoadingSpinner />,
  ssr: false
});
```

### 4. 데이터베이스 인덱싱

```sql
-- 자주 조회되는 칼럼에 인덱스
CREATE INDEX idx_lead_pool_phone ON lead_pool(phone);
CREATE INDEX idx_assignments_counselor ON lead_assignments(counselor_id);
CREATE INDEX idx_activities_contract_status ON counseling_activities(contract_status);
```

---

## 보안

### 1. 전화번호 마스킹

```typescript
const maskPhone = (phone: string): string => {
  if (phone.length < 4) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-4);
};

// 권한 있는 사용자만 해제 가능
const unmaskedPhone = hasPermission('phone_unmask') ? phone : maskPhone(phone);
```

### 2. 소프트 삭제

```sql
-- is_active 플래그로 삭제 표시
UPDATE users SET is_active = false WHERE id = 'uuid';

-- 실제 데이터는 보존
SELECT * FROM users WHERE id = 'uuid'; -- 여전히 존재

-- 복구 가능
UPDATE users SET is_active = true WHERE id = 'uuid';
```

### 3. Row Level Security (RLS) - 준비 중

```sql
-- 영업사원은 자신의 배정만 조회
CREATE POLICY counselor_own_assignments ON lead_assignments
  FOR SELECT
  USING (counselor_id = auth.uid());

-- 관리자는 모든 배정 조회
CREATE POLICY admin_all_assignments ON lead_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
```

### 4. 환경 변수 보안

```bash
# .env.local (절대 커밋하지 않음)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=... # 서버에서만 사용
```

---

## 향후 개선 계획

### Phase 1: 실시간 기능
- Supabase Realtime으로 실시간 알림
- 새 배정 시 영업사원에게 푸시 알림

### Phase 2: AI 통합
- 상담 메모 자동 요약 (GPT-4)
- 리드 스코어링 (계약 가능성 예측)
- 음성 → 텍스트 자동 전사

### Phase 3: 모바일
- React Native 앱 개발
- 오프라인 모드 지원

### Phase 4: 고급 분석
- 예측 분석 (매출 예측)
- A/B 테스팅 플랫폼
- 커스텀 리포트 빌더

---

## 참고 자료

- [Next.js 공식 문서](https://nextjs.org/docs)
- [Supabase 공식 문서](https://supabase.com/docs)
- [PostgreSQL 최적화 가이드](https://www.postgresql.org/docs/)
- [React 19 릴리스 노트](https://react.dev/blog/2024/04/25/react-19)

---

**마지막 업데이트**: 2025-11-04
**작성자**: [Your Name]
