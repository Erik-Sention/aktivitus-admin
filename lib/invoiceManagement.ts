import { Customer, ServiceEntry, InvoiceStatus } from '@/types';
import { isMembershipService } from './constants';
import { addMonths, endOfMonth, startOfMonth, format, isBefore, isAfter, isSameMonth, isSameYear } from 'date-fns';
import { calculateNextInvoiceDate, calculateInvoiceAmount } from './invoiceCalculations';

/**
 * Beräknar nästa faktureringsdatum baserat på senaste fakturan och betalningsintervall
 * @param lastInvoiceDate Senaste faktureringsdatum (eller startdatum om ingen faktura skapats än)
 * @param billingInterval Betalningsintervall
 * @returns Nästa faktureringsdatum
 */
export const calculateNextInvoiceDateFromLast = (
  lastInvoiceDate: Date,
  billingInterval?: string
): Date => {
  if (!billingInterval || billingInterval === 'Engångsbetalning') {
    return lastInvoiceDate;
  }

  const last = new Date(lastInvoiceDate);
  last.setHours(0, 0, 0, 0);

  switch (billingInterval) {
    case 'Månadsvis':
      // Nästa månad, slutet av månaden
      return endOfMonth(addMonths(last, 1));
    
    case 'Kvartalsvis':
      // 3 månader efter senaste fakturan
      return endOfMonth(addMonths(last, 3));
    
    case 'Halvårsvis':
      // 6 månader efter senaste fakturan
      return endOfMonth(addMonths(last, 6));
    
    case 'Årlig':
      // 12 månader efter senaste fakturan
      return endOfMonth(addMonths(last, 12));
    
    default:
      return endOfMonth(addMonths(last, 1));
  }
};

/**
 * Beräknar förfallodatum för en faktura (sista dagen i faktureringsmånaden)
 * @param invoiceDate Fakturadatum (första dagen i månaden fakturan gäller)
 * @returns Förfallodatum (sista dagen i samma månad)
 */
export const calculateDueDate = (invoiceDate: Date): Date => {
  return endOfMonth(invoiceDate);
};

/**
 * Kontrollerar om en faktura redan finns för en specifik månad
 * @param service ServiceEntry med invoiceHistory
 * @param month Månad i format "YYYY-MM"
 * @returns true om faktura finns, false annars
 */
export const hasInvoiceForMonth = (service: ServiceEntry, month: string): boolean => {
  if (!service.invoiceHistory) {
    return false;
  }
  
  const status = service.invoiceHistory[month];
  // Faktura finns om status är satt och inte är "Ej aktuell"
  return status !== undefined && status !== 'Ej aktuell';
};

/**
 * Genererar fakturor automatiskt för alla aktiva memberships som behöver faktureras
 * @param customers Lista över kunder
 * @param upToDate Datum att kontrollera fram till (standard: idag)
 * @returns Lista över uppdateringar som behöver göras
 */
