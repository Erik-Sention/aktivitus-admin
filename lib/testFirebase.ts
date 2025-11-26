// Testfunktion för att verifiera Firebase-anslutning
// Använd denna i browser console för att testa Firebase

import { ref, set, get } from 'firebase/database';
import { db } from './firebase';

export const testFirebaseWrite = async () => {
  try {
    // Testa att skriva till Firebase
    const testRef = ref(db, 'test/write-test');
    await set(testRef, {
      message: 'Test från app',
      timestamp: new Date().toISOString(),
    });
    
    // Läs tillbaka
    const snapshot = await get(testRef);
    
    return true;
  } catch (error: any) {
    // Logga inte felmeddelanden som kan avslöja databasinformation
    return false;
  }
};

// Exportera till window för enkel åtkomst i browser console
if (typeof window !== 'undefined') {
  (window as any).testFirebase = testFirebaseWrite;
}

