import React, { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Simulated flower data for demonstration
const DEMO_FLOWER = {
  id: '123',
  name: 'Daisy',
  type: 'Heart Whisper',
  emoji: '🌼',
  flowerLanguage: 'Loyal friendship',
  sharonMessage: "In a field of roses, I'd still pick you as my daisy - simple, honest, and true.",
  bloomedFlower: '🌼',
  note: 'Growing with love and patience',
  waterCount: 7,
  bloomed: true,
  bloomTime: new Date().toISOString()
};

const SEED_TYPE_DATA = {
  'Heart Whisper': {
    id: 'companion',
    emoji: '❤️',
    name: 'Heart Whisper Seed',
    bgColor: 'from-pink-100 to-rose-200',
    textColor: 'text-rose-700',
    borderColor: 'border-rose-300'
  }
};

export default function EnhancedFlowerCardDemo() {
  const [showCard, setShowCard] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef();

  const handleDownload = async () => {
    setDownloading(true);
    
    // Simulate download process
    setTimeout(() => {
      setDownloading(false);
      alert('✅ Card downloaded! (In production, this would save a real image)');
    }, 2000);
  };

  const handleSocialShare = (platform) => {
    if (platform === 'instagram') {
      handleDownload();
      setTimeout(() => {
        alert('📱 Image downloaded! Now share it as a story on Instagram and tag @sharon 💜');
      }, 2500);
    } else {
      alert(`🔗 Opening ${platform} share dialog...`);
    }
  };

  const FlowerCard = ({ flower, seedType, userName = 'Gardener', personalMessage = null }) => {
    return (
      <div 
        ref={cardRef}
        className="bg-gradient-to-br from-pink-100 to-purple-200 p-8 rounded-xl relative overflow-hidden"
        style={{ width: '400px', height: '600px' }}
      >
        {/* Decorative Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4 text-6xl">🌸</div>
          <div className="absolute bottom-4 left-4 text-4xl">🌱</div>
          <div className="absolute top-1/3 left-4 text-3xl">✨</div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 text-center h-full flex flex-col justify-between">
          
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-purple-700 mb-2">
              Sharon's Garden
            </h1>
            <div className="w-16 h-1 bg-purple-400 mx-auto rounded mb-4"></div>
          </div>

          {/* Flower Display */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="text-8xl mb-4">{flower.emoji}</div>
            
            <h2 className="text-3xl font-bold text-purple-700 mb-2">
              {flower.name}
            </h2>
            
            <div className="text-lg text-purple-600 opacity-80 mb-4 italic">
              "{flower.flowerLanguage}"
            </div>

            {/* Seed Type Badge */}
            {seedType && (
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-white bg-opacity-50 text-rose-700 text-sm font-medium mb-4 mx-auto">
                {seedType.emoji} {seedType.name}
              </div>
            )}

            {/* Sharon's Message */}
            <div className="bg-white bg-opacity-70 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-700 italic">
                "{flower.sharonMessage}"
              </p>
              <p className="text-xs text-gray-500 mt-2">— Sharon 💜</p>
            </div>

            {/* Personal Touch */}
            {personalMessage && (
              <div className="bg-white bg-opacity-50 p-3 rounded-lg mb-4">
                <p className="text-xs text-gray-600 italic">
                  "{personalMessage}"
                </p>
                <p className="text-xs text-gray-500 mt-1">— {userName}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center">
            <div className="text-xs text-gray-600 opacity-60 mb-1">
              Bloomed on {new Date(flower.bloomTime).toLocaleDateString()}
            </div>
            <div className="text-xs text-gray-500 opacity-50">
              sharons-garden.app 🌸
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-200 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-purple-700 text-center mb-8">
          🌸 Enhanced Flower Card Demo
        </h1>

        {/* Demo Controls */}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
          <h2 className="text-xl font-semibold text-purple-700 mb-4">
            Try the Enhanced Social Sharing
          </h2>
          <p className="text-gray-600 mb-4">
            This enhanced flower card is optimized for Instagram Stories (1080x1920) 
            and includes beautiful gradients, Sharon's personal messages, and social sharing features.
          </p>
          <Button 
            onClick={() => setShowCard(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            🌸 View Flower Card
          </Button>
        </div>

        {/* Preview Area */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-purple-700 mb-4">
            Preview Area
          </h3>
          <div className="flex justify-center">
            <div className="scale-75">
              <FlowerCard 
                flower={DEMO_FLOWER}
                seedType={SEED_TYPE_DATA['Heart Whisper']}
                userName="Demo Gardener"
                personalMessage="This flower reminds me of our beautiful friendship"
              />
            </div>
          </div>
        </div>

        {/* Modal for Full View */}
        {showCard && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
              
              {/* Shareable Flower Card */}
              <FlowerCard 
                flower={DEMO_FLOWER}
                seedType={SEED_TYPE_DATA['Heart Whisper']}
                userName="Demo Gardener"
                personalMessage="This flower reminds me of our beautiful friendship"
              />

              {/* Action Buttons */}
              <div className="p-4 space-y-3">
                
                {/* Social Sharing Buttons */}
                <div className="text-center mb-3">
                  <p className="text-sm text-gray-600 mb-2">✨ Share your bloom with the world!</p>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => handleSocialShare('instagram')}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm"
                  >
                    📸 Instagram Story
                  </Button>
                  
                  <Button
                    onClick={() => handleSocialShare('twitter')}
                    className="bg-blue-500 text-white text-sm"
                  >
                    🐦 Twitter
                  </Button>
                  
                  <Button
                    onClick={() => handleSocialShare('whatsapp')}
                    className="bg-green-500 text-white text-sm"
                  >
                    💬 WhatsApp
                  </Button>
                  
                  <Button
                    onClick={handleDownload}
                    disabled={downloading}
                    variant="outline"
                    className="text-sm"
                  >
                    {downloading ? 'Saving...' : '💾 Download'}
                  </Button>
                </div>

                {/* Close Button */}
                <Button 
                  onClick={() => setShowCard(false)} 
                  variant="outline" 
                  className="w-full mt-3"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
