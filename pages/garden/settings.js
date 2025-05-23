// pages/garden/settings.js
import { useEffect, useState } from 'react';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [preferences, setPreferences] = useState({
    darkMode: false,
    language: 'en',
    fontSize: 'medium'
  });

  // Fetch user info and listen for preference changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const prefRef = doc(db, 'preferences', currentUser.uid);

        // Real-time listener for multi-device sync
        const unsubscribeSnapshot = onSnapshot(prefRef, (docSnap) => {
          if (docSnap.exists()) {
            setPreferences(docSnap.data());
          }
        });

        return () => unsubscribeSnapshot();
      } else {
        setUser(null);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const updatePreference = async (key, value) => {
    if (!user) return;
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    await setDoc(doc(db, 'preferences', user.uid), updated);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <h1 className="text-2xl font-bold text-purple-700 dark:text-purple-300 mb-4">⚙️ Settings</h1>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-lg dark:text-white">🌙 Dark Mode</span>
          <input
            type="checkbox"
            checked={preferences.darkMode}
            onChange={(e) => updatePreference('darkMode', e.target.checked)}
            className="w-5 h-5"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-lg dark:text-white mb-1">🌐 Language</label>
          <select
            value={preferences.language}
            onChange={(e) => updatePreference('language', e.target.value)}
            className="p-2 rounded"
          >
            <option value="en">English</option>
            <option value="ms">Bahasa Malaysia</option>
            <option value="zh">中文</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-lg dark:text-white mb-1">🔠 Font Size</label>
          <select
            value={preferences.fontSize}
            onChange={(e) => updatePreference('fontSize', e.target.value)}
            className="p-2 rounded"
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>
      </div>
    </div>
  );
}
