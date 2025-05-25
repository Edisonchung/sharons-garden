import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import UsernameChangeModal from '../../components/UsernameChangeModal';
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
    console.log('Download clicked - checking refs...', { 
      cardRef: cardRef.current, 
      isClient 
    });

    if (!isClient) {
      console.log('Client not ready yet');
      toast.error('Page not fully loaded. Please try again.');
      return;
    }

    if (!cardRef.current) {
      console.log('Card ref not found, searching for element...');
      // Try to find the card element directly
      const cardElement = document.querySelector('[data-download-card]');
      if (!cardElement) {
        console.log('No card element found');
        toast.error('Profile card not found. Please refresh the page.');
        return;
      }
      console.log('Found card element directly:', cardElement);
    }

    const elementToCapture = cardRef.current || document.querySelector('[data-download-card]');
    
    if (!elementToCapture) {
      toast.error('Could not find profile card to download');
      return;
    }

    try {
      setDownloading(true);
      console.log('Starting download process...');
      
      // Import html2canvas dynamically
      const html2canvas = (await import('html2canvas')).default;
      
      console.log('Capturing element...', elementToCapture);
      
      // Wait a moment for any animations to settle
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(elementToCapture, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: true, // Enable logging for debugging
        width: elementToCapture.offsetWidth,
        height: elementToCapture.offsetHeight
      });
      
      console.log('Canvas created:', { 
        width: canvas.width, 
        height: canvas.height 
      });
      
      // Create and trigger download
      const link = document.createElement('a');
      link.download = `sharon-garden-profile-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      
      // Add to DOM, click, then remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Profile card downloaded successfully!');
      console.log('Download completed');
      
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Download failed: ' + (err.message || 'Unknown error'));
    } finally {
      setDownloading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    console.log('Starting upload process...', { fileSize: file.size, fileType: file.type });

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    setUploading(true);

    try {
      // Method 1: Try Firebase Storage first
      console.log('Attempting Firebase Storage upload...');
      
      const timestamp = Date.now();
      const fileName = `${user.uid}_${timestamp}.jpg`;
      const fileRef = ref(storage, `avatars/${fileName}`);
      
      const metadata = {
        contentType: file.type,
        customMetadata: {
          userId: user.uid,
          uploadedAt: new Date().toISOString()
        }
      };
      
      const uploadResult = await uploadBytes(fileRef, file, metadata);
      console.log('Firebase Storage upload successful');
      
      const downloadURL = await getDownloadURL(fileRef);
      console.log('Download URL obtained:', downloadURL);

      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, { photoURL: downloadURL });
      
      // Update Firestore user document
      await setDoc(doc(db, 'users', user.uid), { 
        photoURL: downloadURL,
        avatarType: 'storage',
        avatarUpdatedAt: new Date().toISOString()
      }, { merge: true });

      // Update local state immediately
      setPhotoURL(downloadURL);
      
      toast.success('Profile picture updated successfully!');
      
    } catch (storageErr) {
      console.error('Firebase Storage failed:', storageErr);
      console.log('Falling back to base64 method...');
      
      try {
        // Method 2: Fallback to base64 storage
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target.result);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        });

        console.log('Base64 conversion complete');

        // Update Firebase Auth profile with base64
        await updateProfile(auth.currentUser, { photoURL: base64 });
        
        // Update Firestore with base64
        await setDoc(doc(db, 'users', user.uid), { 
          photoURL: base64,
          avatarType: 'base64',
          avatarUpdatedAt: new Date().toISOString()
        }, { merge: true });

        // Update local state immediately
        setPhotoURL(base64);
        
        toast.success('Profile picture updated (using fallback method)!');
        
      } catch (base64Err) {
        console.error('Base64 fallback also failed:', base64Err);
        toast.error('All upload methods failed. Please try a smaller image.');
      }
    } finally {
      setUploading(false);
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
      <Card 
        ref={cardRef} 
        data-download-card="true"
        className="bg-white w-full max-w-md shadow-xl rounded-2xl p-6 text-center"
      >
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
