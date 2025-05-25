// pages/index.js - FINAL OPTIMIZED VERSION
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import SeedTypeSelection from '../components/SeedTypeSelection';
import { LaunchErrorBoundary, useAnalytics } from '../utils/LaunchMonitoring';
import { useOptimizedSnapshot } from '../hooks/useOptimizedFirebase';
import { useWatering } from '../utils/WateringManager';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, query, where } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function SharonsGarden() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [showMain, setShowMain] = useState(false);
  
  // Planting form state
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [selectedSeedType, setSelectedSeedType] = useState(null);
  const [showSeedSelection, setShowSeedSelection] = useState(false);
  const [isPlanting, setIsPlanting] = useState(false);
  
  // Garden state
  const [unlockedSlots, setUnlockedSlots] = useState(1);
  
  // Hooks
  const { trackSeedPlanted, trackWatering, trackError, measurePerformance } = useAnalytics();
  const { isWatering, waterSeed, canWaterToday, getDailyStatus } = useWatering();
  
  // Optimized flowers data with caching
  const { data: planted, loading } = useOptimizedSnapshot(
    `user-flowers-${user?.uid}`,
    user ? query(collection(db, 'flowers'), where('userId', '==', user.uid)) : null,
    { cacheDuration: 8000 } // 8 second cache
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
        
        // Load user settings with performance tracking
        await measurePerformance('loadUserSettings', async () => {
          try {
            const userRef = doc(db, 'users', currentUser.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const userData = userSnap.data();
              setUnlockedSlots(userData.unlockedSlots || 1);
            }
          } catch (error) {
            trackError(error, { context: 'loadUserSettings' });
          }
        });
      }
    });
    
    return () => unsubscribeAuth();
  }, [router, measurePerformance, trackError]);

  // Optimized planting with error handling and analytics
  const handlePlant = async () => {
    if (!user || !selectedSeedType) {
      toast.error('Please select a seed type first');
      return;
    }

    if (isPlanting) return;

    const activeSeeds = planted?.filter(s => !s.bloomed).length || 0;
    if (activeSeeds >= unlockedSlots) {
      toast.error(`You can only have ${unlockedSlots} growing seeds at once`);
      return;
    }

    setIsPlanting(true);

    await measurePerformance('plantSeed', async () => {
      try {
        const newSeed = {
          userId: user.uid,
          type: selectedSeedType.name || selectedSeedType.type || 'Hope',
          seedType: selectedSeedType.id || 'hope',
          color: 'Natural',
          name: name.trim() || user.displayName || 'Anonymous',
          note: note.trim() || `Growing a ${selectedSeedType.name || 'seed'} with love 🌱`,
          waterCount: 0,
          bloomed: false,
          bloomedFlower: null,
          createdAt: new Date().toISOString(),
          plantedBy: user.displayName || user.email,
          seedTypeData: selectedSeedType,
          allowFriendWatering: true // Enable friend watering by default
        };

        await addDoc(collection(db, 'flowers'), newSeed);
        
        // Track successful planting
        trackSeedPlanted(selectedSeedType.name || selectedSeedType.type, {
          seedTypeId: selectedSeedType.id,
          hasCustomMessage: !!note.trim(),
          hasCustomName: !!name.trim()
        });
        
        toast.success(`🌱 Your ${selectedSeedType.name || selectedSeedType.type} seed has been planted!`);
        
        // Reset form
        setName('');
        setNote('');
        setSelectedSeedType(null);
        setShowSeedSelection(false);

      } catch (error) {
        trackError(error, { 
          context: 'planting', 
          seedType: selectedSeedType.name,
          severity: 'error'
        });
        toast.error('Failed to plant seed. Please try again.');
      } finally {
        setIsPlanting(false);
      }
    });
  };

  // Optimized watering with comprehensive error handling
  const handleWater = async (seed) => {
    if (!user || !seed) return;

    if (!canWaterToday(seed.id)) {
      toast.error("You've already watered this seed today! 💧");
      return;
    }

    await measurePerformance('waterSeed', async () => {
      try {
        const result = await waterSeed(user.uid, seed.id, user.displayName);
        
        // Track successful watering
        trackWatering(seed.id, user.uid, {
          seedType: seed.type,
          waterCount: result.newWaterCount,
          bloomed: result.bloomed,
          isOwner: result.isOwner
        });
        
        if (result.bloomed) {
          toast.success(`🌸 Your ${seed.type} bloomed into a beautiful ${result.flowerEmoji}!`);
        } else {
          toast.success(`💧 Watered! ${result.newWaterCount}/7 waters`);
        }

      } catch (error) {
        // Error already tracked in wateringManager, just show user message
        toast.error(error.message || 'Failed to water seed');
      }
    });
  };

  const handleShare = (id) => {
    if (typeof window === 'undefined') return;
    
    measurePerformance('shareAction', async () => {
      const url = `${window.location.origin}/flower/${id}`;
      await navigator.clipboard.writeText(url);
      toast.success('📋 Share link copied!');
    });
  };

  const handleSeedTypeSelected = (seedType) => {
    setSelectedSeedType(seedType);
    setShowSeedSelection(false);
  };

  // Show loading state
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
  const dailyStatus = getDailyStatus(user?.uid);

  return (
    <LaunchErrorBoundary>
      <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-200 p-6 relative">
        
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

        {/* Stats Dashboard */}
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
          <div className="bg-white px-4 py-2 rounded-full shadow">
            💧 Daily: {dailyStatus.watered}/{dailyStatus.limit}
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
                  className="w-full border border-gray-300 rounded px-3 py-2"
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
                  className="w-full border border-gray-300 rounded px-3 py-2"
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
                  <div className={`bg-gradient-to-r ${selectedSeedType.bgColor} p-4 rounded-lg border-2 ${selectedSeedType.borderColor}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-2xl mr-2">{selectedSeedType.emoji}</span>
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
                    className="w-full border-2 border-dashed border-purple-300 rounded-lg p-4 text-purple-600 hover:border-purple-500 hover:bg-purple-50"
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
                      {seed.bloomed ? seed.bloomedFlower : '🌱'}
                    </div>
                    
                    <h3 className={`font-semibold mb-1 ${seed.bloomed ? 'text-green-700' : 'text-purple-700'}`}>
                      {seed.bloomed ? `${seed.type} Bloom` : `${seed.type} Seed`}
                    </h3>
                    
                    <p className="text-xs text-gray-500 mb-2">
                      by {seed.name} • {seed.color}
                    </p>
                    
                    {seed.note && (
                      <p className="text-xs text-gray-600 mb-3 italic line-clamp-2">
                        "{seed.note}"
                      </p>
                    )}
                    
                    <div className="mb-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-400 h-2 rounded-full transition-all"
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
                        <div className="text-green-600 font-medium">
                          <p>🌸 Bloomed!</p>
                          {seed.specialSeed && (
                            <p className="text-xs text-purple-600">✨ Special</p>
                          )}
                        </div>
                      )}
                      
                      <Button
                        onClick={() => handleShare(seed.id)}
                        variant="outline"
                        className="w-full text-xs"
                      >
                        🔗 Share
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
      </div>
    </LaunchErrorBoundary>
  );
}
