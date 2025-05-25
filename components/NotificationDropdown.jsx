// components/NotificationDropdown.jsx
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import {
  doc,
  onSnapshot,
  updateDoc,
  arrayRemove
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
