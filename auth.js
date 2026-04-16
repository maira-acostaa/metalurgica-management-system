const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../database');
const { sendPasswordResetEmail, sendPasswordChangedEmail } = require('../services/mailService');
const router = express.Router();

// Mensaje básico para el índice del módulo de autenticación
router.get('/', (req, res) => {
  res.send('Endpoints disponibles: POST /login, POST /register, POST /forgot-password, etc.');
});

// Clave secreta para JWT (en producción usar variable de entorno)
const JWT_SECRET = process.env.JWT_SECRET || 'malabiash_secret_key_2024';

// Middleware para verificar token JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token de acceso requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Middleware para verificar que el usuario sea empleado
const requireEmployee = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Usuario no autenticado' });
  }
  if (req.user.rol !== 'empleado') {
    return res.status(403).json({ message: 'Acceso denegado: se requiere rol de empleado' });
  }
  next();
};

// POST /api/auth/register - Registrar nuevo usuario
router.post('/register', async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;

    // Validaciones básicas
    if (!nombre || !email || !password) {
      return res.status(400).json({ 
        message: 'Nombre, email y contraseña son requeridos' 
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'Formato de email inválido' 
      });
    }

    // Validar dominio para empleados
    const isEmployeeEmail = email.toLowerCase().endsWith('@malabiash.com');
    const userRole = rol || (isEmployeeEmail ? 'empleado' : 'cliente');

    // Verificar que el rol coincide con el dominio
    if (isEmployeeEmail && userRole !== 'empleado') {
      return res.status(400).json({
        message: 'Correos @malabiash.com deben registrarse como empleados'
      });
    }

    // Verificar si el email ya existe
    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM usuarios WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingUser) {
      return res.status(409).json({ 
        message: 'El email ya está registrado' 
      });
    }

    // Hash de la contraseña
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insertar usuario en la base de datos
    const userId = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)',
        [nombre, email, passwordHash, userRole],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // Generar token JWT
    const token = jwt.sign(
      { 
        userId: userId, 
        email: email, 
        rol: userRole 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Respuesta exitosa
    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token: token,
      user: {
        id: userId,
        nombre: nombre,
        email: email,
        rol: userRole
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor' 
    });
  }
});

// POST /api/auth/login - Iniciar sesión
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validaciones básicas
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email y contraseña son requeridos' 
      });
    }

    // Buscar usuario en la base de datos
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM usuarios WHERE email = ? AND activo = 1',
        [email],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return res.status(401).json({ 
        message: 'Credenciales incorrectas' 
      });
    }

    // Verificar contraseña
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ 
        message: 'Credenciales incorrectas' 
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        rol: user.rol 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Respuesta exitosa
    res.json({
      message: 'Login exitoso',
      token: token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor' 
    });
  }
});

// GET /api/auth/verify - Verificar token
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    // Buscar usuario actual
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, nombre, email, rol FROM usuarios WHERE id = ? AND activo = 1',
        [req.user.userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return res.status(404).json({ 
        message: 'Usuario no encontrado' 
      });
    }

    res.json({
      user: user
    });

  } catch (error) {
    console.error('Error en verificación:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor' 
    });
  }
});

// POST /api/auth/logout - Cerrar sesión (opcional, mayormente frontend)
router.post('/logout', authenticateToken, (req, res) => {
  // En un sistema stateless con JWT, el logout se maneja principalmente en el frontend
  // eliminando el token del localStorage
  res.json({ 
    message: 'Sesión cerrada exitosamente' 
  });
});

// PUT /api/auth/usuarios/:id/activo - Baja lógica de usuarios
router.put('/usuarios/:id/activo', authenticateToken, requireEmployee, (req, res) => {
  const { id } = req.params;
  const { activo } = req.body;

  const activoFinal = Number(activo) === 0 ? 0 : 1;

  db.run('UPDATE usuarios SET activo = ? WHERE id = ?', [activoFinal, id], function(err) {
    if (err) {
      return res.status(500).json({ message: 'Error al actualizar usuario' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json({ message: 'Usuario actualizado', activo: activoFinal });
  });
});

// POST /api/auth/forgot-password - Solicitar recuperación de contraseña
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Validar email
    if (!email) {
      return res.status(400).json({ 
        message: 'Email es requerido' 
      });
    }

    // Buscar usuario
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT id, email, nombre FROM usuarios WHERE email = ? AND activo = 1', [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // No revelar si el email existe o no por seguridad
    if (!user) {
      return res.status(200).json({ 
        message: 'Si el email existe en nuestro sistema, recibirás un correo con instrucciones para recuperar tu contraseña.',
        success: true
      });
    }

    // Generar token de recuperación
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 horas

    // Guardar token en la BD
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE usuarios SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
        [resetTokenHash, resetTokenExpires, user.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Construir el link de recuperación (ajusta la URL según tu frontend)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Enviar correo
    const emailSent = await sendPasswordResetEmail(email, resetLink);

    if (emailSent) {
      return res.status(200).json({ 
        message: 'Si el email existe en nuestro sistema, recibirás un correo con instrucciones para recuperar tu contraseña.',
        success: true
      });
    } else {
      console.error('Error al enviar correo de recuperación a:', email);
      return res.status(200).json({ 
        message: 'Si el email existe en nuestro sistema, recibirás un correo con instrucciones para recuperar tu contraseña.',
        success: true
      });
    }

  } catch (error) {
    console.error('Error en forgot-password:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor' 
    });
  }
});

// POST /api/auth/reset-password - Cambiar contraseña con token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, email, newPassword, confirmPassword } = req.body;

    // Validaciones
    if (!token || !email || !newPassword || !confirmPassword) {
      return res.status(400).json({ 
        message: 'Todos los campos son requeridos' 
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ 
        message: 'Las contraseñas no coinciden' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: 'La contraseña debe tener al menos 6 caracteres' 
      });
    }

    // Hash del token recibido
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Buscar usuario
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, email FROM usuarios WHERE email = ? AND reset_token = ? AND reset_token_expires > ? AND activo = 1',
        [email, resetTokenHash, new Date().toISOString()],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Token inválido o expirado' 
      });
    }

    // Hash de la nueva contraseña
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Actualizar contraseña y limpiar token
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE usuarios SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
        [newPasswordHash, user.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Enviar correo de confirmación
    await sendPasswordChangedEmail(email);

    res.status(200).json({ 
      message: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.',
      success: true
    });

  } catch (error) {
    console.error('Error en reset-password:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor' 
    });
  }
});

// POST /api/auth/verify-reset-token - Verificar token de recuperación (para validar antes de mostrar el formulario)
router.post('/verify-reset-token', async (req, res) => {
  try {
    const { token, email } = req.body;

    if (!token || !email) {
      return res.status(400).json({ 
        message: 'Token y email son requeridos',
        valid: false
      });
    }

    // Hash del token
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Verificar token
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id FROM usuarios WHERE email = ? AND reset_token = ? AND reset_token_expires > ? AND activo = 1',
        [email, resetTokenHash, new Date().toISOString()],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Token inválido o expirado',
        valid: false
      });
    }

    res.status(200).json({ 
      message: 'Token válido',
      valid: true
    });

  } catch (error) {
    console.error('Error en verify-reset-token:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      valid: false
    });
  }
});

module.exports = { router, authenticateToken, requireEmployee };