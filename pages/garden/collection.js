// pages/garden/collection.js
import { useEffect, useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import Link from 'next/link';

export default function FlowerCollection() {
  const [collection, setCollection] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const cached = JSON.parse(localStorage.getItem('flowers') || '{}');
    const bloomed = Object.values(cached).filter(f => f.bloomed);
    setCollection(bloomed);
  }, []);

  const filtered = collection.filter(flower => {
    if (filter === 'rare') return flower.rarity === 'rare';
    if (filter === 'rainbow') return flower.rarity === 'rainbow';
    return true;
  });

  const progress = collection.length;
  const max = 20;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-purple-700">🌼 My Flower Collection</h1>
        <Link href="/">
          <Button variant="outline">🏡 Back to Garden</Button>
        </Link>
      </div>

      <p className="text-sm text-gray-700 mb-4">You’ve collected <strong>{progress}</strong> of <strong>{max}</strong> flowers.</p>

      <div className="flex gap-4 mb-6">
        <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>All</Button>
        <Button variant={filter === 'rare' ? 'default' : 'outline'} onClick={() => setFilter('rare')}>💎 Rare</Button>
        <Button variant={filter === 'rainbow' ? 'default' : 'outline'} onClick={() => setFilter('rainbow')}>🌈 Rainbow</Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-gray-500">No flowers yet — keep watering!</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filtered.map(flower => (
            <Card key={flower.id} className="bg-white border-l-4 border-purple-300 shadow-md rounded-xl p-4">
              <CardContent>
                <h3 className="text-xl font-semibold text-purple-700">
                  {flower.bloomedFlower} {flower.type}
                </h3>
                <p className="text-sm text-gray-500">Color: {flower.color}</p>
                <p className="text-sm text-gray-500">Note: {flower.note || '—'}</p>
                <p className="text-sm text-gray-400 mt-1">Watered {flower.waterCount}/7</p>
                {flower.rarity && (
                  <p className="text-xs mt-2 text-yellow-600">
                    {flower.rarity === 'rainbow' ? '🌈 Rainbow Grade' : '💎 Rare Flower'}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}