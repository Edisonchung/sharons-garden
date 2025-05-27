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
