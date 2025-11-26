// Konstanter för dropdowns och listor

import { Place, Sport, MembershipType, TestType, Status, PaymentMethod, InvoiceStatus, PaymentStatus, BillingInterval, ServiceType } from '@/types';

export const PLACES: Place[] = [
  'Stockholm',
  'Göteborg',
  'Malmö',
  'Linköping',
  'Falun',
  'Åre',
];

export const SPORTS: Sport[] = [
  'Ingen',
  'Löpning',
  'Cykel',
  'Triathlon',
  'Skidor',
  'Hyrox',
  'OCR',
  'Swimrun',
  'Klassikern',
  'Multisport',
  'Ospecificerat',
];

export const COACHES: string[] = [
  'Anders Carbonnier',
  'Axel Mattson',
  'Andreas Nilsson',
  'Anton Persson',
  'Andreas Thell',
  'Evelina Asplund',
  'Emma Belforth',
  'Evelina Järvinen',
  'Erik Olsson',
  'Gusten Nilber',
  'Gabriel Sandör',
  'Isabella Hedberg',
  'Jimmy Carlsson',
  'Jeff Frydenlund',
  'Johan Hasselmark',
  'Jenny Nae',
  'Johan Nielsen',
  'Jessica Unogård',
  'Kenny Steger',
  'Linda Linhart',
  'Linda Sjölund',
  'Morgan Björkqvist',
  'Micke Hanell',
  'Mattias Lundqvist',
  'Marika Wagner',
  'Maria Wahlberg',
  'Olle Bengtström',
  'Oliver Lindblom',
  'Sofie Bondesson',
  'Tove Larsson',
  'Selma Jormin',
  'Arkatix Adgren',
  'Laurens Hoffer',
  'Amy Whyte',
  'Natalie Persson',
  'Mattias Pers',
  'Jennifer',
];

export const MEMBERSHIPS: MembershipType[] = [
  'Membership Standard',
  'Membership Standard TRI/OCR/MULTI',
  'Programskrivning Membership Standard',
  'Membership Premium',
  'Membership Premium TRI/OCR/MULTI',
  'Membership Supreme',
  'Membership Supreme TRI/OCR/MULTI',
  'Membership Life',
  'Membership Aktivitus Iform 4 mån',
  'Membership Aktivitus Iform Tillägg till MS 4 mån',
  'Membership Iform Extra månad',
  'Membership Aktivitus Iform Fortsättning',
  'Membership BAS',
  'Membership Avslut NOTERA SLUTDATUM',
  'Save - Samtal - Standard',
  'Membership Utan tester',
  'Membership Uppstart Coaching -  Test redan gjort och betalt',
  'Konvertering från test till membership - Till kollega',
  'Iform innan prisjusteringen - Sista testmomenten 2,5 h',
  'Iform uppstart/återtest/coachtimme MS utförd av någon annan - Minus 1 h tid',
  'Iform uppstart/återtest/coachtimme MS utförd till någon annan - Plus 1 h tid',
];

export const TESTS: TestType[] = [
  'Tröskeltest',
  'Tröskeltest + VO2max',
  'Tröskeltest Triathlon',
  'Tröskeltest Triathlon + VO2max',
  'VO2max fristående',
  'VO2max tillägg',
  'Wingate fristående',
  'Wingatetest tillägg',
  'Styrketest tillägg',
  'Teknikanalys tillägg',
  'Teknikanalys',
  'Funktionsanalys',
  'Funktions- och löpteknikanalys',
  'Hälsopaket',
  'Sommardubbel',
  'Sommardubbel Tri',
  'Träningsprogram Sommardubbel 1500kr',
  'Personlig Träning 1 - Betald yta',
  'Personlig Träning 1 - Gratis yta',
  'Personlig Träning 5',
  'Personlig Träning 10',
  'Personlig Träning 20',
  'PT-Klipp - Betald yta',
  'PT-Klipp - Gratis yta',
  'Konvertering från test till PT20 - Till kollega',
  'Sen avbokning',
  'Kroppss fett% tillägg',
  'Kroppss fett% fristående',
  'Blodanalys',
  'Hb endast',
  'Glucos endast',
  'Blodfetter',
  'Kostregistrering',
  'Kostrådgivning',
  'Natriumanalys (Svettest)',
];

// Kombinerad lista för alla tjänster (Memberships + Tests)
export const SERVICES = [...MEMBERSHIPS, ...TESTS] as const;

export const STATUSES: Status[] = [
  'Aktiv',
  'Inaktiv',
  'Pausad',
  'Genomförd',
];

export const PAYMENT_METHODS: PaymentMethod[] = [
  'Autogiro',
  'Faktura',
  'Swish',
  'Förskottsbetalning',
  'Klarna',
  'iZettle',
];

export const INVOICE_STATUSES: InvoiceStatus[] = [
  'Betald',
  'Väntar på betalning',
  'Förfallen',
  'Påminnelse skickad',
  'Ej betald efter påminnelse',
  'Överlämnad till inkasso',
  'Betalning avvisad',
  'Ej aktuell',
];

