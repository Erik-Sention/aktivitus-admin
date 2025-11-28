// Automatisk seedning av coacher och tjänster till Firebase Realtime Database
import { ref, set } from 'firebase/database';
import { db } from './firebase';
import { CoachProfile } from './coachProfiles';
import { TIME_BUDGETS } from './timeBudgets';

// Coach-data med orter
const coachData: Array<{ name: string; mainPlace: string; secondaryPlace?: string }> = [
  { name: 'Anders Carbonnier', mainPlace: 'Stockholm', secondaryPlace: 'Falun' },
  { name: 'Jeff Frydenlund', mainPlace: 'Stockholm' },
  { name: 'Jimmy Carlsson', mainPlace: 'Stockholm', secondaryPlace: 'Linköping' },
  { name: 'Kenny Steger', mainPlace: 'Stockholm' },
  { name: 'Micke Hanell', mainPlace: 'Stockholm', secondaryPlace: 'Göteborg' },
  { name: 'Gusten Nilber', mainPlace: 'Göteborg' },
  { name: 'Andreas Thell', mainPlace: 'Malmö' },
  { name: 'Evelina Asplund', mainPlace: 'Malmö', secondaryPlace: 'Göteborg' },
  { name: 'Isabella Hedberg', mainPlace: 'Stockholm' },
  { name: 'Jessica Unogård', mainPlace: 'Linköping' },
  { name: 'Andreas Nilsson', mainPlace: 'Linköping', secondaryPlace: 'Stockholm' },
  { name: 'Johan Hasselmark', mainPlace: 'Göteborg', secondaryPlace: 'Malmö' },
  { name: 'Evelina Järvinen', mainPlace: 'Stockholm' },
  { name: 'Erik Olsson', mainPlace: 'Göteborg' },
  { name: 'Gabriel Sandör', mainPlace: 'Malmö' },
  { name: 'Jenny Nae', mainPlace: 'Stockholm', secondaryPlace: 'Åre' },
  { name: 'Johan Nielsen', mainPlace: 'Falun' },
  { name: 'Linda Linhart', mainPlace: 'Stockholm' },
  { name: 'Linda Sjölund', mainPlace: 'Göteborg' },
  { name: 'Morgan Björkqvist', mainPlace: 'Malmö' },
  { name: 'Mattias Lundqvist', mainPlace: 'Stockholm' },
  { name: 'Marika Wagner', mainPlace: 'Göteborg' },
  { name: 'Maria Wahlberg', mainPlace: 'Malmö' },
  { name: 'Olle Bengtström', mainPlace: 'Linköping' },
  { name: 'Oliver Lindblom', mainPlace: 'Stockholm', secondaryPlace: 'Falun' },
  { name: 'Sofie Bondesson', mainPlace: 'Göteborg' },
  { name: 'Tove Larsson', mainPlace: 'Malmö' },
  { name: 'Selma Jormin', mainPlace: 'Stockholm' },
  { name: 'Arkatix Adgren', mainPlace: 'Göteborg', secondaryPlace: 'Malmö' },
  { name: 'Laurens Hoffer', mainPlace: 'Stockholm' },
  { name: 'Amy Whyte', mainPlace: 'Malmö' },
  { name: 'Natalie Persson', mainPlace: 'Göteborg' },
  { name: 'Mattias Pers', mainPlace: 'Stockholm' },
  { name: 'Jennifer', mainPlace: 'Linköping' },
];

