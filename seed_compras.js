const db = require('../database');

// Primero obtener los proveedores para usar sus IDs
db.all('SELECT id FROM proveedores LIMIT 5', [], (err, proveedores) => {
  if (err) {
    console.error('Error al obtener proveedores:', err.message);
    process.exit(1);
  }

  if (proveedores.length === 0) {
    console.log('⚠️  No hay proveedores. Ejecuta primero: node seed_proveedores.js');
    process.exit(1);
  }

  const comprasData = [
    {
      numero_compra: 'CMP-001',
      proveedor_id: proveedores[0].id,
      descripcion: 'Compra de acero estructural 50mm',
      total: 15000,
      pagado: 15000,
      estado: 'pagado'
    },
    {
      numero_compra: 'CMP-002',
      proveedor_id: proveedores[1].id,
      descripcion: 'Herrajes variados para portones',
      total: 8500,
      pagado: 0,
      estado: 'pendiente'
    },
    {
      numero_compra: 'CMP-003',
      proveedor_id: proveedores[2].id,
      descripcion: 'Pintura epóxica industrial 100L',
      total: 12000,
      pagado: 6000,
      estado: 'parcialmentePagado'
    },
    {
      numero_compra: 'CMP-004',
      proveedor_id: proveedores[3].id,
      descripcion: 'Herramientas para taller',
      total: 5500,
      pagado: 5500,
      estado: 'pagado'
    },
    {
      numero_compra: 'CMP-005',
      proveedor_id: proveedores[4].id,
      descripcion: 'Acero inoxidable 304 para barandas',
      total: 22000,
      pagado: 0,
      estado: 'pendiente'
    }
  ];

  // Eliminar compras anteriores
  db.run('DELETE FROM compras', [], (delErr) => {
    if (delErr) {
      console.error('Error al limpiar compras:', delErr.message);
      return;
    }

    console.log('🗑️  Compras anteriores eliminadas');

    // Insertar nuevas compras
    comprasData.forEach((compra) => {
      db.run(
        `INSERT INTO compras (numero_compra, proveedor_id, descripcion, total, pagado, estado) VALUES (?, ?, ?, ?, ?, ?)`,
        [compra.numero_compra, compra.proveedor_id, compra.descripcion, compra.total, compra.pagado, compra.estado],
        function(err) {
          if (err) {
            console.error('Error al insertar compra:', err.message);
          } else {
            console.log(`✅ Insertado: ${compra.numero_compra}`);
          }
        }
      );
    });

    setTimeout(() => {
      console.log('🎉 Seed de compras completado correctamente.');
      process.exit(0);
    }, 1000);
  });
});
