import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

// Confetti component
const Confetti = ({ show }) => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (show) {
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: -10,
        rotation: Math.random() * 360,
        color: ['#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#3b82f6'][Math.floor(Math.random() * 5)]
      }));
      setParticles(newParticles);
    }
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 animate-fall"
          style={{
            left: `${particle.x}%`,
            backgroundColor: particle.color,
            transform: `rotate(${particle.rotation}deg)`,
            animation: 'fall 3s ease-out forwards'
          }}
        />
      ))}
      <style jsx>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

// Bloom Animation Component
export default function BloomAnimation({ 
  flower = {
    name: 'Daisy',
    emoji: '🌼',
    type: 'Heart Whisper',
    sharonMessage: "In a field of roses, I'd still pick you as my daisy - simple, honest, and true."
  },
  seedType = {
    name: 'Heart Whisper Seed',
    emoji: '❤️',
    bgColor: 'from-pink-100 to-rose-200'
  },
  onComplete = () => {},
  userName = 'Gardener',
  personalMessage = 'Grown with love and patience'
}) {
  const [stage, setStage] = useState('growing');
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCard, setShowCard] = useState(false);

  useEffect(() => {
    const sequence = async () => {
      // Growing stage
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Blooming stage  
      setStage('blooming');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Complete stage
      setStage('complete');
      setShowConfetti(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show the enhanced card
      setShowCard(true);
    };

    sequence();
  }, []);

  const getStageEmoji = () => {
    switch (stage) {
      case 'growing': return '🌱';
      case 'blooming': return '🌸';
      case 'complete': return flower.emoji;
      default: return '🌱';
    }
  };

  const getStageText = () => {
    switch (stage) {
      case 'growing': return 'Your seed is growing...';
      case 'blooming': return 'It\'s blooming! ✨';
      case 'complete': return `Your ${flower.name} has bloomed!`;
      default: return '';
    }
  };

  return (
    <>
      {/* Confetti Effect */}
      <Confetti show={showConfetti} />

      {/* Bloom Animation Overlay */}
      {!showCard && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-40">
          <div className="text-center">
            <div 
              className={`text-8xl mb-4 transition-all duration-1000 ${
                stage === 'blooming' ? 'animate-bounce scale-125' : ''
              } ${stage === 'complete' ? 'animate-pulse' : ''}`}
            >
              {getStageEmoji()}
            </div>
            <p className="text-white text-xl font-medium">
              {getStageText()}
            </p>
            {stage === 'blooming' && (
              <p className="text-purple-300 text-sm mt-2">
                Something magical is happening... 🪄
              </p>
            )}
          </div>
        </div>
      )}

      {/* Enhanced Flower Card */}
      {showCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
            
            {/* Flower Card Content */}
            <div 
              className={`bg-gradient-to-br ${seedType.bgColor || 'from-purple-100 to-pink-200'} p-8 rounded-t-xl relative overflow-hidden`}
            >
              {/* Decorative Background */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-4 right-4 text-6xl animate-pulse">🌸</div>
                <div className="absolute bottom-4 left-4 text-4xl">🌱</div>
              </div>

              {/* Main Content */}
              <div className="relative z-10 text-center">
                <h1 className="text-2xl font-bold text-purple-700 mb-2">
                  ✨ Bloom Complete! ✨
                </h1>
                
                <div className="text-8xl mb-4 animate-bounce">{flower.emoji}</div>
                
                <h2 className="text-3xl font-bold text-purple-700 mb-2">
                  {flower.name}
                </h2>
                
                {/* Sharon's Message */}
                <div className="bg-white bg-opacity-70 p-4 rounded-lg mb-4">
                  <p className="text-sm text-gray-700 italic">
                    "{flower.sharonMessage}"
                  </p>
                  <p className="text-xs text-gray-500 mt-2">— Sharon 💜</p>
                </div>

                {/* Achievement */}
                <div className="bg-yellow-100 bg-opacity-70 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    🏆 Achievement Unlocked!
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    You've successfully grown a {flower.type} flower
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 space-y-3 bg-white rounded-b-xl">
              <p className="text-center text-sm text-gray-600">
                Share your beautiful bloom with the world!
              </p>
              
              <div className="grid grid-cols-2 gap-2">
                <Button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                  📸 Share
                </Button>
                <Button variant="outline">
                  💾 Save
                </Button>
              </div>
              
              <Button 
                onClick={onComplete}
                variant="outline" 
                className="w-full"
              >
                Continue to Garden
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
