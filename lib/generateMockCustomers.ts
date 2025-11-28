// Generera mockdata för kunder med memberships och tester
import { Customer, ServiceEntry, MembershipType, TestType, Status, Place, Sport, PaymentMethod, InvoiceStatus, BillingInterval } from '@/types';
import { MEMBERSHIPS, TESTS, PLACES, SPORTS, COACHES, SERVICE_BASE_PRICES } from './constants';

// Hjälpfunktioner
const randomItem = <T>(array: T[]): T => array[Math.floor(Math.random() * array.length)];
const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDate = (start: Date, end: Date): Date => {
  const startTime = start.getTime();
  const endTime = end.getTime();
  return new Date(startTime + Math.random() * (endTime - startTime));
};

// Svenska förnamn
const firstNames = [
  'Erik', 'Anna', 'Marcus', 'Sara', 'Johan', 'Emma', 'Anders', 'Lisa', 'Daniel', 'Maria',
  'Petter', 'Elin', 'Magnus', 'Julia', 'Fredrik', 'Sofia', 'Henrik', 'Amanda', 'Jonas', 'Ida',
  'Martin', 'Hanna', 'Andreas', 'Malin', 'Niklas', 'Jenny', 'Patrik', 'Karin', 'Stefan', 'Linda',
  'Mikael', 'Camilla', 'Oskar', 'Emilia', 'Tobias', 'Sandra', 'Emil', 'Frida', 'Alexander', 'Nina',
  'David', 'Johanna', 'Christian', 'Elisabeth', 'Mattias', 'Cecilia', 'Per', 'Katarina', 'Lars', 'Annika',
  'Björn', 'Kristina', 'Ludvig', 'Helena', 'Rasmus', 'Viktoria', 'Sebastian', 'Louise', 'Filip', 'Elin',
  'Gustav', 'Maja', 'Viktor', 'Alice', 'Isak', 'Klara', 'Hugo', 'Ellen', 'Noah', 'Moa',
  'Lucas', 'Alva', 'William', 'Olivia', 'Elias', 'Nora', 'Axel', 'Lilly', 'Olle', 'Stella',
  'Albin', 'Ella', 'Leo', 'Maya', 'Max', 'Alma', 'Felix', 'Elsa', 'Arvid', 'Agnes',
  'Edvin', 'Mira', 'Vincent', 'Lova', 'Theo', 'Selma', 'Liam', 'Signe', 'Benjamin', 'Tilde',
  'Adrian', 'Liv', 'Oliver', 'Saga', 'Melvin', 'Tyra', 'Alfred', 'Hedda', 'Viggo', 'Freja',
  'Elliot', 'Ebba', 'Anton', 'Wilma', 'Isac', 'Nellie', 'Hampus', 'Elvira', 'Linus', 'Astrid',
  'Vilgot', 'Ingrid', 'Love', 'Siri', 'Sixten', 'Majken', 'Joel', 'Klara', 'Nils', 'Linnea',
];

// Svenska efternamn
const lastNames = [
  'Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Persson',
  'Svensson', 'Gustafsson', 'Pettersson', 'Jonsson', 'Jansson', 'Hansson', 'Bengtsson',
  'Berg', 'Lundberg', 'Lindberg', 'Lindström', 'Lindqvist', 'Holm', 'Bergström', 'Sjöberg',
  'Ek', 'Sandberg', 'Nyström', 'Holmberg', 'Forsberg', 'Lindgren', 'Engström', 'Berglund',
  'Håkansson', 'Månsson', 'Norberg', 'Eklund', 'Lundqvist', 'Bergman', 'Ström', 'Åberg',
  'Sundberg', 'Hermansson', 'Björk', 'Nordström', 'Lundin', 'Gunnarsson', 'Bergqvist', 'Wallin',
  'Dahl', 'Berggren', 'Falk', 'Lundgren', 'Hedlund', 'Blom', 'Söderberg', 'Nyberg',
  'Holmgren', 'Abrahamsson', 'Mattsson', 'Isaksson', 'Öberg', 'Lind', 'Hedberg', 'Danielsson',
];

