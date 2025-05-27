// utils/searchHelpers.js - Profile helper functions for search and ranking
export const ProfileHelpers = {
  /**
   * Calculate overall garden score based on user statistics
   */
  calculateGardenScore(stats) {
    if (!stats) return 0;
    
    const bloomPoints = (stats.totalBlooms || 0) * 10;
    const helpPoints = (stats.friendsHelped || 0) * 5;
    const rarePoints = (stats.rareFlowers || 0) * 25;
    const specialPoints = (stats.specialSeeds || 0) * 50;
    const conversionBonus = (stats.conversionRate || 0) > 80 ? 100 : 0;
    const streakBonus = (stats.currentStreak || 0) > 7 ? (stats.currentStreak * 2) : 0;
    const recentActivityBonus = stats.lastBloom && 
      (Date.now() - new Date(stats.lastBloom).getTime()) < (7 * 24 * 60 * 60 * 1000) ? 50 : 0;
    
    return bloomPoints + helpPoints + rarePoints + specialPoints + conversionBonus + streakBonus + recentActivityBonus;
  },

  /**
   * Generate achievement tags for a user profile
   */
  generateAchievementTags(user, stats) {
    const achievements = [];
    
    if (stats.rareFlowers > 0) {
      achievements.push({
        emoji: '💎',
        label: `${stats.rareFlowers} Rare`,
        color: 'yellow'
      });
    }
    
    if (stats.specialSeeds > 0) {
      achievements.push({
        emoji: '✨',
        label: `${stats.specialSeeds} Special`,
        color: 'indigo'
      });
    }
    
    if (stats.currentStreak > 7) {
      achievements.push({
        emoji: '🔥',
        label: `${stats.currentStreak}d streak`,
        color: 'orange'
      });
    }
    
    if (stats.friendsHelped > 10) {
      achievements.push({
        emoji: '🤝',
        label: 'Helper',
        color: 'blue'
      });
    }
    
    if (stats.conversionRate > 90) {
      achievements.push({
        emoji: '🎯',
        label: 'Expert',
        color: 'green'
      });
    }
    
    if (user.verified) {
      achievements.push({
        emoji: '✓',
        label: 'Verified',
        color: 'blue'
      });
    }
    
    // Check for recent activity
    const isActive = user.lastActive && 
      (Date.now() - new Date(user.lastActive).getTime()) < (7 * 24 * 60 * 60 * 1000);
    
    if (isActive) {
      achievements.push({
        emoji: '🌱',
        label: 'Active',
        color: 'green'
      });
    }
    
    return achievements.slice(0, 3); // Limit to 3 tags
  },

  /**
   * Calculate user ranking tier
   */
  getUserTier(score) {
    if (score >= 1000) return { name: 'Master Gardener', emoji: '🌺', color: 'purple' };
    if (score >= 500) return { name: 'Expert Gardener', emoji: '🌸', color: 'pink' };
    if (score >= 200) return { name: 'Skilled Gardener', emoji: '🌷', color: 'red' };
    if (score >= 100) return { name: 'Growing Gardener', emoji: '🌻', color: 'yellow' };
    if (score >= 50) return { name: 'New Gardener', emoji: '🌱', color: 'green' };
    return { name: 'Seedling', emoji: '🌿', color: 'green' };
  },

  /**
   * Format user stats for display
   */
  formatUserStats(stats) {
    return {
      totalBlooms: stats.totalBlooms || 0,
      totalSeeds: stats.totalSeeds || 0,
      conversionRate: stats.totalSeeds > 0 ? 
        Math.round((stats.totalBlooms / stats.totalSeeds) * 100) : 0,
      friendsHelped: stats.friendsHelped || 0,
      rareFlowers: stats.rareFlowers || 0,
      specialSeeds: stats.specialSeeds || 0,
      currentStreak: stats.currentStreak || 0,
      overallScore: this.calculateGardenScore(stats)
    };
  },

  /**
   * Check if user profile is complete
   */
  isProfileComplete(user) {
    const requiredFields = ['username', 'displayName'];
    const optionalFields = ['bio', 'photoURL'];
    
    const hasRequired = requiredFields.every(field => user[field]);
    const hasOptional = optionalFields.filter(field => user[field]).length;
    
    return {
      isComplete: hasRequired && hasOptional >= 1,
      completionPercentage: Math.round(
        ((requiredFields.filter(field => user[field]).length + hasOptional) / 
         (requiredFields.length + optionalFields.length)) * 100
      ),
      missingFields: [
        ...requiredFields.filter(field => !user[field]),
        ...(hasOptional === 0 ? ['bio or photo'] : [])
      ]
    };
  },

  /**
   * Generate search keywords for a user
   */
  generateSearchKeywords(user, stats) {
    const keywords = [];
    
    // Basic info
    if (user.username) keywords.push(user.username.toLowerCase());
    if (user.displayName) keywords.push(user.displayName.toLowerCase());
    if (user.bio) {
      // Extract meaningful words from bio
      const bioWords = user.bio.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3)
        .slice(0, 5); // Limit to 5 words
      keywords.push(...bioWords);
    }
    
    // Achievement-based keywords
    if (stats.rareFlowers > 0) keywords.push('rare', 'collector');
    if (stats.specialSeeds > 0) keywords.push('special', 'unique');
    if (stats.friendsHelped > 5) keywords.push('helpful', 'community');
    if (stats.currentStreak > 7) keywords.push('consistent', 'dedicated');
    if (stats.conversionRate > 80) keywords.push('expert', 'skilled');
    
    // Activity level
    const isActive = user.lastActive && 
      (Date.now() - new Date(user.lastActive).getTime()) < (7 * 24 * 60 * 60 * 1000);
    if (isActive) keywords.push('active');
    
    // User tier
    const tier = this.getUserTier(this.calculateGardenScore(stats));
    keywords.push(tier.name.toLowerCase());
    
    return [...new Set(keywords)]; // Remove duplicates
  },

  /**
   * Calculate compatibility score between two users
   */
  calculateCompatibility(user1, user2, stats1, stats2) {
    let score = 0;
    
    // Similar experience levels
    const level1 = this.getUserTier(this.calculateGardenScore(stats1)).name;
    const level2 = this.getUserTier(this.calculateGardenScore(stats2)).name;
    if (level1 === level2) score += 20;
    
    // Similar activity patterns
    const streak1 = stats1.currentStreak || 0;
    const streak2 = stats2.currentStreak || 0;
    if (Math.abs(streak1 - streak2) <= 3) score += 15;
    
    // Complementary interests (one helper, one needs help)
    if ((stats1.friendsHelped > 5 && stats2.totalSeeds > stats2.totalBlooms) ||
        (stats2.friendsHelped > 5 && stats1.totalSeeds > stats1.totalBlooms)) {
      score += 25;
    }
    
    // Both active recently
    const active1 = user1.lastActive && 
      (Date.now() - new Date(user1.lastActive).getTime()) < (7 * 24 * 60 * 60 * 1000);
    const active2 = user2.lastActive && 
      (Date.now() - new Date(user2.lastActive).getTime()) < (7 * 24 * 60 * 60 * 1000);
    
    if (active1 && active2) score += 10;
    
    return Math.min(score, 100); // Cap at 100%
  },

  /**
   * Get recommended users for a given user
   */
  getRecommendedUsers(currentUser, currentStats, allUsers, allStats) {
    return allUsers
      .filter(user => user.id !== currentUser.id) // Exclude self
      .map(user => ({
        ...user,
        stats: allStats[user.id] || {},
        compatibilityScore: this.calculateCompatibility(
          currentUser, 
          user, 
          currentStats, 
          allStats[user.id] || {}
        )
      }))
      .filter(user => user.compatibilityScore > 30) // Minimum compatibility
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, 10); // Top 10 recommendations
  }
};
