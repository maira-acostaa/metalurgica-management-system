'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRequireEmployee } from '@/contexts/AuthContext';
import { 
  ArrowLeft,
  Package,
  AlertTriangle,
  TrendingUp,
  ShoppingCart,
  BarChart3,
  Calendar,
  Eye,
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  Zap,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  Bell,
  Edit,
  Trash2,
  DollarSign,
  User,
  X
} from 'lucide-react';

interface Material {
  id: number;
  codigo: string;
  nombre: string;
  categoria: string;
  stockActual: number;
  stockMinimo: number;
  stockMaximo: number;
  unidad: string;
  costoUnitario: number;
  proveedor: string;
  ultimaCompra: string;
  consumoPromedio: number;
  tendencia: 'subiendo' | 'bajando' | 'estable';
  diasRestantes: number;
  estado: 'normal' | 'bajo' | 'critico' | 'agotado';
  ubicacion: string;
}

interface OrdenCompra {
  id: number;
  fecha: string;
  proveedor: string;
  estado: 'pendiente' | 'enviada' | 'recibida' | 'cancelada';
  total: number;
  materiales: {
    material: string;
    cantidad: number;
    precio: number;
  }[];
  fechaEntrega?: string;
  tipo: 'manual' | 'automatica';
}

interface Prediccion {
  id: number;
  material: string;
  fechaAgotamiento: string;
  confianza: number;
  sugerenciasCompra: string;
}

interface AnalisisConsumo {
  categoria: string;
  consumoTotal: number;
  tendenciaMes: number;
  proyeccion30Dias: number;
  alertas: number;
  alertasActivas: number;
}

