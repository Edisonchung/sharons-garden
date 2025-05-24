
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import html2canvas from 'html2canvas';
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  getDoc,
  doc,
  setDoc,
  query,
  where,
  collection,
  getDocs
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import debounce from 'lodash.debounce';
import useAchievements from '../../hooks/useAchievements';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState(null);
  const [notify, setNotify] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { badges, getBadgeDetails } = useAchievements();

  const cardRef = useRef();
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setEmail(currentUser.email);

        try {
          const userDoc = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(userDoc);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setNotify(data.notify ?? true);
            setUsername(data.username || '');
          }
        } catch (err) {
          console.error(err);
          toast.error('Failed to load profile data.');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isClient]);

  useEffect(() => {
    if (!newUsername) {
      setUsernameStatus(null);
      return;
    }

    const checkUsername = debounce(async () => {
      const trimmed = newUsername.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (trimmed.length < 3) {
        setUsernameStatus(null);
        return;
      }

      try {
        const q = query(collection(db, 'users'), where('username', '==', trimmed));
        const snapshot = await getDocs(q);

        const taken = snapshot.docs.some(docSnap => docSnap.id !== user?.uid);
        setUsernameStatus(taken ? 'taken' : 'available');
      } catch (err) {
        console.error('Failed username check:', err);
        setUsernameStatus(null);
      }
    }, 500);

    checkUsername();

    return () => checkUsername.cancel();
  }, [newUsername, user?.uid]);

  const handleToggle = async () => {
    if (!user) return;
    try {
      const userDoc = doc(db, 'users', user.uid);
      await setDoc(userDoc, { notify: !notify }, { merge: true });
      setNotify(!notify);
      toast.success(`Reminders turned ${!notify ? 'on' : 'off'}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update settings.');
    }
  };

  const handleDownload = async () => {
    if (!cardRef.current || !isClient) return;

    try {
      setDownloading(true);
      const canvas = await html2canvas(cardRef.current);
      const link = document.createElement('a');
      link.download = 'profile-card.png';
      link.href = canvas.toDataURL();
      link.click();
    } catch (err) {
      console.error(err);
      toast.error('Failed to download profile card.');
    } finally {
      setDownloading(false);
    }
  };

  const handleUsernameUpdate = async () => {
    if (!user || !newUsername || usernameStatus !== 'available') return;

    const trimmed = newUsername.toLowerCase().replace(/[^a-z0-9]/g, '');

    setSavingUsername(true);
    try {
      await setDoc(doc(db, 'users', user.uid), { username: trimmed }, { merge: true });
      setUsername(trimmed);
      setNewUsername('');
      toast.success('Username updated!');
      router.push(`/u/${trimmed}/badges`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update username.');
    } finally {
      setSavingUsername(false);
    }
  };

  if (!isClient || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-100 to-purple-200 text-center">
        <p className="text-purple-600 text-lg">🔄 Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-pink-100 to-purple-200 p-6">
      <Card ref={cardRef} className="bg-white w-full max-w-md shadow-xl rounded-2xl p-6 text-center">
        <CardContent>
          <h1 className="text-2xl font-bold text-purple-700 mb-2">👤 Profile</h1>
          <p className="text-gray-600 mb-1">
            Signed in as:<br />
            <span className="font-mono">{email}</span>
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Username: <span className="font-semibold text-purple-700">{username || 'Not set'}</span>
          </p>

          <div className="flex items-center justify-center gap-4 mb-4">
            <span className="text-sm">🔔 Daily Reminder:</span>
            <Button onClick={handleToggle} variant={notify ? 'default' : 'outline'}>
              {notify ? 'On' : 'Off'}
            </Button>
          </div>

          {username ? (
            <div className="mb-4 text-sm text-gray-500 italic">
              Username is permanent and already set to: <span className="font-semibold text-purple-700">{username}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2 mb-4">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Choose your username"
                className="border border-gray-300 rounded px-3 py-2"
                disabled={savingUsername}
              />
              {newUsername && (
                <p className={`text-sm ${usernameStatus === 'available' ? 'text-green-600' : 'text-red-500'}`}>
                  {usernameStatus === 'available' && '✅ Username available'}
                  {usernameStatus === 'taken' && '❌ Username already taken'}
                </p>
              )}
              <Button
                onClick={handleUsernameUpdate}
                disabled={savingUsername || usernameStatus !== 'available'}
              >
                {savingUsername ? 'Saving...' : 'Set Username'}
              </Button>
            </div>
          )}

          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full"
          >
            {downloading ? '📥 Downloading...' : '📥 Download Profile Card'}
          </Button>
        </CardContent>
      </Card>

      <div className="mt-6 max-w-md w-full text-center">
        <h2 className="text-xl font-bold text-purple-700 mb-2">🏅 Your Badges</h2>
        {badges.length === 0 ? (
          <p className="text-gray-500 italic">No badges yet. Keep growing!</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {badges.map((emoji) => {
              const badge = getBadgeDetails(emoji);
              if (!badge) return null;
                return (
                <div key={emoji} className="p-3 bg-white rounded-xl shadow border border-purple-200 text-left">
                  <div className="text-xl">{badge.emoji} <strong>{badge.name}</strong></div>
                  <div className="text-sm text-gray-600">{badge.description}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Button
        onClick={() => {
          const link = `${window.location.origin}/u/${username}/badges`;
          navigator.clipboard.writeText(link);
          toast.success('📎 Profile link copied!');
        }}
        disabled={!username}
        className="mt-4 w-full max-w-md"
      >
        📎 Copy My Public Badge Link
      </Button>
    </div>
  );
}
