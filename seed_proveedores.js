const db = require('../database');

const proveedoresData = [
  {
    nombre: 'Aceros del Sur',
    email: 'contacto@aceresdelsur.com.ar',
    telefono: '3534561000',
    direccion: 'Zona Industrial, Córdoba',
    rubro: 'Materias Primas - Acero',
    cuit: '23-12345678-9'
  },
  {
    nombre: 'Herrajes y Accesorios SA',
    email: 'ventas@herrajes.com.ar',
    telefono: '3534561001',
    direccion: 'Calle Industrial 100, Córdoba',
    rubro: 'Herrajes',
    cuit: '23-87654321-0'
  },
  {
    nombre: 'Pintura Industrial',
    email: 'pintura@industrial.com.ar',
    telefono: '3534561002',
    direccion: 'Av. Irigoyen 500, Córdoba',
    rubro: 'Pintura y Revestimientos',
    cuit: '23-11223344-5'
  },
  {
    nombre: 'Herramientas Profesionales',
    email: 'herramientas@prof.com.ar',
    telefono: '3534561003',
    direccion: 'San Jerónimo 200, Córdoba',
    rubro: 'Herramientas',
    cuit: '23-55667788-1'
  },
  {
    nombre: 'Acero Inoxidable Premium',
    email: 'premium@inoxidable.com.ar',
    telefono: '3534561004',
    direccion: 'Ruta 9 Sur, Córdoba',
    rubro: 'Acero Inoxidable',
    cuit: '23-99887766-2'
  }
];

// Eliminar proveedores anteriores
db.run('DELETE FROM proveedores', [], (err) => {
  if (err) {
    console.error('Error al limpiar proveedores:', err.message);
    return;
  }
  
  console.log('🗑️  Proveedores anteriores eliminados');

  // Insertar nuevos proveedores
  proveedoresData.forEach((proveedor) => {
    db.run(
      `INSERT INTO proveedores (nombre, email, telefono, direccion, rubro, cuit) VALUES (?, ?, ?, ?, ?, ?)`,
      [proveedor.nombre, proveedor.email, proveedor.telefono, proveedor.direccion, proveedor.rubro, proveedor.cuit],
      function(err) {
        if (err) {
          console.error('Error al insertar proveedor:', err.message);
        } else {
          console.log(`✅ Insertado: ${proveedor.nombre}`);
        }
      }
    );
  });

  setTimeout(() => {
    console.log('🎉 Seed de proveedores completado correctamente.');
    process.exit(0);
  }, 1000);
});
