import { useEffect, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Button } from './ui/button';

export default function SurpriseDrawModal({ reward, isOpen, onClose }) {
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  const handleSaveReward = async () => {
    if (!user || !reward) return;

    try {
      setSaving(true);
      await addDoc(collection(db, 'rewards'), {
        userId: user.uid,
        seedType: reward.seedType || 'Unknown',
        rewardType: reward.type || 'mystery',
        description: reward.description || '',
        timestamp: serverTimestamp()
      });
      setSaved(true);
    } catch (err) {
      console.error('Failed to save reward:', err);
      alert('Something went wrong while saving your reward.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    await handleSaveReward();
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <Dialog.Panel className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 text-center">
          <Dialog.Title className="text-2xl font-bold text-purple-700 dark:text-white mb-4">
            🎁 Surprise Reward!
          </Dialog.Title>
          <p className="text-lg mb-4 text-gray-700 dark:text-gray-300">
            {reward?.description || 'You’ve unlocked a special gift!'}
          </p>

          <div className="mt-4 space-y-2">
            <Button
              onClick={handleConfirm}
              disabled={saving}
              className="w-full"
            >
              {saving ? 'Saving...' : '🎉 Claim Reward'}
            </Button>
            <Button onClick={onClose} variant="outline" className="w-full">
              Maybe Later
            </Button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
