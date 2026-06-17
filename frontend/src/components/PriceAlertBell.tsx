import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBell, FiBellOff, FiX } from 'react-icons/fi';
import api from '../utils/api';
import { formatRelativeTime } from '../utils/helpers';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function PriceAlertBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDrawer, setShowDrawer] = useState(false);
  const [loading, setLoading] = useState(true);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setShowDrawer(false);
      }
    };
    if (showDrawer) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDrawer]);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const markRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'price_alert': return '📈';
      case 'chat': return '💬';
      case 'inquiry': return '📋';
      case 'listing': return '🌾';
      default: return '🔔';
    }
  };

  return (
    <div className="relative">
      <button onClick={() => setShowDrawer(!showDrawer)} className="relative text-forest-700 hover:text-amber-500 transition-colors">
        {unreadCount > 0 ? <FiBell size={18} /> : <FiBellOff size={18} />}
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-terracotta-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {showDrawer && (
          <motion.div
            ref={drawerRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-10 w-80 md:w-96 glass-dark rounded-2xl shadow-2xl border border-white/10 overflow-hidden z-50">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-heading font-bold text-cream">Notifications</h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-amber-400 hover:text-amber-300 transition-colors">
                    Mark all read
                  </button>
                )}
                <button onClick={() => setShowDrawer(false)} className="text-forest-300 hover:text-cream transition-colors">
                  <FiX size={16} />
                </button>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-forest-300 text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notif, i) => (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.02 * i }}
                    onClick={() => markRead(notif.id)}
                    className={`p-4 border-b border-white/5 cursor-pointer transition-colors ${notif.isRead ? 'opacity-60 hover:opacity-80' : 'hover:bg-white/5'}`}>
                    <div className="flex items-start space-x-3">
                      <span className="text-lg">{getIcon(notif.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-cream">{notif.title}</p>
                        <p className="text-xs text-forest-300 mt-0.5 line-clamp-2">{notif.body}</p>
                        <p className="text-[10px] text-forest-400 mt-1">{formatRelativeTime(notif.createdAt)}</p>
                      </div>
                      {!notif.isRead && <div className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0 mt-1" />}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
