// components/UsernameChangeModal.js
import { useState } from 'react';
import { Button } from './ui/button';
import { auth, db } from '../lib/firebase';
import { addDoc, collection, query, where, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function UsernameChangeModal({ isOpen, onClose, currentUsername }) {
  const [newUsername, setNewUsername] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!newUsername.trim() || !reason.trim()) {
      setStatus('missing-fields');
      return;
    }

    const sanitized = newUsername.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (sanitized.length < 3) {
      setStatus('too-short');
      return;
    }

    if (sanitized === currentUsername) {
      setStatus('same-username');
      return;
    }

    setSubmitting(true);
    setStatus(null);

    try {
      // Check if username is already taken
      const q = query(collection(db, 'users'), where('username', '==', sanitized));
      const takenSnap = await getDocs(q);
      const isTaken = takenSnap.docs.some(docSnap => docSnap.id !== auth.currentUser.uid);

      if (isTaken) {
        setStatus('taken');
        setSubmitting(false);
        return;
      }

      // Submit the request
      await addDoc(collection(db, 'usernameRequests'), {
        userId: auth.currentUser.uid,
        currentUsername: currentUsername,
        requestedUsername: sanitized,
        reason: reason.trim(),
        currentEmail: auth.currentUser.email,
        status: 'pending',
        timestamp: new Date().toISOString()
      });

      toast.success('Username change request submitted for review!');
      setNewUsername('');
      setReason('');
      setStatus('submitted');
      
      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
        setStatus(null);
      }, 2000);

    } catch (err) {
      console.error(err);
      toast.error('Failed to submit request');
      setStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setNewUsername('');
    setReason('');
    setStatus(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
        <h2 className="text-2xl font-bold text-purple-700 mb-4 text-center">
          ✏️ Request Username Change
        </h2>

        {currentUsername && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Current username: <span className="font-semibold text-purple-700">{currentUsername}</span>
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Username
            </label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => {
                setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                setStatus(null);
              }}
              placeholder="Enter new username"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={submitting}
              maxLength={20}
            />
            <p className="text-xs text-gray-500 mt-1">
              Only lowercase letters and numbers allowed (3-20 characters)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Change
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setStatus(null);
              }}
              placeholder="Please explain why you want to change your username..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={3}
              disabled={submitting}
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-1">
              {reason.length}/200 characters
            </p>
          </div>

          {/* Status Messages */}
          {status === 'missing-fields' && (
            <p className="text-red-500 text-sm">⚠️ Please fill in all fields</p>
          )}
          {status === 'too-short' && (
            <p className="text-red-500 text-sm">⚠️ Username must be at least 3 characters</p>
          )}
          {status === 'same-username' && (
            <p className="text-red-500 text-sm">⚠️ New username must be different from current</p>
          )}
          {status === 'taken' && (
            <p className="text-red-500 text-sm">❌ Username is already taken</p>
          )}
          {status === 'error' && (
            <p className="text-red-500 text-sm">❌ Failed to submit request. Please try again.</p>
          )}
          {status === 'submitted' && (
            <p className="text-green-600 text-sm">✅ Request submitted successfully!</p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleClose}
              variant="outline"
              disabled={submitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !newUsername.trim() || !reason.trim()}
              className="flex-1"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
