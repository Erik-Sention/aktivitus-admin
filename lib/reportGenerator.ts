// Rapportgenerator för olika typer av rapporter
import { Customer, ServiceEntry, Place } from '@/types';
import { isMembershipService, isTestService } from './constants';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

export type ReportType = 'Månadsrapport' | 'Kvartalsrapport' | 'Årsrapport' | 'Anpassad';

export interface Report {
  id: string;
  name: string;
  date: string;
  type: ReportType;
  size: string;
  startDate?: string;
  endDate?: string;
  data: any;
  createdAt: Date;
}

// Generera månadsrapport
export const generateMonthlyReport = (
  customers: Customer[],
  year: number,
  month: number,
  selectedPlaces?: string[]
): any => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  let filteredCustomers = customers;
  if (selectedPlaces && selectedPlaces.length > 0) {
    filteredCustomers = filteredCustomers.filter(c => selectedPlaces.includes(c.place));
  }

  const reportData = {
    period: `${format(startDate, 'MMMM yyyy', { locale: sv })}`,
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
    summary: {
      totalCustomers: 0,
      activeMemberships: 0,
      completedTests: 0,
      totalRevenue: 0,
      revenueByService: {} as Record<string, number>,
      revenueByPlace: {} as Record<string, number>,
    },
    customers: [] as any[],
  };

  filteredCustomers.forEach((customer) => {
    // Kolla huvudtjänsten
    const customerDate = new Date(customer.date);
    customerDate.setHours(0, 0, 0, 0);

    if (customerDate >= startDate && customerDate <= endDate) {
      reportData.summary.totalCustomers++;
      
      if (isMembershipService(customer.service) && customer.status === 'Aktiv') {
        reportData.summary.activeMemberships++;
        reportData.summary.totalRevenue += customer.price;
        reportData.summary.revenueByService[customer.service] = 
          (reportData.summary.revenueByService[customer.service] || 0) + customer.price;
        reportData.summary.revenueByPlace[customer.place] = 
          (reportData.summary.revenueByPlace[customer.place] || 0) + customer.price;
      } else if (isTestService(customer.service)) {
        reportData.summary.completedTests++;
        reportData.summary.totalRevenue += customer.price;
        reportData.summary.revenueByService[customer.service] = 
          (reportData.summary.revenueByService[customer.service] || 0) + customer.price;
        reportData.summary.revenueByPlace[customer.place] = 
          (reportData.summary.revenueByPlace[customer.place] || 0) + customer.price;
      }

      reportData.customers.push({
        name: customer.name,
        email: customer.email,
        place: customer.place,
        coach: customer.coach,
        service: customer.service,
        status: customer.status,
        price: customer.price,
        date: format(customerDate, 'yyyy-MM-dd'),
      });
    }

    // Kolla serviceHistory
    if (customer.serviceHistory && customer.serviceHistory.length > 0) {
      customer.serviceHistory.forEach((serviceEntry: ServiceEntry) => {
        const serviceDate = new Date(serviceEntry.date);
        serviceDate.setHours(0, 0, 0, 0);

        if (serviceDate >= startDate && serviceDate <= endDate) {
          if (isMembershipService(serviceEntry.service) && serviceEntry.status === 'Aktiv') {
            reportData.summary.activeMemberships++;
            reportData.summary.totalRevenue += serviceEntry.price;
            reportData.summary.revenueByService[serviceEntry.service] = 
              (reportData.summary.revenueByService[serviceEntry.service] || 0) + serviceEntry.price;
            reportData.summary.revenueByPlace[customer.place] = 
              (reportData.summary.revenueByPlace[customer.place] || 0) + serviceEntry.price;
          } else if (isTestService(serviceEntry.service)) {
            reportData.summary.completedTests++;
            reportData.summary.totalRevenue += serviceEntry.price;
            reportData.summary.revenueByService[serviceEntry.service] = 
              (reportData.summary.revenueByService[serviceEntry.service] || 0) + serviceEntry.price;
            reportData.summary.revenueByPlace[customer.place] = 
              (reportData.summary.revenueByPlace[customer.place] || 0) + serviceEntry.price;
          }
        }
      });
    }
  });

  return reportData;
};

