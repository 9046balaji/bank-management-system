
import React, { useState, useEffect } from 'react';
import { View, UserRole, UserState, Transaction } from './types';
import { INITIAL_STATE } from './constants';
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

const App: React.FC = () => {
  const [user, setUser] = useState<UserState>(INITIAL_STATE);
  const [currentView, setCurrentView] = useState<View>(View.LANDING);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  const handleLogin = (email: string) => {
    setIsAuthenticated(true);
    
    // Admin login backdoor
    if (email.toLowerCase() === 'admin@aurabank.com') {
      handleUpdateUser({ role: UserRole.ADMIN });
      setCurrentView(View.ADMIN_OVERVIEW);
    } else {
      handleUpdateUser({ role: UserRole.USER });
      // If coming from register/kyc flow check could be done here, 
      // but simplistic flow:
      if (!user.isKycCompleted) {
        setCurrentView(View.KYC);
      } else {
        setCurrentView(View.DASHBOARD);
      }
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentView(View.LANDING);
    setUser(INITIAL_STATE);
  };

  const addTransaction = (tx: Omit<Transaction, 'id' | 'date' | 'status'>) => {
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
  };

  // Helper to determine which view to render
  const renderContent = () => {
    // Public Routes
    if (currentView === View.LANDING) return <Landing onStart={() => setCurrentView(View.REGISTER)} onLogin={() => setCurrentView(View.LOGIN)} />;
    
    if (currentView === View.LOGIN || currentView === View.REGISTER || currentView === View.FORGOT_PASSWORD) {
      return <Auth currentView={currentView} setView={setCurrentView} onLogin={handleLogin} />;
    }

    // Semi-Protected (Onboarding)
    if (currentView === View.KYC) {
      return <KYC onComplete={(data) => {
        handleUpdateUser({ isKycCompleted: true, accountNumber: data.accountNumber });
        setCurrentView(View.DASHBOARD);
      }} />;
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
