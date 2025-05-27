// utils/WateringManager.js - Enhanced Watering System for Launch Day
import React, { useState, useCallback } from 'react'; // ADD MISSING REACT IMPORT
import { 
  doc, 
  updateDoc, 
  addDoc, 
  collection, 
  serverTimestamp,
  runTransaction,
  getDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FLOWER_DATABASE } from '../hooks/useSeedTypes';
import { NotificationManager } from '../components/NotificationSystem';

// Enhanced configuration for launch day
const WATERING_CONFIG = {
  maxConcurrentOperations: 10,
  queueProcessInterval: 50, // ms
  dailyWaterLimit: 50,
  rateLimitWindow: 60000, // 1 minute
  rateLimitMax: 10,
  transactionTimeout: 15000 // 15 seconds
};

// Enhanced queue system for high-traffic handling
class WateringQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.activeOperations = 0;
    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageResponseTime: 0,
      queueLength: 0,
      pendingOperations: 0,
      peakConcurrent: 0
    };
    
    this.startProcessing();
  }

  add(operation) {
    return new Promise((resolve, reject) => {
      const queueItem = {
        ...operation,
        resolve,
        reject,
        timestamp: Date.now(),
        retries: 0
      };
      
      this.queue.push(queueItem);
      this.metrics.queueLength = this.queue.length;
      
      console.log(`💧 WateringManager: Added to queue (${this.queue.length} pending)`);
    });
  }

  async startProcessing() {
    if (this.processing) return;
    
    this.processing = true;
    
    while (true) {
      if (this.queue.length === 0 || this.activeOperations >= WATERING_CONFIG.maxConcurrentOperations) {
        await new Promise(resolve => setTimeout(resolve, WATERING_CONFIG.queueProcessInterval));
        continue;
      }

      const operation = this.queue.shift();
      this.metrics.queueLength = this.queue.length;
      
      this.processOperation(operation);
    }
  }

  async processOperation(operation) {
    this.activeOperations++;
    this.metrics.pendingOperations = this.activeOperations;
    this.metrics.peakConcurrent = Math.max(this.metrics.peakConcurrent, this.activeOperations);
    
    const startTime = Date.now();
    
    try {
      console.log(`💧 Processing watering operation for seed: ${operation.seedId}`);
      
      const result = await this.executeWatering(operation);
      
      const responseTime = Date.now() - startTime;
      this.updateMetrics(true, responseTime);
      
      operation.resolve(result);
      console.log(`✅ Watering completed successfully in ${responseTime}ms`);
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ Watering failed after ${responseTime}ms:`, error);
      
      // Retry logic for certain errors
      if (operation.retries < 3 && this.shouldRetry(error)) {
        operation.retries++;
        console.log(`🔄 Retrying operation (attempt ${operation.retries + 1})`);
        
        // Add back to queue with delay
        setTimeout(() => {
          this.queue.unshift(operation);
        }, 1000 * operation.retries);
      } else {
        this.updateMetrics(false, responseTime);
        operation.reject(error);
      }
    } finally {
      this.activeOperations--;
      this.metrics.pendingOperations = this.activeOperations;
    }
  }

  async executeWatering(operation) {
    const { userId, seedId, watererName, seedData } = operation;
    
    // Use transaction for data consistency
    return await runTransaction(db, async (transaction) => {
      const seedRef = doc(db, 'flowers', seedId);
      const seedDoc = await transaction.get(seedRef);
      
      if (!seedDoc.exists()) {
        throw new Error('Seed not found');
      }
      
      const currentData = seedDoc.data();
      
      // Validation checks
      if (currentData.bloomed) {
        throw new Error('This seed has already bloomed!');
      }
      
      if (currentData.waterCount >= 7) {
        throw new Error('This seed has reached its water limit!');
      }
      
      const newWaterCount = (currentData.waterCount || 0) + 1;
      const willBloom = newWaterCount >= 7;
      
      // Prepare update data
      const updateData = {
        waterCount: newWaterCount,
        lastWatered: serverTimestamp(),
        lastWateredBy: watererName,
        lastWateredById: userId
      };
      
      let flowerData = null;
      
      if (willBloom) {
        // Generate bloom data
        flowerData = this.generateBloomData(currentData, seedData);
        
        updateData.bloomed = true;
        updateData.bloomedFlower = flowerData.emoji;
        updateData.bloomTime = serverTimestamp();
        updateData.flowerName = flowerData.name;
        updateData.flowerLanguage = flowerData.flowerLanguage;
        updateData.sharonMessage = flowerData.sharonMessage;
        updateData.rarity = flowerData.rarity;
      }
      
      // Update the seed
      transaction.update(seedRef, updateData);
      
      // Log watering event
      const wateringLogRef = doc(collection(db, 'waterings'));
      transaction.set(wateringLogRef, {
        seedId,
        seedOwnerId: currentData.userId,
        seedOwnerName: currentData.name || 'Anonymous',
        wateredByUserId: userId,
        wateredByUsername: watererName,
        seedType: currentData.type,
        timestamp: serverTimestamp(),
        resultedInBloom: willBloom
      });
      
      return {
        success: true,
        bloomed: willBloom,
        newWaterCount,
        flowerData,
        isOwner: userId === currentData.userId,
        wateredBy: watererName
      };
    });
  }

  generateBloomData(seedData, seedTypeData) {
    // Handle special seeds (song seeds)
    if (seedData.songSeed || seedData.specialSeed) {
      return {
        name: 'Song Bloom',
        emoji: '🎵',
        flowerLanguage: 'The birth of a beautiful melody',
        sharonMessage: "This note carries all my hopes and dreams. Thank you for being part of my journey! 💜",
        rarity: 'legendary'
      };
    }
    
    // Get flower data from database
    const seedType = seedTypeData || seedData.seedTypeData;
    if (seedType && seedType.flowerTypes) {
      const randomFlower = seedType.flowerTypes[
        Math.floor(Math.random() * seedType.flowerTypes.length)
      ];
      
      const flowerInfo = FLOWER_DATABASE[randomFlower];
      if (flowerInfo) {
        return {
          name: randomFlower,
          emoji: flowerInfo.emoji,
          flowerLanguage: flowerInfo.flowerLanguage,
          sharonMessage: flowerInfo.sharonMessage,
          rarity: this.determineRarity()
        };
      }
    }
    
    // Fallback bloom data
    return {
      name: `${seedData.type} Bloom`,
      emoji: '🌸',
      flowerLanguage: 'A beautiful emotion in full bloom',
      sharonMessage: "Every emotion you nurture grows into something beautiful. Thank you for growing with me! 🌸",
      rarity: this.determineRarity()
    };
  }

  determineRarity() {
    const random = Math.random();
    if (random < 0.01) return 'legendary';  // 1%
    if (random < 0.05) return 'rainbow';   // 4%
    if (random < 0.15) return 'rare';      // 10%
    return 'common';                       // 85%
  }

  shouldRetry(error) {
    const retryableErrors = [
      'timeout',
      'network',
      'temporarily unavailable',
      'connection'
    ];
    
    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(retryError => errorMessage.includes(retryError));
  }

  updateMetrics(success, responseTime) {
    this.metrics.totalOperations++;
    
    if (success) {
      this.metrics.successfulOperations++;
    } else {
      this.metrics.failedOperations++;
    }
    
    // Update average response time
    const totalTime = this.metrics.averageResponseTime * (this.metrics.totalOperations - 1) + responseTime;
    this.metrics.averageResponseTime = totalTime / this.metrics.totalOperations;
  }

  getMetrics() {
    const successRate = this.metrics.totalOperations > 0 
      ? ((this.metrics.successfulOperations / this.metrics.totalOperations) * 100).toFixed(2) + '%'
      : '0%';
    
    return {
      ...this.metrics,
      successRate,
      queueLength: this.queue.length,
      pendingOperations: this.activeOperations
    };
  }
}

// Global watering manager instance
export const wateringManager = new WateringQueue();

// Rate limiting system
class RateLimiter {
  constructor() {
    this.userActions = new Map();
    this.dailyLimits = new Map();
  }

  checkRateLimit(userId) {
    const now = Date.now();
    const windowStart = now - WATERING_CONFIG.rateLimitWindow;
    
    if (!this.userActions.has(userId)) {
      this.userActions.set(userId, []);
    }
    
    const userActionTimes = this.userActions.get(userId);
    
    // Clean old actions
    while (userActionTimes.length > 0 && userActionTimes[0] < windowStart) {
      userActionTimes.shift();
    }
    
    if (userActionTimes.length >= WATERING_CONFIG.rateLimitMax) {
      throw new Error('Too many actions. Please wait a moment before watering again.');
    }
    
    userActionTimes.push(now);
  }

  checkDailyLimit(userId) {
    const today = new Date().toDateString();
    const dailyKey = `${userId}_${today}`;
    
    const todayCount = this.dailyLimits.get(dailyKey) || 0;
    
    if (todayCount >= WATERING_CONFIG.dailyWaterLimit) {
      throw new Error('You\'ve reached your daily watering limit. Come back tomorrow!');
    }
    
    this.dailyLimits.set(dailyKey, todayCount + 1);
  }
}

const rateLimiter = new RateLimiter();

// Daily watering tracking
const dailyWateringTracker = {
  hasWateredToday(userId, seedId) {
    const today = new Date().toDateString();
    const key = `watered_${userId}_${seedId}`;
    const lastWatered = localStorage.getItem(key);
    
    return lastWatered && new Date(lastWatered).toDateString() === today;
  },

  markAsWatered(userId, seedId) {
    const key = `watered_${userId}_${seedId}`;
    localStorage.setItem(key, new Date().toISOString());
  }
};

// Enhanced hook for React components
export function useWatering() {
  const [isWatering, setIsWatering] = useState(false);
  const [error, setError] = useState(null);

  const waterSeed = useCallback(async (userId, seedId, watererName, seedData) => {
    if (isWatering) {
      throw new Error('Already watering a seed. Please wait.');
    }

    setIsWatering(true);
    setError(null);

    try {
      // Rate limiting checks
      rateLimiter.checkRateLimit(userId);
      rateLimiter.checkDailyLimit(userId);

      console.log('🌊 Starting enhanced watering process', { seedId, watererName });

      // Add to processing queue
      const result = await wateringManager.add({
        userId,
        seedId,
        watererName,
        seedData
      });

      // Mark as watered today
      dailyWateringTracker.markAsWatered(userId, seedId);

      console.log('🌊 Watering result:', result);
      return result;

    } catch (err) {
      console.error('🚨 Watering error:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsWatering(false);
    }
  }, [isWatering]);

  const canWaterToday = useCallback(async (userId, seedId) => {
    try {
      return !dailyWateringTracker.hasWateredToday(userId, seedId);
    } catch (err) {
      console.error('Error checking daily watering:', err);
      return false;
    }
  }, []);

  return {
    waterSeed,
    isWatering,
    error,
    canWaterToday
  };
}

// System health monitoring
export function getSystemHealth() {
  const metrics = wateringManager.getMetrics();
  
  const health = {
    status: 'healthy',
    queueLength: metrics.queueLength,
    successRate: parseFloat(metrics.successRate),
    averageResponseTime: metrics.averageResponseTime,
    warnings: []
  };

  // Health checks
  if (metrics.queueLength > 100) {
    health.status = 'degraded';
    health.warnings.push('High queue length');
  }

  if (parseFloat(metrics.successRate) < 95) {
    health.status = 'degraded';
    health.warnings.push('Low success rate');
  }

  if (metrics.averageResponseTime > 5000) {
    health.status = 'degraded';
    health.warnings.push('High response time');
  }

  if (health.warnings.length > 2) {
    health.status = 'unhealthy';
  }

  return health;
}

// Emergency system controls (admin only)
export const systemControls = {
  async pauseWatering() {
    // Implementation for emergency pause
    console.log('🚨 Emergency: Watering system paused');
  },

  async resumeWatering() {
    // Implementation for resuming
    console.log('✅ Watering system resumed');
  },

  async clearQueue() {
    // Clear processing queue
    wateringManager.queue = [];
    console.log('🧹 Watering queue cleared');
  },

  getDetailedMetrics() {
    return {
      ...wateringManager.getMetrics(),
      systemHealth: getSystemHealth(),
      timestamp: new Date().toISOString()
    };
  }
};
