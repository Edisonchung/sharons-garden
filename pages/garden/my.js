// pages/garden/my.js
import { useEffect, useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

export default function MyGardenPage() {
  const [mySeeds, setMySeeds] = useState([]);

  useEffect(() => {
    const cached = JSON.parse(localStorage.getItem('flowers') || '{}');
    const all = Object.values(cached);
    setMySeeds(all);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-100 to-green-100 p-6">
      <h1 className="text-4xl font-bold text-center mb-6">🌱 My Garden</h1>
      <p className="text-center text-md text-gray-700 mb-8">These are the seeds you've planted and their growth journey.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {mySeeds.map((seed) => (
          <Card key={seed.id} className="bg-white shadow-md rounded-xl p-4">
            <CardContent>
              <h3 className="text-lg font-semibold text-purple-700">
                {seed.bloomed ? `${seed.bloomedFlower} ${seed.type}` : '🌱 Seedling'}
              </h3>
              <p className="text-sm italic text-gray-500">{seed.color} • {seed.name || 'Anonymous'}</p>
              {seed.note && <p className="text-sm text-gray-600 mb-2">“{seed.note}”</p>}
              <p className="text-sm text-gray-500 mb-2">Watered {seed.waterCount} / 7</p>
              <a
                href={`/flower/${seed.id}`}
                className="inline-block text-blue-600 font-medium hover:underline"
              >
                View</a>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
