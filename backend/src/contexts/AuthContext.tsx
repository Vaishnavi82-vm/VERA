import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface SafeUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  onboarded: boolean;
}

type Session = null;

interface AuthContextType {
  user: SafeUser | null;
  session: Session;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  signup: (name: string, email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  markOnboarded: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface StoredUser {
  id: string;
  email: string;
  password: string;
  name: string;
  avatar?: string;
  onboarded: boolean;
}

const AUTH_STORAGE_KEY = 'vera_auth_user';

function toSafe(user: StoredUser): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    onboarded: user.onboarded,
  };
}

function loadStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

function saveStoredUser(user: StoredUser) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(null);
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = loadStoredUser();
    if (storedUser) {
      setUser(toSafe(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const storedUser = loadStoredUser();
    if (!storedUser || storedUser.email !== email || storedUser.password !== password) {
      return 'Invalid email or password';
    }
    setUser(toSafe(storedUser));
    return null;
  };

  const signup = async (name: string, email: string, password: string) => {
    if (!name || !email || !password) {
      return 'All fields are required';
    }
    const storedUser = loadStoredUser();
    if (storedUser && storedUser.email === email) {
      return 'An account with that email already exists';
    }
    const newUser: StoredUser = {
      id: crypto.randomUUID(),
      email,
      password,
      name,
      avatar: undefined,
      onboarded: false,
    };
    saveStoredUser(newUser);
    setUser(toSafe(newUser));
    return null;
  };

  const logout = async () => {
    setUser(null);
    setSession(null);
  };

  const markOnboarded = async () => {
    const storedUser = loadStoredUser();
    if (!storedUser) return;
    const updated = { ...storedUser, onboarded: true };
    saveStoredUser(updated);
    setUser(toSafe(updated));
  };

  const refreshUser = async () => {
    const storedUser = loadStoredUser();
    if (storedUser) {
      setUser(toSafe(storedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, login, signup, logout, markOnboarded, refreshUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
