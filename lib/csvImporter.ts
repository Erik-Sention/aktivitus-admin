// CSV Import utilities för Firebase Realtime Database
import { ref, set, push } from 'firebase/database';
import { db } from './firebase';
import { Customer, ServiceEntry } from '@/types';
import { CoachProfile } from './coachProfiles';
import { isTestService } from './constants';

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
    
    // CSV-parsing med korrekt hantering av escaped citattecken
    const values: string[] = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const nextChar = j < line.length - 1 ? line[j + 1] : '';
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped citattecken ("" i CSV blir " i värde)
          currentValue += '"';
          j++; // Hoppa över nästa citattecken
        } else {
          // Start eller slut på citerat värde
          inQuotes = !inQuotes;
        }
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
      const customerDate = row.date ? new Date(row.date) : new Date();
      const customerData: Omit<Customer, 'id'> = {
        name: row.name || '',
        email: row.email || '',
        phone: row.phone || undefined,
        date: customerDate,
        place: row.place as any,
        coach: row.coach || '',
        service: row.service as any,
        status: row.status as any,
        price: parseFloat(row.price || '0'),
        sport: row.sport as any,
        history: [],
        serviceHistory: row.serviceHistory && row.serviceHistory.trim() ? (() => {
          try {
            // Ta bort yttre citattecken om de finns och hantera escaped citattecken
            let cleanedJson = row.serviceHistory.trim();
            // Ta bort inledande och avslutande citattecken om de finns
            if (cleanedJson.startsWith('"') && cleanedJson.endsWith('"')) {
              cleanedJson = cleanedJson.slice(1, -1);
            }
            // Konvertera escaped citattecken ("" -> ")
            cleanedJson = cleanedJson.replace(/""/g, '"');
            return JSON.parse(cleanedJson) as ServiceEntry[];
          } catch (e) {
            if (process.env.NODE_ENV === 'development') {
              console.error('Fel vid parsing av serviceHistory:', e, row.serviceHistory);
            }
            return [];
          }
        })() : [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Validate required fields
      if (!customerData.name || !customerData.email || !customerData.service) {
        errors.push(`Rad saknar obligatoriska fält: ${row.name || 'Okänt'}`);
        continue;
      }
      
      // Validera att huvuddatumet är korrekt (om kunden har serviceHistory, kontrollera att huvuddatumet är före alla slutdatum)
      if (customerData.serviceHistory && customerData.serviceHistory.length > 0) {
        const allEndDates = customerData.serviceHistory
          .map(entry => entry.endDate ? (entry.endDate instanceof Date ? entry.endDate : new Date(entry.endDate)) : null)
          .filter((date): date is Date => date !== null);
        
        const earliestEndDate = allEndDates.length > 0 ? new Date(Math.min(...allEndDates.map(d => d.getTime()))) : null;
        
        // Om huvuddatumet är efter det tidigaste slutdatumet, justera det
        if (earliestEndDate && customerDate > earliestEndDate) {
          customerData.date = earliestEndDate;
          errors.push(`Kunden ${customerData.name} hade huvuddatum efter tjänstehistorikens slutdatum. Korrigerade automatiskt.`);
        }
      }

      const customersRef = ref(db, 'customers');
      const newCustomerRef = push(customersRef);
      
      const serviceHistoryArray: ServiceEntry[] = customerData.serviceHistory || [];
      
      // Hjälpfunktion för att beräkna minimitid för memberships
      const getMembershipMinimumMonths = (serviceName: string): number | null => {
        if (serviceName.includes('Supreme')) {
          return 1; // Supreme: 1 månad minimum
        } else if (serviceName.includes('Premium')) {
          return 2; // Premium: 2 månader minimum
        } else if (serviceName.includes('Standard') || serviceName.includes('BAS')) {
          return 4; // Standard: 4 månader minimum
        }
        return null;
      };
      
      // Validera datum i serviceHistory
      const validatedServiceHistory = serviceHistoryArray.map((entry: ServiceEntry) => {
        const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date);
        const entryEndDate = entry.endDate ? (entry.endDate instanceof Date ? entry.endDate : new Date(entry.endDate)) : null;
        const isTest = isTestService(entry.service);
        
        if (isTest) {
          // För tester: startdatum och slutdatum ska vara samma
          return {
            ...entry,
            date: entryDate,
            endDate: entryDate, // Samma datum för tester
          };
        } else {
          // För memberships: validera och korrigera slutdatum
          if (entryEndDate && entryEndDate < entryDate) {
            // Om slutdatum är före startdatum, beräkna korrekt slutdatum
            const minimumMonths = getMembershipMinimumMonths(entry.service);
            
            if (minimumMonths !== null) {
              const newEndDate = new Date(entryDate);
              newEndDate.setMonth(newEndDate.getMonth() + minimumMonths);
              return {
                ...entry,
                date: entryDate,
                endDate: newEndDate,
              };
            } else if (entry.numberOfMonths && entry.numberOfMonths > 0) {
              const newEndDate = new Date(entryDate);
              newEndDate.setMonth(newEndDate.getMonth() + entry.numberOfMonths);
              return {
                ...entry,
                date: entryDate,
                endDate: newEndDate,
              };
            } else {
              // Fallback: sätt till startdatum + 1 månad
              const newEndDate = new Date(entryDate);
              newEndDate.setMonth(newEndDate.getMonth() + 1);
              return {
                ...entry,
                date: entryDate,
                endDate: newEndDate,
              };
            }
          }
          
          // Om slutdatum saknas men det är ett membership, beräkna det
          if (!entryEndDate) {
            const minimumMonths = getMembershipMinimumMonths(entry.service);
            
            if (minimumMonths !== null) {
              const newEndDate = new Date(entryDate);
              newEndDate.setMonth(newEndDate.getMonth() + minimumMonths);
              return {
                ...entry,
                date: entryDate,
                endDate: newEndDate,
              };
            } else if (entry.numberOfMonths && entry.numberOfMonths > 0) {
              const newEndDate = new Date(entryDate);
              newEndDate.setMonth(newEndDate.getMonth() + entry.numberOfMonths);
              return {
                ...entry,
                date: entryDate,
                endDate: newEndDate,
              };
            }
          }
          
          return {
            ...entry,
            date: entryDate,
            endDate: entryEndDate || undefined,
          };
        }
      });
      
      // Uppdatera customerData med validerad serviceHistory
      customerData.serviceHistory = validatedServiceHistory;
      
      // Kontrollera om några datum korrigerades
      const hasInvalidDates = validatedServiceHistory.some((entry, index) => {
        const originalEntry = serviceHistoryArray[index];
        if (!originalEntry) return false;
        const originalEndDate = originalEntry.endDate ? (originalEntry.endDate instanceof Date ? originalEntry.endDate : new Date(originalEntry.endDate)) : null;
        const validatedEndDate = entry.endDate ? (entry.endDate instanceof Date ? entry.endDate : new Date(entry.endDate)) : null;
        return originalEndDate && validatedEndDate && originalEndDate.getTime() !== validatedEndDate.getTime();
      });
      
      if (hasInvalidDates) {
        errors.push(`Kunden ${customerData.name} hade ogiltiga datum i tjänstehistorik (slutdatum före startdatum). Korrigerade automatiskt.`);
      }
      
      // Hjälpfunktion för att ta bort undefined värden från objekt
      const removeUndefined = (obj: any): any => {
        if (obj === null || obj === undefined) {
          return null;
        }
        if (Array.isArray(obj)) {
          return obj.map(removeUndefined).filter(item => item !== null && item !== undefined);
        }
        if (typeof obj === 'object') {
          const cleaned: any = {};
          for (const key in obj) {
            if (obj[key] !== undefined) {
              cleaned[key] = removeUndefined(obj[key]);
            }
          }
          return cleaned;
        }
        return obj;
      };

      const dataToSave = {
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
        serviceHistory: validatedServiceHistory.map((entry: ServiceEntry) => {
          const mappedEntry: any = {
            id: entry.id,
            service: entry.service,
            price: entry.price,
            date: entry.date instanceof Date ? entry.date.toISOString() : (typeof entry.date === 'string' ? entry.date : new Date(entry.date).toISOString()),
            status: entry.status,
            sport: entry.sport,
          };
          
          // Lägg bara till fält som har värden (inte undefined)
          if (entry.originalPrice !== undefined && entry.originalPrice !== null) mappedEntry.originalPrice = entry.originalPrice;
          if (entry.discount !== undefined && entry.discount !== null) mappedEntry.discount = entry.discount;
          if (entry.priceNote) mappedEntry.priceNote = entry.priceNote;
          if (entry.endDate) mappedEntry.endDate = entry.endDate instanceof Date ? entry.endDate.toISOString() : (typeof entry.endDate === 'string' ? entry.endDate : new Date(entry.endDate).toISOString());
          if (entry.coach) mappedEntry.coach = entry.coach;
          if (entry.coachHistory && entry.coachHistory.length > 0) {
            mappedEntry.coachHistory = entry.coachHistory.map(change => ({
              coach: change.coach,
              date: change.date instanceof Date ? change.date.toISOString() : (typeof change.date === 'string' ? change.date : new Date(change.date).toISOString()),
            }));
          }
          if (entry.paymentMethod) mappedEntry.paymentMethod = entry.paymentMethod;
          if (entry.invoiceStatus) mappedEntry.invoiceStatus = entry.invoiceStatus;
          if (entry.invoiceHistory) mappedEntry.invoiceHistory = entry.invoiceHistory;
          if (entry.billingInterval) mappedEntry.billingInterval = entry.billingInterval;
          if (entry.numberOfMonths !== undefined && entry.numberOfMonths !== null) mappedEntry.numberOfMonths = entry.numberOfMonths;
          if (entry.nextInvoiceDate) mappedEntry.nextInvoiceDate = entry.nextInvoiceDate instanceof Date ? entry.nextInvoiceDate.toISOString() : (typeof entry.nextInvoiceDate === 'string' ? entry.nextInvoiceDate : new Date(entry.nextInvoiceDate).toISOString());
          if (entry.paidUntil) mappedEntry.paidUntil = entry.paidUntil instanceof Date ? entry.paidUntil.toISOString() : (typeof entry.paidUntil === 'string' ? entry.paidUntil : new Date(entry.paidUntil).toISOString());
          if (entry.invoiceReference) mappedEntry.invoiceReference = entry.invoiceReference;
          if (entry.invoiceNote) mappedEntry.invoiceNote = entry.invoiceNote;
          
          return mappedEntry;
        }),
        isSeniorCoach: customerData.isSeniorCoach || false,
        createdAt: customerData.createdAt.toISOString(),
        updatedAt: customerData.updatedAt.toISOString(),
      };
      
      // Ta bort alla undefined värden innan vi sparar till Firebase
      const cleanedData = removeUndefined(dataToSave);
      
      await set(newCustomerRef, cleanedData);

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

