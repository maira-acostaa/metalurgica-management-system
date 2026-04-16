const express = require('express');
const db = require('../database');
const { authenticateToken, requireEmployee } = require('./auth');

const router = express.Router();

// Obtener clientes con filtros
router.get('/', (req, res) => {
  const {
    q,
    categoria,
    estado = 'activo',
    desde,
    hasta,
    limit,
    offset
  } = req.query;

  const filtros = [];
  const params = [];

  if (estado === 'activo') {
    filtros.push('activo = 1');
  } else if (estado === 'inactivo') {
    filtros.push('activo = 0');
  }

  if (q && String(q).trim()) {
    filtros.push('nombre LIKE ?');
    params.push(`%${String(q).trim()}%`);
  }

  const categoriesValidas = ['Particular', 'Empresa', 'Constructor/Obra', 'Cliente Frecuente'];
  if (categoria && categoriesValidas.includes(String(categoria))) {
    filtros.push('categoria = ?');
    params.push(String(categoria));
  }

  if (desde) {
    filtros.push('date(created_at) >= date(?)');
    params.push(String(desde));
  }

  if (hasta) {
    filtros.push('date(created_at) <= date(?)');
    params.push(String(hasta));
  }

  const whereClause = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';
  const limitValue = Math.min(Number(limit) || 100, 200);
  const offsetValue = Number(offset) || 0;

  const query = `
    SELECT id, nombre, email, telefono, direccion, categoria, created_at, activo
    FROM clientes
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;
  
  db.all(query, [...params, limitValue, offsetValue], (err, rows) => {
    if (err) {
      console.error('❌ Error al obtener clientes:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al obtener clientes' 
      });
    }
    
    res.json({ 
      success: true, 
      clientes: rows,
      limit: limitValue,
      offset: offsetValue
    });
  });
});

// Obtener clientes filtrados por categoría
router.get('/categoria/:categoria', authenticateToken, requireEmployee, (req, res) => {
  const { categoria } = req.params;
  
  const categoriesValidas = ['Particular', 'Empresa', 'Constructor/Obra', 'Cliente Frecuente'];
  if (!categoriesValidas.includes(categoria)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Categoría inválida' 
    });
  }

  const query = `
    SELECT id, nombre, email, telefono, direccion, categoria, created_at, activo
    FROM clientes 
    WHERE categoria = ? AND activo = 1
    ORDER BY nombre ASC
  `;
  
  db.all(query, [categoria], (err, rows) => {
    if (err) {
      console.error('Error al obtener clientes por categoría:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al obtener clientes' 
      });
    }
    
    res.json({ 
      success: true, 
      clientes: rows,
      categoria: categoria,
      count: rows.length
    });
  });
});

// Crear nuevo cliente
router.post('/', authenticateToken, requireEmployee, (req, res) => {
  const { nombre, email, telefono, direccion, categoria = 'Particular' } = req.body;

  if (!nombre || !email || !telefono) {
    return res.status(400).json({ 
      success: false, 
      message: 'Nombre, email y teléfono son obligatorios' 
    });
  }

  // Validar categoría
  const categoriesValidas = ['Particular', 'Empresa', 'Constructor/Obra', 'Cliente Frecuente'];
  const categoriaFinal = categoriesValidas.includes(categoria) ? categoria : 'Particular';

  // Verificar si el email ya existe
  db.get('SELECT id FROM clientes WHERE email = ?', [email], (err, row) => {
    if (err) {
      console.error('Error al verificar email:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor' 
      });
    }

    if (row) {
      return res.status(409).json({ 
        success: false, 
        message: 'Ya existe un cliente con ese email' 
      });
    }

    // Insertar nuevo cliente
    const insertQuery = `
      INSERT INTO clientes (nombre, email, telefono, direccion, categoria, created_at, activo) 
      VALUES (?, ?, ?, ?, ?, datetime('now'), 1)
    `;

    db.run(insertQuery, [nombre, email, telefono, direccion || null, categoriaFinal], function(err) {
      if (err) {
        console.error('Error al crear cliente:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Error al crear cliente' 
        });
      }
      
      // Obtener el cliente recién creado
      db.get('SELECT * FROM clientes WHERE id = ?', [this.lastID], (err, newClient) => {
        if (err) {
          console.error('Error al obtener cliente creado:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Cliente creado pero error al obtener datos' 
          });
        }
        
        res.status(201).json({ 
          success: true, 
          message: 'Cliente creado exitosamente',
          cliente: newClient
        });
      });
    });
  });
});

// Obtener cliente por ID
router.get('/:id', authenticateToken, requireEmployee, (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM clientes WHERE id = ? AND activo = 1', [id], (err, row) => {
    if (err) {
      console.error('Error al obtener cliente:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al obtener cliente' 
      });
    }
    
    if (!row) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cliente no encontrado' 
      });
    }
    
    res.json({ 
      success: true, 
      cliente: row 
    });
  });
});

// Actualizar cliente
router.put('/:id', authenticateToken, requireEmployee, (req, res) => {
  const { id } = req.params;
  const { nombre, email, telefono, direccion, categoria = 'Particular', activo } = req.body;

  if (!nombre || !email || !telefono) {
    return res.status(400).json({ 
      success: false, 
      message: 'Nombre, email y teléfono son obligatorios' 
    });
  }

  // Validar categoría
  const categoriesValidas = ['Particular', 'Empresa', 'Constructor/Obra', 'Cliente Frecuente'];
  const categoriaFinal = categoriesValidas.includes(categoria) ? categoria : 'Particular';

  const activoValue = typeof activo === 'undefined'
    ? null
    : (activo === true || activo === 1 || activo === '1' || activo === 'activo' ? 1 : 0);

  const updateQuery = `
    UPDATE clientes 
    SET nombre = ?, email = ?, telefono = ?, direccion = ?, categoria = ?, activo = COALESCE(?, activo), updated_at = datetime('now')
    WHERE id = ?
  `;

  db.run(updateQuery, [nombre, email, telefono, direccion || null, categoriaFinal, activoValue, id], function(err) {
    if (err) {
      console.error('Error al actualizar cliente:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al actualizar cliente' 
      });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cliente no encontrado' 
      });
    }
    
    // Obtener el cliente actualizado
    db.get('SELECT * FROM clientes WHERE id = ?', [id], (err, updatedClient) => {
      if (err) {
        console.error('Error al obtener cliente actualizado:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Cliente actualizado pero error al obtener datos' 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Cliente actualizado exitosamente',
        cliente: updatedClient
      });
    });
  });
});

// Eliminar cliente (borrado lógico)
router.delete('/:id', authenticateToken, requireEmployee, (req, res) => {
  const { id } = req.params;

  const facturasActivasSql = 'SELECT COUNT(*) as count FROM facturas WHERE cliente_id = ? AND activo = 1';

  db.get(facturasActivasSql, [id], (countErr, row) => {
    if (countErr) {
      console.error('Error al verificar facturas activas:', countErr);
      return res.status(500).json({
        success: false,
        message: 'Error al verificar facturas activas'
      });
    }

    if (row && row.count > 0) {
      return res.status(409).json({
        success: false,
        message: 'No se puede eliminar el cliente porque tiene facturas activas'
      });
    }

    db.run("UPDATE clientes SET activo = 0, updated_at = datetime('now') WHERE id = ? AND activo = 1", [id], function(err) {
      if (err) {
        console.error('Error al eliminar cliente:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Error al eliminar cliente' 
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Cliente no encontrado' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Cliente desactivado exitosamente' 
      });
    });
  });
});

// Buscar clientes
router.get('/search/:term', authenticateToken, requireEmployee, (req, res) => {
  const { term } = req.params;
  
  if (term.length < 3) {
    return res.status(400).json({ 
      success: false, 
      message: 'El término de búsqueda debe tener al menos 3 caracteres' 
    });
  }
  
  const searchQuery = `
    SELECT id, nombre, email, telefono, direccion, categoria, created_at, activo
    FROM clientes 
    WHERE nombre LIKE ? AND activo = 1
    ORDER BY created_at DESC
  `;
  
  const searchTerm = `%${term}%`;
  
  db.all(searchQuery, [searchTerm], (err, rows) => {
    if (err) {
      console.error('Error al buscar clientes:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error al buscar clientes' 
      });
    }
    
    res.json({ 
      success: true, 
      clientes: rows,
      count: rows.length
    });
  });
});

module.exports = router;