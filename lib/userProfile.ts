// Hantera användarprofiler

import { UserProfile } from '@/types/userProfile';
import { UserRole } from '@/types';
import {
  getUserProfile as getUserProfileFromFirebase,
  saveUserProfile as saveUserProfileToFirebase,
  subscribeToUserProfiles,
} from './realtimeDatabase';

// Cache för användarprofiler
let userProfilesCache: Record<string, UserProfile> = {};
let userProfilesCacheInitialized = false;

// Initiera cache och prenumerera på uppdateringar
if (typeof window !== 'undefined' && !userProfilesCacheInitialized) {
  userProfilesCacheInitialized = true;
  
  // Ladda profiler direkt först (synkront om möjligt)
  import('./realtimeDatabase').then(({ getUserProfile: loadProfile }) => {
    // Försök ladda nuvarande användares profil direkt
    const currentUserEmail = typeof window !== 'undefined' && sessionStorage.getItem('mock_user_session')
      ? JSON.parse(sessionStorage.getItem('mock_user_session')!).email
      : null;
    
    if (currentUserEmail) {
      loadProfile(currentUserEmail).then(profile => {
        if (profile) {
          userProfilesCache[currentUserEmail] = profile;
        }
      }).catch(console.error);
    }
  }).catch(console.error);
  
  // Prenumerera på realtidsuppdateringar
  subscribeToUserProfiles((profiles) => {
    userProfilesCache = profiles;
    console.log('✅ User profiles cache updated:', Object.keys(profiles).length, 'profiles');
  });
}

// Hämta användarprofil (async)
export const getUserProfile = async (email: string): Promise<UserProfile | null> => {
  // Försök hämta från cache först
  if (userProfilesCache[email]) {
    return userProfilesCache[email];
  }
  
  // Hämta från Firebase
  try {
    const profile = await getUserProfileFromFirebase(email);
    if (profile) {
      userProfilesCache[email] = profile;
    }
    return profile;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

// Synkron version (använder cache)
export const getUserProfileSync = (email: string): UserProfile | null => {
  return userProfilesCache[email] || null;
};

// Hämta visningsnamn för en användare (fallback till email om inget namn är satt)
export const getDisplayName = (email: string): string => {
  const profile = getUserProfileSync(email);
  return profile?.displayName || email.split('@')[0];
};

// Spara användarprofil
export const saveUserProfile = async (profile: UserProfile): Promise<void> => {
  try {
    await saveUserProfileToFirebase(profile);
    userProfilesCache[profile.email] = profile;
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw error;
  }
};

// Uppdatera användarprofil
export const updateUserProfile = async (
  email: string,
  updates: Partial<Omit<UserProfile, 'email' | 'createdAt'>>
): Promise<void> => {
  const existingProfile = await getUserProfile(email);
  
  if (!existingProfile) {
    // Skapa ny profil om den inte finns
    const newProfile: UserProfile = {
      email,
      displayName: updates.displayName || email.split('@')[0],
      role: updates.role,
      phone: updates.phone,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await saveUserProfile(newProfile);
  } else {
    // Uppdatera befintlig profil
    const updatedProfile: UserProfile = {
      ...existingProfile,
      ...updates,
      updatedAt: new Date(),
    };
    await saveUserProfile(updatedProfile);
  }
};

/**
 * Initiera användarprofil om den inte finns
 * Anropas automatiskt när användare loggar in första gången
 */
export const initializeUserProfile = async (
  email: string, 
  defaultRole: UserRole = 'coach'
): Promise<void> => {
  try {
    const existingProfile = await getUserProfile(email);
    
    if (!existingProfile) {
      // Skapa ny profil med default roll
      const newProfile: UserProfile = {
        email,
        displayName: email.split('@')[0], // Default: användarnamn från email
        role: defaultRole,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await saveUserProfile(newProfile);
      console.log(`✅ Initialized user profile: ${email} (role: ${defaultRole})`);
    }
  } catch (error) {
    console.error('Error initializing user profile:', error);
  }
};

/**
 * Hämta användarens roll från profil
 */
export const getUserRole = async (email: string): Promise<UserRole | null> => {
  const profile = await getUserProfile(email);
  return profile?.role || null;
};

/**
 * Hämta användarens roll synkront från cache
 */
export const getUserRoleSync = (email: string): UserRole | null => {
  const profile = getUserProfileSync(email);
  return profile?.role || null;
};

/**
 * Uppdatera användarens roll
 */
export const updateUserRole = async (email: string, role: UserRole): Promise<void> => {
  const profile = await getUserProfile(email);
  
  if (profile) {
    await saveUserProfile({
      ...profile,
      role,
      updatedAt: new Date(),
    });
  } else {
    throw new Error(`User profile not found: ${email}`);
  }
};

/**
 * Hämta alla användare och deras roller
 */
export const getAllUserRoles = (): Record<string, UserRole> => {
  const roles: Record<string, UserRole> = {};
  Object.entries(userProfilesCache).forEach(([email, profile]) => {
    if (profile.role) {
      roles[email] = profile.role;
    }
  });
  return roles;
};

