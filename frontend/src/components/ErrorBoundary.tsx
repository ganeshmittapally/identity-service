import React, { ReactNode, ReactElement } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Could send to error tracking service here (Sentry, LogRocket, etc.)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleHome = () => {
    window.location.href = '/dashboard';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              {/* Error Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle size={32} className="text-red-600" />
                </div>
              </div>

              {/* Error Message */}
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Something Went Wrong</h1>
              <p className="text-gray-600 mb-6">
                We're sorry for the inconvenience. An unexpected error occurred while processing your request.
              </p>

              {/* Error Details (Development Only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                  <p className="text-xs font-mono text-red-700 break-words">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  className="flex-1 flex items-center justify-center gap-2"
                  onClick={this.handleReset}
                >
                  <RefreshCw size={16} />
                  Try Again
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1 flex items-center justify-center gap-2"
                  onClick={this.handleHome}
                >
                  <Home size={16} />
                  Go Home
                </Button>
              </div>

              {/* Support Link */}
              <p className="text-xs text-gray-500 mt-6">
                If this problem persists, please{' '}
                <a href="mailto:support@example.com" className="text-blue-600 hover:underline">
                  contact support
                </a>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
