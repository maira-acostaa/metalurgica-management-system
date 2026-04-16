const db = require('../database');

const clientesData = [
  {
    nombre: 'Juan García',
    email: 'juan.garcia@email.com',
    telefono: '3534567890',
    direccion: 'Calle Principal 123, Córdoba',
    categoria: 'Particular'
  },
  {
    nombre: 'María López',
    email: 'maria.lopez@email.com',
    telefono: '3534567891',
    direccion: 'Av. San Martín 456, Córdoba',
    categoria: 'Empresa'
  },
  {
    nombre: 'Constructor ABC',
    email: 'constructor@abc.com.ar',
    telefono: '3534567892',
    direccion: 'Ruta 9 km 5, Córdoba',
    categoria: 'Constructor/Obra'
  },
  {
    nombre: 'Carlos Rodríguez',
    email: 'carlos.rodriquez@email.com',
    telefono: '3534567893',
    direccion: 'Calle Belgrano 789, Córdoba',
    categoria: 'Cliente Frecuente'
  },
  {
    nombre: 'Empresa de Servicios XYZ',
    email: 'servicios@xyz.com.ar',
    telefono: '3534567894',
    direccion: 'Parque Industrial, Córdoba',
    categoria: 'Empresa'
  }
];

// Eliminar clientes anteriores
db.run('DELETE FROM clientes', [], (err) => {
  if (err) {
    console.error('Error al limpiar clientes:', err.message);
    return;
  }
  
  console.log('🗑️  Clientes anteriores eliminados');

  // Insertar nuevos clientes
  clientesData.forEach((cliente) => {
    db.run(
      `INSERT INTO clientes (nombre, email, telefono, direccion, categoria) VALUES (?, ?, ?, ?, ?)`,
      [cliente.nombre, cliente.email, cliente.telefono, cliente.direccion, cliente.categoria],
      function(err) {
        if (err) {
          console.error('Error al insertar cliente:', err.message);
        } else {
          console.log(`✅ Insertado: ${cliente.nombre}`);
        }
      }
    );
  });

  setTimeout(() => {
    console.log('🎉 Seed de clientes completado correctamente.');
    process.exit(0);
  }, 1000);
});
