const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, 'herreria.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar con la base de datos:', err.message);
  } else {
    console.log('✅ Conectado a la base de datos SQLite');
  }
});

// Crear tablas si no existen
db.serialize(() => {
  // Tabla de usuarios
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      rol TEXT NOT NULL CHECK(rol IN ('empleado', 'cliente')),
      fecha_registro TEXT DEFAULT CURRENT_TIMESTAMP,
      activo INTEGER DEFAULT 1,
      reset_token TEXT,
      reset_token_expires TEXT
    )
  `);

  // Agregar columnas si no existen (para bases de datos existentes)
  db.run(`ALTER TABLE usuarios ADD COLUMN reset_token TEXT;`, () => {});
  db.run(`ALTER TABLE usuarios ADD COLUMN reset_token_expires TEXT;`, () => {});

  // Tabla de productos
  db.run(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      precio REAL,
      imagenUrl TEXT,
      categoria TEXT
    )
  `);

  // Tabla de trabajos realizados
  db.run(`
    CREATE TABLE IF NOT EXISTS trabajos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      descripcion TEXT,
      imagenUrl TEXT,
      fecha TEXT
    )
  `);

  // Tabla de presupuestos
  db.run(`
    CREATE TABLE IF NOT EXISTS presupuestos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombreCliente TEXT NOT NULL,
      email TEXT NOT NULL,
      telefono TEXT,
      tipoTrabajo TEXT,
      mensaje TEXT,
      fecha TEXT,
      fecha_vencimiento TEXT,
      usuario_id INTEGER,
      estado TEXT DEFAULT 'pendiente',
      activo INTEGER DEFAULT 1,
      FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    )
  `);

  // Tabla de clientes
  db.run(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      telefono TEXT NOT NULL,
      direccion TEXT,
      categoria TEXT CHECK(categoria IN ('Particular', 'Empresa', 'Constructor/Obra', 'Cliente Frecuente')) DEFAULT 'Particular',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      activo INTEGER DEFAULT 1
    )
  `);

  // Tabla de presupuestos detallados
  db.run(`
    CREATE TABLE IF NOT EXISTS presupuestos_detallados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_presupuesto TEXT UNIQUE NOT NULL,
      cliente_id INTEGER,
      nombre_cliente TEXT NOT NULL,
      email_cliente TEXT NOT NULL,
      telefono_cliente TEXT,
      tipo_trabajo TEXT NOT NULL,
      descripcion TEXT,
      tipo_material TEXT,
      precio_metro_cuadrado REAL,
      cantidad REAL DEFAULT 0,
      precio_material_unitario REAL DEFAULT 0,
      subtotal_material REAL DEFAULT 0,
      tiempo_estimado_horas REAL DEFAULT 0,
      precio_hora_mano_obra REAL DEFAULT 0,
      subtotal_mano_obra REAL DEFAULT 0,
      total REAL DEFAULT 0,
      fecha_vencimiento TEXT,
      observaciones TEXT,
      estado TEXT DEFAULT 'pendiente',
      validez_dias INTEGER DEFAULT 30,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER,
      activo INTEGER DEFAULT 1,
      FOREIGN KEY (cliente_id) REFERENCES clientes (id),
      FOREIGN KEY (created_by) REFERENCES usuarios (id)
    )
  `);

  // Tabla de items de presupuesto
  db.run(`
    CREATE TABLE IF NOT EXISTS presupuesto_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      presupuesto_id INTEGER NOT NULL,
      descripcion TEXT NOT NULL,
      cantidad REAL NOT NULL DEFAULT 1,
      precio_unitario REAL NOT NULL DEFAULT 0,
      subtotal REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (presupuesto_id) REFERENCES presupuestos_detallados (id)
    )
  `);

  // Historial de acciones de presupuestos detallados
  db.run(`
    CREATE TABLE IF NOT EXISTS presupuesto_historial (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      presupuesto_id INTEGER NOT NULL,
      accion TEXT NOT NULL,
      estado_anterior TEXT,
      estado_nuevo TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER,
      FOREIGN KEY (presupuesto_id) REFERENCES presupuestos_detallados (id),
      FOREIGN KEY (created_by) REFERENCES usuarios (id)
    )
  `);

  // Tabla de facturas
  db.run(`
    CREATE TABLE IF NOT EXISTS facturas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_factura TEXT UNIQUE NOT NULL,
      presupuesto_id INTEGER,
      cliente_id INTEGER,
      nombre_cliente TEXT NOT NULL,
      email_cliente TEXT,
      telefono_cliente TEXT,
      descripcion TEXT,
      total REAL DEFAULT 0,
      fecha_vencimiento TEXT,
      metodo_pago TEXT DEFAULT 'efectivo',
      observaciones TEXT,
      estado TEXT DEFAULT 'pendiente',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER,
      activo INTEGER DEFAULT 1,
      FOREIGN KEY (presupuesto_id) REFERENCES presupuestos_detallados (id),
      FOREIGN KEY (cliente_id) REFERENCES clientes (id),
      FOREIGN KEY (created_by) REFERENCES usuarios (id)
    )
  `);

  // Tabla de proveedores
  db.run(`
    CREATE TABLE IF NOT EXISTS proveedores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      telefono TEXT NOT NULL,
      direccion TEXT,
      rubro TEXT,
      cuit TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de compras (órdenes / facturas de proveedores)
  db.run(`
    CREATE TABLE IF NOT EXISTS compras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_compra TEXT UNIQUE,
      proveedor_id INTEGER,
      descripcion TEXT,
      total REAL DEFAULT 0,
      pagado REAL DEFAULT 0,
      fecha_vencimiento TEXT,
      estado TEXT DEFAULT 'pendiente',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (proveedor_id) REFERENCES proveedores (id)
    )
  `);

  // Tabla de pagos (ingresos/egresos)
  db.run(`
    CREATE TABLE IF NOT EXISTS pagos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER,
      proveedor_id INTEGER,
      factura_id INTEGER,
      compra_id INTEGER,
      tipo_pago TEXT CHECK(tipo_pago IN ('ingreso','egreso')) NOT NULL,
      monto REAL NOT NULL,
      metodo_pago TEXT,
      fecha_pago TEXT,
      referencia TEXT,
      observaciones TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cliente_id) REFERENCES clientes (id),
      FOREIGN KEY (proveedor_id) REFERENCES proveedores (id),
      FOREIGN KEY (factura_id) REFERENCES facturas (id),
      FOREIGN KEY (compra_id) REFERENCES compras (id)
    )
  `);

  console.log('✅ Tablas creadas/verificadas correctamente');

  // Semilla: crear usuario admin por defecto si no existen usuarios
  db.get(`SELECT COUNT(*) AS count FROM usuarios`, [], (err, row) => {
    if (err) {
      console.error('Error al verificar usuarios:', err.message);
      return;
    }

    const userCount = row ? row.count : 0;
    if (userCount === 0) {
      const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@herreria.com';
      const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
      const defaultName = 'Administrador';
      const defaultRole = 'empleado';

      bcrypt.hash(defaultPassword, 10, (hashErr, hash) => {
        if (hashErr) {
          console.error('Error al hashear la contraseña por defecto:', hashErr);
          return;
        }

        db.run(
          `INSERT OR IGNORE INTO usuarios (nombre, email, password_hash, rol, activo, fecha_registro) VALUES (?, ?, ?, ?, 1, datetime('now'))`,
          [defaultName, defaultEmail, hash, defaultRole],
          function(insertErr) {
            if (insertErr) {
              console.error('Error al insertar usuario admin por defecto:', insertErr.message);
            } else {
              console.log(`🔐 Usuario admin creado: ${defaultEmail} (contraseña por defecto disponible en DEFAULT_ADMIN_PASSWORD)`);
            }
          }
        );
      });
    }
  });

  // Agregar columna categoría a clientes si no existe
  db.run(`ALTER TABLE clientes ADD COLUMN categoria TEXT CHECK(categoria IN ('Particular', 'Empresa', 'Constructor/Obra', 'Cliente Frecuente')) DEFAULT 'Particular'`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error al agregar columna categoría:', err.message);
    }
  });

  // Agregar columnas nuevas a facturas si no existen
  db.run(`ALTER TABLE facturas ADD COLUMN descripcion TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error al agregar columna descripcion:', err.message);
    }
  });

  db.run(`ALTER TABLE facturas ADD COLUMN activo INTEGER DEFAULT 1`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error al agregar columna activo en facturas:', err.message);
    }
  });

  db.run(`ALTER TABLE presupuestos ADD COLUMN activo INTEGER DEFAULT 1`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error al agregar columna activo en presupuestos:', err.message);
    }
  });

  db.run(`ALTER TABLE presupuestos ADD COLUMN fecha_vencimiento TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error al agregar columna fecha_vencimiento en presupuestos:', err.message);
    }
  });

  db.run(`ALTER TABLE presupuestos_detallados ADD COLUMN activo INTEGER DEFAULT 1`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error al agregar columna activo en presupuestos_detallados:', err.message);
    }
  });
  
  db.run(`ALTER TABLE facturas ADD COLUMN fecha_vencimiento TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error al agregar columna fecha_vencimiento:', err.message);
    }
  });
  
  db.run(`ALTER TABLE facturas ADD COLUMN metodo_pago TEXT DEFAULT 'efectivo'`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error al agregar columna metodo_pago:', err.message);
    }
  });
  
  db.run(`ALTER TABLE facturas ADD COLUMN observaciones TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error al agregar columna observaciones:', err.message);
    }
  });

  db.run(`ALTER TABLE facturas ADD COLUMN telefono_cliente TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error al agregar columna telefono_cliente:', err.message);
    }
  });

  // Agregar columnas nuevas a presupuestos_detallados si no existen (para compatibilidad con frontend)
  db.run(`ALTER TABLE presupuestos_detallados ADD COLUMN largo REAL`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error al agregar columna largo a presupuestos_detallados:', err.message);
    }
  });

  db.run(`ALTER TABLE presupuestos_detallados ADD COLUMN ancho REAL`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error al agregar columna ancho a presupuestos_detallados:', err.message);
    }
  });

  db.run(`ALTER TABLE presupuestos_detallados ADD COLUMN tipo_material TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error al agregar columna tipo_material a presupuestos_detallados:', err.message);
    }
  });

  db.run(`ALTER TABLE presupuestos_detallados ADD COLUMN precio_metro_cuadrado REAL`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error al agregar columna precio_metro_cuadrado a presupuestos_detallados:', err.message);
    }
  });

  db.run(`ALTER TABLE presupuestos_detallados ADD COLUMN cantidad REAL DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error al agregar columna cantidad a presupuestos_detallados:', err.message);
    }
  });

  db.run(`ALTER TABLE presupuestos_detallados ADD COLUMN precio_material_unitario REAL DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error al agregar columna precio_material_unitario a presupuestos_detallados:', err.message);
    }
  });

  db.run(`ALTER TABLE presupuestos_detallados ADD COLUMN subtotal_material REAL DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error al agregar columna subtotal_material a presupuestos_detallados:', err.message);
    }
  });

  db.run(`ALTER TABLE presupuestos_detallados ADD COLUMN tiempo_estimado_horas REAL DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error al agregar columna tiempo_estimado_horas a presupuestos_detallados:', err.message);
    }
  });

  db.run(`ALTER TABLE presupuestos_detallados ADD COLUMN precio_hora_mano_obra REAL DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error al agregar columna precio_hora_mano_obra a presupuestos_detallados:', err.message);
    }
  });

  db.run(`ALTER TABLE presupuestos_detallados ADD COLUMN subtotal_mano_obra REAL DEFAULT 0`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error al agregar columna subtotal_mano_obra a presupuestos_detallados:', err.message);
    }
  });

  db.run(`ALTER TABLE presupuestos_detallados ADD COLUMN validez_dias INTEGER DEFAULT 30`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error al agregar columna validez_dias a presupuestos_detallados:', err.message);
    }
  });

  // Depuración: listar todos los pagos existentes en la base de datos
  db.all(
    `SELECT * FROM pagos`,
    [],
    (err, rows) => {
      if (err) {
        console.error("Error consultando pagos:", err.message);
      } else {
        console.log("📌 TODOS LOS PAGOS:");
        console.table(rows);
      }
    }
  );
});

module.exports = db;
