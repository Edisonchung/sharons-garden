// pages/index.js
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { motion } from 'framer-motion';
import SurpriseReward from '../components/SurpriseReward';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { addDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';

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
  const [showMain, setShowMain] = useState(false);
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [seedType, setSeedType] = useState('Hope');
  const [seedColor, setSeedColor] = useState('Pink');
  const [planted, setPlanted] = useState([]);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [currentReward, setCurrentReward] = useState(null);
  const [shareId, setShareId] = useState(null);
  const audioRef = useRef(null);
  const [showReward, setShowReward] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/auth');
      } else {
        setUser(currentUser);
        setShowMain(true);
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (user) {
      const flowerQuery = query(collection(db, 'flowers'), where('userId', '==', user.uid));
      const unsubscribe = onSnapshot(flowerQuery, (snapshot) => {
        const liveSeeds = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPlanted(liveSeeds);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handlePlant = async () => {
    if (!user) return;
    try {
      const newSeed = {
        type: seedType,
        color: seedColor,
        name,
        note,
        waterCount: 0,
        bloomed: false,
        bloomedFlower: null,
        userId: user.uid,
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'flowers'), newSeed);
      toast.success('Seed planted! 🌱');
      setName('');
      setNote('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to plant seed.');
    }
  };

  const handleWater = (id) => {
    toast('Watering not implemented for Firestore version yet.');
  };

  const handleShare = (id) => {
    setShareId(id);
  };

  const closeShare = () => {
    setShareId(null);
  };

  if (!showMain) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black cursor-pointer">
        <Image
          src="/welcome.png"
          alt="Welcome"
          width={600}
          height={600}
          className="rounded-lg shadow-xl"
        />
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

      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-6">
        <Input placeholder="Your name..." value={name} onChange={(e) => setName(e.target.value)} className="w-full sm:w-1/5" />
        <select value={seedType} onChange={(e) => setSeedType(e.target.value)} className="p-2 rounded w-full sm:w-1/5">
          {seedTypes.map((s) => <option key={s.type} value={s.type}>{s.type}</option>)}
        </select>
        <select value={seedColor} onChange={(e) => setSeedColor(e.target.value)} className="p-2 rounded w-full sm:w-1/5">
          {seedColors.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <Input placeholder="Add a short note (optional)..." value={note} onChange={(e) => setNote(e.target.value)} className="w-full sm:w-1/5" />
        <Button onClick={handlePlant}>Plant Seed</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {planted.map((seed) => (
          <motion.div
            key={seed.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-white shadow-xl rounded-2xl p-4">
              <CardContent>
                <h3 className="text-xl font-semibold text-purple-700">
                  {seed.bloomed ? `${seed.bloomedFlower || '🌸'} ${seed.type}` : '🌱 Seedling'}
                </h3>
                <p className="text-sm italic text-gray-500 mb-1">— {seed.name || 'Anonymous'} | {seed.color}</p>
                {seed.note && (
                  <p className="text-sm text-gray-600 mb-2">“{seed.note}”</p>
                )}
                <p className="text-sm text-gray-500 mt-2">
                  Watered {seed.waterCount} / 7 times
                </p>
                {!seed.bloomed ? (
                  <Button onClick={() => handleWater(seed.id)} className="mt-2">
                    Water this seed 💧
                  </Button>
                ) : (
                  <p className="text-green-600 font-medium mt-2">This flower has bloomed! 🌟</p>
                )}
                <div className="mt-4 flex flex-col gap-2">
                  <Button onClick={() => handleShare(seed.id)} variant="outline">🔗 Share</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {shareId && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm text-center">
            <h2 className="text-xl font-bold text-purple-700 mb-2">📤 Share Seed</h2>
            <p className="mb-4 text-sm">Choose a way to share your planted seed with others:</p>
            <div className="flex flex-col gap-2 mb-4">
              <Button
                onClick={() => {
                  const url = `${window.location.origin}/flower/${shareId}`;
                  navigator.clipboard.writeText(url);
                  alert("📋 Link copied!");
                }}
              >📋 Copy Link</Button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(window.location.origin + '/flower/' + shareId)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center border border-green-500 text-green-600 px-4 py-2 rounded hover:bg-green-50"
              >📲 Share on WhatsApp</a>
              <a
                href={`https://twitter.com/intent/tweet?text=Check%20out%20my%20seed!%20${encodeURIComponent(window.location.origin + '/flower/' + shareId)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center border border-blue-500 text-blue-500 px-4 py-2 rounded hover:bg-blue-50"
              >🐦 Share on Twitter</a>
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
            <a
              href={currentReward.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline mb-4 inline-block"
            >
              Claim Reward
            </a>
            <div>
              <Button onClick={() => setRewardOpen(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {showReward && <SurpriseReward onClose={() => setShowReward(false)} />}
    </div>
  );
}
