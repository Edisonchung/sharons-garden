// pages/flower/[id].js
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';

const mockData = {}; // TEMP in-memory store

export default function FlowerDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [flower, setFlower] = useState(null);
  const [waterCount, setWaterCount] = useState(0);
  const [bloomed, setBloomed] = useState(false);
  const [rewardShown, setRewardShown] = useState(false);

  useEffect(() => {
    if (id) {
      const cached = JSON.parse(localStorage.getItem('flowers') || '{}');
      const found = cached[id];
      if (found) {
        setFlower(found);
        setWaterCount(found.waterCount || 0);
        setBloomed(found.waterCount >= 5);
      }
    }
  }, [id]);

  const handleWater = () => {
    const newCount = waterCount + 1;
    setWaterCount(newCount);
    const isBloomed = newCount >= 5;
    setBloomed(isBloomed);

    const cached = JSON.parse(localStorage.getItem('flowers') || '{}');
    if (cached[id]) {
      cached[id].waterCount = newCount;
      cached[id].bloomed = isBloomed;
    }
    localStorage.setItem('flowers', JSON.stringify(cached));
  };

  if (!flower) return <p className="text-center mt-10">🌼 Loading flower...</p>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-purple-100 to-pink-100 p-6">
      <Card className="bg-white max-w-md w-full shadow-xl rounded-2xl p-6 text-center">
        <CardContent>
          <h2 className="text-2xl font-bold text-purple-700 mb-2">
            {bloomed ? '🌸' : '🌼'} {flower.emotion}
          </h2>
          <p className="text-gray-600 mb-2">Watered {waterCount} / 5 times</p>
          {!bloomed ? (
            <Button onClick={handleWater}>💧 Water this flower</Button>
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
    </div>
  );
}
