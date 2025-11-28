'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import { useCustomers } from '@/lib/CustomerContext';
import { Customer } from '@/types';
import { PLACES, SPORTS, MEMBERSHIPS, TESTS, SERVICES, STATUSES, PAYMENT_METHODS, INVOICE_STATUSES, BILLING_INTERVALS, calculatePrice, isTestService, isMembershipService, getTestType } from '@/lib/constants';
import { Save, X, Plus, Trash2, Edit2, Copy } from 'lucide-react';
import { format, endOfMonth, addMonths } from 'date-fns';
import { sv } from 'date-fns/locale';

// Funktion för att beräkna uppsägningstid baserat på medlemskapstyp
const getNoticePeriodMonths = (serviceType: string): number => {
  if (serviceType.includes('Standard')) {
    return 4; // 4 månader för Standard
  } else if (serviceType.includes('Premium')) {
    return 2; // 2 månader för Premium
  } else if (serviceType.includes('Supreme')) {
    return 1; // 1 månad för Supreme
  }
  return 0; // Ingen uppsägningstid för andra typer
};
import { SERVICE_COLORS } from '@/lib/constants';
import { ServiceEntry } from '@/types';
import MembershipTimeline from '@/components/MembershipTimeline';
import CoachAutocomplete from '@/components/CoachAutocomplete';
import { getCoachProfileSync } from '@/lib/coachProfiles';
import { getAllServicesAndPrices, subscribeToServicesAndPrices, ServicePrice } from '@/lib/realtimeDatabase';
import { getUserRoleSync } from '@/lib/auth';

