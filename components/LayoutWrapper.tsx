'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useInactivity } from '@/hooks/useInactivity';
import { usePageTracking } from '@/hooks/usePageTracking';
import { getCurrentUser, getUserRoleSync } from '@/lib/auth';
import { getUserProfile } from '@/lib/userProfile';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const isProfilPage = pathname === '/profil';
  const [needsCoachSelection, setNeedsCoachSelection] = useState(false);

  // Kolla om användaren behöver välja coach
  useEffect(() => {
    const checkCoachSelection = async () => {
      if (isLoginPage) {
        setNeedsCoachSelection(false);
        return;
      }

      const user = getCurrentUser();
      if (!user) {
        setNeedsCoachSelection(false);
        return;
      }

      const userRole = getUserRoleSync();
      // Admin och superuser behöver inte välja coach
      if (userRole === 'admin' || userRole === 'superuser') {
        setNeedsCoachSelection(false);
        return;
      }

      // Kolla om användaren har valt en coach
      const email = user.email;
      if (email) {
        const profile = await getUserProfile(email);
        setNeedsCoachSelection(!profile?.linkedCoach);
      }
    };

    checkCoachSelection();
  }, [isLoginPage, pathname]);

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

  // Om användaren behöver välja coach, visa profil-sidan utan sidebar
  if (needsCoachSelection && isProfilPage) {
    return (
      <div className="min-h-screen bg-blue-50">
        <main className="flex-1">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    );
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

