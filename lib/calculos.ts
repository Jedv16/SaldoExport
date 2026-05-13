// lib/calculos.ts

export const calcularSFMB = (datos: {
  comprasBase: number,
  ventasNacionalesBase: number,
  exportacionesFob: number,
  coeficienteIR: number,
  saldoAnterior: number
}) => {
  const IGV_TASA = 0.18;

  // 1. IGV de las compras del mes actual
  const igvCompras = datos.comprasBase * IGV_TASA;
  
  // 2. Crédito Fiscal disponible (IGV actual + lo que venía arrastrado)
  const creditoFiscalTotal = igvCompras + datos.saldoAnterior;

  // 3. IGV de las Ventas Nacionales (Débito Fiscal)
  const igvVentasNac = datos.ventasNacionalesBase * IGV_TASA;

  // 4. Saldo a Favor del Exportador (SFE)
  // Es la diferencia entre tu crédito (compras) y tu débito (ventas nac)
  const sfe = creditoFiscalTotal - igvVentasNac;

  // 5. Límite Máximo de Beneficio (18% de las Exportaciones FOB)
  const limite = datos.exportacionesFob * IGV_TASA;

  // 6. SFMB Aplicable (El monto que realmente puedes usar)
  // Es el menor entre el SFE y el Límite. Si el SFE es negativo, es 0.
  const sfmb = sfe > 0 ? Math.min(sfe, limite) : 0;

  // 7. Pago a Cuenta del Impuesto a la Renta (Basado en el coeficiente manual)
  const ventasTotales = datos.ventasNacionalesBase + datos.exportacionesFob;
  const impuestoRenta = ventasTotales * datos.coeficienteIR;

  // 8. Saldo Final que se pedirá en devolución
  const saldoFinal = sfmb - impuestoRenta;
  
  // 9. Cálculo del Arrastre
  // Si el SFE era mayor al límite, esa diferencia NO se pierde, se arrastra al mes siguiente.
  const nuevoArrastre = sfe > limite ? (sfe - limite) : 0;

  return {
    igvCompras,
    sfe,
    limite,
    sfmb,
    impuestoRenta,
    saldoDevolucion: saldoFinal > 0 ? saldoFinal : 0,
    nuevoArrastre
  };
};