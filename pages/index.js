// pages/index.js

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { motion } from 'framer-motion';
import SurpriseReward from '../components/SurpriseReward';

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
  const [hasEntered, setHasEntered] = useState(false);
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
    const cached = JSON.parse(localStorage.getItem('flowers') || '{}');
    setPlanted(Object.values(cached));
  }, []);

  const handlePlant = () => {
    if (seedType.trim()) {
      const newSeed = {
        id: Date.now(),
        type: seedType,
        color: seedColor,
        name,
        note,
        waterCount: 0,
        bloomed: false,
        bloomedFlower: null
      };
      const cached = JSON.parse(localStorage.getItem('flowers') || '{}');
      cached[newSeed.id] = newSeed;
      localStorage.setItem('flowers', JSON.stringify(cached));
      setPlanted(Object.values(cached));
      setName('');
      setNote('');
    }
  };

  const handleWater = (id) => {
    const today = new Date().toDateString();
    const lastKey = `lastWatered_${id}`;
    const last = localStorage.getItem(lastKey);
    if (last && new Date(last).toDateString() === today) {
      alert("You've already watered this seed today. Try again tomorrow 🌙");
      return;
    }

    setPlanted((prev) => {
      const updated = prev.map((seed) => {
        if (seed.id === id) {
          const newCount = seed.waterCount + 1;
          const bloomed = newCount >= 7;
          const flowerIcon = seedTypes.find(s => s.type === seed.type)?.flower || '🌸';
          const updatedSeed = {
            ...seed,
            waterCount: newCount,
            bloomed,
            bloomedFlower: bloomed ? flowerIcon : null
          };
          const cached = JSON.parse(localStorage.getItem('flowers') || '{}');
          cached[seed.id] = updatedSeed;
          localStorage.setItem('flowers', JSON.stringify(cached));
          localStorage.setItem(lastKey, new Date().toISOString());

          if (bloomed && !seed.bloomed) {
            setCurrentReward({
              emotion: `${seed.type} Seed`,
              reward: 'Access Sharon’s exclusive voice message 🌟',
              link: 'https://example.com/sharon-reward'
            });
            setRewardOpen(true);
            setShowReward(true);
          }
          return updatedSeed;
        }
        return seed;
      });
      return updated;
    });
  };

  const handleShare = (id) => {
    setShareId(id);
  };

  const closeShare = () => {
    setShareId(null);
  };

  if (!hasEntered) {
    return (
      <div
        className="min-h-screen w-screen flex items-center justify-center bg-pink-100 cursor-pointer relative"
        onClick={() => {
          if (audioRef.current) audioRef.current.play();
          router.push('/auth');
        }}
      >
        <img
          src="/welcome.png"
          alt="Welcome"
          className="absolute inset-0 object-cover w-full h-full"
        />
        <div className="absolute bottom-10 w-full text-center text-white font-bold text-lg shadow-md">
          Tap anywhere to begin
        </div>
        <audio ref={audioRef} src="/garden-bgm.mp3" preload="auto" />
      </div>
    );
  }

  return null;
}
