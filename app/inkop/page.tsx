'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getUserRoleSync } from '@/lib/auth';
import { getDisplayName, getUserProfile } from '@/lib/userProfile';
import { PLACES } from '@/lib/constants';
import {
  getAllPurchases,
  getAllPurchasesSync,
  addPurchase,
  updatePurchase,
  deletePurchase,
} from '@/lib/purchases';
import { Purchase, PurchaseCategory, PurchaseStatus, StatusHistoryEntry } from '@/types/purchases';
import { Plus, Edit2, Trash2, Save, X, Calendar, MapPin, ShoppingCart, CheckSquare, Square } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { PrioritySelect } from '@/components/PrioritySelect';
import { PurchaseStatusSelect } from '@/components/PurchaseStatusSelect';

const PURCHASE_CATEGORIES: PurchaseCategory[] = [
  'Träningsutrustning',
  'Kontorsmaterial',
  'IT-utrustning',
  'Möbler',
  'Förbrukningsmaterial',
  'Marknadsföring',
  'Övrigt',
];

const PURCHASE_STATUSES: PurchaseStatus[] = [
  'Väntar',
  'Godkänd',
  'Beställd',
  'Levererad',
  'Avbruten',
];

const PRIORITIES = [1, 2, 3, 4] as const;

const PRIORITY_LABELS: Record<number, string> = {
  1: 'Produktionsvägörande',
  2: 'Brådskande',
  3: 'Planerad',
  4: 'Kan vänta',
};

