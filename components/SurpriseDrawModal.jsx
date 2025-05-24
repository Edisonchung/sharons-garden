import { useEffect, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';

const surpriseRewards = [
  {
    title: '🌟 You got a Hug Token!',
    description: 'Redeemable for a virtual hug from Sharon anytime 💗'
  },
  {
    title: '🎶 Secret Song Link!',
    description: 'Listen to Sharon’s favorite uplifting melody 🎧'
  },
  {
    title: '📖 Inspiring Quote',
    description: '“Even the smallest seed can bloom the brightest.” ✨'
  },
  {
    title: '🧁 Digital Treat!',
    description: 'You’ve earned a delicious digital cupcake. Enjoy it guilt-free!'
  },
  {
    title: '💌 Surprise Letter',
    description: 'A surprise note from Sharon to lift your spirit 💌'
  }
];

export default function SurpriseDrawModal({ isOpen, onClose }) {
  const [reward, setReward] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const random = surpriseRewards[Math.floor(Math.random() * surpriseRewards.length)];
      setReward(random);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <Dialog.Panel className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full p-6 text-center">
          <Dialog.Title className="text-2xl font-bold text-purple-700 dark:text-white mb-4">
            🎁 Surprise Draw
          </Dialog.Title>

          {reward && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="mb-6"
            >
              <h2 className="text-xl font-semibold text-green-600 dark:text-green-300">{reward.title}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{reward.description}</p>
            </motion.div>
          )}

          <Button onClick={onClose} className="w-full mt-4">
            🎉 Got it!
          </Button>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
