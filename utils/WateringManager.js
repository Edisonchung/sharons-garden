// utils/WateringManager.js - Simplified version to fix permission issues
import { useState, useCallback } from 'react';
import { 
  doc, 
  updateDoc, 
  addDoc, 
  collection, 
  serverTimestamp, 
  getDoc,
  increment 
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { NotificationManager } from '../components/NotificationSystem';
import { FLOWER_DATABASE } from '../hooks/useSeedTypes';

// Simplified WateringManager class focused on core functionality
class SimplifiedWateringManager {
  constructor() {
    this.operationQueue = [];
    this.isProcessing = false;
    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageResponseTime: 0,
      queueLength: 0,
      pendingOperations: 0
    };
    this.dailyWateringCache = new Map();
    this.concurrentOperations = 0;
    this.maxConcurrentOperations = 3; // Reduced for simplicity
    this.rateLimiter = new Map();
    
    // Process queue every 200ms (slower to avoid rate limits)
    setInterval(() => this.processQueue(), 200);
    
    // Clean cache every 5 minutes
    setInterval(() => this.cleanCache(), 300000);
  }

  // Simple rate limiting
  checkRateLimit(userId) {
    const now = Date.now();
    const userLimit = this.rateLimiter.get(userId);
    
    if (!userLimit || now > userLimit.resetTime) {
      this.rateLimiter.set(userId, {
        count: 1,
        resetTime: now + 60000 // 1 minute window
      });
      return true;
    }
    
    if (userLimit.count >= 10) { // 10 operations per minute
      return false;
    }
    
    userLimit.count++;
    return true;
  }

  // Simple daily watering check
  async canWaterToday(userId, seedId) {
    const cacheKey = `${userId}_${seedId}`;
    const today = new Date().toDateString();
    
    // Check cache first
    const cached = this.dailyWateringCache.get(cacheKey);
    if (cached && cached.date === today) {
      return !cached.watered;
    }
    
    // Fallback to localStorage check
    const lastKey = `lastWatered_${seedId}`;
    const lastWater = localStorage.getItem(lastKey);
    const canWater = !lastWater || new Date(lastWater).toDateString() !== today;
    
    // Update cache
    this.dailyWateringCache.set(cacheKey, {
      date: today,
      watered: !canWater
    });
    
    return canWater;
  }

  // Main watering operation
  async waterSeed(userId, seedId, wateredBy, seedData) {
    return new Promise((resolve, reject) => {
      this.operationQueue.push({
        type: 'water',
        userId,
        seedId,
        wateredBy,
        seedData,
        resolve,
        reject,
        timestamp: Date.now(),
        retries: 0
      });
      
      this.metrics.queueLength = this.operationQueue.length;
    });
  }

  // Simplified queue processing
  async processQueue() {
    if (this.isProcessing || this.operationQueue.length === 0) return;
    if (this.concurrentOperations >= this.maxConcurrentOperations) return;
    
    this.isProcessing = true;
    const operation = this.operationQueue.shift();
    this.metrics.queueLength = this.operationQueue.length;
    
    if (!operation) {
      this.isProcessing = false;
      return;
    }
    
    try {
      this.concurrentOperations++;
      const result = await this.executeSimpleWateringOperation(operation);
      
      this.metrics.successfulOperations++;
      this.updateMetrics(Date.now() - operation.timestamp);
      
      operation.resolve(result);
      
    } catch (error) {
      console.error('Watering operation failed:', error);
      
      // Simple retry logic
      if (operation.retries < 1 && this.shouldRetry(error)) {
        operation.retries++;
        setTimeout(() => {
          this.operationQueue.unshift(operation);
          this.metrics.queueLength = this.operationQueue.length;
        }, 2000);
      } else {
        this.metrics.failedOperations++;
        operation.reject(error);
      }
      
    } finally {
      this.concurrentOperations--;
      this.isProcessing = false;
    }
  }

  // Simplified watering operation without batch writes
  async executeSimpleWateringOperation({ userId, seedId, wateredBy, seedData }) {
    const startTime = Date.now();
    
    // Rate limiting check
    if (!this.checkRateLimit(userId)) {
      throw new Error('Rate limit exceeded. Please wait before watering again.');
    }

    // Daily watering check
    const canWater = await this.canWaterToday(userId, seedId);
    if (!canWater) {
      throw new Error('You have already watered this seed today. Come back tomorrow! 🌙');
    }

    // Get current seed state
    const seedRef = doc(db, 'flowers', seedId);
    const seedSnap = await getDoc(seedRef);
    
    if (!seedSnap.exists()) {
      throw new Error('Seed not found or has been removed.');
    }

    const currentSeed = seedSnap.data();
    
    // Validation checks
    if (currentSeed.bloomed) {
      throw new Error('This seed has already bloomed! 🌸');
    }
    
    if (currentSeed.waterCount >= 7) {
      throw new Error('This seed has reached its maximum water limit.');
    }

    // Calculate new state
    const newWaterCount = (currentSeed.waterCount || 0) + 1;
    const willBloom = newWaterCount >= 7;
    const isOwner = userId === currentSeed.userId;
    
    // Prepare flower data if blooming
    let flowerData = null;
    let bloomedFlower = '🌸';
    
    if (willBloom) {
      flowerData = this.generateFlowerData(currentSeed, seedData);
      bloomedFlower = flowerData.emoji;
    }

    // SIMPLIFIED: Update flower document directly (no batch)
    const seedUpdate = {
      waterCount: newWaterCount,
      lastWatered: serverTimestamp(),
      lastWateredBy: wateredBy,
      lastWateredById: userId,
      lastWateredAt: new Date().toISOString()
    };

    if (willBloom) {
      seedUpdate.bloomed = true;
      seedUpdate.bloomedFlower = bloomedFlower;
      seedUpdate.bloomTime = serverTimestamp();
      seedUpdate.flowerData = flowerData;
      seedUpdate.bloomedBy = wateredBy;
      seedUpdate.bloomedById = userId;
      
      if (flowerData.flowerLanguage) {
        seedUpdate.flowerLanguage = flowerData.flowerLanguage;
      }
      if (flowerData.sharonMessage) {
        seedUpdate.sharonMessage = flowerData.sharonMessage;
      }
      if (flowerData.rarity) {
        seedUpdate.rarity = flowerData.rarity;
      }
    }

    // Update the flower document
    await updateDoc(seedRef, seedUpdate);

    // SIMPLIFIED: Create watering log separately (no batch)
    try {
      const wateringLog = {
        seedId,
        seedOwnerId: currentSeed.userId,
        seedOwnerName: currentSeed.name || 'Anonymous',
        seedType: currentSeed.type,
        wateredByUserId: userId,
        wateredByUsername: wateredBy,
        waterCount: newWaterCount,
        resultedInBloom: willBloom,
        timestamp: serverTimestamp(),
        isOwnerWatering: isOwner
      };

      await addDoc(collection(db, 'waterings'), wateringLog);
    } catch (logError) {
      console.warn('Failed to create watering log (non-critical):', logError);
    }

    // SIMPLIFIED: Create daily watering record separately
    try {
      const today = new Date().toDateString().replace(/\s/g, '_');
      const dailyRef = doc(db, 'dailyWaterings', `${userId}_${seedId}_${today}`);
      await updateDoc(dailyRef, {
        userId,
        seedId,
        seedOwnerId: currentSeed.userId,
        date: today,
        timestamp: serverTimestamp()
      }).catch(async () => {
        // If update fails, try create
        await addDoc(collection(db, 'dailyWaterings'), {
          userId,
          seedId,
          seedOwnerId: currentSeed.userId,
          date: today,
          timestamp: serverTimestamp()
        });
      });
    } catch (dailyError) {
      console.warn('Failed to create daily watering record (non-critical):', dailyError);
    }

    // SIMPLIFIED: Update user stats separately (optional)
    try {
      const userRef = doc(db, 'users', userId);
      const userUpdates = {
        totalWaterings: increment(1),
        lastWateringDate: serverTimestamp()
      };

      if (willBloom) {
        userUpdates.totalBlooms = increment(1);
        if (isOwner) {
          userUpdates.ownBlooms = increment(1);
        } else {
          userUpdates.helpedBlooms = increment(1);
        }
      }

      await updateDoc(userRef, userUpdates);
    } catch (statsError) {
      console.warn('Failed to update user stats (non-critical):', statsError);
    }

    // Update cache
    const cacheKey = `${userId}_${seedId}`;
    this.dailyWateringCache.set(cacheKey, {
      date: new Date().toDateString(),
      watered: true
    });

    // Update localStorage for immediate feedback
    localStorage.setItem(`lastWatered_${seedId}`, new Date().toISOString());

    return {
      success: true,
      newWaterCount,
      bloomed: willBloom,
      isOwner,
      wateredBy,
      flowerData,
      bloomedFlower,
      responseTime: Date.now() - startTime
    };
  }

  // Generate flower data (unchanged)
  generateFlowerData(seedData, seedTypeData) {
    const seedType = seedTypeData || seedData.seedTypeData;
    
    // Special handling for song seeds
    if (seedData.songSeed || seedData.specialSeed) {
      return {
        name: 'Song Bloom',
        emoji: '🎵',
        flowerLanguage: 'The melody of dreams coming true',
        sharonMessage: "Your special melody seed has bloomed! This represents the start of something beautiful. Thank you for being part of this journey with me. 💜",
        rarity: 'legendary'
      };
    }

    // Get appropriate flower types based on seed type
    const flowerTypes = seedType?.flowerTypes || ['Rose', 'Daisy', 'Tulip'];
    const randomFlowerType = flowerTypes[Math.floor(Math.random() * flowerTypes.length)];
    
    // Get flower data from database
    const flowerInfo = FLOWER_DATABASE[randomFlowerType] || {
      emoji: '🌸',
      flowerLanguage: 'Beautiful growth from patience',
      sharonMessage: "Every flower is unique, just like every emotion you've shared. Thank you for growing with me. 🌸"
    };

    // Determine rarity (5% rare, 1% rainbow)
    const rarityRoll = Math.random();
    let rarity = 'common';
    
    if (rarityRoll < 0.01) {
      rarity = 'rainbow';
    } else if (rarityRoll < 0.05) {
      rarity = 'rare';
    }

    return {
      name: randomFlowerType,
      emoji: flowerInfo.emoji,
      flowerLanguage: flowerInfo.flowerLanguage,
      sharonMessage: flowerInfo.sharonMessage,
      rarity,
      seedType: seedData.type,
      bloomDate: new Date().toISOString()
    };
  }

  // Helper methods (unchanged)
  shouldRetry(error) {
    const retryableErrors = [
      'timeout',
      'network',
      'unavailable',
      'deadline-exceeded'
    ];
    
    return retryableErrors.some(err => 
      error.message.toLowerCase().includes(err) ||
      error.code?.toLowerCase().includes(err)
    );
  }

  updateMetrics(responseTime) {
    this.metrics.totalOperations++;
    const oldAvg = this.metrics.averageResponseTime;
    this.metrics.averageResponseTime = 
      (oldAvg * (this.metrics.totalOperations - 1) + responseTime) / this.metrics.totalOperations;
  }

  getMetrics() {
    const successRate = this.metrics.totalOperations > 0 
      ? ((this.metrics.successfulOperations / this.metrics.totalOperations) * 100).toFixed(1)
      : '0.0';

    return {
      ...this.metrics,
      successRate: `${successRate}%`,
      averageResponseTime: this.metrics.averageResponseTime.toFixed(0),
      cacheSize: this.dailyWateringCache.size
    };
  }

  cleanCache() {
    const now = new Date().toDateString();
    
    for (const [key, value] of this.dailyWateringCache.entries()) {
      if (value.date !== now) {
        this.dailyWateringCache.delete(key);
      }
    }
    
    const currentTime = Date.now();
    for (const [userId, limit] of this.rateLimiter.entries()) {
      if (currentTime > limit.resetTime) {
        this.rateLimiter.delete(userId);
      }
    }
  }
}

// Create singleton instance
export const wateringManager = new SimplifiedWateringManager();

// Simplified React hook
export function useWatering() {
  const [isWatering, setIsWatering] = useState(false);
  const [error, setError] = useState(null);

  const waterSeed = useCallback(async (userId, seedId, wateredBy, seedData) => {
    if (!auth.currentUser) {
      throw new Error('Please sign in to water seeds');
    }

    setIsWatering(true);
    setError(null);

    try {
      const result = await wateringManager.waterSeed(userId, seedId, wateredBy, seedData);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsWatering(false);
    }
  }, []);

  const canWaterToday = useCallback(async (userId, seedId) => {
    try {
      return await wateringManager.canWaterToday(userId, seedId);
    } catch (err) {
      console.error('Error checking daily watering:', err);
      return false;
    }
  }, []);

  return {
    waterSeed,
    canWaterToday,
    isWatering,
    error
  };
}

export default wateringManager;
