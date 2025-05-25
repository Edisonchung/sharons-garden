import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { auth, db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function UsernameChangeModal({ isOpen, onClose }) {
  const [requestedUsername, setRequestedUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = requestedUsername.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (trimmed.length < 3) {
      toast.error('Username too short');
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'usernameRequests'), {
        userId: user.uid,
        currentEmail: user.email,
        currentUsername: user.displayName || '',
        requestedUsername: trimmed,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      toast.success('Request submitted!');
      setRequestedUsername('');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed z-50 inset-0 p-4 flex items-center justify-center">
      <Dialog.Panel className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-xl max-w-md w-full">
        <Dialog.Title className="text-lg font-bold mb-4 text-purple-700">Request Username Change</Dialog.Title>
        <input
          type="text"
          placeholder="Enter new username"
          value={requestedUsername}
          onChange={(e) => setRequestedUsername(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 mb-3"
        />
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} variant="outline">Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Sending...' : 'Submit'}
          </Button>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
}