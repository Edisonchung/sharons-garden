// hooks/useSeedTypes.js
import { useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { SEED_TYPES } from '../components/SeedTypeSelection';

export const useSeedTypes = () => {
  const [userSeedPreference, setUserSeedPreference] = useState(null);
  const [availableSeedTypes, setAvailableSeedTypes] = useState(SEED_TYPES);

  useEffect(() => {
    if (auth.currentUser) {
      loadUserSeedPreference();
    }
  }, [auth.currentUser]);

  const loadUserSeedPreference = () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const stored = localStorage.getItem(`seedPreference_${userId}`);
    if (stored) {
      setUserSeedPreference(JSON.parse(stored));
    }
  };

  const setUserSeedType = (seedType) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    setUserSeedPreference(seedType);
    localStorage.setItem(`seedPreference_${userId}`, JSON.stringify(seedType));
  };

  const getSeedTypeById = (id) => {
    return SEED_TYPES.find(type => type.id === id);
  };

  const getRandomFlowerForSeedType = (seedTypeId) => {
    const seedType = getSeedTypeById(seedTypeId);
    if (!seedType) return 'Unknown Flower';

    const randomIndex = Math.floor(Math.random() * seedType.flowerTypes.length);
    return seedType.flowerTypes[randomIndex];
  };

  return {
    userSeedPreference,
    availableSeedTypes,
    setUserSeedType,
    getSeedTypeById,
    getRandomFlowerForSeedType,
    SEED_TYPES
  };
};

// Enhanced flower data with seed type connections
export const FLOWER_DATABASE = {
  // Hope/Dawn Seeds (☀️)
  'Sunflower': {
    emoji: '🌻',
    seedType: 'hope',
    rarity: 'common',
    flowerLanguage: 'Unwavering optimism',
    sharonMessage: "You don't need to shine all the time - even facing the light is enough."
  },
  'Tulip': {
    emoji: '🌷',
    seedType: 'hope', 
    rarity: 'common',
    flowerLanguage: 'Perfect love and hope',
    sharonMessage: "Your gentleness is this world's most precious strength."
  },
  'Yellow Rose': {
    emoji: '🌹',
    seedType: 'hope',
    rarity: 'rare',
    flowerLanguage: 'Friendship and joy',
    sharonMessage: "Not all light needs to be brilliant - sometimes warmth is enough."
  },

  // Healing/Star Dream Seeds (🌙)
  'Lavender': {
    emoji: '💜',
    seedType: 'healing',
    rarity: 'common', 
    flowerLanguage: 'Peaceful thoughts',
    sharonMessage: "You don't need to always be strong - sometimes resting is also a kind of power."
  },
  'Lily': {
    emoji: '🤍',
    seedType: 'healing',
    rarity: 'common',
    flowerLanguage: 'Pure hope',
    sharonMessage: "You're not a lonely white flower, but an entire field waiting to bloom."
  },
  'Baby\'s Breath': {
    emoji: '⚪',
    seedType: 'healing',
    rarity: 'rare',
    flowerLanguage: 'Quiet companionship', 
    sharonMessage: "Missing doesn't need words - it's already the lightest starlight, always finding its way into your dreams."
  },

  // Strong/Resilience Seeds (💪)
  'Violet': {
    emoji: '🟣',
    seedType: 'strong',
    rarity: 'common',
    flowerLanguage: 'Quiet strength',
    sharonMessage: "Your resilience blooms in silence, but its beauty speaks volumes."
  },
  'Peony': {
    emoji: '🌸',
    seedType: 'strong',
    rarity: 'common',
    flowerLanguage: 'Gentle determination',
    sharonMessage: "Like a peony, you bloom boldly while staying true to your gentle nature."
  },
  'Camellia': {
    emoji: '🌺',
    seedType: 'strong',
    rarity: 'rare',
    flowerLanguage: 'Unshakeable love',
    sharonMessage: "Your love is like a camellia - it blooms even in winter, defying all odds."
  },

  // Companion/Heart Whisper Seeds (❤️)
  'Daisy': {
    emoji: '🌼',
    seedType: 'companion',
    rarity: 'common',
    flowerLanguage: 'Loyal friendship',
    sharonMessage: "In a field of roses, I'd still pick you as my daisy - simple, honest, and true."
  },
  'Pink Rose': {
    emoji: '🌹',
    seedType: 'companion',
    rarity: 'common',
    flowerLanguage: 'Deep affection',
    sharonMessage: "Thank you for being the friend who understands without words."
  },
  'Lotus': {
    emoji: '🪷',
    seedType: 'companion',
    rarity: 'rare',
    flowerLanguage: 'Spiritual connection',
    sharonMessage: "Like lotus flowers, we rise from muddy waters together, pure and beautiful."
  },

  // Mystery/Feather Light Seeds (✨)
  'Orchid': {
    emoji: '🌺',
    seedType: 'mystery',
    rarity: 'common',
    flowerLanguage: 'Rare beauty',
    sharonMessage: "You are an orchid in a world of daisies - uniquely, mysteriously beautiful."
  },
  'Anthurium': {
    emoji: '💖',
    seedType: 'mystery',
    rarity: 'common',
    flowerLanguage: 'Passionate mystery',
    sharonMessage: "Your heart holds secrets that make the world more magical."
  },
  'Blue Rose': {
    emoji: '💙',
    seedType: 'mystery',
    rarity: 'rare',
    flowerLanguage: 'Impossible dreams',
    sharonMessage: "You make me believe in impossible things - like blue roses and endless dreams."
  }
};
