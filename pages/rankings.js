// pages/rankings.js - Fixed version with proper image handling
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';

export default function RankingsPage() {
  const router = useRouter();
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('overall');
  const [error, setError] = useState(null);

  const categories = [
    { key: 'overall', label: 'Overall Score', emoji: '🏆' },
    { key: 'blooms', label: 'Most Blooms', emoji: '🌸' },
    { key: 'helpers', label: 'Most Helpful', emoji: '🤝' },
    { key: 'rare', label: 'Rare Collectors', emoji: '💎' },
    { key: 'streak', label: 'Longest Streaks', emoji: '🔥' }
  ];

  useEffect(() => {
    loadRankings();
  }, [activeCategory]);

  // Helper function to safely generate profile image URLs
  const getSafeImageUrl = (photoURL, displayName, username) => {
    // Check if photoURL exists and is valid
    if (photoURL && 
        photoURL !== '' && 
        !photoURL.includes('photo.jpg') && 
        !photoURL.includes('undefined') &&
        photoURL.startsWith('http')) {
      return photoURL;
    }
    
    // Generate fallback avatar
    const name = encodeURIComponent(displayName || username || 'User');
    return `https://ui-avatars.com/api/?name=${name}&background=a855f7&color=fff&size=48`;
  };

  const loadRankings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get users with proper error handling
      let usersSnap;
      try {
        const usersQuery = query(
          collection(db, 'users'),
          where('public', '!=', false),
          limit(50)
        );
        usersSnap = await getDocs(usersQuery);
      } catch (queryError) {
        console.warn('Main query failed, trying fallback:', queryError);
        // Fallback query without where clause
        const fallbackQuery = query(
          collection(db, 'users'),
          limit(50)
        );
        usersSnap = await getDocs(fallbackQuery);
      }

      if (usersSnap.empty) {
        setRankings(getDemoRankings());
        return;
      }

      const userRankings = [];

      for (const userDoc of usersSnap.docs) {
        try {
          const userData = userDoc.data();
          
          // Skip users without username or private users
          if (!userData.username || userData.public === false) continue;

          // Calculate user stats with timeout protection
          let stats = {
            totalBlooms: 0,
            totalSeeds: 0,
            friendsHelped: 0,
            rareFlowers: 0,
            specialSeeds: 0,
            currentStreak: userData.wateringStreak || 0,
            conversionRate: 0
          };

          try {
            // Load flower stats with timeout
            const flowersPromise = getDocs(query(
              collection(db, 'flowers'),
              where('userId', '==', userDoc.id),
              limit(30)
            ));

            const wateringsPromise = getDocs(query(
              collection(db, 'waterings'),
              where('wateredByUserId', '==', userDoc.id),
              limit(30)
            ));

            // Race against timeout
            const [flowersSnap, wateringsSnap] = await Promise.race([
              Promise.all([flowersPromise, wateringsPromise]),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 5000)
              )
            ]);

            const flowers = flowersSnap.docs.map(doc => doc.data());
            const blooms = flowers.filter(f => f.bloomed);

            stats = {
              totalBlooms: blooms.length,
              totalSeeds: flowers.length,
              friendsHelped: new Set(wateringsSnap.docs.map(doc => doc.data().seedOwnerId)).size,
              rareFlowers: blooms.filter(f => f.rarity === 'rare').length,
              specialSeeds: flowers.filter(f => f.specialSeed || f.songSeed).length,
              currentStreak: userData.wateringStreak || 0,
              conversionRate: flowers.length > 0 ? (blooms.length / flowers.length) * 100 : 0
            };

          } catch (statsError) {
            console.warn('Failed to load stats for user:', userDoc.id, statsError);
            // Use default stats
          }

          stats.overallScore = calculateGardenScore(stats);

          userRankings.push({
            id: userDoc.id,
            ...userData,
            stats,
            joinedAt: userData.joinedAt?.toDate?.() || new Date(),
            // Ensure safe image URL
            photoURL: getSafeImageUrl(userData.photoURL, userData.displayName, userData.username)
          });

        } catch (userError) {
          console.warn('Error processing user:', userDoc.id, userError);
          continue;
        }
      }

      // Sort by selected category
      userRankings.sort((a, b) => {
        switch (activeCategory) {
          case 'blooms':
            return b.stats.totalBlooms - a.stats.totalBlooms;
          case 'helpers':
            return b.stats.friendsHelped - a.stats.friendsHelped;
          case 'rare':
            return b.stats.rareFlowers - a.stats.rareFlowers;
          case 'streak':
            return b.stats.currentStreak - a.stats.currentStreak;
          default:
            return b.stats.overallScore - a.stats.overallScore;
        }
      });

      setRankings(userRankings.slice(0, 20));

    } catch (error) {
      console.error('Error loading rankings:', error);
      setError(error.message);
      setRankings(getDemoRankings());
    } finally {
      setLoading(false);
    }
  };

  const calculateGardenScore = (stats) => {
    const bloomPoints = (stats.totalBlooms || 0) * 10;
    const helpPoints = (stats.friendsHelped || 0) * 5;
    const rarePoints = (stats.rareFlowers || 0) * 25;
    const specialPoints = (stats.specialSeeds || 0) * 50;
    const conversionBonus = (stats.conversionRate || 0) > 80 ? 100 : 0;
    const streakBonus = (stats.currentStreak || 0) > 7 ? (stats.currentStreak * 2) : 0;
    
    return bloomPoints + helpPoints + rarePoints + specialPoints + conversionBonus + streakBonus;
  };

  // Demo data fallback
  const getDemoRankings = () => [
    {
      id: 'demo1',
      username: 'top_gardener',
      displayName: 'Demo Top Gardener',
      photoURL: getSafeImageUrl('', 'Demo Top Gardener', 'top_gardener'),
      verified: true,
      stats: {
        totalBlooms: 25,
        totalSeeds: 30,
        friendsHelped: 15,
        rareFlowers: 5,
        specialSeeds: 2,
        currentStreak: 14,
        conversionRate: 83,
        overallScore: 650
      }
    },
    {
      id: 'demo2',
      username: 'flower_master',
      displayName: 'Demo Flower Master',
      photoURL: getSafeImageUrl('', 'Demo Flower Master', 'flower_master'),
      verified: false,
      stats: {
        totalBlooms: 20,
        totalSeeds: 25,
        friendsHelped: 12,
        rareFlowers: 3,
        specialSeeds: 1,
        currentStreak: 10,
        conversionRate: 80,
        overallScore: 520
      }
    },
    {
      id: 'demo3',
      username: 'garden_helper',
      displayName: 'Demo Garden Helper',
      photoURL: getSafeImageUrl('', 'Demo Garden Helper', 'garden_helper'),
      verified: false,
      stats: {
        totalBlooms: 15,
        totalSeeds: 20,
        friendsHelped: 20,
        rareFlowers: 2,
        specialSeeds: 1,
        currentStreak: 8,
        conversionRate: 75,
        overallScore: 450
      }
    }
  ];

  const getRankValue = (user) => {
    switch (activeCategory) {
      case 'blooms':
        return user.stats.totalBlooms;
      case 'helpers':
        return user.stats.friendsHelped;
      case 'rare':
        return user.stats.rareFlowers;
      case 'streak':
        return `${user.stats.currentStreak} days`;
      default:
        return user.stats.overallScore;
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-100 to-pink-200 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl animate-pulse mb-4">🏆</div>
          <p className="text-purple-700">Loading rankings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-100 to-pink-200 p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-purple-700 mb-2">
            🏆 Community Rankings
          </h1>
          <p className="text-gray-600">
            Celebrating our most dedicated gardeners and their achievements
          </p>
          {error && (
            <div className="mt-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
              ⚠️ Using demo data - {error}
            </div>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex justify-center mb-8 overflow-x-auto">
          <div className="bg-white rounded-full p-1 shadow-lg min-w-max">
            {categories.map((category) => (
              <button
                key={category.key}
                onClick={() => setActiveCategory(category.key)}
                className={`px-4 py-2 rounded-full transition-all whitespace-nowrap ${
                  activeCategory === category.key
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-purple-600 hover:bg-purple-50'
                }`}
              >
                {category.emoji} {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rankings List */}
        <div className="space-y-4">
          {rankings.map((user, index) => {
            const rank = index + 1;
            const isTopThree = rank <= 3;
            
            return (
              <Card 
                key={user.id} 
                className={`bg-white shadow-lg hover:shadow-xl transition-all ${
                  isTopThree ? 'border-2 border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50' : ''
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    
                    {/* Rank */}
                    <div className={`text-2xl font-bold ${
                      isTopThree ? 'text-yellow-600' : 'text-purple-600'
                    }`}>
                      {getRankIcon(rank)}
                    </div>
                    
                    {/* Profile */}
                    <img
                      src={user.photoURL}
                      alt="Profile"
                      className="w-12 h-12 rounded-full border-2 border-purple-200"
                      onError={(e) => {
                        // Fallback if image fails to load
                        e.target.src = getSafeImageUrl('', user.displayName, user.username);
                      }}
                    />
                    
                    <div className="flex-1">
                      <h3 className="font-semibold text-purple-700">
                        {user.displayName || user.username}
                      </h3>
                      <p className="text-sm text-gray-600">@{user.username}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {user.verified && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            ✓ Verified
                          </span>
                        )}
                        {user.id.startsWith('demo') && (
                          <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-1 rounded-full">
                            Demo
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Score */}
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${
                        isTopThree ? 'text-yellow-600' : 'text-purple-600'
                      }`}>
                        {getRankValue(user)}
                      </div>
                      <p className="text-xs text-gray-500">
                        {categories.find(c => c.key === activeCategory)?.label}
                      </p>
                    </div>
                    
                    {/* Visit Button */}
                    <Button
                      onClick={() => {
                        if (user.id.startsWith('demo')) {
                          alert('This is demo data - sign up to see real profiles!');
                        } else {
                          router.push(`/u/${user.username}`);
                        }
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Visit
                    </Button>
                  </div>
                  
                  {/* Additional Stats for Top 3 */}
                  {isTopThree && (
                    <div className="mt-4 pt-4 border-t border-yellow-200">
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="text-lg font-bold text-green-600">{user.stats.totalBlooms}</div>
                          <p className="text-xs text-gray-600">Blooms</p>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-blue-600">{user.stats.friendsHelped}</div>
                          <p className="text-xs text-gray-600">Helped</p>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-yellow-600">{user.stats.rareFlowers}</div>
                          <p className="text-xs text-gray-600">Rare</p>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-orange-600">{user.stats.currentStreak}</div>
                          <p className="text-xs text-gray-600">Streak</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Retry Button */}
        {error && (
          <div className="text-center mt-8">
            <Button onClick={loadRankings} variant="outline">
              🔄 Retry Loading Rankings
            </Button>
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-12 text-center bg-white rounded-xl p-8 shadow-lg">
          <h3 className="text-2xl font-bold text-purple-700 mb-4">
            🌱 Want to join the rankings?
          </h3>
          <p className="text-gray-600 mb-6">
            Start your emotional garden journey and work your way up the leaderboard!
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button onClick={() => router.push('/')}>
              🌸 Start Gardening
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
