import { useState, useEffect, useRef } from 'react';
import { Menu, Bell, X, CheckCheck } from 'lucide-react';
import Sidebar from './Sidebar';
import TLPBanner from './TLPBanner';
import { useAuth } from '../contexts/AuthContext';
import { getStorage, setStorage, KEYS } from '../utils/storage';

const NOTIF_ICON = {
  critical: '🔴',
  warning: '⚠️',
  crisis: '⚡',
  done: '✅',
  info: '💡',
};

function formatTimeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d atrás`;
  if (h > 0) return `${h}h atrás`;
  if (m > 0) return `${m}m atrás`;
  return 'agora';
}

function NotificationBell({ effectiveClientId }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const ref = useRef(null);

  const load = () => {
    if (!effectiveClientId) return;
    setNotifications(getStorage(KEYS.notifications(effectiveClientId), []));
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, [effectiveClientId]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const unread = notifications.filter(n => !n.read).length;

  const markRead = (id) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    setStorage(KEYS.notifications(effectiveClientId), updated);
  };

  const markAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    setStorage(KEYS.notifications(effectiveClientId), updated);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(v => !v); load(); }}
        className="relative p-1.5 text-gray-500 hover:text-[#111111] transition-colors"
        title="Notificações"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-600 text-white font-mono text-[10px] rounded-full flex items-center justify-center px-0.5 leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-[#E0E0E0] shadow-xl z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#111111]">
            <span className="font-mono text-xs text-white uppercase tracking-widest">Notificações</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="flex items-center gap-1 font-mono text-xs text-gray-400 hover:text-[#CAFF00] transition-colors" title="Marcar todas como lidas">
                  <CheckCheck size={12} /> Lidas
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white p-0.5">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Feed */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#F0F0F0]">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell size={24} className="text-gray-200 mx-auto mb-2" />
                <p className="font-dm text-sm text-gray-400">Nenhuma notificação</p>
              </div>
            ) : notifications.map(n => (
              <div
                key={n.id}
                className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50/40' : ''}`}
                onClick={() => { markRead(n.id); if (n.link) window.location.href = n.link; }}
              >
                <span className="text-base shrink-0 mt-0.5">{NOTIF_ICON[n.type] || '💡'}</span>
                <div className="flex-1 min-w-0">
                  <p className={`font-dm text-xs text-[#111111] ${!n.read ? 'font-medium' : ''}`}>{n.message}</p>
                  <p className="font-mono text-xs text-gray-400 mt-0.5">{formatTimeAgo(n.timestamp)}</p>
                </div>
                {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />}
              </div>
            ))}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-[#E0E0E0] bg-gray-50">
              <span className="font-mono text-xs text-gray-400">{notifications.length} notificações · {unread} não lidas</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Layout({ children, clientId: propClientId, isAdmin = false, adminClientName = null, adminBack = false, onAdminBack }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const effectiveClientId = propClientId || user?.clientId;

  return (
    <div className="flex min-h-screen bg-white">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar clientId={propClientId} isAdmin={isAdmin} adminClientName={adminClientName} />
      </div>

      {/* Mobile Sidebar Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0">
            <Sidebar clientId={propClientId} isAdmin={isAdmin} adminClientName={adminClientName} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* TLP Banner + Bell */}
        <div className="flex items-stretch border-b border-[#E0E0E0]">
          <div className="flex-1">
            <TLPBanner />
          </div>
          <div className="flex items-center px-3 bg-[#111111]">
            <NotificationBell effectiveClientId={effectiveClientId} />
          </div>
        </div>

        {/* Admin Banner */}
        {isAdmin && adminClientName && (
          <div className="bg-[#CAFF00] px-6 py-2.5 flex items-center gap-4">
            <span className="text-[#111111] font-dm font-medium text-sm">
              👁 Visualizando como: <strong>{adminClientName}</strong>
            </span>
            {onAdminBack && (
              <button
                onClick={onAdminBack}
                className="text-[#111111] font-dm text-sm underline hover:no-underline"
              >
                ← Voltar ao Painel Admin
              </button>
            )}
          </div>
        )}

        {/* Mobile header */}
        <div className="md:hidden flex items-center px-4 py-3 border-b border-gray-200">
          <button onClick={() => setSidebarOpen(true)} className="p-1 text-gray-600">
            <Menu size={22} />
          </button>
          <span className="ml-3 font-syne font-bold text-[#111111]">OPICE IR</span>
          <div className="ml-auto">
            <NotificationBell effectiveClientId={effectiveClientId} />
          </div>
        </div>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
