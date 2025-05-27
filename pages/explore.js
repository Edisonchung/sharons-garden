// pages/explore.js - Fixed version without complex index requirements
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function ExplorePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  
  // User discovery state
  const [users, setUsers] = useState([]);
  const [userStats, setUserStats] = useState({});
  const [usersLoading, setUsersLoading] = useState(false);
  
  // Activity feed state
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  
  // Recent blooms state
  const [recentBlooms, setRecentBlooms] = useState([]);
  const [bloomsLoading, setBloomsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadInitialData();
    }
  }, [loading, activeTab]);

  const loadInitialData = async () => {
    switch (activeTab) {
      case 'users':
        await loadUsers();
        break;
      case 'activity':
        await loadRecentActivity();
        break;
      case 'blooms':
        await loadRecentBlooms();
        break;
      default:
        await loadUsers();
    }
  };

  // Simplified user loading without complex indexes
  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      setUsers([]);

      // Simple query - only filter by public, no complex ordering
      const q = query(
        collection(db, 'users'),
        where('public', '!=', false),
        limit(20)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setUsers([]);
        setUserStats({});
        return;
      }

      const userList = [];
      const stats = {};

      // Process users and load their stats
      for (const userDoc of snapshot.docs) {
        const userData = userDoc.data();
        
        // Skip users without username
        if (!userData.username) continue;

        const userId = userDoc.id;
        
        // Load user's flowers for stats (simplified)
        try {
          const flowersSnap = await getDocs(query(
            collection(db, 'flowers'),
            where('userId', '==', userId),
            limit(30) // Reduced limit for better performance
          ));

          const flowers = flowersSnap.docs.map(doc => doc.data());
          const blooms = flowers.filter(f => f.bloomed);
          
          stats[userId] = {
            totalSeeds: flowers.length,
            totalBlooms: blooms.length,
            rareFlowers: blooms.filter(f => f.rarity === 'rare').length,
            specialSeeds: flowers.filter(f => f.specialSeed || f.songSeed).length,
            conversionRate: flowers.length > 0 ? Math.round((blooms.length / flowers.length) * 100) : 0,
            lastBloom: blooms.length > 0 ? blooms[blooms.length - 1]?.bloomTime?.toDate() : null
          };

        } catch (statsError) {
          console.warn('Could not load stats for user:', userId);
          stats[userId] = {
            totalSeeds: 0,
            totalBlooms: 0,
            rareFlowers: 0,
            specialSeeds: 0,
            conversionRate: 0,
            lastBloom: null
          };
        }

        userList.push({
          id: userId,
          ...userData,
          joinedAt: userData.joinedAt?.toDate?.() || new Date(),
          lastActive: userData.lastActive?.toDate?.() || userData.joinedAt?.toDate?.() || new Date()
        });
      }

      // Sort by garden activity score (client-side)
      userList.sort((a, b) => {
        const scoreA = calculateGardenScore(stats[a.id]);
        const scoreB = calculateGardenScore(stats[b.id]);
        return scoreB - scoreA;
      });

      setUsers(userList);
      setUserStats(stats);

    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load community members');
    } finally {
      setUsersLoading(false);
    }
  };

  // Load recent community activity (simplified)
  const loadRecentActivity = async () => {
    try {
      setActivitiesLoading(true);
      
      // Get recent waterings (simplified query)
      const wateringsQuery = query(
        collection(db, 'waterings'),
        orderBy('timestamp', 'desc'),
        limit(15)
      );
      
      const wateringsSnap = await getDocs(wateringsQuery);
      const activityList = [];

      wateringsSnap.docs.forEach(doc => {
        const data = doc.data();
        
        // Skip self-watering and include only blooms
        if (data.wateredByUserId === data.seedOwnerId || !data.resultedInBloom) return;

        activityList.push({
          id: doc.id,
          type: 'friend_helped_bloom',
          timestamp: data.timestamp?.toDate() || new Date(),
          helper: data.wateredByUsername || 'Someone',
          helperId: data.wateredByUserId,
          owner: data.seedOwnerName || 'Anonymous',
          ownerId: data.seedOwnerId,
          seedType: data.seedType,
          emoji: '🌸'
        });
      });

      setActivities(activityList);

    } catch (error) {
      console.error('Error loading activity:', error);
      toast.error('Failed to load recent activity');
    } finally {
      setActivitiesLoading(false);
    }
  };

  // Load recent community blooms (simplified)
  const loadRecentBlooms = async () => {
    try {
      setBloomsLoading(true);
      
      // Get recent blooms (simplified query)
      const bloomsQuery = query(
        collection(db, 'flowers'),
        where('bloomed', '==', true),
        orderBy('bloomTime', 'desc'),
        limit(15)
      );
      
      const bloomsSnap = await getDocs(bloomsQuery);
      const bloomList = [];

      for (const flowerDoc of bloomsSnap.docs) {
        const flowerData = flowerDoc.data();
        
        try {
          // Check if user is public (simplified check)
          const userQuery = query(
            collection(db, 'users'),
            where('__name__', '==', flowerData.userId),
            where('public', '!=', false),
            limit(1)
          );
          
          const userSnap = await getDocs(userQuery);
          if (userSnap.empty) continue;

          const userData = userSnap.docs[0].data();

          bloomList.push({
            id: flowerDoc.id,
            ...flowerData,
            bloomTime: flowerData.bloomTime?.toDate() || new Date(flowerData.createdAt),
            owner: {
              id: flowerData.userId,
              username: userData.username,
              displayName: userData.displayName || userData.username,
              photoURL: userData.photoURL
            }
          });

        } catch (userError) {
          console.warn('Could not load user data for bloom:', flowerDoc.id);
        }
      }

      setRecentBlooms(bloomList);

    } catch (error) {
      console.error('Error loading recent blooms:', error);
      toast.error('Failed to load recent blooms');
    } finally {
      setBloomsLoading(false);
    }
  };

  // Calculate garden activity score
  const calculateGardenScore = (stats) => {
    if (!stats) return 0;
    
    const bloomPoints = stats.totalBlooms * 10;
    const rarePoints = stats.rareFlowers * 25;
    const specialPoints = stats.specialSeeds * 50;
    const conversionBonus = stats.conversionRate > 80 ? 100 : 0;
    const recentBonus = stats.lastBloom && 
      (Date.now() - stats.lastBloom.getTime()) < (7 * 24 * 60 * 60 * 1000) ? 50 : 0;
    
    return bloomPoints + rarePoints + specialPoints + conversionBonus + recentBonus;
  };

  const handleVisitProfile = (username) => {
    router.push(`/u/${username}`);
  };

  const handleVisitGarden = (username) => {
    router.push(`/u/${username}/garden`);
  };

  const tabs = [
    { key: 'users', label: 'Gardeners', emoji: '👥' },
    { key: 'activity', label: 'Activity', emoji: '🌊' },
    { key: 'blooms', label: 'Recent Blooms', emoji: '🌸' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-100 to-pink-200 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl animate-pulse mb-4">🌍</div>
          <p className="text-purple-700">Loading community...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-100 to-pink-200 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-purple-700 mb-2">
            🌍 Explore Community
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Discover other gardeners, see what's blooming, and help friends grow their emotional gardens!
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-full p-1 shadow-lg">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-2 rounded-full transition-all ${
                  activeTab === tab.key
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-purple-600 hover:bg-purple-50'
                }`}
              >
                {tab.emoji} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {activeTab === 'users' && (
          <div>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-4 rounded-xl shadow text-center">
                <div className="text-2xl font-bold text-purple-600">{users.length}</div>
                <p className="text-sm text-gray-600">Active Gardeners</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Object.values(userStats).reduce((sum, stat) => sum + (stat?.totalBlooms || 0), 0)}
                </div>
                <p className="text-sm text-gray-600">Total Blooms</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {Object.values(userStats).reduce((sum, stat) => sum + (stat?.rareFlowers || 0), 0)}
                </div>
                <p className="text-sm text-gray-600">Rare Flowers</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow text-center">
                <div className="text-2xl font-bold text-indigo-600">
                  {Object.values(userStats).reduce((sum, stat) => sum + (stat?.specialSeeds || 0), 0)}
                </div>
                <p className="text-sm text-gray-600">Special Seeds</p>
              </div>
            </div>

            {/* Users Grid */}
            {usersLoading ? (
              <div className="text-center py-12">
                <div className="text-4xl animate-pulse mb-4">👥</div>
                <p className="text-purple-700">Loading gardeners...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.map((user) => {
                  const stats = userStats[user.id] || {};
                  const score = calculateGardenScore(stats);
                  
                  return (
                    <Card key={user.id} className="bg-white shadow-lg hover:shadow-xl transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                          <img
                            src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.username)}&background=a855f7&color=fff`}
                            alt="Profile"
                            className="w-12 h-12 rounded-full border-2 border-purple-200"
                          />
                          <div className="flex-1">
                            <h3 className="font-semibold text-purple-700">
                              {user.displayName || user.username}
                            </h3>
                            <p className="text-sm text-gray-600">@{user.username}</p>
                          </div>
                          {score > 500 && (
                            <div className="text-2xl" title="Top Gardener">⭐</div>
                          )}
                        </div>

                        {user.bio && (
                          <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                            {user.bio}
                          </p>
                        )}

                        {/* User Stats */}
                        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                          <div>
                            <div className="text-lg font-bold text-green-600">{stats.totalBlooms || 0}</div>
                            <p className="text-xs text-gray-600">Blooms</p>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-blue-600">{stats.conversionRate || 0}%</div>
                            <p className="text-xs text-gray-600">Success</p>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-purple-600">{score}</div>
                            <p className="text-xs text-gray-600">Score</p>
                          </div>
                        </div>

                        {/* Special Achievements */}
                        <div className="flex gap-1 mb-4 justify-center flex-wrap">
                          {stats.rareFlowers > 0 && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                              💎 {stats.rareFlowers} Rare
                            </span>
                          )}
                          {stats.specialSeeds > 0 && (
                            <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                              ✨ {stats.specialSeeds} Special
                            </span>
                          )}
                          {stats.lastBloom && (Date.now() - stats.lastBloom.getTime()) < (7 * 24 * 60 * 60 * 1000) && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                              🌱 Active
                            </span>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleVisitProfile(user.username)}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            👤 Profile
                          </Button>
                          <Button
                            onClick={() => handleVisitGarden(user.username)}
                            size="sm"
                            className="flex-1"
                          >
                            🌱 Garden
                          </Button>
                        </div>

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
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="max-w-4xl mx-auto">
            {activitiesLoading ? (
              <div className="text-center py-12">
                <div className="text-4xl animate-pulse mb-4">🌊</div>
                <p className="text-purple-700">Loading recent activity...</p>
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🌱</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No recent activity</h3>
                <p className="text-gray-500">Be the first to help someone's garden bloom!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <Card key={activity.id} className="bg-white">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{activity.emoji}</div>
                        <div className="flex-1">
                          <p className="text-sm">
                            <span className="font-medium text-blue-600 hover:underline cursor-pointer"
                                  onClick={() => handleVisitProfile(activity.helper)}>
                              {activity.helper}
                            </span>
                            {' helped '}
                            <span className="font-medium text-purple-600 hover:underline cursor-pointer"
                                  onClick={() => handleVisitProfile(activity.owner)}>
                              {activity.owner}
                            </span>
                            's {activity.seedType} bloom!
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                          </p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleVisitGarden(activity.owner)}
                        >
                          💧 Water
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'blooms' && (
          <div className="max-w-5xl mx-auto">
            {bloomsLoading ? (
              <div className="text-center py-12">
                <div className="text-4xl animate-pulse mb-4">🌸</div>
                <p className="text-purple-700">Loading recent blooms...</p>
              </div>
            ) : recentBlooms.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🌱</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No recent blooms</h3>
                <p className="text-gray-500">Plant some seeds and help the community grow!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentBlooms.map((bloom) => (
                  <Card key={bloom.id} className="bg-white shadow-lg hover:shadow-xl transition-all">
                    <CardContent className="p-6">
                      <div className="text-center mb-4">
                        <div className="text-5xl mb-2">{bloom.bloomedFlower || '🌸'}</div>
                        <h3 className="text-lg font-semibold text-purple-700">
                          {bloom.type} Bloom
                        </h3>
                        {bloom.rarity && (
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                            bloom.rarity === 'rare' ? 'bg-yellow-100 text-yellow-800' :
                            bloom.rarity === 'rainbow' ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {bloom.rarity === 'rare' && '💎 Rare'}
                            {bloom.rarity === 'rainbow' && '🌈 Rainbow'}
                            {bloom.rarity === 'legendary' && '⭐ Legendary'}
                          </span>
                        )}
                      </div>

                      {bloom.note && (
                        <div className="bg-gray-50 p-3 rounded-lg mb-4">
                          <p className="text-sm text-gray-700 italic text-center">
                            "{bloom.note}"
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-3 mb-4">
                        <img
                          src={bloom.owner.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(bloom.owner.displayName)}&background=a855f7&color=fff`}
                          alt="Owner"
                          className="w-8 h-8 rounded-full border border-purple-200"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            by {bloom.owner.displayName}
                          </p>
                          <p className="text-xs text-gray-500">
                            @{bloom.owner.username}
                          </p>
                        </div>
                      </div>

                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-3">
                          Bloomed {formatDistanceToNow(bloom.bloomTime, { addSuffix: true })}
                        </p>
                        <Button
                          onClick={() => handleVisitGarden(bloom.owner.username)}
                          size="sm"
                          className="w-full"
                        >
                          💧 Visit Garden
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Call to Action */}
        {!currentUser && (
          <div className="mt-12 text-center bg-white rounded-xl p-8 shadow-lg">
            <h3 className="text-2xl font-bold text-purple-700 mb-4">
              🌱 Join the Community
            </h3>
            <p className="text-gray-600 mb-6">
              Start your own emotional garden and connect with Sharon and other gardeners!
            </p>
            <Button 
              onClick={() => router.push('/auth')}
              className="text-lg px-8 py-3"
            >
              🌸 Start Growing
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
