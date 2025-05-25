// components/SongLaunchCelebration.js
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

const SONG_LAUNCH_DATE = new Date('2025-05-30T00:00:00');
const SONG_DATA = {
  title: "Dream Garden",
  artist: "Sharon",
  releaseDate: "May 30, 2025",
  spotifyUrl: "https://open.spotify.com/track/sharons-dream-garden",
  appleMusicUrl: "https://music.apple.com/track/sharons-dream-garden",
  youtubeUrl: "https://youtube.com/watch?v=sharons-dream-garden",
  specialMessage: "Every note was written thinking of you all. Thank you for growing with me! 💜"
};

export default function SongLaunchCelebration() {
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasMelodySeed, setHasMelodySeed] = useState(false);
  const [specialRewardClaimed, setSpecialRewardClaimed] = useState(false);
  const [showReward, setShowReward] = useState(false);

  useEffect(() => {
    checkUserStatus();
  }, []);

  const checkUserStatus = async () => {
    if (!auth.currentUser) return;

    try {
      // Check if user has melody seed
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        const claimed = data.melodySeedClaimed || data.firstSongSeedClaimed;
        setHasMelodySeed(claimed);
        setSpecialRewardClaimed(data.songLaunchRewardClaimed || false);
        
        // Show celebration if not seen today
        const lastSeen = localStorage.getItem(`songCelebrationSeen_${auth.currentUser.uid}`);
        const today = new Date().toDateString();
        
        if (lastSeen !== today) {
          setShowCelebration(true);
          localStorage.setItem(`songCelebrationSeen_${auth.currentUser.uid}`, today);
          
          // Trigger confetti
          setTimeout(() => {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#9333ea', '#ec4899', '#8b5cf6']
            });
          }, 500);
        }
      }
    } catch (error) {
      console.error('Error checking user status:', error);
    }
  };

  const handleClaimSpecialReward = async () => {
    if (!auth.currentUser || !hasMelodySeed || specialRewardClaimed) return;

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      
      // Add special reward
      await updateDoc(userRef, {
        songLaunchRewardClaimed: true,
        specialRewards: arrayUnion({
          type: 'EXCLUSIVE_VOICE_NOTE',
          name: 'Sharon\'s Personal Thank You',
          description: 'An exclusive voice message from Sharon for early supporters',
          claimedAt: new Date().toISOString(),
          url: '/rewards/sharon-thank-you-voice-note.mp3'
        }),
        badges: arrayUnion('🎵 Melody Pioneer')
      });

      // Create notification
      await updateDoc(userRef, {
        notifications: arrayUnion({
          id: `song_reward_${Date.now()}`,
          type: 'SHARON_MESSAGE',
          title: '🎵 Exclusive Reward Unlocked!',
          message: 'Thank you for being part of my journey from the very beginning. Your Melody Seed has unlocked something special! 💜',
          read: false,
          timestamp: new Date(),
          actionUrl: '/garden/badges',
          actionText: 'View Reward'
        })
      });

      setSpecialRewardClaimed(true);
      setShowReward(true);
      
      toast.success('🎵 Special reward unlocked!');
      
      // More confetti!
      confetti({
        particleCount: 200,
        spread: 120,
        origin: { y: 0.4 },
        colors: ['#9333ea', '#ec4899', '#8b5cf6', '#fbbf24']
      });

    } catch (error) {
      console.error('Error claiming reward:', error);
      toast.error('Failed to claim reward');
    }
  };

  const handleListen = (platform) => {
    // Track listening action
    if (auth.currentUser) {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      updateDoc(userRef, {
        songListenedAt: new Date().toISOString(),
        listenPlatform: platform
      }).catch(console.error);
    }

    // Open platform
    const urls = {
      spotify: SONG_DATA.spotifyUrl,
      apple: SONG_DATA.appleMusicUrl,
      youtube: SONG_DATA.youtubeUrl
    };

    window.open(urls[platform], '_blank', 'noopener,noreferrer');
  };

  if (!showCelebration) return null;

  return (
    <>
      {/* Main Celebration Modal */}
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl relative overflow-hidden">
          
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-100 via-pink-100 to-indigo-100 opacity-50"></div>
          <div className="absolute top-0 right-0 text-8xl opacity-10 animate-pulse">🎵</div>
          <div className="absolute bottom-0 left-0 text-8xl opacity-10 animate-pulse delay-300">🎶</div>
          
          <div className="relative z-10 p-6">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="text-6xl mb-4 animate-bounce">🎉</div>
              <h2 className="text-3xl font-bold text-purple-700 mb-2">
                Sharon's Song is LIVE!
              </h2>
              <p className="text-lg text-gray-600">
                "{SONG_DATA.title}" is now available everywhere!
              </p>
            </div>

            {/* Sharon's Message */}
            <Card className="mb-6 border-purple-200 bg-purple-50">
              <CardContent className="p-4">
                <p className="text-purple-700 italic text-center">
                  "{SONG_DATA.specialMessage}"
                </p>
                <p className="text-xs text-purple-600 text-center mt-2 font-medium">
                  — Sharon 💜
                </p>
              </CardContent>
            </Card>

            {/* Listen Now Buttons */}
            <div className="space-y-3 mb-6">
              <h3 className="text-sm font-medium text-gray-700 text-center mb-2">
                🎧 Listen Now
              </h3>
              
              <button
                onClick={() => handleListen('spotify')}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-3 transition-all transform hover:scale-105"
              >
                <span className="text-2xl">🎵</span>
                <span className="font-medium">Listen on Spotify</span>
              </button>
              
              <button
                onClick={() => handleListen('apple')}
                className="w-full bg-gray-800 hover:bg-gray-900 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-3 transition-all transform hover:scale-105"
              >
                <span className="text-2xl">🎵</span>
                <span className="font-medium">Listen on Apple Music</span>
              </button>
              
              <button
                onClick={() => handleListen('youtube')}
                className="w-full bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-3 transition-all transform hover:scale-105"
              >
                <span className="text-2xl">📺</span>
                <span className="font-medium">Watch on YouTube</span>
              </button>
            </div>

            {/* Special Reward for Melody Seed Holders */}
            {hasMelodySeed && (
              <div className="bg-gradient-to-r from-indigo-100 to-purple-100 p-4 rounded-lg mb-4 border border-indigo-300">
                <h3 className="font-bold text-indigo-700 mb-2 text-center">
                  🎵 Melody Seed Holder Exclusive!
                </h3>
                {!specialRewardClaimed ? (
                  <Button 
                    onClick={handleClaimSpecialReward}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                  >
                    🎁 Claim Your Special Reward
                  </Button>
                ) : (
                  <p className="text-center text-indigo-700 text-sm">
                    ✅ Special