export const generateInvoicesAutomatically = (
  customers: Customer[],
  upToDate: Date = new Date()
): Array<{ customerId: string; serviceId: string; updates: Partial<ServiceEntry> }> => {
  const updates: Array<{ customerId: string; serviceId: string; updates: Partial<ServiceEntry> }> = [];
  
  customers.forEach((customer) => {
    if (!customer.serviceHistory) return;
    
    customer.serviceHistory.forEach((service) => {
      // Bara för aktiva memberships
      if (!isMembershipService(service.service) || service.status !== 'Aktiv') {
        return;
      }
      
      // Om tjänsten har ett slutdatum och det har passerat, ska vi inte fakturera
      if (service.endDate && isBefore(new Date(service.endDate), upToDate)) {
        return;
      }
      
      const billingInterval = service.billingInterval || 'Månadsvis';
      
      // Om engångsbetalning, hoppa över
      if (billingInterval === 'Engångsbetalning') {
        return;
      }
      
      // Hitta senaste faktureringsdatum
      let lastInvoiceDate: Date | null = null;
      
      // Kolla invoiceHistory för att hitta senaste faktureringsdatum
      if (service.invoiceHistory && Object.keys(service.invoiceHistory).length > 0) {
        const monthsWithInvoices = Object.keys(service.invoiceHistory)
          .filter(month => {
            const status = service.invoiceHistory![month];
            return status && status !== 'Ej aktuell';
          })
          .sort()
          .reverse();
        
        if (monthsWithInvoices.length > 0) {
          const latestMonth = monthsWithInvoices[0];
          const [year, month] = latestMonth.split('-').map(Number);
          lastInvoiceDate = new Date(year, month - 1, 1);
        }
      }
      
      // Om ingen faktura finns än, använd startdatum
      if (!lastInvoiceDate) {
        lastInvoiceDate = new Date(service.date);
      }
      
      // Beräkna nästa faktureringsdatum från senaste fakturan
      let nextInvoiceDate = calculateNextInvoiceDateFromLast(lastInvoiceDate, billingInterval);
      
      // Om nextInvoiceDate redan är satt och är senare, använd det
      if (service.nextInvoiceDate) {
        const existingNextDate = new Date(service.nextInvoiceDate);
        if (isAfter(existingNextDate, nextInvoiceDate)) {
          nextInvoiceDate = existingNextDate;
        }
      }
      
      // Kontrollera om vi behöver skapa fakturor fram till upToDate
      const invoiceHistory = { ...(service.invoiceHistory || {}) };
      let needsUpdate = false;
      
      // För månadsvis: skapa faktura för varje månad
      if (billingInterval === 'Månadsvis' || !billingInterval) {
        const currentDate = new Date(lastInvoiceDate);
        currentDate.setMonth(currentDate.getMonth() + 1); // Börja från månaden efter senaste fakturan
        currentDate.setDate(1); // Första dagen i månaden
        
        // Skapa fakturor för alla månader som har passerat eller är aktuell månad
        while (isBefore(currentDate, upToDate) || isSameMonth(currentDate, upToDate)) {
          const monthKey = format(currentDate, 'yyyy-MM');
          
          // Kontrollera att tjänsten var aktiv denna månad
          const serviceStart = new Date(service.date);
          const serviceEnd = service.endDate ? new Date(service.endDate) : null;
          const monthStart = startOfMonth(currentDate);
          const monthEnd = endOfMonth(currentDate);
          
          // Om tjänsten inte var aktiv denna månad, hoppa över
          if (serviceEnd && isBefore(serviceEnd, monthStart)) {
            break;
          }
          
          if (serviceStart > monthEnd) {
            currentDate.setMonth(currentDate.getMonth() + 1);
            continue;
          }
          
          // Om faktura redan finns, hoppa över (förhindra dubbelfakturering)
          if (hasInvoiceForMonth(service, monthKey)) {
            currentDate.setMonth(currentDate.getMonth() + 1);
            continue;
          }
          
          // Skapa faktura för denna månad
          invoiceHistory[monthKey] = 'Väntar på betalning';
          needsUpdate = true;
          
          // Uppdatera nextInvoiceDate till nästa månad
          nextInvoiceDate = calculateNextInvoiceDateFromLast(currentDate, billingInterval);
          
          // Gå till nästa månad
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      } else {
        // För kvartalsvis/halvårsvis/årlig: skapa faktura bara vid faktureringscykler
        const cycleMonths = billingInterval === 'Kvartalsvis' ? 3 :
                          billingInterval === 'Halvårsvis' ? 6 : 12;
        
        const serviceStart = new Date(service.date);
        serviceStart.setDate(1);
        
        // Börja från första faktureringsmånaden efter senaste fakturan
        let currentCycle = new Date(lastInvoiceDate);
        currentCycle.setDate(1);
        
        // Hitta nästa faktureringscykel
        const monthsSinceStart = (currentCycle.getFullYear() - serviceStart.getFullYear()) * 12 +
                                (currentCycle.getMonth() - serviceStart.getMonth());
        const cyclesSinceStart = Math.floor(monthsSinceStart / cycleMonths);
        const nextCycleMonth = cyclesSinceStart * cycleMonths + cycleMonths;
        
        currentCycle = new Date(serviceStart);
        currentCycle.setMonth(currentCycle.getMonth() + nextCycleMonth);
        currentCycle.setDate(1);
        
        // Skapa fakturor för alla faktureringscykler fram till upToDate
        while (isBefore(currentCycle, upToDate) || isSameMonth(currentCycle, upToDate)) {
          const monthKey = format(currentCycle, 'yyyy-MM');
          
          // Kontrollera att tjänsten var aktiv denna månad
          const serviceEnd = service.endDate ? new Date(service.endDate) : null;
          const monthStart = startOfMonth(currentCycle);
          const monthEnd = endOfMonth(currentCycle);
          
          // Om tjänsten inte var aktiv denna månad, hoppa över
          if (serviceEnd && isBefore(serviceEnd, monthStart)) {
            break;
          }
          
          if (serviceStart > monthEnd) {
            currentCycle.setMonth(currentCycle.getMonth() + cycleMonths);
            continue;
          }
          
          // Om faktura redan finns, hoppa över (förhindra dubbelfakturering)
          if (hasInvoiceForMonth(service, monthKey)) {
            currentCycle.setMonth(currentCycle.getMonth() + cycleMonths);
            continue;
          }
          
          // Skapa faktura för denna faktureringscykel
          invoiceHistory[monthKey] = 'Väntar på betalning';
          needsUpdate = true;
          
          // Uppdatera nextInvoiceDate till nästa faktureringscykel
          nextInvoiceDate = calculateNextInvoiceDateFromLast(currentCycle, billingInterval);
          
          // Gå till nästa faktureringscykel
          currentCycle.setMonth(currentCycle.getMonth() + cycleMonths);
        }
      }
      
      if (needsUpdate) {
        // Hitta senaste statusen för invoiceStatus (bakåtkompatibilitet)
        const monthsWithStatus = Object.keys(invoiceHistory).sort().reverse();
        const latestStatus = monthsWithStatus.length > 0 
          ? invoiceHistory[monthsWithStatus[0]]
          : 'Väntar på betalning';
        
        updates.push({
          customerId: customer.id,
          serviceId: service.id,
          updates: {
            invoiceHistory,
            invoiceStatus: latestStatus,
            nextInvoiceDate,
          },
        });
      }
    });
  });
  
  return updates;
};

/**
 * Hämtar fakturabelopp för en specifik månad baserat på betalningsintervall
 * @param service ServiceEntry
 * @param month Månad i format "YYYY-MM"
 * @returns Fakturabelopp för månaden
 */
export const getInvoiceAmountForMonth = (service: ServiceEntry, month: string): number => {
  const billingInterval = service.billingInterval || 'Månadsvis';
  const monthlyPrice = service.price;
  
  // För kvartalsvis/halvårsvis/årlig: kontrollera om detta är en faktureringsmånad
  if (billingInterval === 'Kvartalsvis' || billingInterval === 'Halvårsvis' || billingInterval === 'Årlig') {
    const [year, monthNum] = month.split('-').map(Number);
    const invoiceDate = new Date(year, monthNum - 1, 1);
    const serviceStart = new Date(service.date);
    serviceStart.setDate(1);
    
    // Beräkna antal månader från startdatum
    const monthsSinceStart = (invoiceDate.getFullYear() - serviceStart.getFullYear()) * 12 +
                            (invoiceDate.getMonth() - serviceStart.getMonth());
    
    const cycleMonths = billingInterval === 'Kvartalsvis' ? 3 :
                       billingInterval === 'Halvårsvis' ? 6 : 12;
    
    // Om detta är en faktureringsmånad (delbart med cycleMonths), returnera cykelpris
    if (monthsSinceStart >= 0 && monthsSinceStart % cycleMonths === 0) {
      return calculateInvoiceAmount(monthlyPrice, billingInterval);
    }
    
    // Annars är det ingen faktureringsmånad
    return 0;
  }
  
  // För månadsvis: alltid månadspriset
  return monthlyPrice;
};

/**
 * Kontrollerar om en faktura ska visas för en specifik månad
 * @param service ServiceEntry
 * @param month Månad i format "YYYY-MM"
 * @returns true om fakturan ska visas, false annars
 */
export const shouldShowInvoiceForMonth = (service: ServiceEntry, month: string): boolean => {
  const [year, monthNum] = month.split('-').map(Number);
  const monthDate = new Date(year, monthNum - 1, 1);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  
  const serviceStart = new Date(service.date);
  const serviceEnd = service.endDate ? new Date(service.endDate) : null;
  
  // Om tjänsten inte var aktiv denna månad, visa inte
  if (serviceEnd && isBefore(serviceEnd, monthStart)) {
    return false;
  }
  
  if (serviceStart > monthEnd) {
    return false;
  }
  
  // För månadsvis: visa alltid om tjänsten var aktiv
  if (service.billingInterval === 'Månadsvis' || !service.billingInterval) {
    return true;
  }
  
  // För kvartalsvis/halvårsvis/årlig: visa bara om detta är en faktureringsmånad
  const monthsSinceStart = (monthDate.getFullYear() - serviceStart.getFullYear()) * 12 +
                           (monthDate.getMonth() - serviceStart.getMonth());
  
  const cycleMonths = service.billingInterval === 'Kvartalsvis' ? 3 :
                     service.billingInterval === 'Halvårsvis' ? 6 : 12;
  
  // Visa om detta är en faktureringsmånad eller om faktura redan finns
  return monthsSinceStart >= 0 && (monthsSinceStart % cycleMonths === 0 || hasInvoiceForMonth(service, month));
};

