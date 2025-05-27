// pages/search.js - Advanced User Search and Discovery
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  startAfter
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { debounce } from 'lodash';

export default function SearchPage() {
  const router = useRouter();
  const { q: initialQuery } = router.query;
  
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState(initialQuery || '');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState('users');
  const [filters, setFilters] = useState({
    hasPhoto: false,
    hasBio: false,
    isActive: false,
    minBlooms: 0,
    sortBy: 'relevance'
  });
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Load recent searches from localStorage
    if (typeof window !== 'undefined') {
      const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
      setRecentSearches(recent);
    }
  }, []);

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query) => {
      if (query.trim()) {
        performSearch(query.trim());
      } else {
        setSearchResults([]);
        setTotalResults(0);
      }
    }, 300),
    [searchType, filters]
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchQuery, debouncedSearch]);

  const performSearch = async (query, loadMore = false) => {
    if (!query.trim()) return;

    try {
      if (!loadMore) {
        setLoading(true);
        setSearchResults([]);
        setLastVisible(null);
        setHasMore(true);
      }

      let results = [];
      let total = 0;

      switch (searchType) {
        case 'users':
          ({ results, total } = await searchUsers(query, loadMore));
          break;
        case 'gardens':
          ({ results, total } = await searchGardens(query, loadMore));
          break;
        case 'flowers':
          ({ results, total } = await searchFlowers(query, loadMore));
          break;
        default:
          ({ results, total } = await searchUsers(query, loadMore));
      }

      if (loadMore) {
        setSearchResults(prev => [...prev, ...results]);
      } else {
        setSearchResults(results);
        setTotalResults(total);
        
        // Save to recent searches
        saveRecentSearch(query);
      }

      setHasMore(results.length === 12);

    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query, loadMore = false) => {
    const searchTerms = query.toLowerCase().split(' ').filter(Boolean);
    
    // Build query for username search
    let q = query(
      collection(db, 'users'),
      where('public', '!=', false),
      orderBy('public'),
      limit(12)
    );

    if (loadMore && lastVisible) {
      q = query(q, startAfter(lastVisible));
    }

    const snapshot = await getDocs(q);
    const users = [];

    for (const userDoc of snapshot.docs) {
      const userData = userDoc.data();
      
      // Skip if no username
      if (!userData.username) continue;

      // Apply search filtering
      const matchesSearch = searchTerms.some(term => 
        userData.username?.toLowerCase().includes(term) ||
        userData.displayName?.toLowerCase().includes(term) ||
        userData.bio?.toLowerCase().includes(term)
      );

      if (!matchesSearch) continue;

      // Apply filters
      if (filters.hasPhoto && !userData.photoURL) continue;
      if (filters.hasBio && !userData.bio) continue;
      if (filters.isActive) {
        const lastActive = userData.lastActive?.toDate();
        if (!lastActive || (Date.now() - lastActive.getTime()) > (7 * 24 * 60 * 60 * 1000)) {
          continue;
        }
      }

      // Load user stats for bloom filter
      let userStats = null;
      if (filters.minBlooms > 0) {
        try {
          const flowersSnap = await getDocs(query(
            collection(db, 'flowers'),
            where('userId', '==', userDoc.id),
            where('bloomed', '==', true)
          ));
          
          if (flowersSnap.size < filters.minBlooms) continue;
          
          userStats = {
            totalBlooms: flowersSnap.size,
            rareFlowers: flowersSnap.docs.filter(doc => 
              doc.data().rarity === 'rare'
            ).length
          };
        } catch (statsError) {
          continue;
        }
      }

      users.push({
        id: userDoc.id,
        type: 'user',
        ...userData,
        stats: userStats,
        relevanceScore: calculateUserRelevance(userData, searchTerms),
        joinedAt: userData.joinedAt?.toDate?.() || new Date()
      });
    }

    // Sort by relevance or selected criteria
    users.sort((a, b) => {
      if (filters.sortBy === 'newest') {
        return b.joinedAt - a.joinedAt;
      } else if (filters.sortBy === 'active') {
        const aActive = a.lastActive?.toDate?.() || a.joinedAt;
        const bActive = b.lastActive?.toDate?.() || b.joinedAt;
        return bActive - aActive;
      } else {
        return b.relevanceScore - a.relevanceScore;
      }
    });

    if (!loadMore && snapshot.docs.length > 0) {
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
    }

    return { results: users, total: users.length };
  };

  const searchGardens = async (query, loadMore = false) => {
    // Search for users with active gardens
    const usersSnap = await getDocs(query(
      collection(db, 'users'),
      where('public', '!=', false),
      limit(20)
    ));

    const gardens = [];
    const searchTerms = query.toLowerCase().split(' ').filter(Boolean);

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      
      if (!userData.username) continue;

      // Get user's active seeds
      try {
        const flowersSnap = await getDocs(query(
          collection(db, 'flowers'),
          where('userId', '==', userDoc.id),
          limit(10)
        ));

        const flowers = flowersSnap.docs.map(doc => doc.data());
        const activeSeeds = flowers.filter(f => !f.bloomed);
        const blooms = flowers.filter(f => f.bloomed);

        // Check if garden matches search
        const matchesSearch = searchTerms.some(term => 
          userData.displayName?.toLowerCase().includes(term) ||
          flowers.some(f => 
            f.type?.toLowerCase().includes(term) ||
            f.note?.toLowerCase().includes(term)
          )
        );

        if (!matchesSearch || activeSeeds.length === 0) continue;

        gardens.push({
          id: userDoc.id,
          type: 'garden',
          owner: userData,
          activeSeeds: activeSeeds.length,
          totalBlooms: blooms.length,
          recentSeeds: activeSeeds.slice(0, 3),
          relevanceScore: calculateGardenRelevance(userData, flowers, searchTerms)
        });

      } catch (error) {
        console.warn('Error loading garden for user:', userDoc.id);
      }
    }

    gardens.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return { results: gardens.slice(0, 12), total: gardens.length };
  };

  const searchFlowers = async (query, loadMore = false) => {
    const searchTerms = query.toLowerCase().split(' ').filter(Boolean);
    
    // Search in flowers collection
    let q = query(
      collection(db, 'flowers'),
      where('bloomed', '==', true),
      orderBy('bloomTime', 'desc'),
      limit(20)
    );

    const flowersSnap = await getDocs(q);
    const flowers = [];

    for (const flowerDoc of flowersSnap.docs) {
      const flowerData = flowerDoc.data();

      // Check if flower matches search
      const matchesSearch = searchTerms.some(term => 
        flowerData.type?.toLowerCase().includes(term) ||
        flowerData.note?.toLowerCase().includes(term) ||
        flowerData.name?.toLowerCase().includes(term)
      );

      if (!matchesSearch) continue;

      // Get owner info
      try {
        const userDoc = await getDoc(doc(db, 'users', flowerData.userId));
        if (!userDoc.exists() || userDoc.data().public === false) continue;

        const userData = userDoc.data();

        flowers.push({
          id: flowerDoc.id,
          type: 'flower',
          ...flowerData,
          bloomTime: flowerData.bloomTime?.toDate?.() || new Date(),
          owner: {
            id: flowerData.userId,
            username: userData.username,
            displayName: userData.displayName || userData.username,
            photoURL: userData.photoURL
          },
          relevanceScore: calculateFlowerRelevance(flowerData, searchTerms)
        });

      } catch (error) {
        console.warn('Error loading flower owner:', flowerDoc.id);
      }
    }

    flowers.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return { results: flowers.slice(0, 12), total: flowers.length };
  };

  const calculateUserRelevance = (userData, searchTerms) => {
    let score = 0;
    
    searchTerms.forEach(term => {
      if (userData.username?.toLowerCase().startsWith(term)) score += 10;
      else if (userData.username?.toLowerCase().includes(term)) score += 5;
      
      if (userData.displayName?.toLowerCase().startsWith(term)) score += 8;
      else if (userData.displayName?.toLowerCase().includes(term)) score += 3;
      
      if (userData.bio?.toLowerCase().includes(term)) score += 2;
    });

    // Boost for verified users
    if (userData.verified) score += 5;
    
    // Boost for users with photos
    if (userData.photoURL) score += 2;
    
    return score;
  };

  const calculateGardenRelevance = (userData, flowers, searchTerms) => {
    let score = calculateUserRelevance(userData, searchTerms);
    
    // Boost for active gardens
    const activeSeeds = flowers.filter(f => !f.bloomed).length;
    score += activeSeeds * 2;
    
    // Boost for recent activity
    const recentFlowers = flowers.filter(f => {
      const created = new Date(f.createdAt || Date.now());
      return (Date.now() - created.getTime()) < (7 * 24 * 60 * 60 * 1000);
    });
    score += recentFlowers.length * 3;
    
    return score;
  };

  const calculateFlowerRelevance = (flowerData, searchTerms) => {
    let score = 0;
    
    searchTerms.forEach(term => {
      if (flowerData.type?.toLowerCase().includes(term)) score += 5;
      if (flowerData.note?.toLowerCase().includes(term)) score += 3;
      if (flowerData.name?.toLowerCase().includes(term)) score += 2;
    });

    // Boost for rare flowers
    if (flowerData.rarity === 'rare') score += 5;
    if (flowerData.rarity === 'rainbow') score += 8;
    if (flowerData.specialSeed) score += 10;
    
    return score;
  };

  const saveRecentSearch = (query) => {
    if (typeof window === 'undefined') return;
    
    const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    const updated = [query, ...recent.filter(q => q !== query)].slice(0, 10);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
    setRecentSearches(updated);
  };

  const clearRecentSearches = () => {
    localStorage.removeItem('recentSearches');
    setRecentSearches([]);
  };

  const handleSearchTypeChange = (type) => {
    setSearchType(type);
    if (searchQuery.trim()) {
      performSearch(searchQuery.trim());
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const searchTypes = [
    { key: 'users', label: 'Gardeners', emoji: '👥' },
    { key: 'gardens', label: 'Gardens', emoji: '🌱' },
    { key: 'flowers', label: 'Flowers', emoji: '🌸' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-100 to-pink-200 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-purple-700 mb-2">
            🔍 Search Community
          </h1>
          <p className="text-gray-600">
            Find gardeners, explore gardens, and discover beautiful flowers
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for users, gardens, or flowers..."
              className="w-full px-6 py-4 text-lg border border-purple-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-lg"
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              {loading ? (
                <div className="animate-spin text-purple-500">⟳</div>
              ) : (
                <span className="text-purple-400">🔍</span>
              )}
            </div>
          </div>
        </div>

        {/* Search Type Tabs */}
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-full p-1 shadow-lg">
            {searchTypes.map((type) => (
              <button
                key={type.key}
                onClick={() => handleSearchTypeChange(type.key)}
                className={`px-6 py-2 rounded-full transition-all ${
                  searchType === type.key
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-purple-600 hover:bg-purple-50'
                }`}
              >
                {type.emoji} {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Filters */}
        {searchQuery && (
          <div className="bg-white rounded-xl p-4 mb-6 shadow-sm">
            <details className="group">
              <summary className="cursor-pointer text-purple-700 font-medium flex items-center gap-2">
                🔧 Advanced Filters
                <span className="group-open:rotate-180 transition-transform">▼</span>
              </summary>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {searchType === 'users' && (
                  <>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filters.hasPhoto}
                        onChange={(e) => handleFilterChange('hasPhoto', e.target.checked)}
                        className="rounded border-purple-300"
                      />
                      <span className="text-sm">Has profile photo</span>
                    </label>
                    
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filters.hasBio}
                        onChange={(e) => handleFilterChange('hasBio', e.target.checked)}
                        className="rounded border-purple-300"
                      />
                      <span className="text-sm">Has bio</span>
                    </label>
                    
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filters.isActive}
                        onChange={(e) => handleFilterChange('isActive', e.target.checked)}
                        className="rounded border-purple-300"
                      />
                      <span className="text-sm">Active (last 7 days)</span>
                    </label>
                    
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Min blooms:</label>
                      <input
                        type="number"
                        min="0"
                        value={filters.minBlooms}
                        onChange={(e) => handleFilterChange('minBlooms', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </>
                )}
                
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Sort by:</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="newest">Newest</option>
                    <option value="active">Most Active</option>
                  </select>
                </div>
              </div>
            </details>
          </div>
        )}

        {/* Recent Searches & Suggestions */}
        {!searchQuery && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <Card className="bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-purple-700">
                      🕒 Recent Searches
                    </h3>
                    <button
                      onClick={clearRecentSearches}
                      className="text-sm text-gray-500 hover:text-red-500"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-2">
                    {recentSearches.slice(0, 5).map((search, index) => (
                      <button
                        key={index}
                        onClick={() => setSearchQuery(search)}
                        className="block w-full text-left px-3 py-2 rounded hover:bg-purple-50 text-sm"
                      >
                        🔍 {search}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Popular Searches */}
            <Card className="bg-white">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-purple-700 mb-4">
                  🔥 Popular Searches
                </h3>
                <div className="space-y-2">
                  {['Sharon', 'rare flowers', 'active gardeners', 'special seeds', 'new users'].map((search, index) => (
                    <button
                      key={index}
                      onClick={() => setSearchQuery(search)}
                      className="block w-full text-left px-3 py-2 rounded hover:bg-purple-50 text-sm"
                    >
                      🌟 {search}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search Results */}
        {searchQuery && (
          <>
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-purple-700">
                {loading ? 'Searching...' : `${totalResults} results for "${searchQuery}"`}
              </h2>
              {searchResults.length > 0 && (
                <span className="text-sm text-gray-600">
                  Showing {searchResults.length} of {totalResults}
                </span>
              )}
            </div>

            {/* Results Grid */}
            {searchResults.length === 0 && !loading ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  No results found
                </h3>
                <p className="text-gray-500 mb-4">
                  Try different keywords or adjust your filters
                </p>
                <Button onClick={() => setSearchQuery('')} variant="outline">
                  Clear Search
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {searchResults.map((result) => (
                    <SearchResultCard 
                      key={result.id} 
                      result={result} 
                      onVisit={(username) => router.push(`/u/${username}`)}
                      onVisitGarden={(username) => router.push(`/u/${username}/garden`)}
                    />
                  ))}
                </div>

                {hasMore && (
                  <div className="text-center mt-8">
                    <Button 
                      onClick={() => performSearch(searchQuery, true)}
                      variant="outline"
                      disabled={loading}
                    >
                      {loading ? 'Loading...' : 'Load More Results'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Browse Suggestions */}
        {!searchQuery && (
          <div className="text-center">
            <h3 className="text-lg font-semibold text-purple-700 mb-4">
              🌟 Explore Popular Categories
            </h3>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button onClick={() => setSearchQuery('active gardeners')} variant="outline">
                👥 Active Gardeners
              </Button>
              <Button onClick={() => setSearchQuery('rare flowers')} variant="outline">
                💎 Rare Flowers
              </Button>
              <Button onClick={() => setSearchQuery('new users')} variant="outline">
                🌱 New Users
              </Button>
              <Button onClick={() => setSearchQuery('special seeds')} variant="outline">
                ✨ Special Seeds
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Search Result Card Component
function SearchResultCard({ result, onVisit, onVisitGarden }) {
  if (result.type === 'user') {
    return (
      <Card className="bg-white shadow-lg hover:shadow-xl transition-all">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <img
              src={result.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(result.displayName || result.username)}&background=a855f7&color=fff`}
              alt="Profile"
              className="w-12 h-12 rounded-full border-2 border-purple-200"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-purple-700">
                {result.displayName || result.username}
              </h3>
              <p className="text-sm text-gray-600">@{result.username}</p>
              {result.verified && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  ✓ Verified
                </span>
              )}
            </div>
          </div>

          {result.bio && (
            <p className="text-sm text-gray-700 mb-4 line-clamp-2">
              {result.bio}
            </p>
          )}

          {result.stats && (
            <div className="grid grid-cols-2 gap-2 mb-4 text-center">
              <div>
                <div className="text-lg font-bold text-green-600">{result.stats.totalBlooms}</div>
                <p className="text-xs text-gray-600">Blooms</p>
              </div>
              <div>
                <div className="text-lg font-bold text-yellow-600">{result.stats.rareFlowers}</div>
                <p className="text-xs text-gray-600">Rare</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={() => onVisit(result.username)}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              👤 Profile
            </Button>
            <Button
              onClick={() => onVisitGarden(result.username)}
              size="sm"
              className="flex-1"
            >
              🌱 Garden
            </Button>
          </div>

          <div className="mt-3 text-center">
            <p className="text-xs text-gray-500">
              Joined {formatDistanceToNow(result.joinedAt, { addSuffix: true })}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (result.type === 'garden') {
    return (
      <Card className="bg-white shadow-lg hover:shadow-xl transition-all">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <img
              src={result.owner.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(result.owner.displayName || result.owner.username)}&background=a855f7&color=fff`}
              alt="Owner"
              className="w-10 h-10 rounded-full border border-purple-200"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-purple-700">
                {result.owner.displayName || result.owner.username}'s Garden
              </h3>
              <p className="text-sm text-gray-600">@{result.owner.username}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4 text-center">
            <div>
              <div className="text-lg font-bold text-green-600">{result.activeSeeds}</div>
              <p className="text-xs text-gray-600">Growing</p>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-600">{result.totalBlooms}</div>
              <p className="text-xs text-gray-600">Bloomed</p>
            </div>
          </div>

          {result.recentSeeds.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-600 mb-2">Recent seeds:</p>
              <div className="flex gap-1">
                {result.recentSeeds.map((seed, idx) => (
                  <span key={idx} className="text-lg">
                    {seed.songSeed ? '🎵' : '🌱'}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={() => onVisitGarden(result.owner.username)}
            className="w-full"
            size="sm"
          >
            💧 Visit Garden
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (result.type === 'flower') {
    return (
      <Card className="bg-white shadow-lg hover:shadow-xl transition-all">
        <CardContent className="p-6">
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">{result.bloomedFlower || '🌸'}</div>
            <h3 className="text-lg font-semibold text-purple-700">
              {result.type} Bloom
            </h3>
            {result.rarity && (
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                result.rarity === 'rare' ? 'bg-yellow-100 text-yellow-800' :
                result.rarity === 'rainbow' ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {result.rarity === 'rare' && '💎 Rare'}
                {result.rarity === 'rainbow' && '🌈 Rainbow'}
                {result.rarity === 'legendary' && '⭐ Legendary'}
              </span>
            )}
          </div>

          {result.note && (
            <div className="bg-gray-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-gray-700 italic text-center line-clamp-2">
                "{result.note}"
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 mb-4">
            <img
              src={result.owner.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(result.owner.displayName)}&background=a855f7&color=fff`}
              alt="Owner"
              className="w-8 h-8 rounded-full border border-purple-200"
            />
            <div className="flex-1">
              <p className="text-sm font-medium">by {result.owner.displayName}</p>
              <p className="text-xs text-gray-500">@{result.owner.username}</p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500 mb-3">
              Bloomed {formatDistanceToNow(result.bloomTime, { addSuffix: true })}
            </p>
            <Button
              onClick={() => onVisitGarden(result.owner.username)}
              size="sm"
              className="w-full"
            >
              🌱 Visit Garden
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
