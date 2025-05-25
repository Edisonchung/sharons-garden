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
  addDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [notify, setNotify] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [helpedBloomCount, setHelpedBloomCount] = useState(0);
  const [photoURL, setPhotoURL] = useState('');
  const fileInputRef = useRef();
  const cardRef = useRef();
  const router = useRouter();

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
        } catch (err) {
          console.error(err);
          toast.error('Failed to load profile data.');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isClient]);

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

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    try {
      const fileRef = ref(storage, `avatars/${user.uid}`);
      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);

      await updateProfile(auth.currentUser, { photoURL: downloadURL });
      await setDoc(doc(db, 'users', user.uid), { photoURL: downloadURL }, { merge: true });

      await auth.currentUser.reload();
      setPhotoURL(auth.currentUser.photoURL);
      toast.success('Profile picture updated!');
    } catch (err) {
      console.error(err);
      toast.error('Upload failed');
    }
  };

  const handleUsernameRequest = async () => {
    const newUsername = prompt('Enter your desired new username:');
    const reason = prompt('Why do you want to change your username?');

    if (!newUsername || !reason) {
      return toast.error('Username and reason are required.');
    }

    try {
      await addDoc(collection(db, 'usernameRequests'), {
        userId: user.uid,
        oldUsername: username,
        newUsername,
        reason,
        timestamp: new Date()
      });
      toast.success('Request submitted for review!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit request');
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
          <h1 className="text-2xl font-bold text-purple-700 mb-4">👤 Profile</h1>

          {photoURL && (
            <img
              src={photoURL}
              onError={(e) => (e.target.style.display = 'none')}
              alt="Avatar"
              className="w-24 h-24 mx-auto rounded-full mb-2 object-cover"
            />
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="mb-4"
          />

          <p className="text-gray-600 mb-1">Signed in as:<br />
            <span className="font-mono">{email}</span>
          </p>

          <p className="text-sm text-gray-500 mb-2">
            Username: <span className="font-semibold text-purple-700">{username || 'Not set'}</span>
          </p>

          <Button onClick={handleUsernameRequest} variant="outline" className="mb-4">✏️ Request Username Change</Button>

          <div className="flex items-center justify-center gap-4 mb-4">
            <span className="text-sm">🔔 Daily Reminder:</span>
            <Button onClick={handleToggle} variant={notify ? 'default' : 'outline'}>
              {notify ? 'On' : 'Off'}
            </Button>
          </div>

          <p className="text-sm text-green-600">🌱 You helped {helpedBloomCount} flower{helpedBloomCount !== 1 && 's'} bloom</p>

          <Button onClick={handleDownload} disabled={downloading} className="w-full mt-4">
            {downloading ? '📥 Downloading...' : '📥 Download Profile Card'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
