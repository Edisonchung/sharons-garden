// pages/settings.js
import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    displayName: '',
    age: '',
    profilePic: '',
    email: '',
    darkMode: 'off',
    language: 'en',
    fontSize: 'medium',
    notifications: true
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setFormData({
            ...formData,
            ...userDoc.data(),
            email: currentUser.email || ''
          });
          applyPreferences(userDoc.data());
        } else {
          setFormData({ ...formData, email: currentUser.email || '' });
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const applyPreferences = (prefs) => {
    if (prefs.darkMode === 'on') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.style.fontSize =
      prefs.fontSize === 'small' ? '14px' : prefs.fontSize === 'large' ? '18px' : '16px';
  };

  const handleSave = async () => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid), formData, { merge: true });
    applyPreferences(formData);
    alert('Preferences saved!');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-white p-6">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <div className="grid gap-4 max-w-xl">
        <label>
          Display Name
          <input name="displayName" value={formData.displayName} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-800" />
        </label>
        <label>
          Age
          <input name="age" type="number" value={formData.age} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-800" />
        </label>
        <label>
          Profile Picture URL
          <input name="profilePic" value={formData.profilePic} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-800" />
        </label>
        {formData.profilePic && (
          <img src={formData.profilePic} alt="Profile Preview" className="h-24 w-24 rounded-full object-cover" />
        )}
        <label>
          Email (Read-only)
          <input value={formData.email} readOnly className="w-full p-2 border rounded bg-gray-200 dark:bg-gray-800" />
        </label>
        <label>
          Dark Mode
          <select name="darkMode" value={formData.darkMode} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-800">
            <option value="off">Off</option>
            <option value="on">On</option>
          </select>
        </label>
        <label>
          Language
          <select name="language" value={formData.language} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-800">
            <option value="en">English</option>
            <option value="zh">Chinese</option>
            <option value="ms">Malay</option>
          </select>
        </label>
        <label>
          Font Size
          <select name="fontSize" value={formData.fontSize} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-800">
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="notifications" checked={formData.notifications} onChange={handleChange} />
          Enable Email Notifications
        </label>
        <button onClick={handleSave} className="bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700">
          Save Preferences
        </button>
      </div>
    </div>
  );
}
