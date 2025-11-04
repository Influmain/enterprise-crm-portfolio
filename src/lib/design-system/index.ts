// ========================================
// 🎨 Tailwind v4 기반 전역 디자인 시스템
// ========================================

// CSS 변수 기반 컬러 시스템
export const colors = {
  // 배경색
  bg: {
    primary: 'bg-bg-primary',
    secondary: 'bg-bg-secondary',
    tertiary: 'bg-bg-tertiary',
    hover: 'bg-bg-hover',
  },
  
  // 텍스트 색상
  text: {
    primary: 'text-text-primary',
    secondary: 'text-text-secondary',
    tertiary: 'text-text-tertiary',
    disabled: 'text-text-disabled',
  },
  
  // 경계선
  border: {
    primary: 'border-border-primary',
    secondary: 'border-border-secondary',
  },
  
  // 포인트 컬러
  accent: {
    default: 'bg-accent text-white',
    hover: 'bg-accent-hover',
    light: 'bg-accent-light text-accent',
    text: 'text-accent',
  },
  
  // 상태 컬러
  status: {
    success: {
      bg: 'bg-success',
      light: 'bg-success-light text-success',
      text: 'text-success',
    },
    warning: {
      bg: 'bg-warning',
      light: 'bg-warning-light text-warning',
      text: 'text-warning',
    },
    error: {
      bg: 'bg-error',
      light: 'bg-error-light text-error',
      text: 'text-error',
    }
  }
}

// 컴포넌트 클래스 조합
export const components = {
  // 버튼 스타일
  button: {
    // 기본 버튼 스타일
    base: 'btn',
    
    // 버튼 변형
    primary: 'btn btn-primary',
    secondary: 'btn btn-secondary',
    ghost: 'btn btn-ghost',
    
    // 크기 변형
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg',
    
    // 특수 변형
    icon: 'p-2 rounded-lg',
    full: 'w-full justify-center',
  },

  // 카드 스타일
  card: {
    base: 'card',
    secondary: 'card-secondary',
    interactive: 'card-interactive',
    
    // 패딩 변형
    content: 'p-6',
    contentSm: 'p-4',
    contentLg: 'p-8',
    
    // 그림자 변형
    flat: 'shadow-none',
    elevated: 'shadow-lg',
  },

  // 입력 필드
  input: {
    base: 'input',
    search: 'input pl-10',
    error: 'input border-error',
    success: 'input border-success',
  },

  // 상태 뱃지
  badge: {
    base: 'badge',
    success: 'badge badge-success',
    warning: 'badge badge-warning',
    error: 'badge badge-error',
    info: 'badge badge-info',
  },

  // 레이아웃
  layout: {
    page: 'bg-bg-secondary min-h-screen',
    header: 'bg-bg-primary border-b border-border-primary sticky top-0 z-40',
    sidebar: 'bg-bg-secondary border-r border-border-primary',
    main: 'bg-bg-primary',
    container: 'container',
  },

  // 그리드 시스템
  grid: {
    base: 'grid gap-6',
    cols1: 'grid-1',
    cols2: 'grid-2',
    cols3: 'grid-3',
    cols4: 'grid-4',
    responsive: 'grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  },

  // 타이포그래피
  typography: {
    h1: 'text-3xl font-bold text-text-primary tracking-tight',
    h2: 'text-2xl font-semibold text-text-primary tracking-tight',
    h3: 'text-xl font-semibold text-text-primary',
    h4: 'text-lg font-medium text-text-primary',
    h5: 'text-base font-medium text-text-primary',
    h6: 'text-sm font-medium text-text-primary',
    
    bodyLg: 'text-lg text-text-primary leading-relaxed',
    body: 'text-base text-text-primary leading-normal',
    bodySm: 'text-sm text-text-secondary leading-normal',
    caption: 'text-xs text-text-tertiary leading-tight',
  },

  // 애니메이션
  animation: {
    fadeIn: 'animate-fade-in',
    slideUp: 'animate-slide-up',
    pulse: 'animate-pulse',
  }
}

// 유틸리티 함수들
export const utils = {
  // 클래스 결합 함수
  cn: (...classes: (string | undefined | null | false)[]): string => {
    return classes.filter(Boolean).join(' ')
  },

  // 컴포넌트 클래스 빌더
  buildComponent: (base: string, variants: Record<string, string> = {}, additional: string = '') => {
    const variantClasses = Object.values(variants).join(' ')
    return utils.cn(base, variantClasses, additional)
  },

  // 조건부 클래스
  conditional: (condition: boolean, trueClass: string, falseClass?: string) => {
    return condition ? trueClass : (falseClass || '')
  }
}

// 테마 관리 유틸리티
export const theme = {
  // 다크 모드 토글
  toggle: () => {
    const isDark = document.documentElement.classList.contains('dark')
    if (isDark) {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    }
    return !isDark
  },

  // 테마 설정
  set: (theme: 'light' | 'dark') => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  },

  // 현재 테마 확인
  get: (): 'light' | 'dark' => {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  },

  // 저장된 테마 불러오기
  init: () => {
    const saved = localStorage.getItem('theme')
    const system = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldBeDark = saved === 'dark' || (!saved && system)
    
    if (shouldBeDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    
    return shouldBeDark ? 'dark' : 'light'
  }
}

// 반응형 브레이크포인트
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
}

// 공간 시스템
export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
}

// 그림자 시스템
export const shadows = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  none: 'shadow-none',
}

// 전체 디자인 시스템 객체
export const designSystem = {
  colors,
  components,
  utils,
  theme,
  breakpoints,
  spacing,
  shadows,
}

// 타입 정의
export type ThemeMode = 'light' | 'dark'
export type ComponentVariant = keyof typeof components
export type ColorVariant = keyof typeof colors

export default designSystem