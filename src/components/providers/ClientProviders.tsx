'use client'

import { Suspense } from 'react'
import { DemoSessionProvider } from '@/contexts/DemoSessionContext'
import { ToastProvider } from '@/components/ui/Toast'

function DemoSessionWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DemoSessionProvider>
        {children}
      </DemoSessionProvider>
    </Suspense>
  )
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <DemoSessionWrapper>
        {children}
      </DemoSessionWrapper>
    </ToastProvider>
  )
}
