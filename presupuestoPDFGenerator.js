/**
 * Servicio de Generación de PDF para Presupuestos
 * Genera HTML profesional con logo para PDFs formales
 */
const fs = require('fs');
const path = require('path');

class PresupuestoPDFGenerator {
  constructor() {
    // Constantes de formato
    this.pageWidth = 210; // A4 width in mm
    this.pageHeight = 297; // A4 height in mm
    this.margin = 15;
    this.lineHeight = 7;
    this.fontSize = {
      title: 18,
      heading: 12,
      normal: 10,
      small: 8
    };
    this.colors = {
      primary: [34, 139, 34], // Verde oscuro (herrería)
      background: [245, 245, 245],
      text: [0, 0, 0],
      textLight: [100, 100, 100],
      border: [200, 200, 200]
    };
    
    // Buscar logo en formatos comunes dentro de `frontend/public`
    const publicDir = path.join(__dirname, '../..', 'frontend', 'public');
    const candidates = ['logo.svg', 'logo.png', 'logo.jpg', 'logo.jpeg'];
    this.logoPath = null;
    for (const f of candidates) {
      const p = path.join(publicDir, f);
      if (fs.existsSync(p)) {
        this.logoPath = p;
        break;
      }
    }
    this.logoBase64 = null;

    // Intentar cargar el logo al instancia
    this.cargarLogo();
  }

  /**
   * Carga el logo y lo convierte a base64
   */
  cargarLogo() {
    try {
      if (this.logoPath && fs.existsSync(this.logoPath)) {
        const logoBuffer = fs.readFileSync(this.logoPath);
        const ext = path.extname(this.logoPath).toLowerCase();
        const mime = ext === '.svg' ? 'image/svg+xml' : (ext === '.png' ? 'image/png' : 'image/jpeg');
        this.logoBase64 = `data:${mime};base64,${logoBuffer.toString('base64')}`;
      } else {
        console.warn('Logo no encontrado en:', this.logoPath);
      }
    } catch (error) {
      console.warn('Error al cargar logo:', error.message);
    }
  }

  /**
   * Genera un PDF de presupuesto
   * 
   * @param {Object} presupuesto - Datos del presupuesto
   * @param {string} presupuesto.numeroPresupuesto - Número único del presupuesto
   * @param {string} presupuesto.nombre_cliente - Nombre del cliente
   * @param {string} presupuesto.email_cliente - Email del cliente
   * @param {string} presupuesto.telefono_cliente - Teléfono del cliente
   * @param {string} presupuesto.tipo_trabajo - Tipo de trabajo
   * @param {string} presupuesto.descripcion - Descripción del trabajo
   * @param {number} presupuesto.total - Monto total
   * @param {string} presupuesto.fecha_vencimiento - Fecha de vencimiento
   * @param {string} presupuesto.observaciones - Observaciones adicionales
   * @param {Array} presupuesto.items - Items del presupuesto
   * @param {Object} empresa - Datos de la empresa
   * @param {string} empresa.nombre - Nombre de la empresa
   * @param {string} empresa.email - Email de la empresa
   * @param {string} empresa.telefono - Teléfono de la empresa
   * @param {string} empresa.direccion - Dirección de la empresa
   * @param {string} [logoPath] - Ruta al logo (opcional)
   * @returns {Object} PDF document from jsPDF
   */
  generarPresupuesto(presupuesto, empresa, logoPath = null) {
    // Nota: Se requiere jsPDF importado en el archivo que usa este método
    // import jsPDF from 'jspdf';
    
    // Este método debe ser implementado en el contexto donde jsPDF está disponible
    // Aquí proporcionamos la estructura y lógica
    
    return {
      estructura: {
        encabezado: this.construirEncabezado(empresa, logoPath),
        datos_cliente: this.construirDatosCliente(presupuesto),
        tabla_items: this.construirTablaItems(presupuesto.items),
        resumen_totales: this.construirResumenTotales(presupuesto),
        pie_pagina: this.construirPiePagina(empresa, presupuesto)
      },
      config: {
        pageWidth: this.pageWidth,
        pageHeight: this.pageHeight,
        margin: this.margin,
        fontSize: this.fontSize,
        colors: this.colors
      }
    };
  }

  construirEncabezado(empresa, logoPath) {
    return {
      titulo: 'PRESUPUESTO DE HERRERÍA',
      empresa: {
        nombre: empresa.nombre,
        direccion: empresa.direccion,
        telefono: empresa.telefono,
        email: empresa.email
      },
      logo: logoPath,
      estilos: {
        backgroundColor: this.colors.primary,
        textColor: 'white'
      }
    };
  }

