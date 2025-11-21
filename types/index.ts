// Datamodeller för Aktivitus Faktureringsverktyg

export type UserRole = 'admin' | 'coach' | 'platschef';

export type Place = 
  | 'Stockholm'
  | 'Göteborg'
  | 'Malmö'
  | 'Linköping'
  | 'Falun'
  | 'Åre';

export type Coach = string;

export type Status = 
  | 'Aktiv'
  | 'Inaktiv'
  | 'Pausad'
  | 'Genomförd';

export type PaymentMethod =
  | 'Autogiro'
  | 'Faktura'
  | 'Swish'
  | 'Förskottsbetalning'
  | 'Klarna';

export type InvoiceStatus =
  | 'Betald'
  | 'Väntar på betalning'
  | 'Förfallen'
  | 'Påminnelse skickad'
  | 'Ej betald efter påminnelse'
  | 'Överlämnad till inkasso'
  | 'Betalning avvisad'
  | 'Ej aktuell';

export type PaymentStatus =
  | 'Betald'
  | 'Väntar på fullständig faktureringsinfo'
  | 'Väntar på utbetalning'
  | 'Delvis betald'
  | 'Avbruten'
  | 'Ej aktuell';

export type BillingInterval =
  | 'Månadsvis'
  | 'Kvartalsvis'
  | 'Halvårsvis'
  | 'Årlig'
  | 'Engångsbetalning';

export type Sport = 
  | 'Löpning'
  | 'Cykel'
  | 'Triathlon'
  | 'Skidor'
  | 'Hyrox'
  | 'OCR'
  | 'Swimrun'
  | 'Klassikern'
  | 'Multisport';

export type MembershipType =
  | 'Membership Standard'
  | 'Membership Standard TRI/OCR/MULTI'
  | 'Programskrivning Membership Standard'
  | 'Membership Premium'
  | 'Membership Premium TRI/OCR/MULTI'
  | 'Membership Supreme'
  | 'Membership Supreme TRI/OCR/MULTI'
  | 'Membership Life'
  | 'Membership Aktivitus Iform 4 mån'
  | 'Membership Aktivitus Iform Tillägg till MS 4 mån'
  | 'Membership Iform Extra månad'
  | 'Membership Aktivitus Iform Fortsättning'
  | 'Membership BAS'
  | 'Membership Avslut NOTERA SLUTDATUM'
  | 'Save - Samtal - Standard'
  | 'Membership Utan tester'
  | 'Membership Uppstart Coaching -  Test redan gjort och betalt'
  | 'Konvertering från test till membership - Till kollega'
  | 'Iform innan prisjusteringen - Sista testmomenten 2,5 h'
  | 'Iform uppstart/återtest/coachtimme MS utförd av någon annan - Minus 1 h tid'
  | 'Iform uppstart/återtest/coachtimme MS utförd till någon annan - Plus 1 h tid';

export type TestType =
  | 'Tröskeltest'
  | 'Tröskeltest + VO2max'
  | 'Tröskeltest Triathlon'
  | 'Tröskeltest Triathlon + VO2max'
  | 'VO2max fristående'
  | 'VO2max tillägg'
  | 'Wingate fristående'
  | 'Wingatetest tillägg'
  | 'Styrketest tillägg'
  | 'Teknikanalys tillägg'
  | 'Teknikanalys'
  | 'Funktionsanalys'
  | 'Funktions- och löpteknikanalys'
  | 'Hälsopaket'
  | 'Sommardubbel'
  | 'Sommardubbel Tri'
  | 'Träningsprogram Sommardubbel 1500kr'
  | 'Personlig Träning 1 - Betald yta'
  | 'Personlig Träning 1 - Gratis yta'
  | 'Personlig Träning 5'
  | 'Personlig Träning 10'
  | 'Personlig Träning 20'
  | 'PT-Klipp - Betald yta'
  | 'PT-Klipp - Gratis yta'
  | 'Konvertering från test till PT20 - Till kollega'
  | 'Sen avbokning'
  | 'Kroppss fett% tillägg'
  | 'Kroppss fett% fristående'
  | 'Blodanalys'
  | 'Hb endast'
  | 'Glucos endast'
  | 'Blodfetter'
  | 'Kostregistrering'
  | 'Kostrådgivning'
  | 'Natriumanalys (Svettest)';

export type ServiceType = MembershipType | TestType;

export interface HistoryEntry {
  field: string;
  from: string;
  to: string;
  date: Date;
  changedBy?: string;
}

export interface ServiceEntry {
  id: string;
  service: ServiceType;
  price: number;
  originalPrice?: number;
  discount?: number;
  priceNote?: string;
  date: Date;
  status: Status;
  endDate?: Date; // Slutdatum för memberships som avslutats
  sport?: Sport; // Gren för tjänsten (obligatorisk för memberships)
  coach?: string; // Coach för denna specifika tjänst
  // Betalningsinformation per tjänst
  paymentMethod?: PaymentMethod;
  invoiceStatus?: InvoiceStatus;
  billingInterval?: BillingInterval; // Hur ofta ska faktureras
  numberOfMonths?: number; // Antal månader (för förskottsbetalning eller avtalslängd)
  nextInvoiceDate?: Date;
  paidUntil?: Date; // För förskottsbetalning
  invoiceReference?: string; // OCR-nummer, fakturanummer etc.
  invoiceNote?: string; // Fri notering för fakturering
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  date: Date;
  place: Place;
  coach: Coach;
  isSeniorCoach?: boolean;
  service: ServiceType;
  status: Status;
  price: number;
  sport: Sport;
  history?: HistoryEntry[];
  serviceHistory?: ServiceEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardStats {
  totalMembers: number;
  totalTests: number;
  activeMembers: number;
  monthlyRevenue: number;
  membersByPlace: Record<Place, number>;
  serviceDistribution: Record<string, number>;
  monthlyTrend: { month: string; members: number; tests: number }[];
}

export interface FormData {
  name: string;
  email: string;
  date: string;
  place: Place;
  coach: string;
  service: ServiceType;
  status: Status;
  price: string;
  sport: Sport;
}

