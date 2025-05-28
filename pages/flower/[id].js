// pages/flower/[id].js - Fixed Dynamic Routing Issue
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import SurpriseReward from '../../components/SurpriseReward';
import BloomAnimation from '../../components/BloomAnimation';
import { useWatering } from '../../utils/WateringManager';
import { NotificationManager } from '../../components/NotificationSystem';
import toast from 'react-hot-toast';

export default function EnhancedFlowerDetail() {
  const router = useRouter();
  const { id } = router.query;
  
  const [user, setUser] = useState(null);
  const [flower, setFlower] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReward, setShowReward] = useState(false);
  const [showBloomAnimation, setShowBloomAnimation] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  
  // Enhanced watering with proper error handling
  const { waterSeed, canWaterToday, isWatering, error: wateringError } = useWatering();

  // Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // FIXED: Wait for router to be ready and id to be available
  useEffect(() => {
    if (!router.isReady) return; // Wait for router to be ready
    if (!id || typeof id !== 'string') {
      setError('Invalid flower ID');
      setLoading(false);
      return;
    }
    
    loadFlowerData();
  }, [router.isReady, id]); // Added router.isReady dependency

  // Set share URL
  useEffect(() => {
    if (typeof window !== 'undefined' && id) {
      setShareUrl(`${window.location.origin}/flower/${id}`);
    }
  }, [id]);

  const loadFlowerData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);

      const flowerRef = doc(db, 'flowers', id);
      const flowerSnap = await getDoc(flowerRef);

      if (!flowerSnap.exists()) {
        setError('Flower not found');
        return;
      }

      const flowerData = { id: flowerSnap.id, ...flowerSnap.data() };
      
      // Check if flower is public (default to true for backward compatibility)
      if (flowerData.private === true && user?.uid !== flowerData.userId) {
        setError('This flower is private');
        return;
      }

      setFlower(flowerData);
      setIsOwner(user?.uid === flowerData.userId);

      // Load owner information if not already included
      if (!flowerData.ownerName) {
        await loadOwnerInfo(flowerData.userId);
      }

    } catch (err) {
      console.error('Error loading flower:', err);
      setError('Failed to load flower');
    } finally {
      setLoading(false);
    }
  };

  const loadOwnerInfo = async (userId) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setFlower(prev => ({
          ...prev,
          ownerName: userData.displayName || userData.username || 'Anonymous',
          ownerUsername: userData.username,
          ownerPhoto: userData.photoURL
        }));
      }
    } catch (err) {
      console.warn('Could not load owner info:', err);
    }
  };

  const handleWater = async () => {
    if (!user) {
      toast.error('Please sign in to water flowers');
      router.push('/auth');
      return;
    }

    if (!flower) return;

    try {
      // Use enhanced watering manager
      const result = await waterSeed(
        user.uid,
        flower.id,
        user.displayName || user.email || 'Anonymous',
        flower
      );

      if (result.bloomed) {
        // Show bloom animation
        setShowBloomAnimation(true);
        
        // Create notification for owner (if not self)
        if (!isOwner) {
          await NotificationManager.friendWateredNotification(
            flower.userId,
            user.displayName || 'A friend',
            flower.type
          );
        }
        
        // Update local state
        setFlower(prev => ({
          ...prev,
          waterCount: result.newWaterCount,
          bloomed: true,
          bloomedFlower: result.bloomedFlower || '🌸',
          bloomTime: new Date()
        }));
      } else {
        // Just update water count
        setFlower(prev => ({
          ...prev,
          waterCount: result.newWaterCount
        }));
        
        const remaining = 7 - result.newWaterCount;
        toast.success(`💧 Watered! ${remaining} more waters needed to bloom`);
      }

    } catch (err) {
      console.error('Watering failed:', err);
      toast.error(err.message || 'Failed to water flower');
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `${flower.type} Flower in Sharon's Garden`,
      text: `Help water this ${flower.type} flower! ${flower.note ? `"${flower.note}"` : ''}`,
      url: shareUrl
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard!');
      }
    } catch (err) {
      console.warn('Share failed:', err);
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard!');
      } catch (clipErr) {
        toast.error('Unable to share or copy link');
      }
    }
  };

  const handleBloomComplete = () => {
    setShowBloomAnimation(false);
    setShowReward(true);
  };

  const getFlowerEmoji = () => {
    if (flower.bloomed) {
      return flower.bloomedFlower || '🌸';
    }
    return flower.songSeed || flower.specialSeed ? '🎵' : '🌱';
  };

  const getProgressWidth = () => {
    return Math.min(((flower?.waterCount || 0) / 7) * 100, 100);
  };

  const canWaterSync = () => {
    if (!user || !flower) return false;
    if (flower.bloomed || (flower.waterCount >= 7)) return false;
    
    // Quick check - more thorough check happens in handleWater
    const today = new Date().toDateString();
    const lastWaterKey = `lastWatered_${flower.id}`;
    const lastWater = localStorage.getItem(lastWaterKey);
    return !lastWater || new Date(lastWater).toDateString() !== today;
  };

  // FIXED: Better loading and error states
  if (!router.isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-100 to-pink-100">
        <div className="text-center">
          <div className="text-4xl animate-pulse mb-4">🌼</div>
          <p className="text-purple-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (!id || typeof id !== 'string') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-100 to-pink-100 p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-red-700 mb-2">Invalid Flower Link</h1>
            <p className="text-gray-600 mb-6">
              This flower link is not valid or is missing information.
            </p>
            <div className="space-y-3">
              <Button onClick={() => router.push('/')} className="w-full">
                🏠 Go to Main Garden
              </Button>
              <Button onClick={() => router.push('/explore')} variant="outline" className="w-full">
                🌸 Explore Flowers
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-100 to-pink-100">
        <div className="text-center">
          <div className="text-4xl animate-pulse mb-4">🌼</div>
          <p className="text-purple-700">Loading flower...</p>
        </div>
      </div>
    );
  }

  if (error || !flower) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-100 to-pink-100 p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">🥀</div>
            <h1 className="text-2xl font-bold text-red-700 mb-2">
              {error || 'Flower Not Found'}
            </h1>
            <p className="text-gray-600 mb-6">
              This flower might be private, removed, or doesn't exist.
            </p>
            <div className="space-y-3">
              <Button onClick={() => router.push('/')} className="w-full">
                🏠 Go to Main Garden
              </Button>
              <Button onClick={() => router.push('/explore')} variant="outline" className="w-full">
                🌸 Explore Other Flowers
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-purple-100 to-pink-100 p-6">
        <div className="max-w-2xl mx-auto">
          
          {/* Back Button */}
          <Button 
            onClick={() => router.back()} 
            variant="outline" 
            className="mb-6"
          >
            ← Back
          </Button>

          {/* Main Flower Card */}
          <Card className="bg-white shadow-xl rounded-2xl overflow-hidden">
            <CardContent className="p-8">
              
              {/* Flower Display */}
              <div className="text-center mb-6">
                <div className="text-8xl mb-4 animate-bounce">
                  {getFlowerEmoji()}
                </div>
                
                <h1 className="text-3xl font-bold text-purple-700 mb-2">
                  {flower.type} {flower.bloomed ? 'Bloom' : 'Seed'}
                </h1>
                
                {flower.songSeed && (
                  <div className="inline-block bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium mb-2">
                    ✨ Special Song Seed
                  </div>
                )}
                
                {flower.rarity && (
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-2 ${
                    flower.rarity === 'rare' ? 'bg-yellow-100 text-yellow-800' :
                    flower.rarity === 'rainbow' ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800' :
                    flower.rarity === 'legendary' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {flower.rarity === 'rare' && '💎 Rare'}
                    {flower.rarity === 'rainbow' && '🌈 Rainbow'}
                    {flower.rarity === 'legendary' && '⭐ Legendary'}
                  </div>
                )}
              </div>

              {/* Owner Info */}
              <div className="text-center mb-6">
                {flower.ownerPhoto && (
                  <img 
                    src={flower.ownerPhoto} 
                    alt="Owner" 
                    className="w-12 h-12 rounded-full mx-auto mb-2 border-2 border-purple-200"
                  />
                )}
                <p className="text-sm text-gray-600">
                  Planted by <span className="font-medium text-purple-700">
                    {flower.ownerName || flower.name || 'Anonymous'}
                  </span>
                </p>
                {flower.ownerUsername && (
                  <p className="text-xs text-gray-500">@{flower.ownerUsername}</p>
                )}
              </div>

              {/* Flower Note */}
              {flower.note && (
                <div className="bg-purple-50 p-4 rounded-lg mb-6 text-center">
                  <p className="text-gray-700 italic">"{flower.note}"</p>
                </div>
              )}

              {/* Progress Section */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Watering Progress</span>
                  <span>{flower.waterCount || 0} / 7 waters</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ${
                      flower.songSeed ? 'bg-gradient-to-r from-indigo-400 to-purple-500' : 
                      'bg-gradient-to-r from-blue-400 to-green-500'
                    }`}
                    style={{ width: `${getProgressWidth()}%` }}
                  />
                </div>
                {flower.bloomed && (
                  <p className="text-green-600 text-sm font-medium mt-2 text-center">
                    🌸 This flower has bloomed!
                  </p>
                )}
              </div>

              {/* Sharon's Message (if bloomed) */}
              {flower.bloomed && flower.sharonMessage && (
                <div className="bg-pink-50 border border-pink-200 p-4 rounded-lg mb-6">
                  <h3 className="text-sm font-semibold text-pink-700 mb-2">💜 Message from Sharon:</h3>
                  <p className="text-pink-700 text-sm italic">"{flower.sharonMessage}"</p>
                </div>
              )}

              {/* Flower Language (if bloomed) */}
              {flower.bloomed && flower.flowerLanguage && (
                <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg mb-6">
                  <h3 className="text-sm font-semibold text-purple-700 mb-2">🌸 Flower Language:</h3>
                  <p className="text-purple-700 text-sm italic">"{flower.flowerLanguage}"</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-4">
                {!flower.bloomed ? (
                  <Button
                    onClick={handleWater}
                    disabled={isWatering || !canWaterSync()}
                    className="w-full py-3 text-lg"
                  >
                    {isWatering ? (
                      '💧 Watering...'
                    ) : !canWaterSync() ? (
                      '✅ Watered Today - Come Back Tomorrow'
                    ) : (
                      `💧 Water This ${flower.type} (${7 - (flower.waterCount || 0)} more needed)`
                    )}
                  </Button>
                ) : (
                  <div className="text-center">
                    <p className="text-green-600 font-medium mb-4">
                      🌸 This flower has bloomed! Thank you for helping it grow!
                    </p>
                    {flower.rewardLink && (
                      <Button
                        onClick={() => window.open(flower.rewardLink, '_blank')}
                        className="mb-4"
                      >
                        🎁 Claim Bloom Reward
                      </Button>
                    )}
                  </div>
                )}

                {/* Share Button */}
                <Button
                  onClick={handleShare}
                  variant="outline"
                  className="w-full"
                >
                  📱 Share This Flower
                </Button>

                {/* Visit Garden Button */}
                {flower.ownerUsername && (
                  <Button
                    onClick={() => router.push(`/u/${flower.ownerUsername}/garden`)}
                    variant="outline"
                    className="w-full"
                  >
                    🌱 Visit {flower.ownerName || flower.ownerUsername}'s Garden
                  </Button>
                )}
              </div>

              {/* Bloom Date */}
              {flower.bloomed && flower.bloomTime && (
                <div className="text-center mt-6 pt-6 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Bloomed on {new Date(flower.bloomTime.toDate?.() || flower.bloomTime).toLocaleDateString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Info */}
          {flower.createdAt && (
            <div className="text-center mt-6">
              <p className="text-sm text-gray-500">
                Planted {new Date(flower.createdAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bloom Animation */}
      {showBloomAnimation && (
        <BloomAnimation
          flower={flower}
          seedType={flower.seedTypeData}
          onComplete={handleBloomComplete}
          userName={user?.displayName || 'Gardener'}
          personalMessage={flower.note}
        />
      )}

      {/* Reward Modal */}
      {showReward && (
        <SurpriseReward
          onClose={() => setShowReward(false)}
        />
      )}
    </>
  );
}
