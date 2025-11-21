// CSV Import utilities för Firebase Realtime Database
import { ref, set, push } from 'firebase/database';
import { db } from './firebase';
import { Customer, ServiceEntry } from '@/types';
import { CoachProfile } from './coachProfiles';

// Parse CSV text to array of objects
export function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  // Parse header
  const headers = lines[0].split(',').map(h => h.trim());
  
  // Parse rows
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  return rows;
}

// Import customers from CSV
export async function importCustomersFromCSV(csvText: string): Promise<{ success: number; errors: string[] }> {
  const rows = parseCSV(csvText);
  const errors: string[] = [];
  let success = 0;

  for (const row of rows) {
    try {
      const customerData: Omit<Customer, 'id'> = {
        name: row.name || '',
        email: row.email || '',
        phone: row.phone || undefined,
        date: new Date(row.date || new Date()),
        place: row.place as any,
        coach: row.coach || '',
        service: row.service as any,
        status: row.status as any,
        price: parseFloat(row.price || '0'),
        sport: row.sport as any,
        history: [],
        serviceHistory: row.serviceHistory ? (JSON.parse(row.serviceHistory) as ServiceEntry[]) : [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Validate required fields
      if (!customerData.name || !customerData.email || !customerData.service) {
        errors.push(`Rad saknar obligatoriska fält: ${row.name || 'Okänt'}`);
        continue;
      }

      const customersRef = ref(db, 'customers');
      const newCustomerRef = push(customersRef);
      
      const serviceHistoryArray: ServiceEntry[] = customerData.serviceHistory || [];
      
      await set(newCustomerRef, {
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone || null,
        date: customerData.date.toISOString(),
        place: customerData.place,
        coach: customerData.coach,
        service: customerData.service,
        status: customerData.status,
        price: customerData.price,
        sport: customerData.sport,
        history: customerData.history || [],
        serviceHistory: serviceHistoryArray.map((entry: ServiceEntry) => ({
          ...entry,
          date: entry.date instanceof Date ? entry.date.toISOString() : (typeof entry.date === 'string' ? entry.date : new Date(entry.date).toISOString()),
          nextInvoiceDate: entry.nextInvoiceDate ? (entry.nextInvoiceDate instanceof Date ? entry.nextInvoiceDate.toISOString() : (typeof entry.nextInvoiceDate === 'string' ? entry.nextInvoiceDate : new Date(entry.nextInvoiceDate).toISOString())) : undefined,
          paidUntil: entry.paidUntil ? (entry.paidUntil instanceof Date ? entry.paidUntil.toISOString() : (typeof entry.paidUntil === 'string' ? entry.paidUntil : new Date(entry.paidUntil).toISOString())) : undefined,
        })),
        isSeniorCoach: customerData.isSeniorCoach || false,
        createdAt: customerData.createdAt.toISOString(),
        updatedAt: customerData.updatedAt.toISOString(),
      });

      success++;
    } catch (error: any) {
      errors.push(`Fel vid import av ${row.name || 'okänd'}: ${error.message}`);
    }
  }

  return { success, errors };
}

// Import coach profiles from CSV
export async function importCoachesFromCSV(csvText: string): Promise<{ success: number; errors: string[] }> {
  const rows = parseCSV(csvText);
  const errors: string[] = [];
  let success = 0;

  for (const row of rows) {
    try {
      const coachProfile: CoachProfile = {
        name: row.name || '',
        hourlyRate: parseFloat(row.hourlyRate || '375'),
        isSeniorCoach: row.isSeniorCoach === 'true' || row.isSeniorCoach === '1',
        mainPlace: row.mainPlace || undefined,
        secondaryPlace: row.secondaryPlace || undefined,
        email: row.email || undefined,
        phone: row.phone || undefined,
        address: row.address || undefined,
        bankAccount: row.bankAccount || undefined,
        bankName: row.bankName || undefined,
        clearingNumber: row.clearingNumber || undefined,
        accountNumber: row.accountNumber || undefined,
        swishNumber: row.swishNumber || undefined,
        personalNumber: row.personalNumber || undefined,
        taxTable: row.taxTable || undefined,
        notes: row.notes || undefined,
      };

      if (!coachProfile.name) {
        errors.push(`Rad saknar coach-namn`);
        continue;
      }

      // Save to Realtime Database
      await set(ref(db, `coachProfiles/${coachProfile.name}`), coachProfile);
      success++;
    } catch (error: any) {
      errors.push(`Fel vid import av ${row.name || 'okänd'}: ${error.message}`);
    }
  }

  return { success, errors };
}

// Import services/prices from CSV
export async function importServicesFromCSV(csvText: string): Promise<{ success: number; errors: string[] }> {
  const rows = parseCSV(csvText);
  const errors: string[] = [];
  let success = 0;

  for (const row of rows) {
    try {
      const serviceData = {
        service: row.service || '',
        basePrice: parseFloat(row.basePrice || '0'),
        category: row.category || 'other',
        description: row.description || '',
        updatedAt: new Date().toISOString(),
      };

      if (!serviceData.service || serviceData.basePrice === 0) {
        errors.push(`Rad saknar service eller pris: ${row.service || 'Okänt'}`);
        continue;
      }

      // Save to Realtime Database
      await set(ref(db, `services/${serviceData.service.replace(/\//g, '_')}`), serviceData);
      success++;
    } catch (error: any) {
      errors.push(`Fel vid import av ${row.service || 'okänd'}: ${error.message}`);
    }
  }

  return { success, errors };
}

