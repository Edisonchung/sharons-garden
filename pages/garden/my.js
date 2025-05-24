import { useEffect, useState } from 'react';
import { auth, db } from '../../lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  updateDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import FlowerCanvas from '../../components/FlowerCanvas';

export default function MyGarden() {
  const [user, setUser] = useState(null);
  const [flowers, setFlowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [isClient, setIsClient] = useState(false); // ✅

  useEffect(() => {
    setIsClient(true); // ✅ prevent SSR mismatch

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const reminderKey = 'lastWaterReminder';
        const last = window.localStorage.getItem(reminderKey);
        const now = new Date();
        const oneDay = 24 * 60 * 60 * 1000;

        if (!last || now - new Date(last) > oneDay) {
          if ('Notification' in window && Notification.permission !== 'granted') {
            Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                new Notification('💧 Time to water your seeds in Sharon’s Garden!');
                window.localStorage.setItem(reminderKey, now.toISOString());
              }
            });
          }
        }
      } catch (err) {
        console.warn('Notification/localStorage error:', err);
      }
    }
  }, []);

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'flowers', id));
      setFlowers(prev => prev.filter(f => f.id !== id));
      toast.success('Flower deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete flower.');
    }
  };

  const handleUpdate = async (id, newNote) => {
    try {
      const flowerRef = doc(db, 'flowers', id);
      await updateDoc(flowerRef, { note: newNote });
      setFlowers(prev => prev.map(f => f.id === id ? { ...f, note: newNote } : f));
      toast.success('Note updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update note.');
    }
  };

  const filteredFlowers = flowers.filter(f => {
    if (filter === 'bloomed') return f.bloomed;
    if (filter === 'notBloomed') return !f.bloomed;
    return true;
  });

  if (!isClient) return null; // ✅ prevent hydration mismatch

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-pink-50 to-purple-100 dark:from-gray-900 dark:to-black p-4 sm:p-6 text-center">
      <h1 className="text-3xl font-bold text-purple-700 dark:text-purple-300 mb-6">🌿 My Garden</h1>

      {loading ? (
        <p className="text-gray-600 dark:text-gray-400">Loading your flowers...</p>
      ) : (
        <>
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>All</Button>
            <Button variant={filter === 'bloomed' ? 'default' : 'outline'} onClick={() => setFilter('bloomed')}>Bloomed</Button>
            <Button variant={filter === 'notBloomed' ? 'default' : 'outline'} onClick={() => setFilter('notBloomed')}>Not Bloomed</Button>
          </div>

          <FlowerCanvas flowers={filteredFlowers} />

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-10 max-w-6xl mx-auto">
            {filteredFlowers.map(flower => (
              <Card key={flower.id} className="p-4 bg-white dark:bg-gray-800 shadow-md relative">
                <CardContent>
                  <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-200">
                    {flower.bloomed ? `${flower.bloomedFlower || '🌸'} ${flower.type}` : '🌱 Seedling'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 italic truncate">
                    — {flower.name || 'Anonymous'} | {flower.color}
                  </p>
                  <p className="text-sm mt-2 text-gray-500 dark:text-gray-400 break-words">
                    {flower.note || 'No note'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    Watered {flower.waterCount} / 7 times
                  </p>
                  {flower.bloomed && (
                    <p className="text-green-500 font-medium mt-2 animate-pulse">This flower has bloomed! 🌟</p>
                  )}
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    <Button onClick={() => handleDelete(flower.id)} variant="destructive">Delete</Button>
                    <Button onClick={() => handleUpdate(flower.id, prompt('Edit note:', flower.note) || flower.note)} variant="outline">Edit</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
