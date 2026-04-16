const db = require('../database');

const trabajos = [
  {
    titulo: 'Portón corredizo moderno',
    descripcion: 'Estructura en hierro galvanizado y panel de chapa microperforada, pintura poliuretánica.',
    imagenUrl: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80',
    fecha: '2026-01-30'
  },
  {
    titulo: 'Baranda de escalera minimalista',
    descripcion: 'Baranda en acero inoxidable con vidrio templado de 8 mm, apta para interior.',
    imagenUrl: 'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=1200&q=80',
    fecha: '2026-02-05'
  },
  {
    titulo: 'Reja artística para frente',
    descripcion: 'Diseño ornamental con puntas forjadas y detalles florales, terminación negro mate.',
    imagenUrl: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80',
    fecha: '2026-02-18'
  }
];

function seedTrabajos() {
  const insertSQL = `INSERT INTO trabajos (titulo, descripcion, imagenUrl, fecha)
                     VALUES (?, ?, ?, ?)`;

  db.serialize(() => {
    db.run('DELETE FROM trabajos', (deleteErr) => {
      if (deleteErr) {
        console.error('Error al limpiar tabla trabajos:', deleteErr.message);
        process.exit(1);
      }

      let pendientes = trabajos.length;

      trabajos.forEach(({ titulo, descripcion, imagenUrl, fecha }) => {
        db.run(insertSQL, [titulo, descripcion, imagenUrl, fecha], function(insertErr) {
          if (insertErr) {
            console.error('Error insertando trabajo:', insertErr.message);
            process.exit(1);
          }

          console.log(`✅ Insertado trabajo #${this.lastID}: ${titulo}`);
          pendientes -= 1;

          if (pendientes === 0) {
            console.log('🎉 Semilla completada. Ejecuta `node scripts/seed_trabajos.js` cuando necesites restablecerlos.');
            db.close();
          }
        });
      });
    });
  });
}

seedTrabajos();
