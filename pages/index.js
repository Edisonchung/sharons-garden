// Enhanced pages/index.js with First Song integration

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { motion } from 'framer-motion';
import SurpriseReward from '../components/SurpriseReward';
import SeedTypeSelection from '../components/SeedTypeSelection';
import EnhancedFlowerCard from '../components/EnhancedFlowerCard';
import { FirstSongSeedTrigger, useFirstSongSeed, FIRST_SONG_FLOWER_MESSAGES } from '../components/FirstSongSpecialSeed';
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

// Enhanced seed types with Sharon's emotional connections
const SEED_TYPES = {
  hope: {
    id: 'hope',
    emoji: '☀️',
    name: 'Dawn Seed',
    description: 'She radiates warmth like sunshine',
    sharonConnection: 'You see Sharon as a source of light and positivity',
    flowerTypes: ['Sunflower', 'Tulip', 'Yellow Rose'],
    bgColor: 'from-yellow-100 to-orange-200',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-300'
  },
  healing: {
    id: 'healing',
    emoji: '🌙',
    name: 'Star Dream Seed', 
    description: 'Her voice brings you peace',
    sharonConnection: 'You find Sharon\'s presence healing and comforting',
    flowerTypes: ['Lavender', 'Lily', 'Baby\'s Breath'],
    bgColor: 'from-purple-100 to-indigo-200',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-300'
  },
  strong: {
    id: 'strong',
    emoji: '💪',
    name: 'Resilience Seed',
    description: 'She\'s gentle yet unbreakably strong',
    sharonConnection: 'You admire Sharon\'s quiet strength and determination',
    flowerTypes: ['Violet', 'Peony', 'Camellia'],
    bgColor: 'from-purple-100 to-pink-200',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-300'
  },
  companion: {
    id: 'companion',
    emoji: '❤️',
    name: 'Heart Whisper Seed',
    description: 'She feels like a close friend',
    sharonConnection: 'You feel Sharon understands and accompanies you',
    flowerTypes: ['Daisy', 'Pink Rose', 'Lotus'],
    bgColor: 'from-pink-100 to-rose-200',
    textColor: 'text-rose-700',
    borderColor: 'border-rose-300'
  },
  mystery: {
    id: 'mystery',
    emoji: '✨',
    name: 'Feather Light Seed',
    description: 'She\'s mysterious and uniquely special',
    sharonConnection: 'You\'re captivated by Sharon\'s enigmatic charm',
    flowerTypes: ['Orchid', 'Anthurium', 'Blue Rose'],
    bgColor: 'from-indigo-100 to-purple-200',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-300'
  },
  // Add first song seed type
  'first-song-melody': {
    id: 'first-song-melody',
    emoji: '🎵',
    name: 'Melody Seed',
    description: 'A magical seed containing Sharon\'s first song',
    sharonConnection: 'You\'re part of Sharon\'s musical journey from the very beginning',
    flowerTypes: ['Musical Note', 'Harmony Bloom', 'Melody Flower'],
    bgColor: 'from-indigo-100 via-purple-100 to-pink-100',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-400'
  }
};

// Enhanced flower database with Sharon's messages
const FLOWER_MESSAGES = {
  'Sunflower': {
    flowerLanguage: 'Unwavering optimism',
    sharonMessage: "You don't need to shine all the time - even facing the light is enough.",
    emoji: '🌻'
  },
  'Tulip': {
    flowerLanguage: 'Perfect love and hope',
    sharonMessage: "Your gentleness is this world's most precious strength.",
    emoji: '🌷'
  },
  'Yellow Rose': {
    flowerLanguage: 'Friendship and joy',
    sharonMessage: "Not all light needs to be brilliant - sometimes warmth is enough.",
    emoji: '🌹'
  },
  'Lavender': {
    flowerLanguage: 'Peaceful thoughts',
    sharonMessage: "You don't need to always be strong - sometimes resting is also a kind of power.",
    emoji: '💜'
  },
  'Lily': {
    flowerLanguage: 'Pure hope',
    sharonMessage: "You're not a lonely white flower, but an entire field waiting to bloom.",
    emoji: '🤍'
  },
  'Baby\'s Breath': {
    flowerLanguage: 'Quiet companionship',
    sharonMessage: "Missing doesn't need words - it's already the lightest starlight.",
    emoji: '⚪'
  },
  // Include first song flower messages
  ...FIRST_SONG_FLOWER_MESSAGES
};

