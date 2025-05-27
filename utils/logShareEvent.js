// utils/logShareEvent.js - Share event logging utility
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Log a sharing event for analytics and user tracking
 * @param {string} userId - ID of the user sharing
 * @param {string} flowerId - ID of the flower being shared
 * @param {string} shareType - Type of share (download, link, social, etc.)
 * @param {object} metadata - Additional metadata about the share
 */
export async function logShareEvent(userId, flowerId, shareType, metadata = {}) {
  try {
    await addDoc(collection(db, 'shareEvents'), {
      userId,
      flowerId,
      shareType,
      metadata,
      timestamp: serverTimestamp(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : null,
      referrer: typeof window !== 'undefined' ? window.document.referrer : null
    });
    
    console.log('📊 Share event logged:', { userId, flowerId, shareType });
  } catch (error) {
    console.error('Failed to log share event:', error);
    // Don't throw error to avoid breaking the sharing flow
  }
}

/**
 * Log a garden visit event
 * @param {string} visitorId - ID of the visiting user
 * @param {string} gardenOwnerId - ID of the garden owner
 * @param {string} source - How they found the garden (direct, search, etc.)
 */
export async function logGardenVisit(visitorId, gardenOwnerId, source = 'direct') {
  try {
    await addDoc(collection(db, 'gardenVisits'), {
      visitorId,
      gardenOwnerId,
      source,
      timestamp: serverTimestamp(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : null
    });
    
    console.log('👀 Garden visit logged:', { visitorId, gardenOwnerId, source });
  } catch (error) {
    console.error('Failed to log garden visit:', error);
  }
}

/**
 * Log a profile view event
 * @param {string} viewerId - ID of the user viewing the profile
 * @param {string} profileOwnerId - ID of the profile owner
 * @param {string} source - How they found the profile
 */
export async function logProfileView(viewerId, profileOwnerId, source = 'direct') {
  try {
    // Don't log self-views
    if (viewerId === profileOwnerId) return;
    
    await addDoc(collection(db, 'profileViews'), {
      viewerId,
      profileOwnerId,
      source,
      timestamp: serverTimestamp()
    });
    
    console.log('👤 Profile view logged:', { viewerId, profileOwnerId, source });
  } catch (error) {
    console.error('Failed to log profile view:', error);
  }
}
