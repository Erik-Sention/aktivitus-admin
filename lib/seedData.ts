// Utility för att importera mock-data till Firebase
// Kör detta en gång för att fylla databasen med testdata

import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

// Try to import mockData, but fallback to empty array if it doesn't exist
let mockCustomers: any[] = [];
try {
  const mockData = require('./mockData');
  mockCustomers = mockData.mockCustomers || [];
} catch (e) {
  // mockData.ts doesn't exist (e.g., in production build)
  console.warn('mockData.ts saknas - seedDatabase kommer inte att fungera');
  mockCustomers = [];
}

export async function seedDatabase() {
  try {
    if (mockCustomers.length === 0) {
      console.warn('Ingen mockdata tillgänglig - seedDatabase kommer inte att importera något');
      return false;
    }

    console.log('Börjar importera mock-data till Firebase...');

    for (const customer of mockCustomers) {
      // Konvertera Date-objekt till Firestore Timestamps
      const customerData = {
        ...customer,
        date: Timestamp.fromDate(customer.date),
        createdAt: Timestamp.fromDate(customer.createdAt),
        updatedAt: Timestamp.fromDate(customer.updatedAt),
      };

      // Ta bort id eftersom Firebase skapar sitt eget
      const { id, ...customerWithoutId } = customerData;

      await addDoc(collection(db, 'customers'), customerWithoutId);
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

