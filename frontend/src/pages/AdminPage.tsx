import React, { useEffect, useState } from 'react';
import { Button, Card, CardTitle, Alert, Modal, Input } from '@components/index';
import { useAdmin } from '@hooks/useAdmin';
import {
  Users,
  Shield,
  TrendingUp,
  Activity,
  AlertCircle,
  MoreVertical,
  Ban,
  CheckCircle,
  Trash2,
  Search,
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const { stats, users, isLoading, error, fetchStats, fetchUsers } = useAdmin();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, []);

  useEffect(() => {
    const filtered = users.filter(
      (user) =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const handleBanUser = async (userId: string, isBanned: boolean) => {
    try {
      // Call API to ban/unban user
      setShowBanModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      // Error handled by hook
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Administration</h1>
        <p className="text-gray-600 mt-1">Manage system users and settings</p>
      </div>

      {error && (
        <Alert type="error" title="Error" closable>
          {error}
        </Alert>
      )}

      {/* System Stats */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">System Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Users */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Users</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.totalUsers || 0}</p>
              </div>
              <Users size={40} className="text-blue-600 opacity-20" />
            </div>
          </Card>

          {/* Active Users (Last 30 days) */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Active (30d)</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.activeUsers30d || 0}</p>
              </div>
              <Activity size={40} className="text-green-600 opacity-20" />
            </div>
          </Card>

          {/* OAuth Clients */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">OAuth Clients</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.oauthClients || 0}</p>
              </div>
              <Shield size={40} className="text-purple-600 opacity-20" />
            </div>
          </Card>

          {/* 2FA Adoption */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">2FA Adoption</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.twoFactorAdoption || 0}%</p>
              </div>
              <TrendingUp size={40} className="text-orange-600 opacity-20" />
            </div>
          </Card>
        </div>
      </div>

      {/* User Management Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">User Management</h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <Card>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <svg
                className="animate-spin h-8 w-8 text-blue-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">2FA</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Joined</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.userId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-900">{user.email}</td>
                      <td className="px-6 py-4">
                        {user.twoFactorEnabled ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle size={16} />
                            Enabled
                          </span>
                        ) : (
                          <span className="text-gray-500">Disabled</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm ${
                            user.isBanned
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {user.isBanned ? 'Banned' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowUserModal(true);
                            }}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <AlertCircle size={16} className="text-blue-600" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowBanModal(true);
                            }}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                            title={user.isBanned ? 'Unban User' : 'Ban User'}
                          >
                            {user.isBanned ? (
                              <CheckCircle size={16} className="text-gray-600" />
                            ) : (
                              <Ban size={16} className="text-red-600" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* User Details Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setSelectedUser(null);
        }}
        title="User Details"
        size="md"
        footer={
          <Button variant="secondary" onClick={() => setShowUserModal(false)}>
            Close
          </Button>
        }
      >
        {selectedUser && (
          <div className="space-y-4">
            <div>
              <label className="form-label">Full Name</label>
              <p className="text-gray-900">
                {selectedUser.firstName} {selectedUser.lastName}
              </p>
            </div>

            <div>
              <label className="form-label">Email</label>
              <p className="text-gray-900">{selectedUser.email}</p>
            </div>

            <div>
              <label className="form-label">Member Since</label>
              <p className="text-gray-900">
                {new Date(selectedUser.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div>
              <label className="form-label">2FA Status</label>
              <p className={selectedUser.twoFactorEnabled ? 'text-green-600' : 'text-gray-600'}>
                {selectedUser.twoFactorEnabled ? 'Enabled' : 'Not enabled'}
              </p>
            </div>

            <div>
              <label className="form-label">Account Status</label>
              <p className={selectedUser.isBanned ? 'text-red-600' : 'text-green-600'}>
                {selectedUser.isBanned ? 'Banned' : 'Active'}
              </p>
            </div>

            <div>
              <label className="form-label">OAuth Clients</label>
              <p className="text-gray-900">{selectedUser.oauthClientCount || 0}</p>
            </div>

            <div>
              <label className="form-label">Last Active</label>
              <p className="text-gray-900">
                {selectedUser.lastLogin
                  ? new Date(selectedUser.lastLogin).toLocaleDateString()
                  : 'Never'}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Ban/Unban Confirmation Modal */}
      <Modal
        isOpen={showBanModal}
        onClose={() => {
          setShowBanModal(false);
          setSelectedUser(null);
        }}
        title={selectedUser?.isBanned ? 'Unban User' : 'Ban User'}
        size="sm"
        footer={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowBanModal(false);
                setSelectedUser(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant={selectedUser?.isBanned ? 'primary' : 'danger'}
              onClick={() =>
                handleBanUser(selectedUser?.userId, selectedUser?.isBanned || false)
              }
            >
              {selectedUser?.isBanned ? 'Unban User' : 'Ban User'}
            </Button>
          </div>
        }
      >
        {selectedUser && (
          <div className="space-y-4">
            <Alert type={selectedUser.isBanned ? 'info' : 'warning'}>
              {selectedUser.isBanned
                ? `This will allow ${selectedUser.email} to access the system again.`
                : `This will prevent ${selectedUser.email} from accessing the system.`}
            </Alert>
            <p className="text-gray-900">
              {selectedUser.isBanned ? 'Unban' : 'Ban'} {selectedUser.firstName} {selectedUser.lastName}?
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};
