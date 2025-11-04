# 데모 세션 Multi-Tenancy 마이그레이션 가이드

## 개요

여러 업체가 동시에 독립적으로 데모를 사용할 수 있도록 Multi-Tenancy 구조를 구현했습니다.

### 주요 변경사항

1. **데모 세션 테이블** - 각 데모 세션 정보 관리
2. **모든 테이블에 `demo_session_id` 컬럼** - 데이터 격리
3. **자동 세션 필터링** - `useSupabaseWithSession` Hook
4. **데모 시작 페이지** - `/demo/start`

---

## 데이터베이스 마이그레이션

### 1. Supabase에서 SQL 실행

```bash
# SQL Editor에서 실행
cat docs/demo-session-schema.sql
```

위 파일의 내용을 Supabase SQL Editor에 붙여넣고 실행하세요.

### 2. 실행 내용

- `demo_sessions` 테이블 생성
- 모든 테이블에 `demo_session_id` 컬럼 추가
- 인덱스 생성
- 세션 관리 함수들 생성
  - `create_demo_session()` - 새 세션 생성
  - `initialize_demo_session_data()` - 템플릿 데이터 복사
  - `delete_demo_session()` - 세션 삭제
  - `cleanup_expired_demo_sessions()` - 만료된 세션 정리

### 3. 기존 데이터 처리

기존의 데모 데이터는 자동으로 `TEMPLATE` 세션으로 표시됩니다.

---

## 코드 마이그레이션

### 기존 코드 (Before)

```typescript
import { supabase } from '@/lib/supabase'

function MyComponent() {
  const fetchLeads = async () => {
    const { data } = await supabase
      .from('lead_pool')
      .select('*')
      .eq('status', 'available')

    return data
  }
}
```

### 새 코드 (After)

```typescript
import { useSupabaseWithSession } from '@/hooks/useSupabaseWithSession'

function MyComponent() {
  const supabase = useSupabaseWithSession() // ✅ 세션 필터 자동 적용

  const fetchLeads = async () => {
    const { data } = await supabase
      .from('lead_pool')
      .select('*')
      .eq('status', 'available')
      // demo_session_id 필터가 자동으로 추가됨!

    return data
  }
}
```

**주의**: `useSupabaseWithSession`은 React Hook이므로 **클라이언트 컴포넌트**에서만 사용 가능합니다.

---

## 자동 필터링 동작 방식

### SELECT 쿼리

```typescript
const supabase = useSupabaseWithSession()

// 자동으로 .eq('demo_session_id', sessionId) 추가됨
const { data } = await supabase
  .from('lead_pool')
  .select('*')
```

### INSERT 쿼리

```typescript
const supabase = useSupabaseWithSession()

// 자동으로 demo_session_id: sessionId 추가됨
const { data } = await supabase
  .from('lead_pool')
  .insert({
    phone: '010-1234-5678',
    name: '홍길동'
  })
```

### UPDATE 쿼리

```typescript
const supabase = useSupabaseWithSession()

// 자동으로 .eq('demo_session_id', sessionId) 추가됨
const { error } = await supabase
  .from('lead_pool')
  .update({ status: 'assigned' })
  .eq('id', leadId)
```

### DELETE 쿼리

```typescript
const supabase = useSupabaseWithSession()

// 자동으로 .eq('demo_session_id', sessionId) 추가됨
const { error } = await supabase
  .from('lead_pool')
  .delete()
  .eq('id', leadId)
```

### RPC (Function) 호출

```typescript
const supabase = useSupabaseWithSession()

// 자동으로 p_session_id 파라미터 추가됨
const { data } = await supabase.rpc('my_function', {
  param1: 'value1'
})
// 실제 호출: { param1: 'value1', p_session_id: sessionId }
```

---

## 마이그레이션 체크리스트

### 파일별 수정 사항

아래 파일들에서 `import { supabase } from '@/lib/supabase'`를 `import { useSupabaseWithSession } from '@/hooks/useSupabaseWithSession'`로 변경하고, 컴포넌트 내부에서 `const supabase = useSupabaseWithSession()`를 추가해야 합니다.

#### 관리자 페이지

- [ ] `/src/app/admin/page.tsx` - 대시보드
- [ ] `/src/app/admin/leads/page.tsx` - 리드 관리
- [ ] `/src/app/admin/assignments/page.tsx` - 리드 배정
- [ ] `/src/app/admin/consulting-monitor/page.tsx` - 상담 모니터
- [ ] `/src/app/admin/counselors/page.tsx` - 상담원 관리
- [ ] `/src/app/admin/upload/page.tsx` - 데이터 업로드
- [ ] `/src/app/admin/settings/page.tsx` - 설정

#### 상담원 페이지

- [ ] `/src/app/counselor/dashboard/page.tsx` - 개인 대시보드
- [ ] `/src/app/counselor/consulting/page.tsx` - 상담 관리

#### 서비스 파일

- [ ] `/src/lib/services/permissions.ts`
- [ ] `/src/lib/services/departmentPermissions.ts`

