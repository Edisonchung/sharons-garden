// pages/directory.js - Optimized version to fix build issues
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function UserDirectoryPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');
  const [filterBy, setFilterBy] = useState('all');
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeToday: 0,
    totalBlooms: 0,
    totalSeeds: 0
  });

  const sortOptions = [
    { value: 'newest', label: 'Newest Members', emoji: '🆕' },
    { value: 'active', label: 'Most Active', emoji: '🔥' },
    { value: 'blooms', label: 'Most Blooms', emoji: '🌸' }
  ];

  const filterOptions = [
    { value: 'all', label: 'All Users', emoji: '👥' },
    { value: 'active', label: 'Active Today', emoji: '🌱' },
    { value: 'helpers', label: 'Community Helpers', emoji: '🤝' }
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

  const loadUsers = async () => {
    try {
      setLoading(true);
      setUsers([]);

      // Base query for public users
      let q = query(
        collection(db, 'users'),
        where('public', '!=', false),
        orderBy('public'),
        orderBy('joinedAt', 'desc'),
        limit(20)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setUsers([]);
        return;
      }

      const userList = [];
      let totalBlooms = 0;
      let totalSeeds = 0;
      let activeToday = 0;

      for (const userDoc of snapshot.docs) {
        const userData = userDoc.data();
        
        if (!userData.username) continue;

        // Basic user stats calculation
        let userStats = {
          totalSeeds: 0,
          totalBlooms: 0,
          friendsHelped: 0,
          conversionRate: 0
        };

        try {
          // Load basic flower stats
          const flowersSnap = await getDocs(query(
            collection(db, 'flowers'),
            where('userId', '==', userDoc.id),
            limit(50) // Limit for performance
          ));

          const flowers = flowersSnap.docs.map(doc => doc.data());
          const blooms = flowers.filter(f => f.bloomed);

          userStats = {
            totalSeeds: flowers.length,
            totalBlooms: blooms.length,
            conversionRate: flowers.length > 0 ? Math.round((blooms.length / flowers.length) * 100) : 0,
            friendsHelped: 0 // Simplified for performance
          };

          totalBlooms += userStats.totalBlooms;
          totalSeeds += userStats.totalSeeds;

        } catch (statsError) {
          console.warn('Could not load stats for user:', userDoc.id);
        }

        // Check if active today
        const lastActive = userData.lastActive?.toDate?.();
        const isActiveToday = lastActive && (Date.now() - lastActive.getTime()) < (24 * 60 * 60 * 1000);
        if (isActiveToday) activeToday++;

        // Apply filters
        if (filterBy === 'active' && !isActiveToday) continue;
        if (filterBy === 'helpers' && userStats.totalBlooms < 3) continue;

        userList.push({
          id: userDoc.id,
          ...userData,
          stats: userStats,
          isActiveToday,
          joinedAt: userData.joinedAt?.toDate?.() || new Date(),
          lastActive: lastActive || userData.joinedAt?.toDate?.() || new Date()
        });
      }

      // Sort users by selected criteria
      userList.sort((a, b) => {
        switch (sortBy) {
          case 'blooms':
            return b.stats.totalBlooms - a.stats.totalBlooms;
          case 'active':
            return b.lastActive - a.lastActive;
          default:
            return b.joinedAt - a.joinedAt;
        }
      });

      setUsers(userList);
      setStats({
        totalUsers: userList.length,
        activeToday,
        totalBlooms,
        totalSeeds
      });

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user) => {
              const activity = getActivityStatus(user);
              
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
                        <div className="text-lg font-bold text-blue-600">{user.stats.totalSeeds}</div>
                        <p className="text-xs text-gray-600">Seeds</p>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-purple-600">{user.stats.conversionRate}%</div>
                        <p className="text-xs text-gray-600">Success</p>
                      </div>
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
