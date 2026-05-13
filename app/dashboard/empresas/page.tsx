'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import ModalNuevaEmpresa from '@/components/ui/ModalNuevaEmpresa';
import { Edit3, Trash2 } from 'lucide-react';

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [totalCount, setTotalCount] = useState(0);

  const fetchEmpresas = async (targetPage = page) => {
    setLoading(true);
    setError(null);
    const from = (targetPage - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error: loadError, count } = await supabase
      .from('empresas')
      .select('*', { count: 'exact' })
      .order('razon_social')
      .range(from, to);

    if (loadError) {
      setError('No se pudo cargar las empresas.');
      setEmpresas([]);
      setTotalCount(0);
    } else {
      setEmpresas(data ?? []);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
  };

  const handleEditCompany = async (company: any) => {
    const nextName = window.prompt('Razon social', company.razon_social);
    if (nextName === null) return;
    const nextRuc = window.prompt('RUC', company.ruc);
    if (nextRuc === null) return;

    const { error } = await supabase
      .from('empresas')
      .update({ razon_social: nextName.trim(), ruc: nextRuc.trim() })
      .eq('id', company.id);

    if (error) return alert('No se pudo actualizar la empresa.');
    await fetchEmpresas();
  };

  const handleDeleteCompany = async (company: any) => {
    const confirmed = window.confirm(`Eliminar empresa ${company.razon_social}?`);
    if (!confirmed) return;

    const { error } = await supabase.from('empresas').delete().eq('id', company.id);
    if (error) return alert('No se pudo eliminar la empresa.');
    await fetchEmpresas();
  };

  useEffect(() => {
    fetchEmpresas();
  }, [page]);

  return (
    <div className="space-y-8">
      <div className="rounded-[2rem] bg-gradient-to-br from-white via-white to-[#e9f0ff] border border-[#e2e7f0] p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-[#0b57d0]">Directorio</p>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-[#0b1f3a] tracking-tight">Empresas</h1>
              <p className="text-sm text-[#465166]">Directorio de contribuyentes registrados.</p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 rounded-2xl bg-[#0b1f3a] text-white text-xs font-black uppercase tracking-[0.25em] shadow-lg shadow-[#0b1f3a]/20 hover:bg-[#0a1930] transition"
          >
            Nueva empresa
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading && <div className="text-sm text-[#6c7690]">Cargando empresas...</div>}
        {!loading && empresas.length === 0 && <div className="text-sm text-[#6c7690]">No hay empresas registradas.</div>}
        {empresas.map((emp) => (
          <div
            key={emp.id}
            className="bg-white p-6 rounded-[2rem] border border-[#e2e7f0] flex justify-between items-center group hover:border-[#0b57d0] transition-all"
          >
            <div>
              <p className="text-[10px] font-black text-[#0b57d0] mb-1">{emp.ruc}</p>
              <h3 className="font-bold text-[#0b1f3a] uppercase">{emp.razon_social}</h3>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
              <button title="Editar" onClick={() => handleEditCompany(emp)} className="p-2 rounded-full bg-blue-50 text-blue-700">
                <Edit3 size={16} />
              </button>
              <button title="Eliminar" onClick={() => handleDeleteCompany(emp)} className="p-2 rounded-full bg-rose-50 text-rose-700">
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

      {showModal && (
        <ModalNuevaEmpresa
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            fetchEmpresas();
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}