const express = require('express');
const router = express.Router();
const db = require('../database');

router.post('/', (req, res) => {
  const { 
    cliente_id, 
    numero_factura, 
    descripcion, 
    monto, 
    fecha_vencimiento, 
    metodo_pago,
    telefono_cliente,
    observaciones 
  } = req.body;

  if (!cliente_id || !numero_factura || !monto) {
    return res.status(400).json({ 
      error: 'Los campos cliente_id, numero_factura y monto son obligatorios' 
    });
  }

  if (monto <= 0) {
    return res.status(400).json({ 
      error: 'El monto debe ser mayor a 0' 
    });
  }

  const metodoPagoFinal = metodo_pago || 'efectivo';
  const metodosValidos = ['efectivo', 'transferencia'];
  if (!metodosValidos.includes(metodoPagoFinal)) {
    return res.status(400).json({ 
      error: 'Método de pago inválido' 
    });
  }

  db.get('SELECT nombre, email FROM clientes WHERE id = ? AND activo = 1', [cliente_id], (err, cliente) => {
    if (err) {
      console.error('Error al obtener cliente:', err);
      return res.status(500).json({ 
        error: 'Error al obtener datos del cliente' 
      });
    }

    if (!cliente) {
      return res.status(400).json({ 
        error: 'El cliente no existe' 
      });
    }

    const sql = `
      INSERT INTO facturas (
        numero_factura, cliente_id, nombre_cliente, email_cliente, telefono_cliente, descripcion, total, 
        fecha_vencimiento, metodo_pago, observaciones, estado, created_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?)
    `;

    const params = [
      numero_factura,
      cliente_id,
      cliente.nombre,
      cliente.email,
      telefono_cliente || '',
      descripcion || '',
      monto,
      fecha_vencimiento || null,
      metodoPagoFinal,
      observaciones || '',
      new Date().toISOString(),
      req.user && req.user.userId ? req.user.userId : null
    ];

    db.run(sql, params, function(err) {
      if (err) {
        console.error('Error al crear factura:', err);
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          return res.status(400).json({ 
            error: 'El número de factura ya existe' 
          });
        }
        return res.status(500).json({ 
          error: 'Error interno del servidor al crear la factura' 
        });
      }

      res.status(201).json({ 
        mensaje: 'Factura creada exitosamente',
        factura_id: this.lastID,
        numero_factura: numero_factura
      });
    });
  });
});

router.get('/', (req, res) => {
  const updateVencidas = `
    UPDATE facturas
    SET estado = 'vencida'
    WHERE activo = 1
      AND estado = 'pendiente'
      AND (
        (fecha_vencimiento IS NOT NULL AND date(fecha_vencimiento) < date('now'))
        OR
        (fecha_vencimiento IS NULL AND date(created_at, '+30 days') < date('now'))
      )
  `;

  db.run(updateVencidas, [], (updateErr) => {
    if (updateErr) {
      console.error('Error al actualizar facturas vencidas:', updateErr.message);
    }

    const sql = `
      SELECT f.*, c.nombre as nombre_cliente 
      FROM facturas f
      LEFT JOIN clientes c ON f.cliente_id = c.id
      WHERE f.activo = 1
      ORDER BY f.created_at DESC
    `;

    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error('Error al obtener facturas:', err);
        return res.status(500).json({ error: err.message });
      }

      res.json({ facturas: rows || [] });
    });
  });
});

router.get('/:id', (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT f.*, c.nombre as nombre_cliente, c.email, c.telefono 
    FROM facturas f
    LEFT JOIN clientes c ON f.cliente_id = c.id
    WHERE f.id = ? AND f.activo = 1
  `;

  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error('Error al obtener factura:', err);
      return res.status(500).json({ error: err.message });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }
    
    res.json(row);
  });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;

  db.run('UPDATE facturas SET activo = 0 WHERE id = ? AND activo = 1', [id], function(err) {
    if (err) {
      console.error('Error al eliminar factura:', err);
      return res.status(500).json({ error: 'Error al eliminar factura' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    res.json({ mensaje: 'Factura desactivada exitosamente' });
  });
});

module.exports = router;