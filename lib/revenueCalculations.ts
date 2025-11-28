import { Customer, ServiceEntry } from '@/types';
import { isMembershipService } from './constants';

/**
 * Beräknar antal månader mellan två datum, normaliserat till första dagen i månaden.
 * Inklusive både start- och slutmånad.
 */
export const getMonthsBetween = (startDate: Date, endDate: Date): number => {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  const monthsDiff =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());

  return Math.max(1, monthsDiff + 1);
};

/**
 * Hämtar slutdatum för en tjänst/kund enligt specifikation:
 * - Tester: endDate = startdatum
 * - Memberships:
 *   - Om endDate finns: använd det
 *   - Om status = 'Aktiv' och inget endDate: använd periodEnd (eller idag)
 *   - Om status != 'Aktiv' och inget endDate: använd startdatum (data saknas)
 */
export const getServiceEndDate = (
  entry: { endDate?: Date | null; status: string; date: Date; service?: string },
  periodEnd?: Date
): Date => {
  const startDate =
    entry.date instanceof Date ? entry.date : new Date(entry.date);
  const rawEndDate =
    entry.endDate instanceof Date
      ? entry.endDate
      : entry.endDate
      ? new Date(entry.endDate)
      : undefined;

  const serviceName = (entry as any).service as string | undefined;

  // Om vi vet att det är ett test: slutdatum = startdatum
  if (serviceName && !isMembershipService(serviceName)) {
    return new Date(startDate);
  }

  // Memberships
  if (rawEndDate) {
    return new Date(rawEndDate);
  }

  if (entry.status === 'Aktiv') {
    return periodEnd ? new Date(periodEnd) : new Date();
  }

  // Inaktivt membership utan endDate -> data saknas, använd startdatum
  return new Date(startDate);
};

/**
 * Beräknar intäkt för en membership-tjänst baserat på betalningsintervall.
 *
 * Enligt specifikation:
 * - Månadsvis: Faktureras varje månad tjänsten är aktiv, belopp = månadspris
 * - Kvartalsvis: Faktureras var 3:e månad, belopp = månadspris × 3
 * - Halvårsvis: Faktureras var 6:e månad, belopp = månadspris × 6
 * - Årlig: Faktureras var 12:e månad, belopp = månadspris × 12
 * - Engångsbetalning: En faktura vid start
 *
 * @param entry Objekt med price, billingInterval och date
 * @param serviceStartDate Startdatum för tjänsten
 * @param serviceEndDate Slutdatum för tjänsten
 * @param periodStart Startdatum för rapportperiod (valfritt)
 * @param periodEnd Slutdatum för rapportperiod (valfritt)
 */
export const calculateMembershipRevenue = (
  entry: { price: number; billingInterval?: string; date: Date },
  serviceStartDate: Date,
  serviceEndDate: Date,
  periodStart?: Date,
  periodEnd?: Date
): number => {
  const billingInterval = entry.billingInterval || 'Månadsvis';
  const monthlyPrice = entry.price;

  const start = new Date(serviceStartDate);
  const end = new Date(serviceEndDate);
  if (end < start) return 0;

  const periodStartDate = periodStart ? new Date(periodStart) : undefined;
  const periodEndDate = periodEnd ? new Date(periodEnd) : undefined;

  // Engångsbetalning: räkna bara om startdatum ligger inom perioden (om angiven)
  if (billingInterval === 'Engångsbetalning') {
    const chargeDate = new Date(start);
    chargeDate.setHours(0, 0, 0, 0);

    if (periodStartDate && periodEndDate) {
      if (chargeDate < periodStartDate || chargeDate > periodEndDate) {
        return 0;
      }
    }
    return monthlyPrice;
  }

  // Kvartalsvis / Halvårsvis / Årlig – räkna fakturor per cykel
  if (
    billingInterval === 'Kvartalsvis' ||
    billingInterval === 'Halvårsvis' ||
    billingInterval === 'Årlig'
  ) {
    const cycleMonths =
      billingInterval === 'Kvartalsvis'
        ? 3
        : billingInterval === 'Halvårsvis'
        ? 6
        : 12;
    const cyclePrice = monthlyPrice * cycleMonths;

    let total = 0;
    const currentCycle = new Date(start.getFullYear(), start.getMonth(), 1);

    while (currentCycle <= end) {
      const dueDate = new Date(currentCycle);

      if (periodStartDate && periodEndDate) {
        if (dueDate >= periodStartDate && dueDate <= periodEndDate) {
          total += cyclePrice;
        }
      } else {
        total += cyclePrice;
      }

      currentCycle.setMonth(currentCycle.getMonth() + cycleMonths);
    }

    return total;
  }

  // Månadsvis – räkna alla månader tjänsten är aktiv inom perioden
  const actualStart = periodStartDate
    ? new Date(Math.max(start.getTime(), periodStartDate.getTime()))
    : start;
  const actualEnd = periodEndDate
    ? new Date(Math.min(end.getTime(), periodEndDate.getTime()))
    : end;

  const periodStartNorm = new Date(
    actualStart.getFullYear(),
    actualStart.getMonth(),
    1
  );
  const periodEndNorm = new Date(
    actualEnd.getFullYear(),
    actualEnd.getMonth(),
    1
  );

  let monthsInPeriod = 0;
  const currentMonth = new Date(periodStartNorm);
  while (currentMonth <= periodEndNorm) {
    const monthStart = new Date(currentMonth);
    const monthEnd = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0
    );
    monthEnd.setHours(23, 59, 59, 999);

    if (start <= monthEnd && end >= monthStart) {
      monthsInPeriod++;
    }

    currentMonth.setMonth(currentMonth.getMonth() + 1);
  }

  return monthlyPrice * monthsInPeriod;
};

/**
 * Beräknar total omsättning för en kund baserat på alla tjänster.
 * - Memberships: använder calculateMembershipRevenue utan rapportperiod (hela medlemskapet)
 * - Tester: engångsbetalning, priset räknas en gång
 */
export const getTotalRevenue = (customer: Customer): number => {
  // Skapa serviceHistory från kundens huvudtjänst om det saknas
  const serviceHistory: ServiceEntry[] =
    customer.serviceHistory && customer.serviceHistory.length > 0
      ? customer.serviceHistory
      : ([
          {
            id: `main_${customer.id}`,
            service: customer.service,
            price: customer.price,
            date: customer.date,
            status: customer.status,
            endDate: undefined,
            billingInterval: isMembershipService(customer.service)
              ? 'Månadsvis'
              : 'Engångsbetalning',
          } as ServiceEntry,
        ] as ServiceEntry[]);

  let total = 0;

  serviceHistory.forEach((entry) => {
    if (isMembershipService(entry.service)) {
      const startDate =
        entry.date instanceof Date ? entry.date : new Date(entry.date);
      const endDate = getServiceEndDate(entry);

      const revenue = calculateMembershipRevenue(
        {
          price: entry.price,
          billingInterval:
            entry.billingInterval ||
            (isMembershipService(entry.service)
              ? 'Månadsvis'
              : 'Engångsbetalning'),
          date: startDate,
        },
        startDate,
        endDate
      );

      total += revenue;
    } else {
      // Tester: engångsbetalning
      total += entry.price;
    }
  });

  return total;
};


