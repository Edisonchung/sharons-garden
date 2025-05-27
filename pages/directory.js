// pages/directory.js - Complete user directory with advanced browsing
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { collection, getDocs, query, where, orderBy, limit, startAfter } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ProfileHelpers } from '../utils/searchHelpers';
import toast from 'react-hot-toast';

export default function UserDirectoryPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');
  const [filterBy, setFilterBy] = useState('all');
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeToday: 0,
    totalBlooms: 0,
    totalSeeds: 0
  });

  const sortOptions = [
    { value: 'newest', label: 'Newest Members', emoji: '🆕' },
    { value: 'active', label: 'Most Active', emoji: '🔥' },
    { value: 'blooms', label: 'Most Blooms', emoji: '🌸' },
    { value: 'helpful', label: 'Most Helpful', emoji: '🤝' },
    { value: 'score', label: 'Highest Score', emoji: '🏆' }
  ];

  const filterOptions = [
    { value: 'all', label: 'All Users', emoji: '👥' },
    { value: 'verified', label: 'Verified', emoji: '✓' },
    { value: 'active', label: 'Active Today', emoji: '🌱' },
    { value: 'helpers', label: 'Community Helpers', emoji: '🤝' },
    { value: 'collectors', label: 'Rare Collectors', emoji: '💎' }
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [sortBy, filterBy]);

  const loadUsers = async (loadMore = false) => {
    try {
      if (!loadMore) {
        setLoading(true);
        setUsers([]);
        setLastVisible(null);
        setHasMore(true);
      }

      // Base query for public users
      let q = query(
        collection(db, 'users'),
        where('public', '!=', false),
        limit(20)
      );

      // Apply sorting
      switch (sortBy) {
        case 'newest':
          q = query(q, orderBy('public'), orderBy('joinedAt', 'desc'));
          break;
        case 'active':
          q = query(q, orderBy('public'), orderBy('lastActive', 'desc'));
          break;
        default:
          q = query(q, orderBy('public'), orderBy('joinedAt', 'desc'));
      }

      if (loadMore && lastVisible) {
        q = query(q, startAfter(lastVisible));
      }

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setHasMore(false);
        if (!loadMore) setUsers([]);
        return;
      }

      const userList = [];
      let totalBlooms = 0;
      let totalSeeds = 0;
      let activeToday = 0;

      for (const userDoc of snapshot.docs) {
        const userData = userDoc.data();
        
        if (!userData.username) continue;

        // Load user stats
        try {
          const flowersSnap = await getDocs(query(
            collection(db, 'flowers'),
            where('userId', '==', userDoc.id)
          ));

          const wateringsSnap = await getDocs(query(
            collection(db, 'waterings'),
            where('wateredByUserId', '==', userDoc.id)
          ));

          const flowers = flowersSnap.docs.map(doc => doc.data());
          const blooms = flowers.filter(f => f.bloomed);

          const userStats = {
            totalSeeds: flowers.length,
            totalBlooms: blooms.length,
            rareFlowers: blooms.filter(f => f.rarity === 'rare').length,
            specialSeeds: flowers.filter(f => f.specialSeed || f.songSeed).length,
            friendsHelped: new Set(wateringsSnap.docs.map(doc => doc.data().seedOwnerId)).size,
            conversionRate: flowers.length > 0 ? (blooms.length / flowers.length) * 100 : 0,
            currentStreak: userData.wateringStreak || 0
          };

          userStats.overallScore = ProfileHelpers.calculateGardenScore(userStats);

          // Check if active today
          const lastActive = userData.lastActive?.toDate?.();
          const isActiveToday = lastActive && (Date.now() - lastActive.getTime()) < (24 * 60 * 60 * 1000);
          if (isActiveToday) activeToday++;

          // Apply filters
          if (filterBy === 'verified' && !userData.verified) continue;
          if (filterBy === 'active' && !isActiveToday) continue;
          if (filterBy === 'helpers' && userStats.friendsHelped < 5) continue;
          if (filterBy === 'collectors' && userStats.rareFlowers < 3) continue;

          totalBlooms += userStats.totalBlooms;
          totalSeeds += userStats.totalSeeds;

          userList.push({
            id: userDoc.id,
            ...userData,
            stats: userStats,
            isActiveToday,
            joinedAt: userData.joinedAt?.toDate?.() || new Date(),
            lastActive: lastActive || userData.joinedAt?.toDate?.() || new Date()
          });

        } catch (statsError) {
          console.warn('Could not load stats for user:', userDoc.id);
        }
      }

      // Sort users by selected criteria
      userList.sort((a, b) => {
        switch (sortBy) {
          case 'blooms':
            return b.stats.totalBlooms - a.stats.totalBlooms;
          case 'helpful':
            return b.stats.friendsHelped - a.stats.friendsHelped;
          case 'score':
            return b.stats.overallScore - a.stats.overallScore;
          case 'active':
            return b.lastActive - a.lastActive;
          default:
            return b.joinedAt - a.joinedAt;
        }
      });

      if (loadMore) {
        setUsers(prev => [...prev, ...userList]);
      } else {
        setUsers(userList);
        setStats(prev => ({
          ...prev,
          totalUsers: userList.length,
          activeToday,
          totalBlooms,
          totalSeeds
        }));
      }

      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(userList.length === 20);

    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load user directory');
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (username) => {
    router.push(`/u/${username}`);
  };

  const handleGardenClick = (username) => {
    router.push(`/u/${username}/garden`);
  };

  const getActivityStatus = (user) => {
    if (user.isActiveToday) return { text: 'Active today', color: 'green', emoji: '🟢' };
    
    const daysSinceActive = Math.floor((Date.now() - user.lastActive.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceActive <= 7) return { text: 'Active this week', color: 'blue', emoji: '🔵' };
    if (daysSinceActive <= 30) return { text: 'Active this month', color: 'yellow', emoji: '🟡' };
    
    return { text: 'Inactive', color: 'gray', emoji: '⚪' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-100 to-pink-200 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-purple-700 mb-2">
            📖 Community Directory
          </h1>
          <p className="text-gray-600">
            Browse and connect with gardeners from around the world
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.totalUsers}</div>
              <p className="text-sm text-gray-600">Total Gardeners</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.activeToday}</div>
              <p className="text-sm text-gray-600">Active Today</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-pink-600">{stats.totalBlooms}</div>
              <p className="text-sm text-gray-600">Total Blooms</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalSeeds}</div>
              <p className="text-sm text-gray-600">Total Seeds</p>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl p-4 mb-8 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            
            {/* Sort Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort by:</label>
              <div className="flex gap-2 flex-wrap">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSortBy(option.value)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      sortBy === option.value
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-purple-100'
                    }`}
                  >
                    {option.emoji} {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by:</label>
              <div className="flex gap-2 flex-wrap">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFilterBy(option.value)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      filterBy === option.value
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-indigo-100'
                    }`}
                  >
                    {option.emoji} {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* User Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-4xl animate-pulse mb-4">👥</div>
            <p className="text-purple-700">Loading directory...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No gardeners found</h3>
            <p className="text-gray-500">Try adjusting your filters or check back later</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.map((user) => {
                const activity = getActivityStatus(user);
                const achievements = ProfileHelpers.generateAchievementTags(user, user.stats);
                
                return (
                  <Card key={user.id} className="bg-white shadow-lg hover:shadow-xl transition-all">
                    <CardContent className="p-6">
                      
                      {/* User Header */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className="relative">
                          <img
                            src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.username)}&background=a855f7&color=fff`}
                            alt="Profile"
                            className="w-12 h-12 rounded-full border-2 border-purple-200"
                          />
                          <div 
                            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white"
                            style={{ backgroundColor: activity.color }}
                            title={activity.text}
                          />
                        </div>
                        
                        <div className="flex-1">
                          <h3 className="font-semibold text-purple-700">
                            {user.displayName || user.username}
                          </h3>
                          <p className="text-sm text-gray-600">@{user.username}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs">{activity.emoji}</span>
                            <span className="text-xs text-gray-500">{activity.text}</span>
                          </div>
                        </div>
                      </div>

                      {/* Bio */}
                      {user.bio && (
                        <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                          {user.bio}
                        </p>
                      )}

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                        <div>
                          <div className="text-lg font-bold text-green-600">{user.stats.totalBlooms}</div>
                          <p className="text-xs text-gray-600">Blooms</p>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-blue-600">{user.stats.friendsHelped}</div>
                          <p className="text-xs text-gray-600">Helped</p>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-purple-600">{user.stats.overallScore}</div>
                          <p className="text-xs text-gray-600">Score</p>
                        </div>
                      </div>

                      {/* Achievement Tags */}
                      {achievements.length > 0 && (
                        <div className="flex gap-1 mb-4 justify-center flex-wrap">
                          {achievements.map((achievement, idx) => (
                            <span 
                              key={idx}
                              className={`text-xs px-2 py-1 rounded-full bg-${achievement.color}-100 text-${achievement.color}-800`}
                            >
                              {achievement.emoji} {achievement.label}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Special Features */}
                      <div className="flex gap-1 mb-4 justify-center flex-wrap">
                        {user.stats.rareFlowers > 0 && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                            💎 {user.stats.rareFlowers} Rare
                          </span>
                        )}
                        {user.stats.specialSeeds > 0 && (
                          <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                            ✨ {user.stats.specialSeeds} Special
                          </span>
                        )}
                        {user.stats.currentStreak > 7 && (
                          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                            🔥 {user.stats.currentStreak}d streak
                          </span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleUserClick(user.username)}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          👤 Profile
                        </Button>
                        <Button
                          onClick={() => handleGardenClick(user.username)}
                          size="sm"
                          className="flex-1"
                        >
                          🌱 Garden
                        </Button>
                      </div>

                      {/* Join Date */}
                      <div className="mt-3 text-center">
                        <p className="text-xs text-gray-500">
                          Joined {formatDistanceToNow(user.joinedAt, { addSuffix: true })}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="text-center mt-8">
                <Button onClick={() => loadUsers(true)} variant="outline">
                  Load More Gardeners
                </Button>
              </div>
            )}
          </>
        )}

        {/* Call to Action */}
        {!currentUser && (
          <div className="mt-12 text-center bg-white rounded-xl p-8 shadow-lg">
            <h3 className="text-2xl font-bold text-purple-700 mb-4">
              🌱 Join Our Growing Community
            </h3>
            <p className="text-gray-600 mb-6">
              Connect with gardeners worldwide and start your emotional garden journey!
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => router.push('/auth')}>
                🌸 Sign Up Now
              </Button>
              <Button onClick={() => router.push('/explore')} variant="outline">
                👥 Explore More
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// pages/top-badges.js - Community badge leaderboard
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { BADGE_CATALOG } from '../hooks/useAchievements';

export default function TopBadgesPage() {
  const router = useRouter();
  const [badgeLeaderboard, setBadgeLeaderboard] = useState([]);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBadgeLeaderboard();
  }, []);

  const loadBadgeLeaderboard = async () => {
    try {
      setLoading(true);
      
      // Get all public users with badges
      const usersSnap = await getDocs(query(
        collection(db, 'users'),
        where('public', '!=', false)
      ));

      const badgeStats = {};
      const userBadges = {};

      usersSnap.docs.forEach(doc => {
        const userData = doc.data();
        if (!userData.username || !userData.badges) return;

        userBadges[doc.id] = {
          id: doc.id,
          username: userData.username,
          displayName: userData.displayName || userData.username,
          photoURL: userData.photoURL,
          badges: userData.badges,
          totalBadges: userData.badges.length
        };

        userData.badges.forEach(badge => {
          if (!badgeStats[badge]) {
            badgeStats[badge] = [];
          }
          badgeStats[badge].push(userBadges[doc.id]);
        });
      });

      // Create leaderboard data
      const leaderboard = Object.entries(BADGE_CATALOG).map(([key, badgeInfo]) => {
        const holders = badgeStats[badgeInfo.emoji] || [];
        return {
          ...badgeInfo,
          holders: holders.length,
          topHolders: holders.slice(0, 10),
          rarity: holders.length === 0 ? 'Legendary' :
                  holders.length <= 5 ? 'Ultra Rare' :
                  holders.length <= 20 ? 'Rare' :
                  holders.length <= 50 ? 'Uncommon' : 'Common'
        };
      });

      // Sort by rarity (fewer holders = rarer)
      leaderboard.sort((a, b) => a.holders - b.holders);

      setBadgeLeaderboard(leaderboard);

    } catch (error) {
      console.error('Error loading badge leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'Legendary': return 'text-purple-600 bg-purple-100';
      case 'Ultra Rare': return 'text-pink-600 bg-pink-100';
      case 'Rare': return 'text-yellow-600 bg-yellow-100';
      case 'Uncommon': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl animate-pulse mb-4">🏆</div>
          <p className="text-indigo-700">Loading badge statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-700 mb-2">
            🏆 Badge Hall of Fame
          </h1>
          <p className="text-gray-600">
            See which badges are the rarest and who has earned them
          </p>
        </div>

        {/* Badge Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {badgeLeaderboard.map((badge) => (
            <Card 
              key={badge.id} 
              className="bg-white shadow-lg hover:shadow-xl transition-all cursor-pointer"
              onClick={() => setSelectedBadge(badge)}
            >
              <CardContent className="p-6 text-center">
                
                {/* Badge Display */}
                <div className="text-6xl mb-4">{badge.emoji}</div>
                
                <h3 className="text-xl font-bold text-indigo-700 mb-2">
                  {badge.name}
                </h3>
                
                <p className="text-sm text-gray-600 mb-4">
                  {badge.description}
                </p>

                {/* Rarity */}
                <div className="mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRarityColor(badge.rarity)}`}>
                    {badge.rarity}
                  </span>
                </div>

                {/* Stats */}
                <div className="space-y-2">
                  <div>
                    <span className="text-2xl font-bold text-indigo-600">{badge.holders}</span>
                    <p className="text-sm text-gray-500">gardeners earned this</p>
                  </div>
                  
                  {badge.holders > 0 && (
                    <div className="text-xs text-gray-400">
                      {((badge.holders / badgeLeaderboard.reduce((total, b) => total + b.holders, 0)) * 100).toFixed(1)}% of all badges
                    </div>
                  )}
                </div>

                {/* Top Holders Preview */}
                {badge.topHolders.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-500 mb-2">Recent holders:</p>
                    <div className="flex justify-center">
                      {badge.topHolders.slice(0, 3).map((holder, idx) => (
                        <img
                          key={holder.id}
                          src={holder.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(holder.displayName)}&background=a855f7&color=fff&size=32`}
                          alt={holder.displayName}
                          className="w-8 h-8 rounded-full border-2 border-white -ml-2 first:ml-0"
                          title={holder.displayName}
                        />
                      ))}
                      {badge.topHolders.length > 3 && (
                        <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white -ml-2 flex items-center justify-center text-xs text-gray-500">
                          +{badge.topHolders.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Badge Detail Modal */}
        {selectedBadge && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="text-center flex-1">
                    <div className="text-6xl mb-2">{selectedBadge.emoji}</div>
                    <h2 className="text-2xl font-bold text-indigo-700">{selectedBadge.name}</h2>
                    <p className="text-gray-600">{selectedBadge.description}</p>
                  </div>
                  <button
                    onClick={() => setSelectedBadge(null)}
                    className="text-gray-500 hover:text-gray-700 text-xl"
                  >
                    ✕
                  </button>
                </div>

                {/* Badge Stats */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-indigo-600">{selectedBadge.holders}</div>
                      <p className="text-sm text-gray-600">Total Holders</p>
                    </div>
                    <div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getRarityColor(selectedBadge.rarity)}`}>
                        {selectedBadge.rarity}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Rarity Level</p>
                    </div>
                  </div>
                </div>

                {/* Holders List */}
                {selectedBadge.topHolders.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-indigo-700 mb-4">
                      Badge Holders ({selectedBadge.holders})
                    </h3>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {selectedBadge.topHolders.map((holder, index) => (
                        <div key={holder.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                          <img
                            src={holder.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(holder.displayName)}&background=a855f7&color=fff&size=40`}
                            alt="Profile"
                            className="w-10 h-10 rounded-full border border-purple-200"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">{holder.displayName}</p>
                            <p className="text-sm text-gray-500">@{holder.username}</p>
                          </div>
                          <div className="text-sm text-gray-400">
                            {holder.totalBadges} badges
                          </div>
                          <Button
                            onClick={() => router.push(`/u/${holder.username}`)}
                            size="sm"
                            variant="outline"
                          >
                            Visit
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedBadge.holders === 0 && (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">🏆</div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                      No one has earned this badge yet!
                    </h3>
                    <p className="text-gray-500">
                      Be the first to unlock this achievement
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-12 text-center bg-white rounded-xl p-8 shadow-lg">
          <h3 className="text-2xl font-bold text-indigo-700 mb-4">
            🏅 Start Earning Badges
          </h3>
          <p className="text-gray-600 mb-6">
            Begin your journey and work towards these prestigious achievements!
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => router.push('/')}>
              🌱 Start Gardening
            </Button>
            <Button onClick={() => router.push('/explore')} variant="outline">
              👥 Explore Community
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
