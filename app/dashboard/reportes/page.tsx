'use client';
import { useState, useEffect } from 'react';
/* icons removed to keep UI minimal */
import { supabase } from '@/lib/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const formatMoney = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '0.00';
  return value.toFixed(2);
};

interface Periodo {
  id: string;
  mes: number;
  anio: number;
  empresa_id: string;
  compra_insumos_base: number;
  venta_nacional_base: number;
  exportacion_fob: number;
  empresas?: {
    ruc: string;
    razon_social: string;
  } | Array<{
    ruc: string;
    razon_social: string;
  }>;
  compra_detalle?: Array<{ concepto: string; monto: number }>;
  calculos_resultados?: Array<{
    sfe_determinado: number;
    limite_sfmb: number;
    sfmb_aplicable: number;
    pago_cuenta_ir: number;
    saldo_devolucion: number;
    saldo_arrastrable: number;
  }>;
}

export default function ReportesPage() {
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');

  const monthNames = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  const years = Array.from(new Set(periodos.map((p) => p.anio))).sort((a, b) => b - a);

  useEffect(() => {
    const fetchDatos = async () => {
      setLoading(true);
      setError(null);

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) {
        setError('No hay sesión activa.');
        setPeriodos([]);
        setLoading(false);
        return;
      }

      // Consulta simple sin campos adicionales que puedan no existir
      const select = `
          id, mes, anio, empresa_id, exportacion_fob, venta_nacional_base, compra_insumos_base,
          empresas ( ruc, razon_social ),
          calculos_resultados ( saldo_devolucion, sfe_determinado, limite_sfmb, sfmb_aplicable, saldo_arrastrable, pago_cuenta_ir )
        `;

      const { data: fetched, error: fetchError } = await supabase
        .from('periodos_fiscales')
        .select(select)
        .eq('usuario_id', userId)
        .order('anio', { ascending: false })
        .order('mes', { ascending: false });

      if (fetchError) {
        setError(fetchError.message || 'No se pudo cargar los reportes.');
        setPeriodos([]);
      } else if (fetched) {
        setPeriodos(fetched as unknown as Periodo[]);
      }
      setLoading(false);
    };
    fetchDatos();
  }, []);

  const fetchImageDataUrl = async (url: string) => {
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      return null;
    }
  };

  const getEmpresa = (periodo: Periodo) => {
    return Array.isArray(periodo.empresas) ? periodo.empresas[0] : periodo.empresas;
  };

  const getCompraDetalle = (periodo: Periodo) => {
    if (typeof window === 'undefined') return [] as Array<{ concepto: string; monto: number }>;

    try {
      const raw = window.localStorage.getItem(`saldoexport:compras:${periodo.id}`);
      if (!raw) return [] as Array<{ concepto: string; monto: number }>;

      const parsed = JSON.parse(raw) as { adquisiciones?: Array<{ concepto: string; monto: number }> };
      return Array.isArray(parsed.adquisiciones) ? parsed.adquisiciones : [];
    } catch {
      return [] as Array<{ concepto: string; monto: number }>;
    }
  };

  const generarPDF = async (periodo: Periodo) => {
    // Obtener el saldo_arrastrable del mes anterior para calcular solo lo del mes actual
    const obtenerSaldoMesAnterior = () => {
      const periodoAnterior = periodos
        .filter(p => p.empresa_id === periodo.empresa_id && 
                     (p.anio < periodo.anio || (p.anio === periodo.anio && p.mes < periodo.mes)))
        .sort((a, b) => {
          if (b.anio !== a.anio) return b.anio - a.anio;
          return b.mes - a.mes;
        })[0];
      
      return periodoAnterior?.calculos_resultados?.[0]?.saldo_arrastrable || 0;
    };
    const saldoMesAnterior = obtenerSaldoMesAnterior();
    const doc = new jsPDF();
    const res = periodo.calculos_resultados?.[0];
    const blue = [11, 87, 208] as const;
    const navy = [11, 31, 58] as const;
    const soft = [245, 247, 251] as const;
    const yellow = [255, 234, 0] as const;
    const green = [190, 245, 167] as const;

    // Encabezado membretado
    doc.setFillColor(...navy);
    doc.roundedRect(10, 10, 190, 34, 6, 6, 'F');
    doc.setFillColor(...blue);
    doc.roundedRect(12, 12, 118, 30, 5, 5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('SALDO EXPORT', 18, 24);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Liquidación del saldo a favor del exportador', 18, 30);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-PE')}`, 18, 36);

    const imgData = await fetchImageDataUrl('/img/logo-SE.png');
    if (imgData) {
      try {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(136, 13, 52, 24, 4, 4, 'F');
        doc.addImage(imgData as any, 'PNG', 141, 16, 42, 18);
      } catch (e) {
        // ignore image errors
      }
    }

    // Tabla de datos principales
    doc.setTextColor(...navy);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL CONTRIBUYENTE', 14, 54);

    const empresa = getEmpresa(periodo);

    (autoTable as any)(doc, {
      startY: 58,
      body: [
        ['Razón social', empresa?.razon_social || 'Sin empresa'],
        ['RUC', empresa?.ruc || 'Sin RUC'],
        ['Período', `${monthNames[periodo.mes - 1]} ${periodo.anio}`],
      ],
      theme: 'grid',
      styles: {
        cellPadding: 4,
        fontSize: 10,
        textColor: [40, 52, 74],
        lineColor: [226, 231, 240],
        lineWidth: 0.15,
      },
      columnStyles: {
        0: { cellWidth: 48, fontStyle: 'bold', fillColor: soft },
        1: { cellWidth: 130 },
      },
      alternateRowStyles: { fillColor: [250, 252, 255] },
      bodyStyles: { valign: 'middle' },
    });

    // Bloque de adquisiciones tipo reporte contable
    const compraDetalle = getCompraDetalle(periodo);
    const compraRows = compraDetalle.length > 0
      ? compraDetalle.map((item) => [item.concepto || '—', formatMoney(item.monto)])
      : [['Compras y gastos gravadas con el IGV', formatMoney(periodo.compra_insumos_base / 0.18)]];

    const totalBaseCompras = compraDetalle.reduce((acc, item) => acc + (Number(item.monto) || 0), 0);
    const totalIgvCompras = compraDetalle.length > 0 ? totalBaseCompras * 0.18 : periodo.compra_insumos_base;

    doc.setTextColor(...navy);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ADQUISICIONES', 14, (doc as any).lastAutoTable.finalY + 12);

    (autoTable as any)(doc, {
      startY: (doc as any).lastAutoTable.finalY + 16,
      head: [['COMPRAS Y GASTOS GRAVADAS CON EL IGV', 'VALOR (Sin IGV)']],
      body: [
        ...compraRows,
        ['IGV de las compras y gastos', formatMoney(totalIgvCompras)],
      ],
      theme: 'grid',
      styles: {
        cellPadding: 4,
        fontSize: 10,
        textColor: [20, 26, 32],
        lineColor: [140, 189, 106],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: yellow,
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
      bodyStyles: {
        fillColor: green,
        textColor: [0, 0, 0],
        valign: 'middle',
      },
      alternateRowStyles: { fillColor: [176, 240, 150] },
      columnStyles: {
        0: { cellWidth: 138, fontStyle: 'normal' },
        1: { halign: 'right', cellWidth: 40, fontStyle: 'bold' },
      },
      didParseCell: (data: any) => {
        const rowLabel = String(data.row?.raw?.[0] ?? '').toUpperCase();
        if (rowLabel.includes('IGV DE LAS COMPRAS Y GASTOS')) {
          data.cell.styles.fillColor = yellow;
          data.cell.styles.textColor = [0, 0, 0];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    // Resultados
    doc.setTextColor(...navy);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CÁLCULOS FISCALES', 14, (doc as any).lastAutoTable.finalY + 12);

    const sfe = Number(res?.sfe_determinado || 0);
    const limite = Number(res?.limite_sfmb || 0);
    const pagoCuentaIr = Number(res?.pago_cuenta_ir || 0);
    // Saldo no compensable = SFMB - Impuesto a la Renta (pago cuenta)
    const saldoNoCompensable = Math.max(0, sfe - pagoCuentaIr);

    // Valores explícitos de Crédito y Débito fiscal para mostrar arriba
    const creditoFiscal = Number(totalIgvCompras || 0);
    const debitoFiscal = Number(periodo.venta_nacional_base || 0) * 0.18;

    (autoTable as any)(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      body: [
        ['Crédito fiscal', `S/ ${formatMoney(creditoFiscal)}`],
        ['Débito fiscal', `S/ ${formatMoney(debitoFiscal)}`],
        ['Crédito fiscal - débito fiscal (SFMB)', `S/ ${formatMoney(sfe)}`],
        ['Impuesto a la Renta', `S/ ${formatMoney(res?.pago_cuenta_ir)}`],
        ['Saldo no compensable', `S/ ${formatMoney(saldoNoCompensable)}`],
        ['Límite (Hasta el 18% de las exportaciones del mes)', `S/ ${formatMoney(limite)}`],
        ['Monto a Devolver', `S/ ${formatMoney(res?.saldo_devolucion)}`],
        ['Saldo por período', `S/ ${formatMoney(Math.max(0, (res?.saldo_arrastrable || 0) - saldoMesAnterior))}`],
        ['Saldo acumulado', `S/ ${formatMoney(res?.saldo_arrastrable)}`]
      ],
      theme: 'striped',
      styles: {
        cellPadding: 4,
        fontSize: 10,
        textColor: [40, 52, 74],
        lineColor: [226, 231, 240],
        lineWidth: 0.15,
      },
      headStyles: { fillColor: navy, textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { fontSize: 10, valign: 'middle' },
      alternateRowStyles: { fillColor: [247, 249, 252] },
      columnStyles: {
        0: { cellWidth: 132, fontStyle: 'bold', fillColor: soft },
        1: { halign: 'right', cellWidth: 46 },
      },
    });

    doc.save(`Liquidacion_${empresa?.ruc || 'SINRUC'}_${periodo.mes}_${periodo.anio}.pdf`);
  };

  const generarExcel = (periodo: Periodo) => {
    const res = periodo.calculos_resultados?.[0];

    const wb = XLSX.utils.book_new();

    // Hoja 1: Resumen
    const resumen = [
      { Campo: 'Razón Social', Valor: getEmpresa(periodo)?.razon_social },
      { Campo: 'RUC', Valor: getEmpresa(periodo)?.ruc },
      { Campo: 'Período', Valor: `${monthNames[periodo.mes - 1]} ${periodo.anio}` }
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen), 'Resumen');

    // Hoja 2: Movimientos (detalle si existe)
    if (periodo.compra_detalle && periodo.compra_detalle.length > 0) {
      const movimientos = periodo.compra_detalle.map((m) => ({ Concepto: m.concepto, Monto: m.monto }));
      movimientos.push({ Concepto: 'TOTAL COMPRAS', Monto: periodo.compra_detalle.reduce((s, x) => s + (x.monto || 0), 0) });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(movimientos), 'Movimientos');
    } else {
      const movimientos = [
        { Concepto: 'Compras (total IGV)', Monto: periodo.compra_insumos_base },
        { Concepto: 'Ventas Nacionales', Monto: periodo.venta_nacional_base },
        { Concepto: 'Exportaciones (FOB)', Monto: periodo.exportacion_fob }
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(movimientos), 'Movimientos');
    }

    // Hoja 3: Cálculos
    const calculos = [
      { Concepto: 'SFE', Valor: res?.sfe_determinado },
      { Concepto: 'Límite SFMB', Valor: res?.limite_sfmb },
      { Concepto: 'SFMB Aplicable', Valor: res?.sfmb_aplicable },
      { Concepto: 'IR (Pago Cuenta)', Valor: res?.pago_cuenta_ir },
      { Concepto: 'Monto a Devolver', Valor: res?.saldo_devolucion },
      { Concepto: 'Saldo Arrastre', Valor: res?.saldo_arrastrable }
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(calculos), 'Calculos');

    const empresaExcel = getEmpresa(periodo);
    XLSX.writeFile(wb, `Liquidacion_${empresaExcel?.ruc || 'SINRUC'}_${periodo.mes}_${periodo.anio}.xlsx`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Encabezado */}
      <div className="rounded-[2rem] bg-gradient-to-br from-white via-white to-[#e9f0ff] border border-[#e2e7f0] p-8">
        <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.35em] text-[#0b57d0]">Reportes</p>
          <h1 className="text-3xl md:text-4xl font-black text-[#0b1f3a] tracking-tight">Liquidaciones por período</h1>
          <p className="text-sm text-[#465166]">Visualiza, exporta y descarga tus reportes fiscales por mes.</p>
        </div>
      </div>

      {/* Filtro por empresa y lista compacta */}
      <div className="bg-white p-6 rounded-[2rem] border border-[#e2e7f0]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <p className="text-sm font-bold text-[#0b1f3a]">Tus liquidaciones</p>
            <p className="text-xs text-[#6c7690]">Filtra por empresa y descarga PDF/Excel</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <YearFilter years={years} onFilter={(year) => setSelectedYear(year)} />
            <CompanyFilter periodos={periodos} onFilter={(companyId) => setSelectedCompany(companyId)} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#f5f7fb]">
              <tr>
                <th className="p-3 text-left font-black text-[#6c7690]">Período</th>
                <th className="p-3 text-left font-black text-[#6c7690]">Empresa</th>
                <th className="p-3 text-right font-black text-[#6c7690]">Monto a devolver</th>
                <th className="p-3 text-right font-black text-[#6c7690]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {periodos
                .filter((p) => (!selectedCompany || p.empresa_id === selectedCompany) && (!selectedYear || String(p.anio) === selectedYear))
                .map((p) => {
                  const res = p.calculos_resultados?.[0];
                  const empresa = getEmpresa(p);
                  return (
                    <tr key={p.id} className="border-t border-[#edf1f7] hover:bg-[#f9fbff]">
                      <td className="p-3 font-semibold">{monthNames[p.mes - 1]} {p.anio}</td>
                      <td className="p-3">{empresa?.razon_social || 'Sin empresa'}</td>
                      <td className="p-3 text-right font-black text-[#0b57d0]">S/ {formatMoney(res?.saldo_devolucion)}</td>
                      <td className="p-3 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => generarPDF(p)}
                            disabled={!res}
                            className="px-3 py-2 bg-[#0b1f3a] text-white rounded-xl text-xs font-bold disabled:opacity-50"
                          >
                            PDF
                          </button>
                          <button
                            onClick={() => generarExcel(p)}
                            disabled={!res}
                            className="px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                          >
                            Excel
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- Helper: filtro de empresas ---
function CompanyFilter({ periodos, onFilter }: { periodos: Periodo[]; onFilter: (id: string) => void }) {
  const companies = Array.from(
    new Map(
      periodos.map((p) => {
        const empresa = Array.isArray(p.empresas) ? p.empresas[0] : p.empresas;
        return [p.empresa_id, { id: p.empresa_id, name: empresa?.razon_social || p.empresa_id }];
      })
    ).values()
  );
  const [selected, setSelected] = useState('');

  useEffect(() => {
    onFilter(selected || '');
  }, [selected, onFilter]);

  return (
    <select
      value={selected}
      onChange={(e) => setSelected(e.target.value)}
      className="p-3 bg-[#f5f7fb] rounded-2xl outline-none border-2 border-transparent focus:border-[#0b57d0] text-sm font-bold"
    >
      <option value="">Todas las empresas</option>
      {companies.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );
}

function YearFilter({ years, onFilter }: { years: number[]; onFilter: (year: string) => void }) {
  const [selected, setSelected] = useState('');

  useEffect(() => {
    onFilter(selected || '');
  }, [selected, onFilter]);

  return (
    <select
      value={selected}
      onChange={(e) => setSelected(e.target.value)}
      className="p-3 bg-[#f5f7fb] rounded-2xl outline-none border-2 border-transparent focus:border-[#0b57d0] text-sm font-bold"
    >
      <option value="">Todos los años</option>
      {years.map((year) => (
        <option key={year} value={String(year)}>{year}</option>
      ))}
    </select>
  );
}