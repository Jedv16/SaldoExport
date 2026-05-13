'use client';
import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { calcularSFMB } from '@/lib/calculos';

type SimData = {
  adquisiciones: { concepto: string; monto: number }[];
  ventaNac: number;
  exportFob: number;
  coeficiente: number;
  incluyeIGV: boolean;
};

const formatMoney = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '0.00';
  return value.toFixed(2);
};

export default function SimulacionPage() {
  const [escenarioNombre, setEscenarioNombre] = useState('Nueva simulacion');
  const [data, setData] = useState<SimData>({
    adquisiciones: [{ concepto: '', monto: 0 }],
    ventaNac: 0,
    exportFob: 0,
    coeficiente: 0,
    incluyeIGV: false,
  });
  const [resultados, setResultados] = useState<any>(null);

  const totalAdquisiciones = data.adquisiciones.reduce((acc, item) => acc + (Number(item.monto) || 0), 0);
  const comprasBase = data.incluyeIGV ? totalAdquisiciones / 1.18 : totalAdquisiciones;
  const ventasBase = data.incluyeIGV ? data.ventaNac / 1.18 : data.ventaNac;
  const creditoFiscal = comprasBase * 0.18;
  const debitoFiscal = ventasBase * 0.18;
  const totalVentasBase = ventasBase + data.exportFob;
  const limiteManual = data.exportFob * 0.18;
  const sfmbManual = creditoFiscal - debitoFiscal;
  const impuestoRentaMensual = totalVentasBase * (data.coeficiente / 100);
  const saldoNoCompensable = sfmbManual - impuestoRentaMensual;
  const saldoArrastrePeriodo = Math.max(0, saldoNoCompensable - limiteManual);
  const saldoArrastreTotal = saldoArrastrePeriodo;

  useEffect(() => {
    const res = calcularSFMB({
      comprasBase,
      ventasNacionalesBase: ventasBase,
      exportacionesFob: data.exportFob,
      coeficienteIR: data.coeficiente / 100,
      saldoAnterior: 0,
    });
    setResultados(res);
  }, [comprasBase, ventasBase, data.exportFob, data.coeficiente]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="rounded-[2rem] bg-gradient-to-br from-white via-white to-[#e9f0ff] border border-[#e2e7f0] p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-blue-600">Simulacion</p>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-[#0b1f3a] tracking-tight">Laboratorio de escenarios</h1>
              <p className="text-sm text-[#465166]">Calcula escenarios sin registrar periodos reales.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="inline-flex rounded-2xl bg-white border border-[#e2e7f0] p-1">
              <button
                type="button"
                onClick={() => setData((prev) => ({ ...prev, incluyeIGV: true }))}
                className={`px-4 py-2 text-xs font-black rounded-xl transition ${
                  data.incluyeIGV ? 'bg-[#0b57d0] text-white shadow-sm' : 'text-[#465166]'
                }`}
              >
                Incluye IGV
              </button>
              <button
                type="button"
                onClick={() => setData((prev) => ({ ...prev, incluyeIGV: false }))}
                className={`px-4 py-2 text-xs font-black rounded-xl transition ${
                  !data.incluyeIGV ? 'bg-[#0b57d0] text-white shadow-sm' : 'text-[#465166]'
                }`}
              >
                Bases netas
              </button>
            </div>
            <input
              type="text"
              value={escenarioNombre}
              onChange={(e) => setEscenarioNombre(e.target.value)}
              className="bg-white border border-[#e2e7f0] px-4 py-2 rounded-2xl text-sm font-bold text-[#0b1f3a] outline-none focus:border-[#0b57d0]"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white p-8 rounded-[2rem] border border-[#e2e7f0]">
            <div className="flex items-start justify-between gap-4 mb-8">
              <div>
                <h2 className="text-sm font-black uppercase tracking-[0.25em] text-blue-600">Movimientos del mes</h2>
                <p className="text-xs text-[#465166] mt-2">Ingresa montos para proyectar el SFMB.</p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#6c7690]">Simulacion</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3 md:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[10px] font-black text-[#6c7690] uppercase ml-1">Total IGV adquisiciones</label>
                    <p className="text-[11px] text-[#6c7690]">Compras y gastos con IGV</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setData((prev) => ({ ...prev, adquisiciones: [...prev.adquisiciones, { concepto: '', monto: 0 }] }))}
                    className="text-[10px] font-black uppercase tracking-[0.25em] text-[#0b57d0]"
                  >
                    Agregar fila
                  </button>
                </div>

                <div className="space-y-3">
                  {data.adquisiciones.map((item, index) => (
                    <div key={`sim-adq-${index}`} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                      <input
                        type="text"
                        placeholder="Concepto"
                        className="md:col-span-7 w-full p-4 bg-[#f5f7fb] rounded-2xl outline-none border-2 border-transparent focus:border-[#0b57d0] font-semibold"
                        value={item.concepto}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            adquisiciones: prev.adquisiciones.map((row, idx) =>
                              idx === index ? { ...row, concepto: e.target.value } : row
                            ),
                          }))
                        }
                      />
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="0.00"
                        className="md:col-span-4 w-full p-4 bg-[#f5f7fb] rounded-2xl outline-none border-2 border-transparent focus:border-[#0b57d0] font-bold text-right"
                        value={item.monto}
                        onChange={(e) =>
                          setData((prev) => ({
                            ...prev,
                            adquisiciones: prev.adquisiciones.map((row, idx) =>
                              idx === index ? { ...row, monto: Number(e.target.value) } : row
                            ),
                          }))
                        }
                      />
                      <div className="md:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setData((prev) => {
                              if (prev.adquisiciones.length === 1) {
                                return { ...prev, adquisiciones: [{ concepto: '', monto: 0 }] };
                              }
                              return { ...prev, adquisiciones: prev.adquisiciones.filter((_, i) => i !== index) };
                            });
                          }}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition"
                          title="Eliminar fila"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs font-black text-[#0b1f3a] bg-[#f5f7fb] rounded-2xl px-4 py-3">
                  <span>Total IGV adquisiciones</span>
                  <span>S/ {formatMoney(creditoFiscal)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-[#6c7690] uppercase ml-1">Ventas nacionales</label>
                <input
                  type="number"
                  inputMode="decimal"
                  className="w-full p-4 bg-[#f5f7fb] rounded-2xl outline-none border-2 border-transparent focus:border-[#0b57d0] font-bold"
                  value={data.ventaNac}
                  onChange={(e) => setData((prev) => ({ ...prev, ventaNac: Number(e.target.value) }))}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-[#6c7690] uppercase ml-1">Exportaciones (FOB)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  className="w-full p-4 bg-[#f5f7fb] rounded-2xl outline-none border-2 border-transparent focus:border-[#0b57d0] font-bold"
                  value={data.exportFob}
                  onChange={(e) => setData((prev) => ({ ...prev, exportFob: Number(e.target.value) }))}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-[#6c7690] uppercase ml-1">Coeficiente I.R.</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    className="w-full p-4 bg-[#f5f7fb] rounded-2xl outline-none border-2 border-transparent focus:border-[#0b57d0] font-mono font-bold text-[#0b57d0]"
                    value={data.coeficiente}
                    onChange={(e) => setData((prev) => ({ ...prev, coeficiente: Number(e.target.value) }))}
                  />
                  <span className="text-sm font-black">%</span>
                </div>
                <p className="text-[11px] text-[#6c7690]">Ingresa el coeficiente en porcentaje (ej. 1.5)</p>
              </div>
            </div>

            <button
              onClick={() =>
                setData({
                  adquisiciones: [{ concepto: '', monto: 0 }],
                  ventaNac: 0,
                  exportFob: 0,
                  coeficiente: 0,
                  incluyeIGV: false,
                })
              }
              className="mt-8 w-full py-4 bg-[#0b1f3a] text-white rounded-2xl font-black uppercase tracking-[0.25em] text-xs shadow-lg shadow-[#0b1f3a]/20 hover:bg-[#0a1930] transition"
            >
              Limpiar escenario
            </button>
          </section>
        </div>

        <div className="space-y-6 lg:sticky lg:top-6 h-fit">
          <div className="bg-gradient-to-br from-[#0b1f3a] via-[#12305a] to-[#1a3d73] text-white p-8 rounded-[2.5rem] shadow-2xl shadow-[#0b1f3a]/30">
            <h3 className="text-white/70 text-[10px] font-black uppercase tracking-widest mb-3">Monto a devolver</h3>
            <p className="text-5xl md:text-6xl font-black mb-6 tracking-tight text-emerald-300">S/ {formatMoney(limiteManual)}</p>

            <div className="space-y-4 text-xs border-t border-white/20 pt-6">
              <div className="flex justify-between font-bold">
                <span className="text-white/70">SFMB</span>
                <span>S/ {formatMoney(sfmbManual)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-white/70">Límite (18% FOB)</span>
                <span>S/ {formatMoney(limiteManual)}</span>
              </div>
              <div className="flex justify-between text-emerald-200 font-black text-sm">
                <span>Saldo para arrastrar</span>
                <span>S/ {formatMoney(saldoArrastreTotal)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="bg-white border border-[#e2e7f0] rounded-2xl p-5">
              <p className="text-[10px] uppercase font-black tracking-[0.3em] text-[#6c7690] mb-2">I.R.</p>
              <p className="text-lg font-black text-red-500">- S/ {formatMoney(resultados?.impuestoRenta)}</p>
              <p className="text-[11px] text-[#6c7690]">Pago a cuenta</p>
            </div>
            <div className="bg-white border border-[#e2e7f0] rounded-2xl p-5">
              <p className="text-[10px] uppercase font-black tracking-[0.3em] text-[#6c7690] mb-2">Saldo período</p>
              <p className="text-lg font-black text-[#0b1f3a]">S/ {formatMoney(saldoArrastrePeriodo)}</p>
              <p className="text-[11px] text-[#6c7690]">Saldo que sale por período</p>
            </div>
            <div className="bg-white border border-[#e2e7f0] rounded-2xl p-5">
              <p className="text-[10px] uppercase font-black tracking-[0.3em] text-[#6c7690] mb-2">Arrastre</p>
              <p className="text-lg font-black text-[#0b1f3a]">S/ {formatMoney(saldoArrastreTotal)}</p>
              <p className="text-[11px] text-[#6c7690]">Saldo proyectado</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-[#e2e7f0]">
            <div className="flex items-center justify-between">
              <span className="text-[#6c7690] font-bold text-xs uppercase">Base utilizada</span>
              <span className="text-[#0b1f3a] font-black text-xs">{data.incluyeIGV ? 'Incluye IGV' : 'Base neta'}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] font-bold text-[#6c7690]">
              <div className="flex items-center justify-between">
                <span>Adquisiciones</span>
                <span>S/ {formatMoney(comprasBase)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Ventas</span>
                <span>S/ {formatMoney(ventasBase)}</span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] font-bold text-[#6c7690]">
              <div className="flex items-center justify-between">
                <span>Total ventas base</span>
                <span>S/ {formatMoney(totalVentasBase)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>IGV ventas nac</span>
                <span>S/ {formatMoney(debitoFiscal)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-[#e2e7f0]">
            <div className="flex items-center justify-between">
              <span className="text-[#6c7690] font-bold text-xs uppercase">Detalle fiscal</span>
              <span className="text-[#0b1f3a] font-black text-xs">Automatico</span>
            </div>
            <div className="mt-4 space-y-3 text-[11px] font-bold text-[#6c7690]">
              <div className="flex items-center justify-between">
                <span>Crédito fiscal</span>
                <span>S/ {formatMoney(creditoFiscal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Débito fiscal</span>
                <span>S/ {formatMoney(debitoFiscal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>SFMB (crédito - débito)</span>
                <span>S/ {formatMoney(sfmbManual)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Impuesto a la renta mensual</span>
                <span>S/ {formatMoney(impuestoRentaMensual)}</span>
              </div>
              <div className="flex items-center justify-between text-emerald-700">
                <span>Saldo no compensable</span>
                <span>S/ {formatMoney(saldoNoCompensable)}</span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-[2rem]">
            <p className="text-xs text-emerald-800 leading-relaxed">
              Este es un modo de prueba. Los datos ingresados aquí no se mezclan con los registros mensuales ni afectan tu historial.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}