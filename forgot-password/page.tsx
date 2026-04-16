'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  useEffect(() => {
    document.title = 'Recuperar Contraseña - Herrería Malabia S.H.';
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      showToast('Por favor ingresa tu email', 'error');
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast('Por favor ingresa un email válido', 'error');
      return;
    }

    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (data.success) {
        setSubmitted(true);
        showToast('✅ Si el email existe, recibirás un correo con instrucciones', 'success');
        
        // Redirigir después de 4 segundos
        setTimeout(() => {
          router.push('/login');
        }, 4000);
      } else {
        showToast(data.message || 'Error al procesar la solicitud', 'error');
      }
    } catch (error: any) {
      showToast('Error de conexión con el servidor', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center gap-8 p-4">
      {/* Top Bar con Logo */}
      <header className="w-full max-w-4xl">
        <div className="bg-white rounded-xl shadow-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/logo.jpg"
              alt="Logo"
              width={60}
              height={60}
              className="rounded-lg"
            />
            <div className="flex-1">
              <div className="font-bold text-green-700 text-lg">Herrería Malabia S.H.</div>
              <div className="text-sm text-gray-600">Productos de herrería y más</div>
            </div>
          </div>
          <Link
            href="/"
            className="px-4 py-2 border border-gray-300 rounded-lg text-green-700 font-semibold hover:bg-green-50 transition"
          >
            ← Volver
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-10 text-center text-white">
            <div className="text-4xl mb-3">🔐</div>
            <h1 className="text-2xl font-bold mb-2">Recuperar Contraseña</h1>
            <p className="text-green-100 text-sm">
              Ingresa tu email y te enviaremos un enlace para cambiar tu contraseña
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email registrado
                  </label>
                  <input
                    type="email"
                    id="email"
                    placeholder="ejemplo@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 text-black"
                    required
                    disabled={loading}
                    autoComplete="off"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Nota:</strong> Por seguridad, no revelaremos si el email existe o no. Si el email está registrado, recibirás un correo con instrucciones.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white font-bold py-3 px-4 rounded-lg hover:from-green-700 hover:to-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Enviando...
                    </>
                  ) : (
                    '✉️ Enviar enlace de recuperación'
                  )}
                </button>

                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    ¿Recordaste tu contraseña?{' '}
                    <Link
                      href="/login"
                      className="text-green-600 font-semibold hover:text-green-700"
                    >
                      Inicia sesión aquí
                    </Link>
                  </p>
                </div>
              </form>
            ) : (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">✅</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">¡Solicitud enviada!</h2>
                <p className="text-gray-600 mb-6">
                  Si el email está registrado en nuestro sistema, recibirás un correo con instrucciones para recuperar tu contraseña.
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  El enlace de recuperación expirará en 24 horas.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-yellow-800">
                    <strong>💌 Consejo:</strong> Revisa tu carpeta de spam si no ves el correo en unos minutos.
                  </p>
                </div>
                <Link
                  href="/login"
                  className="inline-block bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 transition"
                >
                  ← Volver al login
                </Link>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-8 py-4 border-t border-gray-200 text-center text-xs text-gray-500">
            <p>© 2024 Herrería Malabia S.H. Todos los derechos reservados.</p>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] px-6 py-4 rounded-lg shadow-lg text-white font-semibold transition-all ${
          toast.type === 'success' ? 'bg-green-600' : 
          toast.type === 'error' ? 'bg-red-600' : 
          'bg-blue-600'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
