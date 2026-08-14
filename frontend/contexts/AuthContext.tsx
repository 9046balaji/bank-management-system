/**
 * User Context
 * Manages user authentication state and profile data
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { UserRole, UserState } from '../../types';
import { INITIAL_STATE } from '../../constants';
import { userApi } from '../services/api';

// Session storage keys
const SESSION_TOKEN_KEY = 'aura_session_token';

// Auth context type
interface AuthContextType {
  user: UserState;
  isAuthenticated: boolean;
  isLoading: boolean;
  authToken: string | null;
  login: (userData: any) => void;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<UserState>) => void;
  refreshUserData: () => Promise<void>;
}

// Create context with default values
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider props
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Map backend data to frontend UserState
 */
const mapUserData = (userData: any): Partial<UserState> => {
  return {
    id: userData.id,
    name: userData.name || userData.full_name,
    email: userData.email,
    phone: userData.phone_number || '',
    role: userData.role === 'ADMIN' ? UserRole.ADMIN : UserRole.USER,
    isKycCompleted: userData.kyc_status === 'VERIFIED',
    balance: userData.balance || userData.accounts?.[0]?.balance || 0,
    accountNumber: userData.accounts?.[0]?.account_number || '',
    accounts: (userData.accounts || []).map((acc: any) => ({
      id: acc.id,
      account_number: acc.account_number,
      account_type: acc.account_type,
      balance: parseFloat(acc.balance) || 0,
    })),
    cards: (userData.cards || []).map((card: any) => ({
      id: card.id,
      card_number: card.card_number_masked || card.card_number,
      card_holder_name: card.card_holder_name,
      expiry_date: card.expiry_date,
      card_type: card.card_type || 'DEBIT',
      status: card.status || 'ACTIVE',
      daily_limit: parseFloat(card.daily_limit) || 1500,
      is_international_enabled: card.is_international_enabled ?? true,
      is_online_enabled: card.is_online_enabled ?? true,
    })),
    transactions: (userData.transactions || []).map((tx: any) => ({
      id: tx.id,
      type: tx.type,
      amount: parseFloat(tx.amount),
      description: tx.description || '',
      counterparty: tx.counterparty_name || '',
      date: tx.transaction_date || tx.created_at,
      status: tx.status,
    })),
    loans: (userData.loans || []).map((loan: any) => ({
      id: loan.id,
      type: loan.type || loan.loan_type || 'Personal',
      amount: parseFloat(loan.loan_amount || loan.principal_amount) || 0,
      remaining: parseFloat(loan.outstanding_balance || loan.remaining_amount) || 0,
      interestRate: parseFloat(loan.interest_rate) || 0,
      termMonths: loan.term_months || 12,
      startDate: loan.start_date || '',
      nextEmiDate: loan.next_emi_date || '',
      emiAmount: parseFloat(loan.emi_amount) || 0,
      status: loan.status || 'ACTIVE',
    })),
    tickets: (userData.tickets || []).map((ticket: any) => ({
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      date: ticket.created_at,
      category: ticket.category,
    })),
    fraudAlerts: [],
  };
};

/**
 * Auth Provider Component
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserState>(INITIAL_STATE);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Update user state
  const updateUser = useCallback((updates: Partial<UserState>) => {
    setUser(prev => ({ ...prev, ...updates }));
  }, []);

  // Refresh user data from backend
  const refreshUserData = useCallback(async () => {
    if (!authToken) return;

    try {
      const response = await userApi.validateSession(authToken);
      if (response.success && response.data) {
        const loginData = response.data as any;
        const mappedUser = mapUserData(loginData.user);
        setUser(prev => ({ ...prev, ...mappedUser }));
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  }, [authToken]);

  // Login handler
  const login = useCallback((userData: any) => {
    // Check if this is a new user from registration
    if (userData.isNewUser) {
      updateUser({
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: UserRole.USER,
        isKycCompleted: false,
      });
      setIsAuthenticated(true);
      return;
    }

    // Handle full login with user data from backend
    setIsAuthenticated(true);
    setAuthToken(userData.token || null);

    // Save session to localStorage
    if (userData.token) {
      localStorage.setItem(SESSION_TOKEN_KEY, userData.token);
    }

    // Map backend data to frontend UserState
    const mappedUser = mapUserData(userData);
    updateUser(mappedUser);
  }, [updateUser]);

  // Logout handler
  const logout = useCallback(async () => {
    try {
      await userApi.logout(authToken || undefined);
    } catch (error) {
      console.error('Logout error:', error);
    }

    // Clear session from localStorage
    localStorage.removeItem(SESSION_TOKEN_KEY);

    setIsAuthenticated(false);
    setAuthToken(null);
    setUser(INITIAL_STATE);
  }, [authToken]);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = localStorage.getItem(SESSION_TOKEN_KEY);

      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        // Validate session with backend
        const response = await userApi.validateSession(storedToken);

        if (response.success && response.data) {
          const loginData = response.data as any;
          const mappedUser = mapUserData(loginData.user);

          setUser(prev => ({ ...prev, ...mappedUser }));
          setAuthToken(storedToken);
          setIsAuthenticated(true);
        } else {
          // Invalid session, clear storage
          localStorage.removeItem(SESSION_TOKEN_KEY);
        }
      } catch (error) {
        console.error('Session restore failed:', error);
        localStorage.removeItem(SESSION_TOKEN_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    authToken,
    login,
    logout,
    updateUser,
    refreshUserData,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to use auth context
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
