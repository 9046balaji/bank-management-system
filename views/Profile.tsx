
import React, { useState, useRef } from 'react';
import { UserState, NotificationPreferences } from '../types';
import { userApi } from '../src/services/api';

interface ProfileProps {
  user: UserState;
  onUpdate: (u: Partial<UserState>) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: user.name,
    phone: user.phone,
    address: '123 Market Street, Suite 400, San Francisco, CA 94103',
  });
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  
  // Photo upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
      setShowPhotoModal(true);
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoUpload = async () => {
    if (!photoPreview || !user.id) return;

    setUploadingPhoto(true);
    try {
      // For now, we'll store the base64 image directly
      // In production, you'd upload to a file storage service
      const response = await userApi.update(user.id, {
        avatar: photoPreview,
      });

      if (response.success) {
        onUpdate({ avatar: photoPreview });
        setShowPhotoModal(false);
        setPhotoPreview(null);
      } else {
        alert('Failed to update profile photo');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!user.id) return;

    setUploadingPhoto(true);
    try {
      const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=135bec&color=fff&size=200`;
      const response = await userApi.update(user.id, {
        avatar: defaultAvatar,
      });

      if (response.success) {
        onUpdate({ avatar: defaultAvatar });
        setShowPhotoModal(false);
        setPhotoPreview(null);
      }
    } catch (error) {
      console.error('Error removing photo:', error);
    } finally {
      setUploadingPhoto(false);
    }
  };
  
  const handleToggle = async (channel: keyof NotificationPreferences, type: keyof NotificationPreferences['email']) => {
    const updatedPrefs = { ...user.notificationPreferences };
    updatedPrefs[channel][type] = !updatedPrefs[channel][type];
    onUpdate({ notificationPreferences: updatedPrefs });

    // Save to backend
    if (user.id) {
      try {
        await userApi.updateNotifications(user.id, updatedPrefs);
      } catch (error) {
        console.error('Error updating notifications:', error);
        // Revert on error
        updatedPrefs[channel][type] = !updatedPrefs[channel][type];
        onUpdate({ notificationPreferences: updatedPrefs });
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!user.id) return;
    
    setSaving(true);
    try {
      const response = await userApi.update(user.id, {
        full_name: editData.name,
        phone_number: editData.phone,
        address: editData.address,
      });

      if (response.success) {
        onUpdate({
          name: editData.name,
          phone: editData.phone,
        });
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (passwordData.new.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    if (!user.id) return;

    setPasswordSaving(true);
    setPasswordError(null);

    try {
      const response = await userApi.updatePassword(
        user.id,
        passwordData.current,
        passwordData.new
      );

      if (response.success) {
        setShowPasswordModal(false);
        setPasswordData({ current: '', new: '', confirm: '' });
        alert('Password updated successfully!');
      } else {
        setPasswordError(response.error || 'Failed to update password');
      }
    } catch (error) {
      setPasswordError('Failed to update password');
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Photo Upload Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6">
            <h3 className="text-xl font-bold text-center">Update Profile Photo</h3>
            <div className="flex justify-center">
              <div className="size-40 rounded-full overflow-hidden border-4 border-primary shadow-lg">
                <img 
                  src={photoPreview || user.avatar} 
                  className="size-full object-cover" 
                  alt="Preview" 
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => { setShowPhotoModal(false); setPhotoPreview(null); }}
                className="flex-1 h-12 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
              >
                Cancel
              </button>
              {photoPreview && (
                <button
                  onClick={handlePhotoUpload}
                  disabled={uploadingPhoto}
                  className="flex-1 h-12 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  {uploadingPhoto ? (
                    <span className="material-symbols-outlined animate-spin">refresh</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">check</span>
                      Save Photo
                    </>
                  )}
                </button>
              )}
            </div>
            <button
              onClick={handleRemovePhoto}
              disabled={uploadingPhoto}
              className="w-full h-10 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-medium text-sm flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              Remove Photo
            </button>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6">
            <h3 className="text-xl font-bold">Change Password</h3>
            {passwordError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 text-sm">
                {passwordError}
              </div>
            )}
            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase">Current Password</span>
                <input
                  type="password"
                  value={passwordData.current}
                  onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl h-12 px-4"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase">New Password</span>
                <input
                  type="password"
                  value={passwordData.new}
                  onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl h-12 px-4"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase">Confirm New Password</span>
                <input
                  type="password"
                  value={passwordData.confirm}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl h-12 px-4"
                />
              </label>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => { setShowPasswordModal(false); setPasswordError(null); }}
                className="flex-1 h-12 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={passwordSaving}
                className="flex-1 h-12 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2"
              >
                {passwordSaving ? (
                  <span className="material-symbols-outlined animate-spin">refresh</span>
                ) : (
                  'Update Password'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-3xl font-black tracking-tight">Profile & Security</h2>
        <p className="text-slate-500">Manage your account details and security preferences.</p>
      </div>

      <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-8 relative overflow-hidden">
        <div className="size-32 bg-primary/10 rounded-3xl flex items-center justify-center relative group">
          <img src={user.avatar} className="size-full rounded-3xl object-cover" alt="" />
          <button 
            onClick={handlePhotoClick}
            className="absolute bottom-2 right-2 size-8 bg-white dark:bg-slate-700 rounded-lg shadow-md flex items-center justify-center text-primary group-hover:scale-110 transition-transform hover:bg-primary hover:text-white"
            title="Change profile photo"
          >
             <span className="material-symbols-outlined text-sm">photo_camera</span>
          </button>
        </div>
        <div className="flex-1">
           <div className="flex items-center gap-3 mb-2">
             <h3 className="text-2xl font-black">{user.name}</h3>
             <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
               <span className="material-symbols-outlined text-[12px]">verified</span> Verified
             </span>
           </div>
           <p className="text-slate-500 font-medium">Digital Banking Suite • Member since 2021</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
            <h4 className="font-bold text-lg mb-6">Personal Information</h4>
            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase">Full Name</span>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl h-12 px-4" 
                  value={isEditing ? editData.name : user.name} 
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  readOnly={!isEditing} 
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase">Email Address</span>
                <input type="email" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl h-12 px-4" value={user.email} readOnly />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase">Phone Number</span>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl h-12 px-4" 
                  value={isEditing ? editData.phone : user.phone} 
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  readOnly={!isEditing} 
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase">Home Address</span>
                <textarea 
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 resize-none h-24" 
                  value={isEditing ? editData.address : "123 Market Street, Suite 400, San Francisco, CA 94103"}
                  onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                  readOnly={!isEditing} 
                />
              </label>
            </div>
            {isEditing ? (
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="flex-1 h-12 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex-1 h-12 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <span className="material-symbols-outlined animate-spin">refresh</span>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsEditing(true)}
                className="w-full h-12 border border-slate-200 dark:border-slate-800 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                Edit Details
              </button>
            )}
         </div>

         <div className="space-y-8">
            <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
               <h4 className="font-bold text-lg mb-6 flex items-center gap-2">
                 <span className="material-symbols-outlined text-primary">security</span> Security Settings
               </h4>
               <div className="space-y-4">
                  <button 
                    onClick={() => setShowPasswordModal(true)}
                    className="w-full flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-slate-100 transition-all"
                  >
                     <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-slate-400">key</span>
                        <span className="text-sm font-bold">Change Password</span>
                     </div>
                     <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                  </button>
                  <button className="w-full flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:bg-slate-100 transition-all">
                     <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-slate-400">pin</span>
                        <span className="text-sm font-bold">Update PIN</span>
                     </div>
                     <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                  </button>
               </div>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
               <h4 className="font-bold text-lg mb-6 flex items-center gap-2">
                 <span className="material-symbols-outlined text-primary">notifications</span> Notification Settings
               </h4>
               
               <div className="overflow-x-auto">
                 <table className="w-full text-sm">
                   <thead>
                     <tr>
                       <th className="text-left font-bold text-slate-400 pb-4">Alert Type</th>
                       <th className="text-center font-bold text-slate-400 pb-4">Email</th>
                       <th className="text-center font-bold text-slate-400 pb-4">SMS</th>
                       <th className="text-center font-bold text-slate-400 pb-4">Push</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                     {[
                       { key: 'largeTransaction', label: 'Large Transactions' },
                       { key: 'lowBalance', label: 'Low Balance' },
                       { key: 'security', label: 'Security Alerts' }
                     ].map((row) => (
                       <tr key={row.key}>
                         <td className="py-4 font-bold">{row.label}</td>
                         {(['email', 'sms', 'push'] as const).map(channel => (
                           <td key={channel} className="py-4 text-center">
                              <button 
                                onClick={() => handleToggle(channel, row.key as any)}
                                className={`w-10 h-6 rounded-full p-1 transition-all ${user.notificationPreferences[channel][row.key as keyof typeof user.notificationPreferences.email] ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}
                              >
                                <div className={`size-4 bg-white rounded-full transition-all ${user.notificationPreferences[channel][row.key as keyof typeof user.notificationPreferences.email] ? 'translate-x-4' : 'translate-x-0'}`}></div>
                              </button>
                           </td>
                         ))}
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Profile;
