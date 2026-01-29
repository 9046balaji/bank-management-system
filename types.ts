
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
  ADMIN_CARDS = 'ADMIN_CARDS',
  ADMIN_CONFIG = 'ADMIN_CONFIG',
  ADMIN_FEEDBACK = 'ADMIN_FEEDBACK',
  ADMIN_CHAT = 'ADMIN_CHAT',
  ADMIN_PAYMENTS = 'ADMIN_PAYMENTS'
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

export interface Account {
  id: string;
  account_number: string;
  account_type: string;
  balance: number;
}

export interface Card {
  id: string;
  card_number: string;
  card_holder_name: string;
  expiry_date: string;
  card_type: string;
  status: 'ACTIVE' | 'BLOCKED' | 'FROZEN';
  daily_limit: number;
  is_international_enabled: boolean;
  is_online_enabled: boolean;
}

export interface FraudAlert {
  id: string;
  transaction_id: string;
  amount: number;
  merchant: string;
  location: string;
  timestamp: string;
  risk_score: number;
  status: 'PENDING' | 'CONFIRMED' | 'DISMISSED';
}

export interface LinkedBank {
  id: string;
  bankName: string;
  bankLogo: string;
  accountLast4: string;
  accountType: string;
  linkedAt: string;
  isDefault: boolean;
}

export interface PendingDeposit {
  id: string;
  amount: number;
  type: 'CHEQUE' | 'QR' | 'BANK_TRANSFER';
  description: string;
  createdAt: string;
  clearsAt: string;
  status: 'PENDING' | 'CLEARED' | 'REJECTED';
  imageUrl?: string;
}

export interface AutoTopUpRule {
  enabled: boolean;
  threshold: number;
  topUpAmount: number;
  sourceBank?: string;
}

export interface UpcomingBill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  category: string;
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
  accounts: Account[];
  cards: Card[];
  transactions: Transaction[];
  loans: Loan[];
  tickets: Ticket[];
  fraudAlerts: FraudAlert[];
  notificationPreferences: NotificationPreferences;
  linkedBanks: LinkedBank[];
  pendingDeposits: PendingDeposit[];
  upcomingBills: UpcomingBill[];
  autoTopUp: AutoTopUpRule;
  dailyWithdrawalUsed: number;
  dailyWithdrawalLimit: number;
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

export interface FeedbackItem {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  type: string;
  category: string;
  subject: string;
  description: string;
  rating: number | null;
  status: string;
  admin_response: string | null;
  responded_at: string | null;
  responder_name: string | null;
  is_public: boolean;
  created_at: string;
}

export interface FeedbackStats {
  total: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  by_category: Record<string, number>;
  average_rating: string;
  rated_count: number;
  recent_week: number;
}

export interface AIInsight {
  id: string;
  summary_text: string;
  sentiment: string;
  key_issues: string[];
  solved_issues?: string[];
  unsolved_issues?: string[];
  action_items: string[];
  model_used: string;
  created_at: string;
}