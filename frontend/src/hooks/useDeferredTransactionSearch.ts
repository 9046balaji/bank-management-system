/**
 * Custom hook for deferred transaction search
 * 
 * Uses React 19's useDeferredValue to keep the UI responsive while
 * filtering large transaction lists. The search input stays responsive
 * while the expensive filtering operation happens with lower priority.
 */

import { useMemo, useDeferredValue, useState, useCallback } from 'react';

export interface Transaction {
  id: number;
  account_id: number;
  type: string;
  amount: number;
  description?: string;
  category?: string;
  counterparty_name?: string;
  counterparty_account_number?: string;
  status: string;
  reference_id?: string;
  transaction_date: string;
  created_at: string;
}

export interface TransactionFilters {
  searchQuery: string;
  type?: string;
  category?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface UseDeferredTransactionSearchResult {
  // Current search query (responsive)
  searchQuery: string;
  // Deferred search query (may lag behind)
  deferredSearchQuery: string;
  // Is the deferred value catching up?
  isPending: boolean;
  // Filtered transactions
  filteredTransactions: Transaction[];
  // Set search query
  setSearchQuery: (query: string) => void;
  // Full filters
  filters: TransactionFilters;
  // Set filters
  setFilters: (filters: TransactionFilters) => void;
  // Reset all filters
  resetFilters: () => void;
}

const defaultFilters: TransactionFilters = {
  searchQuery: '',
  type: undefined,
  category: undefined,
  status: undefined,
  dateFrom: undefined,
  dateTo: undefined,
  minAmount: undefined,
  maxAmount: undefined,
};

/**
 * Filter transactions based on search query and filters
 * This is an expensive operation that benefits from being deferred
 */
function filterTransactions(
  transactions: Transaction[],
  filters: TransactionFilters,
  deferredQuery: string
): Transaction[] {
  return transactions.filter(tx => {
    // Search query filter (using deferred value for better performance)
    if (deferredQuery) {
      const searchLower = deferredQuery.toLowerCase();
      const matchesSearch = 
        tx.description?.toLowerCase().includes(searchLower) ||
        tx.counterparty_name?.toLowerCase().includes(searchLower) ||
        tx.counterparty_account_number?.includes(searchLower) ||
        tx.reference_id?.toLowerCase().includes(searchLower) ||
        tx.category?.toLowerCase().includes(searchLower) ||
        tx.type.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    // Type filter
    if (filters.type && tx.type !== filters.type) {
      return false;
    }

    // Category filter
    if (filters.category && tx.category !== filters.category) {
      return false;
    }

    // Status filter
    if (filters.status && tx.status !== filters.status) {
      return false;
    }

    // Date range filter
    if (filters.dateFrom) {
      const txDate = new Date(tx.transaction_date);
      const fromDate = new Date(filters.dateFrom);
      if (txDate < fromDate) return false;
    }

    if (filters.dateTo) {
      const txDate = new Date(tx.transaction_date);
      const toDate = new Date(filters.dateTo);
      if (txDate > toDate) return false;
    }

    // Amount range filter
    const amount = Math.abs(tx.amount);
    if (filters.minAmount !== undefined && amount < filters.minAmount) {
      return false;
    }
    if (filters.maxAmount !== undefined && amount > filters.maxAmount) {
      return false;
    }

    return true;
  });
}

/**
 * Hook for deferred transaction search
 * 
 * @param transactions - Array of transactions to filter
 * @returns Search state and filtered results
 * 
 * @example
 * ```tsx
 * function TransactionList({ transactions }) {
 *   const { 
 *     searchQuery, 
 *     setSearchQuery, 
 *     filteredTransactions,
 *     isPending 
 *   } = useDeferredTransactionSearch(transactions);
 *   
 *   return (
 *     <div>
 *       <input 
 *         value={searchQuery}
 *         onChange={(e) => setSearchQuery(e.target.value)}
 *         placeholder="Search transactions..."
 *       />
 *       {isPending && <Spinner />}
 *       <TransactionTable data={filteredTransactions} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useDeferredTransactionSearch(
  transactions: Transaction[]
): UseDeferredTransactionSearchResult {
  const [filters, setFiltersState] = useState<TransactionFilters>(defaultFilters);
  
  // Use deferred value for the search query
  // This keeps the input responsive while filtering happens in the background
  const deferredSearchQuery = useDeferredValue(filters.searchQuery);
  
  // Check if we're waiting for the deferred value to catch up
  const isPending = filters.searchQuery !== deferredSearchQuery;

  // Memoized filtered transactions
  // Uses the deferred query for the expensive filtering operation
  const filteredTransactions = useMemo(() => {
    return filterTransactions(transactions, filters, deferredSearchQuery);
  }, [transactions, filters, deferredSearchQuery]);

  // Set search query helper
  const setSearchQuery = useCallback((query: string) => {
    setFiltersState(prev => ({ ...prev, searchQuery: query }));
  }, []);

  // Set filters helper
  const setFilters = useCallback((newFilters: TransactionFilters) => {
    setFiltersState(newFilters);
  }, []);

  // Reset filters helper
  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilters);
  }, []);

  return {
    searchQuery: filters.searchQuery,
    deferredSearchQuery,
    isPending,
    filteredTransactions,
    setSearchQuery,
    filters,
    setFilters,
    resetFilters,
  };
}

/**
 * Lightweight hook for just search query deferral
 * Use this when you only need search functionality without full filters
 */
export function useDeferredSearch(initialQuery: string = '') {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const isPending = searchQuery !== deferredSearchQuery;

  return {
    searchQuery,
    setSearchQuery,
    deferredSearchQuery,
    isPending,
  };
}

export default useDeferredTransactionSearch;
