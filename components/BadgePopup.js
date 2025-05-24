import React from 'react';
import { Button } from './ui/button';

export default function BadgePopup({ badge, onClose }) {
  if (!badge) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl text-center max-w-sm animate-bounce">
        <div className="text-5xl mb-3">{badge.emoji || '🏅'}</div>
        <h2 className="text-2xl font-bold text-purple-700 dark:text-purple-300 mb-2">
          🎉 New Badge Unlocked!
        </h2>
        <p className="text-lg font-semibold">{badge.name || badge.title || 'New Badge'}</p>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          {badge.description || 'You’ve unlocked a new milestone!'}
        </p>
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}
