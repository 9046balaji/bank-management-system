
export enum View {
  LANDING = 'LANDING',
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER',
  FORGOT_PASSWORD = 'FORGOT_PASSWORD',
  KYC = 'KYC',
  DASHBOARD = 'DASHBOARD',
  TRANSFERS = 'TRANSFERS',
  MANAGE_FUNDS = 'MANAGE_FUNDS',
  MY_CARDS = 'MY_CARDS',
  LOANS = 'LOANS',
  ANALYTICS = 'ANALYTICS',
  SUPPORT = 'SUPPORT',
  PROFILE = 'PROFILE',
  ADMIN_OVERVIEW = 'ADMIN_OVERVIEW',
  ADMIN_LOANS = 'ADMIN_LOANS',
  ADMIN_CONFIG = 'ADMIN_CONFIG'
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'LOAN_PAYMENT';
  amount: number;
  description: string;
  date: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
}

export interface Loan {
  id: string;
  type: string;
  amount: number;
  remaining: number;
  interestRate: number;
  termMonths: number;
  startDate: string;
  nextEmiDate: string;
  emiAmount: number;
  status: 'ACTIVE' | 'PENDING' | 'REPAID';
}

export interface Ticket {
  id: string;
  subject: string;
  category: 'FRAUD' | 'ACCOUNT' | 'TECH' | 'OTHER';
  description: string;
  status: 'OPEN' | 'RESOLVED' | 'IN_PROGRESS';
  createdAt: string;
}

export interface NotificationPreferences {
  email: {
    largeTransaction: boolean;
    lowBalance: boolean;
    security: boolean;
  };
  sms: {
    largeTransaction: boolean;
    lowBalance: boolean;
    security: boolean;
  };
  push: {
    largeTransaction: boolean;
    lowBalance: boolean;
    security: boolean;
  };
}

export interface UserState {
  id?: string;
  name: string;
  email: string;
  phone: string;
  accountNumber: string;
  balance: number;
  role: UserRole;
  avatar: string;
  isKycCompleted: boolean;
  transactions: Transaction[];
  loans: Loan[];
  tickets: Ticket[];
  notificationPreferences: NotificationPreferences;
  settings: {
    maintenanceMode: boolean;
    currency: string;
    savingsRate: number;
    fdRate: number;
    cardFrozen: boolean;
    onlinePayments: boolean;
    intlUse: boolean;
    dailyLimit: number;
  };
}