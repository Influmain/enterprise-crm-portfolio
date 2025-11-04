// 📁 /components/layout/AdminLayout.tsx
// 🔄 변경점: ToastProvider 제거 (전역에서 제공되므로)

import { ReactNode } from 'react'
import AdminSidebar from '@/components/shared/AdminSidebar'
import { designSystem } from '@/lib/design-system'
// ❌ 제거: import { ToastProvider } from '@/components/ui/Toast';

interface AdminLayoutProps {
  children: ReactNode
  className?: string
}

export default function AdminLayout({ children, className }: AdminLayoutProps) {
  return (
    // ❌ 제거: <ToastProvider>
    <div className={designSystem.components.layout.page}>
      <AdminSidebar />
      <main className={designSystem.utils.cn('ml-72 p-8', className)}>
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
    // ❌ 제거: </ToastProvider>
  )
}