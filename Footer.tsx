'use client';

import { usePathname } from 'next/navigation';
import { Phone, Mail, MapPin, Instagram } from 'lucide-react';

export default function Footer() {
  const pathname = usePathname();

  // Ocultar footer en páginas de administración específicas (no en /admin principal)
  if (pathname?.startsWith('/admin/')) {
    return null;
  }
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 pt-20 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Información de contacto */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-green-400">Contacto</h3>
            <ul className="space-y-3">
              <li className="flex items-center space-x-2">
                <Phone className="w-5 h-5" />
                <span>+54 9 3814 78-4590</span>
              </li>
              <li className="flex items-center space-x-2">
                <Mail className="w-5 h-5" />
                <span>metalurgicamalabiash@hotmail.com</span>
              </li>
              <li className="flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Mariano Moreno 1996, San Miguel, Tucumán</span>
              </li>
            </ul>
          </div>

          {/* Enlaces rápidos */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-green-400">Enlaces</h3>
            <ul className="space-y-2">
              <li><a href="/servicios" className="hover:text-green-400 transition">Servicios</a></li>
              <li><a href="/productos" className="hover:text-green-400 transition">Productos</a></li>
              <li><a href="/presupuesto" className="hover:text-green-400 transition">Solicitar Presupuesto</a></li>
            </ul>
          </div>

          {/* Redes sociales */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-green-400">Síguenos</h3>
            <div className="flex space-x-4">
              <a href="https://www.instagram.com/metalurgica.malabia?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" className="hover:text-green-400 transition" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
                <Instagram className="w-6 h-6" />
              </a>
            </div>
            <p className="mt-4 text-gray-400 text-sm">
              Síguenos en nuestras redes sociales para ver nuestros últimos proyectos.
            </p>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Herrería Malabia S.H. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