#### 인증

- [ ] `/src/lib/auth/AuthContext.tsx` - 사용자 프로필 로드 시

---

## 서버 컴포넌트 처리

서버 컴포넌트에서는 Hook을 사용할 수 없으므로, 쿠키에서 직접 세션 ID를 가져와야 합니다.

### 예시: Server Component

```typescript
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'

export default async function ServerPage() {
  // 쿠키에서 세션 ID 가져오기
  const cookieStore = cookies()
  const sessionId = cookieStore.get('demo_session_id')?.value

  // 수동으로 필터 추가
  const { data } = await supabase
    .from('lead_pool')
    .select('*')
    .eq('demo_session_id', sessionId || 'TEMPLATE')

  return <div>{/* ... */}</div>
}
```

---

## 데모 세션 생성 플로우

### 1. 사용자 플로우

```
1. /demo/start 접속
2. "새 데모 시작" 클릭
3. 세션 ID 자동 생성 (예: ABC123XYZ)
4. 템플릿 데이터 복사 (users, lead_pool 등)
5. /login으로 리다이렉트
6. 로그인 후 해당 세션의 데이터만 보임
```

### 2. 세션 ID 저장

세션 ID는 **쿠키**에 저장됩니다:

```javascript
document.cookie = `demo_session_id=ABC123XYZ; path=/; max-age=${7 * 24 * 60 * 60}` // 7일
```

### 3. 세션 ID 사용

모든 컴포넌트에서 `useDemoSession` Hook으로 접근:

```typescript
import { useDemoSession } from '@/contexts/DemoSessionContext'

function MyComponent() {
  const { sessionId, updateSessionAccess, clearSession } = useDemoSession()

  return <div>현재 세션: {sessionId}</div>
}
```

---

## 세션 관리 기능

### 1. 세션 생성

```sql
SELECT * FROM create_demo_session('삼성전자 데모', '{"company": "Samsung"}');
-- 결과: { session_id: 'ABC123XYZ', session_name: '삼성전자 데모', ... }
```

### 2. 데이터 초기화

```sql
SELECT initialize_demo_session_data('ABC123XYZ');
-- 템플릿 데이터를 ABC123XYZ 세션으로 복사
```

### 3. 활성 세션 조회

```sql
SELECT * FROM active_demo_sessions;
```

### 4. 세션 삭제

```sql
SELECT delete_demo_session('ABC123XYZ');
```

### 5. 만료된 세션 자동 정리 (크론잡)

```sql
SELECT cleanup_expired_demo_sessions();
-- 7일 이상 된 세션 자동 삭제
```

---

## 로그인 페이지 수정

### 세션 ID 표시

로그인 페이지에 현재 세션 ID를 표시하는 것을 권장합니다:

```typescript
import { useDemoSession } from '@/contexts/DemoSessionContext'

function LoginPage() {
  const { sessionId } = useDemoSession()

  return (
    <div>
      {sessionId && sessionId !== 'TEMPLATE' && (
        <div className="text-sm text-text-tertiary">
          세션 ID: {sessionId}
        </div>
      )}
      {/* 로그인 폼 */}
    </div>
  )
}
```

---

## 테스트

### 1. 로컬 테스트

```bash
# 개발 서버 실행
npm run dev

# 브라우저에서 확인
# http://localhost:3000/demo/start
```

### 2. 다중 세션 테스트

1. 시크릿 창에서 세션 A 생성
2. 일반 창에서 세션 B 생성
3. 각각 다른 데이터 업로드/수정
4. 서로 데이터가 섞이지 않는지 확인

---

## 배포 (Vercel)

환경 변수 설정은 그대로 유지됩니다:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 문제 해결

### Q: 세션 필터가 적용되지 않아요

A: `useSupabaseWithSession` Hook을 사용하고 있는지 확인하세요. 기존 `supabase` import를 제거하고 Hook을 사용해야 합니다.

### Q: 서버 컴포넌트에서 어떻게 사용하나요?

A: 서버 컴포넌트에서는 `cookies()`로 직접 세션 ID를 가져와서 `.eq('demo_session_id', sessionId)`를 수동으로 추가해야 합니다.

### Q: RPC 함수에서 세션 ID를 어떻게 사용하나요?

A: `useSupabaseWithSession`의 `rpc` 메서드를 사용하면 자동으로 `p_session_id` 파라미터가 추가됩니다.

### Q: 기존 템플릿 데이터는 어떻게 되나요?

A: 기존 데이터는 `TEMPLATE` 세션으로 표시되며, 새 세션 생성 시 이 데이터가 복사됩니다.

---

## 참고 자료

- [데모 환경 설정 가이드](./DEMO_SETUP.md)
- [데이터베이스 스키마](./demo-session-schema.sql)
- [Supabase 공식 문서](https://supabase.com/docs)

---

**제작**: Enterprise CRM Team
**버전**: 2.0.0
**최종 업데이트**: 2024-11-04
