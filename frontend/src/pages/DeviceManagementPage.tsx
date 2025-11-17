import React, { useEffect, useState } from 'react';
import { Button, Card, CardTitle, Alert, Modal } from '@components/index';
import { Smartphone, Monitor, Globe, Trash2, MapPin, Clock, LogOut } from 'lucide-react';

interface Device {
  id: string;
  name: string;
  type: 'web' | 'mobile' | 'desktop';
  os: string;
  browser: string;
  ipAddress: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export const DeviceManagementPage: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    // Simulate fetching devices
    const mockDevices: Device[] = [
      {
        id: '1',
        name: 'My MacBook Pro',
        type: 'web',
        os: 'macOS 14.0',
        browser: 'Chrome 120.0',
        ipAddress: '192.168.1.1',
        location: 'San Francisco, CA',
        lastActive: new Date().toISOString(),
        isCurrent: true,
      },
      {
        id: '2',
        name: 'iPhone 15 Pro',
        type: 'mobile',
        os: 'iOS 17.2',
        browser: 'Safari',
        ipAddress: '203.0.113.45',
        location: 'San Francisco, CA',
        lastActive: new Date(Date.now() - 3600000).toISOString(),
        isCurrent: false,
      },
      {
        id: '3',
        name: 'Work Desktop',
        type: 'desktop',
        os: 'Windows 11',
        browser: 'Edge 120.0',
        ipAddress: '10.0.0.42',
        location: 'Office - San Francisco',
        lastActive: new Date(Date.now() - 86400000).toISOString(),
        isCurrent: false,
      },
      {
        id: '4',
        name: 'Unknown Device',
        type: 'web',
        os: 'Linux',
        browser: 'Firefox',
        ipAddress: '198.51.100.89',
        location: 'New York, NY',
        lastActive: new Date(Date.now() - 604800000).toISOString(),
        isCurrent: false,
      },
    ];
    setDevices(mockDevices);
    setIsLoading(false);
  }, []);

  const handleRevokeDevice = async (deviceId: string) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      setDevices(devices.filter((d) => d.id !== deviceId));
      setShowConfirmModal(false);
      setSelectedDevice(null);
    } catch (err) {
      // Error handled by API
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return <Smartphone size={24} className="text-blue-600" />;
      case 'desktop':
        return <Monitor size={24} className="text-purple-600" />;
      default:
        return <Globe size={24} className="text-green-600" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Active Sessions & Devices</h1>
        <p className="text-gray-600 mt-1">Manage devices that have access to your account</p>
      </div>

      {/* Security Alert */}
      <Alert type="info" title="Security Tip">
        Review this list regularly. If you see devices you don't recognize, revoke access immediately.
      </Alert>

      {/* Devices List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
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
          </Card>
        ) : devices.length === 0 ? (
          <Card>
            <div className="text-center py-8">
              <p className="text-gray-500">No devices currently active</p>
            </div>
          </Card>
        ) : (
          devices.map((device) => (
            <Card
              key={device.id}
              className={`p-6 border-2 transition-colors ${
                device.isCurrent
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                {/* Device Info */}
                <div className="flex gap-4 flex-1">
                  <div className="flex-shrink-0">{getDeviceIcon(device.type)}</div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">{device.name}</h3>
                      {device.isCurrent && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          Current Device
                        </span>
                      )}
                    </div>

                    <p className="text-gray-600 text-sm mb-3">
                      {device.os} • {device.browser}
                    </p>

                    {/* Device Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Globe size={16} className="text-gray-400" />
                        <span className="font-mono text-xs">{device.ipAddress}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <MapPin size={16} className="text-gray-400" />
                        <span>{device.location}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Clock size={16} className="text-gray-400" />
                        <span>
                          Last active <span className="font-medium">{formatTime(device.lastActive)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 ml-4">
                  {!device.isCurrent && (
                    <Button
                      variant="danger"
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={() => {
                        setSelectedDevice(device);
                        setShowConfirmModal(true);
                      }}
                    >
                      <Trash2 size={16} />
                      Revoke
                    </Button>
                  )}
                  {device.isCurrent && (
                    <span className="px-3 py-2 text-sm text-gray-600">
                      Can't revoke current device
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Additional Actions */}
      <Card>
        <CardTitle level="h2">Manage All Sessions</CardTitle>
        <div className="mt-6 space-y-4">
          <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Sign out of all other sessions</p>
              <p className="text-sm text-gray-600 mt-1">
                You'll be signed out on all devices except this one. You'll need to sign in again.
              </p>
            </div>
            <Button variant="secondary" className="flex items-center gap-2">
              <LogOut size={16} />
              Sign Out All
            </Button>
          </div>
        </div>
      </Card>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setSelectedDevice(null);
        }}
        title="Revoke Device Access"
        size="sm"
        footer={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowConfirmModal(false);
                setSelectedDevice(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() =>
                selectedDevice && handleRevokeDevice(selectedDevice.id)
              }
            >
              Revoke Access
            </Button>
          </div>
        }
      >
        {selectedDevice && (
          <div className="space-y-4">
            <Alert type="warning">
              This device will be signed out and can no longer access your account without
              signing in again.
            </Alert>
            <p className="text-gray-900">
              Are you sure you want to revoke access to{' '}
              <span className="font-semibold">{selectedDevice.name}</span>?
            </p>
            <p className="text-sm text-gray-600">
              Location: <span className="font-mono">{selectedDevice.ipAddress}</span> •{' '}
              {selectedDevice.location}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};
