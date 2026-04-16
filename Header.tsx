'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X, LogOut, Shield, User } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const auth = useAuth();
  const pathname = usePathname();

  // Ocultar header en páginas de administración específicas (no en /admin principal)
  if (pathname?.startsWith('/admin/')) {
    return null;
  }

  const getNavLinks = () => {
    const baseLinks = [
      { href: '/', label: 'Inicio' },
      { href: '/servicios', label: 'Servicios' },
      { href: '/productos', label: 'Productos' },
      { href: '/presupuesto', label: 'Presupuesto' },
    ];

    if (auth.user) {
      if (auth.isEmployee()) {
        return [
          ...baseLinks,
          { href: '/admin', label: 'Administración' }
        ];
      } else {
        return baseLinks; // Clientes ven las páginas normales
      }
    } else {
      return [
        ...baseLinks,
        { href: '/login', label: 'Ingresar' }
      ];
    }
  };

  const navLinks = getNavLinks();

  // Determinar el estilo del header según la página
  const isAdminPanel = pathname === '/admin';
  const headerBgClass = isAdminPanel 
    ? 'bg-gradient-to-r from-slate-700 to-gray-800' 
    : 'bg-gray-900';

  return (
    <header className={`${headerBgClass} text-white shadow-lg sticky top-0 z-50`}>
      <nav className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition">
            <Image 
              src="/logo.png" 
              alt="Logo Herrería Malabia S.H." 
              width={60} 
              height={40}
              priority
              className="bg-transparent"
            />
            <div className="flex flex-col">
              <span className="text-xl font-bold text-green-400">HERRERÍA MALABIA S.H.</span>
              <span className="text-xs text-gray-400">Calidad y Experiencia</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <ul className="flex space-x-6">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href} 
                    className="hover:text-green-400 transition font-medium"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* User Info & Logout */}
            {auth.user && (
              <div className="flex items-center space-x-4 ml-6 pl-6 border-l border-gray-700">
                <div className="flex items-center space-x-2 text-sm">
                  {auth.isEmployee() ? (
                    <Shield className="w-4 h-4 text-green-400" />
                  ) : (
                    <User className="w-4 h-4 text-blue-400" />
                  )}
                  <span className="text-gray-300">
                    {auth.user.nombre} 
                    <span className="text-xs ml-1 text-gray-500">
                      ({auth.user.rol})
                    </span>
                  </span>
                </div>
                <button
                  onClick={auth.logout}
                  className="flex items-center space-x-1 text-red-400 hover:text-red-300 transition text-sm"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Salir</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 space-y-2 pb-4 border-t border-gray-700 pt-4">
            <ul className="space-y-2">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href} 
                    className="block py-2 hover:text-green-400 transition"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Mobile User Info */}
            {auth.user && (
              <div className="border-t border-gray-700 pt-3 mt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm">
                    {auth.isEmployee() ? (
                      <Shield className="w-4 h-4 text-green-400" />
                    ) : (
                      <User className="w-4 h-4 text-blue-400" />
                    )}
                    <span className="text-gray-300">
                      {auth.user.nombre} ({auth.user.rol})
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      auth.logout();
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center space-x-1 text-red-400 hover:text-red-300 transition text-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Salir</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
