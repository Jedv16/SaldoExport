"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type PerfilInfo = {
  email: string | null;
  nombre_completo: string | null;
  rol: string | null;
  updated_at: string | null;
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function AdminAjustesPage() {
  const [perfil, setPerfil] = useState<PerfilInfo | null>(null);
  const [stats, setStats] = useState<{ users: number; companies: number }>({ users: 0, companies: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      setLoading(true);
      setError(null);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        if (isMounted) {
          setError('No se pudo obtener el usuario autenticado.');
          setLoading(false);
        }
        return;
      }

      const [perfilRes, usersCount, companiesCount] = await Promise.all([
        supabase.from('perfiles').select('email, nombre_completo, rol, updated_at').eq('id', authData.user.id).single(),
        supabase.from('perfiles').select('*', { count: 'exact', head: true }),
        supabase.from('empresas').select('*', { count: 'exact', head: true }),
      ]);

      if (!isMounted) return;

      if (perfilRes.error) {
        setError('No se pudo cargar el perfil del administrador.');
      }

      setPerfil(perfilRes.data ?? null);
      setStats({ users: usersCount.count ?? 0, companies: companiesCount.count ?? 0 });
      setLoading(false);
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-600">Administracion</p>
        <h1 className="text-2xl font-black text-[#0b1f3a]">Ajustes del sistema</h1>
        <p className="text-sm text-[#465166]">Parametros globales y politicas de seguridad.</p>
        {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-[#e2e7f0] bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-[#0b1f3a]">Perfil administrador</p>
          <p className="text-xs text-[#6c7690]">Datos del usuario autenticado.</p>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-[#edf1f7] bg-[#f7f9ff] px-4 py-3">
              <p className="text-sm font-semibold text-[#0b1f3a]">Correo</p>
              <p className="text-xs text-[#6c7690]">{perfil?.email ?? (loading ? 'Cargando...' : 'Sin correo')}</p>
            </div>
            <div className="rounded-2xl border border-[#edf1f7] bg-[#f7f9ff] px-4 py-3">
              <p className="text-sm font-semibold text-[#0b1f3a]">Nombre</p>
              <p className="text-xs text-[#6c7690]">{perfil?.nombre_completo ?? (loading ? 'Cargando...' : 'Sin nombre')}</p>
            </div>
            <div className="rounded-2xl border border-[#edf1f7] bg-[#f7f9ff] px-4 py-3">
              <p className="text-sm font-semibold text-[#0b1f3a]">Rol</p>
              <p className="text-xs text-[#6c7690]">{perfil?.rol ?? (loading ? 'Cargando...' : 'Sin rol')}</p>
            </div>
            <div className="rounded-2xl border border-[#edf1f7] bg-[#f7f9ff] px-4 py-3">
              <p className="text-sm font-semibold text-[#0b1f3a]">Actualizado</p>
              <p className="text-xs text-[#6c7690]">{perfil ? formatDate(perfil.updated_at) : loading ? 'Cargando...' : 'Sin fecha'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-[#e2e7f0] bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-[#0b1f3a]">Resumen del sistema</p>
          <p className="text-xs text-[#6c7690]">Contadores generales de operacion.</p>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-[#edf1f7] bg-[#f7f9ff] px-4 py-3">
              <p className="text-sm font-semibold text-[#0b1f3a]">Usuarios registrados</p>
              <p className="text-xs text-[#6c7690]">{loading ? 'Cargando...' : stats.users}</p>
            </div>
            <div className="rounded-2xl border border-[#edf1f7] bg-[#f7f9ff] px-4 py-3">
              <p className="text-sm font-semibold text-[#0b1f3a]">Empresas registradas</p>
              <p className="text-xs text-[#6c7690]">{loading ? 'Cargando...' : stats.companies}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
