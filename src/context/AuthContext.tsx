import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { auth, users, loadToken, saveToken, removeToken } from '@/lib/api';
import { sendTokenToSW } from '@/lib/sw';
import type { User, UserRole } from '@/lib/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; role: UserRole }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rehydrate from stored JWT on mount
  useEffect(() => {
    const stored = loadToken();
    if (!stored) {
      setIsLoading(false);
      return;
    }
    users
      .me(stored)
      .then((u) => {
        setUser(u);
        setToken(stored);
        sendTokenToSW(stored);
      })
      .catch(() => {
        removeToken();
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await auth.login({ email, password });
    saveToken(res.token);
    sendTokenToSW(res.token);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const register = useCallback(
    async (data: { email: string; password: string; name: string; role: UserRole }) => {
      const res = await auth.register(data);
      saveToken(res.token);
      sendTokenToSW(res.token);
      setToken(res.token);
      setUser(res.user);
    },
    [],
  );

  const logout = useCallback(() => {
    removeToken();
    sendTokenToSW(null);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
