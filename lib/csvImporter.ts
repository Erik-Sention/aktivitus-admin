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
  
  // Parse rows - hantera tomma värden korrekt
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Hoppa över tomma rader
    
    // Enkel CSV-parsing (hantera kommatecken korrekt)
    const values: string[] = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim()); // Lägg till sista värdet
    
    // Säkerställ att vi har rätt antal värden (fyll med tomma strängar om nödvändigt)
    while (values.length < headers.length) {
      values.push('');
    }
    
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      const value = values[index] || '';
      // Behåll tomma strängar som tomma strängar (inte undefined)
      row[header] = value;
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
      if (!row.name || row.name.trim() === '') {
        errors.push(`Rad ${success + errors.length + 1} saknar coach-namn`);
        continue;
      }

      // Bygg coach-profil och ta bort tomma värden direkt
      const cleanedProfile: any = {
        name: row.name.trim(),
        hourlyRate: row.hourlyRate && row.hourlyRate.trim() !== '' ? parseFloat(row.hourlyRate) : 375,
        isSeniorCoach: row.isSeniorCoach === 'true' || row.isSeniorCoach === '1',
      };

      // Lägg bara till fält som har värden (inte tomma strängar eller undefined)
      if (row.mainPlace && row.mainPlace.trim() !== '') cleanedProfile.mainPlace = row.mainPlace.trim();
      if (row.secondaryPlace && row.secondaryPlace.trim() !== '') cleanedProfile.secondaryPlace = row.secondaryPlace.trim();
      if (row.email && row.email.trim() !== '') cleanedProfile.email = row.email.trim();
      if (row.phone && row.phone.trim() !== '') cleanedProfile.phone = row.phone.trim();
      if (row.address && row.address.trim() !== '') cleanedProfile.address = row.address.trim();
      if (row.bankAccount && row.bankAccount.trim() !== '') cleanedProfile.bankAccount = row.bankAccount.trim();
      if (row.bankName && row.bankName.trim() !== '') cleanedProfile.bankName = row.bankName.trim();
      if (row.clearingNumber && row.clearingNumber.trim() !== '') cleanedProfile.clearingNumber = row.clearingNumber.trim();
      if (row.accountNumber && row.accountNumber.trim() !== '') cleanedProfile.accountNumber = row.accountNumber.trim();
      if (row.swishNumber && row.swishNumber.trim() !== '') cleanedProfile.swishNumber = row.swishNumber.trim();
      if (row.personalNumber && row.personalNumber.trim() !== '') cleanedProfile.personalNumber = row.personalNumber.trim();
      if (row.taxTable && row.taxTable.trim() !== '') cleanedProfile.taxTable = row.taxTable.trim();
      if (row.notes && row.notes.trim() !== '') cleanedProfile.notes = row.notes.trim();
      
      // Save to Realtime Database
      await set(ref(db, `coachProfiles/${cleanedProfile.name}`), cleanedProfile);
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

