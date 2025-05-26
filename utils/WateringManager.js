// utils/WateringManager.js - Enhanced with Daily Tracking Integration
import { useState } from 'react';
import { doc, runTransaction, serverTimestamp, addDoc, collection, increment, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { NotificationManager } from '../components/NotificationSystem';

class WateringManager {
  constructor() {
    this.pendingOperations = new Map();
    this.userRateLimiter = new Map();
    this.operationQueue = [];
    this.isProcessingQueue = false;
    
    // Daily tracking cache
    this.dailyCache = new Map();
    this.cacheExpiry = new Map();
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    
    this.config = {
      RATE_LIMIT_WINDOW: 60000,
      RATE_LIMIT_MAX_ACTIONS: 10,
      MAX_DAILY_WATERS: 50,
      MAX_CONCURRENT_OPERATIONS: 5,
      RETRY_ATTEMPTS: 3,
      RETRY_DELAY: 1000,
      QUEUE_PROCESS_INTERVAL: 100,
      TRANSACTION_TIMEOUT: 10000
    };

    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      queuedOperations: 0,
      averageResponseTime: 0,
      peakConcurrent: 0
    };

    this.startQueueProcessor();
  }

  // Helper function to get today's date string
  getTodayString() {
    return new Date().toISOString().split('T')[0];
  }

  // Enhanced daily watering check with Firestore
  async canWaterToday(userId, seedId) {
    if (!userId || !seedId) return false;

    const today = this.getTodayString();
    const cacheKey = `${userId}-${seedId}-${today}`;
    
    // Check cache first
    if (this.dailyCache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey);
      if (Date.now() < expiry) {
        return !this.dailyCache.get(cacheKey);
      }
    }

    try {
      const wateringId = `${userId}_${seedId}_${today}`;
      const wateringRef = doc(db, 'dailyWaterings', wateringId);
      const wateringSnap = await getDoc(wateringRef);
      
      const hasWatered = wateringSnap.exists();
      
      // Cache the result
      this.dailyCache.set(cacheKey, hasWatered);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);
      
      return !hasWatered;
    } catch (error) {
      console.error('Error checking daily watering:', error);
      return true; // Default to allowing watering
    }
  }

  // Record daily watering
  async recordDailyWatering(userId, seedId, userName, seedOwnerId) {
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
      this.dailyCache.set(cacheKey, true);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);
      
      return true;
    } catch (error) {
      console.error('Failed to record daily watering:', error);
      throw error;
    }
  }

  // Enhanced main watering method
  async waterSeed(userId, seedId, userName = 'Anonymous', seedData = {}) {
    // FIRST: Check daily watering limit
    const canWater = await this.canWaterToday(userId, seedId);
    if (!canWater) {
      throw new Error('💧 You already watered this seed today! Come back tomorrow 🌙');
    }

    // Rate limiting check
    if (!this.checkRateLimit(userId)) {
      throw new Error('⏳ Too many actions! Please wait a moment.');
    }

    // Check daily limit
    if (!this.checkDailyLimit(userId)) {
      throw new Error('🚫 Daily watering limit reached. Come back tomorrow!');
    }

    // Add to queue
    return new Promise((resolve, reject) => {
      const operation = {
        userId,
        seedId,
        userName,
        seedData,
        resolve,
        reject,
        timestamp: Date.now(),
        retries: 0
      };

      this.operationQueue.push(operation);
      this.metrics.queuedOperations++;
      
      console.log(`📥 Queued watering operation for ${seedId}. Queue size: ${this.operationQueue.length}`);
    });
  }

  // Enhanced transaction execution with daily tracking
  async executeWateringTransaction(operation) {
    const { userId, seedId, userName, seedData } = operation;

    return await runTransaction(db, async (transaction) => {
      const seedRef = doc(db, 'flowers', seedId);
      const seedDoc = await transaction.get(seedRef);
      
      if (!seedDoc.exists()) {
        throw new Error('🌱 Seed not found');
      }

      const currentSeedData = seedDoc.data();
      
      // Validate seed state
      if (currentSeedData.bloomed) {
        throw new Error('🌸 This seed has already bloomed');
      }

      if (currentSeedData.waterCount >= 7) {
        throw new Error('💧 This seed has reached its water limit!');
      }

      // DOUBLE-CHECK: Ensure no watering happened since queue started
      const canStillWater = await this.canWaterToday(userId, seedId);
      if (!canStillWater) {
        throw new Error('💧 This seed was already watered while in queue!');
      }

      const isOwner = currentSeedData.userId === userId;
      const isFriendWatering = !isOwner;

      const newWaterCount = (currentSeedData.waterCount || 0) + 1;
      const nowBloomed = newWaterCount >= 7;
      
      // Get flower data with proper undefined checking
      let flowerData = {};
      if (nowBloomed && seedData.seedTypeData && seedData.seedTypeData.flowerTypes) {
        try {
          const { FLOWER_DATABASE } = await import('../hooks/useSeedTypes');
          const possibleFlowers = seedData.seedTypeData.flowerTypes || [];
          
          if (possibleFlowers.length > 0) {
            const randomFlower = possibleFlowers[Math.floor(Math.random() * possibleFlowers.length)];
            const rawFlowerData = FLOWER_DATABASE[randomFlower];
            
            if (rawFlowerData) {
              if (rawFlowerData.emoji) flowerData.emoji = rawFlowerData.emoji;
              if (rawFlowerData.name) flowerData.name = rawFlowerData.name;
              if (rawFlowerData.flowerLanguage) flowerData.flowerLanguage = rawFlowerData.flowerLanguage;
              if (rawFlowerData.sharonMessage) flowerData.sharonMessage = rawFlowerData.sharonMessage;
              if (rawFlowerData.rarity) flowerData.rarity = rawFlowerData.rarity;
              if (rawFlowerData.seedType) flowerData.seedType = rawFlowerData.seedType;
            }
          }
        } catch (flowerError) {
          console.warn('Error loading flower data:', flowerError);
        }
      }

      // Prepare update - ONLY include fields that are NOT undefined
      const updateData = {
        waterCount: newWaterCount,
        lastWatered: serverTimestamp(),
        lastWateredBy: userName,
        lastWateredById: userId
      };

      if (nowBloomed) {
        updateData.bloomed = true;
        updateData.bloomTime = serverTimestamp();
        
        if (flowerData.emoji) {
          updateData.bloomedFlower = flowerData.emoji;
        } else {
          updateData.bloomedFlower = currentSeedData.bloomedFlower || '🌸';
        }
        
        if (flowerData.name) {
          updateData.flowerName = flowerData.name;
        } else {
          updateData.flowerName = currentSeedData.type || 'Beautiful Flower';
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
        
        if (isFriendWatering) {
          updateData.friendHelped = true;
          updateData.bloomHelper = userName;
        }
      }

      // Clean the update object
      const cleanedUpdateData = this.cleanUpdateObject(updateData);
      
      // Update seed
      transaction.update(seedRef, cleanedUpdateData);

      // Log watering event
      const wateringLogRef = doc(collection(db, 'waterings'));
      const wateringLogData = this.cleanUpdateObject({
        seedId,
        seedOwnerId: currentSeedData.userId,
        seedOwnerName: currentSeedData.name || 'Anonymous',
        seedType: currentSeedData.type,
        wateredByUserId: userId,
        wateredByUsername: userName,
        timestamp: serverTimestamp(),
        waterCount: newWaterCount,
        isOwnerWatering: isOwner,
        resultedInBloom: nowBloomed
      });
      
      transaction.set(wateringLogRef, wateringLogData);

      // Record daily watering in transaction
      const today = this.getTodayString();
      const dailyWateringId = `${userId}_${seedId}_${today}`;
      const dailyWateringRef = doc(db, 'dailyWaterings', dailyWateringId);
      const dailyWateringData = this.cleanUpdateObject({
        userId,
        seedId,
        seedOwnerId: currentSeedData.userId,
        userName,
        date: today,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      });
      
      transaction.set(dailyWateringRef, dailyWateringData);

      // Update user stats
      if (isOwner) {
        const userRef = doc(db, 'users', userId);
        const userUpdateData = this.cleanUpdateObject({
          lastWateringDate: serverTimestamp(),
          totalWaterings: increment(1),
          totalBlooms: nowBloomed ? increment(1) : increment(0)
        });
        transaction.update(userRef, userUpdateData);
      } else {
        const helperRef = doc(db, 'users', userId);
        const helperUpdateData = this.cleanUpdateObject({
          helpedWaterCount: increment(1),
          lastHelpedDate: serverTimestamp(),
          friendsBloomed: nowBloomed ? increment(1) : increment(0)
        });
        transaction.update(helperRef, helperUpdateData);
      }

      // Update daily cache
      const cacheKey = `${userId}-${seedId}-${today}`;
      this.dailyCache.set(cacheKey, true);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);

      return {
        success: true,
        newWaterCount,
        bloomed: nowBloomed,
        flowerData: nowBloomed ? flowerData : null,
        isOwner,
        wateredBy: userName
      };
    });
  }

  // Helper function to clean update objects
  cleanUpdateObject(updateObj) {
    const cleaned = {};
    Object.keys(updateObj).forEach(key => {
      if (updateObj[key] !== undefined && updateObj[key] !== null) {
        cleaned[key] = updateObj[key];
      }
    });
    return cleaned;
  }

  // Rest of the existing methods...
  startQueueProcessor() {
    setInterval(() => {
      if (!this.isProcessingQueue && this.operationQueue.length > 0) {
        this.processQueue();
      }
    }, this.config.QUEUE_PROCESS_INTERVAL);
  }

  async processQueue() {
    if (this.operationQueue.length === 0) return;
    
    this.isProcessingQueue = true;
    const concurrentOps = [];
    
    while (concurrentOps.length < this.config.MAX_CONCURRENT_OPERATIONS && this.operationQueue.length > 0) {
      const operation = this.operationQueue.shift();
      concurrentOps.push(this.processOperation(operation));
    }

    if (concurrentOps.length > this.metrics.peakConcurrent) {
      this.metrics.peakConcurrent = concurrentOps.length;
    }

    await Promise.allSettled(concurrentOps);
    this.isProcessingQueue = false;
  }

  async processOperation(operation) {
    const startTime = Date.now();
    
    try {
      const operationKey = `${operation.seedId}-${operation.userId}`;
      if (this.pendingOperations.has(operationKey)) {
        operation.reject(new Error('Operation already in progress'));
        return;
      }

      const pendingPromise = this.executeWateringTransaction(operation);
      this.pendingOperations.set(operationKey, pendingPromise);

      const result = await Promise.race([
        pendingPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Transaction timeout')), this.config.TRANSACTION_TIMEOUT)
        )
      ]);

      this.metrics.totalOperations++;
      this.metrics.successfulOperations++;
      this.updateAverageResponseTime(Date.now() - startTime);
      this.incrementRateLimit(operation.userId);

      operation.resolve(result);
      
    } catch (error) {
      console.error(`❌ Operation failed for ${operation.seedId}:`, error);
      
      if (operation.retries < this.config.RETRY_ATTEMPTS && !error.message.includes('already watered')) {
        operation.retries++;
        console.log(`🔄 Retrying operation (attempt ${operation.retries}/${this.config.RETRY_ATTEMPTS})`);
        
        setTimeout(() => {
          this.operationQueue.push(operation);
        }, this.config.RETRY_DELAY * Math.pow(2, operation.retries - 1));
      } else {
        this.metrics.failedOperations++;
        operation.reject(error);
      }
    } finally {
      const operationKey = `${operation.seedId}-${operation.userId}`;
      this.pendingOperations.delete(operationKey);
    }
  }

  checkRateLimit(userId) {
    const now = Date.now();
    const userLimit = this.userRateLimiter.get(userId);
    
    if (!userLimit || now > userLimit.resetTime) {
      this.userRateLimiter.set(userId, {
        count: 0,
        resetTime: now + this.config.RATE_LIMIT_WINDOW
      });
      return true;
    }
    
    return userLimit.count < this.config.RATE_LIMIT_MAX_ACTIONS;
  }

  incrementRateLimit(userId) {
    const userLimit = this.userRateLimiter.get(userId);
    if (userLimit) {
      userLimit.count++;
    }
  }

  checkDailyLimit(userId) {
    if (typeof window === 'undefined') return true;
    
    const today = new Date().toDateString();
    const dailyKey = `daily_${userId}_${today}`;
    const count = parseInt(localStorage.getItem(dailyKey) || '0');
    
    if (count >= this.config.MAX_DAILY_WATERS) {
      return false;
    }
    
    localStorage.setItem(dailyKey, (count + 1).toString());
    return true;
  }

  updateAverageResponseTime(responseTime) {
    const total = this.metrics.successfulOperations;
    if (total === 0) {
      this.metrics.averageResponseTime = responseTime;
    } else {
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime * (total - 1) + responseTime) / total;
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      queueLength: this.operationQueue.length,
      pendingOperations: this.pendingOperations.size,
      successRate: this.metrics.totalOperations > 0 
        ? (this.metrics.successfulOperations / this.metrics.totalOperations * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  clearQueue() {
    const queueSize = this.operationQueue.length;
    this.operationQueue.forEach(op => {
      op.reject(new Error('Queue cleared by administrator'));
    });
    this.operationQueue = [];
    console.log(`🧹 Cleared ${queueSize} operations from queue`);
  }

  pauseProcessing() {
    this.isProcessingQueue = true;
    console.log('⏸️ Queue processing paused');
  }

  resumeProcessing() {
    this.isProcessingQueue = false;
    console.log('▶️ Queue processing resumed');
  }

  // Clean up cache
  cleanupCache() {
    const now = Date.now();
    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (now >= expiry) {
        this.dailyCache.delete(key);
        this.cacheExpiry.delete(key);
      }
    }
  }
}

// Singleton instance
export const wateringManager = new WateringManager();

// Clean up cache every 10 minutes
setInterval(() => {
  wateringManager.cleanupCache();
}, 10 * 60 * 1000);

// React hook for components
export function useWatering() {
  const [isWatering, setIsWatering] = useState(false);
  const [error, setError] = useState(null);

  const waterSeed = async (userId, seedId, userName, seedData) => {
    setIsWatering(true);
    setError(null);

    try {
      const result = await wateringManager.waterSeed(userId, seedId, userName, seedData);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsWatering(false);
    }
  };

  const canWaterToday = async (userId, seedId) => {
    return await wateringManager.canWaterToday(userId, seedId);
  };

  const getMetrics = () => wateringManager.getMetrics();

  return {
    isWatering,
    error,
    waterSeed,
    canWaterToday,
    getMetrics
  };
}

export default wateringManager;
