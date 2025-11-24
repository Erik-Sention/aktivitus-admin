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

// Generera service history med olika memberships och tester över tid
const generateServiceHistory = (
  startDate: Date,
  endDate: Date,
  sport: Sport,
  coach: string
): ServiceEntry[] => {
  const history: ServiceEntry[] = [];
  let currentDate = new Date(startDate);
  const numServices = randomInt(1, 5); // 1-5 tjänster per kund
  
  for (let i = 0; i < numServices && currentDate <= endDate; i++) {
    const isMembership = i === numServices - 1 || Math.random() < 0.6; // Sista är oftast membership
    const serviceId = `service_${Date.now()}_${i}_${Math.random()}`;
    
    if (isMembership) {
      // Välj membership - använd vanliga memberships
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
      
      const membership = randomItem(commonMemberships);
      const basePrice = SERVICE_BASE_PRICES[membership] || 1195;
      const price = basePrice + randomInt(-50, 100);
      
      // Bestäm status
      let status: Status;
      let endDateValue: Date | undefined;
      
      if (i === numServices - 1) {
        // Sista tjänsten - kan vara aktiv eller nyligen avslutad
        status = Math.random() < 0.7 ? 'Aktiv' : (Math.random() < 0.5 ? 'Inaktiv' : 'Pausad');
        if (status !== 'Aktiv') {
          endDateValue = randomDate(currentDate, endDate);
        }
      } else {
        // Tidigare tjänster är alltid inaktiva/genomförda
        status = Math.random() < 0.7 ? 'Inaktiv' : 'Pausad';
        const serviceEndDate = randomDate(
          currentDate,
          new Date(Math.min(currentDate.getTime() + 365 * 24 * 60 * 60 * 1000, endDate.getTime()))
        );
        endDateValue = serviceEndDate;
        currentDate = new Date(serviceEndDate.getTime() + randomInt(1, 60) * 24 * 60 * 60 * 1000);
      }
      
      const paymentMethods: PaymentMethod[] = ['Autogiro', 'Faktura', 'Swish', 'Förskottsbetalning'];
      const billingIntervals: BillingInterval[] = ['Månadsvis', 'Kvartalsvis', 'Halvårsvis', 'Årlig'];
      const invoiceStatuses: InvoiceStatus[] = ['Betald', 'Väntar på betalning', 'Förfallen'];
      
      const entry: ServiceEntry = {
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
        numberOfMonths: randomItem(billingIntervals) === 'Månadsvis' ? 1 : 
                        randomItem(billingIntervals) === 'Kvartalsvis' ? 3 :
                        randomItem(billingIntervals) === 'Halvårsvis' ? 6 : 12,
      };
      
      history.push(entry);
      
      // Nästa tjänst börjar efter denna slutat (eller direkt om aktiv)
      if (status === 'Aktiv') {
        break; // Sluta om aktiv
      }
      currentDate = new Date(endDateValue!.getTime() + randomInt(1, 90) * 24 * 60 * 60 * 1000);
    } else {
      // Test
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
      
      const test = randomItem(testOptions);
      const basePrice = SERVICE_BASE_PRICES[test] || 1890;
      const price = basePrice + randomInt(-50, 100);
      
      const entry: ServiceEntry = {
        id: serviceId,
        service: test,
        price: price,
        date: new Date(currentDate),
        status: 'Genomförd',
        sport: sport,
        coach: coach,
        paymentMethod: Math.random() < 0.7 ? 'Swish' : 'Faktura',
        invoiceStatus: 'Betald',
        billingInterval: 'Engångsbetalning',
      };
      
      history.push(entry);
      
      // Nästa tjänst börjar efter testet
      currentDate = new Date(currentDate.getTime() + randomInt(7, 90) * 24 * 60 * 60 * 1000);
    }
  }
  
  return history;
};

// Generera en kund
const generateCustomer = (index: number, startDate: Date, endDate: Date): Customer => {
  const name = generateName();
  const email = generateEmail(name);
  const phone = Math.random() < 0.8 ? generatePhone() : undefined;
  const place = randomItem(PLACES);
  const coach = randomItem(COACHES);
  const sport = randomItem(SPORTS);
  
  // Bestäm om kunden börjar med test eller membership
  const startsWithTest = Math.random() < 0.3;
  const customerStartDate = randomDate(startDate, endDate);
  
  const serviceHistory = generateServiceHistory(customerStartDate, endDate, sport, coach);
  
  // Huvudtjänst är den sista i historiken (eller första om ingen historik)
  const mainService = serviceHistory[serviceHistory.length - 1] || serviceHistory[0];
  const mainStatus = mainService?.status || (startsWithTest ? 'Genomförd' : 'Aktiv');
  
  return {
    id: `customer_${index}`,
    name: name,
    email: email,
    phone: phone,
    date: customerStartDate,
    place: place,
    coach: coach,
    service: mainService?.service || (startsWithTest ? randomItem(TESTS) : randomItem(MEMBERSHIPS)),
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
export const generateMockCustomers = (count: number = 200): Customer[] => {
  const customers: Customer[] = [];
  const startDate = new Date('2020-01-01');
  const endDate = new Date(); // Idag
  
  for (let i = 0; i < count; i++) {
    customers.push(generateCustomer(i, startDate, endDate));
  }
  
  return customers;
};

