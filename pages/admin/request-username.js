import { useEffect, useState } from 'react';
import { auth, db } from '../../lib/firebase';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/button';

export default function RequestUsernamePage() {
  const [user, setUser] = useState(null);
  const [currentUsername, setCurrentUsername] = useState('');
  const [requestedUsername, setRequestedUsername] = useState('');
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const snap = await getDoc(doc(db, 'users', currentUser.uid));
        if (snap.exists()) {
          setCurrentUsername(snap.data().username || '');
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleRequest = async () => {
    const trimmed = requestedUsername.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (trimmed.length < 3) {
      setStatus('too-short');
      return;
    }

    setSubmitting(true);
    try {
      const q = query(collection(db, 'users'), where('username', '==', trimmed));
      const takenSnap = await getDocs(q);
      const isTaken = takenSnap.docs.some(docSnap => docSnap.id !== user.uid);

      if (isTaken) {
        setStatus('taken');
        return;
      }

      await setDoc(doc(db, 'usernameRequests', user.uid), {
        userId: user.uid,
        currentUsername: currentUsername,
        requestedUsername: trimmed,
        currentEmail: user.email,
        status: 'pending',
        timestamp: new Date().toISOString()
      });

      toast.success('Request submitted!');
      setRequestedUsername('');
      setStatus('submitted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-100 flex flex-col items-center justify-center p-6">
      <div className="bg-white shadow-xl rounded-xl p-6 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-purple-700 mb-4">🔧 Request Username Change</h1>

        {currentUsername && (
          <p className="text-sm text-gray-600 mb-4">
            Current username: <span className="font-semibold text-purple-700">{currentUsername}</span>
          </p>
        )}

        <input
          type="text"
          value={requestedUsername}
          onChange={(e) => {
            setRequestedUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
            setStatus(null);
          }}
          placeholder="New username"
          className="w-full border border-gray-300 rounded px-4 py-2 mb-2"
          disabled={submitting}
        />

        {status === 'too-short' && <p className="text-yellow-600 text-sm">⚠️ At least 3 characters</p>}
        {status === 'taken' && <p className="text-red-500 text-sm">❌ Username taken</p>}
        {status === 'submitted' && <p className="text-green-600 text-sm">✅ Request submitted for review</p>}

        <Button
          onClick={handleRequest}
          disabled={!requestedUsername || submitting}
          className="mt-3 w-full"
        >
          {submitting ? 'Submitting...' : 'Submit Request'}
        </Button>
      </div>
    </div>
  );
}