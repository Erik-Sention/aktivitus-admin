// Firestore utility functions
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Customer, FormData } from '@/types';

const CUSTOMERS_COLLECTION = 'customers';

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
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

// Lägg till ny kund
export const addCustomer = async (formData: FormData): Promise<string> => {
  try {
    const customerData = formDataToCustomer(formData);
    const docRef = await addDoc(collection(db, CUSTOMERS_COLLECTION), {
      ...customerData,
      date: Timestamp.fromDate(customerData.date),
      createdAt: Timestamp.fromDate(customerData.createdAt),
      updatedAt: Timestamp.fromDate(customerData.updatedAt),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding customer:', error);
    throw new Error('Kunde inte lägga till kund');
  }
};

// Hämta alla kunder
export const getAllCustomers = async (): Promise<Customer[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, CUSTOMERS_COLLECTION));
    const customers: Customer[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      customers.push({
        id: doc.id,
        name: data.name,
        email: data.email,
        date: data.date.toDate(),
        place: data.place,
        coach: data.coach,
        service: data.service,
        status: data.status,
        price: data.price,
        sport: data.sport,
        history: data.history || [],
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      });
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
    const docRef = doc(db, CUSTOMERS_COLLECTION, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    throw new Error('Kunde inte uppdatera kund');
  }
};

// Ta bort kund
export const deleteCustomer = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, CUSTOMERS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting customer:', error);
    throw new Error('Kunde inte ta bort kund');
  }
};

// Hämta kunder baserat på status
export const getCustomersByStatus = async (status: string): Promise<Customer[]> => {
  try {
    const q = query(
      collection(db, CUSTOMERS_COLLECTION),
      where('status', '==', status)
    );
    const querySnapshot = await getDocs(q);
    const customers: Customer[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      customers.push({
        id: doc.id,
        name: data.name,
        email: data.email,
        date: data.date.toDate(),
        place: data.place,
        coach: data.coach,
        service: data.service,
        status: data.status,
        price: data.price,
        sport: data.sport,
        history: data.history || [],
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      });
    });

    return customers;
  } catch (error) {
    console.error('Error fetching customers by status:', error);
    throw new Error('Kunde inte hämta kunder');
  }
};

