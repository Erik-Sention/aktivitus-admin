// Realtime Database utility functions
import { ref, set, get, push, update, remove, onValue, off, DataSnapshot } from 'firebase/database';
import { db } from './firebase';
import { Customer, FormData } from '@/types';

const CUSTOMERS_PATH = 'customers';

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

// Lägg till ny kund
export const addCustomer = async (formData: FormData): Promise<string> => {
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