const generateFirstName = (): string => {
  return randomItem(firstNames);
};

const generateLastName = (): string => {
  return randomItem(lastNames);
};

const generateName = (): string => {
  return `${randomItem(firstNames)} ${randomItem(lastNames)}`;
};

const generateEmail = (name: string): string => {
  const parts = name.toLowerCase().split(' ');
  const firstName = parts[0];
  const lastName = parts[1];
  const domains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.se', 'live.se'];
  const variations = [
    `${firstName}.${lastName}@${randomItem(domains)}`,
    `${firstName}${lastName}@${randomItem(domains)}`,
    `${firstName}${randomInt(1, 99)}@${randomItem(domains)}`,
    `${firstName}_${lastName}@${randomItem(domains)}`
  ];
  return randomItem(variations);
};

const generatePhone = (): string => {
  const prefixes = ['070', '071', '072', '073', '076', '079'];
  return `+46${randomItem(prefixes)}${randomInt(100000, 999999)}`;
};

// Hjälpfunktion för att beräkna minimitid för memberships
const getMembershipMinimumMonths = (serviceName: string): number => {
  if (serviceName.includes('Supreme')) {
    return 1; // Supreme: 1 månad minimum
  } else if (serviceName.includes('Premium')) {
    return 2; // Premium: 2 månader minimum
  } else if (serviceName.includes('Standard') || serviceName.includes('BAS')) {
    return 4; // Standard: 4 månader minimum
  } else if (serviceName.includes('Iform') && serviceName.includes('4 mån')) {
    return 4; // Iform: 4 månader
  }
  return 1; // Default: 1 månad
};

