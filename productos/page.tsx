'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MessageCircle, Tag } from 'lucide-react';

interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  imagenUrl: string;
  categoria: string;
}

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Actualizar el título de la página
  useEffect(() => {
    document.title = 'Productos - Herrería Malabia S.H.';
  }, []);

  useEffect(() => {
    fetchProductos();
  }, []);

  const fetchProductos = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/productos`);
      
      if (!response.ok) {
        throw new Error('Error al cargar productos');
      }

  const data = await response.json();
  // Ensure unique products by nombre (filter accidental duplicates)
  const productosRaw = (data.productos || []) as Producto[];
  const productosUnicos: Producto[] = Array.from(new Map(productosRaw.map((p: Producto) => [p.nombre, p])).values());
  setProductos(productosUnicos);
    } catch (err) {
      setError('No se pudieron cargar los productos. Verifica que el backend esté activo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatPrecio = (precio: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(precio);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Cargando productos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg max-w-lg">
          <h3 className="font-bold mb-2">Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <section className="bg-gradient-to-r from-gray-900 to-gray-700 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Catálogo de Productos
          </h1>
          <p className="text-xl text-gray-200 max-w-2xl mx-auto">
            Portones, rejas y estructuras de hierro de primera calidad
          </p>
        </div>
      </section>

      {/* Productos */}
      <section className="container mx-auto px-4 py-16">
        {productos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600 mb-4">
              No hay productos disponibles en este momento
            </p>
            <Link 
              href="/presupuesto"
              className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-6 rounded-lg transition inline-block"
            >
              Solicitar Producto Personalizado
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {productos.map((producto) => (
              <div 
                key={producto.id}
                className="bg-white rounded-lg shadow-lg overflow-hidden transition-transform transform hover:scale-105 hover:shadow-2xl hover:ring-2 hover:ring-green-200 hover:z-10 duration-300"
              >
                <div className="relative h-64 bg-gray-100">
                  <Image 
                    src={producto.imagenUrl}
                    alt={producto.nombre}
                    fill
                    className="object-contain"
                  />
                  {producto.categoria && (
                    <div className="absolute top-4 left-4 bg-primary-600 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                      <Tag className="w-4 h-4" />
                      {producto.categoria}
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-bold mb-2 text-gray-900">
                    {producto.nombre}
                  </h3>
                  <p className="text-gray-600 mb-4 line-clamp-2">
                    {producto.descripcion}
                  </p>
                  <div className="flex items-center justify-center">
                    <Link 
                      href={`/presupuesto?producto=${encodeURIComponent(producto.nombre)}`}
                      className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-6 rounded-lg transition"
                    >
                      <MessageCircle className="w-5 h-5" />
                      Consultar
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="bg-primary-700 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            ¿Necesitas algo personalizado?
          </h2>
          <p className="text-xl mb-6 text-gray-200">
            Fabricamos productos a medida según tus especificaciones
          </p>
          <Link 
            href="/presupuesto"
            className="bg-accent-500 hover:bg-accent-600 text-white font-bold py-3 px-8 rounded-lg text-lg transition inline-block"
          >
            Solicitar Presupuesto
          </Link>
        </div>
      </section>
    </div>
  );
}
