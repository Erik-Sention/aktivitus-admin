// User Profile - för alla användare i systemet

import { UserRole } from './index';

export interface UserProfile {
  email: string; // Primärnyckel
  displayName: string; // Namnet som visas i systemet
  role?: UserRole;
  phone?: string;
  linkedCoach?: string; // Namnet på coachen som användaren är kopplad till (om coach)
  createdAt: Date;
  updatedAt: Date;
}

