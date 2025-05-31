// components/WateringDebugTest.js - Test component for debugging watering
import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function WateringDebugTest() {
  const [user, setUser] = useState(null);
  const [testSeedId, setTestSeedId] = useState('');
  const [debugInfo, setDebugInfo] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      addDebugLog(`Auth state: ${currentUser ? 'Signed in as ' + currentUser.email : 'Not signed in'}`);
    });
    return () => unsubscribe();
  }, []);

  const addDebugLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const clearLogs = () => {
    setDebugInfo([]);
  };

  const testDirectUpdate = async () => {
    if (!user || !testSeedId) {
      addDebugLog('❌ Missing user or seed ID');
      return;
    }

    setIsLoading(true);
    addDebugLog('🧪 Starting direct update test...');
    
    try {
      // First, read the current seed
      addDebugLog(`📖 Reading seed: ${testSeedId}`);
      const seedRef = doc(db, 'flowers', testSeedId);
      const seedSnap = await getDoc(seedRef);
      
      if (!seedSnap.exists()) {
        addDebugLog('❌ Seed not found');
        return;
      }
      
      const currentSeed = seedSnap.data();
      addDebugLog(`📊 Current seed state: waterCount=${currentSeed.waterCount || 0}, bloomed=${currentSeed.bloomed}, owner=${currentSeed.userId}`);
      addDebugLog(`🔒 Current user: ${user.uid}`);
      addDebugLog(`🔒 Is owner: ${user.uid === currentSeed.userId}`);
      
      if (currentSeed.bloomed) {
        addDebugLog('❌ Seed already bloomed');
        return;
      }
      
      if ((currentSeed.waterCount || 0) >= 7) {
        addDebugLog('❌ Seed at max water count');
        return;
      }
      
      // Prepare minimal update
      const newWaterCount = (currentSeed.waterCount || 0) + 1;
      const updateData = {
        waterCount: newWaterCount
      };
      
      // Add bloom fields only if reaching 7
      if (newWaterCount >= 7) {
        updateData.bloomed = true;
        updateData.bloomedFlower = '🌸';
        addDebugLog('🌸 Will bloom with this water');
      }
      
      addDebugLog(`📝 Update data: ${JSON.stringify(updateData)}`);
      addDebugLog('💾 Attempting update...');
      
      // Perform the update
      await updateDoc(seedRef, updateData);
      addDebugLog('✅ Update successful!');
      
      // Update localStorage
      localStorage.setItem(`lastWatered_${testSeedId}`, new Date().toISOString());
      addDebugLog('💾 LocalStorage updated');
      
    } catch (error) {
      addDebugLog(`❌ Update failed: ${error.message}`);
      addDebugLog(`❌ Error code: ${error.code}`);
      addDebugLog(`❌ Full error: ${JSON.stringify({
        message: error.message,
        code: error.code,
        stack: error.stack
      }, null, 2)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testReadPermissions = async () => {
    if (!testSeedId) {
      addDebugLog('❌ Missing seed ID');
      return;
    }

    addDebugLog('🧪 Testing read permissions...');
    
    try {
      const seedRef = doc(db, 'flowers', testSeedId);
      const seedSnap = await getDoc(seedRef);
      
      if (seedSnap.exists()) {
        addDebugLog('✅ Read successful');
        addDebugLog(`📊 Data: ${JSON.stringify(seedSnap.data(), null, 2)}`);
      } else {
        addDebugLog('❌ Document does not exist');
      }
    } catch (error) {
      addDebugLog(`❌ Read failed: ${error.message}`);
    }
  };

  const testAuthToken = async () => {
    if (!user) {
      addDebugLog('❌ Not authenticated');
      return;
    }

    addDebugLog('🧪 Testing auth token...');
    
    try {
      const token = await user.getIdToken();
      addDebugLog('✅ Token retrieved successfully');
      addDebugLog(`🔑 Token preview: ${token.substring(0, 50)}...`);
      
      // Test token claims
      const tokenResult = await user.getIdTokenResult();
      addDebugLog(`🔍 Auth time: ${new Date(tokenResult.authTime).toLocaleString()}`);
      addDebugLog(`🔍 Issue time: ${new Date(tokenResult.issuedAtTime).toLocaleString()}`);
      addDebugLog(`🔍 Expiration: ${new Date(tokenResult.expirationTime).toLocaleString()}`);
      addDebugLog(`🔍 Claims: ${JSON.stringify(tokenResult.claims, null, 2)}`);
    } catch (error) {
      addDebugLog(`❌ Token test failed: ${error.message}`);
    }
  };

  const forceRefreshToken = async () => {
    if (!user) {
      addDebugLog('❌ Not authenticated');
      return;
    }

    addDebugLog('🔄 Forcing token refresh...');
    
    try {
      const token = await user.getIdToken(true); // Force refresh
      addDebugLog('✅ Token refreshed successfully');
    } catch (error) {
      addDebugLog(`❌ Token refresh failed: ${error.message}`);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-purple-700 mb-4">
        🧪 Watering Debug Test
      </h2>
      
      {/* Auth Status */}
      <div className="mb-4 p-3 bg-gray-50 rounded">
        <p className="font-medium">
          Auth Status: {user ? (
            <span className="text-green-600">✅ Signed in as {user.email}</span>
          ) : (
            <span className="text-red-600">❌ Not signed in</span>
          )}
        </p>
        {user && (
          <p className="text-sm text-gray-600">UID: {user.uid}</p>
        )}
      </div>

      {/* Test Seed ID Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Test Seed ID (from /garden/my):
        </label>
        <input
          type="text"
          value={testSeedId}
          onChange={(e) => setTestSeedId(e.target.value)}
          placeholder="Paste a seed ID from your garden"
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      {/* Test Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={testReadPermissions}
          disabled={isLoading || !testSeedId}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          🔍 Test Read
        </button>
        
        <button
          onClick={testDirectUpdate}
          disabled={isLoading || !user || !testSeedId}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          💧 Test Direct Water
        </button>
        
        <button
          onClick={testAuthToken}
          disabled={isLoading || !user}
          className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          🔑 Test Auth Token
        </button>
        
        <button
          onClick={forceRefreshToken}
          disabled={isLoading || !user}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          🔄 Refresh Token
        </button>
        
        <button
          onClick={clearLogs}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
        >
          🧹 Clear Logs
        </button>
      </div>

      {/* Debug Logs */}
      <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
        <h3 className="text-white font-bold mb-2">Debug Logs:</h3>
        {debugInfo.length === 0 ? (
          <p className="text-gray-400">No logs yet...</p>
        ) : (
          debugInfo.map((log, index) => (
            <div key={index} className="mb-1">
              {log}
            </div>
          ))
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-blue-50 rounded">
        <h4 className="font-medium text-blue-800">Instructions:</h4>
        <ol className="text-sm text-blue-700 mt-1 list-decimal list-inside">
          <li>Go to /garden/my and find a seed ID from the browser console or network tab</li>
          <li>Paste the seed ID in the input above</li>
          <li>Click "Test Read" to verify you can read the seed</li>
          <li>Click "Test Direct Water" to attempt a minimal watering update</li>
          <li>Check the debug logs for detailed error information</li>
          <li>If permissions fail, try "Refresh Token" and test again</li>
        </ol>
      </div>
    </div>
  );
}
