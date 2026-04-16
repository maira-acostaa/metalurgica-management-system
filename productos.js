const express = require('express');
const router = express.Router();
const db = require('../database');

// GET - Obtener todos los productos
router.get('/', (req, res) => {
  db.all('SELECT * FROM productos', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ productos: rows });
  });
});

// GET - Obtener un producto por ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM productos WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json({ producto: row });
  });
});

// POST - Crear nuevo producto
router.post('/', (req, res) => {
  const { nombre, descripcion, precio, imagenUrl, categoria } = req.body;
  
  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }

  const sql = 'INSERT INTO productos (nombre, descripcion, precio, imagenUrl, categoria) VALUES (?, ?, ?, ?, ?)';
  db.run(sql, [nombre, descripcion, precio, imagenUrl, categoria], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ 
      mensaje: 'Producto creado exitosamente',
      id: this.lastID 
    });
  });
});

// PUT - Actualizar producto
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio, imagenUrl, categoria } = req.body;

  const sql = `UPDATE productos 
               SET nombre = ?, descripcion = ?, precio = ?, imagenUrl = ?, categoria = ?
               WHERE id = ?`;
  
  db.run(sql, [nombre, descripcion, precio, imagenUrl, categoria, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json({ mensaje: 'Producto actualizado exitosamente' });
  });
});

// DELETE - Eliminar producto
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM productos WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json({ mensaje: 'Producto eliminado exitosamente' });
  });
});

module.exports = router;
