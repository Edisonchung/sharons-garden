// utils/WateringManager.js - Enhanced Version for Public Profile System
import { useState, useCallback } from 'react';
import { 
  doc, 
  updateDoc, 
  addDoc, 
  collection, 
  serverTimestamp, 
  getDoc,
  increment,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { NotificationManager } from '../components/NotificationSystem';
import { FLOWER_DATABASE } from '../hooks/useSeedTypes';

// Enhanced WateringManager class with better performance and error handling
export class WateringManager {
  constructor() {
    this.operationQueue = [];
    this.isProcessing = false;
    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageResponseTime: 0,
      queueLength: 0,
      pendingOperations: 0,
      lastError: null,
      peakConcurrent: 0
    };
    this.rateLimits = new Map(); // userId -> { count, resetTime }
    this.dailyLimits = new Map(); // userId -> { count, date }
    this.processQueue = this.processQueue.bind(this);
    
    // Start queue processor
    this.startQueueProcessor();
  }

  // Enhanced rate limiting with daily limits
  checkRateLimit(userId) {
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    const maxActionsPerWindow = 15; // Increased from 10
    const maxDailyActions = 100; // Daily limit

    // Check per-minute rate limit
    const userLimit = this.rateLimits.get(userId);
    if (userLimit) {
      if (now < userLimit.resetTime) {
        if (userLimit.count >= maxActionsPerWindow) {
          throw new Error('Rate limit exceeded. Please wait before watering again.');
        }
        userLimit.count++;
      } else {
        this.rateLimits.set(userId, { count: 1, resetTime: now + windowMs });
      }
    } else {
      this.rateLimits.set(userId, { count: 1, resetTime: now + windowMs });
    }

    // Check daily limit
    const today = new Date().toDateString();
    const dailyLimit = this.dailyLimits.get(userId);
    if (dailyLimit) {
      if (dailyLimit.date === today) {
        if (dailyLimit.count >= maxDailyActions) {
          throw new Error('Daily watering limit reached. Come back tomorrow!');
        }
        dailyLimit.count++;
      } else {
        this.dailyLimits.set(userId, { count: 1, date: today });
      }
    } else {
      this.dailyLimits.set(userId, { count: 1, date: today });
    }
  }

  // Enhanced daily watering check
  async checkDailyWatering(userId, seedId) {
    // Check localStorage first (fast)
    const today = new Date().toDateString();
    const localKey = `lastWatered_${userId}_${seedId}`;
    const lastWatered = localStorage.getItem(localKey);
    
    if (lastWatered && new Date(lastWatered).toDateString() === today) {
      return false; // Already watered today
    }

    // TODO: Could also check Firestore for more accurate tracking
    // For now, rely on localStorage for better performance
    return true;
  }

  // Enhanced flower generation with better randomization
  generateBloomData(seedData) {
    const seedType = seedData.seedTypeData || {};
    const flowerTypes = seedType.flowerTypes || ['Unknown Flower'];
    
    // Smart flower selection based on seed type and rarity
    let selectedFlower;
    if (seedData.songSeed) {
      selectedFlower = 'Song Bloom';
    } else {
      // Weighted random selection
      const weights = flowerTypes.map((_, index) => {
        // First flower type is most common, last is rarest
        return flowerTypes.length - index;
      });
      
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      const random = Math.random() * totalWeight;
      
      let weightSum = 0;
      for (let i = 0; i < flowerTypes.length; i++) {
        weightSum += weights[i];
        if (random <= weightSum) {
          selectedFlower = flowerTypes[i];
          break;
        }
      }
    }

    // Get flower data from database
    const flowerData = FLOWER_DATABASE[selectedFlower] || {
      emoji: seedData.songSeed ? '🎵' : '🌸',
      flowerLanguage: 'A beautiful bloom',
      sharonMessage: 'Thank you for nurturing this flower with such care. 💜',
      rarity: 'common'
    };

    // Determine rarity with enhanced logic
    let rarity = 'common';
    const rarityRoll = Math.random();
    
    if (seedData.songSeed) {
      rarity = 'legendary';
    } else if (seedData.seedTypeData?.id === 'mystery' && rarityRoll < 0.3) {
      rarity = 'rare';
    } else if (rarityRoll < 0.1) {
      rarity = 'rare';
    } else if (rarityRoll < 0.02) {
      rarity = 'rainbow';
    }

    return {
      name: selectedFlower,
      emoji: flowerData.emoji,
      flowerLanguage: flowerData.flowerLanguage,
      sharonMessage: flowerData.sharonMessage,
      rarity,
      bloomTime: new Date()
    };
  }

  // Enhanced water operation with better error handling
  async waterSeed(userId, seedId, wateredBy, seedData) {
    const startTime = Date.now();
    this.metrics.pendingOperations++;
    this.metrics.peakConcurrent = Math.max(this.metrics.peakConcurrent, this.metrics.pendingOperations);

    try {
      // Rate limiting
      this.checkRateLimit(userId);

      // Daily watering check
      const canWater = await this.checkDailyWatering(userId, seedId);
      if (!canWater) {
        throw new Error('You already watered this seed today! Come back tomorrow 🌙');
      }

      // Get current seed data
      const seedRef = doc(db, 'flowers', seedId);
      const seedSnap = await getDoc(seedRef);
      
      if (!seedSnap.exists()) {
        throw new Error('Seed not found');
      }

      const currentSeed = seedSnap.data();
      
      // Validation
      if (currentSeed.bloomed) {
        throw new Error('This seed has already bloomed!');
      }
      
      if (currentSeed.waterCount >= 7) {
        throw new Error('This seed has reached its water limit!');
      }

      // Calculate new state
      const newWaterCount = (currentSeed.waterCount || 0) + 1;
      const willBloom = newWaterCount >= 7;
      const isOwner = userId === currentSeed.userId;

      // Prepare batch operation for better consistency
      const batch = writeBatch(db);
      
      // Update seed
      const seedUpdateData = {
        waterCount: newWaterCount,
        lastWatered: serverTimestamp(),
        lastWateredBy: wateredBy,
        lastWateredById: userId
      };

      if (willBloom) {
        const bloomData = this.generateBloomData({ ...currentSeed, ...seedData });
        seedUpdateData.bloomed = true;
        seedUpdateData.bloomedFlower = bloomData.emoji;
        seedUpdateData.bloomTime = serverTimestamp();
        seedUpdateData.flowerName = bloomData.name;
        seedUpdateData.flowerLanguage = bloomData.flowerLanguage;
        seedUpdateData.sharonMessage = bloomData.sharonMessage;
        seedUpdateData.rarity = bloomData.rarity;
        
        if (!isOwner) {
          seedUpdateData.friendHelped = true;
        }
      }

      batch.update(seedRef, seedUpdateData);

      // Log watering event
      const wateringLogRef = doc(collection(db, 'waterings'));
      batch.set(wateringLogRef, {
        seedId,
        seedOwnerId: currentSeed.userId,
        seedOwnerName: currentSeed.name || 'Anonymous',
        seedType: currentSeed.type,
        wateredByUserId: userId,
        wateredByUsername: wateredBy,
        timestamp: serverTimestamp(),
        resultedInBloom: willBloom,
        isOwnerWatering: isOwner
      });

      // Update user stats
      if (!isOwner) {
        const userRef = doc(db, 'users', userId);
        batch.update(userRef, {
          totalWaterings: increment(1),
          lastWateringDate: serverTimestamp()
        });
      }

      // Commit batch
      await batch.commit();

      // Update local storage
      const today = new Date().toISOString();
      const localKey = `lastWatered_${userId}_${seedId}`;
      localStorage.setItem(localKey, today);

      // Create notifications
      if (willBloom) {
        try {
          await NotificationManager.seedBloomedNotification(
            currentSeed.userId,
            currentSeed.type,
            seedUpdateData.bloomedFlower
          );
          
          if (!isOwner) {
            await NotificationManager.friendWateredNotification(
              currentSeed.userId,
              wateredBy,
              currentSeed.type
            );
          }
        } catch (notifError) {
          console.warn('Notification failed:', notifError);
        }
      } else if (!isOwner) {
        try {
          await NotificationManager.friendWateredNotification(
            currentSeed.userId,
            wateredBy,
            currentSeed.type
          );
        } catch (notifError) {
          console.warn('Notification failed:', notifError);
        }
      }

      // Update metrics
      this.metrics.successfulOperations++;
      const responseTime = Date.now() - startTime;
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime * (this.metrics.totalOperations - 1) + responseTime) / 
        this.metrics.totalOperations;

      return {
        success: true,
        newWaterCount,
        bloomed: willBloom,
        isOwner,
        wateredBy,
        flowerData: willBloom ? {
          name: seedUpdateData.flowerName,
          emoji: seedUpdateData.bloomedFlower,
          flowerLanguage: seedUpdateData.flowerLanguage,
          sharonMessage: seedUpdateData.sharonMessage,
          rarity: seedUpdateData.rarity
        } : null
      };

    } catch (error) {
      this.metrics.failedOperations++;
      this.metrics.lastError = {
        message: error.message,
        timestamp: new Date(),
        userId,
        seedId
      };
      
      console.error('WateringManager error:', error);
      throw error;
    } finally {
      this.metrics.pendingOperations--;
      this.metrics.totalOperations++;
    }
  }

  // Queue processing for high-traffic scenarios
  async addToQueue(operation) {
    return new Promise((resolve, reject) => {
      this.operationQueue.push({
        ...operation,
        resolve,
        reject,
        timestamp: Date.now()
      });
      
      this.metrics.queueLength = this.operationQueue.length;
      
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  startQueueProcessor() {
    setInterval(() => {
      if (!this.isProcessing && this.operationQueue.length > 0) {
        this.processQueue();
      }
    }, 100);
  }

  async processQueue() {
    if (this.isProcessing || this.operationQueue.length === 0) return;
    
    this.isProcessing = true;
    const maxConcurrent = 5; // Process 5 operations at once
    
    try {
      while (this.operationQueue.length > 0) {
        const batch = this.operationQueue.splice(0, maxConcurrent);
        this.metrics.queueLength = this.operationQueue.length;
        
        await Promise.allSettled(
          batch.map(async (op) => {
            try {
              const result = await this.waterSeed(op.userId, op.seedId, op.wateredBy, op.seedData);
              op.resolve(result);
            } catch (error) {
              op.reject(error);
            }
          })
        );
        
        // Small delay to prevent overwhelming Firestore
        if (this.operationQueue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  // Get performance metrics
  getMetrics() {
    const successRate = this.metrics.totalOperations > 0 
      ? ((this.metrics.successfulOperations / this.metrics.totalOperations) * 100).toFixed(1)
      : '100.0';
    
    return {
      ...this.metrics,
      successRate: `${successRate}%`,
      averageResponseTime: `${this.metrics.averageResponseTime.toFixed(0)}ms`
    };
  }

  // Clear rate limits (for testing or admin purposes)
  clearRateLimits() {
    this.rateLimits.clear();
    this.dailyLimits.clear();
  }
}

// Singleton instance
export const wateringManager = new WateringManager();

// React hook for enhanced watering
export function useWatering() {
  const [isWatering, setIsWatering] = useState(false);
  const [error, setError] = useState(null);

  const waterSeed = useCallback(async (userId, seedId, wateredBy, seedData) => {
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
      return await wateringManager.checkDailyWatering(userId, seedId);
    } catch (err) {
      console.error('Error checking daily watering:', err);
      return false;
    }
  }, []);

  return {
    waterSeed,
    isWatering,
    error,
    canWaterToday,
    metrics: wateringManager.getMetrics()
  };
}

// utils/searchHelpers.js - Search utility functions
export const SearchHelpers = {
  // Enhanced text matching with fuzzy search
  fuzzyMatch(text, searchTerm) {
    if (!text || !searchTerm) return 0;
    
    const textLower = text.toLowerCase();
    const termLower = searchTerm.toLowerCase();
    
    // Exact match gets highest score
    if (textLower === termLower) return 10;
    
    // Starts with gets high score
    if (textLower.startsWith(termLower)) return 8;
    
    // Contains gets medium score
    if (textLower.includes(termLower)) return 5;
    
    // Character-by-character fuzzy matching
    let score = 0;
    let termIndex = 0;
    
    for (let i = 0; i < textLower.length && termIndex < termLower.length; i++) {
      if (textLower[i] === termLower[termIndex]) {
        score += 1;
        termIndex++;
      }
    }
    
    // Bonus for completing the term
    if (termIndex === termLower.length) {
      score += 2;
    }
    
    return score;
  },

  // Extract search terms and clean them
  extractSearchTerms(query) {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 0)
      .slice(0, 5); // Limit to 5 terms for performance
  },

  // Calculate relevance score for users
  calculateUserRelevance(userData, searchTerms) {
    let score = 0;
    
    searchTerms.forEach(term => {
      score += this.fuzzyMatch(userData.username, term) * 3;
      score += this.fuzzyMatch(userData.displayName, term) * 2;
      score += this.fuzzyMatch(userData.bio, term) * 1;
    });

    // Bonus factors
    if (userData.verified) score += 10;
    if (userData.photoURL) score += 5;
    if (userData.badges?.length > 5) score += 3;
    
    // Recent activity bonus
    const lastActive = userData.lastActive?.toDate?.();
    if (lastActive && (Date.now() - lastActive.getTime()) < (7 * 24 * 60 * 60 * 1000)) {
      score += 8;
    }
    
    return score;
  },

  // Highlight search terms in text
  highlightSearchTerms(text, searchTerms) {
    if (!text || !searchTerms.length) return text;
    
    let highlightedText = text;
    
    searchTerms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    });
    
    return highlightedText;
  },

  // Generate search suggestions
  generateSuggestions(query, existingResults = []) {
    const suggestions = [
      'active gardeners',
      'rare flowers',
      'new users',
      'special seeds',
      'verified users',
      'gardens with blooms',
      'recent activity',
      'community leaders'
    ];

    if (!query) return suggestions.slice(0, 5);

    // Filter suggestions based on current query
    const filtered = suggestions.filter(suggestion => 
      suggestion.toLowerCase().includes(query.toLowerCase()) ||
      query.toLowerCase().includes(suggestion.toLowerCase())
    );

    // Add dynamic suggestions based on results
    if (existingResults.length > 0) {
      const commonTypes = new Set();
      existingResults.forEach(result => {
        if (result.type) commonTypes.add(result.type);
        if (result.seedTypes) result.seedTypes.forEach(type => commonTypes.add(type));
      });
      
      Array.from(commonTypes).slice(0, 3).forEach(type => {
        filtered.push(`more ${type}`);
      });
    }

    return filtered.slice(0, 8);
  }
};

// utils/profileHelpers.js - Profile utility functions
export const ProfileHelpers = {
  // Calculate garden activity score
  calculateGardenScore(stats) {
    if (!stats) return 0;
    
    const bloomPoints = (stats.totalBlooms || 0) * 10;
    const helpPoints = (stats.friendsHelped || 0) * 5;
    const rarePoints = (stats.rareFlowers || 0) * 25;
    const specialPoints = (stats.specialSeeds || 0) * 50;
    const conversionBonus = stats.conversionRate > 80 ? 100 : 0;
    const streakBonus = (stats.currentStreak || 0) * 2;
    
    // Recent activity bonus
    const recentBonus = stats.lastBloom && 
      (Date.now() - stats.lastBloom.getTime()) < (7 * 24 * 60 * 60 * 1000) ? 50 : 0;
    
    return bloomPoints + helpPoints + rarePoints + specialPoints + conversionBonus + streakBonus + recentBonus;
  },

  // Generate user achievement tags
  generateAchievementTags(userData, stats) {
    const tags = [];
    
    if (userData.verified) tags.push({ label: 'Verified', color: 'blue', emoji: '✓' });
    if (stats.totalBlooms >= 50) tags.push({ label: 'Master Gardener', color: 'green', emoji: '🌺' });
    if (stats.rareFlowers >= 5) tags.push({ label: 'Rare Collector', color: 'yellow', emoji: '💎' });
    if (stats.specialSeeds >= 3) tags.push({ label: 'Special Seeker', color: 'purple', emoji: '✨' });
    if (stats.friendsHelped >= 20) tags.push({ label: 'Community Helper', color: 'pink', emoji: '🤝' });
    if (stats.currentStreak >= 30) tags.push({ label: 'Dedicated', color: 'orange', emoji: '🔥' });
    
    // Recent activity
    const lastActive = userData.lastActive?.toDate?.();
    if (lastActive && (Date.now() - lastActive.getTime()) < (24 * 60 * 60 * 1000)) {
      tags.push({ label: 'Active Today', color: 'green', emoji: '🌱' });
    }
    
    return tags.slice(0, 3); // Limit to 3 most impressive tags
  },

  // Format join date with relative time
  formatJoinDate(joinedAt) {
    if (!joinedAt) return 'Recently';
    
    const date = joinedAt.toDate ? joinedAt.toDate() : new Date(joinedAt);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) return 'Today';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    
    return date.toLocaleDateString();
  },

  // Generate shareable profile card data
  generateShareableCard(userData, stats) {
    return {
      title: `${userData.displayName || userData.username}'s Garden`,
      description: userData.bio || 'Growing emotions into beautiful flowers 🌸',
      stats: {
        blooms: stats.totalBlooms || 0,
        helped: stats.friendsHelped || 0,
        score: this.calculateGardenScore(stats)
      },
      achievements: this.generateAchievementTags(userData, stats),
      url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://sharons-garden.app'}/u/${userData.username}`
    };
  }
};

// Enhanced error boundaries for the profile system
export class ProfileErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Profile system error:', error, errorInfo);
    
    // Log to monitoring service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: `Profile Error: ${error.toString()}`,
        fatal: false
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-200 flex items-center justify-center p-6">
          <div className="bg-white rounded-xl p-8 shadow-lg max-w-md text-center">
            <div className="text-6xl mb-4">🌱</div>
            <h2 className="text-xl font-bold text-purple-700 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-4">
              We're having trouble loading this profile. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              🔄 Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default WateringManager;
