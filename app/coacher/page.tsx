'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useCustomers } from '@/lib/CustomerContext';
import { getAllCoachesFromCustomers, getCoachFullName, getAllCoachesSync } from '@/lib/coachMapping';
import { getTimeBudget } from '@/lib/timeBudgets';
import { getCoachHourlyRateSync, getCoachProfileSync } from '@/lib/coachProfiles';
import { getTotalAdministrativeHoursForMonthSync, getTotalAdministrativeHoursForPeriodSync } from '@/lib/administrativeHours';
import { seedCoachProfiles } from '@/lib/seedCoachProfiles';
import { subscribeToCoachProfiles } from '@/lib/realtimeDatabase';
import { isMembershipService, isTestService, PLACES } from '@/lib/constants';
import { Customer, ServiceEntry, Place } from '@/types';
import Link from 'next/link';
import { User, Clock, DollarSign, TrendingUp, Users, MapPin, ArrowUpDown, FileText } from 'lucide-react';

type SortOption = 'marginal' | 'intakt' | 'kostnad' | 'medlemskap' | 'timmar' | 'tester';

interface CoachStats {
  coach: string;
  activeMemberships: number;
  totalTests: number;
  totalHours: number;
  monthlyHours: number;
  administrativeHours: number;
  hourlyRate: number;
  monthlyCost: number;
  monthlyRevenue: number;
  margin: number; // Intäkt - Kostnad
}

type ViewMode = 'month' | 'period';

