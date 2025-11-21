'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { useInactivity } from '@/hooks/useInactivity';
import { usePageTracking } from '@/hooks/usePageTracking';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  // Aktivera sidspårning (endast när inloggad, inte på login-sidan)
  if (!isLoginPage) {
    usePageTracking();
  }

  // Aktivera inaktivitetstimer (endast när inloggad, inte på login-sidan)
  if (!isLoginPage) {
    useInactivity();
  }

  // Login-sidan ska inte ha Sidebar eller standard layout
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Alla andra sidor får standard layout med Sidebar
  return (
    <div className="flex min-h-screen bg-blue-50">
      <Sidebar />
      <main className="flex-1 ml-64">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

