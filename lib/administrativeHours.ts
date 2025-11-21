// Hantera administrativa timmar för coacher

import { AdministrativeHour, AdministrativeCategory } from '@/types/administrativeHours';

const ADMIN_HOURS_STORAGE_KEY = 'administrativeHours';

// Hämta alla administrativa timmar
export const getAllAdministrativeHours = (): AdministrativeHour[] => {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(ADMIN_HOURS_STORAGE_KEY);
  if (!stored) return [];
  
  const hours = JSON.parse(stored);
  // Konvertera datum från string till Date
  return hours.map((h: any) => ({
    ...h,
    date: new Date(h.date),
    createdAt: new Date(h.createdAt),
  }));
};

// Hämta administrativa timmar för en specifik coach
export const getAdministrativeHoursForCoach = (coachName: string): AdministrativeHour[] => {
  return getAllAdministrativeHours().filter(h => h.coachName === coachName);
};

// Hämta administrativa timmar för en specifik månad
export const getAdministrativeHoursForMonth = (
  coachName: string,
  year: number,
  month: number // 1-12
): AdministrativeHour[] => {
  const hours = getAdministrativeHoursForCoach(coachName);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  return hours.filter(h => {
    const hourDate = new Date(h.date);
    return hourDate >= startDate && hourDate <= endDate;
  });
};

// Lägg till administrativa timmar
export const addAdministrativeHour = (
  coachName: string,
  date: Date,
  hours: number,
  description: string,
  category?: AdministrativeCategory,
  createdBy?: string
): AdministrativeHour => {
  const allHours = getAllAdministrativeHours();
  
  const newHour: AdministrativeHour = {
    id: `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    coachName,
    date,
    hours,
    description,
    category,
    createdAt: new Date(),
    createdBy: createdBy || 'unknown',
  };
  
  allHours.push(newHour);
  localStorage.setItem(ADMIN_HOURS_STORAGE_KEY, JSON.stringify(allHours));
  
  return newHour;
};

// Uppdatera administrativa timmar
export const updateAdministrativeHour = (
  id: string,
  updates: Partial<Omit<AdministrativeHour, 'id' | 'createdAt' | 'createdBy'>>
): boolean => {
  const allHours = getAllAdministrativeHours();
  const index = allHours.findIndex(h => h.id === id);
  
  if (index === -1) return false;
  
  allHours[index] = {
    ...allHours[index],
    ...updates,
    date: updates.date ? new Date(updates.date) : allHours[index].date,
  };
  
  localStorage.setItem(ADMIN_HOURS_STORAGE_KEY, JSON.stringify(allHours));
  return true;
};

// Ta bort administrativa timmar
export const deleteAdministrativeHour = (id: string): boolean => {
  const allHours = getAllAdministrativeHours();
  const filtered = allHours.filter(h => h.id !== id);
  
  if (filtered.length === allHours.length) return false;
  
  localStorage.setItem(ADMIN_HOURS_STORAGE_KEY, JSON.stringify(filtered));
  return true;
};

// Beräkna totala administrativa timmar för en coach under en månad
export const getTotalAdministrativeHoursForMonth = (
  coachName: string,
  year: number,
  month: number
): number => {
  const hours = getAdministrativeHoursForMonth(coachName, year, month);
  return hours.reduce((total, h) => total + h.hours, 0);
};

// Hämta administrativa timmar för en period
export const getAdministrativeHoursForPeriod = (
  coachName: string,
  startDate: Date,
  endDate: Date
): AdministrativeHour[] => {
  const hours = getAdministrativeHoursForCoach(coachName);
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
export const getTotalAdministrativeHoursForPeriod = (
  coachName: string,
  startDate: Date,
  endDate: Date
): number => {
  const hours = getAdministrativeHoursForPeriod(coachName, startDate, endDate);
  return hours.reduce((total, h) => total + h.hours, 0);
};

