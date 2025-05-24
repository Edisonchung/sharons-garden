import { Dialog } from '@headlessui/react';
import { useState } from 'react';
import { Button } from './ui/button';

export default function RewardRedemptionModal({ reward, isOpen, onClose }) {
  const [redeemed, setRedeemed] = useState(reward?.redeemed || false);

  const handleRedeem = () => {
    // Optionally update Firestore here
    setRedeemed(true);
  };

  if (!reward) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-40" />
      <Dialog.Panel className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 max-w-md w-full z-50">
        <Dialog.Title className="text-lg font-bold text-purple-700 dark:text-white mb-2">
          🎁 {reward.rewardType} - {reward.seedType}
        </Dialog.Title>
        <p className="text-gray-700 dark:text-gray-300 mb-4">{reward.description}</p>

        {reward.link && (
          <a
            href={reward.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-purple-600 hover:underline text-sm mb-4"
          >
            👉 View linked reward
          </a>
        )}

        {redeemed ? (
          <p className="text-green-600 font-semibold">✅ Reward redeemed</p>
        ) : (
          <Button onClick={handleRedeem} className="w-full">
            🎉 Redeem Now
          </Button>
        )}

        <div className="mt-4 text-right">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
}  
