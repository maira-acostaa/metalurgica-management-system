const db = require('../database');

function getTotalsFacturas() {
  return new Promise((resolve, reject) => {
    const totals = {};
    const sql = `
      SELECT
        f.id,
        f.total,
        IFNULL((
          SELECT SUM(p.monto)
          FROM pagos p
          WHERE p.tipo_pago = 'ingreso'
            AND p.factura_id = f.id
        ), 0) AS cobrado
      FROM facturas f
      WHERE f.activo = 1
    `;

    db.all(sql, [], (err, rows) => {
      if (err) return reject(err);

      const facturasEmitidas = rows.length;
      const totalFacturado = rows.reduce((sum, r) => sum + Number(r.total || 0), 0);
      const totalCobrado = rows.reduce((sum, r) => {
        const total = Number(r.total || 0);
        const cobrado = Number(r.cobrado || 0);
        return sum + Math.min(total, cobrado);
      }, 0);

      totals.facturas_emitidas = facturasEmitidas;
      totals.total_facturado = totalFacturado;
      totals.total_cobrado = totalCobrado;

      db.get(
        `SELECT IFNULL(SUM(total),0) AS total_vencido
         FROM facturas
         WHERE activo = 1 AND (estado != 'pagada' AND fecha_vencimiento IS NOT NULL AND date(fecha_vencimiento) < date('now'))`,
        [],
        (err2, row2) => {
          if (err2) return reject(err2);
          totals.total_vencido = row2.total_vencido || 0;
          totals.saldo_pendiente = Math.max(0, (totals.total_facturado - totals.total_cobrado));
          resolve(totals);
        }
      );
    });
  });
}

function getDetallesClientesPendientes() {
  return new Promise((resolve, reject) => {
    // Calcular por cliente: total facturado - total cobrado (pagos tipo 'ingreso')
    const sql = `
      SELECT
        c.id,
        c.nombre,
        IFNULL(SUM(f.total),0) AS total_facturado,
        IFNULL((SELECT SUM(p.monto) FROM pagos p WHERE p.tipo_pago = 'ingreso' AND p.factura_id IN (SELECT id FROM facturas WHERE cliente_id = c.id)),0) AS total_cobrado,
        (IFNULL(SUM(f.total),0) - IFNULL((SELECT SUM(p.monto) FROM pagos p WHERE p.tipo_pago = 'ingreso' AND p.factura_id IN (SELECT id FROM facturas WHERE cliente_id = c.id)),0)) AS pendiente
      FROM clientes c
      LEFT JOIN facturas f ON f.cliente_id = c.id
      WHERE c.activo = 1 AND (f.activo = 1 OR f.id IS NULL)
      GROUP BY c.id
      HAVING pendiente > 0
      ORDER BY pendiente DESC
    `;

    db.all(sql, [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function getTotalsCompras() {
  return new Promise((resolve, reject) => {
    const totals = {};
    const sql = `
      SELECT
        c.id,
        c.total,
        IFNULL((
          SELECT SUM(p.monto)
          FROM pagos p
          WHERE p.tipo_pago = 'egreso'
            AND p.compra_id = c.id
        ), 0) AS pagado
      FROM compras c
    `;

    db.all(sql, [], (err, rows) => {
      if (err) return reject(err);

      const comprasRegistradas = rows.length;
      const totalComprado = rows.reduce((sum, r) => sum + Number(r.total || 0), 0);
      const totalPagado = rows.reduce((sum, r) => {
        const total = Number(r.total || 0);
        const pagado = Number(r.pagado || 0);
        return sum + Math.min(total, pagado);
      }, 0);

      totals.compras_registradas = comprasRegistradas;
      totals.total_comprado = totalComprado;
      totals.total_pagado = totalPagado;

      totals.deuda_pendiente = Math.max(0, (totals.total_comprado - totals.total_pagado));
      totals.saldo_pendiente = totals.deuda_pendiente;
      resolve(totals);
    });
  });
}

function getDetallesProveedoresPendientes() {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        prov.id,
        prov.nombre,
        IFNULL(SUM(c.total),0) AS total_comprado,
        IFNULL((SELECT SUM(p.monto) FROM pagos p WHERE p.tipo_pago = 'egreso' AND p.compra_id IN (SELECT id FROM compras WHERE proveedor_id = prov.id)),0) AS total_pagado,
        (IFNULL(SUM(c.total),0) - IFNULL((SELECT SUM(p.monto) FROM pagos p WHERE p.tipo_pago = 'egreso' AND p.compra_id IN (SELECT id FROM compras WHERE proveedor_id = prov.id)),0)) AS pendiente
      FROM proveedores prov
      LEFT JOIN compras c ON c.proveedor_id = prov.id
      GROUP BY prov.id
      HAVING pendiente > 0
      ORDER BY pendiente DESC
    `;

    db.all(sql, [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

async function getControlCuentas() {
  try {
    const facturas = await getTotalsFacturas();
    const clientesPendientes = await getDetallesClientesPendientes();
    const compras = await getTotalsCompras();
    const proveedoresPendientes = await getDetallesProveedoresPendientes();

    const balanceNeto = Number((facturas.saldo_pendiente - compras.saldo_pendiente).toFixed(2));

    return {
      cuentasPorCobrar: {
        facturas_emitidas: facturas.facturas_emitidas,
        total_facturado: Number(facturas.total_facturado || 0),
        total_cobrado: Number(facturas.total_cobrado || 0),
        saldo_pendiente: Number(facturas.saldo_pendiente || 0),
        total_vencido: Number(facturas.total_vencido || 0)
      },
      cuentasPorPagar: {
        compras_registradas: compras.compras_registradas,
        total_comprado: Number(compras.total_comprado || 0),
        total_pagado: Number(compras.total_pagado || 0),
        deuda_pendiente: Number(compras.deuda_pendiente || 0),
        saldo_pendiente: Number(compras.saldo_pendiente || 0)
      },
      balanceNeto: {
        value: balanceNeto
      },
      clientesPendientes,
      proveedoresPendientes
    };
  } catch (err) {
    throw err;
  }
}

module.exports = {
  getControlCuentas
};
