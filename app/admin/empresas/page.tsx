"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import ModalNuevaEmpresa from '@/components/ui/ModalNuevaEmpresa';
import { Edit3, Trash2 } from 'lucide-react';

type EmpresaRow = {
  id: string;
  ruc: string;
  razon_social: string;
  created_at: string | null;
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function AdminEmpresasPage() {
  const [companies, setCompanies] = useState<EmpresaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [totalCount, setTotalCount] = useState(0);

  const reloadCompanies = async (targetPage = page) => {
    const from = (targetPage - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data } = await supabase
      .from('empresas')
      .select('id, ruc, razon_social, created_at')
      .order('created_at', { ascending: false })
      .range(from, to);
    setCompanies(data ?? []);
  };


  useEffect(() => {
    let isMounted = true;

    const loadCompanies = async () => {
      setLoading(true);
      setError(null);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, error: loadError, count } = await supabase
        .from('empresas')
        .select('id, ruc, razon_social, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (!isMounted) return;

      if (loadError) {
        setError('No se pudo cargar la lista de empresas.');
        setCompanies([]);
        setTotalCount(0);
      } else {
        setCompanies(data ?? []);
        setTotalCount(count ?? 0);
      }
      setLoading(false);
    };

    loadCompanies();

    return () => {
      isMounted = false;
    };
  }, [page]);

  const handleEditCompany = async (company: EmpresaRow) => {
    const nextName = window.prompt('Razon social', company.razon_social);
    if (nextName === null) return;

    const nextRuc = window.prompt('RUC', company.ruc);
    if (nextRuc === null) return;

    setActionError(null);
    setActionLoadingId(company.id);

    const { error: updateError } = await supabase
      .from('empresas')
      .update({ razon_social: nextName.trim(), ruc: nextRuc.trim() })
      .eq('id', company.id);

    if (updateError) {
      setActionError('No se pudo actualizar la empresa.');
      setActionLoadingId(null);
      return;
    }

    await reloadCompanies();
    setActionLoadingId(null);
  };

  const handleDeleteCompany = async (company: EmpresaRow) => {
    const confirmed = window.confirm(`Eliminar empresa ${company.razon_social}?`);
    if (!confirmed) return;

    setActionError(null);
    setActionLoadingId(company.id);

    const { error: deleteError } = await supabase.from('empresas').delete().eq('id', company.id);
    if (deleteError) {
      setActionError('No se pudo eliminar la empresa.');
      setActionLoadingId(null);
      return;
    }

    await reloadCompanies();
    setActionLoadingId(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <section>
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-600">Administracion</p>
        <h1 className="text-2xl font-black text-[#0b1f3a]">Empresas</h1>
        <p className="text-sm text-[#465166]">Alta, validacion y monitoreo de empresas registradas.</p>
        {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
      </section>

      <div className="rounded-3xl border border-[#e2e7f0] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold text-[#0b1f3a]">Ultimas empresas</p>
            <p className="text-xs text-[#6c7690]">Estado de verificacion y actividad.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="rounded-full bg-[#0b57d0] px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white"
          >
            Registrar empresa
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {loading && <p className="text-sm text-[#6c7690]">Cargando empresas...</p>}
          {!loading && companies.length === 0 && (
            <p className="text-sm text-[#6c7690]">No hay empresas registradas.</p>
          )}
          {actionError && <p className="text-xs font-semibold text-rose-600">{actionError}</p>}
          {companies.map((item) => (
            <div key={item.id} className="rounded-2xl border border-[#edf1f7] bg-[#f7f9ff] px-4 py-4">
              <p className="text-sm font-bold text-[#0b1f3a]">{item.razon_social}</p>
              <p className="text-xs text-[#6c7690]">RUC {item.ruc}</p>
              <span className="mt-3 inline-flex rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">
                {formatDate(item.created_at)}
              </span>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  title="Editar empresa"
                  aria-label={`Editar ${item.razon_social}`}
                  onClick={() => handleEditCompany(item)}
                  disabled={actionLoadingId === item.id}
                  className="rounded-full border border-blue-200 bg-blue-50 p-2 text-blue-700 disabled:opacity-60 flex items-center justify-center"
                >
                  <Edit3 size={16} />
                </button>
                <button
                  type="button"
                  title="Eliminar empresa"
                  aria-label={`Eliminar ${item.razon_social}`}
                  onClick={() => handleDeleteCompany(item)}
                  disabled={actionLoadingId === item.id}
                  className="rounded-full border border-rose-200 bg-rose-50 p-2 text-rose-700 disabled:opacity-60 flex items-center justify-center"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
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
      {showModal && (
        <ModalNuevaEmpresa
          onClose={() => setShowModal(false)}
          onSuccess={async () => {
            await reloadCompanies();
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}
