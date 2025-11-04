import { 
  Phone, 
  Users, 
  MessageSquare, 
  Building2, 
  Calendar, 
  Mail, 
  User, 
  Tag, 
  Clock, 
  FileText,
  BarChart3,
  Upload,
  Settings,
  LayoutDashboard,
  UserPlus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info
} from 'lucide-react';

/**
 * 비즈니스 아이콘 매핑 시스템
 * CRM 업무에 특화된 아이콘들을 의미별로 그룹화
 */
export const businessIcons = {
  // 👥 연락처 관련
  phone: Phone,
  email: Mail, 
  contact: User,
  
  // 🏢 비즈니스 관련
  company: Building2,
  team: Users,
  department: Users,
  
  // 💬 커뮤니케이션
  message: MessageSquare,
  script: FileText,
  interest: Tag,
  
  // ⏰ 시간 관련
  date: Calendar,
  time: Clock,
  created: Calendar,
  updated: Clock,
  
  // 📊 관리 관련
  dashboard: LayoutDashboard,
  analytics: BarChart3,
  upload: Upload,
  settings: Settings,
  assignment: UserPlus,
  
  // 🔍 액션 관련
  search: Search,
  filter: Filter,
  
  // ✅ 상태 관련
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info
};

/**
 * 칼럼명 기반 아이콘 자동 매핑
 * 업로드된 파일의 칼럼명을 분석해서 적절한 아이콘 반환
 */
export const getColumnIcon = (columnName: string) => {
  const lowerName = columnName.toLowerCase();
  
  // 전화번호 관련
  if (lowerName.includes('전화') || lowerName.includes('phone') || lowerName.includes('tel') || lowerName.includes('mobile')) {
    return businessIcons.phone;
  }
  
  // 이름 관련
  if (lowerName.includes('이름') || lowerName.includes('name') || lowerName.includes('성명') || lowerName.includes('고객명')) {
    return businessIcons.contact;
  }
  
  // 이메일 관련
  if (lowerName.includes('이메일') || lowerName.includes('email') || lowerName.includes('mail')) {
    return businessIcons.email;
  }
  
  // 회사 관련
  if (lowerName.includes('회사') || lowerName.includes('업체') || lowerName.includes('company') || lowerName.includes('기업') || lowerName.includes('출처') || lowerName.includes('source')) {
    return businessIcons.company;
  }
  
  // 날짜/시간 관련
  if (lowerName.includes('일시') || lowerName.includes('날짜') || lowerName.includes('date') || lowerName.includes('time') || lowerName.includes('등록') || lowerName.includes('생성')) {
    return businessIcons.date;
  }
  
  // 내용/스크립트 관련
  if (lowerName.includes('내용') || lowerName.includes('스크립트') || lowerName.includes('script') || lowerName.includes('관심') || lowerName.includes('접근') || lowerName.includes('멘트')) {
    return businessIcons.script;
  }
  
  // 태그/분류 관련
  if (lowerName.includes('태그') || lowerName.includes('분류') || lowerName.includes('카테고리') || lowerName.includes('구분') || lowerName.includes('타입')) {
    return businessIcons.interest;
  }
  
  // 기본 아이콘
  return FileText;
};

/**
 * 상태별 아이콘 매핑
 */
export const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'success':
    case 'completed':
    case 'active':
      return businessIcons.success;
    case 'error':
    case 'failed':
    case 'inactive':
      return businessIcons.error;
    case 'warning':
    case 'pending':
      return businessIcons.warning;
    case 'info':
    case 'available':
    default:
      return businessIcons.info;
  }
};