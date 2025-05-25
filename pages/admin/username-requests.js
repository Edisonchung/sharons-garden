import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { auth, db } from '../../lib/firebase';
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import toast from 'react-hot-toast';

export default function UsernameRequestsPage() {
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Admin-only access control
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) return router.push('/');

      const userDoc = await getDocs(
        query(collection(db, 'users'), orderBy('joinedAt', 'desc'))
      );
      const currentUserData = userDoc.docs.find(doc => doc.id === currentUser.uid)?.data();

      if (!currentUserData || currentUserData.role !== 'admin') {
        toast.error('Access denied: Admins only');
        return router.push('/');
      }

      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  // Fetch username requests
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const q = query(collection(db, 'usernameRequests'), orderBy('timestamp', 'desc'));
        const snap = await getDocs(q);
        setRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error(err);
        toast.error('Failed to fetch requests');
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const handleApprove = async (r) => {
    try {
      await updateDoc(doc(db, 'users', r.userId), { username: r.newUsername });
      await deleteDoc(doc(db, 'usernameRequests', r.id));
      toast.success(`Approved ${r.newUsername}`);
      setRequests((prev) => prev.filter(req => req.id !== r.id));
    } catch (err) {
      console.error(err);
      toast.error('Approval failed');
    }
  };

  const handleReject = async (r) => {
    try {
      await deleteDoc(doc(db, 'usernameRequests', r.id));
      toast.success(`Rejected ${r.newUsername}`);
      setRequests((prev) => prev.filter(req => req.id !== r.id));
    } catch (err) {
      console.error(err);
      toast.error('Rejection failed');
    }
  };

  if (loading) {
    return <p className="text-center mt-10">Loading requests...</p>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-100 p-6">
      <h1 className="text-3xl font-bold text-purple-700 mb-6 text-center">
        🛠 Username Change Requests
      </h1>

      {requests.length === 0 ? (
        <p className="text-center text-gray-500">No pending requests</p>
      ) : (
        <ul className="space-y-4 max-w-xl mx-auto">
          {requests.map((r) => (
            <li key={r.id} className="bg-white shadow rounded-xl p-4 border border-purple-200">
              <p className="text-sm mb-1">
                <span className="font-semibold text-purple-700">{r.oldUsername || '(none)'}</span>
                {' → '}
                <span className="font-semibold text-green-600">{r.newUsername}</span>
              </p>
              <p className="text-xs text-gray-500 mb-2 italic">{r.reason}</p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => handleReject(r)}
                  className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleApprove(r)}
                  className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white text-sm"
                >
                  Approve
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}