  construirDatosCliente(presupuesto) {
    return {
      titulo: 'DATOS DEL CLIENTE',
      campos: [
        { label: 'Nombre:', valor: presupuesto.nombre_cliente },
        { label: 'Email:', valor: presupuesto.email_cliente },
        { label: 'Teléfono:', valor: presupuesto.telefono_cliente },
        { label: 'Tipo de Trabajo:', valor: presupuesto.tipo_trabajo }
      ]
    };
  }

  construirTablaItems(items) {
    return {
      titulo: 'DETALLE DEL PRESUPUESTO',
      encabezados: [
        { texto: 'Descripción', ancho: 60 },
        { texto: 'Cantidad', ancho: 20, alineacion: 'center' },
        { texto: 'P. Unitario', ancho: 30, alineacion: 'right' },
        { texto: 'Subtotal', ancho: 30, alineacion: 'right' }
      ],
      filas: (items || []).map(item => [
        item.descripcion || item.producto || 'Ítem sin descripción',
        item.cantidad || 1,
        this.formatoMoneda(item.precio_unitario || 0),
        this.formatoMoneda((item.cantidad || 1) * (item.precio_unitario || 0))
      ])
    };
  }

  construirResumenTotales(presupuesto) {
    // Calcular subtotal
    const subtotal = presupuesto.items ? presupuesto.items.reduce((sum, item) => {
      return sum + ((item.cantidad || 1) * (item.precio_unitario || 0));
    }, 0) : 0;

    return {
      subtotal: subtotal,
      total: presupuesto.total || subtotal,
      filas: [
        { label: 'Subtotal:', valor: subtotal },
        { label: 'Total:', valor: presupuesto.total || subtotal, destacado: true }
      ]
    };
  }

  construirPiePagina(empresa, presupuesto) {
    return {
      titulo: 'CONDICIONES Y OBSERVACIONES',
      fecha: new Date().toLocaleDateString('es-AR'),
      numeroPresupuesto: presupuesto.numeroPresupuesto,
      validezPresupuesto: presupuesto.fecha_vencimiento || 'Consultar vigencia',
      observaciones: presupuesto.observaciones || 'Presupuesto sujeto a cambios según especificaciones finales',
      empresa: {
        nombre: empresa.nombre,
        telefono: empresa.telefono,
        email: empresa.email
      }
    };
  }

