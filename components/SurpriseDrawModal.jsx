// components/SurpriseDrawModal.jsx
import { Dialog } from '@headlessui/react';

export default function SurpriseDrawModal({ reward, isOpen, onClose }) {
  if (!reward) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <Dialog.Panel className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 text-center max-w-md w-full border border-purple-200 dark:border-purple-700">
          <Dialog.Title className="text-2xl font-bold text-purple-700 dark:text-purple-300 mb-2">
            🎁 Surprise Reward!
          </Dialog.Title>

          <div className="text-5xl mb-3">{reward.label}</div>
          <p className="text-md text-gray-700 dark:text-gray-300">{reward.description}</p>

          <button
            onClick={onClose}
            className="mt-6 px-4 py-2 bg-purple-600 text-white font-semibold rounded hover:bg-purple-700 transition"
          >
            Awesome!
          </button>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
