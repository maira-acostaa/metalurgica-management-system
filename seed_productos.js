const db = require('../database');

const productos = [
  {
    nombre: 'Portón Corredizo',
    descripcion: 'Portón corredizo de hierro de alta calidad con acabados personalizados y posibilidad de automatización.',
    precio: 0,
    imagenUrl: '/imagenes/portoncorredizo.jpg',
    categoria: 'Portones'
  },
  {
    nombre: 'Portón Perforado',
    descripcion: 'Portón con diseño perforado que combina seguridad y ventilación. Ideal para garajes y depósitos.',
    precio: 0,
    imagenUrl: '/imagenes/portonperforado.jpg',
    categoria: 'Portones'
  },
  {
    nombre: 'Puerta de Acero Inoxidable',
    descripcion: 'Puerta de acero inoxidable para máxima seguridad. Resistencia sin sacrificar la estética.',
    precio: 0,
    imagenUrl: '/imagenes/puertainoxidable.jpg',
    categoria: 'Puertas'
  },
  {
    nombre: 'Puerta Doble',
    descripcion: 'Puerta doble de hierro para accesos amplios, comercios y viviendas con diseño robusto.',
    precio: 0,
    imagenUrl: '/imagenes/puertadoble.jpeg',
    categoria: 'Puertas'
  },
  {
    nombre: 'Puerta Elegante',
    descripcion: 'Puerta con detalles ornamentales y artísticos. Perfecta para entradas principales que requieren estética y seguridad.',
    precio: 0,
    imagenUrl: '/imagenes/puertaelegante.jpeg',
    categoria: 'Puertas'
  },
  {
    nombre: 'Puerta de Hierro',
    descripcion: 'Puerta de hierro forjado para interiores y exteriores. Durabilidad y múltiples opciones de diseño.',
    precio: 0,
    imagenUrl: '/imagenes/puerta.jpeg',
    categoria: 'Puertas'
  },
  {
    nombre: 'Baranda Circular',
    descripcion: 'Baranda circular de hierro para escaleras y accesos. Diseño moderno y resistente.',
    precio: 0,
    imagenUrl: '/imagenes/barandacircular.jpeg',
    categoria: 'Barandas'
  },
  {
    nombre: 'Baranda Corta',
    descripcion: 'Baranda compacta para escalones, rampas y accesos reducidos. Funcional y estética.',
    precio: 0,
    imagenUrl: '/imagenes/barandacorta.jpeg',
    categoria: 'Barandas'
  },
  {
    nombre: 'Baranda de Acero Inoxidable',
    descripcion: 'Baranda de acero inoxidable de alta resistencia. Ideal para ambientes húmedos, piscinas y exteriores modernos.',
    precio: 0,
    imagenUrl: '/imagenes/barandadeaceroinoxidable.jpg',
    categoria: 'Barandas'
  },
  {
    nombre: 'Baranda Exterior',
    descripcion: 'Baranda para exteriores con tratamiento anticorrosión. Seguridad en balcones y terrazas.',
    precio: 0,
    imagenUrl: '/imagenes/barandaexterior.jpeg',
    categoria: 'Barandas'
  },
  {
    nombre: 'Pérgola',
    descripcion: 'Pérgola metálica resistente para espacios exteriores. Protección y diseño combinados.',
    precio: 0,
    imagenUrl: '/imagenes/pergola.jpeg',
    categoria: 'Estructuras'
  },
  {
    nombre: 'Tinglado Industrial',
    descripcion: 'Tinglado de hierro para depósitos, talleres y locales comerciales. Estructura robusta con instalación profesional.',
    precio: 0,
    imagenUrl: '/imagenes/tinglado.jpeg',
    categoria: 'Estructuras'
  },
  {
    nombre: 'Mampara Metálica',
    descripcion: 'Mampara y división de hierro para espacios interiores y exteriores. Funcionalidad con diseño moderno.',
    precio: 0,
    imagenUrl: '/imagenes/mampara.jpeg',
    categoria: 'Estructuras'
  },
  {
    nombre: 'Revestimiento Metálico',
    descripcion: 'Revestimiento de hierro y acero para paredes y fachadas. Solución estética y duradera.',
    precio: 0,
    imagenUrl: '/imagenes/revestimiento.jpeg',
    categoria: 'Estructuras'
  },
  {
    nombre: 'Asador con Gabinetes',
    descripcion: 'Asador con gabinetes y espacios de almacenamiento. Ideal para reuniones y eventos.',
    precio: 0,
    imagenUrl: '/imagenes/asadorcongabinetes.jpg',
    categoria: 'Asadores'
  },
  {
    nombre: 'Asador de Acero Inoxidable',
    descripcion: 'Asador de acero inoxidable de alta resistencia al calor y la corrosión. Fácil de limpiar y de larga duración.',
    precio: 0,
    imagenUrl: '/imagenes/asadorinoxidable.jpeg',
    categoria: 'Asadores'
  },
  {
    nombre: 'Asador con Parrilla',
    descripcion: 'Asador completo con parrilla integrada de hierro fundido. Diseñado para el mejor rendimiento.',
    precio: 0,
    imagenUrl: '/imagenes/asadorparrilla.jpg',
    categoria: 'Asadores'
  },
  {
    nombre: 'Mesa de Barra',
    descripcion: 'Mesa tipo barra de hierro para bares, restaurantes y cocinas. Resistente y moderna.',
    precio: 0,
    imagenUrl: '/imagenes/mesabarra.jpg',
    categoria: 'Muebles'
  },
  {
    nombre: 'Mesa de Barra Larga',
    descripcion: 'Mesa de barra de gran longitud para eventos y comedores. Diseño industrial y elegante.',
    precio: 0,
    imagenUrl: '/imagenes/mesabarralarga.jpg',
    categoria: 'Muebles'
  },
  {
    nombre: 'Mesa de Hierro',
    descripcion: 'Mesa de hierro forjado para interiores y exteriores. Diseños únicos con durabilidad garantizada.',
    precio: 0,
    imagenUrl: '/imagenes/mesa.jpeg',
    categoria: 'Muebles'
  },
  {
    nombre: 'Mesa Cuadrada',
    descripcion: 'Mesa cuadrada de hierro para jardines, patios y espacios exteriores. Robusta y personalizable.',
    precio: 0,
    imagenUrl: '/imagenes/mesacuadrada.jpeg',
    categoria: 'Muebles'
  },
  {
    nombre: 'Mesa Decorativa',
    descripcion: 'Mesa con diseño decorativo de hierro forjado. Pieza única que aporta carácter y estilo.',
    precio: 0,
    imagenUrl: '/imagenes/mesaestrella.jpg',
    categoria: 'Muebles'
  },
  {
    nombre: 'Repisa de Hierro',
    descripcion: 'Repisa y estante de hierro para interiores. Resistente, funcional y con estilo industrial.',
    precio: 0,
    imagenUrl: '/imagenes/repisa.jpg',
    categoria: 'Muebles'
  }
];

// Esperar a que la base de datos esté lista
setTimeout(() => {
  db.serialize(() => {
    // Limpiar productos existentes
    db.run('DELETE FROM productos', [], (err) => {
      if (err) console.error('Error al limpiar productos:', err.message);
      else console.log('🗑️  Productos anteriores eliminados');
    });

    const stmt = db.prepare(
      'INSERT INTO productos (nombre, descripcion, precio, imagenUrl, categoria) VALUES (?, ?, ?, ?, ?)'
    );

    productos.forEach((p) => {
      stmt.run(p.nombre, p.descripcion, p.precio, p.imagenUrl, p.categoria, (err) => {
        if (err) console.error(`Error al insertar ${p.nombre}:`, err.message);
        else console.log(`✅ Insertado: ${p.nombre}`);
      });
    });

    stmt.finalize(() => {
      console.log('\n🎉 Seed de productos completado correctamente.');
      process.exit(0);
    });
  });
}, 500);
