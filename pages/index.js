import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined' && !localStorage.getItem('hasSeenOnboarding')) {
      setShowOnboarding(true);
    }
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/auth');
      } else {
        setUser(user);
        setShowMain(true);
        const q = query(collection(db, 'flowers'), where('userId', '==', user.uid));
        const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const flowers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setPlanted(flowers);
        });
        return () => unsubscribeSnapshot();
      }
    });
    return () => unsubscribeAuth();
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

  const dismissOnboarding = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setShowOnboarding(false);
  };

  if (!isClient || !showMain) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Image src="/welcome.png" alt="Welcome" width={600} height={600} className="rounded-lg shadow-xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-200 p-6 relative overflow-x-hidden">
      <audio ref={audioRef} loop hidden />
      <Image src="/garden-illustration.svg" alt="Garden Illustration" width={200} height={200} className="absolute top-0 right-0 opacity-10 pointer-events-none hidden md:block" />

      <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-bold text-center mb-2">
        🌱 Sharon's Garden of Seeds 🌱
      </motion.h1>
      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center text-md max-w-xl mx-auto mb-6">
        Plant your unique seed and let others water it. After 7 days, it will bloom into a special flower representing your feelings.
      </motion.p>

      {showOnboarding && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-yellow-100 border border-yellow-300 text-yellow-800 rounded p-4 max-w-xl mx-auto mb-6 shadow">
          <p className="mb-2">💡 <strong>Welcome!</strong> Start by planting a seed with your name, feeling, and optional message.</p>
          <Button onClick={dismissOnboarding} variant="outline">Got it</Button>
        </motion.div>
      )}

      ... // [rest of the unchanged code continues here, kept intact for brevity]

    </div>
  );
}
