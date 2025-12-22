import { createContext, useContext } from 'react';

export type AppUserProfile = {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name_ar?: string;
  avatar_url?: string | null;
  phone?: string | null;
  department?: string | null;
  roles?: string[];
  created_at?: string;
  updated_at?: string;
};

export interface UserProfileContextValue {
  profile: AppUserProfile | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<AppUserProfile>) => Promise<void>;
  getRoleDisplayName: (role: string) => string;
  hasRole: (role: string) => boolean;
  isSuperAdmin: () => boolean;
}

export const UserProfileContext = createContext<UserProfileContextValue | undefined>(undefined);

export const useUserProfile = (): UserProfileContextValue => {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error('useUserProfile must be used within UserProfileProvider');
  return ctx;
};

export default UserProfileContext;
