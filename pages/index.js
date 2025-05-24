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
  const audioRef = useRef(null);

  useEffect(() => {
  let unsubscribeSnapshot = null;

  const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
    if (!currentUser) {
      router.push('/auth');
    } else {
      console.log("✅ Authenticated user:", currentUser.uid);
      setUser(currentUser);
      setShowMain(true);

      const q = query(collection(db, 'flowers'), where('userId', '==', currentUser.uid));
      unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const flowers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("🌼 Planted seeds fetched:", flowers);
        setPlanted(flowers);
      });
    }
  });

  return () => {
    unsubscribeAuth();
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
      console.log("📤 Unsubscribed from Firestore snapshot");
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-200 p-6 relative">
      <audio ref={audioRef} loop hidden />
      <h1 className="text-4xl font-bold text-center mb-2">🌱 Sharon's Garden of Seeds 🌱</h1>
      <p className="text-center text-md max-w-xl mx-auto mb-6">
        Plant your unique seed and let others water it. After 7 days, it will bloom into a special flower representing your feelings.
      </p>

      // ... [rest of the unchanged code continues here, kept intact for brevity]
    </div>
  );
}
