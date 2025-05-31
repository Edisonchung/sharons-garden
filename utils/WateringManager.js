// utils/WateringManager.js - Improved version with better error handling
import { useState, useCallback } from 'react';
import { 
  doc, 
  updateDoc, 
  addDoc, 
  collection, 
  serverTimestamp, 
  getDoc,
  increment,
  runTransaction
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { FLOWER_DATABASE } from '../hooks/useSeedTypes';

class ImprovedWateringManager {
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
    this.maxConcurrentOperations = 3;
    this.rateLimiter = new Map();
    
    // Process queue every 300ms (slower to avoid rate limits)
    setInterval(() => this.processQueue(), 300);
    
    // Clean cache every 5 minutes
    setInterval(() => this.cleanCache(), 300000);
  }

  // Enhanced rate limiting with user feedback
  checkRateLimit(userId) {
    const now = Date.now();
    const userLimit = this.rateLimiter.get(userId);
    
    if (!userLimit || now > userLimit.resetTime) {
      this.rateLimiter.set(userId, {
        count: 1,
        resetTime: now + 60000 // 1 minute window
      });
      return { allowed: true, remaining: 9 };
    }
    
    if (userLimit.count >= 10) {
      const timeUntilReset = Math.ceil((userLimit.resetTime - now) / 1000);
      return { 
        allowed: false, 
        remaining: 0, 
        resetIn: timeUntilReset 
      };
    }
    
    userLimit.count++;
    return { 
      allowed: true, 
      remaining: 10 - userLimit.count 
    };
  }

  // Enhanced daily watering check with better caching
  async canWaterToday(userId, seedId) {
    const cacheKey = `${userId}_${seedId}`;
    const today = new Date().toDateString();
    
    // Check cache first
    const cached = this.dailyWateringCache.get(cacheKey);
    if (cached && cached.date === today) {
      return !cached.watered;
    }
    
    // Check localStorage for immediate feedback
    const lastKey = `lastWatered_${seedId}`;
    const lastWater = localStorage.getItem(lastKey);
    const canWater = !lastWater || new Date(lastWater).toDateString() !== today;
    
    // Update cache
    this.dailyWateringCache.set(cacheKey, {
      date: today,
      watered: !canWater,
      checkedAt: Date.now()
    });
    
    return canWater;
  }

  // Main watering operation with enhanced error handling
  async waterSeed(userId, seedId, wateredBy, seedData) {
    return new Promise((resolve, reject) => {
      // Add detailed validation
      if (!userId || !seedId || !wateredBy) {
        reject(new Error('Missing required parameters for watering'));
        return;
      }

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

  // Enhanced queue processing with better error handling
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
      this.metrics.pendingOperations = this.concurrentOperations;
      
      const result = await this.executeWateringWithTransaction(operation);
      
      this.metrics.successfulOperations++;
      this.updateMetrics(Date.now() - operation.timestamp);
      
      operation.resolve(result);
      
    } catch (error) {
      console.error('Watering operation failed:', error);
      
      // Enhanced retry logic with exponential backoff
      if (operation.retries < 2 && this.shouldRetry(error)) {
        operation.retries++;
        const backoffDelay = Math.min(1000 * Math.pow(2, operation.retries), 5000);
        
        setTimeout(() => {
          this.operationQueue.unshift(operation);
          this.metrics.queueLength = this.operationQueue.length;
        }, backoffDelay);
        
        console.log(`Retrying watering operation (attempt ${operation.retries + 1}) in ${backoffDelay}ms`);
      } else {
        this.metrics.failedOperations++;
        
        // Provide user-friendly error messages
        const userError = this.getUserFriendlyError(error);
        operation.reject(new Error(userError));
      }
      
    } finally {
      this.concurrentOperations--;
      this.metrics.pendingOperations = this.concurrentOperations;
      this.isProcessing = false;
    }
  }

  // NEW: Use Firestore transactions for atomic updates
  async executeWateringWithTransaction({ userId, seedId, wateredBy, seedData }) {
    const startTime = Date.now();
    
    // Enhanced rate limiting check
    const rateCheck = this.checkRateLimit(userId);
    if (!rateCheck.allowed) {
      throw new Error(`Rate limit exceeded. Please wait ${rateCheck.resetIn} seconds before watering again.`);
    }

    // Enhanced daily watering check
    const canWater = await this.canWaterToday(userId, seedId);
    if (!canWater) {
      throw new Error('You have already watered this seed today. Come back tomorrow! 🌙');
    }

    // Use transaction for atomic updates
    const result = await runTransaction(db, async (transaction) => {
      const seedRef = doc(db, 'flowers', seedId);
      const seedSnap = await transaction.get(seedRef);
      
      if (!seedSnap.exists()) {
        throw new Error('Seed not found or has been removed.');
      }

      const currentSeed = seedSnap.data();
      
      // Enhanced validation checks
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

      // Prepare update data
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
      transaction.update(seedRef, seedUpdate);

      return {
        success: true,
        newWaterCount,
        bloomed: willBloom,
        isOwner,
        wateredBy,
        flowerData,
        bloomedFlower,
        responseTime: Date.now() - startTime,
        seedOwnerId: currentSeed.userId,
        seedType: currentSeed.type
      };
    });

    // Create logs outside transaction to avoid conflicts
    await this.createWateringLogs(result, userId, seedId, wateredBy);

    // Update cache and localStorage
    this.updateCacheAfterWatering(userId, seedId);

    return result;
  }

  // Separate method for creating logs (outside transaction)
  async createWateringLogs(result, userId, seedId, wateredBy) {
    try {
      // Create watering log
      const wateringLog = {
        seedId,
        seedOwnerId: result.seedOwnerId,
        seedType: result.seedType,
        wateredByUserId: userId,
        wateredByUsername: wateredBy,
        waterCount: result.newWaterCount,
        resultedInBloom: result.bloomed,
        timestamp: serverTimestamp(),
        isOwnerWatering: result.isOwner
      };

      await addDoc(collection(db, 'waterings'), wateringLog);

      // Create daily watering record
      const today = new Date().toDateString().replace(/\s/g, '_');
      const dailyRecord = {
        userId,
        seedId,
        seedOwnerId: result.seedOwnerId,
        date: today,
        timestamp: serverTimestamp()
      };

      await addDoc(collection(db, 'dailyWaterings'), dailyRecord);

      // Update user stats (non-critical)
      const userRef = doc(db, 'users', userId);
      const userUpdates = {
        totalWaterings: increment(1),
        lastWateringDate: serverTimestamp()
      };

      if (result.bloomed) {
        userUpdates.totalBlooms = increment(1);
        if (result.isOwner) {
          userUpdates.ownBlooms = increment(1);
        } else {
          userUpdates.helpedBlooms = increment(1);
        }
      }

      await updateDoc(userRef, userUpdates);

    } catch (logError) {
      console.warn('Failed to create logs (non-critical):', logError);
      // Don't throw error as the main watering operation succeeded
    }
  }

  // Update cache after successful watering
  updateCacheAfterWatering(userId, seedId) {
    const cacheKey = `${userId}_${seedId}`;
    this.dailyWateringCache.set(cacheKey, {
      date: new Date().toDateString(),
      watered: true,
      wateredAt: Date.now()
    });

    // Update localStorage for immediate feedback
    localStorage.setItem(`lastWatered_${seedId}`, new Date().toISOString());
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

  // Enhanced error handling with user-friendly messages
  getUserFriendlyError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('permission') || message.includes('denied')) {
      return 'Permission denied. Please try signing out and signing back in.';
    }
    
    if (message.includes('network') || message.includes('timeout')) {
      return 'Network connection issue. Please check your internet and try again.';
    }
    
    if (message.includes('quota') || message.includes('limit')) {
      return 'Service is temporarily busy. Please wait a moment and try again.';
    }
    
    if (message.includes('already watered')) {
      return 'You already watered this seed today. Come back tomorrow! 🌙';
    }
    
    if (message.includes('bloomed')) {
      return 'This seed has already bloomed! 🌸';
    }
    
    if (message.includes('rate limit')) {
      return error.message; // Keep the specific rate limit message
    }
    
    // Default error message
    return 'Something went wrong while watering. Please try again.';
  }

  // Enhanced retry logic
  shouldRetry(error) {
    const message = error.message.toLowerCase();
    const retryableErrors = [
      'timeout',
      'network',
      'unavailable',
      'deadline-exceeded',
      'internal',
      'temporarily'
    ];
    
    // Don't retry permission errors or user errors
    const nonRetryableErrors = [
      'permission',
      'denied',
      'already watered',
      'bloomed',
      'not found',
      'rate limit'
    ];
    
    if (nonRetryableErrors.some(err => message.includes(err))) {
      return false;
    }
    
    return retryableErrors.some(err => message.includes(err));
  }

  // Enhanced metrics calculation
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
      averageResponseTime: `${this.metrics.averageResponseTime.toFixed(0)}ms`,
      cacheSize: this.dailyWateringCache.size,
      queueStatus: this.operationQueue.length > 0 ? 'Processing' : 'Idle'
    };
  }

  // Enhanced cache cleaning
  cleanCache() {
    const now = new Date().toDateString();
    const maxAge = 2 * 60 * 60 * 1000; // 2 hours
    const currentTime = Date.now();
    
    // Clean daily watering cache
    for (const [key, value] of this.dailyWateringCache.entries()) {
      if (value.date !== now || (currentTime - value.checkedAt) > maxAge) {
        this.dailyWateringCache.delete(key);
      }
    }
    
    // Clean rate limiter
    for (const [userId, limit] of this.rateLimiter.entries()) {
      if (currentTime > limit.resetTime) {
        this.rateLimiter.delete(userId);
      }
    }
  }
}

// Create singleton instance
export const wateringManager = new ImprovedWateringManager();

// Enhanced React hook with better error handling
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
      console.error('Watering error:', err);
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
