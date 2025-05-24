import { useEffect, useState } from 'react';
import { auth, db } from '../../lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

export default function TimelinePage() {
  const [timeline, setTimeline] = useState([]);
  const [filter, setFilter] = useState('All');
  const [editingId, setEditingId] = useState(null);
  const [reflectionText, setReflectionText] = useState('');
  const [photoData, setPhotoData] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        try {
          const q = query(
            collection(db, 'users', user.uid, 'timelineLogs'),
            where('type', '==', 'bloom')
          );
          const snap = await getDocs(q);
          const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          setTimeline(list);
        } catch (err) {
          console.error('Failed to load timeline logs:', err);
        }
      } else {
        const cached = JSON.parse(localStorage.getItem('flowers') || '{}');
        const list = Object.values(cached)
          .filter(f => f.bloomed && f.bloomTime)
          .sort((a, b) => new Date(b.bloomTime) - new Date(a.bloomTime));
        setTimeline(list);
      }
    });
    return () => unsub();
  }, []);

  const handleShare = (id) => {
    const url = `${window.location.origin}/flower/${id}`;
    navigator.clipboard.writeText(url);
    alert('📋 Link copied to clipboard!');
  };

  const startEditing = (id, currentText, currentPhoto) => {
    setEditingId(id);
    setReflectionText(currentText || '');
    setPhotoData(currentPhoto || null);
  };

  const saveReflection = async (id) => {
    const updated = timeline.map(f =>
      f.id === id ? { ...f, reflection: reflectionText, photo: photoData } : f
    );
    setTimeline(updated);
    setEditingId(null);
    setReflectionText('');
    setPhotoData(null);

    if (userId) {
      try {
        await setDoc(doc(db, 'users', userId, 'timelineLogs', id), {
          ...updated.find(f => f.id === id),
          updatedAt: new Date()
        });
      } catch (err) {
        console.warn('Failed to save to Firestore:', err);
      }
    } else {
      const cached = JSON.parse(localStorage.getItem('flowers') || '{}');
      if (cached[id]) {
        cached[id].reflection = reflectionText;
        if (photoData) cached[id].photo = photoData;
        localStorage.setItem('flowers', JSON.stringify(cached));
      }
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => setPhotoData(reader.result);
    if (file) reader.readAsDataURL(file);
  };

  const flowerTypes = Array.from(new Set(timeline.map(f => f.type)));
  const filtered = filter === 'All' ? timeline : timeline.filter(f => f.type === filter);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-purple-50 p-6">
      <h1 className="text-3xl font-bold text-center text-purple-800 mb-4">🗓️ Bloom Timeline</h1>

      <div className="text-center mb-6">
        <label className="mr-2 font-medium text-gray-700">Filter by type:</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="p-2 rounded border"
        >
          <option value="All">All</option>
          {flowerTypes.map((type, i) => (
            <option key={i} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        {filtered.map((entry, index) => (
          <Card key={index} className="p-4 shadow-md border-l-4 border-purple-300">
            <CardContent>
              <h2 className="text-lg font-bold text-purple-700">
                {entry.bloomedFlower} {entry.type}
              </h2>
              <p className="text-sm italic text-gray-600">by {entry.name || 'Anonymous'}</p>
              {entry.note && <p className="text-sm text-gray-700 mt-1">“{entry.note}”</p>}
              <p className="text-xs text-gray-500 mt-2">
                🌸 Bloomed on {new Date(entry.timestamp || entry.bloomTime).toLocaleDateString()}
              </p>

              {entry.photo && (
                <img src={entry.photo} alt="Uploaded" className="mt-3 rounded shadow-md max-h-48 object-contain" />
              )}

              <div className="mt-3">
                {editingId === entry.id ? (
                  <>
                    <textarea
                      value={reflectionText}
                      onChange={(e) => setReflectionText(e.target.value)}
                      className="w-full p-2 border rounded mb-2"
                      rows={3}
                      placeholder="Write your reflection..."
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="block w-full text-sm mb-2"
                    />
                    <Button onClick={() => saveReflection(entry.id)} className="mr-2">💾 Save</Button>
                    <Button variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                  </>
                ) : (
                  <>
                    {entry.reflection ? (
                      <p className="text-sm mt-2 text-gray-600">📝 {entry.reflection}</p>
                    ) : (
                      <p className="text-sm mt-2 text-gray-400 italic">No reflection yet</p>
                    )}
                    <Button
                      onClick={() => startEditing(entry.id, entry.reflection, entry.photo)}
                      className="mt-2"
                      variant="outline"
                    >
                      ✏️ {entry.reflection ? 'Edit' : 'Add'} Reflection & Photo
                    </Button>
                  </>
                )}
              </div>

              <Button onClick={() => handleShare(entry.id)} className="mt-4" variant="outline">
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
