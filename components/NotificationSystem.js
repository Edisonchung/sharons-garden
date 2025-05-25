// components/NotificationSystem.js - Complete Notification Management
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { auth, db } from '../lib/firebase';
import { 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  onSnapshot, 
  setDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';

// Notification types and their configurations
const NOTIFICATION_TYPES = {
  SONG_LAUNCH: {
    icon: '🎵',
    color: 'indigo',
    priority: 'high'
  },
  SEED_BLOOMED: {
    icon: '🌸',
    color: 'green',
    priority: 'medium'
  },
  FRIEND_WATERED: {
    icon: '💧',
    color: 'blue',
    priority: 'medium'
  },
  ACHIEVEMENT_UNLOCKED: {
    icon: '🏅',
    color: 'yellow',
    priority: 'medium'
  },
  SHARON_MESSAGE: {
    icon: '💜',
    color: 'purple',
    priority: 'high'
  },
  SYSTEM_UPDATE: {
    icon: '📢',
    color: 'gray',
    priority: 'low'
  }
};

// Individual notification component
function NotificationItem({ notification, onMarkRead, onDelete }) {
  const config = NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.SYSTEM_UPDATE;
  const isUnread = !notification.read;
  
  const timeAgo = notification.timestamp?.toDate ? 
    formatDistanceToNow(notification.timestamp.toDate(), { addSuffix: true }) :
    'Recently';

  return (
    <Card className={`transition-all hover:shadow-md ${isUnread ? 'border-l-4 border-purple-500 bg-purple-50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Notification Icon */}
          <div className={`text-2xl flex-shrink-0 ${isUnread ? 'animate-pulse' : ''}`}>
            {config.icon}
          </div>
          
          {/* Notification Content */}
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-sm ${isUnread ? 'text-purple-700' : 'text-gray-700'}`}>
              {notification.title}
            </h3>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {notification.message}
            </p>
            
            {/* Action Button (if applicable) */}
            {notification.actionUrl && (
              <a 
                href={notification.actionUrl}
                className="inline-block mt-2 text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full hover:bg-purple-200 transition-colors"
              >
                {notification.actionText || 'View'}
              </a>
            )}
            
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-500">{timeAgo}</span>
              <div className="flex gap-2">
                {isUnread && (
                  <button
                    onClick={() => onMarkRead(notification.id)}
                    className="text-xs text-purple-600 hover:text-purple-800"
                  >
                    Mark as read
                  </button>
                )}
                <button
                  onClick={() => onDelete(notification.id)}
                  className="text-xs text-gray-500 hover:text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Main notifications page
export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        // Listen to user's notifications in real-time
        const userRef = doc(db, 'users', currentUser.uid);
        const unsubscribeNotifications = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            const userData = doc.data();
            const userNotifications = userData.notifications || [];
            
            // Sort by timestamp (newest first)
            const sortedNotifications = userNotifications.sort((a, b) => {
              const aTime = a.timestamp?.toDate?.() || new Date(a.createdAt || 0);
              const bTime = b.timestamp?.toDate?.() || new Date(b.createdAt || 0);
              return bTime - aTime;
            });
            
            setNotifications(sortedNotifications);
          }
          setLoading(false);
        });

        return () => unsubscribeNotifications();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const markAsRead = async (notificationId) => {
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      
      // Find and update the specific notification
      const updatedNotifications = notifications.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true, readAt: new Date().toISOString() }
          : notif
      );

      await updateDoc(userRef, {
        notifications: updatedNotifications
      });

    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      const notificationToDelete = notifications.find(n => n.id === notificationId);
      
      if (notificationToDelete) {
        await updateDoc(userRef, {
          notifications: arrayRemove(notificationToDelete)
        });
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      const updatedNotifications = notifications.map(notif => ({
        ...notif,
        read: true,
        readAt: new Date().toISOString()
      }));

      await updateDoc(userRef, {
        notifications: updatedNotifications
      });
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const clearAll = async () => {
    if (!user || !confirm('Are you sure you want to delete all notifications?')) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        notifications: []
      });
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  };

  // Filter notifications based on selected filter
  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.read;
    if (filter === 'read') return notif.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-200 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-12">
            <div className="text-4xl animate-spin mb-4">🔔</div>
            <p className="text-purple-700">Loading notifications...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-200 p-6">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-purple-700 mb-2">
            🔔 Notifications
          </h1>
          <p className="text-gray-600">
            Stay updated with your garden and Sharon's latest news
          </p>
        </div>

        {/* Stats and Actions */}
        <div className="bg-white rounded-xl p-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Total: <strong>{notifications.length}</strong>
              </span>
              {unreadCount > 0 && (
                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium">
                  {unreadCount} unread
                </span>
              )}
            </div>
            
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button onClick={markAllAsRead} variant="outline" size="sm">
                  Mark all read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button onClick={clearAll} variant="outline" size="sm">
                  Clear all
                </Button>
              )}
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            {['all', 'unread', 'read'].map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filter === filterType
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                {filterType === 'unread' && unreadCount > 0 && (
                  <span className="ml-1 bg-white text-purple-600 px-1 rounded-full text-xs">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">
                {filter === 'unread' ? '✅' : '🔔'}
              </div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">
                {filter === 'unread' 
                  ? 'All caught up!' 
                  : filter === 'read'
                  ? 'No read notifications'
                  : 'No notifications yet'
                }
              </h2>
              <p className="text-gray-500">
                {filter === 'unread' 
                  ? 'You\'re up to date with everything in your garden.'
                  : 'Notifications will appear here when there\'s news about your garden or Sharon\'s updates.'
                }
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={markAsRead}
                onDelete={deleteNotification}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Notification creation utilities
export const NotificationManager = {
  async createNotification(userId, type, title, message, options = {}) {
    if (!userId) return;

    const notification = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      read: false,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString(),
      ...options
    };

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        notifications: arrayUnion(notification)
      });
      
      console.log('✅ Notification created:', title);
      return notification;
    } catch (error) {
      console.error('❌ Failed to create notification:', error);
    }
  },

  // Helper methods for common notification types
  async songLaunchNotification(userId) {
    return this.createNotification(
      userId,
      'SONG_LAUNCH',
      '🎵 Sharon\'s Song is Live!',
      'The moment we\'ve all been waiting for! Sharon\'s debut single is now available everywhere.',
      {
        actionUrl: 'https://open.spotify.com/artist/sharon',
        actionText: 'Listen Now'
      }
    );
  },

  async seedBloomedNotification(userId, seedType, flowerEmoji) {
    return this.createNotification(
      userId,
      'SEED_BLOOMED',
      `🌸 Your ${seedType} Seed Bloomed!`,
      `Congratulations! Your ${seedType} seed has grown into a beautiful ${flowerEmoji}. Check out Sharon's special message for you.`,
      {
        actionUrl: '/garden/my',
        actionText: 'View Garden'
      }
    );
  },

  async friendWateredNotification(userId, friendName, seedType) {
    return this.createNotification(
      userId,
      'FRIEND_WATERED',
      `💧 ${friendName} watered your garden!`,
      `${friendName} helped water your ${seedType} seed. It's now one step closer to blooming!`,
      {
        actionUrl: '/garden/my',
        actionText: 'Check Progress'
      }
    );
  },

  async achievementNotification(userId, badgeName, description) {
    return this.createNotification(
      userId,
      'ACHIEVEMENT_UNLOCKED',
      `🏅 Achievement Unlocked: ${badgeName}`,
      description,
      {
        actionUrl: '/garden/badges',
        actionText: 'View Badge'
      }
    );
  },

  async sharonMessageNotification(userId, message) {
    return this.createNotification(
      userId,
      'SHARON_MESSAGE',
      '💜 Personal Message from Sharon',
      message,
      {
        actionUrl: '/garden/my',
        actionText: 'Read Full Message'
      }
    );
  }
};

// Hook for notification badge count
export function useNotificationCount() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        setUnreadCount(0);
        return;
      }

      const userRef = doc(db, 'users', user.uid);
      return onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          const notifications = doc.data().notifications || [];
          const unread = notifications.filter(n => !n.read).length;
          setUnreadCount(unread);
        }
      });
    });

    return () => unsubscribe();
  }, []);

  return unreadCount;
}
