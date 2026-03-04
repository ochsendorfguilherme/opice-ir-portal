import { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import TLPBanner from './TLPBanner';

export default function Layout({ children, clientId, isAdmin = false, adminClientName = null, adminBack = false, onAdminBack }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-white">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar clientId={clientId} isAdmin={isAdmin} adminClientName={adminClientName} />
      </div>

      {/* Mobile Sidebar Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0">
            <Sidebar clientId={clientId} isAdmin={isAdmin} adminClientName={adminClientName} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <TLPBanner />

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
        </div>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
