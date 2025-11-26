// Realtime Database utility functions
import { ref, set, get, push, update, remove, onValue, off, DataSnapshot } from 'firebase/database';
import { db } from './firebase';
import { Customer, FormData } from '@/types';
import { CoachProfile } from './coachProfiles';
import { AdministrativeHour, AdministrativeCategory } from '@/types/administrativeHours';
import { Purchase, PurchaseCategory, PurchaseStatus, StatusHistoryEntry } from '@/types/purchases';
import { UserProfile } from '@/types/userProfile';
import { PaymentStatus } from '@/types';

const CUSTOMERS_PATH = 'customers';
const COACH_PROFILES_PATH = 'coachProfiles';
const ADMINISTRATIVE_HOURS_PATH = 'administrativeHours';
const PURCHASES_PATH = 'purchases';
const USER_PROFILES_PATH = 'userProfiles';
const PAYMENT_STATUSES_PATH = 'paymentStatuses';

// Hjälpfunktion för att ta bort undefined värden från objekt (Firebase tillåter inte undefined)
const removeUndefined = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item));
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

// Testfunktion för att verifiera Firebase-anslutning
export const testFirebaseConnection = async (): Promise<boolean> => {
  try {
    const testRef = ref(db, '.info/connected');
    const snapshot = await get(testRef);
    console.log('Firebase connection test:', snapshot.val());
    return true;
  } catch (error) {
    console.error('Firebase connection test failed:', error);
    return false;
  }
};

