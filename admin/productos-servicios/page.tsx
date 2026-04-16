'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRequireEmployee } from '@/contexts/AuthContext';
import { 
  ArrowLeft,
  Package,
  Settings,
  Clock,
  DollarSign,
  BarChart3,
  Plus,
  Search,
  Filter,
  Edit,
  Eye,
  Trash2,
  Timer,
  TrendingUp,
  Calendar,
  Target,
  Wrench,
  X,
  Save,
  AlertCircle
} from 'lucide-react';

// Estilos CSS específicos para dropdowns
const dropdownStyles = `
  .dropdown-custom {
    color: #000000 !important;
    background-color: #ffffff !important;
    border: 1px solid #d1d5db !important;
    border-radius: 6px !important;
    padding: 8px 12px !important;
    width: 100% !important;
    font-size: 14px !important;
    font-weight: normal !important;
    appearance: none !important;
    -webkit-appearance: none !important;
    -moz-appearance: none !important;
  }
  
  .dropdown-custom option {
    color: #000000 !important;
    background-color: #ffffff !important;
    padding: 4px 8px !important;
    font-size: 14px !important;
    font-weight: normal !important;
  }
  
  .dropdown-custom:focus {
    outline: none !important;
    border-color: #10b981 !important;
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2) !important;
    color: #000000 !important;
    background-color: #ffffff !important;
  }
  
  .dropdown-custom:focus option {
    color: #000000 !important;
    background-color: #ffffff !important;
  }
  
  .dropdown-custom:hover {
    color: #000000 !important;
    background-color: #ffffff !important;
  }
  
  .dropdown-custom:hover option {
    color: #000000 !important;
    background-color: #ffffff !important;
  }
  
  .dropdown-custom option:hover {
    color: #000000 !important;
    background-color: #f3f4f6 !important;
  }
  
  .dropdown-custom option:selected {
    color: #000000 !important;
    background-color: #e5f7f0 !important;
  }
  
  select.dropdown-custom {
    color: black !important;
  }
  
  select.dropdown-custom option {
    color: black !important;
    background: white !important;
  }
`;

interface TarifarioItem {
  id: number;
  categoria: string;
  item: string;
  precio: number;
  unidad: string;
  tiempoProduccion: number;
  materiales: string[];
}

interface TiempoItem {
  id: number;
  trabajo: string;
  tiempoEstimado: number;
  tiempoPromedio: number;
  eficiencia: number;
  estado: string;
}

type ToastType = 'success' | 'error' | 'info';

type ReportSummary = {
  totalTrabajos: number;
  trabajosATiempo: number;
  trabajosConDemora: number;
  porcentajeATiempo: number;
  promedioReporte: string;
  eficienciaGlobal: number;
  ahorroHoras: number;
};

