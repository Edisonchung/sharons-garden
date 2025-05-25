// components/FirstSongSpecialSeed.js
// Complete system for Sharon's first song launch integration

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const SONG_LAUNCH_DATE = new Date('2024-05-30T00:00:00');

const FIRST_SONG_SEED = {
  id: 'first-song-melody',
  name: 'Melody Seed',
  emoji: '🎵',
  description: 'A magical seed that holds Sharon\'s first song',
  rarity: 'legendary',
  bgColor: 'from-indigo-100 via-purple-100 to-pink-100',
  textColor: 'text-indigo-700',
  borderColor: 'border-indigo-400',
  glowEffect: 'shadow-lg shadow-indigo-300',
  specialMessage: 'This seed contains the essence of Sharon\'s musical journey. It will bloom with her first song!',
  flowerTypes: ['Musical Note', 'Harmony Bloom', 'Melody Flower'],
  isPreLaunch: true
};

// Component for the announcement modal
export function FirstSongAnnouncement({ isOpen, onClose, onClaimSeed }) {
  const [timeUntilLaunch, setTimeUntilLaunch] = useState('');
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    // Check if user already claimed
    const checkClaimed = async () => {
      if (!auth.currentUser) return;
      
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const snap = await getDoc(userRef);
      
      if (snap.exists()) {
        const data = snap.data();
        setAlreadyClaimed(!!data.firstSongSeedClaimed);
      }
    };

    // Update countdown
    const updateCountdown = () => {
      const now = new Date();
      const timeDiff = SONG_LAUNCH_DATE - now;

      if (timeDiff > 0) {
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeUntilLaunch(`${days}d ${hours}h ${minutes}m`);
      } else {
        setTimeUntilLaunch('🎉 Song is LIVE!');
      }
    };

    checkClaimed();
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleClaimSeed = async () => {
    if (!auth.currentUser || alreadyClaimed) return;

    setClaiming(true);
    try {
      // Mark as claimed in user document
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userRef, {
        firstSongSeedClaimed: true,
        firstSongSeedClaimedAt: new Date().toISOString()
      }, { merge: true });

      setAlreadyClaimed(true);
      onClaimSeed(FIRST_SONG_SEED);
      toast.success('🎵 Melody Seed claimed! Plant it in your garden!');
      
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err) {
      console.error(err);
      toast.error('Failed to claim seed');
    } finally {
      setClaiming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl relative overflow-hidden">
        
        {/* Magical background effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 opacity-20"></div>
        <div className="absolute top-4 right-4 text-4xl animate-pulse">✨</div>
        <div className="absolute bottom-4 left-4 text-3xl animate-bounce">🎵</div>
        
        <div className="relative z-10 p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="text-6xl mb-4 animate-pulse">🎵</div>
            <h2 className="text-2xl font-bold text-indigo-700 mb-2">
              ✨ Sharon's First Song ✨
            </h2>
            <p className="text-gray-600 text-lg">
              Launches <strong>May 30th, 2024</strong>
            </p>
          </div>

          {/* Countdown */}
          <div className="bg-gradient-to-r from-indigo-100 to-purple-100 p-4 rounded-lg mb-6 text-center border border-indigo-200">
            <p className="text-sm text-indigo-600 mb-1 font-medium">🕒 Release Countdown</p>
            <p className="text-2xl font-bold text-indigo-700">{timeUntilLaunch}</p>
          </div>

          {/* Special Seed Showcase */}
          <Card className={`border-2 ${FIRST_SONG_SEED.borderColor} ${FIRST_SONG_SEED.glowEffect} mb-6`}>
            <CardContent className={`p-6 bg-gradient-to-br ${FIRST_SONG_SEED.bgColor} rounded-lg text-center`}>
              <div className="text-5xl mb-3 animate-bounce">{FIRST_SONG_SEED.emoji}</div>
              <h3 className={`text-2xl font-bold ${FIRST_SONG_SEED.textColor} mb-3`}>
                {FIRST_SONG_SEED.name}
              </h3>
              <p className={`text-lg ${FIRST_SONG_SEED.textColor} opacity-90 mb-4 italic`}>
                "{FIRST_SONG_SEED.description}"
              </p>
              
              {/* Special Features */}
              <div className="space-y-3 text-sm text-indigo-600 mb-4">
                <div className="flex items-center justify-center gap-2 bg-white bg-opacity-50 p-2 rounded-lg">
                  <span>🎶</span>
                  <span>Will bloom with actual song lyrics as flower language</span>
                </div>
                <div className="flex items-center justify-center gap-2 bg-white bg-opacity-50 p-2 rounded-lg">
                  <span>🎧</span>
                  <span>Unlocks Sharon's exclusive voice message</span>
                </div>
                <div className="flex items-center justify-center gap-2 bg-white bg-opacity-50 p-2 rounded-lg">
                  <span>💫</span>
                  <span>Limited edition - Available only until launch!</span>
                </div>
              </div>

              <div className="bg-white bg-opacity-30 p-3 rounded-lg">
                <p className="text-xs text-indigo-600 italic">
                  ⏰ <strong>Last chance!</strong> This seed disappears after the song launches
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Sharon's Message */}
          <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg mb-6">
            <p className="text-sm text-purple-700 italic text-center leading-relaxed">
              "{FIRST_SONG_SEED.specialMessage} Every note was written thinking of you all. 
              Can't wait to share this journey together! 💜"
            </p>
            <p className="text-xs text-purple-600 text-center mt-2 font-medium">— Sharon 💜</p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {!alreadyClaimed ? (
              <Button 
                onClick={handleClaimSeed}
                disabled={claiming}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-lg py-3 shadow-lg hover:shadow-xl transition-all"
              >
                {claiming ? '🌟 Claiming...' : '🎵 Claim Your Melody Seed'}
              </Button>
            ) : (
              <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 font-medium">✅ Melody Seed Claimed!</p>
                <p className="text-sm text-green-600 mt-1">Check your garden to plant it 🌱</p>
              </div>
            )}
            
            <Button 
              onClick={onClose} 
              variant="outline" 
              className="w-full"
            >
              {alreadyClaimed ? 'Go to Garden' : 'Maybe Later'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook for managing first song seed mechanics
export function useFirstSongSeed() {
  const [hasClaimedFirstSong, setHasClaimedFirstSong] = useState(false);
  const [shouldShowAnnouncement, setShouldShowAnnouncement] = useState(false);
  const [songLaunched, setSongLaunched] = useState(false);

  useEffect(() => {
    const checkFirstSongStatus = async () => {
      if (!auth.currentUser) return;

      // Check if song has launched
      const now = new Date();
      setSongLaunched(now >= SONG_LAUNCH_DATE);

      // Check if user has claimed the seed
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const snap = await getDoc(userRef);
      
      if (snap.exists()) {
        const data = snap.data();
        const claimed = !!data.firstSongSeedClaimed;
        setHasClaimedFirstSong(claimed);
        
        // Show announcement if:
        // - Song hasn't launched yet
        // - User hasn't claimed the seed
        // - User hasn't seen announcement today
        const lastShown = localStorage.getItem(`firstSongShown_${auth.currentUser.uid}`);
        const today = new Date().toDateString();
        
        if (!songLaunched && !claimed && lastShown !== today) {
          setShouldShowAnnouncement(true);
          localStorage.setItem(`firstSongShown_${auth.currentUser.uid}`, today);
        }
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        checkFirstSongStatus();
      }
    });

    return () => unsubscribe();
  }, []);

  const dismissAnnouncement = () => {
    setShouldShowAnnouncement(false);
  };

  const canPlantFirstSongSeed = () => {
    return hasClaimedFirstSong && !songLaunched;
  };

  const getFirstSongSeedData = () => {
    if (songLaunched) {
      return {
        ...FIRST_SONG_SEED,
        name: 'Bloomed Melody',
        description: 'Sharon\'s first song has launched! 🎉',
        isPreLaunch: false
      };
    }
    return FIRST_SONG_SEED;
  };

  return {
    hasClaimedFirstSong,
    shouldShowAnnouncement,
    songLaunched,
    canPlantFirstSongSeed,
    getFirstSongSeedData,
    dismissAnnouncement,
    FIRST_SONG_SEED
  };
}

// Component to add to garden page for launching the announcement
export function FirstSongSeedTrigger() {
  const { shouldShowAnnouncement, dismissAnnouncement, FIRST_SONG_SEED } = useFirstSongSeed();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (shouldShowAnnouncement) {
      // Show announcement 3 seconds after page load
      const timer = setTimeout(() => {
        setShowModal(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [shouldShowAnnouncement]);

  const handleClaimSeed = (seedData) => {
    // This would trigger the actual planting in the main garden
    console.log('First song seed claimed:', seedData);
    setShowModal(false);
    dismissAnnouncement();
    
    // You can emit an event here to notify the parent component
    window.dispatchEvent(new CustomEvent('firstSongSeedClaimed', { 
      detail: seedData 
    }));
  };

  return (
    <FirstSongAnnouncement
      isOpen={showModal}
      onClose={() => {
        setShowModal(false);
        dismissAnnouncement();
      }}
      onClaimSeed={handleClaimSeed}
    />
  );
}

// Enhanced flower messages for when first song seed blooms
export const FIRST_SONG_FLOWER_MESSAGES = {
  'Musical Note': {
    flowerLanguage: 'The beginning of a beautiful melody',
    sharonMessage: "This is just the first note of our story together. Thank you for growing with me. 🎵",
    emoji: '🎵'
  },
  'Harmony Bloom': {
    flowerLanguage: 'Perfect harmony between hearts',
    sharonMessage: "Your support creates the most beautiful harmony in my life. This song is for you. 💜",
    emoji: '🎶'
  },
  'Melody Flower': {
    flowerLanguage: 'A song blooming in the heart',
    sharonMessage: "Every melody starts with a single note, just like every dream starts with someone who believes. Thank you for believing in me. ✨",
    emoji: '🌸'
  }
};
