// pages/garden/settings.js - Enhanced Garden Settings Page
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import UsernameChangeModal from '../../components/UsernameChangeModal';
import toast from 'react-hot-toast';

export default function EnhancedSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Privacy settings state
  const [privacySettings, setPrivacySettings] = useState({
    profilePrivacy: 'public', // public, friends, private
    gardenPrivacy: 'public',
    badgesPrivacy: 'public',
    timelinePrivacy: 'public',
    allowFriendWatering: true,
    showActivity: true,
    showStats: true
  });
  
  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    friendRequests: true,
    gardenActivity: true,
    weeklyDigest: true,
    achievementAlerts: true,
    communityUpdates: false,
    marketingEmails: false
  });
  
  // Account settings state
  const [accountSettings, setAccountSettings] = useState({
    displayName: '',
    bio: '',
    location: '',
    website: '',
    birthdayMonth: '',
    birthdayDay: ''
  });
  
  // Danger zone state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  
  // App preferences state
  const [appPreferences, setAppPreferences] = useState({
    theme: 'system', // light, dark, system
    language: 'en',
    autoSave: true,
    compactMode: false,
    soundEffects: true,
    animations: true,
    dailyReminders: true,
    reminderTime: '18:00'
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/auth');
        return;
      }
      
      setUser(currentUser);
      await loadUserSettings(currentUser.uid);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loadUserSettings = async (userId) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setUserProfile(userData);
        
        // Load privacy settings
        setPrivacySettings(prev => ({
          ...prev,
          ...userData.privacy,
          profilePrivacy: userData.profilePrivacy || userData.public === false ? 'private' : 'public',
          gardenPrivacy: userData.gardenPrivacy || 'public',
          badgesPrivacy: userData.badgesPrivacy || 'public',
          timelinePrivacy: userData.timelinePrivacy || 'public'
        }));
        
        // Load notification settings
        setNotificationSettings(prev => ({
          ...prev,
          ...userData.notifications
        }));
        
        // Load account settings
        setAccountSettings(prev => ({
          ...prev,
          displayName: userData.displayName || '',
          bio: userData.bio || '',
          location: userData.location || '',
          website: userData.website || '',
          birthdayMonth: userData.birthdayMonth || '',
          birthdayDay: userData.birthdayDay || ''
        }));
        
        // Load app preferences
        setAppPreferences(prev => ({
          ...prev,
          ...userData.preferences,
          theme: userData.theme || 'system'
        }));
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
      toast.error('Failed to load settings');
    }
  };

  const savePrivacySettings = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      
      await updateDoc(userRef, {
        privacy: privacySettings,
        profilePrivacy: privacySettings.profilePrivacy,
        gardenPrivacy: privacySettings.gardenPrivacy,
        badgesPrivacy: privacySettings.badgesPrivacy,
        timelinePrivacy: privacySettings.timelinePrivacy,
        public: privacySettings.profilePrivacy !== 'private',
        updatedAt: serverTimestamp()
      });
      
      toast.success('Privacy settings updated!');
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      toast.error('Failed to save privacy settings');
    } finally {
      setSaving(false);
    }
  };

  const saveNotificationSettings = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      
      await updateDoc(userRef, {
        notifications: notificationSettings,
        updatedAt: serverTimestamp()
      });
      
      toast.success('Notification settings updated!');
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast.error('Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  const saveAccountSettings = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      
      await updateDoc(userRef, {
        displayName: accountSettings.displayName,
        bio: accountSettings.bio,
        location: accountSettings.location,
        website: accountSettings.website,
        birthdayMonth: accountSettings.birthdayMonth,
        birthdayDay: accountSettings.birthdayDay,
        updatedAt: serverTimestamp()
      });
      
      toast.success('Account settings updated!');
    } catch (error) {
      console.error('Error saving account settings:', error);
      toast.error('Failed to save account settings');
    } finally {
      setSaving(false);
    }
  };

  const saveAppPreferences = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      
      await updateDoc(userRef, {
        preferences: appPreferences,
        theme: appPreferences.theme,
        updatedAt: serverTimestamp()
      });
      
      // Apply theme immediately
      if (appPreferences.theme === 'dark') {
        document.documentElement.classList.add('dark');
        localStorage.setItem('darkMode', 'true');
      } else if (appPreferences.theme === 'light') {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('darkMode', 'false');
      } else {
        // System preference
        const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', systemDarkMode);
        localStorage.removeItem('darkMode');
      }
      
      toast.success('App preferences updated!');
    } catch (error) {
      console.error('Error saving app preferences:', error);
      toast.error('Failed to save app preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    if (!user) return;
    
    try {
      toast.loading('Preparing your data export...');
      
      // Get user data
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      // Get flowers
      const flowersQuery = query(collection(db, 'flowers'), where('userId', '==', user.uid));
      const flowersSnap = await getDocs(flowersQuery);
      
      // Get waterings
      const wateringsQuery = query(collection(db, 'waterings'), where('wateredByUserId', '==', user.uid));
      const wateringsSnap = await getDocs(wateringsQuery);
      
      const exportData = {
        profile: userSnap.exists() ? userSnap.data() : {},
        flowers: flowersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        waterings: wateringsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
      
      // Create and download JSON file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `sharons-garden-data-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
      toast.dismiss();
      toast.success('Data exported successfully!');
      
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.dismiss();
      toast.error('Failed to export data');
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmText !== 'DELETE MY ACCOUNT') {
      toast.error('Please type "DELETE MY ACCOUNT" to confirm');
      return;
    }
    
    try {
      toast.loading('Deleting your account...');
      
      // Delete user's flowers
      const flowersQuery = query(collection(db, 'flowers'), where('userId', '==', user.uid));
      const flowersSnap = await getDocs(flowersQuery);
      
      const batch = [];
      flowersSnap.docs.forEach(doc => {
        batch.push(deleteDoc(doc.ref));
      });
      
      // Delete user's waterings
      const wateringsQuery = query(collection(db, 'waterings'), where('wateredByUserId', '==', user.uid));
      const wateringsSnap = await getDocs(wateringsQuery);
      
      wateringsSnap.docs.forEach(doc => {
        batch.push(deleteDoc(doc.ref));
      });
      
      // Execute deletions
      await Promise.all(batch);
      
      // Delete user document
      await deleteDoc(doc(db, 'users', user.uid));
      
      // Delete Firebase Auth account
      await user.delete();
      
      toast.dismiss();
      toast.success('Account deleted successfully');
      router.push('/');
      
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.dismiss();
      toast.error('Failed to delete account. Please try again or contact support.');
    }
  };

  const clearLocalData = () => {
    if (confirm('This will clear all local app data and refresh the page. Continue?')) {
      localStorage.clear();
      sessionStorage.clear();
      toast.success('Local data cleared');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-200 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl animate-pulse mb-4">⚙️</div>
          <p className="text-purple-700">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-200 p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-purple-700 mb-2">
            ⚙️ Garden Settings
          </h1>
          <p className="text-gray-600">
            Customize your garden experience and manage your account
          </p>
        </div>

        <div className="space-y-6">
          
          {/* Account Settings */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-purple-700 mb-4">👤 Account Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                  <Input
                    value={accountSettings.displayName}
                    onChange={(e) => setAccountSettings(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="Your display name"
                    maxLength={50}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <Input
                    value={accountSettings.location}
                    onChange={(e) => setAccountSettings(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="City, Country"
                    maxLength={100}
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea
                    value={accountSettings.bio}
                    onChange={(e) => setAccountSettings(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell others about your gardening journey..."
                    className="w-full border border-gray-300 rounded px-3 py-2 resize-none"
                    rows={3}
                    maxLength={200}
                  />
                  <p className="text-xs text-gray-500 mt-1">{accountSettings.bio.length}/200</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <Input
                    value={accountSettings.website}
                    onChange={(e) => setAccountSettings(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://yourwebsite.com"
                    type="url"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={userProfile?.username || 'Not set'}
                      disabled
                      className="bg-gray-50"
                    />
                    <Button 
                      onClick={() => setShowUsernameModal(true)}
                      variant="outline"
                      size="sm"
                    >
                      Change
                    </Button>
                  </div>
                </div>
              </div>
              
              <Button onClick={saveAccountSettings} disabled={saving}>
                {saving ? 'Saving...' : 'Save Account Settings'}
              </Button>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-purple-700 mb-4">🔒 Privacy Settings</h2>
              
              <div className="space-y-4 mb-6">
                {[
                  { key: 'profilePrivacy', label: 'Profile Visibility', description: 'Who can see your profile page' },
                  { key: 'gardenPrivacy', label: 'Garden Visibility', description: 'Who can visit and water your garden' },
                  { key: 'badgesPrivacy', label: 'Badges Visibility', description: 'Who can see your badges and achievements' },
                  { key: 'timelinePrivacy', label: 'Timeline Visibility', description: 'Who can see your activity timeline' }
                ].map((setting) => (
                  <div key={setting.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">{setting.label}</p>
                      <p className="text-sm text-gray-600">{setting.description}</p>
                    </div>
                    <select
                      value={privacySettings[setting.key]}
                      onChange={(e) => setPrivacySettings(prev => ({ ...prev, [setting.key]: e.target.value }))}
                      className="border border-gray-300 rounded px-3 py-1 text-sm"
                    >
                      <option value="public">🌍 Public</option>
                      <option value="friends">👥 Friends Only</option>
                      <option value="private">🔒 Private</option>
                    </select>
                  </div>
                ))}
                
                {/* Additional privacy toggles */}
                <div className="border-t pt-4">
                  {[
                    { key: 'allowFriendWatering', label: 'Allow Friend Watering', description: 'Let friends water your seeds' },
                    { key: 'showActivity', label: 'Show Activity Status', description: 'Show when you were last active' },
                    { key: 'showStats', label: 'Show Garden Stats', description: 'Display your garden statistics publicly' }
                  ].map((toggle) => (
                    <div key={toggle.key} className="flex items-center justify-between p-3">
                      <div>
                        <p className="font-medium text-gray-800">{toggle.label}</p>
                        <p className="text-sm text-gray-600">{toggle.description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={privacySettings[toggle.key]}
                          onChange={(e) => setPrivacySettings(prev => ({ ...prev, [toggle.key]: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <Button onClick={savePrivacySettings} disabled={saving}>
                {saving ? 'Saving...' : 'Save Privacy Settings'}
              </Button>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-purple-700 mb-4">🔔 Notifications</h2>
              
              <div className="space-y-3 mb-6">
                {[
                  { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive notifications via email' },
                  { key: 'friendRequests', label: 'Friend Requests', description: 'When someone wants to follow you' },
                  { key: 'gardenActivity', label: 'Garden Activity', description: 'When friends water your seeds' },
                  { key: 'achievementAlerts', label: 'Achievement Alerts', description: 'When you earn new badges' },
                  { key: 'weeklyDigest', label: 'Weekly Garden Digest', description: 'Summary of your garden progress' },
                  { key: 'communityUpdates', label: 'Community Updates', description: 'News about the garden community' },
                  { key: 'marketingEmails', label: 'Marketing Emails', description: 'Updates about new features' }
                ].map((notif) => (
                  <div key={notif.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">{notif.label}</p>
                      <p className="text-sm text-gray-600">{notif.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings[notif.key]}
                        onChange={(e) => setNotificationSettings(prev => ({ ...prev, [notif.key]: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                ))}
              </div>
              
              <Button onClick={saveNotificationSettings} disabled={saving}>
                {saving ? 'Saving...' : 'Save Notification Settings'}
              </Button>
            </CardContent>
          </Card>

          {/* App Preferences */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-purple-700 mb-4">🎨 App Preferences</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
                  <select
                    value={appPreferences.theme}
                    onChange={(e) => setAppPreferences(prev => ({ ...prev, theme: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="light">☀️ Light</option>
                    <option value="dark">🌙 Dark</option>
                    <option value="system">🖥️ System</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                  <select
                    value={appPreferences.language}
                    onChange={(e) => setAppPreferences(prev => ({ ...prev, language: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="en">🇺🇸 English</option>
                    <option value="es">🇪🇸 Español</option>
                    <option value="fr">🇫🇷 Français</option>
                    <option value="de">🇩🇪 Deutsch</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Daily Reminder Time</label>
                  <input
                    type="time"
                    value={appPreferences.reminderTime}
                    onChange={(e) => setAppPreferences(prev => ({ ...prev, reminderTime: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  />
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                {[
                  { key: 'autoSave', label: 'Auto-save', description: 'Automatically save your progress' },
                  { key: 'compactMode', label: 'Compact Mode', description: 'Use a denser layout' },
                  { key: 'soundEffects', label: 'Sound Effects', description: 'Play sounds for interactions' },
                  { key: 'animations', label: 'Animations', description: 'Enable visual animations' },
                  { key: 'dailyReminders', label: 'Daily Reminders', description: 'Remind me to water my seeds' }
                ].map((pref) => (
                  <div key={pref.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">{pref.label}</p>
                      <p className="text-sm text-gray-600">{pref.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={appPreferences[pref.key]}
                        onChange={(e) => setAppPreferences(prev => ({ ...prev, [pref.key]: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                ))}
              </div>
              
              <Button onClick={saveAppPreferences} disabled={saving}>
                {saving ? 'Saving...' : 'Save App Preferences'}
              </Button>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-purple-700 mb-4">📊 Data Management</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">Export My Data</p>
                    <p className="text-sm text-gray-600">Download all your garden data as JSON</p>
                  </div>
                  <Button onClick={handleExportData} variant="outline">
                    📥 Export
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">Clear Local Data</p>
                    <p className="text-sm text-gray-600">Clear cached data and preferences</p>
                  </div>
                  <Button onClick={clearLocalData} variant="outline">
                    🧹 Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-red-700 mb-4">⚠️ Danger Zone</h2>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-800 mb-2">Delete Account</h3>
                <p className="text-sm text-red-700 mb-4">
                  This will permanently delete your account, all your flowers, badges, and activity. 
                  This action cannot be undone.
                </p>
                
                {!showDeleteConfirm ? (
                  <Button 
                    onClick={() => setShowDeleteConfirm(true)}
                    variant="destructive"
                    size="sm"
                  >
                    Delete My Account
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-red-800">
                      Type "DELETE MY ACCOUNT" to confirm:
                    </p>
                    <Input
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="DELETE MY ACCOUNT"
                      className="max-w-xs"
                    />
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== 'DELETE MY ACCOUNT'}
                        variant="destructive"
                        size="sm"
                      >
                        Permanently Delete
                      </Button>
                      <Button 
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText('');
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Back to Garden Button */}
        <div className="text-center mt-8">
          <Button onClick={() => router.push('/')} variant="outline">
            🌱 Back to Garden
          </Button>
        </div>
      </div>
      
      {/* Username Change Modal */}
      <UsernameChangeModal
        isOpen={showUsernameModal}
        onClose={() => setShowUsernameModal(false)}
        currentUsername={userProfile?.username}
      />
    </div>
  );
}
