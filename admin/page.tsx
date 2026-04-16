'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRequireEmployee } from '@/contexts/AuthContext';
import { 
  ClipboardList, 
  Package, 
  BarChart3, 
  FileText, 
  ChevronRight,
  Shield,
  Clock,
  TrendingUp,
  Zap,
  Plus,
  Users2
} from 'lucide-react';

export default function AdminDashboard() {
  const auth = useRequireEmployee();

  // Actualizar el título de la página
  useEffect(() => {
    document.title = 'Panel de Administración - Herrería Malabia S.H.';
  }, []);

  if (auth.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500/20 border-t-blue-500 mx-auto mb-6 shadow-lg"></div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Cargando Panel</h3>
            <p className="text-slate-600">Preparando tu espacio de trabajo...</p>
          </div>
        </div>
      </div>
    );
  }

  const gestiones = [
    {
      id: 'administrativa',
      titulo: 'Gestión Administrativa',
      descripcion: 'Registro de clientes, emisión de presupuestos y facturas, registro de pagos y control de cuentas',
      icon: ClipboardList,
      color: 'bg-gradient-to-r from-green-500 to-green-600',
      colorGradient: 'from-green-500/10 to-green-600/10',
      href: '/admin/gestion-administrativa',
      features: ['Clientes', 'Presupuestos', 'Facturas', 'Pagos', 'Cuentas'],
      badge: 'Esencial',
      badgeColor: 'bg-green-100 text-green-700'
    },
    {
      id: 'productos-servicios',
      titulo: 'Productos y Servicios',
      descripcion: 'Manejo de productos estándar y personalizados, tarificación base y control de tiempos de producción',
      icon: Package,
      color: 'bg-gradient-to-r from-emerald-500 to-green-600',
      colorGradient: 'from-emerald-500/10 to-green-600/10',
      href: '/admin/productos-servicios',
      features: ['Productos Estándar', 'Productos Personalizados', 'Tarificación', 'Tiempos de Producción'],
      badge: 'Popular',
      badgeColor: 'bg-emerald-100 text-emerald-700'
    },
    {
      id: 'stock-inteligente',
      titulo: 'Stock Inteligente',
      descripcion: 'Predicción de consumo de materiales según historial de pedidos, alertas automáticas de materiales faltantes, generación de órdenes de compra sugeridas y análisis de ventas y demanda',
      icon: BarChart3,
      color: 'bg-gradient-to-r from-slate-500 to-gray-600',
      colorGradient: 'from-slate-500/10 to-gray-600/10',
      href: '/admin/stock-inteligente',
      features: ['Predicción de Consumo', 'Alertas Automáticas', 'Órdenes Sugeridas', 'Análisis de Ventas'],
      badge: 'IA',
      badgeColor: 'bg-slate-100 text-slate-700'
    },
    {
      id: 'automatizacion',
      titulo: 'Automatizaciones de Presupuesto',
      descripcion: 'Sistema de presupuestos automáticos con cálculos inteligentes y optimización de tiempos',
      icon: Zap,
      color: 'bg-gradient-to-r from-green-600 to-emerald-700',
      colorGradient: 'from-green-600/10 to-emerald-700/10',
      href: '/admin/automatizacion-presupuesto',
      features: ['Presupuestos Automáticos', 'Cálculos Inteligentes', 'Plantillas', 'Optimización'],
      badge: 'Auto',
      badgeColor: 'bg-green-100 text-green-700'
    },
    {
      id: 'recursos-humanos',
      titulo: 'Recursos Humanos',
      descripcion: 'Registro de empleados, control de asistencias y horarios, cálculo de horas trabajadas y liquidación de sueldos',
      icon: Users2,
      color: 'bg-gradient-to-r from-gray-500 to-slate-600',
      colorGradient: 'from-gray-500/10 to-slate-600/10',
      href: '/admin/recursos-humanos',
      features: ['Registro de Empleados', 'Control de Asistencias', 'Horarios', 'Liquidación de Sueldos'],
      badge: 'Core',
      badgeColor: 'bg-gray-100 text-gray-700'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50 to-slate-100 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-green-200/20 to-slate-200/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-green-200/20 to-gray-200/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
      
      {/* Header con diseño ultramoderno */}
      <div className="relative bg-white/90 backdrop-blur-lg shadow-xl border-b border-gray-200/50">
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/8 via-gray-600/5 to-slate-600/5"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl blur opacity-75"></div>
                <div className="relative p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-2xl">
                  <Shield className="w-10 h-10 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-green-800 to-slate-800 bg-clip-text text-transparent mb-2">
                  Panel de Administración
                </h1>
                <p className="text-lg text-gray-600 font-medium">Bienvenido, {auth.user?.nombre || 'Administrador'}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                    En línea
                  </span>
                  <span className="text-sm text-gray-500">
                    Último acceso: {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
              <div className="text-center sm:text-right">
                <p className="text-sm text-gray-500 mb-1">Fecha actual</p>
                <p className="text-xl font-bold text-gray-800">{new Date().toLocaleDateString('es-AR')}</p>
                <div className="flex items-center justify-center sm:justify-end space-x-2 mt-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">{new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
              
              <button 
                onClick={auth.logout}
                className="group relative bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-8 py-4 rounded-2xl font-bold transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
              >
                <span className="relative z-10">Cerrar Sesión</span>
                <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Sección de título principal */}
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-6">
            Módulos de Gestión
          </h2>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse delay-100"></div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse delay-200"></div>
          </div>
        </div>

        {/* Tarjetas de Gestión Ultramodernas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 mb-16">
          {gestiones.map((gestion, index) => {
            const IconComponent = gestion.icon;
            return (
              <Link
                key={gestion.id}
                href={gestion.href}
                className="group relative block"
              >
                <div className="relative bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border border-slate-200/50 overflow-hidden transition-all duration-500 transform hover:-translate-y-3 hover:shadow-2xl">
                  {/* Gradiente de fondo decorativo */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${gestion.colorGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                  
                  {/* Elemento decorativo superior */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/20 to-transparent rounded-full transform translate-x-16 -translate-y-16"></div>
                  
                  <div className="relative p-8">
                    {/* Header con icono y badge */}
                    <div className="flex items-start justify-between mb-6">
                      <div className="relative">
                        <div className={`absolute inset-0 ${gestion.color} rounded-2xl blur-lg opacity-25 scale-110`}></div>
                        <div className={`relative p-4 ${gestion.color} rounded-2xl shadow-xl group-hover:scale-110 transition-transform duration-300`}>
                          <IconComponent className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-2">
                        {gestion.badge && (
                          <span className={`px-3 py-1 text-xs font-bold rounded-full ${gestion.badgeColor} shadow-sm`}>
                            {gestion.badge}
                          </span>
                        )}
                        <ChevronRight className="w-6 h-6 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all duration-300" />
                      </div>
                    </div>

                    {/* Contenido */}
                    <div className="mb-8">
                      <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-slate-800 transition-colors">
                        {gestion.titulo}
                      </h3>
                      <p className="text-slate-600 leading-relaxed">
                        {gestion.descripcion}
                      </p>
                    </div>

                    {/* Features con nuevo diseño */}
                    <div className="mb-6">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
                        Funcionalidades incluidas:
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {gestion.features.map((feature, featureIndex) => (
                          <div key={featureIndex} className="flex items-center space-x-3">
                            <div className={`w-2 h-2 ${gestion.color} rounded-full shadow-sm`}></div>
                            <span className="text-sm text-slate-700 font-medium">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Botón de acción */}
                    <div className="pt-6 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-700">Acceder al módulo</span>
                        <div className="flex items-center text-sm font-semibold text-slate-500 group-hover:text-blue-600 transition-colors">
                          <span>Abrir</span>
                          <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Elemento decorativo inferior */}
                  <div className={`absolute bottom-0 left-0 w-full h-1 ${gestion.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`}></div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Acciones Rápidas */}
        <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-8">
          {/* Gradiente de fondo sutil */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 rounded-2xl opacity-60"></div>
          
          <div className="relative">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-2">
                Acciones Rápidas
              </h3>
              <p className="text-slate-600 text-sm">
                Accede directamente a las funcionalidades más utilizadas
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Link
                href="/admin/productos-servicios?action=nuevo"
                className="group flex items-center space-x-3 p-4 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl hover:border-green-300 hover:bg-green-50/80 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                  <Plus className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-sm font-semibold text-slate-700 group-hover:text-green-700 transition-colors">
                  Nuevo Producto
                </span>
              </Link>
              
              <Link
                href="/admin/gestion-administrativa?view=presupuestos"
                className="group flex items-center space-x-3 p-4 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/80 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-700 transition-colors">
                  Ver Presupuestos
                </span>
              </Link>
              
              <Link
                href="/admin/stock-inteligente?view=alertas"
                className="group flex items-center space-x-3 p-4 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl hover:border-purple-300 hover:bg-purple-50/80 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-sm font-semibold text-slate-700 group-hover:text-purple-700 transition-colors">
                  Alertas de Stock
                </span>
              </Link>
              
              <Link
                href="/admin/automatizacion-presupuesto?tool=calculadora"
                className="group flex items-center space-x-3 p-4 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl hover:border-orange-300 hover:bg-orange-50/80 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                  <Zap className="w-5 h-5 text-orange-600" />
                </div>
                <span className="text-sm font-semibold text-slate-700 group-hover:text-orange-700 transition-colors">
                  Calculadora
                </span>
              </Link>

              <Link
                href="/admin/recursos-humanos?view=empleados"
                className="group flex items-center space-x-3 p-4 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl hover:border-teal-300 hover:bg-teal-50/80 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="p-2 bg-teal-100 rounded-lg group-hover:bg-teal-200 transition-colors">
                  <Users2 className="w-5 h-5 text-teal-600" />
                </div>
                <span className="text-sm font-semibold text-slate-700 group-hover:text-teal-700 transition-colors">
                  Gestión RRHH
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}