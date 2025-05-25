// components/SongLaunchSystem.js - Complete Song Launch Integration
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { auth, db } from '../lib/firebase';
import { doc, updateDoc, addDoc, collection, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

// LAUNCH CONFIGURATION
const SONG_LAUNCH_DATE = new Date('2024-05-30T00:00:00');
const SPECIAL_SEED_DATA = {
  id: 'melody-seed',
  name: 'Melody Seed',
  emoji: '🎵',
  type: 'First Song',
  description: 'A magical seed that contains Sharon\'s first song',
  rarity: 'legendary',
  bgColor: 'from-indigo-100 via-purple-100 to-pink-100',
  textColor: 'text-indigo-700',
  borderColor: 'border-indigo-400',
  flowerLanguage: 'The birth of a beautiful melody',
  sharonMessage: "This note carries all my hopes and dreams. Thank you for being part of my journey from the very beginning. 💜"
};

// Main announcement modal component
export function SongLaunchAnnouncement({ isOpen, onClose, onClaimSeed }) {
  const [timeUntilLaunch, setTimeUntilLaunch] = useState('');
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Check if user already claimed
    const checkClaimed = async () => {
      if (!auth.currentUser) return;
      
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const snap = await getDoc(userRef);
        
        if (snap.exists()) {
          const data = snap.data();
          setAlreadyClaimed(!!data.melodySeedClaimed);
        }
      } catch (error) {
        console.error('Error checking claim status:', error);
      }
    };

    // Update countdown timer
    const updateCountdown = () => {
      const now = new Date();
      const timeDiff = SONG_LAUNCH_DATE - now;

      if (timeDiff > 0) {
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) {
          setTimeUntilLaunch(`${days}d ${hours}h ${minutes}m`);
        } else if (hours > 0) {
          setTimeUntilLaunch(`${hours}h ${minutes}m`);
        } else {
          setTimeUntilLaunch(`${minutes}m`);
        }
      } else {
        setTimeUntilLaunch('🎉 Song is LIVE!');
      }
    };

    checkClaimed();
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [isOpen]);

  const handleClaimSeed = async () => {
    if (!auth.currentUser || alreadyClaimed || claiming) return;

    setClaiming(true);
    try {
      // Create the special seed in user's garden
      const specialSeed = {
        userId: auth.currentUser.uid,
        type: SPECIAL_SEED_DATA.type,
        seedType: SPECIAL_SEED_DATA.id,
        name: auth.currentUser.displayName || 'Music Lover',
        note: 'Claimed the exclusive First Song seed! 🎵',
        waterCount: 0,
        bloomed: false,
        bloomedFlower: null,
        specialSeed: true,
        songSeed: true,
        rarity: SPECIAL_SEED_DATA.rarity,
        createdAt: new Date().toISOString(),
        claimedAt: new Date().toISOString(),
        seedTypeData: SPECIAL_SEED_DATA
      };

      const docRef = await addDoc(collection(db, 'flowers'), specialSeed);

      // Mark as claimed in user profile
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        melodySeedClaimed: true,
        melodySeedId: docRef.id,
        melodySeedClaimedAt: new Date().toISOString()
      });

      // NEW: Create notification for claiming special seed
      const { NotificationManager } = await import('./NotificationSystem');
      await NotificationManager.createNotification(
        auth.currentUser.uid,
        'SONG_LAUNCH',
        '🎵 Melody Seed Claimed!',
        'Your exclusive First Song seed is now growing in your garden. Water it daily until May 30th!',
        {
          actionUrl: '/garden/my',
          actionText: 'View Garden'
        }
      );

      setAlreadyClaimed(true);
      onClaimSeed({ ...specialSeed, id: docRef.id });
      toast.success('🎵 Melody Seed claimed! Check your garden!');
      
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Failed to claim seed:', error);
      toast.error('Failed to claim seed. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  if (!isOpen) return null;

  const songHasLaunched = new Date() >= SONG_LAUNCH_DATE;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl relative overflow-hidden">
        
        {/* Magical background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 opacity-30"></div>
        <div className="absolute top-4 right-4 text-4xl animate-pulse">✨</div>
        <div className="absolute bottom-4 left-4 text-3xl animate-bounce">🎵</div>
        <div className="absolute top-1/3 left-4 text-2xl animate-pulse">🌟</div>
        
        <div className="relative z-10 p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="text-6xl mb-4 animate-bounce">{SPECIAL_SEED_DATA.emoji}</div>
            <h2 className="text-2xl font-bold text-indigo-700 mb-2">
              {songHasLaunched ? '🎉 Sharon\'s Song is Live!' : '✨ Sharon\'s First Song ✨'}
            </h2>
            <p className="text-gray-600 text-lg">
              {songHasLaunched ? 'The wait is over!' : 'Launches May 30th, 2024'}
            </p>
          </div>

          {/* Countdown or Launch Message */}
          {!songHasLaunched ? (
            <div className="bg-gradient-to-r from-indigo-100 to-purple-100 p-4 rounded-lg mb-6 text-center border border-indigo-200">
              <p className="text-sm text-indigo-600 mb-1 font-medium">🕒 Release Countdown</p>
              <p className="text-2xl font-bold text-indigo-700">{timeUntilLaunch}</p>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-green-100 to-blue-100 p-4 rounded-lg mb-6 text-center border border-green-200">
              <p className="text-lg font-bold text-green-700 mb-2">🎉 The Song is Live!</p>
              <div className="space-y-2">
                <a 
                  href="https://open.spotify.com/artist/sharon" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 text-sm"
                >
                  🎧 Listen on Spotify
                </a>
                <a 
                  href="https://music.apple.com/artist/sharon" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block bg-gray-800 text-white py-2 px-4 rounded hover:bg-gray-900 text-sm"
                >
                  🍎 Listen on Apple Music
                </a>
              </div>
            </div>
          )}

          {/* Special Seed Showcase */}
          {!songHasLaunched && (
            <Card className={`border-2 ${SPECIAL_SEED_DATA.borderColor} shadow-lg mb-6`}>
              <CardContent className={`p-6 bg-gradient-to-br ${SPECIAL_SEED_DATA.bgColor} rounded-lg text-center`}>
                <div className="text-5xl mb-3 animate-pulse">{SPECIAL_SEED_DATA.emoji}</div>
                <h3 className={`text-2xl font-bold ${SPECIAL_SEED_DATA.textColor} mb-3`}>
                  {SPECIAL_SEED_DATA.name}
                </h3>
                <p className={`text-lg ${SPECIAL_SEED_DATA.textColor} opacity-90 mb-4 italic`}>
                  "{SPECIAL_SEED_DATA.description}"
                </p>
                
                {/* Special Features */}
                <div className="space-y-2 text-sm text-indigo-600 mb-4">
                  <div className="flex items-center justify-center gap-2 bg-white bg-opacity-50 p-2 rounded-lg">
                    <span>🎶</span>
                    <span>Will bloom with actual song lyrics</span>
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
          )}

          {/* Sharon's Message */}
          <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg mb-6">
            <p className="text-sm text-purple-700 italic text-center leading-relaxed">
              "{songHasLaunched 
                ? 'Thank you for growing with me from the very beginning. This song is for all of you who believed in me. 💜'
                : 'Every note was written thinking of you all. This seed holds the essence of my musical journey. Can\'t wait to share this with you! 💜'
              }"
            </p>
            <p className="text-xs text-purple-600 text-center mt-2 font-medium">— Sharon 💜</p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {!songHasLaunched && !alreadyClaimed ? (
              <Button 
                onClick={handleClaimSeed}
                disabled={claiming}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-lg py-3 shadow-lg hover:shadow-xl transition-all"
              >
                {claiming ? '🌟 Claiming...' : '🎵 Claim Your Melody Seed'}
              </Button>
            ) : !songHasLaunched && alreadyClaimed ? (
              <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 font-medium">✅ Melody Seed Claimed!</p>
                <p className="text-sm text-green-600 mt-1">Check your garden to water it 🌱</p>
              </div>
            ) : null}
            
            <Button 
              onClick={onClose} 
              variant="outline" 
              className="w-full"
            >
              {songHasLaunched ? '🌱 Back to Garden' : alreadyClaimed ? 'Go to Garden' : 'Maybe Later'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook for managing song launch state
export function useSongLaunch() {
  const [shouldShowAnnouncement, setShouldShowAnnouncement] = useState(false);
  const [hasClaimedSeed, setHasClaimedSeed] = useState(false);
  const [songLaunched, setSongLaunched] = useState(false);

  useEffect(() => {
    const checkLaunchStatus = async () => {
      if (!auth.currentUser) return;

      // Check if song has launched
      const now = new Date();
      setSongLaunched(now >= SONG_LAUNCH_DATE);

      // Check if user has claimed the seed
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const snap = await getDoc(userRef);
        
        if (snap.exists()) {
          const data = snap.data();
          const claimed = !!data.melodySeedClaimed;
          setHasClaimedSeed(claimed);
          
          // Show announcement if:
          // - Song hasn't launched yet
          // - User hasn't claimed the seed
          // - User hasn't seen announcement today
          const lastShown = localStorage.getItem(`songAnnouncementShown_${auth.currentUser.uid}`);
          const today = new Date().toDateString();
          
          if (!now >= SONG_LAUNCH_DATE && !claimed && lastShown !== today) {
            setShouldShowAnnouncement(true);
            localStorage.setItem(`songAnnouncementShown_${auth.currentUser.uid}`, today);
          }
          
          // Always show on launch day
          if (now >= SONG_LAUNCH_DATE && lastShown !== today) {
            setShouldShowAnnouncement(true);
            localStorage.setItem(`songAnnouncementShown_${auth.currentUser.uid}`, today);
          }
        }
      } catch (error) {
        console.error('Error checking launch status:', error);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        checkLaunchStatus();
      }
    });

    return () => unsubscribe();
  }, []);

  const dismissAnnouncement = () => {
    setShouldShowAnnouncement(false);
  };

  return {
    shouldShowAnnouncement,
    hasClaimedSeed,
    songLaunched,
    dismissAnnouncement,
    SPECIAL_SEED_DATA
  };
}

// Main component to add to your garden
export default function SongLaunchManager({ onSeedClaimed, children }) {
  const { shouldShowAnnouncement, dismissAnnouncement } = useSongLaunch();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (shouldShowAnnouncement) {
      // Show announcement 3 seconds after page load for dramatic effect
      const timer = setTimeout(() => {
        setShowModal(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }

    // DEVELOPER TESTING: Add keyboard shortcut to force show modal
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        console.log('🎵 Developer override: Forcing song modal');
        setShowModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [shouldShowAnnouncement]);

  const handleClaimSeed = (seedData) => {
    console.log('Song seed claimed:', seedData);
    setShowModal(false);
    dismissAnnouncement();
    
    if (onSeedClaimed) {
      onSeedClaimed(seedData);
    }
    
    // Emit event for other components to listen
    window.dispatchEvent(new CustomEvent('songSeedClaimed', { 
      detail: seedData 
    }));
  };

  return (
    <>
      {children}
      
      <SongLaunchAnnouncement
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          dismissAnnouncement();
        }}
        onClaimSeed={handleClaimSeed}
      />
    </>
  );
}
