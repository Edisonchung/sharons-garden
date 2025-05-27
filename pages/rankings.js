// pages/rankings.js - Community rankings page
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ProfileHelpers } from '../utils/searchHelpers';

export default function RankingsPage() {
  const router = useRouter();
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('overall');

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

  const loadRankings = async () => {
    try {
      setLoading(true);
      
      // Get public users
      const usersSnap = await getDocs(query(
        collection(db, 'users'),
        where('public', '!=', false),
        limit(50)
      ));

      const userRankings = [];

      for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        if (!userData.username) continue;

        // Calculate user stats
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
        const rareFlowers = blooms.filter(f => f.rarity === 'rare');

        const stats = {
          totalBlooms: blooms.length,
          totalSeeds: flowers.length,
          friendsHelped: new Set(wateringsSnap.docs.map(doc => doc.data().seedOwnerId)).size,
          rareFlowers: rareFlowers.length,
          specialSeeds: flowers.filter(f => f.specialSeed || f.songSeed).length,
          currentStreak: userData.wateringStreak || 0,
          conversionRate: flowers.length > 0 ? (blooms.length / flowers.length) * 100 : 0
        };

        stats.overallScore = ProfileHelpers.calculateGardenScore(stats);

        userRankings.push({
          id: userDoc.id,
          ...userData,
          stats,
          joinedAt: userData.joinedAt?.toDate?.() || new Date()
        });
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
    } finally {
      setLoading(false);
    }
  };

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
        {loading ? (
          <div className="text-center py-12">
            <div className="text-4xl animate-pulse mb-4">🏆</div>
            <p className="text-purple-700">Loading rankings...</p>
          </div>
        ) : (
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
                        src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.username)}&background=a855f7&color=fff`}
                        alt="Profile"
                        className="w-12 h-12 rounded-full border-2 border-purple-200"
                      />
                      
                      <div className="flex-1">
                        <h3 className="font-semibold text-purple-700">
                          {user.displayName || user.username}
                        </h3>
                        <p className="text-sm text-gray-600">@{user.username}</p>
                        {user.verified && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            ✓ Verified
                          </span>
                        )}
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
                        onClick={() => router.push(`/u/${user.username}`)}
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
            
