// components/EnhancedFlowerCard.js
// Beautiful, shareable flower cards optimized for social media

import { useRef, useState } from 'react';
import { Button } from './ui/button';
import html2canvas from 'html2canvas';

export default function EnhancedFlowerCard({ 
  flower, 
  seedType, 
  userName = 'Gardener',
  isOpen, 
  onClose,
  personalMessage = null 
}) {
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef();

  if (!isOpen || !flower) return null;

  const handleDownload = async () => {
    if (!cardRef.current) return;

    try {
      setDownloading(true);
      
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#ffffff',
        scale: 3, // High resolution for social media
        useCORS: true,
        allowTaint: true,
        width: 400,
        height: 600
      });
      
      const link = document.createElement('a');
      link.download = `sharon-garden-${flower.name}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleSocialShare = (platform) => {
    const shareText = `🌸 My ${flower.name} just bloomed in Sharon's Garden! 🌱\n\n"${flower.flowerLanguage}"\n\n✨ ${flower.sharonMessage}\n\n#SharonsGarden #BloomWithSharon`;
    const shareUrl = `${window.location.origin}/garden`;

    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      instagram: '#', // Instagram doesn't support direct sharing, but we'll download the image
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`
    };

    if (platform === 'instagram') {
      handleDownload();
      alert('📱 Image downloaded! Now share it as a story on Instagram and tag @sharon 💜');
    } else {
      window.open(urls[platform], '_blank', 'width=600,height=400');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
        
        {/* Shareable Flower Card */}
        <div 
          ref={cardRef}
          className={`bg-gradient-to-br ${seedType?.bgColor || 'from-pink-100 to-purple-200'} p-8 rounded-xl relative overflow-hidden`}
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
              <div className={`w-16 h-1 ${seedType?.bgColor ? 'bg-purple-400' : 'bg-pink-400'} mx-auto rounded mb-4`}></div>
            </div>

            {/* Flower Display */}
            <div className="flex-1 flex flex-col justify-center">
              <div className="text-8xl mb-4">{flower.emoji}</div>
              
              <h2 className={`text-3xl font-bold ${seedType?.textColor || 'text-purple-700'} mb-2`}>
                {flower.name}
              </h2>
              
              <div className={`text-lg ${seedType?.textColor || 'text-purple-600'} opacity-80 mb-4 italic`}>
                "{flower.flowerLanguage}"
              </div>

              {/* Seed Type Badge */}
              {seedType && (
                <div className={`inline-flex items-center px-3 py-1 rounded-full bg-white bg-opacity-50 ${seedType.textColor} text-sm font-medium mb-4 mx-auto`}>
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
                Bloomed on {new Date().toLocaleDateString()}
              </div>
              <div className="text-xs text-gray-500 opacity-50">
                sharons-garden.app 🌸
              </div>
            </div>
          </div>
        </div>

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
            onClick={onClose} 
            variant="outline" 
            className="w-full mt-3"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// Enhanced bloom animation component
// components/BloomAnimation.js
import { useState, useEffect } from 'react';

export default function BloomAnimation({ 
  flower, 
  seedType, 
  onComplete,
  userName,
  personalMessage 
}) {
  const [stage, setStage] = useState('growing'); // growing -> blooming -> complete
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
      {/* Bloom Animation Overlay */}
      {stage !== 'complete' && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="text-center">
            <div 
              className={`text-8xl mb-4 transition-all duration-1000 ${
                stage === 'blooming' ? 'animate-bounce scale-125' : ''
              }`}
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
      <EnhancedFlowerCard
        flower={flower}
        seedType={seedType}
        userName={userName}
        personalMessage={personalMessage}
        isOpen={showCard}
        onClose={() => {
          setShowCard(false);
          onComplete();
        }}
      />
    </>
  );
}
