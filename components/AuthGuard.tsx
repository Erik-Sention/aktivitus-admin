'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthChange, getCurrentUser, getUserRoleSync } from '@/lib/auth';
import { User } from 'firebase/auth';
import { UserRole } from '@/types';

// Mock User type för lokal autentisering
type AuthUser = User | { uid: string; email: string | null; displayName: string | null; role?: UserRole } | null;

// Definiera routes och vilka roller som har åtkomst
const routePermissions: Record<string, UserRole[]> = {
  '/': ['admin', 'coach', 'platschef'],
  '/kunder': ['admin', 'coach', 'platschef'],
  '/ny-kund': ['admin', 'coach', 'platschef'],
  '/fakturering': ['admin'],
  '/personalekonomi': ['admin'],
  '/statistik': ['admin', 'platschef'],
  '/intakter': ['admin', 'platschef'],
  '/rapporter': ['admin', 'platschef'],
  '/coacher': ['admin'],
  '/installningar': ['admin'],
  '/loggar': ['admin'],
};

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Tillåt åtkomst till login-sidan utan autentisering
    if (pathname === '/login') {
      setLoading(false);
      setUser(null);
      return;
    }

    const unsubscribe = onAuthChange((currentUser: AuthUser) => {
      setUser(currentUser);
      setLoading(false);
      
      // Om användaren loggat ut och vi inte är på login-sidan, omdirigera
      if (!currentUser && pathname !== '/login') {
        router.replace('/login');
        return;
      }

      // Kontrollera rollbaserad åtkomst
      if (currentUser && pathname !== '/login') {
        const userRole = getUserRoleSync();
        const allowedRoles = routePermissions[pathname];
        
        // Om routen finns i permissions och användaren inte har rätt roll
        if (allowedRoles && !allowedRoles.includes(userRole)) {
          // Omdirigera till dashboard (som alla roller har åtkomst till)
          router.replace('/');
        }
      }
    });

    // Kontrollera om användaren redan är inloggad vid första laddningen
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setLoading(false);
      
      // Kontrollera rollbaserad åtkomst vid första laddning
      const userRole = getUserRoleSync();
      const allowedRoles = routePermissions[pathname];
      
      if (allowedRoles && !allowedRoles.includes(userRole)) {
        router.replace('/');
      }
    } else if (pathname !== '/login') {
      // Om ingen användare finns och vi inte är på login-sidan, omdirigera
      setLoading(false);
      router.replace('/login');
    }

    return () => unsubscribe();
  }, [router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0C3B5C] mb-4"></div>
          <p className="text-gray-600">Laddar...</p>
        </div>
      </div>
    );
  }

  // Tillåt åtkomst till login-sidan utan autentisering
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Om användaren inte är inloggad och inte är på login-sidan, visa loading
  // (AuthGuard kommer att omdirigera till login)
  if (!user && pathname !== '/login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0C3B5C] mb-4"></div>
          <p className="text-gray-600">Omdirigerar till inloggning...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

