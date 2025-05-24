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
  getDocs,
  orderBy
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import debounce from 'lodash.debounce';
import useAchievements from '../../hooks/useAchievements';
import ProgressBadge from '../../components/ProgressBadge';
import RewardRedemptionModal from '../../components/RewardRedemptionModal';

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
  const [rewards, setRewards] = useState([]);
  const [selectedReward, setSelectedReward] = useState(null);

  const { badges, getBadgeDetails, getAllBadges } = useAchievements();
  const cardRef = useRef();
  const router = useRouter();

  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    if (!isClient) return;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setEmail(currentUser.email);
        try {
          const userDoc = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(userDoc);
          if (snap.exists()) {
            const data = snap.data();
            setNotify(data.notify ?? true);
            setUsername(data.username || '');
          }

          const rewardQuery = query(
            collection(db, 'rewards'),
            where('userId', '==', currentUser.uid),
            orderBy('timestamp', 'desc')
          );
          const rewardSnap = await getDocs(rewardQuery);
          setRewards(rewardSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
    if (!newUsername) return setUsernameStatus(null);

    const checkUsername = debounce(async () => {
      const trimmed = newUsername.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (trimmed.length < 3) {
        setUsernameStatus('too-short');
        return;
      }

      try {
        const q = query(collection(db, 'users'), where('username', '==', trimmed));
        const snap = await getDocs(q);
        const taken = snap.docs.some(docSnap => docSnap.id !== user?.uid);
        setUsernameStatus(taken ? 'taken' : 'available');
      } catch (err) {
        console.error('Username check failed:', err);
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
      toast.error('Failed to update setting.');
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
      toast.error('Failed to download.');
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
      toast.error('Update failed.');
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

  const earned = badges;
  const all = getAllBadges();
  const unearned = all.filter(b => b.progress && !earned.includes(b.emoji));

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-pink-100 to-purple-200 p-6">
      <Card ref={cardRef} className="bg-white w-full max-w-md shadow-xl rounded-2xl p-6 text-center">
        <CardContent>
          <h1 className="text-2xl font-bold text-purple-700 mb-2">👤 Profile</h1>
          <p className="text-gray-600 mb-1">Signed in as:<br />
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
            <p className="mb-4 text-sm text-gray-500 italic">
              Username is permanent: <span className="font-semibold text-purple-700">{username}</span>
            </p>
          ) : (
            <div className="flex flex-col gap-2 mb-4">
              <input
                type="text"
                value={newUsername}
                onChange={(e) => {
                  const value = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
                  setNewUsername(value);
                }}
                placeholder="Choose your username"
                className="border border-gray-300 rounded px-3 py-2"
                disabled={savingUsername}
              />
              {newUsername && (
                <p className={`text-sm ${
                  usernameStatus === 'available' ? 'text-green-600' :
                  usernameStatus === 'taken' ? 'text-red-500' :
                  usernameStatus === 'too-short' ? 'text-yellow-600' : ''
                }`}>
                  {usernameStatus === 'available' && '✅ Username available'}
                  {usernameStatus === 'taken' && '❌ Username taken'}
                  {usernameStatus === 'too-short' && '⚠️ At least 3 characters'}
                </p>
              )}
              <Button
                onClick={handleUsernameUpdate}
                disabled={
                  savingUsername ||
                  !newUsername ||
                  usernameStatus !== 'available'
                }
              >
                {savingUsername ? 'Saving...' : 'Set Username'}
              </Button>
            </div>
          )}

          <Button onClick={handleDownload} disabled={downloading} className="w-full">
            {downloading ? '📥 Downloading...' : '📥 Download Profile Card'}
          </Button>
        </CardContent>
      </Card>

      <div className="mt-6 max-w-md w-full text-center">
        <h2 className="text-xl font-bold text-purple-700 mb-2">🏅 Your Badges</h2>
        {badges.length === 0 ? (
          <p className="text-gray-500 italic">No badges yet. Keep growing!</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {badges.map((emoji) => {
              const badge = getBadgeDetails(emoji);
              if (!badge) return null;
              return (
                <div key={emoji} className="p-3 bg-white rounded-xl shadow border border-purple-200 text-left">
                  <div className="text-xl mb-1">{badge.emoji} <strong>{badge.name}</strong></div>
                  <p className="text-sm text-gray-600">{badge.description}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 max-w-md w-full text-center">
        <h2 className="text-xl font-bold text-purple-700 mb-2">🔓 Badges in Progress</h2>
        {unearned.length === 0 ? (
          <p className="text-gray-500 italic">No badge progress yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {unearned.map(badge => (
              <ProgressBadge key={badge.emoji} badge={badge} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 max-w-md w-full text-center">
        <h2 className="text-xl font-bold text-purple-700 mb-2">🎁 My Rewards</h2>
        {rewards.length === 0 ? (
          <p className="text-gray-500 italic">You haven't unlocked any rewards yet.</p>
        ) : (
          <ul className="space-y-3 text-left">
            {rewards.map((r) => (
              <li
                key={r.id}
                className="p-3 bg-white rounded-xl shadow border border-purple-200 cursor-pointer hover:bg-purple-50"
                onClick={() => setSelectedReward(r)}
              >
                <div className="font-medium text-purple-700">{r.rewardType} • {r.seedType}</div>
                <div className="text-sm text-gray-600">{r.description}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Button
        onClick={() => {
          const link = `${window.location.origin}/u/${username}/badges`;
          navigator.clipboard.writeText(link);
          toast.success('📎 Public badge link copied!');
        }}
        disabled={!username}
        className="mt-4 w-full max-w-md"
      >
        📎 Copy My Public Badge Link
      </Button>

      {username && (
        <Button
          onClick={() => router.push(`/u/${username}/badges`)}
          className="mt-2 w-full max-w-md"
          variant="outline"
        >
          🌍 Visit My Public Badge Page
        </Button>
      )}

      {selectedReward && (
        <RewardRedemptionModal reward={selectedReward} onClose={() => setSelectedReward(null)} />
      )}
    </div>
  );
}
