// components/RecentBloomsTab.js - Fixed version with proper error handling
import { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { formatDistanceToNow } from 'date-fns';

export default function RecentBloomsTab({ onVisitGarden }) {
  const [blooms, setBlooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [indexBuilding, setIndexBuilding] = useState(false);

  useEffect(() => {
    loadRecentBlooms();
  }, []);

  const loadRecentBlooms = async () => {
    try {
      setLoading(true);
      setError(null);
      setIndexBuilding(false);

      // Strategy 1: Try the optimal query with index
      let bloomsData = [];
      
      try {
        const q = query(
          collection(db, 'flowers'),
          where('bloomed', '==', true),
          orderBy('bloomTime', 'desc'),
          limit(20)
        );

        const snapshot = await getDocs(q);
        bloomsData = await processBloomSnapshot(snapshot);
        
      } catch (indexError) {
        console.warn('Index-based query failed:', indexError);
        
        if (indexError.code === 'failed-precondition') {
          setIndexBuilding(true);
          
          // Strategy 2: Fallback - Get all bloomed flowers and sort client-side
          console.log('Using fallback strategy - client-side sorting');
          
          const fallbackQuery = query(
            collection(db, 'flowers'),
            where('bloomed', '==', true),
            limit(50) // Get more to sort client-side
          );
          
          const fallbackSnapshot = await getDocs(fallbackQuery);
          bloomsData = await processBloomSnapshot(fallbackSnapshot);
          
          // Sort client-side by bloom time
          bloomsData.sort((a, b) => {
            const timeA = a.bloomTime?.getTime() || 0;
            const timeB = b.bloomTime?.getTime() || 0;
            return timeB - timeA;
          });
          
          // Take only the most recent 20
          bloomsData = bloomsData.slice(0, 20);
        } else {
          throw indexError;
        }
      }

      setBlooms(bloomsData);
      
    } catch (error) {
      console.error('Error loading recent blooms:', error);
      setError(error.message);
      
      // Final fallback - show demo data
      setBlooms(getDemoBloomData());
      
    } finally {
      setLoading(false);
    }
  };

  const processBloomSnapshot = async (snapshot) => {
    const bloomsData = [];
    
    for (const doc of snapshot.docs) {
      try {
        const flowerData = doc.data();
        
        // Skip if missing essential data
        if (!flowerData.userId || !flowerData.type) continue;
        
        // Get owner information
        const ownerData = await getUserData(flowerData.userId);
        if (!ownerData) continue; // Skip if owner not found or private
        
        bloomsData.push({
          id: doc.id,
          ...flowerData,
          bloomTime: flowerData.bloomTime?.toDate() || new Date(flowerData.createdAt || Date.now()),
          owner: ownerData
        });
        
      } catch (docError) {
        console.warn('Error processing bloom document:', doc.id, docError);
        // Continue with next document
      }
    }
    
    return bloomsData;
  };

  const getUserData = async (userId) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) return null;
      
      const userData = userSnap.data();
      
      // Skip private users
      if (userData.public === false) return null;
      
      return {
        id: userId,
        username: userData.username,
        displayName: userData.displayName || userData.username,
        photoURL: userData.photoURL || null
      };
      
    } catch (error) {
      console.warn('Error fetching user data:', userId, error);
      return null;
    }
  };

  const getDemoBloomData = () => [
    {
      id: 'demo1',
      type: 'Hope',
      bloomedFlower: '🌻',
      note: 'Growing with hope and positivity!',
      bloomTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      owner: {
        id: 'demo-user1',
        username: 'hopeful_gardener',
        displayName: 'Demo Gardener 1',
        photoURL: null
      }
    },
    {
      id: 'demo2',
      type: 'Joy',
      bloomedFlower: '🌸',
      note: 'This flower represents my happiness!',
      bloomTime: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      owner: {
        id: 'demo-user2',
        username: 'joyful_soul',
        displayName: 'Demo Gardener 2',
        photoURL: null
      }
    }
  ];

  const getSafeImageUrl = (photoURL, displayName, username) => {
    // Handle broken image URLs
    if (!photoURL || photoURL.includes('photo.jpg') || photoURL === '') {
      const name = encodeURIComponent(displayName || username || 'User');
      return `https://ui-avatars.com/api/?name=${name}&background=a855f7&color=fff&size=40`;
    }
    return photoURL;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl animate-pulse mb-4">🌸</div>
        <p className="text-purple-700">Loading recent blooms...</p>
      </div>
    );
  }

  if (error && !indexBuilding) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">⚠️</div>
        <h3 className="text-xl font-semibold text-red-700 mb-2">
          Unable to load blooms
        </h3>
        <p className="text-gray-500 mb-4">
          There was an issue connecting to the database
        </p>
        <Button onClick={loadRecentBlooms} variant="outline">
          🔄 Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Index Building Notice */}
      {indexBuilding && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600">⚠️</span>
            <div>
              <p className="text-yellow-800 font-medium">Database Index Building</p>
              <p className="text-yellow-700 text-sm">
                We're building database indexes to improve performance. 
                Results may be limited temporarily.
              </p>
            </div>
          </div>
        </div>
      )}

      {blooms.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🌱</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No recent blooms
          </h3>
          <p className="text-gray-500">
            Plant some seeds and help the community grow!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blooms.map((bloom) => (
            <Card key={bloom.id} className="bg-white shadow-lg hover:shadow-xl transition-all">
              <CardContent className="p-6">
                
                {/* Bloom Display */}
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">
                    {bloom.bloomedFlower || '🌸'}
                    {bloom.specialSeed && <span className="text-sm">✨</span>}
                  </div>
                  <h3 className="text-lg font-semibold text-purple-700">
                    {bloom.type} Bloom
                  </h3>
                  {bloom.rarity && (
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                      bloom.rarity === 'rare' ? 'bg-yellow-100 text-yellow-800' :
                      bloom.rarity === 'rainbow' ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {bloom.rarity === 'rare' && '💎 Rare'}
                      {bloom.rarity === 'rainbow' && '🌈 Rainbow'}
                      {bloom.rarity === 'legendary' && '⭐ Legendary'}
                    </span>
                  )}
                </div>

                {/* Bloom Note */}
                {bloom.note && (
                  <div className="bg-gray-50 p-3 rounded-lg mb-4">
                    <p className="text-sm text-gray-700 italic text-center line-clamp-2">
                      "{bloom.note}"
                    </p>
                  </div>
                )}

                {/* Owner Info */}
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={getSafeImageUrl(bloom.owner.photoURL, bloom.owner.displayName, bloom.owner.username)}
                    alt="Owner"
                    className="w-8 h-8 rounded-full border border-purple-200"
                    onError={(e) => {
                      e.target.src = getSafeImageUrl('', bloom.owner.displayName, bloom.owner.username);
                    }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">by {bloom.owner.displayName}</p>
                    <p className="text-xs text-gray-500">@{bloom.owner.username}</p>
                  </div>
                </div>

                {/* Timing and Action */}
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-3">
                    Bloomed {formatDistanceToNow(bloom.bloomTime, { addSuffix: true })}
                  </p>
                  <Button
                    onClick={() => onVisitGarden(bloom.owner.username)}
                    size="sm"
                    className="w-full"
                  >
                    🌱 Visit Garden
                  </Button>
                </div>

                {/* Demo Badge */}
                {bloom.id.startsWith('demo') && (
                  <div className="mt-3 text-center">
                    <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-1 rounded-full">
                      Demo Data
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Refresh Button */}
      <div className="text-center pt-6">
        <Button onClick={loadRecentBlooms} variant="outline">
          🔄 Refresh Blooms
        </Button>
      </div>
    </div>
  );
}