export const PAYMENT_STATUSES: PaymentStatus[] = [
  'Betald',
  'Väntar på fullständig faktureringsinfo',
  'Väntar på utbetalning',
  'Delvis betald',
  'Avbruten',
  'Ej aktuell',
];

export const BILLING_INTERVALS: BillingInterval[] = [
  'Månadsvis',
  'Kvartalsvis',
  'Halvårsvis',
  'Årlig',
  'Engångsbetalning',
];

// Bas-priser för tjänster (kr) - Dessa kan justeras dynamiskt
export const SERVICE_BASE_PRICES: Record<string, number> = {
  // Memberships - Bas-priser (standard tester, inte senior coach)
  'Membership Standard': 1195,
  'Membership Standard TRI/OCR/MULTI': 1295,
  'Programskrivning Membership Standard': 1495,
  'Membership Premium': 2195,
  'Membership Premium TRI/OCR/MULTI': 2295,
  'Membership Supreme': 3295,
  'Membership Supreme TRI/OCR/MULTI': 3395,
  'Membership Life': 333,
  'Membership Aktivitus Iform 4 mån': 1998,
  'Membership Aktivitus Iform Tillägg till MS 4 mån': 1748,
  'Membership Iform Extra månad': 499,
  'Membership Aktivitus Iform Fortsättning': 990,
  'Membership BAS': 995,
  'Membership Avslut NOTERA SLUTDATUM': 0,
  'Save - Samtal - Standard': 0,
  'Membership Utan tester': 1595,
  'Membership Uppstart Coaching -  Test redan gjort och betalt': 1795,
  'Konvertering från test till membership - Till kollega': 0,
  'Iform innan prisjusteringen - Sista testmomenten 2,5 h': 1998,
  'Iform uppstart/återtest/coachtimme MS utförd av någon annan - Minus 1 h tid': 0,
  'Iform uppstart/återtest/coachtimme MS utförd till någon annan - Plus 1 h tid': 0,
  
  // Tests - Uppdaterade priser
  'Tröskeltest': 1890,
  'Tröskeltest + VO2max': 2490,
  'Tröskeltest Triathlon': 2690,
  'Tröskeltest Triathlon + VO2max': 3290,
  'VO2max fristående': 1390,
  'VO2max tillägg': 600,
  'Wingate fristående': 490,
  'Wingatetest tillägg': 350,
  'Styrketest tillägg': 600,
  'Teknikanalys tillägg': 650,
  'Teknikanalys': 1290,
  'Funktionsanalys': 1790,
  'Funktions- och löpteknikanalys': 2290,
  'Hälsopaket': 1990,
  'Sommardubbel': 2990,
  'Sommardubbel Tri': 4490,
  'Träningsprogram Sommardubbel 1500kr': 1500,
  'Personlig Träning 1 - Betald yta': 1190,
  'Personlig Träning 1 - Gratis yta': 1190,
  'Personlig Träning 5': 5500,
  'Personlig Träning 10': 10500,
  'Personlig Träning 20': 19900,
  'PT-Klipp - Betald yta': 1190,
  'PT-Klipp - Gratis yta': 1190,
  'Konvertering från test till PT20 - Till kollega': 0,
  'Sen avbokning': 500,
  'Kroppss fett% tillägg': 450,
  'Kroppss fett% fristående': 690,
  'Blodanalys': 690,
  'Hb endast': 200,
  'Glucos endast': 150,
  'Blodfetter': 400,
  'Kostregistrering': 3990,
  'Kostrådgivning': 1250,
  'Natriumanalys (Svettest)': 1690,
};

// Dynamisk prisberäkning baserat på tjänst, gren och senior coach
export const calculatePrice = (
  service: ServiceType,
  sport: Sport,
  isSeniorCoach: boolean = false
): number => {
  const basePrice = SERVICE_BASE_PRICES[service] || 0;
  
  // Om det inte är en membership som påverkas av tester/senior coach, returnera baspriset
  if (!service.includes('Premium') && !service.includes('Supreme') && !service.includes('Standard TRI')) {
    return basePrice;
  }
  
  const hasExtended = hasExtendedTests(sport);
  let finalPrice = basePrice;
  
  // Standard memberships
  if (service === 'Membership Standard') {
    finalPrice = hasExtended ? 1295 : 1195;
  }
  
  // Premium memberships
  if (service === 'Membership Premium' || service === 'Membership Premium TRI/OCR/MULTI') {
    if (isSeniorCoach && hasExtended) {
      finalPrice = 2795;
    } else if (isSeniorCoach) {
      finalPrice = 2695;
    } else if (hasExtended) {
      finalPrice = 2295;
    } else {
      finalPrice = 2195;
    }
  }
  
  // Supreme memberships
  if (service === 'Membership Supreme' || service === 'Membership Supreme TRI/OCR/MULTI') {
    if (isSeniorCoach && hasExtended) {
      finalPrice = 3895;
    } else if (isSeniorCoach) {
      finalPrice = 3795;
    } else if (hasExtended) {
      finalPrice = 3395;
    } else {
      finalPrice = 3295;
    }
  }
  
  return finalPrice;
};

