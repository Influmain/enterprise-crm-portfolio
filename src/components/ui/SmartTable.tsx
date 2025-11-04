'use client';

import React, { useState, useEffect } from 'react';
import { tableSystem, getTableStyles, sortIconStyles, TableMode } from '@/lib/design-system/table';
import { designSystem } from '@/lib/design-system';
import { 
  Search, 
  X, 
  ChevronUp, 
  ChevronDown, 
  Check, 
  AlertTriangle,
  FileText
} from 'lucide-react';

// 디바운스 훅
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface SmartTableColumn<T> {
  key: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  width?: string;
  sortable?: boolean;
  searchable?: boolean;
  render?: (value: any, record: T, searchQuery?: string) => React.ReactNode;
}

interface SmartTableProps<T> {
  // 기본 데이터
  data: T[];
  columns: SmartTableColumn<T>[];
  getItemId: (item: T, index?: number) => string;
  
  // 테이블 모드
  mode?: TableMode;
  
  // 선택 시스템 (선택적)
  selectedItems?: string[];
  onToggleSelection?: (id: string) => void;
  onSelectAll?: () => void;
  
  // 검색 설정 (선택적)
  enableSearch?: boolean;
  searchPlaceholder?: string;
  searchWidth?: string;
  debounceMs?: number;
  
  // 테이블 크기 설정
  height?: string;
  minHeight?: string;
  maxHeight?: string;
  
  // 페이지네이션 설정
  enablePagination?: boolean;
  pageSize?: number;
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  
  // 스타일 커스터마이징
  showSearchResult?: boolean;
  emptyMessage?: string;
  emptyTitle?: string;
  className?: string;
  
  // 로딩 상태
  loading?: boolean;
  
  // 액션 버튼들
  actions?: {
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    onClick: (item: T) => void;
    className?: string;
    condition?: (item: T) => boolean;
  }[];

  // 제목과 카운트 표시
  title?: string;
  titleIcon?: React.ComponentType<{ className?: string }>;
}