export default function CoacherPage() {
  const { customers } = useCustomers();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedPlaces, setSelectedPlaces] = useState<Place[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('marginal');
  const [coachesFromFirebase, setCoachesFromFirebase] = useState<string[]>([]);

  // Seed coach-profiler vid första laddningen
  useEffect(() => {
    seedCoachProfiles();
  }, []);

  // Prenumerera på coach-profiler från Firebase för att få alla coacher
  useEffect(() => {
    const unsubscribe = subscribeToCoachProfiles((profiles: Record<string, any>) => {
      const coachNames = Object.keys(profiles).sort();
      setCoachesFromFirebase(coachNames);
    });
    return () => unsubscribe();
  }, []);

  // Hämta alla coacher från Firebase (alla coacher som finns i coachProfiles)
  // Använd state för att trigga re-render när coacher uppdateras
  const allCoachesFromFirebase = useMemo(() => {
    // Om state är tom, försök hämta från cache
    return coachesFromFirebase.length > 0 ? coachesFromFirebase : getAllCoachesSync();
  }, [coachesFromFirebase]);

  // Hämta alla unika coacher från kunder (för att säkerställa att även coacher utan profil visas)
  const allCoachesFromCustomers = useMemo(() => {
    return getAllCoachesFromCustomers(customers);
  }, [customers]);

  // Kombinera coacher från Firebase och kunder (ta union för att få alla unika coacher)
  const allCoaches = useMemo(() => {
    const coachesSet = new Set<string>();
    // Lägg till alla coacher från Firebase
    allCoachesFromFirebase.forEach(coach => coachesSet.add(coach));
    // Lägg till alla coacher från kunder (kan innehålla coacher som inte finns i Firebase ännu)
    allCoachesFromCustomers.forEach(coach => coachesSet.add(coach));
    return Array.from(coachesSet).sort();
  }, [allCoachesFromFirebase, allCoachesFromCustomers]);

  // Filtrera coacher baserat på huvudort (endast huvudort, inte sekundär ort)
  const filteredCoaches = useMemo(() => {
    if (selectedPlaces.length === 0) {
      return allCoaches;
    }
    
    return allCoaches.filter((coachFullName) => {
      const profile = getCoachProfileSync(coachFullName);
      if (!profile || !profile.mainPlace) return true; // Om ingen profil finns eller ingen huvudort, visa coachen
      
      const mainPlace = profile.mainPlace;
      
      // Visa coachen endast om huvudort matchar valda platser
      return selectedPlaces.includes(mainPlace as Place);
    });
  }, [allCoaches, selectedPlaces]);

  // Filtrera kunder - visa alla kunder för filtrerade coacher (oavsett kundens plats)
  const filteredCustomers = useMemo(() => {
    if (selectedPlaces.length === 0) {
      return customers;
    }
    
    // Visa alla kunder för coacher som matchar filtret (oavsett var kunden är)
    const coachNames = new Set(filteredCoaches);
    return customers.filter(customer => {
      const coachFullName = getCoachFullName(customer.coach);
      return coachNames.has(coachFullName);
    });
  }, [customers, selectedPlaces, filteredCoaches]);

  // Beräkna statistik per coach
  const coachStats = useMemo(() => {
    const statsMap: Record<string, CoachStats> = {};
    
    // Bestäm datumintervall baserat på visningsläge
    let periodStartDate: Date;
    let periodEndDate: Date;
    
    if (viewMode === 'month') {
      const [year, month] = selectedMonth.split('-').map(Number);
      periodStartDate = new Date(year, month - 1, 1);
      periodEndDate = new Date(year, month, 0, 23, 59, 59);
    } else {
      periodStartDate = new Date(startDate);
      periodStartDate.setHours(0, 0, 0, 0);
      periodEndDate = new Date(endDate);
      periodEndDate.setHours(23, 59, 59, 999);
    }

    // Använd filtrerade coacher istället för coacher från filtrerade kunder
    filteredCoaches.forEach((coachFullName) => {
      const adminHours = viewMode === 'month'
        ? getTotalAdministrativeHoursForMonthSync(coachFullName, periodStartDate.getFullYear(), periodStartDate.getMonth() + 1)
        : getTotalAdministrativeHoursForPeriodSync(coachFullName, periodStartDate, periodEndDate);
      
      statsMap[coachFullName] = {
        coach: coachFullName,
        activeMemberships: 0,
        totalTests: 0,
        totalHours: 0,
        monthlyHours: 0,
        administrativeHours: adminHours,
        hourlyRate: getCoachHourlyRateSync(coachFullName),
        monthlyCost: 0,
        monthlyRevenue: 0,
        margin: 0,
      };
    });

    filteredCustomers.forEach((customer) => {
      const coachFullName = getCoachFullName(customer.coach);
      if (!coachFullName || !statsMap[coachFullName]) return;

      // Räkna aktiva medlemskap
      if (isMembershipService(customer.service) && customer.status === 'Aktiv') {
        const membershipStart = new Date(customer.date);
        membershipStart.setHours(0, 0, 0, 0);
        
        if (membershipStart <= periodEndDate) {
          let membershipEnd: Date | null = null;
          let isActive = customer.status === 'Aktiv';
          
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
            }
          }

          if (isActive || !membershipEnd || membershipEnd >= periodStartDate) {
            statsMap[coachFullName].activeMemberships++;
            const timeBudget = getTimeBudget(customer.service, customer.isSeniorCoach);
            statsMap[coachFullName].monthlyHours += timeBudget;
            
            // Lägg till månadsintäkt för aktivt membership
            // Om membership startade före eller under månaden och är aktivt, räkna en månads intäkt
            const endDateObj = viewMode === 'month' ? periodEndDate : new Date(endDate);
            const startDateObj = viewMode === 'month' ? periodStartDate : new Date(startDate);
            if (membershipStart <= endDateObj && (isActive || !membershipEnd || membershipEnd >= startDateObj)) {
              statsMap[coachFullName].monthlyRevenue += customer.price;
            }
          }
        }
      }

      // Räkna tester under vald månad
      if (isTestService(customer.service)) {
        const serviceDate = new Date(customer.date);
        serviceDate.setHours(0, 0, 0, 0);
        
        if (serviceDate >= periodStartDate && serviceDate <= periodEndDate) {
          statsMap[coachFullName].totalTests++;
          const timeBudget = getTimeBudget(customer.service);
          statsMap[coachFullName].monthlyHours += timeBudget;
          // Lägg till intäkt för test
          statsMap[coachFullName].monthlyRevenue += customer.price;
        }
      }

      // Kolla serviceHistory
      if (customer.serviceHistory) {
        customer.serviceHistory.forEach((serviceEntry: ServiceEntry) => {
          const serviceDate = new Date(serviceEntry.date);
          serviceDate.setHours(0, 0, 0, 0);

          if (isTestService(serviceEntry.service)) {
            // För tester: räkna om de genomfördes under månaden
            if (serviceDate >= periodStartDate && serviceDate <= periodEndDate) {
              statsMap[coachFullName].totalTests++;
              const timeBudget = getTimeBudget(serviceEntry.service);
              statsMap[coachFullName].monthlyHours += timeBudget;
              // Lägg till intäkt för test
              statsMap[coachFullName].monthlyRevenue += serviceEntry.price;
            }
          } else if (isMembershipService(serviceEntry.service)) {
            // För memberships: räkna om de är aktiva under månaden
            const membershipStart = serviceDate;
            const membershipEnd = serviceEntry.endDate ? new Date(serviceEntry.endDate) : null;
            const isActive = serviceEntry.status === 'Aktiv';
            
            // Om membership är aktivt under månaden, lägg till månadsintäkt
            const endDateObj = viewMode === 'month' ? periodEndDate : new Date(endDate);
            const startDateObj = viewMode === 'month' ? periodStartDate : new Date(startDate);
            if (isActive && membershipStart <= endDateObj && (!membershipEnd || membershipEnd >= startDateObj)) {
              statsMap[coachFullName].monthlyRevenue += serviceEntry.price;
            }
          } else {
            // Övriga tjänster
            if (serviceDate >= periodStartDate && serviceDate <= periodEndDate) {
              const timeBudget = getTimeBudget(serviceEntry.service);
              statsMap[coachFullName].monthlyHours += timeBudget;
            }
          }
        });
      }
    });

    // Beräkna total kostnad och marginal (inkludera administrativa timmar)
    const ADMINISTRATIVE_HOURLY_RATE = 200; // Administrativa timmar kostar 200 kr/h
    Object.values(statsMap).forEach((stat) => {
      // Uppdatera administrativa timmar för perioden
      stat.administrativeHours = viewMode === 'month'
        ? getTotalAdministrativeHoursForMonthSync(stat.coach, periodStartDate.getFullYear(), periodStartDate.getMonth() + 1)
        : getTotalAdministrativeHoursForPeriodSync(stat.coach, periodStartDate, periodEndDate);
      
      // Total kostnad = (medlemskap/tester timmar * coachens timlön) + (administrativa timmar * 200 kr/h)
      const regularHoursCost = stat.monthlyHours * stat.hourlyRate;
      const administrativeHoursCost = stat.administrativeHours * ADMINISTRATIVE_HOURLY_RATE;
      stat.monthlyCost = regularHoursCost + administrativeHoursCost;
      stat.margin = stat.monthlyRevenue - stat.monthlyCost;
    });

    // Sortera baserat på valt alternativ
    const sortedStats = Object.values(statsMap);
    switch (sortBy) {
      case 'marginal':
        sortedStats.sort((a, b) => b.margin - a.margin);
        break;
      case 'intakt':
        sortedStats.sort((a, b) => b.monthlyRevenue - a.monthlyRevenue);
        break;
      case 'kostnad':
        sortedStats.sort((a, b) => b.monthlyCost - a.monthlyCost);
        break;
      case 'medlemskap':
        sortedStats.sort((a, b) => b.activeMemberships - a.activeMemberships);
        break;
      case 'timmar':
        sortedStats.sort((a, b) => b.monthlyHours - a.monthlyHours);
        break;
      case 'tester':
        sortedStats.sort((a, b) => b.totalTests - a.totalTests);
        break;
      default:
        sortedStats.sort((a, b) => b.activeMemberships - a.activeMemberships || b.monthlyHours - a.monthlyHours);
    }

    return sortedStats;
  }, [filteredCustomers, filteredCoaches, selectedMonth, startDate, endDate, viewMode, sortBy]);

  const togglePlace = (place: Place) => {
    setSelectedPlaces(prev => 
      prev.includes(place) 
        ? prev.filter(p => p !== place)
        : [...prev, place]
    );
  };

  const [showAddCoachModal, setShowAddCoachModal] = useState(false);
  const [newCoachName, setNewCoachName] = useState('');
  const [newCoachHourlyRate, setNewCoachHourlyRate] = useState(375);
  const [newCoachMainPlace, setNewCoachMainPlace] = useState<Place | ''>('');
  const [newCoachSecondaryPlace, setNewCoachSecondaryPlace] = useState<Place | ''>('');
  const [newCoachIsSenior, setNewCoachIsSenior] = useState(false);
  const [addingCoach, setAddingCoach] = useState(false);

  const handleAddCoach = async () => {
    if (!newCoachName.trim()) {
      alert('Ange ett coach-namn');
      return;
    }

    setAddingCoach(true);
    try {
      const { saveCoachProfile } = await import('@/lib/coachProfiles');
      const profile = {
        name: newCoachName.trim(),
        hourlyRate: newCoachHourlyRate,
        isSeniorCoach: newCoachIsSenior,
        mainPlace: newCoachMainPlace || undefined,
        secondaryPlace: newCoachSecondaryPlace || undefined,
      };
      await saveCoachProfile(profile);
      setShowAddCoachModal(false);
      setNewCoachName('');
      setNewCoachHourlyRate(375);
      setNewCoachMainPlace('');
      setNewCoachSecondaryPlace('');
      setNewCoachIsSenior(false);
      alert('Coach tillagd!');
    } catch (error: any) {
      console.error('Error adding coach:', error);
      alert(`Kunde inte lägga till coach: ${error.message}`);
    } finally {
      setAddingCoach(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Coacher</h1>
          <p className="text-gray-600 mt-1">Översikt över alla coacher och deras statistik</p>
        </div>
        <button
          onClick={() => setShowAddCoachModal(true)}
          className="px-4 py-2 bg-[#1E5A7D] text-white rounded-lg hover:bg-[#164a66] flex items-center gap-2"
        >
          <User className="w-4 h-4" />
          Lägg till coach
        </button>
      </div>

      {/* Filter */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Visningsläge
          </label>
          <select
            value={viewMode}
            onChange={(e) => {
              setViewMode(e.target.value as ViewMode);
              if (e.target.value === 'month') {
                // Återställ till aktuell månad när man växlar tillbaka
                const now = new Date();
                setSelectedMonth(now.toISOString().slice(0, 7));
              } else {
                // Sätt standardperiod när man växlar till period
                const now = new Date();
                const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                setStartDate(firstOfMonth.toISOString().split('T')[0]);
                setEndDate(now.toISOString().split('T')[0]);
              }
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
          >
            <option value="month">Månad</option>
            <option value="period">Period</option>
          </select>
        </div>

        {viewMode === 'month' ? (
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
        ) : (
          <>
            <div className="bg-white rounded-lg shadow p-6">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Från datum
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
              />
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Till datum
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
              />
            </div>
          </>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            <MapPin className="w-4 h-4 inline mr-1" />
            Filtrera på stad/ort
          </label>
          <div className="flex flex-wrap gap-2">
            {PLACES.map((place) => (
              <button
                key={place}
                onClick={() => togglePlace(place)}
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
                Rensa filter
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            <ArrowUpDown className="w-4 h-4 inline mr-1" />
            Sortera efter
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
          >
            <option value="marginal">Bäst marginal</option>
            <option value="intakt">Störst intäkt</option>
            <option value="kostnad">Störst kostnad</option>
            <option value="medlemskap">Flest medlemskap</option>
            <option value="tester">Flest tester</option>
            <option value="timmar">Mest timmar</option>
          </select>
        </div>
      </div>

      {/* Coach-grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {coachStats.map((stat) => (
          <Link
            key={stat.coach}
            href={`/coacher/${encodeURIComponent(stat.coach)}`}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#1E5A7D] rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {stat.coach.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">{stat.coach}</h3>
                    {getCoachProfileSync(stat.coach)?.isSeniorCoach && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                        Senior
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {stat.hourlyRate} kr/h
                  </p>
                  {(() => {
                    const profile = getCoachProfileSync(stat.coach);
                    const places = [];
                    if (profile?.mainPlace) places.push(profile.mainPlace);
                    if (profile?.secondaryPlace) places.push(profile.secondaryPlace);
                    return places.length > 0 ? (
                      <p className="text-xs text-gray-400 mt-1">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        {places.join(', ')}
                      </p>
                    ) : null;
                  })()}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">Aktiva medlemskap</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {stat.activeMemberships}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">Tester ({viewMode === 'month' ? selectedMonth : `${startDate} - ${endDate}`})</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {stat.totalTests}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Timmar ({viewMode === 'month' ? selectedMonth : `${startDate} - ${endDate}`})</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {stat.monthlyHours.toFixed(2)}
                </span>
              </div>

              {stat.administrativeHours > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600">
                    <FileText className="w-4 h-4 text-purple-600" />
                    <span className="text-sm">Administrativt ({viewMode === 'month' ? selectedMonth : `${startDate} - ${endDate}`})</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {stat.administrativeHours.toFixed(2)} h
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <div className="flex items-center gap-2 text-gray-600">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Intäkt ({viewMode === 'month' ? selectedMonth : `${startDate} - ${endDate}`})</span>
                </div>
                <span className="text-sm font-bold text-green-600">
                  {stat.monthlyRevenue.toLocaleString('sv-SE', {
                    style: 'currency',
                    currency: 'SEK',
                    minimumFractionDigits: 0,
                  })}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm font-medium">Kostnad ({viewMode === 'month' ? selectedMonth : `${startDate} - ${endDate}`})</span>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {stat.monthlyCost.toLocaleString('sv-SE', {
                    style: 'currency',
                    currency: 'SEK',
                    minimumFractionDigits: 0,
                  })}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">Marginal</span>
                </div>
                <span className={`text-sm font-bold ${
                  stat.margin >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.margin.toLocaleString('sv-SE', {
                    style: 'currency',
                    currency: 'SEK',
                    minimumFractionDigits: 0,
                  })}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {coachStats.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Inga coacher hittades</p>
        </div>
      )}

      {/* Add Coach Modal */}
      {showAddCoachModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Lägg till ny coach</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Namn *
                </label>
                <input
                  type="text"
                  value={newCoachName}
                  onChange={(e) => setNewCoachName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                  placeholder="T.ex. Erik Helsing"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Timlön (kr/h)
                </label>
                <input
                  type="number"
                  value={newCoachHourlyRate}
                  onChange={(e) => setNewCoachHourlyRate(parseFloat(e.target.value) || 375)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                  min="0"
                  step="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Huvudort
                </label>
                <select
                  value={newCoachMainPlace}
                  onChange={(e) => setNewCoachMainPlace(e.target.value as Place | '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                >
                  <option value="">Välj ort</option>
                  {PLACES.map(place => (
                    <option key={place} value={place}>{place}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Sekundär ort
                </label>
                <select
                  value={newCoachSecondaryPlace}
                  onChange={(e) => setNewCoachSecondaryPlace(e.target.value as Place | '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                >
                  <option value="">Välj ort</option>
                  {PLACES.map(place => (
                    <option key={place} value={place}>{place}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isSenior"
                  checked={newCoachIsSenior}
                  onChange={(e) => setNewCoachIsSenior(e.target.checked)}
                  className="w-4 h-4 text-[#1E5A7D] border-gray-300 rounded focus:ring-[#1E5A7D]"
                />
                <label htmlFor="isSenior" className="ml-2 text-sm text-gray-900">
                  Senior coach
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddCoach}
                disabled={addingCoach || !newCoachName.trim()}
                className="flex-1 px-4 py-2 bg-[#1E5A7D] text-white rounded-lg hover:bg-[#164a66] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingCoach ? 'Lägger till...' : 'Lägg till'}
              </button>
              <button
                onClick={() => {
                  setShowAddCoachModal(false);
                  setNewCoachName('');
                  setNewCoachHourlyRate(375);
                  setNewCoachMainPlace('');
                  setNewCoachSecondaryPlace('');
                  setNewCoachIsSenior(false);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300"
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

