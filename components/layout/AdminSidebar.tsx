'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

type AdminSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const iconBase = 'h-5 w-5';

  const adminMenu = [
    {
      name: 'Panel',
      href: '/admin',
      icon: (
        <svg viewBox="0 0 24 24" className={iconBase} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16v16H4z" />
          <path d="M8 4v16M16 4v16M4 8h16M4 16h16" />
        </svg>
      )
    },
    {
      name: 'Usuarios',
      href: '/admin/usuarios',
      icon: (
        <svg viewBox="0 0 24 24" className={iconBase} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 18c0-2.2 2.5-4 5-4s5 1.8 5 4" />
          <circle cx="12" cy="8" r="3" />
        </svg>
      )
    },
    {
      name: 'Empresas',
      href: '/admin/empresas',
      icon: (
        <svg viewBox="0 0 24 24" className={iconBase} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 20h18" />
          <path d="M5 20V6l7-3 7 3v14" />
          <path d="M9 20v-6h6v6" />
        </svg>
      )
    },
    {
      name: 'Reportes',
      href: '/admin/reportes',
      icon: (
        <svg viewBox="0 0 24 24" className={iconBase} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h6M9 17h6" />
        </svg>
      )
    },
    {
      name: 'Ajustes',
      href: '/admin/ajustes',
      icon: (
        <svg viewBox="0 0 24 24" className={iconBase} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.7l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.7-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.7.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.7 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.7.3h.1a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.7-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.7v.1a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
        </svg>
      )
    },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 ${collapsed ? 'w-24' : 'w-72'} bg-[#0b1f3a] border-r border-[#0b1f3a] flex flex-col h-screen transform transition-all duration-300 lg:static lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      <div className={`p-6 ${collapsed ? 'px-4' : ''}`}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              className="rounded-full border border-white/10 p-2 text-white/70 hover:text-white"
              aria-label="Expandir sidebar"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
            <div className="h-16 w-16 rounded-full border border-white/20 overflow-hidden bg-white/10">
              <img src="/img/logo2.jpeg" alt="SaldoExport" className="h-full w-full object-cover" />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0b1f3a] via-[#0b1f3a] to-[#12305a] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-full border border-white/20 overflow-hidden bg-white/10">
                  <img src="/img/logo2.jpeg" alt="SaldoExport" className="h-full w-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/60">SaldoExport</p>
                  <p className="text-xs font-bold text-white/80">Panel admin</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCollapsed((prev) => !prev)}
                className="ml-auto rounded-full border border-white/10 p-2 text-white/70 hover:text-white"
                aria-label="Reducir sidebar"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 6l-6 6 6 6" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 px-4 space-y-3">
        {!collapsed && (
          <p className="px-2 text-[10px] font-black text-white/50 uppercase tracking-[0.3em]">Administracion</p>
        )}

        {adminMenu.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={`group flex items-center ${collapsed ? 'justify-center px-3' : 'gap-3 px-4'} py-3 rounded-2xl text-sm font-bold transition-all duration-300 ${
              pathname === item.href
                ? 'bg-white text-[#0b1f3a] shadow-lg shadow-black/20'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span
              className={`text-base transition-colors ${
                pathname === item.href ? 'text-[#0b1f3a]' : 'text-white/80 group-hover:text-white'
              }`}
            >
              {item.icon}
            </span>
            {!collapsed && item.name}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleSignOut}
          className={`w-full flex items-center ${collapsed ? 'justify-center px-3' : 'gap-3 px-4'} py-3 rounded-2xl text-sm font-bold text-red-200 hover:bg-white/10 transition`}
        >
          <span className="text-base">
            <svg viewBox="0 0 24 24" className={iconBase} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
          </span>
          {!collapsed && 'Cerrar sesion'}
        </button>
      </div>
    </aside>
  );
}
