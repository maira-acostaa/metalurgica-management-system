const fs = require('fs');
const path = require('path');

class FacturaPDFGenerator {
  constructor() {
    const publicDir = path.join(__dirname, '../..', 'frontend', 'public');
    const candidates = ['logo.svg', 'logo.png', 'logo.jpg', 'logo.jpeg'];
    this.logoPath = null;

    for (const fileName of candidates) {
      const candidatePath = path.join(publicDir, fileName);
      if (fs.existsSync(candidatePath)) {
        this.logoPath = candidatePath;
        break;
      }
    }

    this.logoBase64 = this.cargarLogoBase64();
  }

  cargarLogoBase64() {
    if (!this.logoPath) {
      return '';
    }

    try {
      const buffer = fs.readFileSync(this.logoPath);
      const ext = path.extname(this.logoPath).toLowerCase();
      const mime = ext === '.svg' ? 'image/svg+xml' : (ext === '.png' ? 'image/png' : 'image/jpeg');
      return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch (error) {
      console.warn('Error al cargar logo:', error.message);
      return '';
    }
  }

  obtenerEmpresaPorDefecto() {
    return {
      nombre: 'Herreria Malabia S.H.',
      direccion: 'Tucuman, Argentina',
      telefono: '+54 9 381478-4590',
      email: 'metalurgicamalabiash@hotmail.com'
    };
  }

  formatoMoneda(valor) {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valor);
  }

