import { createContext, useContext, useState, ReactNode } from 'react';
import { api } from './api';

export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  departmentId: number | null;
  permissions: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (code: string) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem('sarms_user');
  return raw ? JSON.parse(raw) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser());

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('sarms_token', data.accessToken);
    localStorage.setItem('sarms_user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('sarms_token');
    localStorage.removeItem('sarms_user');
    setUser(null);
  };

  const hasPermission = (code: string) => user?.permissions.includes(code) ?? false;

  // Re-fetch the basic identity after a profile edit so the sidebar reflects
  // the new name immediately (keeps the JWT-derived permissions as-is).
  const refreshUser = async () => {
    const { data } = await api.get('/auth/me');
    const next: AuthUser = {
      id: data.id,
      fullName: data.fullName,
      email: data.email,
      departmentId: data.departmentId,
      permissions: user?.permissions ?? [],
    };
    localStorage.setItem('sarms_user', JSON.stringify(next));
    setUser(next);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, hasPermission, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
