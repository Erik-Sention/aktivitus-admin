'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useCustomers } from '@/lib/CustomerContext';
import { getTimeBudget, isMembershipTimeBudget } from '@/lib/timeBudgets';
import { isMembershipService, isTestService, PLACES, PAYMENT_STATUSES } from '@/lib/constants';
import { getCoachFullName } from '@/lib/coachMapping';
import { getCoachHourlyRateSync } from '@/lib/coachProfiles';
import { getTotalAdministrativeHoursForMonthSync } from '@/lib/administrativeHours';
import { getAllPaymentStatuses, subscribeToPaymentStatuses, updatePaymentStatus } from '@/lib/realtimeDatabase';
import { Customer, ServiceEntry, Place, PaymentStatus } from '@/types';
import { DollarSign, Clock, Users, TrendingUp, MapPin, FileCheck, CheckCircle, CheckSquare, Square, FileText } from 'lucide-react';
import Link from 'next/link';

interface CoachHours {
  coach: string;
  membershipHours: number;
  testHours: number;
  otherHours: number;
  administrativeHours: number;
  totalHours: number;
  hourlyRate: number;
  totalCost: number;
  paymentStatus: PaymentStatus;
}

export default function PersonalekonomiPage() {
  const { customers } = useCustomers();
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [selectedPlaces, setSelectedPlaces] = useState<Place[]>([]);
  const [selectedPaymentStatuses, setSelectedPaymentStatuses] = useState<PaymentStatus[]>([]);
  const [selectedCoaches, setSelectedCoaches] = useState<Set<string>>(new Set());
  
  // Spara utbetalningsstatusar per coach och månad - nu från Firebase
  const [paymentStatuses, setPaymentStatuses] = useState<Record<string, PaymentStatus>>({});

  // Ladda utbetalningsstatusar från Firebase
  useEffect(() => {
    const loadPaymentStatuses = async () => {
      try {
        const statuses = await getAllPaymentStatuses();
        setPaymentStatuses(statuses);
      } catch (error) {
        console.error('Error loading payment statuses:', error);
      }
    };

    loadPaymentStatuses();

    // Prenumerera på realtidsuppdateringar
    const unsubscribe = subscribeToPaymentStatuses((updatedStatuses) => {
      setPaymentStatuses(updatedStatuses);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Filtrera kunder baserat på ort och faktureringsstatus
  const filteredCustomers = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    return customers.filter((customer) => {
      // Filtrera på ort
      if (selectedPlaces.length > 0 && !selectedPlaces.includes(customer.place)) {
        return false;
      }

      // Filtrera på utbetalningsstatus - kolla om coachen har vald status för denna månad
      if (selectedPaymentStatuses.length > 0) {
        // Kolla coachens utbetalningsstatus för denna månad
        const coachFullName = getCoachFullName(customer.coach);
        const statusKey = `${coachFullName}_${selectedMonth}`;
        const coachPaymentStatus = paymentStatuses[statusKey] || 'Väntar på fullständig faktureringsinfo';
        
        if (!selectedPaymentStatuses.includes(coachPaymentStatus)) {
          return false;
        }
      }

      return true;
    });
  }, [customers, selectedPlaces, selectedPaymentStatuses, selectedMonth, paymentStatuses]);

  // Beräkna timmar per coach
  const coachHours = useMemo(() => {
    const hoursMap: Record<string, CoachHours> = {};
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    filteredCustomers.forEach((customer) => {
      const coachInitials = customer.coach;
      if (!coachInitials) return;

      const coachFullName = getCoachFullName(coachInitials);

      // Initiera coach om den inte finns
      if (!hoursMap[coachFullName]) {
        const statusKey = `${coachFullName}_${selectedMonth}`;
        const defaultStatus = paymentStatuses[statusKey] || 'Väntar på fullständig faktureringsinfo';
        
        const adminHours = getTotalAdministrativeHoursForMonthSync(coachFullName, year, month);
        
        hoursMap[coachFullName] = {
          coach: coachFullName,
          membershipHours: 0,
          testHours: 0,
          otherHours: 0,
          administrativeHours: adminHours,
          totalHours: adminHours,
          hourlyRate: getCoachHourlyRateSync(coachFullName),
          totalCost: 0,
          paymentStatus: defaultStatus,
        };
      }

      // Hantera medlemskap (månadsvis tidsbudget)
      if (isMembershipService(customer.service)) {
        // Kolla om medlemskapet är aktivt under vald månad
        const membershipStart = new Date(customer.date);
        membershipStart.setHours(0, 0, 0, 0);
        
        // Om medlemskapet startade innan eller under vald månad
        if (membershipStart <= endDate) {
          // Kolla om medlemskapet är aktivt eller avslutades efter vald månad
          let membershipEnd: Date | null = null;
          let isActive = customer.status === 'Aktiv';
          
          // Kolla serviceHistory för mer exakt information
          if (customer.serviceHistory && customer.serviceHistory.length > 0) {
            const activeService = customer.serviceHistory.find(
              (s: ServiceEntry) => s.status === 'Aktiv' && s.service === customer.service
            );
            if (activeService) {
              isActive = activeService.status === 'Aktiv';
              if (activeService.endDate) {
                membershipEnd = new Date(activeService.endDate);
                membershipEnd.setHours(23, 59, 59, 999);
              }
            } else {
              // Om ingen aktiv service finns, kolla om någon avslutades efter vald månad
              const endedService = customer.serviceHistory
                .filter((s: ServiceEntry) => s.service === customer.service)
                .sort((a: ServiceEntry, b: ServiceEntry) => 
                  new Date(b.date).getTime() - new Date(a.date).getTime()
                )[0];
              if (endedService?.endDate) {
                membershipEnd = new Date(endedService.endDate);
                membershipEnd.setHours(23, 59, 59, 999);
                isActive = false;
              }
            }
          }

          // Om medlemskapet är aktivt eller avslutades efter vald månad
          if (isActive || !membershipEnd || membershipEnd >= startDate) {
            const timeBudget = getTimeBudget(customer.service, customer.isSeniorCoach);
            hoursMap[coachFullName].membershipHours += timeBudget;
          }
        }
      }

      // Hantera tester och andra tjänster (engångstidsbudget)
      if (isTestService(customer.service) || (!isMembershipService(customer.service) && !customer.service.includes('Membership'))) {
        const serviceDate = new Date(customer.date);
        serviceDate.setHours(0, 0, 0, 0);
        
        // Om tjänsten genomfördes under vald månad
        if (serviceDate >= startDate && serviceDate <= endDate) {
          const timeBudget = getTimeBudget(customer.service);
          
          if (isTestService(customer.service)) {
            hoursMap[coachFullName].testHours += timeBudget;
          } else {
            hoursMap[coachFullName].otherHours += timeBudget;
          }
        }
      }

      // Hantera serviceHistory för tester och andra tjänster
      if (customer.serviceHistory) {
        customer.serviceHistory.forEach((serviceEntry: ServiceEntry) => {
          const serviceDate = new Date(serviceEntry.date);
          serviceDate.setHours(0, 0, 0, 0);

          // Om tjänsten genomfördes under vald månad
          if (serviceDate >= startDate && serviceDate <= endDate) {
            const timeBudget = getTimeBudget(serviceEntry.service);
            
            if (isTestService(serviceEntry.service)) {
              hoursMap[coachFullName].testHours += timeBudget;
            } else if (!isMembershipService(serviceEntry.service)) {
              hoursMap[coachFullName].otherHours += timeBudget;
            }
          }
        });
      }
    });

    // Beräkna total timmar och kostnad för varje coach och ladda utbetalningsstatus
    const ADMINISTRATIVE_HOURLY_RATE = 200; // Administrativa timmar kostar 200 kr/h
    Object.values(hoursMap).forEach((coachData) => {
      // Uppdatera administrativa timmar för denna månad
      const [year, month] = selectedMonth.split('-').map(Number);
      coachData.administrativeHours = getTotalAdministrativeHoursForMonthSync(coachData.coach, year, month);
      
      coachData.totalHours = coachData.membershipHours + coachData.testHours + coachData.otherHours + coachData.administrativeHours;
      
      // Kostnad = (vanliga timmar * coachens timlön) + (administrativa timmar * 200 kr/h)
      const regularHours = coachData.membershipHours + coachData.testHours + coachData.otherHours;
      const regularHoursCost = regularHours * coachData.hourlyRate;
      const administrativeHoursCost = coachData.administrativeHours * ADMINISTRATIVE_HOURLY_RATE;
      coachData.totalCost = regularHoursCost + administrativeHoursCost;
      
      // Ladda utbetalningsstatus från state
      const statusKey = `${coachData.coach}_${selectedMonth}`;
      if (paymentStatuses[statusKey]) {
        coachData.paymentStatus = paymentStatuses[statusKey];
      } else {
        // Standardstatus om ingen finns
        coachData.paymentStatus = 'Väntar på fullständig faktureringsinfo';
      }
    });

    return Object.values(hoursMap).sort((a, b) => b.totalHours - a.totalHours);
  }, [filteredCustomers, selectedMonth, paymentStatuses]);

  // Totalt antal timmar och kostnad
  const totals = useMemo(() => {
    return coachHours.reduce(
      (acc, coach) => ({
        totalHours: acc.totalHours + coach.totalHours,
        totalCost: acc.totalCost + coach.totalCost,
        membershipHours: acc.membershipHours + coach.membershipHours,
        testHours: acc.testHours + coach.testHours,
        otherHours: acc.otherHours + coach.otherHours,
        administrativeHours: acc.administrativeHours + coach.administrativeHours,
      }),
      {
        totalHours: 0,
        totalCost: 0,
        membershipHours: 0,
        testHours: 0,
        otherHours: 0,
        administrativeHours: 0,
      }
    );
  }, [coachHours]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Personalekonomi</h1>
          <p className="text-gray-600 mt-1">Översikt över timmar och kostnader per coach</p>
          {(selectedPlaces.length > 0 || selectedPaymentStatuses.length > 0) && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-500">Aktiva filter:</span>
              {selectedPlaces.length > 0 && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                  {selectedPlaces.length} ort{selectedPlaces.length > 1 ? 'er' : ''}
                </span>
              )}
              {selectedPaymentStatuses.length > 0 && (
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
                  {selectedPaymentStatuses.length} utbetalningsstatus{selectedPaymentStatuses.length > 1 ? 'ar' : ''}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Månadsval */}
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Välj månad
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
          />
        </div>

        {/* Ort-filter */}
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            <MapPin className="w-4 h-4 inline mr-1" />
            Filtrera på stad/ort
          </label>
          <div className="flex flex-wrap gap-2">
            {PLACES.map((place) => (
              <button
                key={place}
                onClick={() => {
                  if (selectedPlaces.includes(place)) {
                    setSelectedPlaces(selectedPlaces.filter(p => p !== place));
                  } else {
                    setSelectedPlaces([...selectedPlaces, place]);
                  }
                }}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                  selectedPlaces.includes(place)
                    ? 'bg-[#1E5A7D] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {place}
              </button>
            ))}
            {selectedPlaces.length > 0 && (
              <button
                onClick={() => setSelectedPlaces([])}
                className="px-3 py-1 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
              >
                Rensa
              </button>
            )}
          </div>
        </div>

        {/* Utbetalningsstatus-filter */}
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            <FileCheck className="w-4 h-4 inline mr-1" />
            Utbetalningsstatus
          </label>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_STATUSES.map((status) => (
              <button
                key={status}
                onClick={() => {
                  if (selectedPaymentStatuses.includes(status)) {
                    setSelectedPaymentStatuses(selectedPaymentStatuses.filter(s => s !== status));
                  } else {
                    setSelectedPaymentStatuses([...selectedPaymentStatuses, status]);
                  }
                }}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                  selectedPaymentStatuses.includes(status)
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
            {selectedPaymentStatuses.length > 0 && (
              <button
                onClick={() => setSelectedPaymentStatuses([])}
                className="px-3 py-1 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
              >
                Rensa
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Totalt kort */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Totalt antal timmar</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {totals.totalHours.toFixed(2)}
              </p>
            </div>
            <Clock className="w-8 h-8 text-[#1E5A7D]" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total kostnad</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {totals.totalCost.toLocaleString('sv-SE', {
                  style: 'currency',
                  currency: 'SEK',
                  minimumFractionDigits: 0,
                })}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Medlemskap timmar</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {totals.membershipHours.toFixed(2)}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tester timmar</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {totals.testHours.toFixed(2)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Administrativa timmar</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {totals.administrativeHours.toFixed(2)}
              </p>
            </div>
            <FileText className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Bulk-åtgärder */}
      {selectedCoaches.size > 0 && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-semibold text-blue-900">
                {selectedCoaches.size} coach{selectedCoaches.size > 1 ? 'er' : ''} markerad{selectedCoaches.size > 1 ? 'e' : ''}
              </span>
            </div>
            <button
              onClick={() => setSelectedCoaches(new Set())}
              className="text-sm text-blue-700 hover:text-blue-900 font-medium underline"
            >
              Avmarkera alla
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-blue-900">Ändra status för alla markerade:</span>
            {PAYMENT_STATUSES.map((status) => (
              <button
                key={status}
                onClick={async () => {
                  const newStatuses = { ...paymentStatuses };
                  const updates: Promise<void>[] = [];
                  
                  selectedCoaches.forEach((coachName) => {
                    const statusKey = `${coachName}_${selectedMonth}`;
                    newStatuses[statusKey] = status;
                    updates.push(updatePaymentStatus(statusKey, status));
                  });
                  
                  setPaymentStatuses(newStatuses);
                  
                  // Spara alla till Firebase
                  try {
                    await Promise.all(updates);
                  } catch (error) {
                    console.error('Error saving payment statuses:', error);
                    alert('Kunde inte spara utbetalningsstatusar. Försök igen.');
                  }
                  
                  setSelectedCoaches(new Set()); // Rensa markeringar efter ändring
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition hover:opacity-90 ${
                  status === 'Betald'
                    ? 'bg-green-600 text-white'
                    : status === 'Väntar på fullständig faktureringsinfo'
                    ? 'bg-yellow-500 text-white'
                    : status === 'Väntar på utbetalning'
                    ? 'bg-blue-600 text-white'
                    : status === 'Delvis betald'
                    ? 'bg-orange-600 text-white'
                    : status === 'Avbruten'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-600 text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Coach-tabell */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Timmar och kostnader per coach</h2>
          {coachHours.length > 0 && (
            <button
              onClick={() => {
                if (selectedCoaches.size === coachHours.length) {
                  setSelectedCoaches(new Set());
                } else {
                  setSelectedCoaches(new Set(coachHours.map(c => c.coach)));
                }
              }}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium flex items-center gap-2"
            >
              {selectedCoaches.size === coachHours.length ? (
                <>
                  <CheckSquare className="w-4 h-4" />
                  Avmarkera alla
                </>
              ) : (
                <>
                  <Square className="w-4 h-4" />
                  Markera alla
                </>
              )}
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    checked={coachHours.length > 0 && selectedCoaches.size === coachHours.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCoaches(new Set(coachHours.map(c => c.coach)));
                      } else {
                        setSelectedCoaches(new Set());
                      }
                    }}
                    className="w-4 h-4 text-[#1E5A7D] border-gray-300 rounded focus:ring-[#1E5A7D] cursor-pointer"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Coach
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Timlön (kr/h)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Medlemskap (h)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Tester (h)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Övrigt (h)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Administrativt (h)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Totalt (h)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Kostnad (kr)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Utbetalningsstatus
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {coachHours.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-4 text-center text-gray-500">
                    Inga timmar registrerade för vald månad
                  </td>
                </tr>
              ) : (
                coachHours.map((coach) => (
                  <tr 
                    key={coach.coach} 
                    className={`hover:bg-gray-50 ${selectedCoaches.has(coach.coach) ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedCoaches.has(coach.coach)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedCoaches);
                          if (e.target.checked) {
                            newSelected.add(coach.coach);
                          } else {
                            newSelected.delete(coach.coach);
                          }
                          setSelectedCoaches(newSelected);
                        }}
                        className="w-4 h-4 text-[#1E5A7D] border-gray-300 rounded focus:ring-[#1E5A7D] cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link 
                        href={`/coacher/${encodeURIComponent(coach.coach)}`}
                        className="text-sm font-medium text-[#1E5A7D] hover:text-[#0C3B5C] hover:underline"
                      >
                        {coach.coach}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">
                        {coach.hourlyRate} kr/h
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {coach.membershipHours.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {coach.testHours.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {coach.otherHours.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {coach.administrativeHours.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                      {coach.totalHours.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                      {coach.totalCost.toLocaleString('sv-SE', {
                        style: 'currency',
                        currency: 'SEK',
                        minimumFractionDigits: 0,
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="relative group">
                        <button
                          className={`px-3 py-1 text-xs font-medium rounded transition ${
                            coach.paymentStatus === 'Betald'
                              ? 'bg-green-100 text-green-800'
                              : coach.paymentStatus === 'Väntar på fullständig faktureringsinfo'
                              ? 'bg-yellow-100 text-yellow-800'
                              : coach.paymentStatus === 'Väntar på utbetalning'
                              ? 'bg-blue-100 text-blue-800'
                              : coach.paymentStatus === 'Delvis betald'
                              ? 'bg-orange-100 text-orange-800'
                              : coach.paymentStatus === 'Avbruten'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {coach.paymentStatus} ▾
                        </button>
                        <div className="absolute left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                          <div className="py-1">
                            {PAYMENT_STATUSES.map((status) => {
                              if (status === coach.paymentStatus) return null;
                              
                              return (
                                <button
                                  key={status}
                                  onClick={async () => {
                                    const statusKey = `${coach.coach}_${selectedMonth}`;
                                    const newStatuses = {
                                      ...paymentStatuses,
                                      [statusKey]: status,
                                    };
                                    setPaymentStatuses(newStatuses);
                                    
                                    // Spara till Firebase
                                    try {
                                      await updatePaymentStatus(statusKey, status);
                                    } catch (error) {
                                      console.error('Error saving payment status:', error);
                                      alert('Kunde inte spara utbetalningsstatus. Försök igen.');
                                    }
                                  }}
                                  className={`w-full text-left px-4 py-2 text-xs hover:bg-gray-50 flex items-center gap-2 ${
                                    status === 'Ej aktuell' ? 'text-red-600 font-medium' : 'text-gray-700'
                                  }`}
                                >
                                  <span className={`px-2 py-0.5 text-xs rounded ${
                                    status === 'Betald'
                                      ? 'bg-green-100 text-green-800'
                                      : status === 'Väntar på fullständig faktureringsinfo'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : status === 'Väntar på utbetalning'
                                      ? 'bg-blue-100 text-blue-800'
                                      : status === 'Delvis betald'
                                      ? 'bg-orange-100 text-orange-800'
                                      : status === 'Avbruten'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {status}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              {coachHours.length > 0 && (
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-6 py-4 whitespace-nowrap"></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Totalt</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {totals.membershipHours.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {totals.testHours.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {totals.otherHours.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {totals.administrativeHours.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {totals.totalHours.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {totals.totalCost.toLocaleString('sv-SE', {
                      style: 'currency',
                      currency: 'SEK',
                      minimumFractionDigits: 0,
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

