import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function UsernameRequestStatus({ userId }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const fetchStatus = async () => {
      try {
        const snap = await getDoc(doc(db, 'usernameRequests', userId));
        if (snap.exists()) {
          setStatus(snap.data());
        }
      } catch (err) {
        console.error('Failed to fetch username request status', err);
      }
    };

    fetchStatus();
  }, [userId]);

  if (!status) return null;

  return (
    <div className="mt-4 p-4 border border-purple-200 bg-purple-50 rounded-xl text-left">
      <h3 className="text-sm font-bold text-purple-700 mb-2">🕵️ Username Request Status</h3>
      <p className="text-sm text-gray-700">
        <strong>Requested:</strong> <span className="text-purple-600">{status.requestedUsername}</span>
      </p>
      <p className="text-sm text-gray-700">
        <strong>Status:</strong> <span className="capitalize">{status.status}</span>
      </p>
      {status.timestamp && (
        <p className="text-xs text-gray-500 italic">
          Submitted on {new Date(status.timestamp).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}