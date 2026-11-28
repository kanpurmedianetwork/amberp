'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from './firebase';
import { UserProfile, UserRole } from '../types';
import { apiRequest } from './api';

export interface EmployeeAccount {
  email: string;
  name: string;
  role: UserRole;
  description: string;
}

export const PRECONFIGURED_EMPLOYEES: EmployeeAccount[] = [
  {
    email: 'mohit@ambicaengineers.in',
    name: 'Mohit AbhayRaj Chhajer',
    role: 'ADMIN',
    description: 'Full Access — Executive Management & Template Authority',
  },
  {
    email: 'sales@ambicaengineers.in',
    name: 'Harpreet Singh (Sales)',
    role: 'SALES',
    description: 'Sales Desk — Customers, Products, Enquiries & Quotations',
  },
  {
    email: 'operations@ambicaengineers.in',
    name: 'Saurabh Agnihotri (Operations)',
    role: 'OPERATIONS',
    description: 'Operations — Order Conversion, PI Generation & Dispatch',
  },
  {
    email: 'accounts@ambicaengineers.in',
    name: 'Accounts Executive',
    role: 'VIEWER',
    description: 'Financial Audit & Document Archive (Read-Only)',
  },
];

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  loginAs: (email: string) => Promise<void>;
  loginWithEmailPassword: (email: string, password: string) => Promise<void>;
  registerWithEmailPassword: (email: string, password: string, name?: string) => Promise<void>;
  loginWithGoogleToken: (idToken: string) => Promise<void>;
  logout: () => void;
  canManageCustomers: boolean;
  canManageProducts: boolean;
  canCreateEnquiry: boolean;
  canGenerateQuotation: boolean;
  canConvertOrder: boolean;
  canGeneratePI: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncSessionIp = async (sToken?: string | null, activeUser?: UserProfile | null) => {
    try {
      const activeTok = sToken || (typeof window !== 'undefined' ? localStorage.getItem('ambica_token') : null);
      await apiRequest('/auth/session', {
        method: 'POST',
        body: JSON.stringify({
          token: activeTok,
          email: activeUser?.email,
          user: activeUser,
        }),
      });
    } catch {}
  };

  // Listen to Firebase Auth state
  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
        if (fbUser && fbUser.email) {
          const email = fbUser.email.toLowerCase().trim();
          const idToken = await fbUser.getIdToken();
          let sessionToken = idToken;
          try {
            const res = await apiRequest<{ token: string; user: UserProfile }>('/auth/verify', {
              method: 'POST',
              body: JSON.stringify({ idToken }),
            });
            if (res.token) sessionToken = res.token;
          } catch (e) {
            console.warn('Token verification note:', e);
          }
          const emp = PRECONFIGURED_EMPLOYEES.find((e) => e.email.toLowerCase() === email);
          const profile: UserProfile = {
            email,
            name: fbUser.displayName || (emp ? emp.name : email.split('@')[0]),
            role: emp ? emp.role : 'VIEWER',
          };
          setUser(profile);
          setToken(sessionToken);
          localStorage.setItem('ambica_token', sessionToken);
          localStorage.setItem('ambica_user', JSON.stringify(profile));
          setIsLoading(false);
          syncSessionIp(sessionToken, profile);
        }
      });
    } catch (err) {
      console.warn('Firebase auth listener init notice:', err);
    }

    const savedToken = localStorage.getItem('ambica_token');
    const savedUser = localStorage.getItem('ambica_user');

    if (savedToken && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsed);
        syncSessionIp(savedToken, parsed);
      } catch {
        localStorage.removeItem('ambica_token');
        localStorage.removeItem('ambica_user');
      }
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }

    return () => unsubscribe();
  }, []);

  const loginAs = async (email: string) => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{ token: string; user: UserProfile }>('/auth/login-as', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('ambica_token', res.token);
      localStorage.setItem('ambica_user', JSON.stringify(res.user));
      syncSessionIp(res.token, res.user);
    } catch (err: any) {
      console.error('Failed to log in as:', email, err);
      const emp = PRECONFIGURED_EMPLOYEES.find((e) => e.email === email) || PRECONFIGURED_EMPLOYEES[0];
      const fallbackUser: UserProfile = { email: emp.email, name: emp.name, role: emp.role };
      setUser(fallbackUser);
      syncSessionIp(null, fallbackUser);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithEmailPassword = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const fbUser = userCredential.user;
      const idToken = await fbUser.getIdToken();
      let sessionToken = idToken;
      try {
        const res = await apiRequest<{ token: string; user: UserProfile }>('/auth/verify', {
          method: 'POST',
          body: JSON.stringify({ idToken }),
        });
        if (res.token) sessionToken = res.token;
      } catch (e) {
        console.warn('Session verification notice:', e);
      }
      const normEmail = (fbUser.email || email).toLowerCase().trim();
      const emp = PRECONFIGURED_EMPLOYEES.find((e) => e.email.toLowerCase() === normEmail);
      const profile: UserProfile = {
        email: normEmail,
        name: fbUser.displayName || (emp ? emp.name : normEmail.split('@')[0]),
        role: emp ? emp.role : 'VIEWER',
      };
      setToken(sessionToken);
      setUser(profile);
      localStorage.setItem('ambica_token', sessionToken);
      localStorage.setItem('ambica_user', JSON.stringify(profile));
      syncSessionIp(sessionToken, profile);
    } catch (err: any) {
      console.error('Firebase Email/Password sign in failed:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const registerWithEmailPassword = async (email: string, password: string, name?: string) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const fbUser = userCredential.user;
      const idToken = await fbUser.getIdToken();
      const normEmail = (fbUser.email || email).toLowerCase().trim();
      const emp = PRECONFIGURED_EMPLOYEES.find((e) => e.email.toLowerCase() === normEmail);
      const profile: UserProfile = {
        email: normEmail,
        name: name || (emp ? emp.name : normEmail.split('@')[0]),
        role: emp ? emp.role : 'VIEWER',
      };
      setToken(idToken);
      setUser(profile);
      localStorage.setItem('ambica_token', idToken);
      localStorage.setItem('ambica_user', JSON.stringify(profile));
    } catch (err: any) {
      console.error('Firebase Email/Password registration failed:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogleToken = async (idToken: string) => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{ token: string; user: UserProfile }>('/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ idToken }),
      });
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('ambica_token', res.token);
      localStorage.setItem('ambica_user', JSON.stringify(res.user));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    fbSignOut(auth).catch(() => {});
    setToken(null);
    setUser(null);
    localStorage.removeItem('ambica_token');
    localStorage.removeItem('ambica_user');
  };

  const role = user?.role || 'VIEWER';
  const isAdmin = role === 'ADMIN';
  const isSales = role === 'SALES';
  const isOperations = role === 'OPERATIONS';

  const canManageCustomers = isAdmin || isSales;
  const canManageProducts = isAdmin;
  const canCreateEnquiry = isAdmin || isSales;
  const canGenerateQuotation = isAdmin || isSales;
  const canConvertOrder = isAdmin || isOperations;
  const canGeneratePI = isAdmin || isOperations;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        loginAs,
        loginWithEmailPassword,
        registerWithEmailPassword,
        loginWithGoogleToken,
        logout,
        canManageCustomers,
        canManageProducts,
        canCreateEnquiry,
        canGenerateQuotation,
        canConvertOrder,
        canGeneratePI,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
