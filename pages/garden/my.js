// pages/garden/my.js - Latest Version with Enhanced WateringManager Integration
import { useEffect, useRef, useState } from 'react';
import { auth, db } from '../../lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  addDoc,
  serverTimestamp,
  getDocs,
  increment
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import WateringHistoryModal from '../../components/WateringHistoryModal';
import SurpriseDrawModal from '../../components/SurpriseDrawModal';
import EnhancedFlowerCard from '../../components/EnhancedFlowerCard';
import BloomAnimation from '../../components/BloomAnimation';
import { NotificationManager } from '../../components/NotificationSystem';
import { FLOWER_DATABASE } from '../../hooks/useSeedTypes';
import { 
  ShareGardenLink, 
  FriendActivityFeed, 
  FriendGardenStats,
  WateringHelpers 
} from '../../components/FriendWateringSystem';
import { useWatering, wateringManager } from '../../utils/WateringManager';
import { useErrorHandler } from '../../components/LaunchErrorBoundary';
import toast from 'react-hot-toast';

const STREAK_REWARDS = [
  { day: 3, reward: 'Sticker Pack', description: '3-Day Watering Champion 🎖️' },
  { day: 7, reward: 'Wallpaper Unlock', description: '7-Day Garden Master 🖼️' },
  { day: 14, reward: 'Exclusive Voice Note', description: '14-Day Sharon Whisper 🎧' }
];

