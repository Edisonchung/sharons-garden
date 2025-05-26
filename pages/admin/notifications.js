// pages/admin/notifications.js - Notification Broadcaster for Admins
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { auth, db } from '../../lib/firebase';
import { 
  collection, 
  query, 
  getDocs,
  doc,
  updateDoc,
  getDoc,
  arrayUnion,
  serverTimestamp,
  where,
  addDoc // Added this import
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import toast from 'react-hot-toast';

const NOTIFICATION_TEMPLATES = {
  songLaunch: {
    title: "🎵 Sharon's Song Launch Announcement",
    message: "Big news! Sharon's debut single launches on May 30th. Don't miss it!",
    type: 'SONG_LAUNCH',
    actionUrl: '/garden/my',
    actionText: 'Visit Garden'
  },
  dailyReminder: {
    title: "💧 Time to Water Your Garden!",
    message: "Your seeds are waiting for their daily water. Help them grow!",
    type: 'SYSTEM_UPDATE',
    actionUrl: '/garden/my',
    actionText: 'Water Now'
  },
  newFeature: {
    title: "✨ New Feature Alert!",
    message: "Check out the latest updates to Sharon's Garden!",
    type: 'SYSTEM_UPDATE',
    actionUrl: '/',
    actionText: 'Explore'
  },
  specialEvent: {
    title: "🎉 Special Event in the Garden!",
    message: "Something special is happening. Don't miss out!",
    type: 'SHARON_MESSAGE',
    actionUrl: '/',
    actionText: 'Join Event'
  },
  maintenance: {
    title: "🔧 Scheduled Maintenance",
    message: "We'll be doing maintenance on [DATE]. The garden will be temporarily unavailable.",
    type: 'SYSTEM_UPDATE'
  }
};

const NOTIFICATION_TYPES = [
  'SONG_LAUNCH',
  'SEED_BLOOMED', 
  'FRIEND_WATERED',
  'ACHIEVEMENT_UNLOCKED',
  'SHARON_MESSAGE',
  'SYSTEM_UPDATE'
];

export default function NotificationBroadcasterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Notification form
  const [notification, setNotification] = useState({
    title: '',
    message: '',
    type: 'SYSTEM_UPDATE',
    actionUrl: '',
    actionText: '',
    priority: 'medium'
  });
  
  // Targeting
  const [targetAudience, setTargetAudience] = useState('all');
  const [targetCriteria, setTargetCriteria] = useState({
    hasSeeds: false,
    hasBlooms: false,
    daysInactive: 0,
    hasMelodySeed: false
  });
  
  // Preview & Stats
  const [preview, setPreview] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    targetedUsers: 0,
    estimatedReach: 0
  });
  
  // Schedule
  const [scheduleType, setScheduleType] = useState('now');
  const [scheduleTime, setScheduleTime] = useState('');
  
  // History
  const [notificationHistory, setNotificationHistory] = useState([]);

  // Check admin access
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/auth');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        
        if (userData?.role !== 'admin') {
          toast.error('Admin access required');
          router.push('/');
          return;
        }
        
        setIsAdmin(true);
        setLoading(false);
        
        // Load initial data
        loadStats();
        loadHistory();
        
      } catch (err) {
        console.error('Error checking admin status:', err);
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Load statistics
  const loadStats = async () => {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      setStats(prev => ({ ...prev, totalUsers: usersSnap.size }));
      
      // Calculate targeted users based on criteria
      calculateTargetedUsers();
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Load notification history
  const loadHistory = async () => {
    try {
      const historySnap = await getDocs(
        query(
          collection(db, 'notificationHistory'),
          where('sentBy', '==', auth.currentUser?.uid)
        )
      );
      
      const history = historySnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => b.sentAt?.seconds - a.sentAt?.seconds);
      
      setNotificationHistory(history);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  // Calculate targeted users
  const calculateTargetedUsers = async () => {
    try {
      let targetQuery = collection(db, 'users');
      let count = 0;
      
      if (targetAudience === 'all') {
        const snap = await getDocs(targetQuery);
        count = snap.size;
      } else if (targetAudience === 'active') {
        // Users who have been active in last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const usersSnap = await getDocs(targetQuery);
        for (const doc of usersSnap.docs) {
          const lastActive = doc.data().lastLoginAt?.toDate?.() || new Date(0);
          if (lastActive > sevenDaysAgo) count++;
        }
      } else if (targetAudience === 'melodySeed') {
        // Users who have claimed melody seed
        const melodyQuery = query(
          collection(db, 'flowers'),
          where('songSeed', '==', true)
        );
        const melodySnap = await getDocs(melodyQuery);
        const uniqueUsers = new Set(melodySnap.docs.map(doc => doc.data().userId));
        count = uniqueUsers.size;
      } else if (targetAudience === 'custom') {
        // Custom criteria
        const usersSnap = await getDocs(targetQuery);
        for (const userDoc of usersSnap.docs) {
          const userId = userDoc.id;
          let matches = true;
          
          if (targetCriteria.hasSeeds) {
            const seedQuery = query(
              collection(db, 'flowers'),
              where('userId', '==', userId)
            );
            const seedSnap = await getDocs(seedQuery);
            if (seedSnap.empty) matches = false;
          }
          
          if (matches && targetCriteria.hasBlooms) {
            const bloomQuery = query(
              collection(db, 'flowers'),
              where('userId', '==', userId),
              where('bloomed', '==', true)
            );
            const bloomSnap = await getDocs(bloomQuery);
            if (bloomSnap.empty) matches = false;
          }
          
          if (matches) count++;
        }
      }
      
      setStats(prev => ({
        ...prev,
        targetedUsers: count,
        estimatedReach: Math.round(count * 0.7) // Assume 70% will see it
      }));
    } catch (error) {
      console.error('Error calculating targeted users:', error);
    }
  };

  // Use template
  const useTemplate = (templateKey) => {
    const template = NOTIFICATION_TEMPLATES[templateKey];
    setNotification({
      ...notification,
      ...template
    });
  };

  // Send notification - UPDATED METHOD
  const sendNotification = async () => {
    if (!notification.title || !notification.message) {
      toast.error('Please fill in title and message');
      return;
    }

    if (scheduleType === 'scheduled' && !scheduleTime) {
      toast.error('Please select a schedule time');
      return;
    }

    setSending(true);

    try {
      // Get targeted users
      let targetedUsers = [];
      
      if (targetAudience === 'all') {
        const usersSnap = await getDocs(collection(db, 'users'));
        targetedUsers = usersSnap.docs.map(doc => doc.id);
      } else if (targetAudience === 'active') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const usersSnap = await getDocs(collection(db, 'users'));
        targetedUsers = usersSnap.docs
          .filter(doc => {
            const lastActive = doc.data().lastLoginAt?.toDate?.() || new Date(0);
            return lastActive > sevenDaysAgo;
          })
          .map(doc => doc.id);
      } else if (targetAudience === 'melodySeed') {
        const melodyQuery = query(
          collection(db, 'flowers'),
          where('songSeed', '==', true)
        );
        const melodySnap = await getDocs(melodyQuery);
        const uniqueUsers = new Set(melodySnap.docs.map(doc => doc.data().userId));
        targetedUsers = Array.from(uniqueUsers);
      }

      // Create notification object with regular timestamp (not serverTimestamp)
      const notificationData = {
        id: `broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        read: false,
        timestamp: new Date().toISOString(), // Use ISO string instead of serverTimestamp
        createdAt: new Date().toISOString(),
        priority: notification.priority,
        sentBy: 'admin',
        broadcast: true
      };

      if (notification.actionUrl) {
        notificationData.actionUrl = notification.actionUrl;
        notificationData.actionText = notification.actionText || 'View';
      }

      // Send to each targeted user
      let successCount = 0;
      const batchSize = 50; // Process in batches to avoid overwhelming

      for (let i = 0; i < targetedUsers.length; i += batchSize) {
        const batch = targetedUsers.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (userId) => {
            try {
              const userRef = doc(db, 'users', userId);
              await updateDoc(userRef, {
                notifications: arrayUnion(notificationData)
              });
              successCount++;
            } catch (err) {
              console.error(`Failed to send to user ${userId}:`, err);
            }
          })
        );
      }

      // Log to history with serverTimestamp (this is okay for setDoc/addDoc)
      await addDoc(collection(db, 'notificationHistory'), {
        ...notificationData,
        sentAt: serverTimestamp(), // This is fine here
        sentBy: auth.currentUser.uid,
        targetAudience,
        targetCount: targetedUsers.length,
        successCount,
        scheduledFor: scheduleType === 'scheduled' ? scheduleTime : null
      });

      toast.success(`Notification sent to ${successCount} users!`);
      
      // Reset form
      setNotification({
        title: '',
        message: '',
        type: 'SYSTEM_UPDATE',
        actionUrl: '',
        actionText: '',
        priority: 'medium'
      });
      
      // Reload history
      loadHistory();
      
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  // Update targeted users when criteria change
  useEffect(() => {
    if (isAdmin) {
      calculateTargetedUsers();
    }
  }, [targetAudience, targetCriteria]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading notification broadcaster...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">📢 Notification Broadcaster</h1>
          <p className="text-gray-600">Send announcements to your garden community</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Notification Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Templates */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">📝 Quick Templates</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(NOTIFICATION_TEMPLATES).map(([key, template]) => (
                    <Button
                      key={key}
                      onClick={() => useTemplate(key)}
                      variant="outline"
                      className="text-xs"
                    >
                      {template.title.split(' ').slice(0, 3).join(' ')}...
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Compose */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">✍️ Compose Notification</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Type</label>
                    <select
                      value={notification.type}
                      onChange={(e) => setNotification({...notification, type: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      {NOTIFICATION_TYPES.map(type => (
                        <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Title *</label>
                    <input
                      type="text"
                      value={notification.title}
                      onChange={(e) => setNotification({...notification, title: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Enter notification title..."
                      maxLength={100}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Message *</label>
                    <textarea
                      value={notification.message}
                      onChange={(e) => setNotification({...notification, message: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                      rows={4}
                      placeholder="Enter notification message..."
                      maxLength={500}
                    />
                    <p className="text-xs text-gray-500 mt-1">{notification.message.length}/500</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Action URL</label>
                      <input
                        type="text"
                        value={notification.actionUrl}
                        onChange={(e) => setNotification({...notification, actionUrl: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="/garden/my"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Action Text</label>
                      <input
                        type="text"
                        value={notification.actionText}
                        onChange={(e) => setNotification({...notification, actionText: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="View"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Priority</label>
                    <select
                      value={notification.priority}
                      onChange={(e) => setNotification({...notification, priority: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Targeting */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">🎯 Target Audience</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Audience</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          value="all"
                          checked={targetAudience === 'all'}
                          onChange={(e) => setTargetAudience(e.target.value)}
                        />
                        <span>All Users</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          value="active"
                          checked={targetAudience === 'active'}
                          onChange={(e) => setTargetAudience(e.target.value)}
                        />
                        <span>Active Users (last 7 days)</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          value="melodySeed"
                          checked={targetAudience === 'melodySeed'}
                          onChange={(e) => setTargetAudience(e.target.value)}
                        />
                        <span>Melody Seed Holders</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          value="custom"
                          checked={targetAudience === 'custom'}
                          onChange={(e) => setTargetAudience(e.target.value)}
                        />
                        <span>Custom Criteria</span>
                      </label>
                    </div>
                  </div>

                  {targetAudience === 'custom' && (
                    <div className="pl-6 space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={targetCriteria.hasSeeds}
                          onChange={(e) => setTargetCriteria({...targetCriteria, hasSeeds: e.target.checked})}
                        />
                        <span className="text-sm">Has planted seeds</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={targetCriteria.hasBlooms}
                          onChange={(e) => setTargetCriteria({...targetCriteria, hasBlooms: e.target.checked})}
                        />
                        <span className="text-sm">Has bloomed flowers</span>
                      </label>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Schedule */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">⏰ Schedule</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="now"
                        checked={scheduleType === 'now'}
                        onChange={(e) => setScheduleType(e.target.value)}
                      />
                      <span>Send Immediately</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        value="scheduled"
                        checked={scheduleType === 'scheduled'}
                        onChange={(e) => setScheduleType(e.target.value)}
                      />
                      <span>Schedule for Later</span>
                    </label>
                    {scheduleType === 'scheduled' && (
                      <input
                        type="datetime-local"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="mt-2 w-full px-3 py-2 border rounded-lg"
                        min={new Date().toISOString().slice(0, 16)}
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Preview */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">👁️ Preview</h3>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">
                      {notification.type === 'SONG_LAUNCH' ? '🎵' :
                       notification.type === 'SHARON_MESSAGE' ? '💜' :
                       notification.type === 'ACHIEVEMENT_UNLOCKED' ? '🏅' :
                       '🔔'}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-purple-700">
                        {notification.title || 'Notification Title'}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message || 'Notification message will appear here...'}
                      </p>
                      {notification.actionUrl && (
                        <button className="mt-2 text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full hover:bg-purple-200">
                          {notification.actionText || 'View'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">📊 Audience Stats</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Users</span>
                    <span className="font-bold">{stats.totalUsers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Targeted Users</span>
                    <span className="font-bold text-purple-600">{stats.targetedUsers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Est. Reach</span>
                    <span className="font-bold text-green-600">{stats.estimatedReach}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Send Button */}
            <Button
              onClick={sendNotification}
              disabled={sending || !notification.title || !notification.message}
              className="w-full h-12 text-lg"
            >
              {sending ? '📤 Sending...' : '📢 Send Notification'}
            </Button>
          </div>
        </div>

        {/* History */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">📜 Recent Broadcasts</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b">
                    <th className="pb-2 text-sm font-medium text-gray-600">Title</th>
                    <th className="pb-2 text-sm font-medium text-gray-600">Type</th>
                    <th className="pb-2 text-sm font-medium text-gray-600">Audience</th>
                    <th className="pb-2 text-sm font-medium text-gray-600">Sent</th>
                    <th className="pb-2 text-sm font-medium text-gray-600">Reach</th>
                  </tr>
                </thead>
                <tbody>
                  {notificationHistory.slice(0, 10).map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-2 text-sm">{item.title}</td>
                      <td className="py-2 text-sm">{item.type}</td>
                      <td className="py-2 text-sm capitalize">{item.targetAudience}</td>
                      <td className="py-2 text-sm">
                        {item.sentAt?.toDate?.()?.toLocaleString() || 'Unknown'}
                      </td>
                      <td className="py-2 text-sm">
                        {item.successCount || 0} / {item.targetCount || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