// Tjänster och priser med tidsbudget
const servicesData: Array<{ service: string; basePrice: number; category: string; description: string; timeBudget?: number }> = [
  // Memberships - med tidsbudget från TIME_BUDGETS
  { service: 'Membership Standard', basePrice: 1195, category: 'membership', description: 'Standard medlemskap med grundläggande tester', timeBudget: TIME_BUDGETS['Membership Standard'] },
  { service: 'Membership Standard TRI/OCR/MULTI', basePrice: 1295, category: 'membership', description: 'Standard medlemskap för triathlon/OCR/multisport', timeBudget: TIME_BUDGETS['Membership Standard TRI/OCR/MULTI'] },
  { service: 'Programskrivning Membership Standard', basePrice: 1495, category: 'membership', description: 'Standard medlemskap med programskrivning', timeBudget: TIME_BUDGETS['Programskrivning Membership Standard'] },
  { service: 'Membership Premium', basePrice: 2195, category: 'membership', description: 'Premium medlemskap med utökade tester', timeBudget: TIME_BUDGETS['Membership Premium'] },
  { service: 'Membership Premium TRI/OCR/MULTI', basePrice: 2295, category: 'membership', description: 'Premium medlemskap för triathlon/OCR/multisport', timeBudget: TIME_BUDGETS['Membership Premium TRI/OCR/MULTI'] },
  { service: 'Membership Supreme', basePrice: 3295, category: 'membership', description: 'Supreme medlemskap med alla tester', timeBudget: TIME_BUDGETS['Membership Supreme'] },
  { service: 'Membership Supreme TRI/OCR/MULTI', basePrice: 3395, category: 'membership', description: 'Supreme medlemskap för triathlon/OCR/multisport', timeBudget: TIME_BUDGETS['Membership Supreme TRI/OCR/MULTI'] },
  { service: 'Membership Life', basePrice: 333, category: 'membership', description: 'Livslångt medlemskap', timeBudget: TIME_BUDGETS['Membership Life'] },
  { service: 'Membership Aktivitus Iform 4 mån', basePrice: 1998, category: 'membership', description: 'Iform medlemskap 4 månader', timeBudget: TIME_BUDGETS['Membership Aktivitus Iform 4 mån'] },
  { service: 'Membership Aktivitus Iform Tillägg till MS 4 mån', basePrice: 1748, category: 'membership', description: 'Iform tillägg till Membership Standard 4 månader', timeBudget: TIME_BUDGETS['Membership Aktivitus Iform Tillägg till MS 4 mån'] },
  { service: 'Membership Iform Extra månad', basePrice: 499, category: 'membership', description: 'Iform extra månad', timeBudget: TIME_BUDGETS['Membership Iform Extra månad'] },
  { service: 'Membership Aktivitus Iform Fortsättning', basePrice: 990, category: 'membership', description: 'Iform fortsättning', timeBudget: TIME_BUDGETS['Membership Aktivitus Iform Fortsättning'] },
  { service: 'Membership BAS', basePrice: 250, category: 'membership', description: 'BAS medlemskap', timeBudget: TIME_BUDGETS['Membership BAS'] },
  { service: 'Membership Avslut NOTERA SLUTDATUM', basePrice: 0, category: 'membership', description: 'Medlemskap avslut - notera slutdatum', timeBudget: TIME_BUDGETS['Membership Avslut NOTERA SLUTDATUM'] },
  { service: 'Save - Samtal - Standard', basePrice: 0, category: 'membership', description: 'Save samtal standard', timeBudget: TIME_BUDGETS['Save - Samtal - Standard'] },
  { service: 'Membership Utan tester', basePrice: 1595, category: 'membership', description: 'Medlemskap utan tester', timeBudget: TIME_BUDGETS['Membership Utan tester'] },
  { service: 'Membership Uppstart Coaching -  Test redan gjort och betalt', basePrice: 1795, category: 'membership', description: 'Uppstart coaching med test redan gjort', timeBudget: TIME_BUDGETS['Membership Uppstart Coaching -  Test redan gjort och betalt'] },
  { service: 'Konvertering från test till membership - Till kollega', basePrice: 0, category: 'membership', description: 'Konvertering från test till membership', timeBudget: TIME_BUDGETS['Konvertering från test till membership - Till kollega'] },
  { service: 'Iform innan prisjusteringen - Sista testmomenten 2,5 h', basePrice: 1998, category: 'membership', description: 'Iform innan prisjustering', timeBudget: TIME_BUDGETS['Iform innan prisjusteringen - Sista testmomenten 2,5 h'] },
  { service: 'Iform uppstart/återtest/coachtimme MS utförd av någon annan - Minus 1 h tid', basePrice: 0, category: 'membership', description: 'Iform uppstart utförd av annan', timeBudget: TIME_BUDGETS['Iform uppstart/återtest/coachtimme MS utförd av någon annan - Minus 1 h tid'] },
  { service: 'Iform uppstart/återtest/coachtimme MS utförd till någon annan - Plus 1 h tid', basePrice: 0, category: 'membership', description: 'Iform uppstart utförd till annan', timeBudget: TIME_BUDGETS['Iform uppstart/återtest/coachtimme MS utförd till någon annan - Plus 1 h tid'] },
  // Tests - med tidsbudget från TIME_BUDGETS
  { service: 'Tröskeltest', basePrice: 1890, category: 'test', description: 'Grundläggande tröskeltest', timeBudget: TIME_BUDGETS['Tröskeltest'] },
  { service: 'Tröskeltest + VO2max', basePrice: 2490, category: 'test', description: 'Tröskeltest med VO2max', timeBudget: TIME_BUDGETS['Tröskeltest + VO2max'] },
  { service: 'Tröskeltest Triathlon', basePrice: 2690, category: 'test', description: 'Tröskeltest för triathlon', timeBudget: TIME_BUDGETS['Tröskeltest Triathlon'] },
  { service: 'Tröskeltest Triathlon + VO2max', basePrice: 3290, category: 'test', description: 'Tröskeltest triathlon med VO2max', timeBudget: TIME_BUDGETS['Tröskeltest Triathlon + VO2max'] },
  { service: 'VO2max fristående', basePrice: 1390, category: 'test', description: 'VO2max test fristående', timeBudget: TIME_BUDGETS['VO2max fristående'] },
  { service: 'VO2max tillägg', basePrice: 600, category: 'test', description: 'VO2max tillägg till tröskeltest', timeBudget: TIME_BUDGETS['VO2max tillägg'] },
  { service: 'Wingate fristående', basePrice: 490, category: 'test', description: 'Wingate test fristående', timeBudget: TIME_BUDGETS['Wingate fristående'] },
  { service: 'Wingatetest tillägg', basePrice: 350, category: 'test', description: 'Wingate tillägg', timeBudget: TIME_BUDGETS['Wingatetest tillägg'] },
  { service: 'Styrketest tillägg', basePrice: 600, category: 'test', description: 'Styrketest tillägg', timeBudget: TIME_BUDGETS['Styrketest tillägg'] },
  { service: 'Teknikanalys tillägg', basePrice: 650, category: 'test', description: 'Teknikanalys tillägg', timeBudget: TIME_BUDGETS['Teknikanalys tillägg'] },
  { service: 'Teknikanalys', basePrice: 1290, category: 'test', description: 'Teknikanalys fristående', timeBudget: TIME_BUDGETS['Teknikanalys'] },
  { service: 'Funktionsanalys', basePrice: 1790, category: 'test', description: 'Funktionsanalys', timeBudget: TIME_BUDGETS['Funktionsanalys'] },
  { service: 'Funktions- och löpteknikanalys', basePrice: 2290, category: 'test', description: 'Funktions- och löpteknikanalys', timeBudget: TIME_BUDGETS['Funktions- och löpteknikanalys'] },
  { service: 'Hälsopaket', basePrice: 1990, category: 'test', description: 'Hälsopaket', timeBudget: TIME_BUDGETS['Hälsopaket'] },
  { service: 'Sommardubbel', basePrice: 2990, category: 'test', description: 'Sommardubbel testpaket', timeBudget: TIME_BUDGETS['Sommardubbel'] },
  { service: 'Sommardubbel Tri', basePrice: 4490, category: 'test', description: 'Sommardubbel triathlon', timeBudget: TIME_BUDGETS['Sommardubbel Tri'] },
  { service: 'Träningsprogram Sommardubbel 1500kr', basePrice: 1500, category: 'test', description: 'Träningsprogram sommartest', timeBudget: TIME_BUDGETS['Träningsprogram Sommardubbel 1500kr'] },
  { service: 'Kroppss fett% tillägg', basePrice: 450, category: 'test', description: 'Kroppsfettprocent tillägg', timeBudget: TIME_BUDGETS['Kroppss fett% tillägg'] },
  { service: 'Kroppss fett% fristående', basePrice: 690, category: 'test', description: 'Kroppsfettprocent fristående', timeBudget: TIME_BUDGETS['Kroppss fett% fristående'] },
  { service: 'Blodanalys', basePrice: 690, category: 'test', description: 'Blodanalys', timeBudget: TIME_BUDGETS['Blodanalys'] },
  { service: 'Hb endast', basePrice: 200, category: 'test', description: 'Hemoglobin endast', timeBudget: TIME_BUDGETS['Hb endast'] },
  { service: 'Glucos endast', basePrice: 150, category: 'test', description: 'Glukos endast', timeBudget: TIME_BUDGETS['Glucos endast'] },
  { service: 'Blodfetter', basePrice: 400, category: 'test', description: 'Blodfetter', timeBudget: TIME_BUDGETS['Blodfetter'] },
  { service: 'Natriumanalys (Svettest)', basePrice: 1690, category: 'test', description: 'Natriumanalys svettest', timeBudget: TIME_BUDGETS['Natriumanalys (Svettest)'] },
  // Training - med tidsbudget från TIME_BUDGETS
  { service: 'Personlig Träning 1 - Betald yta', basePrice: 1190, category: 'training', description: 'Personlig träning 1 pass betald yta', timeBudget: TIME_BUDGETS['Personlig Träning 1 - Betald yta'] },
  { service: 'Personlig Träning 1 - Gratis yta', basePrice: 1190, category: 'training', description: 'Personlig träning 1 pass gratis yta', timeBudget: TIME_BUDGETS['Personlig Träning 1 - Gratis yta'] },
  { service: 'Personlig Träning 5', basePrice: 5500, category: 'training', description: 'Personlig träning 5 pass', timeBudget: undefined },
  { service: 'Personlig Träning 10', basePrice: 10500, category: 'training', description: 'Personlig träning 10 pass', timeBudget: undefined },
  { service: 'Personlig Träning 20', basePrice: 19900, category: 'training', description: 'Personlig träning 20 pass', timeBudget: undefined },
  { service: 'PT-Klipp - Betald yta', basePrice: 1190, category: 'training', description: 'PT-klipp betald yta', timeBudget: TIME_BUDGETS['PT-Klipp - Betald yta'] },
  { service: 'PT-Klipp - Gratis yta', basePrice: 1190, category: 'training', description: 'PT-klipp gratis yta', timeBudget: TIME_BUDGETS['PT-Klipp - Gratis yta'] },
  { service: 'Konvertering från test till PT20 - Till kollega', basePrice: 0, category: 'training', description: 'Konvertering från test till PT20', timeBudget: TIME_BUDGETS['Konvertering från test till PT20 - Till kollega'] },
  // Other - med tidsbudget från TIME_BUDGETS
  { service: 'Sen avbokning', basePrice: 500, category: 'other', description: 'Sen avbokning avgift', timeBudget: TIME_BUDGETS['Sen avbokning'] },
  { service: 'Kostregistrering', basePrice: 3990, category: 'other', description: 'Kostregistrering', timeBudget: TIME_BUDGETS['Kostregistrering'] },
  { service: 'Kostrådgivning', basePrice: 1250, category: 'other', description: 'Kostrådgivning', timeBudget: TIME_BUDGETS['Kostrådgivning'] },
  { service: 'Genomgång eller testdel utförd av någon annan - Minus 30 min tid', basePrice: 0, category: 'other', description: 'Genomgång utförd av annan', timeBudget: TIME_BUDGETS['Genomgång eller testdel genomförd av annan'] },
  { service: 'Genomgång eller testdel utförd till någon annan - Plus 30 min tid', basePrice: 0, category: 'other', description: 'Genomgång utförd till annan', timeBudget: TIME_BUDGETS['Genomgång eller testdel utförd till någon annan'] },
];

