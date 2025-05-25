import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import UsernameChangeModal from '../../components/UsernameChangeModal';
// Remove the html2canvas import - we'll import it dynamically
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
  const [uploading, setUploading] = useState(false);
  const [helpedBloomCount, setHelpedBloomCount] = useState(0);
  const [photoURL, setPhotoURL] = useState('');
  const [showUsernameModal, setShowUsernameModal] = useState(false);
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
    if (!cardRef.current || !isClient) {
      console.log('Download failed: cardRef or isClient not ready');
      toast.error('Download not ready. Please try again.');
      return;
    }

    try {
      setDownloading(true);
      console.log('Starting download process...'); // Debug log
      
      // Import html2canvas dynamically to avoid SSR issues
      const html2canvas = (await import('html2canvas')).default;
      
      console.log('Capturing canvas...'); // Debug log
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true
      });
      
      console.log('Creating download link...'); // Debug log
      const link = document.createElement('a');
      link.download = 'sharon-garden-profile-card.png';
      link.href = canvas.toDataURL('image/png');
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Profile card downloaded!');
      console.log('Download completed successfully'); // Debug log
    } catch (err) {
      console.error('Download error details:', err);
      toast.error('Download failed: ' + (err.message || 'Unknown error'));
    } finally {
      setDownloading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    console.log('Starting upload process...'); // Debug log

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      console.log('Uploading to Firebase Storage...'); // Debug log
      const fileRef = ref(storage, `avatars/${user.uid}.jpg`);
      const uploadResult = await uploadBytes(fileRef, file);
      console.log('Upload complete, getting download URL...'); // Debug log
      
      const downloadURL = await getDownloadURL(fileRef);
      console.log('Download URL received:', downloadURL); // Debug log

      // Update Firebase Auth profile
      console.log('Updating Firebase Auth profile...'); // Debug log
      await updateProfile(auth.currentUser, { photoURL: downloadURL });
      
      // Update Firestore user document
      console.log('Updating Firestore document...'); // Debug log
      await setDoc(doc(db, 'users', user.uid), { photoURL: downloadURL }, { merge: true });

      // ✅ Update local state immediately
      console.log('Updating local state...'); // Debug log
      setPhotoURL(downloadURL);
      
      toast.success('Profile picture updated successfully!');
      console.log('Upload process completed successfully'); // Debug log
    } catch (err) {
      console.error('Upload error details:', err);
      toast.error('Upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      console.log('Cleaning up upload state...'); // Debug log
      setUploading(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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

          {/* Profile Picture Display */}
          <div className="relative mb-4">
            {photoURL ? (
              <img
                src={photoURL}
                alt="Profile Picture"
                className="w-24 h-24 mx-auto rounded-full object-cover border-4 border-purple-200 shadow-lg"
                onError={(e) => {
                  console.log('Image failed to load:', photoURL);
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-24 h-24 mx-auto rounded-full bg-gray-200 border-4 border-purple-200 flex items-center justify-center">
                <span className="text-2xl text-gray-500">👤</span>
              </div>
            )}
            
            {uploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                <div className="text-white text-sm">Uploading...</div>
              </div>
            )}
          </div>

          {/* File Upload Button */}
          <div className="mb-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
              disabled={uploading}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              disabled={uploading}
              className="mb-2"
            >
              {uploading ? 'Uploading...' : '📷 Change Profile Picture'}
            </Button>
            {photoURL && !uploading && (
              <p className="text-xs text-gray-500">Current picture loaded successfully</p>
            )}
          </div>

          <p className="text-gray-600 mb-1">Signed in as:<br />
            <span className="font-mono text-sm">{email}</span>
          </p>

          <p className="text-sm text-gray-500 mb-2">
            Username: <span className="font-semibold text-purple-700">{username || 'Not set'}</span>
          </p>

          <Button 
            onClick={() => setShowUsernameModal(true)} 
            variant="outline" 
            className="mb-4"
          >
            ✏️ Request Username Change
          </Button>

          <div className="flex items-center justify-center gap-4 mb-4">
            <span className="text-sm">🔔 Daily Reminder:</span>
            <Button onClick={handleToggle} variant={notify ? 'default' : 'outline'}>
              {notify ? 'On' : 'Off'}
            </Button>
          </div>

          <p className="text-sm text-green-600">🌱 You helped {helpedBloomCount} flower{helpedBloomCount !== 1 && 's'} bloom</p>

          <Button 
            onClick={handleDownload} 
            disabled={downloading} 
            className="w-full mt-4"
          >
            {downloading ? '📥 Downloading...' : '📥 Download Profile Card'}
          </Button>
        </CardContent>
      </Card>

      {/* Username Change Modal */}
      <UsernameChangeModal
        isOpen={showUsernameModal}
        onClose={() => setShowUsernameModal(false)}
        currentUsername={username}
      />
    </div>
  );
}
