// Coach-profil data med utbetalningsinformation

export interface CoachProfile {
  name: string;
  hourlyRate: number;
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

// Ladda coach-profil från localStorage
export const getCoachProfile = (coachName: string): CoachProfile | null => {
  if (typeof window === 'undefined') return null;
  
  const savedProfiles = localStorage.getItem('coachProfiles');
  if (!savedProfiles) return null;
  
  const profiles = JSON.parse(savedProfiles);
  return profiles[coachName] || null;
};

// Spara coach-profil till localStorage
export const saveCoachProfile = (profile: CoachProfile): void => {
  if (typeof window === 'undefined') return;
  
  const savedProfiles = localStorage.getItem('coachProfiles');
  const profiles = savedProfiles ? JSON.parse(savedProfiles) : {};
  
  profiles[profile.name] = profile;
  localStorage.setItem('coachProfiles', JSON.stringify(profiles));
};

// Hämta timlön för en coach (från profil eller fallback till localStorage)
export const getCoachHourlyRate = (coachName: string): number => {
  const profile = getCoachProfile(coachName);
  if (profile?.hourlyRate) {
    return profile.hourlyRate;
  }
  
  // Fallback till gamla localStorage
  if (typeof window === 'undefined') return 375;
  const savedRates = localStorage.getItem('coachHourlyRates');
  if (savedRates) {
    const rates = JSON.parse(savedRates);
    return rates[coachName] || 375;
  }
  
  return 375;
};

