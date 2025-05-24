// utils/seedSlotUtils.js

/**
 * Check if the user can plant a new seed based on their unlockedSlots.
 * @param {Array} seeds - Array of planted seeds.
 * @param {number} unlockedSlots - Number of unlocked planting slots.
 * @returns {boolean}
 */
export function canPlantNewSeed(seeds, unlockedSlots) {
  if (!Array.isArray(seeds) || typeof unlockedSlots !== 'number') return false;
  const activeSeeds = seeds.filter((s) => !s.bloomed).length;
  return activeSeeds < unlockedSlots;
}

/**
 * Get planting slot usage info.
 * @param {Array} seeds
 * @param {number} unlockedSlots
 * @returns {{ used: number, available: number, locked: number }}
 */
export function getLockedSlotInfo(seeds, unlockedSlots) {
  const used = seeds.filter((s) => !s.bloomed).length;
  const available = Math.max(0, unlockedSlots - used);
  return {
    used,
    available,
    locked: Math.max(0, 5 - unlockedSlots),
  };
}
