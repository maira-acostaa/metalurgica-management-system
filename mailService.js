const nodemailer = require('nodemailer');

// Configuración del transporter de Gmail
let transporter = null;

// Inicializar transporter si las credenciales están disponibles
function initializeTransporter() {
  if (process.env.GMAIL_USER && process.env.GMAIL_PASSWORD) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD // Usar "contraseña de aplicación" de Google
      }
    });
    console.log('✅ Transporter de Gmail configurado');
    return true;
  } else {
    console.log('⚠️  Gmail no configurado. Los links se mostrarán en consola.');
    return false;
  }
}

// Inicializar transporter al cargar el módulo
initializeTransporter();

/**
 * Enviar correo de recuperación de contraseña
 * @param {string} email - Email del usuario
 * @param {string} resetLink - Link para resetear contraseña
 */
async function sendPasswordResetEmail(email, resetLink) {
  // Si no hay transporter configurado, mostrar en consola
  if (!transporter) {
    console.log('\n' + '═'.repeat(60));
    console.log('🔐 LINK DE RECUPERACIÓN DE CONTRASEÑA');
    console.log('═'.repeat(60));
    console.log(`📧 Email: ${email}`);
    console.log(`🔗 Link: ${resetLink}`);
    console.log('═'.repeat(60) + '\n');
    return true;
  }

  try {
    const mailOptions = {
      from: process.env.GMAIL_USER || 'noreply@herreria-malabia.com',
      to: email,
      subject: '🔐 Recupera tu contraseña - Herrería Malabia S.H.',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Herrería Malabia S.H.</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Recuperación de Contraseña</p>
          </div>
          
          <div style="padding: 30px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
            <p style="color: #1f2937; font-size: 16px; margin-bottom: 20px;">
              Hola,
            </p>
            
            <p style="color: #4b5563; font-size: 14px; margin-bottom: 25px; line-height: 1.6;">
              Hemos recibido una solicitud para recuperar tu contraseña. Si no fuiste tú quien lo solicitó, puedes ignorar este mensaje y tu contraseña permanecerá sin cambios.
            </p>

            <div style="margin: 30px 0; text-align: center;">
              <a href="${resetLink}" style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px; transition: all 0.3s ease;">
                Cambiar Contraseña
              </a>
            </div>

            <p style="color: #6b7280; font-size: 12px; margin-top: 30px; margin-bottom: 20px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
              <strong>O copia este enlace en tu navegador:</strong><br>
              <code style="background-color: #e5e7eb; padding: 8px 12px; border-radius: 4px; display: block; word-break: break-all; margin-top: 10px; font-size: 11px;">
                ${resetLink}
              </code>
            </p>

            <p style="color: #9ca3af; font-size: 11px; margin-top: 30px;">
              <strong>⏰ Nota importante:</strong> Este enlace expirará en 24 horas por razones de seguridad.
            </p>

            <p style="color: #9ca3af; font-size: 11px; margin-top: 15px;">
              Si no solicitaste cambiar tu contraseña, por favor contacta con nuestro equipo de soporte inmediatamente.
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 11px; background-color: #f3f4f6;">
            <p style="margin: 0;">© 2024 Herrería Malabia S.H. Todos los derechos reservados.</p>
            <p style="margin: 5px 0 0 0; font-size: 10px;">Este es un mensaje automático, por favor no respondas a este correo.</p>
          </div>
        </div>
      `,
      text: `
Recuperación de Contraseña - Herrería Malabia S.H.

Hola,

Hemos recibido una solicitud para recuperar tu contraseña. 

Para cambiar tu contraseña, abre el siguiente enlace en tu navegador:
${resetLink}

Este enlace expirará en 24 horas por razones de seguridad.

Si no solicitaste cambiar tu contraseña, por favor contacta con nuestro equipo de soporte.

© 2024 Herrería Malabia S.H. Todos los derechos reservados.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Correo de recuperación enviado a:', email);
    console.log('📧 MessageId:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error al enviar correo de recuperación:', error.message);
    return false;
  }
}

/**
 * Enviar correo de confirmación de cambio de contraseña
 * @param {string} email - Email del usuario
 */
async function sendPasswordChangedEmail(email) {
  // Si no hay transporter configurado, solo loguear
  if (!transporter) {
    console.log('\n' + '═'.repeat(60));
    console.log('✅ CONTRASEÑA ACTUALIZADA');
    console.log('═'.repeat(60));
    console.log(`📧 Email: ${email}`);
    console.log('═'.repeat(60) + '\n');
    return true;
  }

  try {
    const mailOptions = {
      from: process.env.GMAIL_USER || 'noreply@herreria-malabia.com',
      to: email,
      subject: '✅ Contraseña Actualizada - Herrería Malabia S.H.',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Herrería Malabia S.H.</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Contraseña Actualizada</p>
          </div>
          
          <div style="padding: 30px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <div style="font-size: 48px;">✅</div>
            </div>

            <p style="color: #1f2937; font-size: 16px; margin-bottom: 20px; text-align: center;">
              Tu contraseña ha sido actualizada exitosamente
            </p>
            
            <p style="color: #4b5563; font-size: 14px; margin-bottom: 25px; line-height: 1.6;">
              Ya puedes iniciar sesión en tu cuenta con tu nueva contraseña. Si no realizaste este cambio, por favor contacta con nosotros inmediatamente.
            </p>

            <div style="background-color: #dbeafe; border-left: 4px solid #16a34a; padding: 15px; border-radius: 4px; margin: 25px 0;">
              <p style="color: #1e40af; font-size: 13px; margin: 0;">
                <strong>🔒 Consejo de seguridad:</strong> 
                No compartas tu contraseña con nadie. El equipo de soporte nunca te la solicitará.
              </p>
            </div>

            <p style="color: #6b7280; font-size: 12px; margin-top: 30px; text-align: center;">
              Si tienes preguntas o necesitas ayuda, no dudes en contactarnos.
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 11px; background-color: #f3f4f6;">
            <p style="margin: 0;">© 2024 Herrería Malabia S.H. Todos los derechos reservados.</p>
            <p style="margin: 5px 0 0 0; font-size: 10px;">Este es un mensaje automático, por favor no respondas a este correo.</p>
          </div>
        </div>
      `,
      text: `
✅ Contraseña Actualizada - Herrería Malabia S.H.

Tu contraseña ha sido actualizada exitosamente.

Ya puedes iniciar sesión en tu cuenta con tu nueva contraseña.

Si no realizaste este cambio, por favor contacta con nuestro equipo de soporte inmediatamente.

© 2024 Herrería Malabia S.H. Todos los derechos reservados.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Correo de confirmación enviado a:', email);
    console.log('📧 MessageId:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error al enviar correo de confirmación:', error.message);
    return false;
  }
}

module.exports = {
  sendPasswordResetEmail,
  sendPasswordChangedEmail
};