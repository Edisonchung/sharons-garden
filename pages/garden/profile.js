// pages/garden/profile.js
import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

const db = getFirestore();
const auth = getAuth();

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [notify, setNotify] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setEmail(data.email || currentUser.email);
          setNotify(data.notify_opt_in ?? true);
        } else {
          setEmail(currentUser.email);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const savePreferences = async () => {
    if (!user) return;
    await setDoc(doc(db, 'users', user.uid), {
      email,
      displayName: user.displayName,
      avatar: user.photoURL,
      notify_opt_in: notify,
    }, { merge: true });
    alert('Preferences saved!');
  };

  if (loading) return <p className="text-center mt-10">Loading profile...</p>;

  return (
    <div className="p-6 max-w-md mx-auto bg-white shadow rounded">
      <h2 className="text-2xl font-bold mb-4">👤 Profile & Email Preferences</h2>
      <label className="block font-medium mb-1">Email:</label>
      <input
        className="border p-2 w-full mb-4"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <label className="block font-medium mb-2">
        <input
          type="checkbox"
          checked={notify}
          onChange={(e) => setNotify(e.target.checked)}
          className="mr-2"
        />
        Receive daily watering reminders via email
      </label>
      <button
        onClick={savePreferences}
        className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded"
      >
        Save
      </button>
    </div>
  );
}
