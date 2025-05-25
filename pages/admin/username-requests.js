import { useEffect, useState } from 'react';
import { db, auth } from '../../lib/firebase';
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  orderBy
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import { onAuthStateChanged } from 'firebase/auth';
import { Button } from '../../components/ui/button';

const ADMIN_EMAILS = ['edisonchung612@gmail.com']; // Customize this list

export default function UsernameRequestsAdmin() {
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentAdminEmail, setCurrentAdminEmail] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && ADMIN_EMAILS.includes(user.email)) {
        setIsAdmin(true);
        setCurrentAdminEmail(user.email);
        fetchRequests();
      } else {
        toast.error('Access denied');
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchRequests = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'usernameRequests'), orderBy('timestamp', 'desc')));
      const all = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPending(all.filter(r => r.status === 'pending'));
      setHistory(all.filter(r => r.status !== 'pending'));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (req) => {
    try {
      await updateDoc(doc(db, 'users', req.userId), {
        username: req.requestedUsername
      });
      await updateDoc(doc(db, 'usernameRequests', req.id), {
        status: 'approved',
        handledAt: new Date().toISOString(),
        handledBy: currentAdminEmail
      });
      toast.success(`✅ Approved ${req.requestedUsername}`);
      fetchRequests();
    } catch (err) {
      console.error(err);
      toast.error('Approval failed');
    }
  };

  const handleReject = async (req) => {
    try {
      await updateDoc(doc(db, 'usernameRequests', req.id), {
        status: 'rejected',
        handledAt: new Date().toISOString(),
        handledBy: currentAdminEmail
      });
      toast('❌ Rejected');
      fetchRequests();
    } catch (err) {
      console.error(err);
      toast.error('Rejection failed');
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 text-red-600">
        <p>Access denied. Admins only.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold text-purple-700 mb-6">🛠️ Username Change Requests</h1>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <>
          <section className="mb-10">
            <h2 className="text-lg font-semibold mb-2 text-purple-700">🟡 Pending Requests</h2>
            {pending.length === 0 ? (
              <p className="text-gray-500 italic">No pending requests.</p>
            ) : (
              <ul className="space-y-4">
                {pending.map((r) => (
                  <li key={r.id} className="bg-white p-4 rounded shadow flex flex-col gap-1">
                    <div><strong>From:</strong> {r.currentEmail}</div>
                    <div><strong>Current Username:</strong> {r.currentUsername || 'N/A'}</div>
                    <div><strong>Requested:</strong> {r.requestedUsername}</div>
                    <div className="flex gap-3 mt-2">
                      <Button onClick={() => handleApprove(r)}>✅ Approve</Button>
                      <Button onClick={() => handleReject(r)} variant="outline">❌ Reject</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2 text-purple-700">📜 History</h2>
            {history.length === 0 ? (
              <p className="text-gray-500 italic">No handled requests yet.</p>
            ) : (
              <ul className="space-y-4">
                {history.map((r) => (
                  <li key={r.id} className="bg-white p-4 rounded shadow flex flex-col gap-1">
                    <div><strong>From:</strong> {r.currentEmail}</div>
                    <div><strong>Requested:</strong> {r.requestedUsername}</div>
                    <div className="text-sm italic text-gray-600">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-white ${
                          r.status === 'approved' ? 'bg-green-600' : 'bg-red-500'
                        }`}
                      >
                        {r.status.toUpperCase()}
                      </span>{' '}
                      by {r.handledBy || 'Unknown'} on{' '}
                      {new Date(r.handledAt).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}