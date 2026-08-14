/**
 * System Config Context
 * Provides system-wide configuration including currency settings
 * Admin changes to currency/settings reflect across all user views
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { configApi } from '../services/api';

// Currency symbols mapping
export const CURRENCY_SYMBOLS: Record<string, string> = {
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'INR': '₹',
  'JPY': '¥',
  'AUD': 'A$',
  'CAD': 'C$',
};

// System config type
export interface SystemConfigType {
  baseCurrency: string;
  currencySymbol: string;
  savingsRate: number;
  loanBaseRate: number;
  maxTransferLimit: number;
  maxDailyTransactions: number;
  minBalanceSavings: number;
  minBalanceCurrent: number;
  cardDailyLimit: number;
  cardInternationalEnabled: boolean;
  aiEnabled: boolean;
  maintenanceMode: boolean;
  isLoading: boolean;
}

// Context type
interface SystemConfigContextType extends SystemConfigType {
  formatCurrency: (amount: number) => string;
  formatCompactCurrency: (amount: number) => string;
  refreshConfig: () => Promise<void>;
}

// Default config
const defaultConfig: SystemConfigType = {
  baseCurrency: 'INR',
  currencySymbol: '₹',
  savingsRate: 6.5,
  loanBaseRate: 8.5,
  maxTransferLimit: 500000,
  maxDailyTransactions: 50,
  minBalanceSavings: 1000,
  minBalanceCurrent: 5000,
  cardDailyLimit: 100000,
  cardInternationalEnabled: true,
  aiEnabled: true,
  maintenanceMode: false,
  isLoading: true,
};

// Create context
const SystemConfigContext = createContext<SystemConfigContextType | undefined>(undefined);

// Provider props
interface SystemConfigProviderProps {
  children: ReactNode;
}

/**
 * System Config Provider Component
 */
export const SystemConfigProvider: React.FC<SystemConfigProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<SystemConfigType>(defaultConfig);

  // Fetch config from backend
  const fetchConfig = useCallback(async () => {
    try {
      const response = await configApi.getAll();
      if (response.success && response.data) {
        const data = response.data as Record<string, string>;
        const baseCurrency = data.base_currency || 'INR';
        setConfig({
          baseCurrency,
          currencySymbol: data.currency_symbol || CURRENCY_SYMBOLS[baseCurrency] || '₹',
          savingsRate: parseFloat(data.savings_rate) || 6.5,
          loanBaseRate: parseFloat(data.loan_base_rate) || 8.5,
          maxTransferLimit: parseInt(data.max_transfer_limit) || 500000,
          maxDailyTransactions: parseInt(data.max_daily_transactions) || 50,
          minBalanceSavings: parseInt(data.min_balance_savings) || 1000,
          minBalanceCurrent: parseInt(data.min_balance_current) || 5000,
          cardDailyLimit: parseInt(data.card_daily_limit) || 100000,
          cardInternationalEnabled: data.card_international_enabled !== 'false',
          aiEnabled: data.ai_enabled !== 'false',
          maintenanceMode: data.maintenance_mode === 'true',
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Error fetching system config:', error);
      setConfig(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchConfig();
    
    // Poll for config updates every 5 minutes
    const interval = setInterval(fetchConfig, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchConfig]);

  // Format currency with symbol
  const formatCurrency = useCallback((amount: number): string => {
    const absAmount = Math.abs(amount);
    const formatted = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(absAmount);
    
    const sign = amount < 0 ? '-' : '';
    return `${sign}${config.currencySymbol}${formatted}`;
  }, [config.currencySymbol]);

  // Format compact currency (e.g., ₹1.5L, ₹2.3Cr)
  const formatCompactCurrency = useCallback((amount: number): string => {
    const absAmount = Math.abs(amount);
    let formatted: string;
    let suffix = '';

    if (config.baseCurrency === 'INR') {
      // Indian numbering system
      if (absAmount >= 10000000) {
        formatted = (absAmount / 10000000).toFixed(2);
        suffix = 'Cr';
      } else if (absAmount >= 100000) {
        formatted = (absAmount / 100000).toFixed(2);
        suffix = 'L';
      } else if (absAmount >= 1000) {
        formatted = (absAmount / 1000).toFixed(1);
        suffix = 'K';
      } else {
        formatted = absAmount.toFixed(2);
      }
    } else {
      // Western numbering system
      if (absAmount >= 1000000000) {
        formatted = (absAmount / 1000000000).toFixed(2);
        suffix = 'B';
      } else if (absAmount >= 1000000) {
        formatted = (absAmount / 1000000).toFixed(2);
        suffix = 'M';
      } else if (absAmount >= 1000) {
        formatted = (absAmount / 1000).toFixed(1);
        suffix = 'K';
      } else {
        formatted = absAmount.toFixed(2);
      }
    }

    const sign = amount < 0 ? '-' : '';
    return `${sign}${config.currencySymbol}${formatted}${suffix}`;
  }, [config.baseCurrency, config.currencySymbol]);

  const value: SystemConfigContextType = {
    ...config,
    formatCurrency,
    formatCompactCurrency,
    refreshConfig: fetchConfig,
  };

  return (
    <SystemConfigContext.Provider value={value}>
      {children}
    </SystemConfigContext.Provider>
  );
};

/**
 * Hook to use system config
 */
export const useSystemConfig = (): SystemConfigContextType => {
  const context = useContext(SystemConfigContext);
  if (!context) {
    throw new Error('useSystemConfig must be used within a SystemConfigProvider');
  }
  return context;
};

// Export default
export default SystemConfigContext;
