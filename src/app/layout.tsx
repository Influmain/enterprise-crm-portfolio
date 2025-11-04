// 📁 /app/layout.tsx
// 🔄 변경점: ToastProvider import 추가 및 컴포넌트 래핑

import { AuthProvider, AuthDebugInfo } from '@/lib/auth/AuthContext';
import { ToastProvider } from '@/components/ui/Toast'; // ✅ 새로 추가
import './globals.css';

export const metadata = {
  title: 'CRM 시스템',
  description: '리드 관리 및 상담원 배정 시스템',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>
          <ToastProvider>  {/* ✅ 새로 추가 */}
            {children}
            <AuthDebugInfo />
          </ToastProvider>  {/* ✅ 새로 추가 */}
        </AuthProvider>
      </body>
    </html>
  );
}