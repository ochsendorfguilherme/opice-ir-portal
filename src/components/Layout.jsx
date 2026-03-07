import { useState, useEffect, useRef, useCallback } from 'react';
import { Menu, Bell, X, CheckCheck, LayoutGrid, ArrowLeft, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import TLPBanner from './TLPBanner';
import { useAuth } from '../contexts/AuthContext';
import { getStorage, setStorage, KEYS } from '../utils/storage';
import { isValidInternalPath } from '../utils/authSecurity';

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
  if (d > 0) return `${d}d atr\u00e1s`;
  if (h > 0) return `${h}h atr\u00e1s`;
  if (m > 0) return `${m}m atr\u00e1s`;
  return 'agora';
}

function NotificationBell({ effectiveClientId, adminPathPrefix = '', navigateTo }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(() => (effectiveClientId ? getStorage(KEYS.notifications(effectiveClientId), []) : []));
  const ref = useRef(null);

  const load = useCallback(() => {
    if (!effectiveClientId) return;
    setNotifications(getStorage(KEYS.notifications(effectiveClientId), []));
  }, [effectiveClientId]);

  useEffect(() => {
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const unread = notifications.filter(n => !n.read).length;

  const resolveLink = (link) => {
    if (!isValidInternalPath(link)) return null;
    if (adminPathPrefix && link.startsWith('/') && !link.startsWith('/admin/')) return `${adminPathPrefix}${link}`;
    return link;
  };

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
        title={"Notifica\u00e7\u00f5es"}
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
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[rgba(255,253,248,0.72)]">{"Notifica\u00e7\u00f5es"}</span>
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
                <p className="font-dm text-sm text-[#68767b]">{"Nenhuma notifica\u00e7\u00e3o"}</p>
              </div>
            ) : notifications.map(n => {
              const style = NOTIF_STYLE[n.type] || NOTIF_STYLE.info;
              return (
                <button
                  key={n.id}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/65 ${!n.read ? 'bg-[#d6ff63]/10' : 'bg-transparent'}`}
                  onClick={() => {
                    markRead(n.id);
                    const target = resolveLink(n.link);
                    if (target && navigateTo) navigateTo(target);
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
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#68767b]">{notifications.length} itens {"\u2022"} {unread} {"n\u00e3o lidas"}</span>
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
    <div className="relative flex min-h-screen overflow-x-hidden bg-transparent text-[#15262b]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(214,255,99,0.14),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(23,48,56,0.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.06),transparent_32%)]" />

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
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[240px] bg-[radial-gradient(circle_at_top_center,rgba(214,255,99,0.16),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.22),transparent_100%)]" />
        <div className="sticky top-3 z-20 hidden px-3 pt-3 md:block md:px-5">
          <div className="shell-topbar mx-auto flex w-full max-w-[1760px] items-center gap-4 rounded-[30px] border border-[rgba(21,38,43,0.08)] px-4 py-3 shadow-[0_18px_36px_rgba(21,38,43,0.08)] md:px-5">
            <div className="min-w-0 flex-1">
              <TLPBanner />
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {user?.role === 'admin' && (
                <>
                  {isAdmin && adminClientName ? (
                    <button
                      onClick={onAdminBack}
                      className="flex h-11 items-center gap-2 rounded-full border border-[rgba(21,38,43,0.12)] bg-white/78 px-4 font-dm text-xs font-semibold uppercase tracking-[0.16em] text-[#173038] shadow-[0_12px_24px_rgba(21,38,43,0.08)] transition-all hover:-translate-y-0.5 hover:bg-white"
                    >
                      <ArrowLeft size={15} /> Voltar ao Admin
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/admin/modulos')}
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-[#173038] text-[#fffdf8] shadow-[0_12px_28px_rgba(15,33,40,0.18)] transition-all hover:-translate-y-0.5 hover:bg-[#0f2128]"
                      title="Painel Admin"
                    >
                      <LayoutGrid size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => navigate('/admin/acessos')}
                    className="flex h-11 items-center gap-2 rounded-full border border-[rgba(21,38,43,0.12)] bg-white/78 px-4 font-dm text-xs font-semibold uppercase tracking-[0.16em] text-[#173038] shadow-[0_12px_24px_rgba(21,38,43,0.08)] transition-all hover:-translate-y-0.5 hover:bg-white"
                    title={"Gest\u00e3o de acessos"}
                  >
                    <Users size={15} /> Acessos
                  </button>
                </>
              )}
              <NotificationBell key={effectiveClientId || 'desktop'} effectiveClientId={effectiveClientId} adminPathPrefix={user?.role === 'admin' && effectiveClientId ? `/admin/cliente/${effectiveClientId}` : ''} navigateTo={navigate} />
            </div>
          </div>
        </div>

        <div className="shell-mobilebar px-3 pt-3 md:hidden">
          <div className="mx-auto w-full max-w-[1760px] space-y-3">
            <div className="rounded-[24px] border border-[rgba(21,38,43,0.08)] bg-[rgba(255,251,244,0.84)] px-3 py-2.5 shadow-[0_14px_30px_rgba(21,38,43,0.08)]">
              <TLPBanner />
            </div>

            <div className="rounded-[26px] border border-[rgba(21,38,43,0.08)] bg-[rgba(255,251,244,0.82)] px-4 py-3 shadow-[0_14px_30px_rgba(21,38,43,0.08)]">
              <div className="flex items-center gap-3">
                <button onClick={() => setSidebarOpen(true)} className="rounded-full border border-[rgba(21,38,43,0.08)] bg-white/70 p-2 text-[#173038] shadow-[0_10px_22px_rgba(21,38,43,0.08)]">
                  <Menu size={20} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="section-kicker">Console de incidente</p>
                  <span className="font-syne text-lg font-bold text-[#15262b]">Opice IR</span>
                </div>
                <NotificationBell key={`${effectiveClientId || 'mobile'}-mobile`} effectiveClientId={effectiveClientId} adminPathPrefix={user?.role === 'admin' && effectiveClientId ? `/admin/cliente/${effectiveClientId}` : ''} navigateTo={navigate} />
              </div>

              {user?.role === 'admin' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {isAdmin && adminClientName ? (
                    <button
                      onClick={onAdminBack}
                      className="flex h-10 items-center gap-2 rounded-full border border-[rgba(21,38,43,0.12)] bg-white/78 px-3.5 font-dm text-[11px] font-semibold uppercase tracking-[0.14em] text-[#173038]"
                    >
                      <ArrowLeft size={14} /> Voltar ao Admin
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/admin/modulos')}
                      className="flex h-10 items-center gap-2 rounded-full bg-[#173038] px-3.5 font-dm text-[11px] font-semibold uppercase tracking-[0.14em] text-[#fffdf8]"
                    >
                      <LayoutGrid size={14} /> Painel Admin
                    </button>
                  )}
                  <button
                    onClick={() => navigate('/admin/acessos')}
                    className="flex h-10 items-center gap-2 rounded-full border border-[rgba(21,38,43,0.12)] bg-white/78 px-3.5 font-dm text-[11px] font-semibold uppercase tracking-[0.14em] text-[#173038]"
                  >
                    <Users size={14} /> Acessos
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <main className="relative flex-1 overflow-auto overflow-x-hidden px-3 pb-28 pt-4 md:px-5 md:pb-16">
          <div className="mx-auto w-full max-w-[1760px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
