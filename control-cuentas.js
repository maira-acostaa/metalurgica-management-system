const express = require('express');
const router = express.Router();
const { authenticateToken, requireEmployee } = require('./auth');
const { getControlCuentas } = require('../services/controlCuentasService');

// GET /api/control-cuentas
router.get('/', authenticateToken, requireEmployee, async (req, res) => {
  try {
    const data = await getControlCuentas();
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error en control-cuentas:', err);
    res.status(500).json({ success: false, message: 'Error al calcular control de cuentas' });
  }
});

module.exports = router;