export default function EditCustomerPage() {
  const router = useRouter();
  const [services, setServices] = useState<ServicePrice[]>([]);
  const params = useParams();
  const { customers, updateCustomer } = useCustomers();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [serviceHistory, setServiceHistory] = useState<ServiceEntry[]>([]);
  const [showAddService, setShowAddService] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalCustomer, setOriginalCustomer] = useState<Customer | null>(null);
  const [originalServiceHistory, setOriginalServiceHistory] = useState<ServiceEntry[]>([]);
  const [justSaved, setJustSaved] = useState(false);

  const defaultPrice = calculatePrice('Membership Standard', 'Löpning', false);
  const userRole = getUserRoleSync();
  const canDeleteServices = userRole === 'admin' || userRole === 'superuser';
  
  const [newService, setNewService] = useState<{
    service: string;
    sport: string;
    originalPrice: number;
    discount: number;
    price: number;
    priceNote: string;
    date: string;
    status: string;
    usePercentage: boolean;
    endDate: string;
    coach: string;
    paymentMethod: string;
    invoiceStatus: string;
    billingInterval: string;
    numberOfMonths: number;
    nextInvoiceDate: string;
    paidUntil: string;
    invoiceReference: string;
    invoiceNote: string;
  }>({
    service: 'Membership Standard',
    sport: 'Löpning',
    originalPrice: defaultPrice,
    discount: 0,
    price: defaultPrice,
    priceNote: '',
    date: new Date().toISOString().split('T')[0],
    status: 'Aktiv',
    usePercentage: true,
    endDate: '',
    coach: '',
    // Betalningsinformation
    paymentMethod: 'Faktura',
    invoiceStatus: 'Väntar på betalning',
    billingInterval: 'Månadsvis',
    numberOfMonths: 1,
    nextInvoiceDate: '',
    paidUntil: '',
    invoiceReference: '',
    invoiceNote: '',
  });

  const [editingService, setEditingService] = useState<string | null>(null);
  const [overrideNoticePeriod, setOverrideNoticePeriod] = useState(false);
  const [editedServiceData, setEditedServiceData] = useState<any>(null);

  // Ladda tjänster från Firebase
  useEffect(() => {
    const loadServices = async () => {
      try {
        const loadedServices = await getAllServicesAndPrices();
        setServices(loadedServices);
      } catch (error) {
        console.error('Error loading services:', error);
      }
    };

    loadServices();

    // Prenumerera på realtidsuppdateringar
    const unsubscribe = subscribeToServicesAndPrices((updatedServices) => {
      setServices(updatedServices);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const foundCustomer = customers.find((c) => c.id === params.id);
    if (foundCustomer) {
      // Ladda serviceHistory om det finns, annars skapa initial från nuvarande tjänst
      let history: ServiceEntry[];
      if (foundCustomer.serviceHistory && foundCustomer.serviceHistory.length > 0) {
        history = foundCustomer.serviceHistory.map(entry => ({
          ...entry,
          // Behåll endDate som det är - sätt INTE automatiskt för aktiva tjänster
          endDate: entry.endDate ? new Date(entry.endDate) : undefined,
        }));
      } else {
        history = [
          {
            id: 'initial',
            service: foundCustomer.service,
            price: foundCustomer.price,
            originalPrice: foundCustomer.price,
            date: foundCustomer.date,
            status: foundCustomer.status,
            sport: foundCustomer.sport,
            endDate: foundCustomer.status === 'Aktiv' ? undefined : foundCustomer.date,
            coach: foundCustomer.coach,
            coachHistory: foundCustomer.coach ? [{ coach: foundCustomer.coach, date: foundCustomer.date }] : undefined,
          },
        ];
      }
      setServiceHistory(history);
      setOriginalServiceHistory(JSON.parse(JSON.stringify(history))); // Deep copy
      
      // Uppdatera kunden med den senaste AKTIVA tjänsten
      const activeService = history.find(s => s.status === 'Aktiv') || history[0];
      const updatedCustomer = {
        ...foundCustomer,
        service: activeService.service,
        price: activeService.price,
        date: activeService.date,
        status: activeService.status,
      };
      setCustomer(updatedCustomer);
      setOriginalCustomer(JSON.parse(JSON.stringify(updatedCustomer))); // Deep copy
      setHasUnsavedChanges(false);
    }
  }, [params.id, customers]);

  const handleUpdateCustomer = (field: string, value: any) => {
    if (customer) {
      setCustomer({ ...customer, [field]: value });
      setHasUnsavedChanges(true);
    }
  };


  // Uppdatera hasUnsavedChanges när serviceHistory eller customer ändras
  // Men ignorera om vi precis har sparat (originalCustomer/originalServiceHistory är null eller tom)
  useEffect(() => {
    // Om vi precis har sparat, ignorera ändringar från Firebase listener
    if (justSaved) {
      return;
    }
    
    // Om originalCustomer eller originalServiceHistory inte är satta ännu, ignorera
    if (!originalCustomer || originalServiceHistory.length === 0) {
      return;
    }
    
    // Om vi är i redigeringsläge, låt den andra useEffect hantera hasUnsavedChanges
    if (editingService !== null) {
      return;
    }
    
    const serviceHistoryChanged = JSON.stringify(serviceHistory) !== JSON.stringify(originalServiceHistory);
    const customerChanged = JSON.stringify(customer) !== JSON.stringify(originalCustomer);
    const hasChanges = serviceHistoryChanged || customerChanged;
    setHasUnsavedChanges(hasChanges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceHistory, customer, originalServiceHistory, originalCustomer, justSaved]);

  // Sätt hasUnsavedChanges när man redigerar en tjänst
  useEffect(() => {
    if (editingService && editedServiceData) {
      setHasUnsavedChanges(true);
    }
  }, [editingService, editedServiceData]);

  const handleServiceChange = (selectedService: string) => {
    // ALLTID använd pris från Firebase - INGEN fallback till hårdkodade priser
    let suggestedPrice = 0;
    const serviceFromFirebase = services.find(s => s.service === selectedService);
    
    if (serviceFromFirebase) {
      // Tjänsten finns i Firebase - använd dess pris direkt
      suggestedPrice = serviceFromFirebase.basePrice;
    } else {
      // Om tjänsten inte finns i Firebase, visa 0
      suggestedPrice = 0;
    }
    
    const autoStatus = isTestService(selectedService) ? 'Genomförd' : 'Aktiv';
    
    setNewService({
      ...newService,
      service: selectedService,
      originalPrice: suggestedPrice,
      price: suggestedPrice,
      discount: 0,
      status: autoStatus,
    });
  };

  const handleSportChangeForNewService = (selectedSport: string) => {
    // ALLTID använd pris från Firebase - INGEN fallback till hårdkodade priser
    let suggestedPrice = 0;
    const serviceFromFirebase = services.find(s => s.service === newService.service);
    
    if (serviceFromFirebase) {
      // Tjänsten finns i Firebase - använd dess pris direkt
      suggestedPrice = serviceFromFirebase.basePrice;
    } else {
      // Om tjänsten inte finns i Firebase, visa 0
      suggestedPrice = 0;
    }
    
    setNewService({
      ...newService,
      sport: selectedSport,
      originalPrice: suggestedPrice,
      price: suggestedPrice,
      discount: 0,
    });
  };

  const handleDiscountChange = (value: number) => {
    if (newService.usePercentage) {
      // Procentrabatt
      const discountAmount = (newService.originalPrice * value) / 100;
      const finalPrice = Math.round(newService.originalPrice - discountAmount);
      setNewService({
        ...newService,
        discount: value,
        price: finalPrice,
      });
    } else {
      // Fast rabatt
      setNewService({
        ...newService,
        discount: value,
      });
    }
  };

  const handleManualPriceChange = (value: number) => {
    const discount = newService.originalPrice - value;
    const discountPercent = Math.round((discount / newService.originalPrice) * 100);
    
    setNewService({
      ...newService,
      price: value,
      discount: newService.usePercentage ? discountPercent : discount,
    });
  };

  const handleAddService = () => {
    // Validering
    if (!newService.price || newService.price <= 0) {
      alert('Ange ett giltigt pris');
      return;
    }

    // Gren är obligatorisk för memberships
    if (isMembershipService(newService.service) && !newService.sport) {
      alert('Gren måste anges för memberships');
      return;
    }

    // Coach är obligatorisk - använd den valda coachen eller kundens huvudcoach
    const coachName = newService.coach || customer?.coach || '';
    if (!coachName) {
      alert('Coach måste anges för alla tjänster');
      return;
    }

    // Slutdatum är obligatoriskt för inaktiva/pausade/genomförda tjänster
    // För "Genomförd" sätts slutdatum automatiskt till startdatum
    let endDate = newService.endDate;
    if (newService.status === 'Genomförd') {
      endDate = newService.date; // Samma som startdatum
    } else if (newService.status !== 'Aktiv' && !endDate) {
      alert('Slutdatum måste anges för inaktiva, pausade eller genomförda tjänster');
      return;
    }
    // För aktiva tjänster ska slutdatum INTE fyllas i automatiskt

    const serviceEntry: ServiceEntry = {
      id: `service_${Date.now()}`,
      service: newService.service as any,
      price: newService.price,
      originalPrice: newService.originalPrice,
      discount: newService.discount !== 0 ? newService.discount : undefined,
      priceNote: newService.priceNote || undefined,
      date: new Date(newService.date),
      status: newService.status as any,
      endDate: endDate ? new Date(endDate) : undefined,
      sport: newService.sport as any,
      coach: coachName, // Coach är alltid satt här
      coachHistory: [{ coach: coachName, date: new Date(newService.date) }], // Starta coach-historik
      // Betalningsinformation per tjänst
      paymentMethod: newService.paymentMethod as any,
      invoiceStatus: newService.invoiceStatus as any,
      billingInterval: newService.billingInterval as any,
      numberOfMonths: newService.numberOfMonths || undefined,
      // För månadsvis fakturering: sätt nästa faktureringsdatum till slutet av månaden om inte användaren har angett ett datum
      nextInvoiceDate: newService.nextInvoiceDate 
        ? new Date(newService.nextInvoiceDate) 
        : (newService.billingInterval === 'Månadsvis' ? endOfMonth(new Date(newService.date)) : undefined),
      paidUntil: newService.paidUntil ? new Date(newService.paidUntil) : undefined,
      invoiceReference: newService.invoiceReference || undefined,
      invoiceNote: newService.invoiceNote || undefined,
    };

    const updatedHistory = [serviceEntry, ...serviceHistory];
    setServiceHistory(updatedHistory);
    setHasUnsavedChanges(true);
    
    // Uppdatera kundens huvudtjänst till den senaste AKTIVA tjänsten
    // Om det är ett nytt membership, uppdatera också huvudcoachen
    if (customer) {
      // Hitta den senaste aktiva tjänsten (prioritet för "Aktiv", annars den senaste)
      const activeService = updatedHistory.find(s => s.status === 'Aktiv') || updatedHistory[0];
      
      // Om den nya tjänsten är ett membership och har en coach, uppdatera huvudcoachen
      const isNewMembership = isMembershipService(serviceEntry.service);
      
      // Om det är ett nytt membership och tjänsten har en coach, använd den coachen
      // Annars behåll den nuvarande huvudcoachen
      let newMainCoach = customer.coach;
      if (isNewMembership && serviceEntry.coach) {
        newMainCoach = serviceEntry.coach;
      }
      
      setCustomer({
        ...customer,
        service: activeService.service as any,
        price: activeService.price,
        date: activeService.date,
        status: activeService.status as any,
        coach: newMainCoach,
        serviceHistory: updatedHistory,
      });
      
      // Uppdatera även i Firebase så att ändringarna sparas
      updateCustomer(customer.id, {
        service: activeService.service as any,
        price: activeService.price,
        date: activeService.date,
        status: activeService.status as any,
        coach: newMainCoach,
        serviceHistory: updatedHistory,
      }).catch((error) => {
        console.error('Fel vid uppdatering av kund:', error);
      });
    }

    // Hämta senior-status från coach-profilen
    const coachProfile = customer?.coach ? getCoachProfileSync(customer.coach) : null;
    const isSeniorCoach = coachProfile?.isSeniorCoach || false;
    
    const suggestedPrice = calculatePrice(
      'Membership Standard',
      'Löpning',
      isSeniorCoach
    );
    setNewService({
      service: 'Membership Standard',
      sport: 'Löpning',
      originalPrice: suggestedPrice,
      discount: 0,
      price: suggestedPrice,
      priceNote: '',
      date: new Date().toISOString().split('T')[0],
      status: 'Aktiv',
      usePercentage: true,
      endDate: '', // Lämna tomt för aktiva tjänster
      coach: customer?.coach || '',
      // Reset betalningsinformation
      paymentMethod: 'Faktura',
      invoiceStatus: 'Väntar på betalning',
      billingInterval: 'Månadsvis',
      numberOfMonths: 1,
      nextInvoiceDate: '',
      paidUntil: '',
      invoiceReference: '',
      invoiceNote: '',
    });
    setShowAddService(false);
  };

  const handleEditService = (entry: ServiceEntry) => {
    setEditingService(entry.id);
    setOverrideNoticePeriod(false); // Reset override när man börjar redigera
    
    // Beräkna originalPrice korrekt - om det saknas och det finns en rabatt, beräkna tillbaka
    let originalPrice = entry.originalPrice;
    if (!originalPrice && entry.discount && entry.discount !== 0) {
      // Om originalPrice saknas men det finns en rabatt, beräkna tillbaka från price och discount
      // price = originalPrice - (originalPrice * discount / 100)
      // price = originalPrice * (1 - discount / 100)
      // originalPrice = price / (1 - discount / 100)
      originalPrice = entry.price / (1 - entry.discount / 100);
    } else if (!originalPrice) {
      // Om det inte finns någon rabatt, använd price som originalPrice
      originalPrice = entry.price;
    }
    
    // Om status är "Genomförd" och inget slutdatum finns, sätt det till startdatum
    const entryStartDate = format(new Date(entry.date), 'yyyy-MM-dd');
    const entryEndDate = entry.endDate 
      ? format(new Date(entry.endDate), 'yyyy-MM-dd') 
      : (entry.status === 'Genomförd' ? entryStartDate : '');
    
    setEditedServiceData({
      ...entry,
      date: entryStartDate,
      endDate: entryEndDate,
      nextInvoiceDate: entry.nextInvoiceDate ? format(new Date(entry.nextInvoiceDate), 'yyyy-MM-dd') : '',
      paidUntil: entry.paidUntil ? format(new Date(entry.paidUntil), 'yyyy-MM-dd') : '',
      originalPrice: originalPrice,
      discount: entry.discount || 0,
      priceNote: entry.priceNote || '',
      sport: entry.sport || '',
      coach: entry.coach || '',
      paymentMethod: entry.paymentMethod || 'Faktura',
      invoiceStatus: entry.invoiceStatus || 'Ej aktuell',
      billingInterval: entry.billingInterval || 'Månadsvis',
      numberOfMonths: entry.numberOfMonths || 1,
      invoiceReference: entry.invoiceReference || '',
      invoiceNote: entry.invoiceNote || '',
    });
  };

  const handleSaveEdit = (id: string) => {
    // Coach är obligatorisk
    const newCoach = editedServiceData.coach || customer?.coach || '';
    if (!newCoach) {
      alert('Coach måste anges för alla tjänster');
      return;
    }

    // Slutdatum är obligatoriskt för inaktiva/pausade/genomförda tjänster
    // För "Genomförd" sätts slutdatum automatiskt till startdatum
    let endDate = editedServiceData.endDate;
    if (editedServiceData.status === 'Genomförd') {
      endDate = editedServiceData.date; // Samma som startdatum
    } else if (editedServiceData.status !== 'Aktiv' && !endDate) {
      alert('Slutdatum måste anges för inaktiva, pausade eller genomförda tjänster');
      return;
    }
    // För aktiva tjänster behöver vi INTE sätta slutdatum - det ska vara undefined
    // endDate är redan undefined om det inte är satt, vilket är korrekt för aktiva tjänster

    const entry = serviceHistory.find(e => e.id === id);
    const oldCoach = entry?.coach || '';
    
    // Om coachen har ändrats under ett membership, spåra bytet med datum
    let coachHistory = entry?.coachHistory || [];
    
    if (oldCoach && newCoach && oldCoach !== newCoach) {
      // Coach har ändrats - lägg till ny coach med datum för när bytet skedde
      // Om det är ett membership, behåller vi den gamla coachen med sitt slutdatum
      // och lägger till den nya coachen med startdatum
      
      // Hitta den senaste coachen i historiken
      const lastCoachEntry = coachHistory.length > 0 
        ? coachHistory[coachHistory.length - 1]
        : { coach: oldCoach, date: entry?.date ? new Date(entry.date) : new Date(editedServiceData.date) };
      
      // Lägg till den nya coachen med datum för när bytet skedde
      // Använd redigeringsdatumet eller idag om det är aktivt
      const changeDate = editedServiceData.date ? new Date(editedServiceData.date) : new Date();
      
      coachHistory = [
        ...coachHistory,
        { coach: newCoach, date: changeDate }
      ];
    } else if (!oldCoach && newCoach) {
      // Om det inte fanns någon coach tidigare, skapa första entry
      coachHistory = [{ coach: newCoach, date: new Date(editedServiceData.date) }];
    } else if (oldCoach === newCoach && coachHistory.length === 0) {
      // Om coachen är samma men ingen historik finns, skapa första entry
      coachHistory = [{ coach: newCoach, date: new Date(editedServiceData.date) }];
    }

    const updatedHistory = serviceHistory.map((entry) =>
      entry.id === id
        ? {
            ...entry,
            service: editedServiceData.service,
            price: editedServiceData.price,
            originalPrice: editedServiceData.originalPrice,
            discount: editedServiceData.discount || undefined,
            priceNote: editedServiceData.priceNote || undefined,
            status: editedServiceData.status,
            date: new Date(editedServiceData.date),
            endDate: endDate ? new Date(endDate) : undefined,
            sport: editedServiceData.sport,
            coach: newCoach, // Coach är alltid satt här
            coachHistory: coachHistory.length > 0 ? coachHistory : [{ coach: newCoach, date: new Date(editedServiceData.date) }],
            paymentMethod: editedServiceData.paymentMethod,
            invoiceStatus: editedServiceData.invoiceStatus,
            billingInterval: editedServiceData.billingInterval,
            numberOfMonths: editedServiceData.numberOfMonths || undefined,
            // För månadsvis fakturering: sätt nästa faktureringsdatum till slutet av månaden om inte användaren har angett ett datum
            nextInvoiceDate: editedServiceData.nextInvoiceDate 
              ? new Date(editedServiceData.nextInvoiceDate) 
              : (editedServiceData.billingInterval === 'Månadsvis' ? endOfMonth(new Date(editedServiceData.date)) : undefined),
            paidUntil: editedServiceData.paidUntil ? new Date(editedServiceData.paidUntil) : undefined,
            invoiceReference: editedServiceData.invoiceReference || undefined,
            invoiceNote: editedServiceData.invoiceNote || undefined,
          }
        : entry
    );
    setServiceHistory(updatedHistory);
    setHasUnsavedChanges(true);
    
    // Uppdatera kundens huvudtjänst till den senaste AKTIVA tjänsten
    if (customer) {
      const activeService = updatedHistory.find(s => s.status === 'Aktiv') || updatedHistory[0];
      setCustomer({
        ...customer,
        service: activeService.service as any,
        price: activeService.price,
        date: activeService.date,
        status: activeService.status as any,
      });
    }
    
    setEditingService(null);
    setEditedServiceData(null);
  };

  const handleCancelEdit = () => {
    setEditingService(null);
    setEditedServiceData(null);
    // Återställ hasUnsavedChanges om det inte finns andra ändringar
    if (originalServiceHistory.length > 0 && originalCustomer) {
      const serviceHistoryChanged = JSON.stringify(serviceHistory) !== JSON.stringify(originalServiceHistory);
      const customerChanged = JSON.stringify(customer) !== JSON.stringify(originalCustomer);
      setHasUnsavedChanges(serviceHistoryChanged || customerChanged);
    }
  };

  const handleDeleteService = (id: string) => {
    // Kontrollera att användaren har rätt att ta bort tjänster
    if (!canDeleteServices) {
      alert('Du har inte behörighet att ta bort tjänster');
      return;
    }
    
    if (confirm('Är du säker på att du vill ta bort denna tjänst?')) {
      const updatedHistory = serviceHistory.filter((s) => s.id !== id);
      setServiceHistory(updatedHistory);
      setHasUnsavedChanges(true);
      
      // Om det finns kvar tjänster, uppdatera kunden med den senaste AKTIVA tjänsten
      if (updatedHistory.length > 0 && customer) {
        // Hitta den senaste aktiva tjänsten (prioritet för "Aktiv", annars den senaste)
        const activeService = updatedHistory.find(s => s.status === 'Aktiv') || updatedHistory[0];
        setCustomer({
          ...customer,
          service: activeService.service as any,
          price: activeService.price,
          date: activeService.date,
          status: activeService.status as any,
        });
      }
    }
  };

  const handleSave = async () => {
    if (!customer) return;

    // Om det finns en aktiv redigering, spara den först och få den uppdaterade historiken
    let finalServiceHistory = serviceHistory;
    
    if (editingService && editedServiceData) {
      // Validera redigeringsdata
      const newCoach = editedServiceData.coach || customer?.coach || '';
      if (!newCoach) {
        alert('Coach måste anges för alla tjänster');
        return;
      }
      // Slutdatum krävs bara för inaktiva/pausade/genomförda tjänster
      if (editedServiceData.status !== 'Aktiv' && !editedServiceData.endDate) {
        alert('Slutdatum måste anges för inaktiva, pausade eller genomförda tjänster');
        return;
      }
      
      // Beräkna den uppdaterade historiken direkt här istället för att vänta på state
      const entry = serviceHistory.find(e => e.id === editingService);
      const oldCoach = entry?.coach || '';
      
      let coachHistory = entry?.coachHistory || [];
      
      if (oldCoach && newCoach && oldCoach !== newCoach) {
        const changeDate = editedServiceData.date ? new Date(editedServiceData.date) : new Date();
        coachHistory = [
          ...coachHistory,
          { coach: newCoach, date: changeDate }
        ];
      } else if (!oldCoach && newCoach) {
        coachHistory = [{ coach: newCoach, date: new Date(editedServiceData.date) }];
      } else if (oldCoach === newCoach && coachHistory.length === 0) {
        coachHistory = [{ coach: newCoach, date: new Date(editedServiceData.date) }];
      }

      let endDate = editedServiceData.endDate;
      if (editedServiceData.status === 'Genomförd') {
        endDate = editedServiceData.date;
      }

      // Säkerställ att originalPrice är satt - om det inte finns, använd price
      const finalOriginalPrice = editedServiceData.originalPrice || editedServiceData.price;
      const finalPrice = editedServiceData.price;
      const finalDiscount = editedServiceData.discount || 0;
      
      // Uppdatera historiken direkt
      finalServiceHistory = serviceHistory.map((entry) =>
        entry.id === editingService
          ? {
              ...entry,
              service: editedServiceData.service,
              price: finalPrice,
              originalPrice: finalOriginalPrice,
              // Spara discount även om det är 0 eller negativt (t.ex. -5 för prisökning)
              discount: finalDiscount !== 0 ? finalDiscount : undefined,
              priceNote: editedServiceData.priceNote || undefined,
              status: editedServiceData.status,
              date: new Date(editedServiceData.date),
              endDate: endDate ? new Date(endDate) : undefined,
              sport: editedServiceData.sport,
              coach: newCoach,
              coachHistory: coachHistory.length > 0 ? coachHistory : [{ coach: newCoach, date: new Date(editedServiceData.date) }],
              paymentMethod: editedServiceData.paymentMethod,
              invoiceStatus: editedServiceData.invoiceStatus,
              billingInterval: editedServiceData.billingInterval,
              numberOfMonths: editedServiceData.numberOfMonths || undefined,
              // För månadsvis fakturering: sätt nästa faktureringsdatum till slutet av månaden om inte användaren har angett ett datum
              nextInvoiceDate: editedServiceData.nextInvoiceDate 
                ? new Date(editedServiceData.nextInvoiceDate) 
                : (editedServiceData.billingInterval === 'Månadsvis' ? endOfMonth(new Date(editedServiceData.date)) : undefined),
              paidUntil: editedServiceData.paidUntil ? new Date(editedServiceData.paidUntil) : undefined,
              invoiceReference: editedServiceData.invoiceReference || undefined,
              invoiceNote: editedServiceData.invoiceNote || undefined,
            }
          : entry
      );
      
      // Uppdatera även kundens huvudtjänst
      const activeService = finalServiceHistory.find(s => s.status === 'Aktiv') || finalServiceHistory[0];
      setCustomer({
        ...customer,
        service: activeService.service as any,
        price: activeService.price,
        date: activeService.date,
        status: activeService.status as any,
      });
    }

    // Validera att alla tjänster har coach och slutdatum (om de inte är aktiva)
    const invalidServices = finalServiceHistory.filter(entry => {
      if (!entry.coach) return true;
      // Slutdatum krävs bara för inaktiva/pausade/genomförda tjänster
      if (entry.status !== 'Aktiv' && !entry.endDate) return true;
      return false;
    });

    if (invalidServices.length > 0) {
      alert('Alla tjänster måste ha coach. Inaktiva, pausade eller genomförda tjänster måste också ha slutdatum. Kontrollera tjänstehistoriken.');
      return;
    }

    try {
      // Uppdatera state först
      setServiceHistory(finalServiceHistory);
      const finalCustomer = customer;
      
      // Uppdatera originalCustomer och originalServiceHistory INNAN Firebase-uppdateringen
      // Detta säkerställer att hasUnsavedChanges inte sätts tillbaka till true när Firebase listener triggas
      const savedCustomer = JSON.parse(JSON.stringify(finalCustomer));
      const savedServiceHistory = JSON.parse(JSON.stringify(finalServiceHistory));
      
      setOriginalCustomer(savedCustomer);
      setOriginalServiceHistory(savedServiceHistory);
      setHasUnsavedChanges(false); // Sätt till false INNAN Firebase-uppdateringen
      setJustSaved(true); // Sätt flagga för att ignorera Firebase listener-uppdateringar
      
      await updateCustomer(finalCustomer.id, { ...finalCustomer, serviceHistory: finalServiceHistory });
      
      setShowSuccess(true);
      setEditingService(null);
      setEditedServiceData(null);
      
      // Efter en kort delay, tillåt hasUnsavedChanges att uppdateras igen
      setTimeout(() => {
        setShowSuccess(false);
        setJustSaved(false);
        // Användaren stannar på sidan efter sparande - ingen automatisk redirect
      }, 2000);
    } catch (error) {
      console.error('Fel vid sparande av kund:', error);
      alert('Kunde inte spara ändringar. Kontrollera Firebase-konfigurationen.');
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (false) {
        return;
      }
    }
    setHasUnsavedChanges(false);
    router.push('/kunder');
  };

  if (!customer) {
    return (
      <div>
        <Header title="Laddar..." subtitle="Hämtar kunduppgifter" />
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Laddar kunduppgifter...</p>
        </div>
      </div>
    );
  }

  const allServices = SERVICES;

  return (
    <div>
      <Header
        title="Redigera kund"
        subtitle={`Uppdatera information för ${customer.name}`}
      />

      {showSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <span className="text-lg">✓</span>
          <span className="font-medium">Ändringar sparade!</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vänster kolumn - Grundinfo */}
        <div className="lg:col-span-2 space-y-6">
          {/* Grundläggande information */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Grundläggande information</h3>
            
            {/* Database ID */}
            {customer && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Database ID</label>
                    <code className="text-sm text-gray-900 font-mono bg-white px-2 py-1 rounded border border-gray-300">
                      {customer.id}
                    </code>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(customer.id);
                      alert('Database ID kopierat till urklipp!');
                    }}
                    className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg flex items-center gap-2 transition"
                    title="Kopiera Database ID"
                  >
                    <Copy className="w-4 h-4" />
                    Kopiera
                  </button>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Namn</label>
                <input
                  type="text"
                  value={customer.name}
                  onChange={(e) => handleUpdateCustomer('name', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">E-post</label>
                <input
                  type="email"
                  value={customer.email}
                  onChange={(e) => handleUpdateCustomer('email', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Telefonnummer</label>
                <input
                  type="tel"
                  value={customer.phone || ''}
                  onChange={(e) => handleUpdateCustomer('phone', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                  placeholder="070-123 45 67"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Plats</label>
                <select
                  value={customer.place}
                  onChange={(e) => handleUpdateCustomer('place', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                >
                  {PLACES.map((place) => (
                    <option key={place} value={place}>
                      {place}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Coach</label>
                <CoachAutocomplete
                  value={customer.coach}
                  onChange={(value) => handleUpdateCustomer('coach', value)}
                />
                {customer.coach && (() => {
                  const coachProfile = getCoachProfileSync(customer.coach);
                  if (coachProfile?.isSeniorCoach) {
                    return (
                      <p className="mt-2 text-sm text-blue-600">
                        ✓ Senior Coach (priset justeras automatiskt)
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Gren</label>
                <select
                  value={customer.sport}
                  onChange={(e) => handleUpdateCustomer('sport', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                >
                  {SPORTS.map((sport) => (
                    <option key={sport} value={sport}>
                      {sport}
                    </option>
                  ))}
                </select>
                {customer.sport && getTestType(customer.service, customer.sport) && (
                  <p className="mt-2 text-xs text-gray-600">
                    <span className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-800 font-medium">
                      {getTestType(customer.service, customer.sport)}
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Status</label>
                <select
                  value={customer.status}
                  onChange={(e) => handleUpdateCustomer('status', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>


          {/* Tjänstehistorik */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Tjänstehistorik</h3>
              <button
                onClick={() => setShowAddService(!showAddService)}
                className="flex items-center gap-2 px-4 py-2 bg-[#1E5A7D] text-white rounded-lg hover:bg-[#0C3B5C] transition font-medium text-sm"
              >
                <Plus className="w-4 h-4" />
                Lägg till tjänst
              </button>
            </div>

            {showAddService && (
              <div className="mb-4 p-6 bg-white rounded-lg border border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Ny tjänst</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-gray-900 mb-1">Tjänst</label>
                    <select
                      value={newService.service}
                      onChange={(e) => handleServiceChange(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                    >
                      {services.length > 0 ? (
                        <>
                          <optgroup label="Memberships" className="text-gray-900">
                            {services
                              .filter(s => s.category === 'membership' || (!s.category && s.service.toLowerCase().includes('membership')))
                              .map((service) => (
                                <option key={service.service} value={service.service}>
                                  {service.service}
                                </option>
                              ))}
                          </optgroup>
                          <optgroup label="Tester" className="text-gray-900">
                            {services
                              .filter(s => s.category === 'test' || (!s.category && !s.service.toLowerCase().includes('membership')))
                              .map((service) => (
                                <option key={service.service} value={service.service}>
                                  {service.service}
                                </option>
                              ))}
                          </optgroup>
                          {services.filter(s => s.category && s.category !== 'membership' && s.category !== 'test').length > 0 && (
                            <optgroup label="Övrigt" className="text-gray-900">
                              {services
                                .filter(s => s.category && s.category !== 'membership' && s.category !== 'test')
                                .map((service) => (
                                  <option key={service.service} value={service.service}>
                                    {service.service}
                                  </option>
                                ))}
                            </optgroup>
                          )}
                        </>
                      ) : (
                        <>
                          <optgroup label="Memberships" className="text-gray-900">
                            {MEMBERSHIPS.map((membership) => (
                              <option key={membership} value={membership}>
                                {membership}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Tester" className="text-gray-900">
                            {TESTS.map((test) => (
                              <option key={test} value={test}>
                                {test}
                              </option>
                            ))}
                          </optgroup>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Gren <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newService.sport}
                      onChange={(e) => handleSportChangeForNewService(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                      required
                    >
                      {SPORTS.map((sport) => (
                        <option key={sport} value={sport}>
                          {sport}
                        </option>
                      ))}
                    </select>
                    {isTestService(newService.service) && newService.sport && newService.sport !== 'Ospecificerat' && (
                      <p className="mt-1 text-xs text-gray-600">
                        <span className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-800 font-medium">
                          {getTestType(newService.service as any, newService.sport as any)}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Föreslagt pris:</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {newService.originalPrice} kr
                        <span className="text-xs text-gray-500 ml-1">
                          {isMembershipService(newService.service) ? '/mån' : '(engång)'}
                        </span>
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <label className="flex items-center gap-1 text-sm text-gray-700">
                        <input
                          type="radio"
                          checked={newService.usePercentage}
                          onChange={() => setNewService({ ...newService, usePercentage: true, discount: 0, price: newService.originalPrice })}
                          className="text-[#1E5A7D]"
                        />
                        % Rabatt
                      </label>
                      <label className="flex items-center gap-1 text-sm text-gray-700">
                        <input
                          type="radio"
                          checked={!newService.usePercentage}
                          onChange={() => setNewService({ ...newService, usePercentage: false, discount: 0, price: newService.originalPrice })}
                          className="text-[#1E5A7D]"
                        />
                        Manuellt pris
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {newService.usePercentage ? (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">Rabatt (%)</label>
                            <input
                              type="number"
                              value={newService.discount}
                              onChange={(e) => handleDiscountChange(parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                              placeholder="0"
                              min="0"
                              max="100"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">Slutpris (kr)</label>
                            <input
                              type="number"
                              value={newService.price}
                              disabled
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-900 font-semibold"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">Slutpris (kr)</label>
                            <input
                              type="number"
                              value={newService.price}
                              onChange={(e) => handleManualPriceChange(parseFloat(e.target.value) || 0)}
                              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 font-semibold"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">Skillnad</label>
                            <input
                              type="text"
                              value={`${newService.originalPrice - newService.price} kr`}
                              disabled
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-900"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Anledning till prisavvikelse <span className="text-xs text-gray-500 font-normal">(frivillig)</span>
                    </label>
                    <textarea
                      value={newService.priceNote}
                      onChange={(e) => setNewService({ ...newService, priceNote: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                      placeholder="T.ex. Presentkort, 15% kampanj, hålla kvar kunden..."
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Coach</label>
                    <CoachAutocomplete
                      value={newService.coach || customer?.coach || ''}
                      onChange={(value) => setNewService({ ...newService, coach: value })}
                      placeholder="Ange coach-namn"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Grundinställning: {customer?.coach || 'Ingen coach'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Startdatum <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={newService.date}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        // Om status är "Genomförd", uppdatera också slutdatum automatiskt
                        const updatedEndDate = newService.status === 'Genomförd' ? newDate : newService.endDate;
                        setNewService({ ...newService, date: newDate, endDate: updatedEndDate });
                      }}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newService.status}
                      onChange={(e) => {
                        const newStatus = e.target.value;
                        let updatedEndDate = newService.endDate;
                        // Om status ändras till "Genomförd", sätt slutdatum till startdatum
                        if (newStatus === 'Genomförd') {
                          updatedEndDate = newService.date;
                        }
                        setNewService({ ...newService, status: newStatus, endDate: updatedEndDate });
                      }}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Slutdatum 
                      {newService.status !== 'Aktiv' && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="date"
                      value={newService.endDate}
                      onChange={(e) => setNewService({ ...newService, endDate: e.target.value })}
                      disabled={newService.status === 'Genomförd'}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 ${
                        newService.status === 'Genomförd' ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                      }`}
                      required={newService.status !== 'Aktiv'}
                    />
                    {newService.status === 'Aktiv' && (
                      <p className="mt-0.5 text-xs text-gray-500">Frivilligt för aktiva tjänster.</p>
                    )}
                  </div>

                  {/* Betalningsinformation för denna tjänst */}
                  <div className="md:col-span-4 mt-3 pt-4 border-t border-gray-300">
                    <h5 className="text-sm font-semibold text-gray-900 mb-3">Betalningsinformation</h5>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">Betalningsmetod</label>
                          <select
                            value={newService.paymentMethod}
                            onChange={(e) => setNewService({ ...newService, paymentMethod: e.target.value as any })}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                          >
                            {PAYMENT_METHODS.map((method) => (
                              <option key={method} value={method}>{method}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">Faktureringsstatus</label>
                          <select
                            value={newService.invoiceStatus}
                            onChange={(e) => setNewService({ ...newService, invoiceStatus: e.target.value as any })}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                          >
                            {INVOICE_STATUSES.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">Faktureringsintervall</label>
                          <select
                            value={newService.billingInterval}
                            onChange={(e) => setNewService({ ...newService, billingInterval: e.target.value as any })}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                          >
                            {BILLING_INTERVALS.filter(interval => interval !== 'Engångsbetalning').map((interval) => (
                              <option key={interval} value={interval}>{interval}</option>
                            ))}
                          </select>
                        </div>

                        {(newService.paymentMethod === 'Förskottsbetalning' || newService.billingInterval !== 'Månadsvis') && (
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-1">Antal månader</label>
                            <input
                              type="number"
                              value={newService.numberOfMonths}
                              onChange={(e) => setNewService({ ...newService, numberOfMonths: parseInt(e.target.value) || 1 })}
                              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                              min="1"
                              max="36"
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">Nästa faktureringsdatum</label>
                          <input
                            type="date"
                            value={newService.nextInvoiceDate}
                            onChange={(e) => setNewService({ ...newService, nextInvoiceDate: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                          />
                        </div>

                        {newService.paymentMethod === 'Förskottsbetalning' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-1">Betald till</label>
                            <input
                              type="date"
                              value={newService.paidUntil}
                              onChange={(e) => setNewService({ ...newService, paidUntil: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">Fakturareferens</label>
                          <input
                            type="text"
                            value={newService.invoiceReference}
                            onChange={(e) => setNewService({ ...newService, invoiceReference: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                            placeholder="OCR-nummer"
                          />
                        </div>

                        <div className="md:col-span-3">
                          <label className="block text-sm font-medium text-gray-900 mb-1">
                            Faktureringsnotering <span className="text-xs text-gray-500 font-normal">(frivillig)</span>
                          </label>
                          <textarea
                            value={newService.invoiceNote}
                            onChange={(e) => setNewService({ ...newService, invoiceNote: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                            placeholder="Särskilda instruktioner"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleAddService}
                    className="px-4 py-2 bg-[#1E5A7D] text-white rounded-lg hover:bg-[#0C3B5C] transition text-sm font-medium"
                  >
                    Lägg till
                  </button>
                  <button
                    onClick={() => setShowAddService(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-medium"
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {serviceHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  {editingService === entry.id ? (
                    // Redigeringsläge - Fullständigt formulär
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        {/* Tjänsttyp */}
                        <div className="md:col-span-4">
                          <label className="block text-sm font-medium text-gray-900 mb-1">
                            Tjänst <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={editedServiceData.service}
                            onChange={(e) => {
                              const selectedService = e.target.value as any;
                              // Recalculate base price with current sport and senior coach status
                              const basePrice = calculatePrice(
                                selectedService, 
                                editedServiceData.sport || 'Löpning', 
                                customer?.isSeniorCoach || false
                              );
                              setEditedServiceData({
                                ...editedServiceData,
                                service: selectedService,
                                originalPrice: basePrice,
                                price: basePrice - (basePrice * (editedServiceData.discount || 0) / 100),
                                endDate: editedServiceData.endDate || '',
                              });
                            }}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                          >
                            {SERVICES.map((service) => (
                              <option key={service} value={service}>
                                {service}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Gren */}
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">
                            Gren <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={editedServiceData.sport || ''}
                            onChange={(e) => setEditedServiceData({ ...editedServiceData, sport: e.target.value as any })}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                            required
                          >
                            {SPORTS.map((sport) => (
                              <option key={sport} value={sport}>
                                {sport}
                              </option>
                            ))}
                          </select>
                          {isTestService(editedServiceData.service) && editedServiceData.sport && editedServiceData.sport !== 'Ospecificerat' && (
                            <p className="mt-1 text-xs text-gray-600">
                              <span className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-800 font-medium">
                                {getTestType(editedServiceData.service as any, editedServiceData.sport as any)}
                              </span>
                            </p>
                          )}
                        </div>

                        {/* Coach */}
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">
                            Coach <span className="text-red-500">*</span>
                          </label>
                          <CoachAutocomplete
                            value={editedServiceData.coach || customer?.coach || ''}
                            onChange={(value) => setEditedServiceData({ ...editedServiceData, coach: value })}
                            placeholder="Ange coach-namn"
                          />
                          {entry.coachHistory && entry.coachHistory.length > 1 && (
                            <div className="mt-1 p-1.5 bg-blue-50 rounded border border-blue-200">
                              <p className="text-xs font-medium text-gray-700 mb-0.5">Coach-historik:</p>
                              <div className="space-y-0.5">
                                {entry.coachHistory.map((change, idx) => {
                                  const nextChange = entry.coachHistory && idx < entry.coachHistory.length - 1 
                                    ? entry.coachHistory[idx + 1]
                                    : null;
                                  const periodEnd = nextChange 
                                    ? format(new Date(nextChange.date), 'd MMM yyyy', { locale: sv })
                                    : (entry.endDate 
                                      ? format(new Date(entry.endDate), 'd MMM yyyy', { locale: sv })
                                      : 'pågående');
                                  
                                  return (
                                    <div key={idx} className="text-xs text-gray-700">
                                      <span className="font-medium">{change.coach}</span>
                                      {' '}
                                      <span className="text-gray-500">
                                        ({format(new Date(change.date), 'd MMM yyyy', { locale: sv })} - {periodEnd})
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                              {editedServiceData.coach && editedServiceData.coach !== entry.coach && (
                                <p className="text-xs text-blue-700 font-medium mt-1">
                                  ⚠️ Coach kommer att ändras till: {editedServiceData.coach}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Startdatum */}
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">Startdatum <span className="text-red-500">*</span></label>
                          <input
                            type="date"
                            value={editedServiceData.date}
                            onChange={(e) => {
                              const newDate = e.target.value;
                              // Om status är "Genomförd", uppdatera också slutdatum automatiskt
                              const updatedEndDate = editedServiceData.status === 'Genomförd' ? newDate : editedServiceData.endDate;
                              setEditedServiceData({ ...editedServiceData, date: newDate, endDate: updatedEndDate });
                            }}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                          />
                        </div>

                        {/* Status */}
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">Status <span className="text-red-500">*</span></label>
                          <select
                            value={editedServiceData.status}
                            onChange={(e) => {
                              const newStatus = e.target.value as any;
                              const oldStatus = editedServiceData.status;
                              let updatedEndDate = editedServiceData.endDate;
                              
                              // Om status ändras till "Genomförd", sätt slutdatum till startdatum
                              if (newStatus === 'Genomförd') {
                                updatedEndDate = editedServiceData.date;
                                setOverrideNoticePeriod(false);
                              } 
                              // Om status ändras från "Aktiv" till "Inaktiv" eller "Pausad" för ett membership
                              else if (oldStatus === 'Aktiv' && (newStatus === 'Inaktiv' || newStatus === 'Pausad')) {
                                if (isMembershipService(editedServiceData.service) && !overrideNoticePeriod) {
                                  const noticeMonths = getNoticePeriodMonths(editedServiceData.service);
                                  if (noticeMonths > 0) {
                                    const startDate = new Date(editedServiceData.date);
                                    const endDate = addMonths(startDate, noticeMonths);
                                    updatedEndDate = format(endOfMonth(endDate), 'yyyy-MM-dd');
                                  }
                                }
                              }
                              // Om status ändras tillbaka till "Aktiv", rensa uppsägningstidsöverstyrning
                              else if (newStatus === 'Aktiv') {
                                setOverrideNoticePeriod(false);
                              }
                              
                              setEditedServiceData({ ...editedServiceData, status: newStatus, endDate: updatedEndDate });
                            }}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                          >
                            {STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Slutdatum */}
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">
                            Slutdatum 
                            {editedServiceData.status !== 'Aktiv' && <span className="text-red-500">*</span>}
                          </label>
                          <input
                            type="date"
                            value={editedServiceData.endDate || ''}
                            onChange={(e) => setEditedServiceData({ ...editedServiceData, endDate: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                            required={editedServiceData.status !== 'Aktiv'}
                          />
                          {editedServiceData.status === 'Aktiv' && (
                            <p className="mt-0.5 text-xs text-gray-500">Frivilligt för aktiva tjänster.</p>
                          )}
                        </div>

                        {/* Ursprungligt pris */}
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">
                            Ursprungligt pris
                          </label>
                          <input
                            type="number"
                            value={editedServiceData.originalPrice || editedServiceData.price}
                            onChange={(e) => {
                              const originalPrice = parseFloat(e.target.value) || 0;
                              const discount = editedServiceData.discount || 0;
                              setEditedServiceData({
                                ...editedServiceData,
                                originalPrice,
                                price: originalPrice - (originalPrice * discount / 100),
                              });
                              setHasUnsavedChanges(true); // Sätt hasUnsavedChanges direkt
                            }}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                          />
                        </div>

                        {/* Rabatt */}
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">
                            Rabatt (%)
                          </label>
                          <input
                            type="number"
                            value={editedServiceData.discount || 0}
                            onChange={(e) => {
                              const discount = parseFloat(e.target.value) || 0;
                              // Säkerställ att originalPrice är satt - använd det nuvarande värdet eller price som fallback
                              const originalPrice = editedServiceData.originalPrice || editedServiceData.price;
                              const newPrice = originalPrice - (originalPrice * discount / 100);
                              setEditedServiceData({
                                ...editedServiceData,
                                originalPrice: originalPrice, // Säkerställ att originalPrice är satt
                                discount,
                                price: newPrice,
                              });
                              setHasUnsavedChanges(true); // Sätt hasUnsavedChanges direkt
                            }}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                          />
                        </div>

                        {/* Slutpris */}
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-1">
                            Slutpris
                          </label>
                          <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-semibold">
                            {editedServiceData.price.toLocaleString('sv-SE')} kr
                          </div>
                        </div>

                        {/* Anledning till prisavvikelse */}
                        <div className="md:col-span-4">
                          <label className="block text-sm font-medium text-gray-900 mb-1">
                            Anledning till prisavvikelse <span className="text-xs text-gray-500 font-normal">(frivillig)</span>
                          </label>
                          <textarea
                            value={editedServiceData.priceNote || ''}
                            onChange={(e) => setEditedServiceData({ ...editedServiceData, priceNote: e.target.value })}
                            placeholder="T.ex. 'Specialerbjudande för vår', 'Trogen kund'"
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                            rows={2}
                          />
                        </div>

                      {/* --- Betalningsinformation --- */}
                      <div className="md:col-span-4 border-t border-gray-300 pt-4 mt-3">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Betalningsinformation</h4>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            {/* Betalningsmetod */}
                            <div>
                              <label className="block text-sm font-medium text-gray-900 mb-1">
                                Betalningsmetod
                              </label>
                              <select
                                value={editedServiceData.paymentMethod || 'Faktura'}
                                onChange={(e) => setEditedServiceData({ ...editedServiceData, paymentMethod: e.target.value as any })}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                              >
                                {PAYMENT_METHODS.map((method) => (
                                  <option key={method} value={method}>
                                    {method}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Faktureringsstatus */}
                            <div>
                              <label className="block text-sm font-medium text-gray-900 mb-1">
                                Faktureringsstatus
                              </label>
                              <select
                                value={editedServiceData.invoiceStatus || 'Ej aktuell'}
                                onChange={(e) => setEditedServiceData({ ...editedServiceData, invoiceStatus: e.target.value as any })}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                              >
                                {INVOICE_STATUSES.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Faktureringsintervall */}
                            {(editedServiceData.paymentMethod === 'Autogiro' || editedServiceData.paymentMethod === 'Faktura') && (
                              <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">
                                  Faktureringsintervall
                                </label>
                                <select
                                  value={editedServiceData.billingInterval || 'Månadsvis'}
                                  onChange={(e) => setEditedServiceData({ ...editedServiceData, billingInterval: e.target.value as any })}
                                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                                >
                                  {BILLING_INTERVALS.map((interval) => (
                                    <option key={interval} value={interval}>
                                      {interval}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* Antal månader */}
                            {editedServiceData.paymentMethod === 'Förskottsbetalning' && (
                              <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">
                                  Antal månader betalda i förskott
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={editedServiceData.numberOfMonths || 1}
                                  onChange={(e) => setEditedServiceData({ ...editedServiceData, numberOfMonths: parseInt(e.target.value) || 1 })}
                                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                                />
                              </div>
                            )}

                            {/* Nästa faktureringsdatum */}
                            {(editedServiceData.paymentMethod === 'Autogiro' || editedServiceData.paymentMethod === 'Faktura') && (
                              <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">
                                  Nästa faktureringsdatum
                                </label>
                                <input
                                  type="date"
                                  value={editedServiceData.nextInvoiceDate || ''}
                                  onChange={(e) => setEditedServiceData({ ...editedServiceData, nextInvoiceDate: e.target.value })}
                                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                                />
                              </div>
                            )}

                            {/* Betald till */}
                            {editedServiceData.paymentMethod === 'Förskottsbetalning' && (
                              <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">
                                  Betald till (datum)
                                </label>
                                <input
                                  type="date"
                                  value={editedServiceData.paidUntil || ''}
                                  onChange={(e) => setEditedServiceData({ ...editedServiceData, paidUntil: e.target.value })}
                                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                                />
                              </div>
                            )}

                            {/* Fakturareferens */}
                            <div>
                              <label className="block text-sm font-medium text-gray-900 mb-1">
                                Fakturareferens (OCR, fakturanummer etc.)
                              </label>
                              <input
                                type="text"
                                value={editedServiceData.invoiceReference || ''}
                                onChange={(e) => setEditedServiceData({ ...editedServiceData, invoiceReference: e.target.value })}
                                placeholder="T.ex. OCR 123456789"
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                              />
                            </div>

                            {/* Faktureringsnotering */}
                            <div className="md:col-span-3">
                              <label className="block text-sm font-medium text-gray-900 mb-1">
                                Faktureringsnotering <span className="text-xs text-gray-500 font-normal">(frivillig)</span>
                              </label>
                              <textarea
                                value={editedServiceData.invoiceNote || ''}
                                onChange={(e) => setEditedServiceData({ ...editedServiceData, invoiceNote: e.target.value })}
                                placeholder="Övriga noteringar om betalning/fakturering"
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                                rows={2}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Knappar - endast Avbryt här, huvudsparaknappen är längre ner */}
                      <div className="flex gap-2 pt-2 border-t border-gray-300">
                        <button
                          onClick={handleCancelEdit}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 transition"
                        >
                          Avbryt redigering
                        </button>
                        <p className="text-xs text-gray-500 flex items-center ml-auto">
                          Använd sparaknappen längre ner på sidan för att spara ändringar
                        </p>
                      </div>
                    </div>
                  ) : (
                    // Visningsläge
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className={`px-3 py-1 text-xs font-semibold rounded-full text-white ${
                              SERVICE_COLORS[entry.service] || 'bg-gray-500'
                            }`}
                          >
                            {entry.service}
                          </span>
                          {entry.sport && (
                            <span className="px-2 py-1 text-xs font-medium rounded bg-gray-200 text-gray-700">
                              {entry.sport}
                            </span>
                          )}
                          <div>
                            <span className="text-sm font-bold text-gray-900">
                              {entry.price.toLocaleString('sv-SE')} kr
                              <span className="text-xs text-gray-500 ml-1">
                                {isMembershipService(entry.service) ? '/mån' : ''}
                              </span>
                            </span>
                            {entry.discount && entry.discount > 0 && entry.originalPrice && (
                              <span className="ml-2 text-xs text-gray-500 line-through">
                                {entry.originalPrice.toLocaleString('sv-SE')} kr
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {entry.discount && entry.discount > 0 && (
                          <div className="mb-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Rabatt: {entry.discount}% ({(entry.originalPrice! - entry.price).toLocaleString('sv-SE')} kr)
                            </span>
                          </div>
                        )}
                        
                        {entry.priceNote && (
                          <div className="mb-2 text-xs text-gray-600 italic">
                            💡 {entry.priceNote}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>Start: {format(new Date(entry.date), 'd MMM yyyy', { locale: sv })}</span>
                          {entry.endDate ? (
                            <span className="text-gray-700">
                              Slut: {format(new Date(entry.endDate), 'd MMM yyyy', { locale: sv })}
                            </span>
                          ) : (
                            <span className="text-green-700 font-medium">
                              Pågående (aktiv)
                            </span>
                          )}
                          {entry.coach && (
                            <div className="flex flex-col gap-1">
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                Coach: {entry.coach}
                              </span>
                              {entry.coachHistory && entry.coachHistory.length > 0 && (
                                <div className="text-xs text-gray-600 bg-purple-50 p-2 rounded border border-purple-200 mt-1">
                                  {entry.coachHistory.length > 1 ? (
                                    <>
                                      <p className="font-medium mb-1">Coach-byten:</p>
                                      {entry.coachHistory.map((change, idx) => {
                                        const nextChange = idx < entry.coachHistory!.length - 1 
                                          ? entry.coachHistory![idx + 1]
                                          : null;
                                        const periodEnd = nextChange 
                                          ? format(new Date(nextChange.date), 'd MMM yyyy', { locale: sv })
                                          : (entry.endDate 
                                            ? format(new Date(entry.endDate), 'd MMM yyyy', { locale: sv })
                                            : 'pågående');
                                        
                                        return (
                                          <div key={idx} className="text-xs">
                                            <span className="font-medium">{change.coach}</span>
                                            {' '}
                                            <span className="text-gray-500">
                                              ({format(new Date(change.date), 'd MMM yyyy', { locale: sv })} - {periodEnd})
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </>
                                  ) : (
                                    <div className="text-xs">
                                      <span className="font-medium">{entry.coachHistory[0].coach}</span>
                                      {' '}
                                      <span className="text-gray-500">
                                        från {format(new Date(entry.coachHistory[0].date), 'd MMM yyyy', { locale: sv })}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                          {isMembershipService(entry.service) && (() => {
                            const startDate = new Date(entry.date);
                            const endDate = entry.endDate ? new Date(entry.endDate) : (entry.status === 'Aktiv' ? new Date() : startDate);
                            const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                                              (endDate.getMonth() - startDate.getMonth());
                            const actualMonths = Math.max(1, monthsDiff + 1);
                            return (
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                {actualMonths} {actualMonths === 1 ? 'månad' : 'månader'}
                              </span>
                            );
                          })()}
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            entry.status === 'Aktiv' ? 'bg-green-100 text-green-800' :
                            entry.status === 'Genomförd' ? 'bg-blue-100 text-blue-800' :
                            entry.status === 'Pausad' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {entry.status}
                          </span>
                        </div>

                        {/* Betalningsinformation */}
                        {entry.paymentMethod && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-gray-500">Betalning:</span>{' '}
                                <span className="font-medium text-gray-900">{entry.paymentMethod}</span>
                              </div>
                              {entry.invoiceStatus && (
                                <div>
                                  <span className="text-gray-500">Status:</span>{' '}
                                  <span className={`font-medium ${
                                    entry.invoiceStatus === 'Betald' ? 'text-green-700' :
                                    entry.invoiceStatus === 'Förfallen' ? 'text-red-700' :
                                    'text-gray-900'
                                  }`}>
                                    {entry.invoiceStatus}
                                  </span>
                                </div>
                              )}
                              {entry.billingInterval && (entry.paymentMethod === 'Autogiro' || entry.paymentMethod === 'Faktura') && (
                                <div>
                                  <span className="text-gray-500">Intervall:</span>{' '}
                                  <span className="font-medium text-gray-900">{entry.billingInterval}</span>
                                </div>
                              )}
                              {entry.nextInvoiceDate && (entry.paymentMethod === 'Autogiro' || entry.paymentMethod === 'Faktura') && (
                                <div>
                                  <span className="text-gray-500">Nästa faktura:</span>{' '}
                                  <span className="font-medium text-gray-900">
                                    {format(new Date(entry.nextInvoiceDate), 'd MMM yyyy', { locale: sv })}
                                  </span>
                                </div>
                              )}
                              {entry.numberOfMonths && entry.paymentMethod === 'Förskottsbetalning' && (
                                <div>
                                  <span className="text-gray-500">Antal månader:</span>{' '}
                                  <span className="font-medium text-gray-900">{entry.numberOfMonths} mån</span>
                                </div>
                              )}
                              {entry.paidUntil && entry.paymentMethod === 'Förskottsbetalning' && (
                                <div>
                                  <span className="text-gray-500">Betald till:</span>{' '}
                                  <span className="font-medium text-gray-900">
                                    {format(new Date(entry.paidUntil), 'd MMM yyyy', { locale: sv })}
                                  </span>
                                </div>
                              )}
                              {entry.invoiceReference && (
                                <div className="col-span-2">
                                  <span className="text-gray-500">Referens:</span>{' '}
                                  <span className="font-medium text-gray-900">{entry.invoiceReference}</span>
                                </div>
                              )}
                              {entry.invoiceNote && (
                                <div className="col-span-2">
                                  <span className="text-gray-500">Notering:</span>{' '}
                                  <span className="font-medium text-gray-900">{entry.invoiceNote}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditService(entry)}
                          className="text-[#1E5A7D] hover:text-[#0C3B5C] p-2 hover:bg-blue-50 rounded transition"
                          title="Redigera"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {serviceHistory.length > 1 && canDeleteServices && (
                          <button
                            onClick={() => handleDeleteService(entry.id)}
                            className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded transition"
                            title="Ta bort"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Medlemskapstidslinje - Diagram */}
          <div className="mt-6">
            <MembershipTimeline serviceHistory={serviceHistory} />
          </div>
        </div>

        {/* Höger kolumn - Sammanfattning */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 sticky top-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sammanfattning</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Nuvarande tjänst</p>
                <p className="font-medium text-gray-900">{customer.service}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Aktuellt pris</p>
                <p className="font-medium text-gray-900">
                  {customer.price} kr
                  <span className="text-xs text-gray-500 ml-1">
                    {isMembershipService(customer.service) ? '/mån' : ''}
                  </span>
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Totalt antal tjänster</p>
                <p className="font-medium text-gray-900">{serviceHistory.length}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Total omsättning</p>
                <p className="font-medium text-gray-900">
                  {(() => {
                    let totalRevenue = 0;
                    const now = new Date();
                    serviceHistory.forEach((entry) => {
                      if (isMembershipService(entry.service)) {
                        // Beräkna antal månader tjänsten varit aktiv
                        const startDate = new Date(entry.date);
                        // För aktiva tjänster: använd bara idag (räkna bara faktiska månader hittills)
                        // För avslutade: använd slutdatum, men max till idag
                        let endDate: Date;
                        if (entry.status === 'Aktiv') {
                          endDate = now; // Använd bara idag, inte framtida slutdatum
                        } else if (entry.endDate) {
                          endDate = new Date(entry.endDate);
                          if (endDate > now) {
                            endDate = now; // Om slutdatum är i framtiden, använd idag
                          }
                        } else {
                          endDate = startDate; // Ingen slutdatum och inte aktiv
                        }
                        
                        // Räkna månader mellan start och slut
                        const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                                          (endDate.getMonth() - startDate.getMonth());
                        const actualMonths = Math.max(1, monthsDiff + 1); // Minst 1 månad
                        
                        // Om det är en engångsbetalning (årlig/kvartalsvis), räkna bara en gång
                        if (entry.billingInterval === 'Årlig' || entry.billingInterval === 'Kvartalsvis') {
                          totalRevenue += entry.price;
                        } else {
                          // Månadsvis betalning - multiplicera med antal månader
                          totalRevenue += entry.price * actualMonths;
                        }
                      } else {
                        // Tester är engångsbetalningar
                        totalRevenue += entry.price;
                      }
                    });
                    return totalRevenue.toLocaleString('sv-SE');
                  })()} kr
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Skapad</p>
                <p className="text-sm text-gray-900">
                  {format(new Date(customer.createdAt), 'd MMM yyyy', { locale: sv })}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Senast uppdaterad</p>
                <p className="text-sm text-gray-900">
                  {format(new Date(customer.updatedAt), 'd MMM yyyy', { locale: sv })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spara/Avbryt knappar - visas alltid längst ner */}
      <div className={`flex gap-4 mt-6 sticky bottom-0 py-4 -mx-8 px-8 border-t-2 shadow-lg transition-all ${
        hasUnsavedChanges 
          ? 'bg-yellow-50 border-yellow-400' 
          : 'bg-blue-50 border-blue-200'
      }`}>
        {hasUnsavedChanges && (
          <div className="flex items-center gap-2 text-yellow-800 flex-1">
            <span className="text-lg">⚠️</span>
            <span className="text-sm font-medium">Du har osparade ändringar. Kom ihåg att spara innan du lämnar sidan.</span>
          </div>
        )}
        {!hasUnsavedChanges && (
          <div className="flex items-center gap-2 text-blue-800 flex-1">
            <span className="text-sm">Alla ändringar är sparade</span>
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={!hasUnsavedChanges}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg transition font-medium shadow-sm ${
            hasUnsavedChanges
              ? 'bg-[#1E5A7D] text-white hover:bg-[#0C3B5C]'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Save className="w-5 h-5" />
          Spara ändringar
        </button>
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
        >
          <X className="w-5 h-5" />
          Avbryt
        </button>
      </div>
    </div>
  );
}

