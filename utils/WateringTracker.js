// utils/WateringTracker.js - Centralized Firestore-based watering tracking
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export class WateringTracker {
  constructor() {
    this.cache = new Map(); // In-memory cache for performance
    this.cacheExpiry = new Map();
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  }

  // Get today's date string in consistent format
  getTodayString() {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  // Check if user can water a specific seed today
  async canWaterToday(userId, seedId) {
    if (!userId || !seedId) return false;

    const cacheKey = `${userId}-${seedId}-${this.getTodayString()}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey);
      if (Date.now() < expiry) {
        return !this.cache.get(cacheKey); // Return inverse (true = can water, false = already watered)
      }
    }

    try {
      const today = this.getTodayString();
      const wateringId = `${userId}_${seedId}_${today}`;
      
      const wateringRef = doc(db, 'dailyWaterings', wateringId);
      const wateringSnap = await getDoc(wateringRef);
      
      const hasWatered = wateringSnap.exists();
      
      // Cache the result
      this.cache.set(cacheKey, hasWatered);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);
      
      return !hasWatered;
    } catch (error) {
      console.error('Error checking watering status:', error);
      // Fall back to allowing watering if there's an error
      return true;
    }
  }

  // Record that a user watered a seed today
  async recordWatering(userId, seedId, userName = 'Anonymous', seedOwnerId = null) {
    if (!userId || !seedId) {
      throw new Error('User ID and Seed ID are required');
    }

    try {
      const today = this.getTodayString();
      const wateringId = `${userId}_${seedId}_${today}`;
      
      const wateringData = {
        userId,
        seedId,
        seedOwnerId: seedOwnerId || userId,
        userName,
        date: today,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'dailyWaterings', wateringId), wateringData);
      
      // Update cache
      const cacheKey = `${userId}-${seedId}-${today}`;
      this.cache.set(cacheKey, true);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);
      
      console.log('✅ Watering recorded for', seedId);
      return true;
    } catch (error) {
      console.error('❌ Failed to record watering:', error);
      throw error;
    }
  }

  // Get all seeds a user has watered today
  async getTodaysWaterings(userId) {
    if (!userId) return [];

    try {
      const today = this.getTodayString();
      const wateringsQuery = query(
        collection(db, 'dailyWaterings'),
        where('userId', '==', userId),
        where('date', '==', today)
      );
      
      const snap = await getDocs(wateringsQuery);
      return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching today\'s waterings:', error);
      return [];
    }
  }

  // Bulk check watering status for multiple seeds
  async bulkCheckWateringStatus(userId, seedIds) {
    if (!userId || !seedIds?.length) return {};

    try {
      const today = this.getTodayString();
      const status = {};
      
      // Check cache first
      const uncachedSeeds = [];
      seedIds.forEach(seedId => {
        const cacheKey = `${userId}-${seedId}-${today}`;
        if (this.cache.has(cacheKey)) {
          const expiry = this.cacheExpiry.get(cacheKey);
          if (Date.now() < expiry) {
            status[seedId] = !this.cache.get(cacheKey); // Inverse for canWater
          } else {
            uncachedSeeds.push(seedId);
          }
        } else {
          uncachedSeeds.push(seedId);
        }
      });

      // Fetch uncached seeds from Firestore
      if (uncachedSeeds.length > 0) {
        const wateringsQuery = query(
          collection(db, 'dailyWaterings'),
          where('userId', '==', userId),
          where('date', '==', today)
        );
        
        const snap = await getDocs(wateringsQuery);
        const wateredToday = new Set();
        
        snap.docs.forEach(doc => {
          const data = doc.data();
          wateredToday.add(data.seedId);
        });

        // Update status and cache for uncached seeds
        uncachedSeeds.forEach(seedId => {
          const hasWatered = wateredToday.has(seedId);
          status[seedId] = !hasWatered;
          
          // Cache the result
          const cacheKey = `${userId}-${seedId}-${today}`;
          this.cache.set(cacheKey, hasWatered);
          this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);
        });
      }

      return status;
    } catch (error) {
      console.error('Error bulk checking watering status:', error);
      // Return all true (can water) if there's an error
      const fallbackStatus = {};
      seedIds.forEach(seedId => {
        fallbackStatus[seedId] = true;
      });
      return fallbackStatus;
    }
  }

  // Clear cache (useful for testing or when user changes)
  clearCache() {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  // Clean up expired cache entries
  cleanupCache() {
    const now = Date.now();
    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (now >= expiry) {
        this.cache.delete(key);
        this.cacheExpiry.delete(key);
      }
    }
  }
}

// Singleton instance
export const wateringTracker = new WateringTracker();

// Clean up cache every 10 minutes
setInterval(() => {
  wateringTracker.cleanupCache();
}, 10 * 60 * 1000);

// React hook for watering status
export function useWateringStatus(userId, seedIds = []) {
  const [wateringStatus, setWateringStatus] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || seedIds.length === 0) {
      setWateringStatus({});
      setLoading(false);
      return;
    }

    const loadWateringStatus = async () => {
      setLoading(true);
      try {
        const status = await wateringTracker.bulkCheckWateringStatus(userId, seedIds);
        setWateringStatus(status);
      } catch (error) {
        console.error('Error loading watering status:', error);
        // Default to allowing watering
        const defaultStatus = {};
        seedIds.forEach(seedId => {
          defaultStatus[seedId] = true;
        });
        setWateringStatus(defaultStatus);
      } finally {
        setLoading(false);
      }
    };

    loadWateringStatus();
  }, [userId, JSON.stringify(seedIds)]); // JSON.stringify for array comparison

  const canWaterToday = (seedId) => {
    return wateringStatus[seedId] !== false; // Default to true if unknown
  };

  const recordWatering = async (seedId, userName, seedOwnerId) => {
    try {
      await wateringTracker.recordWatering(userId, seedId, userName, seedOwnerId);
      // Update local state
      setWateringStatus(prev => ({
        ...prev,
        [seedId]: false
      }));
    } catch (error) {
      console.error('Error recording watering:', error);
      throw error;
    }
  };

  return {
    wateringStatus,
    loading,
    canWaterToday,
    recordWatering
  };
}

// Updated component integration examples

// For index.js - Add these imports and replace watering logic:
/*
import { wateringTracker, useWateringStatus } from '../utils/WateringTracker';

// In the component:
const seedIds = planted?.map(seed => seed.id) || [];
const { wateringStatus, loading: wateringLoading, canWaterToday, recordWatering } = useWateringStatus(user?.uid, seedIds);

// Replace the existing handleWater function:
const handleWater = async (seed) => {
  if (!user || wateringInProgress) return;

  if (!seed || !seed.id) {
    toast.error("Invalid seed data. Please refresh the page.");
    return;
  }

  if (!canWaterToday(seed.id)) {
    toast.error("You've already watered this seed today! Come back tomorrow 🌙");
    return;
  }

  try {
    console.log('Watering seed:', seed.id, seed);
    
    const seedDataToPass = {
      ...seed,
      seedTypeData: seed.seedTypeData || (seed.songSeed ? {
        id: 'melody',
        name: 'Melody Seed',
        emoji: '🎵',
        flowerTypes: ['Song Bloom']
      } : null)
    };
    
    const result = await waterSeed(
      user.uid,
      seed.id,
      user.displayName || user.email || 'Anonymous',
      seedDataToPass
    );
    
    // Record the watering in Firestore
    await recordWatering(
      seed.id,
      user.displayName || user.email || 'Anonymous',
      seed.userId
    );
    
    if (result.bloomed) {
      // Show bloom animation
      setBloomingFlower({
        ...seed,
        ...result.flowerData,
        waterCount: result.newWaterCount,
        bloomed: true,
        bloomedFlower: result.flowerData?.emoji || (seed.songSeed ? '🎵' : '🌸')
      });
      setShowBloomAnimation(true);
      
      // Create bloom notification
      await NotificationManager.seedBloomedNotification(
        user.uid,
        seed.type,
        result.flowerData?.emoji || (seed.songSeed ? '🎵' : '🌸')
      );
      
      // Update unlocked slots logic...
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
      toast.success(`💧 Watered successfully! ${result.newWaterCount}/7 waters`);
    }

  } catch (error) {
    console.error('Watering error:', error);
    logError(error, { action: 'watering', seedId: seed.id, seedData: seed });
    toast.error(error.message || 'Failed to water seed. Please try again.');
  }
};

// Replace the canWaterToday function call in the render:
const canWater = canWaterToday(seed.id);
*/

// For my.js - Add these imports and replace watering logic:
/*
import { wateringTracker, useWateringStatus } from '../../utils/WateringTracker';

// In the component:
const seedIds = seeds?.map(seed => seed.id) || [];
const { wateringStatus, loading: wateringLoading, canWaterToday, recordWatering } = useWateringStatus(user?.uid, seedIds);

// Replace the existing handleWater function:
const handleWater = async (seed) => {
  if (isWatering) return;
  
  if (!canWaterToday(seed.id)) {
    toast.error('💧 You already watered this seed today! Come back tomorrow 🌙');
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
    
    if (data.waterCount >= 7) {
      toast.error('💧 This seed has reached its water limit and cannot be watered anymore!');
      return;
    }
    
    if (data.bloomed) {
      toast.error('🌸 This seed has already bloomed!');
      return;
    }
    
    const bloomed = newCount >= 7;
    
    // Build update object with flower data logic...
    let flowerData = {};
    let flowerEmoji = data.bloomedFlower || '🌸';
    
    if (bloomed && !data.bloomed && data.seedTypeData && data.seedTypeData.flowerTypes) {
      try {
        const possibleFlowers = data.seedTypeData.flowerTypes;
        if (possibleFlowers && possibleFlowers.length > 0) {
          const randomFlower = possibleFlowers[Math.floor(Math.random() * possibleFlowers.length)];
          const rawData = FLOWER_DATABASE[randomFlower];
          
          if (rawData) {
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
      }
    }

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

    await updateDoc(ref, updateData);

    // Record watering in Firestore
    await recordWatering(
      seed.id,
      user.displayName || user.email || 'Anonymous',
      seed.userId
    );

    // Log watering event
    await addDoc(collection(db, 'waterings'), {
      seedId: seed.id,
      userId: user.uid,
      fromUsername: user.displayName || user.email || 'Anonymous',
      timestamp: serverTimestamp(),
      resultedInBloom: bloomed && !data.bloomed
    });

    if (bloomed && !data.bloomed) {
      setBloomingFlower({
        ...seed,
        ...updateData,
        ...flowerData,
        emoji: flowerEmoji
      });
      setShowBloomAnimation(true);
      
      try {
        await NotificationManager.seedBloomedNotification(
          user.uid,
          data.type,
          flowerEmoji
        );
      } catch (notifError) {
        console.warn('Notification failed:', notifError);
      }
      
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

// In the render section, replace the canWaterToday call:
const canWater = canWaterToday(seed.id);
*/
