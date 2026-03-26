'use client';

import React, { createContext, useContext, useState, useEffect, FC, PropsWithChildren } from 'react';
import { api } from './api';

export interface User {
  userId: string;
  role: 'student' | 'parent';
  token: string;
  profile?: Record<string, unknown>;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (code: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: FC<PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const userId = localStorage.getItem('user_id');
    const role = localStorage.getItem('user_role') as 'student' | 'parent' | null;
    const profileJson = localStorage.getItem('user_profile');

    if (token && userId && role) {
      const profile = profileJson ? JSON.parse(profileJson) : undefined;
      setUser({ userId, role, token, profile });
    }
    setIsLoading(false);
  }, []);

  const login = async (code: string) => {
    setIsLoading(true);
    try {
      const { user_id, token, role, profile } = await api.login(code);
      const userData: User = { userId: user_id, role, token, profile };
      setUser(userData);
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_id', user_id);
      localStorage.setItem('user_role', role);
      if (profile) {
        localStorage.setItem('user_profile', JSON.stringify(profile));
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_profile');
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
