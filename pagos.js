const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken, requireEmployee } = require('./auth');

router.get('/', authenticateToken, requireEmployee, (req, res) => {
  const { tipo_pago, metodo_pago, desde, hasta, estado_cliente } = req.query;
  const filtros = [];
  const params = [];

  if (tipo_pago) {
    filtros.push('p.tipo_pago = ?');
    params.push(String(tipo_pago));
  }

  if (metodo_pago) {
    filtros.push('p.metodo_pago = ?');
    params.push(String(metodo_pago));
  }

  if (desde) {
    filtros.push('date(p.fecha_pago) >= date(?)');
    params.push(String(desde));
  }

  if (hasta) {
    filtros.push('date(p.fecha_pago) <= date(?)');
    params.push(String(hasta));
  }

  if (estado_cliente) {
    filtros.push('pd.estado = ?');
    params.push(String(estado_cliente).toUpperCase());
  }

  filtros.push('(f.id IS NULL OR f.activo = 1)');

  const whereClause = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';

  const sql = `SELECT p.*, c.nombre as cliente_nombre, prov.nombre as proveedor_nombre, f.numero_factura, co.numero_compra, pd.estado as estado_presupuesto
               FROM pagos p
               LEFT JOIN clientes c ON p.cliente_id = c.id
               LEFT JOIN proveedores prov ON p.proveedor_id = prov.id
               LEFT JOIN facturas f ON p.factura_id = f.id
               LEFT JOIN presupuestos_detallados pd ON f.presupuesto_id = pd.id
               LEFT JOIN compras co ON p.compra_id = co.id
               ${whereClause}
               ORDER BY p.created_at DESC`;
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ message: 'Error al obtener pagos', error: err.message });
    res.json({ pagos: rows });
  });
});

router.post('/', authenticateToken, requireEmployee, (req, res) => {
  const { cliente_id, proveedor_id, factura_id, compra_id, tipo_pago, monto, metodo_pago, fecha_pago, referencia, observaciones } = req.body;

  if (!tipo_pago || !monto || Number(monto) <= 0) {
    return res.status(400).json({ message: 'tipo_pago y monto (>0) son requeridos' });
  }

  const metodosValidos = ['efectivo', 'transferencia'];
  if (metodo_pago && !metodosValidos.includes(metodo_pago)) {
    return res.status(400).json({ message: 'Método de pago inválido' });
  }

  const sql = `INSERT INTO pagos (cliente_id, proveedor_id, factura_id, compra_id, tipo_pago, monto, metodo_pago, fecha_pago, referencia, observaciones, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`;
  const params = [cliente_id || null, proveedor_id || null, factura_id || null, compra_id || null, tipo_pago, monto, metodo_pago || null, fecha_pago || null, referencia || null, observaciones || null];

  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ message: 'Error al registrar pago', error: err.message });

    const newId = this.lastID;

    if (factura_id) {
      
      db.get('SELECT IFNULL(SUM(monto),0) AS suma FROM pagos WHERE factura_id = ? AND tipo_pago = "ingreso"', [factura_id], (err2, row2) => {
        if (!err2) {
          db.get('SELECT total FROM facturas WHERE id = ?', [factura_id], (err3, frow) => {
            if (!err3 && frow) {
              const totalFactura = Number(frow.total || 0);
              const sumaPagos = Number(row2.suma || 0);
              if (sumaPagos >= totalFactura && totalFactura > 0) {
                db.run('UPDATE facturas SET estado = ? WHERE id = ?', ['pagada', factura_id]);
              }
            }
          });
        }
      });
    }

    if (compra_id) {
      
      db.get('SELECT IFNULL(SUM(monto),0) AS suma FROM pagos WHERE compra_id = ? AND tipo_pago = "egreso"', [compra_id], (err4, row4) => {
        if (!err4) {
          db.get('SELECT total FROM compras WHERE id = ?', [compra_id], (err5, crow) => {
            if (!err5 && crow) {
              const totalCompra = Number(crow.total || 0);
              const sumaPagos = Number(row4.suma || 0);
              db.run('UPDATE compras SET pagado = ? WHERE id = ?', [sumaPagos, compra_id]);
              if (sumaPagos >= totalCompra && totalCompra > 0) {
                db.run('UPDATE compras SET estado = ? WHERE id = ?', ['pagado', compra_id]);
              }
            }
          });
        }
      });
    }

    db.get('SELECT * FROM pagos WHERE id = ?', [newId], (err6, newRow) => {
      if (err6) return res.status(500).json({ message: 'Pago registrado, pero error al obtener registro', error: err6.message });
      res.status(201).json({ message: 'Pago registrado', pago: newRow });
    });
  });
});

module.exports = router;