// Generera service history - distribution: 70% har 1 tjänst, 25% har 2 tjänster, 5% har 3 tjänster
const generateServiceHistory = (
  startDate: Date,
  endDate: Date,
  sport: Sport,
  coach: string
): ServiceEntry[] => {
  const history: ServiceEntry[] = [];
  let currentDate = new Date(startDate);
  const now = new Date();
  
  // Beräkna hur länge kunden har varit med (i månader)
  const monthsSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
  
  // Bestäm antal tester baserat på distribution:
  // 70% har 0 tester (bara membership)
  // 25% har 1 test (membership + 1 test)
  // 5% har 2 tester (membership + 2 tester)
  const randomValue = Math.random();
  let numTests: number;
  if (randomValue < 0.7) {
    numTests = 0; // 70% - bara membership
  } else if (randomValue < 0.95) {
    numTests = 1; // 25% - membership + 1 test
  } else {
    numTests = 2; // 5% - membership + 2 tester
  }
  
  // Test-options
  const testOptions: TestType[] = [
    'Tröskeltest',
    'Tröskeltest + VO2max',
    'Tröskeltest Triathlon',
    'Tröskeltest Triathlon + VO2max',
    'VO2max fristående',
    'Funktionsanalys',
    'Teknikanalys',
    'Hälsopaket',
  ];
  
  // Membership-options
  const commonMemberships: MembershipType[] = [
    'Membership Standard',
    'Membership Standard TRI/OCR/MULTI',
    'Membership Premium',
    'Membership Premium TRI/OCR/MULTI',
    'Membership Supreme',
    'Membership Supreme TRI/OCR/MULTI',
    'Membership Aktivitus Iform 4 mån',
    'Membership BAS',
    'Membership Utan tester',
  ];
  
  // Bestäm om tester ska komma före eller efter membership
  // 50% börjar med test, 50% börjar med membership
  const startsWithTest = Math.random() < 0.5;
  
  // Lägg till tester först om kunden börjar med test
  if (startsWithTest && numTests > 0) {
    for (let i = 0; i < numTests; i++) {
      const serviceId = `service_${Date.now()}_${i}_${Math.random()}`;
      const test = randomItem(testOptions);
      const basePrice = SERVICE_BASE_PRICES[test] || 1890;
      const price = basePrice + randomInt(-50, 100);
      
      const entry: ServiceEntry = {
        id: serviceId,
        service: test,
        price: price,
        date: new Date(currentDate),
        status: 'Genomförd',
        endDate: new Date(currentDate),
        sport: sport,
        coach: coach,
        paymentMethod: Math.random() < 0.7 ? 'Swish' : 'Faktura',
        invoiceStatus: 'Betald',
        billingInterval: 'Engångsbetalning',
      };
      
      history.push(entry);
      
      // Nästa tjänst börjar efter testet (7-90 dagar senare)
      currentDate = new Date(currentDate.getTime() + randomInt(7, 90) * 24 * 60 * 60 * 1000);
    }
  }
  
  // Lägg till membership (alltid en)
  const serviceId = `service_${Date.now()}_membership_${Math.random()}`;
  let membership = randomItem(commonMemberships);
  const basePrice = SERVICE_BASE_PRICES[membership] || 1195;
  const price = basePrice + randomInt(-50, 100);
  
  // Beräkna korrekt slutdatum baserat på minimitid
  const minimumMonths = getMembershipMinimumMonths(membership);
  const membershipEndDate = new Date(currentDate);
  membershipEndDate.setMonth(membershipEndDate.getMonth() + minimumMonths);
  
  // Bestäm status baserat på hur länge kunden har varit med:
  // Om de har varit med max 4 månader: mestadels aktiv (80% aktiv)
  // Om de har varit med 4-24 månader: blandat (60% aktiv)
  // Om de har varit med över 24 månader: mestadels inaktiv (20% aktiv)
  let status: Status;
  let endDateValue: Date | undefined;
  
  if (monthsSinceStart <= 4) {
    // Nyligen startade - mestadels aktiva
    status = Math.random() < 0.8 ? 'Aktiv' : (Math.random() < 0.5 ? 'Inaktiv' : 'Pausad');
  } else if (monthsSinceStart <= 24) {
    // Mellan 4-24 månader - blandat
    status = Math.random() < 0.6 ? 'Aktiv' : (Math.random() < 0.5 ? 'Inaktiv' : 'Pausad');
  } else {
    // Över 24 månader - mestadels inaktiva
    status = Math.random() < 0.2 ? 'Aktiv' : (Math.random() < 0.5 ? 'Inaktiv' : 'Pausad');
  }
  
  if (status === 'Aktiv') {
    // För aktiva memberships, sätt slutdatum till framtiden baserat på minimitid
    endDateValue = membershipEndDate;
    // Om slutdatum är i det förflutna, lägg till minimitid från nu
    if (endDateValue < now) {
      endDateValue = new Date(now);
      endDateValue.setMonth(endDateValue.getMonth() + minimumMonths);
    }
  } else {
    // För inaktiva/pausade memberships, sätt slutdatum till det förflutna
    // Men se till att det är efter startdatum och före nu
    const maxEndDate = new Date(Math.min(membershipEndDate.getTime(), now.getTime()));
    endDateValue = randomDate(currentDate, maxEndDate);
  }
  
  const paymentMethods: PaymentMethod[] = ['Autogiro', 'Faktura', 'Swish', 'Förskottsbetalning'];
  const billingIntervals: BillingInterval[] = ['Månadsvis', 'Kvartalsvis', 'Halvårsvis', 'Årlig'];
  const invoiceStatuses: InvoiceStatus[] = ['Betald', 'Väntar på betalning', 'Förfallen'];
  
  const membershipEntry: ServiceEntry = {
    id: serviceId,
    service: membership,
    price: price,
    date: new Date(currentDate),
    status: status,
    endDate: endDateValue,
    sport: sport,
    coach: coach,
    paymentMethod: randomItem(paymentMethods),
    invoiceStatus: status === 'Aktiv' ? randomItem(invoiceStatuses) : 'Betald',
    billingInterval: randomItem(billingIntervals),
    numberOfMonths: minimumMonths,
  };
  
  history.push(membershipEntry);
  
  // Lägg till tester efter membership om vi inte redan lagt till alla tester
  if (!startsWithTest && numTests > 0) {
    const testsAlreadyAdded = history.filter(h => h.status === 'Genomförd').length;
    const testsToAdd = numTests - testsAlreadyAdded;
    
    for (let i = 0; i < testsToAdd; i++) {
      currentDate = new Date(currentDate.getTime() + randomInt(30, 180) * 24 * 60 * 60 * 1000);
      
      const testServiceId = `service_${Date.now()}_test_${i}_${Math.random()}`;
      const test = randomItem(testOptions);
      const testBasePrice = SERVICE_BASE_PRICES[test] || 1890;
      const testPrice = testBasePrice + randomInt(-50, 100);
      
      const testEntry: ServiceEntry = {
        id: testServiceId,
        service: test,
        price: testPrice,
        date: new Date(currentDate),
        status: 'Genomförd',
        endDate: new Date(currentDate),
        sport: sport,
        coach: coach,
        paymentMethod: Math.random() < 0.7 ? 'Swish' : 'Faktura',
        invoiceStatus: 'Betald',
        billingInterval: 'Engångsbetalning',
      };
      
      history.push(testEntry);
    }
  }
  
  return history;
};

