import React, { createContext, useContext, useEffect, useState } from 'react';
import type { UserRole } from '../types';
import { type UserProfile } from '../entities/userProfile';
import { readAuthToken, readStoredAuthSession, readStoredRole } from '../auth/authSessionStorage';
import { safeStorageSet } from '../shared/storage/safeStorage';

interface AuthSessionContextValue {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  role: UserRole;
  setRoleState: React.Dispatch<React.SetStateAction<UserRole>>;
  authInitializing: boolean;
  setAuthInitializing: React.Dispatch<React.SetStateAction<boolean>>;
}

const AuthSessionContext = createContext<AuthSessionContextValue | undefined>(undefined);

export const AuthSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(() => readStoredAuthSession() ?? {
    email: '',
    name: '',
    avatarUrl: '',
    phone: '',
    locality: 'Main Bazaar & Clock Tower',
    role: 'buyer',
    isSignedIn: false,
    phoneVerified: false,
    emailVerified: false,
  });
  const [role, setRoleState] = useState<UserRole>(() => readStoredRole());
  const [authInitializing, setAuthInitializing] = useState(() => {
    if (typeof window === 'undefined') return false;
    const hasPortalHandoff = new URLSearchParams(window.location.search).has('sso_code')
      || new URLSearchParams(window.location.hash.slice(1)).has('sso_code');
    // Never render a cached signed-in profile until its bearer token is checked
    // against the backend. A profile in localStorage is not an authentication proof.
    return hasPortalHandoff || Boolean(readAuthToken() || readStoredAuthSession());
  });

  // Keep the signed-in profile and the active non-admin role in sync, as before.
  useEffect(() => {
    if (user.isSignedIn && user.role && user.role !== 'admin') {
      setRoleState(user.role);
      safeStorageSet('kurali_role', user.role);
    }
  }, [user.isSignedIn, user.role]);

  return (
    <AuthSessionContext.Provider value={{ user, setUser, role, setRoleState, authInitializing, setAuthInitializing }}>
      {children}
    </AuthSessionContext.Provider>
  );
};

export const useAuthSession = (): AuthSessionContextValue => {
  const context = useContext(AuthSessionContext);
  if (!context) throw new Error('useAuthSession must be used within AuthSessionProvider');
  return context;
};
