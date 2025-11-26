// Mappning mellan coach-initialer och fullständiga namn
// Nu hämtas coacher från Firebase istället för hårdkodade värden

// Cache för coach-namn från Firebase
let coachNamesCache: string[] = [];
let coachNamesCacheInitialized = false;

// Hämta coach-namn från Firebase
const loadCoachNamesFromFirebase = async (): Promise<string[]> => {
  try {
    const { getAllCoachNames } = await import('./realtimeDatabase');
    const names = await getAllCoachNames();
    coachNamesCache = names;
    coachNamesCacheInitialized = true;
    return names;
  } catch (error) {
    // Error loading coach names
    return [];
  }
};

// Initiera cache och prenumerera på uppdateringar
if (typeof window !== 'undefined' && !coachNamesCacheInitialized) {
  coachNamesCacheInitialized = true;
  
  // Ladda initial data
  loadCoachNamesFromFirebase().catch(() => {
    // Ignorera fel vid initial laddning
  });
  
  // Prenumerera på realtidsuppdateringar
  import('./realtimeDatabase').then(({ subscribeToCoachProfiles }) => {
    subscribeToCoachProfiles((profiles) => {
      coachNamesCache = Object.keys(profiles).sort();
    });
  }).catch(() => {
    // Ignorera fel vid subscription
  });
}

// Hämta alla coach-namn (från cache eller Firebase)
export const getAllCoaches = async (): Promise<string[]> => {
  if (coachNamesCache.length > 0) {
    return coachNamesCache;
  }
  return await loadCoachNamesFromFirebase();
};

// Synkron version (använder cache)
export const getAllCoachesSync = (): string[] => {
  return coachNamesCache;
};

// Hämta fullständigt namn från initialer eller namn
export const getCoachFullName = (coach: string): string => {
  // Om det redan är ett fullständigt namn (finns i cache), returnera det
  if (coachNamesCache.includes(coach)) {
    return coach;
  }
  // Annars returnera som det är (kan vara initialer eller namn)
  return coach;
};

// Hämta initialer från fullständigt namn (genererar från första bokstäverna)
export const getCoachInitials = (coach: string): string => {
  // Om det redan är initialer (kort sträng), returnera det
  if (coach.length <= 3) {
    return coach;
  }
  // Generera initialer från namn (första bokstaven i varje ord)
  const words = coach.split(' ');
  if (words.length >= 2) {
    return words.map(w => w[0]?.toUpperCase() || '').join('');
  }
  return coach.substring(0, 2).toUpperCase();
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