  /**
   * Formatea números como moneda
   */
  formatoMoneda(valor) {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valor);
  }

  /**
   * Obtiene valores por defecto para empresa
   */
  obtenerEmpresaPorDefecto() {
    return {
      nombre: 'Herrería Malabia S.H.',
      email: 'info@herreriamalabia.com.ar',
      telefono: '+54 9 11 XXXX-XXXX',
      direccion: 'Buenos Aires, Argentina'
    };
  }

  /**
   * Convierte la estructura a formato HTML para visualización
   */
  aHTMLSimple(presupuesto, empresa, logoPath = null) {
    const estructura = this.generarPresupuesto(presupuesto, empresa, logoPath);
    const logoHTML = this.logoBase64 ? `<img src="${this.logoBase64}" alt="Logo ${empresa.nombre}" style="height: 100px; object-fit: contain;">` : '';
    
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Presupuesto ${presupuesto.numeroPresupuesto}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Georgia', 'Garamond', serif;
            color: #2c2c2c;
            background: #ffffff;
            line-height: 1.6;
            font-size: 14px;
          }
          
          .documento {
            max-width: 900px;
            margin: 0 auto;
            padding: 50px 45px;
            background: white;
          }
          
          /* ===== ENCABEZADO CORPORATIVO ===== */
          .encabezado {
            display: grid;
            grid-template-columns: 100px 1fr 200px;
            gap: 30px;
            margin-bottom: 45px;
            padding-bottom: 35px;
            border-bottom: 2px solid #2c2c2c;
            align-items: flex-start;
          }
          
          .encabezado-logo {
            text-align: left;
          }
          
          .encabezado-logo img {
            height: 100px;
            width: auto;
            object-fit: contain;
            display: block;
          }
          
          .encabezado-empresa {
            text-align: left;
          }
          
          .encabezado-empresa h1 {
            font-size: 28px;
            color: #1a1a1a;
            margin-bottom: 4px;
            font-weight: 700;
            letter-spacing: -1px;
          }
          
          .encabezado-empresa .subtitle {
            font-size: 12px;
            color: #666;
            font-weight: normal;
            margin-bottom: 10px;
            font-style: italic;
          }
          
          .encabezado-empresa .empresa-datos {
            font-size: 11px;
            color: #555;
            line-height: 1.7;
          }
          
          .numero-fecha {
            text-align: right;
            border: 1px solid #e0e0e0;
            padding: 18px;
            background: #fafafa;
          }
          
          .numero-fecha .campo {
            margin-bottom: 12px;
          }
          
          .numero-fecha .label {
            font-size: 9px;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            display: block;
            margin-bottom: 4px;
          }
          
          .numero-fecha .valor {
            font-size: 16px;
            color: #1a1a1a;
            font-weight: 700;
          }
          
          .numero-fecha .date {
            font-size: 12px;
            color: #2c2c2c;
            font-weight: normal;
          }
          
          /* ===== DATOS DEL CLIENTE ===== */
          .seccion-cliente {
            padding: 24px 0;
            margin-bottom: 35px;
            border-top: 1px solid #e0e0e0;
            border-bottom: 1px solid #e0e0e0;
          }
          
          .seccion-cliente h3 {
            color: #1a1a1a;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 16px;
            padding-bottom: 0;
            border-bottom: none;
          }
          
          .datos-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 25px;
          }
          
          .dato-cliente {
            font-size: 12px;
          }
          
          .dato-cliente .etiqueta {
            font-weight: 700;
            color: #666;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 1px;
            display: block;
            margin-bottom: 5px;
          }
          
          .dato-cliente .valor {
            color: #2c2c2c;
            font-size: 13px;
            font-weight: normal;
          }
          
          /* ===== TABLA DE ITEMS ===== */
          .seccion-items {
            margin-bottom: 35px;
          }
          
          .seccion-items h3 {
            color: #1a1a1a;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 14px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e0e0e0;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            background: white;
          }
          
          table thead {
            background: #2c2c2c;
            color: white;
          }
          
          table th {
            padding: 14px 12px;
            text-align: left;
            font-weight: 700;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
            border: none;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          }
          
          table th.derecha {
            text-align: right;
          }
          
          table th.centro {
            text-align: center;
          }
          
          table tbody tr {
            border-bottom: 1px solid #e0e0e0;
          }
          
          table tbody tr:last-child {
            border-bottom: 2px solid #2c2c2c;
          }
          
          table td {
            padding: 14px 12px;
            font-size: 13px;
            color: #2c2c2c;
          }
          
          table td.derecha {
            text-align: right;
            font-weight: 600;
            color: #1a1a1a;
            font-size: 13px;
          }
          
          table td.centro {
            text-align: center;
          }
          
          /* ===== RESUMEN FINANCIERO ===== */
          .resumen-totales {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 35px;
            gap: 20px;
          }
          
          .resumen-box {
            background: #fafafa;
            border: 1px solid #2c2c2c;
            padding: 24px;
            width: 280px;
          }
          
          .linea-resumen {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            font-size: 12px;
            color: #555;
            font-weight: 600;
          }
          
          .linea-resumen.total {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 2px solid #2c2c2c;
            font-size: 14px;
            font-weight: 700;
            color: #1a1a1a;
          }
          
          .monto {
            font-weight: 700;
            color: #1a1a1a;
            font-size: 13px;
          }
          
          .linea-resumen.total .monto {
            font-size: 16px;
          }
          
          /* ===== OBSERVACIONES ===== */
          .seccion-observaciones {
            background: #f9f9f9;
            border: 1px solid #e0e0e0;
            padding: 20px;
            margin-bottom: 35px;
          }
          
          .seccion-observaciones h4 {
            color: #1a1a1a;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin-bottom: 10px;
          }
          
          .seccion-observaciones p {
            font-size: 12px;
            color: #555;
            line-height: 1.6;
            margin: 6px 0;
          }
          
          /* ===== PIE DE PÁGINA ===== */
          .pie-pagina {
            text-align: center;
            padding-top: 25px;
            border-top: 1px solid #e0e0e0;
            color: #666;
            font-size: 10px;
          }
          
          .pie-pagina p {
            margin: 3px 0;
            line-height: 1.7;
          }
          
          .pie-pagina .empresa-footer {
            font-weight: 700;
            color: #1a1a1a;
            font-size: 12px;
            margin-bottom: 4px;
          }
          
          .pie-pagina .legal {
            color: #888;
            font-size: 9px;
            margin-top: 6px;
          }
          
          /* ===== ESTILOS DE IMPRESIÓN ===== */
          @media print {
            body {
              background: white;
            }
            
            .documento {
              box-shadow: none;
              padding: 40px;
              margin: 0;
              max-width: 100%;
            }
          }

          @page {
            margin: 0.5cm;
          }
        </style>
      </head>
      <body>
        <div class="documento">
          <!-- ENCABEZADO CON LOGO -->
          <div class="encabezado">
            <div class="encabezado-logo">
              ${logoHTML}
            </div>
            
            <div class="encabezado-empresa">
              <h1>${empresa.nombre}</h1>
              <div class="subtitle">Presupuesto de Servicios</div>
              <div class="empresa-datos">
                TEL: ${empresa.telefono}<br/>
                EMAIL: ${empresa.email}<br/>
                ${empresa.direccion}
              </div>
            </div>
            
            <div class="numero-fecha">
              <div class="campo">
                <span class="label">Número</span>
                <div class="valor">${presupuesto.numeroPresupuesto}</div>
              </div>
              <div class="campo">
                <span class="label">Fecha</span>
                <div class="date">${new Date().toLocaleDateString('es-AR')}</div>
              </div>
              <div class="campo">
                <span class="label">Vencimiento</span>
                <div class="date">${presupuesto.fecha_vencimiento || '30 días'}</div>
              </div>
            </div>
          </div>

          <!-- DATOS DEL CLIENTE -->
          <div class="seccion-cliente">
            <h3>Cliente</h3>
            <div class="datos-grid">
              <div class="dato-cliente">
                <span class="etiqueta">Nombre</span>
                <span class="valor">${presupuesto.nombre_cliente}</span>
              </div>
              <div class="dato-cliente">
                <span class="etiqueta">Email</span>
                <span class="valor">${presupuesto.email_cliente}</span>
              </div>
              <div class="dato-cliente">
                <span class="etiqueta">Teléfono</span>
                <span class="valor">${presupuesto.telefono_cliente}</span>
              </div>
              <div class="dato-cliente">
                <span class="etiqueta">Tipo de Trabajo</span>
                <span class="valor">${presupuesto.tipo_trabajo}</span>
              </div>
            </div>
          </div>

          <!-- TABLA DE ITEMS -->
          <div class="seccion-items">
            <h3>Detalle</h3>
            <table>
              <thead>
                <tr>
                  <th style="width: 50%;">Descripción del Trabajo</th>
                  <th class="centro" style="width: 15%;">Cantidad</th>
                  <th class="derecha" style="width: 17.5%;">P. Unitario</th>
                  <th class="derecha" style="width: 17.5%;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${(presupuesto.items || []).map((item) => `
                  <tr>
                    <td>${item.descripcion || item.producto || 'Ítem'}</td>
                    <td class="centro">${item.cantidad || 1}</td>
                    <td class="derecha">$${(item.precio_unitario || 0).toLocaleString('es-AR')}</td>
                    <td class="derecha">$${((item.cantidad || 1) * (item.precio_unitario || 0)).toLocaleString('es-AR')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- RESUMEN FINANCIERO -->
          <div class="resumen-totales">
            <div class="resumen-box">
              <div class="linea-resumen">
                <span>Subtotal:</span>
                <span class="monto">$${(presupuesto.subtotal || presupuesto.total || 0).toLocaleString('es-AR')}</span>
              </div>
              <div class="linea-resumen total">
                <span>TOTAL:</span>
                <span class="monto">$${(presupuesto.total || 0).toLocaleString('es-AR')}</span>
              </div>
            </div>
          </div>

          <!-- OBSERVACIONES -->
          <div class="seccion-observaciones">
            <h4>Condiciones</h4>
            <p>${presupuesto.observaciones || 'Válido por 30 días. Sujeto a variaciones según especificaciones finales.'}</p>
          </div>

          <!-- PIE DE PÁGINA -->
          <div class="pie-pagina">
            <p class="empresa-footer">${empresa.nombre}</p>
            <p>${empresa.email} | ${empresa.telefono}</p>
            <p class="legal">Emitido: ${new Date().toLocaleDateString('es-AR')}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

// Exportar para Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PresupuestoPDFGenerator;
}
