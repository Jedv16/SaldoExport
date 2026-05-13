"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Metric = {
  label: string;
  value: string;
  note: string;
};

type ActivityItem = {
  title: string;
  detail: string;
  time: string;
  sortKey: number;
};

type PendingItem = {
  title: string;
  detail: string;
};

const quickActions = [
  { title: 'Crear usuario', description: 'Alta rapida con rol y permisos', href: '/auth/registro' },
  { title: 'Registrar empresa', description: 'Vincular razon social y RUC', href: '/admin/empresas' },
  { title: 'Generar reporte', description: 'Exportar PDF o Excel', href: '/admin/reportes' },
  { title: 'Revisar alertas', description: 'Pendientes de validacion', href: '/admin/empresas' },
];

const systemHealth = [
  { label: 'Base de datos', status: 'Operativa', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { label: 'Autenticacion', status: 'Operativa', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { label: 'Procesos batch', status: 'Operativa', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { label: 'Integraciones', status: 'Revisar', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
];

const formatDate = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
};

export default function AdminPage() {
  const [metrics, setMetrics] = useState<Metric[]>([
    { label: 'Usuarios registrados', value: '0', note: 'Total' },
    { label: 'Empresas registradas', value: '0', note: 'Total' },
    { label: 'Periodos fiscales', value: '0', note: 'Total' },
    { label: 'Simulaciones', value: '0', note: 'Total' },
  ]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [
        usersCount,
        companiesCount,
        periodsCount,
        simulationsCount,
        recentUsers,
        recentCompanies,
        recentPeriods,
      ] = await Promise.all([
        supabase.from('perfiles').select('*', { count: 'exact', head: true }),
        supabase.from('empresas').select('*', { count: 'exact', head: true }),
        supabase.from('periodos_fiscales').select('*', { count: 'exact', head: true }),
        supabase.from('simulaciones').select('*', { count: 'exact', head: true }),
        supabase.from('perfiles').select('email, rol, updated_at').order('updated_at', { ascending: false }).limit(4),
        supabase.from('empresas').select('razon_social, ruc, created_at').order('created_at', { ascending: false }).limit(4),
        supabase.from('periodos_fiscales').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
      ]);

      if (!isMounted) return;

      if (usersCount.error || companiesCount.error || periodsCount.error || simulationsCount.error) {
        setError('No se pudo cargar el resumen del panel.');
      }

      const nextMetrics: Metric[] = [
        { label: 'Usuarios registrados', value: String(usersCount.count ?? 0), note: 'Total' },
        { label: 'Empresas registradas', value: String(companiesCount.count ?? 0), note: 'Total' },
        { label: 'Periodos fiscales', value: String(periodsCount.count ?? 0), note: 'Total' },
        { label: 'Simulaciones', value: String(simulationsCount.count ?? 0), note: 'Total' },
      ];
      setMetrics(nextMetrics);

      const activity: ActivityItem[] = [];
      (recentUsers.data ?? []).forEach((user) => {
        const sortKey = user.updated_at ? new Date(user.updated_at).getTime() : 0;
        activity.push({
          title: 'Nuevo usuario',
          detail: `${user.email ?? 'Sin correo'} · ${user.rol ?? 'user'}`,
          time: formatDate(user.updated_at),
          sortKey,
        });
      });
      (recentCompanies.data ?? []).forEach((company) => {
        const sortKey = company.created_at ? new Date(company.created_at).getTime() : 0;
        activity.push({
          title: 'Empresa registrada',
          detail: `${company.razon_social ?? 'Sin razon social'} · RUC ${company.ruc ?? '--'}`,
          time: formatDate(company.created_at),
          sortKey,
        });
      });
      activity.sort((a, b) => b.sortKey - a.sortKey);
      setRecentActivity(activity.slice(0, 6));

      const pendingCompanies = await supabase
        .from('empresas')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo);

      const pendingUsers = await supabase
        .from('perfiles')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', weekAgo);

      const pendingPeriods = recentPeriods.count ?? 0;

      setPendingItems([
        {
          title: `Empresas nuevas: ${pendingCompanies.count ?? 0}`,
          detail: 'Revisar registros creados en los ultimos 7 dias',
        },
        {
          title: `Usuarios nuevos: ${pendingUsers.count ?? 0}`,
          detail: 'Altas recientes pendientes de validacion',
        },
        {
          title: `Periodos nuevos: ${pendingPeriods}`,
          detail: 'Movimientos fiscales registrados esta semana',
        },
      ]);

      setLoading(false);
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-600">Administracion general</p>
        <h1 className="text-2xl font-black text-[#0b1f3a]">Panel admin</h1>
        <p className="text-sm text-[#465166]">Control centralizado de usuarios, empresas, reportes y configuracion.</p>
        {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-3xl border border-[#e2e7f0] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold text-[#6c7690]">{metric.label}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-2xl font-black text-[#0b1f3a]">{loading ? '...' : metric.value}</span>
              <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">
                {metric.note}
              </span>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-3xl border border-[#e2e7f0] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#6c7690]">Acciones rapidas</p>
              <h2 className="text-lg font-black text-[#0b1f3a]">Tareas de hoy</h2>
            </div>
            <span className="text-xs font-bold text-[#6c7690]">Actualizado hace 5 min</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="group text-left rounded-2xl border border-[#e2e7f0] bg-[#f7f9ff] px-4 py-4 transition hover:-translate-y-1 hover:border-blue-200 hover:bg-white"
              >
                <p className="text-sm font-bold text-[#0b1f3a]">{action.title}</p>
                <p className="mt-1 text-xs text-[#6c7690]">{action.description}</p>
                <span className="mt-3 inline-flex items-center text-[11px] font-black uppercase tracking-[0.2em] text-blue-600">
                  Ejecutar
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[#e2e7f0] bg-white p-6 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#6c7690]">Salud del sistema</p>
          <h2 className="text-lg font-black text-[#0b1f3a]">Estado general</h2>
          <div className="mt-4 space-y-3">
            {systemHealth.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-2xl border border-[#edf1f7] bg-[#f7f9ff] px-4 py-3">
                <span className="text-sm font-semibold text-[#0b1f3a]">{item.label}</span>
                <span className={`rounded-full border px-2 py-1 text-[11px] font-bold ${item.badge}`}>{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-[#e2e7f0] bg-white p-6 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#6c7690]">Actividad reciente</p>
          <h2 className="text-lg font-black text-[#0b1f3a]">Ultimos eventos</h2>
          <div className="mt-4 space-y-4">
            {recentActivity.map((item, index) => (
              <div key={`${item.title}-${item.sortKey}-${index}`} className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-[#0b1f3a]">{item.title}</p>
                  <p className="text-xs text-[#6c7690]">{item.detail}</p>
                </div>
                <span className="text-[11px] font-bold text-[#6c7690]">{item.time}</span>
              </div>
            ))}
            {!recentActivity.length && !loading && (
              <p className="text-xs text-[#6c7690]">Sin actividad reciente.</p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-[#e2e7f0] bg-white p-6 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#6c7690]">Pendientes</p>
          <h2 className="text-lg font-black text-[#0b1f3a]">Validaciones abiertas</h2>
          <div className="mt-4 space-y-3">
            {pendingItems.map((item) => (
              <div key={item.title} className="rounded-2xl border border-[#edf1f7] bg-[#f7f9ff] px-4 py-3">
                <p className="text-sm font-bold text-[#0b1f3a]">{item.title}</p>
                <p className="text-xs text-[#6c7690]">{item.detail}</p>
              </div>
            ))}
            {!pendingItems.length && !loading && (
              <p className="text-xs text-[#6c7690]">Sin pendientes registrados.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
