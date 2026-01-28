
import React, { useState, useEffect } from 'react';
import { UserState } from '../types';
import { configApi } from '../src/services/api';

interface SystemConfig {
  maintenance_mode: boolean;
  base_currency: string;
  savings_rate: number;
  last_updated_at?: string;
  last_updated_by?: string;
}

interface AdminSystemConfigProps {
  user: UserState;
  onUpdate: (settings: Partial<UserState['settings']>) => void;
}

// Demo configuration for hackathon
const DEMO_CONFIG: SystemConfig = {
  maintenance_mode: false,
  base_currency: 'INR',
  savings_rate: 6.5,
  last_updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  last_updated_by: 'ADMIN_SECURE',
};

const AdminSystemConfig: React.FC<AdminSystemConfigProps> = ({ user, onUpdate }) => {
  const [config, setConfig] = useState<SystemConfig>({
    maintenance_mode: false,
    base_currency: 'USD',
    savings_rate: 4.5,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [originalConfig, setOriginalConfig] = useState<SystemConfig | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [savingProgress, setSavingProgress] = useState(0);

  useEffect(() => {
    if (demoMode) {
      loadDemoConfig();
    } else {
      fetchConfig();
    }
  }, [demoMode]);

  const loadDemoConfig = () => {
    setLoading(true);
    setTimeout(() => {
      setConfig(DEMO_CONFIG);
      setOriginalConfig(DEMO_CONFIG);
      setLoading(false);
    }, 600);
  };

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await configApi.getAll();
      if (response.success && response.data) {
        const data = response.data as Record<string, string>;
        const loadedConfig: SystemConfig = {
          maintenance_mode: data.maintenance_mode === 'true',
          base_currency: data.base_currency || 'USD',
          savings_rate: parseFloat(data.savings_rate) || 4.5,
          last_updated_at: data.last_updated_at,
          last_updated_by: data.last_updated_by || 'ADMIN_SECURE',
        };
        setConfig(loadedConfig);
        setOriginalConfig(loadedConfig);
      }
    } catch (err) {
      console.error('Error fetching config:', err);
      setError('Failed to load system configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (key: keyof SystemConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setSuccess('');
  };

  // Demo mode save with progress animation
  const handleDemoSave = () => {
    setSaving(true);
    setSavingProgress(0);
    
    const interval = setInterval(() => {
      setSavingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 20;
      });
    }, 400);

    setTimeout(() => {
      setSaving(false);
      setSavingProgress(0);
      setSuccess('Configuration saved successfully');
      setHasChanges(false);
      setOriginalConfig({ ...config, last_updated_at: new Date().toISOString(), last_updated_by: user.name || 'ADMIN' });
      setConfig(prev => ({ ...prev, last_updated_at: new Date().toISOString(), last_updated_by: user.name || 'ADMIN' }));
    }, 2000);
  };

  const handleSave = async () => {
    if (demoMode) {
      handleDemoSave();
      return;
    }
    
    try {
      setSaving(true);
      setError('');
      
      const settings = {
        maintenance_mode: config.maintenance_mode.toString(),
        base_currency: config.base_currency,
        savings_rate: config.savings_rate.toString(),
        last_updated_at: new Date().toISOString(),
        last_updated_by: user.name || 'ADMIN',
      };

      const response = await configApi.batchUpdate(settings);
      
      if (response.success) {
        setSuccess('Configuration saved successfully');
        setHasChanges(false);
        setOriginalConfig(config);
        
        // Update local user settings if needed
        onUpdate({
          maintenanceMode: config.maintenance_mode,
          savingsRate: config.savings_rate,
        });
      } else {
        setError(response.error || 'Failed to save configuration');
      }
    } catch (err) {
      console.error('Error saving config:', err);
      setError('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (originalConfig) {
      setConfig(originalConfig);
      setHasChanges(false);
      setSuccess('');
    }
  };

  const handleMaintenanceToggle = async () => {
    const newValue = !config.maintenance_mode;
    handleConfigChange('maintenance_mode', newValue);
    
    if (demoMode) {
      // In demo mode, just update locally
      return;
    }
    
    // Immediately update maintenance mode as it's critical
    try {
      await configApi.update('maintenance_mode', newValue.toString());
      onUpdate({ maintenanceMode: newValue });
    } catch (err) {
      console.error('Error updating maintenance mode:', err);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-black tracking-tight">System Configuration</h2>
          <p className="text-slate-500">Manage global bank parameters and operational status.</p>
        </div>
        <button
          onClick={() => setDemoMode(!demoMode)}
          className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
            demoMode 
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30' 
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          <span className="material-symbols-outlined text-sm align-middle mr-1">
            {demoMode ? 'auto_awesome' : 'cloud_sync'}
          </span>
          {demoMode ? 'Demo Mode' : 'Live Data'}
        </button>
      </div>

      {/* Saving progress bar in demo mode */}
      {saving && demoMode && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-indigo-500 animate-spin">progress_activity</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">Synchronizing with Core Banking System...</span>
          </div>
          <div className="w-full bg-indigo-100 dark:bg-indigo-900/50 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${savingProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Status messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError('')} className="underline">Dismiss</button>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-emerald-600 dark:text-emerald-400 flex justify-between items-center">
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            {success}
          </span>
          <button onClick={() => setSuccess('')} className="underline">Dismiss</button>
        </div>
      )}

      <div className="space-y-8">
         <section className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-8 py-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
               <h3 className="font-bold text-sm uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">settings_power</span> Operational Status
               </h3>
            </div>
            <div className="p-8">
               <div className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-6 rounded-3xl ${
                 config.maintenance_mode 
                   ? 'bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30' 
                   : 'bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30'
               }`}>
                  <div className="space-y-1 max-w-lg">
                     <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                       System Maintenance Mode
                       {config.maintenance_mode && (
                         <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-black uppercase rounded-full">Active</span>
                       )}
                     </p>
                     <p className="text-sm text-slate-500 leading-relaxed">
                        Pause all customer transactions and put the core banking engine into maintenance. Users will be unable to transfer or login.
                     </p>
                  </div>
                  <button 
                    onClick={handleMaintenanceToggle}
                    disabled={loading}
                    className={`w-14 h-7 rounded-full p-1 transition-all ${config.maintenance_mode ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <div className={`size-5 bg-white rounded-full transition-all ${config.maintenance_mode ? 'translate-x-7' : 'translate-x-0'}`}></div>
                  </button>
               </div>
            </div>
         </section>

         <section className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-8 py-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
               <h3 className="font-bold text-sm uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">currency_exchange</span> Financial Parameters
               </h3>
            </div>
            <div className="p-8 space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Base Currency</label>
                     <select 
                       value={config.base_currency}
                       onChange={(e) => handleConfigChange('base_currency', e.target.value)}
                       disabled={loading}
                       className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 font-bold focus:ring-2 focus:ring-primary"
                     >
                        <option value="USD">USD - United States Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="INR">INR - Indian Rupee</option>
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Savings Int. Rate (%)</label>
                     <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-3 text-slate-400">percent</span>
                        <input 
                           type="number" 
                           step="0.1"
                           min="0"
                           max="100"
                           disabled={loading}
                           className="w-full h-12 pl-12 pr-4 bg-slate-50 dark:bg-slate-800 border-none rounded-xl font-bold focus:ring-2 focus:ring-primary" 
                           value={config.savings_rate}
                           onChange={(e) => handleConfigChange('savings_rate', parseFloat(e.target.value) || 0)}
                        />
                     </div>
                  </div>
               </div>

               <div className="pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse md:flex-row justify-between items-center gap-4">
                  <p className="text-xs text-slate-400 font-bold flex items-center gap-1">
                     <span className="material-symbols-outlined text-[14px]">history</span> 
                     Last updated by {config.last_updated_by || 'ADMIN'} on {formatDate(config.last_updated_at)}
                  </p>
                  <div className="flex gap-4 w-full md:w-auto">
                     <button 
                       onClick={handleDiscard}
                       disabled={!hasChanges || saving}
                       className="flex-1 md:flex-none px-6 h-12 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm disabled:opacity-50"
                     >
                       Discard
                     </button>
                     <button 
                       onClick={handleSave}
                       disabled={!hasChanges || saving}
                       className="flex-[2] md:flex-none px-8 h-12 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                     >
                        {saving ? (
                          <>
                            <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                            Saving...
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-sm">save</span>
                            Save Global Config
                          </>
                        )}
                     </button>
                  </div>
               </div>
            </div>
         </section>
      </div>
    </div>
  );
};

export default AdminSystemConfig;
