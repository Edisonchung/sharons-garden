// utils/WateringManager.js
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

class WateringManager {
  constructor() {
    this.pendingOperations = new Set();
    this.rateLimiter = new Map(); // userId -> lastAction timestamp
    this.RATE_LIMIT_MS = 2000; // 2 seconds between actions
  }

  async waterSeed(userId, seedId, userName = 'Anonymous') {
    // Prevent duplicate operations
    const operationKey = `${userId}-${seedId}`;
    if (this.pendingOperations.has(operationKey)) {
      throw new Error('Watering already in progress');
    }

    // Rate limiting
    const lastAction = this.rateLimiter.get(userId) || 0;
    const now = Date.now();
    if (now - lastAction < this.RATE_LIMIT_MS) {
      throw new Error('Please wait before watering again');
    }

    // Check daily watering limit from localStorage
    const today = new Date().toDateString();
    const lastWaterKey = `lastWatered_${seedId}`;
    const lastWater = localStorage.getItem(lastWaterKey);
    
    if (lastWater && new Date(lastWater).toDateString() === today) {
      throw new Error('Already watered today');
    }

    this.pendingOperations.add(operationKey);
    this.rateLimiter.set(userId, now);

    try {
      const result = await runTransaction(db, async (transaction) => {
        const seedRef = doc(db, 'flowers', seedId);
        const seedDoc = await transaction.get(seedRef);
        
        if (!seedDoc.exists()) {
          throw new Error('Seed not found');
        }

        const seedData = seedDoc.data();
        
        // Validate seed can be watered
        if (seedData.bloomed) {
          throw new Error('Seed is already bloomed');
        }

        if (seedData.waterCount >= 7) {
          throw new Error('Seed is fully watered');
        }

        const newWaterCount = (seedData.waterCount || 0) + 1;
        const nowBloomed = newWaterCount >= 7;
        
        // Get flower emoji for this seed type
        const flowerEmoji = this.getFlowerEmoji(seedData.type || 'Hope');

        // Update seed
        const updateData = {
          waterCount: newWaterCount,
          bloomed: nowBloomed,
          lastWatered: serverTimestamp()
        };

        if (nowBloomed) {
          updateData.bloomedFlower = flowerEmoji;
          updateData.bloomTime = serverTimestamp();
        }

        transaction.update(seedRef, updateData);

        // Log watering event
        const wateringRef = doc(db, 'waterings', `${seedId}-${Date.now()}`);
        transaction.set(wateringRef, {
          seedId,
          userId,
          fromUsername: userName,
          timestamp: serverTimestamp(),
          waterCount: newWaterCount
        });

        // Update user's watering count for streaks
        if (userId) {
          const userRef = doc(db, 'users', userId);
          transaction.update(userRef, {
            lastWateringDate: today,
            totalWaterings: (seedData.totalWaterings || 0) + 1
          });
        }

        return {
          newWaterCount,
          bloomed: nowBloomed,
          flowerEmoji: nowBloomed ? flowerEmoji : null,
          seedData: { ...seedData, ...updateData }
        };
      });

      // Update localStorage after successful transaction
      localStorage.setItem(lastWaterKey, new Date().toISOString());

      return result;

    } finally {
      this.pendingOperations.delete(operationKey);
    }
  }

  getFlowerEmoji(seedType) {
    const flowerMap = {
      'Hope': '🌷',
      'Joy': '🌻', 
      'Memory': '🪻',
      'Love': '🌹',
      'Strength': '🌼',
      'Dawn Seed': '🌻',
      'Star Dream Seed': '🌸',
      'Resilience Seed': '💜',
      'Heart Whisper Seed': '🌹',
      'Feather Light Seed': '🦋'
    };
    return flowerMap[seedType] || '🌸';
  }

  // Check if user can water (client-side validation)
  canWaterToday(seedId) {
    const today = new Date().toDateString();
    const lastWaterKey = `lastWatered_${seedId}`;
    const lastWater = localStorage.getItem(lastWaterKey);
    
    return !lastWater || new Date(lastWater).toDateString() !== today;
  }

  // Get time until user can water again
  getTimeUntilNextWatering(seedId) {
    const lastWaterKey = `lastWatered_${seedId}`;
    const lastWater = localStorage.getItem(lastWaterKey);
    
    if (!lastWater) return 0;
    
    const lastWaterDate = new Date(lastWater);
    const tomorrow = new Date(lastWaterDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    return Math.max(0, tomorrow.getTime() - Date.now());
  }
}

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

  return {
    isWatering,
    error,
    waterSeed,
    canWaterToday: wateringManager.canWaterToday.bind(wateringManager),
    getTimeUntilNextWatering: wateringManager.getTimeUntilNextWatering.bind(wateringManager)
  };
}
