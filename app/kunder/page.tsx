'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { useCustomers } from '@/lib/CustomerContext';
import { Search, Filter, Download, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle, X, Settings, CheckSquare, Square } from 'lucide-react';
import { SERVICE_COLORS, isMembershipService, PLACES, SERVICES, COACHES, SPORTS, INVOICE_STATUSES, PAYMENT_METHODS } from '@/lib/constants';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import Link from 'next/link';
import { Customer } from '@/types';
import { getUserRoleSync, getCurrentUser } from '@/lib/auth';
import { logPageView, logCustomerView } from '@/lib/activityLogger';
import { getUserProfileSync } from '@/lib/userProfile';
import { getTotalRevenue as calculateTotalRevenue } from '@/lib/revenueCalculations';

type SortField = 'name' | 'email' | 'place' | 'sport' | 'service' | 'status' | 'price' | 'date' | 'serviceCount' | 'membershipDuration' | 'totalMonthsFromStart' | 'totalRevenue' | 'coach' | 'phone' | 'invoiceStatus' | 'paymentMethod' | 'nextInvoice';
type SortDirection = 'asc' | 'desc';

type ColumnKey = 'name' | 'email' | 'place' | 'sport' | 'service' | 'status' | 'serviceCount' | 'membershipDuration' | 'totalMonthsFromStart' | 'price' | 'totalRevenue' | 'date' | 'coach' | 'phone' | 'invoiceStatus' | 'paymentMethod' | 'nextInvoice';

