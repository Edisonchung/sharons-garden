// pages/u/[username]/timeline.js - Debug Version with Enhanced Error Handling
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';

export default function DebugPublicTimelinePage() {
  const router = useRouter();
  const { username } = router.query;

  const [timeline, setTimeline] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [debugInfo, setDebugInfo] = useState([]);
  const [error, setError] = useState(null);

  // Debug function to add messages
  const addDebug = (message, data = null) => {
    console.log(`🐛 [Timeline Debug] ${message}`, data);
    setDebugInfo(prev => [...prev, { 
      time: new Date().toLocaleTimeString(), 
      message, 
      data: data ? JSON.stringify(data, null, 2) : null 
    }]);
  };

  useEffect(() => {
    if (!username) {
      addDebug('No username provided in router.query');
      return;
    }

    addDebug('Starting timeline fetch', { username });

    const fetchPublicTimeline = async () => {
      try {
        setLoading(true);
        setError(null);
        setNotFound(false);

        addDebug('Step 1: Searching for user by username');
        
        // Find user by username
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username));
        
        addDebug('Step 2: Executing user query', { 
          collection: 'users', 
          username 
        });
        
        const snapshot = await getDocs(q);
        
        addDebug('Step 3: User query results', { 
          empty: snapshot.empty, 
          size: snapshot.size,
          docs: snapshot.docs.length 
        });

        if (snapshot.empty) {
          addDebug('❌ No user found with username', { username });
          setNotFound(true);
          return;
        }

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        addDebug('Step 4: User found', { 
          userId, 
          userData: {
            username: userData.username,
            displayName: userData.displayName,
            timelinePublic: userData.timelinePublic,
            public: userData.public
          }
        });

        // Check if timeline is public
        const isTimelinePublic = userData.timelinePublic !== false; // Default to true if not set
        const isProfilePublic = userData.public !== false; // Default to true if not set
        
        addDebug('Step 5: Privacy check', { 
          timelinePublic: isTimelinePublic,
          profilePublic: isProfilePublic,
          originalTimelinePublic: userData.timelinePublic,
          originalPublic: userData.public
        });

        if (!isTimelinePublic && !isProfilePublic) {
          addDebug('❌ Timeline is private');
          setNotFound(true);
          return;
        }

        setProfile({
          id: userId,
          name: userData.displayName || username,
          avatar: userData.photoURL || '',
          joined: userData.joinedAt?.toDate?.().toLocaleDateString() || 'N/A',
          username: userData.username
        });

        addDebug('Step 6: Profile set, loading timeline data');

        // Fetch flowers (simplified for debugging)
        try {
          addDebug('Step 7: Querying flowers collection');
          
          const flowerQuery = query(
            collection(db, 'flowers'),
            where('userId', '==', userId),
            where('bloomed', '==', true)
          );
          
          const flowersSnap = await getDocs(flowerQuery);
          
          addDebug('Step 8: Flowers query result', { 
            size: flowersSnap.size,
            docs: flowersSnap.docs.length 
          });

          const activities = [];

          // Process flowers
          flowersSnap.docs.forEach((doc, index) => {
            const data = doc.data();
            addDebug(`Processing flower ${index + 1}`, {
              id: doc.id,
              type: data.type,
              bloomed: data.bloomed,
              bloomTime: data.bloomTime
            });
            
            activities.push({
              id: doc.id,
              type: 'bloom',
              timestamp: data.bloomTime?.toDate() || new Date(data.createdAt || Date.now()),
              title: `🌸 Bloomed a ${data.type}`,
              description: data.note || '',
              metadata: {
                flowerType: data.type,
                bloomedFlower: data.bloomedFlower,
                waterCount: data.waterCount
              }
            });
          });

          addDebug('Step 9: Activities processed', { 
            totalActivities: activities.length 
          });

          // Sort by timestamp
          const sortedActivities = activities.sort((a, b) => b.timestamp - a.timestamp);
          setTimeline(sortedActivities);

          addDebug('✅ Timeline loaded successfully', { 
            finalCount: sortedActivities.length 
          });

        } catch (flowerError) {
          addDebug('❌ Error loading flowers', flowerError);
          console.error('Flower query error:', flowerError);
          // Continue even if flowers fail
          setTimeline([]);
        }

      } catch (err) {
        addDebug('❌ Main error in fetchPublicTimeline', err);
        console.error('Failed to load public timeline:', err);
        setError(err.message);
        setNotFound(true);
      } finally {
        setLoading(false);
        addDebug('🏁 Timeline fetch completed');
      }
    };

    fetchPublicTimeline();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <div className="text-4xl animate-pulse mb-4">⏳</div>
            <p className="text-indigo-700">Loading timeline for @{username}...</p>
          </div>
          
          {/* Debug Console */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <h3 className="font-bold mb-2">🐛 Debug Console</h3>
              <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-64 overflow-y-auto">
                {debugInfo.map((debug, i) => (
                  <div key={i} className="mb-1">
                    <span className="text-gray-500">[{debug.time}]</span> {debug.message}
                    {debug.data && (
                      <pre className="text-xs text-yellow-400 ml-4">{debug.data}</pre>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-red-700 mb-2">Timeline Not Available</h1>
            <p className="text-gray-600 mb-4">
              User not found or timeline is private for @{username}
            </p>
            {error && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-4">
                <p className="text-red-700 text-sm">Error: {error}</p>
              </div>
            )}
          </div>

          {/* Debug Console */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <h3 className="font-bold mb-2">🐛 Debug Information</h3>
              <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
                {debugInfo.map((debug, i) => (
                  <div key={i} className="mb-2">
                    <span className="text-gray-500">[{debug.time}]</span> {debug.message}
                    {debug.data && (
                      <pre className="text-xs text-yellow-400 ml-4 whitespace-pre-wrap">{debug.data}</pre>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Troubleshooting Steps */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-bold text-purple-700 mb-4">🔧 Troubleshooting Steps</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <span>1️⃣</span>
                  <div>
                    <strong>Check if user exists:</strong>
                    <p className="text-gray-600">Go to Firebase Console → Firestore → users collection</p>
                    <p className="text-gray-600">Search for username: <code className="bg-gray-100 px-1 rounded">{username}</code></p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <span>2️⃣</span>
                  <div>
                    <strong>Check privacy settings:</strong>
                    <p className="text-gray-600">User document should have <code className="bg-gray-100 px-1 rounded">timelinePublic: true</code></p>
                    <p className="text-gray-600">Or <code className="bg-gray-100 px-1 rounded">public: true</code></p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <span>3️⃣</span>
                  <div>
                    <strong>Check Firestore rules:</strong>
                    <p className="text-gray-600">Make sure users collection allows reads when public=true</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <span>4️⃣</span>
                  <div>
                    <strong>Check flowers data:</strong>
                    <p className="text-gray-600">User should have flowers with bloomed=true</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center mt-6">
            <Button onClick={() => router.push('/')}>
              🏠 Go to Main Garden
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Success Header */}
        <div className="text-center mb-6">
          {profile?.avatar && (
            <img 
              src={profile.avatar} 
              alt={profile.name} 
              className="mx-auto w-20 h-20 rounded-full border-4 border-white shadow-lg mb-3" 
            />
          )}
          <h1 className="text-2xl font-bold text-indigo-700">
            📖 {profile?.name}'s Timeline
          </h1>
          <p className="text-sm text-gray-600">
            @{profile?.username} • Joined: {profile?.joined}
          </p>
        </div>

        {/* Debug Console (for successful loads too) */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <h3 className="font-bold mb-2">🐛 Debug Console</h3>
            <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-32 overflow-y-auto">
              {debugInfo.slice(-5).map((debug, i) => (
                <div key={i} className="mb-1">
                  <span className="text-gray-500">[{debug.time}]</span> {debug.message}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <div className="space-y-4">
          {timeline.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-4">🌱</div>
                <h3 className="font-semibold mb-2">No activities yet</h3>
                <p className="text-gray-600">This user hasn't bloomed any flowers yet.</p>
              </CardContent>
            </Card>
          ) : (
            timeline.map((item, index) => (
              <Card key={item.id || index}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">🌸</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-700">{item.title}</h3>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      )}
                      <div className="text-xs text-gray-500 mt-2">
                        {item.timestamp.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
