// Tidsbudget för alla tjänster och medlemskap
// Baserat på Aktivitus priser, arbetsuppgifter & tidräkning tjänster

import { ServiceType } from '@/types';

// Tidsbudget i timmar för medlemskap (månadsvis)
export const MEMBERSHIP_TIME_BUDGETS: Record<string, number> = {
  // Membership Coaching (månadsvis)
  'Membership Standard': 2,
  'Membership Standard TRI/OCR/MULTI': 2,
  'Programskrivning Membership Standard': 2,
  'Membership Premium': 2.5,
  'Membership Premium TRI/OCR/MULTI': 2.5,
  'Membership Supreme': 5,
  'Membership Supreme TRI/OCR/MULTI': 5,
  'Membership Life': 0.2,
  'Membership Aktivitus Iform 4 mån': 2.5,
  'Membership Aktivitus Iform Tillägg till MS 4 mån': 2.5,
  'Membership Iform Extra månad': 2.5,
  'Membership Aktivitus Iform Fortsättning': 1.25,
  'Membership BAS': 0,
  'Membership Avslut NOTERA SLUTDATUM': 0,
  'Membership Utan tester': 0, // Samma tidsbudget som valt membership, men här 0 eftersom det är utan tester
  'Membership Uppstart Coaching -  Test redan gjort och betalt': 2,

  // Säljtillägg
  'Konvertering från test till membership - Till kollega': 1,

  // Savesamtal
  'Save - Samtal - Standard': 0.5,
  
  // Iform specialfall
  'Iform innan prisjusteringen - Sista testmomenten 2,5 h': 2.5,
  'Iform uppstart/återtest/coachtimme MS utförd av någon annan - Minus 1 h tid': -1,
  'Iform uppstart/återtest/coachtimme MS utförd till någon annan - Plus 1 h tid': 1,
};

// Tidsbudget i timmar för fristående tester och analyser
export const TEST_TIME_BUDGETS: Record<string, number> = {
  'Tröskeltest': 1.5,
  'Tröskeltest + VO2max': 2,
  'Tröskeltest Triathlon': 2.25,
  'Tröskeltest Triathlon + VO2max': 2.75,
  'VO2max fristående': 1.25,
  'VO2max tillägg': 0.5,
  'Wingate fristående': 0.5,
  'Wingatetest tillägg': 0.25,
  'Styrketest tillägg': 0.5, // Uppskattat baserat på andra tillägg
  'Kroppss fett% tillägg': 0.5,
  'Kroppss fett% fristående': 0.75,
  'Blodanalys': 0.5,
  'Hb endast': 0.25,
  'Glucos endast': 0.25,
  'Blodfetter': 0.25,
  'Kostregistrering': 5,
  'Kostrådgivning': 1,
  'Teknikanalys tillägg': 0.5,
  'Teknikanalys': 1.5,
  'Funktionsanalys': 2,
  'Funktions- och löpteknikanalys': 2.75,
  'Hälsopaket': 1.5,
  'Sommardubbel': 2,
  'Sommardubbel Tri': 2.75,
  'Träningsprogram Sommardubbel 1500kr': 2,
  'Natriumanalys (Svettest)': 1.5,
  'Personlig Träning 1 - Betald yta': 1.25,
  'Personlig Träning 1 - Gratis yta': 1.75,
  'PT-Klipp - Betald yta': 1.25,
  'PT-Klipp - Gratis yta': 1.75,
  'Konvertering från test till PT20 - Till kollega': 1,
  'Sen avbokning': 1,
  
  // Genomgång/testdel
  'Genomgång eller testdel genomförd av annan': -0.5,
  'Genomgång eller testdel utförd till någon annan': 0.5,
};

// Kombinerad tidsbudget för alla tjänster
export const TIME_BUDGETS: Record<string, number> = {
  ...MEMBERSHIP_TIME_BUDGETS,
  ...TEST_TIME_BUDGETS,
};

// Hjälpfunktion för att få tidsbudget för en tjänst
export const getTimeBudget = (service: ServiceType, isSeniorCoach?: boolean): number => {
  // Hantera senior coach memberships (Premium Senior och Supreme Senior)
  if (isSeniorCoach) {
    if (service === 'Membership Premium' || service === 'Membership Premium TRI/OCR/MULTI') {
      return 3.5; // Premium Senior per månad
    }
    if (service === 'Membership Supreme' || service === 'Membership Supreme TRI/OCR/MULTI') {
      return 6; // Supreme Senior per månad
    }
  }

  // Standard lookup
  return TIME_BUDGETS[service] || 0;
};

// Kontrollera om en tjänst är ett medlemskap (månadsvis tidsbudget)
export const isMembershipTimeBudget = (service: ServiceType): boolean => {
  return service in MEMBERSHIP_TIME_BUDGETS || 
         service.includes('Membership') ||
         service.includes('Iform') ||
         service.includes('Save');
};

