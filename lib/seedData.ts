// Utility för att importera mock-data till Firebase Realtime Database
// Kör detta en gång för att fylla databasen med testdata

import { ref, push, set } from 'firebase/database';
import { db } from './firebase';

// Mock customers - empty by default
// mockData.ts is in .gitignore and won't be available in production builds
const mockCustomers: any[] = [];

export async function seedDatabase() {
  try {
    if (mockCustomers.length === 0) {
      console.warn('Ingen mockdata tillgänglig - seedDatabase kommer inte att importera något');
      return false;
    }

    console.log('Börjar importera mock-data till Firebase...');

    const customersRef = ref(db, 'customers');
    
    for (const customer of mockCustomers) {
      // Konvertera Date-objekt till ISO-strängar för Realtime Database
      const customerData = {
        ...customer,
        date: customer.date instanceof Date ? customer.date.toISOString() : customer.date,
        createdAt: customer.createdAt instanceof Date ? customer.createdAt.toISOString() : customer.createdAt,
        updatedAt: customer.updatedAt instanceof Date ? customer.updatedAt.toISOString() : customer.updatedAt,
      };

      // Ta bort id eftersom Firebase skapar sitt eget
      const { id, ...customerWithoutId } = customerData;
      const newCustomerRef = push(customersRef);

      await set(newCustomerRef, customerWithoutId);
      console.log(`✓ Lade till: ${customer.name}`);
    }

    console.log('✅ Alla kunder har importerats!');
    return true;
  } catch (error) {
    console.error('❌ Fel vid import:', error);
    return false;
  }
}

// För att köra detta, lägg till en knapp i UI eller kör i browser console:
// import { seedDatabase } from '@/lib/seedData';
// seedDatabase();

