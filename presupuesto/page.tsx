'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Send, CheckCircle, Phone, Mail, MessageCircle } from 'lucide-react';

export default function PresupuestoPage() {
  const searchParams = useSearchParams();
  const productoParam = searchParams?.get('producto');

  const [formData, setFormData] = useState({
    nombreCliente: '',
    email: '',
    telefono: '',
    tipoTrabajo: productoParam || '',
    mensaje: ''
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Actualizar el título de la página dinámicamente
  useEffect(() => {
    document.title = 'Presupuesto - Herrería Malabia S.H.';
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/presupuestos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Error al enviar el presupuesto');
      }

      setSuccess(true);
      setFormData({
        nombreCliente: '',
        email: '',
        telefono: '',
        tipoTrabajo: '',
        mensaje: ''
      });

      // Scroll al mensaje de éxito
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError('Hubo un problema al enviar tu solicitud. Por favor, intenta nuevamente o contáctanos por teléfono.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const tiposTrabajo = [
    'Portón Corredizo',
    'Portón Batiente',
    'Rejas de Seguridad',
    'Escalera Metálica',
    'Baranda',
    'Estructura Metálica',
    'Automatización',
    'Reparación',
    'Otro'
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <section className="bg-gradient-to-r from-gray-900 to-gray-700 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Solicitar Presupuesto
          </h1>
          <p className="text-xl text-gray-200 max-w-2xl mx-auto">
            Completa el formulario y nos pondremos en contacto contigo a la brevedad
          </p>
        </div>
      </section>

      {/* Formulario */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* Mensaje de éxito */}
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-lg mb-8 flex items-center gap-3">
              <CheckCircle className="w-6 h-6" />
              <div>
                <h3 className="font-bold">¡Presupuesto enviado exitosamente!</h3>
                <p>Nos pondremos en contacto contigo en las próximas 24 horas.</p>
              </div>
            </div>
          )}

          {/* Mensaje de error */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg mb-8">
              <h3 className="font-bold mb-2">Error</h3>
              <p>{error}</p>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nombre */}
              <div>
                <label htmlFor="nombreCliente" className="block text-gray-700 font-semibold mb-2">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  id="nombreCliente"
                  name="nombreCliente"
                  value={formData.nombreCliente}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-black"
                  placeholder="Juan Pérez"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-gray-700 font-semibold mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-black"
                  placeholder="juan@ejemplo.com"
                />
              </div>

              {/* Teléfono */}
              <div>
                <label htmlFor="telefono" className="block text-gray-700 font-semibold mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  id="telefono"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-black"
                  placeholder="11-1234-5678"
                />
              </div>

              {/* Tipo de Trabajo */}
              <div>
                <label htmlFor="tipoTrabajo" className="block text-gray-700 font-semibold mb-2">
                  Tipo de Trabajo
                </label>
                <select
                  id="tipoTrabajo"
                  name="tipoTrabajo"
                  value={formData.tipoTrabajo}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-black"
                  required
                >
                  <option value="">Selecciona una opción</option>
                  {tiposTrabajo.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mensaje */}
              <div>
                <label htmlFor="mensaje" className="block text-gray-700 font-semibold mb-2">
                  Mensaje / Detalles del Proyecto
                </label>
                <textarea
                  id="mensaje"
                  name="mensaje"
                  value={formData.mensaje}
                  onChange={handleChange}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-black"
                  placeholder="Describe tu proyecto: medidas, materiales, ubicación, plazo estimado, etc."
                />
              </div>

              {/* Botón de envío */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 px-6 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Enviar Solicitud
                  </>
                )}
              </button>
            </form>

            {/* Información de contacto alternativa */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="font-bold text-gray-900 mb-3">O contáctanos directamente:</h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-pink-100">
                    <Phone className="w-5 h-5 text-pink-500" />
                  </span>
                  <span className="font-medium">Teléfono:</span>
                  <span className="text-gray-800">+54 9 3814 78-4590</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
                    <Mail className="w-5 h-5 text-blue-500" />
                  </span>
                  <span className="font-medium">Email:</span>
                  <span className="text-gray-800">metalurgicamalabiash@hotmail.com</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100">
                    <MessageCircle className="w-5 h-5 text-green-500" />
                  </span>
                  <span className="font-medium">WhatsApp:</span>
                  <span className="text-gray-800">+54 9 3814 78-4590</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
