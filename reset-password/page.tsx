'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Verificar token al cargar la página
  useEffect(() => {
    const verifyToken = async () => {
      if (!token || !email) {
        setVerifying(false);
        setTokenValid(false);
        showToast('Link de recuperación inválido', 'error');
        return;
      }

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${apiUrl}/auth/verify-reset-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token, email })
        });

        const data = await response.json();
        
        if (data.valid) {
          setTokenValid(true);
        } else {
          setTokenValid(false);
          showToast('El link ha expirado. Por favor solicita uno nuevo.', 'error');
        }
      } catch (error) {
        console.error('Error verificando token:', error);
        setTokenValid(false);
        showToast('Error al verificar el token', 'error');
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.newPassword || !formData.confirmPassword) {
      showToast('Por favor completa todos los campos', 'error');
      return;
    }

    if (formData.newPassword.length < 6) {
      showToast('La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      showToast('Las contraseñas no coinciden', 'error');
      return;
    }

    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          email,
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al cambiar la contraseña');
      }

      showToast('✅ Contraseña actualizada exitosamente', 'success');
      
      // Redirigir al login después de 2 segundos
      setTimeout(() => {
        router.push('/login');
      }, 2000);

    } catch (error: any) {
      showToast(error.message || 'Error al cambiar la contraseña', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Pantalla de verificación
  if (verifying) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-8 p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando enlace de recuperación...</p>
        </div>
      </div>
    );
  }

  // Token inválido
  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-8 p-4 pt-2">
        <header className="w-full max-w-4xl">
          <div className="bg-white rounded-xl shadow-lg p-4 flex items-center gap-4">
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
            <Link
              href="/"
              className="px-4 py-2 border border-gray-300 rounded-lg text-green-700 font-semibold hover:bg-green-50 transition"
            >
              ← Volver a Tienda
            </Link>
          </div>
        </header>

        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md text-center">
          <div className="text-red-600 text-4xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Enlace Inválido</h1>
          <p className="text-gray-600 mb-6">
            El enlace de recuperación ha expirado o es inválido. Por favor, solicita uno nuevo.
          </p>
          <div className="flex gap-3">
            <Link
              href="/forgot-password"
              className="flex-1 bg-green-600 text-white font-bold py-2 px-4 rounded-full hover:bg-green-700 transition"
            >
              Solicitar Nuevo
            </Link>
            <Link
              href="/login"
              className="flex-1 bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-full hover:bg-gray-400 transition"
            >
              Ir a Iniciar Sesión
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Formulario de reset de contraseña
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-8 p-4 pt-2">
      <header className="w-full max-w-4xl">
        <div className="bg-white rounded-xl shadow-lg p-4 flex items-center gap-4">
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
          <Link
            href="/"
            className="px-4 py-2 border border-gray-300 rounded-lg text-green-700 font-semibold hover:bg-green-50 transition"
          >
            ← Volver a Tienda
          </Link>
        </div>
      </header>

      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Recuperar Contraseña</h1>
        <p className="text-gray-600 text-center mb-6">Ingresa tu nueva contraseña</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email (solo lectura) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input 
              type="email" 
              value={email || ''}
              disabled
              className="w-full bg-gray-100 border border-gray-300 p-3 rounded-lg text-gray-600 cursor-not-allowed"
            />
          </div>

          {/* Nueva Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nueva Contraseña</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="Ingresa tu nueva contraseña"
                value={formData.newPassword}
                onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                className="w-full bg-gray-100 border-none p-3 rounded-lg text-black pr-10"
                required 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
          </div>

          {/* Confirmar Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar Contraseña</label>
            <div className="relative">
              <input 
                type={showConfirmPassword ? 'text' : 'password'} 
                placeholder="Confirma tu nueva contraseña"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                className="w-full bg-gray-100 border-none p-3 rounded-lg text-black pr-10"
                required 
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {/* Botón de Envío */}
          <button 
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-green-600 text-white font-bold py-3 rounded-lg uppercase tracking-wide hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
          </button>
        </form>

        {/* Link de regreso */}
        <div className="text-center mt-6">
          <p className="text-gray-600 text-sm">
            ¿Recordaste tu contraseña?{' '}
            <Link href="/login" className="text-green-600 font-semibold hover:text-green-700">
              Inicia sesión aquí
            </Link>
          </p>
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