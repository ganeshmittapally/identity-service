import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Button, Input, Card, Alert } from '@components/index';
import { Lock, Mail, CheckCircle, ArrowLeft } from 'lucide-react';
import { validatePassword } from '@utils/validation';

type ResetStep = 'request' | 'verify' | 'reset' | 'success';

export const PasswordResetPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [step, setStep] = useState<ResetStep>(
    searchParams.get('token') ? 'reset' : 'request'
  );
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Step 1: Request Password Reset
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setErrorMessage('');

    if (!email) {
      setErrors({ email: 'Email is required' });
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSuccessMessage('Check your email for reset instructions');
      setStep('verify');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify Reset Code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setErrorMessage('');

    if (!verificationCode) {
      setErrors({ verificationCode: 'Verification code is required' });
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setStep('reset');
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setErrorMessage('');

    // Validate passwords
    if (!formData.password) {
      setErrors({ password: 'New password is required' });
      return;
    }

    if (!formData.confirmPassword) {
      setErrors({ confirmPassword: 'Password confirmation is required' });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    const passwordErrors = validatePassword(formData.password);
    if (passwordErrors.length > 0) {
      setErrors({
        password: `Password must contain: ${passwordErrors.join(', ')}`,
      });
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setStep('success');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  // Render different steps
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle size={32} className="text-green-600" />
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">Password Reset Complete</h1>
              <p className="text-gray-600 mt-2">
                Your password has been successfully reset. You can now log in with your new password.
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => navigate('/login')}
            >
              Back to Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => navigate('/login')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
            <p className="text-sm text-gray-600">
              {step === 'request' && 'Enter your email address'}
              {step === 'verify' && 'Enter the verification code'}
              {step === 'reset' && 'Create a new password'}
            </p>
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <Alert type="error" title="Error" closable onClose={() => setErrorMessage('')}>
            {errorMessage}
          </Alert>
        )}

        {/* Success Message */}
        {successMessage && (
          <Alert type="success" title="Success" closable onClose={() => setSuccessMessage('')}>
            {successMessage}
          </Alert>
        )}

        {/* Step 1: Request Reset */}
        {step === 'request' && (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3 top-3 text-gray-400"
                />
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) {
                      setErrors({ ...errors, email: '' });
                    }
                  }}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-red-600 text-sm mt-1">{errors.email}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                We'll send you a verification code to reset your password.
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>

            <p className="text-center text-sm text-gray-600">
              Remember your password?{' '}
              <Link to="/login" className="text-blue-600 hover:underline">
                Sign In
              </Link>
            </p>
          </form>
        )}

        {/* Step 2: Verify Code */}
        {step === 'verify' && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <label htmlFor="code" className="form-label">
                Verification Code
              </label>
              <input
                id="code"
                type="text"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => {
                  setVerificationCode(e.target.value.toUpperCase().slice(0, 6));
                  if (errors.verificationCode) {
                    setErrors({ ...errors, verificationCode: '' });
                  }
                }}
                maxLength={6}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest font-mono ${
                  errors.verificationCode ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.verificationCode && (
                <p className="text-red-600 text-sm mt-1">{errors.verificationCode}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Check your email for the 6-digit verification code.
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </Button>
          </form>
        )}

        {/* Step 3: Reset Password */}
        {step === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label htmlFor="password" className="form-label">
                New Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-3 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (errors.password) {
                      setErrors({ ...errors, password: '' });
                    }
                  }}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.password && (
                <p className="text-red-600 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-3 text-gray-400" />
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    setFormData({ ...formData, confirmPassword: e.target.value });
                    if (errors.confirmPassword) {
                      setErrors({ ...errors, confirmPassword: '' });
                    }
                  }}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-red-600 text-sm mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
};
