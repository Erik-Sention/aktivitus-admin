// Hantera administrativa timmar för coacher

import { AdministrativeHour, AdministrativeCategory } from '@/types/administrativeHours';
import {
  getAllAdministrativeHours as getAllAdministrativeHoursFromFirebase,
  getAdministrativeHoursForCoach as getAdministrativeHoursForCoachFromFirebase,
  addAdministrativeHour as addAdministrativeHourToFirebase,
  updateAdministrativeHour as updateAdministrativeHourInFirebase,
  deleteAdministrativeHour as deleteAdministrativeHourFromFirebase,
  subscribeToAdministrativeHours,
} from './realtimeDatabase';

// Cache för administrativa timmar
let administrativeHoursCache: AdministrativeHour[] = [];
let administrativeHoursCacheInitialized = false;

// Initiera cache och prenumerera på uppdateringar
if (typeof window !== 'undefined' && !administrativeHoursCacheInitialized) {
  administrativeHoursCacheInitialized = true;
  
  // Prenumerera på realtidsuppdateringar
  subscribeToAdministrativeHours((hours) => {
    administrativeHoursCache = hours;
  });
  
  // Ladda initial data
  getAllAdministrativeHoursFromFirebase().then((hours) => {
    administrativeHoursCache = hours;
  }).catch(() => {
    // Ignorera fel vid initial laddning
  });
}

// Hämta alla administrativa timmar
export const getAllAdministrativeHours = async (): Promise<AdministrativeHour[]> => {
  try {
    const hours = await getAllAdministrativeHoursFromFirebase();
    administrativeHoursCache = hours;
    return hours;
  } catch (error) {
    console.error('Error fetching administrative hours:', error);
    // Returnera cache om Firebase-förfrågan misslyckas
    return administrativeHoursCache;
  }
};

// Synkron version för bakåtkompatibilitet (använder cache)
export const getAllAdministrativeHoursSync = (): AdministrativeHour[] => {
  return administrativeHoursCache;
};

// Hämta administrativa timmar för en specifik coach
export const getAdministrativeHoursForCoach = async (coachName: string): Promise<AdministrativeHour[]> => {
  try {
    return await getAdministrativeHoursForCoachFromFirebase(coachName);
  } catch (error) {
    console.error('Error fetching administrative hours for coach:', error);
    return getAllAdministrativeHoursSync().filter(h => h.coachName === coachName);
  }
};

// Synkron version
export const getAdministrativeHoursForCoachSync = (coachName: string): AdministrativeHour[] => {
  return getAllAdministrativeHoursSync().filter(h => h.coachName === coachName);
};

// Hämta administrativa timmar för en specifik månad
export const getAdministrativeHoursForMonth = async (
  coachName: string,
  year: number,
  month: number // 1-12
): Promise<AdministrativeHour[]> => {
  const hours = await getAdministrativeHoursForCoach(coachName);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  return hours.filter(h => {
    const hourDate = new Date(h.date);
    return hourDate >= startDate && hourDate <= endDate;
  });
};

// Synkron version
export const getAdministrativeHoursForMonthSync = (
  coachName: string,
  year: number,
  month: number
): AdministrativeHour[] => {
  const hours = getAdministrativeHoursForCoachSync(coachName);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  return hours.filter(h => {
    const hourDate = new Date(h.date);
    return hourDate >= startDate && hourDate <= endDate;
  });
};

// Lägg till administrativa timmar
export const addAdministrativeHour = async (
  coachName: string,
  date: Date,
  hours: number,
  description: string,
  category?: AdministrativeCategory,
  createdBy?: string
): Promise<AdministrativeHour> => {
  try {
    const id = await addAdministrativeHourToFirebase(
      coachName,
      date,
      hours,
      description,
      category,
      createdBy
    );
    
    const newHour: AdministrativeHour = {
      id,
      coachName,
      date,
      hours,
      description,
      category,
      createdAt: new Date(),
      createdBy: createdBy || 'unknown',
    };
    
    // Cache kommer att uppdateras via subscription
    return newHour;
  } catch (error) {
    console.error('Error adding administrative hour:', error);
    throw error;
  }
};

// Uppdatera administrativa timmar
export const updateAdministrativeHour = async (
  id: string,
  updates: Partial<Omit<AdministrativeHour, 'id' | 'createdAt' | 'createdBy'>>
): Promise<boolean> => {
  try {
    await updateAdministrativeHourInFirebase(id, updates);
    // Cache kommer att uppdateras via subscription
    return true;
  } catch (error) {
    console.error('Error updating administrative hour:', error);
    return false;
  }
};

// Ta bort administrativa timmar
export const deleteAdministrativeHour = async (id: string): Promise<boolean> => {
  try {
    await deleteAdministrativeHourFromFirebase(id);
    // Cache kommer att uppdateras via subscription
    return true;
  } catch (error) {
    console.error('Error deleting administrative hour:', error);
    return false;
  }
};

// Beräkna totala administrativa timmar för en coach under en månad
export const getTotalAdministrativeHoursForMonth = async (
  coachName: string,
  year: number,
  month: number
): Promise<number> => {
  const hours = await getAdministrativeHoursForMonth(coachName, year, month);
  return hours.reduce((total, h) => total + h.hours, 0);
};

// Synkron version
export const getTotalAdministrativeHoursForMonthSync = (
  coachName: string,
  year: number,
  month: number
): number => {
  const hours = getAdministrativeHoursForMonthSync(coachName, year, month);
  return hours.reduce((total, h) => total + h.hours, 0);
};

// Hämta administrativa timmar för en period
export const getAdministrativeHoursForPeriod = async (
  coachName: string,
  startDate: Date,
  endDate: Date
): Promise<AdministrativeHour[]> => {
  const hours = await getAdministrativeHoursForCoach(coachName);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  return hours.filter(h => {
    const hourDate = new Date(h.date);
    return hourDate >= start && hourDate <= end;
  });
};

// Synkron version
export const getAdministrativeHoursForPeriodSync = (
  coachName: string,
  startDate: Date,
  endDate: Date
): AdministrativeHour[] => {
  const hours = getAdministrativeHoursForCoachSync(coachName);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  return hours.filter(h => {
    const hourDate = new Date(h.date);
    return hourDate >= start && hourDate <= end;
  });
};

// Beräkna totala administrativa timmar för en coach under en period
export const getTotalAdministrativeHoursForPeriod = async (
  coachName: string,
  startDate: Date,
  endDate: Date
): Promise<number> => {
  const hours = await getAdministrativeHoursForPeriod(coachName, startDate, endDate);
  return hours.reduce((total, h) => total + h.hours, 0);
};

// Synkron version
export const getTotalAdministrativeHoursForPeriodSync = (
  coachName: string,
  startDate: Date,
  endDate: Date
): number => {
  const hours = getAdministrativeHoursForPeriodSync(coachName, startDate, endDate);
  return hours.reduce((total, h) => total + h.hours, 0);
};

