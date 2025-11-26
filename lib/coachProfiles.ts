// Coach-profil data med utbetalningsinformation
import { UserRole } from '@/types';

export interface CoachProfile {
  name: string;
  hourlyRate: number;
  role?: UserRole; // Roll i systemet (superuser, admin, coach, platschef)
  isSeniorCoach?: boolean; // Om coachen är senior coach
  mainPlace?: string; // Huvudort där coachen jobbar
  secondaryPlace?: string; // Sekundär ort om coachen jobbar på fler ställen
  address?: string;
  phone?: string;
  email?: string;
  bankAccount?: string;
  bankName?: string;
  clearingNumber?: string;
  accountNumber?: string;
  swishNumber?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  } | null;
  personalNumber?: string; // Personnummer för lönehantering
  taxTable?: string; // Skattetabell
  notes?: string;
}

// Cache för coach-profiler (för snabbare åtkomst)
let coachProfilesCache: Record<string, CoachProfile> = {};
let coachProfilesCacheInitialized = false;

// Importera Firebase-funktioner
import { 
  getCoachProfile as getCoachProfileFromFirebase, 
  saveCoachProfile as saveCoachProfileToFirebase,
  subscribeToCoachProfiles 
} from './realtimeDatabase';

// Initiera cache och prenumerera på uppdateringar
if (typeof window !== 'undefined' && !coachProfilesCacheInitialized) {
  coachProfilesCacheInitialized = true;
  
  // Prenumerera på realtidsuppdateringar
  subscribeToCoachProfiles((profiles) => {
    coachProfilesCache = profiles;
  });
  
  // Ladda initial data
  getCoachProfileFromFirebase('').then(() => {
    // Cache kommer att uppdateras via subscription
  }).catch(() => {
    // Ignorera fel vid initial laddning
  });
}

// Ladda coach-profil från Firebase
export const getCoachProfile = async (coachName: string): Promise<CoachProfile | null> => {
  // Försök hämta från cache först (för synkrona anrop)
  if (coachProfilesCache[coachName]) {
    return coachProfilesCache[coachName];
  }
  
  // Hämta från Firebase
  try {
    const profile = await getCoachProfileFromFirebase(coachName);
    if (profile) {
      coachProfilesCache[coachName] = profile;
    }
    return profile;
  } catch (error) {
    console.error('Error fetching coach profile:', error);
    return null;
  }
};

// Synkron version för bakåtkompatibilitet (använder cache)
export const getCoachProfileSync = (coachName: string): CoachProfile | null => {
  return coachProfilesCache[coachName] || null;
};

// Spara coach-profil till Firebase
export const saveCoachProfile = async (profile: CoachProfile): Promise<void> => {
  try {
    await saveCoachProfileToFirebase(profile);
    // Cache kommer att uppdateras via subscription
  } catch (error) {
    console.error('Error saving coach profile:', error);
    throw error;
  }
};

// Hämta timlön för en coach (från profil eller fallback)
export const getCoachHourlyRate = async (coachName: string): Promise<number> => {
  const profile = await getCoachProfile(coachName);
  if (profile?.hourlyRate) {
    return profile.hourlyRate;
  }
  
  // Fallback till standard
  return 375;
};

// Synkron version för bakåtkompatibilitet
export const getCoachHourlyRateSync = (coachName: string): number => {
  const profile = getCoachProfileSync(coachName);
  if (profile?.hourlyRate) {
    return profile.hourlyRate;
  }
  
  return 375;
};

