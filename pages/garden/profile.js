// pages/garden/profile.js
import { useEffect, useState, useRef } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import html2canvas from 'html2canvas';
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getDoc, doc, setDoc } from 'firebase/firestore';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [notify, setNotify] = useState(true);
  const [loading, setLoading] = useState(true);

  const cardRef = useRef();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setEmail(currentUser.email);

        const userDoc = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(userDoc);

        if (docSnap.exists()) {
          setNotify(docSnap.data().notify);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleToggle = async () => {
    if (!user) return;
    const userDoc = doc(db, 'users', user.uid);
    await setDoc(userDoc, { notify: !notify }, { merge: true });
    setNotify(!notify);
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current);
    const link = document.createElement('a');
    link.download = 'profile-card.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  if (loading) return <p className="text-center mt-10">🔄 Loading profile…</p>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-100 to-purple-200 p-6">
      <Card ref={cardRef} className="bg-white w-full max-w-md shadow-xl rounded-2xl p-6 text-center">
        <CardContent>
          <h1 className="text-2xl font-bold text-purple-700 mb-2">👤 Profile</h1>
          <p className="text-gray-600 mb-4">Signed in as:<br /><span className="font-mono">{email}</span></p>

          <div className="flex items-center justify-center gap-4">
            <span className="text-sm">🔔 Daily Reminder:</span>
            <Button onClick={handleToggle} variant={notify ? 'default' : 'outline'}>
              {notify ? 'On' : 'Off'}
            </Button>
          </div>

          <Button onClick={handleDownload} className="mt-6 w-full">
            📥 Download Profile Card
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
