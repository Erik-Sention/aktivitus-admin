/**
 * Service Structure Configuration
 * 
 * Uppdatera denna fil för att ändra hur tjänsterna kategoriseras i dropdown-menyn.
 * 
 * Struktur:
 * - Huvudkategori (vänster kolumn): Memberships, Tester, Personlig Träning, Kost & Nutrition, Övrigt
 * - Sub-kategori (mittenkolumn): Standard, Premium, Tröskeltest, etc.
 * - Tjänst (höger kolumn): De faktiska tjänsterna
 */

export interface ServiceStructure {
  [mainCategory: string]: {
    [subCategory: string]: string[];
  };
}

export const SERVICE_STRUCTURE: ServiceStructure = {
  'Memberships': {
    'Standard': [
      'Membership Standard',
      'Membership Standard TRI/OCR/MULTI',
      'Programskrivning Membership Standard',
      'Save - Samtal - Standard',
    ],
    'Premium': [
      'Membership Premium',
      'Membership Premium TRI/OCR/MULTI',
    ],
    'Supreme': [
      'Membership Supreme',
      'Membership Supreme TRI/OCR/MULTI',
      'Membership Life',
    ],
    'Iform': [
      'Membership Aktivitus Iform 4 mån',
      'Membership Aktivitus Iform Tillägg till MS 4 mån',
      'Membership Iform Extra månad',
      'Membership Aktivitus Iform Fortsättning',
      'Iform innan prisjusteringen - Sista testmomenten 2,5 h',
      'Iform uppstart/återtest/coachtimme MS utförd av någon annan - Minus 1 h tid',
      'Iform uppstart/återtest/coachtimme MS utförd till någon annan - Plus 1 h tid',
    ],
    'BAS': [
      'Membership BAS',
    ],
    'Hantering': [
      'Membership Avslut NOTERA SLUTDATUM',
      'Membership Utan tester',
      'Membership Uppstart Coaching -  Test redan gjort och betalt',
      'Konvertering från test till membership - Till kollega',
    ],
  },
  'Tester': {
    'Tröskeltest': [
      'Tröskeltest',
      'Tröskeltest + VO2max',
      'Tröskeltest Triathlon',
      'Tröskeltest Triathlon + VO2max',
    ],
    'VO2max': [
      'VO2max fristående',
      'VO2max tillägg',
    ],
    'Wingate & Styrka': [
      'Wingate fristående',
      'Wingatetest tillägg',
      'Styrketest tillägg',
    ],
    'Teknik & Funktion': [
      'Teknikanalys',
      'Teknikanalys tillägg',
      'Funktionsanalys',
      'Funktions- och löpteknikanalys',
    ],
    'Kroppsanalys': [
      'Kroppss fett% fristående',
      'Kroppss fett% tillägg',
    ],
    'Blodanalys': [
      'Blodanalys',
      'Hb endast',
      'Glucos endast',
      'Blodfetter',
      'Natriumanalys (Svettest)',
    ],
    'Hälso- & Testpaket': [
      'Hälsopaket',
      'Sommardubbel',
      'Sommardubbel Tri',
      'Träningsprogram Sommardubbel 1500kr',
    ],
  },
  'Personlig Träning': {
    'Enskilda Pass': [
      'Personlig Träning 1 - Betald yta',
      'Personlig Träning 1 - Gratis yta',
      'PT-Klipp - Betald yta',
      'PT-Klipp - Gratis yta',
    ],
    'Paket': [
      'Personlig Träning 5',
      'Personlig Träning 10',
      'Personlig Träning 20',
      'Konvertering från test till PT20 - Till kollega',
    ],
  },
  'Kost & Nutrition': {
    'Kostanalys': [
      'Kostregistrering',
      'Kostrådgivning',
    ],
  },
  'Övrigt': {
    'Administration': [
      'Sen avbokning',
    ],
  },
};

/**
 * Hjälpfunktion för att hitta vilken kategori en tjänst tillhör
 */
export function findServiceCategory(serviceName: string): { mainCategory: string; subCategory: string } | null {
  for (const [mainCategory, subCategories] of Object.entries(SERVICE_STRUCTURE)) {
    for (const [subCategory, services] of Object.entries(subCategories)) {
      if (services.includes(serviceName)) {
        return { mainCategory, subCategory };
      }
    }
  }
  return null;
}

/**
 * Hämta alla tjänster från strukturen
 */
export function getAllServicesFromStructure(): string[] {
  const allServices: string[] = [];
  for (const subCategories of Object.values(SERVICE_STRUCTURE)) {
    for (const services of Object.values(subCategories)) {
      allServices.push(...services);
    }
  }
  return allServices;
}
