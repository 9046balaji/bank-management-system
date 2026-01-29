
import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { View, UserRole, UserState, Transaction } from './types';
import { INITIAL_STATE } from './constants';
import { userApi } from './src/services/api';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { ErrorBoundary, PageErrorFallback } from './src/components/ErrorBoundary';
import { PageLoading, SectionLoading, DashboardSkeleton } from './src/components/Loading';

// Eagerly loaded components (needed immediately)
import Landing from './views/Landing';
import Auth from './views/Auth';
// 3D Auth Page - Set USE_3D_AUTH to true for immersive 3D login experience
import { Auth3DPage } from './src/components/3d';
const USE_3D_AUTH = true;
import KYC from './views/KYC';
import Dashboard from './views/Dashboard';

// Lazy loaded components (loaded on demand)
const Transfer = lazy(() => import('./views/Transfer'));
const ManageFunds = lazy(() => import('./views/ManageFunds'));
const Cards = lazy(() => import('./views/Cards'));
const Loans = lazy(() => import('./views/Loans'));
const Analytics = lazy(() => import('./views/Analytics'));
const Support = lazy(() => import('./views/Support'));
const Profile = lazy(() => import('./views/Profile'));
const AdminOverview = lazy(() => import('./views/AdminOverview'));
const AdminLoanApprovals = lazy(() => import('./views/AdminLoanApprovals'));
const AdminCardApprovals = lazy(() => import('./views/AdminCardApprovals'));
const AdminSystemConfig = lazy(() => import('./views/AdminSystemConfig'));
const AdminFeedback = lazy(() => import('./views/AdminFeedback'));
const AdminChat = lazy(() => import('./views/AdminChat'));
const AdminPaymentTracking = lazy(() => import('./views/AdminPaymentTracking'));

