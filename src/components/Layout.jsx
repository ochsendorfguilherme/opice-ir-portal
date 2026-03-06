import { useState, useEffect, useRef } from 'react';
import { Menu, Bell, X, CheckCheck, LayoutGrid, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import TLPBanner from './TLPBanner';
import { useAuth } from '../contexts/AuthContext';
import { getStorage, setStorage, KEYS } from '../utils/storage';

const NOTIF_STYLE = {
  critical: { dot: 'bg-[#d45a58]', tone: 'bg-red-50 text-red-700' },
  warning: { dot: 'bg-[#d59b32]', tone: 'bg-amber-50 text-amber-700' },
  crisis: { dot: 'bg-[#173038]', tone: 'bg-[#173038]/10 text-[#173038]' },
  done: { dot: 'bg-[#299166]', tone: 'bg-emerald-50 text-emerald-700' },
  info: { dot: 'bg-[#6f7f86]', tone: 'bg-slate-100 text-slate-700' },
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
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
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
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(21,38,43,0.08)] bg-white/70 text-[#173038] shadow-[0_12px_24px_rgba(21,38,43,0.08)] transition-all hover:-translate-y-0.5 hover:bg-white"
        title="Notificações"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#d45a58] px-1.5 font-mono text-[10px] font-semibold leading-none text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="app-panel absolute right-0 top-full z-50 mt-3 w-[22rem] overflow-hidden rounded-[28px]">
          <div className="app-panel-dark flex items-center justify-between px-4 py-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[rgba(255,253,248,0.72)]">Notificações</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#d6ff63] transition-colors hover:bg-white/5">
                  <CheckCheck size={12} /> Lidas
                </button>
              )}
              <button onClick={() => setOpen(false)} className="rounded-full bg-white/5 p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white">
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="max-h-96 divide-y divide-[rgba(21,38,43,0.08)] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Bell size={26} className="mx-auto mb-3 text-[#7f8b8f]" />
                <p className="font-dm text-sm text-[#68767b]">Nenhuma notificação</p>
              </div>
            ) : notifications.map(n => {
              const style = NOTIF_STYLE[n.type] || NOTIF_STYLE.info;
              return (
                <button
                  key={n.id}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/65 ${!n.read ? 'bg-[#d6ff63]/10' : 'bg-transparent'}`}
                  onClick={() => {
                    markRead(n.id);
                    if (n.link) window.location.href = n.link;
                  }}
                >
                  <span className={`mt-1 h-2.5 w-2.5 rounded-full ${style.dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-dm text-sm text-[#15262b]">{n.message}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${style.tone}`}>{n.type || 'info'}</span>
                      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#7a8589]">{formatTimeAgo(n.timestamp)}</span>
                    </div>
                  </div>
                  {!n.read && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#d6ff63]" />}
                </button>
              );
            })}
          </div>

          {notifications.length > 0 && (
            <div className="border-t border-[rgba(21,38,43,0.08)] bg-white/65 px-4 py-2.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#68767b]">{notifications.length} itens • {unread} não lidas</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Layout({ children, clientId: propClientId, isAdmin = false, adminClientName = null, onAdminBack }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const effectiveClientId = propClientId || user?.clientId;

  return (
    <div className="relative flex min-h-screen bg-transparent text-[#15262b]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(214,255,99,0.12),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(23,48,56,0.08),transparent_30%)]" />

      <div className="hidden md:block">
        <Sidebar clientId={propClientId} isAdmin={isAdmin} adminClientName={adminClientName} />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-[#15262b]/45 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0">
            <Sidebar clientId={propClientId} isAdmin={isAdmin} adminClientName={adminClientName} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="relative flex min-h-screen flex-1 flex-col md:ml-72">
        <div className="shell-topbar sticky top-0 z-20">
          <div className="flex items-stretch border-b border-[rgba(21,38,43,0.08)]">
            <div className="flex-1">
              <TLPBanner />
            </div>
            <div className="flex items-center gap-3 px-4">
              {user?.role === 'admin' && (
                isAdmin && adminClientName ? (
                  <button
                    onClick={onAdminBack}
                    className="flex h-11 items-center gap-2 rounded-full border border-[rgba(21,38,43,0.12)] bg-white/75 px-4 font-dm text-xs font-semibold uppercase tracking-[0.16em] text-[#173038] shadow-[0_12px_24px_rgba(21,38,43,0.08)] transition-all hover:-translate-y-0.5 hover:bg-white"
                  >
                    <ArrowLeft size={15} /> Voltar ao Admin
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/admin')}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-[#173038] text-[#fffdf8] shadow-[0_12px_28px_rgba(15,33,40,0.18)] transition-all hover:-translate-y-0.5 hover:bg-[#0f2128]"
                    title="Painel Admin"
                  >
                    <LayoutGrid size={18} />
                  </button>
                )
              )}
              <NotificationBell effectiveClientId={effectiveClientId} />
            </div>
          </div>
        </div>

        <div className="shell-mobilebar md:hidden">
          <div className="flex items-center px-4 py-3">
            <button onClick={() => setSidebarOpen(true)} className="rounded-full border border-[rgba(21,38,43,0.08)] bg-white/70 p-2 text-[#173038] shadow-[0_10px_22px_rgba(21,38,43,0.08)]">
              <Menu size={20} />
            </button>
            <div className="ml-3">
              <p className="section-kicker">Console de incidente</p>
              <span className="font-syne text-lg font-bold text-[#15262b]">Opice IR</span>
            </div>
            <div className="ml-auto">
              <NotificationBell effectiveClientId={effectiveClientId} />
            </div>
          </div>
        </div>

        <main className="relative flex-1 overflow-auto px-0 pb-8 pt-2 md:px-2">
          {children}
        </main>
      </div>
    </div>
  );
}
