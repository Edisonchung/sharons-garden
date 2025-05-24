import React, { useEffect, useState } from 'react';
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Button } from '../../components/ui/button';
import { toast } from 'react-hot-toast';

export default function SettingsPage() {
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState(null);
  const [notify, setNotify] = useState(true);
  const [loading, setLoading] = useState(true);
  const [visibility, setVisibility] = useState({
    displayName: true,
    age: false,
    email: false
  });

  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    if (!isClient) return;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        try {
          const docRef = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(docRef);

          if (snap.exists()) {
            const prefs = snap.data();
            setNotify(prefs.notify ?? true);
            setVisibility(prefs.visibility || { displayName: true, age: false, email: false });
          }
        } catch (err) {
          console.error('Failed to fetch settings:', err);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isClient]);

  const handleSave = async () => {
    if (!user) return;

    const prefs = {
      notify,
      visibility
    };

    try {
      await setDoc(doc(db, 'users', user.uid), prefs, { merge: true });
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error(error.message);
      toast.error('Failed to save settings');
    }
  };

  if (!isClient || loading) {
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
          <label className="block font-medium">🔔 Daily Reminder</label>
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
            className="mt-1"
          />
        </div>

        <div className="mb-6">
          <label className="block font-medium">👁️ Public Profile Visibility</label>

          <div className="flex items-center mt-2">
            <input
              type="checkbox"
              checked={visibility.displayName}
              onChange={(e) => setVisibility((prev) => ({ ...prev, displayName: e.target.checked }))}
              className="mr-2"
            />
            <span>Display Name</span>
          </div>

          <div className="flex items-center mt-2">
            <input
              type="checkbox"
              checked={visibility.age}
              onChange={(e) => setVisibility((prev) => ({ ...prev, age: e.target.checked }))}
              className="mr-2"
            />
            <span>Age</span>
          </div>

          <div className="flex items-center mt-2">
            <input
              type="checkbox"
              checked={visibility.email}
              onChange={(e) => setVisibility((prev) => ({ ...prev, email: e.target.checked }))}
              className="mr-2"
            />
            <span>Email</span>
          </div>
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