// Bakåtkompatibilitet - använd calculatePrice med defaults
export const SERVICE_PRICES = SERVICE_BASE_PRICES;

// Hjälpfunktion för att avgöra om en tjänst är ett test
export const isTestService = (service: string): boolean => {
  return TESTS.includes(service as any);
};

// Hjälpfunktion för att avgöra om en tjänst är ett membership
export const isMembershipService = (service: string): boolean => {
  return MEMBERSHIPS.includes(service as any);
};

// Hjälpfunktion för att avgöra om en gren har utökade tester
export const hasExtendedTests = (sport: Sport): boolean => {
  return ['Triathlon', 'OCR', 'Multisport'].includes(sport);
};

// Hjälpfunktion för att visa vilka tester som ingår
export const getTestType = (service: ServiceType, sport: Sport): string => {
  const isExtended = hasExtendedTests(sport);
  
  if (service.includes('TRI/OCR/MULTI')) {
    return 'Utökade tester';
  }
  
  if (service.includes('Premium') || service.includes('Supreme')) {
    return isExtended ? 'Utökade tester' : 'Standard tester';
  }
  
  if (service.includes('Standard') || service.includes('BAS')) {
    return 'Standard tester';
  }
  
  return '';
};

export const SERVICE_COLORS: Record<string, string> = {
  // Memberships
  'Membership Standard': 'bg-blue-600',
  'Membership Standard TRI/OCR/MULTI': 'bg-blue-500',
  'Programskrivning Membership Standard': 'bg-blue-400',
  'Membership Premium': 'bg-purple-600',
  'Membership Premium TRI/OCR/MULTI': 'bg-purple-500',
  'Membership Supreme': 'bg-indigo-600',
  'Membership Supreme TRI/OCR/MULTI': 'bg-indigo-500',
  'Membership Life': 'bg-emerald-600',
  'Membership Aktivitus Iform 4 mån': 'bg-teal-600',
  'Membership Aktivitus Iform Tillägg till MS 4 mån': 'bg-teal-500',
  'Membership Iform Extra månad': 'bg-teal-400',
  'Membership Aktivitus Iform Fortsättning': 'bg-teal-700',
  'Membership BAS': 'bg-gray-600',
  'Membership Avslut NOTERA SLUTDATUM': 'bg-red-600',
  'Save - Samtal - Standard': 'bg-cyan-600',
  'Membership Utan tester': 'bg-slate-600',
  'Membership Uppstart Coaching -  Test redan gjort och betalt': 'bg-sky-600',
  'Konvertering från test till membership - Till kollega': 'bg-violet-600',
  'Iform innan prisjusteringen - Sista testmomenten 2,5 h': 'bg-teal-800',
  'Iform uppstart/återtest/coachtimme MS utförd av någon annan - Minus 1 h tid': 'bg-red-400',
  'Iform uppstart/återtest/coachtimme MS utförd till någon annan - Plus 1 h tid': 'bg-green-400',
  
  // Tests
  'Tröskeltest': 'bg-orange-600',
  'Tröskeltest + VO2max': 'bg-orange-500',
  'Tröskeltest Triathlon': 'bg-amber-600',
  'Tröskeltest Triathlon + VO2max': 'bg-amber-500',
  'VO2max fristående': 'bg-lime-600',
  'VO2max tillägg': 'bg-lime-500',
  'Wingate fristående': 'bg-yellow-600',
  'Wingatetest tillägg': 'bg-yellow-500',
  'Styrketest tillägg': 'bg-red-500',
  'Teknikanalys tillägg': 'bg-pink-500',
  'Teknikanalys': 'bg-pink-600',
  'Funktionsanalys': 'bg-fuchsia-600',
  'Funktions- och löpteknikanalys': 'bg-fuchsia-500',
  'Hälsopaket': 'bg-rose-600',
  'Sommardubbel': 'bg-green-600',
  'Sommardubbel Tri': 'bg-green-500',
  'Träningsprogram Sommardubbel 1500kr': 'bg-green-400',
  'Personlig Träning 1 - Betald yta': 'bg-cyan-700',
  'Personlig Träning 1 - Gratis yta': 'bg-cyan-600',
  'Personlig Träning 5': 'bg-cyan-500',
  'Personlig Träning 10': 'bg-cyan-400',
  'Personlig Träning 20': 'bg-cyan-300',
  'PT-Klipp - Betald yta': 'bg-sky-700',
  'PT-Klipp - Gratis yta': 'bg-sky-600',
  'Konvertering från test till PT20 - Till kollega': 'bg-indigo-400',
  'Sen avbokning': 'bg-red-700',
  'Kroppss fett% tillägg': 'bg-orange-400',
  'Kroppss fett% fristående': 'bg-orange-300',
  'Blodanalys': 'bg-rose-500',
  'Hb endast': 'bg-rose-400',
  'Glucos endast': 'bg-rose-300',
  'Blodfetter': 'bg-pink-400',
  'Kostregistrering': 'bg-violet-500',
  'Kostrådgivning': 'bg-violet-400',
  'Natriumanalys (Svettest)': 'bg-amber-400',
};

