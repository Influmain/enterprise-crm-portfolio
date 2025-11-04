# 🎯 Enterprise CRM System

> 영업 조직을 위한 올인원 고객관계관리 시스템 | Next.js 15 + React 19 + Supabase

[![Next.js](https://img.shields.io/badge/Next.js-15.4.6-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1.0-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-BaaS-green)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8)](https://tailwindcss.com/)

---

## 📌 프로젝트 소개

**엔터프라이즈 CRM 시스템**은 보험, 텔레마케팅, 부동산 등 영업 중심 조직을 위해 개발된 **프로덕션급 고객관계관리 솔루션**입니다.

대량의 고객 데이터를 효율적으로 관리하고, 영업사원의 상담 활동을 추적하며, 실시간 성과 분석을 통해 데이터 기반 의사결정을 지원합니다.

### 🎯 핵심 가치

- **영업 생산성 향상**: 리드 자동 배정, 상담 기록 자동화로 수작업 시간 70% 절감
- **투명한 성과 추적**: 영업사원별 전환율, 매출, 활동량 실시간 모니터링
- **데이터 기반 의사결정**: 고객등급 분포, 파이프라인 현황으로 정확한 매출 예측
- **보안과 권한 관리**: 3단계 역할 체계와 8가지 세분화된 접근 권한

---

## ✨ 주요 기능

### 👨‍💼 관리자 기능

#### 📊 실시간 대시보드
- **핵심 KPI 카드**: 총 고객, 활성 영업사원, 결제유력, 총 매출
- **영업사원 성과 분석**: 개인별 배정 수, 계약 수, 전환율, 매출 비교
- **최근 계약 현황**: 최신 10건의 계약 완료 기록
- **필터링**: 날짜 범위, 부서별 선택

#### 👥 고객 관리
- **대용량 데이터 처리**: 서버사이드 페이징으로 수만 건 고객 관리
- **고급 검색/필터**: 전화번호, 고객명, 상태, 출처, 날짜범위
- **인라인 편집**: 회원등급, 메모 실시간 수정
- **일괄 작업**: 선택 삭제, 배정 이력 확인
- **통계**: 전체/배정/미배정/계약 고객 수 자동 집계

#### 🎓 영업사원 관리
- **계정 관리**: 신규 생성, 정보 수정, 소프트 삭제 + 복구
- **부서별 필터링**: 특정 부서 영업사원만 표시
- **성과 통계**: 배정 수, 계약 수, 전환율 자동 계산
- **세분화된 권한**: 페이지별 접근 권한 부여

#### 📤 데이터 업로드
- **멀티 단계 워크플로우**:
  1. CSV/XLSX 파일 업로드
  2. 미리보기 및 칼럼 매핑
  3. 중복 검출 (파일 내부 + DB 내부)
  4. 검증 및 처리
  5. 완료 보고서
- **배치 관리**: 업로드 이력 추적

#### 🔍 상담 모니터링
- **실시간 모니터링**: 모든 영업사원의 상담 현황 추적
- **고급 필터**: 상태, 등급, 날짜별 필터링
- **메모 히스토리**: 무한 스택형 변경 이력 조회
- **개인정보 보호**: 전화번호 마스킹 + 권한별 해제

#### ⚙️ 시스템 설정
- **관리자 관리**: 신규 생성, 권한 부여, 삭제 및 복구
- **부서 권한**: 특정 부서만 접근 가능하도록 설정
- **권한 이력**: 모든 변경 사항 감사 추적

### 💼 영업사원 기능

#### 📊 개인 대시보드
- **개인 성과**: 배정 수, 계약 수, 전환율, 총 매출
- **시간대별 활동**: 상담 활동 추이 차트
- **상태별 고객**: 미접촉, 상담중, 계약 완료 현황
- **회원등급 분포**: 14단계 등급별 고객 수

#### 📞 상담 관리
- **배정된 고객 목록**: 검색, 필터링, 정렬, 페이지네이션
- **상담 기록 입력**:
  - 실제 고객명
  - 상담 메모
  - 투자 예산
  - 계약 금액 (예상/확정)
  - 14단계 고객 등급
  - 다음 접촉 희망일
- **메모 히스토리**: 이전 상담 기록 조회 및 복구

---

## 🏗️ 기술 스택

### Frontend
- **Framework**: Next.js 15.4.6 (App Router)
- **UI Library**: React 19.1.0
- **Styling**: Tailwind CSS v4 + 커스텀 디자인 시스템
- **State Management**: Zustand 5.0.7
- **Forms**: React Hook Form 7.62.0
- **Charts**: Recharts 3.1.2
- **Icons**: Lucide React 0.536.0
- **Data Processing**: XLSX (엑셀 import/export)

### Backend
- **BaaS**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **API**: Next.js API Routes
- **Real-time**: Supabase Realtime (준비 중)

### DevOps
- **Deployment**: Vercel (권장)
- **Version Control**: Git
- **Package Manager**: npm

---

## 🚀 빠른 시작

### 1. 사전 요구사항

- Node.js 18.x 이상
- npm 또는 yarn
- Supabase 계정

### 2. 설치

```bash
# 저장소 클론
git clone https://github.com/your-username/enterprise-crm.git
cd enterprise-crm

# 의존성 설치
npm install
```

### 3. 환경 변수 설정

`.env.example` 파일을 `.env.local`로 복사하고 Supabase 정보를 입력하세요.

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Supabase 데이터베이스 설정

`docs/database-schema.sql` 파일의 내용을 Supabase SQL Editor에서 실행하세요.

주요 테이블:
- `users`: 사용자 계정
- `lead_pool`: 고객 데이터
- `lead_assignments`: 리드 배정
- `counseling_activities`: 상담 활동 기록
- `user_permissions`: 권한 관리
- `department_permissions`: 부서 권한

### 5. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

### 6. 초기 관리자 계정 생성

Supabase Dashboard에서 직접 사용자를 생성하거나, SQL로 생성:

```sql
-- 먼저 Supabase Auth에서 사용자 생성 후
INSERT INTO users (id, email, full_name, role, is_super_admin, is_active)
VALUES
  ('user-uuid', 'admin@example.com', '관리자', 'admin', true, true);
```

---

## 📁 프로젝트 구조

```
/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── admin/                # 관리자 페이지
│   │   │   ├── dashboard/        # 대시보드
│   │   │   ├── leads/            # 고객 관리
│   │   │   ├── counselors/       # 영업사원 관리
│   │   │   ├── assignments/      # 배정 관리
│   │   │   ├── upload/           # 데이터 업로드
│   │   │   ├── consulting-monitor/ # 상담 모니터링
│   │   │   └── settings/         # 시스템 설정
│   │   ├── counselor/            # 영업사원 페이지
│   │   ├── api/                  # API Routes
│   │   └── login/                # 로그인
│   ├── components/               # React 컴포넌트
│   │   ├── layout/               # 레이아웃
│   │   ├── auth/                 # 인증
│   │   └── ui/                   # UI 컴포넌트
│   ├── lib/                      # 라이브러리
│   │   ├── auth/                 # 인증 컨텍스트
│   │   ├── services/             # 비즈니스 로직
│   │   └── design-system/        # 디자인 시스템
│   └── hooks/                    # 커스텀 hooks
├── public/                       # 정적 파일
├── docs/                         # 문서
│   ├── ARCHITECTURE.md           # 아키텍처 문서
│   ├── BUSINESS_CASE.md          # 비즈니스 케이스
│   └── database-schema.sql       # DB 스키마
└── README.md
```

---

## 🎨 핵심 기술적 특징

### 1. v8 인증 시스템

**파일**: `src/lib/auth/AuthContext.tsx`

- ✅ 프로필 로드 재시도 로직 (최대 2회)
- ✅ 8초 타임아웃 + 자동 재시도
- ✅ 스마트 리다이렉트 (무한 루프 방지)
- ✅ 토큰 갱신 안정화

### 2. v6 데이터 집계 패턴

**문제**: assignment 1개가 여러 상담기록을 가질 때 중복 집계 발생

**해결책**: assignment별 최신 기록만 사용하여 정확한 KPI 계산

```typescript
// 예시: 계약 건수 정확히 계산
const latestActivity = activities
  .sort((a, b) => new Date(b.contact_date) - new Date(a.contact_date))[0];

if (latestActivity?.contract_status === 'contracted') {
  totalContracts++;
}
```

### 3. 세분화된 권한 시스템

**3단계 역할 체계**:
- 최고관리자: 모든 권한 자동 부여
- 일반관리자: 8가지 권한 선택적 부여
- 영업사원: 자신의 데이터만 접근

**8가지 권한 타입**:
- `assignments`: 배정 관리
- `consulting_monitor`: 상담 모니터링
- `counselors`: 영업사원 관리
- `dashboard`: 대시보드
- `leads`: 리드 관리
- `settings`: 시스템 설정
- `upload`: 데이터 업로드
- `phone_unmask`: 전화번호 마스킹 해제

### 4. 성능 최적화

- **서버사이드 페이징**: 50개씩 로드로 대용량 데이터 처리
- **스마트 캐싱**: localStorage + sessionStorage 이중 저장
- **지연 로딩**: 필요한 컴포넌트만 동적 로드

### 5. 디자인 시스템

**일관된 색상 체계**:
```typescript
Text: text-primary, text-secondary, text-tertiary
Background: bg-primary, bg-secondary, bg-tertiary, bg-hover
Border: border-primary, border-secondary
Status: accent, success, warning, error
```

**재사용 가능한 컴포넌트**:
- `SmartTable`: 반응형 테이블
- `Toast`: 알림 시스템
- `ProtectedRoute`: 권한 기반 라우트 보호

---

## 📊 데이터 모델

### ERD 개요

```
users (사용자)
  ↓ 1:N
lead_assignments (배정)
  ↓ 1:1
lead_pool (고객)

lead_assignments
  ↓ 1:N
counseling_activities (상담 기록)

users
  ↓ 1:N
user_permissions (권한)

users
  ↓ 1:N
department_permissions (부서 권한)
```

상세 스키마는 `docs/ARCHITECTURE.md` 참조

---

## 🎯 사용 사례

### 보험/금융 영업
- 보험 설계사별 고객 배정 및 상담 추적
- 만기 알림, 갱신 관리
- 상품별 계약 현황 분석

### 텔레마케팅
- 콜센터 상담원별 통화 기록
- 실시간 상담 모니터링
- 통화 스크립트 관리

### 부동산 중개
- 매물 문의 고객 관리
- 중개사별 성과 추적
- 매물-고객 매칭

### B2B SaaS 영업
- 기업 고객 파이프라인 관리
- 장기 세일즈 사이클 추적
- 의사결정권자 정보 관리

---

## 🛠️ 커스터마이징 가이드

### 고객등급 14단계 수정

`src/lib/design-system/index.ts`에서 `CUSTOMER_GRADES` 수정:

```typescript
export const CUSTOMER_GRADES = [
  { value: 'new', label: '신규', color: 'bg-blue-100 text-blue-800' },
  // ... 나머지 등급
];
```

### 권한 추가

1. `src/lib/services/permissions.ts`에 새 권한 타입 추가
2. `user_permissions` 테이블 권한 부여
3. `ProtectedRoute` 컴포넌트에서 권한 체크

### 부서 추가

1. 관리자 페이지 > 영업사원 관리에서 부서 필드 수정
2. 필터링 옵션에 새 부서 추가

---

## 📚 문서

- [아키텍처 가이드](docs/ARCHITECTURE.md) - 시스템 설계 및 기술적 상세
- [비즈니스 케이스](docs/BUSINESS_CASE.md) - 도입 효과 및 ROI
- [API 문서](docs/API.md) - API 엔드포인트 명세 (작성 예정)

---

## 🔒 보안

- ✅ 전화번호 마스킹 기본 적용
- ✅ 권한별 접근 제어 (RLS 준비 중)
- ✅ 소프트 삭제로 데이터 보존
- ✅ 감사 로그 (권한 변경 이력)
- ✅ 환경 변수로 민감 정보 관리

---

## 🚀 배포

### Vercel 배포 (권장)

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

환경 변수는 Vercel Dashboard에서 설정하세요.

### 기타 플랫폼

- **Netlify**: `netlify deploy`
- **AWS Amplify**: Git 연동 자동 배포
- **Docker**: `Dockerfile` 작성 후 컨테이너화

---

## 🤝 기여

이 프로젝트는 포트폴리오 목적으로 공개되었습니다.

개선 제안이나 버그 리포트는 Issues에 등록해주세요.

---

## 📄 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능합니다.

상업적 사용 시 출처를 명시해주시면 감사하겠습니다.

---

## 👤 개발자

**프로젝트 담당**: [Your Name]
- GitHub: [@your-username](https://github.com/your-username)
- Email: your.email@example.com
- LinkedIn: [Your LinkedIn](https://linkedin.com/in/yourprofile)

---

## 🙏 감사

- [Next.js](https://nextjs.org/) - 프레임워크
- [Supabase](https://supabase.com/) - Backend as a Service
- [Vercel](https://vercel.com/) - 배포 플랫폼
- [Tailwind CSS](https://tailwindcss.com/) - 스타일링

---

## 📈 개발 로드맵

### v2.0 (예정)
- [ ] AI 상담 내용 자동 요약
- [ ] 리드 스코어링 (계약 가능성 예측)
- [ ] 음성 → 텍스트 자동 전사
- [ ] 실시간 알림 (Supabase Realtime)

### v1.5 (예정)
- [ ] 엑셀/PDF 리포트 생성
- [ ] 이메일 자동 발송
- [ ] 모바일 앱 (React Native)
- [ ] API 문서 자동 생성

---

## 🎬 데모

**라이브 데모**: [https://your-demo-url.vercel.app](https://your-demo-url.vercel.app)

**데모 계정**:
- 관리자: `admin@demo.com` / `demo1234`
- 영업사원: `counselor@demo.com` / `demo1234`

---

<div align="center">

**⭐ 이 프로젝트가 도움이 되셨다면 Star를 눌러주세요!**

Made with ❤️ using Next.js and Supabase

</div>
