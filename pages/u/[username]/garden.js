// pages/u/[username]/garden.js - Enhanced Friend Garden with Watering
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
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import toast from 'react-hot-toast';
import Link from 'next/link';
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
        // Find user by username
        const userQuery = query(
          collection(db, 'users'),
          where('username', '==', username)
        );
        const userSnap = await getDocs(userQuery);

        if (userSnap.empty) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const userDoc = userSnap.docs[0];
        const userId = userDoc.id;
        const userData = userDoc.data();

        // Check if garden is public
        if (userData.gardenPrivacy === 'private' && currentUser?.uid !== userId) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        setGardenOwner({
          id: userId,
          ...userData,
          isOwnGarden: currentUser?.uid === userId
        });

        // Fetch user's flowers
        const flowerQuery = query(
          collection(db, 'flowers'),
          where('userId', '==', userId),
          where('bloomed', '==', false) // Only show growing seeds
        );
        const flowerSnap = await getDocs(flowerQuery);
        const flowerData = flowerSnap.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        setSeeds(flowerData);

        // Fetch watering history for each seed
        const history = {};
        let totalHelps = 0;
        const uniqueHelpers = new Set();

        for (const seed of flowerData) {
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
      await NotificationManager.friendWateredNotification(
        gardenOwner.id,
        currentUser.displayName || 'A friend',
        seed.type
      );

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-200 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl animate-pulse mb-4">🌱</div>
          <p className="text-purple-700">Loading garden...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-200 flex items-center justify-center p-6">
        <div className="text-center bg-white rounded-xl p-8 shadow-lg max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-purple-700 mb-2">Garden Not Found</h1>
          <p className="text-gray-600 mb-4">
            This garden might be private or the username doesn't exist.
          </p>
          <Link href="/">
            <Button>🏠 Go to Main Garden</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isOwnGarden = gardenOwner.isOwnGarden;
  const growingSeeds = seeds.filter(s => !s.bloomed);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-teal-100 p-6">
      {/* Header */}
      <div className="mb-8 text-center">
        {gardenOwner.photoURL && (
          <img
            src={gardenOwner.photoURL}
            alt={gardenOwner.displayName}
            className="mx-auto rounded-full w-24 h-24 mb-3 border-4 border-white shadow-lg"
          />
        )}
        <h1 className="text-3xl font-bold text-green-700">
          🌼 {gardenOwner.displayName || gardenOwner.username}'s Garden
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          @{gardenOwner.username}
        </p>
        
        {/* Garden Stats */}
        <div className="flex justify-center gap-4 mt-4 text-sm">
          <div className="bg-white px-3 py-1 rounded-full shadow">
            🌱 Growing: {growingSeeds.length}
          </div>
          <div className="bg-white px-3 py-1 rounded-full shadow">
            🤝 Helpers: {stats.uniqueHelpers}
          </div>
          <div className="bg-white px-3 py-1 rounded-full shadow">
            💧 Total Helps: {stats.totalHelps}
          </div>
        </div>

        {isOwnGarden && (
          <div className="mt-4 bg-yellow-100 border border-yellow-300 rounded-lg p-3 max-w-md mx-auto">
            <p className="text-yellow-800 text-sm">
              👋 This is your garden! Share the link with friends so they can help water your seeds.
            </p>
            <Button
              onClick={() => {
                const url = window.location.href;
                navigator.clipboard.writeText(url);
                toast.success('Garden link copied!');
              }}
              variant="outline"
              className="mt-2 text-sm"
            >
              📋 Copy Garden Link
            </Button>
          </div>
        )}
      </div>

      {/* Seeds Grid */}
      {growingSeeds.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🌻</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            No seeds growing right now
          </h2>
          <p className="text-gray-600">
            {isOwnGarden 
              ? "Plant some seeds in the main garden!" 
              : "Check back later when they plant new seeds!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {growingSeeds.map((seed) => {
            const helpers = wateringHistory[seed.id] || [];
            const canWater = !isOwnGarden && canWaterToday(seed.id);
            const seedType = seed.seedTypeData || {};
            
            return (
              <Card key={seed.id} className="bg-white shadow-lg rounded-xl overflow-hidden hover:shadow-xl transition-all">
                <CardContent className="p-5">
                  {/* Seed Display */}
                  <div className="text-center mb-4">
                    <div className="text-5xl mb-2">
                      {seed.songSeed ? '🎵' : seedType.emoji || '🌱'}
                    </div>
                    <h3 className="text-xl font-semibold text-purple-700">
                      {seed.type} Seed
                    </h3>
                    {seedType.name && (
                      <p className="text-xs text-gray-500 mt-1">
                        {seedType.name}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 mt-1">
                      by {seed.name || 'Anonymous'}
                    </p>
                  </div>

                  {/* Note */}
                  {seed.note && (
                    <div className="bg-gray-50 p-3 rounded-lg mb-4">
                      <p className="text-sm text-gray-700 italic">
                        "{seed.note}"
                      </p>
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{seed.waterCount || 0} / 7 waters</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all"
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
                    <div className="border-t pt-3">
                      <p className="text-xs text-gray-600 mb-2">
                        💧 Watered by:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {helpers.slice(-5).map((helper, idx) => (
                          <span 
                            key={idx}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full"
                          >
                            {helper.wateredByUsername || 'Friend'}
                          </span>
                        ))}
                        {helpers.length > 5 && (
                          <span className="text-xs text-gray-500">
                            +{helpers.length - 5} more
                          </span>
                        )}
                      </div>
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
        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            Want to grow your own garden?
          </p>
          <Link href="/">
            <Button>🌱 Start Your Garden</Button>
          </Link>
        </div>
      )}

      {/* Sign In Prompt */}
      {!currentUser && !isOwnGarden && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <p className="text-gray-700">
              Sign in to help water {gardenOwner.displayName}'s seeds!
            </p>
            <Link href="/auth">
              <Button>Sign In</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
