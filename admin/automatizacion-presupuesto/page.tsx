'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRequireEmployee } from '@/contexts/AuthContext';
import { 
  ArrowLeft,
  Zap,
  Calculator,
  FileText,
  Printer,
  Package,
  User,
  Plus,
  Trash2,
  Edit2,
} from 'lucide-react';

interface PresupuestoItem {
  id: number;
  categoria: string;
  producto: string;
  cantidad: number;
  largo: number;
  ancho: number;
  complejidad: string;
  precioPorM2: number;
  tiempoEstimado: number;
  margen: number;
  subtotal: number;
  tiempo: number;
}

interface DatosCliente {
  nombre: string;
  telefono: string;
  email: string;
  fechaEntrega: string;
}

interface Presupuesto {
  id: number;
  cliente: DatosCliente;
  items: PresupuestoItem[];
  observaciones: string;
}

type ToastType = 'success' | 'error' | 'info';

const CATEGORIAS = {
  'herreria-obra': {
    nombre: 'Herrería de Obra',
    productos: [
      { nombre: 'Portón corredizo', precioPorM2: 15000, tiempoHoras: 24 },
      { nombre: 'Portón batiente', precioPorM2: 12000, tiempoHoras: 16 },
      { nombre: 'Reja para ventana', precioPorM2: 8500, tiempoHoras: 8 },
      { nombre: 'Puerta reja', precioPorM2: 18000, tiempoHoras: 32 }
    ]
  },
  'herreria-artistica': {
    nombre: 'Herrería Artística',
    productos: [
      { nombre: 'Barandilla ornamentada', precioPorM2: 25000, tiempoHoras: 40 },
      { nombre: 'Pérgola decorativa', precioPorM2: 20000, tiempoHoras: 32 },
      { nombre: 'Escalera caracol', precioPorM2: 35000, tiempoHoras: 80 }
    ]
  },
  'servicios': {
    nombre: 'Servicios',
    productos: [
      { nombre: 'Soldadura general', precioPorM2: 5500, tiempoHoras: 8 },
      { nombre: 'Reparación estructural', precioPorM2: 8000, tiempoHoras: 16 },
      { nombre: 'Instalación y montaje', precioPorM2: 3500, tiempoHoras: 12 }
    ]
  }
};

const MULTIPLICADORES_COMPLEJIDAD: Record<string, number> = {
  baja: 0.8,
  media: 1.0,
  alta: 1.5
};

