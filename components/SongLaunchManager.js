// components/SongLaunchManager.js
import { useState, useEffect } from 'react';
import { FirstSongAnnouncement, useFirstSongSeed } from './FirstSongSpecialSeed';
import { auth, db } from '../lib/firebase';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import toast from 'react-hot-toast';

const LAUNCH_DATE = new Date('2024-05-30T00:00:00');

export default function SongLaunchManager({ onSeedClaimed, children }) {
  const {
    shouldShowAnnouncement,
    dismissAnnouncement,
    canPlantFirstSongSeed,
    getFirstSongSeedData
  } = useFirstSongSeed();

  const [showModal, setShowModal] = useState(false);
  const [isLaunched, setIsLaunched] = useState(false);

  useEffect(() => {
    // Check if song has launched
    setIsLaunched(new Date() >= LAUNCH_DATE);

    // Show announcement for eligible users
    if (shouldShowAnnouncement && !isLaunched) {
      const timer = setTimeout(() => {
        setShowModal(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [shouldShowAnnouncement, isLaunched]);

  const handleClaimSeed = async (seedData) => {
    if (!auth.currentUser) {
      toast.error('Please sign in to claim your seed');
      return;
    }

    try {
      // Plant the special seed directly
      const specialSeed = {
        userId: auth.currentUser.uid,
        type: 'First Song',
        seedType: 'melody',
        name: auth.currentUser.displayName || 'Music Lover',
        note: 'Claimed the exclusive First Song seed! 🎵',
        waterCount: 0,
        bloomed: false,
        specialSeed: true,
        songSeed: true,
        claimedAt: new Date().toISOString(),
        rarity: 'legendary'
      };

      const docRef = await addDoc(collection(db, 'flowers'), specialSeed);

      // Mark as claimed in user profile
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        firstSongSeedClaimed: true,
        firstSongSeedId: docRef.id,
        claimedAt: new Date().toISOString()
      });

      // Call parent callback
      if (onSeedClaimed) {
        onSeedClaimed({ ...specialSeed, id: docRef.id });
      }

      toast.success('🎵 First Song seed planted in your garden!');
      setShowModal(false);
      dismissAnnouncement();

    } catch (error) {
      console.error('Failed to claim seed:', error);
      toast.error('Failed to claim seed. Please try again.');
    }
  };

  return (
    <>
      {children}
      
      <FirstSongAnnouncement
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          dismissAnnouncement();
        }}
        onClaimSeed={handleClaimSeed}
      />

      {/* Launch Day Celebration */}
      {isLaunched && (
        <LaunchDayCelebration />
      )}
    </>
  );
}

// Special component for launch day
function LaunchDayCelebration() {
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    // Show celebration only once per session
    const hasSeenToday = sessionStorage.getItem('songLaunchCelebration');
    if (!hasSeenToday) {
      setShowCelebration(true);
      sessionStorage.setItem('songLaunchCelebration', 'true');
    }
  }, []);

  if (!showCelebration) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-md text-center shadow-2xl">
        <div className="text-6xl mb-4 animate-bounce">🎉</div>
        <h2 className="text-2xl font-bold text-purple-700 mb-4">
          Sharon's First Song is LIVE!
        </h2>
        <p className="text-gray-600 mb-6">
          The moment we've all been waiting for! Sharon's debut single is now available everywhere.
        </p>
        
        <div className="space-y-3 mb-6">
          <a 
            href="https://open.spotify.com/artist/sharon" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
          >
            🎧 Listen on Spotify
          </a>
          <a 
            href="https://music.apple.com/artist/sharon" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block bg-gray-800 text-white py-2 px-4 rounded hover:bg-gray-900"
          >
            🍎 Listen on Apple Music
          </a>
        </div>

        <button 
          onClick={() => setShowCelebration(false)}
          className="bg-purple-600 text-white py-2 px-6 rounded hover:bg-purple-700"
        >
          🌱 Back to Garden
        </button>
      </div>
    </div>
  );
}

// Enhanced First Song flower with special properties
export const FIRST_SONG_FLOWER_DATA = {
  'Musical Note': {
    emoji: '🎵',
    rarity: 'legendary',
    flowerLanguage: 'The birth of a beautiful melody',
    sharonMessage: "This note carries all my hopes and dreams. Thank you for being part of my journey from the very beginning. 💜",
    specialEffects: ['sparkle', 'glow'],
    unlocks: ['exclusive_voice_note', 'behind_the_scenes_video']
  },
  'Harmony Bloom': {
    emoji: '🎶',
    rarity: 'legendary', 
    flowerLanguage: 'Perfect harmony between hearts',
    sharonMessage: "Together, we create the most beautiful music. Your support gives life to every lyric I write. ✨",
    specialEffects: ['pulse', 'rainbow'],
    unlocks: ['lyric_booklet', 'acoustic_version']
  },
  'Melody Flower': {
    emoji: '🌸',
    rarity: 'legendary',
    flowerLanguage: 'A song blooming in the heart', 
    sharonMessage: "Every song starts with a single note, just like every dream starts with someone who believes. You believed in me first. 🎼",
    specialEffects: ['float', 'musical_notes'],
    unlocks: ['studio_session_recording', 'personal_thank_you_video']
  }
};
