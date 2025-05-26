// Complete SeedTypeSelection Component
import { useState } from 'react';

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

export default function SeedTypeSelection({ isOpen = true, onClose, onSelectSeed, userName = 'Gardener' }) {
  const [selectedType, setSelectedType] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  if (!isOpen) return null;

  const handleSelect = (seedType) => {
    console.log('Seed selected:', seedType.name); // Debug log
    setSelectedType(seedType);
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    if (selectedType && onSelectSeed) {
      console.log('Confirming selection:', selectedType.name); // Debug log
      onSelectSeed(selectedType);
    }
    handleClose();
  };

  const handleBack = () => {
    setShowConfirmation(false);
    setSelectedType(null);
  };

  const handleClose = () => {
    setShowConfirmation(false);
    setSelectedType(null);
    if (onClose) onClose();
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
                <div
                  key={seedType.id}
                  className={`cursor-pointer transition-all duration-200 hover:scale-105 border-2 ${seedType.borderColor} hover:shadow-lg rounded-lg bg-gradient-to-br ${seedType.bgColor} p-4`}
                  onClick={() => handleSelect(seedType)}
                >
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
                </div>
              ))}
            </div>

            <div className="text-center">
              <button 
                onClick={handleClose}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
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
              <button 
                onClick={handleBack}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Choose Different
              </button>
              <button 
                onClick={handleConfirm}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Plant My {selectedType.name} 🌱
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Demo Component to test the seed selection
function SeedSelectionDemo() {
  const [showModal, setShowModal] = useState(false);
  const [selectedSeed, setSelectedSeed] = useState(null);

  const handleSeedSelected = (seedType) => {
    console.log('Seed type selected:', seedType);
    setSelectedSeed(seedType);
    setShowModal(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-200 p-8">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-purple-700 mb-4">
          🌱 Sharon's Garden - Seed Selection Demo
        </h1>
        
        <p className="text-gray-600 mb-8">
          Test the seed type selection component to see how it works!
        </p>

        {selectedSeed ? (
          <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
            <h2 className="text-xl font-bold text-purple-700 mb-4">
              Selected Seed Type:
            </h2>
            <div className={`bg-gradient-to-br ${selectedSeed.bgColor} p-4 rounded-lg border-2 ${selectedSeed.borderColor} mb-4`}>
              <div className="text-4xl mb-2">{selectedSeed.emoji}</div>
              <h3 className={`text-lg font-bold ${selectedSeed.textColor}`}>
                {selectedSeed.name}
              </h3>
              <p className={`text-sm ${selectedSeed.textColor} opacity-80 mt-2`}>
                "{selectedSeed.description}"
              </p>
            </div>
            <button 
              onClick={() => setSelectedSeed(null)}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors text-sm"
            >
              Clear Selection
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
            <p className="text-gray-500 italic">No seed type selected yet</p>
          </div>
        )}

        <button 
          onClick={() => setShowModal(true)}
          className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-lg font-medium"
        >
          🌱 Choose Your Seed Type
        </button>

        <SeedTypeSelection
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSelectSeed={handleSeedSelected}
          userName="Demo User"
        />
      </div>
    </div>
  );
}
