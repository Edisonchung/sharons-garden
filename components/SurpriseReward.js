// components/SurpriseReward.js
import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';

const rewardPool = [
  { type: 'quote', content: '“Every emotion you plant grows into a flower of strength.”' },
  { type: 'sticker', content: '/rewards/blessing-sticker.png' },
  { type: 'audio', content: '/rewards/sharon-message.mp3' },
  { type: 'gift', content: '🎁 You’ve unlocked a mystery reward! Check your email!' }
];

export default function SurpriseReward({ onClose }) {
  const [reward, setReward] = useState(null);

  useEffect(() => {
    confetti();
    const chosen = rewardPool[Math.floor(Math.random() * rewardPool.length)];
    setReward(chosen);
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm text-center relative">
        <h2 className="text-2xl font-bold text-purple-700 mb-4">🌟 Surprise Reward!</h2>

        {reward?.type === 'quote' && (
          <p className="text-md italic text-gray-600">{reward.content}</p>
        )}

        {reward?.type === 'sticker' && (
          <img src={reward.content} alt="sticker" className="w-40 h-40 mx-auto" />
        )}

        {reward?.type === 'audio' && (
          <audio controls className="mx-auto">
            <source src={reward.content} type="audio/mp3" />
            Your browser does not support the audio element.
          </audio>
        )}

        {reward?.type === 'gift' && (
          <p className="text-lg text-green-600 font-medium">{reward.content}</p>
        )}

        <button
          onClick={onClose}
          className="mt-6 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Close
        </button>
      </div>
    </div>
  );
}
