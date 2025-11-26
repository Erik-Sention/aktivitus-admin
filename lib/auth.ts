// Firebase Authentication functions med fallback till lokal mock-auth
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from './firebase';

// Kontrollera om Firebase är konfigurerat (inte demo-värden)
const isFirebaseConfigured = () => {
  // Om mock-uppgifter finns, använd alltid mock-auth
  const hasMockCredentials = 
    (typeof window !== 'undefined' && 
     (process.env.NEXT_PUBLIC_MOCK_USERNAME || process.env.NEXT_PUBLIC_MOCK_PASSWORD)) ||
    (typeof window === 'undefined' && 
     (process.env.NEXT_PUBLIC_MOCK_USERNAME || process.env.NEXT_PUBLIC_MOCK_PASSWORD));
  
  if (hasMockCredentials) {
    return false; // Använd mock-auth om mock-uppgifter finns
  }
  
  // Annars kolla Firebase-konfiguration
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
  return apiKey !== '' && apiKey !== 'demo-api-key' && !apiKey.includes('demo') && apiKey.length > 20;
};

// Mock User interface för lokal autentisering
import { UserRole } from '@/types';

interface MockUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role?: UserRole;
}

// Lokal mock-autentisering (endast om explicit satt i miljövariabler)
const MOCK_USERNAME = process.env.NEXT_PUBLIC_MOCK_USERNAME || '';
const MOCK_PASSWORD = process.env.NEXT_PUBLIC_MOCK_PASSWORD || '';
const MOCK_USER_KEY = 'mock_user_session';

// Importera rollhantering från userProfile
import { getUserRoleFromEmail } from './userRoles';

const createMockUser = (email: string): MockUser => ({
  uid: 'mock-user-' + Date.now(),
  email: email,
  displayName: email.split('@')[0],
  role: getUserRoleFromEmail(email),
});

const getMockUser = (): MockUser | null => {
  if (typeof window === 'undefined') return null;
  const stored = sessionStorage.getItem(MOCK_USER_KEY);
  return stored ? JSON.parse(stored) : null;
};

const setMockUser = (user: MockUser | null) => {
  if (typeof window === 'undefined') return;
  if (user) {
    sessionStorage.setItem(MOCK_USER_KEY, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(MOCK_USER_KEY);
  }
};

// Mock auth change listeners
let mockAuthListeners: Array<(user: MockUser | null) => void> = [];
const notifyMockAuthListeners = (user: MockUser | null) => {
  mockAuthListeners.forEach(callback => callback(user));
};

export const login = async (email: string, password: string) => {
  // Om Firebase inte är konfigurerat, använd mock-auth
  if (!isFirebaseConfigured()) {
    // Normalisera input
    const inputEmail = email.toLowerCase().trim();
    const mockUsername = MOCK_USERNAME.toLowerCase().trim();
    
    // Kontrollera om MOCK_USERNAME är en e-postadress eller bara användarnamn
    const isMockEmail = mockUsername.includes('@');
    const mockUsernameOnly = isMockEmail 
      ? mockUsername.split('@')[0] 
      : mockUsername;
    const mockEmailFull = isMockEmail 
      ? mockUsername 
      : `${mockUsername}@test.se`;
    
    // Acceptera olika format:
    // 1. Exakt match med MOCK_USERNAME (om det är e-post, acceptera exakt match)
    // 2. Match med bara användarnamnet (före @)
    // 3. Match med användarnamn@test.se (om MOCK_USERNAME är bara användarnamn)
    const isValid = 
      password === MOCK_PASSWORD && (
        inputEmail === mockUsername || // Exakt match
        inputEmail === mockEmailFull || // Match med fullständig e-post
        (!isMockEmail && inputEmail === `${mockUsername}@test.se`) || // Om MOCK_USERNAME är bara användarnamn
        inputEmail === mockUsernameOnly || // Bara användarnamnet
        inputEmail.startsWith(mockUsernameOnly + '@') // Användarnamn@något
      );
    
    if (!isValid) {
      throw new Error('Fel användarnamn eller lösenord');
    }
    
    // Använd MOCK_USERNAME som e-post om det redan är en e-post, annars skapa en
    const userEmail = isMockEmail ? mockUsername : mockEmailFull;
    const mockUser = createMockUser(userEmail);
    setMockUser(mockUser);
    notifyMockAuthListeners(mockUser);
    
    // Logga inloggning (asynkront, vänta inte)
    if (typeof window !== 'undefined') {
      import('./activityLogger').then(({ logLogin }) => logLogin());
    }
    
    // Returnera ett mock-objekt som liknar Firebase User
    return {
      user: mockUser as any,
    } as any;
  }
  
  // Annars använd riktig Firebase - fånga upp fel och fallback till mock om Firebase inte fungerar
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error: any) {
    // Om Firebase ger fel (t.ex. ogiltig API-nyckel), fallback till mock-auth
    if (error.code?.includes('api-key') || error.code?.includes('auth')) {
      console.warn('Firebase-auth misslyckades, använder mock-auth istället');
      
      const inputEmail = email.toLowerCase().trim();
      const mockUsername = MOCK_USERNAME.toLowerCase().trim();
      
      // Kontrollera om MOCK_USERNAME är en e-postadress eller bara användarnamn
      const isMockEmail = mockUsername.includes('@');
      const mockUsernameOnly = isMockEmail 
        ? mockUsername.split('@')[0] 
        : mockUsername;
      const mockEmailFull = isMockEmail 
        ? mockUsername 
        : `${mockUsername}@test.se`;
      
      const isValid = 
        password === MOCK_PASSWORD && (
          inputEmail === mockUsername ||
          inputEmail === mockEmailFull ||
          (!isMockEmail && inputEmail === `${mockUsername}@test.se`) ||
          inputEmail === mockUsernameOnly ||
          inputEmail.startsWith(mockUsernameOnly + '@')
        );
      
      if (!isValid) {
        throw new Error('Fel användarnamn eller lösenord');
      }
      
      const userEmail = isMockEmail ? mockUsername : mockEmailFull;
      const mockUser = createMockUser(userEmail);
      setMockUser(mockUser);
      notifyMockAuthListeners(mockUser);
      
      // Logga inloggning (asynkront, vänta inte)
      if (typeof window !== 'undefined') {
        import('./activityLogger').then(({ logLogin }) => logLogin());
      }
      
      return {
        user: mockUser as any,
      } as any;
    }
    
    // Annars kasta felet vidare
    throw error;
  }
};

