'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, FC, PropsWithChildren } from 'react';
import { api } from './api';

export interface User {
  userId: string;
  role: 'student' | 'parent';
  token: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (code: string, role: 'student' | 'parent') => Promise<void>;
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

    if (token && userId && role) {
      setUser({ userId, role, token });
    }
    setIsLoading(false);
  }, []);

  const login = async (code: string, role: 'student' | 'parent') => {
    setIsLoading(true);
    try {
      const { userId, token } = await api.login(code, role);
      const userData: User = { userId, role, token };
      setUser(userData);
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_id', userId);
      localStorage.setItem('user_role', role);
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
