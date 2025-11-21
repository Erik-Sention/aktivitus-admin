// Mappning mellan coach-initialer och fullständiga namn
import { COACHES } from './constants';

// Mappning från initialer till fullständiga namn
export const COACH_INITIALS_TO_NAME: Record<string, string> = {
  'AC': 'Anders Carbonnier',
  'AM': 'Axel Mattson',
  'AN': 'Andreas Nilsson',
  'AP': 'Anton Persson',
  'AT': 'Andreas Thell',
  'EA': 'Evelina Asplund',
  'EB': 'Emma Belforth',
  'EJ': 'Evelina Järvinen',
  'EO': 'Erik Olsson',
  'GN': 'Gusten Nilber',
  'GS': 'Gabriel Sandör',
  'IH': 'Isabella Hedberg',
  'JC': 'Jimmy Carlsson',
  'JF': 'Jeff Frydenlund',
  'JH': 'Johan Hasselmark',
  'JN': 'Jenny Nae',
  'JNi': 'Johan Nielsen',
  'JU': 'Jessica Unogård',
  'KS': 'Kenny Steger',
  'LL': 'Linda Linhart',
  'LS': 'Linda Sjölund',
  'MB': 'Morgan Björkqvist',
  'MH': 'Micke Hanell',
  'ML': 'Mattias Lundqvist',
  'MW': 'Marika Wagner',
  'MaW': 'Maria Wahlberg',
  'OB': 'Olle Bengtström',
  'OL': 'Oliver Lindblom',
  'SB': 'Sofie Bondesson',
  'TL': 'Tove Larsson',
  'SJ': 'Selma Jormin',
  'AA': 'Arkatix Adgren',
  'LH': 'Laurens Hoffer',
  'AW': 'Amy Whyte',
  'NP': 'Natalie Persson',
  'MP': 'Mattias Pers',
  'J': 'Jennifer',
};

// Mappning från fullständiga namn till initialer
export const COACH_NAME_TO_INITIALS: Record<string, string> = Object.fromEntries(
  Object.entries(COACH_INITIALS_TO_NAME).map(([initials, name]) => [name, initials])
);

// Hämta fullständigt namn från initialer
export const getCoachFullName = (coach: string): string => {
  // Om det redan är ett fullständigt namn, returnera det
  if (COACHES.includes(coach)) {
    return coach;
  }
  // Annars försök hitta via initialer
  return COACH_INITIALS_TO_NAME[coach] || coach;
};

// Hämta initialer från fullständigt namn
export const getCoachInitials = (coach: string): string => {
  // Om det redan är initialer, returnera dem
  if (coach.length <= 3 && COACH_INITIALS_TO_NAME[coach]) {
    return coach;
  }
  // Annars försök hitta via namn
  return COACH_NAME_TO_INITIALS[coach] || coach;
};

// Hämta alla unika coacher från kunddata
export const getAllCoachesFromCustomers = (customers: any[]): string[] => {
  const coachSet = new Set<string>();
  customers.forEach(customer => {
    if (customer.coach) {
      coachSet.add(getCoachFullName(customer.coach));
    }
  });
  return Array.from(coachSet).sort();
};

