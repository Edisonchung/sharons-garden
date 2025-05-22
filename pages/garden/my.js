// pages/garden/my.js
import { useEffect } from 'react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';

export default function MyGarden() {
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }

    const reminderKey = 'lastWaterReminder';
    const last = localStorage.getItem(reminderKey);
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;

    if (!last || now - new Date(last) > oneDay) {
      if (Notification.permission === 'granted') {
        new Notification('💧 Time to water your seeds in Sharon’s Garden!');
        localStorage.setItem(reminderKey, now.toISOString());
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-100 p-6 text-center">
      <h1 className="text-3xl font-bold text-purple-700 mb-6">🌿 My Garden</h1>
      <p className="text-gray-600">Your planted seeds will appear here soon. Keep nurturing them!</p>
      <div className="mt-10">
        <Card className="p-6 max-w-lg mx-auto">
          <CardContent>
            <h2 className="text-xl font-semibold mb-4">Coming soon: Your personalized garden view 🌱</h2>
            <p className="text-sm text-gray-500">This page will show all the seeds and flowers you’ve planted and watered.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
