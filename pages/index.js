
import React, { useState } from 'react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { motion } from 'framer-motion';
import '../styles/globals.css';

export default function Home() {
  const [emotion, setEmotion] = useState('');
  const [planted, setPlanted] = useState([]);

  const handlePlant = () => {
    if (emotion.trim()) {
      setPlanted([...planted, { emotion, id: Date.now() }]);
      setEmotion('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-200 p-6">
      <h1 className="text-4xl font-bold text-center mb-4">🌸 Sharon's Garden of Emotions 🌸</h1>
      <p className="text-center text-lg max-w-xl mx-auto mb-8">
        Plant your feelings, water them with love, and let them bloom into something beautiful.
        Sharon is your garden keeper, nurturing your emotions with music and light.
      </p>

      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-6">
        <Input
          placeholder="Write your emotion..."
          value={emotion}
          onChange={(e) => setEmotion(e.target.value)}
          className="w-full sm:w-1/2"
        />
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
                <h3 className="text-xl font-semibold text-purple-700">🌼 {flower.emotion}</h3>
                <p className="text-sm text-gray-500 mt-2">Sharon is nurturing this with care 💖</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
