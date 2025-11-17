import React, { useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth';
import { Button, Input, Alert, Card, CardTitle } from '@components/index';
import { validateEmail } from '@utils/validation';
import { Mail, Lock } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { isAuthenticated, login, error, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [show2FAPrompt, setShow2FAPrompt] = useState(false);
  const [tempToken, setTempToken] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await login({ email, password });
      // On success, auth store will update and redirect via App.tsx
      navigate('/dashboard');
    } catch (err: any) {
      // Error is handled by auth store
      if (err.response?.status === 403 && err.response?.data?.requiresTwoFactor) {
        setShow2FAPrompt(true);
        setTempToken(err.response.data.tempToken);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Identity Service</h1>
          <p className="text-gray-600 mt-2">OAuth 2.0 Provider</p>
        </div>

        {error && (
          <Alert type="error" title="Login Failed" closable>
            {error}
          </Alert>
        )}

        {show2FAPrompt && (
          <Alert type="info" title="Two-Factor Authentication" closable>
            Please complete 2FA verification to continue.
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="form-label flex items-center gap-2">
              <Mail size={18} />
              Email Address
            </label>
            <Input
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
              error={errors.email}
              fullWidth
            />
          </div>

          <div>
            <label htmlFor="password" className="form-label flex items-center gap-2">
              <Lock size={18} />
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) {
                  setErrors({ ...errors, password: '' });
                }
              }}
              error={errors.password}
              fullWidth
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded" />
              <span className="text-gray-700">Remember me</span>
            </label>
            <Link to="/forgot-password" className="text-blue-600 hover:text-blue-700">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" variant="primary" fullWidth isLoading={isLoading} className="mt-6">
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
              Create one
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};
