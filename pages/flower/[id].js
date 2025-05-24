// pages/flower/[id].js
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import SurpriseReward from '../../components/SurpriseReward';

export default function FlowerDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [flower, setFlower] = useState(null);
  const [waterCount, setWaterCount] = useState(0);
  const [bloomed, setBloomed] = useState(false);
  const [rewardShown, setRewardShown] = useState(false);
  const [lastWatered, setLastWatered] = useState(null);
  const [canWater, setCanWater] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !id) return;

    try {
      const cached = JSON.parse(localStorage.getItem('flowers') || '{}');
      const found = cached[id];

      if (found) {
        setFlower(found);
        setWaterCount(found.waterCount || 0);
        const isBloomed = found.waterCount >= 7;
        setBloomed(isBloomed);
      }

      const key = `lastWatered_${id}`;
      const storedTime = localStorage.getItem(key);

      if (storedTime) {
        const last = new Date(storedTime);
        const now = new Date();
        const sameDay = last.toDateString() === now.toDateString();
        setLastWatered(last);
        setCanWater(!sameDay);
      } else {
        setCanWater(true);
      }
    } catch (err) {
      console.error('LocalStorage error:', err);
    }
  }, [id, isClient]);

  const handleWater = () => {
    if (!canWater) {
      alert("You've already watered this flower today. Try again tomorrow 🌙");
      return;
    }

    const newCount = waterCount + 1;
    const isBloomed = newCount >= 7;

    setWaterCount(newCount);
    setBloomed(isBloomed);
    setCanWater(false);

    const now = new Date();
    localStorage.setItem(`lastWatered_${id}`, now.toISOString());

    const cached = JSON.parse(localStorage.getItem('flowers') || '{}');
    if (cached[id]) {
      cached[id].waterCount = newCount;
      cached[id].bloomed = isBloomed;
      localStorage.setItem('flowers', JSON.stringify(cached));
    }

    if (newCount === 7) {
      setShowReward(true);
    }
  };

  if (!isClient) return null;

  if (!flower) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black text-gray-700 dark:text-white">
        <p className="text-center text-xl">🌼 Loading flower details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-purple-100 to-pink-100 dark:from-gray-900 dark:to-black p-6">
      <Card className="bg-white dark:bg-gray-800 max-w-md w-full shadow-xl rounded-2xl p-6 text-center">
        <CardContent>
          <h2 className="text-2xl font-bold text-purple-700 dark:text-purple-300 mb-2">
            {bloomed ? '🌸 Bloomed Flower' : '🌼 Growing Flower'}
          </h2>
          <p className="text-sm italic text-gray-600 dark:text-gray-400 mb-1">— {flower.name || 'Anonymous'}</p>
          {flower.note && (
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">“{flower.note}”</p>
          )}
          <p className="text-gray-600 dark:text-gray-400 mb-2">Watered {waterCount} / 7 times</p>

          {!bloomed ? (
            <Button onClick={handleWater} disabled={!canWater}>
              {canWater ? '💧 Water this flower' : '⏳ Come back tomorrow'}
            </Button>
          ) : (
            <div className="mt-3">
              <p className="text-green-600 font-medium dark:text-green-400 mb-2">
                This flower has bloomed! 🌟
              </p>
              {!rewardShown && (
                <div className="mt-2">
                  <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">
                    🎁 Reward: Sharon’s exclusive voice note
                  </p>
                  <a
                    href="https://example.com/sharon-reward"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 underline"
                  >
                    Claim Reward
                  </a>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 🎉 Surprise Reward Modal */}
      {showReward && <SurpriseReward onClose={() => setShowReward(false)} />}
    </div>
  );
}
