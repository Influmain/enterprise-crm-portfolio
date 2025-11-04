/**
 * 노션 스타일 테이블 시스템 (상담 페이지 스타일 통합)
 * 기존 상담 페이지의 컴팩트한 스타일과 일반적인 테이블 스타일을 모두 지원
 */
export const tableSystem = {
  // 기본 컨테이너
  container: "bg-bg-primary border border-border-primary rounded-lg overflow-hidden",
  
  // 헤더 스타일 (일반 모드)
  header: {
    container: "overflow-x-auto border-b border-border-primary",
    row: "bg-bg-secondary",
    cell: "text-left py-3 px-3 text-sm font-medium text-text-tertiary uppercase tracking-wider",
    cellSortable: "text-left py-3 px-3 text-sm font-medium text-text-tertiary uppercase tracking-wider cursor-pointer hover:bg-bg-hover transition-colors",
    iconWrapper: "flex items-center space-x-2",
    icon: "w-4 h-4 text-text-tertiary",
    
    // 검색 관련
    searchButton: "p-1 rounded hover:bg-bg-hover transition-colors opacity-0 group-hover:opacity-100",
    searchIcon: "w-3.5 h-3.5 text-text-tertiary hover:text-accent",
    searchContainer: "flex items-center space-x-2 bg-bg-primary border border-accent rounded px-2 py-1 min-w-48",
    searchInput: "flex-1 bg-transparent text-sm text-text-primary placeholder-text-tertiary focus:outline-none min-w-0",
    searchClearButton: "p-0.5 rounded hover:bg-bg-hover",
    searchClearIcon: "w-3 h-3 text-text-tertiary hover:text-accent"
  },
  
  // 컴팩트 헤더 스타일 (상담 페이지 스타일)
  compactHeader: {
    container: "overflow-x-auto border-b border-border-primary",
    row: "bg-bg-secondary sticky top-0 z-10",
    cell: "text-center py-2 px-1 font-medium text-text-secondary text-xs",
    cellSortable: "text-center py-2 px-1 font-medium text-text-secondary text-xs cursor-pointer hover:bg-bg-hover transition-colors",
    iconWrapper: "flex items-center justify-center gap-0.5",
    icon: "w-3 h-3",
    sortIcon: "text-text-tertiary text-xs ml-0.5",
    sortIconActive: "text-accent text-xs ml-0.5"
  },
  
  // 바디 스타일 (일반 모드)
  body: {
    scrollContainer: "overflow-auto",
    row: {
      base: "border-b border-border-primary hover:bg-bg-hover transition-all duration-200 group cursor-pointer hover:shadow-sm relative"
    },
    cell: "py-3 px-3 text-sm"
  },
  
  // 컴팩트 바디 스타일 (상담 페이지 스타일)
  compactBody: {
    scrollContainer: "overflow-auto",
    row: {
      base: "border-b border-border-primary hover:bg-bg-hover transition-colors"
    },
    cell: "py-1 px-1 text-center text-xs"
  },
  
  // 테이블 레이아웃
  layout: {
    normal: "w-full min-w-full",
    fixed: "w-full table-fixed"
  },
  
  // 검색/필터 영역
  search: {
    container: "flex items-center justify-between mb-3",
    titleSection: "flex items-center gap-2",
    titleIcon: "w-3 h-3 text-accent",
    title: "text-xs font-medium text-text-primary",
    count: "text-xs text-text-secondary px-1.5 py-0.5 bg-bg-secondary rounded",
    inputSection: "relative",
    inputIcon: "absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-text-secondary",
    input: "pl-7 pr-3 py-1 w-48 text-xs border border-border-primary rounded bg-bg-primary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent"
  },
  
  // 선택 시스템 (노션 스타일)
  selection: {
    indicator: "absolute left-0 top-0 h-full w-1 bg-accent transition-opacity duration-200",
    indicatorVisible: "opacity-100",
    indicatorHidden: "opacity-0",
    
    checkbox: {
      container: "absolute left-1 top-1/2 transform -translate-y-1/2 transition-all duration-200",
      hidden: "opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100",
      visible: "opacity-100 scale-100",
      box: "w-4 h-4 rounded border-2 flex items-center justify-center",
      unselected: "border-border-primary bg-bg-primary group-hover:border-accent",
      selected: "bg-accent border-accent",
      checkIcon: "w-2.5 h-2.5 text-white"
    },
    
    content: {
      base: "transition-all duration-200",
      unselected: "ml-1 group-hover:ml-6", 
      selected: "ml-6"
    }
  },
  
  // 상태 표시 스타일
  status: {
    success: "px-2 py-1 text-xs rounded-full bg-success-light text-success",
    warning: "px-2 py-1 text-xs rounded-full bg-warning-light text-warning",
    error: "px-2 py-1 text-xs rounded-full bg-error-light text-error",
    info: "px-2 py-1 text-xs rounded-full bg-accent-light text-accent"
  },
  
  // 등급 뱃지 (상담 페이지에서 사용)
  gradeBadge: {
    base: "px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap",
    unclassified: "px-1.5 py-0.5 rounded text-xs bg-bg-secondary text-text-tertiary whitespace-nowrap",
    colored: "text-white" // backgroundColor는 동적으로 설정
  },
  
  // 텍스트 스타일 (상담 페이지 전용)
  text: {
    phone: "font-mono text-text-primary font-medium text-xs truncate",
    customerName: "text-xs whitespace-nowrap truncate",
    confirmed: "text-text-primary",
    unconfirmed: "text-text-tertiary",
    contractAmount: "font-medium text-success text-xs",
    callAttempts: "font-medium text-text-primary text-xs",
    date: "text-text-secondary text-xs whitespace-nowrap"
  },
  
  // 툴팁 시스템 (상담 페이지에서 사용)
  tooltip: {
    container: "group mx-auto relative",
    trigger: "text-text-primary text-xs truncate cursor-help",
    popup: "absolute left-0 top-full mt-1 p-2 bg-black/90 text-white text-xs rounded shadow-lg z-10 max-w-80 break-words opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
  },
  
  // 페이지네이션 (상담 페이지 스타일)
  pagination: {
    container: "p-3 border-t border-border-primary bg-bg-secondary",
    wrapper: "flex items-center justify-between",
    info: "text-xs text-text-secondary",
    buttonGroup: "flex items-center gap-1",
    button: "px-2 py-1 text-xs border border-border-primary rounded bg-bg-primary text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-hover transition-colors",
    currentPage: "px-2 py-1 text-xs text-white bg-accent rounded"
  },
  
  // 빈 상태 표시
  empty: {
    container: "text-center py-12",
    icon: "w-16 h-16 text-text-tertiary mx-auto mb-4",
    title: "text-lg font-medium text-text-primary mb-2",
    message: "text-text-secondary",
    
    // 검색 결과 없음 상태
    searchEmpty: {
      icon: "w-8 h-8 text-text-tertiary mx-auto mb-2",
      title: "text-text-secondary mb-2",
      clearButton: "text-accent hover:text-accent/80 text-sm"
    }
  },
  
  // 액션 버튼 (상담 페이지에서 사용)
  actionButton: {
    base: "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap",
    primary: "bg-accent text-bg-primary",
    secondary: "border border-border-primary bg-bg-primary text-text-primary hover:bg-bg-hover",
    icon: "w-3 h-3"
  },
  
  // 로딩 상태
  loading: {
    container: "flex items-center justify-center h-64",
    content: "flex items-center gap-3 text-text-secondary",
    icon: "w-6 h-6 animate-spin",
    text: "text-text-secondary"
  }
};

// 테이블 타입 정의
export type TableMode = 'normal' | 'compact';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface SearchConfig {
  query: string;
  column?: string;
  filters: Record<string, string>;
}

export interface TableSelectionProps {
  selectedItems: string[];
  onToggleSelection: (id: string) => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
}

export interface TableColumn {
  key: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  width?: string;
  sortable?: boolean;
  searchable?: boolean;
  render?: (value: any, record: any, searchQuery?: string) => React.ReactNode;
}

// 유틸리티 함수들
export const getTableStyles = (mode: TableMode = 'normal') => {
  return {
    header: mode === 'compact' ? tableSystem.compactHeader : tableSystem.header,
    body: mode === 'compact' ? tableSystem.compactBody : tableSystem.body,
    layout: mode === 'compact' ? tableSystem.layout.fixed : tableSystem.layout.normal
  };
};

// 정렬 아이콘 스타일 클래스들
export const sortIconStyles = {
  default: "text-text-tertiary text-xs ml-0.5",
  active: "text-accent text-xs ml-0.5",
  symbols: {
    default: "↕",
    asc: "↑", 
    desc: "↓"
  }
};