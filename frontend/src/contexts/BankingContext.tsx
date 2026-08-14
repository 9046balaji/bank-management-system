/**
 * Banking Context
 * Manages banking operations: accounts, transactions, transfers
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Account, Transaction } from '../../types';
import { transactionApi, accountApi } from '../services/api';
import { useAuth } from './AuthContext';

// Banking context type
interface BankingContextType {
  accounts: Account[];
  transactions: Transaction[];
  isProcessing: boolean;
  error: string | null;
  
  // Operations
  transfer: (data: TransferData) => Promise<TransferResult>;
  deposit: (accountId: string, amount: number, description?: string) => Promise<boolean>;
  refreshAccounts: () => Promise<void>;
  refreshTransactions: (accountId?: string) => Promise<void>;
  addTransaction: (tx: Omit<Transaction, 'id' | 'date' | 'status'>) => void;
  clearError: () => void;
}

// Transfer data type
interface TransferData {
  fromAccountId: string;
  toAccountNumber: string;
  amount: number;
  description?: string;
  pin?: string;
  idempotencyKey?: string;
}

// Transfer result type
interface TransferResult {
  success: boolean;
  message: string;
  referenceId?: string;
  newBalance?: number;
}

// Create context
const BankingContext = createContext<BankingContextType | undefined>(undefined);

// Provider props
interface BankingProviderProps {
  children: ReactNode;
}

/**
 * Banking Provider Component
 */
export const BankingProvider: React.FC<BankingProviderProps> = ({ children }) => {
  const { user, updateUser, refreshUserData } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get accounts and transactions from user state
  const accounts = user.accounts || [];
  const transactions = user.transactions || [];

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Generate idempotency key for transfers
  const generateIdempotencyKey = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  };

  // Transfer funds between accounts
  const transfer = useCallback(async (data: TransferData): Promise<TransferResult> => {
    setIsProcessing(true);
    setError(null);

    try {
      // Generate idempotency key if not provided
      const idempotencyKey = data.idempotencyKey || generateIdempotencyKey();

      const response = await transactionApi.transfer({
        from_account_id: data.fromAccountId,
        to_account_number: data.toAccountNumber,
        amount: data.amount,
        description: data.description || 'Transfer',
        pin: data.pin,
        idempotency_key: idempotencyKey,
      });

      if (response.success) {
        // Refresh user data to get updated balances
        await refreshUserData();

        return {
          success: true,
          message: response.message || 'Transfer completed successfully',
          referenceId: (response.data as any)?.reference_id,
          newBalance: (response.data as any)?.new_balance,
        };
      }

      const errorMsg = response.error || 'Transfer failed';
      setError(errorMsg);
      return {
        success: false,
        message: errorMsg,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Transfer failed';
      setError(errorMsg);
      return {
        success: false,
        message: errorMsg,
      };
    } finally {
      setIsProcessing(false);
    }
  }, [refreshUserData]);

  // Deposit funds
  const deposit = useCallback(async (
    accountId: string,
    amount: number,
    description?: string
  ): Promise<boolean> => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await accountApi.deposit(accountId, amount, description);

      if (response.success) {
        await refreshUserData();
        return true;
      }

      setError(response.error || 'Deposit failed');
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deposit failed');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [refreshUserData]);

  // Refresh accounts
  const refreshAccounts = useCallback(async () => {
    if (!user.id) return;

    try {
      const response = await accountApi.getByUserId(user.id);
      if (response.success && response.data) {
        updateUser({
          accounts: (response.data as any[]).map((acc: any) => ({
            id: acc.id,
            account_number: acc.account_number,
            account_type: acc.account_type,
            balance: parseFloat(acc.balance) || 0,
          })),
        });
      }
    } catch (err) {
      console.error('Failed to refresh accounts:', err);
    }
  }, [user.id, updateUser]);

  // Refresh transactions
  const refreshTransactions = useCallback(async (accountId?: string) => {
    if (!user.accounts?.length) return;

    try {
      const targetAccountId = accountId || user.accounts[0].id;
      const response = await transactionApi.getByAccountId(targetAccountId, 50);

      if (response.success && response.data) {
        updateUser({
          transactions: (response.data as any[]).map((tx: any) => ({
            id: tx.id,
            type: tx.type,
            amount: parseFloat(tx.amount),
            description: tx.description || '',
            date: tx.transaction_date || tx.created_at,
            status: tx.status,
          })),
        });
      }
    } catch (err) {
      console.error('Failed to refresh transactions:', err);
    }
  }, [user.accounts, updateUser]);

  // Add transaction locally (optimistic update)
  const addTransaction = useCallback((tx: Omit<Transaction, 'id' | 'date' | 'status'>) => {
    const newTx: Transaction = {
      ...tx,
      id: `tx-${Date.now()}`,
      date: new Date().toISOString(),
      status: 'COMPLETED',
    };

    updateUser({
      transactions: [newTx, ...transactions],
      balance: tx.type === 'DEPOSIT' 
        ? user.balance + tx.amount 
        : user.balance - tx.amount,
    });

    // Sync with backend
    refreshUserData();
  }, [transactions, user.balance, updateUser, refreshUserData]);

  const value: BankingContextType = {
    accounts,
    transactions,
    isProcessing,
    error,
    transfer,
    deposit,
    refreshAccounts,
    refreshTransactions,
    addTransaction,
    clearError,
  };

  return (
    <BankingContext.Provider value={value}>
      {children}
    </BankingContext.Provider>
  );
};

/**
 * Custom hook to use banking context
 */
export const useBanking = (): BankingContextType => {
  const context = useContext(BankingContext);
  if (!context) {
    throw new Error('useBanking must be used within a BankingProvider');
  }
  return context;
};

export default BankingContext;