export default function SmartTable<T extends Record<string, any>>({
  data,
  columns,
  getItemId,
  mode = 'normal',
  selectedItems = [],
  onToggleSelection,
  onSelectAll,
  enableSearch = true,
  searchPlaceholder = "고객명, 전화번호로 검색...",
  searchWidth = "w-48",
  debounceMs = 300,
  height = "65vh",
  minHeight = "400px", 
  maxHeight = "800px",
  enablePagination = false,
  pageSize = 100,
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  onPageChange,
  showSearchResult = false,
  emptyMessage = "관리자가 고객을 배정하면 여기에 표시됩니다.",
  emptyTitle = "배정받은 고객이 없습니다",
  className = "",
  loading = false,
  actions = [],
  title = "배정받은 고객",
  titleIcon
}: SmartTableProps<T>) {
  // 검색 상태
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, debounceMs);

  // 정렬 상태
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // 테이블 스타일 가져오기
  const tableStyles = getTableStyles(mode);

  // 정렬 핸들러
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // 정렬 아이콘 렌더링 (기존 페이지와 완전 동일)
  const renderSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <span className={sortIconStyles.default}>{sortIconStyles.symbols.default}</span>;
    }
    const isAsc = sortDirection === 'asc';
    return (
      <span className={sortIconStyles.active}>
        {isAsc ? sortIconStyles.symbols.asc : sortIconStyles.symbols.desc}
      </span>
    );
  };

  // 데이터 필터링 및 정렬
  const processedData = (() => {
    let filtered = [...data];

    // 검색 필터링
    if (debouncedSearch && enableSearch) {
      const query = debouncedSearch.toLowerCase();
      filtered = filtered.filter(item => 
        columns.some(column => {
          if (column.searchable === false) return false;
          const value = item[column.key];
          if (!value) return false;
          
          // 특별 처리: customer_grade는 nested object
          if (column.key === 'customer_grade' && item.customer_grade?.grade) {
            return item.customer_grade.grade.toLowerCase().includes(query);
          }
          
          return value.toString().toLowerCase().includes(query);
        })
      );
    }

    // 정렬 (기존 상담 페이지 로직과 동일)
    if (sortColumn) {
      filtered = filtered.sort((a, b) => {
        let aValue: any = '';
        let bValue: any = '';
        
        switch (sortColumn) {
          case 'phone':
            aValue = a.phone;
            bValue = b.phone;
            break;
          case 'contact_name':
            aValue = a.contact_name || '';
            bValue = b.contact_name || '';
            break;
          case 'actual_customer_name':
            aValue = a.actual_customer_name || a.real_name || '';
            bValue = b.actual_customer_name || b.real_name || '';
            break;
          case 'customer_grade':
            aValue = a.customer_grade?.grade || '미분류';
            bValue = b.customer_grade?.grade || '미분류';
            break;
          case 'call_attempts':
            aValue = a.call_attempts;
            bValue = b.call_attempts;
            break;
          case 'last_contact_date':
            aValue = a.last_contact_date ? new Date(a.last_contact_date).getTime() : 0;
            bValue = b.last_contact_date ? new Date(b.last_contact_date).getTime() : 0;
            break;
          case 'assigned_at':
            aValue = new Date(a.assigned_at).getTime();
            bValue = new Date(b.assigned_at).getTime();
            break;
          case 'contract_amount':
            aValue = a.contract_amount || 0;
            bValue = b.contract_amount || 0;
            break;
          default:
            aValue = a[sortColumn] || '';
            bValue = b[sortColumn] || '';
        }
        
        if (sortDirection === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
    }

    return filtered;
  })();

  // 페이지네이션 계산
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = enablePagination ? processedData.slice(startIndex, endIndex) : processedData;
  const calculatedTotalPages = Math.ceil(processedData.length / pageSize);

  if (loading) {
    return (
      <div className={tableSystem.container}>
        <div className={tableSystem.loading.container}>
          <div className={tableSystem.loading.content}>
            <FileText className={tableSystem.loading.icon} />
            <span className={tableSystem.loading.text}>배정 고객 목록 로딩 중...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={designSystem.utils.cn(className)}>
      {/* 검색 영역 */}
      {enableSearch && (
        <div className={tableSystem.search.container}>
          <div className={tableSystem.search.titleSection}>
            {titleIcon && React.createElement(titleIcon, { className: tableSystem.search.titleIcon })}
            <h3 className={tableSystem.search.title}>{title}</h3>
            <span className={tableSystem.search.count}>
              {processedData.length}명
            </span>
          </div>
          
          <div className={tableSystem.search.inputSection}>
            <Search className={tableSystem.search.inputIcon} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className={tableSystem.search.input}
            />
          </div>
        </div>
      )}

      {/* 테이블 */}
      <div className={tableSystem.container}>
        {processedData.length > 0 ? (
          <>
            <div className={tableStyles.body.scrollContainer} style={{ maxHeight: height }}>
              <table className={tableStyles.layout}>
                {/* 헤더 */}
                <thead className={tableStyles.header.row}>
                  <tr>
                    {columns.map((column) => (
                      <th 
                        key={column.key}
                        className={`${column.sortable !== false ? tableStyles.header.cellSortable : tableStyles.header.cell} ${column.width || ''}`}
                        onClick={column.sortable !== false ? () => handleSort(column.key) : undefined}
                      >
                        <div className={tableStyles.header.iconWrapper}>
                          {column.icon && <column.icon className={tableStyles.header.icon} />}
                          {column.label}
                          {column.sortable !== false && renderSortIcon(column.key)}
                        </div>
                      </th>
                    ))}
                    {actions.length > 0 && (
                      <th className={`${tableStyles.header.cell} w-12`}>
                        <div className={tableStyles.header.iconWrapper}>
                          <FileText className={tableStyles.header.icon} />
                          액션
                        </div>
                      </th>
                    )}
                  </tr>
                </thead>

                {/* 바디 */}
                <tbody>
                  {paginatedData.map((item) => {
                    const itemId = getItemId(item);
                    const isSelected = selectedItems.includes(itemId);
                    
                    return (
                      <tr 
                        key={itemId} 
                        className={tableStyles.body.row.base}
                        onClick={() => onToggleSelection?.(itemId)}
                      >
                        {columns.map((column) => (
                          <td key={column.key} className={`${tableStyles.body.cell} ${column.width || ''}`}>
                            {column.render ? (
                              column.render(item[column.key], item, debouncedSearch)
                            ) : (
                              <div className="text-text-primary truncate">
                                {item[column.key]?.toString() || '-'}
                              </div>
                            )}
                          </td>
                        ))}
                        
                        {/* 액션 버튼들 */}
                        {actions.length > 0 && (
                          <td className={tableStyles.body.cell}>
                            <div className="flex items-center justify-center gap-1">
                              {actions
                                .filter(action => !action.condition || action.condition(item))
                                .map((action, index) => (
                                <button
                                  key={index}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    action.onClick(item);
                                  }}
                                  className={action.className || `${tableSystem.actionButton.base} ${tableSystem.actionButton.primary}`}
                                >
                                  {action.icon && <action.icon className={tableSystem.actionButton.icon} />}
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 */}
            {enablePagination && calculatedTotalPages > 1 && (
              <div className={tableSystem.pagination.container}>
                <div className={tableSystem.pagination.wrapper}>
                  <div className={tableSystem.pagination.info}>
                    {startIndex + 1}-{Math.min(endIndex, processedData.length)} / {processedData.length}명
                  </div>
                  
                  <div className={tableSystem.pagination.buttonGroup}>
                    <button
                      onClick={() => onPageChange?.(1)}
                      disabled={currentPage === 1}
                      className={tableSystem.pagination.button}
                    >
                      첫페이지
                    </button>
                    
                    <button
                      onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className={tableSystem.pagination.button}
                    >
                      이전
                    </button>
                    
                    <span className={tableSystem.pagination.currentPage}>
                      {currentPage} / {calculatedTotalPages}
                    </span>
                    
                    <button
                      onClick={() => onPageChange?.(Math.min(calculatedTotalPages, currentPage + 1))}
                      disabled={currentPage === calculatedTotalPages}
                      className={tableSystem.pagination.button}
                    >
                      다음
                    </button>
                    
                    <button
                      onClick={() => onPageChange?.(calculatedTotalPages)}
                      disabled={currentPage === calculatedTotalPages}
                      className={tableSystem.pagination.button}
                    >
                      마지막
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* 빈 상태 */
          <div className={tableSystem.empty.container}>
            <FileText className={tableSystem.empty.icon} />
            <h3 className={tableSystem.empty.title}>
              {emptyTitle}
            </h3>
            <p className={tableSystem.empty.message}>
              {emptyMessage}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// 유틸리티 함수들 (상담 페이지에서 사용하던 렌더러들)
export const renderGradeBadge = (grade?: any) => {
  if (!grade || !grade.grade) {
    return (
      <span className={tableSystem.gradeBadge.unclassified}>
        미분류
      </span>
    );
  }

  return (
    <span 
      className={`${tableSystem.gradeBadge.base} ${tableSystem.gradeBadge.colored}`}
      style={{ backgroundColor: grade.grade_color }}
    >
      {grade.grade}
    </span>
  );
};

export const renderPhoneColumn = (phone: string) => (
  <div className={tableSystem.text.phone}>
    {phone}
  </div>
);

export const renderCustomerNameColumn = (actualName?: string, realName?: string) => (
  <div className={tableSystem.text.customerName}>
    {actualName || realName ? (
      <span className={tableSystem.text.confirmed}>{actualName || realName}</span>
    ) : (
      <span className={tableSystem.text.unconfirmed}>미확인</span>
    )}
  </div>
);

export const renderContactNameColumn = (contactName?: string) => (
  <div className={tableSystem.text.customerName}>
    {contactName ? (
      <span className={tableSystem.text.confirmed}>{contactName}</span>
    ) : (
      <span className={tableSystem.text.unconfirmed}>미확인</span>
    )}
  </div>
);

export const renderTooltipColumn = (content?: string, width = "w-20") => (
  <div className={`${width} ${tableSystem.tooltip.container}`}>
    {content ? (
      <>
        <div className={tableSystem.tooltip.trigger}>
          {content}
        </div>
        <div className={tableSystem.tooltip.popup}>
          {content}
        </div>
      </>
    ) : (
      <span className={tableSystem.text.unconfirmed}>미확인</span>
    )}
  </div>
);

export const renderCallAttemptsColumn = (attempts: number) => (
  <span className={tableSystem.text.callAttempts}>
    {attempts}
  </span>
);

export const renderDateColumn = (date?: string) => (
  <span className={tableSystem.text.date}>
    {date 
      ? new Date(date).toLocaleDateString('ko-KR', {
          month: '2-digit',
          day: '2-digit'
        })
      : '미확인'
    }
  </span>
);

export const renderContractAmountColumn = (amount?: number) => (
  amount ? (
    <span className={tableSystem.text.contractAmount}>
      {(amount / 10000).toFixed(0)}만
    </span>
  ) : (
    <span className={tableSystem.text.unconfirmed}>미확인</span>
  )
);