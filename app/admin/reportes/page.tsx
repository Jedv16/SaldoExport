"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type ReportRow = {
  id: string;
  mes: number;
  anio: number;
  usuario_id: string | null;
  created_at: string | null;
  empresas?: { razon_social?: string | null }[] | null;
};

type UserRow = {
  id: string;
  nombre_completo: string | null;
  email: string | null;
};

const formatPeriod = (mes: number, anio: number) => {
  const month = String(mes).padStart(2, '0');
  return `${month}/${anio}`;
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
};

export default function AdminReportesPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [usersById, setUsersById] = useState<Record<string, UserRow>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadReports = async () => {
      setLoading(true);
      setError(null);

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error: loadError, count } = await supabase
        .from('periodos_fiscales')
        .select('id, mes, anio, usuario_id, created_at, empresas(razon_social)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (!isMounted) return;

      if (loadError) {
        setError('No se pudo cargar la lista de reportes.');
        setReports([]);
        setUsersById({});
        setTotalCount(0);
      } else {
        setReports(data ?? []);
        setTotalCount(count ?? 0);

        const userIds = Array.from(
          new Set((data ?? []).map((row) => row.usuario_id).filter((value): value is string => Boolean(value)))
        );

        if (userIds.length > 0) {
          const { data: perfiles } = await supabase
            .from('perfiles')
            .select('id, nombre_completo, email')
            .in('id', userIds);

          if (isMounted) {
            const nextUsers: Record<string, UserRow> = {};
            (perfiles ?? []).forEach((user) => {
              nextUsers[user.id] = user as UserRow;
            });
            setUsersById(nextUsers);
          }
        } else {
          setUsersById({});
        }
      }
      setLoading(false);
    };

    loadReports();

    return () => {
      isMounted = false;
    };
  }, [page]);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-600">Administracion</p>
        <h1 className="text-2xl font-black text-[#0b1f3a]">Reportes</h1>
        <p className="text-sm text-[#465166]">Feed de acciones generadas por todos los usuarios.</p>
        {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
      </section>

      <div className="rounded-3xl border border-[#e2e7f0] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold text-[#0b1f3a]">Acciones recientes</p>
            <p className="text-xs text-[#6c7690]">Solo los registros generados.</p>
          </div>
          <span className="rounded-full bg-[#0b57d0]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#0b57d0]">
            Todos los usuarios
          </span>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-[#edf1f7]">
          <div className="grid grid-cols-4 gap-2 bg-[#f7f9ff] px-4 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-[#6c7690]">
            <span>Reporte</span>
            <span>Usuario</span>
            <span>Periodo</span>
            <span>Fecha</span>
          </div>
          {loading && (
            <div className="px-4 py-6 text-sm text-[#6c7690]">Cargando reportes...</div>
          )}
          {!loading && reports.length === 0 && (
            <div className="px-4 py-6 text-sm text-[#6c7690]">No hay reportes registrados.</div>
          )}
          {reports.map((row) => (
            <div key={row.id} className="grid grid-cols-4 gap-2 border-t border-[#edf1f7] px-4 py-3 text-sm">
              <span className="font-semibold text-[#0b1f3a]">{row.empresas?.[0]?.razon_social ?? 'Periodo fiscal'}</span>
              <span className="text-[#465166]">
                {usersById[row.usuario_id ?? '']?.nombre_completo || usersById[row.usuario_id ?? '']?.email || 'Sin usuario'}
              </span>
              <span className="text-[#465166]">{formatPeriod(row.mes, row.anio)}</span>
              <span className="text-[#465166]">Generado ({formatDate(row.created_at)})</span>
            </div>
          ))}
        </div>
        {/* Paginación */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-[#6c7690]">
            Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalCount)} de {totalCount}
          </div>
          <div className="inline-flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded-xl border bg-white disabled:opacity-50"
            >
              Anterior
            </button>
            <div className="inline-flex items-center gap-1">
              {Array.from({ length: Math.max(1, Math.ceil(totalCount / pageSize)) }).map((_, i) => {
                const pageNumber = i + 1;
                return (
                  <button
                    key={pageNumber}
                    onClick={() => setPage(pageNumber)}
                    className={`px-3 py-1 rounded-xl ${pageNumber === page ? 'bg-[#0b57d0] text-white' : 'bg-white'}`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * pageSize >= totalCount}
              className="px-3 py-1 rounded-xl border bg-white disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
