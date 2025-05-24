import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import useAchievements from '../../../hooks/useAchievements';

export default function PublicBadgesPage() {
  const router = useRouter();
  const { username } = router.query;

  const [profile, setProfile] = useState(null);
  const [userBadges, setUserBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { getAllBadges } = useAchievements();

  useEffect(() => {
    if (!username) return;

    const fetchUserByUsername = async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setNotFound(true);
          return;
        }

        const userDoc = snapshot.docs[0];
        const data = userDoc.data();

        if (data.public === false) {
          setNotFound(true);
          return;
        }

        setProfile({
          name: data.displayName || username,
          avatar: data.photoURL || '',
          joined: data.joinedAt?.toDate?.().toLocaleDateString() || 'N/A'
        });

        setUserBadges(data.badges || []);
      } catch (err) {
        console.error('Failed to load user badges:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchUserByUsername();
  }, [username]);

  if (loading) {
    return <p className="text-center mt-10">Loading {username}’s badges...</p>;
  }

  if (notFound) {
    return <p className="text-center mt-10 text-red-500">User not found or profile is private.</p>;
  }

  const allBadges = getAllBadges();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-black p-6 text-center">
      <div className="mb-6">
        {profile.avatar && (
          <img
            src={profile.avatar}
            alt={profile.name}
            className="mx-auto rounded-full w-24 h-24 mb-2 border-4 border-white shadow"
          />
        )}
        <h1 className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">
          🎖️ {profile.name}’s Badges
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Joined: {profile.joined}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
        {allBadges.map((badge) => {
          const earned = userBadges.includes(badge.emoji);
          return (
            <div
              key={badge.emoji}
              className={`p-4 rounded-xl border shadow transition-all duration-200 ${
                earned
                  ? 'bg-white dark:bg-gray-800 border-green-300 text-green-700 dark:text-green-300'
                  : 'bg-gray-100 dark:bg-gray-800 border-gray-300 text-gray-400 opacity-50 grayscale'
              }`}
            >
              <div className="text-4xl mb-2">{badge.emoji}</div>
              <h3 className="font-semibold">{badge.name}</h3>
              <p className="text-xs mt-1">
                {earned ? badge.description : 'Keep growing to unlock!'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