export default function MyGardenPage() {
  const [user, setUser] = useState(null);
  const [seeds, setSeeds] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedSeed, setSelectedSeed] = useState(null);
  const [audioOn, setAudioOn] = useState(true);
  const [showDraw, setShowDraw] = useState(false);
  const [bloomCount, setBloomCount] = useState(0);
  const [streakCount, setStreakCount] = useState(0);
  const [rewardToShow, setRewardToShow] = useState(null);
  const audioRef = useRef(null);
  
  // Enhanced features state
  const [showBloomAnimation, setShowBloomAnimation] = useState(false);
  const [bloomingFlower, setBloomingFlower] = useState(null);
  const [showFlowerCard, setShowFlowerCard] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [systemMetrics, setSystemMetrics] = useState(null);

  // Enhanced watering hooks
  const { waterSeed, isWatering, error: wateringError, canWaterToday } = useWatering();
  const { logError } = useErrorHandler();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        // Fetch user profile data
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
          }
        } catch (err) {
          console.error('Failed to fetch user profile:', err);
        }
      } else {
        window.location.href = '/auth';
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time seeds subscription
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'flowers'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSeeds(data);
      setBloomCount(data.filter(d => d.bloomed).length);
    });
    return () => unsub();
  }, [user]);

  // Streak management
  useEffect(() => {
    if (!user) return;
    const today = new Date().toDateString();
    const streakKey = `streak_${user.uid}`;
    const lastKey = `lastStreak_${user.uid}`;
    const last = localStorage.getItem(lastKey);

    if (last && new Date(last).toDateString() === today) return;

    let currentStreak = parseInt(localStorage.getItem(streakKey) || '0', 10);
    currentStreak++;
    localStorage.setItem(streakKey, currentStreak);
    localStorage.setItem(lastKey, new Date().toISOString());
    setStreakCount(currentStreak);

    (async () => {
      const rewardsSnap = await getDocs(query(collection(db, 'rewards'), where('userId', '==', user.uid)));
      const claimed = rewardsSnap.docs.map(doc => doc.data().rewardType);
      const reward = STREAK_REWARDS.find(r => r.day === currentStreak && !claimed.includes(r.reward));

      if (reward) {
        await addDoc(collection(db, 'rewards'), {
          userId: user.uid,
          rewardType: reward.reward,
          seedType: `Day ${reward.day} Streak`,
          description: reward.description,
          timestamp: serverTimestamp(),
        });
        setRewardToShow(reward);
        setShowDraw(true);
      }
    })();
  }, [user]);

  // System metrics for debugging (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const updateMetrics = () => {
        setSystemMetrics(wateringManager.getMetrics());
      };

      updateMetrics();
      const interval = setInterval(updateMetrics, 5000);
      return () => clearInterval(interval);
    }
  }, []);

  // Enhanced watering with WateringManager
  const handleWater = async (seed) => {
    if (!user || !seed || !seed.id || isWatering) return;

    console.log('🌊 Starting watering process for seed:', seed.id);

    try {
      // Enhanced daily water check using WateringManager
      const canWater = await canWaterToday(user.uid, seed.id);
      if (!canWater) {
        toast.error('💧 You already watered this seed today! Come back tomorrow 🌙');
        return;
      }

      // Prepare seed data for WateringManager
      const seedDataToPass = {
        ...seed,
        seedTypeData: seed.seedTypeData || (seed.songSeed ? {
          id: 'melody',
          name: 'Melody Seed',
          emoji: '🎵',
          flowerTypes: ['Song Bloom']
        } : null)
      };

      console.log('🌊 Calling WateringManager for seed:', seedDataToPass);

      // Use enhanced WateringManager
      const result = await waterSeed(
        user.uid,
        seed.id,
        user.displayName || user.email || 'Anonymous',
        seedDataToPass
      );

      console.log('🌊 Watering result:', result);

      if (result.bloomed) {
        // Show bloom animation
        const enhancedFlowerData = {
          ...seed,
          ...result.flowerData,
          waterCount: result.newWaterCount,
          bloomed: true,
          bloomedFlower: result.flowerData?.emoji || (seed.songSeed ? '🎵' : '🌸'),
          flowerName: result.flowerData?.name || `${seed.type} Bloom`,
          flowerLanguage: result.flowerData?.flowerLanguage,
          sharonMessage: result.flowerData?.sharonMessage,
          rarity: result.flowerData?.rarity
        };

        setBloomingFlower(enhancedFlowerData);
        setShowBloomAnimation(true);

        // Play bloom sound
        if (audioOn && audioRef.current) {
          try {
            audioRef.current.play();
          } catch (audioError) {
            console.warn('Audio playback failed:', audioError);
          }
        }

        // Create bloom notification
        try {
          await NotificationManager.seedBloomedNotification(
            user.uid,
            seed.type,
            result.flowerData?.emoji || (seed.songSeed ? '🎵' : '🌸')
          );
        } catch (notifError) {
          console.warn('Notification failed:', notifError);
        }

        // Update unlocked slots based on bloom count
        const newBloomCount = bloomCount + 1;
        const unlockedSlots = userProfile?.unlockedSlots || 1;
        
        if (newBloomCount >= 3 && unlockedSlots < 2) {
          await updateDoc(doc(db, 'users', user.uid), { unlockedSlots: 2 });
          toast.success('🎉 New slot unlocked! You can now grow 2 seeds at once!');
        } else if (newBloomCount >= 5 && unlockedSlots < 3) {
          await updateDoc(doc(db, 'users', user.uid), { unlockedSlots: 3 });
          toast.success('🎉 New slot unlocked! You can now grow 3 seeds at once!');
        }

        toast.success(`🌸 Amazing! Your ${seed.type} seed has bloomed into a beautiful ${result.flowerData?.name || 'flower'}!`);
      } else {
        // Regular watering success
        if (result.isOwner) {
          toast.success(`💧 Watered successfully! ${result.newWaterCount}/7 waters complete`);
        } else {
          toast.success(`💧 You helped water ${seed.name || 'someone'}'s seed! ${result.newWaterCount}/7 waters`);
        }

        // Show encouraging messages based on progress
        if (result.newWaterCount === 3) {
          toast(`🌱 Halfway there! Your seed is growing strong!`, { icon: '🌿' });
        } else if (result.newWaterCount === 6) {
          toast(`🌟 Almost blooming! One more water to go!`, { icon: '✨' });
        }
      }

    } catch (error) {
      console.error('🚨 Watering error:', error);
      logError(error, { 
        action: 'watering', 
        seedId: seed.id, 
        userId: user.uid,
        seedData: seed 
      });

      // Enhanced error handling based on WateringManager error types
      if (error.message.includes('already watered')) {
        toast.error(error.message);
      } else if (error.message.includes('rate limit') || error.message.includes('Too many actions')) {
        toast.error('⏳ Please wait a moment before watering again.');
      } else if (error.message.includes('daily limit')) {
        toast.error('🚫 You\'ve reached your daily watering limit. Come back tomorrow!');
      } else if (error.message.includes('timeout')) {
        toast.error('⏱️ Watering took too long. The server might be busy. Please try again.');
      } else if (error.message.includes('already bloomed')) {
        toast.error('🌸 This seed has already bloomed!');
      } else if (error.message.includes('water limit')) {
        toast.error('💧 This seed has reached its water limit!');
      } else if (error.message.includes('queue')) {
        toast.error('🚦 Server is busy processing other requests. Please wait a moment and try again.');
      } else {
        toast.error(error.message || 'Failed to water seed. Please try again.');
      }
    }
  };

  const handleViewHistory = (seed) => {
    setSelectedSeed(seed);
    setShowHistory(true);
  };

  const handleShare = (seed) => {
    const shareUrl = process.env.NEXT_PUBLIC_SHARE_BASE_URL || window.location.origin;
    const url = `${shareUrl}/flower/${seed.id}`;
    
    // Enhanced sharing with garden link
    const username = userProfile?.username || user?.displayName?.toLowerCase().replace(/[^a-z0-9]/g, '');
    const gardenUrl = username ? `\n\nOr visit my full garden: ${shareUrl}/u/${username}/garden` : '';
    
    const fullMessage = `Help water my ${seed.type} seed! 🌱\n${url}${gardenUrl}`;
    
    navigator.clipboard.writeText(fullMessage);
    toast.success('📋 Share link copied! Send it to friends so they can help water your seed! 💧');
  };

  const handleBloomComplete = () => {
    setShowBloomAnimation(false);
    setShowFlowerCard(bloomingFlower);
    setBloomingFlower(null);
  };

  // Enhanced daily water check using WateringManager cache
  const canWaterTodaySync = async (seedId) => {
    if (!user || !seedId) return false;
    
    try {
      return await canWaterToday(user.uid, seedId);
    } catch (error) {
      console.error('Error checking daily watering:', error);
      // Fallback to localStorage check
      const today = new Date().toDateString();
      const lastKey = `lastWatered_${seedId}`;
      const last = localStorage.getItem(lastKey);
      return !last || new Date(last).toDateString() !== today;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-100 to-purple-200">
        <div className="text-center">
          <div className="text-6xl animate-pulse mb-4">🌱</div>
          <p className="text-purple-700 text-xl">Loading your garden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-200 p-6 relative">
      <audio ref={audioRef} src="/audio/bloom.mp3" preload="auto" />
      
      {/* Development System Metrics */}
      {systemMetrics && process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 left-4 bg-white rounded-lg shadow-lg p-3 text-xs max-w-xs z-40">
          <h3 className="font-bold text-purple-700 mb-2">🔧 WateringManager Status</h3>
          <div className="space-y-1">
            <div>Queue: {systemMetrics.queueLength}</div>
            <div>Success Rate: {systemMetrics.successRate}</div>
            <div>Avg Response: {Math.round(parseFloat(systemMetrics.averageResponseTime) || 0)}ms</div>
            <div>Pending: {systemMetrics.pendingOperations}</div>
            <div>Total Ops: {systemMetrics.totalOperations}</div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-purple-700 mb-2">🌱 My Garden</h1>
        <p className="text-gray-600">Welcome back, {user.displayName || 'Gardener'}!</p>
        {isWatering && (
          <div className="inline-flex items-center gap-2 mt-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
            <div className="animate-spin">💧</div>
            <span>Watering in progress...</span>
          </div>
        )}
      </div>

      {/* Stats Bar */}
      <div className="flex items-center justify-center gap-4 mb-6 flex-wrap">
        <div className="bg-white px-4 py-2 rounded-full shadow">
          🌸 Blooms: <strong>{bloomCount}</strong>
        </div>
        <div className="bg-white px-4 py-2 rounded-full shadow">
          🔥 Streak: <strong>{streakCount}</strong> days
        </div>
        <div className="bg-white px-4 py-2 rounded-full shadow">
          🌱 Active: <strong>{seeds.filter(s => !s.bloomed).length}</strong>
        </div>
        <Button 
          onClick={() => setAudioOn(!audioOn)} 
          variant="outline"
          className="rounded-full"
        >
          {audioOn ? '🔊 Sound On' : '🔇 Sound Off'}
        </Button>
      </div>

      {/* Friend Features Section */}
      <div className="max-w-6xl mx-auto mb-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Share Garden Link */}
        {userProfile?.username && (
          <ShareGardenLink username={userProfile.username} />
        )}
        
        {/* Friend Stats */}
        <FriendGardenStats userId={user?.uid} />
        
        {/* Recent Activity */}
        <FriendActivityFeed userId={user?.uid} />
      </div>

      {/* Seeds Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {seeds.map(seed => {
          const seedType = seed.seedTypeData || {};
          
          return (
            <Card 
              key={seed.id} 
              className={`bg-white shadow-xl rounded-xl relative transition-all hover:shadow-2xl ${
                seed.bloomed ? 'ring-2 ring-green-400' : ''
              } ${isWatering ? 'pointer-events-none opacity-75' : ''}`}
            >
              <CardContent className="p-4">
                {/* Special Badge */}
                {seed.songSeed && (
                  <div className="absolute -top-2 -right-2 bg-indigo-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                    ✨ Special
                  </div>
                )}
                
                {/* Flower/Seed Display */}
                <div className="text-center mb-4">
                  <div className={`text-5xl mb-3 ${seed.bloomed ? 'animate-pulse' : ''}`}>
                    {seed.bloomed ? seed.bloomedFlower : seed.songSeed ? '🎵' : seedType.emoji || '🌱'}
                  </div>
                  
                  <h3 className={`text-lg font-bold mb-1 ${
                    seed.bloomed ? 'text-green-700' : 
                    seed.songSeed ? 'text-indigo-700' : 
                    'text-purple-700'
                  }`}>
                    {seed.bloomed ? 
                      (seed.flowerName || `${seed.type} Bloom`) : 
                      `${seed.type} Seed`
                    }
                  </h3>
                  
                  <p className="text-xs text-gray-500 mb-1">
                    by {seed.name || 'Anonymous'}
                  </p>
                  
                  {seedType.name && (
                    <p className="text-xs text-gray-400">
                      {seedType.name}
                    </p>
                  )}
                </div>
                
                {/* Note */}
                {seed.note && (
                  <div className="bg-gray-50 p-3 rounded-lg mb-4">
                    <p className="text-sm text-gray-600 italic text-center">
                      "{seed.note}"
                    </p>
                  </div>
                )}
                
                {/* Water Progress */}
                {!seed.bloomed && (
                  <div className="mb-4">
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div 
                        className={`h-3 rounded-full transition-all duration-500 ${
                          seed.songSeed ? 'bg-gradient-to-r from-indigo-400 to-purple-500' : 
                          'bg-gradient-to-r from-blue-400 to-green-500'
                        }`}
                        style={{ width: `${((seed.waterCount || 0) / 7) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      💧 {seed.waterCount || 0} / 7 waters
                    </p>
                    
                    {/* Progress encouragement */}
                    {seed.waterCount >= 3 && seed.waterCount < 7 && (
                      <p className="text-xs text-green-600 text-center mt-1">
                        🌿 Growing strong!
                      </p>
                    )}
                    {seed.waterCount === 6 && (
                      <p className="text-xs text-yellow-600 text-center mt-1 animate-pulse">
                        ✨ One more water to bloom!
                      </p>
                    )}
                  </div>
                )}
                
                {/* Bloom Info */}
                {seed.bloomed && (
                  <div className="space-y-3 mb-4">
                    {seed.flowerLanguage && (
                      <div className="bg-purple-50 p-3 rounded-lg border-l-4 border-purple-400">
                        <p className="text-xs text-purple-700 italic text-center">
                          "{seed.flowerLanguage}"
                        </p>
                      </div>
                    )}
                    
                    {seed.sharonMessage && (
                      <div className="bg-pink-50 p-3 rounded-lg border-l-4 border-pink-400">
                        <p className="text-xs text-pink-700 italic leading-relaxed">
                          💜 "{seed.sharonMessage}"
                        </p>
                        <p className="text-xs text-pink-600 text-right mt-1 font-medium">
                          — Sharon
                        </p>
                      </div>
                    )}
                    
                    {seed.rarity && (
                      <div className="text-center">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          seed.rarity === 'rare' ? 'bg-yellow-100 text-yellow-800' :
                          seed.rarity === 'rainbow' ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {seed.rarity === 'rare' && '💎 Rare Flower'}
                          {seed.rarity === 'rainbow' && '🌈 Rainbow Grade'}
                          {seed.rarity === 'legendary' && '⭐ Legendary'}
                        </span>
                      </div>
                    )}
                    
                    {seed.bloomTime && (
                      <p className="text-xs text-green-600 text-center">
                        🌸 Bloomed: {new Date(seed.bloomTime?.toDate?.() || seed.bloomTime).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
                
                {/* Watering Helpers */}
                <WateringHelpers seedId={seed.id} ownerId={seed.userId} />
                
                {/* Action Buttons */}
                <div className="space-y-2 mt-4">
                  {!seed.bloomed ? (
                    <WaterButton 
                      seed={seed}
                      onWater={handleWater}
                      canWaterToday={canWaterTodaySync}
                      isWatering={isWatering}
                    />
                  ) : (
                    <div className="space-y-2">
                      <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-green-700 font-medium flex items-center justify-center gap-1">
                          <span>🌸</span>
                          <span>Fully Bloomed!</span>
                        </p>
                      </div>
                      <Button 
                        onClick={() => setShowFlowerCard(seed)}
                        className="w-full"
                        variant="outline"
                      >
                        📸 View & Share Card
                      </Button>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      onClick={() => handleViewHistory(seed)} 
                      variant="outline" 
                      className="text-xs"
                    >
                      📜 History
                    </Button>
                    <Button 
                      onClick={() => handleShare(seed)} 
                      variant="outline" 
                      className="text-xs"
                    >
                      🔗 Share
                    </Button>
                  </div>
                </div>
                
                {/* Special Seed Info */}
                {seed.songSeed && !seed.bloomed && (
                  <div className="mt-3 p-2 bg-indigo-50 rounded-lg border border-indigo-200">
                    <p className="text-xs text-indigo-700 text-center">
                      🎵 Special melody seed - blooms with Sharon's song launch!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {seeds.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🌱</div>
          <h2 className="text-2xl font-bold text-purple-700 mb-2">No seeds yet!</h2>
          <p className="text-gray-600 mb-4">Go to the main garden to plant your first seed.</p>
          <Button onClick={() => window.location.href = '/'}>
            🌸 Visit Main Garden
          </Button>
        </div>
      )}

      {/* Error Display */}
      {wateringError && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm">
          <div className="flex items-start gap-2">
            <span className="text-red-500">⚠️</span>
            <div>
              <p className="text-sm font-medium">Watering Error</p>
              <p className="text-xs mt-1">{wateringError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showHistory && selectedSeed && (
        <WateringHistoryModal
          seedId={selectedSeed.id}
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
        />
      )}

      {showDraw && rewardToShow && (
        <SurpriseDrawModal
          isOpen={showDraw}
          onClose={() => setShowDraw(false)}
          reward={rewardToShow}
        />
      )}
      
      {showBloomAnimation && bloomingFlower && (
        <BloomAnimation
          flower={bloomingFlower}
          seedType={bloomingFlower.seedTypeData}
          onComplete={handleBloomComplete}
          userName={user?.displayName || 'Gardener'}
          personalMessage={bloomingFlower.note}
        />
      )}
      
      {showFlowerCard && (
        <EnhancedFlowerCard
          flower={showFlowerCard}
          seedType={showFlowerCard.seedTypeData}
          userName={user?.displayName || 'Gardener'}
          personalMessage={showFlowerCard.note}
          isOpen={true}
          onClose={() => setShowFlowerCard(null)}
        />
      )}
    </div>
  );
}

// Enhanced Water Button Component
function WaterButton({ seed, onWater, canWaterToday, isWatering }) {
  const [canWater, setCanWater] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkWateringStatus = async () => {
      try {
        const result = await canWaterToday(seed.id);
        setCanWater(result);
      } catch (error) {
        console.error('Error checking watering status:', error);
        setCanWater(false);
      } finally {
        setChecking(false);
      }
    };

    checkWateringStatus();
  }, [seed.id, canWaterToday]);

  if (checking) {
    return (
      <Button disabled className="w-full">
        ⏳ Checking...
      </Button>
    );
  }

  const isFullyWatered = (seed.waterCount >= 7);
  const buttonDisabled = isWatering || !canWater || isFullyWatered;

  let buttonText = '💧 Water';
  let buttonVariant = 'default';

  if (isWatering) {
    buttonText = '💧 Watering...';
    buttonVariant = 'outline';
  } else if (isFullyWatered) {
    buttonText = '✅ Fully Watered';
    buttonVariant = 'outline';
  } else if (!canWater) {
    buttonText = '⏳ Watered Today';
    buttonVariant = 'outline';
  }

  return (
    <Button
      onClick={() => onWater(seed)}
      disabled={buttonDisabled}
      className="w-full"
      variant={buttonVariant}
    >
      {buttonText}
    </Button>
  );
}
