const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken, requireEmployee } = require('./auth');

router.get('/', authenticateToken, requireEmployee, (req, res) => {
  const sql = `
    SELECT
      c.*,
      p.nombre AS proveedor_nombre
    FROM compras c
    LEFT JOIN proveedores p ON c.proveedor_id = p.id
    ORDER BY c.created_at DESC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: 'Error al obtener compras', error: err.message });
    }
    res.json({ compras: rows || [] });
  });
});

router.post('/', authenticateToken, requireEmployee, (req, res) => {
  const {
    proveedor_id,
    numero_compra,
    descripcion,
    total,
    fecha_vencimiento,
    estado
  } = req.body;

  if (!proveedor_id || !numero_compra || Number(total) <= 0) {
    return res.status(400).json({
      message: 'proveedor_id, numero_compra y total (>0) son obligatorios'
    });
  }

  const estadoFinal = estado || 'pendiente';

  const sql = `
    INSERT INTO compras (
      numero_compra,
      proveedor_id,
      descripcion,
      total,
      pagado,
      fecha_vencimiento,
      estado,
      created_at
    ) VALUES (?, ?, ?, ?, 0, ?, ?, datetime('now'))
  `;

  const params = [
    String(numero_compra).trim(),
    Number(proveedor_id),
    descripcion || null,
    Number(total),
    fecha_vencimiento || null,
    estadoFinal
  ];

  db.run(sql, params, function(err) {
    if (err) {
      return res.status(500).json({ message: 'Error al registrar compra', error: err.message });
    }

    db.get(
      `
        SELECT
          c.*,
          p.nombre AS proveedor_nombre
        FROM compras c
        LEFT JOIN proveedores p ON c.proveedor_id = p.id
        WHERE c.id = ?
      `,
      [this.lastID],
      (err2, row) => {
        if (err2) {
          return res.status(500).json({ message: 'Compra registrada, pero no se pudo recuperar', error: err2.message });
        }
        res.status(201).json({ message: 'Compra registrada', compra: row });
      }
    );
  });
});

module.exports = router;