import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardTitle, Alert, Badge, Button } from '@components/index';
import { useAuth } from '@hooks/useAuth';
import { useClients } from '@hooks/useClients';
import { useAdmin } from '@hooks/useAdmin';
import { Plus, Settings, Lock, Users, Shield } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { clients, fetchClients } = useClients();
  const { stats, fetchStats } = useAdmin();
  const [isAdmin] = useState(user?.role === 'admin');

  useEffect(() => {
    fetchClients(0, 5); // Fetch recent clients
    if (isAdmin) {
      fetchStats();
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.firstName || user?.email}</p>
        </div>
        <Badge>Verified Account</Badge>
      </div>

      {/* Security Alert */}
      {!user?.twoFactorEnabled && (
        <Alert type="warning" title="Enhance Your Security" closable>
          Enable two-factor authentication to protect your account.{' '}
          <Link to="/profile" className="font-semibold text-blue-600 hover:text-blue-700">
            Enable now →
          </Link>
        </Alert>
      )}

      {/* Stats Grid */}
      {isAdmin && stats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Users</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalUsers}</p>
              </div>
              <Users size={32} className="text-blue-600 opacity-20" />
            </div>
            <p className="text-xs text-gray-500 mt-2">{stats.activeUsers} active</p>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">OAuth Clients</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalClients}</p>
              </div>
              <Shield size={32} className="text-green-600 opacity-20" />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">System Health</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {stats.systemHealth ? 'Healthy' : 'Issues'}
                </p>
              </div>
              <Shield size={32} className="text-green-600 opacity-20" />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">System Uptime</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {Math.round((stats.uptime / 3600) * 100) / 100}h
                </p>
              </div>
              <Settings size={32} className="text-purple-600 opacity-20" />
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardTitle level="h3">OAuth Clients</CardTitle>
            <p className="text-4xl font-bold text-blue-600 mt-4">{clients.length}</p>
            <p className="text-gray-500 text-sm mt-1">Active applications</p>
          </Card>

          <Card>
            <CardTitle level="h3">Two-Factor Auth</CardTitle>
            <p
              className={`text-4xl font-bold mt-4 ${
                user?.twoFactorEnabled ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {user?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
            </p>
            <p className="text-gray-500 text-sm mt-1">Account security</p>
          </Card>

          <Card>
            <CardTitle level="h3">Account Status</CardTitle>
            <p className="text-4xl font-bold text-purple-600 mt-4">{user?.status || 'active'}</p>
            <p className="text-gray-500 text-sm mt-1">Current status</p>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardTitle level="h2">Quick Start</CardTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <Link
            to="/clients"
            className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-left group"
          >
            <div className="flex items-center gap-3 mb-2">
              <Plus size={20} className="text-blue-600 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-gray-900">Create OAuth Client</h3>
            </div>
            <p className="text-sm text-gray-600">Set up a new application for OAuth flow</p>
          </Link>

          <Link
            to="/profile"
            className="p-4 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors text-left group"
          >
            <div className="flex items-center gap-3 mb-2">
              <Lock size={20} className="text-green-600 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-gray-900">Enable 2FA</h3>
            </div>
            <p className="text-sm text-gray-600">Secure your account with two-factor authentication</p>
          </Link>

          {isAdmin && (
            <Link
              to="/admin"
              className="p-4 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors text-left group"
            >
              <div className="flex items-center gap-3 mb-2">
                <Shield size={20} className="text-purple-600 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-gray-900">Admin Panel</h3>
              </div>
              <p className="text-sm text-gray-600">Manage system users and settings</p>
            </Link>
          )}
        </div>
      </Card>

      {/* Recent Clients */}
      {clients.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle level="h2">Recent Applications</CardTitle>
            <Link to="/clients" className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {clients.slice(0, 5).map((client) => (
              <div
                key={client.clientId}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{client.clientName}</p>
                  <p className="text-xs text-gray-500 mt-1">{client.clientId}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="primary" size="sm">
                    {client.clientType}
                  </Badge>
                  <Badge variant={client.status === 'active' ? 'success' : 'danger'} size="sm">
                    {client.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