// Generera kvartalsrapport
export const generateQuarterlyReport = (
  customers: Customer[],
  year: number,
  quarter: number,
  selectedPlaces?: string[]
): any => {
  const startMonth = (quarter - 1) * 3;
  const startDate = new Date(year, startMonth, 1);
  const endDate = new Date(year, startMonth + 3, 0, 23, 59, 59);
  
  let filteredCustomers = customers;
  if (selectedPlaces && selectedPlaces.length > 0) {
    filteredCustomers = filteredCustomers.filter(c => selectedPlaces.includes(c.place));
  }

  const reportData = {
    period: `Q${quarter} ${year}`,
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
    summary: {
      totalCustomers: 0,
      activeMemberships: 0,
      completedTests: 0,
      totalRevenue: 0,
      revenueByService: {} as Record<string, number>,
      revenueByPlace: {} as Record<string, number>,
      monthlyBreakdown: {} as Record<string, any>,
    },
    customers: [] as any[],
  };

  // Generera månadsvis breakdown
  for (let m = startMonth; m < startMonth + 3; m++) {
    const monthStart = new Date(year, m, 1);
    const monthEnd = new Date(year, m + 1, 0, 23, 59, 59);
    const monthKey = format(monthStart, 'MMMM', { locale: sv });
    
    reportData.summary.monthlyBreakdown[monthKey] = {
      revenue: 0,
      customers: 0,
      tests: 0,
      memberships: 0,
    };
  }

  filteredCustomers.forEach((customer) => {
    const customerDate = new Date(customer.date);
    customerDate.setHours(0, 0, 0, 0);

    if (customerDate >= startDate && customerDate <= endDate) {
      reportData.summary.totalCustomers++;
      const monthKey = format(customerDate, 'MMMM', { locale: sv });
      
      if (isMembershipService(customer.service) && customer.status === 'Aktiv') {
        reportData.summary.activeMemberships++;
        reportData.summary.totalRevenue += customer.price;
        reportData.summary.monthlyBreakdown[monthKey].revenue += customer.price;
        reportData.summary.monthlyBreakdown[monthKey].memberships++;
        reportData.summary.revenueByService[customer.service] = 
          (reportData.summary.revenueByService[customer.service] || 0) + customer.price;
        reportData.summary.revenueByPlace[customer.place] = 
          (reportData.summary.revenueByPlace[customer.place] || 0) + customer.price;
      } else if (isTestService(customer.service)) {
        reportData.summary.completedTests++;
        reportData.summary.totalRevenue += customer.price;
        reportData.summary.monthlyBreakdown[monthKey].revenue += customer.price;
        reportData.summary.monthlyBreakdown[monthKey].tests++;
        reportData.summary.revenueByService[customer.service] = 
          (reportData.summary.revenueByService[customer.service] || 0) + customer.price;
        reportData.summary.revenueByPlace[customer.place] = 
          (reportData.summary.revenueByPlace[customer.place] || 0) + customer.price;
      }

      reportData.customers.push({
        name: customer.name,
        email: customer.email,
        place: customer.place,
        coach: customer.coach,
        service: customer.service,
        status: customer.status,
        price: customer.price,
        date: format(customerDate, 'yyyy-MM-dd'),
      });
    }

    if (customer.serviceHistory && customer.serviceHistory.length > 0) {
      customer.serviceHistory.forEach((serviceEntry: ServiceEntry) => {
        const serviceDate = new Date(serviceEntry.date);
        serviceDate.setHours(0, 0, 0, 0);

        if (serviceDate >= startDate && serviceDate <= endDate) {
          const monthKey = format(serviceDate, 'MMMM', { locale: sv });
          
          if (isMembershipService(serviceEntry.service) && serviceEntry.status === 'Aktiv') {
            reportData.summary.activeMemberships++;
            reportData.summary.totalRevenue += serviceEntry.price;
            reportData.summary.monthlyBreakdown[monthKey].revenue += serviceEntry.price;
            reportData.summary.monthlyBreakdown[monthKey].memberships++;
            reportData.summary.revenueByService[serviceEntry.service] = 
              (reportData.summary.revenueByService[serviceEntry.service] || 0) + serviceEntry.price;
            reportData.summary.revenueByPlace[customer.place] = 
              (reportData.summary.revenueByPlace[customer.place] || 0) + serviceEntry.price;
          } else if (isTestService(serviceEntry.service)) {
            reportData.summary.completedTests++;
            reportData.summary.totalRevenue += serviceEntry.price;
            reportData.summary.monthlyBreakdown[monthKey].revenue += serviceEntry.price;
            reportData.summary.monthlyBreakdown[monthKey].tests++;
            reportData.summary.revenueByService[serviceEntry.service] = 
              (reportData.summary.revenueByService[serviceEntry.service] || 0) + serviceEntry.price;
            reportData.summary.revenueByPlace[customer.place] = 
              (reportData.summary.revenueByPlace[customer.place] || 0) + serviceEntry.price;
          }
        }
      });
    }
  });

  return reportData;
};

