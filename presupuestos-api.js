const express = require('express');
const router = express.Router();
const presupuestoCalc = require('../services/presupuestoCalculator');

// GET informativo para mostrar un mensaje simple en el navegador
router.get('/', (req, res) => {
  res.send('API de cálculos lista. Usa los endpoints POST /calcular*, GET /multiplicador.');
});

/**
 * POST /api/presupuestos/calcular
 * Calcula un presupuesto sin guardarlo (para preview)
 */
router.post('/calcular', (req, res) => {
  try {
    const {
      costoMaterial,
      costoManoObra,
      porcentajeDesperdicio,
      margenGanancia
    } = req.body;

    const resultado = presupuestoCalc.calcularPresupuesto({
      costoMaterial: parseFloat(costoMaterial) || 0,
      costoManoObra: parseFloat(costoManoObra) || 0,
      porcentajeDesperdicio: parseFloat(porcentajeDesperdicio) || 10,
      margenGanancia: parseFloat(margenGanancia) || 30
    });

    res.json({
      success: true,
      presupuesto: resultado
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/presupuestos/calcular-material
 * Calcula costo de material basado en superficie
 */
router.post('/calcular-material', (req, res) => {
  try {
    const {
      precioPorMetro,
      largo,
      ancho,
      cantidad
    } = req.body;

    const resultado = presupuestoCalc.calcularCostoMaterial({
      precioPorMetro: parseFloat(precioPorMetro) || 0,
      largo: parseFloat(largo) || 0,
      ancho: parseFloat(ancho) || 0,
      cantidad: parseInt(cantidad) || 1
    });

    res.json({
      success: true,
      material: resultado
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/presupuestos/calcular-mano-obra
 * Calcula costo de mano de obra
 */
router.post('/calcular-mano-obra', (req, res) => {
  try {
    const {
      tarifaHoraria,
      horasEstimadas,
      multiplicadorComplejidad,
      nivelComplejidad
    } = req.body;

    let multiplicador = 1;
    if (nivelComplejidad) {
      multiplicador = presupuestoCalc.obtenerMultiplicadorComplejidad(nivelComplejidad);
    } else if (multiplicadorComplejidad) {
      multiplicador = parseFloat(multiplicadorComplejidad);
    }

    const resultado = presupuestoCalc.calcularCostoManoObra({
      tarifaHoraria: parseFloat(tarifaHoraria) || 0,
      horasEstimadas: parseFloat(horasEstimadas) || 0,
      multiplicadorComplejidad: multiplicador
    });

    res.json({
      success: true,
      manoObra: resultado
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/presupuestos/calcular-completo
 * Calcula presupuesto completo con artículos
 */
router.post('/calcular-completo', (req, res) => {
  try {
    const {
      articulos,
      porcentajeDesperdicio,
      margenGanancia
    } = req.body;

    const resultado = presupuestoCalc.calcularPresupuestoArticulos({
      articulos: articulos || [],
      porcentajeDesperdicio: parseFloat(porcentajeDesperdicio) || 10,
      margenGanancia: parseFloat(margenGanancia) || 30
    });

    res.json({
      success: true,
      presupuesto: resultado
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/presupuestos/multiplicador/:complejidad
 * Obtiene el multiplicador para un nivel de complejidad
 */
router.get('/multiplicador/:complejidad', (req, res) => {
  const { complejidad } = req.params;
  
  const multiplicador = presupuestoCalc.obtenerMultiplicadorComplejidad(complejidad);
  
  res.json({
    success: true,
    complejidad,
    multiplicador
  });
});

module.exports = router;