// Hjälpfunktion för att dela upp namn i förnamn och efternamn
const splitName = (fullName: string): { firstName: string; lastName: string } => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    // Om bara ett namn finns, använd det som förnamn
    return { firstName: parts[0], lastName: '' };
  }
  // Första delen är förnamn, resten är efternamn
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName };
};

// Seed coacher till Firebase
export const seedCoachesToFirebase = async (): Promise<{ success: number; errors: string[] }> => {
  const errors: string[] = [];
  let success = 0;

  try {
    for (const coach of coachData) {
      try {
        const { firstName, lastName } = splitName(coach.name);
        const profile: CoachProfile = {
          firstName: firstName,
          lastName: lastName,
          name: coach.name, // Bakåtkompatibilitet
          hourlyRate: 375,
          isSeniorCoach: false,
          mainPlace: coach.mainPlace,
          secondaryPlace: coach.secondaryPlace,
        };

        // Ta bort undefined värden
        const cleanedProfile: any = {
          firstName: profile.firstName,
          lastName: profile.lastName,
          name: profile.name,
          hourlyRate: profile.hourlyRate,
          isSeniorCoach: profile.isSeniorCoach,
        };
        if (profile.mainPlace) cleanedProfile.mainPlace = profile.mainPlace;
        if (profile.secondaryPlace) cleanedProfile.secondaryPlace = profile.secondaryPlace;

        // Använd fullständigt namn som key för bakåtkompatibilitet
        await set(ref(db, `coachProfiles/${profile.name}`), cleanedProfile);
        success++;
      } catch (error: any) {
        errors.push(`Fel vid sparande av ${coach.name}: ${error.message}`);
      }
    }
  } catch (error: any) {
    errors.push(`Allmänt fel: ${error.message}`);
  }

  return { success, errors };
};

