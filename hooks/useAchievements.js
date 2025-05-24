import { useEffect, useState } from 'react';

export default function useAchievements(flowers) {
  const [newBadge, setNewBadge] = useState(null);

  useEffect(() => {
    // Example logic: Unlock a badge after 5 bloomed flowers
    const bloomedCount = flowers.filter(f => f.bloomed).length;
    if (bloomedCount >= 5) {
      setNewBadge({
        title: 'Bloom Master',
        description: 'You bloomed 5 flowers!',
      });
    }
  }, [flowers]);

  return { newBadge, clearBadge: () => setNewBadge(null) };
}
