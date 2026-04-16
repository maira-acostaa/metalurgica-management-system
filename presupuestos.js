const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('./auth');

router.get('/', (req, res) => {
  const updateVencidosSql = `
    UPDATE presupuestos
    SET estado = 'VENCIDO'
    WHERE activo = 1
      AND estado != 'FACTURADO'
      AND fecha_vencimiento IS NOT NULL
      AND date(fecha_vencimiento) < date('now')
  `;

  db.run(updateVencidosSql, [], () => {
    db.all('SELECT * FROM presupuestos WHERE activo = 1 ORDER BY fecha DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ presupuestos: rows });
    });
  });
});


router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM presupuestos WHERE id = ? AND activo = 1', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }
    res.json({ presupuesto: row });
  });
});

router.post('/', (req, res) => {
  const { nombreCliente, email, telefono, tipoTrabajo, mensaje, fecha_vencimiento } = req.body;
  
  if (!nombreCliente || !email || !tipoTrabajo) {
    return res.status(400).json({ error: 'Nombre, email y tipo de trabajo son obligatorios' });
  }

  const fechaActual = new Date().toISOString();
  const fechaVencimiento = fecha_vencimiento || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  
  
  let usuario_id = null;
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET || 'malabiash_secret_key_2024';
      const decoded = jwt.verify(token, JWT_SECRET);
      usuario_id = decoded.userId;
    } catch (err) {
      
    }
  }

  const sql = 'INSERT INTO presupuestos (nombreCliente, email, telefono, tipoTrabajo, mensaje, fecha, fecha_vencimiento, usuario_id, estado, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)';
  
  db.run(sql, [nombreCliente, email, telefono, tipoTrabajo, mensaje, fechaActual, fechaVencimiento, usuario_id, 'PENDIENTE'], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ 
      mensaje: 'Presupuesto enviado exitosamente',
      id: this.lastID 
    });
  });
});

router.put('/:id', authenticateToken, (req, res) => {
  
  if (req.user.rol !== 'empleado') {
    return res.status(403).json({ 
      error: 'Acceso denegado. Solo empleados pueden actualizar presupuestos.' 
    });
  }

  const { id } = req.params;
  const { nombreCliente, email, telefono, tipoTrabajo, mensaje, estado, fecha_vencimiento } = req.body;

  const estadosValidos = ['PENDIENTE', 'RESEÑADO', 'FACTURADO', 'VENCIDO'];
  const estadoFinal = estado ? estado.toUpperCase().replace('SEÑADO', 'RESEÑADO') : 'PENDIENTE';
  if (!estadosValidos.includes(estadoFinal)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }

  const sql = `UPDATE presupuestos 
               SET nombreCliente = ?, email = ?, telefono = ?, tipoTrabajo = ?, mensaje = ?, estado = ?, fecha_vencimiento = ?
               WHERE id = ? AND activo = 1`;
  
  db.run(sql, [nombreCliente, email, telefono, tipoTrabajo, mensaje, estadoFinal, fecha_vencimiento || null, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }
    res.json({ mensaje: 'Presupuesto actualizado exitosamente' });
  });
});

router.delete('/:id', authenticateToken, (req, res) => {
  
  if (req.user.rol !== 'empleado') {
    return res.status(403).json({ 
      error: 'Acceso denegado. Solo empleados pueden eliminar presupuestos.' 
    });
  }

  const { id } = req.params;
  
  db.run('UPDATE presupuestos SET activo = 0 WHERE id = ? AND activo = 1', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }
    res.json({ mensaje: 'Presupuesto desactivado exitosamente' });
  });
});

module.exports = router;