// Konvertera FormData till Customer objekt
export const formDataToCustomer = (formData: FormData, id?: string): Omit<Customer, 'id'> => {
  return {
    name: formData.name,
    email: formData.email,
    date: new Date(formData.date),
    place: formData.place,
    coach: formData.coach,
    service: formData.service,
    status: formData.status,
    price: parseFloat(formData.price),
    sport: formData.sport,
    history: [],
    serviceHistory: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

// Konvertera Realtime Database data till Customer
const snapshotToCustomer = (id: string, snapshot: DataSnapshot): Customer => {
  const data = snapshot.val();
  return {
    id,
    name: data.name || '',
    email: data.email || '',
    phone: data.phone,
    date: data.date ? new Date(data.date) : new Date(),
    place: data.place,
    coach: data.coach || '',
    service: data.service,
    status: data.status,
    price: data.price || 0,
    sport: data.sport,
    history: data.history || [],
    serviceHistory: (data.serviceHistory || []).map((entry: any) => ({
      ...entry,
      date: entry.date ? new Date(entry.date) : new Date(),
      endDate: entry.endDate ? new Date(entry.endDate) : undefined,
      originalPrice: entry.originalPrice !== undefined && entry.originalPrice !== null ? entry.originalPrice : undefined,
      discount: entry.discount !== undefined && entry.discount !== null ? entry.discount : undefined,
      coachHistory: entry.coachHistory ? entry.coachHistory.map((change: any) => ({
        coach: change.coach,
        date: change.date ? new Date(change.date) : new Date(),
      })) : undefined,
      nextInvoiceDate: entry.nextInvoiceDate ? new Date(entry.nextInvoiceDate) : undefined,
      paidUntil: entry.paidUntil ? new Date(entry.paidUntil) : undefined,
    })),
    isSeniorCoach: data.isSeniorCoach,
    createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
    updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
  };
};

// Lägg till ny kund från FormData
export const addCustomerFromFormData = async (formData: FormData): Promise<string> => {
  try {
    const customerData = formDataToCustomer(formData);
    const customersRef = ref(db, CUSTOMERS_PATH);
    const newCustomerRef = push(customersRef);
    
    await set(newCustomerRef, {
      ...customerData,
      date: customerData.date.toISOString(),
      createdAt: customerData.createdAt.toISOString(),
      updatedAt: customerData.updatedAt.toISOString(),
      serviceHistory: (customerData.serviceHistory || []).map(entry => ({
        ...entry,
        date: entry.date instanceof Date ? entry.date.toISOString() : entry.date,
        endDate: entry.endDate ? (entry.endDate instanceof Date ? entry.endDate.toISOString() : (typeof entry.endDate === 'string' ? entry.endDate : new Date(entry.endDate).toISOString())) : undefined,
        coachHistory: entry.coachHistory ? entry.coachHistory.map(change => ({
          coach: change.coach,
          date: change.date instanceof Date ? change.date.toISOString() : (typeof change.date === 'string' ? change.date : new Date(change.date).toISOString()),
        })) : undefined,
        nextInvoiceDate: entry.nextInvoiceDate ? entry.nextInvoiceDate.toISOString() : undefined,
        paidUntil: entry.paidUntil ? entry.paidUntil.toISOString() : undefined,
      })),
    });
    
    return newCustomerRef.key || '';
  } catch (error) {
    console.error('Error adding customer:', error);
    throw new Error('Kunde inte lägga till kund');
  }
};

// Lägg till ny kund från Customer objekt
export const addCustomer = async (customerData: Omit<Customer, 'id'>): Promise<string> => {
  try {
    // Kontrollera att Firebase är korrekt konfigurerad
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
    
    if (!apiKey || apiKey === 'demo-api-key' || apiKey.includes('demo')) {
      const errorMsg = 'Firebase är inte korrekt konfigurerad. Kontrollera NEXT_PUBLIC_FIREBASE_API_KEY i .env.local';
      console.error(errorMsg);
      console.error('Current API Key:', apiKey?.substring(0, 20) + '...');
      throw new Error(errorMsg);
    }

    if (!databaseURL || databaseURL.includes('demo')) {
      const errorMsg = 'Firebase Database URL är inte korrekt konfigurerad. Kontrollera NEXT_PUBLIC_FIREBASE_DATABASE_URL i .env.local';
      console.error(errorMsg);
      console.error('Current Database URL:', databaseURL);
      throw new Error(errorMsg);
    }

    console.log('🔵 Försöker spara kund till Firebase:', customerData.name);
    console.log('🔵 Database URL:', databaseURL);
    console.log('🔵 API Key:', apiKey.substring(0, 20) + '...');
    
    const customersRef = ref(db, CUSTOMERS_PATH);
    const newCustomerRef = push(customersRef);
    
    console.log('🔵 Firebase path:', `${CUSTOMERS_PATH}/${newCustomerRef.key}`);
    
    const dataToSave = {
      name: customerData.name,
      email: customerData.email,
      phone: customerData.phone || null,
      date: customerData.date instanceof Date ? customerData.date.toISOString() : customerData.date,
      place: customerData.place,
      coach: customerData.coach,
      service: customerData.service,
      status: customerData.status,
      price: customerData.price,
      sport: customerData.sport,
      history: customerData.history || [],
      serviceHistory: (customerData.serviceHistory || []).map(entry => ({
        id: entry.id,
        service: entry.service,
        price: entry.price,
        originalPrice: entry.originalPrice,
        discount: entry.discount !== undefined && entry.discount !== null ? entry.discount : undefined,
        priceNote: entry.priceNote || undefined,
        date: entry.date instanceof Date ? entry.date.toISOString() : (typeof entry.date === 'string' ? entry.date : new Date(entry.date).toISOString()),
        status: entry.status,
        endDate: entry.endDate ? (entry.endDate instanceof Date ? entry.endDate.toISOString() : (typeof entry.endDate === 'string' ? entry.endDate : new Date(entry.endDate).toISOString())) : undefined,
        sport: entry.sport,
        coach: entry.coach || undefined,
        coachHistory: entry.coachHistory ? entry.coachHistory.map(change => ({
          coach: change.coach,
          date: change.date instanceof Date ? change.date.toISOString() : (typeof change.date === 'string' ? change.date : new Date(change.date).toISOString()),
        })) : undefined,
        paymentMethod: entry.paymentMethod,
        invoiceStatus: entry.invoiceStatus,
        invoiceHistory: entry.invoiceHistory || undefined,
        billingInterval: entry.billingInterval,
        numberOfMonths: entry.numberOfMonths !== undefined && entry.numberOfMonths !== null ? entry.numberOfMonths : undefined,
        nextInvoiceDate: entry.nextInvoiceDate ? (entry.nextInvoiceDate instanceof Date ? entry.nextInvoiceDate.toISOString() : (typeof entry.nextInvoiceDate === 'string' ? entry.nextInvoiceDate : new Date(entry.nextInvoiceDate).toISOString())) : undefined,
        paidUntil: entry.paidUntil ? (entry.paidUntil instanceof Date ? entry.paidUntil.toISOString() : (typeof entry.paidUntil === 'string' ? entry.paidUntil : new Date(entry.paidUntil).toISOString())) : undefined,
        invoiceReference: entry.invoiceReference || undefined,
        invoiceNote: entry.invoiceNote || undefined,
      })),
      isSeniorCoach: customerData.isSeniorCoach || false,
      createdAt: customerData.createdAt instanceof Date ? customerData.createdAt.toISOString() : customerData.createdAt,
      updatedAt: customerData.updatedAt instanceof Date ? customerData.updatedAt.toISOString() : customerData.updatedAt,
    };
    
    // Ta bort alla undefined värden innan vi sparar till Firebase
    const cleanedData = removeUndefined(dataToSave);
    
    console.log('🔵 Data att spara (före rensning):', dataToSave);
    console.log('🔵 Data att spara (efter rensning):', cleanedData);
    console.log('🔵 Firebase path:', `${CUSTOMERS_PATH}/${newCustomerRef.key}`);
    
    await set(newCustomerRef, cleanedData);
    
    const customerId = newCustomerRef.key || '';
    console.log('✅ Kund sparad till Firebase med ID:', customerId);
    
    return customerId;
  } catch (error: any) {
    console.error('❌ Error adding customer:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    
    // Ge mer specifik felinformation
    if (error.code === 'PERMISSION_DENIED') {
      throw new Error('Ingen behörighet att spara till Firebase. Kontrollera Firebase Rules.');
    } else if (error.code === 'UNAVAILABLE') {
      throw new Error('Firebase är inte tillgängligt. Kontrollera din internetanslutning och Firebase-konfiguration.');
    } else if (error.message?.includes('Firebase är inte korrekt konfigurerad')) {
      throw error;
    }
    
    throw new Error(`Kunde inte lägga till kund: ${error.message || 'Okänt fel'}`);
  }
};

// Hämta alla kunder
export const getAllCustomers = async (): Promise<Customer[]> => {
  try {
    const customersRef = ref(db, CUSTOMERS_PATH);
    const snapshot = await get(customersRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const customers: Customer[] = [];
    snapshot.forEach((childSnapshot) => {
      const customer = snapshotToCustomer(childSnapshot.key || '', childSnapshot);
      customers.push(customer);
    });
    
    return customers;
  } catch (error) {
    console.error('Error fetching customers:', error);
    throw new Error('Kunde inte hämta kunder');
  }
};

// Uppdatera kund
export const updateCustomer = async (
  id: string,
  updates: Partial<Customer>
): Promise<void> => {
  try {
    const customerRef = ref(db, `${CUSTOMERS_PATH}/${id}`);
    const updateData: any = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    // Konvertera Date-objekt till ISO-strängar
    if (updates.date) {
      updateData.date = updates.date instanceof Date ? updates.date.toISOString() : updates.date;
    }
    if (updates.createdAt) {
      updateData.createdAt = updates.createdAt instanceof Date ? updates.createdAt.toISOString() : updates.createdAt;
    }
    if (updates.serviceHistory) {
      updateData.serviceHistory = (updates.serviceHistory || []).map(entry => ({
        id: entry.id,
        service: entry.service,
        price: entry.price,
        // Säkerställ att originalPrice alltid är satt - använd price som fallback om det saknas
        originalPrice: entry.originalPrice !== undefined && entry.originalPrice !== null ? entry.originalPrice : entry.price,
        // Spara discount även om det är 0 eller negativt (t.ex. -5 för prisökning)
        discount: entry.discount !== undefined && entry.discount !== null ? entry.discount : undefined,
        priceNote: entry.priceNote || undefined,
        date: entry.date instanceof Date ? entry.date.toISOString() : entry.date,
        status: entry.status,
        endDate: entry.endDate ? (entry.endDate instanceof Date ? entry.endDate.toISOString() : (typeof entry.endDate === 'string' ? entry.endDate : new Date(entry.endDate).toISOString())) : undefined,
        sport: entry.sport,
        coach: entry.coach || undefined,
        coachHistory: entry.coachHistory ? entry.coachHistory.map(change => ({
          coach: change.coach,
          date: change.date instanceof Date ? change.date.toISOString() : (typeof change.date === 'string' ? change.date : new Date(change.date).toISOString()),
        })) : undefined,
        paymentMethod: entry.paymentMethod,
        invoiceStatus: entry.invoiceStatus,
        invoiceHistory: entry.invoiceHistory || undefined,
        billingInterval: entry.billingInterval,
        numberOfMonths: entry.numberOfMonths !== undefined && entry.numberOfMonths !== null ? entry.numberOfMonths : undefined,
        nextInvoiceDate: entry.nextInvoiceDate ? (entry.nextInvoiceDate instanceof Date ? entry.nextInvoiceDate.toISOString() : (typeof entry.nextInvoiceDate === 'string' ? entry.nextInvoiceDate : new Date(entry.nextInvoiceDate).toISOString())) : undefined,
        paidUntil: entry.paidUntil ? (entry.paidUntil instanceof Date ? entry.paidUntil.toISOString() : (typeof entry.paidUntil === 'string' ? entry.paidUntil : new Date(entry.paidUntil).toISOString())) : undefined,
        invoiceReference: entry.invoiceReference || undefined,
        invoiceNote: entry.invoiceNote || undefined,
      }));
    }
    
    // Ta bort alla undefined värden innan vi sparar till Firebase
    const cleanedData = removeUndefined(updateData);
    
    await update(customerRef, cleanedData);
  } catch (error) {
    console.error('Error updating customer:', error);
    throw new Error('Kunde inte uppdatera kund');
  }
};

// Ta bort kund
export const deleteCustomer = async (id: string): Promise<void> => {
  try {
    const customerRef = ref(db, `${CUSTOMERS_PATH}/${id}`);
    await remove(customerRef);
  } catch (error) {
    console.error('Error deleting customer:', error);
    throw new Error('Kunde inte ta bort kund');
  }
};

// Hämta kunder baserat på status
export const getCustomersByStatus = async (status: string): Promise<Customer[]> => {
  try {
    const allCustomers = await getAllCustomers();
    return allCustomers.filter(customer => customer.status === status);
  } catch (error) {
    console.error('Error fetching customers by status:', error);
    throw new Error('Kunde inte hämta kunder');
  }
};

// Realtime listener för kunder
export const subscribeToCustomers = (
  callback: (customers: Customer[]) => void
): (() => void) => {
  const customersRef = ref(db, CUSTOMERS_PATH);
  
  console.log('🔵 Prenumererar på kunder från Firebase path:', CUSTOMERS_PATH);
  
  const unsubscribe = onValue(
    customersRef, 
    (snapshot) => {
      console.log('🔵 Firebase listener triggered, snapshot exists:', snapshot.exists());
      
      if (!snapshot.exists()) {
        console.log('🔵 Ingen data i Firebase, returnerar tom array');
        callback([]);
        return;
      }
      
      const customers: Customer[] = [];
      snapshot.forEach((childSnapshot) => {
        const customer = snapshotToCustomer(childSnapshot.key || '', childSnapshot);
        customers.push(customer);
      });
      
      console.log('🔵 Laddade', customers.length, 'kunder från Firebase');
      callback(customers);
    },
    (error) => {
      console.error('❌ Firebase listener error:', error);
      console.error('Error code:', (error as any).code);
      console.error('Error message:', error.message);
      // Returnera tom array vid fel
      callback([]);
    }
  );
  
  // Returnera unsubscribe-funktion
  return () => {
    console.log('🔵 Avprenumererar från Firebase');
    off(customersRef, 'value', unsubscribe);
  };
};

// ==================== COACH PROFILES ====================

// Konvertera Realtime Database data till CoachProfile
const snapshotToCoachProfile = (snapshot: DataSnapshot): CoachProfile => {
  const data = snapshot.val();
  return {
    name: data.name || '',
    hourlyRate: data.hourlyRate || 375,
    isSeniorCoach: data.isSeniorCoach || false,
    mainPlace: data.mainPlace,
    secondaryPlace: data.secondaryPlace,
    address: data.address,
    phone: data.phone,
    email: data.email,
    bankAccount: data.bankAccount,
    bankName: data.bankName,
    clearingNumber: data.clearingNumber,
    accountNumber: data.accountNumber,
    swishNumber: data.swishNumber,
    emergencyContact: data.emergencyContact || null,
    personalNumber: data.personalNumber,
    taxTable: data.taxTable,
    notes: data.notes,
  };
};

// Hämta coach-profil
export const getCoachProfile = async (coachName: string): Promise<CoachProfile | null> => {
  try {
    const profileRef = ref(db, `${COACH_PROFILES_PATH}/${coachName}`);
    const snapshot = await get(profileRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    return snapshotToCoachProfile(snapshot);
  } catch (error) {
    console.error('Error fetching coach profile:', error);
    return null;
  }
};

// Hämta alla coach-profiler
export const getAllCoachProfiles = async (): Promise<Record<string, CoachProfile>> => {
  try {
    const profilesRef = ref(db, COACH_PROFILES_PATH);
    const snapshot = await get(profilesRef);
    
    if (!snapshot.exists()) {
      return {};
    }
    
    const profiles: Record<string, CoachProfile> = {};
    snapshot.forEach((childSnapshot) => {
      const profile = snapshotToCoachProfile(childSnapshot);
      profiles[profile.name] = profile;
    });
    
    return profiles;
  } catch (error) {
    console.error('Error fetching coach profiles:', error);
    return {};
  }
};

// Hämta alla coach-namn från Firebase
export const getAllCoachNames = async (): Promise<string[]> => {
  try {
    const profiles = await getAllCoachProfiles();
    return Object.keys(profiles).sort();
  } catch (error) {
    console.error('Error fetching coach names:', error);
    return [];
  }
};

// Spara coach-profil
export const saveCoachProfile = async (profile: CoachProfile): Promise<void> => {
  try {
    const profileRef = ref(db, `${COACH_PROFILES_PATH}/${profile.name}`);
    await set(profileRef, {
      name: profile.name,
      hourlyRate: profile.hourlyRate,
      isSeniorCoach: profile.isSeniorCoach || false,
      mainPlace: profile.mainPlace || null,
      secondaryPlace: profile.secondaryPlace || null,
      address: profile.address || null,
      phone: profile.phone || null,
      email: profile.email || null,
      bankAccount: profile.bankAccount || null,
      bankName: profile.bankName || null,
      clearingNumber: profile.clearingNumber || null,
      accountNumber: profile.accountNumber || null,
      swishNumber: profile.swishNumber || null,
      emergencyContact: profile.emergencyContact || null,
      personalNumber: profile.personalNumber || null,
      taxTable: profile.taxTable || null,
      notes: profile.notes || null,
    });
  } catch (error) {
    console.error('Error saving coach profile:', error);
    throw new Error('Kunde inte spara coach-profil');
  }
};

// Ta bort coach-profil
export const deleteCoachProfile = async (coachName: string): Promise<void> => {
  try {
    const profileRef = ref(db, `${COACH_PROFILES_PATH}/${coachName}`);
    await remove(profileRef);
  } catch (error) {
    console.error('Error deleting coach profile:', error);
    throw new Error('Kunde inte ta bort coach-profil');
  }
};

// Realtime listener för coach-profiler
export const subscribeToCoachProfiles = (
  callback: (profiles: Record<string, CoachProfile>) => void
): (() => void) => {
  const profilesRef = ref(db, COACH_PROFILES_PATH);
  
  const unsubscribe = onValue(profilesRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback({});
      return;
    }
    
    const profiles: Record<string, CoachProfile> = {};
    snapshot.forEach((childSnapshot) => {
      const profile = snapshotToCoachProfile(childSnapshot);
      profiles[profile.name] = profile;
    });
    
    callback(profiles);
  });
  
  return () => {
    off(profilesRef, 'value', unsubscribe);
  };
};

// ==================== ADMINISTRATIVE HOURS ====================

// Konvertera Realtime Database data till AdministrativeHour
const snapshotToAdministrativeHour = (id: string, snapshot: DataSnapshot): AdministrativeHour => {
  const data = snapshot.val();
  return {
    id,
    coachName: data.coachName || '',
    date: data.date ? new Date(data.date) : new Date(),
    hours: data.hours || 0,
    description: data.description || '',
    category: data.category as AdministrativeCategory | undefined,
    createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
    createdBy: data.createdBy || 'unknown',
  };
};

// Hämta alla administrativa timmar
export const getAllAdministrativeHours = async (): Promise<AdministrativeHour[]> => {
  try {
    const hoursRef = ref(db, ADMINISTRATIVE_HOURS_PATH);
    const snapshot = await get(hoursRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const hours: AdministrativeHour[] = [];
    snapshot.forEach((childSnapshot) => {
      const hour = snapshotToAdministrativeHour(childSnapshot.key || '', childSnapshot);
      hours.push(hour);
    });
    
    return hours;
  } catch (error) {
    console.error('Error fetching administrative hours:', error);
    return [];
  }
};

// Hämta administrativa timmar för en specifik coach
export const getAdministrativeHoursForCoach = async (coachName: string): Promise<AdministrativeHour[]> => {
  try {
    const allHours = await getAllAdministrativeHours();
    return allHours.filter(h => h.coachName === coachName);
  } catch (error) {
    console.error('Error fetching administrative hours for coach:', error);
    return [];
  }
};

// Lägg till administrativa timmar
export const addAdministrativeHour = async (
  coachName: string,
  date: Date,
  hours: number,
  description: string,
  category?: AdministrativeCategory,
  createdBy?: string
): Promise<string> => {
  try {
    const hoursRef = ref(db, ADMINISTRATIVE_HOURS_PATH);
    const newHourRef = push(hoursRef);
    
    const newHour: Omit<AdministrativeHour, 'id'> = {
      coachName,
      date,
      hours,
      description,
      category,
      createdAt: new Date(),
      createdBy: createdBy || 'unknown',
    };
    
    await set(newHourRef, {
      coachName: newHour.coachName,
      date: newHour.date instanceof Date ? newHour.date.toISOString() : newHour.date,
      hours: newHour.hours,
      description: newHour.description,
      category: newHour.category || null,
      createdAt: newHour.createdAt instanceof Date ? newHour.createdAt.toISOString() : newHour.createdAt,
      createdBy: newHour.createdBy,
    });
    
    return newHourRef.key || '';
  } catch (error) {
    console.error('Error adding administrative hour:', error);
    throw new Error('Kunde inte lägga till administrativa timmar');
  }
};

// Uppdatera administrativa timmar
export const updateAdministrativeHour = async (
  id: string,
  updates: Partial<Omit<AdministrativeHour, 'id' | 'createdAt' | 'createdBy'>>
): Promise<void> => {
  try {
    const hourRef = ref(db, `${ADMINISTRATIVE_HOURS_PATH}/${id}`);
    const updateData: any = {};
    
    if (updates.coachName !== undefined) updateData.coachName = updates.coachName;
    if (updates.date !== undefined) {
      updateData.date = updates.date instanceof Date ? updates.date.toISOString() : updates.date;
    }
    if (updates.hours !== undefined) updateData.hours = updates.hours;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.category !== undefined) updateData.category = updates.category || null;
    
    await update(hourRef, updateData);
  } catch (error) {
    console.error('Error updating administrative hour:', error);
    throw new Error('Kunde inte uppdatera administrativa timmar');
  }
};

// Ta bort administrativa timmar
export const deleteAdministrativeHour = async (id: string): Promise<void> => {
  try {
    const hourRef = ref(db, `${ADMINISTRATIVE_HOURS_PATH}/${id}`);
    await remove(hourRef);
  } catch (error) {
    console.error('Error deleting administrative hour:', error);
    throw new Error('Kunde inte ta bort administrativa timmar');
  }
};

// Realtime listener för administrativa timmar
export const subscribeToAdministrativeHours = (
  callback: (hours: AdministrativeHour[]) => void
): (() => void) => {
  const hoursRef = ref(db, ADMINISTRATIVE_HOURS_PATH);
  
  const unsubscribe = onValue(hoursRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    
    const hours: AdministrativeHour[] = [];
    snapshot.forEach((childSnapshot) => {
      const hour = snapshotToAdministrativeHour(childSnapshot.key || '', childSnapshot);
      hours.push(hour);
    });
    
    callback(hours);
  });
  
  return () => {
    off(hoursRef, 'value', unsubscribe);
  };
};

// ==================== PURCHASES ====================

// Konvertera snapshot till Purchase objekt
const snapshotToPurchase = (id: string, snapshot: DataSnapshot): Purchase => {
  const data = snapshot.val();
  return {
    id,
    date: data.date ? new Date(data.date) : new Date(),
    createdBy: data.createdBy || 'unknown',
    createdByName: data.createdByName,
    category: data.category || 'Övrigt',
    product: data.product || '',
    priority: data.priority || 1,
    location: data.location,
    estimatedCost: data.estimatedCost,
    actualCost: data.actualCost,
    status: data.status || 'Väntar',
    statusHistory: data.statusHistory ? data.statusHistory.map((entry: any) => ({
      status: entry.status,
      changedBy: entry.changedBy,
      changedByEmail: entry.changedByEmail,
      changedAt: new Date(entry.changedAt),
    })) : [],
    notes: data.notes,
    supplier: data.supplier,
    costCenter: data.costCenter,
    approvedBy: data.approvedBy,
    expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : undefined,
    receiptReceived: data.receiptReceived || false,
    createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
  };
};

// Hämta alla inköp
export const getAllPurchases = async (): Promise<Purchase[]> => {
  try {
    const purchasesRef = ref(db, PURCHASES_PATH);
    const snapshot = await get(purchasesRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const purchases: Purchase[] = [];
    snapshot.forEach((childSnapshot) => {
      const purchase = snapshotToPurchase(childSnapshot.key || '', childSnapshot);
      purchases.push(purchase);
    });
    
    return purchases;
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return [];
  }
};

// Lägg till inköp
export const addPurchase = async (
  date: Date,
  createdBy: string,
  createdByName: string,
  category: PurchaseCategory,
  product: string,
  priority: 1 | 2 | 3 | 4,
  location?: string,
  estimatedCost?: number,
  notes?: string,
  status: PurchaseStatus = 'Väntar',
  supplier?: string,
  costCenter?: string,
  approvedBy?: string,
  expectedDeliveryDate?: Date,
  receiptReceived?: boolean
): Promise<string> => {
  try {
    const purchasesRef = ref(db, PURCHASES_PATH);
    const newPurchaseRef = push(purchasesRef);
    
    // Skapa initial statushistorik
    const initialStatusHistory: StatusHistoryEntry[] = [{
      status,
      changedBy: createdByName,
      changedByEmail: createdBy,
      changedAt: new Date(),
    }];

    const purchaseData = removeUndefined({
      date: date.toISOString(),
      createdBy,
      createdByName,
      category,
      product,
      priority,
      location,
      estimatedCost,
      notes,
      status,
      statusHistory: initialStatusHistory.map(entry => ({
        status: entry.status,
        changedBy: entry.changedBy,
        changedByEmail: entry.changedByEmail,
        changedAt: entry.changedAt.toISOString(),
      })),
      supplier,
      costCenter,
      approvedBy,
      expectedDeliveryDate: expectedDeliveryDate ? expectedDeliveryDate.toISOString() : undefined,
      receiptReceived: receiptReceived || false,
      createdAt: new Date().toISOString(),
    });
    
    await set(newPurchaseRef, purchaseData);
    return newPurchaseRef.key || '';
  } catch (error) {
    console.error('Error adding purchase:', error);
    throw new Error('Kunde inte lägga till inköp');
  }
};

// Uppdatera inköp
export const updatePurchase = async (
  id: string,
  updates: Partial<Omit<Purchase, 'id' | 'createdAt' | 'createdBy'>>
): Promise<void> => {
  try {
    const purchaseRef = ref(db, `${PURCHASES_PATH}/${id}`);
    
    const updateData = removeUndefined({
      ...updates,
      date: updates.date ? updates.date.toISOString() : undefined,
      expectedDeliveryDate: updates.expectedDeliveryDate ? updates.expectedDeliveryDate.toISOString() : undefined,
      statusHistory: updates.statusHistory ? updates.statusHistory.map((entry: StatusHistoryEntry) => ({
        status: entry.status,
        changedBy: entry.changedBy,
        changedByEmail: entry.changedByEmail,
        changedAt: entry.changedAt.toISOString(),
      })) : undefined,
    });
    
    await update(purchaseRef, updateData);
  } catch (error) {
    console.error('Error updating purchase:', error);
    throw new Error('Kunde inte uppdatera inköp');
  }
};

// Ta bort inköp
export const deletePurchase = async (id: string): Promise<void> => {
  try {
    const purchaseRef = ref(db, `${PURCHASES_PATH}/${id}`);
    await remove(purchaseRef);
  } catch (error) {
    console.error('Error deleting purchase:', error);
    throw new Error('Kunde inte ta bort inköp');
  }
};

// Realtime listener för inköp
export const subscribeToPurchases = (
  callback: (purchases: Purchase[]) => void
): (() => void) => {
  const purchasesRef = ref(db, PURCHASES_PATH);
  
  const unsubscribe = onValue(purchasesRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    
    const purchases: Purchase[] = [];
    snapshot.forEach((childSnapshot) => {
      const purchase = snapshotToPurchase(childSnapshot.key || '', childSnapshot);
      purchases.push(purchase);
    });
    
    callback(purchases);
  });
  
  return () => {
    off(purchasesRef, 'value', unsubscribe);
  };
};

// ==================== USER PROFILES ====================

// Konvertera snapshot till UserProfile objekt
const snapshotToUserProfile = (snapshot: DataSnapshot): UserProfile => {
  const data = snapshot.val();
  return {
    email: data.email || '',
    displayName: data.displayName || '',
    role: data.role,
    phone: data.phone,
    linkedCoach: data.linkedCoach,
    createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
    updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
  };
};

// Hämta användarprofil
export const getUserProfile = async (email: string): Promise<UserProfile | null> => {
  try {
    const emailKey = email.replace(/\./g, '_').replace(/@/g, '_at_');
    const profileRef = ref(db, `${USER_PROFILES_PATH}/${emailKey}`);
    const snapshot = await get(profileRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    return snapshotToUserProfile(snapshot);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

// Spara användarprofil
export const saveUserProfile = async (profile: UserProfile): Promise<void> => {
  try {
    const emailKey = profile.email.replace(/\./g, '_').replace(/@/g, '_at_');
    const profileRef = ref(db, `${USER_PROFILES_PATH}/${emailKey}`);
    
    const profileData = removeUndefined({
      email: profile.email,
      displayName: profile.displayName,
      role: profile.role,
      phone: profile.phone,
      linkedCoach: profile.linkedCoach,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    });
    
    await set(profileRef, profileData);
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw new Error('Kunde inte spara användarprofil');
  }
};

// Realtime listener för användarprofiler
export const subscribeToUserProfiles = (
  callback: (profiles: Record<string, UserProfile>) => void
): (() => void) => {
  const profilesRef = ref(db, USER_PROFILES_PATH);
  
  const unsubscribe = onValue(profilesRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback({});
      return;
    }
    
    const profiles: Record<string, UserProfile> = {};
    snapshot.forEach((childSnapshot) => {
      const profile = snapshotToUserProfile(childSnapshot);
      profiles[profile.email] = profile;
    });
    
    callback(profiles);
  });
  
  return () => {
    off(profilesRef, 'value', unsubscribe);
  };
};

// ==================== SERVICES ====================

const SERVICES_PATH = 'services';

export interface ServicePrice {
  service: string;
  basePrice: number;
  category?: string;
  description?: string;
  timeBudget?: number; // Timmar per månad för medlemskap, eller timmar för tester
  updatedAt?: string;
}

const snapshotToServicePrice = (snapshot: DataSnapshot): ServicePrice => {
  const data = snapshot.val();
  return {
    service: data.service || '',
    basePrice: data.basePrice || 0,
    category: data.category,
    description: data.description,
    timeBudget: data.timeBudget !== undefined ? data.timeBudget : undefined,
    updatedAt: data.updatedAt,
  };
};

export const getAllServicesAndPrices = async (): Promise<ServicePrice[]> => {
  try {
    const servicesRef = ref(db, SERVICES_PATH);
    const snapshot = await get(servicesRef);
    if (!snapshot.exists()) return [];
    const services: ServicePrice[] = [];
    snapshot.forEach((childSnapshot) => {
      services.push(snapshotToServicePrice(childSnapshot));
    });
    return services;
  } catch (error) {
    console.error('Error fetching all services and prices:', error);
    return [];
  }
};

export const getServicePrice = async (serviceName: string): Promise<ServicePrice | null> => {
  try {
    const serviceKey = serviceName.replace(/\//g, '_').replace(/\s+/g, '_');
    const serviceRef = ref(db, `${SERVICES_PATH}/${serviceKey}`);
    const snapshot = await get(serviceRef);
    return snapshot.exists() ? snapshotToServicePrice(snapshot) : null;
  } catch (error) {
    console.error('Error fetching service price:', error);
    return null;
  }
};

export const saveServicePrice = async (servicePrice: ServicePrice): Promise<void> => {
  try {
    const serviceKey = servicePrice.service.replace(/\//g, '_').replace(/\s+/g, '_');
    const serviceRef = ref(db, `${SERVICES_PATH}/${serviceKey}`);
    const dataToSave = removeUndefined({
      ...servicePrice,
      updatedAt: new Date().toISOString(),
    });
    await set(serviceRef, dataToSave);
  } catch (error) {
    console.error('Error saving service price:', error);
    throw new Error('Kunde inte spara tjänst/pris');
  }
};

export const updateServicePrice = async (oldServiceName: string, servicePrice: ServicePrice): Promise<void> => {
  try {
    // Om namnet ändrats, ta bort gamla och skapa ny
    if (oldServiceName !== servicePrice.service) {
      const oldServiceKey = oldServiceName.replace(/\//g, '_').replace(/\s+/g, '_');
      const oldServiceRef = ref(db, `${SERVICES_PATH}/${oldServiceKey}`);
      await remove(oldServiceRef);
    }
    await saveServicePrice(servicePrice);
  } catch (error) {
    console.error('Error updating service price:', error);
    throw new Error('Kunde inte uppdatera tjänst/pris');
  }
};

export const deleteServicePrice = async (serviceName: string): Promise<void> => {
  try {
    const serviceKey = serviceName.replace(/\//g, '_').replace(/\s+/g, '_');
    const serviceRef = ref(db, `${SERVICES_PATH}/${serviceKey}`);
    await remove(serviceRef);
  } catch (error) {
    console.error('Error deleting service price:', error);
    throw new Error('Kunde inte ta bort tjänst/pris');
  }
};

export const subscribeToServicesAndPrices = (
  callback: (services: ServicePrice[]) => void
): (() => void) => {
  const servicesRef = ref(db, SERVICES_PATH);
  const unsubscribe = onValue(servicesRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const services: ServicePrice[] = [];
    snapshot.forEach((childSnapshot) => {
      services.push(snapshotToServicePrice(childSnapshot));
    });
    callback(services);
  });
  return () => off(servicesRef, 'value', unsubscribe);
};

// ==================== PAYMENT STATUSES ====================

// Hämta alla utbetalningsstatusar
export const getAllPaymentStatuses = async (): Promise<Record<string, PaymentStatus>> => {
  try {
    const statusesRef = ref(db, PAYMENT_STATUSES_PATH);
    const snapshot = await get(statusesRef);
    if (!snapshot.exists()) return {};
    return snapshot.val() || {};
  } catch (error) {
    console.error('Error fetching payment statuses:', error);
    return {};
  }
};

// Spara utbetalningsstatusar
export const savePaymentStatuses = async (statuses: Record<string, PaymentStatus>): Promise<void> => {
  try {
    const statusesRef = ref(db, PAYMENT_STATUSES_PATH);
    await set(statusesRef, removeUndefined(statuses));
  } catch (error) {
    console.error('Error saving payment statuses:', error);
    throw new Error('Kunde inte spara utbetalningsstatusar');
  }
};

// Uppdatera en specifik utbetalningsstatus
export const updatePaymentStatus = async (key: string, status: PaymentStatus): Promise<void> => {
  try {
    const statusRef = ref(db, `${PAYMENT_STATUSES_PATH}/${key}`);
    await set(statusRef, status);
  } catch (error) {
    console.error('Error updating payment status:', error);
    throw new Error('Kunde inte uppdatera utbetalningsstatus');
  }
};

// Realtime listener för utbetalningsstatusar
export const subscribeToPaymentStatuses = (
  callback: (statuses: Record<string, PaymentStatus>) => void
): (() => void) => {
  const statusesRef = ref(db, PAYMENT_STATUSES_PATH);
  const unsubscribe = onValue(statusesRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback({});
      return;
    }
    callback(snapshot.val() || {});
  });
  return () => off(statusesRef, 'value', unsubscribe);
};

