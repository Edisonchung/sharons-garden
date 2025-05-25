// pages/profile/badges.js
import { useEffect, useState } from 'react';
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import useAchievements from '../../hooks/useAchievements';
import ProgressBadge from '../../components/ProgressBadge';

export default function BadgesAndRewardsPage() {
  const [user, setUser] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const { badges, getBadgeDetails, getAllBadges } = useAchievements();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        const rewardQuery = query(
          collection(db, 'rewards'),
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc')
        );
        const rewardSnap = await getDocs(rewardQuery);
        setRewards(rewardSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <p className="text-center mt-10">Loading badges and rewards...</p>;
  }

  const all = getAllBadges();
  const unearned = all.filter(b => b.progress && !badges.includes(b.emoji));

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-100 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-purple-700 text-center mb-6">🏅 Badges & 🎁 Rewards</h1>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-purple-700 mb-2">Your Badges</h2>
          {badges.length === 0 ? (
            <p className="text-gray-500 italic">No badges yet. Keep growing!</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {badges.map((emoji) => {
                const badge = getBadgeDetails(emoji);
                if (!badge) return null;
                return (
                  <div key={emoji} className="p-3 bg-white rounded-xl shadow border border-purple-200 text-left">
                    <div className="text-xl mb-1">{badge.emoji} <strong>{badge.name}</strong></div>
                    <p className="text-sm text-gray-600">{badge.description}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-purple-700 mb-2">Badges in Progress</h2>
          {unearned.length === 0 ? (
            <p className="text-gray-500 italic">No badge progress yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {unearned.map(badge => (
                <ProgressBadge key={badge.emoji} badge={badge} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold text-purple-700 mb-2">My Rewards</h2>
          {rewards.length === 0 ? (
            <p className="text-gray-500 italic">You haven't unlocked any rewards yet.</p>
          ) : (
            <ul className="space-y-3 text-left">
              {rewards.map((r) => (
                <li key={r.id} className="p-3 bg-white rounded-xl shadow border border-purple-200">
                  <div className="font-medium text-purple-700">{r.rewardType} • {r.seedType}</div>
                  <div className="text-sm text-gray-600">{r.description}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
