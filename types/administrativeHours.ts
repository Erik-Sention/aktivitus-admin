// Typer för administrativa timmar

export interface AdministrativeHour {
  id: string;
  coachName: string;
  date: Date;
  hours: number;
  description: string;
  category?: string; // Kategori som "Save samtal", "Avbokning", "Membership avslut", etc.
  createdAt: Date;
  createdBy: string; // Email eller user ID
}

export type AdministrativeCategory = 
  | 'Save samtal'
  | 'Avbokning'
  | 'Membership avslut'
  | 'Kundkontakt'
  | 'Administration'
  | 'Annat';

