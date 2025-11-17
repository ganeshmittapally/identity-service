import React, { useState } from 'react';
import { useAuth } from '@hooks/useAuth';
import { Button, Input, Card, CardTitle, Alert, Modal } from '@components/index';
import { Copy, CheckCircle, AlertCircle, Lock } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  });
  const [copiedCode, setCopiedCode] = useState('');

  // Mock 2FA data
  const qrCode = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const backupCodes = [
    '1234-5678',
    '9012-3456',
    '7890-1234',
    '5678-9012',
    '3456-7890',
    '1234-5678',
    '9012-3456',
    '7890-1234',
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSave = async () => {
    // Call API to update profile
    setIsEditing(false);
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account information and security</p>
      </div>

      {/* User Information */}
      <Card>
        <CardTitle level="h2">Account Information</CardTitle>

        {isEditing ? (
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="form-label">First Name</label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  fullWidth
                />
              </div>
              <div>
                <label htmlFor="lastName" className="form-label">Last Name</label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  fullWidth
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="form-label">Email Address</label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                disabled
                fullWidth
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="primary" onClick={handleSave}>Save Changes</Button>
              <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
            </div>
          </form>
        ) : (
          <>
            <div className="mt-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600">Full Name</p>
                  <p className="text-lg font-medium text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600">Email Address</p>
                  <p className="text-lg font-medium text-gray-900">{user?.email}</p>
                </div>
              </div>

              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600">Account Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <p className="text-lg font-medium text-gray-900 capitalize">{user?.status}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-600">Member Since</p>
                  <p className="text-lg font-medium text-gray-900">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <Button variant="secondary" onClick={() => setIsEditing(true)}>Edit Information</Button>
            </div>
          </>
        )}
      </Card>

      {/* Security */}
      <Card>
        <CardTitle level="h2">Security</CardTitle>

        <div className="mt-6 space-y-4">
          {/* 2FA Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Two-Factor Authentication</p>
              <p className="text-sm text-gray-600 mt-1">
                {user?.twoFactorEnabled
                  ? 'Enabled - Your account is protected'
                  : 'Disabled - Enable to enhance security'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {user?.twoFactorEnabled ? (
                <CheckCircle className="text-green-600" size={24} />
              ) : (
                <AlertCircle className="text-orange-600" size={24} />
              )}
              <Button
                variant={user?.twoFactorEnabled ? 'danger' : 'primary'}
                size="sm"
                onClick={() => setShow2FASetup(!show2FASetup)}
              >
                {user?.twoFactorEnabled ? 'Disable' : 'Enable'}
              </Button>
            </div>
          </div>

          {/* Password Change */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Password</p>
              <p className="text-sm text-gray-600 mt-1">Last changed 3 months ago</p>
            </div>
            <Button variant="secondary" size="sm">
              Change Password
            </Button>
          </div>

          {/* Sessions */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Active Sessions</p>
              <p className="text-sm text-gray-600 mt-1">1 active session</p>
            </div>
            <Button variant="secondary" size="sm">
              Manage Sessions
            </Button>
          </div>
        </div>
      </Card>

      {/* 2FA Setup Modal */}
      <Modal
        isOpen={show2FASetup}
        onClose={() => setShow2FASetup(false)}
        title="Two-Factor Authentication"
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShow2FASetup(false)}>Cancel</Button>
            <Button variant="primary">Verify & Enable</Button>
          </div>
        }
      >
        {!user?.twoFactorEnabled ? (
          <div className="space-y-6">
            <Alert type="info" title="How it works">
              Two-factor authentication adds an extra layer of security. You'll need a code from your
              authenticator app when logging in.
            </Alert>

            <div className="bg-gray-50 p-6 rounded-lg text-center">
              <p className="text-sm text-gray-600 mb-4">Scan with your authenticator app</p>
              <img src={qrCode} alt="QR Code" className="w-48 h-48 mx-auto" />
              <p className="text-xs text-gray-500 mt-4">
                Can't scan? Enter this code manually:
              </p>
              <p className="font-mono text-sm mt-2 p-2 bg-white rounded border border-gray-200">
                JBSWY3DPEBLW64TMMQQQ
              </p>
            </div>

            <div>
              <label htmlFor="verifyCode" className="form-label">Verification Code</label>
              <Input
                id="verifyCode"
                placeholder="000000"
                type="text"
                inputMode="numeric"
                maxLength={6}
                fullWidth
              />
            </div>

            <button
              onClick={() => setShowBackupCodes(true)}
              className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
            >
              View backup codes →
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert type="success" title="2FA Enabled">
              Your account is protected with two-factor authentication.
            </Alert>
            <Button variant="danger" fullWidth>
              Disable Two-Factor Authentication
            </Button>
          </div>
        )}
      </Modal>

      {/* Backup Codes Modal */}
      <Modal
        isOpen={showBackupCodes}
        onClose={() => setShowBackupCodes(false)}
        title="Backup Codes"
        size="md"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowBackupCodes(false)}>Done</Button>
            <Button variant="primary">Download Codes</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Alert type="warning" title="Save your backup codes">
            Keep these codes in a safe place. You can use them to access your account if you lose
            access to your authenticator app.
          </Alert>

          <div className="grid grid-cols-2 gap-2 bg-gray-50 p-4 rounded-lg">
            {backupCodes.map((code, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
              >
                <span className="font-mono text-sm">{code}</span>
                <button
                  onClick={() => copyToClipboard(code)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Copy code"
                >
                  {copiedCode === code ? (
                    <CheckCircle size={16} className="text-green-600" />
                  ) : (
                    <Copy size={16} className="text-gray-400" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};
