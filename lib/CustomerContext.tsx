'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Customer, DashboardStats } from '@/types';
import { isMembershipService } from './constants';
import { logCustomerCreate, logCustomerUpdate, logCustomerDelete } from './activityLogger';
import { getAllCustomers, subscribeToCustomers } from './realtimeDatabase';

// Mock customers - empty by default, will be populated from Firebase
// mockData.ts is in .gitignore and won't be available in production builds
// In production, customers will be loaded from Firebase instead
const mockCustomers: Customer[] = [];

interface CustomerContextType {
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'history'>) => void;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  getStats: (places?: string[], services?: string[], startDate?: string, endDate?: string) => DashboardStats;
  getCrossTable: (places: string[], services: string[]) => { place: string; [service: string]: number | string }[];
  getCrossTrendData: (places: string[], services: string[], startDate?: string, endDate?: string) => any[];
  getMonthlyTestTrend: (places?: string[], services?: string[], startDate?: string, endDate?: string) => any[];
  getActiveMembershipDistribution: (places?: string[]) => { name: string; value: number }[];
  getServiceDistribution: (places?: string[], startDate?: string, endDate?: string) => { name: string; value: number }[];
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Ladda kunder från Firebase Realtime Database eller mockdata vid första renderingen
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        // Försök ladda från Firebase först
        const firebaseCustomers = await getAllCustomers();
        if (firebaseCustomers.length > 0) {
          setCustomers(firebaseCustomers);
        } else if (mockCustomers.length > 0) {
          // Fallback till mockdata om Firebase är tomt
          setCustomers(mockCustomers);
        }
      } catch (error) {
        // Om Firebase inte är konfigurerat eller misslyckas, använd mockdata
        console.warn('Kunde inte ladda från Firebase, använder mockdata:', error);
        if (mockCustomers.length > 0) {
          setCustomers(mockCustomers);
        }
      }
    };
    
    loadCustomers();
    
    // Prenumerera på realtidsuppdateringar
    const unsubscribe = subscribeToCustomers((customers) => {
      if (customers.length > 0) {
        setCustomers(customers);
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  const addCustomer = (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'history'>) => {
    const newCustomer: Customer = {
      ...customerData,
      id: `customer_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      history: [],
    };
    setCustomers((prev) => [newCustomer, ...prev]);
    // Logga skapande av kund
    logCustomerCreate(newCustomer.id, newCustomer.name);
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers((prev) => {
      const customer = prev.find(c => c.id === id);
      if (customer) {
        // Logga uppdatering av kund
        const changedFields = Object.keys(updates).join(', ');
        logCustomerUpdate(id, customer.name, changedFields);
      }
      return prev.map((customer) =>
        customer.id === id
          ? { ...customer, ...updates, updatedAt: new Date() }
          : customer
      );
    });
  };

  const deleteCustomer = (id: string) => {
    setCustomers((prev) => prev.filter((customer) => customer.id !== id));
  };

  const getStats = (places?: string[], services?: string[], startDate?: string, endDate?: string): DashboardStats => {
    // Lista över alla testtjänster
    const testServices = [
      'Tröskeltest',
      'Tröskeltest + VO2max',
      'Tröskeltest Triathlon',
      'Tröskeltest Triathlon + VO2max',
      'VO2max fristående',
      'VO2max tillägg',
      'Wingate fristående',
      'Wingatetest tillägg',
      'Styrketest tillägg',
      'Teknikanalys tillägg',
      'Teknikanalys',
      'Funktionsanalys',
      'Funktions- och löpteknikanalys',
      'Hälsopaket',
      'Sommardubbel',
      'Sommardubbel Tri',
      'Träningsprogram Sommardubbel 1500kr',
      'Personlig Träning 1 - Betald yta',
      'Personlig Träning 1 - Gratis yta',
      'Personlig Träning 5',
      'Personlig Träning 10',
      'Personlig Träning 20',
      'PT-Klipp - Betald yta',
      'PT-Klipp - Gratis yta',
      'Konvertering från test till PT20 - Till kollega',
      'Sen avbokning',
      'Genomgång eller testdel utförd av någon annan - Minus 30 min tid',
      'Genomgång eller testdel utförd till någon annan - Plus 30 min tid',
      'Natriumanalys (Svettest)',
      'Kroppss fett% tillägg',
      'Kroppss fett% fristående',
      'Blodanalys',
      'Hb endast',
      'Glucos endast',
      'Blodfetter',
      'Kostregistrering',
      'Kostrådgivning',
    ];
    
    // Filtrera kunder baserat på platser, tjänster och datum
    let filteredCustomers = customers;
    
    if (places && places.length > 0) {
      filteredCustomers = filteredCustomers.filter((c) => places.includes(c.place));
    }
    
    if (services && services.length > 0) {
      filteredCustomers = filteredCustomers.filter((c) => services.includes(c.service));
    }
    
    // Filtrera baserat på datumintervall
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      filteredCustomers = filteredCustomers.filter((c) => {
        const customerDate = new Date(c.date);
        return customerDate >= start && customerDate <= end;
      });
    }
    
    const totalMembers = filteredCustomers.length;
    const activeMembers = filteredCustomers.filter((c) => c.status === 'Aktiv').length;
    const totalTests = filteredCustomers.filter((c) => testServices.includes(c.service)).length;

    // Beräkna medlemmar per plats
    const membersByPlace = filteredCustomers.reduce((acc, customer) => {
      acc[customer.place] = (acc[customer.place] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Beräkna tjänstefördelning
    const serviceDistribution = filteredCustomers.reduce((acc, customer) => {
      acc[customer.service] = (acc[customer.service] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Beräkna månadsinktäter (aktiva medlemmar)
    const monthlyRevenue = filteredCustomers
      .filter((c) => c.status === 'Aktiv')
      .reduce((sum, customer) => sum + customer.price, 0);

    // Skapa månadsöversikt baserat på när kunder lades till
    // Använd alla kunder för månadsdata, inte bara filtrerade (för att undvika att missa data)
    // Filtrera på plats, men inte på datum eller tjänst (vi kollar tjänster per månad istället)
    let customersForMonthlyTrend = customers;
    if (places && places.length > 0) {
      customersForMonthlyTrend = customersForMonthlyTrend.filter((c) => places.includes(c.place));
    }
    // Filtrera inte på tjänst här - vi hanterar det per månad i generateMonthlyTrend
    const monthlyTrend = generateMonthlyTrend(customersForMonthlyTrend, startDate, endDate, services);

    return {
      totalMembers,
      totalTests,
      activeMembers,
      monthlyRevenue,
      membersByPlace: membersByPlace as any,
      serviceDistribution,
      monthlyTrend,
    };
  };

  const getMonthlyTestTrend = (places?: string[], services?: string[], startDate?: string, endDate?: string): any[] => {
    const testServices = [
      'Tröskeltest',
      'Tröskeltest + VO2max',
      'Tröskeltest Triathlon',
      'Tröskeltest Triathlon + VO2max',
      'VO2max fristående',
      'VO2max tillägg',
      'Wingate fristående',
      'Wingatetest tillägg',
      'Styrketest tillägg',
      'Teknikanalys tillägg',
      'Teknikanalys',
      'Funktionsanalys',
      'Funktions- och löpteknikanalys',
      'Hälsopaket',
      'Sommardubbel',
      'Sommardubbel Tri',
      'Träningsprogram Sommardubbel 1500kr',
      'Personlig Träning 1 - Betald yta',
      'Personlig Träning 1 - Gratis yta',
      'Personlig Träning 5',
      'Personlig Träning 10',
      'Personlig Träning 20',
      'PT-Klipp - Betald yta',
      'PT-Klipp - Gratis yta',
      'Konvertering från test till PT20 - Till kollega',
      'Sen avbokning',
      'Genomgång eller testdel utförd av någon annan - Minus 30 min tid',
      'Genomgång eller testdel utförd till någon annan - Plus 30 min tid',
      'Natriumanalys (Svettest)',
      'Kroppss fett% tillägg',
      'Kroppss fett% fristående',
      'Blodanalys',
      'Hb endast',
      'Glucos endast',
      'Blodfetter',
      'Kostregistrering',
      'Kostrådgivning',
    ];
    
    // Filtrera kunder baserat på platser
    let filteredCustomers = customers;
    if (places && places.length > 0) {
      filteredCustomers = filteredCustomers.filter((c) => places.includes(c.place));
    }
    
    // Generera månader baserat på datumintervall eller standard (senaste 6 månaderna)
    let months: { month: string; monthIndex: number; year: number }[] = [];
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
      
      // Generera alla månader mellan start och slut
      const current = new Date(start.getFullYear(), start.getMonth(), 1);
      const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
      
      while (current <= endMonth) {
        months.push({
          month: monthNames[current.getMonth()],
          monthIndex: current.getMonth(),
          year: current.getFullYear(),
        });
        current.setMonth(current.getMonth() + 1);
      }
    } else {
      // Standard: senaste 6 månaderna
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun'];
      const now = new Date();
      const currentMonth = now.getMonth();
      
      months = monthNames.map((month, index) => {
        const monthIndex = (currentMonth - 5 + index + 12) % 12;
        const year = now.getFullYear() - (monthIndex > currentMonth ? 1 : 0);
        return { month, monthIndex, year };
      });
    }
    
    return months.map(({ month, monthIndex, year }) => {
      // Skapa månadsintervall för att kolla om en tjänst var aktiv denna månad
      const monthStart = new Date(year, monthIndex, 1);
      const monthEnd = new Date(year, monthIndex + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);
      
      // Gruppera tester per test-typ
      const testCounts: Record<string, number> = {};
      
      filteredCustomers.forEach((c) => {
        // Kolla både serviceHistory och huvudtjänsten om den finns
        const servicesToCheck: Array<{ service: string; date: Date; status: string }> = [];
        
        // Lägg till alla tjänster från serviceHistory
        if (c.serviceHistory && c.serviceHistory.length > 0) {
          c.serviceHistory.forEach((serviceEntry) => {
            servicesToCheck.push({
              service: serviceEntry.service,
              date: serviceEntry.date,
              status: serviceEntry.status,
            });
          });
        }
        
        // Om huvudtjänsten inte finns i serviceHistory, lägg till den också
        if (!c.serviceHistory || c.serviceHistory.length === 0 || 
            !c.serviceHistory.some(se => se.service === c.service)) {
          servicesToCheck.push({
            service: c.service,
            date: c.date,
            status: c.status,
          });
        }
        
        // Kolla alla tjänster (både från serviceHistory och huvudtjänsten)
        servicesToCheck.forEach((serviceItem) => {
          const serviceStartDate = new Date(serviceItem.date);
          serviceStartDate.setHours(0, 0, 0, 0);
          
          // För tester: visa bara för månaden det genomfördes
          if (serviceStartDate.getMonth() === monthIndex && serviceStartDate.getFullYear() === year) {
            // Kolla om det är en test (inte en membership)
            if (!isMembershipService(serviceItem.service)) {
              // Om services är valda, kolla om denna test matchar
              if (services && services.length > 0) {
                if (services.includes(serviceItem.service)) {
                  testCounts[serviceItem.service] = (testCounts[serviceItem.service] || 0) + 1;
                }
              } else {
                // Om inga services är valda, räkna alla tester
                testCounts[serviceItem.service] = (testCounts[serviceItem.service] || 0) + 1;
              }
            }
          }
        });
      });

      // Lägg till år i månadssträngen
      const monthWithYear = `${month} ${year}`;
      
      // Skapa data-objekt med alla test-typer
      const dataPoint: any = { month: monthWithYear };
      
      // Lägg till alla test-typer
      Object.keys(testCounts).forEach((testType) => {
        dataPoint[testType] = testCounts[testType];
      });
      
      return dataPoint;
    });
  };

  const generateMonthlyTrend = (customers: Customer[], startDate?: string, endDate?: string, selectedServices?: string[]) => {
    const testServices = [
      'Tröskeltest',
      'Tröskeltest + VO2max',
      'Tröskeltest Triathlon',
      'Tröskeltest Triathlon + VO2max',
      'VO2max fristående',
      'VO2max tillägg',
      'Wingate fristående',
      'Wingatetest tillägg',
      'Styrketest tillägg',
      'Teknikanalys tillägg',
      'Teknikanalys',
      'Funktionsanalys',
      'Funktions- och löpteknikanalys',
      'Hälsopaket',
      'Sommardubbel',
      'Sommardubbel Tri',
      'Träningsprogram Sommardubbel 1500kr',
      'Personlig Träning 1 - Betald yta',
      'Personlig Träning 1 - Gratis yta',
      'Personlig Träning 5',
      'Personlig Träning 10',
      'Personlig Träning 20',
      'PT-Klipp - Betald yta',
      'PT-Klipp - Gratis yta',
      'Konvertering från test till PT20 - Till kollega',
      'Sen avbokning',
      'Genomgång eller testdel utförd av någon annan - Minus 30 min tid',
      'Genomgång eller testdel utförd till någon annan - Plus 30 min tid',
      'Natriumanalys (Svettest)',
      'Kroppss fett% tillägg',
      'Kroppss fett% fristående',
      'Blodanalys',
      'Hb endast',
      'Glucos endast',
      'Blodfetter',
      'Kostregistrering',
      'Kostrådgivning',
    ];
    
    // Generera månader baserat på datumintervall eller standard (senaste 6 månaderna)
    let months: { month: string; monthIndex: number; year: number }[] = [];
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
      
      // Generera alla månader mellan start och slut
      const current = new Date(start.getFullYear(), start.getMonth(), 1);
      const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
      
      while (current <= endMonth) {
        months.push({
          month: monthNames[current.getMonth()],
          monthIndex: current.getMonth(),
          year: current.getFullYear(),
        });
        current.setMonth(current.getMonth() + 1);
      }
    } else {
      // Standard: senaste 6 månaderna
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun'];
      const now = new Date();
      const currentMonth = now.getMonth();
      
      months = monthNames.map((month, index) => {
        const monthIndex = (currentMonth - 5 + index + 12) % 12;
        const year = now.getFullYear() - (monthIndex > currentMonth ? 1 : 0);
        return { month, monthIndex, year };
      });
    }
    
    return months.map(({ month, monthIndex, year }) => {
      // Skapa månadsintervall för att kolla om en tjänst var aktiv denna månad
      const monthStart = new Date(year, monthIndex, 1);
      const monthEnd = new Date(year, monthIndex + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);
      
      // För varje kund, kolla om de hade en aktiv tjänst denna månad
      // Gruppera medlemmar per membership-typ
      const membershipCounts: Record<string, number> = {};
      const monthTests: Customer[] = [];
      
      customers.forEach((c) => {
        // Kolla både serviceHistory och huvudtjänsten om den finns
        const servicesToCheck: Array<{ service: string; date: Date; status: string; endDate?: Date }> = [];
        
        // Lägg till alla tjänster från serviceHistory
        if (c.serviceHistory && c.serviceHistory.length > 0) {
          c.serviceHistory.forEach((serviceEntry) => {
            servicesToCheck.push({
              service: serviceEntry.service,
              date: serviceEntry.date,
              status: serviceEntry.status,
              endDate: serviceEntry.endDate,
            });
          });
        }
        
        // Om huvudtjänsten inte finns i serviceHistory, lägg till den också
        // (för kunder utan serviceHistory eller om huvudtjänsten inte är i historiken)
        if (!c.serviceHistory || c.serviceHistory.length === 0 || 
            !c.serviceHistory.some(se => se.service === c.service)) {
          servicesToCheck.push({
            service: c.service,
            date: c.date,
            status: c.status,
          });
        }
        
        // Kolla alla tjänster (både från serviceHistory och huvudtjänsten)
        servicesToCheck.forEach((serviceItem) => {
          const serviceStartDate = new Date(serviceItem.date);
          serviceStartDate.setHours(0, 0, 0, 0);
          
          // För aktiva tjänster: använd dagens datum som slutdatum
          // För avslutade/pausade: använd endDate om det finns, annars startDate (engångstjänst)
          const serviceEndDate = serviceItem.endDate 
            ? new Date(serviceItem.endDate)
            : (serviceItem.status === 'Aktiv' ? new Date() : serviceStartDate);
          serviceEndDate.setHours(23, 59, 59, 999);
          
          // Kolla om denna månad är mellan start och slut
          const wasActiveThisMonth = serviceStartDate <= monthEnd && serviceEndDate >= monthStart;
          
          if (wasActiveThisMonth) {
            const isMembership = isMembershipService(serviceItem.service);
            
            if (isMembership) {
              // Om services är valda, kolla om denna membership matchar
              if (selectedServices && selectedServices.length > 0) {
                if (selectedServices.includes(serviceItem.service)) {
                  // Räkna per membership-typ endast om den är vald
                  const membershipType = serviceItem.service;
                  membershipCounts[membershipType] = (membershipCounts[membershipType] || 0) + 1;
                }
              } else {
                // Om inga services är valda, räkna alla memberships
                const membershipType = serviceItem.service;
                membershipCounts[membershipType] = (membershipCounts[membershipType] || 0) + 1;
              }
            } else {
              // Test - visa alltid, oavsett valda services
              // Visa bara för månaden det genomfördes
              if (serviceStartDate.getMonth() === monthIndex && serviceStartDate.getFullYear() === year) {
                monthTests.push({
                  ...c,
                  service: serviceItem.service as any,
                  status: serviceItem.status as any,
                  date: serviceItem.date,
                });
              }
            }
          }
        });
      });

      // Lägg till år i månadssträngen
      const monthWithYear = `${month} ${year}`;
      
      // Skapa data-objekt med alla membership-typer och tester
      const dataPoint: any = { month: monthWithYear };
      
      // Lägg till alla membership-typer
      Object.keys(membershipCounts).forEach((membershipType) => {
        dataPoint[membershipType] = membershipCounts[membershipType];
      });
      
      // Lägg till tester endast om det finns tester OCH (inga services är valda ELLER det finns inga memberships)
      // Om bara memberships är valda, visa inte tests
      const onlyMembershipsSelected = selectedServices && selectedServices.length > 0 && 
        selectedServices.every(s => isMembershipService(s));
      
      if (monthTests.length > 0 && !onlyMembershipsSelected) {
        dataPoint.tests = monthTests.length;
      } else if (monthTests.length > 0 && Object.keys(membershipCounts).length === 0) {
        // Om inga memberships finns men det finns tester, visa dem
        dataPoint.tests = monthTests.length;
      }
      
      return dataPoint;
    });
  };

const getCrossTable = (places: string[], services: string[]) => {
  // Om inga filter är valda, returnera tom array
  if (places.length === 0 || services.length === 0) {
    return [];
  }

  // Skapa en korsreferenstabell: platser som rader, tjänster som kolumner
  const crossTable = places.map((place) => {
    const row: { place: string; [service: string]: number | string } = { place };

    services.forEach((service) => {
      // Räkna antalet kunder för denna plats och tjänst
      const count = customers.filter(
        (c) => c.place === place && c.service === service
      ).length;
      row[service] = count;
    });

    return row;
  });

  return crossTable;
};

         const getCrossTrendData = (places: string[], services: string[], startDate?: string, endDate?: string) => {
           // Om inga filter är valda, returnera tom array
           if (places.length === 0 || services.length === 0) {
             return [];
           }

           // Generera månader baserat på datumintervall eller standard (senaste 6 månaderna)
           let months: { month: string; monthIndex: number; year: number }[] = [];
           
           if (startDate && endDate) {
             const start = new Date(startDate);
             const end = new Date(endDate);
             const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
             
             // Generera alla månader mellan start och slut
             const current = new Date(start.getFullYear(), start.getMonth(), 1);
             const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
             
             while (current <= endMonth) {
               months.push({
                 month: monthNames[current.getMonth()],
                 monthIndex: current.getMonth(),
                 year: current.getFullYear(),
               });
               current.setMonth(current.getMonth() + 1);
             }
           } else {
             // Standard: senaste 6 månaderna
             const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun'];
             const now = new Date();
             const currentMonth = now.getMonth();
             
             months = monthNames.map((month, index) => {
               const monthIndex = (currentMonth - 5 + index + 12) % 12;
               const year = now.getFullYear() - (monthIndex > currentMonth ? 1 : 0);
               return { month, monthIndex, year };
             });
           }

           // Skapa data för varje månad med plats+tjänst kombinationer
           return months.map(({ month, monthIndex, year }) => {
             // Lägg till år i månadssträngen
             const monthWithYear = `${month} ${year}`;
             const dataPoint: any = { month: monthWithYear };
             
             // Skapa månadsintervall för att kolla om en tjänst var aktiv denna månad
             const monthStart = new Date(year, monthIndex, 1);
             const monthEnd = new Date(year, monthIndex + 1, 0);
             monthEnd.setHours(23, 59, 59, 999);

             // För varje kombination av plats och tjänst
             places.forEach((place) => {
               services.forEach((service) => {
                 // Om tjänsten är Premium eller Supreme, dela upp på coach-typ
                 if (service.includes('Membership Premium') || service.includes('Membership Supreme')) {
                   // Vanlig coach
                   let regularCount = 0;
                   // Senior coach
                   let seniorCount = 0;
                   
                   customers.forEach((c) => {
                     if (c.place !== place) return;
                     
                     // Kolla om kunden har denna tjänst aktiv denna månad
                     let hasServiceThisMonth = false;
                     let isSenior = false;
                     
                     if (c.serviceHistory && c.serviceHistory.length > 0) {
                       // Kolla i serviceHistory
                       const matchingService = c.serviceHistory.find(
                         (se) => se.service === service
                       );
                       
                       if (matchingService) {
                         const serviceStartDate = new Date(matchingService.date);
                         serviceStartDate.setHours(0, 0, 0, 0);
                         
                         const serviceEndDate = matchingService.endDate 
                           ? new Date(matchingService.endDate)
                           : (matchingService.status === 'Aktiv' ? new Date() : serviceStartDate);
                         serviceEndDate.setHours(23, 59, 59, 999);
                         
                         hasServiceThisMonth = serviceStartDate <= monthEnd && serviceEndDate >= monthStart;
                         // För serviceHistory, kolla om kunden har isSeniorCoach satt
                         isSenior = c.isSeniorCoach === true;
                       }
                     } else {
                       // Ingen serviceHistory - använd huvudtjänsten
                       if (c.service === service) {
                         const customerStartDate = new Date(c.date);
                         customerStartDate.setHours(0, 0, 0, 0);
                         
                         const customerEndDate = c.status === 'Aktiv' ? new Date() : customerStartDate;
                         customerEndDate.setHours(23, 59, 59, 999);
                         
                         hasServiceThisMonth = customerStartDate <= monthEnd && customerEndDate >= monthStart;
                         isSenior = c.isSeniorCoach === true;
                       }
                     }
                     
                     if (hasServiceThisMonth) {
                       if (isSenior) {
                         seniorCount++;
                       } else {
                         regularCount++;
                       }
                     }
                   });

                   // Skapa unika nycklar för vanlig och senior coach
                   const regularKey = `${place}|||${service} - Vanlig coach`;
                   const seniorKey = `${place}|||${service} - Senior coach`;
                   dataPoint[regularKey] = regularCount;
                   dataPoint[seniorKey] = seniorCount;
                 } else {
                   // För andra tjänster (memberships och tester)
                   let count = 0;
                   
                   customers.forEach((c) => {
                     if (c.place !== place) return;
                     
                     // Kolla om kunden har denna tjänst aktiv denna månad
                     let hasServiceThisMonth = false;
                     
                     if (c.serviceHistory && c.serviceHistory.length > 0) {
                       // Kolla i serviceHistory
                       const matchingService = c.serviceHistory.find(
                         (se) => se.service === service
                       );
                       
                       if (matchingService) {
                         if (isMembershipService(service)) {
                           // Membership - visa för alla månader det var aktivt
                           const serviceStartDate = new Date(matchingService.date);
                           serviceStartDate.setHours(0, 0, 0, 0);
                           
                           const serviceEndDate = matchingService.endDate 
                             ? new Date(matchingService.endDate)
                             : (matchingService.status === 'Aktiv' ? new Date() : serviceStartDate);
                           serviceEndDate.setHours(23, 59, 59, 999);
                           
                           hasServiceThisMonth = serviceStartDate <= monthEnd && serviceEndDate >= monthStart;
                         } else {
                           // Test - visa bara för månaden det genomfördes
                           const serviceStartDate = new Date(matchingService.date);
                           hasServiceThisMonth = serviceStartDate.getMonth() === monthIndex && 
                                                 serviceStartDate.getFullYear() === year;
                         }
                       }
                     } else {
                       // Ingen serviceHistory - använd huvudtjänsten
                       if (c.service === service) {
                         if (isMembershipService(service)) {
                           // Membership - visa för alla månader det var aktivt
                           const customerStartDate = new Date(c.date);
                           customerStartDate.setHours(0, 0, 0, 0);
                           
                           const customerEndDate = c.status === 'Aktiv' ? new Date() : customerStartDate;
                           customerEndDate.setHours(23, 59, 59, 999);
                           
                           hasServiceThisMonth = customerStartDate <= monthEnd && customerEndDate >= monthStart;
                         } else {
                           // Test - visa bara för månaden det genomfördes
                           const customerStartDate = new Date(c.date);
                           hasServiceThisMonth = customerStartDate.getMonth() === monthIndex && 
                                                 customerStartDate.getFullYear() === year;
                         }
                       }
                     }
                     
                     if (hasServiceThisMonth) {
                       count++;
                     }
                   });

                   // Skapa unik nyckel för varje plats-tjänst kombination
                   const key = `${place}|||${service}`;
                   dataPoint[key] = count;
                 }
               });
             });

             return dataPoint;
    });
  };

  const getActiveMembershipDistribution = (places?: string[]): { name: string; value: number }[] => {
    // Filtrera kunder baserat på platser
    let filteredCustomers = customers;
    if (places && places.length > 0) {
      filteredCustomers = filteredCustomers.filter((c) => places.includes(c.place));
    }
    
    // Räkna aktiva medlemskap per typ
    const membershipCounts: Record<string, number> = {};
    
    filteredCustomers.forEach((c) => {
      // Kolla både serviceHistory och huvudtjänsten
      const servicesToCheck: Array<{ service: string; status: string }> = [];
      
      // Lägg till alla tjänster från serviceHistory
      if (c.serviceHistory && c.serviceHistory.length > 0) {
        c.serviceHistory.forEach((serviceEntry) => {
          servicesToCheck.push({
            service: serviceEntry.service,
            status: serviceEntry.status,
          });
        });
      }
      
      // Om huvudtjänsten inte finns i serviceHistory, lägg till den också
      if (!c.serviceHistory || c.serviceHistory.length === 0 || 
          !c.serviceHistory.some(se => se.service === c.service)) {
        servicesToCheck.push({
          service: c.service,
          status: c.status,
        });
      }
      
      // Räkna bara aktiva medlemskap
      servicesToCheck.forEach((serviceItem) => {
        if (serviceItem.status === 'Aktiv' && isMembershipService(serviceItem.service)) {
          membershipCounts[serviceItem.service] = (membershipCounts[serviceItem.service] || 0) + 1;
        }
      });
    });
    
    // Konvertera till array och sortera efter antal (högst först)
    const result = Object.keys(membershipCounts)
      .map((membershipType) => ({
        name: membershipType,
        value: membershipCounts[membershipType],
      }))
      .sort((a, b) => b.value - a.value);
    
    // Lägg till total för tooltip
    const total = result.reduce((sum, item) => sum + item.value, 0);
    return result.map(item => ({ ...item, total }));
  };

  const getServiceDistribution = (places?: string[], startDate?: string, endDate?: string): { name: string; value: number }[] => {
    // Filtrera kunder baserat på platser och datum
    let filteredCustomers = customers;
    
    if (places && places.length > 0) {
      filteredCustomers = filteredCustomers.filter((c) => places.includes(c.place));
    }
    
    // Filtrera baserat på datumintervall om det är angivet
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      filteredCustomers = filteredCustomers.filter((c) => {
        // Kolla om kunden har någon tjänst inom tidsperioden
        const servicesToCheck: Array<{ service: string; date: Date; endDate?: Date; status: string }> = [];
        
        // Lägg till alla tjänster från serviceHistory
        if (c.serviceHistory && c.serviceHistory.length > 0) {
          c.serviceHistory.forEach((serviceEntry) => {
            servicesToCheck.push({
              service: serviceEntry.service,
              date: serviceEntry.date,
              endDate: serviceEntry.endDate,
              status: serviceEntry.status,
            });
          });
        }
        
        // Om huvudtjänsten inte finns i serviceHistory, lägg till den också
        if (!c.serviceHistory || c.serviceHistory.length === 0 || 
            !c.serviceHistory.some(se => se.service === c.service)) {
          servicesToCheck.push({
            service: c.service,
            date: c.date,
            status: c.status,
          });
        }
        
        // Kolla om någon tjänst överlappar med tidsperioden
        return servicesToCheck.some((serviceItem) => {
          const serviceStartDate = new Date(serviceItem.date);
          serviceStartDate.setHours(0, 0, 0, 0);
          const serviceEndDate = serviceItem.endDate 
            ? new Date(serviceItem.endDate)
            : (serviceItem.status === 'Aktiv' ? new Date() : serviceStartDate);
          serviceEndDate.setHours(23, 59, 59, 999);
          
          return serviceStartDate <= end && serviceEndDate >= start;
        });
      });
    }
    
    // Räkna alla tjänster per typ (både memberships och tester)
    const serviceCounts: Record<string, number> = {};
    
    filteredCustomers.forEach((c) => {
      // Kolla både serviceHistory och huvudtjänsten
      const servicesToCheck: Array<{ service: string; date: Date; endDate?: Date; status: string }> = [];
      
      // Lägg till alla tjänster från serviceHistory
      if (c.serviceHistory && c.serviceHistory.length > 0) {
        c.serviceHistory.forEach((serviceEntry) => {
          servicesToCheck.push({
            service: serviceEntry.service,
            date: serviceEntry.date,
            endDate: serviceEntry.endDate,
            status: serviceEntry.status,
          });
        });
      }
      
      // Om huvudtjänsten inte finns i serviceHistory, lägg till den också
      if (!c.serviceHistory || c.serviceHistory.length === 0 || 
          !c.serviceHistory.some(se => se.service === c.service)) {
        servicesToCheck.push({
          service: c.service,
          date: c.date,
          status: c.status,
        });
      }
      
      // Räkna alla tjänster (både aktiva och avslutade inom tidsperioden)
      servicesToCheck.forEach((serviceItem) => {
        const serviceStartDate = new Date(serviceItem.date);
        serviceStartDate.setHours(0, 0, 0, 0);
        const serviceEndDate = serviceItem.endDate 
          ? new Date(serviceItem.endDate)
          : (serviceItem.status === 'Aktiv' ? new Date() : serviceStartDate);
        serviceEndDate.setHours(23, 59, 59, 999);
        
        // Om tidsperiod är angiven, kolla om tjänsten överlappar
        if (startDate && endDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          
          if (serviceStartDate <= end && serviceEndDate >= start) {
            serviceCounts[serviceItem.service] = (serviceCounts[serviceItem.service] || 0) + 1;
          }
        } else {
          // Om ingen tidsperiod är angiven, räkna alla
          serviceCounts[serviceItem.service] = (serviceCounts[serviceItem.service] || 0) + 1;
        }
      });
    });
    
    // Konvertera till array och sortera efter antal (högst först)
    const result = Object.keys(serviceCounts)
      .map((serviceType) => ({
        name: serviceType,
        value: serviceCounts[serviceType],
      }))
      .sort((a, b) => b.value - a.value);
    
    return result;
  };

return (
  <CustomerContext.Provider
    value={{
      customers,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      getStats,
      getCrossTable,
      getCrossTrendData,
      getMonthlyTestTrend,
      getActiveMembershipDistribution,
      getServiceDistribution,
    }}
  >
    {children}
  </CustomerContext.Provider>
);
}

export function useCustomers() {
  const context = useContext(CustomerContext);
  if (context === undefined) {
    throw new Error('useCustomers måste användas inom CustomerProvider');
  }
  return context;
}

