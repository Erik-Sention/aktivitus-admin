// Firebase Authentication functions
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from './firebase';
import { UserRole } from '@/types';

export const login = async (email: string, password: string) => {
  // Logga inloggning (asynkront, vänta inte)
  if (typeof window !== 'undefined') {
    import('./activityLogger').then(({ logLogin }) => logLogin());
  }
  
  return await signInWithEmailAndPassword(auth, email, password);
};

export const register = async (email: string, password: string) => {
  return await createUserWithEmailAndPassword(auth, email, password);
};

export const logout = async () => {
  // Logga utloggning innan vi rensar användaren (asynkront, vänta inte)
  if (typeof window !== 'undefined') {
    import('./activityLogger').then(({ logLogout }) => logLogout());
  }
  
  await signOut(auth);
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Hämta användarens roll
export const getUserRole = async (): Promise<UserRole> => {
  const user = getCurrentUser();
  if (!user) return 'coach'; // Standard: begränsad åtkomst
  
  const email = user.email || '';
  
  // 1. Försök hämta från userProfile först (högsta prioritet)
  try {
    const { getUserRole: getUserRoleFromProfile } = await import('./userProfile');
    const profileRole = await getUserRoleFromProfile(email);
    if (profileRole) {
      return profileRole;
    }
  } catch (error) {
    console.error('Error fetching role from profile:', error);
  }
  
  // 2. Fallback: Använd lokal e-postmappning
  const { getUserRoleFromEmail } = await import('./userRoles');
  return getUserRoleFromEmail(email);
};

// Synkron version för användning i komponenter
export const getUserRoleSync = (): UserRole => {
  const user = getCurrentUser();
  if (!user) return 'coach';
  
  const email = user.email || '';
  
  // Kolla om användaren är superuser från miljövariabel först
  const superuserEmail = process.env.NEXT_PUBLIC_SUPERUSER_EMAIL;
  if (superuserEmail && email.toLowerCase() === superuserEmail.toLowerCase()) {
    return 'superuser';
  }
  
  // 1. Försök hämta från userProfile cache
  try {
    const { getUserRoleSync: getUserRoleSyncFromProfile } = require('./userProfile');
    const profileRole = getUserRoleSyncFromProfile(email);
    if (profileRole) {
      return profileRole;
    }
  } catch (error) {
    console.warn('Could not fetch role from userProfile:', error);
  }
  
  // 2. Fallback till lokal rollmappning
  const { getUserRoleFromEmail } = require('./userRoles');
  return getUserRoleFromEmail(email);
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, async (user) => {
    // Om användaren loggar in, initiera profil om det behövs
    if (user && user.email) {
      // Initiera användarprofil med rätt roll
      const superuserEmail = process.env.NEXT_PUBLIC_SUPERUSER_EMAIL;
      const defaultRole = (superuserEmail && user.email.toLowerCase() === superuserEmail.toLowerCase()) 
        ? 'superuser' 
        : 'coach';
      
      import('./userProfile').then(({ initializeUserProfile }) => {
        initializeUserProfile(user.email!, defaultRole).catch(console.error);
      });
    }
    callback(user);
  });
};
