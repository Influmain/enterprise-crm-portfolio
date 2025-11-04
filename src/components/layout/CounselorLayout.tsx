import { ReactNode } from 'react'
import CounselorSidebar from '@/components/shared/CounselorSidebar'  // ✅ AdminSidebar → CounselorSidebar로 수정
import { designSystem } from '@/lib/design-system'

interface CounselorLayoutProps {  // ✅ 인터페이스명도 수정
  children: ReactNode
  className?: string
}

export default function CounselorLayout({ children, className }: CounselorLayoutProps) {  // ✅ 함수명도 수정
  return (
    <div className={designSystem.components.layout.page}>
      <CounselorSidebar />  {/* ✅ 상담원 전용 사이드바 사용 */}
      <main className={designSystem.utils.cn('ml-72 p-8', className)}>
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}