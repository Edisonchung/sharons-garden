// pages/garden/my.js - Latest Version with Enhanced Features and Fixed Watering Logic
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
  const [isWatering, setIsWatering] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  // Helper function to clean update objects - prevents undefined field errors
  const cleanUpdateObject = (updateObj) => {
    const cleaned = {};
    Object.keys(updateObj).forEach(key => {
      if (updateObj[key] !== undefined && updateObj[key] !== null) {
        cleaned[key] = updateObj[key];
      }
    });
    return cleaned;
  };

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

  const handleWater = async (seed) => {
    if (isWatering) return;
    
    const today = new Date().toDateString();
    const lastKey = `lastWatered_${seed.id}`;
    const last = localStorage.getItem(lastKey);

    // Better error message for daily limit
    if (last && new Date(last).toDateString() === today) {
      toast.error('💧 You already watered this seed today! Come back tomorrow for more watering 🌙');
      return;
    }

    setIsWatering(true);

    try {
      const ref = doc(db, 'flowers', seed.id);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        toast.error('🌱 Seed not found!');
        return;
      }

      const data = snap.data();
      const newCount = (data.waterCount || 0) + 1;
      
      // Check if already fully watered
      if (data.waterCount >= 7) {
        toast.error('💧 This seed has reached its water limit and cannot be watered anymore!');
        return;
      }
      
      // Check if already bloomed
      if (data.bloomed) {
        toast.error('🌸 This seed has already bloomed!');
        return;
      }
      
      const bloomed = newCount >= 7;
      
      // Safe flower data retrieval
      let flowerData = {};
      let flowerEmoji = data.bloomedFlower || '🌸';
      
      if (bloomed && !data.bloomed && data.seedTypeData && data.seedTypeData.flowerTypes) {
        try {
          const possibleFlowers = data.seedTypeData.flowerTypes;
          if (possibleFlowers && possibleFlowers.length > 0) {
            const randomFlower = possibleFlowers[Math.floor(Math.random() * possibleFlowers.length)];
            const rawData = FLOWER_DATABASE[randomFlower];
            
            if (rawData) {
              // Only assign defined values
              if (rawData.emoji) flowerData.emoji = rawData.emoji;
              if (rawData.name) flowerData.name = rawData.name;
              if (rawData.flowerLanguage) flowerData.flowerLanguage = rawData.flowerLanguage;
              if (rawData.sharonMessage) flowerData.sharonMessage = rawData.sharonMessage;
              if (rawData.rarity) flowerData.rarity = rawData.rarity;
              if (rawData.seedType) flowerData.seedType = rawData.seedType;
              
              if (flowerData.emoji) {
                flowerEmoji = flowerData.emoji;
              }
            }
          }
        } catch (flowerError) {
          console.warn('Error getting flower data:', flowerError);
          // Continue with default values
        }
      }

      // Build update object carefully - no undefined values
      const updateData = {
        waterCount: newCount,
        lastWatered: new Date().toISOString(),
        lastWateredBy: user.displayName || user.email || 'Anonymous'
      };
      
      if (bloomed && !data.bloomed) {
        updateData.bloomed = true;
        updateData.bloomedFlower = flowerEmoji;
        updateData.bloomTime = serverTimestamp();
        updateData.bloomedBy = user.displayName || user.email || 'Anonymous';
        
        // Only add defined flower data fields
        if (flowerData.name) {
          updateData.flowerName = flowerData.name;
        } else {
          updateData.flowerName = data.type || 'Beautiful Flower';
        }
        
        if (flowerData.flowerLanguage) {
          updateData.flowerLanguage = flowerData.flowerLanguage;
        }
        
        if (flowerData.sharonMessage) {
          updateData.sharonMessage = flowerData.sharonMessage;
        }
        
        if (flowerData.rarity) {
          updateData.rarity = flowerData.rarity;
        }
      }

      // Clean the update object to prevent undefined field errors
      const cleanedUpdateData = cleanUpdateObject(updateData);
      
      await updateDoc(ref, cleanedUpdateData);

      // Log watering event
      const wateringLogData = cleanUpdateObject({
        seedId: seed.id,
        userId: user.uid,
        fromUsername: user.displayName || user.email || 'Anonymous',
        timestamp: serverTimestamp(),
        resultedInBloom: bloomed && !data.bloomed
      });
      
      await addDoc(collection(db, 'waterings'), wateringLogData);

      localStorage.setItem(lastKey, new Date().toISOString());

      if (bloomed && !data.bloomed) {
        // Show bloom animation
        setBloomingFlower({
          ...seed,
          ...updateData,
          ...flowerData,
          emoji: flowerEmoji
        });
        setShowBloomAnimation(true);
        
        // Create notification
        try {
          await NotificationManager.seedBloomedNotification(
            user.uid,
            data.type,
            flowerEmoji
          );
        } catch (notifError) {
          console.warn('Notification failed:', notifError);
        }
        
        // Play audio if available
        if (audioOn && audioRef.current) {
          try {
            audioRef.current.play();
          } catch (audioError) {
            console.warn('Audio playback failed:', audioError);
          }
        }
        
        toast.success(`🌸 Amazing! Your ${data.type} seed has bloomed!`);
      } else {
        toast.success(`💧 Watered successfully! ${newCount}/7 waters complete`);
      }
    } catch (err) {
      console.error('Watering error:', err);
      
      // Better error messages
      if (err.message.includes('undefined')) {
        toast.error('💧 There was an issue with the flower data. Please try again.');
      } else if (err.message.includes('permission')) {
        toast.error('🔒 You don\'t have permission to water this seed.');
      } else if (err.message.includes('already watered')) {
        toast.error('💧 You already watered this seed today!');
      } else if (err.message.includes('water limit')) {
        toast.error('💧 This seed has reached its water limit!');
      } else {
        toast.error('💧 Failed to water this seed. Please try again.');
      }
    } finally {
      setIsWatering(false);
    }
  };

  const handleViewHistory = (seed) => {
    setSelectedSeed(seed);
    setShowHistory(true);
  };

  const handleShare = (seed) => {
    const shareUrl = process.env.NEXT_PUBLIC_SHARE_BASE_URL || window.location.origin;
    const url = `${shareUrl}/flower/${seed.id}`;
    navigator.clipboard.writeText(url);
    toast.success('📋 Share link copied! Send it to friends so they can help water your seed! 💧');
  };

  const handleBloomComplete = () => {
    setShowBloomAnimation(false);
    setShowFlowerCard(bloomingFlower);
    setBloomingFlower(null);
  };

  const canWaterToday = (seedId) => {
    if (typeof window === 'undefined') return false;
    
    const today = new Date().toDateString();
    const lastKey = `lastWatered_${seedId}`;
    const last = localStorage.getItem(lastKey);
    
    return !last || new Date(last).toDateString() !== today;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-100 to-purple-200">
        <p className="text-purple-700">Loading your garden...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-200 p-6 relative">
      <audio ref={audioRef} src="/audio/bloom.mp3" preload="auto" />
      
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-purple-700 mb-2">🌱 My Garden</h1>
        <p className="text-gray-600">Welcome back, {user.displayName || 'Gardener'}!</p>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center justify-center gap-4 mb-6 flex-wrap">
        <div className="bg-white px-4 py-2 rounded-full shadow">
          🌸 Blooms: <strong>{bloomCount}</strong>
        </div>
        <div className="bg-white px-4 py-2 rounded-full shadow">
          🔥 Streak: <strong>{streakCount}</strong> days
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
      <div className="max-w-6xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Share Garden Link */}
        <div className="md:col-span-1">
          {userProfile?.username && (
            <ShareGardenLink username={userProfile.username} />
          )}
        </div>
        
        {/* Friend Stats */}
        <div className="md:col-span-1">
          <FriendGardenStats userId={user?.uid} />
        </div>
        
        {/* Recent Activity */}
        <div className="md:col-span-1">
          <FriendActivityFeed userId={user?.uid} />
        </div>
      </div>

      {/* Seeds Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {seeds.map(seed => {
          const canWater = canWaterToday(seed.id);
          const seedType = seed.seedTypeData || {};
          
          return (
            <Card 
              key={seed.id} 
              className={`bg-white shadow-xl rounded-xl p-4 relative transition-all hover:shadow-2xl ${
                seed.bloomed ? 'ring-2 ring-green-400' : ''
              }`}
            >
              <CardContent className="p-0">
                {/* Special Badge */}
                {seed.songSeed && (
                  <div className="absolute -top-2 -right-2 bg-indigo-500 text-white text-xs px-2 py-1 rounded-full">
                    ✨ Special
                  </div>
                )}
                
                {/* Flower/Seed Display */}
                <div className="text-center mb-3">
                  <div className={`text-5xl mb-2 ${seed.bloomed ? 'animate-pulse' : ''}`}>
                    {seed.bloomed ? seed.bloomedFlower : seed.songSeed ? '🎵' : seedType.emoji || '🌱'}
                  </div>
                  
                  <h3 className={`text-lg font-semibold ${
                    seed.bloomed ? 'text-green-700' : 
                    seed.songSeed ? 'text-indigo-700' : 
                    'text-purple-700'
                  }`}>
                    {seed.bloomed ? 
                      (seed.flowerName || `${seed.type} Bloom`) : 
                      `${seed.type} Seed`
                    }
                  </h3>
                  
                  <p className="text-xs text-gray-500">
                    by {seed.name || 'Anonymous'}
                  </p>
                  
                  {seedType.name && (
                    <p className="text-xs text-gray-400 mt-1">
                      {seedType.name}
                    </p>
                  )}
                </div>
                
                {/* Note */}
                {seed.note && (
                  <p className="text-sm text-gray-600 italic mb-3 px-2">
                    "{seed.note}"
                  </p>
                )}
                
                {/* Water Progress */}
                {!seed.bloomed && (
                  <div className="mb-3">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full transition-all ${
                          seed.songSeed ? 'bg-indigo-400' : 'bg-blue-400'
                        }`}
                        style={{ width: `${((seed.waterCount || 0) / 7) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      {seed.waterCount || 0} / 7 waters
                    </p>
                  </div>
                )}
                
                {/* Bloom Info */}
                {seed.bloomed && seed.flowerLanguage && (
                  <div className="bg-purple-50 p-2 rounded-lg mb-3">
                    <p className="text-xs text-purple-700 italic text-center">
                      "{seed.flowerLanguage}"
                    </p>
                  </div>
                )}
                
                {/* Sharon's Message */}
                {seed.bloomed && seed.sharonMessage && (
                  <div className="bg-pink-50 p-2 rounded-lg mb-3 border-l-4 border-pink-400">
                    <p className="text-xs text-pink-700 italic">
                      💜 "{seed.sharonMessage}" - Sharon
                    </p>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="space-y-2">
                  {!seed.bloomed ? (
                    <Button 
                      onClick={() => handleWater(seed)}
                      disabled={isWatering || !canWater || (seed.waterCount >= 7)}
                      className="w-full"
                      variant={canWater && seed.waterCount < 7 ? 'default' : 'outline'}
                    >
                      {isWatering ? '💧 Watering...' : 
                       seed.waterCount >= 7 ? '✅ Fully Watered' :
                       canWater ? '💧 Water' : '⏳ Watered today'}
                    </Button>
                  ) : (
                    <>
                      <div className="text-center p-2 bg-green-50 rounded-lg">
                        <p className="text-green-600 font-medium">🌸 Bloomed!</p>
                        {seed.bloomTime && (
                          <p className="text-xs text-green-500">
                            {new Date(seed.bloomTime?.toDate?.() || seed.bloomTime).toLocaleDateString()}
                          </p>
                        )}
                        {seed.rarity && (
                          <p className="text-xs mt-1">
                            {seed.rarity === 'rare' && '💎 Rare Flower'}
                            {seed.rarity === 'rainbow' && '🌈 Rainbow Grade'}
                          </p>
                        )}
                      </div>
                      <Button 
                        onClick={() => setShowFlowerCard(seed)}
                        className="w-full"
                        variant="outline"
                      >
                        📸 View & Share
                      </Button>
                    </>
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
                {seed.songSeed && (
                  <div className="mt-2 text-center">
                    <p className="text-xs text-indigo-600">
                      🎵 Blooms on song launch day!
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

      {/* Watering History Modal */}
      {showHistory && selectedSeed && (
        <WateringHistoryModal
          seedId={selectedSeed.id}
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Surprise Draw Modal */}
      {showDraw && rewardToShow && (
        <SurpriseDrawModal
          isOpen={showDraw}
          onClose={() => setShowDraw(false)}
          reward={rewardToShow}
        />
      )}
      
      {/* Bloom Animation */}
      {showBloomAnimation && bloomingFlower && (
        <BloomAnimation
          flower={bloomingFlower}
          seedType={bloomingFlower.seedTypeData}
          onComplete={handleBloomComplete}
          userName={user?.displayName || 'Gardener'}
          personalMessage={bloomingFlower.note}
        />
      )}
      
      {/* Enhanced Flower Card */}
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
