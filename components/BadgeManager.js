
import { useEffect, useState } from 'react';
import useAchievements from '../hooks/useAchievements';
import BadgePopup from './BadgePopup';

export default function BadgeManager({ flowers }) {
  const { newBadge, unlockBadge } = useAchievements();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !Array.isArray(flowers)) return;

    const bloomCount = flowers.filter(f => f.bloomed).length;
    if (bloomCount >= 5) {
      unlockBadge('🌿 Green Thumb');
    }

    const hasTouched = flowers.some(f => f.touchedBySharon);
    if (hasTouched) {
      unlockBadge('💜 Touched by Sharon');
    }
  }, [flowers, isClient]);

  if (!isClient || !Array.isArray(flowers)) return null;

  return <>{newBadge && <BadgePopup badgeName={newBadge} />}</>;
}
