// 📁 /app/layout.tsx
// 🔄 변경점: DemoSessionProvider 추가

import { AuthProvider, AuthDebugInfo } from '@/lib/auth/AuthContext';
import { ClientProviders } from '@/components/providers/ClientProviders';
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
          <ClientProviders>
            {children}
            <AuthDebugInfo />
          </ClientProviders>
        </AuthProvider>
      </body>
    </html>
  );
}