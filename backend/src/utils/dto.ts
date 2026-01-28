/**
 * Data Transfer Objects (DTOs)
 * Filter sensitive data before sending API responses
 */

// User DTO - excludes password_hash and other sensitive fields
export interface UserDTO {
  id: string;
  full_name: string;
  email: string;
  phone_number?: string | null;
  address?: string | null;
  role: 'USER' | 'ADMIN';
  kyc_status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  created_at: string;
  updated_at?: string;
}

// Account DTO
export interface AccountDTO {
  id: string;
  user_id: string;
  account_number: string;
  account_type: 'SAVINGS' | 'CURRENT';
  balance: number;
  is_active: boolean;
  created_at: string;
}

// Card DTO - masks sensitive data
export interface CardDTO {
  id: string;
  account_id: string;
  card_number_masked: string;
  card_holder_name: string;
  expiry_date: string;
  card_type: 'DEBIT' | 'CREDIT';
  status: 'ACTIVE' | 'BLOCKED' | 'FROZEN';
  daily_limit: number;
  is_international_enabled: boolean;
  is_online_enabled: boolean;
  created_at: string;
}

// Transaction DTO
export interface TransactionDTO {
  id: string;
  account_id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'LOAN_PAYMENT' | 'LOAN_DISBURSAL';
  amount: number;
  description?: string | null;
  category?: string | null;
  counterparty_name?: string | null;
  counterparty_account_number?: string | null;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  reference_id?: string | null;
  transaction_date: string;
}

// Loan DTO
export interface LoanDTO {
  id: string;
  user_id: string;
  loan_type: string;
  loan_amount: number;
  interest_rate: number;
  term_months: number;
  emi_amount: number;
  outstanding_balance: number;
  status: string;
  start_date?: string;
  next_emi_date?: string;
  created_at: string;
}

// Sensitive fields to always remove
const SENSITIVE_USER_FIELDS = [
  'password_hash',
  'password',
  'pin_hash',
  'security_question_answer',
  'two_factor_secret',
];

const SENSITIVE_CARD_FIELDS = [
  'card_number', // Will be masked instead
  'cvv',
  'pin_hash',
];

/**
 * Filter sensitive fields from a user object
 */
export const filterUserData = (user: Record<string, any>): UserDTO => {
  const filtered: Record<string, any> = { ...user };
  
  // Remove sensitive fields
  SENSITIVE_USER_FIELDS.forEach(field => {
    delete filtered[field];
  });
  
  return filtered as UserDTO;
};

/**
 * Filter sensitive fields from multiple users
 */
export const filterUsersData = (users: Record<string, any>[]): UserDTO[] => {
  return users.map(filterUserData);
};

/**
 * Mask a card number to show only last 4 digits
 */
export const maskCardNumber = (cardNumber: string): string => {
  if (!cardNumber || cardNumber.length < 4) {
    return '****';
  }
  
  const lastFour = cardNumber.slice(-4);
  const masked = '*'.repeat(cardNumber.length - 4);
  return masked + lastFour;
};

/**
 * Filter sensitive fields from a card object
 */
export const filterCardData = (card: Record<string, any>): CardDTO => {
  const filtered: Record<string, any> = { ...card };
  
  // Mask card number
  if (filtered.card_number) {
    filtered.card_number_masked = maskCardNumber(filtered.card_number);
    delete filtered.card_number;
  }
  
  // Remove sensitive fields
  SENSITIVE_CARD_FIELDS.forEach(field => {
    delete filtered[field];
  });
  
  return filtered as CardDTO;
};

/**
 * Filter sensitive fields from multiple cards
 */
export const filterCardsData = (cards: Record<string, any>[]): CardDTO[] => {
  return cards.map(filterCardData);
};

/**
 * Create a safe response object by filtering any sensitive data
 */
export const createSafeResponse = <T>(
  data: T | T[],
  type: 'user' | 'card' | 'general' = 'general'
): T | T[] => {
  if (Array.isArray(data)) {
    if (type === 'user') {
      return data.map(item => filterUserData(item as Record<string, any>)) as T[];
    }
    if (type === 'card') {
      return data.map(item => filterCardData(item as Record<string, any>)) as T[];
    }
    // General filtering
    return data.map(item => {
      if (typeof item === 'object' && item !== null) {
        const filtered = { ...item } as Record<string, any>;
        SENSITIVE_USER_FIELDS.forEach(field => delete filtered[field]);
        return filtered as T;
      }
      return item;
    });
  }
  
  if (type === 'user' && typeof data === 'object' && data !== null) {
    return filterUserData(data as Record<string, any>) as T;
  }
  if (type === 'card' && typeof data === 'object' && data !== null) {
    return filterCardData(data as Record<string, any>) as T;
  }
  
  // General filtering for single object
  if (typeof data === 'object' && data !== null) {
    const filtered = { ...data } as Record<string, any>;
    SENSITIVE_USER_FIELDS.forEach(field => delete filtered[field]);
    return filtered as T;
  }
  
  return data;
};

/**
 * Filter a complete user response including nested data
 */
export const filterCompleteUserResponse = (userData: Record<string, any>): Record<string, any> => {
  const filtered = filterUserData(userData);
  
  // Also filter nested data if present
  if (userData.accounts && Array.isArray(userData.accounts)) {
    (filtered as any).accounts = userData.accounts;
  }
  
  if (userData.cards && Array.isArray(userData.cards)) {
    (filtered as any).cards = filterCardsData(userData.cards);
  }
  
  if (userData.transactions && Array.isArray(userData.transactions)) {
    (filtered as any).transactions = userData.transactions;
  }
  
  if (userData.loans && Array.isArray(userData.loans)) {
    (filtered as any).loans = userData.loans;
  }
  
  if (userData.tickets && Array.isArray(userData.tickets)) {
    (filtered as any).tickets = userData.tickets;
  }
  
  return filtered;
};

export default {
  filterUserData,
  filterUsersData,
  filterCardData,
  filterCardsData,
  maskCardNumber,
  createSafeResponse,
  filterCompleteUserResponse,
};