export default function SharonsGarden() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [showMain, setShowMain] = useState(false);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [planted, setPlanted] = useState([]);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [currentReward, setCurrentReward] = useState(null);
  const [shareId, setShareId] = useState(null);
  const [showReward, setShowReward] = useState(false);
  const [unlockedSlots, setUnlockedSlots] = useState(1);
  
  // New states for seed type system
  const [showSeedSelection, setShowSeedSelection] = useState(false);
  const [userSeedPreference, setUserSeedPreference] = useState(null);
  const [showBloomCard, setShowBloomCard] = useState(false);
  const [bloomedFlower, setBloomedFlower] = useState(null);
  
  // First song integration
  const { 
    hasClaimedFirstSong, 
    canPlantFirstSongSeed, 
    getFirstSongSeedData,
    songLaunched 
  } = useFirstSongSeed();
  
  const audioRef = useRef(null);

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
        
        // Load user preferences and slot data
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setUnlockedSlots(userData.unlockedSlots || 1);
          setUserSeedPreference(userData.seedPreference || null);
        }
        
        // Listen to user's flowers
        const q = query(collection(db, 'flowers'), where('userId', '==', currentUser.uid));
        unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const flowers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setPlanted(flowers);
        });
      }
    });

    // Listen for first song seed claim event
    const handleFirstSongClaim = (event) => {
      // Automatically show seed selection for first song seed
      setShowSeedSelection(true);
    };

    window.addEventListener('firstSongSeedClaimed', handleFirstSongClaim);

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      window.removeEventListener('firstSongSeedClaimed', handleFirstSongClaim);
    };
  }, [router]);

  const handleInitialPlant = () => {
    if (!userSeedPreference) {
      setShowSeedSelection(true);
    } else {
      handlePlantWithSeedType(userSeedPreference);
    }
  };

  const handlePlantFirstSongSeed = () => {
    if (canPlantFirstSongSeed()) {
      const firstSongSeedType = getFirstSongSeedData();
      const seedTypeData = SEED_TYPES['first-song-melody'];
      handlePlantWithSeedType(seedTypeData, true);
    }
  };

  const handleSeedTypeSelection = async (seedType) => {
    // Save user's seed preference
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { seedPreference: seedType });
      setUserSeedPreference(seedType);
    }
    
    // Plant the first seed with this type
    handlePlantWithSeedType(seedType);
  };

  const handlePlantWithSeedType = async (seedType, isFirstSongSeed = false) => {
    if (!user || !seedType) return;
    
    // Randomly select a flower type from the seed type's possible flowers
    const possibleFlowers = seedType.flowerTypes;
    const selectedFlower = possibleFlowers[Math.floor(Math.random() * possibleFlowers.length)];
    
    const newSeed = {
      userId: user.uid,
      type: selectedFlower,
      seedType: seedType.id,
      seedTypeName: seedType.name,
      color: getRandomColor(seedType.id),
      name,
      note: isFirstSongSeed ? '🎵 Awaiting Sharon\'s first song...' : note,
      waterCount: 0,
      bloomed: false,
      bloomedFlower: null,
      isFirstSongSeed: isFirstSongSeed,
      createdAt: new Date().toISOString(),
    };
    
    await addDoc(collection(db, 'flowers'), newSeed);
    setName('');
    setNote('');
    
    if (isFirstSongSeed) {
      toast.success('🎵 Melody Seed planted! It will bloom with Sharon\'s song!');
    }
  };

  const getRandomColor = (seedTypeId) => {
    const colorsByType = {
      hope: ['Bright Yellow', 'Golden', 'Sunny Orange'],
      healing: ['Soft Purple', 'Gentle Blue', 'Calming Lavender'],
      strong: ['Deep Purple', 'Rich Magenta', 'Bold Pink'],
      companion: ['Warm Pink', 'Gentle Rose', 'Soft Coral'],
      mystery: ['Mystical Blue', 'Deep Indigo', 'Ethereal Purple'],
      'first-song-melody': ['Melodic Gold', 'Harmonic Purple', 'Musical Silver']
    };
    
    const colors = colorsByType[seedTypeId] || ['Pink', 'Blue', 'Yellow', 'Purple'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleWater = async (id) => {
    if (typeof window === 'undefined') return;
    const today = new Date().toDateString();
    const lastKey = `lastWatered_${id}`;
    const last = localStorage.getItem(lastKey);
    if (last && new Date(last).toDateString() === today) {
      alert("You've already watered this seed today. Try again tomorrow 🌙");
      return;
    }
    
    try {
      const docRef = doc(db, 'flowers', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return;
      
      const data = docSnap.data();
      const newCount = (data.waterCount || 0) + 1;
      const bloomed = newCount >= 7;
      
      // Get the appropriate emoji for the flower type
      const flowerData = FLOWER_MESSAGES[data.type];
      const flowerIcon = flowerData?.emoji || '🌸';
      
      await updateDoc(docRef, {
        waterCount: newCount,
        bloomed,
        bloomedFlower: bloomed ? flowerIcon : null,
        lastWatered: new Date().toISOString()
      });
      
      localStorage.setItem(lastKey, new Date().toISOString());
      
      if (bloomed && !data.bloomed) {
        // Special handling for first song seed
        if (data.isFirstSongSeed && !songLaunched) {
          // Show special pre-launch message
          const enhancedFlowerData = {
            ...data,
            id,
            name: data.type,
            emoji: flowerIcon,
            flowerLanguage: 'Waiting for the perfect moment...',
            sharonMessage: 'Your Melody Seed is ready to bloom! It\'s waiting for my first song to be released. When that magical moment comes, this flower will reveal its true beauty. Thank you for being part of this journey from the very beginning! 🎵💜'
          };
          
          setBloomedFlower(enhancedFlowerData);
          setShowBloomCard(true);
        } else {
          // Regular bloom handling
          const enhancedFlowerData = {
            ...data,
            id,
            name: data.type,
            emoji: flowerIcon,
            flowerLanguage: flowerData?.flowerLanguage || 'Growth and beauty',
            sharonMessage: flowerData?.sharonMessage || 'Your flower has bloomed beautifully!'
          };
          
          setBloomedFlower(enhancedFlowerData);
          setShowBloomCard(true);
        }
      }
    } catch (err) {
      console.error("Watering failed:", err);
      alert("Failed to water this seed.");
    }
  };

  const handleShare = (id) => setShareId(id);
  const closeShare = () => setShareId(null);

  if (!isClient || !showMain) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-100 to-purple-200 text-purple-700 text-xl">
        <p>🌸 Loading your garden...</p>
      </div>
    );
  }

  const totalSlots = 6;
  const padded = Array.from({ length: totalSlots }, (_, i) => planted[i] || null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-200 p-6 relative">
      <audio ref={audioRef} loop hidden />
      
      {/* Header with seed type
