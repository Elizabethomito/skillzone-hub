import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  type User,
  authenticateUser,
  createUser,
  getUserById,
  deleteUser as dbDeleteUser,
  updateUser as dbUpdateUser,
  setSession,
  getSession,
  clearSession,
  seedIfEmpty,
} from '@/db/database';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    role: 'user' | 'organization';
    first_name: string;
    last_name: string;
    organization_name: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<Pick<User, 'first_name' | 'last_name' | 'organization_name' | 'email'>>) => void;
  deleteAccount: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    seedIfEmpty();
    const sessionId = getSession();
    if (sessionId) {
      const u = getUserById(sessionId);
      setUser(u);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await authenticateUser(email, password);
    if (!u) throw new Error('Invalid email or password');
    setSession(u.id);
    setUser(u);
  }, []);

  const register = useCallback(async (data: Parameters<AuthState['register']>[0]) => {
    const u = await createUser(data);
    setSession(u.id);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    (data: Partial<Pick<User, 'first_name' | 'last_name' | 'organization_name' | 'email'>>) => {
      if (!user) return;
      const updated = dbUpdateUser(user.id, data);
      if (updated) setUser(updated);
    },
    [user]
  );

  const deleteAccount = useCallback(() => {
    if (!user) return;
    dbDeleteUser(user.id);
    clearSession();
    setUser(null);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, register, logout, updateProfile, deleteAccount }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
