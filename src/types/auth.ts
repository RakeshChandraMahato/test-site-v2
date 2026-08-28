export type UserRole = 'owner' | 'manager' | 'staff' | 'viewer';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  createdAt: string;
}

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  isOwner: boolean;
  canEditRates: boolean;
  canViewProfits: boolean;
  canPostTransactions: boolean;
}
