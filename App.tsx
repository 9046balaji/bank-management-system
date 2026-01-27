
import React, { useState, useEffect, useCallback } from 'react';
import { View, UserRole, UserState, Transaction } from './types';
import { INITIAL_STATE } from './constants';
import { userApi } from './src/services/api';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Landing from './views/Landing';
import Auth from './views/Auth';
import KYC from './views/KYC';
import Dashboard from './views/Dashboard';
import Transfer from './views/Transfer';
import ManageFunds from './views/ManageFunds';
import Cards from './views/Cards';
import Loans from './views/Loans';
import Analytics from './views/Analytics';
import Support from './views/Support';
import Profile from './views/Profile';
import AdminOverview from './views/AdminOverview';
import AdminLoanApprovals from './views/AdminLoanApprovals';
import AdminSystemConfig from './views/AdminSystemConfig';

// Session storage keys
const SESSION_TOKEN_KEY = 'aura_session_token';
const SESSION_USER_KEY = 'aura_user_data';

const App: React.FC = () => {
  const [user, setUser] = useState<UserState>(INITIAL_STATE);
  const [currentView, setCurrentView] = useState<View>(View.LANDING);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // For session restore

  // Map backend data to frontend UserState
  const mapUserData = useCallback((userData: any): Partial<UserState> => {
    return {
      id: userData.id,
      name: userData.name || userData.full_name,
      email: userData.email,
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
  }, []);

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
          
          // Navigate based on role and KYC status
          if (loginData.user.role === 'ADMIN') {
            setCurrentView(View.ADMIN_OVERVIEW);
          } else if (loginData.user.kyc_status !== 'VERIFIED') {
            setCurrentView(View.KYC);
          } else {
            setCurrentView(View.DASHBOARD);
          }
        } else {
          // Invalid session, clear storage
          localStorage.removeItem(SESSION_TOKEN_KEY);
          localStorage.removeItem(SESSION_USER_KEY);
        }
      } catch (error) {
        console.error('Session restore failed:', error);
        localStorage.removeItem(SESSION_TOKEN_KEY);
        localStorage.removeItem(SESSION_USER_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, [mapUserData]);

  // Apply dark mode to body
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const handleUpdateUser = (updates: Partial<UserState>) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  // Refresh user data from backend (call after transfers, loan payments etc)
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
  }, [authToken, mapUserData]);

  const handleLogin = (userData: any) => {
    // Check if this is a new user from registration
    if (userData.isNewUser) {
      // Store minimal user data for KYC flow
      handleUpdateUser({
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: UserRole.USER,
        isKycCompleted: false,
      });
      setIsAuthenticated(true);
      setCurrentView(View.KYC);
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
    handleUpdateUser(mappedUser);

    // Navigate based on role and KYC status
    if (userData.role === 'ADMIN') {
      setCurrentView(View.ADMIN_OVERVIEW);
    } else if (userData.kyc_status !== 'VERIFIED') {
      setCurrentView(View.KYC);
    } else {
      setCurrentView(View.DASHBOARD);
    }
  };

  const handleLogout = async () => {
    try {
      await userApi.logout(authToken || undefined);
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    // Clear session from localStorage
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(SESSION_USER_KEY);
    
    setIsAuthenticated(false);
    setAuthToken(null);
    setCurrentView(View.LANDING);
    setUser(INITIAL_STATE);
  };

  const addTransaction = async (tx: Omit<Transaction, 'id' | 'date' | 'status'>) => {
    const newTx: Transaction = {
      ...tx,
      id: `tx-${Date.now()}`,
      date: new Date().toISOString(),
      status: 'COMPLETED'
    };
    handleUpdateUser({
      transactions: [newTx, ...user.transactions],
      balance: tx.type === 'DEPOSIT' ? user.balance + tx.amount : user.balance - tx.amount
    });
    
    // Refresh data from backend to get accurate balances
    await refreshUserData();
  };

  // Show loading screen while restoring session
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <div className="size-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Helper to determine which view to render
  const renderContent = () => {
    // Public Routes
    if (currentView === View.LANDING) return <Landing onStart={() => setCurrentView(View.REGISTER)} onLogin={() => setCurrentView(View.LOGIN)} />;
    
    if (currentView === View.LOGIN || currentView === View.REGISTER || currentView === View.FORGOT_PASSWORD) {
      return <Auth currentView={currentView} setView={setCurrentView} onLogin={handleLogin} />;
    }

    // Semi-Protected (Onboarding)
    if (currentView === View.KYC) {
      return <KYC 
        userId={user.id}
        onComplete={(data) => {
          // Create account object with proper structure
          const newAccount = data.account ? {
            id: data.account.id,
            account_number: data.account.account_number || data.accountNumber,
            balance: data.account.balance || 0,
            account_type: data.account.account_type || 'SAVINGS'
          } : {
            id: `acc-${Date.now()}`,
            account_number: data.accountNumber,
            balance: 0,
            account_type: 'SAVINGS'
          };
          
          handleUpdateUser({ 
            isKycCompleted: true, 
            accountNumber: data.accountNumber,
            balance: newAccount.balance,
            accounts: [newAccount]
          });
          setCurrentView(View.DASHBOARD);
        }} 
      />;
    }

    // Protected Routes Check
    if (!isAuthenticated) {
      // Fallback if trying to access protected route without auth
      setCurrentView(View.LOGIN);
      return null;
    }

    // Protected Views
    switch (currentView) {
      case View.DASHBOARD: return <Dashboard user={user} setView={setCurrentView} />;
      case View.TRANSFERS: return <Transfer user={user} onTransfer={addTransaction} />;
      case View.MANAGE_FUNDS: return <ManageFunds user={user} onUpdate={addTransaction} />;
      case View.MY_CARDS: return <Cards user={user} onUpdate={(settings) => handleUpdateUser({ settings: { ...user.settings, ...settings } })} />;
      case View.LOANS: return <Loans user={user} onPayment={(amount) => addTransaction({ type: 'LOAN_PAYMENT', amount, description: 'EMI Payment' })} />;
      case View.ANALYTICS: return <Analytics user={user} />;
      case View.SUPPORT: return <Support user={user} onNewTicket={(ticket) => handleUpdateUser({ tickets: [ticket, ...user.tickets] })} />;
      case View.PROFILE: return <Profile user={user} onUpdate={handleUpdateUser} />;
      case View.ADMIN_OVERVIEW: return <AdminOverview user={user} />;
      case View.ADMIN_LOANS: return <AdminLoanApprovals user={user} />;
      case View.ADMIN_CONFIG: return <AdminSystemConfig user={user} onUpdate={(s) => handleUpdateUser({ settings: { ...user.settings, ...s } })} />;
      default: return <Dashboard user={user} setView={setCurrentView} />;
    }
  };

  const isPublicView = [View.LANDING, View.LOGIN, View.REGISTER, View.FORGOT_PASSWORD, View.KYC].includes(currentView);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 transition-colors">
      {!isPublicView && (
        <Sidebar 
          currentView={currentView} 
          setView={setCurrentView} 
          role={user.role} 
        />
      )}
      
      <div className="flex-1 flex flex-col min-w-0">
        {!isPublicView && (
          <Header 
            user={user} 
            toggleDarkMode={toggleDarkMode} 
            isDarkMode={isDarkMode} 
            onLogout={handleLogout}
            setView={setCurrentView}
          />
        )}
        
        <main className={`flex-1 overflow-auto ${!isPublicView ? 'p-4 md:p-8 animate-slide-up' : ''}`}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
