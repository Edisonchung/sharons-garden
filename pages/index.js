// pages/index.js - Latest Version with Enhanced Features
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import SeedTypeSelection from '../components/SeedTypeSelection';
import SongLaunchCelebration, { SongLaunchTrigger } from '../components/SongLaunchCelebration';
import EnhancedFlowerCard from '../components/EnhancedFlowerCard';
import BloomAnimation from '../components/BloomAnimation';
import { useOptimizedSnapshot } from '../hooks/useOptimizedFirebase';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import { NotificationManager } from '../components/NotificationSystem';
import { SEED_TYPES } from '../components/SeedTypeSelection';
import { FLOWER_DATABASE } from '../hooks/useSeedTypes';

const seedTypes = [
  { type: 'Hope', flower: '🌷' },
  { type: 'Joy', flower: '🌻' },
  { type: 'Memory', flower: '🪻' },
  { type: 'Love', flower: '🌹' },
  { type: 'Strength', flower: '🌼' }
];

export default function SharonsGarden() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [showMain, setShowMain] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [selectedSeedType, setSelectedSeedType] = useState(null);
  const [showSeedSelection, setShowSeedSelection] = useState(false);
  const [isPlanting, setIsPlanting] = useState(false);
  const [isWatering, setIsWatering] = useState(false);
  
  // Garden state
  const [unlockedSlots, setUnlockedSlots] = useState(1);
  const [showSongModal, setShowSongModal] = useState(false);
  
  // Enhanced features state
  const [showBloomAnimation, setShowBloomAnimation] = useState(false);
  const [bloomingFlower, setBloomingFlower] = useState(null);
  const [showFlowerCard, setShowFlowerCard] = useState(null);

  // Optimized Firebase query with caching
  const { data: planted, loading } = useOptimizedSnapshot(
    `user-flowers-${user?.uid}`,
    user ? query(collection(db, 'flowers'), where('userId', '==', user.uid)) : null,
    { cacheDuration: 8000 }
  );

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/auth');
      } else {
        setUser(currentUser);
        setShowMain(true);
        
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setUnlockedSlots(userData.unlockedSlots || 1);
          }
        } catch (error) {
          console.error('Error loading user settings:', error);
        }
      }
    });
    
    return () => unsubscribeAuth();
  }, [router]);

  const handlePlant = async () => {
    if (!user || !selectedSeedType || isPlanting) return;

    const activeSeeds = planted?.filter(s => !s.bloomed).length || 0;
    if (activeSeeds >= unlockedSlots) {
      toast.error(`You can only have ${unlockedSlots} growing seeds at once`);
      return;
    }

    setIsPlanting(true);

    try {
      const newSeed = {
        userId: user.uid,
        type: selectedSeedType.name || selectedSeedType.type || 'Hope',
        seedType: selectedSeedType.id || 'hope',
        seedTypeData: selectedSeedType,
        name: name.trim() || user.displayName || 'Anonymous',
        note: note.trim() || 'Growing with love 🌱',
        waterCount: 0,
        bloomed: false,
        bloomedFlower: null,
        createdAt: new Date().toISOString(),
        plantedBy: user.displayName || user.email
      };

      const docRef = await addDoc(collection(db, 'flowers'), newSeed);
      
      // Create notification for planting
      await NotificationManager.createNotification(
        user.uid,
        'SEED_PLANTED',
        '🌱 New Seed Planted!',
        `Your ${selectedSeedType.name} seed has been planted. Water it daily to help it bloom!`,
        {
          actionUrl: '/garden/my',
          actionText: 'View Garden'
        }
      );
      
      toast.success(`🌱 Your ${selectedSeedType.name} seed has been planted!`);
      
      setName('');
      setNote('');
      setSelectedSeedType(null);
      setShowSeedSelection(false);

    } catch (error) {
      console.error('Planting error:', error);
      toast.error('Failed to plant seed. Please try again.');
    } finally {
      setIsPlanting(false);
    }
  };

  const handleWater = async (seed) => {
    if (!user || isWatering) return;

    const today = new Date().toDateString();
    const lastWaterKey = `lastWatered_${seed.id}`;
    const lastWater = localStorage.getItem(lastWaterKey);
    
    if (lastWater && new Date(lastWater).toDateString() === today) {
      toast.error("You've already watered this seed today! Come back tomorrow 🌙");
      return;
    }

    setIsWatering(true);

    try {
      const docRef = doc(db, 'flowers', seed.id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        toast.error('Seed not found');
        return;
      }

      const data = docSnap.data();
      
      if (data.bloomed) {
        toast.error('This seed has already bloomed! 🌸');
        return;
      }

      const newCount = (data.waterCount || 0) + 1;
      const bloomed = newCount >= 7;
      
      // Get flower data from seed type
      let flowerData = null;
      if (bloomed && data.seedTypeData) {
        const possibleFlowers = data.seedTypeData.flowerTypes || [];
        const randomFlower = possibleFlowers[Math.floor(Math.random() * possibleFlowers.length)];
        flowerData = FLOWER_DATABASE[randomFlower] || {};
      }
      
      const flowerIcon = seed.songSeed ? '🎵' : (flowerData?.emoji || seedTypes.find(s => s.type === data.type)?.flower || '🌸');

      const updateData = {
        waterCount: newCount,
        bloomed,
        bloomedFlower: bloomed ? flowerIcon : null,
        lastWatered: new Date().toISOString(),
        lastWateredBy: user.displayName || 'Anonymous'
      };
      
      if (bloomed && flowerData) {
        updateData.flowerName = flowerData.name || data.type;
        updateData.flowerLanguage = flowerData.flowerLanguage;
        updateData.sharonMessage = flowerData.sharonMessage;
        updateData.bloomTime = new Date().toISOString();
      }

      await updateDoc(docRef, updateData);

      localStorage.setItem(lastWaterKey, new Date().toISOString());
      
      if (bloomed && !data.bloomed) {
        // Show bloom animation
        setBloomingFlower({
          ...seed,
          ...updateData,
          ...flowerData,
          emoji: flowerIcon
        });
        setShowBloomAnimation(true);
        
        // Create bloom notification
        await NotificationManager.seedBloomedNotification(
          user.uid,
          data.type,
          flowerIcon
        );
        
        // Update unlocked slots if needed
        const bloomedCount = (planted?.filter(s => s.bloomed).length || 0) + 1;
        if (bloomedCount >= 3 && unlockedSlots < 2) {
          await updateDoc(doc(db, 'users', user.uid), { unlockedSlots: 2 });
          setUnlockedSlots(2);
          toast.success('🎉 New slot unlocked! You can now grow 2 seeds at once!');
        } else if (bloomedCount >= 5 && unlockedSlots < 3) {
          await updateDoc(doc(db, 'users', user.uid), { unlockedSlots: 3 });
          setUnlockedSlots(3);
          toast.success('🎉 New slot unlocked! You can now grow 3 seeds at once!');
        }
      } else {
        toast.success(`💧 Watered successfully! ${newCount}/7 waters`);
      }

    } catch (error) {
      console.error('Watering error:', error);
      toast.error('Failed to water seed. Please try again.');
    } finally {
      setIsWatering(false);
    }
  };

  const handleShare = (seed) => {
    if (typeof window === 'undefined') return;
    
    const shareUrl = process.env.NEXT_PUBLIC_SHARE_BASE_URL || window.location.origin;
    const url = `${shareUrl}/flower/${seed.id}`;
    navigator.clipboard.writeText(url);
    toast.success('📋 Share link copied! Send it to friends so they can help water your seed! 💧');
  };

  const handleSeedTypeSelected = (seedType) => {
    setSelectedSeedType(seedType);
    setShowSeedSelection(false);
  };

  const canWaterToday = (seedId) => {
    if (typeof window === 'undefined') return false;
    
    const today = new Date().toDateString();
    const lastWaterKey = `lastWatered_${seedId}`;
    const lastWater = localStorage.getItem(lastWaterKey);
    
    return !lastWater || new Date(lastWater).toDateString() !== today;
  };

  const handleBloomComplete = () => {
    setShowBloomAnimation(false);
    setShowFlowerCard(bloomingFlower);
    setBloomingFlower(null);
  };

  if (!isClient || !showMain) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-100 to-purple-200">
        <div className="text-center">
          <div className="text-6xl animate-bounce mb-4">🌸</div>
          <p className="text-purple-700 text-xl">Loading Sharon's Garden...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-100 to-purple-200">
        <div className="text-center">
          <div className="text-4xl animate-pulse mb-4">🌱</div>
          <p className="text-purple-700">Loading your garden...</p>
        </div>
      </div>
    );
  }

  const totalSlots = 6;
  const activeSeeds = planted?.filter(s => !s.bloomed) || [];
  const bloomedFlowers = planted?.filter(s => s.bloomed) || [];

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-200 p-6 relative">
        
        {/* Song Launch Button - Shows countdown */}
        <div className="absolute top-6 right-6">
          <Button
            onClick={() => setShowSongModal(true)}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg hover:shadow-xl transition-all animate-pulse"
          >
            🎵 Song Launch: 4 Days!
          </Button>
        </div>
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-purple-700 mb-2">
            🌱 Sharon's Garden 🌱
          </h1>
          <p className="text-gray-700 max-w-2xl mx-auto">
            Choose your emotional connection to Sharon, plant your seed, and watch it bloom with the help of friends. 
            Each bloom unlocks special content! ✨
          </p>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-4 mb-6 text-sm flex-wrap">
          <div className="bg-white px-4 py-2 rounded-full shadow">
            🌱 Growing: {activeSeeds.length}
          </div>
          <div className="bg-white px-4 py-2 rounded-full shadow">
            🌸 Bloomed: {bloomedFlowers.length}
          </div>
          <div className="bg-white px-4 py-2 rounded-full shadow">
            🔓 Slots: {unlockedSlots}/{totalSlots}
          </div>
        </div>

        {/* Planting Form */}
        {activeSeeds.length < unlockedSlots && (
          <div className="max-w-md mx-auto mb-8 bg-white rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-bold text-purple-700 mb-4 text-center">
              🌱 Plant a New Seed
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your name (optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={user?.displayName || "Anonymous gardener"}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  maxLength={30}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  What's growing in your heart?
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Share your feelings, a memory, or what you hope for..."
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  rows={3}
                  maxLength={200}
                />
                <p className="text-xs text-gray-500 mt-1">{note.length}/200</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Choose your connection to Sharon
                </label>
                {selectedSeedType ? (
                  <div className={`bg-gradient-to-r ${selectedSeedType.bgColor || 'from-purple-100 to-pink-100'} p-4 rounded-lg border-2 ${selectedSeedType.borderColor || 'border-purple-300'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-2xl mr-2">{selectedSeedType.emoji || '🌱'}</span>
                        <span className="font-medium">{selectedSeedType.name}</span>
                      </div>
                      <button
                        onClick={() => setShowSeedSelection(true)}
                        className="text-sm text-purple-600 hover:underline"
                      >
                        Change
                      </button>
                    </div>
                    <p className="text-sm mt-1 opacity-80">"{selectedSeedType.description}"</p>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSeedSelection(true)}
                    className="w-full border-2 border-dashed border-purple-300 rounded-lg p-4 text-purple-600 hover:border-purple-500 hover:bg-purple-50 transition-colors"
                  >
                    ✨ Choose Your Emotional Seed Type
                  </button>
                )}
              </div>

              <Button
                onClick={handlePlant}
                disabled={!selectedSeedType || isPlanting}
                className="w-full"
              >
                {isPlanting ? '🌱 Planting...' : '🌱 Plant My Seed'}
              </Button>
            </div>
          </div>
        )}

        {/* Garden Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {Array.from({ length: totalSlots }, (_, index) => {
            const seed = planted?.[index];
            
            if (index >= unlockedSlots) {
              return (
                <Card key={`locked-${index}`} className="bg-gray-100 text-gray-400">
                  <CardContent className="text-center p-6">
                    <div className="text-3xl mb-2">🔒</div>
                    <p className="text-sm">Locked Slot</p>
                    <p className="text-xs mt-1">Bloom more flowers to unlock</p>
                  </CardContent>
                </Card>
              );
            }

            if (!seed) {
              return (
                <Card key={`empty-${index}`} className="bg-white border-dashed border-2 border-gray-300">
                  <CardContent className="text-center p-6">
                    <div className="text-3xl mb-2">➕</div>
                    <p className="text-sm text-gray-500">Empty Slot</p>
                  </CardContent>
                </Card>
              );
            }

            const canWater = canWaterToday(seed.id);
            
            return (
              <Card key={seed.id} className="bg-white shadow-lg hover:shadow-xl transition-all">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-4xl mb-2">
                      {seed.bloomed ? seed.bloomedFlower : seed.songSeed ? '🎵' : '🌱'}
                    </div>
                    
                    <h3 className={`font-semibold mb-1 ${seed.bloomed ? 'text-green-700' : seed.songSeed ? 'text-indigo-700' : 'text-purple-700'}`}>
                      {seed.bloomed ? `${seed.type} Bloom` : `${seed.type} Seed`}
                      {seed.songSeed && <span className="text-xs block text-indigo-600">✨ Special</span>}
                    </h3>
                    
                    <p className="text-xs text-gray-500 mb-2">
                      by {seed.name}
                    </p>
                    
                    {seed.note && (
                      <p className="text-xs text-gray-600 mb-3 italic">
                        "{seed.note}"
                      </p>
                    )}
                    
                    <div className="mb-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${seed.songSeed ? 'bg-indigo-400' : 'bg-blue-400'}`}
                          style={{ width: `${((seed.waterCount || 0) / 7) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {seed.waterCount || 0} / 7 waters
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      {!seed.bloomed ? (
                        <Button
                          onClick={() => handleWater(seed)}
                          disabled={isWatering || !canWater}
                          className="w-full text-sm"
                          variant={canWater ? 'default' : 'outline'}
                        >
                          {isWatering ? '💧 Watering...' : 
                           canWater ? '💧 Water' : '⏳ Watered today'}
                        </Button>
                      ) : (
                        <>
                          <div className="text-green-600 font-medium">
                            <p>🌸 Bloomed!</p>
                            {seed.songSeed && (
                              <p className="text-xs text-indigo-600">🎵 Song Bloom</p>
                            )}
                          </div>
                          <Button
                            onClick={() => setShowFlowerCard(seed)}
                            variant="outline"
                            className="w-full text-xs"
                          >
                            📸 View & Share
                          </Button>
                        </>
                      )}
                      
                      <Button
                        onClick={() => handleShare(seed)}
                        variant="outline"
                        className="w-full text-xs"
                      >
                        🔗 Get Share Link
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty state */}
        {planted?.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🌱</div>
            <h2 className="text-2xl font-bold text-purple-700 mb-2">Your garden awaits</h2>
            <p className="text-gray-600 mb-4">Plant your first seed to start your emotional journey with Sharon!</p>
          </div>
        )}

        {/* Seed Type Selection Modal */}
        <SeedTypeSelection
          isOpen={showSeedSelection}
          onClose={() => setShowSeedSelection(false)}
          onSelectSeed={handleSeedTypeSelected}
          userName={user?.displayName || 'Gardener'}
        />

        {/* Song Launch Modal */}
        <SongLaunchCelebration
          isOpen={showSongModal}
          onClose={() => setShowSongModal(false)}
        />
        
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

      {/* Auto-show song launch when within 7 days */}
      <SongLaunchTrigger />
    </>
  );
}
