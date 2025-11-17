import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback(
    (notification: Omit<Notification, 'id'>) => {
      const id = Math.random().toString(36).substr(2, 9);
      const newNotification: Notification = {
        ...notification,
        id,
        duration: notification.duration ?? 5000,
      };

      setNotifications((prev) => [...prev, newNotification]);

      // Auto-remove notification after duration
      if (newNotification.duration && newNotification.duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, newNotification.duration);
      }

      return id;
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, clearAll }}>
      {children}
      <NotificationContainer notifications={notifications} removeNotification={removeNotification} />
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

const NotificationContainer: React.FC<{
  notifications: Notification[];
  removeNotification: (id: string) => void;
}> = ({ notifications, removeNotification }) => {
  const getIcon = (type: NotificationType) => {
    const iconProps = { size: 20 };
    switch (type) {
      case 'success':
        return <CheckCircle {...iconProps} className="text-green-600" />;
      case 'error':
        return <AlertCircle {...iconProps} className="text-red-600" />;
      case 'warning':
        return <AlertTriangle {...iconProps} className="text-yellow-600" />;
      case 'info':
        return <Info {...iconProps} className="text-blue-600" />;
    }
  };

  const getBackgroundColor = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTextColor = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return 'text-green-900';
      case 'error':
        return 'text-red-900';
      case 'warning':
        return 'text-yellow-900';
      case 'info':
        return 'text-blue-900';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`flex items-start gap-3 p-4 border rounded-lg shadow-lg animate-in slide-in-from-right ${getBackgroundColor(
            notification.type
          )}`}
        >
          <div className="flex-shrink-0">{getIcon(notification.type)}</div>

          <div className="flex-1">
            <h3 className={`font-semibold ${getTextColor(notification.type)}`}>
              {notification.title}
            </h3>
            <p className={`text-sm mt-1 ${getTextColor(notification.type)}`}>
              {notification.message}
            </p>

            {notification.action && (
              <button
                onClick={notification.action.onClick}
                className={`text-sm font-medium mt-2 hover:underline ${getTextColor(
                  notification.type
                )}`}
              >
                {notification.action.label}
              </button>
            )}
          </div>

          <button
            onClick={() => removeNotification(notification.id)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      ))}
    </div>
  );
};
