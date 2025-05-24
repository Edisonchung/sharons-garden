import React, { useEffect, useState } from 'react';
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Button } from '../../components/ui/button';
import { useTheme } from 'next-themes';
import { toast } from 'react-hot-toast';

export default function SettingsPage() {
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [email, setEmail] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState('en');
  const [fontSize, setFontSize] = useState('medium');
  const { setTheme } = useTheme();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setEmail(currentUser.email);

        try {
          const docRef = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(docRef);

          if (snap.exists()) {
            const prefs = snap.data();
            setDisplayName(prefs.displayName || '');
            setAge(prefs.age || '');
            setPhotoURL(prefs.photoURL || '');
            setDarkMode(!!prefs.darkMode);
            setLanguage(prefs.language || 'en');
            setFontSize(prefs.fontSize || 'medium');
            setTheme(prefs.darkMode ? 'dark' : 'light');
          }
        } catch (err) {
          console.error('Failed to fetch user settings:', err);
        }
      }
    });

    return () => unsubscribe(); // cleanup listener
  }, [isClient, setTheme]);

  const handleSave = async () => {
    if (!user) return;

    const prefs = {
      displayName,
      age,
      photoURL,
      darkMode,
      language,
      fontSize,
    };

    try {
      await setDoc(doc(db, 'users', user.uid), prefs, { merge: true });
      setTheme(darkMode ? 'dark' : 'light');
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error(error.message);
      toast.error('Failed to save settings');
    }
  };

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center text-purple-700 bg-white dark:bg-black">
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-100 p-6 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-white">
      <div className="max-w-lg mx-auto bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold mb-4 text-purple-700 dark:text-purple-300 text-center">
          Settings
        </h2>

        <div className="mb-4">
          <label className="block font-medium">Profile Picture URL</label>
          <input
            type="text"
            value={photoURL}
            onChange={(e) => setPhotoURL(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
          />
          {photoURL && (
            <img
              src={photoURL}
              alt="Profile Preview"
              className="w-16 h-16 rounded-full mt-2"
            />
          )}
        </div>

        <div className="mb-4">
          <label className="block font-medium">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        <div className="mb-4">
          <label className="block font-medium">Age</label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        <div className="mb-4">
          <label className="block font-medium">Email</label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full p-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 rounded dark:border-gray-600 cursor-not-allowed"
          />
        </div>

        <div className="mb-4">
          <label className="block font-medium">Dark Mode</label>
          <input
            type="checkbox"
            checked={darkMode}
            onChange={(e) => setDarkMode(e.target.checked)}
            className="mt-1"
          />
        </div>

        <div className="mb-4">
          <label className="block font-medium">Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="en">English</option>
            <option value="ms">Bahasa Malaysia</option>
            <option value="zh">中文</option>
          </select>
        </div>

        <div className="mb-6">
          <label className="block font-medium">Font Size</label>
          <select
            value={fontSize}
            onChange={(e) => setFontSize(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="small">Small</option>
            <option value="medium">Medium (Default)</option>
            <option value="large">Large</option>
          </select>
        </div>

        <Button
          onClick={handleSave}
          className="bg-purple-600 hover:bg-purple-700 text-white py-2 rounded w-full"
        >
          Confirm & Save Settings
        </Button>
      </div>
    </div>
  );
}
