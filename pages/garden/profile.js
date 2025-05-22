// pages/garden/profile.js
import { useEffect, useState, useRef } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import html2canvas from 'html2canvas';

export default function GardenProfile() {
  const [flowers, setFlowers] = useState([]);
  const [badges, setBadges] = useState([]);
  const storyRef = useRef(null);

  useEffect(() => {
    const cached = JSON.parse(localStorage.getItem('flowers') || '{}');
    setFlowers(Object.values(cached));

    const unlocked = [];
    const types = ['first-bloom', 'gardener', 'fanatic', 'master', 'waterer'];
    types.forEach((type) => {
      if (localStorage.getItem(`badge_${type.replace('-', ' ')}`)) {
        unlocked.push(`/badges/${type}.png`);
      }
    });
    setBadges(unlocked);
  }, []);

  const total = flowers.length;
  const bloomed = flowers.filter(f => f.bloomed).length;
  const totalWaterings = flowers.reduce((sum, f) => sum + (f.waterCount || 0), 0);
  const mostType = Object.entries(
    flowers.reduce((acc, f) => {
      acc[f.type] = (acc[f.type] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

  const recentBlooms = flowers
    .filter(f => f.bloomed && f.bloomTime)
    .sort((a, b) => b.bloomTime - a.bloomTime)
    .slice(0, 5);

  const handleStoryDownload = async () => {
    if (!storyRef.current) return;
    const canvas = await html2canvas(storyRef.current);
    const link = document.createElement('a');
    link.download = 'my-garden-story.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-purple-100 p-6 text-center">
      <h1 className="text-3xl font-bold text-purple-700 mb-6">🌸 My Garden Summary</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8">
        <Card className="p-6">
          <CardContent>
            <h2 className="text-xl font-semibold">🌱 Seeds Planted</h2>
            <p className="text-2xl font-bold text-purple-800">{total}</p>
          </CardContent>
        </Card>
        <Card className="p-6">
          <CardContent>
            <h2 className="text-xl font-semibold">🌸 Flowers Bloomed</h2>
            <p className="text-2xl font-bold text-green-600">{bloomed}</p>
          </CardContent>
        </Card>
        <Card className="p-6">
          <CardContent>
            <h2 className="text-xl font-semibold">💖 Most Planted Emotion</h2>
            <p className="text-2xl font-bold text-pink-500">{mostType}</p>
          </CardContent>
        </Card>
        <Card className="p-6">
          <CardContent>
            <h2 className="text-xl font-semibold">💧 Total Waterings</h2>
            <p className="text-2xl font-bold text-blue-500">{totalWaterings}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4 justify-center mb-10">
        <a href="/garden/certificate">
          <Button>🎓 View Certificate</Button>
        </a>
        <Button variant="outline" onClick={handleStoryDownload}>📸 Download Story</Button>
      </div>

      <div ref={storyRef} className="bg-white p-4 rounded-lg shadow w-full max-w-2xl mx-auto mb-8">
        <h2 className="text-lg font-bold text-purple-700 mb-3">🌿 My Garden Story Preview</h2>
        <p className="text-sm">Seeds Planted: {total}</p>
        <p className="text-sm">Flowers Bloomed: {bloomed}</p>
        <p className="text-sm">Most Planted: {mostType}</p>
        <p className="text-sm">Waterings: {totalWaterings}</p>
        <div className="flex flex-wrap gap-2 mt-2 justify-center">
          {badges.map((src, i) => (
            <img key={i} src={src} alt="badge" className="w-12 h-12" />
          ))}
        </div>
      </div>

      <h2 className="text-2xl font-semibold text-purple-800 mb-4">🏅 Badges Earned</h2>
      {badges.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-4 mb-10">
          {badges.map((badge, idx) => (
            <img
              key={idx}
              src={badge}
              alt="badge"
              className="w-24 h-24 object-contain border rounded shadow"
            />
          ))}
        </div>
      ) : (
        <p className="text-gray-500 italic mb-10">No badges unlocked yet.</p>
      )}

      <h2 className="text-2xl font-semibold text-purple-800 mb-4">🗓️ Recent Blooms</h2>
      {recentBlooms.length > 0 ? (
        <div className="flex flex-col items-center gap-2 mb-10">
          {recentBlooms.map((f, i) => (
            <div key={i} className="text-sm text-gray-700">
              <span className="text-lg">{f.bloomedFlower}</span> {f.type} by <strong>{f.name || 'Anonymous'}</strong> bloomed on{' '}
              {new Date(f.bloomTime).toLocaleDateString()}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 italic mb-10">No recent blooms yet.</p>
      )}

      <p className="text-gray-600 text-sm">Keep planting and sharing to grow your emotional garden 🌼</p>
    </div>
  );
}
