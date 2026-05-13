
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type NavbarProps = {
  onToggleSidebar: () => void;
  sectionLabel?: string;
  pageTitle?: string;
};

export default function Navbar({
  onToggleSidebar,
  sectionLabel = 'Dashboard',
  pageTitle = 'Resumen fiscal',
}: NavbarProps) {
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email || null);
    };
    getUser();
  }, []);

  return (
    <header className="h-20 bg-gradient-to-r from-white via-white to-[#e9f0ff] border-b border-[#e2e7f0] flex items-center justify-between px-6 lg:px-10">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Abrir menu"
          onClick={onToggleSidebar}
          className="lg:hidden inline-flex items-center justify-center h-10 w-10 rounded-2xl border border-[#e2e7f0] bg-white text-[#0b1f3a] shadow-sm"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h12" />
          </svg>
        </button>
        <span className="text-[10px] font-black uppercase tracking-[0.35em] text-blue-600">{sectionLabel}</span>
        <span className="text-zinc-300">/</span>
        <span className="text-sm font-semibold text-[#0b1f3a]">{pageTitle}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 rounded-full bg-white border border-[#e2e7f0] px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-[#465166]">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          En linea
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-[#0b1f3a] leading-none">{userEmail}</p>
          <span className="text-[10px] text-[#6c7690] font-bold uppercase">Usuario activo</span>
        </div>
        <div className="h-10 w-10 rounded-full bg-[#e7f0ff] border border-[#c7d7ff] flex items-center justify-center text-[#0b57d0] font-black text-xs">
          {userEmail?.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}