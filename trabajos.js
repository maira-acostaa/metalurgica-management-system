const express = require('express');
const router = express.Router();
const db = require('../database');

// GET - Obtener todos los trabajos
router.get('/', (req, res) => {
  db.all('SELECT * FROM trabajos ORDER BY fecha DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ trabajos: rows });
  });
});

// GET - Obtener un trabajo por ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM trabajos WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Trabajo no encontrado' });
    }
    res.json({ trabajo: row });
  });
});

// POST - Crear nuevo trabajo
router.post('/', (req, res) => {
  const { titulo, descripcion, imagenUrl, fecha } = req.body;
  
  if (!titulo) {
    return res.status(400).json({ error: 'El título es obligatorio' });
  }

  const fechaActual = fecha || new Date().toISOString().split('T')[0];
  const sql = 'INSERT INTO trabajos (titulo, descripcion, imagenUrl, fecha) VALUES (?, ?, ?, ?)';
  
  db.run(sql, [titulo, descripcion, imagenUrl, fechaActual], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ 
      mensaje: 'Trabajo creado exitosamente',
      id: this.lastID 
    });
  });
});

// PUT - Actualizar trabajo
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { titulo, descripcion, imagenUrl, fecha } = req.body;

  const sql = `UPDATE trabajos 
               SET titulo = ?, descripcion = ?, imagenUrl = ?, fecha = ?
               WHERE id = ?`;
  
  db.run(sql, [titulo, descripcion, imagenUrl, fecha, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Trabajo no encontrado' });
    }
    res.json({ mensaje: 'Trabajo actualizado exitosamente' });
  });
});

// DELETE - Eliminar trabajo
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM trabajos WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Trabajo no encontrado' });
    }
    res.json({ mensaje: 'Trabajo eliminado exitosamente' });
  });
});

module.exports = router;
