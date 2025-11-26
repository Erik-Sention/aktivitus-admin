// Utility för att importera mock-data till Firebase Realtime Database
// Kör detta en gång för att fylla databasen med testdata

import { ref, push, set } from 'firebase/database';
import { db } from './firebase';
import { addCustomer } from './realtimeDatabase';
import { generateMockCustomers } from './generateMockCustomers';
import { Customer } from '@/types';

export async function seedDatabase(count: number = 100) {
  try {
    const mockCustomers = generateMockCustomers(count);

    let success = 0;
    let errors = 0;
    const maxRetries = 3;
    
    for (const customer of mockCustomers) {
      let retryCount = 0;
      let customerAdded = false;
      
      while (retryCount < maxRetries && !customerAdded) {
        try {
          // Ta bort id eftersom Firebase skapar sitt eget
          const { id, ...customerWithoutId } = customer;
          
          await addCustomer(customerWithoutId);
          success++;
          customerAdded = true;
        } catch (error: any) {
          retryCount++;
          if (retryCount >= maxRetries) {
            errors++;
          } else {
            // Vänta lite innan retry
            await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
          }
        }
      }
    }

    return { success, errors, total: mockCustomers.length };
  } catch (error: any) {
    return { success: 0, errors: 1, total: 0, error: error.message };
  }
}

// För att köra detta, lägg till en knapp i UI eller kör i browser console:
// import { seedDatabase } from '@/lib/seedData';
// seedDatabase();

