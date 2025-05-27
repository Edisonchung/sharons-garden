// pages/u/[username]/badges.js - Enhanced and Fixed Version
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { PublicProfileLayout, getCurrentPageFromPath } from '../../../components/PublicProfileLayout';
import { BADGE_CATALOG } from '../../../hooks/useAchievements';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import toast from 'react-hot-toast';

// Enhanced badge categories for better organization
const BADGE_CATEGORIES = {
  growth: { 
    name: 'Growth & Progress', 
    emoji: '🌱', 
    color: 'green',
    description: 'Badges for planting and growing flowers'
  },
  social: { 
    name: 'Community Helper', 
    emoji: '🤝', 
    color: 'blue',
    description: 'Badges for helping other gardeners'
  },
  achievement: { 
    name: 'Special Achievements', 
    emoji: '🏆', 
    color: 'yellow',
    description: 'Rare and special accomplishments'
  },
  consistency: { 
    name: 'Dedication', 
    emoji: '🔥', 
    color: 'orange',
    description: 'Badges for consistent daily activity'
  },
  exclusive: { 
    name: 'Exclusive', 
    emoji: '✨', 
    color: 'purple',
    description: 'Limited edition and special event badges'
  }
};

export default function EnhancedPublicBadgesPage() {
  const router = useRouter();
  const { username } = router.query;

  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [userBadges, setUserBadges] = useState([]);
  const [badgeProgress, setBadgeProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [userStats, setUserStats] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!username) return;
    fetchUserBadgeData();
  }, [username]);

  const fetchUserBadgeData = async () => {
    try {
      setLoading(true);
      setNotFound(false);

      // Find user by username
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', username));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setNotFound(true);
        return;
      }

      const userDoc = snapshot.docs[0];
      const data = userDoc.data();

      // Check if badges are public
      if (data.public === false || data.badgesPrivate === true) {
        setNotFound(true);
        return;
      }

      // Enhanced profile data
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
          blooms: 0,
          helped: 0
        }
      };

      setProfile(profileData);
      setUserBadges(data.badges || []);

      // Load comprehensive user stats
      await loadUserStats(userDoc.id, profileData);

      // Load badge progress for unearned badges
      await loadBadgeProgress(data.badges || []);

    } catch (err) {
      console.error('Failed to load user badges:', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async (userId, profileData) => {
    try {
      // Get user's flowers
      const flowersSnap = await getDocs(query(
        collection(db, 'flowers'),
        where('userId', '==', userId)
      ));

      // Get watering activities  
      const wateringsSnap = await getDocs(query(
        collection(db, 'waterings'),
        where('wateredByUserId', '==', userId)
      ));

      const flowers = flowersSnap.docs.map(doc => doc.data());
      const blooms = flowers.filter(f => f.bloomed);

      // Calculate comprehensive stats
      const stats = {
        totalSeeds: flowers.length,
        totalBlooms: blooms.length,
        rareFlowers: blooms.filter(f => f.rarity === 'rare').length,
        legendaryFlowers: blooms.filter(f => f.rarity === 'legendary').length,
        specialSeeds: flowers.filter(f => f.specialSeed || f.songSeed).length,
        conversionRate: flowers.length > 0 ? Math.round((blooms.length / flowers.length) * 100) : 0,
        friendsHelped: new Set(wateringsSnap.docs.map(doc => doc.data().seedOwnerId)).size,
        totalWaterings: wateringsSnap.size,
        recentlyActive: flowers.some(f => {
          const created = new Date(f.createdAt || Date.now());
          return (Date.now() - created.getTime()) < (7 * 24 * 60 * 60 * 1000);
        })
      };

      // Update profile stats
      setProfile(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          blooms: stats.totalBlooms,
          helped: stats.friendsHelped
        }
      }));

      setUserStats(stats);

    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const loadBadgeProgress = async (earnedBadges) => {
    try {
      const progressData = {};
      const allBadges = Object.values(BADGE_CATALOG);

      for (const badge of allBadges) {
        const earned = earnedBadges.includes(badge.emoji);
        if (!earned && badge.progress) {
          // Calculate progress based on user stats
          const progress = calculateBadgeProgress(badge, userStats);
          if (progress) {
            progressData[badge.emoji] = progress;
          }
        }
      }

      setBadgeProgress(progressData);
    } catch (error) {
      console.error('Error loading badge progress:', error);
    }
  };

  const calculateBadgeProgress = (badge, stats) => {
    if (!badge.progress || !stats) return null;

    const { type, target } = badge.progress;
    let current = 0;

    switch (type) {
      case 'blooms':
        current = stats.totalBlooms || 0;
        break;
      case 'helps':
        current = stats.friendsHelped || 0;
        break;
      case 'waterings':
        current = stats.totalWaterings || 0;
        break;
      case 'rare':
        current = stats.rareFlowers || 0;
        break;
      case 'conversion':
        current = stats.conversionRate || 0;
        break;
      default:
        return null;
    }

    return { current, target };
  };

  const handleWaterBadge = async (badgeEmoji) => {
    if (!currentUser) {
      toast.error('Please sign in to water badges');
      return;
    }

    const today = new Date().toDateString();
    const localKey = `badgeWatered_${currentUser.uid}_${profile.id}_${badgeEmoji}`;
    const lastWater = localStorage.getItem(localKey);

    if (lastWater === today) {
      toast.error("You've already watered this badge today!");
      return;
    }

    try {
      const userRef = doc(db, 'users', profile.id);
      const progressField = `badgeProgress.${badgeEmoji}`;
      
      await updateDoc(userRef, {
        [progressField]: userStats.totalBlooms + 1 // Simplified increment
      });

      localStorage.setItem(localKey, today);
      toast.success("🌱 You've helped this badge grow!");

      // Update local state
      setBadgeProgress(prev => ({
        ...prev,
        [badgeEmoji]: {
          ...prev[badgeEmoji],
          current: (prev[badgeEmoji]?.current || 0) + 1
        }
      }));

    } catch (err) {
      console.error("Failed to water badge:", err);
      toast.error("Failed to water badge. Please try again.");
    }
  };

  // Filter badges based on category and search
  const getFilteredBadges = () => {
    const allBadges = Object.values(BADGE_CATALOG);
    
    let filtered = allBadges;
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(badge => {
        // You'd need to add category field to BADGE_CATALOG
        return badge.category === selectedCategory;
      });
    }

    if (searchTerm) {
      filtered = filtered.filter(badge => 
        badge.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        badge.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const currentPage = getCurrentPageFromPath(router.pathname);

  return (
    <PublicProfileLayout 
      username={username} 
      userData={profile} 
      currentPage={currentPage}
      loading={loading}
      notFound={notFound}
    >
      <div className="space-y-6">
        
        {/* Enhanced Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-indigo-700 dark:text-indigo-300 mb-2">
            🎖️ Achievement Collection
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {profile?.displayName}'s badges and progress in Sharon's Garden
          </p>
        </div>

        {/* Enhanced Badge Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">{userBadges.length}</div>
              <p className="text-sm text-purple-700 dark:text-purple-300">Total Badges</p>
              <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                {Math.round((userBadges.length / Object.keys(BADGE_CATALOG).length) * 100)}% complete
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{userStats.totalBlooms || 0}</div>
              <p className="text-sm text-green-700 dark:text-green-300">Flowers Bloomed</p>
              {userStats.rareFlowers > 0 && (
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                  💎 {userStats.rareFlowers} rare
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{userStats.conversionRate || 0}%</div>
              <p className="text-sm text-blue-700 dark:text-blue-300">Success Rate</p>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {userStats.totalSeeds || 0} seeds planted
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-yellow-600">{userStats.friendsHelped || 0}</div>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">Friends Helped</p>
              <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                {userStats.totalWaterings || 0} waterings
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            
            {/* Search */}
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search badges..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900'
                }`}
              >
                All Badges
              </button>
              {Object.entries(BADGE_CATEGORIES).map(([key, category]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedCategory === key
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900'
                  }`}
                >
                  {category.emoji} {category.name}
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded text-sm ${
                  viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow' : ''
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded text-sm ${
                  viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow' : ''
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Badges Display */}
        <div className={viewMode === 'grid' ? 
          "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6" : 
          "space-y-4"
        }>
          {getFilteredBadges().map((badge) => {
            const earned = userBadges.includes(badge.emoji);
            const progress = badgeProgress[badge.emoji];
            const completionPercentage = progress ? 
              Math.min((progress.current / progress.target) * 100, 100) : 0;

            if (viewMode === 'list') {
              return (
                <Card key={badge.emoji} className="bg-white dark:bg-gray-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`text-5xl ${earned ? '' : 'grayscale opacity-50'}`}>
                        {badge.emoji}
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-semibold ${earned ? 'text-green-700 dark:text-green-300' : 'text-gray-500'}`}>
                          {badge.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {badge.description}
                        </p>
                        
                        {!earned && progress && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>Progress</span>
                              <span>{progress.current} / {progress.target}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-green-400 h-2 rounded-full transition-all"
                                style={{ width: `${completionPercentage}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {earned ? (
                        <div className="text-center">
                          <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                            ✅ Earned
                          </span>
                        </div>
                      ) : (
                        <Button 
                          onClick={() => handleWaterBadge(badge.emoji)} 
                          size="sm"
                          variant="outline"
                        >
                          💧 Water
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            }

            return (
              <Card
                key={badge.emoji}
                className={`transition-all duration-200 hover:shadow-lg ${
                  earned
                    ? 'bg-white dark:bg-gray-800 border-green-300 dark:border-green-600'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 opacity-75'
                }`}
              >
                <CardContent className="p-4 text-center">
                  <div className={`text-4xl mb-2 ${earned ? '' : 'grayscale'}`}>
                    {badge.emoji}
                  </div>
                  
                  <h3 className={`font-semibold text-sm mb-1 ${
                    earned ? 'text-green-700 dark:text-green-300' : 'text-gray-500'
                  }`}>
                    {badge.name}
                  </h3>
                  
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {badge.description}
                  </p>

                  {earned ? (
                    <div className="text-center">
                      <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                        ✅ Earned
                      </span>
                    </div>
                  ) : progress ? (
                    <>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                        <div
                          className="bg-green-400 h-2 rounded-full transition-all"
                          style={{ width: `${completionPercentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        {progress.current} / {progress.target}
                      </p>
                      <Button 
                        onClick={() => handleWaterBadge(badge.emoji)} 
                        size="sm"
                        variant="outline"
                        className="w-full"
                      >
                        💧 Water
                      </Button>
                    </>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Keep growing to unlock!
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {getFilteredBadges().length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No badges found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}

        {/* Encourage Interaction */}
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-700">
          <CardContent className="p-6 text-center">
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
              <Button variant="outline" onClick={() => router.push(`/u/${username}`)}>
                👤 View Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PublicProfileLayout>
  );
}
