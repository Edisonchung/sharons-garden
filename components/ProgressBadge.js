// components/ProgressBadge.js
import { useEffect, useState } from 'react';
import useAchievements from '../hooks/useAchievements';

export default function ProgressBadge({ badge }) {
  const { getBadgeProgress } = useAchievements();
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      const result = await getBadgeProgress(badge);
      setProgress(result);
    };
    fetch();
  }, [badge]);

  if (!progress) return null;

  const percentage = Math.min((progress.current / progress.target) * 100, 100).toFixed(0);
  const isAlmost = progress.current > 0 && progress.current < progress.target;

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-yellow-200 text-left">
      <div className="flex items-center gap-3 mb-2">
        <div className="text-2xl">{badge.emoji}</div>
        <div>
          <h3 className="font-bold text-purple-700 dark:text-purple-300">{badge.name}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{badge.description}</p>
        </div>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2 overflow-hidden">
        <div
          className="bg-yellow-400 h-2.5"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Progress: {progress.current} / {progress.target} {isAlmost && '✨ Almost there!'}
      </p>
    </div>
  );
}
