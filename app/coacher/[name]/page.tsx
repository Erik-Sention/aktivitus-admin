'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useCustomers } from '@/lib/CustomerContext';
import { getCoachFullName, getCoachInitials } from '@/lib/coachMapping';
import { getTimeBudget } from '@/lib/timeBudgets';
import { isMembershipService, isTestService, PLACES } from '@/lib/constants';
import { getCoachHourlyRateSync, getCoachHourlyRate, getCoachProfileSync, getCoachProfile, saveCoachProfile, CoachProfile } from '@/lib/coachProfiles';
import { getTotalAdministrativeHoursForMonthSync, getAdministrativeHoursForMonthSync } from '@/lib/administrativeHours';
import { getUserRoleSync } from '@/lib/auth';
import { Customer, ServiceEntry } from '@/types';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, User, Clock, DollarSign, Users, TrendingUp, Calendar, MapPin, Phone, Mail, Home, CreditCard, UserCircle, Edit2, Save, X, ChevronDown, ChevronUp, Building2, FileText } from 'lucide-react';

interface CoachService {
  id: string;
  customerName: string;
  customerId: string;
  service: string;
  date: Date;
  status: string;
  price: number;
  sport?: string;
  hours: number;
  type: 'membership' | 'test' | 'other';
}

export default function CoachDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { customers } = useCustomers();
  const coachName = decodeURIComponent(params.name as string);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  // Hämta inloggad användares roll
  const [currentUserRole, setCurrentUserRole] = useState<string>('coach');
  const canEditRole = currentUserRole === 'admin' || currentUserRole === 'superuser';

  // Ladda coach-profil
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState<CoachProfile | null>(null);
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);
  
  // Ladda användarens roll
  useEffect(() => {
    const loadUserRole = async () => {
      const role = await import('@/lib/auth').then(m => m.getUserRole());
      if (process.env.NODE_ENV === 'development') {
        console.log('🔐 Inloggad användares roll:', role);
        console.log('✏️ Kan redigera roll:', role === 'admin' || role === 'superuser');
      }
      setCurrentUserRole(role);
    };
    loadUserRole();
  }, []);
  
  useEffect(() => {
    const loadProfile = async () => {
      // Försök hämta från cache först (synkron)
      let coachProfile = getCoachProfileSync(coachName);
      
      // Om inte i cache, hämta från Firebase
      if (!coachProfile) {
        coachProfile = await getCoachProfile(coachName);
      }
      
      if (coachProfile) {
        setProfile(coachProfile);
        setEditedProfile(coachProfile);
      } else {
        // Skapa grundprofil om den inte finns
        const [firstName, ...rest] = coachName.split(' ');
        const lastName = rest.join(' ') || '';

        const defaultProfile: CoachProfile = {
          firstName: firstName || coachName,
          lastName,
          name: coachName,
          hourlyRate: getCoachHourlyRateSync(coachName),
        };

        setProfile(defaultProfile);
        setEditedProfile(defaultProfile);
      }
    };
    
    loadProfile();
  }, [coachName]);

  const hourlyRate = profile?.hourlyRate || getCoachHourlyRateSync(coachName);

  const handleSaveProfile = async () => {
    if (editedProfile) {
      try {
        await saveCoachProfile(editedProfile);
        
        // Om rollen har ändrats, uppdatera userProfile i databasen
        if (editedProfile.role && editedProfile.role !== profile?.role) {
          if (process.env.NODE_ENV === 'development') {
            // Uppdaterar roll i databasen
          }
          
          // Hitta coachens email från profilen
          const coachEmail = editedProfile.email;
          
          if (coachEmail) {
            try {
              // Importera updateUserProfile från userProfile (skapar profil om den inte finns)
              const { updateUserProfile } = await import('@/lib/userProfile');
              await updateUserProfile(coachEmail, { 
                role: editedProfile.role,
                displayName: editedProfile.name
              });
              if (process.env.NODE_ENV === 'development') {
                // Roll uppdaterad i databasen
              }
              alert(`Roll uppdaterad! ${editedProfile.name} har nu rollen "${editedProfile.role}".`);
            } catch (error) {
              if (process.env.NODE_ENV === 'development') {
                console.error('❌ Fel vid uppdatering av roll:', error);
              }
              alert('Varning: Profilen sparades men rollen kunde inte uppdateras i användarregistret.');
            }
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.warn('⚠️ Ingen email hittades för coachen. Rollen kunde inte uppdateras i userProfiles.');
            }
            alert('Varning: Lägg till en e-postadress för att rollen ska kunna synkas till användarens konto.');
          }
        }
        
        setProfile(editedProfile);
        setIsEditingProfile(false);
      } catch (error) {
        console.error('Error saving profile:', error);
        alert('Kunde inte spara profil. Försök igen.');
      }
    }
  };

  const handleCancelEdit = () => {
    setEditedProfile(profile);
    setIsEditingProfile(false);
  };

  // Filtrera kunder för denna coach
  const coachCustomers = useMemo(() => {
    const coachInitials = getCoachInitials(coachName);
    return customers.filter(
      (customer) => 
        customer.coach === coachName || 
        customer.coach === coachInitials ||
        getCoachFullName(customer.coach) === coachName
    );
  }, [customers, coachName]);

  // Beräkna statistik och tjänster
  const { stats, services, monthlyStats, administrativeHours } = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    // Hämta administrativa timmar för denna månad (synkron från cache)
    const adminHours = getAdministrativeHoursForMonthSync(coachName, year, month);

    let activeMemberships = 0;
    let totalTests = 0;
    let totalHours = 0;
    let monthlyHours = 0;
    const servicesList: CoachService[] = [];

    coachCustomers.forEach((customer) => {
      // Hantera medlemskap
      if (isMembershipService(customer.service)) {
        const membershipStart = new Date(customer.date);
        membershipStart.setHours(0, 0, 0, 0);
        
        if (membershipStart <= endDate) {
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

          // Lägg till medlemskap om det är aktivt under vald månad
          if (isActive || !membershipEnd || membershipEnd >= startDate) {
            if (customer.status === 'Aktiv') {
              activeMemberships++;
            }
            const timeBudget = getTimeBudget(customer.service, customer.isSeniorCoach);
            totalHours += timeBudget;
            monthlyHours += timeBudget;

            // Lägg till i tabellen om medlemskapet är aktivt under vald månad
            // (visa alla aktiva medlemskap, även om de startade tidigare)
            servicesList.push({
              id: customer.id,
              customerName: customer.name,
              customerId: customer.id,
              service: customer.service,
              date: customer.date,
              status: customer.status,
              price: customer.price,
              sport: customer.sport,
              hours: timeBudget,
              type: 'membership',
            });
          }
        }
      }

      // Hantera tester och andra tjänster
      if (isTestService(customer.service) || (!isMembershipService(customer.service) && !customer.service.includes('Membership'))) {
        const serviceDate = new Date(customer.date);
        serviceDate.setHours(0, 0, 0, 0);
        
        if (serviceDate >= startDate && serviceDate <= endDate) {
          const timeBudget = getTimeBudget(customer.service);
          monthlyHours += timeBudget;
          totalTests++;

          servicesList.push({
            id: customer.id,
            customerName: customer.name,
            customerId: customer.id,
            service: customer.service,
            date: customer.date,
            status: customer.status,
            price: customer.price,
            sport: customer.sport,
            hours: timeBudget,
            type: isTestService(customer.service) ? 'test' : 'other',
          });
        }
      }

      // Kolla serviceHistory - bara för tester och andra tjänster som inte är medlemskap
      // (medlemskap hanteras ovan och räknas månadsvis)
      if (customer.serviceHistory) {
        customer.serviceHistory.forEach((serviceEntry: ServiceEntry) => {
          // Hoppa över medlemskap i serviceHistory eftersom de redan hanterats ovan
          if (isMembershipService(serviceEntry.service)) {
            return;
          }

          const serviceDate = new Date(serviceEntry.date);
          serviceDate.setHours(0, 0, 0, 0);

          // Bara lägg till om tjänsten genomfördes under vald månad
          if (serviceDate >= startDate && serviceDate <= endDate) {
            // Kontrollera om denna tjänst redan har lagts till från huvudtjänsten
            const alreadyAdded = customer.service === serviceEntry.service &&
                                 new Date(customer.date).getTime() === serviceDate.getTime();

            if (!alreadyAdded) {
              const timeBudget = getTimeBudget(serviceEntry.service);
              monthlyHours += timeBudget;

              if (isTestService(serviceEntry.service)) {
                totalTests++;
              }

              // Lägg till i listan om det inte redan finns
              const exists = servicesList.some(
                s => s.customerId === customer.id && 
                     s.service === serviceEntry.service &&
                     s.date.getTime() === serviceDate.getTime()
              );

              if (!exists) {
                servicesList.push({
                  id: `${customer.id}_${serviceEntry.id}`,
                  customerName: customer.name,
                  customerId: customer.id,
                  service: serviceEntry.service,
                  date: serviceEntry.date,
                  status: serviceEntry.status,
                  price: serviceEntry.price,
                  sport: serviceEntry.sport,
                  hours: timeBudget,
                  type: isTestService(serviceEntry.service) ? 'test' : 'other',
                });
              }
            }
          }
        });
      }
    });

    // Beräkna totala administrativa timmar
    const ADMINISTRATIVE_HOURLY_RATE = 200; // Administrativa timmar kostar 200 kr/h
    const totalAdminHours = adminHours.reduce((sum, h) => sum + h.hours, 0);
    const totalHoursWithAdmin = monthlyHours + totalAdminHours;
    
    // Kostnad = (vanliga timmar * coachens timlön) + (administrativa timmar * 200 kr/h)
    const regularHoursCost = monthlyHours * hourlyRate;
    const administrativeHoursCost = totalAdminHours * ADMINISTRATIVE_HOURLY_RATE;
    const totalCost = regularHoursCost + administrativeHoursCost;

    return {
      stats: {
        activeMemberships,
        totalTests,
        totalHours,
      },
      monthlyStats: {
        hours: monthlyHours,
        administrativeHours: totalAdminHours,
        totalHours: totalHoursWithAdmin,
        cost: totalCost,
        tests: totalTests,
      },
      services: servicesList.sort((a, b) => b.date.getTime() - a.date.getTime()),
      administrativeHours: adminHours.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    };
  }, [coachCustomers, selectedMonth, hourlyRate, coachName]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/coacher"
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{coachName}</h1>
            <p className="text-gray-600 mt-1">Detaljerad översikt över coach och tjänster</p>
          </div>
        </div>
      </div>

      {/* Coach-profil och utbetalningsinformation */}
      <div className="bg-white rounded-lg shadow">
        <div
          onClick={() => setIsProfileExpanded(!isProfileExpanded)}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900">Coach-profil och utbetalningsinformation</h2>
            <Link
              href="/profil"
              onClick={(e) => e.stopPropagation()}
              className="text-sm text-[#1E5A7D] hover:text-[#0C3B5C] hover:underline"
            >
              (redigera användarinfo)
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {!isEditingProfile && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingProfile(true);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#1E5A7D] hover:text-[#0C3B5C] hover:bg-blue-50 rounded-lg transition"
              >
                <Edit2 className="w-4 h-4" />
                Redigera
              </button>
            )}
            {isProfileExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </div>
        </div>

        {isProfileExpanded && (
          <div className="px-6 pb-6 border-t border-gray-200">
            {isEditingProfile && (
              <div className="flex items-center justify-end gap-2 mt-4 mb-4">
                <button
                  onClick={handleSaveProfile}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#1E5A7D] hover:bg-[#0C3B5C] rounded-lg transition"
                >
                  <Save className="w-4 h-4" />
                  Spara
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                  Avbryt
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Timlön */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Timlön (kr/h)
            </label>
            {isEditingProfile ? (
              <input
                type="number"
                min="365"
                max="385"
                value={editedProfile?.hourlyRate || 375}
                onChange={(e) => {
                  const rate = parseInt(e.target.value) || 375;
                  setEditedProfile({ ...editedProfile!, hourlyRate: rate });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E5A7D]"
              />
            ) : (
              <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900 font-medium">
                {hourlyRate} kr/h
              </div>
            )}
          </div>

          {/* Roll - endast redigerbart för admin och superuser */}
          {canEditRole && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Roll
              </label>
              {isEditingProfile ? (
                <div>
                  <select
                    value={editedProfile?.role || 'coach'}
                    onChange={(e) => {
                      setEditedProfile({ ...editedProfile!, role: e.target.value as any });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E5A7D]"
                  >
                    <option value="coach">Coach</option>
                    <option value="platschef">Platschef</option>
                    <option value="admin">Admin</option>
                    <option value="superuser">Superuser</option>
                  </select>
                  {!editedProfile?.email && (
                    <p className="mt-1 text-xs text-orange-600">
                      ⚠️ Lägg till en e-postadress för att rollen ska synkas till användarens konto
                    </p>
                  )}
                </div>
              ) : (
                <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                  {profile?.role === 'superuser' && 'Superuser'}
                  {profile?.role === 'admin' && 'Admin'}
                  {profile?.role === 'platschef' && 'Platschef'}
                  {profile?.role === 'coach' && 'Coach'}
                  {!profile?.role && 'Coach'}
                </div>
              )}
            </div>
          )}

          {/* Senior Coach */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Senior Coach
            </label>
            {isEditingProfile ? (
              <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={editedProfile?.isSeniorCoach || false}
                  onChange={(e) => {
                    setEditedProfile({ ...editedProfile!, isSeniorCoach: e.target.checked });
                  }}
                  className="w-4 h-4 text-[#1E5A7D] border-gray-300 rounded focus:ring-[#1E5A7D]"
                />
                <span className="text-sm text-gray-900">Ja, detta är en senior coach</span>
              </label>
            ) : (
              <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                {profile?.isSeniorCoach ? 'Ja' : 'Nej'}
              </div>
            )}
          </div>

          {/* Huvudort */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              <Building2 className="w-4 h-4 inline mr-1" />
              Huvudort
            </label>
            {isEditingProfile ? (
              <select
                value={editedProfile?.mainPlace || ''}
                onChange={(e) => {
                  setEditedProfile({ ...editedProfile!, mainPlace: e.target.value });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E5A7D]"
              >
                <option value="">Välj huvudort</option>
                {PLACES.map((place) => (
                  <option key={place} value={place}>
                    {place}
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                {profile?.mainPlace || '-'}
              </div>
            )}
          </div>

          {/* Sekundär ort */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              <Building2 className="w-4 h-4 inline mr-1" />
              Sekundär ort
            </label>
            {isEditingProfile ? (
              <select
                value={editedProfile?.secondaryPlace || ''}
                onChange={(e) => {
                  setEditedProfile({ ...editedProfile!, secondaryPlace: e.target.value });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E5A7D]"
              >
                <option value="">Ingen sekundär ort</option>
                {PLACES.filter(place => place !== editedProfile?.mainPlace).map((place) => (
                  <option key={place} value={place}>
                    {place}
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                {profile?.secondaryPlace || '-'}
              </div>
            )}
          </div>

          {/* Personnummer */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Personnummer
            </label>
            {isEditingProfile ? (
              <input
                type="text"
                value={editedProfile?.personalNumber || ''}
                onChange={(e) => {
                  setEditedProfile({ ...editedProfile!, personalNumber: e.target.value });
                }}
                placeholder="YYYYMMDD-XXXX"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E5A7D]"
              />
            ) : (
              <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                {profile?.personalNumber || '-'}
              </div>
            )}
          </div>

          {/* Adress */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              <Home className="w-4 h-4 inline mr-1" />
              Adress
            </label>
            {isEditingProfile ? (
              <input
                type="text"
                value={editedProfile?.address || ''}
                onChange={(e) => {
                  setEditedProfile({ ...editedProfile!, address: e.target.value });
                }}
                placeholder="Gatuadress, Postnummer Ort"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E5A7D]"
              />
            ) : (
              <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                {profile?.address || '-'}
              </div>
            )}
          </div>

          {/* Telefon */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              <Phone className="w-4 h-4 inline mr-1" />
              Telefonnummer
            </label>
            {isEditingProfile ? (
              <input
                type="tel"
                value={editedProfile?.phone || ''}
                onChange={(e) => {
                  setEditedProfile({ ...editedProfile!, phone: e.target.value });
                }}
                placeholder="070-123 45 67"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E5A7D]"
              />
            ) : (
              <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                {profile?.phone || '-'}
              </div>
            )}
          </div>

          {/* E-post */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              E-post
            </label>
            {isEditingProfile ? (
              <input
                type="email"
                value={editedProfile?.email || ''}
                onChange={(e) => {
                  setEditedProfile({ ...editedProfile!, email: e.target.value });
                }}
                placeholder="coach@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E5A7D]"
              />
            ) : (
              <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                {profile?.email || '-'}
              </div>
            )}
          </div>

          {/* Skattetabell */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Skattetabell
            </label>
            {isEditingProfile ? (
              <input
                type="text"
                value={editedProfile?.taxTable || ''}
                onChange={(e) => {
                  setEditedProfile({ ...editedProfile!, taxTable: e.target.value });
                }}
                placeholder="t.ex. 30, 32, 34"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E5A7D]"
              />
            ) : (
              <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                {profile?.taxTable || '-'}
              </div>
            )}
          </div>

          {/* Bankkontonummer */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              <CreditCard className="w-4 h-4 inline mr-1" />
              Bankkontonummer
            </label>
            {isEditingProfile ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editedProfile?.clearingNumber || ''}
                  onChange={(e) => {
                    setEditedProfile({ ...editedProfile!, clearingNumber: e.target.value });
                  }}
                  placeholder="Clearingnummer (4 siffror)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E5A7D]"
                />
                <input
                  type="text"
                  value={editedProfile?.accountNumber || ''}
                  onChange={(e) => {
                    setEditedProfile({ ...editedProfile!, accountNumber: e.target.value });
                  }}
                  placeholder="Kontonummer"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E5A7D]"
                />
              </div>
            ) : (
              <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                {profile?.clearingNumber && profile?.accountNumber 
                  ? `${profile.clearingNumber}-${profile.accountNumber}`
                  : profile?.bankAccount || '-'}
              </div>
            )}
          </div>

          {/* Banknamn */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Banknamn
            </label>
            {isEditingProfile ? (
              <input
                type="text"
                value={editedProfile?.bankName || ''}
                onChange={(e) => {
                  setEditedProfile({ ...editedProfile!, bankName: e.target.value });
                }}
                placeholder="t.ex. Swedbank, SEB, Nordea"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E5A7D]"
              />
            ) : (
              <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                {profile?.bankName || '-'}
              </div>
            )}
          </div>

          {/* Swish */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Swish-nummer
            </label>
            {isEditingProfile ? (
              <input
                type="tel"
                value={editedProfile?.swishNumber || ''}
                onChange={(e) => {
                  setEditedProfile({ ...editedProfile!, swishNumber: e.target.value });
                }}
                placeholder="070-123 45 67"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E5A7D]"
              />
            ) : (
              <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                {profile?.swishNumber || '-'}
              </div>
            )}
          </div>

          {/* Närmaste anhörig */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              <UserCircle className="w-4 h-4 inline mr-1" />
              Närmaste anhörig
            </label>
            {isEditingProfile ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={editedProfile?.emergencyContact?.name || ''}
                  onChange={(e) => {
                    setEditedProfile({
                      ...editedProfile!,
                      emergencyContact: {
                        name: e.target.value,
                        phone: editedProfile?.emergencyContact?.phone || '',
                        relation: editedProfile?.emergencyContact?.relation || '',
                      },
                    });
                  }}
                  placeholder="Namn"
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E5A7D]"
                />
                <input
                  type="tel"
                  value={editedProfile?.emergencyContact?.phone || ''}
                  onChange={(e) => {
                    setEditedProfile({
                      ...editedProfile!,
                      emergencyContact: {
                        name: editedProfile?.emergencyContact?.name || '',
                        phone: e.target.value,
                        relation: editedProfile?.emergencyContact?.relation || '',
                      },
                    });
                  }}
                  placeholder="Telefonnummer"
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E5A7D]"
                />
                <input
                  type="text"
                  value={editedProfile?.emergencyContact?.relation || ''}
                  onChange={(e) => {
                    setEditedProfile({
                      ...editedProfile!,
                      emergencyContact: {
                        name: editedProfile?.emergencyContact?.name || '',
                        phone: editedProfile?.emergencyContact?.phone || '',
                        relation: e.target.value,
                      },
                    });
                  }}
                  placeholder="Relation (t.ex. Make, Fru, Förälder)"
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E5A7D]"
                />
              </div>
            ) : (
              <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900">
                {profile?.emergencyContact 
                  ? `${profile.emergencyContact.name} (${profile.emergencyContact.relation}) - ${profile.emergencyContact.phone}`
                  : '-'}
              </div>
            )}
          </div>

          {/* Anteckningar */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Anteckningar
            </label>
            {isEditingProfile ? (
              <textarea
                value={editedProfile?.notes || ''}
                onChange={(e) => {
                  setEditedProfile({ ...editedProfile!, notes: e.target.value });
                }}
                placeholder="Lägg till eventuella anteckningar..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1E5A7D]"
              />
            ) : (
              <div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900 whitespace-pre-wrap">
                {profile?.notes || '-'}
              </div>
            )}
          </div>
            </div>
          </div>
        )}
      </div>

      {/* Månadsval */}
      <div className="bg-white rounded-lg shadow p-6">
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Välj månad
        </label>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
        />
      </div>

      {/* Statistik-kort */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Aktiva medlemskap</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.activeMemberships}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tester ({selectedMonth})</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {monthlyStats.tests}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Timmar ({selectedMonth})</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {monthlyStats.hours.toFixed(2)}
              </p>
            </div>
            <Clock className="w-8 h-8 text-[#1E5A7D]" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Bruttolön ({selectedMonth})</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {monthlyStats.cost.toLocaleString('sv-SE', {
                  style: 'currency',
                  currency: 'SEK',
                  minimumFractionDigits: 0,
                })}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Tjänster-tabell */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Tjänster för {selectedMonth}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Kund
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Tjänst
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Datum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Timmar
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Pris
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {services.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Inga tjänster registrerade för vald månad
                  </td>
                </tr>
              ) : (
                services.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/kunder/${service.customerId}`}
                        className="text-sm font-medium text-[#1E5A7D] hover:text-[#0C3B5C] hover:underline"
                      >
                        {service.customerName}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{service.service}</div>
                      {service.sport && (
                        <div className="text-xs text-gray-500">{service.sport}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {service.date.toLocaleDateString('sv-SE')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        service.status === 'Aktiv' ? 'bg-green-100 text-green-800' :
                        service.status === 'Genomförd' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {service.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {service.hours.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {service.price.toLocaleString('sv-SE', {
                        style: 'currency',
                        currency: 'SEK',
                        minimumFractionDigits: 0,
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Administrativa timmar-tabell */}
      {administrativeHours.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Administrativa timmar för {selectedMonth}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Datum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Kategori
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Beskrivning
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Timmar
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {administrativeHours.map((hour) => (
                  <tr key={hour.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(hour.date).toLocaleDateString('sv-SE')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                        {hour.category || 'Annat'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {hour.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                      {hour.hours.toFixed(2)} h
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={3} className="px-6 py-4 text-right text-sm text-gray-900">
                    Totalt:
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                    {monthlyStats.administrativeHours.toFixed(2)} h
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

