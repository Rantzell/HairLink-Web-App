import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';

interface Notification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  type?: string;
}

/** Extract a postId embedded as `[postId:xxx]` inside a notification message */
function extractPostId(message: string): string | null {
  const m = message?.match(/\[postId:([a-zA-Z0-9_-]+)\]/);
  return m ? m[1] : null;
}

/** Strip metadata tags from the message for display */
function cleanMessage(message: string): string {
  return message?.replace(/\[postId:[a-zA-Z0-9_-]+\]/g, '').trim() ?? '';
}

/** Return the icon to display for each notification type */
function getNotifIcon(n: Notification): string {
  if (n.type === 'announcement') return '📢';
  if (n.type === 'community') {
    if (n.title.includes('liked')) return '❤️';
    if (n.title.includes('comment')) return '💬';
    if (n.title.includes('reply')) return '↩️';
    return '💬';
  }
  if (n.type === 'donation') return '🌸';
  if (n.type === 'request') return '💖';
  if (n.type === 'wigmaker') return '🧵';
  if (n.type === 'staff_donation') return '📦';
  if (n.type === 'staff_request') return '📋';
  if (n.type === 'event') return '📣';
  if (n.type === 'pickup_ready') return '🎉';
  return '🔔';
}

const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Notification | null>(null);
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



  /** Check if a notification has a clickable link */
  const getNotifLink = (n: Notification): { label: string; path: string } | null => {
    if (n.type === 'announcement' || n.title.includes('Announcement:')) {
      return { label: 'View Announcement', path: '' };
    }
    if (n.type === 'event' || n.title.includes('New Event:')) {
      return { label: 'View Event', path: '' };
    }

    // Extract reference codes from the notification message
    const match = n.message.match(/\(((?:HD|WR|REQ|MD)[- ][A-Z0-9-]+)\)/i);

    // ── Staff role routing ──
    if (role === 'staff') {
      // Staff donation notifications: "New Hair Donation" → verification, delivery-related → tracking
      if (n.type === 'staff_donation') {
        if (n.title.includes('New Hair Donation')) return { label: 'View Verification →', path: '/staff/verification/donor' };
        return { label: 'View Tracking →', path: '/staff/tracking/donation' };
      }
      // Staff request notifications: "New Wig Request" → verification, others → tracking
      if (n.type === 'staff_request') {
        if (n.title.includes('New Wig Request')) return { label: 'View Verification →', path: '/staff/verification/recipient' };
        return { label: 'View Tracking →', path: '/staff/tracking/recipient' };
      }
      if (n.type === 'staff_monetary') {
        if (n.title.includes('New Monetary')) return { label: 'View Verification →', path: '/staff/verification/monetary' };
        return { label: 'View Monetary →', path: '/staff/verification/monetary' };
      }
      if (n.type === 'staff_wig_production') return { label: 'View Tracking →', path: '/staff/tracking/batch-donation' };
      // If a reference is found, route to the appropriate staff page
      if (match) {
        const ref = match[1];
        if (ref.startsWith('HD-') || ref.startsWith('HD ')) return { label: 'View Tracking →', path: '/staff/tracking/donation' };
        if (ref.startsWith('WR-') || ref.startsWith('WR ') || ref.startsWith('REQ-') || ref.startsWith('REQ ')) return { label: 'View Tracking →', path: '/staff/tracking/recipient' };
        if (ref.startsWith('MD-') || ref.startsWith('MD ')) return { label: 'View Monetary →', path: '/staff/verification/monetary' };
      }
      // Fallback for generic staff notification types
      if (n.type === 'donation') return { label: 'View Tracking →', path: '/staff/tracking/donation' };
      if (n.type === 'request') return { label: 'View Tracking →', path: '/staff/tracking/recipient' };
      if (n.type === 'community') {
        const postId = extractPostId(n.message);
        return { label: 'View Post →', path: postId ? `/staff/community?postId=${postId}` : '/staff/community' };
      }
      return null;
    }

    // ── Admin role routing ──
    if (role === 'admin') {
      if (n.type === 'staff_donation' || n.type === 'donation') return { label: 'View Verification →', path: '/admin/verification?view=donor' };
      if (n.type === 'staff_request' || n.type === 'request') return { label: 'View Verification →', path: '/admin/verification?view=recipient' };
      if (n.type === 'staff_monetary') return { label: 'View Reports →', path: '/admin/reports?type=monetary' };
      if (n.type === 'staff_wig_production') return { label: 'View Operations →', path: '/admin/operations' };
      if (match) {
        const ref = match[1];
        if (ref.startsWith('HD-') || ref.startsWith('HD ')) return { label: 'View Verification →', path: '/admin/verification?view=donor' };
        if (ref.startsWith('WR-') || ref.startsWith('WR ') || ref.startsWith('REQ-') || ref.startsWith('REQ ')) return { label: 'View Verification →', path: '/admin/verification?view=recipient' };
      }
      if (n.type === 'community') {
        const postId = extractPostId(n.message);
        return { label: 'View Post →', path: postId ? `/admin/community?postId=${postId}` : '/admin/community' };
      }
      return null;
    }

    // ── Wigmaker role routing ──
    if (role === 'wigmaker') {
      if (n.type === 'wigmaker') return { label: 'View Tasks →', path: '/wigmaker/hair-batch-tracking' };
      return null;
    }

    // ── Donor / Recipient routing (default) ──
    if (match) {
      const ref = match[1];
      if (ref.startsWith('HD-') || ref.startsWith('HD ')) return { label: 'View Tracking →', path: `/donor/tracking/${ref}` };
      if (ref.startsWith('WR-') || ref.startsWith('WR ') || ref.startsWith('REQ-') || ref.startsWith('REQ ')) return { label: 'View Tracking →', path: `/recipient/tracking/${ref}` };
    }
    if (n.type === 'donation') return { label: 'View Donation →', path: '/donor/tracking' };
    if (n.type === 'request') return { label: 'View Request →', path: '/recipient/tracking' };
    if (n.type === 'community') {
      const postId = extractPostId(n.message);
      const base = `/${role}/community`;
      return { label: 'View Post →', path: postId ? `${base}?postId=${postId}` : base };
    }
    if (n.type === 'pickup_ready') return { label: 'View Request →', path: '/recipient/tracking' };
    return null;
  };

  const handleNotifClick = async (n: Notification) => {
    if (!n.is_read) {
      try {
        await apiClient.put(`/internal-api/notifications/${n.id}/read`);
        setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, is_read: true } : item));
        setUnreadCount(prev => Math.max(0, prev - 1));
        fetchNotifications();
      } catch (err) {
        console.error('Failed to mark as read', err);
      }
    }
    const link = getNotifLink(n);
    if (n.type === 'announcement' || n.title.includes('Announcement:') || n.type === 'event' || n.title.includes('New Event:')) {
      setSelectedAnnouncement(n);
      setIsOpen(false);
    } else if (link?.path) {
      setIsOpen(false);
      navigate(link.path);
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
              notifications.map(n => {
                const link = getNotifLink(n);
                const icon = getNotifIcon(n);
                return (
                  <div 
                    key={n.id} 
                    className={`notif-item ${!n.is_read ? 'unread' : ''} ${link ? 'clickable' : ''}`}
                    onClick={() => handleNotifClick(n)}
                  >
                    <div className="notif-icon-wrap">
                      <span className="notif-icon">{icon}</span>
                    </div>
                    <div className="notif-content">
                      <p className="notif-title">{n.title}</p>
                      <p className="notif-message">{cleanMessage(n.message)}</p>
                      <div className="notif-meta">
                        <span className="notif-time">{new Date(n.created_at).toLocaleString()}</span>
                        {link && <span className="notif-link-hint">{link.label}</span>}
                      </div>
                    </div>
                    <button className="notif-delete" onClick={(e) => deleteNotification(n.id, e)}>
                      <i className='bx bx-x'></i>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {selectedAnnouncement && createPortal(
        <div className="announcement-modal-overlay" onClick={() => setSelectedAnnouncement(null)}>
          <div className="announcement-modal-card" onClick={e => e.stopPropagation()}>
            <header className="announcement-modal-header">
              <div className="announcement-modal-badge">
                <i className='bx bx-bell'></i> {selectedAnnouncement.type === 'event' || selectedAnnouncement.title.includes('New Event:') ? 'Event Details' : 'Announcement'}
              </div>
              <button className="announcement-modal-close" onClick={() => setSelectedAnnouncement(null)}>
                <i className='bx bx-x'></i>
              </button>
            </header>
            <main className="announcement-modal-body">
              <h2 className="announcement-modal-title">
                {selectedAnnouncement.title.replace('📢 Announcement: ', '').replace('📢 ', '').replace('📣 New Event: ', '').replace('📣 ', '')}
              </h2>
              <p className="announcement-modal-date">
                <i className='bx bx-calendar'></i> {new Date(selectedAnnouncement.created_at).toLocaleString()}
              </p>
              <div className="announcement-modal-content">
                {selectedAnnouncement.message}
              </div>
            </main>
            <footer className="announcement-modal-footer">
              <button className="announcement-modal-btn-close" onClick={() => setSelectedAnnouncement(null)}>
                Close
              </button>
            </footer>
          </div>
        </div>,
        document.body
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
          position: fixed;
          top: 70px;
          right: 12px;
          width: min(320px, calc(100vw - 24px));
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(173, 36, 109, 0.15);
          border: 1px solid #ead7e8;
          z-index: 1000;
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
        .notif-icon-wrap {
          display: flex;
          align-items: flex-start;
          padding-top: 2px;
          flex-shrink: 0;
        }
        .notif-icon {
          font-size: 1.2rem;
          line-height: 1;
        }
        .notif-content {
          flex: 1;
          min-width: 0;
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
        .notif-item.clickable {
          cursor: pointer;
        }
        .notif-item.clickable:hover {
          background: #fef0f7;
          border-left: 3px solid #ad246d;
          padding-left: 13px;
        }
        .notif-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-top: 2px;
        }
        .notif-link-hint {
          font-size: 0.65rem;
          color: #ad246d;
          font-weight: 700;
          white-space: nowrap;
          transition: color 0.2s;
        }
        .notif-item.clickable:hover .notif-link-hint {
          color: #8c1e58;
          text-decoration: underline;
        }

        /* ── Announcement Modal Styling ── */
        .announcement-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(38, 29, 43, 0.4);
          backdrop-filter: blur(8px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.25s ease;
        }
        .announcement-modal-card {
          width: 90%;
          max-width: 500px;
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 20px 40px rgba(173, 36, 109, 0.12);
          border: 1px solid #ead7e8;
          overflow: hidden;
          animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes popIn {
          from { transform: scale(0.9) translateY(20px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
        .announcement-modal-header {
          padding: 16px 24px;
          background: #fdf7fb;
          border-bottom: 1px solid #ead7e8;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .announcement-modal-badge {
          background: #ad246d;
          color: white;
          font-size: 0.7rem;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 4px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .announcement-modal-close {
          background: transparent;
          border: none;
          color: #8c7895;
          font-size: 1.5rem;
          cursor: pointer;
          transition: color 0.2s;
          display: flex;
          align-items: center;
        }
        .announcement-modal-close:hover {
          color: #ad246d;
        }
        .announcement-modal-body {
          padding: 24px;
        }
        .announcement-modal-title {
          margin: 0 0 8px;
          font-size: 1.25rem;
          font-weight: 800;
          color: #261d2b;
          line-height: 1.3;
        }
        .announcement-modal-date {
          margin: 0 0 20px;
          font-size: 0.75rem;
          color: #8c7895;
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 500;
        }
        .announcement-modal-content {
          font-size: 0.9rem;
          line-height: 1.6;
          color: #4c3f54;
          white-space: pre-wrap;
          max-height: 250px;
          overflow-y: auto;
          padding-right: 8px;
        }
        .announcement-modal-content::-webkit-scrollbar {
          width: 6px;
        }
        .announcement-modal-content::-webkit-scrollbar-thumb {
          background: #ead7e8;
          border-radius: 3px;
        }
        .announcement-modal-footer {
          padding: 16px 24px;
          border-top: 1px solid #f2ebf4;
          display: flex;
          justify-content: flex-end;
          background: #fdf7fb;
        }
        .announcement-modal-btn-close {
          background: #ad246d;
          color: white;
          border: none;
          padding: 8px 20px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s;
        }
        .announcement-modal-btn-close:hover {
          background: #8b1854;
        }
      `}</style>
    </div>
  );
};

export default NotificationBell;
