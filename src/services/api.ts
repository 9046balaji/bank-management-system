/**
 * Aura Bank - API Service Layer
 * Centralized API client for all backend communications
 */

// @ts-ignore - Vite provides import.meta.env
const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:5000/api';

// Session storage key for token
const SESSION_TOKEN_KEY = 'aura_session_token';

// Generic response type
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
}

// Get auth token from storage
function getAuthToken(): string | null {
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

// Error handling wrapper
async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const data = await response.json();
  if (!response.ok) {
    // Handle token expiration
    if (response.status === 401) {
      // Clear invalid token
      localStorage.removeItem(SESSION_TOKEN_KEY);
    }
    throw new Error(data.error || data.message || 'An error occurred');
  }
  return data;
}

// Request helper with error handling and automatic auth token
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  additionalHeaders: Record<string, string> = {}
): Promise<ApiResponse<T>> {
  const token = getAuthToken();
  
  const config: RequestInit = {
    credentials: 'include', // Include cookies for HttpOnly tokens
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...additionalHeaders,
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    return handleResponse<T>(response);
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Request with idempotency key
async function requestWithIdempotency<T>(
  endpoint: string,
  options: RequestInit = {},
  idempotencyKey?: string
): Promise<ApiResponse<T>> {
  const additionalHeaders: Record<string, string> = {};
  
  if (idempotencyKey) {
    additionalHeaders['Idempotency-Key'] = idempotencyKey;
  } else {
    // Generate a key if not provided
    additionalHeaders['Idempotency-Key'] = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
  
  return request<T>(endpoint, options, additionalHeaders);
}

// ==========================================
// USER API
// ==========================================
export const userApi = {
  // Get all users
  getAll: () => request('/users'),

  // Get user by ID
  getById: (id: string) => request(`/users/${id}`),

  // Create new user
  create: (userData: {
    full_name: string;
    email: string;
    password_hash: string;
    phone_number?: string;
    address?: string;
  }) =>
    request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  // Update user
  update: (
    id: string,
    userData: {
      full_name?: string;
      phone_number?: string;
      address?: string;
      kyc_status?: string;
      notification_preferences?: object;
      settings?: object;
    }
  ) =>
    request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    }),

  // Get user by email (for login)
  getByEmail: (email: string) => request(`/users/email/${email}`),

  // Login
  login: (email: string, password: string) =>
    request('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  // Register
  register: (userData: {
    full_name: string;
    email: string;
    password: string;
    phone_number?: string;
  }) =>
    request('/users/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  // Logout
  logout: (token?: string) =>
    request('/users/logout', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),

  // Validate session (for page refresh)
  validateSession: (token: string) =>
    request('/users/validate-session', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }),

  // Complete KYC
  completeKyc: (id: string, data: { address?: string; phone_number?: string }) =>
    request(`/users/${id}/complete-kyc`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Update password
  updatePassword: (id: string, currentPassword: string, newPassword: string) =>
    request(`/users/${id}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    }),

  // Update notification preferences
  updateNotifications: (id: string, preferences: object) =>
    request(`/users/${id}/notifications`, {
      method: 'PATCH',
      body: JSON.stringify({ notification_preferences: preferences }),
    }),
};

// ==========================================
// ACCOUNTS API
// ==========================================
export const accountApi = {
  // Get all accounts
  getAll: () => request('/accounts'),

  // Get account by ID
  getById: (id: string) => request(`/accounts/${id}`),

  // Get accounts by user ID
  getByUserId: (userId: string) => request(`/accounts/user/${userId}`),

  // Create new account
  create: (accountData: {
    user_id: string;
    account_number: string;
    account_type: 'SAVINGS' | 'CURRENT';
    balance?: number;
  }) =>
    request('/accounts', {
      method: 'POST',
      body: JSON.stringify(accountData),
    }),

  // Update account balance
  updateBalance: (id: string, balance: number) =>
    request(`/accounts/${id}/balance`, {
      method: 'PATCH',
      body: JSON.stringify({ balance }),
    }),

  // Deposit funds
  deposit: (id: string, amount: number, description?: string) =>
    request(`/accounts/${id}/deposit`, {
      method: 'POST',
      body: JSON.stringify({ amount, description }),
    }),

  // Get account by account number
  getByAccountNumber: (accountNumber: string) =>
    request(`/accounts/number/${accountNumber}`),
};

// ==========================================
// TRANSACTIONS API
// ==========================================
export const transactionApi = {
  // Get all transactions
  getAll: () => request('/transactions'),

  // Get transaction by ID
  getById: (id: string) => request(`/transactions/${id}`),

  // Get transactions by account ID
  getByAccountId: (accountId: string, limit?: number) =>
    request(`/transactions/account/${accountId}${limit ? `?limit=${limit}` : ''}`),

  // Create new transaction
  create: (transactionData: {
    account_id: string;
    type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'LOAN_PAYMENT' | 'LOAN_DISBURSAL';
    amount: number;
    description?: string;
    counterparty_name?: string;
    counterparty_account_number?: string;
    status?: 'COMPLETED' | 'PENDING' | 'FAILED';
    reference_id?: string;
  }) =>
    request('/transactions', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    }),

  // Update transaction status
  updateStatus: (id: string, status: 'COMPLETED' | 'PENDING' | 'FAILED') =>
    request(`/transactions/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Transfer between accounts (with idempotency support)
  transfer: (transferData: {
    from_account_id: string;
    to_account_number: string;
    amount: number;
    description?: string;
    pin?: string;
    idempotency_key?: string;
  }) =>
    requestWithIdempotency('/transactions/transfer', {
      method: 'POST',
      body: JSON.stringify(transferData),
    }, transferData.idempotency_key),
};

// ==========================================
// CARDS API
// ==========================================
export const cardApi = {
  // Get all cards
  getAll: () => request('/cards'),

  // Get card by ID
  getById: (id: string) => request(`/cards/${id}`),

  // Get cards by account ID
  getByAccountId: (accountId: string) => request(`/cards/account/${accountId}`),

  // Get cards by user ID
  getByUserId: (userId: string) => request(`/cards/user/${userId}`),

  // Create new card
  create: (cardData: {
    account_id: string;
    card_holder_name: string;
    expiry_date: string;
    daily_limit?: number;
  }) =>
    request('/cards', {
      method: 'POST',
      body: JSON.stringify(cardData),
    }),

  // Update card settings
  update: (
    id: string,
    settings: {
      daily_limit?: number;
      is_international_enabled?: boolean;
      is_online_enabled?: boolean;
      status?: 'ACTIVE' | 'BLOCKED' | 'FROZEN';
    }
  ) =>
    request(`/cards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(settings),
    }),

  // Freeze/Unfreeze card
  toggleFreeze: (id: string, freeze: boolean) =>
    request(`/cards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: freeze ? 'FROZEN' : 'ACTIVE' }),
    }),

  // Update PIN
  updatePin: (id: string, currentPin: string, newPin: string) =>
    request(`/cards/${id}/pin`, {
      method: 'PATCH',
      body: JSON.stringify({ current_pin: currentPin, new_pin: newPin }),
    }),

  // Report lost/stolen
  reportLost: (id: string, reason: string) =>
    request(`/cards/${id}/report-lost`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};

// ==========================================
// WITHDRAWALS API (ATM Codes)
// ==========================================
export const withdrawalApi = {
  // Generate ATM code for cardless withdrawal
  generateAtmCode: (accountId: string, amount: number) =>
    request('/withdrawals/atm-code', {
      method: 'POST',
      body: JSON.stringify({ account_id: accountId, amount }),
    }),

  // Validate ATM code
  validateAtmCode: (code: string) =>
    request('/withdrawals/validate-code', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  // Get pending withdrawal requests
  getPendingByAccountId: (accountId: string) =>
    request(`/withdrawals/pending/${accountId}`),
};

// ==========================================
// LOANS API
// ==========================================
export const loanApi = {
  // Get all loans
  getAll: () => request('/loans'),

  // Get loan by ID
  getById: (id: string) => request(`/loans/${id}`),

  // Get loans by user ID
  getByUserId: (userId: string) => request(`/loans/user/${userId}`),

  // Get loan applications
  getApplications: () => request('/loans/applications/all'),

  // Get loan applications by user ID
  getUserApplications: (userId: string) => request(`/loans/applications/user/${userId}`),

  // Create loan application
  applyForLoan: (applicationData: {
    user_id: string;
    requested_amount: number;
    monthly_income?: number;
    credit_score?: number;
    ai_risk_score?: number;
  }) =>
    request('/loans/applications/create', {
      method: 'POST',
      body: JSON.stringify(applicationData),
    }),

  // Approve/Reject loan application (admin)
  reviewApplication: (
    id: string,
    status: 'APPROVED' | 'REJECTED',
    reviewedBy?: string,
    terms?: {
      interest_rate?: number;
      term_months?: number;
    }
  ) =>
    request(`/loans/applications/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reviewed_by: reviewedBy, ...terms }),
    }),

  // Get AI risk analysis for application
  getAiAnalysis: (id: string, data: {
    credit_score?: number;
    monthly_income?: number;
    loan_amount: number;
  }) =>
    request(`/loans/applications/${id}/ai-analysis`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Make EMI payment
  payEmi: (loanId: string, accountId: string, amount: number) =>
    request(`/loans/${loanId}/pay-emi`, {
      method: 'POST',
      body: JSON.stringify({ account_id: accountId, amount }),
    }),

  // Get loan payment history
  getPaymentHistory: (loanId: string) => request(`/loans/${loanId}/payments`),

  // Loan calculator
  calculate: (data: {
    principal: number;
    rate: number;
    term_months: number;
  }) =>
    request('/loans/calculator', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Update loan status
  updateStatus: (id: string, status: string) =>
    request(`/loans/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

// ==========================================
// SUPPORT TICKETS API
// ==========================================
export const supportApi = {
  // Get all tickets (admin)
  getAll: () => request('/support/tickets'),

  // Get ticket by ID
  getById: (id: string) => request(`/support/tickets/${id}`),

  // Get tickets by user ID
  getByUserId: (userId: string, status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED') =>
    request(`/support/tickets/user/${userId}${status ? `?status=${status}` : ''}`),

  // Create new ticket
  create: (ticketData: {
    user_id: string;
    subject: string;
    category: 'FRAUD' | 'ACCOUNT' | 'TECH' | 'OTHER';
    description?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  }) =>
    request('/support/tickets', {
      method: 'POST',
      body: JSON.stringify(ticketData),
    }),

  // Update ticket status
  updateStatus: (id: string, status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED') =>
    request(`/support/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Get FAQs
  getFaqs: (category?: string) =>
    request(`/support/faqs${category ? `?category=${category}` : ''}`),

  // Chat with AI banking assistant (Ollama)
  chat: (data: { message: string; userId?: string; history?: { role: string; content: string }[] }) =>
    request('/support/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ==================== FEEDBACK ====================
  
  // Submit feedback
  submitFeedback: (feedbackData: {
    user_id: string;
    rating: number;
    category: 'SERVICE' | 'APP' | 'FEATURE' | 'OTHER';
    comment?: string;
  }) =>
    request('/support/feedback', {
      method: 'POST',
      body: JSON.stringify(feedbackData),
    }),

  // Get user's feedback history
  getUserFeedback: (userId: string) =>
    request(`/support/feedback/user/${userId}`),

  // Get all feedback (admin)
  getAllFeedback: (status?: 'resolved' | 'unresolved', category?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (category) params.append('category', category);
    const queryString = params.toString();
    return request(`/support/feedback/all${queryString ? `?${queryString}` : ''}`);
  },

  // Admin respond to feedback
  respondToFeedback: (id: string, adminResponse: string, isResolved: boolean) =>
    request(`/support/feedback/${id}/respond`, {
      method: 'PATCH',
      body: JSON.stringify({ admin_response: adminResponse, is_resolved: isResolved }),
    }),

  // Get feedback statistics (admin)
  getFeedbackStats: () => request('/support/feedback/stats'),
};

// ==========================================
// ANALYTICS API
// ==========================================
export const analyticsApi = {
  // Get dashboard stats
  getDashboardStats: (userId: string) => request(`/analytics/dashboard-stats/${userId}`),

  // Get income vs expenses trend
  getIncomeExpenseTrends: (userId: string, period?: '7d' | '30d' | '90d') =>
    request(`/analytics/income-expense-trends/${userId}${period ? `?period=${period}` : ''}`),

  // Get spending by category
  getExpenseCategories: (userId: string, startDate?: string, endDate?: string) =>
    request(
      `/analytics/expense-categories/${userId}${startDate && endDate ? `?startDate=${startDate}&endDate=${endDate}` : ''}`
    ),

  // Get net worth
  getNetWorth: (userId: string) => request(`/analytics/net-worth/${userId}`),

  // Export PDF report
  exportPdf: (userId: string, startDate: string, endDate: string) =>
    request(`/analytics/export-pdf/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ startDate, endDate }),
    }),

  // Admin: Get system-wide stats
  getAdminStats: () => request('/analytics/admin/stats'),

  // Admin: Get deposit trends
  getDepositTrends: (days?: number) =>
    request(`/analytics/admin/deposit-trends${days ? `?days=${days}` : ''}`),

  // Admin: Get recent activity
  getAdminActivity: (limit?: number) =>
    request(`/analytics/admin/activity${limit ? `?limit=${limit}` : ''}`),
};

// ==========================================
// SYSTEM CONFIG API (Admin)
// ==========================================
export const configApi = {
  // Get all config
  getAll: () => request('/config'),

  // Get config by key
  getByKey: (key: string) => request(`/config/${key}`),

  // Update single config
  update: (key: string, value: string, description?: string) =>
    request(`/config/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value, description }),
    }),

  // Batch update config
  batchUpdate: (settings: Record<string, string | number | boolean>) =>
    request('/config', {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    }),

  // Delete config
  delete: (key: string) =>
    request(`/config/${key}`, {
      method: 'DELETE',
    }),
};

// ==========================================
// ML API (Machine Learning - Fraud Detection & Loan Prediction)
// ==========================================
export const mlApi = {
  // Check ML service health
  health: () => request('/ml/health'),

  // Predict fraud for a transaction
  predictFraud: (transactionData: {
    Time: number;
    Amount: number;
    V1?: number; V2?: number; V3?: number; V4?: number; V5?: number;
    V6?: number; V7?: number; V8?: number; V9?: number; V10?: number;
    V11?: number; V12?: number; V13?: number; V14?: number; V15?: number;
    V16?: number; V17?: number; V18?: number; V19?: number; V20?: number;
    V21?: number; V22?: number; V23?: number; V24?: number; V25?: number;
    V26?: number; V27?: number; V28?: number;
  }) =>
    request('/ml/fraud/predict', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    }),

  // Get fraud monitoring data for an account
  monitorFraud: (accountId: string) => request(`/ml/fraud/monitor/${accountId}`),

  // Predict loan eligibility
  predictLoan: (loanData: {
    Gender: string;
    Married: string;
    Dependents: string;
    Education: string;
    Self_Employed: string;
    ApplicantIncome: number;
    CoapplicantIncome: number;
    LoanAmount: number;
    Loan_Amount_Term: number;
    Credit_History: number;
    Property_Area: string;
  }) =>
    request('/ml/loan/predict', {
      method: 'POST',
      body: JSON.stringify(loanData),
    }),

  // Batch analyze loans
  batchAnalyzeLoans: (applications: Array<{
    Gender: string;
    Married: string;
    Dependents: string;
    Education: string;
    Self_Employed: string;
    ApplicantIncome: number;
    CoapplicantIncome: number;
    LoanAmount: number;
    Loan_Amount_Term: number;
    Credit_History: number;
    Property_Area: string;
  }>) =>
    request('/ml/loan/batch-analyze', {
      method: 'POST',
      body: JSON.stringify({ applications }),
    }),

  // Quick loan eligibility calculation (simplified)
  quickLoanCheck: (income: number, coapplicantIncome: number, loanAmount: number, creditHistory: number) =>
    request('/ml/loan/predict', {
      method: 'POST',
      body: JSON.stringify({
        Gender: 'Male',
        Married: 'Yes',
        Dependents: '0',
        Education: 'Graduate',
        Self_Employed: 'No',
        ApplicantIncome: income,
        CoapplicantIncome: coapplicantIncome,
        LoanAmount: loanAmount,
        Loan_Amount_Term: 360,
        Credit_History: creditHistory,
        Property_Area: 'Urban',
      }),
    }),

  // ==========================================
  // EXPENSE CATEGORIZATION (TF-IDF + Logistic Regression)
  // ==========================================
  
  // Categorize a single transaction description
  categorizeExpense: (description: string) =>
    request<{
      category: string;
      confidence: number;
      icon: string;
      color: string;
      model_used: string;
    }>('/ml/expense/categorize', {
      method: 'POST',
      body: JSON.stringify({ description }),
    }),

  // Categorize multiple transactions at once
  categorizeExpenseBatch: (transactions: Array<{ id: string; description: string }>) =>
    request<{
      results: Array<{
        id: string;
        description: string;
        category: string;
        confidence: number;
        icon: string;
        color: string;
      }>;
      count: number;
      model_used: string;
    }>('/ml/expense/categorize-batch', {
      method: 'POST',
      body: JSON.stringify({ transactions }),
    }),
};

// Default export with all APIs
const api = {
  users: userApi,
  accounts: accountApi,
  transactions: transactionApi,
  cards: cardApi,
  withdrawals: withdrawalApi,
  loans: loanApi,
  support: supportApi,
  analytics: analyticsApi,
  config: configApi,
  ml: mlApi,
};

export default api;
