import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { User } from '../types';
import { loginApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  demoLogin: (role: 'nurse' | 'doctor' | 'admin') => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Store token in state (memory) initialized from localStorage
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('qc_token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('qc_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const login = async (email: string, password: string): Promise<User> => {
    const data = await loginApi(email, password);
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('qc_token', data.token);
    localStorage.setItem('qc_user', JSON.stringify(data.user));
    return data.user;
  };

  const demoLogin = async (role: 'nurse' | 'doctor' | 'admin'): Promise<User> => {
    const email = `${role}@demo.com`;
    const password = 'demo123';
    return login(email, password);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('qc_token');
    localStorage.removeItem('qc_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        login,
        demoLogin,
        logout,
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
