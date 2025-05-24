import React, { useEffect, useState } from 'react';
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Button } from '../../components/ui/button';
import { useTheme } from 'next-themes';
import { toast } from 'react-hot-toast';

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    displayName: '',
    age: '',
    photoURL: '',
    language: 'en',
    fontSize: 'medium',
    darkMode: false,
  });
  const [email, setEmail] = useState('');
  const { setTheme } = useTheme();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setEmail(currentUser.email);
        const userRef = doc(db, 'users', currentUser.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          setForm({
            displayName: data.displayName || '',
            age: data.age || '',
            photoURL: data.photoURL || '',
            language: data.language || 'en',
            fontSize: data.fontSize || 'medium',
            darkMode: !!data.darkMode,
          });
          setTheme(data.darkMode ? 'dark' : 'light');
        }
      }
    });

    return () => unsubscribe();
  }, [setTheme]);

  const handleChange = (field) => (e) => {
    const value = field === 'darkMode' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user) return;
    const prefs = {
      ...form,
      age: Number(form.age),
    };
    try {
      await setDoc(doc(db, 'users', user.uid), prefs, { merge: true });
      setTheme(prefs.darkMode ? 'dark' : 'light');
      toast.success('Settings saved successfully!');
    } catch (err) {
      console.error(err.message);
      toast.error('Failed to save settings.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-100 p-6 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-white">
      <div className="max-w-lg mx-auto bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold mb-4 text-purple-700 dark:text-purple-300 text-center">
          Settings
        </h2>

        {[
          { label: 'Profile Picture URL', name: 'photoURL', type: 'text' },
          { label: 'Display Name', name: 'displayName', type: 'text' },
          { label: 'Age', name: 'age', type: 'number' },
        ].map(({ label, name, type }) => (
          <div className="mb-4" key={name}>
            <label className="block font-medium">{label}</label>
            <input
              type={type}
              value={form[name]}
              onChange={handleChange(name)}
              className="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
        ))}

        {form.photoURL && (
          <img
            src={form.photoURL}
            alt="Profile Preview"
            className="w-16 h-16 rounded-full mb-4"
          />
        )}

        <div className="mb-4">
          <label className="block font-medium">Email</label>
          <p className="p-2 bg-gray-100 dark:bg-gray-700 rounded">{email}</p>
        </div>

        <div className="mb-4">
          <label className="block font-medium">Dark Mode</label>
          <input
            type="checkbox"
            checked={form.darkMode}
            onChange={handleChange('darkMode')}
            className="mt-1"
          />
        </div>

        <div className="mb-4">
          <label className="block font-medium">Language</label>
          <select
            value={form.language}
            onChange={handleChange('language')}
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
            value={form.fontSize}
            onChange={handleChange('fontSize')}
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
