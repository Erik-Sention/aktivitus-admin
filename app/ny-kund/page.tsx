'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { FormData } from '@/types';
import { PLACES, SPORTS, MEMBERSHIPS, TESTS, SERVICES, STATUSES, PAYMENT_METHODS, INVOICE_STATUSES, BILLING_INTERVALS, calculatePrice, isTestService, isMembershipService, getTestType } from '@/lib/constants';
import CoachAutocomplete from '@/components/CoachAutocomplete';
import { getCoachProfileSync } from '@/lib/coachProfiles';
import { getAllServicesAndPrices, subscribeToServicesAndPrices, ServicePrice } from '@/lib/realtimeDatabase';
import { Save, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCustomers } from '@/lib/CustomerContext';
import { endOfMonth, addMonths } from 'date-fns';

// Hjälpfunktion för att beräkna slutet av månaden från ett datum
const getEndOfMonth = (date: Date | string): Date => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return endOfMonth(d);
};

// Hjälpfunktion för att beräkna slutet av nästa månad
const getEndOfNextMonth = (date: Date | string): Date => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return endOfMonth(addMonths(d, 1));
};

export default function NewCustomerPage() {
  const router = useRouter();
  const [services, setServices] = useState<ServicePrice[]>([]);
  const { addCustomer } = useCustomers();
  const suggestedPrice = calculatePrice('Membership Standard', 'Löpning', false);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    date: new Date().toISOString().split('T')[0],
    place: 'Stockholm',
    coach: '',
    service: 'Membership Standard',
    status: 'Aktiv',
    price: '',
    sport: 'Ingen',
  });

  const [paymentData, setPaymentData] = useState<{
    paymentMethod: string;
    invoiceStatus: string;
    billingInterval: string;
    numberOfMonths: number;
    nextInvoiceDate: string;
    paidUntil: string;
    invoiceReference: string;
    invoiceNote: string;
  }>({
    paymentMethod: 'Faktura',
    invoiceStatus: 'Väntar på betalning',
    billingInterval: 'Månadsvis',
    numberOfMonths: 1,
    nextInvoiceDate: '',
    paidUntil: '',
    invoiceReference: '',
    invoiceNote: '',
  });


  const [priceData, setPriceData] = useState({
    originalPrice: suggestedPrice,
    discount: 0,
    finalPrice: suggestedPrice,
    priceNote: '',
    usePercentage: true,
  });

  const priceDeviationReasons = [
    '',
    'Presentkort',
    'Tävling',
    'Trogen kund',
    'Benify',
    'Kampanj',
    'Hålla kvar kunden',
    'Studentrabatt',
    'Företagsrabatt',
    'Paketpris',
    'Annat',
  ];

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [showSuccess, setShowSuccess] = useState(false);

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

  const handleServiceChange = (selectedService: string) => {
    // Hämta senior-status från coach-profilen
    const coachProfile = formData.coach ? getCoachProfileSync(formData.coach) : null;
    const isSeniorCoach = coachProfile?.isSeniorCoach || false;
    
    // ALLTID använd pris från Firebase - INGEN fallback till hårdkodade priser
    let suggestedPrice = 0;
    const serviceFromFirebase = services.find(s => s.service === selectedService);
    
    if (serviceFromFirebase) {
      // Tjänsten finns i Firebase - använd dess pris direkt
      suggestedPrice = serviceFromFirebase.basePrice;
      console.log(`✅ Hittade tjänst i Firebase: ${selectedService}, pris: ${suggestedPrice} kr`);
    } else {
      // Om tjänsten inte finns i Firebase, visa 0 och varna
      console.warn(`⚠️ Tjänst ${selectedService} hittades inte i Firebase. Lägg till den i databasen först.`);
      suggestedPrice = 0;
    }
    
    const autoStatus = isTestService(selectedService) ? 'Genomförd' : 'Aktiv';
    
    setFormData({ ...formData, service: selectedService as any, status: autoStatus as any });
    setPriceData({
      ...priceData,
      originalPrice: suggestedPrice,
      finalPrice: suggestedPrice,
      discount: 0,
    });
    
    console.log(`💰 Satt pris för ${selectedService}: ${suggestedPrice} kr`);
  };

  const handleSportChange = (selectedSport: string) => {
    // ALLTID använd pris från Firebase - INGEN fallback till hårdkodade priser
    let suggestedPrice = 0;
    const serviceFromFirebase = services.find(s => s.service === formData.service);
    
    if (serviceFromFirebase) {
      // Tjänsten finns i Firebase - använd dess pris direkt
      suggestedPrice = serviceFromFirebase.basePrice;
    } else {
      // Om tjänsten inte finns i Firebase, visa 0
      suggestedPrice = 0;
    }
    
    setFormData({ ...formData, sport: selectedSport as any });
    setPriceData({
      ...priceData,
      originalPrice: suggestedPrice,
      finalPrice: suggestedPrice,
      discount: 0,
    });
  };
  
  const handleCoachChange = (coachName: string) => {
    // ALLTID använd pris från Firebase - INGEN fallback till hårdkodade priser
    let suggestedPrice = 0;
    const serviceFromFirebase = services.find(s => s.service === formData.service);
    
    if (serviceFromFirebase) {
      // Tjänsten finns i Firebase - använd dess pris direkt
      suggestedPrice = serviceFromFirebase.basePrice;
    } else {
      // Om tjänsten inte finns i Firebase, visa 0
      suggestedPrice = 0;
    }
    
    setFormData({ ...formData, coach: coachName });
    setPriceData({
      ...priceData,
      originalPrice: suggestedPrice,
      finalPrice: suggestedPrice,
      discount: 0,
    });
  };

  const handleDiscountChange = (value: number) => {
    if (priceData.usePercentage) {
      const discountAmount = (priceData.originalPrice * value) / 100;
      const finalPrice = Math.round(priceData.originalPrice - discountAmount);
      setPriceData({
        ...priceData,
        discount: value,
        finalPrice: finalPrice,
      });
    } else {
      setPriceData({
        ...priceData,
        discount: value,
      });
    }
  };

  const handleManualPriceChange = (value: number) => {
    const discount = priceData.originalPrice - value;
    const discountPercent = Math.round((discount / priceData.originalPrice) * 100);
    
    setPriceData({
      ...priceData,
      finalPrice: value,
      discount: priceData.usePercentage ? discountPercent : discount,
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Namn är obligatoriskt';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-post är obligatorisk';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Ogiltig e-postadress';
    }

    if (!formData.coach.trim()) {
      newErrors.coach = 'Coach är obligatoriskt';
    }

    if (!priceData.finalPrice || priceData.finalPrice <= 0) {
      newErrors.price = 'Pris måste vara större än 0';
    }

    // Kräv anledning om det finns rabatt eller om slutpriset är lägre än originalpriset
    const hasDiscount = priceData.finalPrice < priceData.originalPrice || priceData.discount > 0;
    if (hasDiscount && !priceData.priceNote.trim()) {
      newErrors.price = 'Anledning till prisavvikelse är obligatorisk när pris är rabatterat';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      try {
        // Spara kunden till Firebase med serviceHistory inkl betalningsinfo
        // För aktiva tjänster ska endDate inte sättas (tjänsten är pågående)
        const serviceEntry = {
          id: `service_${Date.now()}`,
          service: formData.service,
          price: priceData.finalPrice,
          originalPrice: priceData.originalPrice,
          discount: priceData.discount !== 0 ? priceData.discount : undefined,
          priceNote: priceData.priceNote || undefined,
          date: new Date(formData.date),
          status: formData.status,
          // endDate sätts bara för inaktiva/pausade/genomförda tjänster
          endDate: formData.status !== 'Aktiv' ? new Date(formData.date) : undefined,
          sport: formData.sport,
          coach: formData.coach,
          coachHistory: formData.coach ? [{ coach: formData.coach, date: new Date(formData.date) }] : undefined,
          // Betalningsinformation per tjänst
          paymentMethod: paymentData.paymentMethod as any,
          invoiceStatus: paymentData.invoiceStatus as any,
          billingInterval: paymentData.billingInterval as any,
          numberOfMonths: paymentData.numberOfMonths || undefined,
          // För månadsvis fakturering: sätt nästa faktureringsdatum till slutet av månaden om inte användaren har angett ett datum
          nextInvoiceDate: paymentData.nextInvoiceDate 
            ? new Date(paymentData.nextInvoiceDate) 
            : (paymentData.billingInterval === 'Månadsvis' ? getEndOfMonth(formData.date) : undefined),
          paidUntil: paymentData.paidUntil ? new Date(paymentData.paidUntil) : undefined,
          invoiceReference: paymentData.invoiceReference || undefined,
          invoiceNote: paymentData.invoiceNote || undefined,
        };

        await addCustomer({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          date: new Date(formData.date),
          place: formData.place,
          coach: formData.coach,
          service: formData.service,
          status: formData.status,
          price: priceData.finalPrice,
          sport: formData.sport,
          serviceHistory: [serviceEntry],
        });

        setShowSuccess(true);

        // Navigera till kundlistan efter 1.5 sekunder
        setTimeout(() => {
          setShowSuccess(false);
          router.push('/kunder');
        }, 1500);
      } catch (error: any) {
        console.error('Fel vid sparande av kund:', error);
        // Visa felmeddelande till användaren
        alert(`Kunde inte spara kund: ${error.message || 'Okänt fel'}\n\nKontrollera browser console för mer information.`);
        alert('Kunde inte spara kund. Kontrollera Firebase-konfigurationen.');
      }
    }
  };

  const handleCancel = () => {
    router.push('/kunder');
  };

  const allServices = SERVICES;

  return (
    <div>
      <Header
        title="Lägg till ny kund"
        subtitle="Fyll i kundens uppgifter nedan"
      />

      {showSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <span className="text-lg">✓</span>
          <span className="font-medium">Kunden har sparats!</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100 max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rad 1: Datum, Namn, E-post */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Datum
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Namn <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ange kundens namn"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                E-post <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="exempel@email.se"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Rad 2: Telefonnummer, Plats, Coach */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Telefonnummer
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                placeholder="070-123 45 67"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Plats
              </label>
              <select
                value={formData.place}
                onChange={(e) => setFormData({ ...formData, place: e.target.value as any })}
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
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Coach <span className="text-red-500">*</span>
              </label>
              <CoachAutocomplete
                value={formData.coach}
                onChange={handleCoachChange}
                placeholder="Ange coach-namn"
                error={!!errors.coach}
              />
              {errors.coach && (
                <p className="mt-1 text-sm text-red-600">{errors.coach}</p>
              )}
              {formData.coach && (() => {
                const coachProfile = getCoachProfileSync(formData.coach);
                if (coachProfile?.isSeniorCoach) {
                  return (
                    <p className="mt-2 text-sm text-blue-600">
                      ✓ Senior Coach (priset justeras automatiskt +500 kr)
                    </p>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          {/* Rad 3: Membership/Test, Gren, Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Membership/Test
              </label>
              <select
                value={formData.service}
                onChange={(e) => handleServiceChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
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
                Gren
              </label>
              <select
                value={formData.sport}
                onChange={(e) => handleSportChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
              >
                {SPORTS.map((sport) => (
                  <option key={sport} value={sport}>
                    {sport}
                  </option>
                ))}
              </select>
              {formData.sport && formData.sport !== 'Ingen' && getTestType(formData.service, formData.sport) && (
                <p className="mt-2 text-xs text-gray-600">
                  <span className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-800 font-medium">
                    {getTestType(formData.service, formData.sport)}
                  </span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Status
                {isTestService(formData.service) && (
                  <span className="ml-2 text-xs text-gray-500">(Auto: Genomförd för tester)</span>
                )}
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
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

          {/* Rad 5: Pris med rabatt */}
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-900">
                Avtalspris <span className="text-red-500">*</span>
              </label>
              <span className="text-sm font-semibold text-gray-900">
                Föreslagt: {priceData.originalPrice} kr
                <span className="text-xs text-gray-500 ml-1">
                  {isMembershipService(formData.service) ? '/mån' : '(engång)'}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  checked={priceData.usePercentage}
                  onChange={() => setPriceData({ ...priceData, usePercentage: true, discount: 0, finalPrice: priceData.originalPrice })}
                  className="text-[#1E5A7D]"
                />
                % Rabatt
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  checked={!priceData.usePercentage}
                  onChange={() => setPriceData({ ...priceData, usePercentage: false, discount: 0, finalPrice: priceData.originalPrice })}
                  className="text-[#1E5A7D]"
                />
                Manuellt pris
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {priceData.usePercentage ? (
                <>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Rabatt (%)</label>
                    <input
                      type="number"
                      value={priceData.discount}
                      onChange={(e) => handleDiscountChange(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                      placeholder="0"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Slutpris (kr)</label>
                    <input
                      type="number"
                      value={priceData.finalPrice}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-900 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Anledning till prisavvikelse
                      {(priceData.finalPrice < priceData.originalPrice || priceData.discount > 0) && (
                        <span className="text-red-500"> *</span>
                      )}
                      {!(priceData.finalPrice < priceData.originalPrice || priceData.discount > 0) && (
                        <span className="text-xs text-gray-500"> (frivillig)</span>
                      )}
                    </label>
                    <select
                      value={priceData.priceNote}
                      onChange={(e) => setPriceData({ ...priceData, priceNote: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 ${
                        errors.price && (priceData.finalPrice < priceData.originalPrice || priceData.discount > 0) && !priceData.priceNote ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      {priceDeviationReasons.map((reason) => (
                        <option key={reason} value={reason}>
                          {reason || 'Välj anledning...'}
                        </option>
                      ))}
                    </select>
                    {errors.price && (priceData.finalPrice < priceData.originalPrice || priceData.discount > 0) && !priceData.priceNote && (
                      <p className="mt-1 text-sm text-red-600">{errors.price}</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Slutpris (kr)</label>
                    <input
                      type="number"
                      value={priceData.finalPrice}
                      onChange={(e) => handleManualPriceChange(parseFloat(e.target.value) || 0)}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 font-semibold ${
                        errors.price && !(priceData.finalPrice < priceData.originalPrice && !priceData.priceNote) ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Skillnad</label>
                    <input
                      type="text"
                      value={`${priceData.originalPrice - priceData.finalPrice} kr`}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Anledning till prisavvikelse
                      {(priceData.finalPrice < priceData.originalPrice || priceData.discount > 0) && (
                        <span className="text-red-500"> *</span>
                      )}
                      {!(priceData.finalPrice < priceData.originalPrice || priceData.discount > 0) && (
                        <span className="text-xs text-gray-500"> (frivillig)</span>
                      )}
                    </label>
                    <select
                      value={priceData.priceNote}
                      onChange={(e) => setPriceData({ ...priceData, priceNote: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 ${
                        errors.price && (priceData.finalPrice < priceData.originalPrice || priceData.discount > 0) && !priceData.priceNote ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      {priceDeviationReasons.map((reason) => (
                        <option key={reason} value={reason}>
                          {reason || 'Välj anledning...'}
                        </option>
                      ))}
                    </select>
                    {errors.price && (priceData.finalPrice < priceData.originalPrice || priceData.discount > 0) && !priceData.priceNote && (
                      <p className="mt-1 text-sm text-red-600">{errors.price}</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {errors.price && (
              <p className="mt-2 text-sm text-red-600">{errors.price}</p>
            )}
          </div>

          {/* Betalningsinformation för denna tjänst */}
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h3 className="text-md font-semibold text-gray-900 mb-4">Betalningsinformation för denna tjänst</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Betalningsmetod
                </label>
                <select
                  value={paymentData.paymentMethod}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Faktureringsstatus
                </label>
                <select
                  value={paymentData.invoiceStatus}
                  onChange={(e) => setPaymentData({ ...paymentData, invoiceStatus: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                >
                  {INVOICE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              {isMembershipService(formData.service) && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Faktureringsintervall
                  </label>
                  <select
                    value={paymentData.billingInterval}
                    onChange={(e) => setPaymentData({ ...paymentData, billingInterval: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                  >
                    {BILLING_INTERVALS.filter(interval => interval !== 'Engångsbetalning').map((interval) => (
                      <option key={interval} value={interval}>
                        {interval}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {isMembershipService(formData.service) && (paymentData.paymentMethod === 'Förskottsbetalning' || paymentData.billingInterval !== 'Månadsvis') && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Antal månader <span className="text-xs text-gray-500">(avtalslängd/förskottsbet.)</span>
                  </label>
                  <input
                    type="number"
                    value={paymentData.numberOfMonths}
                    onChange={(e) => setPaymentData({ ...paymentData, numberOfMonths: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                    min="1"
                    max="36"
                  />
                </div>
              )}

              {isMembershipService(formData.service) && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Nästa faktureringsdatum
                  </label>
                  <input
                    type="date"
                    value={paymentData.nextInvoiceDate}
                    onChange={(e) => setPaymentData({ ...paymentData, nextInvoiceDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                  />
                </div>
              )}

              {isMembershipService(formData.service) && paymentData.paymentMethod === 'Förskottsbetalning' && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Betald till (datum)
                  </label>
                  <input
                    type="date"
                    value={paymentData.paidUntil}
                    onChange={(e) => setPaymentData({ ...paymentData, paidUntil: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Fakturareferens <span className="text-xs text-gray-500">(OCR, fakturanr etc.)</span>
                </label>
                <input
                  type="text"
                  value={paymentData.invoiceReference}
                  onChange={(e) => setPaymentData({ ...paymentData, invoiceReference: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                  placeholder="T.ex. OCR-nummer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Faktureringsnotering
                </label>
                <input
                  type="text"
                  value={paymentData.invoiceNote}
                  onChange={(e) => setPaymentData({ ...paymentData, invoiceNote: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                  placeholder="T.ex. Särskilda instruktioner"
                />
              </div>
            </div>
          </div>

          {/* Knappar */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 bg-[#1E5A7D] text-white rounded-lg hover:bg-[#0C3B5C] transition font-medium shadow-sm"
            >
              <Save className="w-5 h-5" />
              Spara kund
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
            >
              <X className="w-5 h-5" />
              Avbryt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

