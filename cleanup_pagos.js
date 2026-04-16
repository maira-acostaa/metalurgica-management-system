const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', 'herreria.db');
const backupPath = path.join(
  __dirname,
  '..',
  `herreria.db.bak.${new Date().toISOString().replace(/[:.]/g, '-')}`
);

if (!fs.existsSync(dbPath)) {
  console.error('No se encontro la base de datos:', dbPath);
  process.exit(1);
}

fs.copyFileSync(dbPath, backupPath);
console.log('Backup creado:', backupPath);

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.get('SELECT COUNT(*) AS total FROM pagos', (err, row) => {
    if (err) {
      console.error('Error contando pagos:', err.message);
      return;
    }
    console.log('Pagos totales antes:', row.total);
  });

  // Completar cliente/proveedor desde factura/compra si falta
  db.run(
    `UPDATE pagos
     SET cliente_id = (
       SELECT cliente_id FROM facturas WHERE facturas.id = pagos.factura_id
     )
     WHERE cliente_id IS NULL AND factura_id IS NOT NULL`,
    (err) => {
      if (err) console.error('Error actualizando cliente_id por factura_id:', err.message);
    }
  );

  // Completar factura_id por referencia si falta
  db.run(
    `UPDATE pagos
     SET factura_id = (
       SELECT id FROM facturas WHERE facturas.numero_factura = pagos.referencia
     )
     WHERE factura_id IS NULL AND referencia IS NOT NULL`,
    (err) => {
      if (err) console.error('Error actualizando factura_id por referencia:', err.message);
    }
  );

  db.run(
    `UPDATE pagos
     SET proveedor_id = (
       SELECT proveedor_id FROM compras WHERE compras.id = pagos.compra_id
     )
     WHERE proveedor_id IS NULL AND compra_id IS NOT NULL`,
    (err) => {
      if (err) console.error('Error actualizando proveedor_id por compra_id:', err.message);
    }
  );

  // Completar compra_id por referencia si falta
  db.run(
    `UPDATE pagos
     SET compra_id = (
       SELECT id FROM compras WHERE compras.numero_compra = pagos.referencia
     )
     WHERE compra_id IS NULL AND referencia IS NOT NULL`,
    (err) => {
      if (err) console.error('Error actualizando compra_id por referencia:', err.message);
    }
  );

  // Normalizar tipo_pago segun IDs
  db.run(
    `UPDATE pagos
     SET tipo_pago = 'ingreso'
     WHERE (tipo_pago IS NULL OR tipo_pago = '')
       AND cliente_id IS NOT NULL AND (proveedor_id IS NULL OR proveedor_id = '')`,
    (err) => {
      if (err) console.error('Error normalizando tipo_pago (ingreso):', err.message);
    }
  );

  db.run(
    `UPDATE pagos
     SET tipo_pago = 'egreso'
     WHERE (tipo_pago IS NULL OR tipo_pago = '')
       AND proveedor_id IS NOT NULL AND (cliente_id IS NULL OR cliente_id = '')`,
    (err) => {
      if (err) console.error('Error normalizando tipo_pago (egreso):', err.message);
    }
  );

  // Corregir tipo_pago si esta invertido
  db.run(
    `UPDATE pagos
     SET tipo_pago = 'ingreso'
     WHERE tipo_pago = 'egreso'
       AND cliente_id IS NOT NULL AND (proveedor_id IS NULL OR proveedor_id = '')`,
    (err) => {
      if (err) console.error('Error corrigiendo tipo_pago (ingreso):', err.message);
    }
  );

  db.run(
    `UPDATE pagos
     SET tipo_pago = 'egreso'
     WHERE tipo_pago = 'ingreso'
       AND proveedor_id IS NOT NULL AND (cliente_id IS NULL OR cliente_id = '')`,
    (err) => {
      if (err) console.error('Error corrigiendo tipo_pago (egreso):', err.message);
    }
  );

  // Normalizar montos negativos a positivos
  db.run(
    `UPDATE pagos
     SET monto = ABS(monto)
     WHERE monto < 0`,
    (err) => {
      if (err) console.error('Error normalizando montos:', err.message);
    }
  );

  db.all(
    `SELECT tipo_pago, COUNT(*) AS cantidad
     FROM pagos
     GROUP BY tipo_pago`,
    (err, rows) => {
      if (err) {
        console.error('Error contando pagos por tipo:', err.message);
      } else {
        console.table(rows);
      }
    }
  );

  db.get('SELECT COUNT(*) AS total FROM pagos', (err, row) => {
    if (err) {
      console.error('Error contando pagos (post):', err.message);
      return;
    }
    console.log('Pagos totales despues:', row.total);
  });
});

db.close((err) => {
  if (err) console.error('Error cerrando DB:', err.message);
  else console.log('Cleanup finalizado.');
});
