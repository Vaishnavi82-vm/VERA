import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface SafeUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  onboarded: boolean;
}

interface AuthContextType {
  user: SafeUser | null;
  session: null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  signup: (name: string, email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  markOnboarded: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);
const CURRENT_USER_KEY = 'vera_current_user';
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    body: options.body,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = response.statusText;
    try {
      const json = JSON.parse(text);
      message = json?.detail || json?.error || json?.message || message;
    } catch {
      if (text) message = text;
    }
    throw new Error(message || 'Request failed');
  }

  if (response.status === 204) {
    return null as unknown as T;
  }

  return (await response.json()) as T;
}

function getCurrentUserFromStorage(): SafeUser | null {
  const raw = localStorage.getItem(CURRENT_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SafeUser;
  } catch {
    return null;
  }
}

function setCurrentUserInStorage(user: SafeUser | null) {
  if (!user) {
    localStorage.removeItem(CURRENT_USER_KEY);
    return;
  }
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<null>(null);
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getCurrentUserFromStorage();
    setUser(stored);
    setSession(null);
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const user = await apiRequest<SafeUser>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setCurrentUserInStorage(user);
      setUser(user);
      return null;
    } catch (error) {
      return (error as Error).message;
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    try {
      const user = await apiRequest<SafeUser>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      setCurrentUserInStorage(user);
      setUser(user);
      return null;
    } catch (error) {
      return (error as Error).message;
    }
  };

  const logout = async () => {
    setUser(null);
    setCurrentUserInStorage(null);
  };

  const markOnboarded = async () => {
    if (!user) return;
    try {
      const updated = await apiRequest<SafeUser>('/api/auth/onboarded', {
        method: 'PUT',
        body: JSON.stringify({ email: user.email }),
      });
      setUser(updated);
      setCurrentUserInStorage(updated);
    } catch {
      // ignore errors; preserve existing state
    }
  };

  const refreshUser = async () => {
    const stored = getCurrentUserFromStorage();
    if (!stored) {
      setUser(null);
      return;
    }

    try {
      const updated = await apiRequest<SafeUser>(`/api/auth/user/${encodeURIComponent(stored.email)}`);
      setUser(updated);
      setCurrentUserInStorage(updated);
    } catch {
      setUser(stored);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        login,
        signup,
        logout,
        markOnboarded,
        refreshUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
