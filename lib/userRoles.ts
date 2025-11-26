// Rollhantering för användare
import { UserRole } from '@/types';

// Konfiguration av användarroller
// För lokal utveckling: Använd miljövariabel eller e-postmappning
// För produktion: Kommer att använda Firebase Custom Claims eller Firestore

// Mappning av e-postadresser till roller (för lokal utveckling)
// Format: "email@domain.com": "role"
const EMAIL_ROLE_MAP: Record<string, UserRole> = {
  // Lägg till specifika e-postadresser här om du vill ha explicit kontroll
  // Exempel:
  // 'admin@aktivitus.se': 'admin',
  // 'coach1@aktivitus.se': 'coach',
  // 'platschef.stockholm@aktivitus.se': 'platschef',
};

// Hämta roll från miljövariabel (för lokal testning)
// NEXT_PUBLIC_ variabler är tillgängliga både på server och klient
const getRoleFromEnv = (): UserRole | null => {
  const role = process.env.NEXT_PUBLIC_MOCK_USER_ROLE;
  if (role && ['superuser', 'admin', 'coach', 'platschef'].includes(role)) {
    return role as UserRole;
  }
  return null;
};

// Bestäm roll baserat på e-postadress
export const getUserRoleFromEmail = (email: string): UserRole => {
  const emailLower = email.toLowerCase().trim();
  
  // 1. Kolla explicit mappning först
  if (EMAIL_ROLE_MAP[emailLower]) {
    return EMAIL_ROLE_MAP[emailLower];
  }
  
  // 2. Kolla miljövariabel (för lokal testning)
  const envRole = getRoleFromEnv();
  if (envRole) {
    return envRole;
  }
  
  // 3. Kolla om det är en superuser email (från miljövariabel)
  const superuserEmail = process.env.NEXT_PUBLIC_SUPERUSER_EMAIL;
  if (superuserEmail && emailLower === superuserEmail.toLowerCase()) {
    return 'superuser';
  }
  
  // 4. Fallback: Bestäm baserat på e-postadressens innehåll
  if (emailLower.includes('coach') || emailLower.includes('tranare')) {
    return 'coach';
  }
  if (emailLower.includes('platschef') || emailLower.includes('manager')) {
    return 'platschef';
  }
  if (emailLower.includes('admin')) {
    return 'admin';
  }
  
  // Standard: coach (mest begränsad åtkomst för nya användare)
  return 'coach';
};

// Lägg till eller uppdatera roll för en e-postadress (för lokal utveckling)
export const setUserRole = (email: string, role: UserRole): void => {
  const emailLower = email.toLowerCase().trim();
  EMAIL_ROLE_MAP[emailLower] = role;
};

// Hämta alla konfigurerade roller (för debugging)
export const getAllConfiguredRoles = (): Record<string, UserRole> => {
  return { ...EMAIL_ROLE_MAP };
};

