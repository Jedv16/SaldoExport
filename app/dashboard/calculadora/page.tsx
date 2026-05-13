'use client';
import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { calcularSFMB } from '@/lib/calculos';

export default function CalculadoraPage() {
  const [ruc, setRuc] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [coeficiente, setCoeficiente] = useState(0);
  const [ventaNac, setVentaNac] = useState(0);
  const [exportFob, setExportFob] = useState(0);
  const [incluyeIGV, setIncluyeIGV] = useState(false);
  const [resultados, setResultados] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [adquisiciones, setAdquisiciones] = useState([
    { concepto: '', monto: 0 }
  ]);
  const [mesTrabajo, setMesTrabajo] = useState(new Date().getMonth() + 1);
  const [mesesTrabajados, setMesesTrabajados] = useState<number[]>([]);
  const [saldoArrastreTotalPrevio, setSaldoArrastreTotalPrevio] = useState(0);

  const monthNames = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre'
  ];
  const currentYear = new Date().getFullYear();

  const formatMoney = (value?: number) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '0.00';
    return value.toFixed(2);
  };

  const periodoLabel = `${monthNames[mesTrabajo - 1]} ${currentYear}`;

  const totalAdquisiciones = adquisiciones.reduce((acc, item) => acc + (Number(item.monto) || 0), 0);
  const totalAdquisicionesIgv = totalAdquisiciones * 0.18;
  const comprasBase = incluyeIGV ? totalAdquisiciones / 1.18 : totalAdquisiciones;
  const ventasBase = incluyeIGV ? ventaNac / 1.18 : ventaNac;
  const creditoFiscal = comprasBase * 0.18;
  const debitoFiscal = ventasBase * 0.18;
  const totalVentasBase = ventasBase + exportFob;
  const limiteManual = exportFob * 0.18;
  const sfmbManual = creditoFiscal - debitoFiscal;
  const impuestoRentaMensual = totalVentasBase * (coeficiente / 100);
  const saldoNoCompensable = sfmbManual - impuestoRentaMensual;
  const saldoArrastrePeriodo = Math.max(0, saldoNoCompensable - limiteManual);
  const aporteArrastre = Math.min(
    saldoArrastreTotalPrevio,
    Math.max(0, limiteManual - saldoNoCompensable)
  );
  const saldoArrastreTotal = saldoArrastreTotalPrevio - aporteArrastre + saldoArrastrePeriodo;

  // 1. Lógica de búsqueda automática (Se activa sola al llegar a 11 dígitos)
  useEffect(() => {
    const buscarEmpresa = async () => {
      if (ruc.length === 11) {
        const { data, error } = await supabase
          .from('empresas')
          .select('id, razon_social')
          .eq('ruc', ruc)
          .single();

        if (data) {
          setRazonSocial(data.razon_social);
          setEmpresaId(data.id);
        } else {
          setRazonSocial('');
          setEmpresaId(null);
          // No se abre modal: se gestiona desde el panel de empresas.
        }
      } else {
        setRazonSocial('');
        setEmpresaId(null);
      }
    };
    buscarEmpresa();
  }, [ruc]);

  useEffect(() => {
    const fetchMeses = async () => {
      if (!empresaId) {
        setMesesTrabajados([]);
        return;
      }

      const { data } = await supabase
        .from('periodos_fiscales')
        .select('mes')
        .eq('empresa_id', empresaId)
        .eq('anio', currentYear);

      if (data) setMesesTrabajados(data.map((row) => row.mes));
    };

    fetchMeses();
  }, [empresaId, currentYear]);


  useEffect(() => {
    const fetchArrastreTotal = async () => {
      if (!empresaId) {
        setSaldoArrastreTotalPrevio(0);
        return;
      }

      // Lógica de ciclo de 4 años: el arrastre se borra cada 4 años
      // Año base 2026: ciclos en 2026-2030, 2031-2035, etc.
      const yearsSince2026 = currentYear - 2026;
      const cycleYear = yearsSince2026 % 4;
      
      // Si es el primer año del ciclo (cycleYear === 0 en años 2026, 2030, 2034, etc.),
      // buscar arrastre del año anterior. Si no es el primer año, ignorar.
      if (cycleYear === 0 && mesTrabajo === 1) {
        // Primer mes del primer año del ciclo: no hay arrastre
        setSaldoArrastreTotalPrevio(0);
        return;
      }

      if (cycleYear === 0 && mesTrabajo > 1) {
        // Mes posterior al primero en año de inicio de ciclo: buscar en el mismo año
        const { data } = await supabase
          .from('periodos_fiscales')
          .select('mes, calculos_resultados ( saldo_arrastrable )')
          .eq('empresa_id', empresaId)
          .eq('anio', currentYear)
          .lt('mes', mesTrabajo)
          .order('mes', { ascending: false })
          .limit(1)
          .single();

        const arrastre = data?.calculos_resultados?.[0]?.saldo_arrastrable ?? 0;
        setSaldoArrastreTotalPrevio(arrastre);
      } else {
        // Otros años dentro del ciclo: arrastrar normalmente
        const { data } = await supabase
          .from('periodos_fiscales')
          .select('mes, calculos_resultados ( saldo_arrastrable )')
          .eq('empresa_id', empresaId)
          .eq('anio', currentYear)
          .lt('mes', mesTrabajo)
          .order('mes', { ascending: false })
          .limit(1)
          .single();

        const arrastre = data?.calculos_resultados?.[0]?.saldo_arrastrable ?? 0;
        setSaldoArrastreTotalPrevio(arrastre);
      }
    };

    fetchArrastreTotal();
  }, [empresaId, mesTrabajo, currentYear]);

  useEffect(() => {
    if (mesesTrabajados.length === 0) return;
    if (!mesesTrabajados.includes(mesTrabajo)) return;

    const nextDisponible = monthNames.findIndex((_, index) => !mesesTrabajados.includes(index + 1));
    if (nextDisponible >= 0) setMesTrabajo(nextDisponible + 1);
  }, [mesesTrabajados, mesTrabajo, monthNames]);

  // 2. Cálculo automático en tiempo real
  useEffect(() => {
    const res = calcularSFMB({
      comprasBase,
      ventasNacionalesBase: ventasBase,
      exportacionesFob: exportFob,
      coeficienteIR: coeficiente / 100,
      saldoAnterior: 0
    });
    setResultados(res);
  }, [comprasBase, ventasBase, exportFob, coeficiente, incluyeIGV]);

  // 3. Función para Guardar la Liquidación Real
  const handleGuardar = async () => {
  // 1. Validaciones previas
  if (!razonSocial || ruc.length !== 11) {
    return alert("Debes identificar una empresa válida primero.");
  }

  setIsSaving(true);
  try {
    const { data: { user } } = await supabase.auth.getUser();

    // 2. Buscamos la empresa para obtener su ID real
    const { data: emp, error: empError } = await supabase
      .from('empresas')
      .select('id')
      .eq('ruc', ruc)
      .single();

    // ESTA ES LA CLAVE: Si emp es nulo, lanzamos un error controlado
    if (empError || !emp) {
      throw new Error("No se pudo obtener el ID de la empresa. Verifica que esté registrada.");
    }

    // 3. Guardar el Periodo Fiscal (emp.id ya es seguro aquí)
    const { data: periodo, error: err1 } = await supabase
      .from('periodos_fiscales')
      .insert([{
        empresa_id: emp.id,
        usuario_id: user?.id,
        mes: mesTrabajo,
        anio: currentYear,
        // Guardar como solicitaste: compras = Total IGV adquisiciones (monto de IGV)
        compra_insumos_base: totalAdquisicionesIgv,
        venta_nacional_base: ventasBase,
        exportacion_fob: exportFob
      }])
      .select()
      .single();

    if (err1) throw err1;

    // 4. Guardar resultados
    const { error: err2 } = await supabase
      .from('calculos_resultados')
      .insert([{
        periodo_id: periodo.id,
        sfe_determinado: sfmbManual,
        limite_sfmb: limiteManual,
        sfmb_aplicable: resultados.sfmb,
        pago_cuenta_ir: impuestoRentaMensual,
        saldo_devolucion: limiteManual,
          saldo_arrastrable: saldoArrastreTotal
      }]);

    if (err2) throw err2;

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        `saldoexport:compras:${periodo.id}`,
        JSON.stringify({
          periodoId: periodo.id,
          empresaId: emp.id,
          mes: mesTrabajo,
          anio: currentYear,
          adquisiciones,
        })
      );
    }

    alert("✅ Liquidación guardada correctamente");
    
    // Resetear formulario después de guardar
    setRuc('');
    setRazonSocial('');
    setCoeficiente(0);
    setVentaNac(0);
    setExportFob(0);
    setAdquisiciones([{ concepto: '', monto: 0 }]);
    setMesTrabajo(new Date().getMonth() + 1);

  } catch (error: any) {
    console.error(error);
    alert("Error: " + error.message);
  } finally {
    setIsSaving(false);
  }
};

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Encabezado */}
      <div className="rounded-[2rem] bg-gradient-to-br from-white via-white to-[#e9f0ff] border border-[#e2e7f0] p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <img src="/img/logo-SE.png" alt="SaldoExport" className="w-20 h-20 object-contain rounded-md" />
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.35em] text-blue-600">Modulo</p>
                <h1 className="text-3xl md:text-4xl font-black text-[#0b1f3a] tracking-tight">Calculadora de Saldo a Favor</h1>
                <p className="text-[#465166] text-sm">Control rapido y resumen del periodo actual.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#0b57d0]/10 text-[#0b57d0] px-3 py-1 text-xs font-bold">
                Periodo: {periodoLabel}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white text-[#465166] border border-[#e2e7f0] px-3 py-1 text-xs font-bold">
                Tipo: Devolucion
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="inline-flex rounded-2xl bg-white border border-[#e2e7f0] p-1">
              <button
                type="button"
                onClick={() => setIncluyeIGV(true)}
                className={`px-4 py-2 text-xs font-black rounded-xl transition ${
                  incluyeIGV ? 'bg-[#0b57d0] text-white shadow-sm' : 'text-[#465166]'
                }`}
              >
                Incluye IGV
              </button>
              <button
                type="button"
                onClick={() => setIncluyeIGV(false)}
                className={`px-4 py-2 text-xs font-black rounded-xl transition ${
                  !incluyeIGV ? 'bg-[#0b57d0] text-white shadow-sm' : 'text-[#465166]'
                }`}
              >
                Bases netas
              </button>
            </div>
            <button
              onClick={handleGuardar}
              disabled={isSaving}
              className="px-6 py-3 rounded-2xl bg-[#0b1f3a] text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-[#0b1f3a]/25 hover:bg-[#0a1930] transition disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : 'Guardar liquidacion'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* 1. IDENTIFICACION */}
          <section className="bg-white p-8 rounded-[2rem] border border-[#e2e7f0]">
            <div className="flex items-start justify-between gap-4 mb-8">
              <div>
                <h2 className="text-sm font-black uppercase tracking-[0.25em] text-blue-600">Identificacion</h2>
                <p className="text-xs text-[#465166] mt-2">Valida el contribuyente antes de calcular.</p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#6c7690]">Paso 1</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-[#6c7690] uppercase ml-1">RUC del contribuyente</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={11}
                  className="w-full bg-[#f5f7fb] p-4 rounded-2xl border-2 border-transparent focus:border-[#0b57d0] outline-none transition font-bold"
                  value={ruc}
                  onChange={(e) => setRuc(e.target.value)}
                  placeholder="20XXXXXXXXX"
                />
                <p className="text-[11px] text-[#6c7690]">Al completar 11 digitos se busca la empresa.</p>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-[#6c7690] uppercase ml-1">Razon social</label>
                <div className="p-4 bg-[#f5f7fb] rounded-2xl font-bold text-[#465166] border-2 border-transparent min-h-[58px]">
                  {razonSocial || 'Esperando RUC...'}
                </div>
                <p className="text-[11px] text-[#6c7690]">Si no existe, debera de registrar la empresa.</p>
              </div>
            </div>
          </section>

          <section className="bg-white border border-[#e2e7f0] rounded-[2rem] p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.35em] text-[#0b57d0]">Periodo de trabajo</p>
                <h2 className="text-xl font-black text-[#0b1f3a]">{razonSocial || 'Selecciona una empresa'}</h2>
                <p className="text-sm text-[#6c7690]">RUC: {ruc || '—'}</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#6c7690]">Periodo</label>
                <select
                  value={mesTrabajo}
                  onChange={(e) => setMesTrabajo(Number(e.target.value))}
                  className="bg-[#f5f7fb] border border-[#e2e7f0] rounded-2xl px-4 py-2 text-sm font-bold text-[#0b1f3a]"
                >
                  {monthNames.map((month, index) => {
                    const monthIndex = index + 1;
                    const trabajado = mesesTrabajados.includes(monthIndex);
                    return (
                      <option key={month} value={monthIndex} disabled={trabajado}>
                        {month} {currentYear} {trabajado ? '(completado)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {monthNames.map((month, index) => {
                const monthIndex = index + 1;
                const trabajado = mesesTrabajados.includes(monthIndex);
                const seleccionado = mesTrabajo === monthIndex;
                return (
                  <button
                    key={month}
                    type="button"
                    onClick={() => !trabajado && setMesTrabajo(monthIndex)}
                    disabled={trabajado}
                    className={`rounded-2xl px-3 py-2 text-xs font-black uppercase transition ${
                      seleccionado
                        ? 'bg-[#0b1f3a] text-white'
                        : trabajado
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-[#f0f2f7] text-[#6c7690]'
                    }`}
                  >
                    {month}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 2. MOVIMIENTOS */}
          <section className="bg-white p-8 rounded-[2rem] border border-[#e2e7f0]">
            <div className="flex items-start justify-between gap-4 mb-8">
              <div>
                <h2 className="text-sm font-black uppercase tracking-[0.25em] text-blue-600">Movimientos del mes</h2>
                <p className="text-xs text-[#465166] mt-2">Registra montos en soles del periodo.</p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#6c7690]">Paso 2</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3 md:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[10px] font-black text-[#6c7690] uppercase ml-1">Adquisiciones</label>
                    <p className="text-[11px] text-[#6c7690]">Compras y gastos</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdquisiciones((prev) => [...prev, { concepto: '', monto: 0 }])}
                    className="text-[10px] font-black uppercase tracking-[0.25em] text-[#0b57d0]"
                  >
                    Agregar fila
                  </button>
                </div>
                <div className="space-y-3">
                  {adquisiciones.map((item, index) => (
                    <div key={`adq-${index}`} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                      <input
                        type="text"
                        placeholder="Concepto"
                        className="md:col-span-7 w-full p-4 bg-[#f5f7fb] rounded-2xl outline-none border-2 border-transparent focus:border-[#0b57d0] font-semibold"
                        value={item.concepto}
                        onChange={(e) =>
                          setAdquisiciones((prev) =>
                            prev.map((row, idx) =>
                              idx === index ? { ...row, concepto: e.target.value } : row
                            )
                          )
                        }
                      />
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="0.00"
                        className="md:col-span-4 w-full p-4 bg-[#f5f7fb] rounded-2xl outline-none border-2 border-transparent focus:border-[#0b57d0] font-bold text-right"
                        value={item.monto}
                        onChange={(e) =>
                          setAdquisiciones((prev) =>
                            prev.map((row, idx) =>
                              idx === index ? { ...row, monto: Number(e.target.value) } : row
                            )
                          )
                        }
                      />
                      <div className="md:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setAdquisiciones((prev) => {
                              if (prev.length === 1) return [{ concepto: '', monto: 0 }];
                              return prev.filter((_, i) => i !== index);
                            });
                          }}
                          className="ml-2 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition"
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
                  <span>S/ {formatMoney(totalAdquisicionesIgv)}</span>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-[#6c7690] uppercase ml-1">Ventas nacionales</label>
                <input
                  type="number"
                  inputMode="decimal"
                  className="w-full p-4 bg-[#f5f7fb] rounded-2xl outline-none border-2 border-transparent focus:border-[#0b57d0] font-bold"
                  onChange={(e) => setVentaNac(Number(e.target.value))}
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-[#6c7690] uppercase ml-1">Exportaciones (FOB)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  className="w-full p-4 bg-[#f5f7fb] rounded-2xl outline-none border-2 border-transparent focus:border-[#0b57d0] font-bold"
                  onChange={(e) => setExportFob(Number(e.target.value))}
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
                    value={coeficiente}
                    onChange={(e) => setCoeficiente(Number(e.target.value))}
                  />
                  <span className="text-sm font-black">%</span>
                </div>
                <p className="text-[11px] text-[#6c7690]">Ingresa el coeficiente en porcentaje (ej. 1.5)</p>
              </div>
            </div>
          </section>
        </div>

        {/* LADO DERECHO: RESULTADOS */}
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
                <span className="text-white/70">Limite (18% FOB)</span>
                <span>S/ {formatMoney(limiteManual)}</span>
              </div>
              <div className="flex justify-between text-emerald-200 font-black text-sm">
                <span>Saldo para arrastrar en el sgte. periodo</span>
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
              <p className="text-[10px] uppercase font-black tracking-[0.3em] text-[#6c7690] mb-2">Saldo periodo</p>
              <p className="text-lg font-black text-[#0b1f3a]">S/ {formatMoney(saldoArrastrePeriodo)}</p>
              <p className="text-[11px] text-[#6c7690]">Saldo que sale por periodo</p>
            </div>
            <div className="bg-white border border-[#e2e7f0] rounded-2xl p-5">
              <p className="text-[10px] uppercase font-black tracking-[0.3em] text-[#6c7690] mb-2">Arrastre</p>
              <p className="text-lg font-black text-[#0b1f3a]">S/ {formatMoney(saldoArrastreTotal)}</p>
              <p className="text-[11px] text-[#6c7690]">Saldo acumulado</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-[#e2e7f0]">
            <div className="flex items-center justify-between">
              <span className="text-[#6c7690] font-bold text-xs uppercase">Base utilizada</span>
              <span className="text-[#0b1f3a] font-black text-xs">
                {incluyeIGV ? 'Incluye IGV' : 'Base neta'}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] font-bold text-[#6c7690]">
              <div className="flex items-center justify-between">
                <span>Compras (Total IGV adquisiciones)</span>
                <span>S/ {formatMoney(totalAdquisicionesIgv)}</span>
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
                <span>Arrastre total periodos</span>
                <span>S/ {formatMoney(saldoArrastreTotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Credito fiscal</span>
                <span>S/ {formatMoney(creditoFiscal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Debito fiscal</span>
                <span>S/ {formatMoney(debitoFiscal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>SFMB (credito - debito)</span>
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
        </div>
      </div>

    </div>
  );
}