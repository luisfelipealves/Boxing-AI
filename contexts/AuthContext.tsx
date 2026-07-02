import React, { createContext, useContext, useEffect, useState } from 'react';

interface LocalUser {
  id: string;
  email: string;
  name: string;
}

interface LocalSession {
  user: LocalUser;
}

interface AuthContextType {
  session: LocalSession | null;
  user: LocalUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AUTH_STORAGE_KEY = 'boxtrack-local-auth';

const createLocalUser = (): LocalUser => ({
  id: 'local-user',
  email: 'local@boxtrack.local',
  name: 'Local user',
});

const readStoredUser = (): LocalUser | null => {
  if (typeof window === 'undefined') return null;

  const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as LocalUser;
  } catch {
    return null;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: React.PropsWithChildren) => {
  const [session, setSession] = useState<LocalSession | null>(null);
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = readStoredUser();
    if (storedUser) {
      setSession({ user: storedUser });
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const signOut = async () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    setSession(null);
    setUser(null);
  };

  const signInWithGoogle = async () => {
    const localUser = createLocalUser();
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(localUser));
    }
    setSession({ user: localUser });
    setUser(localUser);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};