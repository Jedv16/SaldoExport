'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminSidebar from '@/components/layout/AdminSidebar';
import Navbar from '@/components/layout/Navbar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data } = await supabase.from('perfiles').select('rol').eq('id', user.id).single();
      if (!data || data.rol !== 'admin') {
        router.push('/dashboard/empresas');
        return;
      }

      setLoading(false);
    };

    checkAccess();
  }, [router]);

  if (loading) return <div className="h-screen flex items-center justify-center text-slate-500">Cargando panel admin...</div>;

  return (
    <div className="flex h-screen bg-[#f5f7fb]">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Cerrar menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
        />
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} sectionLabel="Admin" pageTitle="Panel de control" />
        <main className="flex-1 overflow-y-auto px-6 pt-6 pb-0 fade-in flex flex-col">
          {children}
          <div className="mt-auto pt-10">
            <footer className="w-[calc(100%+3rem)] border-t border-[#e2e7f0] bg-white px-6 py-5 -mx-6">
              <div className="w-full flex flex-col gap-4 text-sm text-[#465166] md:flex-row md:items-center md:justify-between">
                <div className="font-black text-[#0b1f3a]">SaldoExport</div>
                <div className="text-center">
                  <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#6c7690]">Autores</p>
                  <p className="font-semibold text-[#0b1f3a]">Dr. CPC. Giuliana Vilma Millones Orrego de Gastelo</p>
                  <p className="font-semibold text-[#0b1f3a]">MA. Ing. Roberto Carlos Arteaga Lora</p>
                  <p className="font-semibold text-[#0b1f3a]">Jose Eduardo Damian Vidaurre</p>
                </div>
                <div className="text-right text-xs font-bold text-[#6c7690]">
                  <span>&copy; {currentYear} Todos los derechos reservados</span>
                </div>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