// Seed tjänster till Firebase
export const seedServicesToFirebase = async (): Promise<{ success: number; errors: string[] }> => {
  const errors: string[] = [];
  let success = 0;

  try {
    for (const service of servicesData) {
      try {
        const serviceDataToSave: any = {
          service: service.service,
          basePrice: service.basePrice,
          category: service.category,
          description: service.description,
          updatedAt: new Date().toISOString(),
        };
        
        // Lägg till tidsbudget om den finns
        if (service.timeBudget !== undefined) {
          serviceDataToSave.timeBudget = service.timeBudget;
        }

        // Använd service-namnet som key (ersätt problematiska tecken)
        const serviceKey = service.service.replace(/\//g, '_').replace(/\s+/g, '_');
        
        await set(ref(db, `services/${serviceKey}`), serviceDataToSave);
        success++;
      } catch (error: any) {
        errors.push(`Fel vid sparande av ${service.service}: ${error.message}`);
      }
    }
  } catch (error: any) {
    errors.push(`Allmänt fel: ${error.message}`);
  }

  return { success, errors };
};

// Seed allt till Firebase
export const seedAllToFirebase = async (): Promise<{ coaches: { success: number; errors: string[] }; services: { success: number; errors: string[] } }> => {
  const coachesResult = await seedCoachesToFirebase();
  const servicesResult = await seedServicesToFirebase();
  
  return {
    coaches: coachesResult,
    services: servicesResult,
  };
};

// Exportera till window för enkel åtkomst i browser console
if (typeof window !== 'undefined') {
  (window as any).seedFirebase = seedAllToFirebase;
  (window as any).seedCoaches = seedCoachesToFirebase;
  (window as any).seedServices = seedServicesToFirebase;
}
