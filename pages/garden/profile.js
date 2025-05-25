import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import html2canvas from 'html2canvas';
import { auth, db, storage } from '../../lib/firebase';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';
import debounce from 'lodash.debounce';
import useAchievements from '../../hooks/useAchievements';
import ProgressBadge from '../../components/ProgressBadge';
import Confetti from 'react-confetti';

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
  const [helpedBloomCount, setHelpedBloomCount] = useState(0);
  const [photoURL, setPhotoURL] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const fileInputRef = useRef();
  const cardRef = useRef();
  const router = useRouter();

  const { badges, getBadgeDetails, getAllBadges } = useAchievements();

  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    if (!isClient) return;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setEmail(currentUser.email);
        setPhotoURL(currentUser.photoURL || '');

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
          const rewardData = rewardSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setRewards(rewardData);

          const wateringQuery = query(
            collection(db, 'waterings'),
            where('fromUserId', '==', currentUser.uid)
          );
          const wateringSnap = await getDocs(wateringQuery);
          const uniqueSeedIds = new Set(wateringSnap.docs.map(doc => doc.data().seedId));

          let bloomCount = 0;
          for (const seedId of uniqueSeedIds) {
            const flowerDoc = await getDoc(doc(db, 'flowers', seedId));
            if (flowerDoc.exists() && flowerDoc.data().bloomed) {
              bloomCount++;
            }
          }
          setHelpedBloomCount(bloomCount);

          // ✅ Check profile completion
          const hasUsername = snap.exists() && snap.data().username;
          const hasPhoto = !!currentUser.photoURL;
          const profileComplete = hasUsername && hasPhoto;

          if (profileComplete) {
            setShowConfetti(true);

            // 🏅 Award Profile Master badge
            if (!rewardData.some(r => r.id === `${currentUser.uid}_profilemaster`)) {
              await setDoc(
                doc(db, 'rewards', `${currentUser.uid}_profilemaster`),
                {
                  userId: currentUser.uid,
                  rewardType: 'Badge',
                  seedType: 'Profile',
                  description: 'Completed your profile 🎉',
                  timestamp: new Date()
                },
                { merge: true }
              );
            }
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
      {showConfetti && <Confetti recycle={false} numberOfPieces={250} />}

      <Card ref={cardRef} className="bg-white w-full max-w-md shadow-xl rounded-2xl p-6 text-center">
        <CardContent>
          <h1 className="text-2xl font-bold text-purple-700 mb-2">👤 Profile</h1>
          {/* rest of profile display code... */}
        </CardContent>
      </Card>

      {/* rest of page layout... */}
    </div>
  );
}