export default function StockInteligente() {
  useRequireEmployee();

  const searchParams = useSearchParams();
  const [tab, setTab] = useState('materiales');
  const [ordenesSearch, setOrdenesSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');

  // Estados principales
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [predicciones, setPredicciones] = useState<Prediccion[]>([]);
  const [analisisConsumo, setAnalisisConsumo] = useState<AnalisisConsumo[]>([]);

  // Estados para modales
  const [showNewMaterialModal, setShowNewMaterialModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showPredictionModal, setShowPredictionModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  // Estado para notificaciones
  const [notification, setNotification] = useState({ 
    show: false, 
    message: '', 
    type: '' 
  });

  // Estado para órdenes de compra
  const [ordenesCompra, setOrdenesCompra] = useState<any[]>([]);
  const [modalOrden, setModalOrden] = useState<{open: boolean, material: any | null}>({open: false, material: null});
  const [cantidadOrden, setCantidadOrden] = useState('');

  // Estado para editar material
  const [showEditMaterialModal, setShowEditMaterialModal] = useState(false);
  const [editMaterialData, setEditMaterialData] = useState<Partial<Material> & { id?: number }>({}); 
  const [proveedoresGestion, setProveedoresGestion] = useState<string[]>([]);

  const abrirEditarMaterial = (material: Material) => {
    setEditMaterialData({ ...material });
    setShowEditMaterialModal(true);
  };

  const guardarEdicionMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    const actualizados = materiales.map(m =>
      m.id === editMaterialData.id
        ? {
            ...m,
            ...editMaterialData,
            stockActual: Number(editMaterialData.stockActual) || 0,
            stockMinimo: Number(editMaterialData.stockMinimo) || 0,
            stockMaximo: Number(editMaterialData.stockMaximo) || 0,
            costoUnitario: Number(editMaterialData.costoUnitario) || 0,
            estado: calcularEstadoStock({
              ...m,
              ...editMaterialData,
              stockActual: Number(editMaterialData.stockActual) || 0,
              stockMinimo: Number(editMaterialData.stockMinimo) || 0,
            } as Material),
          }
        : m
    );
    setMateriales(actualizados);
    localStorage.setItem('materiales', JSON.stringify(actualizados));
    mostrarNotificacion(`Material "${editMaterialData.nombre}" actualizado correctamente`, 'success');
    setShowEditMaterialModal(false);
  };

  // Estado para nuevo material
  const [nuevoMaterial, setNuevoMaterial] = useState({
    codigo: '',
    nombre: '',
    categoria: '',
    unidad: '',
    stockInicial: '',
    stockMinimo: '',
    stockMaximo: '',
    costoUnitario: '',
    proveedor: '',
    ubicacion: ''
  });

  const proveedoresDisponibles = useMemo(() => {
    return Array.from(new Set(proveedoresGestion.filter(Boolean)));
  }, [proveedoresGestion]);

  // Función para mostrar notificaciones
  const mostrarNotificacion = (message: string, type: string) => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  // Efecto para manejar parámetros de URL
  useEffect(() => {
    const view = searchParams.get('view');
    if (view === 'alertas') {
      setTab('alertas');
    }
  }, [searchParams]);

  // Efecto para cargar órdenes desde localStorage
  useEffect(() => {
    const ordenesGuardadas = localStorage.getItem('ordenesCompra');
    if (ordenesGuardadas) {
      try {
        setOrdenesCompra(JSON.parse(ordenesGuardadas));
      } catch (e) {
        console.error('Error al cargar órdenes:', e);
      }
    }
  }, []);

  // Efecto para cargar materiales desde localStorage
  useEffect(() => {
    const materialesGuardados = localStorage.getItem('materiales');
    if (materialesGuardados) {
      try {
        setMateriales(JSON.parse(materialesGuardados));
      } catch (e) {
        console.error('Error al cargar materiales:', e);
        cargarDatosIniciales();
      }
    } else {
      cargarDatosIniciales();
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadProveedoresGestion = () => {
      try {
        const raw = window.localStorage.getItem('proveedores_local');
        if (!raw) {
          setProveedoresGestion([]);
          return;
        }
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const nombres = parsed.map((p: any) => p?.nombre).filter(Boolean);
          setProveedoresGestion(nombres);
        } else {
          setProveedoresGestion([]);
        }
      } catch (error) {
        console.error('Error al leer proveedores guardados:', error);
        setProveedoresGestion([]);
      }
    };

    loadProveedoresGestion();

    const handleUpdate = () => loadProveedoresGestion();
    window.addEventListener('storage', handleUpdate);
    (window as any).addEventListener?.('proveedores-updated', handleUpdate);

    return () => {
      window.removeEventListener('storage', handleUpdate);
      (window as any).removeEventListener?.('proveedores-updated', handleUpdate);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!materiales.length || !ordenesCompra.length) return;

    let huboCambios = false;
    const ordenesActualizadas = ordenesCompra.map((orden) => {
      const materialId = orden?.material?.id;
      if (!materialId) {
        return orden;
      }

      const materialActual = materiales.find((m) => m.id === materialId);
      if (!materialActual) {
        return orden;
      }

      const camposActualizados = {
        nombre: materialActual.nombre,
        unidad: materialActual.unidad,
        proveedor: materialActual.proveedor,
        costoUnitario: materialActual.costoUnitario,
        stockActual: materialActual.stockActual,
        stockMinimo: materialActual.stockMinimo
      };

      const necesitaActualizar = Object.entries(camposActualizados).some(
        ([campo, valor]) => orden.material?.[campo as keyof typeof camposActualizados] !== valor
      );

      if (!necesitaActualizar) {
        return orden;
      }

      huboCambios = true;
      return {
        ...orden,
        material: {
          ...orden.material,
          ...camposActualizados
        }
      };
    });

    if (huboCambios) {
      setOrdenesCompra(ordenesActualizadas);
      try {
        window.localStorage.setItem('ordenesCompra', JSON.stringify(ordenesActualizadas));
      } catch (error) {
        console.error('Error al sincronizar órdenes IA', error);
      }
    }
  }, [materiales, ordenesCompra]);

  const calcularEstadoStock = (material: Material): 'normal' | 'bajo' | 'critico' | 'agotado' => {
    if (material.stockActual === 0) {
      return 'agotado';
    } else if (material.stockActual <= material.stockMinimo * 0.5) {
      return 'critico';
    } else if (material.stockActual <= material.stockMinimo) {
      return 'bajo';
    } else {
      return 'normal';
    }
  };

  // Abrir modal para ingresar cantidad de orden
  const generarOrdenAutomatica = (materialId: number) => {
    const material = materiales.find(m => m.id === materialId);
    if (material) {
      setModalOrden({open: true, material});
      setCantidadOrden('');
    }
  };

  // Confirmar orden de compra
  const confirmarOrdenCompra = () => {
    if (!modalOrden.material || !cantidadOrden || isNaN(Number(cantidadOrden)) || Number(cantidadOrden) <= 0) {
      mostrarNotificacion('Ingrese una cantidad válida', 'error');
      return;
    }
    const nuevaOrden = {
      id: Date.now(),
      material: {
        id: modalOrden.material.id,
        nombre: modalOrden.material.nombre,
        unidad: modalOrden.material.unidad,
        proveedor: modalOrden.material.proveedor,
        costoUnitario: modalOrden.material.costoUnitario,
        stockActual: modalOrden.material.stockActual,
        stockMinimo: modalOrden.material.stockMinimo
      },
      cantidad: Number(cantidadOrden),
      fecha: new Date().toLocaleDateString()
    };
    const nuevasOrdenes = [...ordenesCompra, nuevaOrden];
    setOrdenesCompra(nuevasOrdenes);
    localStorage.setItem('ordenesCompra', JSON.stringify(nuevasOrdenes));
    mostrarNotificacion(`Orden registrada para ${modalOrden.material.nombre}: ${cantidadOrden} ${modalOrden.material.unidad}`, 'success');
    setModalOrden({open: false, material: null});
    setCantidadOrden('');
  };

  // Guardar nuevo material
  const guardarNuevoMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nuevoMaterial.codigo || !nuevoMaterial.nombre || !nuevoMaterial.categoria || !nuevoMaterial.unidad) {
      mostrarNotificacion('Completa los campos requeridos', 'error');
      return;
    }

    const material: Material = {
      id: Date.now(),
      codigo: nuevoMaterial.codigo,
      nombre: nuevoMaterial.nombre,
      categoria: nuevoMaterial.categoria,
      stockActual: Number(nuevoMaterial.stockInicial) || 0,
      stockMinimo: Number(nuevoMaterial.stockMinimo) || 10,
      stockMaximo: Number(nuevoMaterial.stockMaximo) || 100,
      unidad: nuevoMaterial.unidad,
      costoUnitario: Number(nuevoMaterial.costoUnitario) || 0,
      proveedor: nuevoMaterial.proveedor || 'Sin asignar',
      ultimaCompra: new Date().toISOString().split('T')[0],
      consumoPromedio: 0,
      tendencia: 'estable',
      diasRestantes: 30,
      estado: 'normal',
      ubicacion: nuevoMaterial.ubicacion || 'Sin ubicación'
    };

    const nuevosMateriales = [...materiales, material];
    setMateriales(nuevosMateriales);
    localStorage.setItem('materiales', JSON.stringify(nuevosMateriales));
    
    mostrarNotificacion(`Material ${nuevoMaterial.nombre} agregado correctamente`, 'success');
    setShowNewMaterialModal(false);
    setNuevoMaterial({
      codigo: '',
      nombre: '',
      categoria: '',
      unidad: '',
      stockInicial: '',
      stockMinimo: '',
      stockMaximo: '',
      costoUnitario: '',
      proveedor: '',
      ubicacion: ''
    });
  };

  const cargarDatosIniciales = () => {
    // Datos simulados con IA predictiva
    const materialesMock: Material[] = [
      {
        id: 1,
        codigo: 'HRR-001',
        nombre: 'Hierro Angular 25x25x3mm',
        categoria: 'Perfiles',
        stockActual: 15,
        stockMinimo: 20,
        stockMaximo: 100,
        unidad: 'barras',
        costoUnitario: 2500,
        proveedor: 'Aceros del Norte',
        ultimaCompra: '2024-10-15',
        consumoPromedio: 7.5,
        tendencia: 'subiendo',
        diasRestantes: 2,
        estado: 'bajo',
        ubicacion: 'A-01-03'
      },
      {
        id: 2,
        codigo: 'CHP-002',
        nombre: 'Chapa Negra 2mm',
        categoria: 'Chapas',
        stockActual: 8,
        stockMinimo: 15,
        stockMaximo: 50,
        unidad: 'planchas',
        costoUnitario: 8500,
        proveedor: 'Metalúrgica San Martín',
        ultimaCompra: '2024-11-01',
        consumoPromedio: 4.4,
        tendencia: 'estable',
        diasRestantes: 1,
        estado: 'bajo',
        ubicacion: 'B-02-01'
      },
      {
        id: 3,
        codigo: 'SOL-003',
        nombre: 'Electrodo 6013 3.2mm',
        categoria: 'Soldadura',
        stockActual: 25,
        stockMinimo: 30,
        stockMaximo: 100,
        unidad: 'kg',
        costoUnitario: 450,
        proveedor: 'Soldaduras Prana',
        ultimaCompra: '2024-11-10',
        consumoPromedio: 8.3,
        tendencia: 'bajando',
        diasRestantes: 3,
        estado: 'bajo',
        ubicacion: 'C-01-05'
      },
      {
        id: 4,
        codigo: 'PIN-004',
        nombre: 'Pintura Antióxido Premium',
        categoria: 'Pinturas',
        stockActual: 0,
        stockMinimo: 10,
        stockMaximo: 40,
        unidad: 'litros',
        costoUnitario: 1200,
        proveedor: 'Pinturas Rex',
        ultimaCompra: '2024-09-20',
        consumoPromedio: 2.1,
        tendencia: 'estable',
        diasRestantes: 0,
        estado: 'agotado',
        ubicacion: 'D-03-02'
      },
      {
        id: 5,
        codigo: 'TUB-005',
        nombre: 'Tubo Estructural 40x40x2mm',
        categoria: 'Perfiles',
        stockActual: 485,
        stockMinimo: 200,
        stockMaximo: 1000,
        unidad: 'barras',
        costoUnitario: 1850,
        proveedor: 'Hierros & Aceros SA',
        ultimaCompra: '2024-11-08',
        consumoPromedio: 12.6,
        tendencia: 'estable',
        diasRestantes: 38,
        estado: 'normal',
        ubicacion: 'A-02-01'
      }
    ];

    const ordenesMock: OrdenCompra[] = [
      {
        id: 1,
        fecha: '2024-11-12',
        proveedor: 'Aceros del Norte',
        estado: 'pendiente',
        total: 125000,
        materiales: [
          { material: 'Hierro Angular 25x25x3mm', cantidad: 50, precio: 2500 }
        ],
        fechaEntrega: '2024-11-20',
        tipo: 'automatica'
      },
      {
        id: 2,
        fecha: '2024-11-10',
        proveedor: 'Pinturas Rex',
        estado: 'enviada',
        total: 24000,
        materiales: [
          { material: 'Pintura Antióxido Premium', cantidad: 20, precio: 1200 }
        ],
        fechaEntrega: '2024-11-18',
        tipo: 'manual'
      }
    ];

    setMateriales(materialesMock.map(material => ({
      ...material,
      estado: calcularEstadoStock(material)
    })));
    localStorage.setItem('materiales', JSON.stringify(materialesMock.map(material => ({
      ...material,
      estado: calcularEstadoStock(material)
    }))));
    setOrdenes(ordenesMock);
  };

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'normal': return 'border-green-200 text-green-800 bg-green-50';
      case 'bajo': return 'border-yellow-200 text-yellow-800 bg-yellow-50';
      case 'critico': return 'border-orange-200 text-orange-800 bg-orange-50';
      case 'agotado': return 'border-red-200 text-red-800 bg-red-50';
      default: return 'border-gray-200 text-gray-800 bg-gray-50';
    }
  };

  const getStatusIcon = (estado: string) => {
    switch (estado) {
      case 'normal': return <CheckCircle className="w-4 h-4" />;
      case 'bajo': return <AlertTriangle className="w-4 h-4" />;
      case 'critico': return <AlertTriangle className="w-4 h-4" />;
      case 'agotado': return <XCircle className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getTendenciaIcon = (tendencia: string) => {
    switch (tendencia) {
      case 'subiendo': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'bajando': return <TrendingUp className="w-4 h-4 text-red-600 transform rotate-180" />;
      case 'estable': return <Target className="w-4 h-4 text-blue-600" />;
      default: return <Target className="w-4 h-4 text-gray-600" />;
    }
  };

  const materialesFiltrados = materiales.filter(material => {
    const matchSearch = material.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       material.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       material.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = filterCategory === 'todos' || material.categoria === filterCategory;
    const matchStatus = filterStatus === 'todos' || material.estado === filterStatus;
    
    return matchSearch && matchCategory && matchStatus;
  });

  const alertasCriticas = materiales.filter(m => m.estado === 'critico' || m.estado === 'agotado').length;
  const valorTotalStock = materiales.reduce((total, m) => total + (m.stockActual * m.costoUnitario), 0);
  const ordenesPendientes = ordenes.filter(o => o.estado === 'pendiente' || o.estado === 'enviada').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/admin"
                className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Volver al Panel de Gestión</span>
              </Link>
              <div className="h-6 border-l border-gray-300"></div>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ShoppingCart className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Stock Inteligente</h1>
                  <p className="text-sm text-gray-600">Control avanzado de inventario con análisis predictivo</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setTab('materiales')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  tab === 'materiales'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Package className="w-4 h-4" />
                  <span>Materiales</span>
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                    {materiales.length}
                  </span>
                </div>
              </button>
              
              <button
                onClick={() => setTab('alertas')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  tab === 'alertas'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4" />
                  <span>Alertas</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    alertasCriticas > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {alertasCriticas}
                  </span>
                </div>
              </button>
              
              <button
                onClick={() => setTab('ordenes')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  tab === 'ordenes'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="w-4 h-4" />
                  <span>Órdenes IA</span>
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                    {ordenesCompra.length}
                  </span>
                </div>
              </button>
            </nav>
          </div>

          {/* Contenido de las pestañas */}
          <div className="p-6">
            {/* Pestaña de Alertas */}
            {tab === 'alertas' && (
              <div>
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-red-900">Sistema de Alertas Automáticas</h3>
                      <p className="text-red-700">El sistema monitorea continuamente el stock y genera alertas cuando los materiales están por agotarse.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {materiales
                    .filter(material => material.estado === 'agotado' || material.estado === 'critico' || material.estado === 'bajo')
                    .sort((a, b) => {
                      const prioridad = { 'agotado': 4, 'critico': 3, 'bajo': 2, 'normal': 1 };
                      return prioridad[b.estado] - prioridad[a.estado];
                    })
                    .map((material) => (
                      <div key={material.id} className={`border rounded-lg p-6 ${
                        material.estado === 'agotado' ? 'border-red-300 bg-red-50' :
                        material.estado === 'critico' ? 'border-orange-300 bg-orange-50' :
                        'border-yellow-300 bg-yellow-50'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-4">
                              <div className={`p-2 rounded-lg ${
                                material.estado === 'agotado' ? 'bg-red-200' :
                                material.estado === 'critico' ? 'bg-orange-200' :
                                'bg-yellow-200'
                              }`}>
                                {getStatusIcon(material.estado)}
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">{material.nombre}</h3>
                                <p className="text-sm text-gray-600">Código: {material.codigo}</p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                material.estado === 'agotado' ? 'bg-red-100 text-red-800' :
                                material.estado === 'critico' ? 'bg-orange-100 text-orange-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {material.estado.toUpperCase()}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-gray-700">Stock Actual:</span>
                                <div className={`text-lg font-bold ${
                                  material.estado === 'agotado' ? 'text-red-600' :
                                  material.estado === 'critico' ? 'text-orange-600' :
                                  'text-yellow-600'
                                }`}>
                                  {material.stockActual} {material.unidad}
                                </div>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Stock Mínimo:</span>
                                <div className="text-lg font-bold text-gray-900">
                                  {material.stockMinimo} {material.unidad}
                                </div>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Proveedor:</span>
                                <div className="text-sm text-gray-800 font-medium">{material.proveedor}</div>
                                <div className="text-xs text-gray-600">Última compra: {material.ultimaCompra}</div>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Costo Unit.:</span>
                                <div className="text-lg font-bold text-green-600">
                                  ${material.costoUnitario.toLocaleString()}
                                </div>
                              </div>
                            </div>

                            <div className="mt-4">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    material.estado === 'agotado' ? 'bg-red-500' :
                                    material.estado === 'critico' ? 'bg-orange-500' :
                                    'bg-yellow-500'
                                  }`}
                                  style={{ width: `${Math.max((material.stockActual / material.stockMinimo) * 100, 5)}%` }}
                                ></div>
                              </div>
                              <div className="mt-2 flex justify-between text-xs text-gray-600">
                                <span>0</span>
                                <span>Stock Mínimo: {material.stockMinimo}</span>
                              </div>
                            </div>

                            {material.estado === 'agotado' && (
                              <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg">
                                <div className="flex items-center space-x-2">
                                  <AlertTriangle className="w-4 h-4 text-red-600" />
                                  <span className="text-sm font-medium text-red-800">ACCIÓN URGENTE: Solicitar reabastecimiento inmediato</span>
                                </div>
                              </div>
                            )}

                            {material.estado === 'critico' && (
                              <div className="mt-4 p-3 bg-orange-100 border border-orange-200 rounded-lg">
                                <div className="flex items-center space-x-2">
                                  <Clock className="w-4 h-4 text-orange-600" />
                                  <span className="text-sm font-medium text-orange-800">RECORDATORIO: Considerar reposición pronto</span>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col space-y-2 ml-4">
                            <button
                              onClick={() => generarOrdenAutomatica(material.id)}
                              className={`flex items-center space-x-2 px-4 py-2 text-white text-sm rounded-lg transition-colors ${
                                material.estado === 'agotado' ? 'bg-red-600 hover:bg-red-700' :
                                material.estado === 'critico' ? 'bg-orange-600 hover:bg-orange-700' :
                                'bg-yellow-600 hover:bg-yellow-700'
                              }`}
                            >
                              <Zap className="w-4 h-4" />
                              <span>Orden IA</span>
                            </button>
                            <button 
                              onClick={() => setSelectedMaterial(material)}
                              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              <span>Ver Detalles</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  
                  {alertasCriticas === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">¡Todo en orden!</h3>
                      <p>No hay alertas críticas de stock en este momento</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pestaña de Materiales */}
            {tab === 'materiales' && (
              <div>
                {/* Filtros y búsqueda */}
                <div className="mb-6 flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar materiales..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="todos">Todas las categorías</option>
                      <option value="Perfiles">Perfiles</option>
                      <option value="Chapas">Chapas</option>
                      <option value="Soldadura">Soldadura</option>
                      <option value="Pinturas">Pinturas</option>
                    </select>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="todos">Todos los estados</option>
                      <option value="normal">Normal</option>
                      <option value="bajo">Bajo</option>
                      <option value="critico">Crítico</option>
                      <option value="agotado">Agotado</option>
                    </select>
                    <button
                      onClick={() => setShowNewMaterialModal(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Nuevo Material</span>
                    </button>
                  </div>
                </div>

                {/* Lista de materiales */}
                <div className="space-y-4">
                  {materialesFiltrados.map((material) => (
                    <div key={material.id} className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-4">
                            <div className={`p-2 rounded-lg ${
                              material.estado === 'agotado' ? 'bg-red-200' :
                              material.estado === 'critico' ? 'bg-orange-200' :
                              material.estado === 'bajo' ? 'bg-yellow-200' :
                              'bg-green-200'
                            }`}>
                              {getStatusIcon(material.estado)}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{material.nombre}</h3>
                              <p className="text-sm text-gray-600">Código: {material.codigo} • {material.categoria}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(material.estado)}`}>
                              {material.estado.toUpperCase()}
                            </span>
                            <div className="flex items-center space-x-1">
                              {getTendenciaIcon(material.tendencia)}
                              <span className="text-sm text-gray-600 capitalize">{material.tendencia}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Stock Actual:</span>
                              <div className={`text-lg font-bold ${
                                material.estado === 'agotado' ? 'text-red-600' :
                                material.estado === 'critico' ? 'text-orange-600' :
                                material.estado === 'bajo' ? 'text-yellow-600' :
                                'text-green-600'
                              }`}>
                                {material.stockActual} {material.unidad}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Stock Mínimo:</span>
                              <div className="text-lg font-bold text-gray-900">
                                {material.stockMinimo} {material.unidad}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Proveedor:</span>
                              <div className="text-sm text-gray-800 font-medium">{material.proveedor}</div>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Costo Unit.:</span>
                              <div className="text-lg font-bold text-green-600">
                                ${material.costoUnitario.toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Ubicación:</span>
                              <div className="text-sm text-gray-800 font-medium">{material.ubicacion}</div>
                            </div>
                          </div>

                          <div className="mt-4">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  material.estado === 'agotado' ? 'bg-red-500' :
                                  material.estado === 'critico' ? 'bg-orange-500' :
                                  material.estado === 'bajo' ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`}
                                style={{ width: `${Math.min((material.stockActual / material.stockMaximo) * 100, 100)}%` }}
                              ></div>
                            </div>
                            <div className="mt-2 flex justify-between text-xs text-gray-600">
                              <span>0</span>
                              <span>Máximo: {material.stockMaximo}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col space-y-2 ml-4">
                          <button 
                            onClick={() => setSelectedMaterial(material)}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            <span>Ver Detalles</span>
                          </button>
                          <button
                            onClick={() => abrirEditarMaterial(material)}
                            className="flex items-center space-x-2 px-4 py-2 bg-yellow-500 text-white text-sm rounded-lg hover:bg-yellow-600 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                            <span>Editar</span>
                          </button>
                          {(material.estado === 'bajo' || material.estado === 'critico' || material.estado === 'agotado') && (
                            <button
                              onClick={() => generarOrdenAutomatica(material.id)}
                              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <Zap className="w-4 h-4" />
                              <span>Orden IA</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {materialesFiltrados.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron materiales</h3>
                      <p>Ajusta los filtros de búsqueda o agrega nuevos materiales</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pestaña de Órdenes IA */}
            {tab === 'ordenes' && (
              <div>
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Zap className="w-6 h-6 text-blue-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-blue-900">Órdenes Generadas por IA</h3>
                      <p className="text-blue-700">Órdenes de compra automáticas generadas por el sistema inteligente basadas en niveles de stock.</p>
                    </div>
                  </div>
                </div>

                {ordenesCompra.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hay órdenes generadas</h3>
                    <p className="text-gray-500">Las órdenes aparecerán aquí cuando generes nuevas órdenes de compra</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={ordenesSearch}
                      onChange={(e) => setOrdenesSearch(e.target.value)}
                      placeholder="Buscar por nombre de material..."
                      className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
                    />
                    {ordenesCompra.filter(o => o.material.nombre.toLowerCase().includes(ordenesSearch.trim().toLowerCase())).map((orden) => (
                      <div key={orden.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-gray-900 mb-2">{orden.material.nombre}</h4>
                            <div className="flex flex-wrap gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Cantidad: </span>
                                <span className="font-medium text-gray-900">{orden.cantidad} {orden.material.unidad}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Fecha: </span>
                                <span className="font-medium text-gray-900">{orden.fecha}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Proveedor: </span>
                                <span className="font-medium text-gray-900">{orden.material.proveedor}</span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              const nuevasOrdenes = ordenesCompra.filter(o => o.id !== orden.id);
                              setOrdenesCompra(nuevasOrdenes);
                              localStorage.setItem('ordenesCompra', JSON.stringify(nuevasOrdenes));
                              mostrarNotificacion('Orden eliminada', 'success');
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-600 mb-2"><strong>Detalles:</strong></p>
                          <ul className="space-y-1 text-sm">
                            <li><span className="text-gray-600">Stock Actual:</span> <span className="font-medium text-gray-900">{orden.material.stockActual}</span></li>
                            <li><span className="text-gray-600">Stock Mínimo:</span> <span className="font-medium text-gray-900">{orden.material.stockMinimo}</span></li>
                            <li><span className="text-gray-600">Costo Unitario:</span> <span className="font-medium text-gray-900">${orden.material.costoUnitario.toLocaleString()}</span></li>
                            <li><span className="text-gray-600">Costo Total Est.:</span> <span className="font-medium text-green-600">${(orden.cantidad * orden.material.costoUnitario).toLocaleString()}</span></li>
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Modal de nuevo material */}
      {showNewMaterialModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900">Agregar Nuevo Material</h3>
                <button
                  onClick={() => setShowNewMaterialModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form className="p-6 space-y-4" onSubmit={guardarNuevoMaterial}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código del Material
                  </label>
                  <input
                    type="text"
                    value={nuevoMaterial.codigo}
                    onChange={(e) => setNuevoMaterial({...nuevoMaterial, codigo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: HRR-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Material
                  </label>
                  <input
                    type="text"
                    value={nuevoMaterial.nombre}
                    onChange={(e) => setNuevoMaterial({...nuevoMaterial, nombre: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: Hierro Angular 25x25x3mm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <select 
                    value={nuevoMaterial.categoria}
                    onChange={(e) => setNuevoMaterial({...nuevoMaterial, categoria: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">Seleccionar categoría</option>
                    <option value="Perfiles">Perfiles</option>
                    <option value="Chapas">Chapas</option>
                    <option value="Soldadura">Soldadura</option>
                    <option value="Pinturas">Pinturas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unidad de Medida
                  </label>
                  <select 
                    value={nuevoMaterial.unidad}
                    onChange={(e) => setNuevoMaterial({...nuevoMaterial, unidad: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">Seleccionar unidad</option>
                    <option value="barras">Barras</option>
                    <option value="planchas">Planchas</option>
                    <option value="kg">Kilogramos</option>
                    <option value="litros">Litros</option>
                    <option value="unidades">Unidades</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock Inicial
                  </label>
                  <input
                    type="number"
                    value={nuevoMaterial.stockInicial}
                    onChange={(e) => setNuevoMaterial({...nuevoMaterial, stockInicial: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock Mínimo
                  </label>
                  <input
                    type="number"
                    value={nuevoMaterial.stockMinimo}
                    onChange={(e) => setNuevoMaterial({...nuevoMaterial, stockMinimo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock Máximo
                  </label>
                  <input
                    type="number"
                    value={nuevoMaterial.stockMaximo}
                    onChange={(e) => setNuevoMaterial({...nuevoMaterial, stockMaximo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Costo Unitario
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={nuevoMaterial.costoUnitario}
                    onChange={(e) => setNuevoMaterial({...nuevoMaterial, costoUnitario: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Proveedor
                  </label>
                  <input
                    type="text"
                    value={nuevoMaterial.proveedor}
                    onChange={(e) => setNuevoMaterial({...nuevoMaterial, proveedor: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nombre del proveedor"
                    list="proveedores-lista"
                  />
                  {proveedoresDisponibles.length > 0 && (
                    <datalist id="proveedores-lista">
                      {proveedoresDisponibles.map((proveedor) => (
                        <option key={proveedor} value={proveedor} />
                      ))}
                    </datalist>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ubicación en Depósito
                  </label>
                  <input
                    type="text"
                    value={nuevoMaterial.ubicacion}
                    onChange={(e) => setNuevoMaterial({...nuevoMaterial, ubicacion: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: A-01-03"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowNewMaterialModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Agregar Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Modal de detalles del material */}
      {selectedMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedMaterial.nombre}
                  </h3>
                  <p className="text-sm text-gray-600">Código: {selectedMaterial.codigo}</p>
                </div>
                <button
                  onClick={() => setSelectedMaterial(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Estado del Stock</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Stock Actual:</span>
                      <span className={`font-medium ${
                        selectedMaterial.estado === 'agotado' ? 'text-red-600' :
                        selectedMaterial.estado === 'critico' ? 'text-orange-600' :
                        selectedMaterial.estado === 'bajo' ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {selectedMaterial.stockActual} {selectedMaterial.unidad}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Stock Mínimo:</span>
                      <span className="font-medium text-gray-600">{selectedMaterial.stockMinimo} {selectedMaterial.unidad}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Información Comercial</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Proveedor:</span>
                      <span className="font-medium">{selectedMaterial.proveedor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Costo Unitario:</span>
                      <span className="font-medium text-green-600">${selectedMaterial.costoUnitario.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Información General</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Categoría:</span>
                      <span className="font-medium">{selectedMaterial.categoria}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ubicación:</span>
                      <span className="font-medium">{selectedMaterial.ubicacion}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-medium text-gray-900">Órdenes de Compra</h4>
                  <button
                    onClick={() => generarOrdenAutomatica(selectedMaterial.id)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Generar Orden IA</span>
                  </button>
                </div>
                
                <div className="space-y-3">
                  {ordenes
                    .filter(orden => orden.materiales.some(m => m.material === selectedMaterial.nombre))
                    .map((orden) => {
                      const materialEnOrden = orden.materiales.find(m => m.material === selectedMaterial.nombre);
                      return (
                        <div key={orden.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <span className="font-medium text-gray-900">Orden #{orden.id}</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  orden.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                                  orden.estado === 'enviada' ? 'bg-blue-100 text-blue-800' :
                                  orden.estado === 'recibida' ? 'bg-green-100 text-green-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {orden.estado.charAt(0).toUpperCase() + orden.estado.slice(1)}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600">Cantidad:</span>
                                  <div className="font-medium">{materialEnOrden?.cantidad || 0} {selectedMaterial.unidad}</div>
                                </div>
                                <div>
                                  <span className="text-gray-600">Proveedor:</span>
                                  <div className="font-medium">{orden.proveedor}</div>
                                </div>
                                <div>
                                  <span className="text-gray-600">Total:</span>
                                  <div className="font-medium text-green-600">${orden.total.toLocaleString()}</div>
                                </div>
                              </div>
                            </div>

                            <div className="flex space-x-2 ml-4">
                              <select
                                value={orden.estado}
                                onChange={(e) => {
                                  mostrarNotificacion(`Orden #${orden.id} actualizada`, 'success');
                                }}
                                className="text-sm border border-gray-300 rounded px-2 py-1"
                              >
                                <option value="pendiente">Pendiente</option>
                                <option value="enviada">Enviada</option>
                                <option value="recibida">Recibida</option>
                                <option value="cancelada">Cancelada</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  
                  {ordenes.filter(orden => orden.materiales.some(m => m.material === selectedMaterial.nombre)).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No hay órdenes de compra para este material</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setSelectedMaterial(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notificaciones */}
      {showEditMaterialModal && editMaterialData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">Editar Material</h3>
              <button onClick={() => setShowEditMaterialModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={guardarEdicionMaterial} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={editMaterialData.nombre || ''}
                    onChange={e => setEditMaterialData(prev => ({ ...prev, nombre: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                  <input
                    type="text"
                    value={editMaterialData.codigo || ''}
                    onChange={e => setEditMaterialData(prev => ({ ...prev, codigo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Actual</label>
                  <input
                    type="number"
                    min="0"
                    value={editMaterialData.stockActual ?? ''}
                    onChange={e => setEditMaterialData(prev => ({ ...prev, stockActual: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    value={editMaterialData.stockMinimo ?? ''}
                    onChange={e => setEditMaterialData(prev => ({ ...prev, stockMinimo: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Máximo</label>
                  <input
                    type="number"
                    min="0"
                    value={editMaterialData.stockMaximo ?? ''}
                    onChange={e => setEditMaterialData(prev => ({ ...prev, stockMaximo: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Costo Unitario ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={editMaterialData.costoUnitario ?? ''}
                    onChange={e => setEditMaterialData(prev => ({ ...prev, costoUnitario: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                  <input
                    type="text"
                    value={editMaterialData.proveedor || ''}
                    onChange={e => setEditMaterialData(prev => ({ ...prev, proveedor: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                    list="proveedores-lista-edit"
                  />
                  {proveedoresDisponibles.length > 0 && (
                    <datalist id="proveedores-lista-edit">
                      {proveedoresDisponibles.map((proveedor) => (
                        <option key={`edit-${proveedor}`} value={proveedor} />
                      ))}
                    </datalist>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                  <input
                    type="text"
                    value={editMaterialData.ubicacion || ''}
                    onChange={e => setEditMaterialData(prev => ({ ...prev, ubicacion: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowEditMaterialModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notificaciones */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`px-6 py-4 rounded-lg shadow-lg border backdrop-blur-sm ${
            notification.type === 'success' ? 'bg-green-500/90 text-white border-green-400' :
            notification.type === 'error' ? 'bg-red-500/90 text-white border-red-400' :
            notification.type === 'warning' ? 'bg-yellow-500/90 text-white border-yellow-400' :
            'bg-blue-500/90 text-white border-blue-400'
          }`}>
            <div className="flex items-center space-x-2">
              {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
              {notification.type === 'error' && <XCircle className="w-5 h-5" />}
              {notification.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
              {notification.type === 'info' && <Bell className="w-5 h-5" />}
              <span className="font-medium">{notification.message}</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal Orden IA */}
      {modalOrden.open && modalOrden.material && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <ShoppingCart className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-900">Generar Orden</h2>
                  <p className="text-sm text-gray-600">Nueva orden de compra automática</p>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Material</p>
                <p className="text-gray-900 font-semibold">{modalOrden.material.nombre}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Unidad de Medida</p>
                <p className="text-gray-900 font-semibold">{modalOrden.material.unidad}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cantidad a Comprar</label>
                <input
                  type="number"
                  min="1"
                  value={cantidadOrden}
                  onChange={e => setCantidadOrden(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-gray-900"
                  placeholder={`Cantidad en ${modalOrden.material.unidad}`}
                  autoFocus
                />
              </div>
            </div>
            
            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t">
              <button 
                onClick={() => setModalOrden({open: false, material: null})} 
                className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmarOrdenCompra} 
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de órdenes de compra */}
      {ordenesCompra.length > 0 && (
        <div className="my-8">
          <h3 className="text-lg font-bold mb-2">Órdenes de Compra Generadas</h3>
          <ul className="space-y-2">
            {ordenesCompra.map(orden => (
              <li key={orden.id} className="bg-green-50 border border-green-200 rounded p-4 flex justify-between items-center">
                <div>
                  <span className="font-semibold">{orden.material.nombre}</span> — <span>{orden.cantidad} {orden.material.unidad}</span>
                  <span className="ml-2 text-xs text-gray-500">{orden.fecha}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}