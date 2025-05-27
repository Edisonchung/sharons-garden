// pages/explore.js - Updated with fixed Recent Blooms functionality
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { 
  collection, 
  getDocs, 
  query, 
  where,
  limit,
  doc,
  getDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

// Import the fixed Recent Blooms component
import RecentBloomsTab from '../components/RecentBloomsTab';

export default function ExplorePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  
  // User discovery state
  const [users, setUsers] = useState([]);
  const [userStats, setUserStats] = useState({});
  const [usersLoading, setUsersLoading] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    let unsubscribe = () => {};
    
    try {
      unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
        setLoading(false);
        setConnectionError(false);
      }, (error) => {
        console.warn('Auth state change error:', error);
        setLoading(false);
        setConnectionError(true);
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      setLoading(false);
      setConnectionError(true);
    }
    
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && !connectionError && activeTab === 'users') {
      loadUsers();
    }
  }, [loading, connectionError, activeTab]);

  // Load users for the Gardeners tab
  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      setUsers([]);
      setConnectionError(false);

      let userList = [];
      let stats = {};

      try {
        const q = query(
          collection(db, 'users'),
          limit(15)
        );

        const snapshot = await getDocs(q);
        
        for (const userDoc of snapshot.docs) {
          try {
            const userData = userDoc.data();
            
            if (!userData.username || userData.public === false) continue;

            const userId = userDoc.id;
            
            const userStats = await Promise.race([
              loadUserStats(userId),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 5000)
              )
            ]).catch(() => ({
              totalSeeds: 0,
              totalBlooms: 0,
              rareFlowers: 0,
              specialSeeds: 0,
              conversionRate: 0
            }));

            stats[userId] = userStats;

            userList.push({
              id: userId,
              ...userData,
              joinedAt: userData.joinedAt?.toDate?.() || new Date(),
              lastActive: userData.lastActive?.toDate?.() || userData.joinedAt?.toDate?.() || new Date()
            });

          } catch (userError) {
            console.warn('Error processing user:', userDoc.id, userError);
          }
        }

      } catch (queryError) {
        console.error('Primary query failed:', queryError);
        userList = getMockUsers();
        stats = getMockStats();
        toast.error('Using demo data - Firebase connection issues');
      }

      userList.sort((a, b) => {
        const scoreA = calculateGardenScore(stats[a.id] || {});
        const scoreB = calculateGardenScore(stats[b.id] || {});
        return scoreB - scoreA;
      });

      setUsers(userList);
      setUserStats(stats);

    } catch (error) {
      console.error('Complete error in loadUsers:', error);
      setConnectionError(true);
      setUsers(getMockUsers());
      setUserStats(getMockStats());
      toast.error('Using demo mode - Please check your connection');
    } finally {
      setUsersLoading(false);
    }
  };

  const loadUserStats = async (userId) => {
    try {
      const q = query(
        collection(db, 'flowers'),
        where('userId', '==', userId),
        limit(20)
      );

      const flowersSnap = await getDocs(q);
      const flowers = flowersSnap.docs.map(doc => doc.data());
      const blooms = flowers.filter(f => f.bloomed);
      
      return {
        totalSeeds: flowers.length,
        totalBlooms: blooms.length,
        rareFlowers: blooms.filter(f => f.rarity === 'rare').length,
        specialSeeds: flowers.filter(f => f.specialSeed || f.songSeed).length,
        conversionRate: flowers.length > 0 ? Math.round((blooms.length / flowers.length) * 100) : 0
      };
    } catch (error) {
      return {
        totalSeeds: 0,
        totalBlooms: 0,
        rareFlowers: 0,
        specialSeeds: 0,
        conversionRate: 0
      };
    }
  };

  const getMockUsers = () => [
    {
      id: 'demo1',
      username: 'gardener1',
      displayName: 'Demo Gardener 1',
      photoURL: '',
      bio: 'Love growing emotional flowers! 🌸',
      joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      lastActive: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'demo2',
      username: 'gardener2',
      displayName: 'Demo Gardener 2',
      photoURL: '',
      bio: 'Sharon\'s music helps me grow! 💜',
      joinedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      lastActive: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'demo3',
      username: 'gardener3',
      displayName: 'Demo Gardener 3',
      photoURL: '',
      bio: 'Building my emotional garden daily! 🌱',
      joinedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      lastActive: new Date()
    }
  ];

  const getMockStats = () => ({
    demo1: { totalSeeds: 5, totalBlooms: 3, rareFlowers: 1, specialSeeds: 0, conversionRate: 60 },
    demo2: { totalSeeds: 8, totalBlooms: 6, rareFlowers: 2, specialSeeds: 1, conversionRate: 75 },
    demo3: { totalSeeds: 3, totalBlooms: 2, rareFlowers: 0, specialSeeds: 0, conversionRate: 67 }
  });

  const calculateGardenScore = (stats) => {
    if (!stats) return 0;
    
    const bloomPoints = (stats.totalBlooms || 0) * 10;
    const rarePoints = (stats.rareFlowers || 0) * 25;
    const specialPoints = (stats.specialSeeds || 0) * 50;
    const conversionBonus = (stats.conversionRate || 0) > 80 ? 100 : 0;
    
    return bloomPoints + rarePoints + specialPoints + conversionBonus;
  };

  const handleVisitProfile = (username) => {
    if (username.startsWith('demo')) {
      toast.info('This is demo data - sign up to see real profiles!');
      return;
    }
    router.push(`/u/${username}`);
  };

  const handleVisitGarden = (username) => {
    if (username.startsWith('demo')) {
      toast.info('This is demo data - sign up to see real gardens!');
      return;
    }
    router.push(`/u/${username}/garden`);
  };

  const getSafeImageUrl = (photoURL, displayName, username) => {
    if (photoURL && !photoURL.includes('photo.jpg') && photoURL !== '') {
      return photoURL;
    }
    
    const name = encodeURIComponent(displayName || username || 'User');
    return `https://ui-avatars.com/api/?name=${name}&background=a855f7&color=fff&size=48`;
  };

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
          
          {connectionError && (
            <div className="mt-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
              ⚠️ Connection issues detected - showing demo content
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-full p-1 shadow-lg">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-2 rounded-full transition-all ${
                activeTab === 'users'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-purple-600 hover:bg-purple-50'
              }`}
            >
              👥 Gardeners
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-6 py-2 rounded-full transition-all ${
                activeTab === 'activity'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-purple-600 hover:bg-purple-50'
              }`}
            >
              🌊 Activity
            </button>
            <button
              onClick={() => setActiveTab('blooms')}
              className={`px-6 py-2 rounded-full transition-all ${
                activeTab === 'blooms'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-purple-600 hover:bg-purple-50'
              }`}
            >
              🌸 Recent Blooms
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'users' && (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-4 rounded-xl shadow text-center">
                <div className="text-2xl font-bold text-purple-600">{users.length}</div>
                <p className="text-sm text-gray-600">Gardeners Found</p>
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
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🌱</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No gardeners found</h3>
                <p className="text-gray-500 mb-4">Be the first to start your garden!</p>
                <Button onClick={() => router.push('/auth')}>
                  🌸 Start Your Garden
                </Button>
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
                            src={getSafeImageUrl(user.photoURL, user.displayName, user.username)}
                            alt="Profile"
                            className="w-12 h-12 rounded-full border-2 border-purple-200"
                            onError={(e) => {
                              e.target.src = getSafeImageUrl('', user.displayName, user.username);
                            }}
                          />
                          <div className="flex-1">
                            <h3 className="font-semibold text-purple-700">
                              {user.displayName || user.username}
                            </h3>
                            <p className="text-sm text-gray-600">@{user.username}</p>
                            {user.id.startsWith('demo') && (
                              <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-1 rounded-full">
                                Demo
                              </span>
                            )}
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
                        </div>

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
          </>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🌊</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Activity Feed Coming Soon
            </h3>
            <p className="text-gray-500">
              See real-time updates from the community!
            </p>
          </div>
        )}

        {/* Recent Blooms Tab */}
        {activeTab === 'blooms' && (
          <RecentBloomsTab onVisitGarden={handleVisitGarden} />
        )}

        {/* Retry Button */}
        {connectionError && activeTab === 'users' && (
          <div className="text-center mt-8">
            <Button onClick={loadUsers} variant="outline">
              🔄 Retry Connection
            </Button>
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