// Generera årsrapport
export const generateYearlyReport = (
  customers: Customer[],
  year: number,
  selectedPlaces?: string[]
): any => {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59);
  
  let filteredCustomers = customers;
  if (selectedPlaces && selectedPlaces.length > 0) {
    filteredCustomers = filteredCustomers.filter(c => selectedPlaces.includes(c.place));
  }

  const reportData = {
    period: `${year}`,
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
    summary: {
      totalCustomers: 0,
      activeMemberships: 0,
      completedTests: 0,
      totalRevenue: 0,
      revenueByService: {} as Record<string, number>,
      revenueByPlace: {} as Record<string, number>,
      quarterlyBreakdown: {} as Record<string, any>,
      monthlyBreakdown: {} as Record<string, any>,
    },
    customers: [] as any[],
  };

  // Generera månadsvis och kvartalsvis breakdown
  for (let m = 0; m < 12; m++) {
    const monthStart = new Date(year, m, 1);
    const monthKey = format(monthStart, 'MMMM', { locale: sv });
    
    reportData.summary.monthlyBreakdown[monthKey] = {
      revenue: 0,
      customers: 0,
      tests: 0,
      memberships: 0,
    };
  }

  for (let q = 1; q <= 4; q++) {
    reportData.summary.quarterlyBreakdown[`Q${q}`] = {
      revenue: 0,
      customers: 0,
      tests: 0,
      memberships: 0,
    };
  }

  filteredCustomers.forEach((customer) => {
    const customerDate = new Date(customer.date);
    customerDate.setHours(0, 0, 0, 0);

    if (customerDate >= startDate && customerDate <= endDate) {
      reportData.summary.totalCustomers++;
      const monthKey = format(customerDate, 'MMMM', { locale: sv });
      const quarter = Math.floor(customerDate.getMonth() / 3) + 1;
      const quarterKey = `Q${quarter}`;
      
      if (isMembershipService(customer.service) && customer.status === 'Aktiv') {
        reportData.summary.activeMemberships++;
        reportData.summary.totalRevenue += customer.price;
        reportData.summary.monthlyBreakdown[monthKey].revenue += customer.price;
        reportData.summary.monthlyBreakdown[monthKey].memberships++;
        reportData.summary.quarterlyBreakdown[quarterKey].revenue += customer.price;
        reportData.summary.quarterlyBreakdown[quarterKey].memberships++;
        reportData.summary.revenueByService[customer.service] = 
          (reportData.summary.revenueByService[customer.service] || 0) + customer.price;
        reportData.summary.revenueByPlace[customer.place] = 
          (reportData.summary.revenueByPlace[customer.place] || 0) + customer.price;
      } else if (isTestService(customer.service)) {
        reportData.summary.completedTests++;
        reportData.summary.totalRevenue += customer.price;
        reportData.summary.monthlyBreakdown[monthKey].revenue += customer.price;
        reportData.summary.monthlyBreakdown[monthKey].tests++;
        reportData.summary.quarterlyBreakdown[quarterKey].revenue += customer.price;
        reportData.summary.quarterlyBreakdown[quarterKey].tests++;
        reportData.summary.revenueByService[customer.service] = 
          (reportData.summary.revenueByService[customer.service] || 0) + customer.price;
        reportData.summary.revenueByPlace[customer.place] = 
          (reportData.summary.revenueByPlace[customer.place] || 0) + customer.price;
      }

      reportData.customers.push({
        name: customer.name,
        email: customer.email,
        place: customer.place,
        coach: customer.coach,
        service: customer.service,
        status: customer.status,
        price: customer.price,
        date: format(customerDate, 'yyyy-MM-dd'),
      });
    }

    if (customer.serviceHistory && customer.serviceHistory.length > 0) {
      customer.serviceHistory.forEach((serviceEntry: ServiceEntry) => {
        const serviceDate = new Date(serviceEntry.date);
        serviceDate.setHours(0, 0, 0, 0);

        if (serviceDate >= startDate && serviceDate <= endDate) {
          const monthKey = format(serviceDate, 'MMMM', { locale: sv });
          const quarter = Math.floor(serviceDate.getMonth() / 3) + 1;
          const quarterKey = `Q${quarter}`;
          
          if (isMembershipService(serviceEntry.service) && serviceEntry.status === 'Aktiv') {
            reportData.summary.activeMemberships++;
            reportData.summary.totalRevenue += serviceEntry.price;
            reportData.summary.monthlyBreakdown[monthKey].revenue += serviceEntry.price;
            reportData.summary.monthlyBreakdown[monthKey].memberships++;
            reportData.summary.quarterlyBreakdown[quarterKey].revenue += serviceEntry.price;
            reportData.summary.quarterlyBreakdown[quarterKey].memberships++;
            reportData.summary.revenueByService[serviceEntry.service] = 
              (reportData.summary.revenueByService[serviceEntry.service] || 0) + serviceEntry.price;
            reportData.summary.revenueByPlace[customer.place] = 
              (reportData.summary.revenueByPlace[customer.place] || 0) + serviceEntry.price;
          } else if (isTestService(serviceEntry.service)) {
            reportData.summary.completedTests++;
            reportData.summary.totalRevenue += serviceEntry.price;
            reportData.summary.monthlyBreakdown[monthKey].revenue += serviceEntry.price;
            reportData.summary.monthlyBreakdown[monthKey].tests++;
            reportData.summary.quarterlyBreakdown[quarterKey].revenue += serviceEntry.price;
            reportData.summary.quarterlyBreakdown[quarterKey].tests++;
            reportData.summary.revenueByService[serviceEntry.service] = 
              (reportData.summary.revenueByService[serviceEntry.service] || 0) + serviceEntry.price;
            reportData.summary.revenueByPlace[customer.place] = 
              (reportData.summary.revenueByPlace[customer.place] || 0) + serviceEntry.price;
          }
        }
      });
    }
  });

  return reportData;
};

