'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const [registerData, setRegisterData] = useState({
    nombre: '',
    email: '',
    password: ''
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (!auth.isLoading && auth.user) {
      if (auth.isEmployee()) {
        router.push('/admin');
      } else {
        router.push('/');
      }
    }
  }, [auth.isLoading, auth.user, auth.isEmployee, router]);

  // Actualizar el título de la página
  useEffect(() => {
    document.title = 'Iniciar Sesión - Herrería Malabia S.H.';
  }, []);

  // Mostrar loading mientras se verifica la autenticación
  if (auth.isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginData.email || !loginData.password) {
      showToast('Por favor complete todos los campos', 'error');
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(loginData.email)) {
      showToast('Por favor ingresa un email válido', 'error');
      return;
    }

    setLoading(true);
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      
      // Modo desarrollo sin backend
      if (!apiUrl) {
        // Login local para desarrollo
        const mockUser = {
          id: 1,
          nombre: 'Usuario Demo',
          email: loginData.email,
          rol: loginData.email.includes('admin') || loginData.email.includes('empleado') ? 'empleado' as const : 'cliente' as const
        };
        
        const mockToken = 'dev-token-' + Date.now();
        
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 500));
        
        auth.login(mockUser, mockToken);
        showToast(`¡Bienvenido, ${mockUser.nombre}!`, 'success');
        
        setTimeout(() => {
          if (mockUser.rol === 'empleado') {
            router.push('/admin');
          } else {
            router.push('/productos');
          }
        }, 1000);
        
        return;
      }

      // Login con backend real
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Credenciales incorrectas');
      }

      const data = await response.json();
      
      // Usar el contexto de autenticación para manejar el login
      auth.login(data.user, data.token);
      
      showToast(`¡Bienvenido, ${data.user.nombre}!`, 'success');
      
      // Redirigir según el rol con un pequeño delay para que se actualice el estado
      setTimeout(() => {
        if (data.user.rol === 'empleado') {
          router.push('/admin'); // Dashboard para empleados
        } else {
          router.push('/'); // Página principal para clientes
        }
      }, 100);
      
    } catch (error: any) {
      showToast(error.message || 'Error de conexión', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!registerData.nombre || !registerData.email || !registerData.password) {
      showToast('Por favor complete todos los campos', 'error');
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerData.email)) {
      showToast('Por favor ingresa un email válido', 'error');
      return;
    }

    setLoading(true);

    try {
      // Determinar el rol basado en el dominio del email
      const isEmployee = registerData.email.toLowerCase().endsWith('@malabiash.com');
      const role = isEmployee ? 'empleado' : 'cliente';

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...registerData,
          rol: role
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error en el registro');
      }

      const data = await response.json();
      
      // Usar el contexto de autenticación para manejar el registro
      auth.login(data.user, data.token);
      
      showToast(`¡Bienvenido! Te has registrado como ${role}`, 'success');
      
      // Redirigir según el rol con un pequeño delay para que se actualice el estado
      setTimeout(() => {
        if (isEmployee) {
          router.push('/admin'); // Dashboard para empleados
        } else {
          router.push('/'); // Página principal para clientes
        }
      }, 100);
      
    } catch (error: any) {
      showToast(error.message || 'Error al registrar usuario', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-8 p-4 pt-2">
      {/* Top Bar con Logo */}
      <header className="w-full max-w-4xl transform -translate-y-8">
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

      {/* Contenedor Principal de Login */}
      <div 
        className={`bg-white rounded-xl shadow-2xl relative overflow-hidden w-full max-w-xl sm:max-w-2xl md:max-w-2xl md:min-h-[420px] mx-auto px-4 sm:px-6 transform -translate-y-8 md:-translate-y-10 transition-all duration-600 ${
          isSignUp ? 'active' : ''
        }`}
        style={{ position: 'relative' }}
      >
        {/* Formulario de Registro */}
        <div 
          className="absolute top-0 md:h-full h-auto md:w-1/2 w-full transition-all duration-600 ease-in-out"
          style={{
            left: 0,
            opacity: isSignUp ? 1 : 0,
            zIndex: isSignUp ? 30 : 10,
            transform: isSignUp ? 'translateX(100%)' : 'translateX(0)',
            pointerEvents: isSignUp ? 'auto' : 'none'
          }}
        >
          <form onSubmit={handleRegister} className="md:h-full h-auto flex flex-col items-center justify-center p-6 md:p-8 text-center max-w-sm mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-gray-900">Crear cuenta</h1>
            <input 
              type="text" 
              placeholder="Nombre"
              value={registerData.nombre}
              onChange={(e) => setRegisterData({...registerData, nombre: e.target.value})}
              className="bg-gray-100 border-none p-2 my-2 w-full rounded text-black"
              required 
            />
            <input 
              type="email" 
              placeholder="Correo"
              value={registerData.email}
              onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
              className="bg-gray-100 border-none p-2 my-2 w-full rounded text-black"
              required 
              autoComplete="off"
            />
            <input 
              type="password" 
              placeholder="Contraseña"
              value={registerData.password}
              onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
              className="bg-gray-100 border-none p-2 my-2 w-full rounded text-black"
              required 
              autoComplete="new-password"
            />
            <button 
              type="submit"
              className="mt-4 bg-green-600 text-white font-bold py-2 px-8 rounded-full uppercase tracking-wide hover:bg-green-700 transition"
            >
              Registrarse
            </button>

            {/* Toggle para móviles */}
            <button
              type="button"
              onClick={() => setIsSignUp(false)}
              className="mt-4 text-sm text-gray-600 underline md:hidden"
            >
              ¿Ya tenés cuenta? Iniciar sesión
            </button>
          </form>
        </div>

        {/* Formulario de Login */}
        <div 
          className="absolute top-0 md:h-full h-auto md:w-1/2 w-full transition-all duration-600 ease-in-out"
          style={{
            left: 0,
            zIndex: isSignUp ? 10 : 30,
            opacity: isSignUp ? 0 : 1,
            transform: isSignUp ? 'translateX(100%)' : 'translateX(0)',
            pointerEvents: isSignUp ? 'none' : 'auto'
          }}
        >
          <form onSubmit={handleLogin} className="md:h-full h-auto flex flex-col items-center justify-center p-6 md:p-8 text-center max-w-sm mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-gray-900">Iniciar sesión</h1>
            <input 
              type="email" 
              placeholder="Correo"
              value={loginData.email}
              onChange={(e) => setLoginData({...loginData, email: e.target.value})}
              className="bg-gray-100 border-none p-2 my-2 w-full rounded text-black"
              required 
              autoComplete="off"
            />
            <input 
              type="password" 
              placeholder="Contraseña"
              value={loginData.password}
              onChange={(e) => setLoginData({...loginData, password: e.target.value})}
              className="bg-gray-100 border-none p-2 my-2 w-full rounded text-black"
              required 
              autoComplete="current-password"
            />
            <Link
              href="/forgot-password"
              className="text-sm text-gray-600 my-4 hover:text-green-600 transition block"
            >
              ¿Olvidaste tu contraseña?
            </Link>
            <button 
              type="submit"
              disabled={loading}
              className="mt-4 bg-green-600 text-white font-bold py-2 px-8 rounded-full uppercase tracking-wide hover:bg-green-700 transition disabled:opacity-50"
            >
              {loading ? 'Cargando...' : 'Entrar'}
            </button>

            {/* Toggle para móviles */}
            <button
              type="button"
              onClick={() => setIsSignUp(true)}
              className="mt-4 text-sm text-gray-600 underline md:hidden"
            >
              ¿No tenés cuenta? Crear una
            </button>
          </form>
        </div>

        {/* Panel de Overlay (transición animada) */}
        {/* Overlay sólo en pantallas md+ para evitar desbordes en móvil */}
        <div 
          className="hidden md:block absolute top-0 left-1/2 w-1/2 h-full overflow-hidden transition-transform duration-600 ease-in-out z-10"
          style={{
            transform: isSignUp ? 'translateX(-100%)' : 'translateX(0)',
          }}
        >
          <div 
            className="relative h-full w-[200%] text-white transition-transform duration-600 ease-in-out"
            style={{
              background: 'linear-gradient(to right, #16a34a, #15803d)',
              left: '-100%',
              transform: isSignUp ? 'translateX(50%)' : 'translateX(0)',
            }}
          >
            {/* Panel Izquierdo (para cuando está en Sign Up) */}
            <div 
              className="absolute flex flex-col items-center justify-center p-10 text-center top-0 h-full w-1/2 transition-transform duration-600 ease-in-out"
              style={{
                left: 0,
                transform: isSignUp ? 'translateX(0)' : 'translateX(-20%)',
              }}
            >
              <h1 className="text-3xl font-bold mb-4">¡Bienvenido de nuevo!</h1>
              <p className="mb-6 text-sm leading-relaxed px-4">
                Acceda a su cuenta para continuar gestionando pedidos, materiales y clientes de Herrería Malabia S.H.
              </p>
              <button 
                onClick={() => setIsSignUp(false)}
                className="border-2 border-white bg-transparent text-white font-bold py-3 px-12 rounded-full uppercase tracking-wide hover:bg-white hover:text-green-700 transition"
              >
                Iniciar sesión
              </button>
            </div>

            {/* Panel Derecho (para cuando está en Sign In) */}
            <div 
              className="absolute flex flex-col items-center justify-center p-10 text-center top-0 h-full w-1/2 transition-transform duration-600 ease-in-out"
              style={{
                right: 0,
                transform: isSignUp ? 'translateX(20%)' : 'translateX(0)',
              }}
            >
              <h1 className="text-3xl font-bold mb-4">¡Bienvenido a Herrería Malabia S.H.!</h1>
              <p className="mb-6 text-sm leading-relaxed px-4">
                Si aún no tienes una cuenta, puedes registrarte aquí.
              </p>
              <button 
                onClick={() => setIsSignUp(true)}
                className="border-2 border-white bg-transparent text-white font-bold py-3 px-12 rounded-full uppercase tracking-wide hover:bg-white hover:text-green-700 transition"
              >
                Registrarse
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Recuperación de Contraseña */}
      {/* Eliminado - Ahora usa la página dedicada /forgot-password */}

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
