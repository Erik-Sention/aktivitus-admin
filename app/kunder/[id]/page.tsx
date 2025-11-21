'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import { useCustomers } from '@/lib/CustomerContext';
import { Customer } from '@/types';
import { PLACES, SPORTS, MEMBERSHIPS, TESTS, SERVICES, STATUSES, PAYMENT_METHODS, INVOICE_STATUSES, BILLING_INTERVALS, calculatePrice, isTestService, isMembershipService, getTestType } from '@/lib/constants';
import { Save, X, Plus, Trash2, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { SERVICE_COLORS } from '@/lib/constants';
import { ServiceEntry } from '@/types';
import MembershipTimeline from '@/components/MembershipTimeline';
import CoachAutocomplete from '@/components/CoachAutocomplete';
import { getCoachProfile } from '@/lib/coachProfiles';

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const { customers, updateCustomer } = useCustomers();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [serviceHistory, setServiceHistory] = useState<ServiceEntry[]>([]);
  const [showAddService, setShowAddService] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const defaultPrice = calculatePrice('Membership Standard', 'Löpning', false);
  
  const [newService, setNewService] = useState({
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
    paymentMethod: 'Faktura' as const,
    invoiceStatus: 'Väntar på betalning' as const,
    billingInterval: 'Månadsvis' as const,
    numberOfMonths: 1,
    nextInvoiceDate: '',
    paidUntil: '',
    invoiceReference: '',
    invoiceNote: '',
  });

  const [editingService, setEditingService] = useState<string | null>(null);
  const [editedServiceData, setEditedServiceData] = useState<any>(null);

  useEffect(() => {
    const foundCustomer = customers.find((c) => c.id === params.id);
    if (foundCustomer) {
      // Ladda serviceHistory om det finns, annars skapa initial från nuvarande tjänst
      let history: ServiceEntry[];
      if (foundCustomer.serviceHistory && foundCustomer.serviceHistory.length > 0) {
        history = foundCustomer.serviceHistory;
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
          },
        ];
      }
      setServiceHistory(history);
      
      // Uppdatera kunden med den senaste AKTIVA tjänsten
      const activeService = history.find(s => s.status === 'Aktiv') || history[0];
      setCustomer({
        ...foundCustomer,
        service: activeService.service,
        price: activeService.price,
        date: activeService.date,
        status: activeService.status,
      });
    }
  }, [params.id, customers]);

  const handleUpdateCustomer = (field: string, value: any) => {
    if (customer) {
      setCustomer({ ...customer, [field]: value });
    }
  };

  const handleServiceChange = (selectedService: string) => {
    // Hämta senior-status från coach-profilen
    const coachProfile = customer?.coach ? getCoachProfile(customer.coach) : null;
    const isSeniorCoach = coachProfile?.isSeniorCoach || false;
    
    const suggestedPrice = calculatePrice(
      selectedService as any,
      newService.sport as any,
      isSeniorCoach
    );
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
    // Hämta senior-status från coach-profilen
    const coachProfile = customer?.coach ? getCoachProfile(customer.coach) : null;
    const isSeniorCoach = coachProfile?.isSeniorCoach || false;
    
    const suggestedPrice = calculatePrice(
      newService.service as any,
      selectedSport as any,
      isSeniorCoach
    );
    
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

    const serviceEntry: ServiceEntry = {
      id: `service_${Date.now()}`,
      service: newService.service as any,
      price: newService.price,
      originalPrice: newService.originalPrice,
      discount: newService.discount !== 0 ? newService.discount : undefined,
      priceNote: newService.priceNote || undefined,
      date: new Date(newService.date),
      status: newService.status as any,
      endDate: newService.endDate ? new Date(newService.endDate) : undefined,
      sport: newService.sport as any,
      coach: newService.coach || customer?.coach || undefined,
      // Betalningsinformation per tjänst
      paymentMethod: newService.paymentMethod,
      invoiceStatus: newService.invoiceStatus,
      billingInterval: newService.billingInterval,
      numberOfMonths: newService.numberOfMonths || undefined,
      nextInvoiceDate: newService.nextInvoiceDate ? new Date(newService.nextInvoiceDate) : undefined,
      paidUntil: newService.paidUntil ? new Date(newService.paidUntil) : undefined,
      invoiceReference: newService.invoiceReference || undefined,
      invoiceNote: newService.invoiceNote || undefined,
    };

    const updatedHistory = [serviceEntry, ...serviceHistory];
    setServiceHistory(updatedHistory);
    
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
      
      // Uppdatera även i context så att ändringarna sparas
      updateCustomer(customer.id, {
        service: activeService.service as any,
        price: activeService.price,
        date: activeService.date,
        status: activeService.status as any,
        coach: newMainCoach,
        serviceHistory: updatedHistory,
      });
    }

    // Hämta senior-status från coach-profilen
    const coachProfile = customer?.coach ? getCoachProfile(customer.coach) : null;
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
      endDate: '',
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
    setEditedServiceData({
      ...entry,
      date: format(new Date(entry.date), 'yyyy-MM-dd'),
      endDate: entry.endDate ? format(new Date(entry.endDate), 'yyyy-MM-dd') : '',
      nextInvoiceDate: entry.nextInvoiceDate ? format(new Date(entry.nextInvoiceDate), 'yyyy-MM-dd') : '',
      paidUntil: entry.paidUntil ? format(new Date(entry.paidUntil), 'yyyy-MM-dd') : '',
      originalPrice: entry.originalPrice || entry.price,
      discount: entry.discount || 0,
      priceNote: entry.priceNote || '',
      sport: entry.sport || '',
      paymentMethod: entry.paymentMethod || 'Faktura',
      invoiceStatus: entry.invoiceStatus || 'Ej aktuell',
      billingInterval: entry.billingInterval || 'Månadsvis',
      numberOfMonths: entry.numberOfMonths || 1,
      invoiceReference: entry.invoiceReference || '',
      invoiceNote: entry.invoiceNote || '',
    });
  };

  const handleSaveEdit = (id: string) => {
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
            endDate: editedServiceData.endDate ? new Date(editedServiceData.endDate) : undefined,
            sport: editedServiceData.sport,
            paymentMethod: editedServiceData.paymentMethod,
            invoiceStatus: editedServiceData.invoiceStatus,
            billingInterval: editedServiceData.billingInterval,
            numberOfMonths: editedServiceData.numberOfMonths || undefined,
            nextInvoiceDate: editedServiceData.nextInvoiceDate ? new Date(editedServiceData.nextInvoiceDate) : undefined,
            paidUntil: editedServiceData.paidUntil ? new Date(editedServiceData.paidUntil) : undefined,
            invoiceReference: editedServiceData.invoiceReference || undefined,
            invoiceNote: editedServiceData.invoiceNote || undefined,
          }
        : entry
    );
    setServiceHistory(updatedHistory);
    
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
  };

  const handleDeleteService = (id: string) => {
    if (confirm('Är du säker på att du vill ta bort denna tjänst?')) {
      const updatedHistory = serviceHistory.filter((s) => s.id !== id);
      setServiceHistory(updatedHistory);
      
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

  const handleSave = () => {
    if (customer) {
      updateCustomer(customer.id, { ...customer, serviceHistory: serviceHistory });
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        router.push('/kunder');
      }, 1500);
    }
  };

  const handleCancel = () => {
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Namn</label>
                <input
                  type="text"
                  value={customer.name}
                  onChange={(e) => handleUpdateCustomer('name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">E-post</label>
                <input
                  type="email"
                  value={customer.email}
                  onChange={(e) => handleUpdateCustomer('email', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Telefonnummer</label>
                <input
                  type="tel"
                  value={customer.phone || ''}
                  onChange={(e) => handleUpdateCustomer('phone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                  placeholder="070-123 45 67"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Plats</label>
                <select
                  value={customer.place}
                  onChange={(e) => handleUpdateCustomer('place', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
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
                  const coachProfile = getCoachProfile(customer.coach);
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
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
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-gray-900 mb-3">Ny tjänst</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-900 mb-1">Tjänst</label>
                    <select
                      value={newService.service}
                      onChange={(e) => handleServiceChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                    >
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
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Gren {isMembershipService(newService.service) && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      value={newService.sport}
                      onChange={(e) => handleSportChangeForNewService(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                    >
                      {SPORTS.map((sport) => (
                        <option key={sport} value={sport}>
                          {sport}
                        </option>
                      ))}
                    </select>
                    {newService.sport && getTestType(newService.service, newService.sport as any) && (
                      <p className="mt-1 text-xs text-gray-600">
                        <span className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-800 font-medium">
                          {getTestType(newService.service, newService.sport as any)}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2 bg-gray-50 p-3 rounded border border-gray-200">
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

                    <div className="grid grid-cols-2 gap-2">
                      {newService.usePercentage ? (
                        <>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Rabatt (%)</label>
                            <input
                              type="number"
                              value={newService.discount}
                              onChange={(e) => handleDiscountChange(parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1E5A7D] text-gray-900"
                              placeholder="0"
                              min="0"
                              max="100"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Slutpris (kr)</label>
                            <input
                              type="number"
                              value={newService.price}
                              disabled
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-gray-100 text-gray-900 font-semibold"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Slutpris (kr)</label>
                            <input
                              type="number"
                              value={newService.price}
                              onChange={(e) => handleManualPriceChange(parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1E5A7D] text-gray-900 font-semibold"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Skillnad</label>
                            <input
                              type="text"
                              value={`${newService.originalPrice - newService.price} kr`}
                              disabled
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm bg-gray-100 text-gray-900"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Anledning till prisavvikelse <span className="text-xs text-gray-500">(frivillig)</span>
                    </label>
                    <input
                      type="text"
                      value={newService.priceNote}
                      onChange={(e) => setNewService({ ...newService, priceNote: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                      placeholder="T.ex. Presentkort, 15% kampanj, hålla kvar kunden..."
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
                    <label className="block text-sm font-medium text-gray-900 mb-1">Datum</label>
                    <input
                      type="date"
                      value={newService.date}
                      onChange={(e) => setNewService({ ...newService, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Status 
                      {isTestService(newService.service) && (
                        <span className="ml-2 text-xs text-gray-500">(Auto: Genomförd för tester)</span>
                      )}
                    </label>
                    <select
                      value={newService.status}
                      onChange={(e) => setNewService({ ...newService, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {isMembershipService(newService.service) && newService.status !== 'Aktiv' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Slutdatum <span className="text-xs text-gray-500">(frivillig - för churn-analys)</span>
                      </label>
                      <input
                        type="date"
                        value={newService.endDate}
                        onChange={(e) => setNewService({ ...newService, endDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                      />
                    </div>
                  )}

                  {/* Betalningsinformation för denna tjänst */}
                  <div className="md:col-span-2 mt-4 pt-4 border-t border-gray-300">
                    <h5 className="font-medium text-gray-900 mb-3 text-sm">Betalningsinformation</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-900 mb-1">Betalningsmetod</label>
                        <select
                          value={newService.paymentMethod}
                          onChange={(e) => setNewService({ ...newService, paymentMethod: e.target.value as any })}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1E5A7D] text-gray-900"
                        >
                          {PAYMENT_METHODS.map((method) => (
                            <option key={method} value={method}>{method}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-900 mb-1">Faktureringsstatus</label>
                        <select
                          value={newService.invoiceStatus}
                          onChange={(e) => setNewService({ ...newService, invoiceStatus: e.target.value as any })}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1E5A7D] text-gray-900"
                        >
                          {INVOICE_STATUSES.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </div>

                      {isMembershipService(newService.service) && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-gray-900 mb-1">Faktureringsintervall</label>
                            <select
                              value={newService.billingInterval}
                              onChange={(e) => setNewService({ ...newService, billingInterval: e.target.value as any })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1E5A7D] text-gray-900"
                            >
                              {BILLING_INTERVALS.filter(interval => interval !== 'Engångsbetalning').map((interval) => (
                                <option key={interval} value={interval}>{interval}</option>
                              ))}
                            </select>
                          </div>

                          {(newService.paymentMethod === 'Förskottsbetalning' || newService.billingInterval !== 'Månadsvis') && (
                            <div>
                              <label className="block text-xs font-medium text-gray-900 mb-1">Antal månader</label>
                              <input
                                type="number"
                                value={newService.numberOfMonths}
                                onChange={(e) => setNewService({ ...newService, numberOfMonths: parseInt(e.target.value) || 1 })}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1E5A7D] text-gray-900"
                                min="1"
                                max="36"
                              />
                            </div>
                          )}

                          <div>
                            <label className="block text-xs font-medium text-gray-900 mb-1">Nästa faktureringsdatum</label>
                            <input
                              type="date"
                              value={newService.nextInvoiceDate}
                              onChange={(e) => setNewService({ ...newService, nextInvoiceDate: e.target.value })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1E5A7D] text-gray-900"
                            />
                          </div>

                          {newService.paymentMethod === 'Förskottsbetalning' && (
                            <div>
                              <label className="block text-xs font-medium text-gray-900 mb-1">Betald till</label>
                              <input
                                type="date"
                                value={newService.paidUntil}
                                onChange={(e) => setNewService({ ...newService, paidUntil: e.target.value })}
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1E5A7D] text-gray-900"
                              />
                            </div>
                          )}
                        </>
                      )}

                      <div>
                        <label className="block text-xs font-medium text-gray-900 mb-1">Fakturareferens</label>
                        <input
                          type="text"
                          value={newService.invoiceReference}
                          onChange={(e) => setNewService({ ...newService, invoiceReference: e.target.value })}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1E5A7D] text-gray-900"
                          placeholder="OCR-nummer"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-900 mb-1">Faktureringsnotering</label>
                        <input
                          type="text"
                          value={newService.invoiceNote}
                          onChange={(e) => setNewService({ ...newService, invoiceNote: e.target.value })}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1E5A7D] text-gray-900"
                          placeholder="Särskilda instruktioner"
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
                    <div className="space-y-4 bg-blue-50 p-4 rounded-lg">
                      {/* Tjänsttyp */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Tjänst *
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
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1E5A7D] text-gray-900"
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
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Gren {isMembershipService(editedServiceData.service) && '*'}
                        </label>
                        {isMembershipService(editedServiceData.service) ? (
                          <select
                            value={editedServiceData.sport || ''}
                            onChange={(e) => setEditedServiceData({ ...editedServiceData, sport: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1E5A7D] text-gray-900"
                          >
                            {SPORTS.map((sport) => (
                              <option key={sport} value={sport}>
                                {sport}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded text-sm text-gray-600 italic">
                            {getTestType(editedServiceData.service)}
                          </div>
                        )}
                      </div>

                      {/* Pris */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
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
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1E5A7D] text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Rabatt (%)
                          </label>
                          <input
                            type="number"
                            value={editedServiceData.discount || 0}
                            onChange={(e) => {
                              const discount = parseFloat(e.target.value) || 0;
                              const originalPrice = editedServiceData.originalPrice || editedServiceData.price;
                              setEditedServiceData({
                                ...editedServiceData,
                                discount,
                                price: originalPrice - (originalPrice * discount / 100),
                              });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1E5A7D] text-gray-900"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Slutpris: <span className="font-bold">{editedServiceData.price.toLocaleString('sv-SE')} kr</span>
                        </label>
                      </div>

                      {/* Anledning till prisavvikelse */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Anledning till prisavvikelse (frivillig)
                        </label>
                        <textarea
                          value={editedServiceData.priceNote || ''}
                          onChange={(e) => setEditedServiceData({ ...editedServiceData, priceNote: e.target.value })}
                          placeholder="T.ex. 'Specialerbjudande för vår', 'Trogen kund'"
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1E5A7D] text-gray-900"
                          rows={2}
                        />
                      </div>

                      {/* Datum och Status */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Startdatum *</label>
                          <input
                            type="date"
                            value={editedServiceData.date}
                            onChange={(e) => setEditedServiceData({ ...editedServiceData, date: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1E5A7D] text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Status *</label>
                          <select
                            value={editedServiceData.status}
                            onChange={(e) => setEditedServiceData({ ...editedServiceData, status: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1E5A7D] text-gray-900"
                          >
                            {STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Slutdatum */}
                      {isMembershipService(editedServiceData.service) && editedServiceData.status !== 'Aktiv' && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Slutdatum <span className="text-xs text-gray-500">(frivillig)</span>
                          </label>
                          <input
                            type="date"
                            value={editedServiceData.endDate || ''}
                            onChange={(e) => setEditedServiceData({ ...editedServiceData, endDate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1E5A7D] text-gray-900"
                          />
                        </div>
                      )}

                      {/* --- Betalningsinformation (endast för memberships) --- */}
                      {isMembershipService(editedServiceData.service) && (
                        <div className="border-t border-gray-300 pt-4 space-y-4">
                          <h4 className="text-sm font-semibold text-gray-800">Betalningsinformation</h4>

                          {/* Betalningsmetod */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Betalningsmetod
                            </label>
                            <select
                              value={editedServiceData.paymentMethod || 'Faktura'}
                              onChange={(e) => setEditedServiceData({ ...editedServiceData, paymentMethod: e.target.value as any })}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1E5A7D] text-gray-900"
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
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Faktureringsstatus
                            </label>
                            <select
                              value={editedServiceData.invoiceStatus || 'Ej aktuell'}
                              onChange={(e) => setEditedServiceData({ ...editedServiceData, invoiceStatus: e.target.value as any })}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1E5A7D] text-gray-900"
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
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Faktureringsintervall
                              </label>
                              <select
                                value={editedServiceData.billingInterval || 'Månadsvis'}
                                onChange={(e) => setEditedServiceData({ ...editedServiceData, billingInterval: e.target.value as any })}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1E5A7D] text-gray-900"
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
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Antal månader betalda i förskott
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={editedServiceData.numberOfMonths || 1}
                                onChange={(e) => setEditedServiceData({ ...editedServiceData, numberOfMonths: parseInt(e.target.value) || 1 })}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1E5A7D] text-gray-900"
                              />
                            </div>
                          )}

                          {/* Nästa faktureringsdatum */}
                          {(editedServiceData.paymentMethod === 'Autogiro' || editedServiceData.paymentMethod === 'Faktura') && (
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Nästa faktureringsdatum
                              </label>
                              <input
                                type="date"
                                value={editedServiceData.nextInvoiceDate || ''}
                                onChange={(e) => setEditedServiceData({ ...editedServiceData, nextInvoiceDate: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1E5A7D] text-gray-900"
                              />
                            </div>
                          )}

                          {/* Betald till */}
                          {editedServiceData.paymentMethod === 'Förskottsbetalning' && (
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Betald till (datum)
                              </label>
                              <input
                                type="date"
                                value={editedServiceData.paidUntil || ''}
                                onChange={(e) => setEditedServiceData({ ...editedServiceData, paidUntil: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1E5A7D] text-gray-900"
                              />
                            </div>
                          )}

                          {/* Fakturareferens */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Fakturareferens (OCR, fakturanummer etc.)
                            </label>
                            <input
                              type="text"
                              value={editedServiceData.invoiceReference || ''}
                              onChange={(e) => setEditedServiceData({ ...editedServiceData, invoiceReference: e.target.value })}
                              placeholder="T.ex. OCR 123456789"
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1E5A7D] text-gray-900"
                            />
                          </div>

                          {/* Faktureringsnotering */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Faktureringsnotering (frivillig)
                            </label>
                            <textarea
                              value={editedServiceData.invoiceNote || ''}
                              onChange={(e) => setEditedServiceData({ ...editedServiceData, invoiceNote: e.target.value })}
                              placeholder="Övriga noteringar om betalning/fakturering"
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1E5A7D] text-gray-900"
                              rows={2}
                            />
                          </div>
                        </div>
                      )}

                      {/* Knappar */}
                      <div className="flex gap-2 pt-2 border-t border-gray-300">
                        <button
                          onClick={() => handleSaveEdit(entry.id)}
                          className="px-4 py-2 bg-[#1E5A7D] text-white rounded text-sm hover:bg-[#0C3B5C] transition font-medium"
                        >
                          💾 Spara ändringar
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 transition"
                        >
                          Avbryt
                        </button>
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
                          {entry.endDate && (
                            <span className="text-red-600">
                              Slut: {format(new Date(entry.endDate), 'd MMM yyyy', { locale: sv })}
                            </span>
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

                        {/* Betalningsinformation (endast för memberships) */}
                        {isMembershipService(entry.service) && entry.paymentMethod && (
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
                        {serviceHistory.length > 1 && (
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

      {/* Spara/Avbryt knappar */}
      <div className="flex gap-4 mt-6 sticky bottom-0 bg-blue-50 py-4 -mx-8 px-8 border-t border-gray-200">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 bg-[#1E5A7D] text-white rounded-lg hover:bg-[#0C3B5C] transition font-medium shadow-sm"
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