// Generera en kund
const generateCustomer = (index: number, startDate: Date, endDate: Date): Customer => {
  const firstName = generateFirstName();
  const lastName = generateLastName();
  const fullName = `${firstName} ${lastName}`;
  const email = generateEmail(fullName);
  const phone = Math.random() < 0.8 ? generatePhone() : undefined;
  const place = randomItem(PLACES);
  const coach = randomItem(COACHES);
  const sport = randomItem(SPORTS);
  
  // Bestäm kundens startdatum baserat på distribution:
  // 70% har varit med max 4 månader
  // 25% har varit med mellan 4-24 månader
  // 5% har varit med över 24 månader
  const now = new Date();
  const randomValue = Math.random();
  let customerStartDate: Date;
  
  if (randomValue < 0.7) {
    // 70% - startade inom de senaste 4 månaderna
    const fourMonthsAgo = new Date(now);
    fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);
    customerStartDate = randomDate(fourMonthsAgo, now);
  } else if (randomValue < 0.95) {
    // 25% - startade mellan 4-24 månader sedan
    const fourMonthsAgo = new Date(now);
    fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);
    const twentyFourMonthsAgo = new Date(now);
    twentyFourMonthsAgo.setMonth(twentyFourMonthsAgo.getMonth() - 24);
    customerStartDate = randomDate(twentyFourMonthsAgo, fourMonthsAgo);
  } else {
    // 5% - startade över 24 månader sedan
    const twentyFourMonthsAgo = new Date(now);
    twentyFourMonthsAgo.setMonth(twentyFourMonthsAgo.getMonth() - 24);
    customerStartDate = randomDate(startDate, twentyFourMonthsAgo);
  }
  
  const serviceHistory = generateServiceHistory(customerStartDate, endDate, sport, coach);
  
  // Huvudtjänst är membership (den finns alltid i historiken)
  const mainService = serviceHistory.find(h => h.service.includes('Membership')) || serviceHistory[serviceHistory.length - 1] || serviceHistory[0];
  const mainStatus = mainService?.status || 'Aktiv';
  
  return {
    id: `customer_${index}`,
    firstName: firstName,
    lastName: lastName,
    name: fullName, // Bakåtkompatibilitet
    email: email,
    phone: phone,
    date: customerStartDate,
    place: place,
    coach: coach,
    service: mainService?.service || randomItem(MEMBERSHIPS),
    status: mainStatus as Status,
    price: mainService?.price || SERVICE_BASE_PRICES[mainService?.service || 'Membership Standard'] || 1195,
    sport: sport,
    isSeniorCoach: Math.random() < 0.15,
    history: [],
    serviceHistory: serviceHistory,
    createdAt: customerStartDate,
    updatedAt: randomDate(customerStartDate, endDate),
  };
};

// Generera alla mockkunder
export const generateMockCustomers = (count: number = 100): Customer[] => {
  const customers: Customer[] = [];
  const startDate = new Date('2020-01-01');
  const endDate = new Date(); // Idag
  
  for (let i = 0; i < count; i++) {
    customers.push(generateCustomer(i, startDate, endDate));
  }
  
  return customers;
};