// Generera anpassad rapport
export const generateCustomReport = (
  customers: Customer[],
  startDate: Date,
  endDate: Date,
  selectedPlaces?: string[]
): any => {
  let filteredCustomers = customers;
  if (selectedPlaces && selectedPlaces.length > 0) {
    filteredCustomers = filteredCustomers.filter(c => selectedPlaces.includes(c.place));
  }

  const reportData = {
    period: `${format(startDate, 'yyyy-MM-dd')} - ${format(endDate, 'yyyy-MM-dd')}`,
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
    summary: {
      totalCustomers: 0,
      activeMemberships: 0,
      completedTests: 0,
      totalRevenue: 0,
      revenueByService: {} as Record<string, number>,
      revenueByPlace: {} as Record<string, number>,
    },
    customers: [] as any[],
  };

  filteredCustomers.forEach((customer) => {
    const customerDate = new Date(customer.date);
    customerDate.setHours(0, 0, 0, 0);

    if (customerDate >= startDate && customerDate <= endDate) {
      reportData.summary.totalCustomers++;
      
      if (isMembershipService(customer.service) && customer.status === 'Aktiv') {
        reportData.summary.activeMemberships++;
        reportData.summary.totalRevenue += customer.price;
        reportData.summary.revenueByService[customer.service] = 
          (reportData.summary.revenueByService[customer.service] || 0) + customer.price;
        reportData.summary.revenueByPlace[customer.place] = 
          (reportData.summary.revenueByPlace[customer.place] || 0) + customer.price;
      } else if (isTestService(customer.service)) {
        reportData.summary.completedTests++;
        reportData.summary.totalRevenue += customer.price;
        reportData.summary.revenueByService[customer.service] = 
          (reportData.summary.revenueByService[customer.service] || 0) + customer.price;
        reportData.summary.revenueByPlace[customer.place] = 
          (reportData.summary.revenueByPlace[customer.place] || 0) + customer.price;
      }

      reportData.customers.push({
        name: customer.name,
        email: customer.email,
        place: customer.place,
        coach: customer.coach,
        service: customer.service,
        status: customer.status,
        price: customer.price,
        date: format(customerDate, 'yyyy-MM-dd'),
      });
    }

    if (customer.serviceHistory && customer.serviceHistory.length > 0) {
      customer.serviceHistory.forEach((serviceEntry: ServiceEntry) => {
        const serviceDate = new Date(serviceEntry.date);
        serviceDate.setHours(0, 0, 0, 0);

        if (serviceDate >= startDate && serviceDate <= endDate) {
          if (isMembershipService(serviceEntry.service) && serviceEntry.status === 'Aktiv') {
            reportData.summary.activeMemberships++;
            reportData.summary.totalRevenue += serviceEntry.price;
            reportData.summary.revenueByService[serviceEntry.service] = 
              (reportData.summary.revenueByService[serviceEntry.service] || 0) + serviceEntry.price;
            reportData.summary.revenueByPlace[customer.place] = 
              (reportData.summary.revenueByPlace[customer.place] || 0) + serviceEntry.price;
          } else if (isTestService(serviceEntry.service)) {
            reportData.summary.completedTests++;
            reportData.summary.totalRevenue += serviceEntry.price;
            reportData.summary.revenueByService[serviceEntry.service] = 
              (reportData.summary.revenueByService[serviceEntry.service] || 0) + serviceEntry.price;
            reportData.summary.revenueByPlace[customer.place] = 
              (reportData.summary.revenueByPlace[customer.place] || 0) + serviceEntry.price;
          }
        }
      });
    }
  });

  return reportData;
};

