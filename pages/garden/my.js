import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import useAuth from '../../hooks/useAuth';
import Avatar from '../../components/Avatar';
import WateringHistoryModal from '../../components/WateringHistoryModal';

export default function MyGardenPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [seeds, setSeeds] = useState([]);
  const [bloomedToday, setBloomedToday] = useState([]);
  const [wateringSeedId, setWateringSeedId] = useState(null);
  const [showHistoryFor, setShowHistoryFor] = useState(null);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'flowers'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const flowers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSeeds(flowers);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const newBlooms = seeds.filter(
      (seed) => seed.bloomed && !seed.bloomAnimationShown
    );
    if (newBlooms.length > 0) {
      setBloomedToday(newBlooms.map((s) => s.id));
    }
  }, [seeds]);

  const markBloomSeen = async (seedId) => {
    try {
      await updateDoc(doc(db, 'flowers', seedId), { bloomAnimationShown: true });
    } catch (err) {
      console.error('Failed to mark bloom animation seen:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-200 p-6">
      <h1 className="text-3xl font-bold text-center mb-4">🌼 My Garden</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {seeds.map((seed) => (
          <motion.div
            key={seed.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-white rounded-xl shadow p-4">
              <CardContent>
                <h3 className="text-lg font-semibold text-purple-700">
                  {seed.bloomed ? `${seed.bloomedFlower} ${seed.type}` : '🌱 Seedling'}
                </h3>
                <p className="text-sm text-gray-600 italic">
                  {seed.name || 'Anonymous'} | {seed.color}
                </p>
                {seed.note && <p className="text-sm mt-1">“{seed.note}”</p>}
                <p className="text-xs text-gray-500 mt-2">Watered {seed.waterCount} / 7 times</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button onClick={() => setShowHistoryFor(seed.id)} variant="outline">
                    ⏳ View History
                  </Button>
                </div>

                <AnimatePresence>
                  {bloomedToday.includes(seed.id) && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.5 }}
                      className="mt-4 p-3 rounded-lg bg-yellow-100 border border-yellow-300 text-yellow-800 shadow text-center"
                      onAnimationComplete={() => markBloomSeen(seed.id)}
                    >
                      🌸 Your flower has bloomed beautifully!
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {showHistoryFor && (
        <WateringHistoryModal
          seedId={showHistoryFor}
          isOpen={!!showHistoryFor}
          onClose={() => setShowHistoryFor(null)}
        />
      )}
    </div>
  );
}
