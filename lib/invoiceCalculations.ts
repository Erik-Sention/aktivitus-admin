import { addMonths, endOfMonth } from 'date-fns';

/**
 * Beräknar nästa faktureringsdatum baserat på betalningsintervall och startdatum
 * Enligt specifikation:
 * - Månadsvis: Slutet av månaden från startdatum
 * - Kvartalsvis: 3 månader efter startdatum
 * - Halvårsvis: 6 månader efter startdatum
 * - Årlig: 12 månader efter startdatum
 * - Engångsbetalning: Startdatum (första fakturan)
 * @param startDate Startdatum för tjänsten
 * @param billingInterval Betalningsintervall
 * @returns Nästa faktureringsdatum
 */
export const calculateNextInvoiceDate = (
  startDate: Date,
  billingInterval?: string
): Date | undefined => {
  if (!billingInterval) {
    return undefined;
  }

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  switch (billingInterval) {
    case 'Månadsvis':
      // Slutet av månaden från startdatum
      return endOfMonth(start);
    
    case 'Kvartalsvis':
      // 3 månader efter startdatum
      return endOfMonth(addMonths(start, 3));
    
    case 'Halvårsvis':
      // 6 månader efter startdatum
      return endOfMonth(addMonths(start, 6));
    
    case 'Årlig':
      // 12 månader efter startdatum
      return endOfMonth(addMonths(start, 12));
    
    case 'Engångsbetalning':
      // Första fakturan vid startdatum
      return start;
    
    default:
      // Standard: månadsvis
      return endOfMonth(start);
  }
};

/**
 * Beräknar fakturabelopp baserat på betalningsintervall och månadspris
 * @param monthlyPrice Månadspris
 * @param billingInterval Betalningsintervall
 * @returns Fakturabelopp
 */
export const calculateInvoiceAmount = (
  monthlyPrice: number,
  billingInterval?: string
): number => {
  if (!billingInterval) {
    return monthlyPrice;
  }

  switch (billingInterval) {
    case 'Kvartalsvis':
      return monthlyPrice * 3;
    
    case 'Halvårsvis':
      return monthlyPrice * 6;
    
    case 'Årlig':
      return monthlyPrice * 12;
    
    case 'Engångsbetalning':
    case 'Månadsvis':
    default:
      return monthlyPrice;
  }
};

