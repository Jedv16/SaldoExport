'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function HistorialPage() {
  const [datos, setDatos] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [detalleAbierto, setDetalleAbierto] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchHistorial = async () => {
    const { data } = await supabase
      .from('periodos_fiscales')
      .select(`
        id, empresa_id, mes, anio, exportacion_fob,
        empresas ( ruc, razon_social ),
        calculos_resultados ( saldo_devolucion, saldo_arrastrable, limite_sfmb, sfe_determinado, pago_cuenta_ir )
      `)
      .order('created_at', { ascending: false });

    if (data) setDatos(data);
  };

  useEffect(() => {
    fetchHistorial();
  }, []);

  const companies = Array.from(
    new Map(
      datos.map((p) => [p.empresa_id, { id: p.empresa_id, name: p.empresas?.razon_social || p.empresa_id }])
    ).values()
  );

  const years = Array.from(new Set(datos.map((p) => p.anio))).sort((a, b) => b - a);

  const handleEliminar = async (periodoId: string) => {
    const confirmar = window.confirm('Seguro que deseas eliminar esta liquidacion?');
    if (!confirmar) return;

    setDeletingId(periodoId);
    try {
      const { error: errResultados } = await supabase
        .from('calculos_resultados')
        .delete()
        .eq('periodo_id', periodoId);

      if (errResultados) throw errResultados;

      const { error: errPeriodo } = await supabase
        .from('periodos_fiscales')
        .delete()
        .eq('id', periodoId);

      if (errPeriodo) throw errPeriodo;

      await fetchHistorial();
    } catch (error) {
      console.error(error);
      alert('No se pudo eliminar la liquidacion.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-[2rem] bg-gradient-to-br from-white via-white to-[#e9f0ff] border border-[#e2e7f0] p-8">
        <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.35em] text-[#0b57d0]">Historial</p>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-[#0b1f3a] tracking-tight">Liquidaciones</h1>
            <p className="text-sm text-[#465166]">Consulta periodos guardados y devoluciones calculadas.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-[#e2e7f0] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <div className="p-4 flex items-center justify-end">
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="p-2 bg-[#f5f7fb] rounded-2xl outline-none border-2 border-transparent focus:border-[#0b57d0] text-sm font-bold"
              >
                <option value="">Todos los años</option>
                {years.map((year) => (
                  <option key={year} value={String(year)}>{year}</option>
                ))}
              </select>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="p-2 bg-[#f5f7fb] rounded-2xl outline-none border-2 border-transparent focus:border-[#0b57d0] text-sm font-bold"
              >
                <option value="">Todas las empresas</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <table className="w-full min-w-[720px] text-left border-collapse">
          <thead>
            <tr className="bg-[#f5f7fb] border-b border-[#e2e7f0]">
              <th className="p-5 text-xs font-black uppercase text-[#6c7690]">Periodo</th>
              <th className="p-5 text-xs font-black uppercase text-[#6c7690]">Empresa</th>
              <th className="p-5 text-xs font-black uppercase text-[#6c7690] text-right">Exp. FOB</th>
              <th className="p-5 text-xs font-black uppercase text-[#6c7690] text-right">Saldo devolucion</th>
              <th className="p-5 text-xs font-black uppercase text-[#6c7690]">Estado</th>
              <th className="p-5 text-xs font-black uppercase text-[#6c7690] text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e7f0]">
            {datos
              .filter((d) => (!selectedCompany || d.empresa_id === selectedCompany) && (!selectedYear || String(d.anio) === selectedYear))
              .map((item) => {
              const detalle = item.calculos_resultados?.[0];
              const abierto = detalleAbierto === item.id;
              return (
                <React.Fragment key={item.id}>
                  <tr className="hover:bg-[#f5f7fb] transition">
                    <td className="p-5 font-semibold text-[#0b1f3a]">{item.mes}-{item.anio}</td>
                    <td className="p-5">
                      <div className="font-bold text-sm text-[#0b1f3a]">{item.empresas?.razon_social}</div>
                      <div className="text-xs text-[#6c7690]">{item.empresas?.ruc}</div>
                    </td>
                    <td className="p-5 text-right font-mono text-sm text-[#0b1f3a]">S/ {item.exportacion_fob.toFixed(2)}</td>
                    <td className="p-5 text-right">
                      <span className="font-black text-[#0b57d0]">
                        S/ {detalle?.saldo_devolucion?.toFixed(2) || '0.00'}
                      </span>
                    </td>
                    <td className="p-5">
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full uppercase">
                        Guardado
                      </span>
                    </td>
                    <td className="p-5 text-right">
                      <button
                        type="button"
                        onClick={() => setDetalleAbierto(abierto ? null : item.id)}
                        className="text-xs font-black text-[#0b57d0]"
                      >
                        {abierto ? 'Ocultar' : 'Ver'} detalle
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEliminar(item.id)}
                        disabled={deletingId === item.id}
                        className="ml-4 text-xs font-black text-red-500 disabled:opacity-50"
                      >
                        {deletingId === item.id ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    </td>
                  </tr>
                  {abierto && (
                    <tr className="bg-[#f5f7fb]">
                      <td colSpan={6} className="p-5">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="bg-white border border-[#e2e7f0] rounded-2xl p-4">
                            <p className="text-[10px] uppercase font-black text-[#6c7690]">SFMB</p>
                            <p className="text-lg font-black text-[#0b1f3a]">S/ {detalle?.sfe_determinado?.toFixed(2) || '0.00'}</p>
                          </div>
                          <div className="bg-white border border-[#e2e7f0] rounded-2xl p-4">
                            <p className="text-[10px] uppercase font-black text-[#6c7690]">Limite</p>
                            <p className="text-lg font-black text-[#0b1f3a]">S/ {detalle?.limite_sfmb?.toFixed(2) || '0.00'}</p>
                          </div>
                          <div className="bg-white border border-[#e2e7f0] rounded-2xl p-4">
                            <p className="text-[10px] uppercase font-black text-[#6c7690]">I.R. mensual</p>
                            <p className="text-lg font-black text-[#0b1f3a]">S/ {detalle?.pago_cuenta_ir?.toFixed(2) || '0.00'}</p>
                          </div>
                          <div className="bg-white border border-[#e2e7f0] rounded-2xl p-4">
                            <p className="text-[10px] uppercase font-black text-[#6c7690]">Arrastre</p>
                            <p className="text-lg font-black text-[#0b1f3a]">S/ {detalle?.saldo_arrastrable?.toFixed(2) || '0.00'}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          </table>
        </div>
        {datos.length === 0 && (
          <div className="p-20 text-center text-[#6c7690]">No hay calculos guardados aun.</div>
        )}
      </div>
    </div>
  );
}