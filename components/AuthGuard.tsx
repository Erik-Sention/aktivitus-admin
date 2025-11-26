'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthChange, getCurrentUser, getUserRoleSync } from '@/lib/auth';
import { getUserProfile } from '@/lib/userProfile';
import { User } from 'firebase/auth';
import { UserRole } from '@/types';

// Mock User type för lokal autentisering
type AuthUser = User | { uid: string; email: string | null; displayName: string | null; role?: UserRole } | null;

// Definiera routes och vilka roller som har åtkomst
// Superuser har alltid åtkomst till allt (kollas separat nedan)
const routePermissions: Record<string, UserRole[]> = {
  '/': ['superuser', 'admin', 'coach', 'platschef'],
  '/kunder': ['superuser', 'admin', 'coach', 'platschef'],
  '/ny-kund': ['superuser', 'admin', 'coach', 'platschef'],
  '/fakturering': ['superuser', 'admin'],
  '/personalekonomi': ['superuser', 'admin'],
  '/statistik': ['superuser', 'admin', 'platschef'],
  '/intakter': ['superuser', 'admin', 'platschef'],
  '/rapporter': ['superuser', 'admin', 'platschef'],
  '/coacher': ['superuser', 'admin'],
  '/tjanster': ['superuser', 'admin'],
  '/administrativa-timmar': ['superuser', 'admin', 'coach', 'platschef'],
  '/inkop': ['superuser', 'admin', 'coach', 'platschef'],
  '/import': ['superuser', 'admin'],
  '/loggar': ['superuser', 'admin'],
  '/admin/anvandare': ['superuser'], // Endast superuser
  '/profil': ['superuser', 'admin', 'coach', 'platschef'], // Alla
};

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);
  const [needsCoachSelection, setNeedsCoachSelection] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Kolla om användaren behöver välja en coach
  useEffect(() => {
    const checkCoachSelection = async () => {
      if (!user || pathname === '/login' || pathname === '/profil') {
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
        
        if (!profile?.linkedCoach) {
          setNeedsCoachSelection(true);
          router.replace('/profil');
        } else {
          setNeedsCoachSelection(false);
        }
      }
    };

    if (user) {
      checkCoachSelection();
    }
  }, [user, pathname, router]);

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
        
        // Superuser har alltid åtkomst till allt
        if (userRole === 'superuser') {
          return;
        }
        
        // Kolla om det är en dynamisk användarredigeringsroute
        if (pathname.startsWith('/admin/anvandare/') && pathname !== '/admin/anvandare') {
          // Admin och superuser har åtkomst
          if (userRole !== 'admin' && userRole !== 'superuser' as UserRole) {
            router.replace('/');
          }
          return;
        }
        
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
      
      // Superuser har alltid åtkomst till allt
      if (userRole !== 'superuser') {
        // Kolla om det är en dynamisk användarredigeringsroute
        if (pathname.startsWith('/admin/anvandare/') && pathname !== '/admin/anvandare') {
          // Admin och superuser har åtkomst
          if (userRole !== 'admin' && userRole !== 'superuser' as UserRole) {
            router.replace('/');
          }
        } else {
          const allowedRoles = routePermissions[pathname];
          
          if (allowedRoles && !allowedRoles.includes(userRole)) {
            router.replace('/');
          }
        }
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

  // Om användaren behöver välja coach och inte är på profil-sidan
  if (needsCoachSelection && pathname !== '/profil') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#0C3B5C] mb-4"></div>
          <p className="text-gray-600">Omdirigerar till profil...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

