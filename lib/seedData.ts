// Utility för att importera mock-data till Firebase Realtime Database
// Kör detta en gång för att fylla databasen med testdata

import { ref, push, set } from 'firebase/database';
import { db } from './firebase';
import { addCustomer } from './realtimeDatabase';
import { generateMockCustomers } from './generateMockCustomers';
import { Customer } from '@/types';

export async function seedDatabase(count: number = 200) {
  try {
    console.log(`🚀 Börjar generera ${count} mockkunder...`);
    
    const mockCustomers = generateMockCustomers(count);
    
    console.log(`✅ Genererade ${mockCustomers.length} kunder. Börjar importera till Firebase...`);

    let success = 0;
    let errors = 0;
    
    for (const customer of mockCustomers) {
      try {
        // Ta bort id eftersom Firebase skapar sitt eget
        const { id, ...customerWithoutId } = customer;
        
        await addCustomer(customerWithoutId);
        success++;
        
        if (success % 10 === 0) {
          console.log(`📊 Importerat ${success}/${mockCustomers.length} kunder...`);
        }
      } catch (error: any) {
        errors++;
        console.error(`❌ Fel vid import av ${customer.name}:`, error.message);
      }
    }

    console.log(`✅ Klar! ${success} kunder importerade, ${errors} fel.`);
    return { success, errors, total: mockCustomers.length };
  } catch (error: any) {
    console.error('❌ Fel vid import:', error);
    return { success: 0, errors: 1, total: 0, error: error.message };
  }
}

// För att köra detta, lägg till en knapp i UI eller kör i browser console:
// import { seedDatabase } from '@/lib/seedData';
// seedDatabase();