export default function PurchasesPage() {
  const router = useRouter();
  const user = getCurrentUser();
  const userEmail = user?.email || 'unknown';
  const [userDisplayName, setUserDisplayName] = useState<string>(userEmail.split('@')[0]);
  const userRole = getUserRoleSync();
  const isCoach = userRole === 'coach';

  // Ladda användarens displayName
  useEffect(() => {
    const loadUserProfile = async () => {
      if (userEmail) {
        const profile = await getUserProfile(userEmail);
        if (profile?.displayName) {
          setUserDisplayName(profile.displayName);
        } else {
          setUserDisplayName(getDisplayName(userEmail));
        }
      }
    };
    loadUserProfile();
  }, [userEmail]);

  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [selectedCreatedBy, setSelectedCreatedBy] = useState<string>('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>('');
  const [selectedApprovedBy, setSelectedApprovedBy] = useState<string>('');
  const [selectedReceiptStatus, setSelectedReceiptStatus] = useState<string>('');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPurchases, setSelectedPurchases] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Formulärdata
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'Övrigt' as PurchaseCategory,
    product: '',
    priority: 3 as 1 | 2 | 3 | 4,
    location: '',
    estimatedCost: 0,
    notes: '',
    status: 'Väntar' as PurchaseStatus,
    supplier: '',
    costCenter: '',
    approvedBy: '',
    expectedDeliveryDate: '',
    receiptReceived: false,
  });

  // Ladda inköp
  useEffect(() => {
    const loadPurchases = async () => {
      try {
        // Försök hämta från cache först (synkron)
        const cachedPurchases = getAllPurchasesSync();
        if (cachedPurchases.length > 0) {
          setPurchases(cachedPurchases);
        }
        
        // Hämta från Firebase och uppdatera
        const purchasesList = await getAllPurchases();
        setPurchases(purchasesList);
      } catch (error) {
        console.error('Error loading purchases:', error);
        // Använd cache om Firebase-förfrågan misslyckas
        setPurchases(getAllPurchasesSync());
      }
    };
    
    loadPurchases();
  }, []);

  // Hämta unika värden för filter
  const uniqueCreators = useMemo(() => {
    return Array.from(new Set(purchases.map(p => p.createdByName || p.createdBy).filter(Boolean)));
  }, [purchases]);

  const uniqueSuppliers = useMemo(() => {
    return Array.from(new Set(purchases.map(p => p.supplier).filter(Boolean)));
  }, [purchases]);

  const uniqueCostCenters = useMemo(() => {
    return Array.from(new Set(purchases.map(p => p.costCenter).filter(Boolean)));
  }, [purchases]);

  const uniqueApprovers = useMemo(() => {
    return Array.from(new Set(purchases.map(p => p.approvedBy).filter(Boolean)));
  }, [purchases]);

  // Filtrera inköp baserat på alla valda filter
  const filteredPurchases = useMemo(() => {
    let filtered = purchases;

    if (selectedLocation) {
      filtered = filtered.filter(p => p.location === selectedLocation);
    }

    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    if (selectedStatus) {
      filtered = filtered.filter(p => p.status === selectedStatus);
    }

    if (selectedPriority) {
      filtered = filtered.filter(p => p.priority === parseInt(selectedPriority));
    }

    if (selectedCreatedBy) {
      filtered = filtered.filter(p => (p.createdByName || p.createdBy) === selectedCreatedBy);
    }

    if (selectedSupplier) {
      filtered = filtered.filter(p => p.supplier === selectedSupplier);
    }

    if (selectedCostCenter) {
      filtered = filtered.filter(p => p.costCenter === selectedCostCenter);
    }

    if (selectedApprovedBy) {
      filtered = filtered.filter(p => p.approvedBy === selectedApprovedBy);
    }

    if (selectedReceiptStatus === 'received') {
      filtered = filtered.filter(p => p.receiptReceived === true);
    } else if (selectedReceiptStatus === 'pending') {
      filtered = filtered.filter(p => !p.receiptReceived);
    }

    if (selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number);
      filtered = filtered.filter(p => {
        const purchaseDate = new Date(p.date);
        return purchaseDate.getFullYear() === year && purchaseDate.getMonth() === month - 1;
      });
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [purchases, selectedLocation, selectedCategory, selectedStatus, selectedPriority, 
      selectedCreatedBy, selectedSupplier, selectedCostCenter, selectedApprovedBy, 
      selectedReceiptStatus, selectedMonth]);

  // Beräkna total uppskattad kostnad för filtrerade resultat
  const totalEstimatedCost = useMemo(() => {
    return filteredPurchases.reduce((sum, p) => sum + (p.estimatedCost || 0), 0);
  }, [filteredPurchases]);

  // Beräkna total faktisk kostnad för filtrerade resultat
  const totalActualCost = useMemo(() => {
    return filteredPurchases.reduce((sum, p) => sum + (p.actualCost || 0), 0);
  }, [filteredPurchases]);

  // Rensa markeringar när filter ändras och markerade items inte längre finns i filtret
  useEffect(() => {
    setSelectedPurchases((prev) => {
      if (prev.size === 0) {
        return prev;
      }

      const validIds = new Set(filteredPurchases.map(p => p.id));
      let hasChanged = false;
      const next = new Set<string>();

      prev.forEach((id) => {
        if (validIds.has(id)) {
          next.add(id);
        } else {
          hasChanged = true;
        }
      });

      return hasChanged ? next : prev;
    });
  }, [filteredPurchases]);

  const handleAdd = async () => {
    if (!formData.product.trim() || !formData.date) {
      alert('Vänligen fyll i produkt och datum');
      return;
    }

    try {
      const newPurchase = await addPurchase(
        new Date(formData.date),
        userEmail,
        userDisplayName, // Använd displayName istället för email
        formData.category,
        formData.product,
        formData.priority,
        formData.location || undefined,
        formData.estimatedCost > 0 ? formData.estimatedCost : undefined,
        formData.notes.trim() || undefined,
        formData.status,
        formData.supplier.trim() || undefined,
        formData.costCenter.trim() || undefined,
        formData.approvedBy.trim() || undefined,
        formData.expectedDeliveryDate ? new Date(formData.expectedDeliveryDate) : undefined,
        formData.receiptReceived
      );

      // Lägg till statushistorik för initial status (kommer också från Firebase men vi sätter lokalt för snabbare UI)
      const purchaseWithHistory = {
        ...newPurchase,
        statusHistory: [{
          status: formData.status,
          changedBy: userDisplayName,
          changedByEmail: userEmail,
          changedAt: new Date(),
        }],
      };

      // State kommer att uppdateras via cache/subscription, men uppdatera lokalt också för snabbare UI
      setPurchases([...purchases, purchaseWithHistory]);
      setIsAdding(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        category: 'Övrigt',
        product: '',
        priority: 3,
        location: selectedLocation || '',
        estimatedCost: 0,
        notes: '',
        status: 'Väntar',
        supplier: '',
        costCenter: '',
        approvedBy: '',
        expectedDeliveryDate: '',
        receiptReceived: false,
      });
    } catch (error) {
      console.error('Error adding purchase:', error);
      alert('Kunde inte lägga till beställning. Försök igen.');
    }
  };

  const handleEdit = (purchase: Purchase) => {
    if (isCoach) {
      alert('Du har inte behörighet att redigera beställningar');
      return;
    }
    setEditingId(purchase.id);
    setFormData({
      date: format(new Date(purchase.date), 'yyyy-MM-dd'),
      category: purchase.category,
      product: purchase.product,
      priority: purchase.priority,
      location: purchase.location || '',
      estimatedCost: purchase.estimatedCost || 0,
      notes: purchase.notes || '',
      status: purchase.status,
      supplier: purchase.supplier || '',
      costCenter: purchase.costCenter || '',
      approvedBy: purchase.approvedBy || '',
      expectedDeliveryDate: purchase.expectedDeliveryDate ? format(new Date(purchase.expectedDeliveryDate), 'yyyy-MM-dd') : '',
      receiptReceived: purchase.receiptReceived || false,
    });
    setIsAdding(false);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    try {
      const updated = await updatePurchase(editingId, {
        date: new Date(formData.date),
        category: formData.category,
        product: formData.product,
        priority: formData.priority,
        location: formData.location || undefined,
        estimatedCost: formData.estimatedCost > 0 ? formData.estimatedCost : undefined,
        notes: formData.notes.trim() || undefined,
        status: formData.status,
        supplier: formData.supplier.trim() || undefined,
        costCenter: formData.costCenter.trim() || undefined,
        approvedBy: formData.approvedBy.trim() || undefined,
        expectedDeliveryDate: formData.expectedDeliveryDate ? new Date(formData.expectedDeliveryDate) : undefined,
        receiptReceived: formData.receiptReceived,
      });

      if (updated) {
        // State kommer att uppdateras via cache/subscription, men uppdatera lokalt också för snabbare UI
        const updatedPurchases = purchases.map(p =>
          p.id === editingId
            ? {
                ...p,
                date: new Date(formData.date),
                category: formData.category,
                product: formData.product,
                priority: formData.priority,
                location: formData.location,
                estimatedCost: formData.estimatedCost,
                notes: formData.notes,
                status: formData.status,
                supplier: formData.supplier,
                costCenter: formData.costCenter,
                approvedBy: formData.approvedBy,
                expectedDeliveryDate: formData.expectedDeliveryDate ? new Date(formData.expectedDeliveryDate) : undefined,
                receiptReceived: formData.receiptReceived,
              }
            : p
        );
        setPurchases(updatedPurchases);
        setEditingId(null);
        setFormData({
          date: new Date().toISOString().split('T')[0],
          category: 'Övrigt',
          product: '',
          priority: 3,
          location: selectedLocation || '',
          estimatedCost: 0,
          notes: '',
          status: 'Väntar',
          supplier: '',
          costCenter: '',
          approvedBy: '',
          expectedDeliveryDate: '',
          receiptReceived: false,
        });
      }
    } catch (error) {
      console.error('Error updating purchase:', error);
      alert('Kunde inte uppdatera beställning. Försök igen.');
    }
  };

  const handleDelete = async (id: string) => {
    if (isCoach) {
      alert('Du har inte behörighet att ta bort beställningar');
      return;
    }
    if (!confirm('Är du säker på att du vill ta bort denna beställning?')) return;

    try {
      const deleted = await deletePurchase(id);
      if (deleted) {
        // State kommer att uppdateras via cache/subscription, men uppdatera lokalt också för snabbare UI
        setPurchases(purchases.filter(p => p.id !== id));
      }
    } catch (error) {
      console.error('Error deleting purchase:', error);
      alert('Kunde inte ta bort beställning. Försök igen.');
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      category: 'Övrigt',
      product: '',
      priority: 3,
      location: selectedLocation || '',
      estimatedCost: 0,
      notes: '',
      status: 'Väntar',
      supplier: '',
      costCenter: '',
      approvedBy: '',
      expectedDeliveryDate: '',
      receiptReceived: false,
    });
  };

  // Hantera direkt statusändring från tabellen
  const handleStatusChange = async (purchaseId: string, newStatus: PurchaseStatus) => {
    if (isCoach) {
      alert('Du har inte behörighet att ändra status på beställningar');
      return;
    }
    try {
      const purchase = purchases.find(p => p.id === purchaseId);
      if (!purchase) return;

      // Skapa ny statushistorik-post
      const newHistoryEntry: StatusHistoryEntry = {
        status: newStatus,
        changedBy: userDisplayName,
        changedByEmail: userEmail,
        changedAt: new Date(),
      };

      const updatedHistory = [...(purchase.statusHistory || []), newHistoryEntry];
      
      const updates: any = { 
        status: newStatus,
        statusHistory: updatedHistory,
      };
      
      // Om status ändras till "Godkänd", sätt även approvedBy (för bakåtkompatibilitet)
      if (newStatus === 'Godkänd') {
        updates.approvedBy = userDisplayName;
      }
      
      const updated = await updatePurchase(purchaseId, updates);
      if (updated) {
        // Uppdatera lokalt state för snabbare UI
        setPurchases(purchases.map(p => 
          p.id === purchaseId ? { ...p, ...updates } : p
        ));
      }
    } catch (error) {
      console.error('Error updating purchase status:', error);
      alert('Kunde inte uppdatera status. Försök igen.');
    }
  };

  // Hantera direkt prioritetsändring från tabellen
  const handlePriorityChange = async (purchaseId: string, newPriority: 1 | 2 | 3 | 4) => {
    if (isCoach) {
      alert('Du har inte behörighet att ändra prioritet på beställningar');
      return;
    }
    try {
      const updated = await updatePurchase(purchaseId, { priority: newPriority });
      if (updated) {
        // Uppdatera lokalt state för snabbare UI
        setPurchases(purchases.map(p => 
          p.id === purchaseId ? { ...p, priority: newPriority } : p
        ));
      }
    } catch (error) {
      console.error('Error updating purchase priority:', error);
      alert('Kunde inte uppdatera prioritet. Försök igen.');
    }
  };

  // Bulk selection funktioner
  const allSelected = filteredPurchases.length > 0 && selectedPurchases.size === filteredPurchases.length;

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedPurchases(new Set());
      return;
    }
    setSelectedPurchases(new Set(filteredPurchases.map(p => p.id)));
  };

  const handlePurchaseSelectionChange = (purchaseId: string, checked: boolean) => {
    setSelectedPurchases((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(purchaseId);
      } else {
        next.delete(purchaseId);
      }
      return next;
    });
  };

  // Bulk uppdatering av status
  const handleBulkStatusUpdate = async (status: PurchaseStatus) => {
    const targets = filteredPurchases.filter(p => selectedPurchases.has(p.id));

    if (targets.length === 0) {
      return;
    }

    setIsBulkUpdating(true);
    try {
      // Skapa ny statushistorik-post
      const newHistoryEntry: StatusHistoryEntry = {
        status,
        changedBy: userDisplayName,
        changedByEmail: userEmail,
        changedAt: new Date(),
      };

      await Promise.all(
        targets.map(p => {
          const updatedHistory = [...(p.statusHistory || []), newHistoryEntry];
          const updates: any = { 
            status,
            statusHistory: updatedHistory,
          };
          
          // Om status ändras till "Godkänd", sätt även approvedBy
          if (status === 'Godkänd') {
            updates.approvedBy = userDisplayName;
          }
          
          return updatePurchase(p.id, updates);
        })
      );
      
      // Uppdatera lokalt state
      setPurchases(purchases.map(p => {
        if (selectedPurchases.has(p.id)) {
          const updatedHistory = [...(p.statusHistory || []), newHistoryEntry];
          return { 
            ...p, 
            status,
            statusHistory: updatedHistory,
            approvedBy: status === 'Godkänd' ? userDisplayName : p.approvedBy,
          };
        }
        return p;
      }));
      setSelectedPurchases(new Set());
    } catch (error) {
      console.error('Fel vid bulkuppdatering av status:', error);
      alert('Kunde inte uppdatera alla beställningar. Försök igen.');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Bulk uppdatering av prioritet
  const handleBulkPriorityUpdate = async (priority: 1 | 2 | 3 | 4) => {
    const targets = filteredPurchases.filter(p => selectedPurchases.has(p.id));

    if (targets.length === 0) {
      return;
    }

    setIsBulkUpdating(true);
    try {
      await Promise.all(
        targets.map(p => updatePurchase(p.id, { priority }))
      );
      // Uppdatera lokalt state
      setPurchases(purchases.map(p => 
        selectedPurchases.has(p.id) ? { ...p, priority } : p
      ));
      setSelectedPurchases(new Set());
    } catch (error) {
      console.error('Fel vid bulkuppdatering av prioritet:', error);
      alert('Kunde inte uppdatera alla beställningar. Försök igen.');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Hämta person som gjorde en specifik statusändring
  const getPersonForStatus = (purchase: Purchase, status: PurchaseStatus): string | null => {
    if (!purchase.statusHistory) return null;
    
    // Hitta senaste instansen av denna status
    const entries = purchase.statusHistory.filter((entry: StatusHistoryEntry) => entry.status === status);
    if (entries.length === 0) return null;
    
    const latestEntry = entries[entries.length - 1];
    return latestEntry.changedBy;
  };

  // Formatera statushistorik för tooltip
  const formatStatusHistory = (purchase: Purchase): string => {
    if (!purchase.statusHistory || purchase.statusHistory.length === 0) {
      return 'Ingen historik';
    }

    return purchase.statusHistory
      .map((entry: StatusHistoryEntry) => {
        const date = format(new Date(entry.changedAt), 'd MMM HH:mm', { locale: sv });
        return `${entry.status}: ${entry.changedBy} (${date})`;
      })
      .join('\n');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inköp och beställningar</h1>
          <p className="text-gray-600 mt-1">Hantera och följ upp inköp och beställningar</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-3">Filter</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-900 mb-1.5">
              <Calendar className="w-3 h-3 inline mr-1" />
              Månad
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-900 mb-1.5">
              <MapPin className="w-3 h-3 inline mr-1" />
              Ort
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 text-sm"
            >
              <option value="">Alla</option>
              {PLACES.map((place) => (
                <option key={place} value={place}>{place}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-900 mb-1.5">Kategori</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 text-sm"
            >
              <option value="">Alla</option>
              {PURCHASE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-900 mb-1.5">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 text-sm"
            >
              <option value="">Alla</option>
              {PURCHASE_STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-900 mb-1.5">Prioritet</label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 text-sm"
            >
              <option value="">Alla</option>
              {PRIORITIES.map((prio) => (
                <option key={prio} value={prio}>{prio}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-900 mb-1.5">Skapad av</label>
            <select
              value={selectedCreatedBy}
              onChange={(e) => setSelectedCreatedBy(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 text-sm"
            >
              <option value="">Alla</option>
              {uniqueCreators.map((creator) => (
                <option key={creator} value={creator}>{creator}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-900 mb-1.5">Leverantör</label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 text-sm"
            >
              <option value="">Alla</option>
              {uniqueSuppliers.map((supplier) => (
                <option key={supplier} value={supplier}>{supplier}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-900 mb-1.5">Kostnadsctr</label>
            <select
              value={selectedCostCenter}
              onChange={(e) => setSelectedCostCenter(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 text-sm"
            >
              <option value="">Alla</option>
              {uniqueCostCenters.map((center) => (
                <option key={center} value={center}>{center}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-900 mb-1.5">Godkänd av</label>
            <select
              value={selectedApprovedBy}
              onChange={(e) => setSelectedApprovedBy(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 text-sm"
            >
              <option value="">Alla</option>
              {uniqueApprovers.map((approver) => (
                <option key={approver} value={approver}>{approver}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-900 mb-1.5">Kvitto</label>
            <select
              value={selectedReceiptStatus}
              onChange={(e) => setSelectedReceiptStatus(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 text-sm"
            >
              <option value="">Alla</option>
              <option value="received">Ja</option>
              <option value="pending">Nej</option>
            </select>
          </div>

          <div className="flex items-end md:col-span-2">
            <button
              onClick={() => {
                setIsAdding(true);
                setEditingId(null);
                setFormData({
                  date: new Date().toISOString().split('T')[0],
                  category: 'Övrigt',
                  product: '',
                  priority: 3,
                  location: selectedLocation || '',
                  estimatedCost: 0,
                  notes: '',
                  status: 'Väntar',
                  supplier: '',
                  costCenter: selectedLocation || '',
                  approvedBy: '',
                  expectedDeliveryDate: '',
                  receiptReceived: false,
                });
              }}
              className="w-full px-4 py-2 bg-[#1E5A7D] text-white rounded-md hover:bg-[#164A6D] transition flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Lägg till beställning
            </button>
          </div>
        </div>
      </div>

      {/* Formulär för att lägga till/redigera */}
      {(isAdding || editingId) && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {editingId ? 'Redigera beställning' : 'Lägg till beställning'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Datum <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Kategori
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as PurchaseCategory })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
              >
                {PURCHASE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3 lg:col-span-4">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Produkt/Artikel <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.product}
                onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                placeholder="Beskriv vad som ska köpas in..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Prioritet
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) as 1 | 2 | 3 | 4 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
              >
                {PRIORITIES.map((prio) => (
                  <option key={prio} value={prio}>
                    {prio} - {PRIORITY_LABELS[prio]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Ort
              </label>
              <select
                value={formData.location}
              onChange={(e) => {
                const newLocation = e.target.value;
                setFormData({ 
                  ...formData, 
                  location: newLocation,
                  costCenter: newLocation || formData.costCenter // Sätt kostnadscenter till ort automatiskt
                });
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
            >
              <option value="">Välj ort</option>
              {PLACES.map((place) => (
                <option key={place} value={place}>
                  {place}
                </option>
              ))}
            </select>
          </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Uppskattat belopp (SEK)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={formData.estimatedCost}
                onChange={(e) => setFormData({ ...formData, estimatedCost: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as PurchaseStatus })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
              >
                {PURCHASE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Leverantör
              </label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                placeholder="T.ex. IKEA, Webhallen..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Kostnadscenter
              </label>
              <select
                value={formData.costCenter}
                onChange={(e) => setFormData({ ...formData, costCenter: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
              >
                <option value="">Välj kostnadscenter</option>
                {PLACES.map((place) => (
                  <option key={place} value={place}>
                    {place}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Godkänd av
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.approvedBy}
                  onChange={(e) => setFormData({ ...formData, approvedBy: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                  placeholder="Namn på godkännare..."
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, approvedBy: userDisplayName })}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition text-sm whitespace-nowrap"
                  title="Fyll i mitt namn"
                >
                  Jag godkänner
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Fylls i automatiskt när status ändras till "Godkänd"
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Förväntad leverans
              </label>
              <input
                type="date"
                value={formData.expectedDeliveryDate}
                onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="receiptReceived"
                checked={formData.receiptReceived}
                onChange={(e) => setFormData({ ...formData, receiptReceived: e.target.checked })}
                className="w-5 h-5 text-[#1E5A7D] border-gray-300 rounded focus:ring-[#1E5A7D]"
              />
              <label htmlFor="receiptReceived" className="text-sm font-medium text-gray-900 cursor-pointer">
                Kvitto/Faktura mottagen
              </label>
            </div>

            <div className="md:col-span-3 lg:col-span-4">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Anteckningar
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                placeholder="Eventuella anteckningar..."
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={editingId ? handleSaveEdit : handleAdd}
              className="px-4 py-2 bg-[#1E5A7D] text-white rounded-lg hover:bg-[#164A6D] transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {editingId ? 'Spara ändringar' : 'Lägg till'}
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Avbryt
            </button>
          </div>
        </div>
      )}

      {/* Sammanfattning */}
      {filteredPurchases.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-900">
            <ShoppingCart className="w-5 h-5" />
            <span className="font-semibold">
              Totalt: {filteredPurchases.length} beställningar
              {totalEstimatedCost > 0 && ` • Uppskattat: ${totalEstimatedCost.toLocaleString('sv-SE')} kr`}
              {totalActualCost > 0 && ` • Faktiskt: ${totalActualCost.toLocaleString('sv-SE')} kr`}
            </span>
          </div>
        </div>
      )}

      {/* Lista över inköp */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Bulk actions bar */}
        {selectedPurchases.size > 0 && (
          <div className="px-4 py-3 border-b border-blue-100 bg-blue-50">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-medium text-blue-900">
                  Valda beställningar: {selectedPurchases.size}
                </p>
                {isBulkUpdating && (
                  <span className="text-xs text-blue-800">Uppdaterar...</span>
                )}
              </div>
              
              {/* Bulk status buttons */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-blue-800">Ändra status för markerade:</p>
                <div className="flex flex-wrap gap-2">
                  {PURCHASE_STATUSES.map((status) => (
                    <button
                      key={status}
                      onClick={() => handleBulkStatusUpdate(status)}
                      disabled={isBulkUpdating}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-transparent shadow-sm transition hover:opacity-90 disabled:opacity-50 bg-blue-100 text-blue-900 hover:bg-blue-200"
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bulk priority buttons */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-blue-800">Ändra prioritet för markerade:</p>
                <div className="flex flex-wrap gap-2">
                  {PRIORITIES.map((priority) => (
                    <button
                      key={priority}
                      onClick={() => handleBulkPriorityUpdate(priority)}
                      disabled={isBulkUpdating}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-transparent shadow-sm transition hover:opacity-90 disabled:opacity-50 bg-blue-100 text-blue-900 hover:bg-blue-200"
                    >
                      {priority} - {PRIORITY_LABELS[priority]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-3 text-left w-10">
                  <button
                    onClick={handleToggleSelectAll}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition"
                    title={allSelected ? 'Avmarkera alla' : 'Markera alla'}
                  >
                    {allSelected ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Datum
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produkt / Info
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prioritet
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kvitto
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Belopp
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Åtgärder
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    Inga beställningar hittades för valda filter
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((purchase) => {
                  const isSelected = selectedPurchases.has(purchase.id);
                  return (
                    <tr 
                      key={purchase.id} 
                      className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-3 py-3">
                        <button
                          onClick={() => handlePurchaseSelectionChange(purchase.id, !isSelected)}
                          className="flex items-center text-gray-500 hover:text-gray-700 transition"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-900">
                        {format(new Date(purchase.date), 'd MMM', { locale: sv })}
                      </td>
                      <td className="px-3 py-3 text-sm">
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900">{purchase.product}</div>
                          <div className="text-xs text-gray-500 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px]">
                                {purchase.category}
                              </span>
                              {purchase.location && (
                                <span className="text-gray-600">📍 {purchase.location}</span>
                              )}
                            </div>
                            {/* Statuskedja - visa vem som gjort varje steg */}
                            <div className="flex flex-wrap gap-2 text-[11px]">
                              {purchase.createdByName && (
                                <span title="Skapad av" className="text-gray-600">
                                  📝 {purchase.createdByName}
                                </span>
                              )}
                              {getPersonForStatus(purchase, 'Godkänd') && (
                                <span title="Godkänd av" className="text-green-700">
                                  ✓ {getPersonForStatus(purchase, 'Godkänd')}
                                </span>
                              )}
                              {getPersonForStatus(purchase, 'Beställd') && (
                                <span title="Beställd av" className="text-blue-700">
                                  🛒 {getPersonForStatus(purchase, 'Beställd')}
                                </span>
                              )}
                              {getPersonForStatus(purchase, 'Levererad') && (
                                <span title="Levererad/Mottagen av" className="text-green-600">
                                  📦 {getPersonForStatus(purchase, 'Levererad')}
                                </span>
                              )}
                              {getPersonForStatus(purchase, 'Avbruten') && (
                                <span title="Avbruten av" className="text-red-600">
                                  ✕ {getPersonForStatus(purchase, 'Avbruten')}
                                </span>
                              )}
                            </div>
                            {/* Extra info */}
                            {(purchase.supplier || purchase.expectedDeliveryDate) && (
                              <div className="flex flex-wrap gap-2 text-[11px] text-gray-500">
                                {purchase.supplier && (
                                  <span title="Leverantör">🏪 {purchase.supplier}</span>
                                )}
                                {purchase.expectedDeliveryDate && (
                                  <span title="Förväntad leverans">📅 {format(new Date(purchase.expectedDeliveryDate), 'd MMM', { locale: sv })}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <PrioritySelect
                          value={purchase.priority}
                          onChange={(priority) => handlePriorityChange(purchase.id, priority)}
                          disabled={isCoach}
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div title={formatStatusHistory(purchase)}>
                          <PurchaseStatusSelect
                            value={purchase.status}
                            onChange={(status) => handleStatusChange(purchase.id, status)}
                            disabled={isCoach}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {purchase.receiptReceived ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-green-100 text-green-600 rounded-full text-sm" title="Kvitto mottaget">
                            ✓
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 text-gray-400 rounded-full text-sm" title="Väntar på kvitto">
                            −
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {purchase.estimatedCost ? `${purchase.estimatedCost.toLocaleString('sv-SE')} kr` : '-'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {!isCoach && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEdit(purchase)}
                              className="p-1.5 text-[#1E5A7D] hover:bg-[#1E5A7D] hover:text-white rounded transition"
                              title="Redigera"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(purchase.id)}
                              className="p-1.5 text-red-600 hover:bg-red-600 hover:text-white rounded transition"
                              title="Ta bort"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

