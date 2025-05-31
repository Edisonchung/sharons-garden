// utils/WateringManager.js - Simplified and more reliable version
import { useState, useCallback } from 'react';
import { 
  doc, 
  updateDoc, 
  addDoc, 
  collection, 
  serverTimestamp, 
  getDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { FLOWER_DATABASE } from '../hooks/useSeedTypes';

class SimplifiedWateringManager {
  constructor() {
    this.operationQueue = [];
    this.isProcessing = false;
    this.dailyWateringCache = new Map();
    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      queueLength: 0,
      pendingOperations: 0,
      averageResponseTime: 0
    };
    
    // Process queue every 500ms for stability
    setInterval(() => this.processQueue(), 500);
  }

  // Simple daily watering check
  async canWaterToday(userId, seedId) {
    const today = new Date().toDateString();
    const lastKey = `lastWatered_${seedId}`;
    const lastWater = localStorage.getItem(lastKey);
    return !lastWater || new Date(lastWater).toDateString() !== today;
  }

  // Main watering operation
  async waterSeed(userId, seedId, wateredBy, seedData) {
    return new Promise((resolve, reject) => {
      this.operationQueue.push({
        userId,
        seedId,
        wateredBy,
        seedData,
        resolve,
        reject,
        timestamp: Date.now()
      });
      
      this.metrics.queueLength = this.operationQueue.length;
    });
  }

  // Simple queue processing
  async processQueue() {
    if (this.isProcessing || this.operationQueue.length === 0) return;
    
    this.isProcessing = true;
    const operation = this.operationQueue.shift();
    this.metrics.queueLength = this.operationQueue.length;
    
    if (!operation) {
      this.isProcessing = false;
      return;
    }
    
    try {
      this.metrics.pendingOperations++;
      const result = await this.executeWatering(operation);
      
      this.metrics.successfulOperations++;
      this.updateMetrics(Date.now() - operation.timestamp);
      
      operation.resolve(result);
      
    } catch (error) {
      console.error('Watering operation failed:', error);
      this.metrics.failedOperations++;
      
      const userError = this.getUserFriendlyError(error);
      operation.reject(new Error(userError));
      
    } finally {
      this.metrics.pendingOperations--;
      this.isProcessing = false;
    }
  }

  // Simplified watering execution
  async executeWatering({ userId, seedId, wateredBy, seedData }) {
    const startTime = Date.now();
    
    // Check daily watering limit
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

    // Simple update object
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

    // Update the seed document
    await updateDoc(seedRef, seedUpdate);

    // Create logs (non-blocking)
    this.createLogsAsync({
      seedId,
      seedOwnerId: currentSeed.userId,
      seedType: currentSeed.type,
      wateredByUserId: userId,
      wateredByUsername: wateredBy,
      waterCount: newWaterCount,
      resultedInBloom: willBloom,
      isOwnerWatering: isOwner
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
      responseTime: Date.now() - startTime,
      seedOwnerId: currentSeed.userId,
      seedType: currentSeed.type
    };
  }

  // Async log creation (don't block main operation)
  async createLogsAsync(logData) {
    try {
      // Create watering log
      await addDoc(collection(db, 'waterings'), {
        ...logData,
        timestamp: serverTimestamp()
      });

      // Create daily watering record
      const today = new Date().toDateString().replace(/\s/g, '_');
      await addDoc(collection(db, 'dailyWaterings'), {
        userId: logData.wateredByUserId,
        seedId: logData.seedId,
        seedOwnerId: logData.seedOwnerId,
        date: today,
        timestamp: serverTimestamp()
      });

    } catch (logError) {
      console.warn('Failed to create logs (non-critical):', logError);
    }
  }

  // Generate flower data
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

    // Get appropriate flower types
    const flowerTypes = seedType?.flowerTypes || ['Rose', 'Daisy', 'Tulip'];
    const randomFlowerType = flowerTypes[Math.floor(Math.random() * flowerTypes.length)];
    
    // Get flower data from database
    const flowerInfo = FLOWER_DATABASE[randomFlowerType] || {
      emoji: '🌸',
      flowerLanguage: 'Beautiful growth from patience',
      sharonMessage: "Every flower is unique, just like every emotion you've shared. Thank you for growing with me. 🌸"
    };

    // Determine rarity
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

  // User-friendly error messages
  getUserFriendlyError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('permission') || message.includes('denied')) {
      return 'Permission denied. Please try signing out and signing back in.';
    }
    
    if (message.includes('network') || message.includes('timeout')) {
      return 'Network connection issue. Please check your internet and try again.';
    }
    
    if (message.includes('already watered')) {
      return 'You already watered this seed today. Come back tomorrow! 🌙';
    }
    
    if (message.includes('bloomed')) {
      return 'This seed has already bloomed! 🌸';
    }
    
    return 'Something went wrong while watering. Please try again.';
  }

  // Update metrics
  updateMetrics(responseTime) {
    this.metrics.totalOperations++;
    const oldAvg = this.metrics.averageResponseTime;
    this.metrics.averageResponseTime = 
      (oldAvg * (this.metrics.totalOperations - 1) + responseTime) / this.metrics.totalOperations;
  }

  // Get metrics
  getMetrics() {
    const successRate = this.metrics.totalOperations > 0 
      ? ((this.metrics.successfulOperations / this.metrics.totalOperations) * 100).toFixed(1)
      : '0.0';

    return {
      ...this.metrics,
      successRate: `${successRate}%`,
      averageResponseTime: `${this.metrics.averageResponseTime.toFixed(0)}ms`
    };
  }
}

// Create singleton instance
export const wateringManager = new SimplifiedWateringManager();

// React hook
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
