'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logout, getCurrentUser, getUserRoleSync } from '@/lib/auth';
import { getUserProfileSync } from '@/lib/userProfile';
import { UserRole } from '@/types';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  BarChart3,
  Receipt,
  Calculator,
  User,
  LogOut,
  TrendingUp,
  Clock,
  Package,
  ShoppingCart,
  Shield,
  Upload,
} from 'lucide-react';
import { useState, useEffect } from 'react';

// Definiera menyalternativ med roller som har åtkomst
const menuItems = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    roles: ['superuser', 'admin', 'coach', 'platschef'] as UserRole[],
  },
  {
    name: 'Kunder',
    href: '/kunder',
    icon: Users,
    roles: ['superuser', 'admin', 'coach', 'platschef'] as UserRole[],
  },
  {
    name: 'Lägg till kund',
    href: '/ny-kund',
    icon: UserPlus,
    roles: ['superuser', 'admin', 'coach', 'platschef'] as UserRole[],
  },
  {
    name: 'Fakturering',
    href: '/fakturering',
    icon: Receipt,
    roles: ['superuser', 'admin'] as UserRole[],
  },
  {
    name: 'Personalekonomi',
    href: '/personalekonomi',
    icon: Calculator,
    roles: ['superuser', 'admin'] as UserRole[],
  },
  {
    name: 'Statistik',
    href: '/statistik',
    icon: BarChart3,
    roles: ['superuser', 'admin', 'platschef'] as UserRole[],
  },
  {
    name: 'Intäkter',
    href: '/intakter',
    icon: TrendingUp,
    roles: ['superuser', 'admin', 'platschef'] as UserRole[],
  },
  {
    name: 'Coacher',
    href: '/coacher',
    icon: User,
    roles: ['superuser', 'admin'] as UserRole[],
  },
  {
    name: 'Tjänster',
    href: '/tjanster',
    icon: Package,
    roles: ['superuser', 'admin'] as UserRole[],
  },
  {
    name: 'Administrativa timmar',
    href: '/administrativa-timmar',
    icon: Clock,
    roles: ['superuser', 'admin', 'coach', 'platschef'] as UserRole[],
  },
  {
    name: 'Inköp',
    href: '/inkop',
    icon: ShoppingCart,
    roles: ['superuser', 'admin', 'coach', 'platschef'] as UserRole[],
  },
  // Import-sidan är dold för säkerhet
  // {
  //   name: 'Import',
  //   href: '/import',
  //   icon: Upload,
  //   roles: ['superuser', 'admin'] as UserRole[],
  // },
  {
    name: 'Användarhantering',
    href: '/admin/anvandare',
    icon: Shield,
    roles: ['superuser'] as UserRole[],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>('admin@aktivitus.se');
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const [linkedCoach, setLinkedCoach] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    // Hämta nuvarande användares e-post, roll och kopplad coach
    const updateUserInfo = () => {
      const currentUser = getCurrentUser();
      if (currentUser?.email) {
        setUserEmail(currentUser.email);
        const role = getUserRoleSync();
        setUserRole(role);
        
        // Hämta användarens profil för att se om de är kopplade till en coach
        const userProfile = getUserProfileSync(currentUser.email);
        if (userProfile?.linkedCoach) {
          setLinkedCoach(userProfile.linkedCoach);
        }
      }
    };
    
    updateUserInfo();
    
    // Uppdatera rollen när användaren ändras eller när sidan får fokus
    // (för att fånga upp ändringar i miljövariabler efter omstart)
    const handleFocus = () => {
      updateUserInfo();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      // Vänta lite för att säkerställa att auth-state uppdateras
      await new Promise(resolve => setTimeout(resolve, 200));
      // Omdirigera till login
      window.location.href = '/login';
    } catch (error) {
      setIsLoggingOut(false);
      // Försök ändå omdirigera
      window.location.href = '/login';
    }
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#0C3B5C] text-white flex flex-col shadow-xl z-50">
      {/* Logo/Header */}
      <div className="p-6 border-b border-[#1E5A7D]">
        <h1 className="text-2xl font-bold text-white">Aktivitus</h1>
        <p className="text-sm text-blue-200 mt-1">Faktureringssystem</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {menuItems
            .filter((item) => item.roles.includes(userRole))
            .map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                      ${
                        isActive
                          ? 'bg-[#1E5A7D] text-white shadow-md'
                          : 'text-blue-100 hover:bg-[#164B6E] hover:text-white'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                </li>
              );
            })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[#1E5A7D] space-y-3">
        <Link
          href={linkedCoach ? `/coacher/${encodeURIComponent(linkedCoach)}` : '/profil'}
          className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[#164B6E] transition cursor-pointer"
          title={linkedCoach ? 'Se mitt coachkort' : 'Gå till min profil'}
        >
          <div className="w-10 h-10 bg-[#3B9DD6] rounded-full flex items-center justify-center text-white font-bold">
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {userEmail.split('@')[0]}
            </p>
            <p className="text-xs text-blue-200 truncate">
              {linkedCoach ? linkedCoach : userEmail}
            </p>
          </div>
        </Link>
        
        {/* Logout-knapp */}
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-blue-100 hover:bg-[#164B6E] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">
            {isLoggingOut ? 'Loggar ut...' : 'Logga ut'}
          </span>
        </button>
      </div>
    </aside>
  );
}

