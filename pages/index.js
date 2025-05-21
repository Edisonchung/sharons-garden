import React, { useState, useEffect, useRef } from 'react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { motion } from 'framer-motion';

const emotionMoodMap = {
  joy: 'positive', love: 'positive', happy: 'positive', hope: 'positive',
  sad: 'negative', lost: 'negative', angry: 'negative', alone: 'negative',
  confused: 'neutral', calm: 'neutral', tired: 'neutral', stress: 'neutral'
};

const moodMusic = {
  positive: '/audio/sunny.mp3',
  negative: '/audio/rainy.mp3',
  neutral: '/audio/calm.mp3',
  dreamy: '/audio/dreamy.mp3'
};

export default function SharonsGarden() {
  const [emotion, setEmotion] = useState('');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [planted, setPlanted] = useState([]);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [currentReward, setCurrentReward] = useState(null);
  const [mood, setMood] = useState('');
  const audioRef = useRef(null);

  useEffect(() => {
    if (planted.length === 0) return;
    const counts = { positive: 0, neutral: 0, negative: 0 };
    planted.forEach((flower) => {
      const category = emotionMoodMap[flower.emotion.toLowerCase()] || 'neutral';
      counts[category] += 1;
    });
    const max = Math.max(counts.positive, counts.neutral, counts.negative);
    const moodState = Object.keys(counts).find(k => counts[k] === max) || 'dreamy';
    setMood(moodState);
  }, [planted]);

  useEffect(() => {
    if (!mood) return;
    const audioSrc = moodMusic[mood] || moodMusic['dreamy'];
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = audioSrc;
      audioRef.current.play().catch(() => {});
    }
  }, [mood]);

  const handlePlant = () => {
    if (emotion.trim()) {
      const newFlower = {
        id: Date.now(),
        emotion,
        name,
        note,
        waterCount: 0,
        bloomed: false
      };
      setPlanted([...planted, newFlower]);
      const cached = JSON.parse(localStorage.getItem('flowers') || '{}');
      cached[newFlower.id] = newFlower;
      localStorage.setItem('flowers', JSON.stringify(cached));
      setEmotion('');
      setName('');
      setNote('');
    }
  };

  const handleWater = (id) => {
    setPlanted((prev) =>
      prev.map((flower) => {
        if (flower.id === id) {
          const newCount = flower.waterCount + 1;
          const bloomed = newCount >= 5;
          if (bloomed && !flower.bloomed) {
            setCurrentReward({
              emotion: flower.emotion,
              reward: 'Access Sharon’s exclusive voice message 🌟',
              link: 'https://example.com/sharon-reward'
            });
            setRewardOpen(true);
          }
          const updated = { ...flower, waterCount: newCount, bloomed };
          const cached = JSON.parse(localStorage.getItem('flowers') || '{}');
          cached[flower.id] = updated;
          localStorage.setItem('flowers', JSON.stringify(cached));
          return updated;
        }
        return flower;
      })
    );
  };

  const handleShare = (id) => {
    const url = `${window.location.origin}/flower/${id}`;
    navigator.clipboard.writeText(url)
      .then(() => {
        alert("Link copied to clipboard! 🌐\n" + url);
      })
      .catch(err => {
        console.error("Clipboard error:", err);
        alert("Sorry, your browser may block clipboard access.");
      });
  };

  const moodText = mood === 'positive' ? '🌞 Sunny' : mood === 'negative' ? '🌧️ Rainy' : mood === 'neutral' ? '🌫️ Calm' : '🌈 Dreamy';

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-200 p-6 relative">
      <audio ref={audioRef} loop hidden />

      <h1 className="text-4xl font-bold text-center mb-2">🌸 Sharon's Garden of Emotions 🌸</h1>
      {planted.length > 0 && (
        <p className="text-center text-lg mb-4 font-semibold text-purple-700">Garden Mood: {moodText}</p>
      )}
      <p className="text-center text-md max-w-xl mx-auto mb-6">
        Plant your feelings, water them with love, and let them bloom into something beautiful. Sharon is your garden keeper, nurturing your emotions with music and light.
      </p>

      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-6">
        <Input placeholder="Your name..." value={name} onChange={(e) => setName(e.target.value)} className="w-full sm:w-1/4" />
        <Input placeholder="Write your emotion..." value={emotion} onChange={(e) => setEmotion(e.target.value)} className="w-full sm:w-1/4" />
        <Input placeholder="Add a short note (optional)..." value={note} onChange={(e) => setNote(e.target.value)} className="w-full sm:w-1/4" />
        <Button onClick={handlePlant}>Plant Emotion</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {planted.map((flower) => (
          <motion.div
            key={flower.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-white shadow-xl rounded-2xl p-4">
              <CardContent>
                <h3 className="text-xl font-semibold text-purple-700">
                  {flower.bloomed ? '🌸' : '🌼'} {flower.emotion}
                </h3>
                <p className="text-sm italic text-gray-500 mb-1">— {flower.name || 'Anonymous'}</p>
                {flower.note && (
                  <p className="text-sm text-gray-600 mb-2">“{flower.note}”</p>
                )}
                <p className="text-sm text-gray-500 mt-2">
                  Watered {flower.waterCount} / 5 times
                </p>
                {!flower.bloomed ? (
                  <Button onClick={() => handleWater(flower.id)} className="mt-2">
                    Water this flower 💧
                  </Button>
                ) : (
                  <p className="text-green-600 font-medium mt-2">This flower has bloomed! 🌟</p>
                )}
                <Button onClick={() => handleShare(flower.id)} className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white">
                  📤 Share Flower
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {rewardOpen && currentReward && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md text-center">
            <h2 className="text-2xl font-bold text-purple-700 mb-2">🎁 Reward Unlocked!</h2>
            <p className="mb-2">Your flower "{currentReward.emotion}" has fully bloomed.</p>
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
    </div>
  );
}
