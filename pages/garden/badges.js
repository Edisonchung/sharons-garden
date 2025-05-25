import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import useAchievements from '../../hooks/useAchievements';
import ProgressBadge from '../../components/ProgressBadge';
import toast from 'react-hot-toast';

export default function AchievementsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rewards, setRewards] = useState([]);
  const { badges, getBadgeDetails, getAllBadges } = useAchievements();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const rewardQuery = query(
            collection(db, 'rewards'),
            where('userId', '==', currentUser.uid),
            orderBy('timestamp', 'desc')
          );
          const rewardSnap = await getDocs(rewardQuery);
          setRewards(rewardSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (err) {
          console.error(err);
          toast.error('Failed to load rewards.');
        }
      } else {
        router.push('/auth');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-100 to-purple-200">
        <p className="text-purple-600 text-lg">🔄 Loading achievements...</p>
      </div>
    );
  }

  const earned = badges;
  const all = getAllBadges();
  const unearned = all.filter(b => b.progress && !earned.includes(b.emoji));

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-200 p-6 text-center">
      <h1 className="text-3xl font-bold text-purple-700 mb-6">🏅 My Achievements</h1>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-purple-600 mb-3">Unlocked Badges</h2>
        {badges.length === 0 ? (
          <p className="text-gray-500 italic mb-6">No badges yet. Keep growing!</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {badges.map((emoji) => {
              const badge = getBadgeDetails(emoji);
              if (!badge) return null;
              return (
                <div key={emoji} className="p-4 bg-white rounded-xl shadow border border-purple-200 text-left">
                  <div className="text-xl mb-1">{badge.emoji} <strong>{badge.name}</strong></div>
                  <p className="text-sm text-gray-600">{badge.description}</p>
                  {badge.earnedDate && (
                    <p className="text-xs text-gray-400 mt-1 italic">✅ Earned on: {badge.earnedDate}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-purple-600 mb-3">Badges in Progress</h2>
        {unearned.length === 0 ? (
          <p className="text-gray-500 italic mb-6">No badge progress yet.</p>
        ) : (
          <div className="flex flex-col gap-4 mb-6">
            {unearned.map(badge => (
              <ProgressBadge key={badge.emoji} badge={badge} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold text-purple-700 mb-3">🎁 My Rewards</h2>
        {rewards.length === 0 ? (
          <p className="text-gray-500 italic">No rewards unlocked yet.</p>
        ) : (
          <ul className="space-y-3 text-left max-w-md mx-auto">
            {rewards.map((r) => (
              <li key={r.id} className="p-3 bg-white rounded-xl shadow border border-purple-200">
                <div className="font-medium text-purple-700">{r.rewardType} • {r.seedType}</div>
                <div className="text-sm text-gray-600">{r.description}</div>
                {r.timestamp?.seconds && (
                  <div className="text-xs text-gray-400 mt-1 italic">
                    🎉 Earned on: {new Date(r.timestamp.seconds * 1000).toLocaleDateString()}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
