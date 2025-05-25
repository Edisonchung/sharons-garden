// pages/profile/badges.js
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import useAchievements from '../../hooks/useAchievements';
import ProgressBadge from '../../components/ProgressBadge';
import Head from 'next/head';

export default function BadgeRewardPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rewards, setRewards] = useState([]);
  const { badges, getAllBadges, getBadgeDetails } = useAchievements();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

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
        console.error('Error fetching rewards:', err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <p className="text-center mt-10">Loading badges and rewards...</p>;
  }

  if (!user) {
    return <p className="text-center mt-10 text-red-500">Please sign in to view your achievements.</p>;
  }

  const earned = badges;
  const all = getAllBadges();
  const unearned = all.filter(b => b.progress && !earned.includes(b.emoji));

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-100 p-6">
      <Head>
        <title>My Achievements</title>
      </Head>

      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-3xl font-bold text-purple-700 mb-6">🏅 My Achievements</h1>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-purple-600 mb-3">Unlocked Badges</h2>
          {earned.length === 0 ? (
            <p className="text-gray-500 italic">No badges yet. Keep growing!</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {earned.map((emoji) => {
                const badge = getBadgeDetails(emoji);
                return badge ? (
                  <div key={emoji} className="bg-white rounded-xl p-4 border shadow text-left">
                    <div className="text-xl mb-1">{badge.emoji} <strong>{badge.name}</strong></div>
                    <p className="text-sm text-gray-600">{badge.description}</p>
                  </div>
                ) : null;
              })}
            </div>
          )}
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-purple-600 mb-3">Badges in Progress</h2>
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
          <h2 className="text-xl font-semibold text-purple-600 mb-3">🎁 Rewards</h2>
          {rewards.length === 0 ? (
            <p className="text-gray-500 italic">No rewards unlocked yet.</p>
          ) : (
            <ul className="space-y-3 text-left">
              {rewards.map(r => (
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