export default function CustomersPage() {
  const { customers } = useCustomers();
  const [searchFirstName, setSearchFirstName] = useState('');
  const [searchLastName, setSearchLastName] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('Alla');
  const [selectedPlace, setSelectedPlace] = useState<string>('Alla');
  const [selectedService, setSelectedService] = useState<string>('Alla');
  const [selectedSport, setSelectedSport] = useState<string>('Alla');
  const [selectedCoach, setSelectedCoach] = useState<string>('Alla');
  const [selectedInvoiceStatus, setSelectedInvoiceStatus] = useState<string>('Alla');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('Alla');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [userRole, setUserRole] = useState<string>('admin');
  const [userEmail, setUserEmail] = useState<string>('');
  const [linkedCoach, setLinkedCoach] = useState<string | null>(null);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [showFilterSettings, setShowFilterSettings] = useState(false);
  
  // Inga filter visas som standard - användaren väljer själv
  const defaultFilters: string[] = [];
  
  // Alla tillgängliga filter - börjar tomt, användaren väljer vilka som ska visas
  const [visibleFilters, setVisibleFilters] = useState<Set<string>>(new Set());
  
  const allFilters: { key: string; label: string }[] = [
    { key: 'status', label: 'Status' },
    { key: 'place', label: 'Ort' },
    { key: 'service', label: 'Tjänst' },
    { key: 'sport', label: 'Gren' },
    { key: 'coach', label: 'Coach' },
    { key: 'invoiceStatus', label: 'Faktureringsstatus' },
    { key: 'paymentMethod', label: 'Betalningsmetod' },
  ];
  
  // Standardkolumner som alltid visas (alla som fanns i tabellen från början)
  const defaultColumns: ColumnKey[] = ['name', 'email', 'place', 'sport', 'service', 'status', 'serviceCount', 'membershipDuration', 'totalMonthsFromStart', 'price', 'totalRevenue', 'date'];
  
  // Alla tillgängliga kolumner
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(new Set(defaultColumns));
  
  const allColumns: { key: ColumnKey; label: string }[] = [
    { key: 'name', label: 'Namn' },
    { key: 'email', label: 'E-post' },
    { key: 'phone', label: 'Telefonnummer' },
    { key: 'place', label: 'Ort' },
    { key: 'coach', label: 'Coach' },
    { key: 'sport', label: 'Gren' },
    { key: 'service', label: 'Tjänst' },
    { key: 'status', label: 'Status' },
    { key: 'invoiceStatus', label: 'Faktureringsstatus' },
    { key: 'paymentMethod', label: 'Betalningsmetod' },
    { key: 'nextInvoice', label: 'Nästa faktura' },
    { key: 'serviceCount', label: 'Antal tjänster' },
    { key: 'membershipDuration', label: 'Aktiva månader' },
    { key: 'totalMonthsFromStart', label: 'Månader från start' },
    { key: 'price', label: 'Pris' },
    { key: 'totalRevenue', label: 'Total omsättning' },
    { key: 'date', label: 'Startdatum' },
  ];
  
  // Logga sidvisning
  useEffect(() => {
    const role = getUserRoleSync();
    setUserRole(role);
    const currentUser = getCurrentUser();
    if (currentUser?.email) {
      setUserEmail(currentUser.email);
      // Hämta användarens linkedCoach från profil
      const userProfile = getUserProfileSync(currentUser.email);
      if (userProfile?.linkedCoach) {
        setLinkedCoach(userProfile.linkedCoach);
      }
    }
    logPageView('Kunder');
  }, []);
  
  // För coacher och platschefer: visa egna kunder direkt, andra kräver sökning
  const requiresSearch = userRole === 'coach' || userRole === 'platschef';
  
  // Kräv minst 2 bokstäver i något av sökfälten
  const hasSearchTerm = 
    searchFirstName.trim().length >= 2 || 
    searchLastName.trim().length >= 2 || 
    searchEmail.trim().length >= 2;
  
  // Kontrollera om användaren är coach för denna kund
  const isUserCoachForCustomer = (customer: Customer): boolean => {
    if (!requiresSearch) return true; // Admin ser alla
    
    // Använd linkedCoach från användarprofilen om den finns
    if (linkedCoach) {
      const customerCoach = customer.coach?.trim() || '';
      return customerCoach.toLowerCase() === linkedCoach.toLowerCase();
    }
    
    // Fallback: Försök matcha från email (för bakåtkompatibilitet)
    if (!userEmail) return false;
    
    const namePart = userEmail.split('@')[0].toLowerCase();
    const customerCoach = customer.coach?.trim() || '';
    const coachLower = customerCoach.toLowerCase();
    
    // Matcha om coach-namnet innehåller användarnamnet eller första delen matchar
    return coachLower.includes(namePart) ||
           coachLower.split(' ')[0] === namePart;
  };
  
  // Hämta användarens egna kunder
  const getUserOwnCustomers = (): Customer[] => {
    if (!requiresSearch) return customers; // Admin ser alla
    return customers.filter(customer => isUserCoachForCustomer(customer));
  };
  
  const userOwnCustomers = getUserOwnCustomers();
  const hasOwnCustomers = userOwnCustomers.length > 0;

  // Hjälpfunktioner definierade först
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aktiv':
        return 'bg-green-100 text-green-800';
      case 'Inaktiv':
        return 'bg-gray-100 text-gray-800';
      case 'Pausad':
        return 'bg-yellow-100 text-yellow-800';
      case 'Genomförd':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Funktion för att kolla om kunden har ett aktivt membership i historiken
  const hasActiveMembership = (customer: Customer): boolean => {
    if (!customer.serviceHistory || customer.serviceHistory.length === 0) {
      // Om ingen serviceHistory finns, kolla nuvarande tjänst
      return customer.status === 'Aktiv' && isMembershipService(customer.service);
    }
    
    // Kolla om det finns något aktivt membership i serviceHistory
    return customer.serviceHistory.some(
      (entry) => entry.status === 'Aktiv' && isMembershipService(entry.service)
    );
  };

  // Funktion för att hämta tjänst baserat på prioritering: Aktiv → Genomförd → Pausad → Inaktiv
  const getPriorityService = (customer: Customer) => {
    if (!customer.serviceHistory || customer.serviceHistory.length === 0) {
      return customer.service;
    }
    
    // Prioriteringsordning
    const priorities = ['Aktiv', 'Genomförd', 'Pausad', 'Inaktiv'];
    
    for (const priority of priorities) {
      const service = customer.serviceHistory.find(
        (entry) => entry.status === priority
      );
      if (service) {
        return service.service;
      }
    }
    
    return customer.service;
  };

  // Funktion för att hämta faktureringsstatus från aktivt medlemskap
  const getInvoiceStatus = (customer: Customer): string => {
    if (!customer.serviceHistory || customer.serviceHistory.length === 0) {
      return '-';
    }
    
    const activeService = customer.serviceHistory.find(
      (entry) => entry.status === 'Aktiv' && isMembershipService(entry.service)
    );
    
    if (activeService) {
      return activeService.invoiceStatus || 'Väntar på betalning';
    }
    
    return '-';
  };

  // Funktion för att hämta betalningsmetod från aktivt medlemskap
  const getPaymentMethod = (customer: Customer): string => {
    if (!customer.serviceHistory || customer.serviceHistory.length === 0) {
      return '-';
    }
    
    const activeService = customer.serviceHistory.find(
      (entry) => entry.status === 'Aktiv' && isMembershipService(entry.service)
    );
    
    if (activeService && activeService.paymentMethod) {
      return activeService.paymentMethod;
    }
    
    return '-';
  };

  // Funktion för att hämta nästa faktureringsdatum från aktivt medlemskap
  const getNextInvoiceDate = (customer: Customer): Date | null => {
    if (!customer.serviceHistory || customer.serviceHistory.length === 0) {
      return null;
    }
    
    const activeService = customer.serviceHistory.find(
      (entry) => entry.status === 'Aktiv' && isMembershipService(entry.service)
    );
    
    if (activeService && activeService.nextInvoiceDate) {
      return new Date(activeService.nextInvoiceDate);
    }
    
    return null;
  };

  // Funktion för att räkna medlemstid i månader - endast aktiva perioder
  // Räknar alla memberships som har varit aktiva, oavsett nuvarande status
  const getMembershipDuration = (customer: Customer): number | null => {
    // Om ingen serviceHistory finns, kolla huvudtjänsten
    if (!customer.serviceHistory || customer.serviceHistory.length === 0) {
      if (isMembershipService(customer.service) && customer.status === 'Aktiv') {
        const startDate = new Date(customer.date);
        const endDate = new Date();
        // Beräkna antal månader korrekt
        const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                          (endDate.getMonth() - startDate.getMonth());
        // Lägg till 1 om vi är i samma månad eller om det har gått minst en månad
        const actualMonths = startDate.getDate() <= endDate.getDate() ? monthsDiff + 1 : monthsDiff;
        return Math.round(Math.max(1, actualMonths) * 10) / 10;
      }
      return null;
    }
    
    // Hitta alla memberships (både aktiva och inaktiva)
    // Tester räknas inte eftersom de är engångstjänster, inte pågående medlemskap
    const allMemberships = customer.serviceHistory.filter((entry) => 
      isMembershipService(entry.service)
    );
    
    if (allMemberships.length === 0) return null;
    
    // Skapa en Set för att hålla koll på vilka månader som redan räknats
    // Format: "YYYY-MM" för att undvika dubbelräkning vid överlappande perioder
    const activeMonthsSet = new Set<string>();
    
    allMemberships.forEach((membership) => {
      const startDate = new Date(membership.date);
      // Bestäm slutdatum:
      // - Om status är 'Aktiv' och inget endDate finns: räkna till idag
      // - Om endDate finns: använd endDate (membershipen var aktiv till dess)
      // - Om status är 'Inaktiv' och inget endDate finns: hoppa över (kan inte beräkna)
      let endDate: Date | null = null;
      
      if (membership.status === 'Aktiv') {
        endDate = membership.endDate ? new Date(membership.endDate) : new Date();
      } else if (membership.endDate) {
        // Även om den är inaktiv nu, den var aktiv fram till endDate
        endDate = new Date(membership.endDate);
      } else {
        // Inaktiv och inget slutdatum - hoppa över denna
        return;
      }
      
      // Normalisera till första dagen i månaden för korrekt beräkning
      const start = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      
      // Lägg till varje månad mellan start och slut (inklusive båda)
      const current = new Date(start);
      while (current <= end) {
        const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
        activeMonthsSet.add(monthKey);
        // Gå till nästa månad
        current.setMonth(current.getMonth() + 1);
      }
    });
    
    // Returnera antalet unika aktiva månader
    return Math.round(activeMonthsSet.size * 10) / 10;
  };

  // Funktion för att räkna totala månader från första medlemskapet till nu/senaste slutdatum
  const getTotalMonthsFromStart = (customer: Customer): number | null => {
    // Om ingen serviceHistory finns, kolla huvudtjänsten
    if (!customer.serviceHistory || customer.serviceHistory.length === 0) {
      if (isMembershipService(customer.service)) {
        const startDate = new Date(customer.date);
        const endDate = customer.status === 'Aktiv' ? new Date() : (customer.date ? new Date(customer.date) : new Date());
        const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                          (endDate.getMonth() - startDate.getMonth());
        const actualMonths = startDate.getDate() <= endDate.getDate() ? monthsDiff + 1 : monthsDiff;
        return Math.round(Math.max(1, actualMonths) * 10) / 10;
      }
      return null;
    }
    
    // Hitta alla memberships
    const allMemberships = customer.serviceHistory.filter((entry) => 
      isMembershipService(entry.service)
    );
    
    if (allMemberships.length === 0) return null;
    
    // Hitta första medlemskapet (tidigaste startdatum)
    const firstMembership = allMemberships.reduce((earliest, current) => 
      new Date(current.date) < new Date(earliest.date) ? current : earliest
    );
    
    // Hitta senaste datumet - använd bara faktiska månader hittills (inte framtida)
    const now = new Date();
    let latestDate = now; // Standard: räkna till idag
    
    // Kolla om det finns något aktivt medlemskap
    const activeMembership = allMemberships.find(m => m.status === 'Aktiv');
    if (activeMembership) {
      // Om aktivt, räkna bara till idag (inte framtida slutdatum)
      latestDate = now;
    } else {
      // Om inget aktivt, hitta senaste slutdatumet, men max till idag
      const membershipsWithEndDate = allMemberships.filter(m => m.endDate);
      if (membershipsWithEndDate.length > 0) {
        const latestEndDate = membershipsWithEndDate.reduce((latest, current) => {
          const currentEndDate = new Date(current.endDate!);
          const latestEndDate = new Date(latest.endDate!);
          return currentEndDate > latestEndDate ? current : latest;
        });
        const endDateValue = new Date(latestEndDate.endDate!);
        // Använd bara idag om slutdatum är i framtiden
        latestDate = endDateValue > now ? now : endDateValue;
      } else {
        // Om inga slutdatum finns, använd senaste startdatumet, men max till idag
        const latestStartDate = allMemberships.reduce((latest, current) => 
          new Date(current.date) > new Date(latest.date) ? current : latest
        );
        const startDateValue = new Date(latestStartDate.date);
        latestDate = startDateValue > now ? now : startDateValue;
      }
    }
    
    // Beräkna månader från första till senaste datumet
    const startDate = new Date(firstMembership.date);
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const end = new Date(latestDate.getFullYear(), latestDate.getMonth(), 1);
    
    const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + 
                      (end.getMonth() - start.getMonth());
    const totalMonths = monthsDiff + 1; // Inkludera både start- och slutmånaden
    
    return Math.round(Math.max(1, totalMonths) * 10) / 10;
  };

  // Sorteringsfunktion
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Funktion för att visa antal tjänster per kund
  const getServiceCount = (customer: Customer): number => {
    return customer.serviceHistory?.length || 1;
  };

  // Funktion för att beräkna total omsättning för en kund
  const getTotalRevenue = (customer: Customer): number => {
    return calculateTotalRevenue(customer);
  };

  // Filtrering och sortering (använder funktionerna ovan)
  const filteredAndSortedCustomers = customers
    .filter((customer) => {
      // För coacher och platschefer:
      // 1. Om ingen sökning: Visa bara egna kunder (där de är coach)
      // 2. Om sökning gjorts: Visa BARA matchande kunder från sökningen (inte egna kunder)
      if (requiresSearch) {
        const isOwnCustomer = isUserCoachForCustomer(customer);
        
        // Om ingen sökning gjorts, visa bara egna kunder
        if (!hasSearchTerm) {
          if (!isOwnCustomer) {
            return false;
          }
        } else {
          // Om sökning gjorts, visa BARA matchande kunder från sökningen
          // Använd firstName/lastName om de finns, annars dela upp name
          const firstName = customer.firstName || (customer.name ? customer.name.trim().split(/\s+/)[0] : '');
          const lastName = customer.lastName || (customer.name ? customer.name.trim().split(/\s+/).slice(1).join(' ') : '');
          
          let matchesSearch = false;
          
          // Förnamn: måste börja med söktermen (case-insensitive)
          if (searchFirstName.trim().length >= 2) {
            matchesSearch = matchesSearch || firstName.toLowerCase().startsWith(searchFirstName.toLowerCase());
          }
          
          // Efternamn: måste börja med söktermen (case-insensitive)
          if (searchLastName.trim().length >= 2) {
            matchesSearch = matchesSearch || lastName.toLowerCase().startsWith(searchLastName.toLowerCase());
          }
          
          // E-post: måste börja med söktermen (case-insensitive)
          if (searchEmail.trim().length >= 2) {
            matchesSearch = matchesSearch || customer.email.toLowerCase().startsWith(searchEmail.toLowerCase());
          }
          
          // Visa BARA om sökningen matchar (inte egna kunder automatiskt)
          if (!matchesSearch) {
            return false;
          }
        }
      } else {
        // För admin: normal sökning
        // Om searchQuery används (nytt enkelt sökfält), använd det
        if (searchQuery.trim().length > 0) {
          const query = searchQuery.toLowerCase().trim();
          // Sök i både firstName, lastName och name för bakåtkompatibilitet
          const fullName = customer.firstName && customer.lastName 
            ? `${customer.firstName} ${customer.lastName}`.toLowerCase()
            : (customer.name || '').toLowerCase();
          const nameMatch = fullName.includes(query) || 
                           (customer.firstName || '').toLowerCase().includes(query) ||
                           (customer.lastName || '').toLowerCase().includes(query);
          const emailMatch = customer.email.toLowerCase().includes(query);
          
          if (!nameMatch && !emailMatch) {
            return false;
          }
        } else {
          // Bakåtkompatibilitet med gamla sökfälten
          // Använd firstName/lastName om de finns, annars dela upp name
          const firstName = customer.firstName || (customer.name ? customer.name.trim().split(/\s+/)[0] : '');
          const lastName = customer.lastName || (customer.name ? customer.name.trim().split(/\s+/).slice(1).join(' ') : '');
        
        let matchesSearch = true;
        
        // Förnamn: måste börja med söktermen (case-insensitive)
        if (searchFirstName.trim().length >= 2) {
          matchesSearch = matchesSearch && firstName.toLowerCase().startsWith(searchFirstName.toLowerCase());
        }
        
        // Efternamn: måste börja med söktermen (case-insensitive)
        if (searchLastName.trim().length >= 2) {
          matchesSearch = matchesSearch && lastName.toLowerCase().startsWith(searchLastName.toLowerCase());
        }
        
        // E-post: måste börja med söktermen (case-insensitive)
        if (searchEmail.trim().length >= 2) {
          matchesSearch = matchesSearch && customer.email.toLowerCase().startsWith(searchEmail.toLowerCase());
        }
        
        // Om ingen sökning gjorts (admin), visa alla
        if (searchFirstName.trim().length === 0 && searchLastName.trim().length === 0 && searchEmail.trim().length === 0) {
          matchesSearch = true;
        }
        
        if (!matchesSearch) {
          return false;
          }
        }
      }

      // Bara applicera filter om de är valda att visas
      const matchesStatus =
        !visibleFilters.has('status') || selectedStatus === 'Alla' || customer.status === selectedStatus;

      const matchesPlace =
        !visibleFilters.has('place') || selectedPlace === 'Alla' || customer.place === selectedPlace;

      const matchesService =
        !visibleFilters.has('service') || selectedService === 'Alla' || getPriorityService(customer) === selectedService;

      const matchesSport =
        !visibleFilters.has('sport') || selectedSport === 'Alla' || customer.sport === selectedSport;

      const matchesCoach =
        !visibleFilters.has('coach') || selectedCoach === 'Alla' || customer.coach === selectedCoach;

      const matchesInvoiceStatus =
        !visibleFilters.has('invoiceStatus') || selectedInvoiceStatus === 'Alla' || getInvoiceStatus(customer) === selectedInvoiceStatus || getInvoiceStatus(customer) === '-';

      const matchesPaymentMethod =
        !visibleFilters.has('paymentMethod') || selectedPaymentMethod === 'Alla' || getPaymentMethod(customer) === selectedPaymentMethod || getPaymentMethod(customer) === '-';

      return matchesStatus && matchesPlace && matchesService && matchesSport && matchesCoach && matchesInvoiceStatus && matchesPaymentMethod;
    })
    .sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'email':
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case 'place':
          aValue = a.place;
          bValue = b.place;
          break;
        case 'sport':
          aValue = a.sport;
          bValue = b.sport;
          break;
        case 'service':
          aValue = getPriorityService(a);
          bValue = getPriorityService(b);
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'serviceCount':
          aValue = getServiceCount(a);
          bValue = getServiceCount(b);
          break;
        case 'membershipDuration':
          aValue = getMembershipDuration(a) || 0;
          bValue = getMembershipDuration(b) || 0;
          break;
        case 'totalMonthsFromStart':
          aValue = getTotalMonthsFromStart(a) || 0;
          bValue = getTotalMonthsFromStart(b) || 0;
          break;
        case 'totalRevenue':
          aValue = getTotalRevenue(a);
          bValue = getTotalRevenue(b);
          break;
        case 'coach':
          aValue = a.coach || '';
          bValue = b.coach || '';
          break;
        case 'phone':
          aValue = a.phone || '';
          bValue = b.phone || '';
          break;
        case 'invoiceStatus':
          aValue = getInvoiceStatus(a);
          bValue = getInvoiceStatus(b);
          break;
        case 'paymentMethod':
          aValue = getPaymentMethod(a);
          bValue = getPaymentMethod(b);
          break;
        case 'nextInvoice':
          const aNextInvoice = getNextInvoiceDate(a);
          const bNextInvoice = getNextInvoiceDate(b);
          aValue = aNextInvoice ? aNextInvoice.getTime() : 0;
          bValue = bNextInvoice ? bNextInvoice.getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className="min-h-screen flex flex-col bg-blue-50 w-full">
      <Header title="Kunder" subtitle="Hantera alla dina kunder" />

      {/* Action Bar */}
      <div className="flex-shrink-0 mb-4 flex flex-col gap-4">
        {/* Search Fields */}
        {requiresSearch ? (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="mb-3">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Sök efter kund (minst 2 bokstäver per fält)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Förnamn</label>
                  <input
                    type="text"
                    placeholder="T.ex. Erik"
                    value={searchFirstName}
                    onChange={(e) => setSearchFirstName(e.target.value)}
                    className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 ${
                      searchFirstName.length > 0 && searchFirstName.length < 2 ? 'border-yellow-300 bg-yellow-50' : 'border-gray-300'
                    }`}
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Efternamn</label>
                  <input
                    type="text"
                    placeholder="T.ex. Andersson"
                    value={searchLastName}
                    onChange={(e) => setSearchLastName(e.target.value)}
                    className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 ${
                      searchLastName.length > 0 && searchLastName.length < 2 ? 'border-yellow-300 bg-yellow-50' : 'border-gray-300'
                    }`}
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-700 mb-1">E-post</label>
                  <input
                    type="text"
                    placeholder="T.ex. erik@example.com"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 ${
                      searchEmail.length > 0 && searchEmail.length < 2 ? 'border-yellow-300 bg-yellow-50' : 'border-gray-300'
                    }`}
                  />
                </div>
              </div>
              {(searchFirstName.length > 0 || searchLastName.length > 0 || searchEmail.length > 0) && !hasSearchTerm && (
                <p className="text-xs text-yellow-700 mt-2">
                  ⚠️ Varje fält kräver minst 2 bokstäver för att söka
                </p>
              )}
              {(searchFirstName || searchLastName || searchEmail) && (
                <button
                  onClick={() => {
                    setSearchFirstName('');
                    setSearchLastName('');
                    setSearchEmail('');
                  }}
                  className="mt-2 text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  Rensa alla sökfält
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Enkel sökning för admin */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Sök efter namn eller e-post..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  // Rensa gamla sökfält när man använder det nya
                  if (e.target.value.length === 0) {
                    setSearchFirstName('');
                    setSearchLastName('');
                    setSearchEmail('');
                  }
                }}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchFirstName('');
                    setSearchLastName('');
                    setSearchEmail('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  title="Rensa sökning"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filters and Actions */}
        <div className="flex flex-col gap-4">
          <div className="flex gap-3 flex-wrap items-center">
            <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
              <Filter className="w-4 h-4" />
              Filter:
            </div>
            {visibleFilters.has('status') && (
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 bg-white shadow-sm hover:border-gray-400 transition"
          >
            <option value="Alla">Alla statusar</option>
            <option value="Aktiv">Aktiv</option>
            <option value="Inaktiv">Inaktiv</option>
            <option value="Pausad">Pausad</option>
            <option value="Genomförd">Genomförd</option>
          </select>
            )}

            {visibleFilters.has('place') && (
          <select
            value={selectedPlace}
            onChange={(e) => setSelectedPlace(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 bg-white shadow-sm hover:border-gray-400 transition"
          >
            <option value="Alla">Alla orter</option>
            {PLACES.map((place) => (
              <option key={place} value={place}>
                {place}
              </option>
            ))}
          </select>
            )}

            {visibleFilters.has('service') && (
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 bg-white shadow-sm hover:border-gray-400 transition"
          >
            <option value="Alla">Alla tjänster</option>
            {SERVICES.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
            )}

            {visibleFilters.has('sport') && (
              <select
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 bg-white shadow-sm hover:border-gray-400 transition"
              >
                <option value="Alla">Alla grenar</option>
                {SPORTS.map((sport) => (
                  <option key={sport} value={sport}>
                    {sport}
                  </option>
                ))}
              </select>
            )}

            {visibleFilters.has('coach') && (
              <select
                value={selectedCoach}
                onChange={(e) => setSelectedCoach(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 bg-white shadow-sm hover:border-gray-400 transition"
              >
                <option value="Alla">Alla coacher</option>
                {COACHES.map((coach) => (
                  <option key={coach} value={coach}>
                    {coach}
                  </option>
                ))}
              </select>
            )}

            {visibleFilters.has('invoiceStatus') && (
              <select
                value={selectedInvoiceStatus}
                onChange={(e) => setSelectedInvoiceStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 bg-white shadow-sm hover:border-gray-400 transition"
              >
                <option value="Alla">Alla faktureringsstatusar</option>
                {INVOICE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            )}

            {visibleFilters.has('paymentMethod') && (
              <select
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 bg-white shadow-sm hover:border-gray-400 transition"
              >
                <option value="Alla">Alla betalningsmetoder</option>
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            )}

            {(selectedStatus !== 'Alla' || selectedPlace !== 'Alla' || selectedService !== 'Alla' || selectedSport !== 'Alla' || selectedCoach !== 'Alla' || selectedInvoiceStatus !== 'Alla' || selectedPaymentMethod !== 'Alla') && (
              <button
                onClick={() => {
                  setSelectedStatus('Alla');
                  setSelectedPlace('Alla');
                  setSelectedService('Alla');
                  setSelectedSport('Alla');
                  setSelectedCoach('Alla');
                  setSelectedInvoiceStatus('Alla');
                  setSelectedPaymentMethod('Alla');
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition"
                title="Rensa alla filter"
              >
                <X className="w-4 h-4" />
                Rensa filter
              </button>
            )}
          </div>

          <div className="flex gap-3 flex-wrap items-center">
            <button
              onClick={() => setShowFilterSettings(!showFilterSettings)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition font-medium ${
                showFilterSettings
                  ? 'bg-[#1E5A7D] text-white border-[#1E5A7D] shadow-sm'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm'
              }`}
              title="Välj filter"
            >
              <Filter className="w-5 h-5" />
              Filter
            </button>

            <button
              onClick={() => setShowColumnSettings(!showColumnSettings)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition font-medium ${
                showColumnSettings
                  ? 'bg-[#1E5A7D] text-white border-[#1E5A7D] shadow-sm'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm'
              }`}
              title="Välj kolumner"
            >
              <Settings className="w-5 h-5" />
              Kolumner
            </button>

            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-700 shadow-sm">
            <Download className="w-5 h-5" />
            Exportera
          </button>

          <Link
            href="/ny-kund"
            className="flex items-center gap-2 px-4 py-2 bg-[#1E5A7D] text-white rounded-lg hover:bg-[#0C3B5C] transition font-medium shadow-sm"
          >
            + Lägg till kund
          </Link>
        </div>
        </div>

        {/* Filterinställningar - Modal */}
        {showFilterSettings && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-6 max-w-4xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Välj filter att visa</h3>
                <p className="text-sm text-gray-500 mt-1">Välj vilka filter som ska visas i filterraden</p>
              </div>
              <button
                onClick={() => setShowFilterSettings(false)}
                className="text-gray-400 hover:text-gray-600 transition p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto pr-2">
              {allFilters.map((filter) => {
                const isVisible = visibleFilters.has(filter.key);
                return (
                  <label
                    key={filter.key}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition cursor-pointer ${
                      isVisible
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={(e) => {
                        const newVisibleFilters = new Set(visibleFilters);
                        if (e.target.checked) {
                          newVisibleFilters.add(filter.key);
                        } else {
                          newVisibleFilters.delete(filter.key);
                        }
                        setVisibleFilters(newVisibleFilters);
                      }}
                      className="w-4 h-4 text-[#1E5A7D] border-gray-300 rounded focus:ring-[#1E5A7D] cursor-pointer"
                    />
                    <span className={`text-sm font-medium ${isVisible ? 'text-blue-900' : 'text-gray-700'}`}>
                      {filter.label}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2 justify-end">
              <button
                onClick={() => setVisibleFilters(new Set())}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition border border-gray-300"
              >
                Rensa alla
              </button>
              <button
                onClick={() => setVisibleFilters(new Set(allFilters.map(f => f.key)))}
                className="px-4 py-2 text-sm bg-[#1E5A7D] text-white hover:bg-[#0C3B5C] rounded-lg transition font-medium"
              >
                Visa alla filter
              </button>
            </div>
          </div>
        )}

        {/* Kolumninställningar - Förbättrad modal */}
        {showColumnSettings && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-6 max-w-4xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Välj kolumner att visa</h3>
                <p className="text-sm text-gray-500 mt-1">Välj vilka kolumner som ska visas i tabellen</p>
              </div>
              <button
                onClick={() => setShowColumnSettings(false)}
                className="text-gray-400 hover:text-gray-600 transition p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto pr-2">
              {allColumns.map((column) => {
                const isVisible = visibleColumns.has(column.key);
                const isDefault = defaultColumns.includes(column.key);
                return (
                  <label
                    key={column.key}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition cursor-pointer ${
                      isVisible
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    } ${isDefault ? 'opacity-75' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={(e) => {
                        const newVisibleColumns = new Set(visibleColumns);
                        if (e.target.checked) {
                          newVisibleColumns.add(column.key);
                        } else if (!isDefault) {
                          newVisibleColumns.delete(column.key);
                        }
                        setVisibleColumns(newVisibleColumns);
                      }}
                      disabled={isDefault}
                      className="w-4 h-4 text-[#1E5A7D] border-gray-300 rounded focus:ring-[#1E5A7D] cursor-pointer disabled:opacity-50"
                    />
                    <span className={`text-sm font-medium ${isVisible ? 'text-blue-900' : 'text-gray-700'}`}>
                      {column.label}
                    </span>
                    {isDefault && (
                      <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                        Standard
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2 justify-end">
              <button
                onClick={() => setVisibleColumns(new Set(defaultColumns))}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition border border-gray-300"
              >
                Återställ till standard
              </button>
              <button
                onClick={() => setVisibleColumns(new Set(allColumns.map(c => c.key)))}
                className="px-4 py-2 text-sm bg-[#1E5A7D] text-white hover:bg-[#0C3B5C] rounded-lg transition font-medium"
              >
                Visa alla kolumner
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info för coacher/platschefer */}
      {requiresSearch && (
        <div className="mb-4">
          {!hasSearchTerm && hasOwnCustomers ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Dina kunder visas här
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Du ser dina egna kunder direkt. Använd sökfunktionen för att hitta andra kunder (minst 2 bokstäver per fält).
                </p>
              </div>
            </div>
          ) : !hasSearchTerm && !hasOwnCustomers ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900">
                  Sökning krävs
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Du har inga egna kunder. Använd sökfunktionen för att hitta kunder (minst 2 bokstäver per fält).
                </p>
              </div>
            </div>
          ) : hasSearchTerm ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-900">
                  Sökresultat
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Visar matchande kunder från sökningen. Rensa sökfälten för att se dina egna kunder igen.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Results Count och Insights - visa för admin, dölj för coacher och platschefer */}
      {userRole === 'admin' && (
        <div className="flex-shrink-0 mb-4">
          <div className="flex items-center gap-4 mb-3">
          <p className="text-sm text-gray-600">
            Visar <span className="font-semibold text-gray-900">{filteredAndSortedCustomers.length}</span> av{' '}
            <span className="font-semibold text-gray-900">{customers.length}</span> kunder
          </p>
          </div>
          
          {/* Insights */}
          {filteredAndSortedCustomers.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {(() => {
                // Beräkna genomsnittlig aktiva månader
                const activeMonths = filteredAndSortedCustomers
                  .map(c => getMembershipDuration(c))
                  .filter(d => d !== null) as number[];
                const avgActiveMonths = activeMonths.length > 0
                  ? Math.round(activeMonths.reduce((a, b) => a + b, 0) / activeMonths.length * 10) / 10
                  : 0;

                // Beräkna genomsnittligt pris
                const prices = filteredAndSortedCustomers
                  .map(c => c.price)
                  .filter(p => p > 0);
                const avgPrice = prices.length > 0
                  ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
                  : 0;

                // Beräkna total omsättning
                const totalRevenue = filteredAndSortedCustomers.reduce((sum, c) => sum + getTotalRevenue(c), 0);

                // Beräkna genomsnittlig total omsättning per kund
                const avgRevenue = filteredAndSortedCustomers.length > 0
                  ? Math.round(totalRevenue / filteredAndSortedCustomers.length)
                  : 0;

                // Räkna aktiva kunder
                const activeCustomers = filteredAndSortedCustomers.filter(c => c.status === 'Aktiv').length;

                return (
                  <>
                    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Genomsnitt aktiva månader</p>
                      <p className="text-lg font-semibold text-gray-900">{avgActiveMonths.toFixed(1)}</p>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Genomsnittligt pris</p>
                      <p className="text-lg font-semibold text-gray-900">{avgPrice.toLocaleString('sv-SE')} kr</p>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Total omsättning</p>
                      <p className="text-lg font-semibold text-gray-900">{totalRevenue.toLocaleString('sv-SE')} kr</p>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Genomsnitt omsättning/kund</p>
                      <p className="text-lg font-semibold text-gray-900">{avgRevenue.toLocaleString('sv-SE')} kr</p>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Aktiva kunder</p>
                      <p className="text-lg font-semibold text-gray-900">{activeCustomers}</p>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Customers Table */}
      {(!requiresSearch || hasSearchTerm || hasOwnCustomers) && (
        <div className="flex-1 overflow-hidden pb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-full flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto bg-blue-50">
              <div className="overflow-x-auto bg-blue-50 min-h-full w-full">
                <table className="min-w-max bg-white w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                {visibleColumns.has('name') && (
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Namn
                    {sortField === 'name' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>
                )}
                {visibleColumns.has('email') && (
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center gap-1">
                    E-post
                    {sortField === 'email' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>
                )}
                {visibleColumns.has('phone') && (
                  <th 
                    className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                    onClick={() => handleSort('phone')}
                  >
                    <div className="flex items-center gap-1">
                      Telefonnummer
                      {sortField === 'phone' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>
                )}
                {visibleColumns.has('place') && (
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                  onClick={() => handleSort('place')}
                >
                  <div className="flex items-center gap-1">
                    Ort
                    {sortField === 'place' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>
                )}
                {visibleColumns.has('coach') && (
                  <th 
                    className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                    onClick={() => handleSort('coach')}
                  >
                    <div className="flex items-center gap-1">
                      Coach
                      {sortField === 'coach' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>
                )}
                {visibleColumns.has('sport') && (
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                  onClick={() => handleSort('sport')}
                >
                  <div className="flex items-center gap-1">
                    Gren
                    {sortField === 'sport' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>
                )}
                {visibleColumns.has('service') && (
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                  onClick={() => handleSort('service')}
                >
                  <div className="flex items-center gap-1">
                    Tjänst
                    {sortField === 'service' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>
                )}
                {visibleColumns.has('status') && (
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Status
                    {sortField === 'status' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>
                )}
                {visibleColumns.has('invoiceStatus') && (
                  <th 
                    className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                    onClick={() => handleSort('invoiceStatus')}
                  >
                    <div className="flex items-center gap-1">
                      Faktureringsstatus
                      {sortField === 'invoiceStatus' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>
                )}
                {visibleColumns.has('paymentMethod') && (
                  <th 
                    className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                    onClick={() => handleSort('paymentMethod')}
                  >
                    <div className="flex items-center gap-1">
                      Betalningsmetod
                      {sortField === 'paymentMethod' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>
                )}
                {visibleColumns.has('nextInvoice') && (
                  <th 
                    className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                    onClick={() => handleSort('nextInvoice')}
                  >
                    <div className="flex items-center gap-1">
                      Nästa faktura
                      {sortField === 'nextInvoice' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>
                )}
                {visibleColumns.has('serviceCount') && (
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                  onClick={() => handleSort('serviceCount')}
                >
                  <div className="flex items-center gap-1">
                      Antal tjänster
                    {sortField === 'serviceCount' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>
                )}
                {visibleColumns.has('membershipDuration') && (
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                  onClick={() => handleSort('membershipDuration')}
                >
                  <div className="flex items-center gap-1">
                    Aktiva månader
                    {sortField === 'membershipDuration' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>
                )}
                {visibleColumns.has('totalMonthsFromStart') && (
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                  onClick={() => handleSort('totalMonthsFromStart')}
                >
                  <div className="flex items-center gap-1">
                    Månader från start
                    {sortField === 'totalMonthsFromStart' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>
                )}
                {visibleColumns.has('price') && (
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center gap-1">
                    Pris
                    {sortField === 'price' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>
                )}
                {visibleColumns.has('totalRevenue') && (
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                  onClick={() => handleSort('totalRevenue')}
                >
                  <div className="flex items-center gap-1">
                    Total omsättning
                    {sortField === 'totalRevenue' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>
                )}
                {visibleColumns.has('date') && (
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    Startdatum
                    {sortField === 'date' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 min-w-full">
              {filteredAndSortedCustomers.map((customer) => {
                const priorityService = getPriorityService(customer);
                const serviceCount = getServiceCount(customer);
                const membershipDuration = getMembershipDuration(customer);
                const invoiceStatus = getInvoiceStatus(customer);
                const paymentMethod = getPaymentMethod(customer);
                const nextInvoiceDate = getNextInvoiceDate(customer);
                
                return (
                <tr key={customer.id} className="hover:bg-gray-50 transition">
                  {visibleColumns.has('name') && (
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link
                      href={`/kunder/${customer.id}`}
                      className="font-medium text-[#1E5A7D] hover:text-[#0C3B5C] hover:underline text-sm cursor-pointer"
                    >
                      {customer.firstName && customer.lastName 
                        ? `${customer.firstName} ${customer.lastName}` 
                        : customer.name || 'Namn saknas'}
                    </Link>
                  </td>
                  )}
                  {visibleColumns.has('email') && (
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link
                      href={`/kunder/${customer.id}`}
                      className="text-sm text-[#1E5A7D] hover:text-[#0C3B5C] hover:underline cursor-pointer"
                    >
                      {customer.email}
                    </Link>
                  </td>
                  )}
                  {visibleColumns.has('phone') && (
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{customer.phone || '-'}</div>
                    </td>
                  )}
                  {visibleColumns.has('place') && (
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{customer.place}</div>
                  </td>
                  )}
                  {visibleColumns.has('coach') && (
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{customer.coach || '-'}</div>
                    </td>
                  )}
                  {visibleColumns.has('sport') && (
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{customer.sport}</div>
                  </td>
                  )}
                  {visibleColumns.has('service') && (
                  <td className="px-3 py-3">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${
                        SERVICE_COLORS[priorityService]
                      } text-white w-fit`}
                      title={priorityService}
                    >
                      {priorityService.length > 25 ? priorityService.substring(0, 25) + '...' : priorityService}
                    </span>
                  </td>
                  )}
                  {visibleColumns.has('status') && (
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${getStatusColor(
                        customer.status
                      )}`}
                    >
                      {customer.status}
                    </span>
                  </td>
                  )}
                  {visibleColumns.has('invoiceStatus') && (
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${
                          invoiceStatus === 'Betald' ? 'bg-green-100 text-green-800' :
                          invoiceStatus === 'Väntar på betalning' ? 'bg-yellow-100 text-yellow-800' :
                          invoiceStatus === 'Förfallen' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {invoiceStatus}
                      </span>
                    </td>
                  )}
                  {visibleColumns.has('paymentMethod') && (
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{paymentMethod}</div>
                    </td>
                  )}
                  {visibleColumns.has('nextInvoice') && (
                    <td className="px-3 py-3 whitespace-nowrap">
                      {nextInvoiceDate ? (
                        <div className="text-sm text-gray-600">
                          {format(nextInvoiceDate, 'd MMM yyyy', { locale: sv })}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400">-</div>
                      )}
                    </td>
                  )}
                  {visibleColumns.has('serviceCount') && (
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-medium">{serviceCount}</div>
                  </td>
                  )}
                  {visibleColumns.has('membershipDuration') && (
                  <td className="px-3 py-3 whitespace-nowrap">
                    {membershipDuration !== null ? (
                      <div className="text-sm text-gray-900 font-medium">
                        {membershipDuration}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">-</div>
                    )}
                  </td>
                  )}
                  {visibleColumns.has('totalMonthsFromStart') && (
                  <td className="px-3 py-3 whitespace-nowrap">
                    {(() => {
                      const totalMonths = getTotalMonthsFromStart(customer);
                      return totalMonths !== null ? (
                        <div className="text-sm text-gray-900 font-medium">
                          {totalMonths}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400">-</div>
                      );
                    })()}
                  </td>
                  )}
                  {visibleColumns.has('price') && (
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {customer.price}
                      <span className="text-xs text-gray-500 ml-0.5">
                        {isMembershipService(customer.service) ? '/mån' : 'kr'}
                      </span>
                    </div>
                  </td>
                  )}
                  {visibleColumns.has('totalRevenue') && (
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-semibold">
                      {getTotalRevenue(customer).toLocaleString('sv-SE')} kr
                    </div>
                  </td>
                  )}
                  {visibleColumns.has('date') && (
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {format(new Date(customer.date), 'yyyy-MM-dd', { locale: sv })}
                    </div>
                  </td>
                  )}
                </tr>
              );
              })}
            </tbody>
          </table>
              </div>

              {filteredAndSortedCustomers.length === 0 && hasSearchTerm && (
                <div className="text-center py-12">
                  <p className="text-gray-500">Inga kunder hittades</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

