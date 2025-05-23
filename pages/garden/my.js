// pages/garden/my.js
import { useEffect, useState } from 'react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { auth, db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import toast from 'react-hot-toast';

export default function MyGarden() {
  const [user, setUser] = useState(null);
  const [flowers, setFlowers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }

    const reminderKey = 'lastWaterReminder';
    const last = localStorage.getItem(reminderKey);
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;

    if (!last || now - new Date(last) > oneDay) {
      if (Notification.permission === 'granted') {
        new Notification('💧 Time to water your seeds in Sharon’s Garden!');
        localStorage.setItem(reminderKey, now.toISOString());
      }
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const flowerQuery = query(
            collection(db, 'flowers'),
            where('userId', '==', currentUser.uid)
          );
          const snapshot = await getDocs(flowerQuery);
          const userFlowers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setFlowers(userFlowers);
        } catch (err) {
          console.error(err);
          toast.error('Failed to load your garden.');
        } finally {
          setLoading(false);
        }
      } else {
        setUser(null);
        setFlowers([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-100 dark:from-gray-900 dark:to-black p-6 text-center">
      <h1 className="text-3xl font-bold text-purple-700 dark:text-purple-300 mb-6">
