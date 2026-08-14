
import React, { useState, useCallback, memo, useMemo } from 'react';
import { UserState, View } from '../types';
import { maskAccountNumber } from '../src/utils/masking';

interface HeaderProps {
  user: UserState;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  onLogout: () => void;
  setView: (v: View) => void;
}

const Header: React.FC<HeaderProps> = memo(function Header({ user, isDarkMode, toggleDarkMode, onLogout, setView }) {
  const [showMenu, setShowMenu] = useState(false);

  const handleMenuToggle = useCallback(() => {
    setShowMenu(prev => !prev);
  }, []);

  const handleMenuClose = useCallback(() => {
    setShowMenu(false);
  }, []);

  const handleProfileClick = useCallback(() => {
    setShowMenu(false);
    setView(View.PROFILE);
  }, [setView]);

  const handleLogoutClick = useCallback(() => {
    setShowMenu(false);
    onLogout();
  }, [onLogout]);

  // Mask account number for display
  const maskedAccountNumber = useMemo(() => 
    maskAccountNumber(user.accountNumber || ''), 
    [user.accountNumber]
  );

  return (
    <header 
      className="h-16 bg-surface-light dark:bg-surface-dark border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md bg-opacity-80 dark:bg-opacity-80"
      role="banner"
    >
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-slate-400" aria-hidden="true">search</span>
        <input 
          type="text" 
          placeholder="Search transactions..." 
          className="bg-transparent border-none focus:ring-0 text-sm w-48 md:w-64"
          aria-label="Search transactions"
        />
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={toggleDarkMode}
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {isDarkMode ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-1" aria-hidden="true"></div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold">{user.name}</p>
            <p className="text-[10px] text-slate-500 font-mono tracking-tighter">
              ACC: {maskedAccountNumber}
            </p>
          </div>
          <div className="relative">
            <button
              onClick={handleMenuToggle}
              className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
              aria-expanded={showMenu}
              aria-haspopup="true"
              aria-label="User menu"
            >
              <img 
                src={user.avatar} 
                alt={`${user.name}'s avatar`}
                className="size-10 rounded-full border-2 border-white dark:border-slate-700 shadow-sm cursor-pointer hover:scale-105 transition-transform"
              />
            </button>
            {showMenu && (
              <>
                {/* Backdrop to close menu when clicking outside */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={handleMenuClose}
                  aria-hidden="true"
                />
                <div 
                  className="absolute right-0 top-full mt-2 w-48 bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                  role="menu"
                  aria-orientation="vertical"
                >
                  <button 
                    onClick={handleProfileClick} 
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold flex items-center gap-2"
                    role="menuitem"
                  >
                    <span className="material-symbols-outlined text-sm" aria-hidden="true">settings</span> Settings
                  </button>
                  <button 
                    onClick={handleLogoutClick} 
                    className="w-full text-left px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-semibold text-red-500 flex items-center gap-2"
                    role="menuitem"
                  >
                    <span className="material-symbols-outlined text-sm" aria-hidden="true">logout</span> Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
});

export default Header;
