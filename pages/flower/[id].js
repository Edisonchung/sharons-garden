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
  const [canWater, setCanWater] = useState(true);
  const [showReward, setShowReward] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!id || !isClient) return;

    try {
      const cached = JSON.parse(localStorage.getItem('flowers') || '{}');
      const found = cached[id];
      if (found) {
        setFlower(found);
        setWaterCount(found.waterCount || 0);
        setBloomed(found.waterCount >= 7);
      }

      const key = `lastWatered_${id}`;
      const storedTime = localStorage.getItem(key);
      if (storedTime) {
        const last = new Date(storedTime);
        const now = new Date();
        const sameDay = last.toDateString() === now.toDateString();
        setLastWatered(last);
        setCanWater(!sameDay);
      }
    } catch (err) {
      console.error('Failed to access localStorage', err);
    }
  }, [id, isClient]);

  const handleWater = () => {
    if (!canWater) return alert("You've already watered this flower today. Try again tomorrow 🌙");

    const newCount = waterCount + 1;
    setWaterCount(newCount);
    const isBloomed = newCount >= 7;
    setBloomed(isBloomed);

    try {
      const cached = JSON.parse(localStorage.getItem('flowers') || '{}');
      if (cached[id]) {
        cached[id].waterCount = newCount;
        cached[id].bloomed = isBloomed;
      }
      localStorage.setItem('flowers', JSON.stringify(cached));

      const now = new Date();
      localStorage.setItem(`lastWatered_${id}`, now.toISOString());
      setCanWater(false);

      if (newCount === 7) {
        setShowReward(true);
      }
    } catch (err) {
      console.error('Watering failed:', err);
    }
  };

  if (!isClient || !flower) return <p className="text-center mt-10">🌼 Loading flower...</p>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-purple-100 to-pink-100 p-6">
      <Card className="bg-white max-w-md w-full shadow-xl rounded-2xl p-6 text-center">
        <CardContent>
          <h2 className="text-2xl font-bold text-purple-700 mb-2">
            {bloomed ? '🌸' : '🌼'} {flower.emotion}
          </h2>
          <p className="text-sm italic text-gray-500 mb-1">— {flower.name || 'Anonymous'}</p>
          {flower.note && (
            <p className="text-sm text-gray-600 mb-2">“{flower.note}”</p>
          )}
          <p className="text-gray-600 mb-2">Watered {waterCount} / 7 times</p>
          {!bloomed ? (
            <Button onClick={handleWater} disabled={!canWater}>
              {canWater ? '💧 Water this flower' : '⏳ Come back tomorrow'}
            </Button>
          ) : (
            <div>
              <p className="text-green-600 font-medium">This flower has bloomed! 🌟</p>
              {!rewardShown && (
                <div className="mt-4">
                  <p className="mb-2">🎁 Reward: Sharon’s exclusive voice note</p>
                  <a
                    href="https://example.com/sharon-reward"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    Claim Reward
                  </a>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {showReward && <SurpriseReward onClose={() => setShowReward(false)} />}
    </div>
  );
}
