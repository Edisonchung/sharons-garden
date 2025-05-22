// pages/garden/achievements.js
import { useEffect, useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import Link from 'next/link';

const ALL_ACHIEVEMENTS = [
  { name: 'First Bloom', icon: '🌸', desc: 'Bloomed your first flower!', condition: (b, t, w) => b >= 1 },
  { name: 'Gardener', icon: '🌼', desc: 'Bloomed 3 flowers', condition: (b, t, w) => b >= 3 },
  { name: 'Flower Fanatic', icon: '🌻', desc: 'Bloomed 7 flowers', condition: (b, t, w) => b >= 7 },
  { name: 'Garden Master', icon: '👑', desc: 'Collected all flower types', condition: (b, t, w) => t >= 5 },
  { name: 'Diligent Waterer', icon: '💧', desc: 'Watered 20 times', condition: (b, t, w) => w >= 20 }
];

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState([]);

  useEffect(() => {
    const cached = JSON.parse(localStorage.getItem('flowers') || '{}');
    const all = Object.values(cached);
    const bloomed = all.filter(f => f.bloomed);
    const types = new Set(bloomed.map(f => f.type));
    const waterCounts = all.reduce((sum, f) => sum + (f.waterCount || 0), 0);

    const unlocked = ALL_ACHIEVEMENTS.map(a => ({
      ...a,
      unlocked: a.condition(bloomed.length, types.size, waterCounts),
      progress: a.name === 'Diligent Waterer' ? waterCounts : a.name === 'Flower Fanatic' ? bloomed.length : 0
    }));

    setAchievements(unlocked);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 to-purple-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-purple-800">🏅 My Achievements</h1>
        <Link href="/">
          <Button variant="outline">🏡 Back to Garden</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {achievements.map((a, index) => (
          <Card
            key={index}
            className={`rounded-xl p-4 shadow-lg border-l-4 ${a.unlocked ? 'border-yellow-400 bg-white' : 'border-gray-300 bg-gray-100 opacity-70'}`}
          >
            <CardContent>
              <h3 className={`text-xl font-semibold ${a.unlocked ? 'text-yellow-600' : 'text-gray-400'}`}>
                {a.icon} {a.name}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{a.desc}</p>
              {!a.unlocked && (
                <p className="text-xs text-gray-500 mt-2 italic">Not yet unlocked</p>
              )}
              {a.name === 'Diligent Waterer' && (
                <div className="text-xs mt-1 text-gray-500">Progress: {a.progress}/20</div>
              )}
              {a.name === 'Flower Fanatic' && (
                <div className="text-xs mt-1 text-gray-500">Progress: {a.progress}/7</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}