export const register = async (email: string, password: string) => {
  if (!isFirebaseConfigured()) {
    // För mock, skapa direkt en inloggad användare
    const mockUser = createMockUser(email);
    setMockUser(mockUser);
    notifyMockAuthListeners(mockUser);
    return {
      user: mockUser as any,
    } as any;
  }
  
  return await createUserWithEmailAndPassword(auth, email, password);
};

export const logout = async () => {
  // Logga utloggning innan vi rensar användaren (asynkront, vänta inte)
  if (typeof window !== 'undefined') {
    import('./activityLogger').then(({ logLogout }) => logLogout());
  }
  
  if (!isFirebaseConfigured()) {
    // Rensa mock-användare
    setMockUser(null);
    // Notifiera alla listeners om att användaren loggat ut
    notifyMockAuthListeners(null);
    // Vänta lite för att säkerställa att state uppdateras
    await new Promise(resolve => setTimeout(resolve, 100));
    return Promise.resolve();
  }
  
  try {
    await signOut(auth);
  } catch (error) {
    // Om Firebase-logout misslyckas, rensa mock-auth ändå
    setMockUser(null);
    notifyMockAuthListeners(null);
    throw error;
  }
};

export const getCurrentUser = (): User | MockUser | null => {
  if (!isFirebaseConfigured()) {
    return getMockUser();
  }
  
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
  
  // 2. För mock users, använd roll från MockUser
  if ('role' in user && user.role) {
    return user.role;
  }
  
  // 3. Fallback: Använd lokal e-postmappning
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
  
  // 1. Försök hämta från userProfile cache först (högsta prioritet)
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
  const roleFromEmail = getUserRoleFromEmail(email);
  
  // Om rollen från e-post/miljövariabel skiljer sig från sparad roll,
  // uppdatera MockUser (för mock-auth)
  if (!isFirebaseConfigured() && 'role' in user && user.role !== roleFromEmail) {
    const updatedUser = { ...user, role: roleFromEmail };
    setMockUser(updatedUser as MockUser);
  }
  
  return roleFromEmail;
};

export const onAuthChange = (callback: (user: User | MockUser | null) => void) => {
  if (!isFirebaseConfigured()) {
    // Lägg till callback i mock listeners
    mockAuthListeners.push(callback);
    
    // Anropa direkt med nuvarande användare
    const currentUser = getMockUser();
    callback(currentUser);
    
    // Returnera unsubscribe-funktion
    return () => {
      mockAuthListeners = mockAuthListeners.filter(cb => cb !== callback);
    };
  }
  
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

