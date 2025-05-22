// pages/garden/timeline.js
import { useEffect, useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

export default function TimelinePage() {
  const [blooms, setBlooms] = useState([]);
  const [filter, setFilter] = useState('All');
  const [editingId, setEditingId] = useState(null);
  const [reflectionText, setReflectionText] = useState('');

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

  const startEditing = (id, currentText) => {
    setEditingId(id);
    setReflectionText(currentText || '');
  };

  const saveReflection = (id) => {
    const cached = JSON.parse(localStorage.getItem('flowers') || '{}');
    if (cached[id]) {
      cached[id].reflection = reflectionText;
      localStorage.setItem('flowers', JSON.stringify(cached));
    }
    const updated = blooms.map(f => f.id === id ? { ...f, reflection: reflectionText } : f);
    setBlooms(updated);
    setEditingId(null);
    setReflectionText('');
  };

  const flowerTypes = Array.from(new Set(blooms.map(f => f.type)));
  const filtered = filter === 'All' ? blooms : blooms.filter(f => f.type === filter);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-purple-50 p-6">
      <h1 className="text-3xl font-bold text-center text-purple-800 mb-4">🗓️ Bloom Timeline</h1>

      <div className="text-center mb-6">
        <label className="mr-2 font-medium text-gray-700">Filter by type:</label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="p-2 rounded border">
          <option value="All">All</option>
          {flowerTypes.map((type, i) => (
            <option key={i} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        {filtered.map((bloom, index) => (
          <Card key={index} className="p-4 shadow-md border-l-4 border-purple-300">
            <CardContent>
              <h2 className="text-lg font-bold text-purple-700">{bloom.bloomedFlower} {bloom.type}</h2>
              <p className="text-sm italic text-gray-600">by {bloom.name || 'Anonymous'}</p>
              {bloom.note && <p className="text-sm text-gray-700 mt-1">“{bloom.note}”</p>}
              <p className="text-xs text-gray-500 mt-2">🌸 Bloomed on {new Date(bloom.bloomTime).toLocaleDateString()}</p>

              <div className="mt-3">
                {editingId === bloom.id ? (
                  <div>
                    <textarea
                      value={reflectionText}
                      onChange={(e) => setReflectionText(e.target.value)}
                      className="w-full p-2 border rounded mb-2"
                      rows={3}
                      placeholder="Write your reflection..."
                    />
                    <Button onClick={() => saveReflection(bloom.id)} className="mr-2">💾 Save</Button>
                    <Button variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                ) : (
                  <>
                    {bloom.reflection ? (
                      <p className="text-sm mt-2 text-gray-600">📝 {bloom.reflection}</p>
                    ) : (
                      <p className="text-sm mt-2 text-gray-400 italic">No reflection yet</p>
                    )}
                    <Button onClick={() => startEditing(bloom.id, bloom.reflection)} className="mt-2" variant="outline">
                      ✏️ {bloom.reflection ? 'Edit' : 'Add'} Reflection
                    </Button>
                  </>
                )}
              </div>

              <Button onClick={() => handleShare(bloom.id)} className="mt-4" variant="outline">
                🔗 Share This Bloom
              </Button>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-gray-500 italic">No blooms to show for this type 🌱</p>
        )}
      </div>
    </div>
  );
}
