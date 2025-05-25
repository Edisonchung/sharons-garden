// components/SeedTypeSelection.js
// The 5 Seed Types emotional connection system

import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

const SEED_TYPES = [
  {
    id: 'hope',
    emoji: '☀️',
    name: 'Dawn Seed',
    description: 'She radiates warmth like sunshine',
    sharonConnection: 'You see Sharon as a source of light and positivity',
    flowerTypes: ['Sunflower', 'Tulip', 'Yellow Rose'],
    bgColor: 'from-yellow-100 to-orange-200',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-300'
  },
  {
    id: 'healing',
    emoji: '🌙',
    name: 'Star Dream Seed', 
    description: 'Her voice brings you peace',
    sharonConnection: 'You find Sharon\'s presence healing and comforting',
    flowerTypes: ['Lavender', 'Lily', 'Baby\'s Breath'],
    bgColor: 'from-purple-100 to-indigo-200',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-300'
  },
  {
    id: 'strong',
    emoji: '💪',
    name: 'Resilience Seed',
    description: 'She\'s gentle yet unbreakably strong',
    sharonConnection: 'You admire Sharon\'s quiet strength and determination',
    flowerTypes: ['Violet', 'Peony', 'Camellia'],
    bgColor: 'from-purple-100 to-pink-200',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-300'
  },
  {
    id: 'companion',
    emoji: '❤️',
    name: 'Heart Whisper Seed',
    description: 'She feels like a close friend',
    sharonConnection: 'You feel Sharon understands and accompanies you',
    flowerTypes: ['Daisy', 'Pink Rose', 'Lotus'],
    bgColor: 'from-pink-100 to-rose-200',
    textColor: 'text-rose-700',
    borderColor: 'border-rose-300'
  },
  {
    id: 'mystery',
    emoji: '✨',
    name: 'Feather Light Seed',
    description: 'She\'s mysterious and uniquely special',
    sharonConnection: 'You\'re captivated by Sharon\'s enigmatic charm',
    flowerTypes: ['Orchid', 'Anthurium', 'Blue Rose'],
    bgColor: 'from-indigo-100 to-purple-200',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-300'
  }
];

export default function SeedTypeSelection({ isOpen, onClose, onSelectSeed, userName = 'Gardener' }) {
  const [selectedType, setSelectedType] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  if (!isOpen) return null;

  const handleSelect = (seedType) => {
    setSelectedType(seedType);
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    if (selectedType) {
      onSelectSeed(selectedType);
      setShowConfirmation(false);
      setSelectedType(null);
      onClose();
    }
  };

  const handleBack = () => {
    setShowConfirmation(false);
    setSelectedType(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        
        {!showConfirmation ? (
          // Seed Type Selection Screen
          <div className="p-6">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-purple-700 mb-2">
                🌱 Choose Your Connection to Sharon
              </h2>
              <p className="text-gray-600">
                How do you feel about Sharon? Your choice will determine what kind of emotional seed you receive.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {SEED_TYPES.map((seedType) => (
                <Card 
                  key={seedType.id}
                  className={`cursor-pointer transition-all duration-200 hover:scale-105 border-2 ${seedType.borderColor} hover:shadow-lg`}
                  onClick={() => handleSelect(seedType)}
                >
                  <CardContent className={`p-4 bg-gradient-to-br ${seedType.bgColor} rounded-lg`}>
                    <div className="text-center">
                      <div className="text-4xl mb-2">{seedType.emoji}</div>
                      <h3 className={`text-lg font-bold ${seedType.textColor} mb-2`}>
                        {seedType.name}
                      </h3>
                      <p className={`text-sm ${seedType.textColor} opacity-80 mb-3`}>
                        "{seedType.description}"
                      </p>
                      <div className={`text-xs ${seedType.textColor} opacity-60`}>
                        Can bloom: {seedType.flowerTypes.join(', ')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center">
              <Button onClick={onClose} variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          // Confirmation Screen
          <div className="p-6 text-center">
            <h2 className="text-2xl font-bold text-purple-700 mb-4">
              Perfect Choice, {userName}! 
            </h2>
            
            <div className={`bg-gradient-to-br ${selectedType.bgColor} p-6 rounded-xl border-2 ${selectedType.borderColor} mb-6 max-w-md mx-auto`}>
              <div className="text-6xl mb-4">{selectedType.emoji}</div>
              <h3 className={`text-xl font-bold ${selectedType.textColor} mb-2`}>
                {selectedType.name}
              </h3>
              <p className={`text-sm ${selectedType.textColor} opacity-80 mb-4`}>
                {selectedType.sharonConnection}
              </p>
              <div className={`text-xs ${selectedType.textColor} opacity-60`}>
                Your seed can bloom into: {selectedType.flowerTypes.join(', ')}
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-2">
                🌱 Your {selectedType.name} is ready to be planted!
              </p>
              <p className="text-sm text-gray-500">
                Water it daily and invite friends to help it grow. When it blooms, you'll receive a special message from Sharon.
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <Button onClick={handleBack} variant="outline">
                Choose Different
              </Button>
              <Button onClick={handleConfirm}>
                Plant My {selectedType.name} 🌱
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Export the seed types for use in other components
export { SEED_TYPES };
