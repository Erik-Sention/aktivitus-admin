// Testfunktion för att verifiera Firebase-anslutning
// Använd denna i browser console för att testa Firebase

import { ref, set, get } from 'firebase/database';
import { db } from './firebase';

export const testFirebaseWrite = async () => {
  try {
    console.log('🔵 Testar Firebase-anslutning...');
    console.log('🔵 Database URL:', process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL);
    console.log('🔵 API Key:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.substring(0, 20) + '...');
    
    // Testa att skriva till Firebase
    const testRef = ref(db, 'test/write-test');
    await set(testRef, {
      message: 'Test från app',
      timestamp: new Date().toISOString(),
    });
    
    console.log('✅ Testdata skriven till Firebase!');
    
    // Läs tillbaka
    const snapshot = await get(testRef);
    console.log('✅ Data läst från Firebase:', snapshot.val());
    
    return true;
  } catch (error: any) {
    console.error('❌ Firebase test misslyckades:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    return false;
  }
};

// Exportera till window för enkel åtkomst i browser console
if (typeof window !== 'undefined') {
  (window as any).testFirebase = testFirebaseWrite;
}

