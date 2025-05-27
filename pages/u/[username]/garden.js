// pages/u/[username]/garden.js - Updated with Unified Navigation
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { auth, db } from '../../../lib/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  getDoc,
  addDoc,
  arrayUnion,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { PublicProfileLayout, getCurrentPageFromPath } from '../../../components/PublicProfileLayout';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import toast from 'react-hot-toast';
import { NotificationManager } from '../../../components/NotificationSystem';

export default function FriendGardenPage() {
  const router = useRouter();
  const { username } = router.query;
  
  const [currentUser, setCurrentUser] = useState(null);
  const [gardenOwner, setGardenOwner] = useState(null);
  const [seeds, setSeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isWatering, setIsWatering] = useState(false);
  const [wateringHistory, setWateringHistory] = useState({});
  const [stats, setStats] = useState({ totalHelps: 0, uniqueHelpers: 0 });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!username) return;

    const fetchGarden = async () => {
      try {
        setLoading(true);
        setNotFound(false);

        // Find user by username
        const userQuery = query(
          collection(db, 'users'),
          where('username', '==', username)
        );
        const userSnap = await getDocs(userQuery);

        if (userSnap.empty) {
          setNotFound(true);
          return;
        }

        const userDoc = userSnap.docs[0];
        const userId = userDoc.id;
        const userData = userDoc.data();

        // Check if garden is public
        if (userData.gardenPrivacy === 'private' && currentUser?.uid !== userId) {
          setNotFound(true);
          return;
        }

        // Enhanced profile data for the layout
        const profileData = {
          id: userId,
          username: userData.username,
          displayName: userData.displayName || username,
          photoURL: userData.photoURL || '',
          bio: userData.bio || '',
          joinedDate: userData.joinedAt?.toDate?.().toLocaleDateString() || 'N/A',
          isVerified: userData.verified || false,
          isOwnGarden: currentUser?.uid === userId,
          stats: {
            badges: (userData.badges || []).length,
            blooms: 0, // Will be calculated below
            helped: 0  // Will be calculated below
          }
        };

        setGardenOwner(profileData);

        // Fetch user's flowers (both growing and bloomed for stats)
        const allFlowersQuery = query(
          collection(db, 'flowers'),
          where('userId', '==', userId)
        );
        const allFlowersSnap = await getDocs(allFlowersQuery);
        const allFlowers = allFlowersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Separate growing seeds for display
        const growingSeeds = allFlowers.filter(f => !f.bloomed);
        setSeeds(growingSeeds);

        // Calculate stats
        const bloomedFlowers = allFlowers.filter(f => f.bloomed);
        await loadGardenStats(userId, profileData, bloomedFlowers.length);

        // Fetch watering history for each seed
        const history = {};
        let totalHelps = 0;
        const uniqueHelpers = new Set();

        for (const seed of growingSeeds) {
          try {
            const wateringQuery = query(
              collection(db, 'waterings'),
              where('seedId', '==', seed.id)
            );
            const wateringSnap = await getDocs(wateringQuery);
            const waterers = wateringSnap.docs.map(doc => doc.data());
            history[seed.id] = waterers;
            
            // Calculate stats
            waterers.forEach(w => {
              if (w.wateredByUserId !== userId) {
                totalHelps++;
                uniqueHelpers.add(w.wateredByUserId);
              }
            });
          } catch (err) {
            console.warn('Could not load watering history for seed:', seed.id);
            history[seed.id] = [];
          }
        }
        
        setWateringHistory(history);
        setStats({ 
          totalHelps, 
          uniqueHelpers: uniqueHelpers.size 
        });

      } catch (err) {
        console.error('Failed to fetch friend garden:', err);
        toast.error('Failed to load garden');
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchGarden();
  }, [username, currentUser]);

  const loadGardenStats = async (userId, profileData, bloomCount) => {
    try {
      // Get watering activities to calculate help stats
      const wateringsSnap = await getDocs(query(
        collection(db, 'waterings'),
        where('wateredByUserId', '==', userId)
      ));

      // Update profile stats
      const updatedStats = {
        ...profileData.stats,
        blooms: bloomCount,
        helped: wateringsSnap.size
      };

      setGardenOwner(prev => ({
        ...prev,
        stats: updatedStats
      }));

    } catch (error) {
      console.error('Error loading garden stats:', error);
    }
  };

  const canWaterToday = (seedId) => {
    if (!currentUser) return false;
    
    const today = new Date().toDateString();
    const lastKey = `friendWatered_${currentUser.uid}_${seedId}`;
    const last = localStorage.getItem(lastKey);
    
    return !last || new Date(last).toDateString() !== today;
  };

  const handleWater = async (seed) => {
    if (!currentUser) {
      toast.error('Please sign in to water seeds');
      router.push('/auth');
      return;
    }

    if (gardenOwner.isOwnGarden) {
      toast.error("You can't water your own seeds here! Go to My Garden.");
      return;
    }

    if (!canWaterToday(seed.id)) {
      toast.error('You already watered this seed today! Come back tomorrow 🌙');
      return;
    }

    setIsWatering(true);

    try {
      // Update seed water count
      const seedRef = doc(db, 'flowers', seed.id);
      const seedSnap = await getDoc(seedRef);
      
      if (!seedSnap.exists()) {
        throw new Error('Seed not found');
      }

      const seedData = seedSnap.data();
      const newWaterCount = (seedData.waterCount || 0) + 1;
      const nowBloomed = newWaterCount >= 7;

      // Update seed
      const updateData = {
        waterCount: newWaterCount,
        lastWatered: serverTimestamp(),
        lastWateredBy: currentUser.displayName || currentUser.email,
        lastWateredById: currentUser.uid
      };

      if (nowBloomed && !seedData.bloomed) {
        updateData.bloomed = true;
        updateData.bloomedFlower = seedData.bloomedFlower || '🌸';
        updateData.bloomTime = serverTimestamp();
        updateData.friendHelped = true;
      }

      await updateDoc(seedRef, updateData);

      // Log watering event
      await addDoc(collection(db, 'waterings'), {
        seedId: seed.id,
        seedOwnerId: gardenOwner.id,
        seedOwnerName: gardenOwner.displayName || gardenOwner.username,
        wateredByUserId: currentUser.uid,
        wateredByUsername: currentUser.displayName || currentUser.email,
        timestamp: serverTimestamp(),
        resultedInBloom: nowBloomed
      });

      // Update helper stats
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        helpedWaterCount: increment(1),
        lastHelpedDate: serverTimestamp()
      });

      // Create notification for garden owner
      try {
        await NotificationManager.friendWateredNotification(
          gardenOwner.id,
          currentUser.displayName || 'A friend',
          seed.type
        );
      } catch (notifError) {
        console.warn('Notification failed:', notifError);
      }

      // Mark as watered today (client-side)
      const lastKey = `friendWatered_${currentUser.uid}_${seed.id}`;
      localStorage.setItem(lastKey, new Date().toISOString());

      if (nowBloomed) {
        toast.success(`🌸 Amazing! You helped this ${seed.type} bloom!`);
      } else {
        toast.success(`💧 Watered successfully! ${newWaterCount}/7 waters`);
      }

      // Refresh the page data
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (err) {
      console.error('Watering failed:', err);
      toast.error('Failed to water seed. Please try again.');
    } finally {
      setIsWatering(false);
    }
  };

  const currentPage = getCurrentPageFromPath(router.pathname);
  const isOwnGarden = gardenOwner?.isOwnGarden;
  const growingSeeds = seeds.filter(s => !s.bloomed);

  return (
    <PublicProfileLayout 
      username={username} 
      userData={gardenOwner} 
      currentPage={currentPage}
      loading={loading}
      notFound={notFound}
    >
      {/* Page Content */}
      <div className="space-y-6">
        
        {/* Garden Welcome Message */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-green-700 dark:text-green-400 mb-2">
            🌼 Garden Visit
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {isOwnGarden 
              ? "This is your garden! Share the link with friends so they can help water your seeds."
              : `Help ${gardenOwner?.displayName} grow their emotional garden!`
            }
          </p>
        </div>

        {/* Garden Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow">
            <div className="text-2xl font-bold text-green-600">{growingSeeds.length}</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Growing Seeds</p>
          </div>
          <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow">
            <div className="text-2xl font-bold text-blue-600">{stats.uniqueHelpers}</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Helpers</p>
          </div>
          <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow">
            <div className="text-2xl font-bold text-purple-600">{stats.totalHelps}</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Helps</p>
          </div>
          <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow">
            <div className="text-2xl font-bold text-orange-600">{gardenOwner?.stats?.blooms || 0}</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Blooms</p>
          </div>
        </div>

        {/* Own Garden Message */}
        {isOwnGarden && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
            <div className="text-center">
              <p className="text-yellow-800 dark:text-yellow-200 text-sm mb-3">
                👋 This is your garden! Share the link with friends so they can help water your seeds.
              </p>
              <Button
                onClick={() => {
                  const url = window.location.href;
                  navigator.clipboard.writeText(url);
                  toast.success('Garden link copied!');
                }}
                variant="outline"
                size="sm"
              >
                📋 Copy Garden Link
              </Button>
            </div>
          </div>
        )}

        {/* Seeds Grid */}
        {growingSeeds.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🌻</div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No seeds growing right now
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {isOwnGarden 
                ? "Plant some seeds in the main garden!" 
                : "Check back later when they plant new seeds!"}
            </p>
            {isOwnGarden && (
              <Button onClick={() => router.push('/')}>
                🌱 Plant New Seeds
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {growingSeeds.map((seed) => {
              const helpers = wateringHistory[seed.id] || [];
              const canWater = !isOwnGarden && canWaterToday(seed.id);
              const seedType = seed.seedTypeData || {};
              
              return (
                <Card key={seed.id} className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden hover:shadow-xl transition-all">
                  <CardContent className="p-5">
                    {/* Special Badge */}
                    {seed.songSeed && (
                      <div className="absolute -top-2 -right-2 bg-indigo-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                        ✨ Special
                      </div>
                    )}
                    
                    {/* Seed Display */}
                    <div className="text-center mb-4">
                      <div className="text-5xl mb-2">
                        {seed.songSeed ? '🎵' : seedType.emoji || '🌱'}
                      </div>
                      <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300">
                        {seed.type} Seed
                      </h3>
                      {seedType.name && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {seedType.name}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        by {seed.name || 'Anonymous'}
                      </p>
                    </div>

                    {/* Note */}
                    {seed.note && (
                      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mb-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300 italic text-center">
                          "{seed.note}"
                        </p>
                      </div>
                    )}

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>{seed.waterCount || 0} / 7 waters</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full transition-all ${
                            seed.songSeed ? 'bg-gradient-to-r from-indigo-400 to-purple-500' : 
                            'bg-gradient-to-r from-blue-400 to-blue-600'
                          }`}
                          style={{ width: `${((seed.waterCount || 0) / 7) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Water Button */}
                    {!isOwnGarden && (
                      <Button
                        onClick={() => handleWater(seed)}
                        disabled={isWatering || !canWater}
                        className="w-full mb-3"
                        variant={canWater ? 'default' : 'outline'}
                      >
                        {isWatering ? '💧 Watering...' : 
                         canWater ? '💧 Water This Seed' : '✅ Watered Today'}
                      </Button>
                    )}

                    {/* Helpers List */}
                    {helpers.length > 0 && (
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          💧 Recent helpers:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {helpers.slice(-5).map((helper, idx) => (
                            <span 
                              key={idx}
                              className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full"
                            >
                              {helper.wateredByUsername || 'Friend'}
                            </span>
                          ))}
                          {helpers.length > 5 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              +{helpers.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Special Seed Info */}
                    {seed.songSeed && (
                      <div className="mt-3 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-700">
                        <p className="text-xs text-indigo-700 dark:text-indigo-300 text-center">
                          🎵 Special melody seed - blooms with Sharon's song launch!
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Call to Action */}
        {!isOwnGarden && currentUser && (
          <div className="text-center bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-2">
              🌱 Want to grow your own garden?
            </h3>
            <p className="text-purple-600 dark:text-purple-400 mb-4">
              Start your own emotional gardening journey and connect with Sharon!
            </p>
            <Button onClick={() => router.push('/')}>
              🌸 Start Your Garden
            </Button>
          </div>
        )}

        {/* Sign In Prompt */}
        {!currentUser && !isOwnGarden && (
          <div className="bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700 rounded-xl p-6 text-center">
            <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-2">
              💧 Join the Community
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Sign in to help water {gardenOwner?.displayName}'s seeds and start your own garden!
            </p>
            <Button onClick={() => router.push('/auth')}>
              🌱 Sign In to Help
            </Button>
          </div>
        )}
      </div>
    </PublicProfileLayout>
  );
}
