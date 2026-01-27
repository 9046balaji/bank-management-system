
import React, { useState } from 'react';
import { UserState, View } from '../types';

interface HeaderProps {
  user: UserState;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  onLogout: () => void;
  setView: (v: View) => void;
}

const Header: React.FC<HeaderProps> = ({ user, isDarkMode, toggleDarkMode, onLogout, setView }) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleProfileClick = () => {
    setShowMenu(false);
    setView(View.PROFILE);
  };

  const handleLogoutClick = () => {
    setShowMenu(false);
    onLogout();
  };

  return (
    <header className="h-16 bg-surface-light dark:bg-surface-dark border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md bg-opacity-80 dark:bg-opacity-80">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-slate-400">search</span>
        <input 
          type="text" 
          placeholder="Search transactions..." 
          className="bg-transparent border-none focus:ring-0 text-sm w-48 md:w-64"
        />
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={toggleDarkMode}
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
        >
          <span className="material-symbols-outlined">
            {isDarkMode ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold">{user.name}</p>
            <p className="text-[10px] text-slate-500 font-mono tracking-tighter">ACC: {user.accountNumber}</p>
          </div>
          <div className="relative">
            <img 
              src={user.avatar} 
              alt="Avatar" 
              className="size-10 rounded-full border-2 border-white dark:border-slate-700 shadow-sm cursor-pointer hover:scale-105 transition-transform"
              onClick={() => setShowMenu(!showMenu)}
            />
            {showMenu && (
              <>
                {/* Backdrop to close menu when clicking outside */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-48 bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <button 
                    onClick={handleProfileClick} 
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">settings</span> Settings
                  </button>
                  <button 
                    onClick={handleLogoutClick} 
                    className="w-full text-left px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-semibold text-red-500 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">logout</span> Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
