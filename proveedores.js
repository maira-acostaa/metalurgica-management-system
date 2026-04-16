const express = require('express');
const router = express.Router();
const db = require('../database');

// Obtener todos los proveedores (público)
router.get('/', (req, res) => {
  const sql = `SELECT * FROM proveedores ORDER BY created_at DESC`;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: 'Error al obtener proveedores', error: err.message });
    }
    res.json({ proveedores: rows });
  });
});

// Obtener un proveedor por ID (público)
router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM proveedores WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ message: 'Error al obtener proveedor', error: err.message });
    }
    if (!row) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }
    res.json({ proveedor: row });
  });
});

// Crear nuevo proveedor (público)
router.post('/', (req, res) => {
  const { nombre, email, telefono, direccion, rubro, cuit } = req.body;
  
  if (!nombre || !email || !telefono) {
    return res.status(400).json({ message: 'Nombre, email y teléfono son obligatorios' });
  }
  
  const sql = `INSERT INTO proveedores (nombre, email, telefono, direccion, rubro, cuit) 
               VALUES (?, ?, ?, ?, ?, ?)`;
  
  db.run(sql, [nombre, email, telefono, direccion || null, rubro || null, cuit || null], function(err) {
    if (err) {
      return res.status(500).json({ message: 'Error al crear proveedor', error: err.message });
    }
    
    db.get('SELECT * FROM proveedores WHERE id = ?', [this.lastID], (err, row) => {
      if (err) {
        return res.status(500).json({ message: 'Error al obtener proveedor creado', error: err.message });
      }
      res.status(201).json({ message: 'Proveedor creado exitosamente', proveedor: row });
    });
  });
});

// Actualizar proveedor (público)
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { nombre, email, telefono, direccion, rubro, cuit } = req.body;
  
  if (!nombre || !email || !telefono) {
    return res.status(400).json({ message: 'Nombre, email y teléfono son obligatorios' });
  }
  
  const sql = `UPDATE proveedores 
               SET nombre = ?, email = ?, telefono = ?, direccion = ?, rubro = ?, cuit = ?
               WHERE id = ?`;
  
  db.run(sql, [nombre, email, telefono, direccion || null, rubro || null, cuit || null, id], function(err) {
    if (err) {
      return res.status(500).json({ message: 'Error al actualizar proveedor', error: err.message });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }
    
    db.get('SELECT * FROM proveedores WHERE id = ?', [id], (err, row) => {
      if (err) {
        return res.status(500).json({ message: 'Error al obtener proveedor actualizado', error: err.message });
      }
      res.json({ message: 'Proveedor actualizado exitosamente', proveedor: row });
    });
  });
});

// Eliminar proveedor (público)
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM proveedores WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ message: 'Error al eliminar proveedor', error: err.message });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Proveedor no encontrado' });
    }
    
    res.json({ message: 'Proveedor eliminado exitosamente' });
  });
});

module.exports = router;
