const express = require('express');
const router = express.Router();
const db = require('../database');
const PresupuestoPDFGenerator = require('../services/presupuestoPDFGenerator');
const FacturaPDFGenerator = require('../services/facturaPDFGenerator');

// Mensaje simple para el índice del endpoint
router.get('/', (req, res) => {
  res.send('Endpoints disponibles: /presupuesto/:id, /estructura/:id, /factura/:id');
});

/**
 * GET /api/pdf/presupuesto/:id
 * Genera el HTML del presupuesto (para descargar como PDF desde el cliente)
 */
router.get('/presupuesto/:id', (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT 
      pd.*,
      c.nombre as cliente_nombre,
      c.email as cliente_email,
      c.telefono as cliente_telefono
    FROM presupuestos_detallados pd
    LEFT JOIN clientes c ON pd.cliente_id = c.id
    WHERE pd.id = ?
  `;

  db.get(sql, [id], (err, presupuesto) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!presupuesto) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }

    // Obtener items del presupuesto
    const itemsSql = 'SELECT * FROM presupuesto_items WHERE presupuesto_id = ?';
    
    db.all(itemsSql, [id], (err, items) => {
      if (err) {
        console.error('Error al obtener items:', err);
        presupuesto.items = [];
      } else {
        presupuesto.items = items;
      }

      // Generar estructura del PDF
      const pdfGenerator = new PresupuestoPDFGenerator();
      const datoEmpresa = pdfGenerator.obtenerEmpresaPorDefecto();
      
      // Generar HTML
      const htmlContenido = pdfGenerator.aHTMLSimple(presupuesto, datoEmpresa);

      res.json({
        success: true,
        html: htmlContenido,
        presupuesto: presupuesto
      });
    });
  });
});

/**
 * GET /api/pdf/presupuesto/:id/html
 * Obtiene solo el HTML del presupuesto
 */
router.get('/presupuesto/:id/html', (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT 
      pd.*,
      c.nombre as cliente_nombre,
      c.email as cliente_email,
      c.telefono as cliente_telefono
    FROM presupuestos_detallados pd
    LEFT JOIN clientes c ON pd.cliente_id = c.id
    WHERE pd.id = ?
  `;

  db.get(sql, [id], (err, presupuesto) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!presupuesto) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }

    // Obtener items
    const itemsSql = 'SELECT * FROM presupuesto_items WHERE presupuesto_id = ?';
    
    db.all(itemsSql, [id], (err, items) => {
      if (err) {
        presupuesto.items = [];
      } else {
        presupuesto.items = items;
      }

      const pdfGenerator = new PresupuestoPDFGenerator();
      const datoEmpresa = pdfGenerator.obtenerEmpresaPorDefecto();
      const htmlContenido = pdfGenerator.aHTMLSimple(presupuesto, datoEmpresa);

      // Devolver directamente HTML (puede ser abierto en navegador o descargado)
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(htmlContenido);
    });
  });
});

/**
 * GET /api/pdf/estructura/:id
 * Obtiene la estructura del presupuesto para generación de PDF en cliente
 */
router.get('/estructura/:id', (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT 
      pd.*,
      c.nombre as cliente_nombre,
      c.email as cliente_email,
      c.telefono as cliente_telefono
    FROM presupuestos_detallados pd
    LEFT JOIN clientes c ON pd.cliente_id = c.id
    WHERE pd.id = ?
  `;

  db.get(sql, [id], (err, presupuesto) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!presupuesto) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }

    const itemsSql = 'SELECT * FROM presupuesto_items WHERE presupuesto_id = ?';
    
    db.all(itemsSql, [id], (err, items) => {
      if (err) {
        presupuesto.items = [];
      } else {
        presupuesto.items = items;
      }

      const pdfGenerator = new PresupuestoPDFGenerator();
      const datoEmpresa = pdfGenerator.obtenerEmpresaPorDefecto();
      const estructura = pdfGenerator.generarPresupuesto(presupuesto, datoEmpresa);

      res.json({
        success: true,
        estructura: estructura,
        presupuesto: presupuesto
      });
    });
  });
});

/**
 * GET /api/pdf/factura/:id
 * Genera el HTML de una factura
 */
router.get('/factura/:id', (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT 
      f.*,
      c.nombre as cliente_nombre,
      c.email as cliente_email,
      c.telefono as cliente_telefono
    FROM facturas f
    LEFT JOIN clientes c ON f.cliente_id = c.id
    WHERE f.id = ?
  `;

  db.get(sql, [id], (err, factura) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!factura) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    const pdfGenerator = new FacturaPDFGenerator();
    const datoEmpresa = pdfGenerator.obtenerEmpresaPorDefecto();
    const htmlContenido = pdfGenerator.generarFacturaHTML(factura, datoEmpresa);

    res.json({
      success: true,
      html: htmlContenido,
      factura: factura
    });
  });
});

/**
 * GET /api/pdf/factura/:id/html
 * Obtiene solo el HTML de la factura para impresión
 */
router.get('/factura/:id/html', (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT 
      f.*,
      c.nombre as cliente_nombre,
      c.email as cliente_email,
      c.telefono as cliente_telefono
    FROM facturas f
    LEFT JOIN clientes c ON f.cliente_id = c.id
    WHERE f.id = ?
  `;

  db.get(sql, [id], (err, factura) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!factura) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    const pdfGenerator = new FacturaPDFGenerator();
    const datoEmpresa = pdfGenerator.obtenerEmpresaPorDefecto();
    const htmlContenido = pdfGenerator.generarFacturaHTML(factura, datoEmpresa);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(htmlContenido);
  });
});

module.exports = router;
