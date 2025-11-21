// Hook för att automatiskt logga sidvisningar
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { logPageView } from '@/lib/activityLogger';

export const usePageTracking = () => {
  const pathname = usePathname();

  useEffect(() => {
    // Ignorera login-sidan
    if (pathname === '/login') return;
    
    // Logga sidvisning
    logPageView(pathname);
  }, [pathname]);
};


