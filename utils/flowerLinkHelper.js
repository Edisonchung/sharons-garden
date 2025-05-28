// utils/flowerLinkHelper.js - Helper for creating safe flower links

/**
 * Create a safe flower detail link
 * @param {string} flowerId - The flower document ID
 * @returns {string} - Safe flower link or fallback
 */
export function createFlowerLink(flowerId) {
  if (!flowerId || typeof flowerId !== 'string') {
    console.warn('Invalid flower ID provided to createFlowerLink:', flowerId);
    return '/'; // Fallback to home
  }
  return `/flower/${flowerId}`;
}

/**
 * Create a share URL for a flower
 * @param {string} flowerId - The flower document ID
 * @param {string} baseUrl - Base URL (optional, will use window.location.origin if available)
 * @returns {string} - Complete share URL
 */
export function createFlowerShareUrl(flowerId, baseUrl) {
  if (!flowerId || typeof flowerId !== 'string') {
    console.warn('Invalid flower ID provided to createFlowerShareUrl:', flowerId);
    return typeof window !== 'undefined' ? window.location.origin : '';
  }
  
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/flower/${flowerId}`;
}

/**
 * Navigate to flower page safely
 * @param {object} router - Next.js router object
 * @param {string} flowerId - The flower document ID
 */
export function navigateToFlower(router, flowerId) {
  if (!flowerId || typeof flowerId !== 'string') {
    console.warn('Invalid flower ID provided to navigateToFlower:', flowerId);
    router.push('/');
    return;
  }
  router.push(`/flower/${flowerId}`);
}

/**
 * Validate flower ID format
 * @param {string} flowerId - The flower document ID to validate
 * @returns {boolean} - Whether the ID is valid
 */
export function isValidFlowerId(flowerId) {
  return flowerId && 
         typeof flowerId === 'string' && 
         flowerId.trim().length > 0 &&
         !flowerId.includes('[') && 
         !flowerId.includes(']');
}