export default function ProductosServicios() {
  const auth = useRequireEmployee();
  const searchParams = useSearchParams();
  
  const [activeSection, setActiveSection] = useState('tarifario');
  
  // Estado para el tarifario base con lazy initialization desde localStorage
  const [tarifarioBase, setTarifarioBase] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedTarifario = localStorage.getItem('ps_tarifarioBase');
        if (savedTarifario) {
          return JSON.parse(savedTarifario);
        }
      }
    } catch (error) {
      console.error('Error cargando tarifarioBase:', error);
    }
    
    // Datos por defecto si no hay nada en localStorage
    return [
      {
        id: 1,
        categoria: 'Herreria de obra',
        item: 'Portón corredizo 3x2m',
        precio: 185000,
        unidad: 'unidad',
        tiempoProduccion: 5,
        materiales: ['Hierro angular', 'Chapa', 'Ruedas', 'Soldadura']
      },
      {
        id: 2,
        categoria: 'Herreria de obra',
        item: 'Reja para ventana',
        precio: 25000,
        unidad: 'm²',
        tiempoProduccion: 1.5,
        materiales: ['Hierro redondo', 'Soldadura', 'Pintura']
      },
      {
        id: 3,
        categoria: 'Servicios',
        item: 'Soldadura de piezas',
        precio: 8500,
        unidad: 'hora',
        tiempoProduccion: 1,
        materiales: ['Soldadura', 'Electrodos']
      },
      {
        id: 4,
        categoria: 'Herreria artistica',
        item: 'Barandilla ornamentada',
        precio: 45000,
        unidad: 'metro lineal',
        tiempoProduccion: 3,
        materiales: ['Hierro forjado', 'Pintura especial']
      }
    ];
  });
  
  // Estados para modales y formularios
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TarifarioItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('todas');
  const [filterTimeStatus, setFilterTimeStatus] = useState('todos');
  const [timeSearchTerm, setTimeSearchTerm] = useState('');
  
  // Estados para formularios
  const [formData, setFormData] = useState({
    categoria: 'Herreria de obra',
    item: '',
    materiales: '',
    precio: '',
    unidad: 'unidad',
    tiempoEstimado: ''
  });
  
  const [timeFormData, setTimeFormData] = useState({
    tarifarioItemId: '',
    tiempoReal: '',
    observaciones: '',
    estado: 'optimo'
  });
  
  // Estados para modales de tiempo
  const [showTimeDetailsModal, setShowTimeDetailsModal] = useState(false);
  const [showEditTimeModal, setShowEditTimeModal] = useState(false);
  const [selectedTiempo, setSelectedTiempo] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType; visible: boolean }>({
    message: '',
    type: 'info',
    visible: false
  });
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState<ReportSummary | null>(null);

  // Estado para tiempos de producción con lazy initialization desde localStorage
  const [tiemposProduccion, setTiemposProduccion] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedTiempos = localStorage.getItem('ps_tiemposProduccion');
        if (savedTiempos) {
          return JSON.parse(savedTiempos);
        }
      }
    } catch (error) {
      console.error('Error cargando tiemposProduccion:', error);
    }
    
    // Datos por defecto si no hay nada en localStorage
    return [
      {
        id: 1,
        tarifarioItemId: 1,
        tiempoReal: 4.8,
        registros: [{ fecha: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), tiempoReal: 4.8, observaciones: 'Trabajo completado sin inconvenientes' }],
        estado: 'optimo'
      },
      {
        id: 2,
        tarifarioItemId: 2,
        tiempoReal: 2.1,
        registros: [{ fecha: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), tiempoReal: 2.1, observaciones: 'Requirió trabajo adicional' }],
        estado: 'revisar'
      },
      {
        id: 3,
        tarifarioItemId: 4,
        tiempoReal: 2.9,
        registros: [{ fecha: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), tiempoReal: 2.9, observaciones: 'Terminado antes de lo previsto' }],
        estado: 'excelente'
      }
    ];
  });

  // ========== PERSISTENCIA CON LOCALSTORAGE ==========
  
  // Guardar tarifarioBase en localStorage cuando cambia
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('ps_tarifarioBase', JSON.stringify(tarifarioBase));
      }
    } catch (error) {
      console.error('Error guardando tarifarioBase:', error);
    }
  }, [tarifarioBase]);

  // Guardar tiemposProduccion en localStorage cuando cambia
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('ps_tiemposProduccion', JSON.stringify(tiemposProduccion));
      }
    } catch (error) {
      console.error('Error guardando tiemposProduccion:', error);
    }
  }, [tiemposProduccion]);

  // Actualizar el título de la página
  useEffect(() => {
    document.title = 'Productos y Servicios - Herrería Malabia S.H.';
    
    // Inyectar estilos CSS personalizados
    const style = document.createElement('style');
    style.innerHTML = dropdownStyles;
    document.head.appendChild(style);
    
    // Cleanup function
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  // Manejar parámetros de query para acciones rápidas
  useEffect(() => {
    const action = searchParams.get('action');
    
    if (action === 'nuevo') {
      setShowNewItemModal(true);
    }
  }, [searchParams]);

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3000);
  };

  // Funciones para manejar acciones
  const handleNewItem = () => {
    setFormData({
      categoria: 'Herreria de obra',
      item: '',
      materiales: '',
      precio: '',
      unidad: 'unidad',
      tiempoEstimado: ''
    });
    setShowNewItemModal(true);
  };

  const handleEditItem = (item: TarifarioItem) => {
    setSelectedItem(item);
    setFormData({
      categoria: item.categoria || 'Herreria de obra',
      item: item.item || '',
      materiales: item.materiales.join(', ') || '',
      precio: item.precio?.toString() || '',
      unidad: item.unidad || 'unidad',
      tiempoEstimado: item.tiempoProduccion?.toString() || ''
    });
    setShowEditModal(true);
  };

  const handleDeleteItem = (item: TarifarioItem) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const handleViewDetails = (item: TarifarioItem) => {
    setSelectedItem(item);
    setShowDetailsModal(true);
  };

  const handleSaveItem = () => {
    try {
      // Validar que los campos requeridos estén llenos
      if (!formData.item.trim()) {
        showToast('El nombre del item es requerido', 'error');
        return;
      }

      if (!formData.precio || parseFloat(formData.precio) <= 0) {
        showToast('El precio debe ser mayor a 0', 'error');
        return;
      }

      if (selectedItem) {
        // Editar item existente
        const updatedTarifario = tarifarioBase.map((item: TarifarioItem) => 
          item.id === selectedItem.id 
            ? {
                ...item,
                categoria: formData.categoria,
                item: formData.item,
                materiales: formData.materiales.split(',').map(m => m.trim()),
                precio: parseFloat(formData.precio),
                unidad: formData.unidad,
                tiempoProduccion: parseFloat(formData.tiempoEstimado)
              }
            : item
        );
        setTarifarioBase(updatedTarifario);
      } else {
        // Crear nuevo item
        const newItem: TarifarioItem = {
          id: Math.max(...tarifarioBase.map((i: TarifarioItem) => i.id), 0) + 1,
          categoria: formData.categoria,
          item: formData.item,
          materiales: formData.materiales.split(',').map(m => m.trim()),
          precio: parseFloat(formData.precio),
          unidad: formData.unidad,
          tiempoProduccion: parseFloat(formData.tiempoEstimado)
        };
        setTarifarioBase([...tarifarioBase, newItem]);
      }
      
      setShowNewItemModal(false);
      setShowEditModal(false);
      setSelectedItem(null);
      setFormData({
        categoria: 'Herreria de obra',
        item: '',
        materiales: '',
        precio: '',
        unidad: 'unidad',
        tiempoEstimado: ''
      });

      showToast('Item guardado exitosamente', 'success');
    } catch (error) {
      console.error('Error al guardar item:', error);
      showToast('Error al guardar el item', 'error');
    }
  };

  const handleConfirmDelete = () => {
    if (selectedItem) {
      setTarifarioBase((prev: any[]) => prev.filter((item: any) => item.id !== selectedItem.id));
      showToast(`Item "${selectedItem.item}" eliminado`, 'info');
    }
    setShowDeleteModal(false);
  };

  const handleSearch = () => {
    // Esta función ya no es necesaria porque el filtrado es automático
    // Solo se mantiene para compatibilidad
  };

  const handleFilter = () => {
    // Esta función ya no es necesaria porque el filtrado es automático
    // Solo se mantiene para compatibilidad
  };

  const handleRegisterTime = () => {
    setTimeFormData({
      tarifarioItemId: '',
      tiempoReal: '',
      observaciones: '',
      estado: 'optimo'
    });
    setShowTimeModal(true);
  };

  const handleGenerateReport = () => {
    const totalTrabajos = filteredTiempos.length;
    const trabajosATiempo = filteredTiempos.filter((t: any) => t.estado === 'optimo' || t.estado === 'excelente').length;
    const trabajosConDemora = totalTrabajos - trabajosATiempo;
    const porcentajeATiempo = totalTrabajos ? Math.round((trabajosATiempo / totalTrabajos) * 100) : 0;
    const promedioReporte = resumenTiempos.tiempoPromedioGlobal.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const ahorroHoras = Math.max(0, trabajosATiempo * 2 - trabajosConDemora);

    setReportData({
      totalTrabajos,
      trabajosATiempo,
      trabajosConDemora,
      porcentajeATiempo,
      promedioReporte,
      eficienciaGlobal: resumenTiempos.eficienciaGlobal,
      ahorroHoras
    });
    setShowReportModal(true);
  };

  const handleViewTimeDetails = (tiempo: any) => {
    const tarifarioItem = obtenerDatosTarifario(tiempo.tarifarioItemId);
    const tiempoEstimado = tarifarioItem?.tiempoProduccion ?? tiempo.tiempoEstimado ?? 0;
    const tiempoPromedio = calcularTiempoPromedio(tiempo.tarifarioItemId) || tiempo.tiempoPromedio || 0;
    const eficiencia = tiempoEstimado && tiempoPromedio
      ? calcularEficiencia(tiempoEstimado, tiempoPromedio)
      : 0;

    setSelectedTiempo({
      ...tiempo,
      trabajo: tarifarioItem?.item || tiempo.trabajo || 'Trabajo sin nombre',
      tiempoEstimado,
      tiempoPromedio,
      eficiencia,
      estado: tiempo.estado || 'optimo'
    });
    setShowTimeDetailsModal(true);
  };

  const handleEditTime = (tiempo: any) => {
    setSelectedTiempo(tiempo);
    setTimeFormData({
      tarifarioItemId: tiempo.tarifarioItemId.toString(),
      tiempoReal: tiempo.tiempoReal.toString(),
      observaciones: tiempo.registros?.[0]?.observaciones || '',
      estado: tiempo.estado
    });
    setShowEditTimeModal(true);
  };

  const handleDeleteTime = (tiempoId: number) => {
    setTiemposProduccion((prev: any[]) => prev.filter((t: any) => t.id !== tiempoId));
    showToast('Registro de tiempo eliminado', 'info');
  };

  const secciones = [
    {
      id: 'tarifario',
      titulo: 'Tarifario Base',
      icon: DollarSign,
      descripcion: 'Precios base de productos y servicios'
    },
    {
      id: 'tiempos',
      titulo: 'Control de Tiempos',
      icon: Clock,
      descripcion: 'Tiempos de producción estimados'
    }
  ];

  // Función para filtrar los datos
  const filteredTarifario = tarifarioBase.filter((item: TarifarioItem) => {
    const matchesSearch = searchTerm === '' || 
      item.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.materiales.some((material: string) => material.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = filterCategory === 'todas' || item.categoria === filterCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  const resumenTarifario = useMemo(() => {
    if (filteredTarifario.length === 0) {
      return { total: 0, precioPromedio: 0, tiempoPromedio: 0 };
    }

    const total = filteredTarifario.length;
    const precioPromedio = Math.round(
      filteredTarifario.reduce((acc: number, item: TarifarioItem) => acc + item.precio, 0) / total
    );
    const tiempoPromedio =
      filteredTarifario.reduce((acc: number, item: TarifarioItem) => acc + item.tiempoProduccion, 0) / total;

    return {
      total,
      precioPromedio,
      tiempoPromedio: Number(tiempoPromedio.toFixed(1))
    };
  }, [filteredTarifario]);

  // Función para filtrar los tiempos de producción
  const filteredTiempos = tiemposProduccion.filter((tiempo: any) => {
    const tarifarioItem = tarifarioBase.find((item: TarifarioItem) => item.id === tiempo.tarifarioItemId);
    const matchesSearch = timeSearchTerm === '' || 
      (tarifarioItem && tarifarioItem.item.toLowerCase().includes(timeSearchTerm.toLowerCase()));
    
    const matchesStatus = filterTimeStatus === 'todos' || tiempo.estado === filterTimeStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Función para obtener datos del tarifario para un tiempo
  const obtenerDatosTarifario = (tarifarioItemId: number) => {
    return tarifarioBase.find((item: TarifarioItem) => item.id === tarifarioItemId);
  };

  // Función para calcular tiempo promedio de un item
  const calcularTiempoPromedio = (tarifarioItemId: number) => {
    const registros = tiemposProduccion
      .filter((t: any) => t.tarifarioItemId === tarifarioItemId)
      .flatMap((t: any) => (t.registros && t.registros.length)
        ? t.registros
        : [{ tiempoReal: t.tiempoReal }]
      );

    if (registros.length === 0) return 0;

    const ultimoRegistro = registros[registros.length - 1];
    const tiempoReal = Number(ultimoRegistro.tiempoReal);
    return Number.isFinite(tiempoReal) ? tiempoReal : 0;
  };

  // Función para calcular eficiencia
  const calcularEficiencia = (tiempoEstimado: number, tiempoPromedio: number) => {
    if (tiempoEstimado === 0 || tiempoPromedio <= 0) return 100;
    const eficiencia = (tiempoEstimado / tiempoPromedio) * 100;
    return Math.round(eficiencia);
  };

  const resumenTiempos = useMemo(() => {
    if (filteredTiempos.length === 0) {
      return {
        trabajosATiempo: 0,
        porcentajeATiempo: 0,
        tiempoPromedioGlobal: 0,
        eficienciaGlobal: 0
      };
    }

    const tiemposValidos = filteredTiempos
      .map((tiempo: any) => ({
        registro: tiempo,
        promedio: calcularTiempoPromedio(tiempo.tarifarioItemId)
      }))
      .filter(({ promedio }) => promedio > 0);

    const totalValidos = tiemposValidos.length;
    const totalRegistros = filteredTiempos.length;

    const trabajosATiempo = filteredTiempos.filter((t: any) => t.estado === 'optimo' || t.estado === 'excelente').length;
    const porcentajeATiempo = Math.round((trabajosATiempo / totalRegistros) * 100);

    const tiempoPromedioGlobal = totalValidos
      ? +(tiemposValidos.reduce((acc, cur) => acc + cur.promedio, 0) / totalValidos).toFixed(1)
      : 0;

    const eficienciaGlobal = tiemposValidos.length
      ? Math.round(
          tiemposValidos.reduce((acc, cur) => {
            const tarifarioItem = obtenerDatosTarifario(cur.registro.tarifarioItemId);
            if (!tarifarioItem) return acc;
            return acc + calcularEficiencia(tarifarioItem.tiempoProduccion, cur.promedio);
          }, 0) / tiemposValidos.length
        )
      : 0;

    return {
      trabajosATiempo,
      porcentajeATiempo,
      tiempoPromedioGlobal,
      eficienciaGlobal
    };
  }, [filteredTiempos, tarifarioBase, tiemposProduccion]);

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
                className="flex items-center space-x-2 text-gray-600 hover:text-green-600 transition"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Volver al Panel de Gestión</span>
              </Link>
              <div className="h-6 border-l border-gray-300"></div>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Package className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Productos y Servicios</h1>
                  <p className="text-sm text-gray-600">Gestión de tarifas y control de producción</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">


        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex overflow-x-auto">
            {secciones.map((seccion) => {
              const IconComponent = seccion.icon;
              return (
                <button
                  key={seccion.id}
                  onClick={() => setActiveSection(seccion.id)}
                  className={`flex-1 min-w-0 p-4 text-center border-b-2 transition ${
                    activeSection === seccion.id
                      ? 'border-green-600 text-green-600 bg-green-50'
                      : 'border-transparent text-gray-600 hover:text-green-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <IconComponent className="w-5 h-5" />
                    <span className="font-medium text-sm">{seccion.titulo}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{seccion.descripcion}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        {activeSection === 'tarifario' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Tarifario Base</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {filteredTarifario.length === tarifarioBase.length 
                      ? `${filteredTarifario.length} productos en total`
                      : `${filteredTarifario.length} de ${tarifarioBase.length} productos`
                    }
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={handleNewItem}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nuevo Item</span>
                  </button>
                  
                  {/* Campo de búsqueda */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar productos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900 w-64"
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  </div>
                  
                  {/* Filtro por categoría */}
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-gray-900"
                  >
                    <option value="todas">Todas las categorías</option>
                    <option value="Herreria de obra">Herrería de obra</option>
                    <option value="Servicios">Servicios</option>
                    <option value="Reparaciones">Reparaciones</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-600">Items visibles</p>
                  <p className="text-xl font-semibold text-gray-900">{resumenTarifario.total}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-600">Precio promedio</p>
                  <p className="text-xl font-semibold text-green-700">${resumenTarifario.precioPromedio.toLocaleString()}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-600">Tiempo promedio</p>
                  <p className="text-xl font-semibold text-orange-700">{resumenTarifario.tiempoPromedio.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} días</p>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio Base</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidad</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tiempo (días)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTarifario.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        <div className="flex flex-col items-center space-y-2">
                          <Package className="w-8 h-8 text-gray-400" />
                          <span>No se encontraron productos que coincidan con los filtros aplicados</span>
                          <button 
                            onClick={() => {
                              setSearchTerm('');
                              setFilterCategory('todas');
                            }}
                            className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Limpiar filtros
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTarifario.map((item: TarifarioItem) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                            {item.categoria}
                          </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{item.item}</div>
                        <div className="text-xs text-gray-500">Ver detalle para materiales</div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        ${item.precio.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.unidad}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4 text-orange-600" />
                          <span className="text-sm font-medium text-gray-900">{item.tiempoProduccion}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleViewDetails(item)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleEditItem(item)}
                            className="p-1 text-green-600 hover:bg-green-100 rounded"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteItem(item)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-6 bg-gray-50 border-t">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-1">Enfoque operativo</h3>
                <p className="text-blue-800 text-sm">
                  Se prioriza precio, tiempo y estado de cada item; el detalle completo queda en "Ver" para mantener una lectura rápida del tarifario.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'tiempos' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Control de Tiempos de Producción</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {filteredTiempos.length === tiemposProduccion.length 
                      ? `${filteredTiempos.length} trabajos en seguimiento`
                      : `${filteredTiempos.length} de ${tiemposProduccion.length} trabajos`
                    }
                  </p>
                </div>
                <div className="flex items-center flex-wrap gap-3">
                  {/* Campo de búsqueda para tiempos */}
                  <div className="relative flex-shrink-0">
                    <input
                      type="text"
                      placeholder="Buscar trabajos..."
                      value={timeSearchTerm}
                      onChange={(e) => setTimeSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-gray-900 w-48"
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  </div>
                  
                  {/* Filtro por estado */}
                  <select
                    value={filterTimeStatus}
                    onChange={(e) => setFilterTimeStatus(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white text-gray-900 flex-shrink-0"
                  >
                    <option value="todos">Todos los estados</option>
                    <option value="excelente">Excelente</option>
                    <option value="optimo">Óptimo</option>
                    <option value="revisar">Revisar</option>
                  </select>
                  
                  <button 
                    onClick={handleRegisterTime}
                    className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex-shrink-0"
                  >
                    <Timer className="w-4 h-4" />
                    <span>Registrar Tiempo</span>
                  </button>
                  
                  <button 
                    onClick={handleGenerateReport}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 flex-shrink-0"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Reportes</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Efficiency Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">Trabajos a Tiempo</p>
                      <p className="text-2xl font-bold text-green-900">{resumenTiempos.porcentajeATiempo}%</p>
                    </div>
                    <Target className="w-8 h-8 text-green-600" />
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-600">Tiempo Promedio</p>
                      <p className="text-2xl font-bold text-orange-900">{resumenTiempos.tiempoPromedioGlobal.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} días</p>
                    </div>
                    <Clock className="w-8 h-8 text-orange-600" />
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600">Eficiencia Global</p>
                      <p className="text-2xl font-bold text-purple-900">{resumenTiempos.eficienciaGlobal}%</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-600" />
                  </div>
                </div>
              </div>

              {/* Times Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trabajo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tiempo Estimado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tiempo Promedio</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Eficiencia</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredTiempos.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          <div className="flex flex-col items-center space-y-2">
                            <Clock className="w-8 h-8 text-gray-400" />
                            <span>No se encontraron trabajos que coincidan con los filtros aplicados</span>
                            <button 
                              onClick={() => {
                                setTimeSearchTerm('');
                                setFilterTimeStatus('todos');
                              }}
                              className="mt-2 text-orange-600 hover:text-orange-800 text-sm"
                            >
                              Limpiar filtros
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredTiempos.map((tiempo: any) => {
                        const tarifarioItem = obtenerDatosTarifario(tiempo.tarifarioItemId);
                        const tiempoPromedio = calcularTiempoPromedio(tiempo.tarifarioItemId);
                        const eficiencia = tarifarioItem ? calcularEficiencia(tarifarioItem.tiempoProduccion, tiempoPromedio) : 0;
                        
                        return (
                          <tr key={tiempo.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-gray-900">{tarifarioItem?.item || 'Sistema'}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{tarifarioItem?.tiempoProduccion || '-'} días</td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {tiempoPromedio > 0 ? `${tiempoPromedio.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} días` : '- días'}
                            </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  eficiencia >= 95 ? 'bg-green-600' :
                                  eficiencia >= 80 ? 'bg-yellow-600' : 'bg-red-600'
                                }`}
                                style={{ width: `${Math.min(eficiencia, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{eficiencia}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            tiempo.estado === 'excelente' ? 'bg-green-100 text-green-800' :
                            tiempo.estado === 'optimo' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {tiempo.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => handleViewTimeDetails(tiempo)}
                              className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                              title="Ver detalles"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleEditTime(tiempo)}
                              className="p-1 text-green-600 hover:bg-green-100 rounded"
                              title="Editar tiempo"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTime(tiempo.id)}
                              className="p-1 text-red-600 hover:bg-red-100 rounded"
                              title="Eliminar tiempo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h3 className="font-semibold text-slate-800 mb-1">Lectura ejecutiva</h3>
                <p className="text-slate-700 text-sm">
                  El tablero muestra solo KPIs clave (a tiempo, promedio y eficiencia); el análisis puntual se consulta desde "Ver detalles" y "Reportes".
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {showReportModal && reportData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Reporte de tiempos (resumen)</h3>
              <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="px-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-700">A tiempo</p>
                  <p className="text-2xl font-bold text-green-900">{reportData.porcentajeATiempo}%</p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-orange-700">Tiempo promedio</p>
                  <p className="text-2xl font-bold text-orange-900">{reportData.promedioReporte} días</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-purple-700">Eficiencia global</p>
                  <p className="text-2xl font-bold text-purple-900">{reportData.eficienciaGlobal}%</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 space-y-2">
                <div className="flex justify-between"><span>Total trabajos</span><span className="font-semibold">{reportData.totalTrabajos}</span></div>
                <div className="flex justify-between"><span>Trabajos a tiempo</span><span className="font-semibold text-green-700">{reportData.trabajosATiempo}</span></div>
                <div className="flex justify-between"><span>Trabajos con demora</span><span className="font-semibold text-red-700">{reportData.trabajosConDemora}</span></div>
                <div className="flex justify-between"><span>Ahorro estimado</span><span className="font-semibold text-blue-700">{reportData.ahorroHoras} horas</span></div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button onClick={() => setShowReportModal(false)} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Nuevo Item */}
      {showNewItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Nuevo Item</h3>
                <button 
                  onClick={() => setShowNewItemModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select 
                    value={formData.categoria}
                    onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Seleccionar categoría</option>
                    <option value="Herreria de obra">Herrería de obra</option>
                    <option value="Servicios">Servicios</option>
                    <option value="Herreria artistica">Herrería artística</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Item</label>
                  <input 
                    type="text"
                    value={formData.item}
                    onChange={(e) => setFormData({...formData, item: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Ej: Portón corredizo 3x2m"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Materiales</label>
                  <input 
                    type="text"
                    value={formData.materiales}
                    onChange={(e) => setFormData({...formData, materiales: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Ej: Hierro angular, Chapa, Ruedas"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
                    <input 
                      type="number"
                      value={formData.precio}
                      onChange={(e) => setFormData({...formData, precio: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                    <select 
                      value={formData.unidad}
                      onChange={(e) => setFormData({...formData, unidad: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      style={{
                        color: 'black',
                        backgroundColor: 'white',
                        fontWeight: 'normal'
                      }}
                    >
                      <option value="" style={{color: 'black', backgroundColor: 'white'}}>Seleccionar</option>
                      <option value="unidad" style={{color: 'black', backgroundColor: 'white'}}>unidad</option>
                      <option value="m²" style={{color: 'black', backgroundColor: 'white'}}>m²</option>
                      <option value="metro" style={{color: 'black', backgroundColor: 'white'}}>metro</option>
                      <option value="hora" style={{color: 'black', backgroundColor: 'white'}}>hora</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tiempo Estimado (días)</label>
                  <input 
                    type="number"
                    step="0.5"
                    value={formData.tiempoEstimado}
                    onChange={(e) => setFormData({...formData, tiempoEstimado: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button 
                onClick={() => setShowNewItemModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveItem}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Save className="w-4 h-4" />
                <span>Guardar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Editar Item */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Editar Item</h3>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select 
                    value={formData.categoria}
                    onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Seleccionar categoría</option>
                    <option value="Herreria de obra">Herrería de obra</option>
                    <option value="Servicios">Servicios</option>
                    <option value="Herreria artistica">Herrería artística</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Item</label>
                  <input 
                    type="text"
                    value={formData.item}
                    onChange={(e) => setFormData({...formData, item: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Materiales</label>
                  <input 
                    type="text"
                    value={formData.materiales}
                    onChange={(e) => setFormData({...formData, materiales: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
                    <input 
                      type="number"
                      value={formData.precio}
                      onChange={(e) => setFormData({...formData, precio: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                    <select 
                      value={formData.unidad}
                      onChange={(e) => setFormData({...formData, unidad: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      style={{
                        color: 'black',
                        backgroundColor: 'white',
                        fontWeight: 'normal'
                      }}
                    >
                      <option value="" style={{color: 'black', backgroundColor: 'white'}}>Seleccionar</option>
                      <option value="unidad" style={{color: 'black', backgroundColor: 'white'}}>unidad</option>
                      <option value="m²" style={{color: 'black', backgroundColor: 'white'}}>m²</option>
                      <option value="metro" style={{color: 'black', backgroundColor: 'white'}}>metro</option>
                      <option value="hora" style={{color: 'black', backgroundColor: 'white'}}>hora</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tiempo Estimado (días)</label>
                  <input 
                    type="number"
                    step="0.5"
                    value={formData.tiempoEstimado}
                    onChange={(e) => setFormData({...formData, tiempoEstimado: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button 
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveItem}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Confirmar Eliminación */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Confirmar Eliminación</h3>
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">¿Estás seguro?</h4>
                  <p className="text-sm text-gray-500">
                    Esta acción eliminará permanentemente el item "{selectedItem?.item}" del tarifario.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Registrar Tiempo */}
      {showTimeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Registrar Tiempo</h3>
                <button 
                  onClick={() => setShowTimeModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Item del Tarifario *</label>
                  <select 
                    value={timeFormData.tarifarioItemId}
                    onChange={(e) => setTimeFormData({...timeFormData, tarifarioItemId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-gray-900"
                  >
                    <option value="">-- Seleccionar trabajo --</option>
                    {tarifarioBase.map((item: TarifarioItem) => (
                      <option key={item.id} value={item.id}>
                        {item.item} (${item.precio.toLocaleString()} - {item.tiempoProduccion} días)
                      </option>
                    ))}
                  </select>
                  {timeFormData.tarifarioItemId && obtenerDatosTarifario(parseInt(timeFormData.tarifarioItemId)) && (
                    <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-md text-sm">
                      <p className="font-medium text-orange-900">Información del Item:</p>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-orange-800">
                        <p><strong>Precio:</strong> ${obtenerDatosTarifario(parseInt(timeFormData.tarifarioItemId))?.precio.toLocaleString()}</p>
                        <p><strong>Tiempo Est.:</strong> {obtenerDatosTarifario(parseInt(timeFormData.tarifarioItemId))?.tiempoProduccion} días</p>
                        <p><strong>Unidad:</strong> {obtenerDatosTarifario(parseInt(timeFormData.tarifarioItemId))?.unidad}</p>
                        <p><strong>Categoría:</strong> {obtenerDatosTarifario(parseInt(timeFormData.tarifarioItemId))?.categoria}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tiempo Real (días)</label>
                  <input 
                    type="number"
                    step="0.5"
                    value={timeFormData.tiempoReal}
                    onChange={(e) => setTimeFormData({...timeFormData, tiempoReal: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-gray-900"
                    placeholder="Ej: 2.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                  <textarea 
                    rows={3}
                    value={timeFormData.observaciones}
                    onChange={(e) => setTimeFormData({...timeFormData, observaciones: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-gray-900 resize-none"
                    placeholder="Comentarios sobre demoras, dificultades, etc."
                  ></textarea>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button 
                onClick={() => setShowTimeModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  if (!timeFormData.tarifarioItemId || !timeFormData.tiempoReal) {
                    showToast('Por favor complete los campos obligatorios', 'error');
                    return;
                  }
                  
                  const itemId = parseInt(timeFormData.tarifarioItemId);
                  
                  // Buscar si ya existe un tiempo para este item
                  const existingTimeIndex = tiemposProduccion.findIndex((t: any) => t.tarifarioItemId === itemId);
                  
                  if (existingTimeIndex >= 0) {
                    // Si ya existe, actualizar el array de registros
                    const updatedTiempos = [...tiemposProduccion];
                    updatedTiempos[existingTimeIndex] = {
                      ...updatedTiempos[existingTimeIndex],
                      tiempoReal: parseFloat(timeFormData.tiempoReal),
                      registros: [
                        ...(updatedTiempos[existingTimeIndex].registros || []),
                        {
                          fecha: new Date().toISOString(),
                          tiempoReal: parseFloat(timeFormData.tiempoReal),
                          observaciones: timeFormData.observaciones
                        }
                      ]
                    };
                    setTiemposProduccion(updatedTiempos);
                  } else {
                    // Si no existe, crear uno nuevo
                    const newTiempo = {
                      id: Math.max(...tiemposProduccion.map((t: any) => t.id), 0) + 1,
                      tarifarioItemId: itemId,
                      tiempoReal: parseFloat(timeFormData.tiempoReal),
                      registros: [{
                        fecha: new Date().toISOString(),
                        tiempoReal: parseFloat(timeFormData.tiempoReal),
                        observaciones: timeFormData.observaciones
                      }],
                      estado: timeFormData.estado
                    };
                    setTiemposProduccion([...tiemposProduccion, newTiempo]);
                  }
                  
                  showToast('Tiempo registrado exitosamente', 'success');
                  
                  setTimeFormData({
                    tarifarioItemId: '',
                    tiempoReal: '',
                    observaciones: '',
                    estado: 'optimo'
                  });
                  setShowTimeModal(false);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                <Timer className="w-4 h-4" />
                <span>Registrar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Ver Detalles */}
      {showDetailsModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Detalles del Producto</h3>
                <button 
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="px-6 py-6">
              <div className="space-y-6">
                {/* Información básica */}
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Package className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900">{selectedItem.item}</h4>
                      <span className="inline-block px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-full">
                        {selectedItem.categoria}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Detalles en grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-600">Precio Base</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      ${selectedItem.precio.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">por {selectedItem.unidad}</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="w-5 h-5 text-orange-600" />
                      <span className="text-sm font-medium text-gray-600">Tiempo de Producción</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {selectedItem.tiempoProduccion}
                    </p>
                    <p className="text-sm text-gray-500">días estimados</p>
                  </div>
                </div>

                {/* Materiales */}
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Wrench className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-gray-900">Materiales Requeridos</span>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.materiales.map((material, index) => (
                        <span 
                          key={index}
                          className="inline-block px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full"
                        >
                          {material}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Información adicional */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h5 className="font-semibold text-green-900 mb-2">💡 Información del Producto</h5>
                  <div className="space-y-2 text-sm text-green-700">
                    <p><strong>ID:</strong> #{selectedItem.id}</p>
                    <p><strong>Categoría:</strong> {selectedItem.categoria}</p>
                    <p><strong>Unidad de medida:</strong> {selectedItem.unidad}</p>
                    <p><strong>Tiempo estimado:</strong> {selectedItem.tiempoProduccion} días</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button 
                onClick={() => {
                  setShowDetailsModal(false);
                  handleEditItem(selectedItem);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Edit className="w-4 h-4" />
                <span>Editar</span>
              </button>
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Ver Detalles de Tiempo */}
      {showTimeDetailsModal && selectedTiempo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Detalles de Tiempo</h3>
                <button 
                  onClick={() => setShowTimeDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">{selectedTiempo.trabajo}</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-600">Tiempo Estimado</div>
                    <div className="text-lg font-semibold text-blue-900">{selectedTiempo.tiempoEstimado} días</div>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-600">Tiempo Promedio</div>
                    <div className="text-lg font-semibold text-orange-900">{selectedTiempo.tiempoPromedio} días</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-600">Eficiencia</div>
                    <div className="text-lg font-semibold text-purple-900">{selectedTiempo.eficiencia}%</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-600">Estado</div>
                    <div className={`text-sm font-semibold ${
                      selectedTiempo.estado === 'optimo' ? 'text-green-900' :
                      selectedTiempo.estado === 'excelente' ? 'text-purple-900' : 'text-yellow-900'
                    }`}>
                      {selectedTiempo.estado.charAt(0).toUpperCase() + selectedTiempo.estado.slice(1)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button 
                onClick={() => setShowTimeDetailsModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Editar Tiempo */}
      {showEditTimeModal && selectedTiempo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Editar Tiempo de Producción</h3>
                <button 
                  onClick={() => setShowEditTimeModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">{selectedTiempo.trabajo}</h4>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tiempo Real (días) *</label>
                  <input 
                    type="number"
                    step="0.1"
                    value={timeFormData.tiempoReal}
                    onChange={(e) => setTimeFormData({...timeFormData, tiempoReal: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-black bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado *</label>
                  <select 
                    value={timeFormData.estado}
                    onChange={(e) => setTimeFormData({...timeFormData, estado: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-black bg-white"
                  >
                    <option value="optimo">Óptimo</option>
                    <option value="revisar">Revisar</option>
                    <option value="excelente">Excelente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                  <textarea 
                    value={timeFormData.observaciones}
                    onChange={(e) => setTimeFormData({...timeFormData, observaciones: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-black bg-white"
                    rows={3}
                    placeholder="Notas sobre el tiempo de producción..."
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button 
                onClick={() => setShowEditTimeModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  if (!timeFormData.tiempoReal) {
                    showToast('Por favor ingrese el tiempo real', 'error');
                    return;
                  }
                  
                  // Actualizar el tiempo en la lista
                  const tarifarioItem = obtenerDatosTarifario(parseInt(timeFormData.tarifarioItemId));
                  setTiemposProduccion((prev: any) => prev.map((tiempo: any) => 
                    tiempo.id === selectedTiempo.id 
                      ? {
                          ...tiempo,
                          tarifarioItemId: parseInt(timeFormData.tarifarioItemId),
                          tiempoReal: parseFloat(timeFormData.tiempoReal),
                          registros: [
                            ...(tiempo.registros || []),
                            { 
                              fecha: new Date().toISOString(), 
                              tiempoReal: parseFloat(timeFormData.tiempoReal),
                              observaciones: timeFormData.observaciones
                            }
                          ],
                          estado: timeFormData.estado
                        }
                      : tiempo
                  ));
                  
                  setShowEditTimeModal(false);
                  setSelectedTiempo(null);

                  showToast('Tiempo y estado actualizados exitosamente', 'success');
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}