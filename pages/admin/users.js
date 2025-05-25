// pages/admin/users.js - User Management Admin Page
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { auth, db } from '../../lib/firebase';
import { 
  collection, 
  query, 
  getDocs,
  doc,
  updateDoc,
  getDoc,
  orderBy,
  limit,
  where,
  startAfter
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import toast from 'react-hot-toast';

export default function AdminUsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [sortBy, setSortBy] = useState('joinedAt');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userStats, setUserStats] = useState({});
  
  // Pagination
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const USERS_PER_PAGE = 20;

  // Check admin access
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/auth');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        
        if (userData?.role !== 'admin') {
          toast.error('Admin access required');
          router.push('/');
          return;
        }
        
        setIsAdmin(true);
        setLoading(false);
        fetchUsers();
      } catch (err) {
        console.error('Error checking admin status:', err);
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const fetchUsers = async (loadMore = false) => {
    try {
      let q = query(
        collection(db, 'users'),
        orderBy(sortBy, 'desc'),
        limit(USERS_PER_PAGE)
      );

      if (loadMore && lastDoc) {
        q = query(
          collection(db, 'users'),
          orderBy(sortBy, 'desc'),
          startAfter(lastDoc),
          limit(USERS_PER_PAGE)
        );
      }

      const snapshot = await getDocs(q);
      const userData = [];
      
      for (const doc of snapshot.docs) {
        const user = { id: doc.id, ...doc.data() };
        
        // Fetch user stats
        const seedsQuery = query(
          collection(db, 'flowers'),
          where('userId', '==', doc.id)
        );
        const seedsSnap = await getDocs(seedsQuery);
        const blooms = seedsSnap.docs.filter(d => d.data().bloomed).length;
        
        userStats[doc.id] = {
          totalSeeds: seedsSnap.size,
          totalBlooms: blooms
        };
        
        userData.push(user);
      }

      if (loadMore) {
        setUsers([...users, ...userData]);
      } else {
        setUsers(userData);
      }
      
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === USERS_PER_PAGE);
      setUserStats({ ...userStats });
      
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (!confirm(`Change user role to ${newRole}?`)) return;

    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        roleUpdatedAt: new Date().toISOString(),
        roleUpdatedBy: auth.currentUser.uid
      });
      
      toast.success('User role updated');
      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const handleBanUser = async (userId, banned) => {
    const action = banned ? 'ban' : 'unban';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
      await updateDoc(doc(db, 'users', userId), {
        banned,
        bannedAt: banned ? new Date().toISOString() : null,
        bannedBy: banned ? auth.currentUser.uid : null
      });
      
      toast.success(`User ${banned ? 'banned' : 'unbanned'} successfully`);
      fetchUsers();
    } catch (error) {
      console.error(`Error ${action}ning user:`, error);
      toast.error(`Failed to ${action} user`);
    }
  };

  const exportUsers = () => {
    const csv = [
      ['ID', 'Username', 'Email', 'Display Name', 'Role', 'Seeds', 'Blooms', 'Joined', 'Banned'],
      ...users.map(user => [
        user.id,
        user.username || '',
        user.email || '',
        user.displayName || '',
        user.role || 'user',
        userStats[user.id]?.totalSeeds || 0,
        userStats[user.id]?.totalBlooms || 0,
        user.joinedAt?.toDate?.()?.toLocaleDateString() || '',
        user.banned ? 'Yes' : 'No'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading users...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">👥 User Management</h1>
          <p className="text-gray-600">Manage users, roles, and permissions</p>
        </div>

        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Search */}
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 min-w-[200px] px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              
              {/* Role Filter */}
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Roles</option>
                <option value="user">Users</option>
                <option value="moderator">Moderators</option>
                <option value="admin">Admins</option>
              </select>
              
              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  fetchUsers();
                }}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="joinedAt">Joined Date</option>
                <option value="lastLoginAt">Last Active</option>
                <option value="username">Username</option>
              </select>
              
              {/* Export */}
              <Button onClick={exportUsers} variant="outline">
                📥 Export CSV
              </Button>
              
              {/* Refresh */}
              <Button onClick={() => fetchUsers()} variant="outline">
                🔄 Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stats</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {user.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt={user.displayName}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center">
                              <span className="text-purple-700 font-semibold">
                                {user.displayName?.[0] || user.username?.[0] || '?'}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">
                              {user.displayName || 'No name'}
                            </p>
                            <p className="text-sm text-gray-500">
                              @{user.username || 'no-username'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {user.email}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={user.role || 'user'}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="text-sm border rounded px-2 py-1"
                          disabled={user.id === auth.currentUser?.uid}
                        >
                          <option value="user">User</option>
                          <option value="moderator">Moderator</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-3">
                          <span className="text-gray-600">
                            🌱 {userStats[user.id]?.totalSeeds || 0}
                          </span>
                          <span className="text-gray-600">
                            🌸 {userStats[user.id]?.totalBlooms || 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {user.joinedAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                      </td>
                      <td className="px-4 py-3">
                        {user.banned ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">
                            Banned
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => setSelectedUser(user)}
                            variant="outline"
                            className="text-xs"
                          >
                            View
                          </Button>
                          <Button
                            onClick={() => handleBanUser(user.id, !user.banned)}
                            variant={user.banned ? 'default' : 'destructive'}
                            className="text-xs"
                            disabled={user.id === auth.currentUser?.uid}
                          >
                            {user.banned ? 'Unban' : 'Ban'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Load More */}
            {hasMore && (
              <div className="p-4 text-center border-t">
                <Button 
                  onClick={() => fetchUsers(true)}
                  variant="outline"
                >
                  Load More Users
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Detail Modal */}
        {selectedUser && (
          <UserDetailModal
            user={selectedUser}
            stats={userStats[selectedUser.id]}
            onClose={() => setSelectedUser(null)}
          />
        )}
      </div>
    </div>
  );
}

// User Detail Modal Component
function UserDetailModal({ user, stats, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold">User Details</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">
            {/* Profile */}
            <div className="flex items-center gap-4">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="w-20 h-20 rounded-full"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-purple-200 flex items-center justify-center">
                  <span className="text-2xl text-purple-700 font-semibold">
                    {user.displayName?.[0] || user.username?.[0] || '?'}
                  </span>
                </div>
              )}
              <div>
                <h3 className="text-xl font-semibold">{user.displayName || 'No name'}</h3>
                <p className="text-gray-600">@{user.username || 'no-username'}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Seeds</p>
                <p className="text-2xl font-bold text-green-600">
                  🌱 {stats?.totalSeeds || 0}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Blooms</p>
                <p className="text-2xl font-bold text-pink-600">
                  🌸 {stats?.totalBlooms || 0}
                </p>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">User ID</span>
                <span className="font-mono text-sm">{user.id}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Role</span>
                <span className="font-medium">{user.role || 'user'}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Joined</span>
                <span>{user.joinedAt?.toDate?.()?.toLocaleString() || 'Unknown'}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Last Active</span>
                <span>{user.lastLoginAt?.toDate?.()?.toLocaleString() || 'Unknown'}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Garden Privacy</span>
                <span>{user.gardenPrivacy || 'public'}</span>
              </div>
              {user.banned && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Banned</span>
                  <span className="text-red-600">
                    {user.bannedAt ? new Date(user.bannedAt).toLocaleString() : 'Yes'}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => window.open(`/u/${user.username}/garden`, '_blank')}
                variant="outline"
                disabled={!user.username}
              >
                🌱 View Garden
              </Button>
              <Button
                onClick={() => window.open(`/u/${user.username}/badges`, '_blank')}
                variant="outline"
                disabled={!user.username}
              >
                🏅 View Badges
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
              >
                Close
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
