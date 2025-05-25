// components/FriendWateringSystem.js
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { auth, db } from '../lib/firebase';
import { 
  doc, 
  updateDoc, 
  arrayUnion, 
  increment,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore';
import toast from 'react-hot-toast';

// Component for displaying who helped water
export function WateringHelpers({ seedId, ownerId }) {
  const [helpers, setHelpers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHelpers = async () => {
      try {
        const q = query(
          collection(db, 'waterings'),
          where('seedId', '==', seedId),
          where('wateredByUserId', '!=', ownerId),
          orderBy('timestamp', 'desc'),
          limit(10)
        );
        
        const snap = await getDocs(q);
        const helperData = snap.docs.map(doc => doc.data());
        setHelpers(helperData);
      } catch (err) {
        console.error('Failed to fetch helpers:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHelpers();
  }, [seedId, ownerId]);

  if (loading) return <div className="text-xs text-gray-500">Loading helpers...</div>;
  if (helpers.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <p className="text-xs text-gray-600 mb-2 font-medium">
        🤝 Friends who helped:
      </p>
      <div className="flex flex-wrap gap-1">
        {helpers.slice(0, 5).map((helper, idx) => (
          <span 
            key={idx}
            className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full"
          >
            💧 {helper.wateredByUsername || 'Friend'}
          </span>
        ))}
        {helpers.length > 5 && (
          <span className="text-xs text-gray-500 px-2 py-1">
            +{helpers.length - 5} more
          </span>
        )}
      </div>
    </div>
  );
}

// Share link generator component
export function ShareGardenLink({ username }) {
  const [copied, setCopied] = useState(false);
  
  const shareUrl = `${process.env.NEXT_PUBLIC_SHARE_BASE_URL || window.location.origin}/u/${username}/garden`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Garden link copied! Share with friends 🌱');
    
    setTimeout(() => setCopied(false), 3000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Help water my garden! 🌱`,
          text: `I'm growing an emotional garden with Sharon. Can you help water my seeds? 💧`,
          url: shareUrl
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-purple-700 mb-2">
          🔗 Share Your Garden
        </h3>
        <p className="text-xs text-gray-600 mb-3">
          Friends can visit your garden and help water your seeds!
        </p>
        
        <div className="flex gap-2">
          <Button
            onClick={handleShare}
            className="flex-1 text-sm"
            variant="default"
          >
            📤 Share
          </Button>
          <Button
            onClick={handleCopy}
            className="flex-1 text-sm"
            variant="outline"
          >
            {copied ? '✅ Copied!' : '📋 Copy Link'}
          </Button>
        </div>
        
        <div className="mt-3 p-2 bg-white rounded text-xs text-gray-500 break-all">
          {shareUrl}
        </div>
      </CardContent>
    </Card>
  );
}

// Friend activity feed
export function FriendActivityFeed({ userId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        // Get recent waterings by friends
        const wateringQuery = query(
          collection(db, 'waterings'),
          where('seedOwnerId', '==', userId),
          orderBy('timestamp', 'desc'),
          limit(20)
        );
        
        const snap = await getDocs(wateringQuery);
        const activityData = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: 'watering'
        }));
        
        setActivities(activityData);
      } catch (err) {
        console.error('Failed to fetch activities:', err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchActivities();
    }
  }, [userId]);

  if (loading) return <div className="text-center py-4">Loading activity...</div>;
  if (activities.length === 0) return null;

  return (
    <Card className="bg-white shadow-md">
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold text-purple-700 mb-3">
          🌊 Friend Activity
        </h3>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {activities.map((activity) => (
            <div 
              key={activity.id}
              className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 transition-colors"
            >
              <div className="text-2xl">💧</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700">
                  <span className="font-medium text-purple-600">
                    {activity.wateredByUsername || 'A friend'}
                  </span>
                  {' watered your '}
                  <span className="font-medium">
                    {activity.seedType || 'seed'}
                  </span>
                  {activity.resultedInBloom && (
                    <span className="text-green-600 font-medium"> and it bloomed! 🌸</span>
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  {activity.timestamp?.toDate ? 
                    new Date(activity.timestamp.toDate()).toLocaleString() : 
                    'Recently'
                  }
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Friend stats component
export function FriendGardenStats({ userId }) {
  const [stats, setStats] = useState({
    totalHelpsReceived: 0,
    totalHelpsGiven: 0,
    uniqueHelpers: 0,
    friendsHelped: 0,
    mostHelpfulFriend: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!userId) return;

      try {
        // Get helps received
        const receivedQuery = query(
          collection(db, 'waterings'),
          where('seedOwnerId', '==', userId),
          where('wateredByUserId', '!=', userId)
        );
        const receivedSnap = await getDocs(receivedQuery);
        
        const helperMap = new Map();
        receivedSnap.docs.forEach(doc => {
          const data = doc.data();
          const helperId = data.wateredByUserId;
          if (helperId) {
            const current = helperMap.get(helperId) || {
              name: data.wateredByUsername,
              count: 0
            };
            current.count++;
            helperMap.set(helperId, current);
          }
        });

        // Get helps given
        const givenQuery = query(
          collection(db, 'waterings'),
          where('wateredByUserId', '==', userId),
          where('seedOwnerId', '!=', userId)
        );
        const givenSnap = await getDocs(givenQuery);
        
        const friendsHelpedSet = new Set();
        givenSnap.docs.forEach(doc => {
          const data = doc.data();
          if (data.seedOwnerId) {
            friendsHelpedSet.add(data.seedOwnerId);
          }
        });

        // Find most helpful friend
        let mostHelpful = null;
        let maxHelps = 0;
        helperMap.forEach((data, helperId) => {
          if (data.count > maxHelps) {
            maxHelps = data.count;
            mostHelpful = data;
          }
        });

        setStats({
          totalHelpsReceived: receivedSnap.size,
          totalHelpsGiven: givenSnap.size,
          uniqueHelpers: helperMap.size,
          friendsHelped: friendsHelpedSet.size,
          mostHelpfulFriend: mostHelpful
        });

      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId]);

  if (loading) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
        <CardContent className="p-4 text-center">
          <div className="text-3xl font-bold text-blue-700">
            {stats.totalHelpsReceived}
          </div>
          <p className="text-xs text-blue-600 mt-1">
            Waters Received
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-green-50 to-green-100">
        <CardContent className="p-4 text-center">
          <div className="text-3xl font-bold text-green-700">
            {stats.totalHelpsGiven}
          </div>
          <p className="text-xs text-green-600 mt-1">
            Waters Given
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
        <CardContent className="p-4 text-center">
          <div className="text-3xl font-bold text-purple-700">
            {stats.uniqueHelpers}
          </div>
          <p className="text-xs text-purple-600 mt-1">
            Friends Helped You
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-pink-50 to-pink-100">
        <CardContent className="p-4 text-center">
          <div className="text-3xl font-bold text-pink-700">
            {stats.friendsHelped}
          </div>
          <p className="text-xs text-pink-600 mt-1">
            Friends You Helped
          </p>
        </CardContent>
      </Card>
      
      {stats.mostHelpfulFriend && (
        <Card className="col-span-2 md:col-span-4 bg-gradient-to-r from-yellow-50 to-orange-50">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-orange-700">
              🏆 Most Helpful Friend
            </p>
            <p className="text-lg font-bold text-orange-800">
              {stats.mostHelpfulFriend.name} ({stats.mostHelpfulFriend.count} waters)
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Privacy settings component
export function GardenPrivacySettings({ userId, currentPrivacy = 'public' }) {
  const [privacy, setPrivacy] = useState(currentPrivacy);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        gardenPrivacy: privacy
      });
      toast.success('Privacy settings updated!');
    } catch (err) {
      console.error('Failed to update privacy:', err);
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          🔒 Garden Privacy
        </h3>
        
        <div className="space-y-2 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="privacy"
              value="public"
              checked={privacy === 'public'}
              onChange={(e) => setPrivacy(e.target.value)}
              className="text-purple-600"
            />
            <span className="text-sm">
              <span className="font-medium">Public</span> - Anyone can view and water
            </span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="privacy"
              value="friends"
              checked={privacy === 'friends'}
              onChange={(e) => setPrivacy(e.target.value)}
              className="text-purple-600"
            />
            <span className="text-sm">
              <span className="font-medium">Friends Only</span> - Only friends can water
            </span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="privacy"
              value="private"
              checked={privacy === 'private'}
              onChange={(e) => setPrivacy(e.target.value)}
              className="text-purple-600"
            />
            <span className="text-sm">
              <span className="font-medium">Private</span> - Only you can see
            </span>
          </label>
        </div>
        
        <Button
          onClick={handleSave}
          disabled={saving || privacy === currentPrivacy}
          className="w-full text-sm"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </CardContent>
    </Card>
  );
}
