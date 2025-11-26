// Hantera inköp och beställningar

import { Purchase, PurchaseCategory, PurchaseStatus } from '@/types/purchases';
import {
  getAllPurchases as getAllPurchasesFromFirebase,
  addPurchase as addPurchaseToFirebase,
  updatePurchase as updatePurchaseInFirebase,
  deletePurchase as deletePurchaseFromFirebase,
  subscribeToPurchases,
} from './realtimeDatabase';

// Cache för inköp
let purchasesCache: Purchase[] = [];
let purchasesCacheInitialized = false;

// Initiera cache och prenumerera på uppdateringar
if (typeof window !== 'undefined' && !purchasesCacheInitialized) {
  purchasesCacheInitialized = true;
  
  // Prenumerera på realtidsuppdateringar
  subscribeToPurchases((purchases) => {
    purchasesCache = purchases;
  });
  
  // Ladda initial data
  getAllPurchasesFromFirebase().then((purchases) => {
    purchasesCache = purchases;
  }).catch(() => {
    // Ignorera fel vid initial laddning
  });
}

// Hämta alla inköp
export const getAllPurchases = async (): Promise<Purchase[]> => {
  try {
    const purchases = await getAllPurchasesFromFirebase();
    purchasesCache = purchases;
    return purchases;
  } catch (error) {
    console.error('Error fetching purchases:', error);
    // Returnera cache om Firebase-förfrågan misslyckas
    return purchasesCache;
  }
};

// Synkron version för bakåtkompatibilitet (använder cache)
export const getAllPurchasesSync = (): Purchase[] => {
  return purchasesCache;
};

// Hämta inköp för en specifik ort
export const getPurchasesForLocation = async (location: string): Promise<Purchase[]> => {
  const purchases = await getAllPurchases();
  return purchases.filter(p => p.location === location);
};

// Synkron version
export const getPurchasesForLocationSync = (location: string): Purchase[] => {
  return getAllPurchasesSync().filter(p => p.location === location);
};

// Hämta inköp för en specifik månad
export const getPurchasesForMonth = async (
  year: number,
  month: number // 1-12
): Promise<Purchase[]> => {
  const purchases = await getAllPurchases();
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  return purchases.filter(p => {
    const purchaseDate = new Date(p.date);
    return purchaseDate >= startDate && purchaseDate <= endDate;
  });
};

// Synkron version
export const getPurchasesForMonthSync = (
  year: number,
  month: number
): Purchase[] => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  return getAllPurchasesSync().filter(p => {
    const purchaseDate = new Date(p.date);
    return purchaseDate >= startDate && purchaseDate <= endDate;
  });
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
): Promise<Purchase> => {
  try {
    const id = await addPurchaseToFirebase(
      date,
      createdBy,
      createdByName,
      category,
      product,
      priority,
      location,
      estimatedCost,
      notes,
      status,
      supplier,
      costCenter,
      approvedBy,
      expectedDeliveryDate,
      receiptReceived
    );
    
    const newPurchase: Purchase = {
      id,
      date,
      createdBy,
      createdByName,
      category,
      product,
      priority,
      location,
      estimatedCost,
      notes,
      status,
      supplier,
      costCenter,
      approvedBy,
      expectedDeliveryDate,
      receiptReceived,
      createdAt: new Date(),
    };
    
    // Cache kommer att uppdateras via subscription
    return newPurchase;
  } catch (error) {
    console.error('Error adding purchase:', error);
    throw error;
  }
};

// Uppdatera inköp
export const updatePurchase = async (
  id: string,
  updates: Partial<Omit<Purchase, 'id' | 'createdAt' | 'createdBy'>>
): Promise<boolean> => {
  try {
    await updatePurchaseInFirebase(id, updates);
    // Cache kommer att uppdateras via subscription
    return true;
  } catch (error) {
    console.error('Error updating purchase:', error);
    return false;
  }
};

// Ta bort inköp
export const deletePurchase = async (id: string): Promise<boolean> => {
  try {
    await deletePurchaseFromFirebase(id);
    // Cache kommer att uppdateras via subscription
    return true;
  } catch (error) {
    console.error('Error deleting purchase:', error);
    return false;
  }
};

// Beräkna total uppskattad kostnad för en månad
export const getTotalEstimatedCostForMonth = async (
  year: number,
  month: number
): Promise<number> => {
  const purchases = await getPurchasesForMonth(year, month);
  return purchases.reduce((total, p) => total + (p.estimatedCost || 0), 0);
};

// Synkron version
export const getTotalEstimatedCostForMonthSync = (
  year: number,
  month: number
): number => {
  const purchases = getPurchasesForMonthSync(year, month);
  return purchases.reduce((total, p) => total + (p.estimatedCost || 0), 0);
};

// Beräkna total faktisk kostnad för en månad
export const getTotalActualCostForMonth = async (
  year: number,
  month: number
): Promise<number> => {
  const purchases = await getPurchasesForMonth(year, month);
  return purchases.reduce((total, p) => total + (p.actualCost || 0), 0);
};

// Synkron version
export const getTotalActualCostForMonthSync = (
  year: number,
  month: number
): number => {
  const purchases = getPurchasesForMonthSync(year, month);
  return purchases.reduce((total, p) => total + (p.actualCost || 0), 0);
};

