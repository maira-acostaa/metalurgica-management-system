require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005', 'http://localhost:3006'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir archivos públicos desde el frontend/public
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Rutas
const productosRoutes = require('./routes/productos');
const trabajosRoutes = require('./routes/trabajos');
const presupuestosRoutes = require('./routes/presupuestos');
const presupuestosApiRoutes = require('./routes/presupuestos-api');
const clientesRoutes = require('./routes/clientes');
const proveedoresRoutes = require('./routes/proveedores');
const controlCuentasRoutes = require('./routes/control-cuentas');
const pagosRoutes = require('./routes/pagos');
const comprasRoutes = require('./routes/compras');
const presupuestosDetalladosRoutes = require('./routes/presupuestos-detallados');
const facturasRoutes = require('./routes/facturas');
const pdfRoutes = require('./routes/pdf');
const { router: authRoutes } = require('./routes/auth');

app.use('/api/productos', productosRoutes);
app.use('/api/trabajos', trabajosRoutes);
app.use('/api/presupuestos', presupuestosRoutes);
app.use('/api/presupuestos-api', presupuestosApiRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/proveedores', proveedoresRoutes);
app.use('/api/control-cuentas', controlCuentasRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/compras', comprasRoutes);
app.use('/api/presupuestos-detallados', presupuestosDetalladosRoutes);
app.use('/api/facturas', facturasRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/auth', authRoutes);

// Ruta raíz
app.get('/', (req, res) => {
  res.json({ 
    mensaje: '🔨 API de Herrería - Backend funcionando',
    endpoints: {
      productos: '/api/productos',
      trabajos: '/api/trabajos',
      presupuestos: '/api/presupuestos',
      presupuestosDetallados: '/api/presupuestos-detallados',
      presupuestosApi: '/api/presupuestos-api',
      facturas: '/api/facturas',
      clientes: '/api/clientes',
      proveedores: '/api/proveedores',
      compras: '/api/compras',
      pdf: '/api/pdf',
      auth: '/api/auth'
    }
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});

module.exports = app;
