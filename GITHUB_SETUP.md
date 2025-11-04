# 📤 GitHub 업로드 가이드

> 포트폴리오용 CRM 프로젝트를 GitHub에 업로드하는 방법

---

## 📋 사전 준비

### 1. GitHub 계정 확인

- GitHub 계정이 없다면: [https://github.com/signup](https://github.com/signup)에서 가입
- 계정이 있다면 로그인 확인

### 2. Git 설치 확인

터미널에서 확인:
```bash
git --version
```

설치되지 않았다면:
- **macOS**: `brew install git` (Homebrew 필요)
- **Windows**: [https://git-scm.com/download/win](https://git-scm.com/download/win)
- **Linux**: `sudo apt-get install git` (Ubuntu/Debian)

---

## 🚀 GitHub 업로드 절차

### Step 1: GitHub에서 새 레포지토리 생성

1. GitHub에 로그인
2. 우측 상단 `+` 버튼 클릭 → `New repository` 선택
3. 레포지토리 정보 입력:
   ```
   Repository name: enterprise-crm-portfolio
   Description: 영업 조직을 위한 엔터프라이즈 CRM 시스템 (포트폴리오)

   ✅ Public (공개 - 포트폴리오용 추천)
   ⬜ Add a README file (체크 안 함 - 이미 있음)
   ⬜ Add .gitignore (체크 안 함 - 이미 있음)
   License: MIT License
   ```
4. `Create repository` 클릭

---

### Step 2: 로컬 프로젝트에서 Git 초기화

터미널에서 포트폴리오 폴더로 이동:

```bash
cd /workspaces/crm-portfolio
```

Git 초기화:

```bash
# 1. Git 초기화
git init

# 2. 사용자 정보 설정 (처음 한 번만)
git config user.name "Your Name"
git config user.email "your.email@example.com"

# 3. 파일 추가
git add .

# 4. 첫 커밋
git commit -m "Initial commit: Enterprise CRM System portfolio"
```

---

### Step 3: GitHub 레포지토리와 연결

GitHub에서 생성한 레포지토리 URL을 복사한 후:

```bash
# 원격 레포지토리 추가 (URL은 본인 것으로 변경)
git remote add origin https://github.com/your-username/enterprise-crm-portfolio.git

# main 브랜치로 변경 (GitHub 기본 브랜치)
git branch -M main

# 업로드
git push -u origin main
```

**인증 방법**:
- **Personal Access Token** 사용 권장
  1. GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)
  2. `Generate new token (classic)` 클릭
  3. Scope: `repo` 체크
  4. 생성된 토큰을 비밀번호로 사용

---

### Step 4: 업로드 확인

브라우저에서 `https://github.com/your-username/enterprise-crm-portfolio` 접속하여 확인

---

## 📝 README 개인화

업로드 전에 README.md를 수정하여 개인 정보를 업데이트하세요:

```markdown
## 👤 개발자

**프로젝트 담당**: [Your Name]
- GitHub: [@your-username](https://github.com/your-username)
- Email: your.email@example.com
- LinkedIn: [Your LinkedIn](https://linkedin.com/in/yourprofile)
```

수정 후:

```bash
git add README.md
git commit -m "docs: Update developer information"
git push
```

---

## 🎨 GitHub 레포지토리 꾸미기

### 1. About 섹션 추가

GitHub 레포지토리 페이지에서:
1. 우측 상단 ⚙️ (Settings) 클릭
2. Description 입력:
   ```
   영업 조직을 위한 엔터프라이즈 CRM 시스템 | Next.js 15 + React 19 + Supabase
   ```
3. Website 입력: Vercel 배포 URL (있다면)
4. Topics 추가:
   ```
   nextjs, react, typescript, supabase, crm, portfolio, tailwindcss
   ```

### 2. 스크린샷 추가 (선택)

`/docs/screenshots/` 폴더 생성 후 스크린샷 추가:

```bash
mkdir -p docs/screenshots
```

README.md에 이미지 추가:

```markdown
## 📸 스크린샷

### 관리자 대시보드
![Dashboard](docs/screenshots/dashboard.png)

### 상담 관리
![Consulting](docs/screenshots/consulting.png)
```

이미지 추가 후:

```bash
git add docs/screenshots/
git add README.md
git commit -m "docs: Add screenshots"
git push
```

---

## 🌐 Vercel 배포 (추천)

### 1. Vercel 계정 생성

[https://vercel.com/signup](https://vercel.com/signup)에서 GitHub 계정으로 가입

### 2. 프로젝트 import

1. Vercel Dashboard에서 `New Project` 클릭
2. GitHub 레포지토리 선택: `enterprise-crm-portfolio`
3. Framework Preset: `Next.js` (자동 감지됨)
4. Environment Variables 추가:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
5. `Deploy` 클릭

### 3. 배포 URL 확인

배포 완료 후 URL 복사 (예: `https://enterprise-crm-portfolio.vercel.app`)

README.md 업데이트:

```markdown
## 🎬 데모

**라이브 데모**: [https://enterprise-crm-portfolio.vercel.app](https://enterprise-crm-portfolio.vercel.app)
```

---

## 🔄 지속적 업데이트

코드 수정 후 업로드:

```bash
# 1. 변경사항 확인
git status

# 2. 파일 추가
git add .

# 3. 커밋
git commit -m "feat: Add new feature"

# 4. 업로드
git push
```

**커밋 메시지 규칙**:
- `feat`: 새 기능 추가
- `fix`: 버그 수정
- `docs`: 문서 수정
- `style`: 코드 포맷팅
- `refactor`: 리팩토링
- `test`: 테스트 추가
- `chore`: 빌드, 설정 변경

---

## 📊 GitHub Pages로 문서 호스팅 (선택)

### 1. docs 폴더를 GitHub Pages로 설정

GitHub 레포지토리 Settings > Pages:
1. Source: `Deploy from a branch`
2. Branch: `main` / `/docs`
3. Save

### 2. 문서 접근

`https://your-username.github.io/enterprise-crm-portfolio/`

---

## 🎯 포트폴리오 홍보

### 1. LinkedIn 포스팅

```markdown
🚀 새 프로젝트 완성!

영업 조직을 위한 엔터프라이즈 CRM 시스템을 개발했습니다.

✅ Next.js 15 + React 19
✅ Supabase BaaS
✅ 대용량 데이터 처리
✅ 실시간 통계 대시보드

GitHub: https://github.com/your-username/enterprise-crm-portfolio
Live Demo: https://your-demo-url.vercel.app

#WebDevelopment #React #NextJS #Portfolio
```

### 2. 이력서에 추가

```markdown
## 프로젝트 경험

### Enterprise CRM System | 2024.06 - 2024.10
영업 조직을 위한 고객관계관리 시스템 설계 및 개발

**기술 스택**: Next.js 15, React 19, TypeScript, Supabase, Tailwind CSS

**주요 성과**:
- 대용량 데이터 처리 (서버사이드 페이징으로 10,000+ 고객 관리)
- v6 데이터 집계 패턴으로 중복 집계 방지
- 3단계 역할 체계와 8가지 세분화된 권한 시스템 구현
- 엑셀/CSV 대량 업로드 및 중복 검출 자동화

**GitHub**: https://github.com/your-username/enterprise-crm-portfolio
```

---

## ✅ 최종 체크리스트

업로드 전 확인:

- [ ] `.env.local` 파일이 .gitignore에 포함되어 있는가?
- [ ] README.md에 개인 정보가 업데이트되었는가?
- [ ] 민감한 정보 (API 키, 비밀번호)가 코드에 없는가?
- [ ] .env.example 파일이 포함되어 있는가?
- [ ] 문서 (ARCHITECTURE.md, BUSINESS_CASE.md)가 완성되었는가?
- [ ] 스크린샷이 추가되었는가? (선택)
- [ ] 데모 환경이 배포되었는가? (선택)

---

## 🆘 문제 해결

### 문제: Push 시 인증 실패

**해결책**: Personal Access Token 사용
```bash
# Username: GitHub 사용자명
# Password: Personal Access Token (GitHub에서 생성)
```

### 문제: 파일 크기 초과 (100MB 이상)

**해결책**: Git LFS 사용 또는 파일 제외
```bash
# .gitignore에 추가
*.zip
*.tar.gz
large-file.mp4
```

### 문제: 브랜치 이름 불일치 (master vs main)

**해결책**:
```bash
git branch -M main
git push -u origin main
```

---

## 📚 추가 자료

- [GitHub 공식 가이드](https://docs.github.com/ko)
- [Git 기초 튜토리얼](https://git-scm.com/book/ko/v2)
- [Vercel 배포 가이드](https://vercel.com/docs)

---

**축하합니다! 🎉**

이제 포트폴리오가 GitHub에 공개되었습니다.
취업 또는 프리랜서 활동에 활용하세요!

---

**마지막 업데이트**: 2025-11-04
