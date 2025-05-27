import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import {
  doc,
  onSnapshot,
  updateDoc,
  arrayRemove,
  deleteDoc
} from 'firebase/firestore';

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) return;
      const ref = doc(db, 'users', user.uid);
      return onSnapshot(ref, (snap) => {
        const data = snap.data();
        const notes = data.notifications || [];
        setNotifications(notes);
        setUnreadCount(notes.filter(n => !n.read).length);
      });
    });
    return () => unsubscribe && unsubscribe();
  }, []);

  const markAllRead = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const ref = doc(db, 'users', user.uid);
    const updated = notifications.map(n => ({ ...n, read: true }));
    await updateDoc(ref, { notifications: updated });
  };

  const clearAll = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const ref = doc(db, 'users', user.uid);
    await updateDoc(ref, { notifications: [] });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-600 hover:text-purple-600"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border z-50">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Notifications</h3>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={clearAll}
                  className="text-xs text-red-600 hover:underline"
                >
                  Clear all
                </button>
              </div>
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-gray-500 text-center">No notifications</p>
            ) : (
              notifications.map((notification, index) => (
                <div
                  key={index}
                  className={`p-3 border-b hover:bg-gray-50 ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <h4 className="font-medium text-sm">{notification.title}</h4>
                  <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                  <span className="text-xs text-gray-400">
                    {new Date(notification.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
