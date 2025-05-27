// pages/u/[username]/timeline.js - Updated with Unified Navigation
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { PublicProfileLayout, getCurrentPageFromPath } from '../../../components/PublicProfileLayout';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { formatDistanceToNow } from 'date-fns';

const TIMELINE_FILTERS = {
  all: { name: 'All Activity', emoji: '📜', description: 'Everything' },
  blooms: { name: 'Blooms', emoji: '🌸', description: 'Flowers that bloomed' },
  waterings: { name: 'Watering', emoji: '💧', description: 'Watering activities' },
  milestones: { name: 'Milestones', emoji: '🏆', description: 'Special achievements' }
};

export default function EnhancedPublicTimelinePage() {
  const router = useRouter();
  const { username } = router.query;

  const [profile, setProfile] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [timelineStats, setTimelineStats] = useState({});

  useEffect(() => {
    if (!username) return;

    const fetchPublicTimeline = async () => {
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
        const userData = userDoc.data();
        const userId = userDoc.id;

        // Check if timeline is public (default to true if not set)
        const isTimelinePublic = userData.timelinePublic !== false;
        const isProfilePublic = userData.public !== false;
        
        if (!isTimelinePublic && !isProfilePublic) {
          setNotFound(true);
          return;
        }

        // Enhanced profile data for the layout
        const profileData = {
          id: userId,
          username: userData.username,
          displayName: userData.displayName || username,
          photoURL: userData.photoURL || '',
          bio: userData.bio || '',
          joinedDate: userData.joinedAt?.toDate?.().toLocaleDateString() || 'N/A',
          isVerified: userData.verified || false,
          stats: {
            badges: (userData.badges || []).length,
            blooms: 0, // Will be calculated below
            helped: 0  // Will be calculated below
          }
        };

        setProfile(profileData);

        // Load all timeline activities
        await loadTimelineActivities(userId, userData, profileData);
        await loadTimelineStats(userId);

      } catch (err) {
        console.error('Failed to load public timeline:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicTimeline();
  }, [username]);

  const loadTimelineActivities = async (userId, userData, profileData) => {
    try {
      const activities = [];

      // 1. Fetch bloomed flowers
      const flowersQuery = query(
        collection(db, 'flowers'),
        where('userId', '==', userId),
        where('bloomed', '==', true),
        orderBy('bloomTime', 'desc'),
        limit(50)
      );
      const flowersSnap = await getDocs(flowersQuery);

      flowersSnap.docs.forEach(doc => {
        const data = doc.data();
        activities.push({
          id: doc.id,
          type: 'bloom',
          category: 'blooms',
          timestamp: data.bloomTime?.toDate() || new Date(data.createdAt),
          title: `${data.bloomedFlower || '🌸'} Bloomed a ${data.type}`,
          description: data.note || '',
          metadata: {
            flowerType: data.type,
            bloomedFlower: data.bloomedFlower,
            waterCount: data.waterCount,
            rarity: data.rarity,
            seedType: data.seedTypeData?.name,
            reflection: data.reflection,
            photo: data.photo,
            specialSeed: data.specialSeed || data.songSeed,
            sharonMessage: data.sharonMessage,
            flowerLanguage: data.flowerLanguage
          },
          emoji: data.bloomedFlower || '🌸',
          color: data.rarity === 'rare' ? 'text-yellow-600' : 
                 data.specialSeed ? 'text-indigo-600' : 'text-green-600'
        });
      });

      // 2. Fetch watering activities (where user helped others)
      try {
        const wateringsQuery = query(
          collection(db, 'waterings'),
          where('wateredByUserId', '==', userId),
          orderBy('timestamp', 'desc'),
          limit(30)
        );
        const wateringsSnap = await getDocs(wateringsQuery);

        wateringsSnap.docs.forEach(doc => {
          const data = doc.data();
          activities.push({
            id: doc.id,
            type: 'watering',
            category: 'waterings',
            timestamp: data.timestamp?.toDate() || new Date(),
            title: `💧 Helped water ${data.seedOwnerName || 'someone'}'s garden`,
            description: data.seedType ? `Watered a ${data.seedType} seed` : 'Helped a friend',
            metadata: {
              seedOwnerName: data.seedOwnerName,
              seedType: data.seedType,
              resultedInBloom: data.resultedInBloom,
              helpType: 'watering'
            },
            emoji: data.resultedInBloom ? '🌸' : '💧',
            color: data.resultedInBloom ? 'text-green-600' : 'text-blue-600'
          });
        });
      } catch (wateringError) {
        console.log('Watering data not available or private');
      }

      // 3. Add milestone for joining
      activities.push({
        id: 'milestone-joined',
        type: 'milestone',
        category: 'milestones',
        timestamp: userData.joinedAt?.toDate() || new Date(),
        title: '🌱 Joined Sharon\'s Garden',
        description: 'Started their emotional gardening journey',
        metadata: {
          milestoneType: 'joined'
        },
        emoji: '🌱',
        color: 'text-purple-600'
      });

      // 4. Add milestones for badge achievements
      if (userData.badges && userData.badges.length > 0) {
        userData.badges.forEach((badge, index) => {
          activities.push({
            id: `milestone-badge-${index}`,
            type: 'milestone',
            category: 'milestones',
            timestamp: new Date(Date.now() - (userData.badges.length - index) * 24 * 60 * 60 * 1000),
            title: `🏅 Earned ${badge} badge`,
            description: 'Achieved a new milestone in their garden',
            metadata: {
              milestoneType: 'badge',
              badgeName: badge
            },
            emoji: '🏅',
            color: 'text-yellow-600'
          });
        });
      }

      // Sort activities by timestamp
      const sortedActivities = activities.sort((a, b) => {
        return sortOrder === 'newest' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp;
      });

      setTimeline(sortedActivities);

      // Update profile stats
      const bloomCount = activities.filter(a => a.type === 'bloom').length;
      const helpCount = activities.filter(a => a.type === 'watering').length;
      
      setProfile(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          blooms: bloomCount,
          helped: helpCount
        }
      }));

    } catch (error) {
      console.error('Error loading timeline activities:', error);
      setTimeline([]);
    }
  };

  const loadTimelineStats = async (userId) => {
    try {
      // Get all user's flowers
      const flowersSnap = await getDocs(query(
        collection(db, 'flowers'),
        where('userId', '==', userId)
      ));

      // Get watering activities (if available)
      let wateringsSize = 0;
      let uniqueFriendsHelped = new Set();
      
      try {
        const wateringsSnap = await getDocs(query(
          collection(db, 'waterings'),
          where('wateredByUserId', '==', userId)
        ));
        wateringsSize = wateringsSnap.size;
        uniqueFriendsHelped = new Set(wateringsSnap.docs.map(doc => doc.data().seedOwnerId));
      } catch (wateringError) {
        console.log('Watering stats not available');
      }

      const flowers = flowersSnap.docs.map(doc => doc.data());
      const blooms = flowers.filter(f => f.bloomed);

      // Calculate activity timeline
      const firstActivity = Math.min(
        ...flowers.map(f => new Date(f.createdAt).getTime()).filter(Boolean)
      );
      const daysActive = firstActivity ? Math.ceil((Date.now() - firstActivity) / (1000 * 60 * 60 * 24)) : 0;

      setTimelineStats({
        totalBlooms: blooms.length,
        totalSeeds: flowers.length,
        friendsHelped: uniqueFriendsHelped.size,
        totalWaterings: wateringsSize,
        daysActive,
        milestones: 1 + (flowers.length > 0 ? 1 : 0) + Math.floor(blooms.length / 5),
        rareFlowers: blooms.filter(f => f.rarity === 'rare').length,
        specialSeeds: flowers.filter(f => f.specialSeed || f.songSeed).length,
        conversionRate: flowers.length > 0 ? Math.round((blooms.length / flowers.length) * 100) : 0
      });

    } catch (error) {
      console.error('Error loading timeline stats:', error);
      setTimelineStats({});
    }
  };

  const handleFilterChange = (newFilter) => {
    setFilterType(newFilter);
  };

  const handleSortChange = (newSort) => {
    setSortOrder(newSort);
    const sorted = [...timeline].sort((a, b) => {
      return newSort === 'newest' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp;
    });
    setTimeline(sorted);
  };

  // Filter timeline based on selected filter
  const filteredTimeline = timeline.filter(item => {
    if (filterType === 'all') return true;
    return item.category === filterType;
  });

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
        
        {/* Timeline Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-indigo-700 dark:text-indigo-300 mb-2">
            📖 Garden Timeline
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            A complete history of {profile?.displayName}'s garden journey
          </p>
        </div>

        {/* Timeline Stats Dashboard */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-indigo-700 dark:text-indigo-300">📊 Garden Journey</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{timelineStats.totalBlooms || 0}</div>
                <p className="text-sm text-green-700 dark:text-green-400">Flowers Bloomed</p>
              </div>
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{timelineStats.friendsHelped || 0}</div>
                <p className="text-sm text-blue-700 dark:text-blue-400">Friends Helped</p>
              </div>
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{timelineStats.daysActive || 0}</div>
                <p className="text-sm text-purple-700 dark:text-purple-400">Days Active</p>
              </div>
              <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{timelineStats.conversionRate || 0}%</div>
                <p className="text-sm text-orange-700 dark:text-orange-400">Success Rate</p>
              </div>
            </div>
            
            {/* Special achievements */}
            {(timelineStats.rareFlowers > 0 || timelineStats.specialSeeds > 0) && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-center gap-4 text-sm flex-wrap">
                  {timelineStats.rareFlowers > 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1 rounded-full">
                      💎 {timelineStats.rareFlowers} Rare Flowers
                    </div>
                  )}
                  {timelineStats.specialSeeds > 0 && (
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full">
                      ✨ {timelineStats.specialSeeds} Special Seeds
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline Filters and Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex gap-2 flex-wrap justify-center">
            {Object.entries(TIMELINE_FILTERS).map(([key, filter]) => (
              <button
                key={key}
                onClick={() => handleFilterChange(key)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  filterType === key 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title={filter.description}
              >
                {filter.emoji} {filter.name}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Sort:</label>
            <select
              value={sortOrder}
              onChange={(e) => handleSortChange(e.target.value)}
              className="px-3 py-1 border rounded text-sm bg-white dark:bg-gray-800 dark:border-gray-600"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Timeline Feed */}
        <div className="space-y-4">
          {filteredTimeline.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">
                {filterType === 'blooms' ? '🌸' : 
                 filterType === 'waterings' ? '💧' :
                 filterType === 'milestones' ? '🏆' : '📜'}
              </div>
              <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                No {filterType === 'all' ? 'activities' : TIMELINE_FILTERS[filterType]?.name.toLowerCase()} yet
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                {filterType === 'blooms' && 'No flowers have bloomed yet 🌱'}
                {filterType === 'waterings' && 'No watering activities to show 💧'}
                {filterType === 'milestones' && 'No milestones achieved yet 🏆'}
                {filterType === 'all' && 'Timeline will appear here as activities happen 📖'}
              </p>
            </div>
          ) : (
            filteredTimeline.map((item, index) => (
              <TimelineItem key={item.id || index} item={item} />
            ))
          )}
        </div>
      </div>
    </PublicProfileLayout>
  );
}

// Enhanced Timeline Item Component
function TimelineItem({ item }) {
  const [expanded, setExpanded] = useState(false);

  const getTimelineItemStyle = () => {
    switch (item.type) {
      case 'bloom':
        return 'border-l-4 border-green-300 bg-green-50 dark:bg-green-900/20';
      case 'watering':
        return 'border-l-4 border-blue-300 bg-blue-50 dark:bg-blue-900/20';
      case 'milestone':
        return 'border-l-4 border-purple-300 bg-purple-50 dark:bg-purple-900/20';
      default:
        return 'border-l-4 border-gray-300 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  return (
    <Card className={`${getTimelineItemStyle()} transition-all hover:shadow-md`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Timeline Icon */}
          <div className={`text-2xl flex-shrink-0 ${item.color}`}>
            {item.emoji}
          </div>
          
          {/* Timeline Content */}
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-sm ${item.color}`}>
              {item.title}
            </h3>
            
            {item.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {item.description}
              </p>
            )}
            
            {/* Enhanced metadata display */}
            {item.metadata && (
              <div className="mt-2 space-y-1">
                {item.metadata.flowerType && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    🌱 Type: {item.metadata.flowerType}
                    {item.metadata.seedType && ` (${item.metadata.seedType})`}
                  </div>
                )}
                
                {item.metadata.waterCount && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    💧 Waters: {item.metadata.waterCount}/7
                  </div>
                )}
                
                {item.metadata.rarity && (
                  <div className="text-xs">
                    <span className={`inline-block px-2 py-1 rounded-full ${
                      item.metadata.rarity === 'rare' ? 'bg-yellow-100 text-yellow-800' :
                      item.metadata.rarity === 'rainbow' ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.metadata.rarity === 'rare' && '💎 Rare'}
                      {item.metadata.rarity === 'rainbow' && '🌈 Rainbow'}
                      {item.metadata.rarity === 'legendary' && '⭐ Legendary'}
                    </span>
                  </div>
                )}
                
                {item.metadata.specialSeed && (
                  <div className="text-xs">
                    <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                      ✨ Special Seed
                    </span>
                  </div>
                )}
                
                {item.metadata.resultedInBloom && (
                  <div className="text-xs">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      🌸 Helped bloom!
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {/* Sharon's Messages */}
            {item.metadata?.sharonMessage && (
              <div className="mt-3 bg-pink-50 dark:bg-pink-900/20 p-3 rounded-lg border-l-4 border-pink-300">
                <p className="text-sm text-pink-700 dark:text-pink-300 italic">
                  💜 Sharon: "{item.metadata.sharonMessage}"
                </p>
              </div>
            )}
            
            {/* Flower Language */}
            {item.metadata?.flowerLanguage && (
              <div className="mt-2 bg-purple-50 dark:bg-purple-900/20 p-2 rounded border-l-2 border-purple-300">
                <p className="text-xs text-purple-700 dark:text-purple-300 italic">
                  🌸 Flower Language: "{item.metadata.flowerLanguage}"
                </p>
              </div>
            )}
            
            {/* Expandable content */}
            {(item.metadata?.reflection || item.metadata?.photo) && (
              <div className="mt-2">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {expanded ? '▼ Hide details' : '▶ Show details'}
                </button>
                
                {expanded && (
                  <div className="mt-2 space-y-2">
                    {item.metadata.reflection && (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border">
                        <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                          📝 "{item.metadata.reflection}"
                        </p>
                      </div>
                    )}
                    
                    {item.metadata.photo && (
                      <div className="bg-white dark:bg-gray-800 p-2 rounded-lg border">
                        <img 
                          src={item.metadata.photo} 
                          alt="Timeline photo" 
                          className="rounded shadow-md max-h-48 object-contain mx-auto"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Timestamp */}
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatDistanceToNow(item.timestamp, { addSuffix: true })}
              </span>
              
              {item.type === 'bloom' && (
                <button className="text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  🔗 Share
                </button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
