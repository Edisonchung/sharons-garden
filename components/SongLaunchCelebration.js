// components/SongLaunchCelebration.js
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import toast from 'react-hot-toast';

const SONG_LAUNCH_DATE = new Date('2025-05-30T00:00:00');

// Auto-show component on main page
export function SongLaunchTrigger() {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const checkAndShow = async () => {
      if (!auth.currentUser) return;

      // Check if we should auto-show (within 7 days of launch)
      const daysUntil = Math.ceil((SONG_LAUNCH_DATE - new Date()) / (1000 * 60 * 60 * 24));
      
      if (daysUntil <= 7 && daysUntil > 0) {
        const lastShown = sessionStorage.getItem('songModalShownSession');
        if (!lastShown) {
          setTimeout(() => {
            setShowModal(true);
            sessionStorage.setItem('songModalShownSession', 'true');
          }, 3000); // Show after 3 seconds
        }
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) checkAndShow();
    });

    return () => unsubscribe();
  }, []);

  return <SongLaunchCelebration isOpen={showModal} onClose={() => setShowModal(false)} />;
}
const MELODY_SEED_DATA = {
  id: 'melody-seed-2025',
  name: 'Melody Seed',
  emoji: '🎵',
  type: 'First Song',
  description: 'A magical seed that holds Sharon\'s first song',
  rarity: 'legendary',
  bgColor: 'from-indigo-100 via-purple-100 to-pink-100',
  textColor: 'text-indigo-700',
  borderColor: 'border-indigo-400',
  sharonMessage: "This seed contains the essence of my musical journey. Plant it and water it daily until the song launches!",
  specialFeatures: [
    'Will bloom with actual song lyrics',
    'Unlocks Sharon\'s exclusive voice message',
    'Limited edition - Only available until launch!'
  ]
};

