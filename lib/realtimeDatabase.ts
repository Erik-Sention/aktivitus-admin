// Realtime Database utility functions
import { ref, set, get, push, update, remove, onValue, off, DataSnapshot } from 'firebase/database';
import { db } from './firebase';
import { Customer, FormData } from '@/types';
import { CoachProfile } from './coachProfiles';
import { AdministrativeHour, AdministrativeCategory } from '@/types/administrativeHours';

const CUSTOMERS_PATH = 'customers';
const COACH_PROFILES_PATH = 'coachProfiles';
const ADMINISTRATIVE_HOURS_PATH = 'administrativeHours';

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
    serviceHistory: data.serviceHistory || [],
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
    const customersRef = ref(db, CUSTOMERS_PATH);
    const newCustomerRef = push(customersRef);
    
    await set(newCustomerRef, {
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
        ...entry,
        date: entry.date instanceof Date ? entry.date.toISOString() : (typeof entry.date === 'string' ? entry.date : new Date(entry.date).toISOString()),
        nextInvoiceDate: entry.nextInvoiceDate ? (entry.nextInvoiceDate instanceof Date ? entry.nextInvoiceDate.toISOString() : (typeof entry.nextInvoiceDate === 'string' ? entry.nextInvoiceDate : new Date(entry.nextInvoiceDate).toISOString())) : undefined,
        paidUntil: entry.paidUntil ? (entry.paidUntil instanceof Date ? entry.paidUntil.toISOString() : (typeof entry.paidUntil === 'string' ? entry.paidUntil : new Date(entry.paidUntil).toISOString())) : undefined,
      })),
      isSeniorCoach: customerData.isSeniorCoach || false,
      createdAt: customerData.createdAt instanceof Date ? customerData.createdAt.toISOString() : customerData.createdAt,
      updatedAt: customerData.updatedAt instanceof Date ? customerData.updatedAt.toISOString() : customerData.updatedAt,
    });
    
    return newCustomerRef.key || '';
  } catch (error) {
    console.error('Error adding customer:', error);
    throw new Error('Kunde inte lägga till kund');
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
        ...entry,
        date: entry.date instanceof Date ? entry.date.toISOString() : entry.date,
        nextInvoiceDate: entry.nextInvoiceDate ? entry.nextInvoiceDate.toISOString() : undefined,
        paidUntil: entry.paidUntil ? entry.paidUntil.toISOString() : undefined,
      }));
    }
    
    await update(customerRef, updateData);
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
  
  const unsubscribe = onValue(customersRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    
    const customers: Customer[] = [];
    snapshot.forEach((childSnapshot) => {
      const customer = snapshotToCustomer(childSnapshot.key || '', childSnapshot);
      customers.push(customer);
    });
    
    callback(customers);
  });
  
  // Returnera unsubscribe-funktion
  return () => {
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

