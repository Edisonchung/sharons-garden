// pages/index.js - FIXED VERSION WITH REACT IMPORT
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import SeedTypeSelection from '../components/SeedTypeSelection';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import toast from 'react-hot-toast';

const seedTypes = [
  { type: 'Hope', flower: '🌷', color: 'from-yellow-100 to-orange-200' },
  { type: 'Joy', flower: '🌻', color: 'from-yellow-100 to-yellow-200' },
  { type: 'Memory', flower: '🪻', color: 'from-purple-100 to-purple-200' },
  { type: 'Love', flower: '🌹', color: 'from-pink-100 to-rose-200' },
  { type: 'Strength', flower: '🌼', color: 'from-green-100 to-green-200' }
];

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
  const [planted, setPlanted] = useState([]);
  const [unlockedSlots, setUnlockedSlots] = useState(1);
  const [isWatering, setIsWatering] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    let unsubscribeSnapshot = null;
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/auth');
      } else {
        setUser(currentUser);
        setShowMain(true);
        
        // Load user settings
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
        
        // Set up flowers listener
        const q = query(collection(db, 'flowers'), where('userId', '==', currentUser.uid));
        unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const flowers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setPlanted(flowers);
        });
      }
    });
    
    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, [router]);

  // Thread-safe planting
  const handlePlant = async () => {
    if (!user || !selectedSeedType) {
      toast.error('Please select a seed type first');
      return;
    }

    if (isPlanting) return; // Prevent double-clicking

    const activeSeeds = planted?.filter(s => !s.bloomed).length || 0;
    if (activeSeeds >= unlockedSlots) {
      toast.error(`You can only have ${unlockedSlots} growing seeds at once`);
      return;
    }

    setIsPlanting(true);

    try {
      const newSeed = {
        userId: user.uid,
        type: selectedSeedType.type || selectedSeedType.name || 'Hope',
        seedType: selectedSeedType.id || 'hope',
        color: selectedSeedType.color || 'Natural',
        name: name.trim() || user.displayName || 'Anonymous',
        note: note.trim() || `Growing a seed with love 🌱`,
        waterCount: 0,
        bloomed: false,
        bloomedFlower: null,
        createdAt: new Date().toISOString(),
        plantedBy: user.displayName || user.email,
        seedTypeData: selectedSeedType
      };

      await addDoc(collection(db, 'flowers'), newSeed);
      
      toast.success(`🌱 Your ${selectedSeedType.name || selectedSeedType.type} seed has been planted!`);
      
      // Reset form
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

  // Thread-safe watering  
  const handleWater = async (seed) => {
    if (!user || isWatering) return;

    const today = new Date().toDateString();
    const lastKey = `lastWatered_${seed.id}`;
    const last = localStorage.getItem(lastKey);
    
    if (last && new Date(last).toDateString() === today) {
      toast.error("You've already watered this seed today! 💧");
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
      const newCount = (data.waterCount || 0) + 1;
      const bloomed = newCount >= 7;
      const flowerIcon = seedTypes.find(s => s.type === data.type)?.flower || '🌸';

      await updateDoc(docRef, {
        waterCount: newCount,
        bloomed,
        bloomedFlower: bloomed ? flowerIcon : null,
        lastWatered: new Date().toISOString()
      });

      localStorage.setItem(lastKey, new Date().toISOString());
      
      if (bloomed && !data.bloomed) {
        toast.success('🌸 Your flower bloomed! Check it out!');
      } else {
        toast.success(`💧 Watered! ${newCount}/7`);
      }

    } catch (error) {
      console.error('Watering error:', error);
      toast.error('Failed to water seed');
    } finally {
      setIsWatering(false);
    }
  };

  const handleShare = (id) => {
    if (typeof window === 'undefined') return;
    
    const url = `${window.location.origin}/flower/${id}`;
    navigator.clipboard.writeText(url);
    toast.success('📋 Share link copied!');
  };

  const handleSeedTypeSelected = (seedType) => {
    setSelectedSeedType(seedType);
    setShowSeedSelection(false);
  };

  const canWaterToday = (seedId) => {
    if (typeof window === 'undefined') return false;
    
    const today = new Date().toDateString();
    const lastKey = `lastWatered_${seedId}`;
    const last = localStorage.getItem(lastKey);
    
    return !last || new Date(last).toDateString() !== today;
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

  const totalSlots = 6;
  const activeSeeds = planted?.filter(s => !s.bloomed) || [];
  const bloomedFlowers = planted?.filter(s => s.bloomed) || [];
  
  // Create display grid
  const displaySeeds = [];
  for (let i = 0; i < totalSlots; i++) {
    if (i < unlockedSlots) {
      displaySeeds.push(planted?.[i] || null);
    } else {
      displaySeeds.push({ locked: true, index: i });
    }
  }

  return (
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

      {/* Stats */}
      <div className="flex justify-center gap-6 mb-6 text-sm">
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
        {displaySeeds.map((seed, index) => {
          if (seed?.locked) {
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

      {/* Seed Type Selection Modal */}
      <SeedTypeSelection
        isOpen={showSeedSelection}
        onClose={() => setShowSeedSelection(false)}
        onSelectSeed={handleSeedTypeSelected}
        userName={user?.displayName || 'Gardener'}
      />
    </div>
  );
}
