import React from 'react';

interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
  autoDismiss?: boolean;
  duration?: number;
}

interface ToastNotificationsProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

const ToastNotifications: React.FC<ToastNotificationsProps> = ({ notifications, onRemove }) => {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  const getNotificationClass = (type: string) => {
    return `toast-notification toast-${type}`;
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="toast-container">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={getNotificationClass(notification.type)}
        >
          <div className="toast-content">
            <span className="toast-icon">
              {getNotificationIcon(notification.type)}
            </span>
            <span className="toast-message">
              {notification.message}
            </span>
          </div>
          <button
            className="toast-close"
            onClick={() => onRemove(notification.id)}
            title="Close notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastNotifications;
