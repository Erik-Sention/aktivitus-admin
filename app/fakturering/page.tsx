'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { useCustomers } from '@/lib/CustomerContext';
import { Customer, ServiceEntry } from '@/types';
import { isMembershipService, isTestService, INVOICE_STATUSES } from '@/lib/constants';
import { InvoiceStatus } from '@/types';
import { format, isAfter, isBefore, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { sv } from 'date-fns/locale';
import { CheckCircle, AlertCircle, Clock, Filter, XCircle, ChevronLeft, ChevronRight, Square } from 'lucide-react';
import Link from 'next/link';
import { InvoiceStatusSelect } from '@/components/InvoiceStatusSelect';
import { shouldShowInvoiceForMonth, getInvoiceAmountForMonth, calculateNextInvoiceDateFromLast, hasInvoiceForMonth } from '@/lib/invoiceManagement';

export default function InvoicingPage() {
  const { customers, updateCustomer } = useCustomers();
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('Alla');
  const [selectedStatus, setSelectedStatus] = useState<string>('Alla');
  const [selectedPlace, setSelectedPlace] = useState<string>('Alla');
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const getInvoiceRowKey = (customerId: string, serviceId: string) => `${customerId}_${serviceId}`;
  
  // Navigera månader
  const handlePreviousMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    let newYear = year;
    let newMonth = month - 1;
    
    // Om månaden blir 0, gå till föregående år
    if (newMonth === 0) {
      newMonth = 12;
      newYear = year - 1;
    }
    
    setSelectedMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };
  
  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    let newYear = year;
    let newMonth = month + 1;
    
    // Om månaden blir 13, gå till nästa år
    if (newMonth === 13) {
      newMonth = 1;
      newYear = year + 1;
    }
    
    setSelectedMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };
  
  const handleCurrentMonth = () => {
    setSelectedMonth(new Date().toISOString().slice(0, 7));
  };

  // Automatisk uppdatering av förfallna fakturor (för aktuell månad)
  useEffect(() => {
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7); // YYYY-MM
    let hasUpdates = false;

    customers.forEach((customer) => {
      if (!customer.serviceHistory) return;

      const updatedHistory = customer.serviceHistory.map((service) => {
        if (
          service.status === 'Aktiv' &&
          isMembershipService(service.service)
        ) {
          // Kolla status för aktuell månad från invoiceHistory
          const currentMonthStatus = service.invoiceHistory?.[currentMonth];
          
          // Uppdatera bara om statusen för aktuell månad är "Väntar på betalning" och månaden har passerat
          if (currentMonthStatus === 'Väntar på betalning') {
            const monthDate = new Date(currentMonth + '-01');
            const monthEnd = endOfMonth(monthDate);
            
            // Om månaden har passerat, markera som förfallen
            if (isBefore(monthEnd, today)) {
              hasUpdates = true;
              const invoiceHistory = { ...(service.invoiceHistory || {}) };
              invoiceHistory[currentMonth] = 'Förfallen';
              
              return {
                ...service,
                invoiceHistory: invoiceHistory,
                invoiceStatus: 'Förfallen' as const, // För bakåtkompatibilitet
              };
            }
          }
        }
        return service;
      });

      if (hasUpdates) {
        updateCustomer(customer.id, { serviceHistory: updatedHistory }).catch((error) => {
          console.error('Fel vid uppdatering av kund:', error);
        });
      }
    });
  }, [customers, updateCustomer]);

  // Beräkna månadsintervall för vald månad
  const [year, month] = selectedMonth.split('-').map(Number);
  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(new Date(year, month - 1, 1));
  const today = new Date();


  // Samla alla membership-tjänster och tester från alla kunder och gruppera per kund
  // Visar fakturor för vald månad, inte nästa faktura
  const membershipServicesByCustomer = customers.map((customer) => {
    const servicesForMonth: any[] = [];
    
    // Lägg till memberships och tester från serviceHistory
    if (customer.serviceHistory && customer.serviceHistory.length > 0) {
      customer.serviceHistory
        .filter((service) => {
          // Inkludera memberships
          if (isMembershipService(service.service)) {
            // Använd shouldShowInvoiceForMonth för att avgöra om fakturan ska visas
            return shouldShowInvoiceForMonth(service, selectedMonth);
          }
          
          // Inkludera tester för den månad de genomfördes
          if (isTestService(service.service)) {
            const [year, month] = selectedMonth.split('-').map(Number);
            const serviceDate = new Date(service.date);
            const serviceMonth = serviceDate.getFullYear() * 12 + serviceDate.getMonth();
            const selectedMonthNum = year * 12 + (month - 1);
            
            // Visa testet bara för den månad det genomfördes
            return serviceMonth === selectedMonthNum;
          }
          
          return false;
        })
        .forEach((service) => {
          // För memberships: Hämta status för vald månad från invoiceHistory
          // För tester: Använd fakturastatus direkt
          const monthStatus = isMembershipService(service.service)
            ? (service.invoiceHistory?.[selectedMonth] || 'Väntar på betalning')
            : (service.invoiceStatus || 'Väntar på betalning');
          
          // Beräkna fakturabelopp för denna månad
          let invoiceAmount = 0;
          if (isMembershipService(service.service)) {
            invoiceAmount = getInvoiceAmountForMonth(service, selectedMonth);
            // Om beloppet är 0 (t.ex. för kvartalsvis men inte faktureringsmånad), hoppa över om ingen faktura finns
            if (invoiceAmount === 0 && !hasInvoiceForMonth(service, selectedMonth)) {
              return;
            }
          } else {
            // För tester: använd priset direkt (engångsbetalning)
            invoiceAmount = service.price;
          }
          
          servicesForMonth.push({
            ...service,
            // Överskriv invoiceStatus med månadsvis status för visning
            invoiceStatus: monthStatus,
            // Överskriv price med fakturabelopp för denna månad
            price: invoiceAmount || service.price,
          });
        });
    }
    
    // Om huvudtjänsten är ett membership och inte redan finns i serviceHistory, lägg till den
    if (isMembershipService(customer.service)) {
      const mainServiceInHistory = customer.serviceHistory?.some(
        (s) => s.service === customer.service && s.status === customer.status
      );
      
      if (!mainServiceInHistory) {
        // Skapa en temporär serviceEntry för huvudtjänsten
        const tempService: ServiceEntry = {
          id: `main_${customer.id}`,
          service: customer.service,
          price: customer.price,
          date: customer.date,
          status: customer.status,
          endDate: undefined,
          sport: customer.sport,
          coach: customer.coach,
          paymentMethod: 'Autogiro',
          invoiceStatus: 'Väntar på betalning',
          billingInterval: 'Månadsvis',
        };
        
        if (shouldShowInvoiceForMonth(tempService, selectedMonth)) {
          const invoiceAmount = getInvoiceAmountForMonth(tempService, selectedMonth);
          const monthStatus = tempService.invoiceHistory?.[selectedMonth] || 'Väntar på betalning';
          
          servicesForMonth.push({
            ...tempService,
            invoiceStatus: monthStatus,
            price: invoiceAmount || customer.price,
          });
        }
      }
    }
    
    // Om kunden har några tjänster för denna månad, returnera en grupperad post
    if (servicesForMonth.length > 0) {
      // Beräkna totalt pris för alla tjänster
      const totalPrice = servicesForMonth.reduce((sum, s) => sum + s.price, 0);
      
      // Hitta den vanligaste betalningsmetoden och statusen
      const paymentMethods = servicesForMonth.map(s => s.paymentMethod).filter(Boolean);
      const mostCommonPaymentMethod = paymentMethods.length > 0 
        ? paymentMethods.reduce((a, b, _, arr) => 
            arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
          )
        : 'Autogiro';
      
      // Om alla tjänster har samma status, använd den. Annars använd den första.
      const statuses = servicesForMonth.map(s => s.invoiceStatus);
      const allSameStatus = statuses.every(s => s === statuses[0]);
      const invoiceStatus = allSameStatus ? statuses[0] : statuses[0];
      
      return {
        customer,
        services: servicesForMonth,
        totalPrice,
        paymentMethod: mostCommonPaymentMethod,
        invoiceStatus,
        // Använd första tjänstens nextInvoiceDate eller beräkna från första tjänsten
        nextInvoiceDate: servicesForMonth[0]?.nextInvoiceDate,
      };
    }
    
    return null;
  }).filter(Boolean) as Array<{
    customer: Customer;
    services: any[];
    totalPrice: number;
    paymentMethod: string;
    invoiceStatus: string;
    nextInvoiceDate?: Date;
  }>;

  // Konvertera till samma format som tidigare för kompatibilitet
  const membershipServices = membershipServicesByCustomer.flatMap((group) => {
    // Returnera en rad per kund med alla tjänster
    return [group];
  });

  // Filtrera baserat på betalningsmetod, status och plats
  const filteredServices = membershipServices.filter((item) => {
    const matchesPayment = selectedPaymentMethod === 'Alla' || item.paymentMethod === selectedPaymentMethod;
    const matchesStatus = selectedStatus === 'Alla' || item.invoiceStatus === selectedStatus;
    const matchesPlace = selectedPlace === 'Alla' || item.customer.place === selectedPlace;
    return matchesPayment && matchesStatus && matchesPlace;
  });

  // Gruppera efter faktureringsstatus
  const toBePaid = filteredServices.filter((s) => s.invoiceStatus === 'Väntar på betalning');
  const paid = filteredServices.filter((s) => s.invoiceStatus === 'Betald');
  const overdue = filteredServices.filter((s) => 
    s.invoiceStatus === 'Förfallen' || 
    s.invoiceStatus === 'Påminnelse skickad' ||
    s.invoiceStatus === 'Ej betald efter påminnelse' ||
    s.invoiceStatus === 'Överlämnad till inkasso' ||
    s.invoiceStatus === 'Betalning avvisad'
  );
  const autogiro = filteredServices.filter((s) => s.paymentMethod === 'Autogiro');

  // Beräkna förfallna (nästa faktureringsdatum har passerat)
  const overdueByDate = filteredServices.filter((s) => {
    if (!s.nextInvoiceDate) return false;
    return isBefore(new Date(s.nextInvoiceDate), today) && s.invoiceStatus !== 'Betald';
  });

  // Kommande fakturor (inom 7 dagar)
  const upcomingInvoices = filteredServices.filter((s) => {
    if (!s.nextInvoiceDate) return false;
    const nextDate = new Date(s.nextInvoiceDate);
    const sevenDaysFromNow = addMonths(today, 0);
    sevenDaysFromNow.setDate(today.getDate() + 7);
    return isAfter(nextDate, today) && isBefore(nextDate, sevenDaysFromNow);
  });

  // Beräkna total omsättning per kategori
  const totalToBePaid = toBePaid.reduce((sum, s) => sum + s.totalPrice, 0);
  const totalPaid = paid.reduce((sum, s) => sum + s.totalPrice, 0);
  const totalOverdue = overdue.reduce((sum, s) => sum + s.totalPrice, 0);
  const totalAutogiro = autogiro.reduce((sum, s) => sum + s.totalPrice, 0);

  useEffect(() => {
    setSelectedInvoices((prev) => {
      if (prev.size === 0) {
        return prev;
      }

      const validKeys = new Set(
        filteredServices.map((item) => item.customer.id)
      );

      let hasChanged = false;
      const next = new Set<string>();

      prev.forEach((key) => {
        if (validKeys.has(key)) {
          next.add(key);
        } else {
          hasChanged = true;
        }
      });

      return hasChanged ? next : prev;
    });
  }, [filteredServices]);

  const allSelected =
    filteredServices.length > 0 && selectedInvoices.size === filteredServices.length;

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedInvoices(new Set());
      return;
    }

    setSelectedInvoices(
      new Set(filteredServices.map((item) => item.customer.id))
    );
  };

  const handleInvoiceSelectionChange = (key: string, checked: boolean) => {
    setSelectedInvoices((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  // Sätt faktureringsstatus för ALLA relevanta tjänster för en kund under vald månad
  const handleSetStatusForCustomerMonth = async (
    customerId: string,
    newStatus: InvoiceStatus
  ) => {
    const customer = customers.find((c) => c.id === customerId);
    
    if (!customer) {
      console.error('Kund hittades inte:', customerId);
      return;
    }
    
    // Logga faktureringsuppdatering
    import('@/lib/activityLogger').then(({ logInvoiceUpdate }) => {
      logInvoiceUpdate(customerId, customer.name || `${customer.firstName} ${customer.lastName}`, `Status ändrad till ${newStatus} för ${selectedMonth}`);
    });
    
    if (!customer.serviceHistory || customer.serviceHistory.length === 0) {
      console.error('Kunden har ingen serviceHistory:', customerId);
      return;
    }

    const currentNote = ''; // vi bygger anteckningar per tjänst nedan
    const timestamp = format(today, 'yyyy-MM-dd', { locale: sv });
    const [year, month] = selectedMonth.split('-').map(Number);
    const selectedMonthNum = year * 12 + (month - 1);

    const updatedHistory = customer.serviceHistory.map((entry) => {
      const serviceDate = new Date(entry.date);
      const serviceMonth = serviceDate.getFullYear() * 12 + serviceDate.getMonth();

      const isMembership = isMembershipService(entry.service);
      const isTest = isTestService(entry.service);

      // Bestäm om den här tjänsten hör till den valda månaden:
      // - Memberships: använd shouldShowInvoiceForMonth
      // - Tester: samma månad som datumet
      let belongsToSelectedMonth = false;
      if (isMembership) {
        belongsToSelectedMonth = shouldShowInvoiceForMonth(entry, selectedMonth);
      } else if (isTest) {
        belongsToSelectedMonth = serviceMonth === selectedMonthNum;
      }

      if (!belongsToSelectedMonth) {
        return entry;
      }

      // Skapa eller uppdatera månadsvis faktureringshistorik
      const invoiceHistory = { ...(entry.invoiceHistory || {}) };
      invoiceHistory[selectedMonth] = newStatus;

      // Bestäm vilken invoiceStatus som ska visas som standard (för bakåtkompatibilitet)
      let defaultInvoiceStatus = entry.invoiceStatus || 'Väntar på betalning';
      const monthsWithStatus = Object.keys(invoiceHistory).sort().reverse();
      if (monthsWithStatus.length > 0) {
        const latestMonth = monthsWithStatus[0];
        defaultInvoiceStatus = invoiceHistory[latestMonth];
      } else {
        defaultInvoiceStatus = newStatus;
      }

      const update: any = {
        ...entry,
        invoiceHistory,
        invoiceStatus: defaultInvoiceStatus,
      };

      // Om statusen inte är "Betald" eller "Ej aktuell", lägg till notering
      if (
        newStatus !== 'Betald' &&
        newStatus !== 'Ej aktuell' &&
        newStatus !== 'Väntar på betalning'
      ) {
        update.invoiceNote = currentNote
          ? `${currentNote}\n[${timestamp}] ${selectedMonth}: ${newStatus}`
          : `[${timestamp}] ${selectedMonth}: ${newStatus}`;
      }

      // Uppdatera nästa faktureringsdatum ENDAST för memberships, inte för tester
      if (isMembership && newStatus === 'Betald') {
        const selectedMonthDate = new Date(year, month - 1, 1);
        const billingInterval = entry.billingInterval || 'Månadsvis';
        const nextInvoiceDate = calculateNextInvoiceDateFromLast(
          selectedMonthDate,
          billingInterval
        );

        if (
          !entry.nextInvoiceDate ||
          isAfter(selectedMonthDate, new Date(entry.nextInvoiceDate)) ||
          format(new Date(entry.nextInvoiceDate), 'yyyy-MM') === selectedMonth
        ) {
          update.nextInvoiceDate = nextInvoiceDate;
        }
      }

      return update;
    });
    
    try {
      await updateCustomer(customerId, { serviceHistory: updatedHistory });
    } catch (error) {
      console.error('Fel vid uppdatering av kund:', error);
      alert('Kunde inte uppdatera fakturastatus. Försök igen.');
    }
  };

  const handleBulkStatusUpdate = async (status: InvoiceStatus) => {
    const targets = filteredServices.filter((item) =>
      selectedInvoices.has(item.customer.id)
    );

    if (targets.length === 0) return;

    setIsBulkUpdating(true);
    try {
      await Promise.all(
        targets.map((item) =>
          handleSetStatusForCustomerMonth(item.customer.id, status)
        )
      );
      setSelectedInvoices(new Set());
    } catch (error) {
      console.error('Fel vid bulkuppdatering av fakturastatus:', error);
      alert('Kunde inte uppdatera alla fakturor. Försök igen.');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleMarkAsPaid = (customerId: string) => {
    handleSetStatusForCustomerMonth(customerId, 'Betald');
  };

  const handleWriteOff = (customerId: string, serviceId: string) => {
    if (!confirm('Är du säker på att du vill avskriva denna skuld?')) return;
    handleSetStatusForCustomerMonth(customerId, 'Ej aktuell');
  };


  const getInvoiceStatusColor = (status?: string) => {
    switch (status) {
      case 'Betald':
        return 'bg-green-100 text-green-800';
      case 'Väntar på betalning':
        return 'bg-yellow-100 text-yellow-800';
      case 'Förfallen':
        return 'bg-red-100 text-red-800';
      case 'Påminnelse skickad':
        return 'bg-orange-100 text-orange-800';
      case 'Ej betald efter påminnelse':
        return 'bg-red-200 text-red-900';
      case 'Överlämnad till inkasso':
        return 'bg-purple-100 text-purple-800';
      case 'Betalning avvisad':
        return 'bg-pink-100 text-pink-800';
      case 'Ej aktuell':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentMethodColor = (method?: string) => {
    switch (method) {
      case 'Autogiro':
        return 'bg-blue-100 text-blue-800';
      case 'Faktura':
        return 'bg-purple-100 text-purple-800';
      case 'Swish':
        return 'bg-pink-100 text-pink-800';
      case 'Förskottsbetalning':
        return 'bg-emerald-100 text-emerald-800';
      case 'Klarna':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <Header
        title="Fakturering"
        subtitle="Hantera fakturor och betalningar för aktiva medlemmar"
      />

      {/* Månadsnavigering */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title="Föregående månad"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            
            <div className="flex items-center gap-3">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 font-medium"
              />
              <button
                onClick={handleCurrentMonth}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition font-medium"
              >
                Idag
              </button>
            </div>
            
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title="Nästa månad"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>
          </div>
          
          <div className="text-sm text-gray-600">
            {format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: sv })}
          </div>
        </div>
      </div>

      {/* Statistik Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Väntar på betalning</h3>
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{toBePaid.length}</p>
          <p className="text-sm text-gray-600 mt-1">{totalToBePaid.toLocaleString('sv-SE')} kr</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">
              Betalda {format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: sv })}
            </h3>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{paid.length}</p>
          <p className="text-sm text-gray-600 mt-1">{totalPaid.toLocaleString('sv-SE')} kr</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Förfallna</h3>
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{overdue.length}</p>
          <p className="text-sm text-gray-600 mt-1">{totalOverdue.toLocaleString('sv-SE')} kr</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Autogiro</h3>
            <CheckCircle className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{autogiro.length}</p>
          <p className="text-sm text-gray-600 mt-1">{totalAutogiro.toLocaleString('sv-SE')} kr/mån</p>
        </div>
      </div>

      {/* Filter och Export */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filter:</span>
          </div>

          <select
            value={selectedPaymentMethod}
            onChange={(e) => setSelectedPaymentMethod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
          >
            <option value="Alla">Alla betalningsmetoder</option>
            <option value="Autogiro">Autogiro</option>
            <option value="Faktura">Faktura</option>
            <option value="Swish">Swish</option>
            <option value="Förskottsbetalning">Förskottsbetalning</option>
            <option value="Klarna">Klarna</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
          >
            <option value="Alla">Alla statusar</option>
            {INVOICE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            value={selectedPlace}
            onChange={(e) => setSelectedPlace(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
          >
            <option value="Alla">Alla platser</option>
            <option value="Stockholm">Stockholm</option>
            <option value="Göteborg">Göteborg</option>
            <option value="Malmö">Malmö</option>
            <option value="Linköping">Linköping</option>
            <option value="Falun">Falun</option>
            <option value="Åre">Åre</option>
          </select>

        </div>
      </div>

      {/* Varningar */}
      {overdueByDate.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900 mb-1">
                {overdueByDate.length} förfallna fakturor
              </h4>
              <p className="text-sm text-red-800">
                Dessa kunder har passerat sitt nästa faktureringsdatum och behöver följas upp.
              </p>
            </div>
          </div>
        </div>
      )}

      {upcomingInvoices.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">
                {upcomingInvoices.length} fakturor inom 7 dagar
              </h4>
              <p className="text-sm text-blue-800">
                Dessa kunder ska faktureras inom de närmaste 7 dagarna.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Faktureringslista */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            Visar {filteredServices.length} {filteredServices.length === 1 ? 'tjänst' : 'tjänster'}
          </p>
          {filteredServices.length > 0 && (
            <button
              onClick={handleToggleSelectAll}
              className="text-sm text-gray-700 font-medium flex items-center gap-2 hover:text-gray-900"
            >
              {allSelected ? (
                <>
                  <CheckCircle className="w-4 h-4 text-[#1E5A7D]" />
                  Avmarkera alla
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 text-[#1E5A7D]" />
                  Markera alla
                </>
              )}
            </button>
          )}
        </div>

        {selectedInvoices.size > 0 && (
          <div className="px-4 py-3 border-b border-blue-100 bg-blue-50 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium text-blue-900">
                Valda tjänster: {selectedInvoices.size}
              </p>
              {isBulkUpdating && (
                <span className="text-xs text-blue-800">Uppdaterar status...</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {INVOICE_STATUSES.map((status) => (
                <button
                  key={status}
                  onClick={() => handleBulkStatusUpdate(status)}
                  disabled={isBulkUpdating}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border border-transparent shadow-sm transition hover:opacity-90 disabled:opacity-50 ${getInvoiceStatusColor(status)}`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 text-[#1E5A7D] border-gray-300 rounded focus:ring-[#1E5A7D] cursor-pointer"
                    aria-label="Markera alla fakturor"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Kund
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Tjänst
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Pris
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Betalningsmetod
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Förfallodatum
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Plats
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Åtgärder
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredServices.map((item) => {
                // Beräkna aggregerad status för alla tjänster denna månad
                const serviceStatuses = item.services.map(
                  (service: any) => service.invoiceStatus || 'Väntar på betalning'
                );
                let aggregatedStatus: InvoiceStatus = 'Väntar på betalning';

                if (serviceStatuses.every((s) => s === 'Betald')) {
                  aggregatedStatus = 'Betald';
                } else if (
                  serviceStatuses.some(
                    (s) =>
                      s === 'Förfallen' ||
                      s === 'Påminnelse skickad' ||
                      s === 'Ej betald efter påminnelse' ||
                      s === 'Överlämnad till inkasso' ||
                      s === 'Betalning avvisad'
                  )
                ) {
                  // Om någon tjänst är förfallen/påminnelse/inkasso -> visa det
                  aggregatedStatus =
                    (serviceStatuses.find(
                      (s) =>
                        s === 'Förfallen' ||
                        s === 'Påminnelse skickad' ||
                        s === 'Ej betald efter påminnelse' ||
                        s === 'Överlämnad till inkasso' ||
                        s === 'Betalning avvisad'
                    ) as InvoiceStatus) || 'Förfallen';
                } else if (serviceStatuses.some((s) => s === 'Väntar på betalning')) {
                  aggregatedStatus = 'Väntar på betalning';
                } else {
                  aggregatedStatus = (serviceStatuses[0] ||
                    'Väntar på betalning') as InvoiceStatus;
                }

                const currentStatus = aggregatedStatus as InvoiceStatus;
                const rowKey = item.customer.id;
                const isSelected = selectedInvoices.has(rowKey);
                // Kontrollera om någon faktura finns för denna månad
                // För memberships: kolla invoiceHistory[selectedMonth]
                // För tester: kolla om tjänsten är för denna månad och har en status
                const hasAnyInvoice = item.services.some((service: any) => {
                  if (isTestService(service.service)) {
                    // För tester: kontrollera om tjänsten är för denna månad
                    const [year, month] = selectedMonth.split('-').map(Number);
                    const serviceDate = new Date(service.date);
                    const serviceMonth = serviceDate.getFullYear() * 12 + serviceDate.getMonth();
                    const selectedMonthNum = year * 12 + (month - 1);
                    return serviceMonth === selectedMonthNum && service.invoiceStatus;
                  }
                  return hasInvoiceForMonth(service, selectedMonth);
                });

                return (
                  <tr key={item.customer.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Markera ${item.customer.name}`}
                        checked={isSelected}
                        onChange={(e) => handleInvoiceSelectionChange(rowKey, e.target.checked)}
                        className="w-4 h-4 text-[#1E5A7D] border-gray-300 rounded focus:ring-[#1E5A7D] cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/kunder/${item.customer.id}`}
                        className="text-[#1E5A7D] hover:underline font-medium"
                      >
                        {item.customer.name}
                      </Link>
                      <p className="text-xs text-gray-500">{item.customer.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        {item.services.map((service: any, index: number) => (
                          <div key={service.id} className={index > 0 ? "pt-2 border-t border-gray-100" : ""}>
                            <span className="text-sm font-semibold text-gray-900 block">{service.service}</span>
                            {service.sport && service.sport !== 'Ingen' && (
                              <span className="text-xs text-gray-600 block">Gren: {service.sport}</span>
                            )}
                            {service.billingInterval && service.billingInterval !== 'Månadsvis' && (
                              <span className="text-xs text-blue-600 font-medium block">{service.billingInterval}</span>
                            )}
                            {service.coach && (
                              <span className="text-xs text-gray-500 block">Coach: {service.coach}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-gray-900">
                        {item.totalPrice.toLocaleString('sv-SE')} kr
                      </span>
                      <span className="text-xs text-gray-500">/mån</span>
                      {item.services.length > 1 && (
                        <p className="text-xs text-blue-600 mt-1">{item.services.length} tjänster</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${getPaymentMethodColor(
                          item.paymentMethod
                        )}`}
                      >
                        {item.paymentMethod || 'Ej angiven'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${getInvoiceStatusColor(
                          item.invoiceStatus
                        )}`}
                      >
                        {item.invoiceStatus || 'Ej aktuell'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {/* Visa faktureringsdatum för vald månad */}
                      {(() => {
                        const [year, month] = selectedMonth.split('-').map(Number);
                        const invoiceDate = new Date(year, month - 1, 1);
                        const dueDate = endOfMonth(invoiceDate);
                        
                        // Om någon faktura finns för denna månad, visa förfallodatum
                        if (hasAnyInvoice) {
                          return (
                            <div>
                              <span className="text-sm text-gray-900">
                                {format(dueDate, 'd MMM yyyy', { locale: sv })}
                              </span>
                              <p className="text-xs text-gray-500">Förfallodatum</p>
                            </div>
                          );
                        }
                        
                        // Om ingen faktura finns än, visa när den skulle faktureras
                        return (
                          <div>
                            <span className="text-sm text-gray-500">
                              {format(dueDate, 'd MMM yyyy', { locale: sv })}
                            </span>
                            <p className="text-xs text-gray-400">Planerat</p>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700">{item.customer.place}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-stretch justify-end gap-2 sm:flex-row sm:items-center">
                        {currentStatus !== 'Betald' && (
                          <button
                            onClick={() => {
                              // Markera alla tjänster för denna kund och månad som betalda
                              handleMarkAsPaid(item.customer.id);
                            }}
                            className="text-xs px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition font-medium flex items-center gap-1"
                            title="Markera alla tjänster som betalda"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Betald
                          </button>
                        )}

                        <InvoiceStatusSelect
                          value={currentStatus}
                          options={INVOICE_STATUSES}
                          onChange={(status) => {
                            // Uppdatera alla tjänster för denna kund och månad till vald status
                            handleSetStatusForCustomerMonth(item.customer.id, status);
                          }}
                        />

                        {item.invoiceStatus !== 'Ej aktuell' && (
                          <button
                            onClick={() => {
                              if (confirm('Är du säker på att du vill avskriva alla skulder för denna kund?')) {
                                item.services.forEach((service: any) => {
                                  handleWriteOff(item.customer.id, service.id);
                                });
                              }
                            }}
                            className="text-xs px-3 py-1.5 bg-red-50 text-red-700 rounded hover:bg-red-100 transition font-medium flex items-center gap-1"
                          >
                            <XCircle className="w-3 h-3" />
                            Avskriv skuld
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredServices.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Inga tjänster matchar de valda filtren.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

