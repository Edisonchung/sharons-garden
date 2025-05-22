// pages/garden/timeline.js
import { useEffect, useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

export default function TimelinePage() {
  const [blooms, setBlooms] = useState([]);

  useEffect(() => {
    const cached = JSON.parse(localStorage.getItem('flowers') || '{}');
    const list = Object.values(cached)
      .filter(f => f.bloomed && f.bloomTime)
      .sort((a, b) => new Date(b.bloomTime) - new Date(a.bloomTime));
    setBlooms(list);
  }, []);

  const handleShare = (id) => {
    const url = `${window.location.origin}/flower/${id}`;
    navigator.clipboard.writeText(url);
    alert('📋 Link copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-purple-50 p-6">
      <h1 className="text-3xl font-bold text-center text-purple-800 mb-8">🗓️ Bloom Timeline</h1>
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        {blooms.map((bloom, index) => (
          <Card key={index} className="p-4 shadow-md border-l-4 border-purple-300">
            <CardContent>
              <h2 className="text-lg font-bold text-purple-700">{bloom.bloomedFlower} {bloom.type}</h2>
              <p className="text-sm italic text-gray-600">by {bloom.name || 'Anonymous'}</p>
              {bloom.note && <p className="text-sm text-gray-700 mt-1">“{bloom.note}”</p>}
              <p className="text-xs text-gray-500 mt-2">🌸 Bloomed on {new Date(bloom.bloomTime).toLocaleDateString()}</p>
              <Button onClick={() => handleShare(bloom.id)} className="mt-3" variant="outline">
                🔗 Share This Bloom
              </Button>
            </CardContent>
          </Card>
        ))}
        {blooms.length === 0 && (
          <p className="text-center text-gray-500 italic">No blooms yet. Water your seeds to grow your story 🌱</p>
        )}
      </div>
    </div>
  );
}
