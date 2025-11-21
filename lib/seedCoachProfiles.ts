// Seed-data för coach-profiler med huvudort och sekundär ort
import { saveCoachProfile, CoachProfile } from './coachProfiles';
import { PLACES } from './constants';

// Exempeldata för coacher - huvudort och sekundär ort
const coachPlaces: Record<string, { main: string; secondary?: string }> = {
  'Anders Carbonnier': { main: 'Stockholm', secondary: 'Falun' },
  'Jeff Frydenlund': { main: 'Stockholm' },
  'Jimmy Carlsson': { main: 'Stockholm', secondary: 'Linköping' },
  'Kenny Steger': { main: 'Stockholm' },
  'Micke Hanell': { main: 'Stockholm', secondary: 'Göteborg' },
  'Gusten Nilber': { main: 'Göteborg' },
  'Andreas Thell': { main: 'Malmö' },
  'Evelina Asplund': { main: 'Malmö', secondary: 'Göteborg' },
  'Isabella Hedberg': { main: 'Stockholm' },
  'Jessica Unogård': { main: 'Linköping' },
  'Andreas Nilsson': { main: 'Linköping', secondary: 'Stockholm' },
  'Johan Hasselmark': { main: 'Göteborg', secondary: 'Malmö' },
  'Evelina Järvinen': { main: 'Stockholm' },
  'Erik Olsson': { main: 'Göteborg' },
  'Gabriel Sandör': { main: 'Malmö' },
  'Jenny Nae': { main: 'Stockholm', secondary: 'Åre' },
  'Johan Nielsen': { main: 'Falun' },
  'Linda Linhart': { main: 'Stockholm' },
  'Linda Sjölund': { main: 'Göteborg' },
  'Morgan Björkqvist': { main: 'Malmö' },
  'Mattias Lundqvist': { main: 'Stockholm' },
  'Marika Wagner': { main: 'Göteborg' },
  'Maria Wahlberg': { main: 'Malmö' },
  'Olle Bengtström': { main: 'Linköping' },
  'Oliver Lindblom': { main: 'Stockholm', secondary: 'Falun' },
  'Sofie Bondesson': { main: 'Göteborg' },
  'Tove Larsson': { main: 'Malmö' },
  'Selma Jormin': { main: 'Stockholm' },
  'Arkatix Adgren': { main: 'Göteborg', secondary: 'Malmö' },
  'Laurens Hoffer': { main: 'Stockholm' },
  'Amy Whyte': { main: 'Malmö' },
  'Natalie Persson': { main: 'Göteborg' },
  'Mattias Pers': { main: 'Stockholm' },
  'Jennifer': { main: 'Linköping' },
};

// Funktion för att seeda coach-profiler med orter
export const seedCoachProfiles = () => {
  if (typeof window === 'undefined') return;
  
  Object.entries(coachPlaces).forEach(([coachName, places]) => {
    const existingProfile = localStorage.getItem('coachProfiles');
    const profiles = existingProfile ? JSON.parse(existingProfile) : {};
    
    // Skapa profil om den inte finns eller uppdatera orter
    if (!profiles[coachName] || !profiles[coachName].mainPlace) {
      const profile: CoachProfile = {
        name: coachName,
        hourlyRate: 375,
        mainPlace: places.main,
        secondaryPlace: places.secondary,
        ...profiles[coachName], // Behåll befintlig data om den finns
      };
      
      saveCoachProfile(profile);
    }
  });
};

// Auto-seed när modulen laddas (endast i browser)
if (typeof window !== 'undefined') {
  // Seed endast om det inte redan finns profiler
  const existingProfiles = localStorage.getItem('coachProfiles');
  if (!existingProfiles || Object.keys(JSON.parse(existingProfiles)).length === 0) {
    seedCoachProfiles();
  }
}