  formatoFecha(fecha) {
    if (!fecha) return '-';
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-AR', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
    } catch (e) {
      return fecha;
    }
  }

  generarFacturaHTML(factura, empresa) {
    const logoHTML = this.logoBase64
      ? `<img class="logo" src="${this.logoBase64}" alt="Logo ${empresa.nombre}" />`
      : '<div class="logo-placeholder">Logo</div>';

    const nombreCliente = factura.cliente_nombre || factura.nombre_cliente || '-';
    const emailCliente = factura.cliente_email || factura.email_cliente || '-';
    const telefonoCliente = factura.cliente_telefono || factura.telefono_cliente || '-';
    const fechaCreacion = this.formatoFecha(factura.created_at);
    const fechaVencimiento = this.formatoFecha(factura.fecha_vencimiento);
    const metodoPago = factura.metodo_pago || 'Efectivo';
    const descripcion = factura.descripcion || 'Sin descripción';
    const estado = factura.estado || 'pendiente';
    const observaciones = factura.observaciones || '';
    const total = this.formatoMoneda(factura.total || 0);

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Factura ${factura.numero_factura || factura.id}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #333;
            background: #f5f5f5;
            padding: 20px;
          }

          .container {
            background: white;
            max-width: 900px;
            margin: 0 auto;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }

          /* ===== HEADER ===== */
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #2c3e50;
            padding-bottom: 30px;
            margin-bottom: 30px;
          }

          .logo-section {
            display: flex;
            align-items: center;
            gap: 20px;
          }

          .logo {
            height: 80px;
            width: auto;
            object-fit: contain;
          }

          .logo-placeholder {
            width: 80px;
            height: 80px;
            background: #ecf0f1;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: #95a5a6;
            border: 2px solid #bdc3c7;
          }

          .empresa-info {
            flex: 1;
          }

          .empresa-info h2 {
            font-size: 16px;
            margin-bottom: 8px;
            color: #2c3e50;
          }

          .empresa-info p {
            font-size: 13px;
            line-height: 1.6;
            color: #555;
            margin: 2px 0;
          }

          .factura-titulo {
            text-align: right;
          }

          .factura-titulo h1 {
            font-size: 32px;
            font-weight: bold;
            color: #2c3e50;
            margin: 0 0 10px 0;
          }

          .factura-numero {
            font-size: 14px;
            color: #7f8c8d;
            margin: 5px 0;
          }

          /* ===== CONTENIDO PRINCIPAL ===== */
          .contenido {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
          }

          .seccion {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            border-left: 4px solid #3498db;
          }

          .seccion h3 {
            font-size: 13px;
            font-weight: bold;
            color: #2c3e50;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #ddd;
          }

          .fila {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 13px;
            line-height: 1.5;
          }

          .fila-label {
            font-weight: 600;
            color: #2c3e50;
            min-width: 120px;
          }

          .fila-valor {
            color: #555;
            text-align: right;
            flex: 1;
            word-wrap: break-word;
            word-break: break-word;
            overflow-wrap: break-word;
          }

          /* ===== TABLA DE DETALLES ===== */
          .detalles-section {
            margin-bottom: 30px;
            grid-column: 1 / -1;
          }

          .detalles-section h3 {
            font-size: 13px;
            font-weight: bold;
            color: #2c3e50;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #3498db;
          }

          .tabla {
            width: 100%;
            border-collapse: collapse;
            background: white;
          }

          .tabla th {
            background: #34495e;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
          }

          .tabla td {
            padding: 12px;
            border-bottom: 1px solid #ecf0f1;
            font-size: 13px;
          }

          .tabla tr:hover {
            background: #f8f9fa;
          }

          .tabla-derecha {
            text-align: right;
          }

          /* ===== TOTALES ===== */
          .totales-section {
            grid-column: 1 / -1;
            display: flex;
            justify-content: flex-end;
          }

          .totales-box {
            background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%);
            color: white;
            padding: 25px 40px;
            border-radius: 6px;
            min-width: 350px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          }

          .total-fila {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            font-size: 13px;
          }

          .total-fila.principal {
            border-top: 2px solid rgba(255,255,255,0.3);
            padding-top: 12px;
            margin-top: 12px;
            font-size: 18px;
            font-weight: bold;
          }

          .total-label {
            font-weight: 600;
          }

          .total-valor {
            font-weight: 700;
          }

          /* ===== OBSERVACIONES Y PIE ===== */
          .observaciones-section {
            grid-column: 1 / -1;
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 20px;
            border-radius: 6px;
            margin-bottom: 30px;
          }

          .observaciones-section h3 {
            font-size: 12px;
            font-weight: bold;
            color: #856404;
            margin-bottom: 10px;
            text-transform: uppercase;
          }

          .observaciones-section p {
            font-size: 13px;
            color: #856404;
            line-height: 1.6;
            margin: 0;
          }

          .pie {
            border-top: 1px solid #ecf0f1;
            padding-top: 20px;
            margin-top: 30px;
            text-align: center;
            font-size: 11px;
            color: #95a5a6;
            line-height: 1.8;
          }

          .estado-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .estado-pendiente {
            background: #fff3cd;
            color: #856404;
          }

          .estado-pagada {
            background: #d4edda;
            color: #155724;
          }

          .estado-cancelada {
            background: #f8d7da;
            color: #721c24;
          }

          /* ===== IMPRESIÓN ===== */
          @media print {
            body {
              background: white;
              padding: 0;
            }
            .container {
              box-shadow: none;
              max-width: 100%;
              margin: 0;
              padding: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- HEADER -->
          <div class="header">
            <div class="logo-section">
              ${logoHTML}
              <div class="empresa-info">
                <h2>${empresa.nombre}</h2>
                <p>${empresa.direccion}</p>
                <p>Teléfono: ${empresa.telefono}</p>
                <p>Email: ${empresa.email}</p>
              </div>
            </div>
            <div class="factura-titulo">
              <h1>FACTURA</h1>
              <div class="factura-numero">N° ${factura.numero_factura || factura.id}</div>
            </div>
          </div>

          <!-- CONTENIDO PRINCIPAL -->
          <div class="contenido">
            <!-- DATOS DEL CLIENTE -->
            <div class="seccion">
              <h3>Información del Cliente</h3>
              <div class="fila">
                <span class="fila-label">Cliente:</span>
                <span class="fila-valor">${nombreCliente}</span>
              </div>
              <div class="fila">
                <span class="fila-label">Email:</span>
                <span class="fila-valor">${emailCliente}</span>
              </div>
              <div class="fila">
                <span class="fila-label">Teléfono:</span>
                <span class="fila-valor">${telefonoCliente}</span>
              </div>
            </div>

            <!-- DATOS DE LA FACTURA -->
            <div class="seccion">
              <h3>Datos de la Factura</h3>
              <div class="fila">
                <span class="fila-label">Fecha:</span>
                <span class="fila-valor">${fechaCreacion}</span>
              </div>
              <div class="fila">
                <span class="fila-label">Vencimiento:</span>
                <span class="fila-valor">${fechaVencimiento}</span>
              </div>
              <div class="fila">
                <span class="fila-label">Método de Pago:</span>
                <span class="fila-valor">${metodoPago}</span>
              </div>
              <div class="fila">
                <span class="fila-label">Estado:</span>
                <span class="fila-valor">
                  <span class="estado-badge estado-${estado === 'pagada' ? 'pagada' : estado === 'cancelada' ? 'cancelada' : 'pendiente'}">
                    ${estado.charAt(0).toUpperCase() + estado.slice(1)}
                  </span>
                </span>
              </div>
            </div>

            <!-- DESCRIPCIÓN Y DETALLES -->
            <div class="detalles-section">
              <h3>Descripción del Trabajo</h3>
              <table class="tabla">
                <thead>
                  <tr>
                    <th>Descripción</th>
                    <th class="tabla-derecha">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>${descripcion}</td>
                    <td class="tabla-derecha">${total}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- TOTALES -->
            <div class="totales-section">
              <div class="totales-box">
                <div class="total-fila">
                  <span class="total-label">Subtotal:</span>
                  <span class="total-valor">${total}</span>
                </div>
                <div class="total-fila principal">
                  <span class="total-label">Total a Pagar:</span>
                  <span class="total-valor">${total}</span>
                </div>
              </div>
            </div>

            <!-- OBSERVACIONES -->
            ${observaciones ? `
            <div class="observaciones-section">
              <h3>Observaciones</h3>
              <p>${observaciones}</p>
            </div>
            ` : ''}
          </div>

          <!-- PIE DE PÁGINA -->
          <div class="pie">
            <p>Gracias por su confianza. Para consultas, contáctenos.</p>
            <p>${empresa.nombre} | ${empresa.telefono} | ${empresa.email}</p>
            <p>Documento generado automáticamente el ${new Date().toLocaleDateString('es-AR')}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = FacturaPDFGenerator;
