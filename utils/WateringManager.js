// utils/WateringManager.js - Enhanced with Rate Limiting & Queue System + Undefined Field Prevention
import { useState } from 'react';
import { doc, runTransaction, serverTimestamp, addDoc, collection, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { NotificationManager } from '../components/NotificationSystem';

class WateringManager {
  constructor() {
    this.pendingOperations = new Map(); // seedId -> Promise
    this.userRateLimiter = new Map(); // userId -> { count, resetTime }
    this.operationQueue = [];
    this.isProcessingQueue = false;
    
    // Configuration
    this.config = {
      RATE_LIMIT_WINDOW: 60000, // 1 minute
      RATE_LIMIT_MAX_ACTIONS: 10, // 10 actions per minute
      MAX_DAILY_WATERS: 50,
      MAX_CONCURRENT_OPERATIONS: 5,
      RETRY_ATTEMPTS: 3,
      RETRY_DELAY: 1000,
      QUEUE_PROCESS_INTERVAL: 100,
      TRANSACTION_TIMEOUT: 10000
    };

    // Performance monitoring
    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      queuedOperations: 0,
      averageResponseTime: 0,
      peakConcurrent: 0
    };

    // Start queue processor
    this.startQueueProcessor();
  }

  // Helper function to clean update objects - prevents undefined field errors
  cleanUpdateObject(updateObj) {
    const cleaned = {};
    Object.keys(updateObj).forEach(key => {
      if (updateObj[key] !== undefined && updateObj[key] !== null) {
        cleaned[key] = updateObj[key];
      }
    });
    return cleaned;
  }

  // Main watering method with queue system
  async waterSeed(userId, seedId, userName = 'Anonymous', seedData = {}) {
    // Rate limiting check
    if (!this.checkRateLimit(userId)) {
      throw new Error('⏳ Too many actions! Please wait a moment.');
    }

    // Check daily limit
    if (!this.checkDailyLimit(userId)) {
      throw new Error('🚫 Daily watering limit reached. Come back tomorrow!');
    }

    // Add to queue instead of processing immediately
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

  // Process operations from queue
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
    
    // Process up to MAX_CONCURRENT_OPERATIONS at once
    while (concurrentOps.length < this.config.MAX_CONCURRENT_OPERATIONS && this.operationQueue.length > 0) {
      const operation = this.operationQueue.shift();
      concurrentOps.push(this.processOperation(operation));
    }

    // Update peak concurrent metric
    if (concurrentOps.length > this.metrics.peakConcurrent) {
      this.metrics.peakConcurrent = concurrentOps.length;
    }

    // Wait for all concurrent operations to complete
    await Promise.allSettled(concurrentOps);
    
    this.isProcessingQueue = false;
  }

  async processOperation(operation) {
    const startTime = Date.now();
    
    try {
      // Check if operation is already in progress
      const operationKey = `${operation.seedId}-${operation.userId}`;
      if (this.pendingOperations.has(operationKey)) {
        operation.reject(new Error('Operation already in progress'));
        return;
      }

      // Mark as pending
      const pendingPromise = this.executeWateringTransaction(operation);
      this.pendingOperations.set(operationKey, pendingPromise);

      // Execute with timeout
      const result = await Promise.race([
        pendingPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Transaction timeout')), this.config.TRANSACTION_TIMEOUT)
        )
      ]);

      // Update metrics
      this.metrics.totalOperations++;
      this.metrics.successfulOperations++;
      this.updateAverageResponseTime(Date.now() - startTime);

      // Update rate limiter
      this.incrementRateLimit(operation.userId);

      operation.resolve(result);
      
    } catch (error) {
      console.error(`❌ Operation failed for ${operation.seedId}:`, error);
      
      // Retry logic
      if (operation.retries < this.config.RETRY_ATTEMPTS && !error.message.includes('already watered')) {
        operation.retries++;
        console.log(`🔄 Retrying operation (attempt ${operation.retries}/${this.config.RETRY_ATTEMPTS})`);
        
        // Add back to queue with exponential backoff
        setTimeout(() => {
          this.operationQueue.push(operation);
        }, this.config.RETRY_DELAY * Math.pow(2, operation.retries - 1));
      } else {
        this.metrics.failedOperations++;
        operation.reject(error);
      }
    } finally {
      // Clean up
      const operationKey = `${operation.seedId}-${operation.userId}`;
      this.pendingOperations.delete(operationKey);
    }
  }

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
        throw new Error('💧 This seed has reached its water limit and cannot be watered anymore!');
      }

      // Check ownership and permissions
      const isOwner = currentSeedData.userId === userId;
      const isFriendWatering = !isOwner;
      
      // Validate friend watering
      if (isFriendWatering) {
        const today = new Date().toDateString();
        const wateringKey = `friend_${userId}_${seedId}_${today}`;
        
        // Check if already watered today (in transaction)
        const wateringRef = doc(db, 'dailyWaterings', wateringKey);
        const wateringDoc = await transaction.get(wateringRef);
        
        if (wateringDoc.exists()) {
          throw new Error('💧 You already watered this seed today! Come back tomorrow 🌙');
        }
        
        // Mark as watered for today
        transaction.set(wateringRef, {
          userId,
          seedId,
          wateredAt: serverTimestamp(),
          date: today
        });
      }

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
              // Only include defined fields to prevent undefined errors
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
          // Continue with empty flowerData object
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
        
        // Safe flower emoji assignment
        if (flowerData.emoji) {
          updateData.bloomedFlower = flowerData.emoji;
        } else {
          updateData.bloomedFlower = currentSeedData.bloomedFlower || '🌸';
        }
        
        // Safe flower name assignment
        if (flowerData.name) {
          updateData.flowerName = flowerData.name;
        } else {
          updateData.flowerName = currentSeedData.type || 'Beautiful Flower';
        }
        
        // Only set these fields if they have actual values
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

      // Clean the update object to remove any undefined values
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

  // Rate limiting
  checkRateLimit(userId) {
    const now = Date.now();
    const userLimit = this.userRateLimiter.get(userId);
    
    if (!userLimit || now > userLimit.resetTime) {
      // Reset rate limit
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

  // Daily limit check
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

  // Metrics
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

  // Health check
  async healthCheck() {
    const checks = {
      queueHealth: this.operationQueue.length < 100 ? 'healthy' : 'overloaded',
      pendingOperations: this.pendingOperations.size,
      metrics: this.getMetrics(),
      timestamp: new Date().toISOString()
    };
    
    console.log('🏥 WateringManager Health Check:', checks);
    return checks;
  }

  // Emergency controls
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
}

// Singleton instance
export const wateringManager = new WateringManager();

// React hook for components
export function useWatering() {
  const [isWatering, setIsWatering] = useState(false);
  const [error, setError] = useState(null);

  const waterSeed = async (userId, seedId, userName, seedData) => {
    setIsWatering(true);
    setError(null);

    try {
      const result = await wateringManager.waterSeed(userId, seedId, userName, seedData);
      
      // Update localStorage for UI
      const lastWaterKey = `lastWatered_${seedId}`;
      localStorage.setItem(lastWaterKey, new Date().toISOString());
      
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsWatering(false);
    }
  };

  const getMetrics = () => wateringManager.getMetrics();
  const healthCheck = () => wateringManager.healthCheck();

  return {
    isWatering,
    error,
    waterSeed,
    getMetrics,
    healthCheck
  };
}

// Export for monitoring
export default wateringManager;
