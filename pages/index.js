import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { motion } from 'framer-motion';
import SurpriseReward from '../components/SurpriseReward';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';

const seedTypes = [
  { type: 'Hope', flower: '🌷' },
  { type: 'Joy', flower: '🌻' },
  { type: 'Memory', flower: '🪻' },
  { type: 'Love', flower: '🌹' },
  { type: 'Strength', flower: '🌼' }
];

const seedColors = ['Pink', 'Blue', 'Yellow', 'Purple', 'White'];

export default function SharonsGarden() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [showMain, setShowMain] = useState(false);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [seedType, setSeedType] = useState('Hope');
  const [seedColor, setSeedColor] = useState('Pink');
  const [planted, setPlanted] = useState([]);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [currentReward, setCurrentReward] = useState(null);
  const [shareId, setShareId] = useState(null);
  const [showReward, setShowReward] = useState(false);
  const [unlockedSlots, setUnlockedSlots] = useState(1);
  const audioRef = useRef(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    let unsubscribeSnapshot = null;
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/auth');
      } else {
        setUser(currentUser);
        setShowMain(true);
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUnlockedSlots(userSnap.data().unlockedSlots || 1);
        }
        const q = query(collection(db, 'flowers'), where('userId', '==', currentUser.uid));
        unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const flowers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setPlanted(flowers);
        });
      }
    });
    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, [router]);

  const handlePlant = async () => {
    if (!user) return;
    const newSeed = {
      userId: user.uid,
      type: seedType,
      color: seedColor,
      name,
      note,
      waterCount: 0,
      bloomed: false,
      bloomedFlower: null,
      createdAt: new Date().toISOString(),
    };
    await addDoc(collection(db, 'flowers'), newSeed);
    setName('');
    setNote('');
  };

  const handleWater = async (id) => {
    if (typeof window === 'undefined') return;
    const today = new Date().toDateString();
    const lastKey = `lastWatered_${id}`;
    const last = localStorage.getItem(lastKey);
    if (last && new Date(last).toDateString() === today) {
      alert("You've already watered this seed today. Try again tomorrow 🌙");
      return;
    }
    try {
      const docRef = doc(db, 'flowers', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return;
      const data = docSnap.data();
      const newCount = (data.waterCount || 0) + 1;
      const bloomed = newCount >= 7;
      const flowerIcon = seedTypes.find(s => s.type === data.type)?.flower || '🌸';
      await updateDoc(docRef, {
        waterCount: newCount,
        bloomed,
        bloomedFlower: bloomed ? flowerIcon : null,
        lastWatered: new Date().toISOString()
      });
      localStorage.setItem(lastKey, new Date().toISOString());
      if (bloomed && !data.bloomed) {
        setCurrentReward({
          emotion: `${data.type} Seed`,
          reward: 'Access Sharon’s exclusive voice message 🌟',
          link: 'https://example.com/sharon-reward',
        });
        setRewardOpen(true);
        setShowReward(true);
      }
    } catch (err) {
      console.error("Watering failed:", err);
      alert("Failed to water this seed.");
    }
  };

  const handleShare = (id) => setShareId(id);
  const closeShare = () => setShareId(null);

  if (!isClient || !showMain) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-100 to-purple-200 text-purple-700 text-xl">
        <p>🌸 Loading your garden...</p>
      </div>
    );
  }

  const totalSlots = 6;
  const padded = Array.from({ length: totalSlots }, (_, i) => planted[i] || null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-200 p-6 relative">
      <audio ref={audioRef} loop hidden />
      <h1 className="text-4xl font-bold text-center mb-2">🌱 Sharon's Garden of Seeds 🌱</h1>
      <p className="text-center text-md max-w-xl mx-auto mb-6">
        Plant your unique seed and let others water it. After 7 days, it will bloom into a special flower representing your feelings.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {padded.map((seed, index) => {
          if (index >= unlockedSlots) {
            return (
              <Card key={`locked-${index}`} className="bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center h-48">
                <CardContent className="text-center">
                  <p>🔒 Locked</p>
                  <p className="text-xs">Bloom 3 flowers to unlock</p>
                </CardContent>
              </Card>
            );
          }
          if (!seed) {
            return (
              <Card key={`empty-${index}`} className="bg-white dark:bg-gray-800 flex items-center justify-center h-48">
                <CardContent className="text-center">
                  <p>➕ Empty Slot</p>
                  <Button onClick={handlePlant}>Plant Seed</Button>
                </CardContent>
              </Card>
            );
          }
          return (
            <motion.div key={seed.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Card className="bg-white shadow-xl rounded-2xl p-4">
                <CardContent>
                  <h3 className="text-xl font-semibold text-purple-700">
                    {seed.bloomed ? `${seed.bloomedFlower} ${seed.type}` : '🌱 Seedling'}
                  </h3>
                  <p className="text-sm italic text-gray-500 mb-1">— {seed.name || 'Anonymous'} | {seed.color}</p>
                  {seed.note && <p className="text-sm text-gray-600 mb-2">“{seed.note}”</p>}
                  <p className="text-sm text-gray-500 mt-2">Watered {seed.waterCount} / 7 times</p>
                  {!seed.bloomed ? (
                    <Button onClick={() => handleWater(seed.id)} className="mt-2">Water this seed 💧</Button>
                  ) : (
                    <p className="text-green-600 font-medium mt-2">This flower has bloomed! 🌟</p>
                  )}
                  <div className="mt-4 flex flex-col gap-2">
                    <Button onClick={() => handleShare(seed.id)} variant="outline">🔗 Share</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {shareId && typeof window !== 'undefined' && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm text-center">
            <h2 className="text-xl font-bold text-purple-700 mb-2">📤 Share Seed</h2>
            <p className="mb-4 text-sm">Choose a way to share your planted seed with others:</p>
            <div className="flex flex-col gap-2 mb-4">
              <Button onClick={() => {
                const url = `${window.location.origin}/flower/${shareId}`;
                navigator.clipboard.writeText(url);
                alert("📋 Link copied!");
              }}>📋 Copy Link</Button>
              <a href={`https://wa.me/?text=${encodeURIComponent(window.location.origin + '/flower/' + shareId)}`} target="_blank" rel="noopener noreferrer" className="text-center border border-green-500 text-green-600 px-4 py-2 rounded hover:bg-green-50">📲 Share on WhatsApp</a>
              <a href={`https://twitter.com/intent/tweet?text=Check%20out%20my%20seed!%20${encodeURIComponent(window.location.origin + '/flower/' + shareId)}`} target="_blank" rel="noopener noreferrer" className="text-center border border-blue-500 text-blue-500 px-4 py-2 rounded hover:bg-blue-50">🐦 Share on Twitter</a>
            </div>
            <Button onClick={closeShare} variant="outline">Close</Button>
          </div>
        </div>
      )}

      {rewardOpen && currentReward && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md text-center">
            <h2 className="text-2xl font-bold text-purple-700 mb-2">🎁 Reward Unlocked!</h2>
            <p className="mb-2">Your seed "{currentReward.emotion}" has fully bloomed.</p>
            <p className="mb-4 text-green-600 font-medium">{currentReward.reward}</p>
            <a href={currentReward.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline mb-4 inline-block">Claim Reward</a>
            <div><Button onClick={() => setRewardOpen(false)}>Close</Button></div>
          </div>
        </div>
      )}

      {showReward && <SurpriseReward onClose={() => setShowReward(false)} />}
    </div>
  );
}