export default function AutomatizacionPresupuesto() {
  const auth = useRequireEmployee();

  // Estado principal del presupuesto
  const [presupuesto, setPresupuesto] = useState<Presupuesto>({
    id: Date.now(),
    cliente: {
      nombre: '',
      telefono: '',
      email: '',
      fechaEntrega: ''
    },
    items: [],
    observaciones: ''
  });

  const [toast, setToast] = useState<{ message: string; type: ToastType; visible: boolean }>({
    message: '',
    type: 'info',
    visible: false
  });

  // Estado para el formulario de nuevo item
  const [formItem, setFormItem] = useState({
    categoria: '',
    producto: '',
    cantidad: 1,
    largo: 0,
    ancho: 0,
    complejidad: 'media',
    precioPorM2: 0
  });

  const [largoInput, setLargoInput] = useState('0');
  const [anchoInput, setAnchoInput] = useState('0');
  const [cantidadInput, setCantidadInput] = useState('1');

  const [editandoCliente, setEditandoCliente] = useState(false);
  const [clienteTemp, setClienteTemp] = useState({ ...presupuesto.cliente });
  const [clientesApi, setClientesApi] = useState<any[]>([]);
  const [cargandoClientes, setCargandoClientes] = useState(true);
  const [errorClientes, setErrorClientes] = useState<string | null>(null);

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3000);
  };

  // Cargar presupuesto y clientes desde API al montar
  useEffect(() => {
    const guardado = localStorage.getItem('presupuestoActual');
    if (guardado) {
      try {
        setPresupuesto(JSON.parse(guardado));
      } catch (e) {
        console.error('Error al cargar presupuesto:', e);
      }
    }

    cargarClientesDelApi();
  }, []);

  // Función para cargar clientes desde la API
  const cargarClientesDelApi = async () => {
    setCargandoClientes(true);
    setErrorClientes(null);
    
    try {
      const token = auth.token || localStorage.getItem('token');
      if (!token) {
        setErrorClientes('No hay sesión activa para cargar clientes');
        setClientesApi([]);
        setCargandoClientes(false);
        return;
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos timeout
      
      const response = await fetch('http://localhost:5000/api/clientes', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        const clientesList = Array.isArray(data) ? data : (data.clientes || []);
        setClientesApi(clientesList);
        setErrorClientes(null);
      } else {
        setErrorClientes(`No se pudieron cargar clientes (código ${response.status})`);
        setClientesApi([]);
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        setErrorClientes('La conexión tardó demasiado. Reintentá.');
      } else {
        setErrorClientes('No se pudo conectar al servidor para traer clientes');
      }
      setClientesApi([]);
    } finally {
      setCargandoClientes(false);
    }
  };

  // Guardar presupuesto a localStorage cuando cambia
  useEffect(() => {
    localStorage.setItem('presupuestoActual', JSON.stringify(presupuesto));
  }, [presupuesto]);

  // Calcular subtotal y tiempo para un item
  const calcularItem = (item: Omit<PresupuestoItem, 'id' | 'subtotal' | 'tiempo'>) => {
    const superficie = item.largo * item.ancho;
    const multiplicador = MULTIPLICADORES_COMPLEJIDAD[item.complejidad] || 1;

    const precioUnitario = superficie * item.precioPorM2 * multiplicador;
    const subtotal = precioUnitario * item.cantidad;

    // Tiempo en días (dividir horas entre 8 horas de trabajo por día)
    const tiempoBase = (item.tiempoEstimado / 8) * superficie * multiplicador;
    const tiempo = Math.ceil(tiempoBase * 10) / 10;

    return {
      subtotal: Math.round(subtotal),
      tiempo
    };
  };

  // Agregar item al presupuesto
  const agregarItem = () => {
    const { categoria, producto, largo, ancho, cantidad, precioPorM2, complejidad } = formItem;

    if (!categoria || !producto || largo <= 0 || ancho <= 0 || cantidad <= 0 || !precioPorM2) {
      showToast('Completá categoría, producto, dimensiones, cantidad y precio por m²', 'error');
      return;
    }

    const categoriaConfig = CATEGORIAS[categoria as keyof typeof CATEGORIAS];
    const productoConfig = categoriaConfig?.productos.find((p) => p.nombre === producto);

    if (!productoConfig) {
      showToast('El producto seleccionado no es válido para esa categoría', 'error');
      return;
    }

    const margenDefault = 30;
    const calculo = calcularItem({
      categoria,
      producto,
      cantidad,
      largo,
      ancho,
      complejidad,
      precioPorM2,
      tiempoEstimado: productoConfig.tiempoHoras,
      margen: margenDefault
    });

    const nuevoItem: PresupuestoItem = {
      id: Date.now(),
      categoria,
      producto,
      cantidad,
      largo,
      ancho,
      complejidad,
      precioPorM2,
      tiempoEstimado: productoConfig.tiempoHoras,
      margen: margenDefault,
      subtotal: calculo.subtotal,
      tiempo: calculo.tiempo
    };

    setPresupuesto(prev => ({
      ...prev,
      items: [...prev.items, nuevoItem]
    }));

    showToast('Item agregado al presupuesto', 'success');

    // Limpiar formulario
    setFormItem({
      categoria: '',
      producto: '',
      cantidad: 1,
      largo: 0,
      ancho: 0,
      complejidad: 'media',
      precioPorM2: 0
    });
    setLargoInput('0');
    setAnchoInput('0');
    setCantidadInput('1');
  };

  // Eliminar item
  const eliminarItem = (id: number) => {
    setPresupuesto(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  // Guardar datos del cliente
  const guardarCliente = () => {
    if (!clienteTemp.nombre) {
      showToast('El nombre del cliente es requerido', 'error');
      return;
    }
    setPresupuesto(prev => ({
      ...prev,
      cliente: { ...clienteTemp }
    }));
    setEditandoCliente(false);
    showToast('Datos del cliente guardados', 'success');
  };

  // Cargar cliente desde la lista de clientes de la API
  const cargarClienteApi = (clienteId: any) => {
    const cliente = clientesApi.find(c => c.id === clienteId || c.id.toString() === clienteId);
    if (cliente) {
      const datosCliente: DatosCliente = {
        nombre: cliente.nombre || '',
        telefono: cliente.telefono || '',
        email: cliente.email || '',
        fechaEntrega: ''
      };
      setPresupuesto(prev => ({
        ...prev,
        cliente: datosCliente
      }));
      setClienteTemp(datosCliente);
    }
  };

  // Función para nuevo presupuesto (limpiar todo)
  const handleNuevoPresupuesto = () => {
    const nuevoEstado: Presupuesto = {
      id: Date.now(),
      cliente: { nombre: '', telefono: '', email: '', fechaEntrega: '' },
      items: [],
      observaciones: ''
    };
    setPresupuesto(nuevoEstado);
    setClienteTemp({ nombre: '', telefono: '', email: '', fechaEntrega: '' });
    setEditandoCliente(false);
    setFormItem({ categoria: '', producto: '', cantidad: 1, largo: 0, ancho: 0, complejidad: 'media', precioPorM2: 0 });
    setLargoInput('0');
    setAnchoInput('0');
    setCantidadInput('1');
    localStorage.removeItem('presupuestoActual');
    showToast('Nuevo presupuesto iniciado', 'info');
  };

  // Función para imprimir presupuesto (solo el resumen)
  const handleImprimir = () => {
    if (presupuesto.items.length === 0) {
      showToast('Agregá al menos un item antes de imprimir', 'error');
      return;
    }

    const ventanaImpresion = window.open('', '', 'width=800,height=600');
    if (!ventanaImpresion) return;

    const totalPresupuesto = presupuesto.items.reduce((sum, item) => sum + item.subtotal, 0);

    const htmlImpresion = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Presupuesto - Herrería Malabia</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; background: white; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #ea580c; padding-bottom: 15px; }
          .logo { max-width: 100px; height: auto; margin-bottom: 10px; }
          .header h1 { color: #ea580c; font-size: 28px; margin-bottom: 5px; }
          .header p { color: #666; font-size: 14px; }
          .section { margin-bottom: 20px; }
          .section h2 { font-size: 16px; color: #333; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          .cliente-info { background: #f9f9f9; padding: 10px; border-radius: 5px; margin-bottom: 15px; border-left: 3px solid #ea580c; }
          .cliente-info p { margin: 5px 0; color: #333; font-size: 14px; }
          .items-list { margin: 15px 0; }
          .item { background: #fafafa; padding: 10px; margin-bottom: 8px; border-left: 3px solid #ea580c; }
          .item-nombre { font-weight: bold; color: #333; }
          .item-detalles { font-size: 13px; color: #666; margin: 3px 0; }
          .item-precio { text-align: right; color: #ea580c; font-weight: bold; }
          .totales { background: #fff3e0; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .total-row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; }
          .total-row strong { color: #ea580c; }
          .monto-total { font-size: 24px; font-weight: bold; color: #ea580c; text-align: right; margin-top: 10px; }
          .observaciones { background: #f5f5f5; padding: 10px; border-radius: 5px; font-size: 13px; color: #555; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #999; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="/logo.jpg" alt="Logo Herrería Malabia" class="logo">
            <h1>PRESUPUESTO</h1>
            <p>Herrería Malabia S.H.</p>
          </div>

          <div class="section cliente-info">
            <p><strong>${presupuesto.cliente.nombre || 'Cliente sin nombre'}</strong></p>
            ${presupuesto.cliente.telefono ? `<p>📞 ${presupuesto.cliente.telefono}</p>` : ''}\n            ${presupuesto.cliente.email ? `<p>📧 ${presupuesto.cliente.email}</p>` : ''}\n            ${presupuesto.cliente.fechaEntrega ? `<p>📅 Entrega: ${new Date(presupuesto.cliente.fechaEntrega).toLocaleDateString('es-AR')}</p>` : ''}\n          </div>

          <div class="section">
            <h2>ITEMS DEL PRESUPUESTO</h2>
            <div class="items-list">
              ${presupuesto.items.map(item => `
                <div class="item">
                  <div class="item-nombre">${item.producto}</div>
                  <div class="item-detalles">${item.largo} x ${item.ancho}m - Cant: ${item.cantidad} - ${item.complejidad}</div>
                  <div class="item-precio">$${item.subtotal.toLocaleString()}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="totales">
            <div class="total-row">
              <span>Total Items:</span>
              <strong>${presupuesto.items.length}</strong>
            </div>
            <div class="monto-total">
              $${totalPresupuesto.toLocaleString()}
            </div>
          </div>

          ${presupuesto.observaciones ? `
            <div class="section">
              <h2>OBSERVACIONES</h2>
              <div class="observaciones">${presupuesto.observaciones}</div>
            </div>
          ` : ''}\n\n          <div class="footer">
            <p>Generado el ${new Date().toLocaleDateString('es-AR')} a las ${new Date().toLocaleTimeString('es-AR')}</p>
            <p>Herrería Malabia S.H. - Presupuesto válido por 30 días</p>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    ventanaImpresion.document.write(htmlImpresion);
    ventanaImpresion.document.close();
  };

  // Calcular totales
  const totalPresupuesto = presupuesto.items.reduce((sum, item) => sum + item.subtotal, 0);

  if (auth.isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {toast.visible && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${
          toast.type === 'success' ? 'bg-green-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-slate-700'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/admin"
                className="flex items-center space-x-2 text-gray-600 hover:text-orange-600 transition"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Volver al Panel</span>
              </Link>
              <div className="h-6 border-l border-gray-300"></div>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Zap className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Automatización de Presupuesto</h1>
                  <p className="text-sm text-gray-600">Cálculo automático de costos y tiempos</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Izquierda - Calculadora */}
          <div className="lg:col-span-2">
            {/* Datos del Cliente */}
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <User className="w-5 h-5 mr-2 text-orange-600" />
                    Datos del Cliente
                  </h2>
                  <button
                    onClick={() => {
                      setEditandoCliente(!editandoCliente);
                      setClienteTemp({ ...presupuesto.cliente });
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {editandoCliente ? (
                <div className="p-6 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Clientes disponibles</label>
                    {cargandoClientes && (
                      <div className="w-full px-3 py-2 border border-blue-300 rounded-lg text-gray-700 bg-blue-50 text-sm flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        Cargando clientes...
                      </div>
                    )}
                    {errorClientes && (
                      <div className="w-full px-3 py-2 border border-red-300 rounded-lg text-red-700 bg-red-50 text-sm mb-2">
                        <p className="font-medium">⚠️ {errorClientes}</p>
                        <button
                          onClick={cargarClientesDelApi}
                          className="mt-2 text-xs underline text-red-600 hover:text-red-800"
                        >
                          Reintentar
                        </button>
                      </div>
                    )}
                    {!cargandoClientes && !errorClientes && clientesApi.length > 0 && (
                      <select
                        onChange={(e) => {
                          if (e.target.value) cargarClienteApi(e.target.value);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-orange-50"
                      >
                        <option value="">Seleccionar cliente</option>
                        {clientesApi.map((cliente) => (
                          <option key={cliente.id} value={cliente.id}>
                            {cliente.nombre}
                          </option>
                        ))}
                      </select>
                    )}
                    {!cargandoClientes && clientesApi.length === 0 && !errorClientes && (
                      <div className="w-full px-3 py-2 border border-yellow-300 rounded-lg text-gray-700 bg-yellow-50 text-sm">
                        No hay clientes registrados en la gestión administrativa
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Nombre del cliente"
                    value={clienteTemp.nombre}
                    onChange={(e) => setClienteTemp({ ...clienteTemp, nombre: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    type="tel"
                    placeholder="Teléfono"
                    value={clienteTemp.telefono}
                    onChange={(e) => setClienteTemp({ ...clienteTemp, telefono: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={clienteTemp.email}
                    onChange={(e) => setClienteTemp({ ...clienteTemp, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    type="date"
                    value={clienteTemp.fechaEntrega}
                    onChange={(e) => setClienteTemp({ ...clienteTemp, fechaEntrega: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={guardarCliente}
                      className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-medium"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditandoCliente(false)}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition font-medium"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar cliente</label>
                    {cargandoClientes && (
                      <div className="w-full px-3 py-2 border border-blue-300 rounded-lg text-gray-700 bg-blue-50 text-sm flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        Cargando clientes...
                      </div>
                    )}
                    {errorClientes && (
                      <div className="w-full px-3 py-2 border border-red-300 rounded-lg text-red-700 bg-red-50 text-sm mb-2">
                        <p className="font-medium">⚠️ {errorClientes}</p>
                        <button
                          onClick={cargarClientesDelApi}
                          className="mt-2 text-xs underline text-red-600 hover:text-red-800"
                        >
                          Reintentar
                        </button>
                      </div>
                    )}
                    {!cargandoClientes && !errorClientes && clientesApi.length > 0 && (
                      <select
                        onChange={(e) => {
                          if (e.target.value) cargarClienteApi(e.target.value);
                        }}
                        className="w-full px-3 py-2 border border-orange-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-orange-50"
                      >
                        <option value="">Buscar cliente...</option>
                        {clientesApi.map((cliente) => (
                          <option key={cliente.id} value={cliente.id}>
                            {cliente.nombre} ({cliente.email})
                          </option>
                        ))}
                      </select>
                    )}
                    {!cargandoClientes && clientesApi.length === 0 && !errorClientes && (
                      <div className="w-full px-3 py-2 border border-yellow-300 rounded-lg text-gray-700 bg-yellow-50 text-sm">
                        No hay clientes registrados en la gestión administrativa
                      </div>
                    )}
                  </div>
                  {presupuesto.cliente.nombre ? (
                    <div className="space-y-2 text-gray-700">
                      <p><strong className="text-gray-900">{presupuesto.cliente.nombre}</strong></p>
                      {presupuesto.cliente.telefono && <p>📞 {presupuesto.cliente.telefono}</p>}
                      {presupuesto.cliente.email && <p>📧 {presupuesto.cliente.email}</p>}
                      {presupuesto.cliente.fechaEntrega && <p>📅 Entrega: {new Date(presupuesto.cliente.fechaEntrega).toLocaleDateString()}</p>}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">Selecciona un cliente o haz clic en editar para agregar datos</p>
                  )}
                </div>
              )}
            </div>

            {/* Calculadora de Items */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Calculator className="w-5 h-5 mr-2 text-orange-600" />
                  Agregar Items
                </h2>
              </div>

              <div className="p-6 space-y-4">
                {/* Categoría */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select
                    value={formItem.categoria}
                    onChange={(e) => setFormItem({ ...formItem, categoria: e.target.value, producto: '' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Seleccionar categoría</option>
                    {Object.entries(CATEGORIAS).map(([key, cat]) => (
                      <option key={key} value={key}>{cat.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Producto */}
                {formItem.categoria && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
                    <select
                      value={formItem.producto}
                      onChange={(e) => setFormItem({ ...formItem, producto: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Seleccionar producto</option>
                      {CATEGORIAS[formItem.categoria as keyof typeof CATEGORIAS]?.productos.map((prod) => (
                        <option key={prod.nombre} value={prod.nombre}>{prod.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Dimensiones y Cantidad */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Largo (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={largoInput}
                      onChange={(e) => {
                        setLargoInput(e.target.value);
                        setFormItem({ ...formItem, largo: parseFloat(e.target.value) || 0 });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ancho (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={anchoInput}
                      onChange={(e) => {
                        setAnchoInput(e.target.value);
                        setFormItem({ ...formItem, ancho: parseFloat(e.target.value) || 0 });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                    <input
                      type="number"
                      value={cantidadInput}
                      onChange={(e) => {
                        setCantidadInput(e.target.value);
                        setFormItem({ ...formItem, cantidad: parseInt(e.target.value) || 1 });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="1"
                    />
                  </div>
                </div>

                {/* Complejidad y Margen */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Complejidad</label>
                    <select
                      value={formItem.complejidad}
                      onChange={(e) => setFormItem({ ...formItem, complejidad: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="baja">Baja (-20%)</option>
                      <option value="media">Media (base)</option>
                      <option value="alta">Alta (+50%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio por m² <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      min="1"
                      value={formItem.precioPorM2 || ''}
                      onChange={(e) => setFormItem({ ...formItem, precioPorM2: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Ingresá el precio..."
                    />
                  </div>
                </div>

                {/* Preview del cálculo */}
                {formItem.categoria && formItem.producto && formItem.largo > 0 && formItem.ancho > 0 && formItem.precioPorM2 > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h3 className="font-semibold text-orange-900 mb-2">Vista Previa</h3>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-orange-700">Superficie total:</p>
                        <p className="font-semibold text-orange-900">{(formItem.largo * formItem.ancho * formItem.cantidad).toFixed(2)} m²</p>
                      </div>
                      <div>
                        <p className="text-orange-700">Unitario:</p>
                        <p className="font-semibold text-orange-900">
                          ${(() => {
                            const producto = CATEGORIAS[formItem.categoria as keyof typeof CATEGORIAS]?.productos.find(p => p.nombre === formItem.producto);
                            const calc = calcularItem({
                              categoria: formItem.categoria,
                              producto: formItem.producto,
                              cantidad: 1,
                              largo: formItem.largo,
                              ancho: formItem.ancho,
                              complejidad: formItem.complejidad,
                              precioPorM2: formItem.precioPorM2,
                              tiempoEstimado: producto?.tiempoHoras || 8,
                              margen: 30
                            });
                            return calc.subtotal.toLocaleString();
                          })()}
                        </p>
                      </div>
                      <div>
                        <p className="text-orange-700">Subtotal estimado:</p>
                        <p className="font-semibold text-orange-900">
                          ${(() => {
                            const producto = CATEGORIAS[formItem.categoria as keyof typeof CATEGORIAS]?.productos.find(p => p.nombre === formItem.producto);
                            const calc = calcularItem({
                              categoria: formItem.categoria,
                              producto: formItem.producto,
                              cantidad: formItem.cantidad,
                              largo: formItem.largo,
                              ancho: formItem.ancho,
                              complejidad: formItem.complejidad,
                              precioPorM2: formItem.precioPorM2,
                              tiempoEstimado: producto?.tiempoHoras || 8,
                              margen: 30
                            });
                            return calc.subtotal.toLocaleString();
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={agregarItem}
                  disabled={!formItem.categoria || !formItem.producto || formItem.largo <= 0 || formItem.ancho <= 0 || formItem.precioPorM2 <= 0}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar Item</span>
                </button>
              </div>
            </div>
          </div>

          {/* Columna Derecha - Resumen */}
          <div>
            <div className="bg-white rounded-lg shadow sticky top-4">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-orange-600" />
                  Resumen
                </h2>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                    <p className="text-[11px] text-gray-500">Items</p>
                    <p className="text-sm font-semibold text-gray-900">{presupuesto.items.length}</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                    <p className="text-[11px] text-gray-500">Total</p>
                    <p className="text-sm font-semibold text-orange-700">${totalPresupuesto.toLocaleString()}</p>
                  </div>
                </div>

                {/* Items */}
                {presupuesto.items.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-gray-500">Sin items agregados</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {presupuesto.items.map((item) => (
                      <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">{item.producto}</p>
                            <p className="text-xs text-gray-600">{item.largo} x {item.ancho}m × {item.cantidad}</p>
                          </div>
                          <button
                            onClick={() => eliminarItem(item.id)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600">${item.subtotal.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Totales */}
                {presupuesto.items.length > 0 && (
                  <>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <p className="text-sm text-orange-700 mb-2">Presupuesto Total</p>
                      <p className="text-2xl font-bold text-orange-900">
                        ${totalPresupuesto.toLocaleString()}
                      </p>
                    </div>
                  </>
                )}

                {/* Observaciones */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                  <textarea
                    value={presupuesto.observaciones}
                    onChange={(e) => setPresupuesto({ ...presupuesto, observaciones: e.target.value })}
                    placeholder="Notas adicionales..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Acciones */}
                <div className="flex flex-col space-y-2">
                  <button
                    onClick={handleImprimir}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium shadow-md hover:shadow-lg"
                  >
                    <Printer className="w-5 h-5" />
                    <span>Imprimir</span>
                  </button>
                  <button
                    onClick={handleNuevoPresupuesto}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium shadow-md hover:shadow-lg"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Realizar Otro Presupuesto</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}