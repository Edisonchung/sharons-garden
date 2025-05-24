// pages/garden/analytics.js
import { useEffect, useState } from 'react';
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Card, CardContent } from '../../components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';

export default function AnalyticsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await loadAnalytics(currentUser);
      } else {
        toast.error('Please sign in to view your analytics.');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loadAnalytics = async (user) => {
    try {
      const flowerRef = collection(db, 'flowers');
      const flowersQuery = query(flowerRef, where('userId', '==', user.uid));
      const flowerSnap = await getDocs(flowersQuery);

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const streak = userDoc.exists() ? userDoc.data().wateringStreak || 0 : 0;

      let bloomed = 0;
      let reflections = 0;
      const typeCount = {};

      flowerSnap.forEach(doc => {
        const data = doc.data();
        if (data.bloomed) bloomed++;
        if (data.reflection) reflections++;
        typeCount[data.type] = (typeCount[data.type] || 0) + 1;
      });

      const flowerTypes = Object.keys(typeCount).map(key => ({ name: key, value: typeCount[key] }));

      setAnalytics({
        total: flowerSnap.size,
        bloomed,
        reflections,
        flowerTypes,
        streak
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to load analytics');
    }
  };

  if (loading || !analytics) {
    return <p className="text-center mt-10 text-purple-700">Loading analytics...</p>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-green-50 p-6">
      <h1 className="text-3xl font-bold text-center text-green-800 mb-6">📊 My Garden Insights</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        <Card><CardContent>
          <p className="text-lg font-semibold">Total Seeds Planted: {analytics.total}</p>
          <p>Total Flowers Bloomed: {analytics.bloomed}</p>
          <p>Reflections Written: {analytics.reflections}</p>
          <p>Watering Streak: {analytics.streak} days</p>
        </CardContent></Card>

        <Card><CardContent>
          <h2 className="text-center font-bold mb-2">🌼 Flower Types</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={analytics.flowerTypes} dataKey="value" nameKey="name" outerRadius={80} fill="#8884d8">
                {analytics.flowerTypes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={["#8884d8", "#82ca9d", "#ffc658", "#d0ed57"][index % 4]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent></Card>

        <Card className="col-span-1 md:col-span-2">
          <CardContent>
            <h2 className="text-center font-bold mb-2">📈 Weekly Tip</h2>
            <p className="text-center italic text-gray-600">
              "Growth is a journey. Even the smallest bloom is worth celebrating. 🌱"
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
