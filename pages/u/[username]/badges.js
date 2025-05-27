// pages/u/[username]/badges.js - Updated with Unified Navigation
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { PublicProfileLayout, getCurrentPageFromPath } from '../../../components/PublicProfileLayout';
import useAchievements from '../../../hooks/useAchievements';
import { Button } from '../../../components/ui/button';

export default function PublicBadgesPage() {
  const router = useRouter();
  const { username } = router.query;

  const [profile, setProfile] = useState(null);
  const [userBadges, setUserBadges] = useState([]);
  const [badgeProgress, setBadgeProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [userStats, setUserStats] = useState({});

  const { getAllBadges, getBadgeProgress } = useAchievements();

  useEffect(() => {
    if (!username) return;

    const fetchUserByUsername = async () => {
      try {
        setLoading(true);
        setNotFound(false);

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

        // Set profile data with enhanced information
        const profileData = {
          id: userDoc.id,
          username: data.username,
          displayName: data.displayName || username,
          photoURL: data.photoURL || '',
          bio: data.bio || '',
          joinedDate: data.joinedAt?.toDate?.().toLocaleDateString() || 'N/A',
          isVerified: data.verified || false,
          stats: {
            badges: (data.badges || []).length,
            blooms: 0, // Will be calculated below
            helped: 0  // Will be calculated below
          }
        };

        setProfile(profileData);
        setUserBadges(data.badges || []);

        // Calculate additional stats
        await loadUserStats(userDoc.id, profileData);

        // Load badge progress for unearned badges
        const all = getAllBadges();
        const progressData = {};
        for (const badge of all) {
          const earned = (data.badges || []).includes(badge.emoji);
          if (!earned && badge.progress) {
            try {
              const prog = await getBadgeProgress(badge);
              progressData[badge.emoji] = prog;
            } catch (err) {
              console.warn('Failed to get progress for badge:', badge.name, err);
              progressData[badge.emoji] = { current: 0, target: badge.progress.target };
            }
          }
        }
        setBadgeProgress(progressData);

      } catch (err) {
        console.error('Failed to load user badges:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchUserByUsername();
  }, [username, getAllBadges, getBadgeProgress]);

  const loadUserStats = async (userId, profileData) => {
    try {
      // Get user's flowers to calculate bloom stats
      const flowersSnap = await getDocs(query(
        collection(db, 'flowers'),
        where('userId', '==', userId)
      ));

      // Get watering activities to calculate help stats
      const wateringsSnap = await getDocs(query(
        collection(db, 'waterings'),
        where('wateredByUserId', '==', userId)
      ));

      const flowers = flowersSnap.docs.map(doc => doc.data());
      const blooms = flowers.filter(f => f.bloomed);

      // Update profile stats
      const updatedStats = {
        ...profileData.stats,
        blooms: blooms.length,
        helped: wateringsSnap.size
      };

      setProfile(prev => ({
        ...prev,
        stats: updatedStats
      }));

      // Set additional user stats for the page
      setUserStats({
        totalSeeds: flowers.length,
        totalBlooms: blooms.length,
        rareFlowers: blooms.filter(f => f.rarity === 'rare').length,
        specialSeeds: flowers.filter(f => f.specialSeed || f.songSeed).length,
        conversionRate: flowers.length > 0 ? Math.round((blooms.length / flowers.length) * 100) : 0
      });

    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const handleWaterBadge = async (emoji) => {
    const today = new Date().toDateString();
    const localKey = `publicWatered_${profile.id}_${emoji}`;
    const lastWater = localStorage.getItem(localKey);

    if (lastWater === today) {
      alert("You've already watered this badge today!");
      return;
    }

    try {
      const userRef = doc(db, 'users', profile.id);
      const snap = await getDoc(userRef);
      if (!snap.exists()) return;
      const data = snap.data();

      const existingProgress = data.badgeProgress?.[emoji] || 0;
      const updated = existingProgress + 1;
      await updateDoc(userRef, {
        [`badgeProgress.${emoji}`]: updated
      });

      localStorage.setItem(localKey, today);
      alert("🌱 You've helped this badge grow!");

      // Update local progress state
      setBadgeProgress(prev => ({
        ...prev,
        [emoji]: {
          ...prev[emoji],
          current: updated
        }
      }));

    } catch (err) {
      console.error("Failed to water badge:", err);
    }
  };

  const allBadges = getAllBadges();
  const currentPage = getCurrentPageFromPath(router.pathname);

  return (
    <PublicProfileLayout 
      username={username} 
      userData={profile} 
      currentPage={currentPage}
      loading={loading}
      notFound={notFound}
    >
      {/* Page Content */}
      <div className="space-y-6">
        
        {/* Page Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-indigo-700 dark:text-indigo-300 mb-2">
            🎖️ Achievement Collection
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {profile?.displayName}'s badges and progress
          </p>
        </div>

        {/* Badge Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow">
            <div className="text-2xl font-bold text-purple-600">{userBadges.length}</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Badges</p>
          </div>
          <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow">
            <div className="text-2xl font-bold text-green-600">{userStats.totalBlooms || 0}</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Flowers Bloomed</p>
          </div>
          <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow">
            <div className="text-2xl font-bold text-blue-600">{userStats.conversionRate || 0}%</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
          </div>
          <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow">
            <div className="text-2xl font-bold text-yellow-600">{userStats.rareFlowers || 0}</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Rare Flowers</p>
          </div>
        </div>

        {/* Achievement Progress Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
          <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-4">
            🏆 Achievement Progress
          </h3>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all"
              style={{ 
                width: `${Math.min((userBadges.length / allBadges.length) * 100, 100)}%` 
              }}
            />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {userBadges.length} of {allBadges.length} badges earned 
            ({Math.round((userBadges.length / allBadges.length) * 100)}% complete)
          </p>
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {allBadges.map((badge) => {
            const earned = userBadges.includes(badge.emoji);
            const progress = badgeProgress[badge.emoji];

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

                {!earned && progress && (
                  <>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                      <div
                        className="bg-green-400 h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min((progress.current / progress.target) * 100, 100)}%`
                        }}
                      />
                    </div>
                    <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                      {progress.current} / {progress.target}
                    </p>
                    <Button 
                      onClick={() => handleWaterBadge(badge.emoji)} 
                      className="mt-2 w-full" 
                      variant="outline"
                      size="sm"
                    >
                      💧 Water this badge
                    </Button>
                  </>
                )}

                {earned && (
                  <div className="mt-2">
                    <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                      ✅ Earned
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {userBadges.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🌱</div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No badges yet!
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {profile?.displayName} is just getting started in their garden journey.
            </p>
            <Button onClick={() => router.push(`/u/${username}/garden`)}>
              🌱 Visit Their Garden
            </Button>
          </div>
        )}

        {/* Encourage Interaction */}
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-xl p-6 text-center">
          <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-2">
            💧 Help {profile?.displayName} Grow!
          </h3>
          <p className="text-purple-600 dark:text-purple-400 mb-4">
            Water their badge progress and visit their garden to help them earn more achievements.
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            <Button onClick={() => router.push(`/u/${username}/garden`)}>
              🌱 Water Their Garden
            </Button>
            <Button variant="outline" onClick={() => router.push(`/u/${username}/timeline`)}>
              📖 View Timeline
            </Button>
          </div>
        </div>
      </div>
    </PublicProfileLayout>
  );
}
