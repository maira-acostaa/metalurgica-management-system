type SanitizeNumberFn = (value: any) => number;

interface ControlCuentasViewModelInput {
  controlCuentas: any;
  facturas: any[];
  compras: any[];
  sanitizeNumber: SanitizeNumberFn;
}

const resolveClientePendiente = (cliente: any, sanitizeNumber: SanitizeNumberFn) => {
  return Math.max(
    0,
    sanitizeNumber(
      cliente?.pendiente ??
        cliente?.totalDeuda ??
        cliente?.saldo_pendiente ??
        cliente?.deuda ??
        cliente?.saldo ??
        cliente?.aunPendiente ??
        0
    )
  );
};

const resolveCompraPendiente = (compra: any, sanitizeNumber: SanitizeNumberFn) => {
  return Math.max(
    0,
    sanitizeNumber(
      compra?.pendiente ??
        compra?.deuda ??
        compra?.deuda_pendiente ??
        compra?.saldo_pendiente ??
        compra?.aunDebe ??
        (sanitizeNumber(compra?.total_comprado ?? compra?.monto ?? compra?.total ?? 0) -
          sanitizeNumber(compra?.total_pagado ?? compra?.pagado ?? 0))
    )
  );
};

const buildClientesConSaldoPendiente = (
  controlCuentas: any,
  facturas: any[],
  sanitizeNumber: SanitizeNumberFn
) => {
  if (controlCuentas?.clientesPendientes?.length) {
    return controlCuentas.clientesPendientes
      .map((cliente: any) => {
        const pendiente = resolveClientePendiente(cliente, sanitizeNumber);
        return {
          ...cliente,
          pendiente,
          totalDeuda: pendiente
        };
      })
      .filter((cliente: any) => cliente.pendiente > 0);
  }

  if (!facturas?.length) {
    return [];
  }

  const agrupados = facturas.reduce((map, factura) => {
    const total = sanitizeNumber(factura?.monto_total ?? factura?.total ?? factura?.monto ?? 0);
    const pagado = sanitizeNumber(factura?.pagado ?? factura?.total_pagado ?? 0);
    const saldo = Math.max(0, total - pagado);
    if (saldo <= 0) {
      return map;
    }

    const key = factura?.cliente || factura?.nombre_cliente || 'Cliente';
    if (!map.has(key)) {
      map.set(key, {
        cliente: key,
        facturas: [],
        pendiente: 0,
        totalDeuda: 0
      });
    }

    const cuenta = map.get(key)!;
    cuenta.facturas.push(factura);
    cuenta.pendiente += saldo;
    cuenta.totalDeuda += saldo;
    return map;
  }, new Map<string, any>());

  return Array.from(agrupados.values());
};

const buildComprasPendientesDePago = (
  controlCuentas: any,
  compras: any[],
  sanitizeNumber: SanitizeNumberFn
) => {
  if (controlCuentas?.proveedoresPendientes?.length) {
    return controlCuentas.proveedoresPendientes
      .map((compra: any) => {
        const pendiente = resolveCompraPendiente(compra, sanitizeNumber);
        return {
          ...compra,
          pendiente
        };
      })
      .filter((compra: any) => compra.pendiente > 0);
  }

  if (!compras?.length) {
    return [];
  }

  return compras.reduce((acc: any[], compra: any) => {
    const monto = sanitizeNumber(compra?.total_comprado ?? compra?.monto ?? compra?.total ?? 0);
    const pagado = sanitizeNumber(compra?.total_pagado ?? compra?.pagado ?? 0);
    const pendiente = Math.max(0, monto - pagado);
    if (pendiente <= 0) {
      return acc;
    }

    acc.push({ ...compra, pendiente });
    return acc;
  }, []);
};

const buildResumenPorCobrar = (controlCuentas: any, facturas: any[], sanitizeNumber: SanitizeNumberFn) => {
  if (controlCuentas?.cuentasPorCobrar) {
    const cxC = controlCuentas.cuentasPorCobrar;
    return {
      facturasEmitidas: sanitizeNumber(cxC.facturas_emitidas ?? cxC.facturasEmitidas ?? cxC.facturas ?? facturas.length),
      totalFacturado: sanitizeNumber(cxC.total_facturado ?? cxC.totalFacturado ?? cxC.total ?? 0),
      totalCobrado: sanitizeNumber(cxC.total_cobrado ?? cxC.yaRecibido ?? cxC.cobrado ?? 0)
    };
  }

  const totales = facturas.reduce(
    (acc, factura) => {
      const monto = sanitizeNumber(factura?.monto_total ?? factura?.total ?? factura?.monto ?? 0);
      const pagado = sanitizeNumber(factura?.pagado ?? factura?.total_pagado ?? 0);
      acc.totalFacturado += monto;
      acc.totalCobrado += Math.min(monto, pagado);
      return acc;
    },
    { totalFacturado: 0, totalCobrado: 0 }
  );

  return {
    facturasEmitidas: facturas.length,
    totalFacturado: totales.totalFacturado,
    totalCobrado: totales.totalCobrado
  };
};

const buildResumenPorPagar = (controlCuentas: any, compras: any[], sanitizeNumber: SanitizeNumberFn) => {
  if (controlCuentas?.cuentasPorPagar) {
    const cxP = controlCuentas.cuentasPorPagar;
    return {
      comprasRegistradas: sanitizeNumber(cxP.compras_registradas ?? cxP.comprasRegistradas ?? cxP.compras ?? compras.length),
      totalComprado: sanitizeNumber(cxP.total_comprado ?? cxP.totalComprado ?? cxP.total ?? 0),
      totalPagado: sanitizeNumber(cxP.total_pagado ?? cxP.yaPagado ?? cxP.pagado ?? 0)
    };
  }

  const totales = compras.reduce(
    (acc, compra) => {
      const monto = sanitizeNumber(compra?.total_comprado ?? compra?.monto ?? compra?.total ?? 0);
      const pagado = sanitizeNumber(compra?.total_pagado ?? compra?.pagado ?? 0);
      acc.totalComprado += monto;
      acc.totalPagado += Math.min(monto, pagado);
      return acc;
    },
    { totalComprado: 0, totalPagado: 0 }
  );

  return {
    comprasRegistradas: compras.length,
    totalComprado: totales.totalComprado,
    totalPagado: totales.totalPagado
  };
};

export const buildControlCuentasViewModel = ({
  controlCuentas,
  facturas,
  compras,
  sanitizeNumber
}: ControlCuentasViewModelInput) => {
  const clientesConSaldoPendiente = buildClientesConSaldoPendiente(controlCuentas, facturas, sanitizeNumber);
  const comprasPendientesDePago = buildComprasPendientesDePago(controlCuentas, compras, sanitizeNumber);

  const totalPorCobrar = clientesConSaldoPendiente.reduce(
    (total, cliente) => total + resolveClientePendiente(cliente, sanitizeNumber),
    0
  );

  const totalPorPagar = comprasPendientesDePago.reduce(
    (total, compra) => total + resolveCompraPendiente(compra, sanitizeNumber),
    0
  );

  return {
    clientesConSaldoPendiente,
    comprasPendientesDePago,
    totalPorCobrar,
    totalPorPagar,
    balanceNeto: totalPorCobrar - totalPorPagar,
    resumenPorCobrar: buildResumenPorCobrar(controlCuentas, facturas, sanitizeNumber),
    resumenPorPagar: buildResumenPorPagar(controlCuentas, compras, sanitizeNumber)
  };
};