// Exportera rapport till CSV
export const exportReportToCSV = (reportData: any, reportName: string): void => {
  // Skapa CSV för sammanfattning
  const summaryRows = [
    ['Sammanfattning'],
    ['Period', reportData.period],
    ['Totalt antal kunder', reportData.summary.totalCustomers.toString()],
    ['Aktiva medlemskap', reportData.summary.activeMemberships.toString()],
    ['Genomförda tester', reportData.summary.completedTests.toString()],
    ['Total intäkt', `${reportData.summary.totalRevenue.toLocaleString('sv-SE')} kr`],
    [],
    ['Intäkter per tjänst'],
    ['Tjänst', 'Intäkt (kr)'],
    ...Object.entries(reportData.summary.revenueByService).map(([service, revenue]) => [
      service,
      (revenue as number).toLocaleString('sv-SE'),
    ]),
    [],
    ['Intäkter per ort'],
    ['Ort', 'Intäkt (kr)'],
    ...Object.entries(reportData.summary.revenueByPlace).map(([place, revenue]) => [
      place,
      (revenue as number).toLocaleString('sv-SE'),
    ]),
    [],
    ['Kunddetaljer'],
    ['Namn', 'E-post', 'Plats', 'Coach', 'Tjänst', 'Status', 'Pris (kr)', 'Datum'],
    ...reportData.customers.map((customer: any) => [
      customer.name,
      customer.email,
      customer.place,
      customer.coach,
      customer.service,
      customer.status,
      customer.price.toLocaleString('sv-SE'),
      customer.date,
    ]),
  ];

  const csvContent = summaryRows.map(row => row.join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${reportName.replace(/\s+/g, '_')}.csv`;
  link.click();
};

// Beräkna filstorlek (ungefärlig)
export const calculateReportSize = (reportData: any): string => {
  const jsonSize = JSON.stringify(reportData).length;
  const sizeInMB = (jsonSize / 1024 / 1024).toFixed(1);
  return `${sizeInMB} MB`;
};

