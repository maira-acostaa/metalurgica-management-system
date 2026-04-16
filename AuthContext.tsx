'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  nombre: string;
  email: string;
  rol: 'empleado' | 'cliente';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (userData: User, authToken: string) => void;
  logout: () => void;
  isLoading: boolean;
  isEmployee: () => boolean;
  isClient: () => boolean;
  refreshAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Verificar si hay datos de usuario guardados al cargar
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('user_data');

    if (savedToken && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setToken(savedToken);
        
        // Solo verificar token si hay backend configurado
        if (process.env.NEXT_PUBLIC_API_URL) {
          verifyToken(savedToken);
        }
      } catch (error) {
        console.error('Error al cargar datos de usuario:', error);
        // Limpiar datos corruptos pero no redirigir automáticamente
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
      }
    }
    
    setIsLoading(false);
  }, []);

  const verifyToken = async (authToken: string) => {
    // En desarrollo sin backend configurado, no verificar token
    if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_API_URL) {
      return;
    }
    
    try {
      // Solo verificar token si existe una URL de API configurada
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      
      if (!apiUrl) {
        return;
      }

      const response = await fetch(`${apiUrl}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Token inválido');
      }

      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      // Solo hacer logout si es un error de autenticación real, no de conectividad
      console.warn('No se pudo verificar el token con el backend:', error);
      if (process.env.NODE_ENV === 'development') {
        return;
      }
      logout();
    }
  };

  const login = (userData: User, authToken: string) => {
    // Actualizar el estado inmediatamente
    setUser(userData);
    setToken(authToken);
    
    // Guardar en localStorage
    localStorage.setItem('auth_token', authToken);
    localStorage.setItem('user_data', JSON.stringify(userData));
    
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    router.push('/login');
  };

  const isEmployee = (): boolean => {
    return user?.rol === 'empleado';
  };

  const isClient = (): boolean => {
    return user?.rol === 'cliente';
  };

  const refreshAuth = () => {
    // Forzar una re-lectura del estado de autenticación desde localStorage
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('user_data');

    if (savedToken && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setToken(savedToken);
      } catch (error) {
        console.error('Error al refrescar autenticación:', error);
        logout();
      }
    } else {
      setUser(null);
      setToken(null);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isLoading,
    isEmployee,
    isClient,
    refreshAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}

// Hook para proteger rutas
export function useRequireAuth(redirectTo: string = '/login') {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.isLoading && !auth.user) {
      router.push(redirectTo);
    }
  }, [auth.isLoading, auth.user, router, redirectTo]);

  return auth;
}

// Hook para proteger rutas de empleados
export function useRequireEmployee(redirectTo: string = '/') {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.isLoading) {
      if (!auth.user) {
        router.push('/login');
      } else if (!auth.isEmployee()) {
        router.push(redirectTo);
      }
    }
  }, [auth.isLoading, auth.user, auth.isEmployee, router, redirectTo]);

  return auth;
}

// Función de utilidad para limpiar autenticación corrupta (para desarrollo)
export function clearAuthData() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    window.location.reload();
  }
}

// Función para verificar si hay backend disponible
export function hasBackend() {
  return !!process.env.NEXT_PUBLIC_API_URL;
}