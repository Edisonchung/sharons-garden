// pages/garden/my.js
import { useEffect, useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export default function MyGardenPage() {
  const [mySeeds, setMySeeds] = useState([]);
  const [filter, setFilter] = useState('all');
  const [summary, setSummary] = useState({ total: 0, bloomed: 0 });
  const [editingDedication, setEditingDedication] = useState(null);
  const [dedicationInput, setDedicationInput] = useState('');

  useEffect(() => {
    const cached = JSON.parse(localStorage.getItem('flowers') || '{}');
    const all = Object.values(cached);
    setMySeeds(all);
    const bloomCount = all.filter(seed => seed.bloomed).length;
    setSummary({ total: all.length, bloomed: bloomCount });
  }, []);

  const filteredSeeds = mySeeds.filter((seed) => {
    if (filter === 'bloomed') return seed.bloomed;
    if (filter === 'growing') return !seed.bloomed;
    return true;
  });

  const handleDedicationSave = (id) => {
    const updatedSeeds = mySeeds.map(seed => {
      if (seed.id === id) {
        const updated = { ...seed, dedication: dedicationInput };
        const cached = JSON.parse(localStorage.getItem('flowers') || '{}');
        cached[seed.id] = updated;
        localStorage.setItem('flowers', JSON.stringify(cached));
        return updated;
      }
      return seed;
    });
    setMySeeds(updatedSeeds);
    setEditingDedication(null);
    setDedicationInput('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-100 to-green-100 p-6">
      <h1 className="text-4xl font-bold text-center mb-2">🌱 My Garden</h1>
      <p className="text-center text-md text-gray-700 mb-4">These are the seeds you've planted and their growth journey.</p>

      <div className="text-center text-sm text-gray-600 mb-6">
        You’ve planted <strong>{summary.total}</strong> seeds — <strong>{summary.bloomed}</strong> have bloomed 🌸
      </div>

      <div className="flex justify-center gap-4 mb-8">
        <Button onClick={() => setFilter('all')} variant={filter === 'all' ? 'default' : 'outline'}>All</Button>
        <Button onClick={() => setFilter('growing')} variant={filter === 'growing' ? 'default' : 'outline'}>Growing</Button>
        <Button onClick={() => setFilter('bloomed')} variant={filter === 'bloomed' ? 'default' : 'outline'}>Bloomed</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {filteredSeeds.map((seed) => (
          <Card key={seed.id} className="bg-white shadow-md rounded-xl p-4 border-4" style={{ borderColor: seed.bloomed ? '#f472b6' : '#cbd5e1' }}>
            <CardContent>
              <h3 className="text-lg font-semibold text-purple-700">
                {seed.bloomed ? `${seed.bloomedFlower} ${seed.type}` : '🌱 Seedling'}
              </h3>
              <p className="text-sm italic text-gray-500">{seed.color} • {seed.name || 'Anonymous'}</p>
              {seed.note && <p className="text-sm text-gray-600 mb-1">“{seed.note}”</p>}
              {seed.bloomed && (
                <div className="mb-2">
                  {editingDedication === seed.id ? (
                    <div className="flex gap-2 items-center">
                      <Input
                        value={dedicationInput}
                        onChange={(e) => setDedicationInput(e.target.value)}
                        placeholder="Enter dedication..."
                        className="w-full"
                      />
                      <Button size="sm" onClick={() => handleDedicationSave(seed.id)}>Save</Button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-pink-600">🌟 Dedication: {seed.dedication || 'Not added yet'}</p>
                      <Button size="sm" variant="outline" onClick={() => {
                        setEditingDedication(seed.id);
                        setDedicationInput(seed.dedication || '');
                      }} className="mt-1">
                        {seed.dedication ? 'Edit' : 'Add'} Dedication
                      </Button>
                    </div>
                  )}
                </div>
              )}
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