export default function SongLaunchCelebration({ isOpen, onClose }) {
  const [timeUntilLaunch, setTimeUntilLaunch] = useState('');
  const [hasClaimed, setHasClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    checkClaimStatus();
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    // Check if we should show the modal automatically
    const checkShowModal = async () => {
      if (!auth.currentUser) return;

      const today = new Date().toDateString();
      const lastShown = localStorage.getItem(`songModalShown_${auth.currentUser.uid}`);
      
      // Show if not shown today and we're within 7 days of launch
      const daysUntilLaunch = Math.ceil((SONG_LAUNCH_DATE - new Date()) / (1000 * 60 * 60 * 24));
      
      if (lastShown !== today && daysUntilLaunch <= 7 && daysUntilLaunch > 0) {
        setShowModal(true);
        localStorage.setItem(`songModalShown_${auth.currentUser.uid}`, today);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        checkShowModal();
      }
    });

    return () => unsubscribe();
  }, []);

  const checkClaimStatus = async () => {
    if (!auth.currentUser) return;

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        setHasClaimed(!!data.melodySeed2025Claimed);
      }
    } catch (error) {
      console.error('Error checking claim status:', error);
    }
  };

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
        setTimeUntilLaunch(`${minutes} minutes!`);
      }
    } else {
      setTimeUntilLaunch('🎉 Song is LIVE!');
    }
  };

  const handleClaimSeed = async () => {
    if (!auth.currentUser || hasClaimed || claiming) return;

    setClaiming(true);
    try {
      // Create the special seed
      const specialSeed = {
        userId: auth.currentUser.uid,
        ...MELODY_SEED_DATA,
        waterCount: 0,
        bloomed: false,
        specialSeed: true,
        songSeed: true,
        createdAt: new Date().toISOString(),
        plantedBy: auth.currentUser.displayName || auth.currentUser.email,
        launchDate: SONG_LAUNCH_DATE.toISOString()
      };

      const docRef = await addDoc(collection(db, 'flowers'), specialSeed);

      // Update user document
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        melodySeed2025Claimed: true,
        melodySeed2025Id: docRef.id,
        melodySeed2025ClaimedAt: new Date().toISOString()
      });

      // Create notification using proper notification structure
      const userDocSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const existingNotifications = userDocSnap.data()?.notifications || [];
      
      const newNotification = {
        id: `melody_claim_${Date.now()}`,
        type: 'SONG_LAUNCH',
        title: '🎵 Melody Seed Claimed!',
        message: 'Your exclusive First Song seed is growing! Water it daily until May 30th for a special surprise.',
        read: false,
        timestamp: new Date(),
        createdAt: new Date().toISOString(),
        actionUrl: '/garden/my',
        actionText: 'View Garden'
      };
      
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        notifications: [newNotification, ...existingNotifications]
      });

      setHasClaimed(true);
      toast.success('🎵 Melody Seed claimed! Check your garden!');
      
      // Close after delay
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

  if (!isOpen && !showModal) return null;

  const daysUntilLaunch = Math.ceil((SONG_LAUNCH_DATE - new Date()) / (1000 * 60 * 60 * 24));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl relative overflow-hidden">
        
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 opacity-30"></div>
        <div className="absolute -top-10 -right-10 text-9xl opacity-10 animate-pulse">🎵</div>
        <div className="absolute -bottom-10 -left-10 text-9xl opacity-10 animate-pulse animation-delay-500">🎶</div>
        
        <div className="relative z-10 p-6">
          {/* Close button - More prominent */}
          <button
            onClick={() => {
              setShowModal(false);
              if (onClose) onClose();
            }}
            className="absolute -top-2 -right-2 bg-white rounded-full w-10 h-10 flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-gray-100 shadow-lg text-xl font-bold z-20 transition-all"
            aria-label="Close"
          >
            ×
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="text-6xl mb-4 animate-bounce">{MELODY_SEED_DATA.emoji}</div>
            <h2 className="text-2xl font-bold text-indigo-700 mb-2">
              ✨ Sharon's First Song ✨
            </h2>
            <p className="text-lg text-gray-600">
              Launching May 30th, 2025
            </p>
          </div>

          {/* Countdown */}
          <div className="bg-gradient-to-r from-indigo-100 to-purple-100 p-4 rounded-lg mb-6 text-center border border-indigo-200">
            <p className="text-sm text-indigo-600 mb-1 font-medium">
              🕒 Release Countdown
            </p>
            <p className="text-3xl font-bold text-indigo-700">
              {timeUntilLaunch}
            </p>
            {daysUntilLaunch <= 7 && daysUntilLaunch > 0 && (
              <p className="text-xs text-indigo-600 mt-2 animate-pulse">
                ⏰ Only {daysUntilLaunch} days left!
              </p>
            )}
          </div>

          {/* Special Seed Card */}
          <Card className={`border-2 ${MELODY_SEED_DATA.borderColor} shadow-lg mb-6`}>
            <CardContent className={`p-6 bg-gradient-to-br ${MELODY_SEED_DATA.bgColor} rounded-lg text-center`}>
              <h3 className={`text-2xl font-bold ${MELODY_SEED_DATA.textColor} mb-3`}>
                {MELODY_SEED_DATA.name}
              </h3>
              <p className={`text-lg ${MELODY_SEED_DATA.textColor} opacity-90 mb-4 italic`}>
                "{MELODY_SEED_DATA.description}"
              </p>
              
              {/* Special Features */}
              <div className="space-y-2 mb-4">
                {MELODY_SEED_DATA.specialFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center justify-center gap-2 bg-white bg-opacity-50 p-2 rounded-lg text-sm">
                    <span>✨</span>
                    <span className="text-indigo-700">{feature}</span>
                  </div>
                ))}
              </div>

              {daysUntilLaunch <= 4 && (
                <div className="bg-red-100 bg-opacity-70 p-3 rounded-lg animate-pulse">
                  <p className="text-xs text-red-700 font-bold">
                    ⏰ LAST CHANCE! Disappears when the song launches!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sharon's Message */}
          <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg mb-6">
            <p className="text-sm text-purple-700 italic text-center leading-relaxed">
              "{MELODY_SEED_DATA.sharonMessage}"
            </p>
            <p className="text-xs text-purple-600 text-center mt-2 font-medium">
              — Sharon 💜
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {!hasClaimed ? (
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
                <p className="text-sm text-green-600 mt-1">Water it daily in your garden until launch! 🌱</p>
              </div>
            )}
            
            <Button 
              onClick={() => {
                setShowModal(false);
                if (onClose) onClose();
              }}
              variant="outline" 
              className="w-full"
            >
              {hasClaimed ? 'Go to Garden' : 'Maybe Later'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
