'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { useCustomers } from '@/lib/CustomerContext';
import { Search, Edit, Trash2, Filter, Download, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle, X } from 'lucide-react';
import { SERVICE_COLORS, isMembershipService, PLACES, SERVICES } from '@/lib/constants';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import Link from 'next/link';
import { Customer } from '@/types';
import { getUserRoleSync, getCurrentUser } from '@/lib/auth';
import { logPageView, logCustomerView } from '@/lib/activityLogger';

type SortField = 'name' | 'email' | 'place' | 'sport' | 'service' | 'status' | 'price' | 'date' | 'serviceCount' | 'membershipDuration' | 'totalRevenue';
type SortDirection = 'asc' | 'desc';

export default function CustomersPage() {
  const { customers, deleteCustomer } = useCustomers();
  const [searchFirstName, setSearchFirstName] = useState('');
  const [searchLastName, setSearchLastName] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('Alla');
  const [selectedPlace, setSelectedPlace] = useState<string>('Alla');
  const [selectedService, setSelectedService] = useState<string>('Alla');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [userRole, setUserRole] = useState<string>('admin');
  const [userEmail, setUserEmail] = useState<string>('');
  
  // Logga sidvisning
  useEffect(() => {
    const role = getUserRoleSync();
    setUserRole(role);
    const currentUser = getCurrentUser();
    if (currentUser?.email) {
      setUserEmail(currentUser.email);
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
  
  // Hämta användarens namn från e-post (för att matcha mot coach-fält)
  const getUserName = (): string => {
    if (!userEmail) return '';
    // Ta bort @ och allt efter
    const namePart = userEmail.split('@')[0];
    // Konvertera till versaler för matchning (t.ex. "erik" -> "Erik")
    return namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
  };
  
  // Kontrollera om användaren är coach för denna kund
  const isUserCoachForCustomer = (customer: Customer): boolean => {
    if (!requiresSearch) return true; // Admin ser alla
    
    const userName = getUserName();
    if (!userName) return false;
    
    // Kolla om användarens namn matchar kundens coach
    // Matcha både exakt och case-insensitive
    const customerCoach = customer.coach?.trim() || '';
    const coachLower = customerCoach.toLowerCase();
    const userNameLower = userName.toLowerCase();
    
    // Matcha om:
    // 1. Exakt match (case-insensitive)
    // 2. Coach-namnet innehåller användarnamnet (t.ex. "Erik Helsing" matchar "erik")
    // 3. Användarnamnet matchar första delen av coach-namnet
    return coachLower === userNameLower ||
           coachLower.includes(userNameLower) ||
           coachLower.split(' ')[0] === userNameLower;
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

  const handleDelete = (id: string) => {
    if (confirm('Är du säker på att du vill ta bort denna kund?')) {
      deleteCustomer(id);
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

  // Funktion för att räkna medlemstid i månader
  const getMembershipDuration = (customer: Customer): number | null => {
    if (!customer.serviceHistory || customer.serviceHistory.length === 0) {
      if (isMembershipService(customer.service) && customer.status === 'Aktiv') {
        const months = (new Date().getTime() - new Date(customer.date).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
        return Math.round(months * 10) / 10;
      }
      return null;
    }
    
    // Hitta alla memberships
    const memberships = customer.serviceHistory.filter((entry) => 
      isMembershipService(entry.service)
    );
    
    if (memberships.length === 0) return null;
    
    // Hitta första membership-datum
    const firstMembership = memberships.reduce((earliest, current) => 
      new Date(current.date) < new Date(earliest.date) ? current : earliest
    );
    
    // Hitta sista aktiva eller avslutade membership
    const activeMembership = memberships.find((m) => m.status === 'Aktiv');
    
    if (activeMembership) {
      // Om aktivt membership, räkna från första till idag
      const months = (new Date().getTime() - new Date(firstMembership.date).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
      return Math.round(months * 10) / 10;
    } else {
      // Om inget aktivt, hitta senaste avslutat och räkna till dess slutdatum
      const lastMembership = memberships.reduce((latest, current) => 
        new Date(current.date) > new Date(latest.date) ? current : latest
      );
      
      const endDate = lastMembership.endDate || new Date();
      const months = (new Date(endDate).getTime() - new Date(firstMembership.date).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
      return Math.round(months * 10) / 10;
    }
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
    const serviceHistory = customer.serviceHistory && customer.serviceHistory.length > 0 
      ? customer.serviceHistory 
      : [{
          service: customer.service,
          price: customer.price,
          date: customer.date,
          status: customer.status,
          endDate: undefined,
          billingInterval: isMembershipService(customer.service) ? 'Månadsvis' : 'Engångsbetalning',
        }];

    let totalRevenue = 0;
    serviceHistory.forEach((entry) => {
      if (isMembershipService(entry.service)) {
        // Beräkna antal månader tjänsten varit aktiv
        const startDate = new Date(entry.date);
        const endDate = entry.endDate ? new Date(entry.endDate) : (entry.status === 'Aktiv' ? new Date() : startDate);
        
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
    return totalRevenue;
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
          const nameParts = customer.name.trim().split(/\s+/);
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
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
        const nameParts = customer.name.trim().split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
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

      const matchesStatus =
        selectedStatus === 'Alla' || customer.status === selectedStatus;

      const matchesPlace =
        selectedPlace === 'Alla' || customer.place === selectedPlace;

      const matchesService =
        selectedService === 'Alla' || getPriorityService(customer) === selectedService;

      return matchesStatus && matchesPlace && matchesService;
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
        case 'totalRevenue':
          aValue = getTotalRevenue(a);
          bValue = getTotalRevenue(b);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header title="Kunder" subtitle="Hantera alla dina kunder" />

      {/* Action Bar */}
      <div className="flex-shrink-0 mb-4 flex flex-col gap-4 px-8">
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
                value={`${searchFirstName} ${searchLastName} ${searchEmail}`.trim()}
                onChange={(e) => {
                  const value = e.target.value;
                  // Försök dela upp i förnamn och efternamn
                  const parts = value.trim().split(/\s+/);
                  if (parts.length > 1) {
                    setSearchFirstName(parts[0]);
                    setSearchLastName(parts.slice(1).join(' '));
                    setSearchEmail('');
                  } else if (value.includes('@')) {
                    setSearchEmail(value);
                    setSearchFirstName('');
                    setSearchLastName('');
                  } else {
                    setSearchFirstName(value);
                    setSearchLastName('');
                    setSearchEmail('');
                  }
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
              />
              {(searchFirstName || searchLastName || searchEmail) && (
                <button
                  onClick={() => {
                    setSearchFirstName('');
                    setSearchLastName('');
                    setSearchEmail('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Rensa sökning"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filters and Actions */}
        <div className="flex gap-3 flex-wrap">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
          >
            <option value="Alla">Alla statusar</option>
            <option value="Aktiv">Aktiv</option>
            <option value="Inaktiv">Inaktiv</option>
            <option value="Pausad">Pausad</option>
            <option value="Genomförd">Genomförd</option>
          </select>

          <select
            value={selectedPlace}
            onChange={(e) => setSelectedPlace(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
          >
            <option value="Alla">Alla orter</option>
            {PLACES.map((place) => (
              <option key={place} value={place}>
                {place}
              </option>
            ))}
          </select>

          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
          >
            <option value="Alla">Alla tjänster</option>
            {SERVICES.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>

          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-700">
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

      {/* Info för coacher/platschefer */}
      {requiresSearch && (
        <div className="mb-4 px-8">
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

      {/* Results Count - visa för admin, dölj för coacher och platschefer */}
      {userRole === 'admin' && (
        <div className="flex-shrink-0 mb-4 px-8">
          <p className="text-sm text-gray-600">
            Visar <span className="font-semibold text-gray-900">{filteredAndSortedCustomers.length}</span> av{' '}
            <span className="font-semibold text-gray-900">{customers.length}</span> kunder
          </p>
        </div>
      )}

      {/* Customers Table */}
      {(!requiresSearch || hasSearchTerm || hasOwnCustomers) && (
        <div className="flex-1 overflow-hidden px-8 pb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-full flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto">
              <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
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
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                  onClick={() => handleSort('serviceCount')}
                >
                  <div className="flex items-center gap-1">
                    Antal
                    {sortField === 'serviceCount' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                  onClick={() => handleSort('membershipDuration')}
                >
                  <div className="flex items-center gap-1">
                    Mån
                    {sortField === 'membershipDuration' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>
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
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    Datum
                    {sortField === 'date' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </div>
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Åtgärder
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedCustomers.map((customer) => {
                const priorityService = getPriorityService(customer);
                const serviceCount = getServiceCount(customer);
                const membershipDuration = getMembershipDuration(customer);
                
                return (
                <tr key={customer.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link
                      href={`/kunder/${customer.id}`}
                      className="font-medium text-[#1E5A7D] hover:text-[#0C3B5C] hover:underline text-sm cursor-pointer"
                    >
                      {customer.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link
                      href={`/kunder/${customer.id}`}
                      className="text-sm text-[#1E5A7D] hover:text-[#0C3B5C] hover:underline cursor-pointer"
                    >
                      {customer.email}
                    </Link>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{customer.place}</div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{customer.sport}</div>
                  </td>
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
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${getStatusColor(
                        customer.status
                      )}`}
                    >
                      {customer.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-medium">{serviceCount}</div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {membershipDuration !== null ? (
                      <div className="text-sm text-gray-900 font-medium">
                        {membershipDuration}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">-</div>
                    )}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {customer.price}
                      <span className="text-xs text-gray-500 ml-0.5">
                        {isMembershipService(customer.service) ? '/mån' : 'kr'}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-semibold">
                      {getTotalRevenue(customer).toLocaleString('sv-SE')} kr
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {format(new Date(customer.date), 'd MMM', { locale: sv })}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/kunder/${customer.id}`}
                        onClick={() => logCustomerView(customer.id, customer.name)}
                        className="text-[#1E5A7D] hover:text-[#0C3B5C] p-1.5 hover:bg-blue-50 rounded transition"
                        title="Redigera"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(customer.id)}
                        className="text-red-600 hover:text-red-900 p-1.5 hover:bg-red-50 rounded transition"
                        title="Ta bort"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>

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

