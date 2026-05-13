import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../api/client';

interface Notification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await apiClient.get('/internal-api/notifications');
      setNotifications(res.data);
      setUnreadCount(res.data.filter((n: Notification) => !n.is_read).length);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 3000); // Polling every 3 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => setIsOpen(!isOpen);

  const markAsRead = async (id: number) => {
    try {
      await apiClient.put(`/internal-api/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.put('/internal-api/notifications/read-all');
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const deleteNotification = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/internal-api/notifications/${id}`);
      fetchNotifications();
    } catch (err) {
      console.error('Failed to delete notification', err);
    }
  };

  const clearAll = async () => {
    try {
      await apiClient.delete('/internal-api/notifications/clear-all');
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to clear all', err);
    }
  };

  return (
    <div className="notif-bell-container" ref={dropdownRef}>
      <button className="notif-bell-btn" onClick={handleToggle} aria-label="Notifications">
        <i className='bx bx-bell'></i>
        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <h3>Notifications</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div className="notif-actions">
                <button onClick={markAllAsRead}>Mark all read</button>
                <button onClick={clearAll} className="clear-btn">Clear all</button>
              </div>
            </div>
          </div>
          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">No notifications yet</div>
            ) : (
              notifications.map(n => (
                <div 
                  key={n.id} 
                  className={`notif-item ${!n.is_read ? 'unread' : ''}`}
                  onClick={() => !n.is_read && markAsRead(n.id)}
                >
                  <div className="notif-content">
                    <p className="notif-title">{n.title}</p>
                    <p className="notif-message">{n.message}</p>
                    <span className="notif-time">{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  <button className="notif-delete" onClick={(e) => deleteNotification(n.id, e)}>
                    <i className='bx bx-x'></i>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        .notif-bell-container {
          position: relative;
          display: flex;
          align-items: center;
        }
        .notif-bell-btn {
          background: transparent;
          border: none;
          font-size: 1.4rem;
          color: #665772;
          cursor: pointer;
          position: relative;
          padding: 8px;
          border-radius: 50%;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .notif-bell-btn:hover {
          background: #fdf7fb;
          color: #ad246d;
        }
        .notif-badge {
          position: absolute;
          top: 4px;
          right: 4px;
          background: #ff4d4d;
          color: white;
          font-size: 0.65rem;
          min-width: 16px;
          height: 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          font-weight: 800;
          border: 2px solid #fff;
        }
        .notif-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          width: 320px;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(173, 36, 109, 0.15);
          border: 1px solid #ead7e8;
          z-index: 1000;
          margin-top: 12px;
          overflow: hidden;
          animation: slideIn 0.2s ease-out;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .notif-header {
          padding: 12px 16px;
          border-bottom: 1px solid #ead7e8;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #fdf7fb;
        }
        .notif-header h3 {
          margin: 0;
          font-size: 0.9rem;
          color: #261d2b;
          font-weight: 800;
        }
        .notif-actions {
          display: flex;
          gap: 10px;
        }
        .notif-actions button {
          background: transparent;
          border: none;
          font-size: 0.65rem;
          color: #ad246d;
          cursor: pointer;
          font-weight: 700;
          padding: 4px 0;
        }
        .notif-actions button:hover {
          text-decoration: underline;
        }
        .notif-actions button.clear-btn {
          color: #8c7895;
        }
        .notif-list {
          max-height: 400px;
          overflow-y: auto;
        }
        .notif-empty {
          padding: 30px;
          text-align: center;
          color: #8c7895;
          font-size: 0.8rem;
        }
        .notif-item {
          padding: 12px 16px;
          border-bottom: 1px solid #f2ebf4;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          cursor: pointer;
          transition: background 0.2s;
          position: relative;
        }
        .notif-item:hover {
          background: #fdf7fb;
        }
        .notif-item.unread {
          background: #fff9fc;
        }
        .notif-item.unread::before {
          content: '';
          position: absolute;
          left: 4px;
          top: 50%;
          transform: translateY(-50%);
          width: 4px;
          height: 4px;
          background: #ad246d;
          border-radius: 50%;
        }
        .notif-content {
          flex: 1;
        }
        .notif-title {
          margin: 0 0 4px;
          font-weight: 800;
          font-size: 0.8rem;
          color: #261d2b;
        }
        .notif-message {
          margin: 0 0 6px;
          font-size: 0.75rem;
          color: #665772;
          line-height: 1.4;
        }
        .notif-time {
          font-size: 0.6rem;
          color: #8c7895;
        }
        .notif-delete {
          background: transparent;
          border: none;
          color: #ead7e8;
          cursor: pointer;
          font-size: 1.1rem;
          padding: 4px;
          display: flex;
          align-items: center;
          height: fit-content;
          transition: color 0.2s;
        }
        .notif-delete:hover {
          color: #ff4d4d;
        }
      `}</style>
    </div>
  );
};

export default NotificationBell;
