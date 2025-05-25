// utils/WateringManager.js
import { doc, runTransaction, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';

class WateringManager {
  constructor() {
    this.pendingOperations = new Set();
    this.rateLimiter = new Map(); // userId -> lastAction timestamp
    this.dailyLimits = new Map(); // userId -> { date, count }
    
    // Configuration
    this.RATE_LIMIT_MS = 1500; // 1.5 seconds between actions
    this.MAX_DAILY_WATERS = 50; // Prevent abuse
    this.RETRY_ATTEMPTS = 3;
  }

  async waterSeed(userId, seedId, userName = 'Anonymous') {
    // Prevent duplicate operations
    const operationKey = `${userId}-${seedId}`;
    if (this.pendingOperations.has(operationKey)) {
      throw new Error('⏳ Watering already in progress for this seed');
    }

    // Rate limiting per user
    const lastAction = this.rateLimiter.get(userId) || 0;
    const now = Date.now();
    if (now - lastAction < this.RATE_LIMIT_MS) {
      const waitTime = Math.ceil((this.RATE_LIMIT_MS - (now - lastAction)) / 1000);
      throw new Error(`⏳ Please wait ${waitTime} seconds before watering again`);
    }

    // Daily limits check
    const today = new Date().toDateString();
    const userDailyLimit = this.dailyLimits.get(userId) || { date: '', count: 0 };
    
    if (userDailyLimit.date === today && userDailyLimit.count >= this.MAX_DAILY_WATERS) {
      throw new Error('🚫 Daily watering limit reached. Come back tomorrow!');
    }

    // Client-side validation
    if (!this.canWaterToday(seedId)) {
      throw new Error('💧 This seed was already watered today');
    }

    this.pendingOperations.add(operationKey);
    this.rateLimiter.set(userId, now);

    let attempt = 0;
    
    while (attempt < this.RETRY_ATTEMPTS) {
      try {
        const result = await this.executeWateringTransaction(userId, seedId, userName);
        
        // Update daily limits
        this.dailyLimits.set(userId, {
          date: today,
          count: userDailyLimit.date === today ? userDailyLimit.count + 1 : 1
        });

        // Update localStorage after successful transaction
        const lastWaterKey = `lastWatered_${seedId}`;
        localStorage.setItem(lastWaterKey, new Date().toISOString());

        console.log(`✅ Watering successful: ${seedId} (attempt ${attempt + 1})`);
        return result;

      } catch (error) {
        attempt++;
        console.error(`❌ Watering attempt ${attempt} failed:`, error);
        
        if (attempt >= this.RETRY_ATTEMPTS) {
          throw new Error(`💧 Watering failed after ${this.RETRY_ATTEMPTS} attempts: ${error.message}`);
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }

  async executeWateringTransaction(userId, seedId, userName) {
    return await runTransaction(db, async (transaction) => {
      const seedRef = doc(db, 'flowers', seedId);
      const seedDoc = await transaction.get(seedRef);
      
      if (!seedDoc.exists()) {
        throw new Error('🌱 Seed not found');
      }

      const seedData = seedDoc.data();
      
      // Validate seed state
      if (seedData.bloomed) {
        throw new Error('🌸 This seed has already bloomed');
      }

      if (seedData.waterCount >= 7) {
        throw new Error('💧 This seed is already fully watered');
      }

      // Check if seed belongs to user or is accessible for friend watering
      const isOwner = seedData.userId === userId;
      const allowFriendWatering = seedData.allowFriendWatering !== false; // Default to true
      
      if (!isOwner && !allowFriendWatering) {
        throw new Error('🔒 This seed is private');
      }

      const newWaterCount = (seedData.waterCount || 0) + 1;
      const nowBloomed = newWaterCount >= 7;
      
      // Get appropriate flower emoji for this seed type
      const flowerEmoji = this.getFlowerEmoji(seedData.type, seedData.seedType);

      // Prepare update data
      const updateData = {
        waterCount: newWaterCount,
        lastWatered: serverTimestamp(),
        lastWateredBy: userName,
        lastWateredByUserId: userId
      };

      if (nowBloomed) {
        updateData.bloomed = true;
        updateData.bloomedFlower = flowerEmoji;
        updateData.bloomTime = serverTimestamp();
        updateData.bloomedBy = userName;
      }

      // Update the seed
      transaction.update(seedRef, updateData);

      // Log the watering event
      const wateringLogRef = doc(collection(db, 'waterings'));
      transaction.set(wateringLogRef, {
        seedId,
        seedOwnerId: seedData.userId,
        wateredByUserId: userId,
        wateredByUsername: userName,
        waterCount: newWaterCount,
        timestamp: serverTimestamp(),
        isOwnerWatering: isOwner,
        resultedInBloom: nowBloomed
      });

      // Update user statistics (if watering own seed)
      if (isOwner) {
        const userRef = doc(db, 'users', userId);
        transaction.update(userRef, {
          lastWateringDate: new Date().toDateString(),
          totalWaterings: (seedData.totalWaterings || 0) + 1,
          totalBlooms: nowBloomed ? (seedData.totalBlooms || 0) + 1 : (seedData.totalBlooms || 0)
        });
      }

      return {
        newWaterCount,
        bloomed: nowBloomed,
        flowerEmoji: nowBloomed ? flowerEmoji : null,
        seedData: { ...seedData, ...updateData },
        isOwner,
        wateredBy: userName
      };
    });
  }

  getFlowerEmoji(seedType, seedTypeId) {
    // Map of seed types to their possible flower emojis
    const flowerMap = {
      // Traditional seed types
      'Hope': '🌷',
      'Joy': '🌻', 
      'Memory': '🪻',
      'Love': '🌹',
      'Strength': '🌼',
      
      // Enhanced emotional seed types
      'hope': '🌻', // Dawn Seed -> Sunflower
      'healing': '🌸', // Star Dream Seed -> Cherry Blossom
      'strong': '💜', // Resilience Seed -> Purple flower
      'companion': '🌹', // Heart Whisper Seed -> Rose
      'mystery': '🦋', // Feather Light Seed -> Butterfly (unique)
      
      // Special seeds
      'melody': '🎵', // First Song Seed
      'first-song': '🎶',
      'seasonal': '🌺',
      'rainbow': '🌈'
    };

    // Try seedTypeId first, then seedType, then default
    return flowerMap[seedTypeId] || flowerMap[seedType] || '🌸';
  }

  // Client-side validation
  canWaterToday(seedId) {
    if (typeof window === 'undefined') return true; // Server-side always allows
    
    const today = new Date().toDateString();
    const lastWaterKey = `lastWatered_${seedId}`;
    const lastWater = localStorage.getItem(lastWaterKey);
    
    return !lastWater || new Date(lastWater).toDateString() !== today;
  }

  // Get time until user can water again
  getTimeUntilNextWatering(seedId) {
    if (typeof window === 'undefined') return 0;
    
    const lastWaterKey = `lastWatered_${seedId}`;
    const lastWater = localStorage.getItem(lastWaterKey);
    
    if (!lastWater) return 0;
    
    const lastWaterDate = new Date(lastWater);
    const tomorrow = new Date(lastWaterDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    return Math.max(0, tomorrow.getTime() - Date.now());
  }

  // Check user's daily watering status
  getDailyWateringStatus(userId) {
    const today = new Date().toDateString();
    const userLimit = this.dailyLimits.get(userId) || { date: '', count: 0 };
    
    return {
      watered: userLimit.date === today ? userLimit.count : 0,
      limit: this.MAX_DAILY_WATERS,
      remaining: this.MAX_DAILY_WATERS - (userLimit.date === today ? userLimit.count : 0)
    };
  }

  // Clean up finished operations
  cleanup() {
    this.pendingOperations.forEach(operationKey => {
      this.pendingOperations.delete(operationKey);
    });
  }
}

// Singleton instance
export const wateringManager = new WateringManager();

// React hook for components
export function useWatering() {
  const [isWatering, setIsWatering] = useState(false);
  const [error, setError] = useState(null);

  const waterSeed = async (userId, seedId, userName) => {
    setIsWatering(true);
    setError(null);

    try {
      const result = await wateringManager.waterSeed(userId, seedId, userName);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsWatering(false);
    }
  };

  const canWaterToday = (seedId) => {
    return wateringManager.canWaterToday(seedId);
  };

  const getTimeUntilNextWatering = (seedId) => {
    return wateringManager.getTimeUntilNextWatering(seedId);
  };

  const getDailyStatus = (userId) => {
    return wateringManager.getDailyWateringStatus(userId);
  };

  return {
    isWatering,
    error,
    waterSeed,
    canWaterToday,
    getTimeUntilNextWatering,
    getDailyStatus
  };
}

// Cleanup function for app shutdown
export function cleanupWateringManager() {
  wateringManager.cleanup();
}
