'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MessageCircle } from 'lucide-react';
import { useEffect } from 'react';

export default function ServiciosPage() {
  // Actualizar el título de la página
  useEffect(() => {
    document.title = 'Servicios - Herrería Malabia S.H.';
  }, []);
  
  const servicios = [
    {
      titulo: 'Portones Corredizos y Batientes',
      descripcion: 'Diseñamos e instalamos portones de hierro de alta calidad, tanto corredizos como batientes, con acabados personalizados y posibilidad de automatización.',
      imagen: '/imagenes/portoncorredizo.jpg',
      destacado: true
    },
    {
      titulo: 'Portones Perforados',
      descripcion: 'Portones con diseños perforados que combinan seguridad y ventilación. Ideales para garajes, depósitos y espacios industriales.',
      imagen: '/imagenes/portonperforado.jpg',
      destacado: false
    },
    {
      titulo: 'Puertas de Seguridad',
      descripcion: 'Fabricación de puertas de acero inoxidable para máxima seguridad. Garantizamos resistencia sin sacrificar la estética.',
      imagen: '/imagenes/puertainoxidable.jpg',
      destacado: false
    },
    {
      titulo: 'Puertas Dobles',
      descripcion: 'Puertas dobles de hierro para accesos amplios, comercios y viviendas. Diseños robustos con acabados a medida.',
      imagen: '/imagenes/puertadoble.jpeg',
      destacado: false
    },
    {
      titulo: 'Puertas Elegantes',
      descripcion: 'Puertas de diseño con detalles ornamentales y artísticos. Perfectas para entradas principales que requieren estética y seguridad.',
      imagen: '/imagenes/puertaelegante.jpeg',
      destacado: true
    },
    {
      titulo: 'Puertas de Hierro',
      descripcion: 'Puertas de hierro forjado para interiores y exteriores. Durabilidad y resistencia garantizadas con múltiples opciones de diseño.',
      imagen: '/imagenes/puerta.jpeg',
      destacado: false
    },
    {
      titulo: 'Barandas y Estructuras',
      descripcion: 'Construcción de barandas, escaleras, vigas, columnas y cualquier estructura metálica para proyectos residenciales, comerciales e industriales.',
      imagen: '/imagenes/barandacircular.jpeg',
      destacado: false
    },
    {
      titulo: 'Barandas Cortas',
      descripcion: 'Barandas compactas para escalones, rampas y accesos reducidos. Funcionales y estéticas, adaptadas a cualquier espacio.',
      imagen: '/imagenes/barandacorta.jpeg',
      destacado: false
    },
    {
      titulo: 'Barandas de Acero Inoxidable',
      descripcion: 'Barandas de acero inoxidable de alta resistencia y elegancia. Ideales para ambientes húmedos, piscinas y exteriores modernos.',
      imagen: '/imagenes/barandadeaceroinoxidable.jpg',
      destacado: false
    },
    {
      titulo: 'Barandas Exteriores',
      descripcion: 'Barandas para exteriores con tratamiento anticorrosión. Seguridad y durabilidad en balcones, terrazas y espacios al aire libre.',
      imagen: '/imagenes/barandaexterior.jpeg',
      destacado: false
    },
    {
      titulo: 'Pérgolas y Tinglados',
      descripcion: 'Instalación de pérgolas y tinglados metálicos resistentes para espacios exteriores. Protección y diseño combinados.',
      imagen: '/imagenes/pergola.jpeg',
      destacado: true
    },
    {
      titulo: 'Tinglados Industriales',
      descripcion: 'Tinglados de hierro de gran envergadura para depósitos, talleres y locales comerciales. Estructura robusta con instalación profesional.',
      imagen: '/imagenes/tinglado.jpeg',
      destacado: false
    },
    {
      titulo: 'Mamparas Metálicas',
      descripcion: 'Mamparas y divisiones de hierro para espacios interiores y exteriores. Combinamos funcionalidad con diseño moderno.',
      imagen: '/imagenes/mampara.jpeg',
      destacado: false
    },
    {
      titulo: 'Revestimientos Metálicos',
      descripcion: 'Revestimientos de hierro y acero para paredes, fachadas y superficies. Una solución estética y duradera para tu espacio.',
      imagen: '/imagenes/revestimiento.jpeg',
      destacado: false
    },
    {
      titulo: 'Asadores con Gabinetes',
      descripcion: 'Diseños de asadores con gabinetes y espacios de almacenamiento. Ideales para tus reuniones y eventos.',
      imagen: '/imagenes/asadorcongabinetes.jpg',
      destacado: false
    },
    {
      titulo: 'Asadores de Acero Inoxidable',
      descripcion: 'Asadores construidos en acero inoxidable de alta resistencia al calor y la corrosión. Fáciles de limpiar y de larga duración.',
      imagen: '/imagenes/asadorinoxidable.jpeg',
      destacado: false
    },
    {
      titulo: 'Asadores con Parrilla',
      descripcion: 'Asadores completos con parrilla integrada de hierro fundido. Diseñados para el mejor rendimiento en cada asado.',
      imagen: '/imagenes/asadorparrilla.jpg',
      destacado: false
    },
    {
      titulo: 'Mesas de Barra',
      descripcion: 'Mesas tipo barra de hierro para bares, restaurantes y cocinas. Resistentes, modernas y totalmente personalizables.',
      imagen: '/imagenes/mesabarra.jpg',
      destacado: false
    },
    {
      titulo: 'Mesas de Barra Largas',
      descripcion: 'Mesas de barra de gran longitud para eventos, comedores y espacios gastronómicos. Diseño industrial y elegante.',
      imagen: '/imagenes/mesabarralarga.jpg',
      destacado: false
    },
    {
      titulo: 'Mesas de Hierro',
      descripcion: 'Mesas de hierro forjado para interiores y exteriores. Diseños únicos que combinan estilo artesanal con durabilidad.',
      imagen: '/imagenes/mesa.jpeg',
      destacado: false
    },
    {
      titulo: 'Mesas Cuadradas',
      descripcion: 'Mesas cuadradas de hierro para jardines, patios y espacios exteriores. Robustas y con acabados personalizados.',
      imagen: '/imagenes/mesacuadrada.jpeg',
      destacado: false
    },
    {
      titulo: 'Mesas Decorativas',
      descripcion: 'Mesas con diseños decorativos de hierro forjado. Piezas únicas que aportan carácter y estilo a cualquier ambiente.',
      imagen: '/imagenes/mesaestrella.jpg',
      destacado: false
    },
    {
      titulo: 'Repisas de Hierro',
      descripcion: 'Repisas y estantes de hierro para interiores. Resistentes, funcionales y con un estilo industrial muy popular.',
      imagen: '/imagenes/repisa.jpg',
      destacado: false
    }
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <section className="bg-gradient-to-r from-gray-900 to-gray-700 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Nuestros Servicios
          </h1>
          <p className="text-xl text-gray-200 max-w-2xl mx-auto">
            Soluciones completas en herrería para tu hogar, negocio o industria
          </p>
        </div>
      </section>

      {/* Lista de Servicios */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {servicios.map((servicio, index) => (
            <div 
              key={index}
              className={`bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-2xl transition ${
                servicio.destacado ? 'ring-2 ring-accent-500' : ''
              }`}
            >
              <div className="relative h-56 bg-gray-100">
                <Image 
                  src={servicio.imagen}
                  alt={servicio.titulo}
                  fill
                  className="object-contain"
                />
                {servicio.destacado && (
                  <div className="absolute top-4 right-4 bg-accent-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                    Popular
                  </div>
                )}
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold mb-3 text-gray-900">
                  {servicio.titulo}
                </h3>
                <p className="text-gray-600 mb-6">
                  {servicio.descripcion}
                </p>
                <Link 
                  href="/presupuesto"
                  className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-6 rounded-lg transition"
                >
                  <MessageCircle className="w-5 h-5" />
                  Consultar
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary-700 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            ¿No encuentras lo que buscas?
          </h2>
          <p className="text-xl mb-6 text-gray-200">
            También realizamos trabajos personalizados según tus necesidades
          </p>
          <Link 
            href="/presupuesto"
            className="bg-accent-500 hover:bg-accent-600 text-white font-bold py-3 px-8 rounded-lg text-lg transition inline-block"
          >
            Contáctanos
          </Link>
        </div>
      </section>
    </div>
  );
}
