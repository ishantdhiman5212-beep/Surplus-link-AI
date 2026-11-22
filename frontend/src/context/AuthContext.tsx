import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole, LoginCredentials, BackendUser, BackendOrganisation } from '../types';
import { PRESET_USERS, NGOS } from '../services/mockData';
import { organisationKeyForUser } from '../services/adapters';
import {
  clearAccessToken,
  DEMO_PASSWORD,
  fetchCurrentUser,
  fetchOrganisations,
  getAccessToken,
  isMockMode,
  loginWithBackend,
} from '../services/api';

const AUTH_STORAGE_KEY = 'surpluslink_auth_user_v1';

const PRESET_EMAILS: Record<string, string> = {
  ngo_roti: 'roti@rotibank.org',
  ngo_sewa: 'sewa@kitchen.org',
  ngo_anna: 'anna@shelter.org',
  vol_arjun: 'rider.arjun@surpluslink.org',
  vol_priya: 'priya.rider@surpluslink.org',
  admin_lead: 'admin@surpluslink.ai',
  donor_spice: 'chef@spiceroute.com',
};

const AVATARS: Record<UserRole, string> = {
  ngo: '🏢',
  volunteer: '🛵',
  admin: '🛡️',
  donor: '👨‍🍳',
};

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  loginAsPreset: (presetKey: string) => Promise<User>;
  logout: () => void;
  isAdmin: boolean;
  isNgo: boolean;
  isVolunteer: boolean;
  isDonor: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapBackendUser(
  raw: BackendUser,
  organisations: BackendOrganisation[]
): User {
  const organisationId = organisationKeyForUser(raw, organisations);
  const org = organisationId ? NGOS[organisationId] : undefined;
  return {
    id: String(raw.id),
    name: raw.name,
    email: raw.email,
    role: raw.role,
    phone: raw.phone || undefined,
    organisationId,
    organisationName: org?.name,
    avatar: AVATARS[raw.role],
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(AUTH_STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch {
        // Ignore malformed local state.
      }
    }
    return null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [user]);

  useEffect(() => {
    if (isMockMode() || !getAccessToken()) return;
    let active = true;
    Promise.all([fetchCurrentUser(), fetchOrganisations()])
      .then(([current, organisations]) => {
        if (active) setUser(mapBackendUser(current, organisations));
      })
      .catch(() => {
        if (active) clearAccessToken();
      });
    return () => {
      active = false;
    };
  }, []);

  const loginAsPreset = useCallback(async (presetKey: string): Promise<User> => {
    const preset = PRESET_USERS[presetKey] || PRESET_USERS.admin_lead;
    if (isMockMode()) {
      setUser(preset);
      return preset;
    }

    const email = PRESET_EMAILS[presetKey] || preset.email;
    const { user: backendUser } = await loginWithBackend(email, DEMO_PASSWORD);
    const organisations = await fetchOrganisations().catch(() => []);
    const mapped = mapBackendUser(backendUser, organisations);
    setUser(mapped);
    return mapped;
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<User> => {
    if (isMockMode()) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      let orgName = undefined;
      if (credentials.role === 'ngo' && credentials.organisationId) {
        orgName = NGOS[credentials.organisationId]?.name;
      }
      const newUser: User = {
        id: 'u_' + Date.now().toString(36),
        name: credentials.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        email: credentials.email.trim(),
        role: credentials.role,
        organisationId: credentials.organisationId,
        organisationName: orgName,
        avatar: AVATARS[credentials.role],
      };
      setUser(newUser);
      return newUser;
    }

    const { user: backendUser } = await loginWithBackend(
      credentials.email,
      credentials.password || DEMO_PASSWORD
    );
    const organisations = await fetchOrganisations().catch(() => []);
    const mapped = mapBackendUser(backendUser, organisations);
    setUser(mapped);
    return mapped;
  }, []);

  const logout = useCallback(() => {
    clearAccessToken();
    setUser(null);
  }, []);

  const role = user?.role || null;
  const isAuthenticated = !!user;
  const isAdmin = role === 'admin';
  const isNgo = role === 'ngo';
  const isVolunteer = role === 'volunteer';
  const isDonor = role === 'donor';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        login,
        loginAsPreset,
        logout,
        isAdmin,
        isNgo,
        isVolunteer,
        isDonor,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