// Session storage keys
const SESSION_TOKEN_KEY = 'aura_session_token';
const SESSION_USER_KEY = 'aura_user_data';
const SESSION_VIEW_KEY = 'aura_current_view';

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
          
          // Try to restore the saved view first
          const savedView = localStorage.getItem(SESSION_VIEW_KEY) as View | null;
          const isAdmin = loginData.user.role === 'ADMIN';
          const isKycVerified = loginData.user.kyc_status === 'VERIFIED';
          
          // Validate the saved view is appropriate for the user's role
          const adminViews = [View.ADMIN_OVERVIEW, View.ADMIN_LOANS, View.ADMIN_CARDS, 
                             View.ADMIN_CONFIG, View.ADMIN_FEEDBACK, View.ADMIN_CHAT, View.ADMIN_PAYMENTS];
          const userViews = [View.DASHBOARD, View.TRANSFERS, View.MANAGE_FUNDS, View.MY_CARDS, 
                            View.LOANS, View.ANALYTICS, View.SUPPORT, View.PROFILE];
          
          if (savedView && isAdmin && adminViews.includes(savedView)) {
            // Restore admin's saved view
            setCurrentView(savedView);
          } else if (savedView && !isAdmin && isKycVerified && userViews.includes(savedView)) {
            // Restore user's saved view (only if KYC is verified)
            setCurrentView(savedView);
          } else if (isAdmin) {
            // Default for admin
            setCurrentView(View.ADMIN_OVERVIEW);
          } else if (!isKycVerified) {
            // KYC not verified
            setCurrentView(View.KYC);
          } else {
            // Default for user
            setCurrentView(View.DASHBOARD);
          }
        } else {
          // Invalid session, clear storage
          localStorage.removeItem(SESSION_TOKEN_KEY);
          localStorage.removeItem(SESSION_USER_KEY);
          localStorage.removeItem(SESSION_VIEW_KEY);
        }
      } catch (error) {
        console.error('Session restore failed:', error);
        localStorage.removeItem(SESSION_TOKEN_KEY);
        localStorage.removeItem(SESSION_USER_KEY);
        localStorage.removeItem(SESSION_VIEW_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, [mapUserData]);

  // Save current view to localStorage whenever it changes (for authenticated views only)
  useEffect(() => {
    if (isAuthenticated && currentView !== View.LANDING && currentView !== View.LOGIN && 
        currentView !== View.REGISTER && currentView !== View.FORGOT_PASSWORD) {
      localStorage.setItem(SESSION_VIEW_KEY, currentView);
    }
  }, [currentView, isAuthenticated]);

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
      // Store user data and redirect to dashboard
      handleUpdateUser({
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: UserRole.USER,
        isKycCompleted: false,
      });
      setIsAuthenticated(true);
      // Save session token if available
      if (userData.token) {
        setAuthToken(userData.token);
        localStorage.setItem(SESSION_TOKEN_KEY, userData.token);
      }
      setCurrentView(View.DASHBOARD);
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
    localStorage.removeItem(SESSION_VIEW_KEY);
    
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
    return <PageLoading message="Restoring your session..." />;
  }

  // Helper to determine which view to render
  const renderContent = () => {
    // Public Routes
    if (currentView === View.LANDING) return <Landing onStart={() => setCurrentView(View.REGISTER)} onLogin={() => setCurrentView(View.LOGIN)} />;
    
    if (currentView === View.LOGIN || currentView === View.REGISTER || currentView === View.FORGOT_PASSWORD) {
      // Use 3D Auth Page for immersive login experience
      if (USE_3D_AUTH) {
        return (
          <Auth3DPage
            initialMode={currentView === View.LOGIN ? 'login' : currentView === View.REGISTER ? 'register' : 'forgot'}
            onLogin={async (email, password) => {
              try {
                const response = await userApi.login(email, password);
                if (response.success && response.data) {
                  const loginData = response.data as { user: Record<string, unknown>; token: string };
                  // Pass user data with token for proper session handling
                  handleLogin({ ...loginData.user, token: loginData.token });
                } else {
                  throw new Error(response.error || 'Login failed');
                }
              } catch (err) {
                throw err;
              }
            }}
            onRegister={async (name, email, password) => {
              try {
                const response = await userApi.register({
                  full_name: name,
                  email,
                  password,
                });
                if (response.success && response.data) {
                  const userData = response.data as Record<string, unknown>;
                  handleLogin({ ...userData, isNewUser: true });
                } else {
                  throw new Error(response.error || 'Registration failed');
                }
              } catch (err) {
                throw err;
              }
            }}
            onForgotPassword={async (email) => {
              // For demo purposes, just simulate a successful reset
              console.log('Password reset requested for:', email);
              // In a real app, this would call an API endpoint
            }}
          />
        );
      }
      // Fallback to standard Auth component
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

    // Protected Views - Wrapped in Suspense for lazy loading
    switch (currentView) {
      case View.DASHBOARD: return <Dashboard user={user} setView={setCurrentView} />;
      case View.TRANSFERS: return (
        <Suspense fallback={<SectionLoading message="Loading transfers..." />}>
          <Transfer user={user} onTransfer={addTransaction} />
        </Suspense>
      );
      case View.MANAGE_FUNDS: return (
        <Suspense fallback={<SectionLoading message="Loading funds management..." />}>
          <ManageFunds user={user} onUpdate={addTransaction} onUserUpdate={handleUpdateUser} />
        </Suspense>
      );
      case View.MY_CARDS: return (
        <Suspense fallback={<SectionLoading message="Loading cards..." />}>
          <Cards user={user} onUpdate={(settings) => handleUpdateUser({ settings: { ...user.settings, ...settings } })} />
        </Suspense>
      );
      case View.LOANS: return (
        <Suspense fallback={<SectionLoading message="Loading loans..." />}>
          <Loans user={user} onPayment={(amount) => addTransaction({ type: 'LOAN_PAYMENT', amount, description: 'EMI Payment' })} />
        </Suspense>
      );
      case View.ANALYTICS: return (
        <Suspense fallback={<DashboardSkeleton />}>
          <Analytics user={user} />
        </Suspense>
      );
      case View.SUPPORT: return (
        <Suspense fallback={<SectionLoading message="Loading support..." />}>
          <Support user={user} onNewTicket={(ticket) => handleUpdateUser({ tickets: [ticket, ...user.tickets] })} />
        </Suspense>
      );
      case View.PROFILE: return (
        <Suspense fallback={<SectionLoading message="Loading profile..." />}>
          <Profile user={user} onUpdate={handleUpdateUser} />
        </Suspense>
      );
      case View.ADMIN_OVERVIEW: return (
        <Suspense fallback={<DashboardSkeleton />}>
          <AdminOverview user={user} />
        </Suspense>
      );
      case View.ADMIN_LOANS: return (
        <Suspense fallback={<SectionLoading message="Loading loan approvals..." />}>
          <AdminLoanApprovals user={user} />
        </Suspense>
      );
      case View.ADMIN_CARDS: return (
        <Suspense fallback={<SectionLoading message="Loading card approvals..." />}>
          <AdminCardApprovals user={user} />
        </Suspense>
      );
      case View.ADMIN_PAYMENTS: return (
        <Suspense fallback={<SectionLoading message="Loading payment tracking..." />}>
          <AdminPaymentTracking user={user} />
        </Suspense>
      );
      case View.ADMIN_FEEDBACK: return (
        <Suspense fallback={<SectionLoading message="Loading feedback..." />}>
          <AdminFeedback user={user} />
        </Suspense>
      );
      case View.ADMIN_CHAT: return (
        <Suspense fallback={<SectionLoading message="Loading chat..." />}>
          <AdminChat user={user} />
        </Suspense>
      );
      case View.ADMIN_CONFIG: return (
        <Suspense fallback={<SectionLoading message="Loading configuration..." />}>
          <AdminSystemConfig user={user} onUpdate={(s) => handleUpdateUser({ settings: { ...user.settings, ...s } })} />
        </Suspense>
      );
      default: return <Dashboard user={user} setView={setCurrentView} />;
    }
  };

  const isPublicView = [View.LANDING, View.LOGIN, View.REGISTER, View.FORGOT_PASSWORD, View.KYC].includes(currentView);

  return (
    <ErrorBoundary fallback={<PageErrorFallback onRetry={() => window.location.reload()} />}>
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
          
          <main 
            className={`flex-1 overflow-auto ${!isPublicView ? 'p-4 md:p-8 animate-slide-up' : ''}`}
            role="main"
            aria-label="Main content"
          >
            <ErrorBoundary>
              {renderContent()}
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default App;
