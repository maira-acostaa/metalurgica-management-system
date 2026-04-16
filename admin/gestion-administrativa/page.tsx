'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRequireEmployee } from '@/contexts/AuthContext';
import { buildControlCuentasViewModel } from './controlCuentasUtils';
import { 
  ArrowLeft,
  ClipboardList,
  Users,
  FileText,
  Clock,
  Eye,
  Edit,
  Trash2,
  Filter,
  Plus,
  Search,
  DollarSign,
  CreditCard,
  Building2,
  Receipt,
  Printer
} from 'lucide-react';

interface Presupuesto {
  id: number;
  nombreCliente: string;
  cliente_nombre?: string;
  email?: string;
  cliente_email?: string;
  telefono?: string;
  cliente_telefono?: string;
  tipoTrabajo?: string;
  tipo_trabajo?: string;
  descripcion?: string;
  mensaje: string;
  fecha: string;
  fecha_creacion?: string;
  created_at?: string;
  fecha_vencimiento?: string;
  estado?: string;
  total?: number;
  subtotal?: number;
  metodo_pago?: string;
  validez_dias?: number;
  observaciones?: string;
  cliente_direccion?: string;
  historial?: Array<{
    id?: number;
    accion: string;
    estado_anterior?: string | null;
    estado_nuevo?: string | null;
    created_at?: string;
  }>;
  items?: Array<{
    descripcion: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }>;
}

type PresupuestoEstado = 'PENDIENTE' | 'RESEÑADO' | 'FACTURADO' | 'VENCIDO';

const currencyFormatterARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const formatCurrencyARS = (value?: number) => {
  const parsed = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return currencyFormatterARS.format(parsed);
};

const sanitizeNumber = (value: any): number => {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return 0;
    }

    const cleaned = trimmed.replace(/[^0-9,.-]/g, '');
    const normalized = trimmed.includes(',')
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizePresupuestoEstado = (estado?: string) => {
  if (!estado) return 'PENDIENTE';
  const normalized = estado.toString().toUpperCase();
  return normalized === 'SEÑADO' ? 'RESEÑADO' : normalized;
};

const getPresupuestoEstadoClass = (estado: string) => {
  if (estado === 'FACTURADO') return 'bg-green-100 text-green-800';
  if (estado === 'RESEÑADO') return 'bg-blue-100 text-blue-800';
  if (estado === 'VENCIDO') return 'bg-red-100 text-red-800';
  return 'bg-yellow-100 text-yellow-800';
};

const getPresupuestoPriority = (estado: string) => {
  if (estado === 'PENDIENTE') return 1;
  if (estado === 'RESEÑADO') return 2;
  if (estado === 'FACTURADO') return 3;
  if (estado === 'VENCIDO') return 4;
  return 5;
};

export default function GestionAdministrativa() {
  const auth = useRequireEmployee();
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState('clientes');
  // Helpers de fecha (normaliza cadenas sin zona horaria como UTC)
  const parseDateValue = (value?: any) => {
    if (!value && value !== 0) return null;
    if (value instanceof Date) return value;

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;
      const normalized = trimmed.includes('T') || trimmed.includes('Z')
        ? trimmed
        : `${trimmed.replace(' ', 'T')}Z`;
      const parsed = new Date(normalized);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const formatDate = (d?: any) => {
    const date = parseDateValue(d);
    if (!date) return 'Sin fecha';
    return date.toLocaleDateString();
  };

  const formatDateTime = (d?: any) => {
    const date = parseDateValue(d);
    if (!date) return 'Sin fecha';
    return date.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const daysSince = (d?: any) => {
    const date = parseDateValue(d);
    if (!date) return '-';
    return Math.floor((Date.now() - date.getTime()) / (1000 * 3600 * 24));
  };
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [loading, setLoading] = useState(true);

  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [liveSearchTerm, setLiveSearchTerm] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('');
  const [estadoClienteFilter, setEstadoClienteFilter] = useState<'activo' | 'inactivo'>('activo');
  const [clientesSinFiltro, setClientesSinFiltro] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<any[]>([]);
  const [clientesParaPresupuesto, setClientesParaPresupuesto] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [filteredProveedores, setFilteredProveedores] = useState<any[]>([]);
  const [liveSearchProveedores, setLiveSearchProveedores] = useState('');
  const [showNewProveedorModal, setShowNewProveedorModal] = useState(false);
  const [showViewProveedorModal, setShowViewProveedorModal] = useState(false);
  const [showEditProveedorModal, setShowEditProveedorModal] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState<any>(null);
  const [newProveedorData, setNewProveedorData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    rubro: '',
    cuit: ''
  });
  const [editProveedorData, setEditProveedorData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    rubro: '',
    cuit: ''
  });
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<any>(null);
  const [editClientData, setEditClientData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    categoria: 'Particular',
    activo: true
  });
  const [stats, setStats] = useState({
    totalClientes: 0,
    totalProveedores: 0,
    totalPresupuestos: 0,
    totalFacturas: 0,
    pagosMes: 0,
    pendiente: 0
  });
  const [newClientData, setNewClientData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    categoria: 'Particular'
  });
  
  // Estados para presupuestos - completo
  const [showViewPresupuestoModal, setShowViewPresupuestoModal] = useState(false);
  const [showNewPresupuestoModal, setShowNewPresupuestoModal] = useState(false);
  const [selectedPresupuesto, setSelectedPresupuesto] = useState<any>(null);
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);
  const [presupuestoToConvert, setPresupuestoToConvert] = useState<any | null>(null);
  const [showEditPresupuestoEstadoModal, setShowEditPresupuestoEstadoModal] = useState(false);
  const [presupuestoEstadoTarget, setPresupuestoEstadoTarget] = useState<any | null>(null);
  const [nuevoEstadoPresupuesto, setNuevoEstadoPresupuesto] = useState<PresupuestoEstado>('PENDIENTE');
  const [presupuestoEstadoFilter, setPresupuestoEstadoFilter] = useState<'' | 'PENDIENTE' | 'RESEÑADO' | 'FACTURADO' | 'VENCIDO' | 'ARCHIVADO'>('' );
  const [presupuestoFechaDesde, setPresupuestoFechaDesde] = useState('');
  const [presupuestoFechaHasta, setPresupuestoFechaHasta] = useState('');
  const [presupuestoShowAll, setPresupuestoShowAll] = useState(false);
  const [presupuestoSearchTerm, setPresupuestoSearchTerm] = useState('');
  const [presupuestosArchivadosCount, setPresupuestosArchivadosCount] = useState(0);
  const [loadingArchivedPresupuestos, setLoadingArchivedPresupuestos] = useState(false);
  const [archivedPresupuestos, setArchivedPresupuestos] = useState<Presupuesto[]>([]);
  const [newPresupuestoData, setNewPresupuestoData] = useState({
    cliente_id: '',
    nombre_cliente: '',
    email_cliente: '',
    telefono_cliente: '',
    tipo_trabajo: '',
    tipo_material: '',
    descripcion: '',
    cantidad: 1,
    precio_material_unitario: 0,
    tiempo_estimado_horas: 0,
    precio_hora_mano_obra: 15000, // Precio base por hora
    subtotal_material: 0,
    subtotal_mano_obra: 0,
    total: 0,
    validez_dias: 30,
    observaciones: ''
  });

  const getPresupuestoVencimientoInfo = (presupuesto: any) => {
    const createdRaw = presupuesto.created_at || presupuesto.fecha_creacion || presupuesto.fecha || null;
    const createdDate = parseDateValue(createdRaw);
    const validezDias = Number(presupuesto.validez_dias || 30) || 30;

    let vencimientoDate: Date | null = null;
    if (presupuesto.fecha_vencimiento) {
      vencimientoDate = parseDateValue(presupuesto.fecha_vencimiento);
    } else if (createdDate) {
      vencimientoDate = new Date(createdDate.getTime() + validezDias * 24 * 60 * 60 * 1000);
    }

    if (!vencimientoDate || isNaN(vencimientoDate.getTime())) {
      return { label: 'SIN FECHA', detail: '', date: null, diffDays: null };
    }

    const today = new Date();
    const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startVenc = new Date(vencimientoDate.getFullYear(), vencimientoDate.getMonth(), vencimientoDate.getDate());
    const diffMs = startVenc.getTime() - startToday.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: 'VENCIDO', detail: `${Math.abs(diffDays)} dias`, date: vencimientoDate, diffDays };
    }

    return { label: 'VIGENTE', detail: `${diffDays} dias`, date: vencimientoDate, diffDays };
  };

  const filteredPresupuestos = useMemo(() => {
    const query = presupuestoSearchTerm.trim().toLowerCase();

    const source = presupuestoEstadoFilter === 'ARCHIVADO' ? archivedPresupuestos : presupuestos;

    const filtered = source.filter((presupuesto) => {
      const estado = normalizePresupuestoEstado(presupuesto.estado);
      const estadoOk = presupuestoEstadoFilter === ''
        ? true
        : estado === presupuestoEstadoFilter;

      if (!estadoOk) return false;

      if (presupuestoFechaDesde) {
        const createdRaw = presupuesto.created_at || presupuesto.fecha_creacion || presupuesto.fecha || null;
        const createdDate = parseDateValue(createdRaw);
        if (!createdDate) return false;
        const desde = new Date(`${presupuestoFechaDesde}T00:00:00`);
        if (createdDate < desde) return false;
      }

      if (presupuestoFechaHasta) {
        const createdRaw = presupuesto.created_at || presupuesto.fecha_creacion || presupuesto.fecha || null;
        const createdDate = parseDateValue(createdRaw);
        if (!createdDate) return false;
        const hasta = new Date(`${presupuestoFechaHasta}T23:59:59`);
        if (createdDate > hasta) return false;
      }

      if (!query) return true;

      const nombre = (presupuesto.nombreCliente || presupuesto.cliente_nombre || '').toLowerCase();
      const email = (presupuesto.email || presupuesto.cliente_email || '').toLowerCase();
      const telefono = (presupuesto.telefono || presupuesto.cliente_telefono || '').toLowerCase();

      return nombre.includes(query) || email.includes(query) || telefono.includes(query);
    });

    return filtered.sort((a, b) => {
      const estadoA = normalizePresupuestoEstado(a.estado);
      const estadoB = normalizePresupuestoEstado(b.estado);
      const prioridad = getPresupuestoPriority(estadoA) - getPresupuestoPriority(estadoB);
      if (prioridad !== 0) return prioridad;

      const fechaA = parseDateValue(a.created_at || a.fecha_creacion || a.fecha)?.getTime() || 0;
      const fechaB = parseDateValue(b.created_at || b.fecha_creacion || b.fecha)?.getTime() || 0;
      return fechaB - fechaA;
    });
  }, [
    presupuestos,
    archivedPresupuestos,
    presupuestoEstadoFilter,
    presupuestoFechaDesde,
    presupuestoFechaHasta,
    presupuestoSearchTerm
  ]);

  const presupuestosResumen = useMemo(() => {
    return presupuestos.reduce(
      (acc, presupuesto) => {
        const estado = normalizePresupuestoEstado(presupuesto.estado);
        acc.total += 1;
        if (estado === 'PENDIENTE') acc.pendientes += 1;
        if (estado === 'FACTURADO') acc.facturados += 1;
        if (estado === 'RESEÑADO') acc.reseñados += 1;
        if (estado === 'VENCIDO') acc.vencidos += 1;
        return acc;
      },
      { total: 0, pendientes: 0, facturados: 0, reseñados: 0, vencidos: 0 }
    );
  }, [presupuestos]);
  
  // Estados para facturas - completo
  const [facturas, setFacturas] = useState<any[]>([]);
  const [showNewFacturaModal, setShowNewFacturaModal] = useState(false);
  const [savingFactura, setSavingFactura] = useState(false);
  const [showViewFacturaModal, setShowViewFacturaModal] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState<any>(null);
  const [facturaSearch, setFacturaSearch] = useState('');
  const [facturaEstadoFilter, setFacturaEstadoFilter] = useState<'relevantes' | 'todas' | 'pagada' | 'pendiente' | 'vencida' | 'archivadas'>('relevantes');
  const [facturaFechaDesde, setFacturaFechaDesde] = useState('');
  const [facturaFechaHasta, setFacturaFechaHasta] = useState('');
  const [facturaMontoMin, setFacturaMontoMin] = useState('');
  const [facturaMontoMax, setFacturaMontoMax] = useState('');
  const [facturaSort, setFacturaSort] = useState<{ col: 'cliente' | 'monto' | 'fecha'; dir: 'asc' | 'desc' } | null>(null);
  const [facturaQuickDate, setFacturaQuickDate] = useState<null | 'hoy' | 'esta-semana' | 'este-mes' | 'mes-pasado' | 'este-año'>(null);
  const [facturaShowSuggestions, setFacturaShowSuggestions] = useState(false);
  const [facturaPage, setFacturaPage] = useState(1);
  const [facturaPageSize, setFacturaPageSize] = useState(10);
  const [newFacturaData, setNewFacturaData] = useState({
    cliente_id: '',
    numero_factura: '',
    descripcion: '',
    monto: 0,
    fecha_vencimiento: '',
    metodo_pago: 'efectivo', // efectivo, transferencia
    telefono_cliente: '',
    observaciones: ''
  });

  const getFacturaNumero = useCallback((factura: any) => {
    if (!factura) return 'Sin número';
    const numero = factura.numero
      ?? factura.numero_factura
      ?? factura.numeroFactura
      ?? factura.numeroPresupuesto
      ?? factura.codigo;
    if (numero !== undefined && numero !== null && numero !== '') return numero.toString();
    return factura.id ? `FAC-${factura.id}` : 'Sin número';
  }, []);

  const getFacturaCliente = useCallback((factura: any) => {
    if (!factura) return 'Sin cliente';
    const nombre = factura.cliente
      || factura.cliente_nombre
      || factura.nombre_cliente
      || factura.clienteNombre
      || factura.nombreCliente;
    if (nombre && nombre !== '') return nombre;
    return 'Sin cliente';
  }, []);
  
  // Estados para pagos
  const [pagos, setPagos] = useState<any[]>([]);
  const [pagoFilters, setPagoFilters] = useState({
    tipo: '',
    metodo: '',
    desde: '',
    hasta: '',
    estadoCliente: ''
  });
  const [showNewPagoModal, setShowNewPagoModal] = useState(false);
  const [showViewPagoModal, setShowViewPagoModal] = useState(false);
  const [selectedPago, setSelectedPago] = useState<any>(null);
  const [newPagoData, setNewPagoData] = useState({
    cliente_id: '',
    proveedor_id: '',
    factura_id: '',
    tipo_pago: 'ingreso', // ingreso o egreso
    concepto: '',
    monto: 0,
    metodo_pago: 'efectivo', // efectivo, transferencia
    fecha_pago: '',
    referencia: '',
    observaciones: ''
  });
  
  // Estados para compras de proveedores
  const [compras, setCompras] = useState<any[]>([]);
  const [showNewCompraModal, setShowNewCompraModal] = useState(false);
  const [showViewCompraModal, setShowViewCompraModal] = useState(false);
  const [selectedCompra, setSelectedCompra] = useState<any>(null);
  const [returnToCompraAfterProveedor, setReturnToCompraAfterProveedor] = useState(false);
  const [newCompraData, setNewCompraData] = useState({
    proveedor_id: '',
    numero_compra: '',
    descripcion: '',
    monto: '',
    fecha_vencimiento: '',
    metodo_pago: 'efectivo',
    observaciones: ''
  });
  
  // Estados para cuentas corrientes
  const [cuentasCorrientes, setCuentasCorrientes] = useState<any[]>([]);
  const [controlCuentas, setControlCuentas] = useState<any | null>(null);
  const [controlCuentasMeta, setControlCuentasMeta] = useState<{
    source: 'api' | 'local';
    updatedAt: string | null;
  }>({ source: 'local', updatedAt: null });
  const [showCuentaModal, setShowCuentaModal] = useState(false);
  const [selectedCuenta, setSelectedCuenta] = useState<any>(null);

  const controlCuentasViewModel = useMemo(
    () =>
      buildControlCuentasViewModel({
        controlCuentas,
        facturas,
        compras,
        sanitizeNumber
      }),
    [controlCuentas, facturas, compras]
  );

  const {
    clientesConSaldoPendiente,
    comprasPendientesDePago,
    totalPorCobrar,
    totalPorPagar,
    balanceNeto,
    resumenPorCobrar,
    resumenPorPagar
  } = controlCuentasViewModel;

  const controlCuentasResumenTexto = useMemo(() => {
    return {
      fuente: controlCuentasMeta.source === 'api' ? 'Datos reales (API)' : 'Modo local/simulado',
      ultimaActualizacion: controlCuentasMeta.updatedAt ? formatDateTime(controlCuentasMeta.updatedAt) : 'Sin actualizar'
    };
  }, [controlCuentasMeta]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const normalizePago = (raw: any) => {
    const montoNumber = Math.abs(Number(raw?.monto ?? 0) || 0);
    const rawTipo = (raw?.tipo || raw?.tipo_pago || '').toString().toLowerCase();
    const hasCliente = raw?.cliente_id !== undefined && raw?.cliente_id !== null && raw?.cliente_id !== '';
    const hasProveedor = raw?.proveedor_id !== undefined && raw?.proveedor_id !== null && raw?.proveedor_id !== '';

    let tipo = rawTipo === 'ingreso' || rawTipo === 'egreso' ? rawTipo : '';
    if (!tipo) {
      if (hasCliente && !hasProveedor) tipo = 'ingreso';
      else if (hasProveedor && !hasCliente) tipo = 'egreso';
      else tipo = Number(raw?.monto ?? 0) < 0 ? 'egreso' : 'ingreso';
    }

    const clienteNombre = raw?.cliente || raw?.cliente_nombre;
    const proveedorNombre = raw?.proveedor || raw?.proveedor_nombre;
    let nombre = tipo === 'egreso' ? proveedorNombre : clienteNombre;

    if (!nombre && tipo === 'ingreso' && raw?.cliente_id) {
      const cid = raw.cliente_id?.toString();
      nombre = (clientes.find(c => c.id.toString() === cid) || {}).nombre;
    }
    if (!nombre && tipo === 'egreso' && raw?.proveedor_id) {
      const pid = raw.proveedor_id?.toString();
      nombre = (proveedores.find(p => p.id.toString() === pid) || {}).nombre;
    }

    return {
      ...raw,
      tipo,
      metodo: raw?.metodo || raw?.metodo_pago || 'efectivo',
      fecha: raw?.fecha || raw?.fecha_pago || raw?.created_at || raw?.updated_at,
      cliente: nombre || 'Sistema',
      monto: montoNumber,
      concepto: raw?.concepto || raw?.referencia || ''
    };
  };

  const readLocalList = (key: string) => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const writeLocalList = (key: string, list: any[]) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(list));
    } catch {
      // Ignorar errores de localStorage
    }
  };

  const syncProveedoresCache = (list: any[]) => {
    writeLocalList('proveedores_local', list);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('proveedores-updated'));
    }
  };

  // Helper function para manejar requests API con mejor manejo de errores
  const makeApiRequest = async (url: string, options: RequestInit = {}) => {
    try {
      // Intentar obtener token del contexto o localStorage
      let currentToken = auth.token || localStorage.getItem('token');
      
      if (!currentToken) {
        try {
          const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'admin@herreria.com',
              password: 'admin123'
            })
          });
          
          if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            auth.login(loginData.user, loginData.token);
            currentToken = loginData.token;
            localStorage.setItem('token', loginData.token);
          }
        } catch (e) {
          console.error('Error en auto-login:', e);
        }
      }

      const headers = {
        'Content-Type': 'application/json',
        ...(currentToken && { 'Authorization': `Bearer ${currentToken}` }),
        ...options.headers
      };

      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          const errorData = await response.json().catch(() => ({ message: 'Error del servidor' }));
          console.error('❌ Error de autenticación:', errorData);
          showToast('Sesión expirada. Por favor, inicie sesión nuevamente.', 'error');
          auth.logout();
          return null;
        }
        
        const errorData = await response.json().catch(() => ({ message: 'Error del servidor' }));
        console.error('❌ Error del servidor:', errorData);
        throw new Error(errorData.message || `Error ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        showToast('Error de conexión. Verifique que el servidor esté funcionando en puerto 5000.', 'error');
      } else {
        showToast(error.message || 'Error inesperado', 'error');
      }
      console.error('Error en API request:', error);
      throw error;
    }
  };

  // Manejar parámetros de query para acciones rápidas
  useEffect(() => {
    const view = searchParams.get('view');
    
    if (view === 'presupuestos') {
      setActiveSection('presupuestos');
    }
  }, [searchParams]);

  // ========== FUNCIONES CONTROL DE CUENTAS ==========
  
  const handleGenerarReporte = async () => {
    try {
      showToast('Generando reporte financiero...', 'info');

      const logoUrl = window.location.origin + '/logo.jpg';
      const now = new Date();
      const mesNombre = now.toLocaleDateString('es-AR', { month: 'long' });
      const periodo = mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1) + ' ' + now.getFullYear();

      const pagosDelPeriodo = pagos
        .filter((p: any) => {
          const fecha = parseDateValue(p?.fecha || p?.fecha_pago || p?.created_at);
          if (!fecha) return false;
          return fecha.getMonth() === now.getMonth() && fecha.getFullYear() === now.getFullYear();
        })
        .map((p: any) => {
          const monto = sanitizeNumber(p?.monto ?? 0);
          const tipo = ((p?.tipo || p?.tipo_pago || '').toString().toLowerCase() === 'egreso') ? 'Egreso' : 'Ingreso';
          const referencia = (p?.referencia || p?.numero_factura || p?.factura_id || '').toString().trim();
          const conceptoBase = (p?.concepto || '').toString().trim();
          const concepto = conceptoBase
            ? conceptoBase
            : referencia
              ? (tipo === 'Ingreso' ? `Pago factura ${referencia}` : `Pago/compra ${referencia}`)
              : 'Movimiento';
          const fecha = parseDateValue(p?.fecha || p?.fecha_pago || p?.created_at);

          return {
            concepto,
            tipo,
            monto: tipo === 'Ingreso' ? monto : -monto,
            fechaDate: fecha,
            fecha: fecha ? fecha.toLocaleDateString('es-AR') : 'Sin fecha'
          };
        })
        .sort((a: any, b: any) => {
          const at = a.fechaDate ? a.fechaDate.getTime() : 0;
          const bt = b.fechaDate ? b.fechaDate.getTime() : 0;
          return bt - at;
        });

      const totalIngresos = pagosDelPeriodo
        .filter((p: any) => p.tipo === 'Ingreso')
        .reduce((sum: number, p: any) => sum + sanitizeNumber(p.monto), 0);

      const totalEgresos = pagosDelPeriodo
        .filter((p: any) => p.tipo === 'Egreso')
        .reduce((sum: number, p: any) => sum + Math.abs(sanitizeNumber(p.monto)), 0);

      const balanceDelPeriodo = totalIngresos - totalEgresos;

      const detalles = pagosDelPeriodo.slice(0, 12);

      const reporteData = {
        fecha_generacion: now,
        periodo,
        version: `dinamico-${now.getTime()}`,
        fuente: controlCuentasResumenTexto.fuente,
        resumen: {
          total_ingresos: totalIngresos,
          total_egresos: totalEgresos,
          balance_neto: balanceDelPeriodo,
          cantidad_movimientos: detalles.length
        },
        detalles
      };

      const escapeHtml = (value: string) =>
        String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');

      const detallesRows = reporteData.detalles.length
        ? reporteData.detalles.map((detalle: any) => `
            <tr>
              <td>${escapeHtml(detalle.fecha)}</td>
              <td>${escapeHtml(detalle.concepto)}</td>
              <td class="${detalle.tipo.toLowerCase()}">${escapeHtml(detalle.tipo)}</td>
              <td class="${detalle.monto > 0 ? 'ingreso' : 'egreso'}">${detalle.monto > 0 ? '+' : '-'}$${Math.abs(detalle.monto).toLocaleString('es-AR')}</td>
            </tr>
          `).join('')
        : `<tr><td colspan="4" style="text-align:center;color:#777;">Sin movimientos registrados en el período</td></tr>`;
      
      // Crear contenido HTML para el reporte
      const reporteContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Reporte Financiero - ${reporteData.periodo} - ${reporteData.version}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; max-width: 800px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #333; padding-bottom: 20px; }
            .summary { display: flex; justify-content: space-around; margin: 30px 0; }
            .summary-card { text-align: center; padding: 20px; border: 2px solid #ddd; border-radius: 10px; min-width: 150px; }
            .positive { color: #28a745; }
            .negative { color: #dc3545; }
            .neutral { color: #007bff; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f8f9fa; font-weight: bold; }
            .ingreso { color: #28a745; }
            .egreso { color: #dc3545; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #777; border-top: 1px solid #ddd; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${logoUrl}" alt="Logo" style="height: 80px; margin-bottom: 20px;" />
            <h1>Herrería Malabia S.H.</h1>
            <h2>Reporte Financiero</h2>
            <h3>${reporteData.periodo}</h3>
            <p style="font-size:12px;color:#555;">Resumen mensual basado en pagos registrados</p>
            <p>Generado el: ${now.toLocaleDateString('es-AR')} a las ${now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
            <p style="font-size:12px;color:#555;">Fuente: ${escapeHtml(reporteData.fuente)} | Versión: ${escapeHtml(reporteData.version)}</p>
          </div>
          
          <div class="summary">
            <div class="summary-card">
              <h4>Total Ingresos</h4>
              <div class="positive" style="font-size: 24px; font-weight: bold;">+$${reporteData.resumen.total_ingresos.toLocaleString()}</div>
            </div>
            <div class="summary-card">
              <h4>Total Egresos</h4>
              <div class="negative" style="font-size: 24px; font-weight: bold;">$${reporteData.resumen.total_egresos.toLocaleString()}</div>
            </div>
            <div class="summary-card">
              <h4>Balance del Período</h4>
              <div class="${reporteData.resumen.balance_neto >= 0 ? 'positive' : 'negative'}" style="font-size: 24px; font-weight: bold;">$${reporteData.resumen.balance_neto.toLocaleString()}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Concepto</th>
                <th>Tipo</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              ${detallesRows}
            </tbody>
          </table>

          <div class="footer">
            <p><strong>Resumen Ejecutivo:</strong></p>
            <p>Balance del período (Ingresos - Egresos): $${reporteData.resumen.balance_neto.toLocaleString()}</p>
            <p>Movimientos considerados: ${reporteData.resumen.cantidad_movimientos}</p>
            <p>Posición del período: ${reporteData.resumen.balance_neto > 0 ? 'Favorable' : reporteData.resumen.balance_neto < 0 ? 'Desfavorable' : 'Neutral'}</p>
            <p>Nota: este reporte no mezcla saldos globales; usa únicamente pagos del mes actual.</p>
            <p>Este reporte fue generado automáticamente por el Sistema de Gestión Herrería Malabia S.H.</p>
          </div>
        </body>
        </html>
      `;

      // Abrir ventana con el reporte
      const reporteWindow = window.open('', '_blank');
      if (reporteWindow) {
        reporteWindow.document.open();
        reporteWindow.document.write(reporteContent);
        reporteWindow.document.close();
        reporteWindow.print();
      }
      
      showToast('Reporte financiero generado exitosamente', 'success');
    } catch (error) {
      showToast('Error al generar reporte', 'error');
    }
  };

  const handleNuevoMovimiento = () => {
    // Pre-llenar datos para un nuevo movimiento
    setNewPagoData(prev => ({
      ...prev,
      cliente_id: '',
      proveedor_id: '',
      factura_id: '',
      tipo_pago: 'ingreso',
      concepto: '',
      monto: 0,
      metodo_pago: 'efectivo',
      fecha_pago: new Date().toISOString().split('T')[0],
      referencia: '',
      observaciones: ''
    }));
    
    // Cambiar a la sección de pagos y abrir el modal
    setActiveSection('pagos');
    setTimeout(() => {
      setShowNewPagoModal(true);
    }, 100);
  };

  // Actualizar el título de la página
  useEffect(() => {
    document.title = 'Gestión Administrativa - Herrería Malabia S.H.';
  }, []);

  const handleNewClient = () => {
    setShowNewClientModal(true);
  };

  const handleSearch = () => {
    setShowSearchModal(true);
  };

  const closeModals = () => {
    setShowNewClientModal(false);
    setShowSearchModal(false);
    setShowViewModal(false);
    setShowEditModal(false);
    setShowNewProveedorModal(false);
    setShowViewProveedorModal(false);
    setShowEditProveedorModal(false);
    setShowViewPresupuestoModal(false);
    setShowNewPresupuestoModal(false);
    setShowEditPresupuestoEstadoModal(false);
    setShowNewFacturaModal(false);
    setShowViewFacturaModal(false);
    setShowNewPagoModal(false);
    setShowViewPagoModal(false);
    setShowNewCompraModal(false);
    setShowViewCompraModal(false);
    setShowCuentaModal(false);
    setReturnToCompraAfterProveedor(false);
    setSearchTerm('');
    setSelectedCliente(null);
    setSelectedProveedor(null);
    setSelectedPresupuesto(null);
    setPresupuestoEstadoTarget(null);
    setNuevoEstadoPresupuesto('PENDIENTE');
    setSelectedFactura(null);
    setSelectedPago(null);
    setSelectedCuenta(null);
    setNewClientData({
      nombre: '',
      email: '',
      telefono: '',
      direccion: '',
      categoria: 'Particular'
    });
    setEditClientData({
      nombre: '',
      email: '',
      telefono: '',
      direccion: '',
      categoria: 'Particular',
      activo: true
    });
    setNewProveedorData({
      nombre: '',
      email: '',
      telefono: '',
      direccion: '',
      rubro: '',
      cuit: ''
    });
    setEditProveedorData({
      nombre: '',
      email: '',
      telefono: '',
      direccion: '',
      rubro: '',
      cuit: ''
    });
    setNewPresupuestoData({
      cliente_id: '',
      nombre_cliente: '',
      email_cliente: '',
      telefono_cliente: '',
      tipo_trabajo: '',
      tipo_material: '',
      descripcion: '',
      cantidad: 1,
      precio_material_unitario: 0,
      tiempo_estimado_horas: 0,
      precio_hora_mano_obra: 15000,
      subtotal_material: 0,
      subtotal_mano_obra: 0,
      total: 0,
      validez_dias: 30,
      observaciones: ''
    });
    setNewFacturaData({
      cliente_id: '',
      numero_factura: '',
      descripcion: '',
      monto: 0,
      fecha_vencimiento: '',
      metodo_pago: 'efectivo',
      telefono_cliente: '',
      observaciones: ''
    });
    setNewPagoData(prev => ({
      ...prev,
      cliente_id: '',
      proveedor_id: '',
      factura_id: '',
      tipo_pago: 'ingreso',
      concepto: '',
      monto: 0,
      metodo_pago: 'efectivo',
      fecha_pago: '',
      referencia: '',
      observaciones: ''
    }));
    setNewCompraData({
      proveedor_id: '',
      numero_compra: '',
      descripcion: '',
      monto: '',
      fecha_vencimiento: '',
      metodo_pago: 'efectivo',
      observaciones: ''
    });
  };

  // ========== FUNCIONES PRESUPUESTOS - COMPLETO ==========
  
  const handleNewPresupuesto = () => {
    if (clientesParaPresupuesto.length === 0) {
      fetchClientesParaPresupuesto();
    }
    setShowNewPresupuestoModal(true);
  };

  const handleViewPresupuesto = async (presupuesto: any) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    try {
      const response = await fetch(`${apiUrl}/presupuestos-detallados/${presupuesto.id}`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedPresupuesto(data.presupuesto || presupuesto);
      } else {
        setSelectedPresupuesto(presupuesto);
      }
    } catch (error) {
      console.error('Error al cargar detalle del presupuesto:', error);
      setSelectedPresupuesto(presupuesto);
    }

    setShowViewPresupuestoModal(true);
  };

  const handleClienteChange = (clienteId: string) => {
    const list = clientesParaPresupuesto.length ? clientesParaPresupuesto : clientes;
    const cliente = list.find(c => c.id.toString() === clienteId);
    if (cliente) {
      setNewPresupuestoData({
        ...newPresupuestoData,
        cliente_id: clienteId,
        nombre_cliente: cliente.nombre,
        email_cliente: cliente.email,
        telefono_cliente: cliente.telefono
      });
    } else {
      setNewPresupuestoData({
        ...newPresupuestoData,
        cliente_id: clienteId,
        nombre_cliente: '',
        email_cliente: '',
        telefono_cliente: ''
      });
    }
  };

  // Precios base de materiales por unidad/metro
  const getMaterialPrice = (material: string): number => {
    const precios: { [key: string]: number } = {
      'Hierro Común': 25000,
      'Hierro Galvanizado': 35000,
      'Acero Inoxidable': 55000,
      'Aluminio': 40000,
      'Hierro Forjado': 65000,
      'Chapa Común': 20000,
      'Chapa Galvanizada': 28000,
      'Perfil L': 30000,
      'Perfil U': 32000,
      'Caño Estructural': 38000
    };
    return precios[material] || 0;
  };

  const calculatePresupuesto = () => {
    const cantidad = parseInt(newPresupuestoData.cantidad.toString()) || 0;
    const precioMaterial = parseFloat(newPresupuestoData.precio_material_unitario.toString()) || 0;
    const tiempoHoras = parseFloat(newPresupuestoData.tiempo_estimado_horas.toString()) || 0;
    const precioHora = parseFloat(newPresupuestoData.precio_hora_mano_obra.toString()) || 15000;
    
    const subtotalMaterial = cantidad * precioMaterial;
    const subtotalManoObra = tiempoHoras * precioHora;
    const total = subtotalMaterial + subtotalManoObra;
    
    setNewPresupuestoData(prev => ({
      ...prev,
      subtotal_material: subtotalMaterial,
      subtotal_mano_obra: subtotalManoObra,
      total: total
    }));
  };

  const handleMaterialChange = (material: string) => {
    const precioMaterial = getMaterialPrice(material);
    setNewPresupuestoData(prev => {
      const newData = {
        ...prev,
        tipo_material: material,
        precio_material_unitario: precioMaterial
      };
      
      // Recalcular inmediatamente con los nuevos datos
      const cantidad = parseInt(newData.cantidad.toString()) || 0;
      const tiempoHoras = parseFloat(newData.tiempo_estimado_horas.toString()) || 0;
      const precioHora = parseFloat(newData.precio_hora_mano_obra.toString()) || 15000;
      
      const subtotalMaterial = cantidad * precioMaterial;
      const subtotalManoObra = tiempoHoras * precioHora;
      const total = subtotalMaterial + subtotalManoObra;
      
      return {
        ...newData,
        subtotal_material: subtotalMaterial,
        subtotal_mano_obra: subtotalManoObra,
        total: total
      };
    });
  };

  const handleCantidadChange = (value: string) => {
    const cantidad = parseInt(value) || 0;
    setNewPresupuestoData(prev => {
      const newData = {
        ...prev,
        cantidad: cantidad
      };
      
      // Recalcular inmediatamente
      const precioMaterial = parseFloat(newData.precio_material_unitario.toString()) || 0;
      const tiempoHoras = parseFloat(newData.tiempo_estimado_horas.toString()) || 0;
      const precioHora = parseFloat(newData.precio_hora_mano_obra.toString()) || 15000;
      
      const subtotalMaterial = cantidad * precioMaterial;
      const subtotalManoObra = tiempoHoras * precioHora;
      const total = subtotalMaterial + subtotalManoObra;
      
      return {
        ...newData,
        subtotal_material: subtotalMaterial,
        subtotal_mano_obra: subtotalManoObra,
        total: total
      };
    });
  };

  const handleTiempoChange = (value: string) => {
    const tiempoHoras = parseFloat(value) || 0;
    setNewPresupuestoData(prev => {
      const newData = {
        ...prev,
        tiempo_estimado_horas: tiempoHoras
      };
      
      // Recalcular inmediatamente
      const cantidad = parseInt(newData.cantidad.toString()) || 0;
      const precioMaterial = parseFloat(newData.precio_material_unitario.toString()) || 0;
      const precioHora = parseFloat(newData.precio_hora_mano_obra.toString()) || 15000;
      
      const subtotalMaterial = cantidad * precioMaterial;
      const subtotalManoObra = tiempoHoras * precioHora;
      const total = subtotalMaterial + subtotalManoObra;
      
      return {
        ...newData,
        subtotal_material: subtotalMaterial,
        subtotal_mano_obra: subtotalManoObra,
        total: total
      };
    });
  };

  const handlePrecioHoraChange = (value: string) => {
    const precioHora = parseFloat(value) || 0;
    setNewPresupuestoData(prev => {
      const newData = {
        ...prev,
        precio_hora_mano_obra: precioHora
      };
      
      // Recalcular inmediatamente
      const cantidad = parseInt(newData.cantidad.toString()) || 0;
      const precioMaterial = parseFloat(newData.precio_material_unitario.toString()) || 0;
      const tiempoHoras = parseFloat(newData.tiempo_estimado_horas.toString()) || 0;
      
      const subtotalMaterial = cantidad * precioMaterial;
      const subtotalManoObra = tiempoHoras * precioHora;
      const total = subtotalMaterial + subtotalManoObra;
      
      return {
        ...newData,
        subtotal_material: subtotalMaterial,
        subtotal_mano_obra: subtotalManoObra,
        total: total
      };
    });
  };

  const handleSavePresupuesto = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const clientesDisponibles = clientesParaPresupuesto.length ? clientesParaPresupuesto : clientes;

    // Validar si hay clientes disponibles
    if (clientesDisponibles.length === 0) {
      showToast('Primero debe registrar clientes en la sección "Registro de Clientes"', 'error');
      return;
    }
    
    // Validaciones más específicas
    if (!newPresupuestoData.cliente_id) {
      showToast('Por favor seleccione un cliente', 'error');
      return;
    }
    
    if (!newPresupuestoData.tipo_trabajo.trim()) {
      showToast('Por favor seleccione el tipo de trabajo', 'error');
      return;
    }
    
    if (!newPresupuestoData.tipo_material.trim()) {
      showToast('Por favor seleccione el tipo de material', 'error');
      return;
    }
    
    if (!newPresupuestoData.descripcion.trim()) {
      showToast('Por favor ingrese una descripción del trabajo', 'error');
      return;
    }
    
    if (newPresupuestoData.cantidad <= 0) {
      showToast('La cantidad debe ser mayor a 0', 'error');
      return;
    }
    
    if (newPresupuestoData.precio_material_unitario <= 0) {
      showToast('El precio del material debe ser mayor a 0', 'error');
      return;
    }
    
    if (newPresupuestoData.tiempo_estimado_horas <= 0) {
      showToast('El tiempo estimado debe ser mayor a 0', 'error');
      return;
    }
    
    if (newPresupuestoData.precio_hora_mano_obra <= 0) {
      showToast('El precio por hora debe ser mayor a 0', 'error');
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/presupuestos-detallados`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify(newPresupuestoData)
      });

      if (response.ok) {
        const data = await response.json();
        showToast('✓ Presupuesto creado exitosamente', 'success');
        closeModals();
        fetchPresupuestos();
        fetchStats();
      } else {
        const error = await response.json();
        showToast(error.error || 'Error al crear presupuesto', 'error');
      }
    } catch (error) {
      console.error('Error al crear presupuesto:', error);
      showToast('Error de conexión al crear presupuesto', 'error');
    }
  };

  const handleConvertToFactura = (presupuesto: any) => {
    // Abrir modal de confirmación en lugar del confirm nativo
    setPresupuestoToConvert(presupuesto);
    setShowConvertConfirm(true);
  };

  const handleEditPresupuestoEstado = (presupuesto: any) => {
    setPresupuestoEstadoTarget(presupuesto);
    setNuevoEstadoPresupuesto(normalizePresupuestoEstado(presupuesto.estado) as PresupuestoEstado);
    setShowEditPresupuestoEstadoModal(true);
  };

  const handleDeletePresupuesto = async (presupuesto: any) => {
    const estadoActual = normalizePresupuestoEstado(presupuesto?.estado);
    if (estadoActual === 'FACTURADO') {
      showToast('No se puede cancelar un presupuesto facturado', 'error');
      return;
    }

    if (!confirm('¿Está seguro de cancelar este presupuesto?')) {
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/presupuestos-detallados/${presupuesto.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });

      if (response.ok) {
        showToast('Presupuesto cancelado', 'success');
        fetchPresupuestos();
        fetchStats();
      } else {
        const error = await response.json().catch(() => ({}));
        showToast(error.error || 'Error al cancelar presupuesto', 'error');
      }
    } catch (error) {
      console.error('Error al cancelar presupuesto:', error);
      showToast('Error de conexión al cancelar presupuesto', 'error');
    }
  };

  const confirmConvertToFactura = async () => {
    if (!presupuestoToConvert) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/presupuestos-detallados/${presupuestoToConvert.id}/convertir-factura`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        showToast(`✓ Presupuesto convertido a factura ${data.numero_factura} exitosamente`, 'success');
        setActiveSection('facturas');
        fetchFacturas();
        fetchPresupuestos();
      } else {
        const error = await response.json();
        showToast(error.error || 'Error al convertir presupuesto', 'error');
      }
    } catch (error) {
      console.error('Error al convertir presupuesto:', error);
      showToast('Error de conexión al convertir presupuesto', 'error');
    } finally {
      setShowConvertConfirm(false);
      setPresupuestoToConvert(null);
    }
  };

  const handleUpdatePresupuestoEstado = async () => {
    if (!presupuestoEstadoTarget?.id) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/presupuestos-detallados/${presupuestoEstadoTarget.id}/estado`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ estado: nuevoEstadoPresupuesto })
      });

      if (response.ok) {
        await fetchPresupuestos();
        await fetchStats();
        showToast('Estado de presupuesto actualizado', 'success');
        setShowEditPresupuestoEstadoModal(false);
        setPresupuestoEstadoTarget(null);
      } else {
        const error = await response.json().catch(() => ({}));
        showToast(error.error || 'Error al actualizar estado', 'error');
      }
    } catch (error) {
      console.error('Error al actualizar estado de presupuesto:', error);
      showToast('Error de conexión al actualizar estado', 'error');
    }
  };

  const handleQuickPresupuestoEstadoChange = async (presupuesto: any, estado: PresupuestoEstado) => {
    const estadoActual = normalizePresupuestoEstado(presupuesto?.estado) as PresupuestoEstado;
    if (estadoActual === estado) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/presupuestos-detallados/${presupuesto.id}/estado`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ estado })
      });

      if (response.ok) {
        await fetchPresupuestos();
        await fetchStats();
        showToast(`Estado actualizado a ${estado}`, 'success');
      } else {
        const error = await response.json().catch(() => ({}));
        showToast(error.error || 'Error al actualizar estado', 'error');
      }
    } catch (error) {
      console.error('Error al actualizar estado de presupuesto:', error);
      showToast('Error de conexión al actualizar estado', 'error');
    }
  };

  // ========== FUNCIONES FACTURAS ==========
  
  const handleNewFactura = () => {
    setShowNewFacturaModal(true);
  };

  const handleViewFactura = (factura: any) => {
    setSelectedFactura(factura);
    setShowViewFacturaModal(true);
  };

  const handleSaveFactura = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newFacturaData.cliente_id || !newFacturaData.numero_factura || !newFacturaData.monto || newFacturaData.monto <= 0) {
      showToast('Por favor complete todos los campos obligatorios', 'error');
      return;
    }

    if (savingFactura) return;
    setSavingFactura(true);

    try {
      const facturaToSend = {
        cliente_id: parseInt(newFacturaData.cliente_id as any),
        numero_factura: (newFacturaData.numero_factura || '').toString().trim(),
        descripcion: (newFacturaData.descripcion || '').toString().trim(),
        monto: Number(newFacturaData.monto) || 0,
        fecha_vencimiento: newFacturaData.fecha_vencimiento || null,
        metodo_pago: newFacturaData.metodo_pago || 'efectivo',
        telefono_cliente: (newFacturaData.telefono_cliente || '').toString().trim(),
        observaciones: (newFacturaData.observaciones || '').toString().trim()
      };

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

      // Usar helper makeApiRequest para manejo de token y errores coherentes
      const res = await makeApiRequest(`${apiUrl}/facturas`, {
        method: 'POST',
        body: JSON.stringify(facturaToSend)
      });

      if (res) {
        showToast('✓ Factura creada exitosamente', 'success');
        closeModals();
        fetchFacturas();
        fetchStats();
      } else {
        const clienteNombre = (clientes.find(c => c.id.toString() === (newFacturaData.cliente_id || '').toString()) || { nombre: 'Cliente' }).nombre;
        const facturaLocal = {
          id: Date.now(),
          numero_factura: (newFacturaData.numero_factura || '').toString().trim(),
          nombre_cliente: clienteNombre,
          total: Number(newFacturaData.monto) || 0,
          created_at: new Date().toISOString(),
          estado: 'pendiente'
        };
        const cached = readLocalList('facturas_local');
        const next = [facturaLocal, ...cached];
        writeLocalList('facturas_local', next);
        setFacturas(next);
        showToast('✓ Factura creada en modo local', 'success');
      }
    } catch (error) {
      console.error('Error al crear factura:', error);
      showToast('Error al crear factura', 'error');
    } finally {
      setSavingFactura(false);
    }
  };

  const fetchFacturas = async () => {
    // Si no hay token, usar cache local si existe (persistencia offline)
    if (!auth.token) {
      const cached = readLocalList('facturas_local');
      if (cached.length) {
        setFacturas(cached);
        return;
      }
      setFacturas([
        { id: 1, numero_factura: 'FAC-001', nombre_cliente: 'Juan Pérez', total: 45000, created_at: new Date().toISOString(), estado: 'pagada' },
        { id: 2, numero_factura: 'FAC-002', nombre_cliente: 'María García', total: 32000, created_at: new Date().toISOString(), estado: 'pendiente' }
      ]);
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/facturas`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFacturas(data.facturas || []);
        writeLocalList('facturas_local', data.facturas || []);
      } else {
        const cached = readLocalList('facturas_local');
        if (cached.length) {
          setFacturas(cached);
        } else {
          setFacturas([
            { id: 1, numero_factura: 'FAC-001', nombre_cliente: 'Juan Pérez', total: 45000, created_at: new Date().toISOString(), estado: 'pagada' },
            { id: 2, numero_factura: 'FAC-002', nombre_cliente: 'María García', total: 32000, created_at: new Date().toISOString(), estado: 'pendiente' }
          ]);
        }
      }
    } catch (error) {
      console.error('Error al cargar facturas:', error);
      const cached = readLocalList('facturas_local');
      if (cached.length) {
        setFacturas(cached);
      } else {
        setFacturas([
          { id: 1, numero_factura: 'FAC-001', nombre_cliente: 'Juan Pérez', total: 45000, created_at: new Date().toISOString(), estado: 'pagada' },
          { id: 2, numero_factura: 'FAC-002', nombre_cliente: 'María García', total: 32000, created_at: new Date().toISOString(), estado: 'pendiente' }
        ]);
      }
    }
  };

  // Funciones específicas para acciones de facturas
  const handleViewFacturaAction = (factura: any) => {
    setSelectedFactura(factura);
    setShowViewFacturaModal(true);
  };



  const handlePrintPDF = async (factura: any) => {
    try {
      showToast('Generando PDF profesional...', 'info');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      
      const response = await fetch(`${apiUrl}/pdf/factura/${factura.id}/html`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });

      if (!response.ok) {
        showToast('Error al generar PDF', 'error');
        return;
      }

      const htmlContent = await response.text();

      // Abrir ventana con el PDF profesional
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.print();
      }
      
      showToast('PDF generado exitosamente', 'success');
    } catch (error) {
      console.error('Error al generar PDF:', error);
      showToast('Error al generar PDF', 'error');
    }
  };

  const handlePrintPresupuesto = async (presupuesto: any) => {
    try {
      showToast('Generando presupuesto para imprimir...', 'info');
      
      // Cargar logo como base64
      let logoBase64 = '';
      try {
        const logoUrl = `${window.location.origin}/logo.jpg`;
        const logoResponse = await fetch(logoUrl);
        if (logoResponse.ok) {
          const blob = await logoResponse.blob();
          logoBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string) || '');
            reader.readAsDataURL(blob);
          });
        }
      } catch (logoError) {
        console.warn('No se pudo cargar el logo:', logoError);
      }
      const fechaPresupuestoRaw = presupuesto.fecha 
        || presupuesto.fecha_creacion 
        || presupuesto.created_at 
        || presupuesto.createdAt 
        || presupuesto.fecha_emision 
        || presupuesto.fechaEmision;
      const fechaPresupuestoDate = parseDateValue(fechaPresupuestoRaw);
      const fechaPresupuestoTexto = fechaPresupuestoDate
        ? `${fechaPresupuestoDate.toLocaleDateString('es-AR')} ${fechaPresupuestoDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`
        : 'Fecha no disponible';

      // Crear HTML profesional del presupuesto
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Presupuesto #${presupuesto.id}</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              max-width: 900px;
              margin: 0 auto;
              background: white;
              padding: 40px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 40px;
              border-bottom: 3px solid #7c3aed;
              padding-bottom: 20px;
            }
            .company-info h1 {
              margin: 0;
              color: #7c3aed;
              font-size: 28px;
            }
            .company-info p {
              margin: 5px 0;
              color: #666;
              font-size: 13px;
            }
            .presupuesto-info {
              text-align: right;
            }
            .presupuesto-info h2 {
              margin: 0 0 10px 0;
              color: #7c3aed;
              font-size: 18px;
            }
            .presupuesto-info p {
              margin: 3px 0;
              color: #666;
              font-size: 13px;
            }
            .cliente-info {
              background-color: #f9f5ff;
              padding: 20px;
              border-radius: 6px;
              margin-bottom: 30px;
              border-left: 4px solid #7c3aed;
            }
            .cliente-info h3 {
              margin: 0 0 10px 0;
              color: #7c3aed;
            }
            .cliente-info p {
              margin: 5px 0;
              color: #333;
              font-size: 14px;
            }
            .detalles {
              margin-bottom: 30px;
            }
            .detalles-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-top: 10px;
            }
            .detalle-item {
              background: #f9f5ff;
              padding: 12px;
              border-radius: 6px;
            }
            .detalle-item label {
              font-weight: 600;
              color: #7c3aed;
              font-size: 12px;
              text-transform: uppercase;
            }
            .detalle-item value {
              display: block;
              color: #333;
              font-size: 14px;
              margin-top: 4px;
            }
            .descripcion {
              background-color: #f9f5ff;
              padding: 20px;
              border-radius: 6px;
              margin-bottom: 30px;
            }
            .descripcion-title {
              color: #7c3aed;
              font-weight: 600;
              font-size: 14px;
              text-transform: uppercase;
              margin-bottom: 10px;
            }
            .descripcion-text {
              color: #333;
              font-size: 14px;
              line-height: 1.6;
              white-space: pre-wrap;
            }
            .resumen {
              background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
              color: white;
              padding: 30px;
              border-radius: 8px;
              text-align: right;
              margin-bottom: 30px;
            }
            .resumen p {
              margin: 10px 0;
              font-size: 14px;
            }
            .resumen .total {
              font-size: 32px;
              font-weight: bold;
              margin-top: 15px;
              border-top: 2px solid rgba(255,255,255,0.3);
              padding-top: 15px;
            }
            .footer {
              border-top: 1px solid #ddd;
              padding-top: 20px;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
            .validez {
              background-color: #fef3c7;
              border: 2px solid #f59e0b;
              padding: 15px;
              border-radius: 6px;
              margin-bottom: 20px;
              color: #92400e;
              font-weight: 600;
            }
            .estado {
              display: inline-block;
              padding: 6px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              margin-top: 10px;
            }
            .estado-pendiente {
              background-color: #fef3c7;
              color: #92400e;
            }
            .estado-senado {
              background-color: #dbeafe;
              color: #1e40af;
            }
            .estado-facturado {
              background-color: #dcfce7;
              color: #166534;
            }
            .estado-pagado {
              background-color: #d1fae5;
              color: #065f46;
            }
            .estado-vencido {
              background-color: #fee2e2;
              color: #991b1b;
            }
            @media print {
              body {
                background: white;
              }
              .container {
                box-shadow: none;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="company-info">
                ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" style="max-width: 100px; margin-bottom: 10px; display: block;">` : '<div style="max-width: 100px; height: 80px; margin-bottom: 10px; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px;">HM</div>'}
                <h1>Herrería Malabia S.H.</h1>
                <p>Sistema de Gestión de Herrería</p>
                <p>Presupuestos Profesionales</p>
              </div>
              <div class="presupuesto-info">
                <h2>PRESUPUESTO</h2>
                <p><strong>ID:</strong> ${presupuesto.id}</p>
                <p><strong>Fecha:</strong> ${fechaPresupuestoTexto}</p>
              </div>
            </div>

            <div class="cliente-info">
              <h3>📋 Información del Cliente</h3>
              <p><strong>Nombre:</strong> ${presupuesto.nombreCliente || presupuesto.cliente_nombre}</p>
              <p><strong>Email:</strong> ${presupuesto.email || presupuesto.cliente_email}</p>
              <p><strong>Teléfono:</strong> ${presupuesto.telefono || presupuesto.cliente_telefono}</p>
            </div>

            <div class="detalles">
              <h3 style="color: #7c3aed; margin-bottom: 15px;">📝 Detalles del Trabajo</h3>
              <div class="detalles-grid">
                <div class="detalle-item">
                  <label>Tipo de Trabajo</label>
                  <value>${presupuesto.tipoTrabajo || presupuesto.tipo_trabajo || 'No especificado'}</value>
                </div>
                <div class="detalle-item">
                  <label>Material Utilizado</label>
                  <value>${presupuesto.tipo_material || 'No especificado'}</value>
                </div>
              </div>
            </div>

            <div class="descripcion">
              <div class="descripcion-title">📄 Descripción del Trabajo</div>
              <div class="descripcion-text">${presupuesto.descripcion || presupuesto.mensaje || 'Sin descripción'}</div>
            </div>

            <div class="validez">
              ⏱️ Validez de este presupuesto: ${presupuesto.validez_dias || 30} días
            </div>

            <div class="resumen">
              <p>TOTAL DEL PRESUPUESTO</p>
              <div class="total">$${(presupuesto.total || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</div>
              <p style="margin-top: 15px; font-size: 12px;">
                <span class="estado estado-${normalizePresupuestoEstado(presupuesto.estado).toLowerCase()}">
                  Estado: ${normalizePresupuestoEstado(presupuesto.estado)}
                </span>
              </p>
            </div>

            ${presupuesto.observaciones ? `
              <div style="background-color: #f0fdf4; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #22c55e;">
                <h4 style="margin: 0 0 10px 0; color: #166534;">Observaciones</h4>
                <p style="margin: 0; color: #166534; white-space: pre-wrap;">${presupuesto.observaciones}</p>
              </div>
            ` : ''}

            <div class="footer">
              <p>Este presupuesto fue generado por el Sistema de Gestión de Herrería Malabia S.H.</p>
              <p>Fecha de impresión: ${new Date().toLocaleDateString('es-AR')} a las ${new Date().toLocaleTimeString('es-AR')}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 1000);
      }
      
      showToast('Presupuesto listo para imprimir', 'success');
    } catch (error) {
      console.error('Error al generar presupuesto:', error);
      showToast('Error al generar presupuesto', 'error');
    }
  };

  const handleRegisterPayment = (factura: any) => {
    if (factura.estado === 'pagada') {
      // Si ya está pagada, mostrar información del pago existente
      showToast('Esta factura ya está pagada. Puede ver los detalles del pago en la sección de pagos.', 'info');
      setActiveSection('pagos');
      return;
    }

    // Pre-llenar datos del pago para facturas pendientes
    const numeroFactura = factura.numero_factura || factura.numero || factura.numeroFactura || factura.id || '';
    const montoFactura = Number(factura.total ?? factura.monto ?? 0) || 0;
    setNewPagoData(prev => ({
      ...prev,
      cliente_id: factura.cliente_id || '',
      proveedor_id: '',
      factura_id: factura.id || '',
      tipo_pago: 'ingreso',
      concepto: `Pago de factura ${numeroFactura}`,
      monto: montoFactura,
      metodo_pago: 'efectivo', // El empleado podrá cambiar esto en el modal
      fecha_pago: new Date().toISOString().split('T')[0],
      referencia: numeroFactura,
      observaciones: `Pago correspondiente a la factura ${numeroFactura}`
    }));
    
    // Cambiar a la sección de pagos y abrir el modal
    setActiveSection('pagos');
    setTimeout(() => {
      setShowNewPagoModal(true);
    }, 100);
  };

  // ========== FUNCIONES PAGOS ==========
  
  const fetchPagos = async () => {
    const fallback = [
      { id: 1, cliente: 'Juan Pérez', tipo: 'ingreso', concepto: 'Pago Factura FAC-001', monto: 45000, fecha: new Date(), metodo: 'transferencia' },
      { id: 2, concepto: 'Compra materiales', tipo: 'egreso', monto: 15000, fecha: new Date(), metodo: 'efectivo' }
    ].map(normalizePago);

    const applyLocalFilters = (lista: any[]) => {
      return lista.filter(p => {
        if (pagoFilters.tipo && p.tipo !== pagoFilters.tipo) return false;
        if (pagoFilters.metodo && p.metodo !== pagoFilters.metodo) return false;
        if (pagoFilters.desde) {
          const fecha = parseDateValue(p.fecha);
          if (!fecha || fecha < new Date(`${pagoFilters.desde}T00:00:00`)) return false;
        }
        if (pagoFilters.hasta) {
          const fecha = parseDateValue(p.fecha);
          if (!fecha || fecha > new Date(`${pagoFilters.hasta}T23:59:59`)) return false;
        }
        if (pagoFilters.estadoCliente && p.estado_presupuesto) {
          if ((p.estado_presupuesto || '').toUpperCase() !== pagoFilters.estadoCliente.toUpperCase()) return false;
        }
        return true;
      });
    };

    if (!auth.token) {
      const cached = readLocalList('pagos_local').map(normalizePago);
      if (cached.length) {
        setPagos(applyLocalFilters(cached));
      } else {
        setPagos(prev => (prev.length ? applyLocalFilters(prev) : applyLocalFilters(fallback)));
      }
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const params = new URLSearchParams();
      if (pagoFilters.tipo) params.set('tipo_pago', pagoFilters.tipo);
      if (pagoFilters.metodo) params.set('metodo_pago', pagoFilters.metodo);
      if (pagoFilters.desde) params.set('desde', pagoFilters.desde);
      if (pagoFilters.hasta) params.set('hasta', pagoFilters.hasta);
      if (pagoFilters.estadoCliente) params.set('estado_cliente', pagoFilters.estadoCliente);

      const res = await fetch(`${apiUrl}/pagos?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${auth.token}` }
      });

      if (!res.ok) {
        setPagos(prev => (prev.length ? applyLocalFilters(prev) : applyLocalFilters(fallback)));
        return;
      }

      const data = await res.json();
      const normalized = (data.pagos || []).map(normalizePago);
      setPagos(normalized);
      writeLocalList('pagos_local', normalized);
    } catch (error) {
      console.error('Error al cargar pagos:', error);
      const cached = readLocalList('pagos_local').map(normalizePago);
      if (cached.length) {
        setPagos(applyLocalFilters(cached));
      } else {
        setPagos(prev => (prev.length ? applyLocalFilters(prev) : applyLocalFilters(fallback)));
      }
    }
  };

  // Funciones específicas para acciones de pagos
  const handleViewPago = (pago: any) => {
    setSelectedPago(pago);
    setShowViewPagoModal(true);
  };

  const handlePrintComprobante = async (pago: any) => {
    try {
      showToast('Generando comprobante...', 'info');
      
      // Simular generación de comprobante
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Crear contenido HTML para el comprobante
      const comprobanteContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Comprobante de Pago #${pago.id}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; max-width: 600px; }
            .header { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px; margin-bottom: 20px; }
            .header img { height: 90px; object-fit: contain; }
            .header .titulo { font-weight: 700; }
            .details { margin-bottom: 20px; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .label { font-weight: bold; color: #555; }
            .value { color: #333; }
            .total { font-weight: bold; font-size: 18px; border-top: 2px solid #333; padding-top: 15px; margin-top: 20px; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #777; }
            .status { padding: 5px 10px; border-radius: 15px; font-size: 12px; }
            .ingreso { background-color: #d4edda; color: #155724; }
            .egreso { background-color: #f8d7da; color: #721c24; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${location.origin}/logo.jpg" alt="Logo" />
            <div class="titulo">
              <h1 style="margin:0;">Herrería Malabia S.H.</h1>
              <h2 style="margin:0; font-weight:600;">Comprobante de ${pago.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'} #${pago.id}</h2>
            </div>
          </div>
          <div class="details">
            <div class="detail-row">
              <span class="label">Fecha:</span>
              <span class="value">${new Date(pago.fecha).toLocaleDateString()}</span>
            </div>
            <div class="detail-row">
              <span class="label">Tipo:</span>
              <span class="value status ${pago.tipo}">${pago.tipo === 'ingreso' ? '↗ Ingreso' : '↙ Egreso'}</span>
            </div>
            <div class="detail-row">
              <span class="label">Concepto:</span>
              <span class="value">${pago.concepto}</span>
            </div>
            <div class="detail-row">
              <span class="label">Cliente/Proveedor:</span>
              <span class="value">${pago.cliente || 'Sistema'}</span>
            </div>
            <div class="detail-row">
              <span class="label">Método de Pago:</span>
              <span class="value">${pago.metodo === 'transferencia' ? '🏦 Transferencia' : '💵 Efectivo'}</span>
            </div>
          </div>
          <div class="total">
            <div class="detail-row">
              <span class="label">Monto Total:</span>
              <span class="value" style="color: ${pago.tipo === 'ingreso' ? '#28a745' : '#dc3545'}">
                ${pago.tipo === 'ingreso' ? '+' : '-'}$${pago.monto.toLocaleString()}
              </span>
            </div>
          </div>
          <div class="footer">
            <p>Comprobante generado el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}</p>
            <p>Herrería Malabia S.H. - Sistema de Gestión</p>
          </div>
        </body>
        </html>
      `;

      // Abrir ventana con el comprobante
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(comprobanteContent);
        printWindow.document.close();
        printWindow.print();
      }
      
      showToast('Comprobante generado exitosamente', 'success');
    } catch (error) {
      showToast('Error al generar comprobante', 'error');
    }
  };

  /**
   * Guarda un nuevo pago en el estado (simulación)
   */
  const handleSavePago = async (e: any) => {
    if (e && e.preventDefault) e.preventDefault();

    // Validaciones básicas
    if (newPagoData.tipo_pago === 'ingreso' && !newPagoData.cliente_id) {
      showToast('Por favor seleccione un cliente para un ingreso', 'error');
      return;
    }
    if (newPagoData.tipo_pago === 'egreso' && !newPagoData.proveedor_id) {
      showToast('Por favor seleccione un proveedor para un egreso', 'error');
      return;
    }
    if (!newPagoData.concepto || newPagoData.concepto.trim() === '') {
      showToast('Por favor ingrese el concepto del pago', 'error');
      return;
    }
    if (!newPagoData.monto || Number(newPagoData.monto) <= 0) {
      showToast('El monto debe ser mayor a 0', 'error');
      return;
    }

    // Intentar persistir el pago en el backend si hay conexión/token
    const apiUrl = 'http://localhost:5000/api';
    const payload: any = {
      tipo_pago: newPagoData.tipo_pago,
      concepto: newPagoData.concepto || null,
      monto: Number(newPagoData.monto) || 0,
      metodo_pago: newPagoData.metodo_pago || null,
      fecha_pago: newPagoData.fecha_pago || new Date().toISOString().split('T')[0],
      referencia: newPagoData.referencia || null,
      observaciones: newPagoData.observaciones || null
    };

    // Normalizar IDs (pueden venir como string desde selects)
    let clienteId: number | null = null;
    let proveedorId: number | null = null;
    let facturaId: number | null = null;
    if (newPagoData.cliente_id !== undefined && newPagoData.cliente_id !== null && newPagoData.cliente_id !== '') {
      const cid = typeof newPagoData.cliente_id === 'string' ? parseInt(newPagoData.cliente_id, 10) : newPagoData.cliente_id;
      clienteId = Number.isNaN(cid) ? null : cid;
    }
    if (newPagoData.proveedor_id !== undefined && newPagoData.proveedor_id !== null && newPagoData.proveedor_id !== '') {
      const pid = typeof newPagoData.proveedor_id === 'string' ? parseInt(newPagoData.proveedor_id, 10) : newPagoData.proveedor_id;
      proveedorId = Number.isNaN(pid) ? null : pid;
    }
    if (newPagoData.factura_id !== undefined && newPagoData.factura_id !== null && newPagoData.factura_id !== '') {
      const fid = typeof newPagoData.factura_id === 'string' ? parseInt(newPagoData.factura_id, 10) : newPagoData.factura_id;
      facturaId = Number.isNaN(fid) ? null : fid;
    }

    // Si no tenemos facturaId pero la referencia apunta al número de factura, intentar inferir el id
    if (facturaId === null && newPagoData.referencia) {
      const referencia = (newPagoData.referencia || '').toString();
      const found = facturas.find(f => (f.numero_factura && f.numero_factura.toString() === referencia) || (f.numero && f.numero.toString() === referencia));
      if (found && found.id) facturaId = found.id;
    }

    // Adjuntar IDs si existen (no depender solo del tipo de pago)
    if (newPagoData.tipo_pago === 'ingreso') {
      if (clienteId !== null) payload.cliente_id = clienteId;
      payload.proveedor_id = null;
    }
    if (newPagoData.tipo_pago === 'egreso') {
      if (proveedorId !== null) payload.proveedor_id = proveedorId;
      payload.cliente_id = null;
    }
    if (facturaId !== null) payload.factura_id = facturaId;

    // Sanitizar concepto para evitar 'Pago de factura undefined'
    if (payload.concepto && payload.concepto.includes('undefined')) {
      payload.concepto = payload.concepto.replace(/undefined/g, facturaId ? facturaId.toString() : newPagoData.referencia || '').trim();
    }

    let pagoRegistrado: any = null;
    try {
      const res = await makeApiRequest(`${apiUrl}/pagos`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res && res.pago) {
        pagoRegistrado = res.pago;
      }
    } catch (err) {
      console.error('Error al registrar pago en backend:', err);
    }

    // Construir objeto local si el backend no respondió con el registro
    const clienteNombre = (clientes.find(c => c.id.toString() === (newPagoData.cliente_id || '').toString()) || { nombre: (proveedores.find(p => p.id.toString() === (newPagoData.proveedor_id || '').toString()) || { nombre: 'Sistema' }).nombre }).nombre;
    const nuevoPago = normalizePago(pagoRegistrado || {
      id: Date.now(),
      cliente: clienteNombre,
      cliente_id: newPagoData.cliente_id,
      proveedor_id: newPagoData.proveedor_id,
      tipo: newPagoData.tipo_pago,
      concepto: newPagoData.concepto,
      monto: Number(newPagoData.monto),
      fecha: newPagoData.fecha_pago ? new Date(newPagoData.fecha_pago) : new Date(),
      metodo: newPagoData.metodo_pago,
      referencia: newPagoData.referencia,
      observaciones: newPagoData.observaciones
    });

    // Actualizar estado local (persistido o simulación)
    setPagos(prev => [nuevoPago, ...prev]);
    writeLocalList('pagos_local', [nuevoPago, ...readLocalList('pagos_local')]);
    // Actualizar stats simples
    setStats(prev => ({ ...prev, pagosMes: (prev.pagosMes || 0) + (nuevoPago.monto || 0) }));

    // Refrescar control de cuentas y fuentes relacionadas.
    // IMPORTANTE: Si el backend respondió con el pago persistido, refrescar la lista desde API.
    // Si no (modo offline/dev), evitar llamar a fetchPagos() porque el fallback de fetchPagos
    // reemplaza el array con datos simulados y borra el nuevo pago local.
    try {
      if (pagoRegistrado) {
        await fetchPagos();
        fetchFacturas();
      } else {
        // Mantener el nuevo pago local y solo refrescar datos derivados
        fetchControlCuentas();
        fetchCuentasCorrientes();
        fetchStats();
        fetchCompras();
        fetchFacturas();
      }
    } catch (refreshErr) {
      console.warn('No se pudo refrescar datos desde API automáticamente:', refreshErr);
    }

    // Si el pago corresponde a una factura, actualizar estado local a pagada
    if (facturaId !== null && nuevoPago.tipo === 'ingreso') {
      setFacturas(prev => prev.map(f => (
        f.id === facturaId ? { ...f, estado: 'pagada' } : f
      )));
    }

    // Actualizar cuentas corrientes relacionadas (si existe una cuenta para el cliente)
    const clienteNombreCuenta = (clientes.find(c => c.id.toString() === newPagoData.cliente_id) || { nombre: nuevoPago.cliente }).nombre;
    setCuentasCorrientes(prev => {
      // Buscar por cliente exacto
      const idx = prev.findIndex(c => c.cliente === clienteNombreCuenta);
      const monto = Number(nuevoPago.monto || 0);

      if (idx === -1) {
        // Si no existe cuenta y es un ingreso, crear una nueva entrada en cuentas corrientes
        if (nuevoPago.tipo === 'ingreso') {
          const nueva = {
            id: Date.now(),
            cliente: clienteNombreCuenta,
            saldo: Number((0 - monto).toFixed(2)), // ingreso reduce deuda
            ultimo_pago: nuevoPago.fecha,
            estado: (0 - monto) <= 0 ? 'al_dia' : 'pendiente'
          };
          return [nueva, ...prev];
        }
        return prev;
      }

      const cuenta = { ...prev[idx] };
      // Si es ingreso del cliente, reducir saldo (paga deuda). Si es egreso, aumentar saldo.
      cuenta.saldo = Number((Number(cuenta.saldo || 0) - (nuevoPago.tipo === 'ingreso' ? monto : -monto)).toFixed(2));
      cuenta.ultimo_pago = nuevoPago.fecha;
      // Actualizar estado simple
      cuenta.estado = cuenta.saldo <= 0 ? 'al_dia' : 'pendiente';

      const copy = [...prev];
      copy[idx] = cuenta;
      return copy;
    });

    showToast('Pago registrado correctamente', 'success');
    setShowNewPagoModal(false);
  };

  // ========== FUNCIONES COMPRAS ==========
  
  const handleNewCompra = () => {
    setShowNewCompraModal(true);
  };

  const handleOpenProveedorFromCompra = () => {
    setReturnToCompraAfterProveedor(true);
    setShowNewCompraModal(false);
    setShowNewProveedorModal(true);
  };

  const handleCloseNewProveedorModal = () => {
    setShowNewProveedorModal(false);
    if (returnToCompraAfterProveedor) {
      setReturnToCompraAfterProveedor(false);
      setShowNewCompraModal(true);
    }
  };

  const handleViewCompra = (compra: any) => {
    setSelectedCompra(compra);
    setShowViewCompraModal(true);
  };

  const handleSaveCompra = async (e: any) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!newCompraData.proveedor_id) {
      showToast('Por favor seleccione un proveedor', 'error');
      return;
    }
    if (!newCompraData.numero_compra || newCompraData.numero_compra.trim() === '') {
      showToast('Por favor ingrese el número de compra', 'error');
      return;
    }
    if (!newCompraData.monto || Number(newCompraData.monto) <= 0) {
      showToast('El monto debe ser mayor a 0', 'error');
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      await makeApiRequest(`${apiUrl}/compras`, {
        method: 'POST',
        body: JSON.stringify({
          proveedor_id: Number(newCompraData.proveedor_id),
          numero_compra: newCompraData.numero_compra,
          descripcion: newCompraData.descripcion,
          total: Number(newCompraData.monto),
          fecha_vencimiento: newCompraData.fecha_vencimiento || null,
          estado: 'pendiente'
        })
      });

      await Promise.allSettled([fetchCompras(), fetchControlCuentas()]);

      showToast('Compra registrada correctamente', 'success');
      setShowNewCompraModal(false);
      setNewCompraData({
        proveedor_id: '',
        numero_compra: '',
        descripcion: '',
        monto: '',
        fecha_vencimiento: '',
        metodo_pago: 'efectivo',
        observaciones: ''
      });
    } catch (error) {
      console.error('Error al guardar compra:', error);
      showToast('No se pudo registrar la compra', 'error');
    }
  };

  const fetchCompras = async () => {
    if (!auth.token) {
      setCompras([]);
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const data = await makeApiRequest(`${apiUrl}/compras`);
      setCompras(data?.compras || []);
    } catch (error) {
      console.error('Error al cargar compras:', error);
      setCompras([]);
    }
  };

  const fetchControlCuentas = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const data = await makeApiRequest(`${apiUrl}/control-cuentas`);
      if (data && data.data) {
        setControlCuentas(data.data);
        setControlCuentasMeta({ source: 'api', updatedAt: new Date().toISOString() });
        return;
      }
    } catch (err) {
      console.error('Error fetching control-cuentas:', err);
    }

    // Fallback local si no hay backend/token
    setControlCuentas({
      cuentasPorCobrar: { facturasEmitidas: 0, totalFacturado: 0, yaRecibido: 0, aunPendiente: 0 },
      cuentasPorPagar: { comprasRegistradas: 0, totalComprado: 0, yaPagado: 0, aunDebe: 0 },
      balanceNeto: { value: 0, porCobrar: 0, porPagar: 0 },
      clientesPendientes: [],
      proveedoresPendientes: []
    });
    setControlCuentasMeta({ source: 'local', updatedAt: new Date().toISOString() });
  };

  const handleRefreshControlCuentas = async () => {
    await Promise.allSettled([
      fetchFacturas(),
      fetchPagos(),
      fetchCompras(),
      fetchControlCuentas()
    ]);
    showToast('Control de cuentas actualizado', 'info');
  };

  // ========== FUNCIONES CUENTAS ==========
  
  const fetchCuentasCorrientes = async () => {
    // Simular cuentas corrientes
    setCuentasCorrientes([
      { id: 1, cliente: 'Juan Pérez', saldo: 0, ultimo_pago: new Date(), estado: 'al_dia' },
      { id: 2, cliente: 'María García', saldo: 32000, ultimo_pago: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), estado: 'pendiente' }
    ]);
  };

  const handleViewClient = (cliente: any) => {
    setSelectedCliente(cliente);
    setShowViewModal(true);
  };

  const handleEditClient = (cliente: any) => {
    setSelectedCliente(cliente);
    setEditClientData({
      nombre: cliente.nombre || '',
      email: cliente.email || '',
      telefono: cliente.telefono || '',
      direccion: cliente.direccion || '',
      categoria: cliente.categoria || 'Particular',
      activo: Boolean(cliente.activo ?? true)
    });
    setShowEditModal(true);
  };


  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editClientData.nombre || !editClientData.email || !editClientData.telefono) {
      showToast('Por favor complete todos los campos obligatorios', 'error');
      return;
    }

    if (!selectedCliente?.id) {
      showToast('No se seleccionó un cliente válido', 'error');
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/clientes/${selectedCliente.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify(editClientData)
      });

      if (response.ok) {
        showToast('Cliente guardado exitosamente', 'success');
        setShowEditModal(false);
        setSelectedCliente(null);
        fetchClientes();
      } else {
        const errorData = await response.json();
        showToast(errorData.message || 'Error al actualizar cliente', 'error');
      }
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      showToast('Error de conexión al actualizar cliente', 'error');
    }
  };

  const handleSearchClient = async () => {
    if (searchTerm.length < 3) {
      showToast('Ingrese al menos 3 caracteres para buscar', 'info');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/clientes?search=${searchTerm}`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setClientes(data.clientes || []);
        showToast(`Se encontraron ${data.clientes?.length || 0} resultados`, 'info');
        closeModals();
      }
    } catch (error) {
      console.error('Error al buscar cliente:', error);
      showToast('Error de conexión al buscar', 'error');
    }
  };

  // ========== FUNCIONES PROVEEDORES ==========
  
  const handleNewProveedor = () => {
    setShowNewProveedorModal(true);
  };

  const handleViewProveedor = (proveedor: any) => {
    setSelectedProveedor(proveedor);
    setShowViewProveedorModal(true);
  };

  const handleEditProveedor = (proveedor: any) => {
    setSelectedProveedor(proveedor);
    setEditProveedorData({
      nombre: proveedor.nombre,
      email: proveedor.email,
      telefono: proveedor.telefono,
      direccion: proveedor.direccion || '',
      rubro: proveedor.rubro || '',
      cuit: proveedor.cuit || ''
    });
    setShowEditProveedorModal(true);
  };

  const handleDeleteProveedor = async (proveedorId: number) => {
    if (!confirm('¿Está seguro de eliminar este proveedor?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/proveedores/${proveedorId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      });

      if (response.ok) {
        showToast('✓ Proveedor eliminado exitosamente', 'success');
        fetchProveedores();
        fetchStats();
      } else {
        const error = await response.json();
        showToast(error.message || 'Error al eliminar proveedor', 'error');
      }
    } catch (error) {
      console.error('Error al eliminar proveedor:', error);
      showToast('Error de conexión al eliminar proveedor', 'error');
    }
  };

  const handleSaveProveedor = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newProveedorData.nombre || !newProveedorData.email || !newProveedorData.telefono) {
      showToast('Por favor complete todos los campos obligatorios', 'error');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/proveedores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify(newProveedorData)
      });

      if (response.ok) {
        const data = await response.json();
        setProveedores(prev => [...prev, data.proveedor]);
        if (returnToCompraAfterProveedor && data?.proveedor?.id) {
          setNewCompraData(prev => ({
            ...prev,
            proveedor_id: data.proveedor.id.toString()
          }));
        }
        showToast('✓ Proveedor guardado exitosamente', 'success');
        setShowNewProveedorModal(false);
        if (returnToCompraAfterProveedor) {
          setReturnToCompraAfterProveedor(false);
          setShowNewCompraModal(true);
        }
        fetchProveedores();
        fetchStats();
      } else {
        const error = await response.json();
        showToast(error.message || 'Error al guardar proveedor', 'error');
      }
    } catch (error) {
      console.error('Error al guardar proveedor:', error);
      showToast('Error de conexión al guardar proveedor', 'error');
    }
  };

  const handleUpdateProveedor = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editProveedorData.nombre || !editProveedorData.email || !editProveedorData.telefono) {
      showToast('Por favor complete todos los campos obligatorios', 'error');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/proveedores/${selectedProveedor.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify(editProveedorData)
      });

      if (response.ok) {
        showToast('✓ Proveedor actualizado exitosamente', 'success');
        closeModals();
        fetchProveedores();
        fetchStats();
      } else {
        const error = await response.json();
        showToast(error.message || 'Error al actualizar proveedor', 'error');
      }
    } catch (error) {
      console.error('Error al actualizar proveedor:', error);
      showToast('Error de conexión al actualizar proveedor', 'error');
    }
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newClientData.nombre || !newClientData.email || !newClientData.telefono) {
      showToast('Por favor complete todos los campos obligatorios', 'error');
      return;
    }

    try {
      const data = await makeApiRequest('http://localhost:5000/api/clientes', {
        method: 'POST',
        body: JSON.stringify(newClientData)
      });

      if (data && data.success) {
        // Agregar el nuevo cliente a la lista
        setClientes(prev => [...prev, data.cliente]);
        showToast('✓ Cliente guardado exitosamente', 'success');
        
        // Limpiar el formulario
        setNewClientData({
          nombre: '',
          email: '',
          telefono: '',
          direccion: '',
          categoria: 'Particular'
        });
        
        closeModals();
        // Recargar la lista de clientes
        fetchClientes();
        fetchStats();
      } else {
        showToast(data?.message || 'Error al guardar el cliente', 'error');
      }
    } catch (error) {
      console.error('Error al guardar cliente:', error);
      showToast('Error al guardar el cliente', 'error');
    }
  };

  const fetchClientes = async () => {
    const search = liveSearchTerm.trim();
    const hasSearch = search.length >= 2;
    const hasCategoria = Boolean(categoriaFilter);
    const hasEstado = Boolean(estadoClienteFilter);
    const hasFiltro = hasSearch || hasCategoria || hasEstado;

    if (!hasFiltro) {
      setClientes([]);
      setFilteredClientes([]);
      setClientesSinFiltro(true);
      return;
    }

    setClientesSinFiltro(false);

    try {
      const params = new URLSearchParams();
      if (hasSearch) params.set('q', search);
      if (hasCategoria) params.set('categoria', categoriaFilter);
      if (estadoClienteFilter) params.set('estado', estadoClienteFilter);

      const data = await makeApiRequest(`http://localhost:5000/api/clientes?${params.toString()}`);
      if (data && data.clientes) {
        setClientes(data.clientes);
        setFilteredClientes(data.clientes);
      } else {
        setClientes([]);
        setFilteredClientes([]);
      }
    } catch (error) {
      console.error('❌ Error al cargar clientes:', error);
      setClientes([]);
      setFilteredClientes([]);
    }
  };

  const fetchClientesParaPresupuesto = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const params = new URLSearchParams();
      params.set('estado', 'activo');
      params.set('limit', '200');
      const data = await makeApiRequest(`${apiUrl}/clientes?${params.toString()}`);
      if (data && data.clientes) {
        setClientesParaPresupuesto(data.clientes);
      } else {
        setClientesParaPresupuesto([]);
      }
    } catch (error) {
      console.error('❌ Error al cargar clientes para presupuesto:', error);
      setClientesParaPresupuesto([]);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClientes();
    }, 300);

    return () => clearTimeout(timer);
  }, [liveSearchTerm, categoriaFilter, estadoClienteFilter]);

  // Filtrar proveedores en tiempo real
  useEffect(() => {
    if (!liveSearchProveedores.trim()) {
      setFilteredProveedores(proveedores);
      return;
    }

    const searchLower = liveSearchProveedores.toLowerCase();
    const filtered = proveedores.filter(proveedor => 
      proveedor.nombre?.toLowerCase().includes(searchLower) ||
      proveedor.email?.toLowerCase().includes(searchLower) ||
      proveedor.telefono?.toLowerCase().includes(searchLower) ||
      proveedor.rubro?.toLowerCase().includes(searchLower) ||
      proveedor.cuit?.toLowerCase().includes(searchLower)
    );
    setFilteredProveedores(filtered);
  }, [liveSearchProveedores, proveedores]);

  const fetchProveedores = async () => {
    // Si no hay token, usar datos de ejemplo para desarrollo
    if (!auth.token) {
      const fallbackClientes = [
        { id: 1, nombre: 'Juan Pérez', email: 'juan@example.com', telefono: '12345678' },
        { id: 2, nombre: 'María García', email: 'maria@example.com', telefono: '87654321' }
      ];
      setClientes(fallbackClientes);
      setFilteredClientes(fallbackClientes);
      const fallbackProveedores = [
        { id: 1, nombre: 'Aceros América', email: 'aceros@example.com', telefono: '87654321', rubro: 'Materiales' }
      ];
      setProveedores(fallbackProveedores);
      setFilteredProveedores(fallbackProveedores);
      syncProveedoresCache(fallbackProveedores);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/proveedores', {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const listado = data.proveedores || [];
        setProveedores(listado);
        setFilteredProveedores(listado);
        syncProveedoresCache(listado);
      }
    } catch (error) {
      console.error('Error al cargar proveedores:', error);
    }
  };

  const fetchStats = async () => {
    // Si no hay token, usar valores de ejemplo para desarrollo
    if (!auth.token) {
      setStats({
        totalClientes: 0,
        totalProveedores: 0,
        totalPresupuestos: 0,
        totalFacturas: 1,
        pagosMes: 45000,
        pendiente: 0
      });
      return;
    }

    try {
      // Cargar clientes
      const clientesRes = await fetch('http://localhost:5000/api/clientes', {
        headers: { 'Authorization': `Bearer ${auth.token}` }
      });
      const clientesData = await clientesRes.json();

      // Cargar presupuestos
      const presupuestosRes = await fetch('http://localhost:5000/api/presupuestos', {
        headers: { 'Authorization': `Bearer ${auth.token}` }
      });
      const presupuestosData = await presupuestosRes.json();

      // Cargar proveedores
      const proveedoresRes = await fetch('http://localhost:5000/api/proveedores', {
        headers: { 'Authorization': `Bearer ${auth.token}` }
      });
      const proveedoresData = await proveedoresRes.json();

      setStats({
        totalClientes: clientesData.clientes?.length || 0,
        totalProveedores: proveedoresData.proveedores?.length || 0,
        totalPresupuestos: presupuestosData.presupuestos?.length || 0,
        totalFacturas: 89, // Este valor puede venir de otra API si existe
        pagosMes: 45000, // Este valor puede venir de otra API si existe
        pendiente: 8200 // Este valor puede venir de otra API si existe
      });
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  useEffect(() => {
    // Cargar datos inicialmente (usar fallbacks cuando no hay backend/token)
    fetchPresupuestos();
    fetchClientes();
    fetchProveedores();
    fetchFacturas();
    fetchPagos();
    fetchCompras();
    fetchCuentasCorrientes();
    fetchControlCuentas();
    fetchStats();

    // Auto-actualizar estadísticas cada 30 segundos
    const interval = setInterval(() => {
      fetchStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [auth.token]);

  useEffect(() => {
    fetchPagos();
  }, [pagoFilters, auth.token]);

  useEffect(() => {
    if (activeSection !== 'cuentas') return;
    handleRefreshControlCuentas();
  }, [activeSection]);

  const fetchPresupuestos = async () => {
    if (!auth.token) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      
      // Intentar cargar primero desde presupuestos detallados
      const responseDetallados = await fetch(`${apiUrl}/presupuestos-detallados`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (responseDetallados.ok) {
        const dataDetallados = await responseDetallados.json();
        setPresupuestos(dataDetallados.presupuestos || []);
        setPresupuestosArchivadosCount(Number(dataDetallados.archivados || 0));
      } else {
        // Fallback a presupuestos simples
        const response = await fetch(`${apiUrl}/presupuestos`, {
          headers: {
            'Authorization': `Bearer ${auth.token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setPresupuestos(data.presupuestos || []);
          setPresupuestosArchivadosCount(0);
        } else {
          console.error('Error al cargar presupuestos:', response.statusText);
        }
      }
    } catch (error) {
      console.error('Error al cargar presupuestos:', error);
      setPresupuestosArchivadosCount(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchArchivedPresupuestos = async () => {
    if (!auth.token) return;

    setLoadingArchivedPresupuestos(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/presupuestos-detallados?scope=archivados`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setArchivedPresupuestos(data.presupuestos || []);
      } else {
        setArchivedPresupuestos([]);
      }
    } catch (error) {
      console.error('Error al cargar presupuestos archivados:', error);
      setArchivedPresupuestos([]);
    } finally {
      setLoadingArchivedPresupuestos(false);
    }
  };



  const secciones = [
    {
      id: 'clientes',
      titulo: 'Registro de Clientes',
      icon: Users,
      descripcion: 'Gestionar base de datos de clientes'
    },
    {
      id: 'presupuestos',
      titulo: 'Emisión de Presupuestos',
      icon: FileText,
      descripcion: 'Crear y gestionar presupuestos'
    },
    {
      id: 'facturas',
      titulo: 'Emisión de Facturas',
      icon: Receipt,
      descripcion: 'Generar y controlar facturas'
    },
    {
      id: 'pagos',
      titulo: 'Registro de Pagos',
      icon: CreditCard,
      descripcion: 'Control de pagos y cobranzas'
    },
    {
      id: 'cuentas',
      titulo: 'Control de Cuentas',
      icon: DollarSign,
      descripcion: 'Estado de cuentas corrientes'
    }
  ];

  if (auth.isLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

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
                  <ClipboardList className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Gestión Administrativa</h1>
                  <p className="text-sm text-gray-600">Control integral de administración y finanzas</p>
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
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-600 hover:text-blue-600 hover:bg-gray-50'
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
        {activeSection === 'clientes' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Registro de Clientes</h2>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={handleNewClient}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nuevo Cliente</span>
                  </button>
                </div>
              </div>
              
              {/* Barra de búsqueda en tiempo real */}
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={liveSearchTerm}
                  onChange={(e) => setLiveSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="🔍 Buscar por nombre, email, teléfono o dirección..."
                />
                {liveSearchTerm && (
                  <button
                    onClick={() => setLiveSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filtro por categoría */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filtrar por Categoría
                </label>
                <select
                  value={categoriaFilter}
                  onChange={(e) => setCategoriaFilter(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas las categorías</option>
                  <option value="Particular">Particular</option>
                  <option value="Empresa">Empresa</option>
                  <option value="Constructor/Obra">Constructor/Obra</option>
                  <option value="Cliente Frecuente">Cliente Frecuente</option>
                </select>
              </div>

              <div className="mb-4 grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                  <select
                    value={estadoClienteFilter}
                    onChange={(e) => setEstadoClienteFilter(e.target.value as 'activo' | 'inactivo')}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="activo">Activos</option>
                    <option value="inactivo">Inactivos</option>
                  </select>
                </div>
              </div>
              
              {/* Contador de resultados */}
              {clientesSinFiltro && (
                <div className="mt-2 text-sm text-orange-600">
                  Ingresa un filtro para listar clientes.
                </div>
              )}

              {liveSearchTerm && !clientesSinFiltro && (
                <div className="mt-2 text-sm text-gray-600">
                  {filteredClientes.length === 0 ? (
                    <span className="text-red-600">No se encontraron resultados</span>
                  ) : (
                    <span className="text-blue-600">
                      Se encontraron {filteredClientes.length} {filteredClientes.length === 1 ? 'cliente' : 'clientes'}
                    </span>
                  )}
                </div>
              )}
            </div>

            {clientes.length === 0 ? (
              <div className="p-6">
                {clientesSinFiltro ? (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
                    <Users className="w-12 h-12 text-orange-600 mx-auto mb-3" />
                    <h3 className="font-semibold text-orange-900 mb-2">Aplicar filtros</h3>
                    <p className="text-orange-700 text-sm">
                      Para evitar listados muy largos, aplica un filtro por nombre, categoría, estado o fecha.
                    </p>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                    <Users className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                    <h3 className="font-semibold text-blue-900 mb-2">Sin clientes registrados</h3>
                    <p className="text-blue-700 text-sm mb-4">
                      Cargá el primer cliente para comenzar a operar en esta sección.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dirección</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Registro</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredClientes.map((cliente) => (
                      <tr key={cliente.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Users className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="ml-3">
                              <div className="font-medium text-gray-900">{cliente.nombre}</div>
                              <div className="text-sm text-gray-500">ID: {cliente.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{cliente.email}</div>
                          <div className="text-sm text-gray-500">{cliente.telefono}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {cliente.direccion || 'No especificada'}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {cliente.categoria || 'Particular'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(cliente.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => handleViewClient(cliente)}
                              className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                              title="Ver detalles"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleEditClient(cliente)}
                              className="p-1 text-green-600 hover:bg-green-100 rounded"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeSection === 'presupuestos' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Emisión de Presupuestos</h2>
                <button
                  onClick={handleNewPresupuesto}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo Presupuesto</span>
                </button>
              </div>
            </div>
            
            {presupuestos.length === 0 ? (
              <div className="p-6">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 text-center">
                  <FileText className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay presupuestos</h3>
                  <p className="text-gray-600 mb-4">
                    Aún no se han creado presupuestos. Comience creando su primer presupuesto.
                  </p>
                  <button
                    onClick={handleNewPresupuesto}
                    className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 inline-flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Crear Primer Presupuesto</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="p-6 border-b border-gray-200 bg-white space-y-4">
                  {presupuestosResumen.vencidos > 0 && (
                    <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm font-medium">
                      ⚠️ Tienes {presupuestosResumen.vencidos} {presupuestosResumen.vencidos === 1 ? 'presupuesto vencido' : 'presupuestos vencidos'}.
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="border border-gray-200 rounded-lg p-3">
                      <p className="text-xs text-gray-500 uppercase">Total de presupuestos</p>
                      <p className="text-2xl font-semibold text-gray-900">{presupuestosResumen.total}</p>
                    </div>
                    <div className="border border-yellow-200 rounded-lg p-3 bg-yellow-50">
                      <p className="text-xs text-yellow-700 uppercase">Pendientes</p>
                      <p className="text-2xl font-semibold text-yellow-800">{presupuestosResumen.pendientes}</p>
                    </div>
                    <div className="border border-green-200 rounded-lg p-3 bg-green-50">
                      <p className="text-xs text-green-700 uppercase">Facturados</p>
                      <p className="text-2xl font-semibold text-green-800">{presupuestosResumen.facturados}</p>
                    </div>
                    <div className="border border-blue-200 rounded-lg p-3 bg-blue-50">
                      <p className="text-xs text-blue-700 uppercase">Reseñados</p>
                      <p className="text-2xl font-semibold text-blue-800">{presupuestosResumen.reseñados}</p>
                    </div>
                    <div className="border border-red-200 rounded-lg p-3 bg-red-50">
                      <p className="text-xs text-red-700 uppercase">Vencidos</p>
                      <p className="text-2xl font-semibold text-red-800">{presupuestosResumen.vencidos}</p>
                    </div>
                  </div>


                </div>

                <div className="p-6 border-b border-gray-200 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
                      <input
                        type="text"
                        value={presupuestoSearchTerm}
                        onChange={(e) => setPresupuestoSearchTerm(e.target.value)}
                        placeholder="Nombre, email o teléfono"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                      <select
                        value={presupuestoEstadoFilter}
                        onChange={(e) => {
                          const val = e.target.value as '' | 'PENDIENTE' | 'RESEÑADO' | 'FACTURADO' | 'VENCIDO' | 'ARCHIVADO';
                          setPresupuestoEstadoFilter(val);
                          if (val === 'ARCHIVADO') fetchArchivedPresupuestos();
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                      >
                        <option value="">Más recientes</option>
                        <option value="PENDIENTE">Pendientes</option>
                        <option value="VENCIDO">Vencidos</option>
                        <option value="FACTURADO">Facturados</option>
                        <option value="RESEÑADO">Reseñados</option>
                        <option value="ARCHIVADO">Archivados</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
                      <input
                        type="date"
                        value={presupuestoFechaDesde}
                        onChange={(e) => setPresupuestoFechaDesde(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
                      <input
                        type="date"
                        value={presupuestoFechaHasta}
                        onChange={(e) => setPresupuestoFechaHasta(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                      />
                    </div>
                  </div>
                </div>

                {presupuestoEstadoFilter === 'ARCHIVADO' && loadingArchivedPresupuestos && (
                  <div className="p-6 text-sm text-gray-500">Cargando archivados...</div>
                )}

                {filteredPresupuestos.length === 0 ? (
                  <div className="p-6">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-sm text-gray-600">
                      No hay presupuestos para los filtros seleccionados.
                    </div>
                  </div>
                ) : (() => {
                  const hayFiltros = presupuestoEstadoFilter !== '' || presupuestoFechaDesde !== '' || presupuestoFechaHasta !== '' || presupuestoSearchTerm.trim() !== '';
                  const visibles = (hayFiltros || presupuestoShowAll) ? filteredPresupuestos : filteredPresupuestos.slice(0, 5);
                  const hayMas = !hayFiltros && !presupuestoShowAll && filteredPresupuestos.length > 5;
                  return (
                  <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cliente
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Descripción
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Vencimiento
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Estado
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {visibles.map((presupuesto) => (
                          <tr
                            key={presupuesto.id}
                            className={`hover:bg-gray-50 cursor-pointer ${normalizePresupuestoEstado(presupuesto.estado) === 'VENCIDO' ? 'bg-red-50' : ''}`}
                            onClick={() => handleViewPresupuesto(presupuesto)}
                          >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {presupuesto.nombreCliente || presupuesto.cliente_nombre}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {presupuesto.tipoTrabajo || presupuesto.tipo_trabajo || presupuesto.descripcion}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            ${presupuesto.total ? presupuesto.total.toLocaleString() : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {(() => {
                              const vencimientoInfo = getPresupuestoVencimientoInfo(presupuesto);
                              return vencimientoInfo.date
                                ? vencimientoInfo.date.toLocaleDateString('es-AR')
                                : 'Sin fecha';
                            })()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(() => {
                            const estado = normalizePresupuestoEstado(presupuesto.estado);
                            return (
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPresupuestoEstadoClass(estado)}`}>
                                {estado}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {(() => {
                            const estadoActual = normalizePresupuestoEstado(presupuesto.estado);
                            const selectClass = estadoActual === 'FACTURADO'
                              ? 'bg-green-50 border-green-200 text-green-800'
                              : estadoActual === 'RESEÑADO'
                                ? 'bg-blue-50 border-blue-200 text-blue-800'
                                : estadoActual === 'VENCIDO'
                                  ? 'bg-red-50 border-red-200 text-red-800'
                                  : 'bg-yellow-50 border-yellow-200 text-yellow-800';

                            return (
                          <select
                            value={estadoActual as PresupuestoEstado}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleQuickPresupuestoEstadoChange(presupuesto, e.target.value as PresupuestoEstado);
                            }}
                            className={`mr-3 px-2 py-1 border rounded text-xs font-semibold uppercase ${selectClass}`}
                            title="Cambiar estado"
                          >
                            <option value="PENDIENTE">PENDIENTE</option>
                            <option value="RESEÑADO">RESEÑADO</option>
                            <option value="FACTURADO">FACTURADO</option>
                            <option value="VENCIDO">VENCIDO</option>
                          </select>
                            );
                          })()}
                          <div className="inline-flex items-center gap-1.5 align-middle">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewPresupuesto(presupuesto);
                            }}
                            className="p-1.5 rounded border border-transparent hover:border-purple-200 text-purple-600 hover:text-purple-900"
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintPresupuesto(presupuesto);
                            }}
                            className="p-1.5 rounded border border-transparent hover:border-blue-200 text-blue-600 hover:text-blue-900"
                            title="Imprimir presupuesto"
                          >
                            📄
                          </button>
                          {(['PENDIENTE', 'RESEÑADO'].includes(normalizePresupuestoEstado(presupuesto.estado))) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConvertToFactura(presupuesto);
                              }}
                              className="p-1.5 rounded border border-transparent hover:border-green-200 text-green-600 hover:text-green-900"
                              title="Convertir a factura"
                            >
                              <Receipt className="w-4 h-4" />
                            </button>
                          )}
                          </div>
                        </td>
                      </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  </>
                );
                })()}
              </div>
            )}
          </div>
        )}

        {activeSection === 'facturas' && (() => {
          // ── helpers ──────────────────────────────────────────────────────────
          const resetFacturaFilters = () => {
            setFacturaSearch('');
            setFacturaEstadoFilter('relevantes');
            setFacturaFechaDesde('');
            setFacturaFechaHasta('');
            setFacturaMontoMin('');
            setFacturaMontoMax('');
            setFacturaQuickDate(null);
            setFacturaSort(null);
            setFacturaPage(1);
          };

          const toLocalStr = (d: Date) =>
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

          const setQuickDate = (range: 'hoy' | 'esta-semana' | 'este-mes' | 'mes-pasado' | 'este-año') => {
            if (facturaQuickDate === range) {
              setFacturaQuickDate(null);
              setFacturaFechaDesde('');
              setFacturaFechaHasta('');
              setFacturaPage(1);
              return;
            }
            setFacturaQuickDate(range);
            const hoy = new Date();
            if (range === 'hoy') {
              const hoyStr = toLocalStr(hoy);
              setFacturaFechaDesde(hoyStr);
              setFacturaFechaHasta(hoyStr);
            } else if (range === 'esta-semana') {
              const dow = hoy.getDay(); // 0=dom
              const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - ((dow + 6) % 7));
              const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6);
              setFacturaFechaDesde(toLocalStr(lunes));
              setFacturaFechaHasta(toLocalStr(domingo));
            } else if (range === 'este-mes') {
              setFacturaFechaDesde(toLocalStr(new Date(hoy.getFullYear(), hoy.getMonth(), 1)));
              setFacturaFechaHasta(toLocalStr(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)));
            } else if (range === 'mes-pasado') {
              setFacturaFechaDesde(toLocalStr(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)));
              setFacturaFechaHasta(toLocalStr(new Date(hoy.getFullYear(), hoy.getMonth(), 0)));
            } else {
              setFacturaFechaDesde(`${hoy.getFullYear()}-01-01`);
              setFacturaFechaHasta(`${hoy.getFullYear()}-12-31`);
            }
            setFacturaPage(1);
          };

          const toggleSort = (col: 'cliente' | 'monto' | 'fecha') => {
            setFacturaSort(prev =>
              prev?.col === col
                ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                : { col, dir: 'asc' }
            );
            setFacturaPage(1);
          };

          const sortIcon = (col: 'cliente' | 'monto' | 'fecha') =>
            facturaSort?.col !== col ? (
              <span className="ml-1 text-gray-300">↕</span>
            ) : (
              <span className="ml-1 text-orange-500">{facturaSort.dir === 'asc' ? '↑' : '↓'}</span>
            );

          // ── autocomplete suggestions ──────────────────────────────────────────
          const suggestions = facturaShowSuggestions && facturaSearch.length > 0
            ? facturas
                .map(f => getFacturaCliente(f))
                .filter((n, i, arr) => n !== 'Sin cliente' && arr.indexOf(n) === i)
                .filter(n => n.toLowerCase().includes(facturaSearch.toLowerCase()))
                .slice(0, 6)
            : [];

          // ── archiving helpers ─────────────────────────────────────────────────
          const _hoy = new Date();
          const _primerDiaMes = new Date(_hoy.getFullYear(), _hoy.getMonth(), 1);
          const _ultimoDiaMes = new Date(_hoy.getFullYear(), _hoy.getMonth() + 1, 0, 23, 59, 59);
          const _tresM = new Date(_hoy); _tresM.setMonth(_tresM.getMonth() - 3);

          const esRelevante = (f: any) => {
            if (f.estado === 'pendiente' || f.estado === 'vencida') return true;
            if (f.estado === 'pagada') {
              const d = parseDateValue(f.created_at);
              return !!d && d >= _primerDiaMes && d <= _ultimoDiaMes;
            }
            return false;
          };
          const esArchivada = (f: any) => {
            if (f.estado !== 'pagada') return false;
            const d = parseDateValue(f.created_at);
            return !!d && d < _tresM;
          };

          // ── KPI calculations ──────────────────────────────────────────────────
          const kpiPendientes = facturas.filter(f => f.estado === 'pendiente').length;
          const kpiVencidas   = facturas.filter(f => f.estado === 'vencida').length;
          const kpiFacturacionMes = facturas
            .filter(f => { const d = parseDateValue(f.created_at); return !!d && d >= _primerDiaMes && d <= _ultimoDiaMes; })
            .reduce((s, f) => s + (f.total ?? 0), 0);
          const kpiCobradoMes = facturas
            .filter(f => { const d = parseDateValue(f.created_at); return f.estado === 'pagada' && !!d && d >= _primerDiaMes && d <= _ultimoDiaMes; })
            .reduce((s, f) => s + (f.total ?? 0), 0);

          // ── filtering ─────────────────────────────────────────────────────────
          let filtradas = facturas.filter(f => {
            const q = facturaSearch.toLowerCase();
            const matchSearch = q === ''
              || getFacturaCliente(f).toLowerCase().includes(q)
              || getFacturaNumero(f).toLowerCase().includes(q)
              || (f.total ?? 0).toString().includes(q)
              || (f.created_at ? formatDate(f.created_at).toLowerCase().includes(q) : false);

            let matchEstado = true;
            if (facturaEstadoFilter === 'relevantes') matchEstado = esRelevante(f);
            else if (facturaEstadoFilter === 'archivadas') matchEstado = esArchivada(f);
            else if (facturaEstadoFilter !== 'todas') matchEstado = f.estado === facturaEstadoFilter;

            let matchFecha = true;
            if (f.created_at && (facturaFechaDesde || facturaFechaHasta)) {
              const d = parseDateValue(f.created_at);
              if (!d) { matchFecha = false; } else {
                const fechaStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                if (facturaFechaDesde) matchFecha = matchFecha && fechaStr >= facturaFechaDesde;
                if (facturaFechaHasta) matchFecha = matchFecha && fechaStr <= facturaFechaHasta;
              }
            }

            const montoVal = f.total ?? 0;
            const matchMonto =
              (facturaMontoMin === '' || montoVal >= Number(facturaMontoMin)) &&
              (facturaMontoMax === '' || montoVal <= Number(facturaMontoMax));

            return matchSearch && matchEstado && matchFecha && matchMonto;
          });

          // ── sorting ───────────────────────────────────────────────────────────
          if (facturaSort) {
            filtradas = [...filtradas].sort((a, b) => {
              let va: any, vb: any;
              if (facturaSort.col === 'cliente') {
                va = getFacturaCliente(a).toLowerCase();
                vb = getFacturaCliente(b).toLowerCase();
              } else if (facturaSort.col === 'monto') {
                va = a.total ?? 0;
                vb = b.total ?? 0;
              } else {
                va = a.created_at ? new Date(a.created_at).getTime() : 0;
                vb = b.created_at ? new Date(b.created_at).getTime() : 0;
              }
              if (va < vb) return facturaSort.dir === 'asc' ? -1 : 1;
              if (va > vb) return facturaSort.dir === 'asc' ? 1 : -1;
              return 0;
            });
          } else {
            // Default priority: vencidas → pendientes → pagadas recientes
            const prio = (f: any) => f.estado === 'vencida' ? 0 : f.estado === 'pendiente' ? 1 : 2;
            filtradas = [...filtradas].sort((a, b) => {
              const pd = prio(a) - prio(b);
              if (pd !== 0) return pd;
              const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
              const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
              return tb - ta;
            });
          }

          // ── pagination ────────────────────────────────────────────────────────
          const totalPages = Math.max(1, Math.ceil(filtradas.length / facturaPageSize));
          const curPage = Math.min(facturaPage, totalPages);
          const paginadas = filtradas.slice((curPage - 1) * facturaPageSize, curPage * facturaPageSize);

          const hasCuit = facturas.some(f => f.cuit || f.cliente_cuit);
          const hasMetodoPago = facturas.some(f => f.metodo_pago);
          const hasVendedor = facturas.some(f => f.vendedor || f.usuario_nombre);
          const hayFiltros = facturaSearch || facturaEstadoFilter !== 'relevantes' || facturaFechaDesde || facturaFechaHasta || facturaMontoMin || facturaMontoMax || facturaQuickDate;

          return (
            <div className="bg-white rounded-lg shadow">

              {/* ── Header ─────────────────────────────────────────────────────── */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Emisión de Facturas</h2>
                  <button
                    onClick={handleNewFactura}
                    className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nueva Factura</span>
                  </button>
                </div>
              </div>

              {/* ── KPI cards ──────────────────────────────────────────────────── */}
              <div className="px-6 py-4 border-b border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
                  <p className="text-xs text-yellow-700 uppercase font-medium mb-1">Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-800">{kpiPendientes}</p>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-xs text-red-700 uppercase font-medium mb-1">Vencidas</p>
                  <p className="text-2xl font-bold text-red-800">{kpiVencidas}</p>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                  <p className="text-xs text-blue-700 uppercase font-medium mb-1">Facturado este mes</p>
                  <p className="text-lg font-bold text-blue-800 tabular-nums">{formatCurrencyARS(kpiFacturacionMes)}</p>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                  <p className="text-xs text-green-700 uppercase font-medium mb-1">Cobrado este mes</p>
                  <p className="text-lg font-bold text-green-800 tabular-nums">{formatCurrencyARS(kpiCobradoMes)}</p>
                </div>
              </div>

              {/* ── Filters bar ────────────────────────────────────────────────── */}
              <div className="p-4 border-b border-gray-200 bg-gray-50 space-y-3">

                {/* Global search with autocomplete */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={facturaSearch}
                    onChange={e => { setFacturaSearch(e.target.value); setFacturaPage(1); setFacturaShowSuggestions(true); }}
                    onFocus={() => setFacturaShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setFacturaShowSuggestions(false), 150)}
                    placeholder="Buscar por cliente, número de factura, monto o fecha..."
                    className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                  />
                  {facturaSearch && (
                    <button
                      onClick={() => { setFacturaSearch(''); setFacturaPage(1); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-base leading-none"
                    >✕</button>
                  )}
                  {suggestions.length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                      {suggestions.map(s => (
                        <button
                          key={s}
                          onMouseDown={() => { setFacturaSearch(s); setFacturaShowSuggestions(false); setFacturaPage(1); }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-orange-50 hover:text-orange-700"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Estado */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-16 shrink-0">Estado</span>
                  {([
                    { val: 'relevantes', label: 'Relevantes', active: 'bg-orange-600 text-white border-orange-600' },
                    { val: 'pendiente',  label: 'Pendientes', active: 'bg-yellow-500 text-white border-yellow-500' },
                    { val: 'vencida',   label: 'Vencidas',   active: 'bg-red-500 text-white border-red-500' },
                    { val: 'pagada',    label: 'Pagadas',    active: 'bg-green-600 text-white border-green-600' },
                  ] as const).map(({ val, label, active }) => (
                    <button
                      key={val}
                      onClick={() => { setFacturaEstadoFilter(val); setFacturaPage(1); }}
                      className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                        facturaEstadoFilter === val ? active : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  {hayFiltros && (
                    <button
                      onClick={resetFacturaFilters}
                      className="ml-auto px-3 py-1 text-xs font-medium text-red-600 border border-red-200 rounded-full hover:bg-red-50 transition-colors"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>

                {/* Periodo */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-16 shrink-0">Periodo</span>
                  {(['hoy', 'esta-semana', 'este-mes', 'mes-pasado', 'este-año'] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setQuickDate(r)}
                      className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                        facturaQuickDate === r
                          ? 'bg-orange-600 text-white border-orange-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700'
                      }`}
                    >
                      {r === 'hoy' ? 'Hoy' : r === 'esta-semana' ? 'Esta semana' : r === 'este-mes' ? 'Este mes' : r === 'mes-pasado' ? 'Mes pasado' : 'Este año'}
                    </button>
                  ))}
                </div>


              </div>

              {/* ── Empty states ───────────────────────────────────────────────── */}
              {facturas.length === 0 ? (
                <div className="p-6">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
                    <Receipt className="w-12 h-12 text-orange-600 mx-auto mb-3" />
                    <h3 className="font-semibold text-orange-900 mb-2">Sin facturas registradas</h3>
                    <p className="text-orange-700 text-sm">Cuando se generen facturas, aparecerán aquí con su estado y acciones principales.</p>
                  </div>
                </div>
              ) : filtradas.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-gray-400 text-sm mb-3">No se encontraron facturas con los filtros aplicados.</p>
                  <button onClick={resetFacturaFilters} className="text-sm text-orange-600 underline">Limpiar filtros</button>
                </div>
              ) : (
                <>
                  {/* ── Table ──────────────────────────────────────────────────── */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">N° Factura</th>
                          <th
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-orange-600"
                            onClick={() => toggleSort('cliente')}
                          >
                            Cliente{sortIcon('cliente')}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Tipo</th>
                          <th
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-orange-600"
                            onClick={() => toggleSort('monto')}
                          >
                            Monto{sortIcon('monto')}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</th>
                          <th
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-orange-600"
                            onClick={() => toggleSort('fecha')}
                          >
                            Fecha{sortIcon('fecha')}
                          </th>
                          {hasCuit && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">CUIT</th>}
                          {hasMetodoPago && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Método pago</th>}
                          {hasVendedor && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Vendedor</th>}
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {paginadas.map(factura => (
                          <tr key={factura.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <span className="font-medium text-orange-600">{getFacturaNumero(factura)}</span>
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900">{getFacturaCliente(factura)}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">Tipo A</span>
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                              ${(factura.total ?? 0).toLocaleString('es-AR')}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                factura.estado === 'pagada'    ? 'bg-green-100 text-green-800' :
                                factura.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                                                                 'bg-red-100 text-red-800'
                              }`}>
                                {factura.estado === 'pagada' ? 'PAGADA' : factura.estado === 'pendiente' ? 'PENDIENTE' : 'VENCIDA'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {factura.created_at ? formatDate(factura.created_at) : '—'}
                            </td>
                            {hasCuit && (
                              <td className="px-4 py-3 text-sm text-gray-500">{factura.cuit || factura.cliente_cuit || '—'}</td>
                            )}
                            {hasMetodoPago && (
                              <td className="px-4 py-3 text-sm text-gray-500 capitalize">{factura.metodo_pago || '—'}</td>
                            )}
                            {hasVendedor && (
                              <td className="px-4 py-3 text-sm text-gray-500">{factura.vendedor || factura.usuario_nombre || '—'}</td>
                            )}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleViewFacturaAction(factura)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                  title="Ver factura"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handlePrintPDF(factura)}
                                  className="p-1.5 text-orange-600 hover:bg-orange-50 rounded"
                                  title="Imprimir PDF"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleRegisterPayment(factura)}
                                  className={`p-1.5 rounded ${factura.estado === 'pagada' ? 'text-green-600 hover:bg-green-50' : 'text-purple-600 hover:bg-purple-50'}`}
                                  title={factura.estado === 'pagada' ? 'Ver método de pago' : 'Registrar pago'}
                                >
                                  <CreditCard className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* ── Footer: count + page-size + pagination ──────────────────── */}
                  <div className="px-6 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-2 bg-gray-50">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">
                        {filtradas.length === facturas.length
                          ? `${facturas.length} factura${facturas.length !== 1 ? 's' : ''} en total`
                          : `${filtradas.length} de ${facturas.length} facturas`}
                        {filtradas.length > 0 && ` · mostrando ${(curPage - 1) * facturaPageSize + 1}–${Math.min(curPage * facturaPageSize, filtradas.length)}`}
                      </span>
                      <select
                        value={facturaPageSize}
                        onChange={e => { setFacturaPageSize(Number(e.target.value)); setFacturaPage(1); }}
                        className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-600"
                      >
                        <option value={10}>10 / pág</option>
                        <option value={25}>25 / pág</option>
                        <option value={50}>50 / pág</option>
                      </select>
                    </div>
                    {totalPages > 1 && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => setFacturaPage(1)} disabled={curPage === 1} className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-white">«</button>
                        <button onClick={() => setFacturaPage(p => Math.max(1, p - 1))} disabled={curPage === 1} className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-white">‹</button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(p => p === 1 || p === totalPages || Math.abs(p - curPage) <= 1)
                          .reduce<(number | string)[]>((acc, p, i, arr) => {
                            if (i > 0 && typeof arr[i - 1] === 'number' && (p as number) - (arr[i - 1] as number) > 1) acc.push('…');
                            acc.push(p); return acc;
                          }, [])
                          .map((p, i) =>
                            typeof p === 'string'
                              ? <span key={`e${i}`} className="px-1 text-xs text-gray-400">{p}</span>
                              : <button key={p} onClick={() => setFacturaPage(p as number)}
                                  className={`px-2.5 py-1 text-xs rounded border ${curPage === p ? 'bg-orange-600 text-white border-orange-600' : 'border-gray-300 hover:bg-white'}`}
                                >{p}</button>
                          )}
                        <button onClick={() => setFacturaPage(p => Math.min(totalPages, p + 1))} disabled={curPage === totalPages} className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-white">›</button>
                        <button onClick={() => setFacturaPage(totalPages)} disabled={curPage === totalPages} className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-white">»</button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })()}


        {activeSection === 'pagos' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Registro de Pagos</h2>
                <button 
                  onClick={() => setShowNewPagoModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo Pago</span>
                </button>
              </div>
            </div>
            
            <div className="p-6 border-b border-gray-200 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                  <select
                    value={pagoFilters.tipo}
                    onChange={(e) => setPagoFilters(prev => ({ ...prev, tipo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  >
                    <option value="">Todos</option>
                    <option value="ingreso">Ingreso</option>
                    <option value="egreso">Egreso</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Metodo</label>
                  <select
                    value={pagoFilters.metodo}
                    onChange={(e) => setPagoFilters(prev => ({ ...prev, metodo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  >
                    <option value="">Todos</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
                  <input
                    type="date"
                    value={pagoFilters.desde}
                    onChange={(e) => setPagoFilters(prev => ({ ...prev, desde: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
                  <input
                    type="date"
                    value={pagoFilters.hasta}
                    onChange={(e) => setPagoFilters(prev => ({ ...prev, hasta: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Estado cliente</label>
                  <select
                    value={pagoFilters.estadoCliente}
                    onChange={(e) => setPagoFilters(prev => ({ ...prev, estadoCliente: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  >
                    <option value="">Todos</option>
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="RESEÑADO">RESEÑADO</option>
                    <option value="FACTURADO">FACTURADO</option>
                    <option value="VENCIDO">VENCIDO</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Resumen de pagos */}
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              {(() => {
                // Obtener mes y año actual
                const hoy = new Date();
                const mesActual = hoy.getMonth();
                const anioActual = hoy.getFullYear();
                
                // Calcular ingresos del mes
                const ingresosDelMes = pagos
                  .filter(p => {
                    const fechaPago = p.fecha ? new Date(p.fecha) : new Date();
                    return p.tipo === 'ingreso' && 
                           fechaPago.getMonth() === mesActual && 
                           fechaPago.getFullYear() === anioActual;
                  })
                  .reduce((sum, p) => sum + (p.monto || 0), 0);
                
                // Calcular egresos del mes
                const egresosDelMes = pagos
                  .filter(p => {
                    const fechaPago = p.fecha ? new Date(p.fecha) : new Date();
                    return p.tipo === 'egreso' && 
                           fechaPago.getMonth() === mesActual && 
                           fechaPago.getFullYear() === anioActual;
                  })
                  .reduce((sum, p) => sum + (p.monto || 0), 0);
                
                // Calcular balance
                const balance = ingresosDelMes - egresosDelMes;
                
                // Pendientes (puedes modificar esta lógica según tus necesidades)
                const pendientes = 0;
                
                return (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-green-600 font-bold">↗</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Ingresos Mes</p>
                          <p className="text-lg font-semibold text-green-600">${ingresosDelMes.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-red-600 font-bold">↙</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Egresos Mes</p>
                          <p className="text-lg font-semibold text-red-600">${egresosDelMes.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-blue-600 font-bold">=</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Balance</p>
                          <p className={`text-lg font-semibold ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            ${balance.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                          <Clock className="w-4 h-4 text-yellow-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Pendientes</p>
                          <p className="text-lg font-semibold text-yellow-600">${pendientes.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
            
            {pagos.length === 0 ? (
              <div className="p-6">
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-6 text-center">
                  <CreditCard className="w-12 h-12 text-teal-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-teal-900 mb-2">Sin pagos registrados</h3>
                  <p className="text-teal-700 text-sm mb-4">
                    Registrá el primer movimiento para visualizar ingresos y egresos.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Concepto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente/Proveedor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pagos.map((pago) => (
                      <tr key={pago.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatDate(pago.fecha)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            pago.tipo === 'ingreso' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {pago.tipo === 'ingreso' ? '↗ Ingreso' : '↙ Egreso'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{pago.concepto}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {pago.cliente || 'Sistema'}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                            {pago.metodo === 'transferencia' ? '🏦 Transferencia' : '💵 Efectivo'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-medium ${
                            pago.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {pago.tipo === 'ingreso' ? '+' : '-'}${pago.monto.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => handleViewPago(pago)}
                              className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                              title="Ver detalles"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handlePrintComprobante(pago)}
                              className="p-1 text-orange-600 hover:bg-orange-100 rounded"
                              title="Comprobante"
                            >
                              📄
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeSection === 'cuentas' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Control de Cuentas</h2>
                  <p className="text-sm text-gray-600 mt-1">Consolidado automático desde Facturas, Pagos y Compras</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className={`px-2 py-1 rounded-full font-medium ${controlCuentasMeta.source === 'api' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {controlCuentasResumenTexto.fuente}
                    </span>
                    <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                      Última actualización: {controlCuentasResumenTexto.ultimaActualizacion}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleRefreshControlCuentas}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Actualizar datos
                  </button>
                  <button
                    onClick={() => setActiveSection('facturas')}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Ver facturas
                  </button>
                  <button
                    onClick={() => setActiveSection('pagos')}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Ver pagos
                  </button>
                  <button
                    onClick={handleGenerarReporte}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Generar Reporte</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <p className="text-xs text-gray-500">Por cobrar</p>
                  <p className="text-2xl font-semibold text-green-700">{formatCurrencyARS(totalPorCobrar)}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-red-200">
                  <p className="text-xs text-gray-500">Por pagar</p>
                  <p className="text-2xl font-semibold text-red-700">{formatCurrencyARS(totalPorPagar)}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <p className="text-xs text-gray-500">Balance neto</p>
                  <p className={`text-2xl font-semibold ${balanceNeto >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                    {formatCurrencyARS(balanceNeto)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-3">
                Registros considerados: {facturas.length} factura(s), {pagos.length} pago(s), {compras.length} compra(s).
              </p>
            </div>

            {/* Clientes con deuda */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Clientes con Saldo Pendiente</h3>
              {clientesConSaldoPendiente.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay clientes con saldo pendiente</p>
              ) : (
                <div className="space-y-3">
                  {clientesConSaldoPendiente.map((cuenta: any, idx: number) => {
                    const nombre = cuenta.nombre || cuenta.cliente || cuenta.cliente_nombre || 'Sin nombre';
                    const deuda = Math.max(0, sanitizeNumber(cuenta.pendiente ?? cuenta.totalDeuda ?? 0));
                    const factCount = Array.isArray(cuenta.facturas) ? cuenta.facturas.length : '-';
                    return (
                      <div key={cuenta.id ?? `${nombre}-${idx}`} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-gray-900">{nombre}</p>
                            <p className="text-sm text-gray-600">{factCount} factura(s)</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">{formatCurrencyARS(deuda)}</p>
                            <p className="text-xs text-gray-500">Por cobrar</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Proveedores con deuda */}
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Compras Pendientes de Pago</h3>
                <button
                  onClick={handleNewCompra}
                  className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                >
                  + Nueva Compra
                </button>
              </div>
              {comprasPendientesDePago.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay compras pendientes de pago</p>
              ) : (
                <div className="space-y-3">
                  {comprasPendientesDePago.map((comp: any) => {
                    const nombre = comp.nombre || comp.proveedor || 'Proveedor';
                    const montoTotal = sanitizeNumber(comp.total_comprado ?? comp.monto ?? comp.total ?? 0);
                    const pagado = sanitizeNumber(comp.total_pagado ?? comp.pagado ?? 0);
                    const montoDeuda = Math.max(0, sanitizeNumber(comp.pendiente ?? (montoTotal - pagado)));
                    const fechaVenc = comp.fecha_vencimiento || comp.fecha || null;
                    const diasVencimiento = fechaVenc
                      ? Math.ceil((new Date(fechaVenc).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                      : null;

                    return (
                      <div key={comp.id || comp.numero_compra || nombre} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{nombre}</p>
                            {comp.numero_compra && <p className="text-sm text-gray-600">Orden: {comp.numero_compra}</p>}
                            {comp.descripcion && <p className="text-sm text-gray-500 mt-1">{comp.descripcion}</p>}
                            {diasVencimiento !== null && (
                              <p className={`text-xs font-medium mt-2 ${diasVencimiento < 0 ? 'text-red-600' : diasVencimiento < 5 ? 'text-orange-600' : 'text-gray-600'}`}>
                                {diasVencimiento < 0 ? `⚠️ Vencida hace ${Math.abs(diasVencimiento)} días` : `Vence en ${diasVencimiento} días`}
                              </p>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-lg font-bold text-red-600">{formatCurrencyARS(montoDeuda)}</p>
                            <p className="text-xs text-gray-500">Pendiente</p>
                            {pagado > 0 && <p className="text-xs text-gray-600 mt-1">Pagado: {formatCurrencyARS(pagado)}</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Nuevo Cliente */}
      {showNewClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Nuevo Cliente</h3>
              <button 
                onClick={closeModals}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveClient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  value={newClientData.nombre}
                  onChange={(e) => setNewClientData({...newClientData, nombre: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Ingrese el nombre completo"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={newClientData.email}
                  onChange={(e) => setNewClientData({...newClientData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="cliente@email.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono *
                </label>
                <input
                  type="tel"
                  value={newClientData.telefono}
                  onChange={(e) => setNewClientData({...newClientData, telefono: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="11-5555-1234"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  value={newClientData.direccion}
                  onChange={(e) => setNewClientData({...newClientData, direccion: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Dirección completa"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría
                </label>
                <select
                  value={newClientData.categoria}
                  onChange={(e) => setNewClientData({...newClientData, categoria: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="Particular">Particular</option>
                  <option value="Empresa">Empresa</option>
                  <option value="Constructor/Obra">Constructor/Obra</option>
                  <option value="Cliente Frecuente">Cliente Frecuente</option>
                </select>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModals}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Conversión a Factura */}
      {showConvertConfirm && presupuestoToConvert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Convertir Presupuesto</h3>
              <button onClick={() => { setShowConvertConfirm(false); setPresupuestoToConvert(null); }} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <p className="mt-4 text-sm text-gray-600">¿Desea convertir este presupuesto en una factura?</p>
            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => { setShowConvertConfirm(false); setPresupuestoToConvert(null); }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmConvertToFactura}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Buscar */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Buscar Cliente</h3>
              <button 
                onClick={closeModals}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Buscar por
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Nombre, email o teléfono..."
                />
              </div>
              <div className="text-sm text-gray-500">
                Ingrese al menos 3 caracteres para buscar
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModals}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSearchClient}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  disabled={searchTerm.length < 3}
                >
                  Buscar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Cliente */}
      {showViewModal && selectedCliente && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Detalles del Cliente</h3>
              <button 
                onClick={closeModals}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
                <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{selectedCliente.nombre}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{selectedCliente.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{selectedCliente.telefono}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{selectedCliente.direccion || 'No especificada'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de registro</label>
                <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                  {formatDate(selectedCliente.created_at)}
                </p>
              </div>
              <div className="flex justify-end pt-4">
                <button
                  onClick={closeModals}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Cliente */}
      {showEditModal && selectedCliente && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Editar Cliente</h3>
              <button 
                onClick={closeModals}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateClient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  value={editClientData.nombre}
                  onChange={(e) => setEditClientData({...editClientData, nombre: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={editClientData.email}
                  onChange={(e) => setEditClientData({...editClientData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono *
                </label>
                <input
                  type="tel"
                  value={editClientData.telefono}
                  onChange={(e) => setEditClientData({...editClientData, telefono: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  value={editClientData.direccion}
                  onChange={(e) => setEditClientData({...editClientData, direccion: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría
                </label>
                <select
                  value={editClientData.categoria}
                  onChange={(e) => setEditClientData({...editClientData, categoria: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="Particular">Particular</option>
                  <option value="Empresa">Empresa</option>
                  <option value="Constructor/Obra">Constructor/Obra</option>
                  <option value="Cliente Frecuente">Cliente Frecuente</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  value={editClientData.activo ? 'activo' : 'inactivo'}
                  onChange={(e) => setEditClientData({
                    ...editClientData,
                    activo: e.target.value === 'activo'
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedCliente(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Actualizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo Proveedor */}
      {showNewProveedorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Nuevo Proveedor</h3>
              <button 
                onClick={handleCloseNewProveedorModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveProveedor} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={newProveedorData.nombre}
                  onChange={(e) => setNewProveedorData({...newProveedorData, nombre: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={newProveedorData.email}
                  onChange={(e) => setNewProveedorData({...newProveedorData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
                <input
                  type="tel"
                  value={newProveedorData.telefono}
                  onChange={(e) => setNewProveedorData({...newProveedorData, telefono: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rubro</label>
                <input
                  type="text"
                  value={newProveedorData.rubro}
                  onChange={(e) => setNewProveedorData({...newProveedorData, rubro: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                  placeholder="Ej: Materiales de construcción"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CUIT</label>
                <input
                  type="text"
                  value={newProveedorData.cuit}
                  onChange={(e) => setNewProveedorData({...newProveedorData, cuit: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                  placeholder="20-12345678-9"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input
                  type="text"
                  value={newProveedorData.direccion}
                  onChange={(e) => setNewProveedorData({...newProveedorData, direccion: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseNewProveedorModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Guardar Proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ver Proveedor */}
      {showViewProveedorModal && selectedProveedor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Detalles del Proveedor</h3>
              <button 
                onClick={closeModals}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{selectedProveedor.nombre}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{selectedProveedor.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{selectedProveedor.telefono}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rubro</label>
                <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{selectedProveedor.rubro || 'No especificado'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CUIT</label>
                <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{selectedProveedor.cuit || 'No especificado'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{selectedProveedor.direccion || 'No especificada'}</p>
              </div>
              <div className="flex justify-end pt-4">
                <button
                  onClick={closeModals}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Proveedor */}
      {showEditProveedorModal && selectedProveedor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Editar Proveedor</h3>
              <button 
                onClick={closeModals}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateProveedor} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={editProveedorData.nombre}
                  onChange={(e) => setEditProveedorData({...editProveedorData, nombre: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={editProveedorData.email}
                  onChange={(e) => setEditProveedorData({...editProveedorData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
                <input
                  type="tel"
                  value={editProveedorData.telefono}
                  onChange={(e) => setEditProveedorData({...editProveedorData, telefono: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rubro</label>
                <input
                  type="text"
                  value={editProveedorData.rubro}
                  onChange={(e) => setEditProveedorData({...editProveedorData, rubro: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CUIT</label>
                <input
                  type="text"
                  value={editProveedorData.cuit}
                  onChange={(e) => setEditProveedorData({...editProveedorData, cuit: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input
                  type="text"
                  value={editProveedorData.direccion}
                  onChange={(e) => setEditProveedorData({...editProveedorData, direccion: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModals}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Actualizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo Pago */}
      {showNewPagoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Nuevo Registro de Pago</h3>
              <button 
                onClick={closeModals}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSavePago} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Movimiento *</label>
                  <select
                    value={newPagoData.tipo_pago}
                    onChange={(e) => {
                      const nextTipo = e.target.value as 'ingreso' | 'egreso';
                      setNewPagoData({
                        ...newPagoData,
                        tipo_pago: nextTipo,
                        cliente_id: nextTipo === 'ingreso' ? newPagoData.cliente_id : '',
                        proveedor_id: nextTipo === 'egreso' ? newPagoData.proveedor_id : ''
                      });
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900"
                  >
                    <option value="ingreso">💰 Ingreso (Pago recibido)</option>
                    <option value="egreso">💸 Egreso (Pago realizado)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monto *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newPagoData.monto}
                    onChange={(e) => setNewPagoData({...newPagoData, monto: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              {/* Sección de Cliente */}
              <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                <label className="block text-sm font-medium text-green-700 mb-3">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4" />
                    <span>Información del Cliente</span>
                    {newPagoData.tipo_pago === 'ingreso' && <span className="text-red-500">*</span>}
                  </div>
                  <span className="text-xs text-green-600 ml-6">
                    {newPagoData.tipo_pago === 'ingreso' ? 
                      'Seleccione el cliente que realizó el pago' : 
                      'Seleccione el cliente/proveedor relacionado (opcional)'}
                  </span>
                </label>
                <select
                  value={newPagoData.tipo_pago === 'ingreso' ? newPagoData.cliente_id : newPagoData.proveedor_id}
                  onChange={(e) => {
                    if (newPagoData.tipo_pago === 'ingreso') setNewPagoData({...newPagoData, cliente_id: e.target.value});
                    else setNewPagoData({...newPagoData, proveedor_id: e.target.value});
                  }}
                  className="w-full px-4 py-3 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 bg-white"
                  required={newPagoData.tipo_pago === 'ingreso'}
                >
                  <option value="">
                    {newPagoData.tipo_pago === 'ingreso'
                      ? (clientes.length === 0 ? 'No hay clientes registrados' : 'Seleccione el cliente que pagó')
                      : (proveedores.length === 0 ? 'No hay proveedores registrados' : 'Seleccione el proveedor relacionado (opcional)')}
                  </option>
                  {newPagoData.tipo_pago === 'ingreso'
                    ? clientes.map((cliente) => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.nombre} - {cliente.email}
                        </option>
                      ))
                    : proveedores.map((prov) => (
                        <option key={prov.id} value={prov.id}>
                          {prov.nombre} - {prov.email}
                        </option>
                      ))}
                </select>
                
                {/* Mostrar datos del cliente seleccionado */} 
                {((newPagoData.tipo_pago === 'ingreso' && newPagoData.cliente_id) || (newPagoData.tipo_pago === 'egreso' && newPagoData.proveedor_id)) && (() => {
                  if (newPagoData.tipo_pago === 'ingreso') {
                    const clienteSeleccionado = clientes.find(c => c.id.toString() === newPagoData.cliente_id);
                    return clienteSeleccionado ? (
                      <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Datos del Cliente:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-600">Nombre:</span>
                            <div className="font-medium text-gray-900">{clienteSeleccionado.nombre}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Email:</span>
                            <div className="font-medium text-blue-600">{clienteSeleccionado.email}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Teléfono:</span>
                            <div className="font-medium text-gray-900">{clienteSeleccionado.telefono || 'No registrado'}</div>
                          </div>
                          <div>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  } else {
                    const proveedorSeleccionado = proveedores.find(p => p.id.toString() === newPagoData.proveedor_id);
                    return proveedorSeleccionado ? (
                      <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Datos del Proveedor:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-600">Nombre:</span>
                            <div className="font-medium text-gray-900">{proveedorSeleccionado.nombre}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Email:</span>
                            <div className="font-medium text-blue-600">{proveedorSeleccionado.email}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Teléfono:</span>
                            <div className="font-medium text-gray-900">{proveedorSeleccionado.telefono || 'No registrado'}</div>
                          </div>
                          <div>
                          </div>
                        </div>
                      </div>
                    ) : null;
                  }
                })()}

                {clientes.length === 0 && (
                  <p className="text-sm text-green-600 mt-2">
                    ⚠️ Para registrar pagos de clientes, primero debe registrar clientes en la sección "Registro de Clientes"
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Concepto *</label>
                <input
                  type="text"
                  value={newPagoData.concepto}
                  onChange={(e) => setNewPagoData({...newPagoData, concepto: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900"
                  placeholder="Ej: Pago Factura #001, Compra materiales..."
                  required
                />
              </div>

              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <label className="block text-sm font-medium text-blue-700 mb-3">Método de Pago * 
                  <span className="text-xs text-blue-600 ml-2">(Seleccione cómo pagó el cliente)</span>
                </label>
                <select
                  value={newPagoData.metodo_pago}
                  onChange={(e) => setNewPagoData({...newPagoData, metodo_pago: e.target.value})}
                  className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  required
                >
                  <option value="efectivo">💵 Efectivo - Pago en billetes y monedas</option>
                  <option value="transferencia">🏦 Transferencia Bancaria - Pago electrónico</option>
                </select>
                <p className="text-xs text-blue-600 mt-2">
                  ⚠️ Importante: Seleccione el método real usado por el cliente para el pago
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha del Pago *</label>
                  <input
                    type="date"
                    value={newPagoData.fecha_pago}
                    onChange={(e) => setNewPagoData({...newPagoData, fecha_pago: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900"
                    max={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Referencia</label>
                  <input
                    type="text"
                    value={newPagoData.referencia}
                    onChange={(e) => setNewPagoData({...newPagoData, referencia: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900"
                    placeholder="N° de comprobante, transferencia, etc."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones</label>
                <textarea
                  value={newPagoData.observaciones}
                  onChange={(e) => setNewPagoData({...newPagoData, observaciones: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900"
                  placeholder="Notas adicionales..."
                />
              </div>

              <div className="flex space-x-4 pt-6">
                <button
                  type="button"
                  onClick={closeModals}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium transition-colors"
                >
                  Registrar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nueva Compra */}
      {showNewCompraModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold text-gray-900">Nueva Compra de Proveedor</h3>
              <button 
                onClick={closeModals}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveCompra} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Proveedor *</label>
                {proveedores.length === 0 ? (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-red-600">
                      ⚠️ No hay proveedores registrados.
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenProveedorFromCompra}
                      className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                    >
                      + Nuevo Proveedor
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <select
                      value={newCompraData.proveedor_id}
                      onChange={(e) => setNewCompraData(prev => ({...prev, proveedor_id: e.target.value}))}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                      required
                    >
                      <option value="">-- Seleccione un proveedor --</option>
                      {proveedores.map(prov => (
                        <option key={prov.id} value={prov.id}>{prov.nombre}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleOpenProveedorFromCompra}
                      className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                    >
                      + Nuevo
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Número de Orden/Compra *</label>
                  <input
                    type="text"
                    value={newCompraData.numero_compra}
                    onChange={(e) => setNewCompraData(prev => ({...prev, numero_compra: e.target.value}))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="COM-001"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monto Total *</label>
                  <input
                    type="number"
                    value={newCompraData.monto}
                    onChange={(e) => setNewCompraData(prev => ({...prev, monto: e.target.value}))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="0"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descripción del Producto/Servicio</label>
                <textarea
                  value={newCompraData.descripcion}
                  onChange={(e) => setNewCompraData(prev => ({...prev, descripcion: e.target.value}))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Describa qué se estã comprando..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Vencimiento</label>
                  <input
                    type="date"
                    value={newCompraData.fecha_vencimiento}
                    onChange={(e) => setNewCompraData(prev => ({...prev, fecha_vencimiento: e.target.value}))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Método de Pago</label>
                  <select
                    value={newCompraData.metodo_pago}
                    onChange={(e) => setNewCompraData(prev => ({...prev, metodo_pago: e.target.value}))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  >
                    <option value="efectivo">💵 Efectivo</option>
                    <option value="transferencia">🏦 Transferencia</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones</label>
                <textarea
                  value={newCompraData.observaciones}
                  onChange={(e) => setNewCompraData(prev => ({...prev, observaciones: e.target.value}))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="Notas adicionales..."
                  rows={2}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModals}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Registrar Compra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo Presupuesto */}
      {showNewPresupuestoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Nuevo Presupuesto</h3>
              <button 
                onClick={closeModals}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSavePresupuesto} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                  <select
                    value={newPresupuestoData.cliente_id}
                    onChange={(e) => handleClienteChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    required
                  >
                    <option value="">
                      {clientesParaPresupuesto.length === 0 && clientes.length === 0
                        ? 'No hay clientes registrados'
                        : 'Seleccione un cliente'}
                    </option>
                    {(clientesParaPresupuesto.length ? clientesParaPresupuesto : clientes).map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nombre} - {cliente.email}
                      </option>
                    ))}
                  </select>
                  {clientesParaPresupuesto.length === 0 && clientes.length === 0 && (
                    <p className="text-sm text-red-600 mt-1">
                      Primero debe registrar clientes en la sección "Registro de Clientes"
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Trabajo *</label>
                  <select
                    value={newPresupuestoData.tipo_trabajo}
                    onChange={(e) => setNewPresupuestoData({...newPresupuestoData, tipo_trabajo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    required
                  >
                    <option value="">Seleccione tipo de trabajo</option>
                    <option value="Puertas y Ventanas">Puertas y Ventanas</option>
                    <option value="Rejas y Barandas">Rejas y Barandas</option>
                    <option value="Estructuras Metálicas">Estructuras Metálicas</option>
                    <option value="Soldadura y Reparación">Soldadura y Reparación</option>
                    <option value="Mobiliario Metálico">Mobiliario Metálico</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Material *</label>
                  <select
                    value={newPresupuestoData.tipo_material}
                    onChange={(e) => handleMaterialChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    required
                  >
                    <option value="">Seleccione el material</option>
                    <option value="Hierro Común">Hierro Común - $25.000/unidad</option>
                    <option value="Hierro Galvanizado">Hierro Galvanizado - $35.000/unidad</option>
                    <option value="Acero Inoxidable">Acero Inoxidable - $55.000/unidad</option>
                    <option value="Aluminio">Aluminio - $40.000/unidad</option>
                    <option value="Hierro Forjado">Hierro Forjado - $65.000/unidad</option>
                    <option value="Chapa Común">Chapa Común - $20.000/unidad</option>
                    <option value="Chapa Galvanizada">Chapa Galvanizada - $28.000/unidad</option>
                    <option value="Perfil L">Perfil L - $30.000/unidad</option>
                    <option value="Perfil U">Perfil U - $32.000/unidad</option>
                    <option value="Caño Estructural">Caño Estructural - $38.000/unidad</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Validez (días)</label>
                  <input
                    type="number"
                    min="1"
                    value={newPresupuestoData.validez_dias}
                    onChange={(e) => setNewPresupuestoData({...newPresupuestoData, validez_dias: parseInt(e.target.value) || 30})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción General *</label>
                <textarea
                  value={newPresupuestoData.descripcion}
                  onChange={(e) => setNewPresupuestoData({...newPresupuestoData, descripcion: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  placeholder="Descripción del trabajo a realizar..."
                  required
                />
              </div>

              <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-green-800">Total del Presupuesto</h3>
                    <p className="text-2xl font-bold text-green-600">${newPresupuestoData.total.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4">� Cálculo de Presupuesto: Material + Mano de Obra</h4>
                
                {/* Sección Material */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                  <h5 className="font-semibold text-blue-800 mb-3">📦 Costos de Material</h5>
                  {newPresupuestoData.tipo_material && (
                    <div className="mb-3 p-2 bg-blue-100 rounded border border-blue-300">
                      <span className="text-sm font-medium text-blue-700">Material seleccionado: </span>
                      <span className="text-sm font-bold text-blue-600">{newPresupuestoData.tipo_material}</span>
                      <span className="text-sm text-blue-600"> - ${newPresupuestoData.precio_material_unitario.toLocaleString()}/unidad</span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1">Cantidad *</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={newPresupuestoData.cantidad}
                        onChange={(e) => handleCantidadChange(e.target.value)}
                        className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Ej: 2"
                        required
                      />
                      <p className="text-xs text-blue-600 mt-1">Número entero de unidades, metros, piezas, etc.</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1">Precio del Material</label>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={newPresupuestoData.precio_material_unitario}
                        onChange={(e) => {
                          const nuevoPrecio = parseFloat(e.target.value) || 0;
                          setNewPresupuestoData(prev => {
                            const newData = {...prev, precio_material_unitario: nuevoPrecio};
                            
                            // Recalcular inmediatamente
                            const cantidad = parseInt(newData.cantidad.toString()) || 0;
                            const tiempoHoras = parseFloat(newData.tiempo_estimado_horas.toString()) || 0;
                            const precioHora = parseFloat(newData.precio_hora_mano_obra.toString()) || 15000;
                            
                            const subtotalMaterial = cantidad * nuevoPrecio;
                            const subtotalManoObra = tiempoHoras * precioHora;
                            const total = subtotalMaterial + subtotalManoObra;
                            
                            return {
                              ...newData,
                              subtotal_material: subtotalMaterial,
                              subtotal_mano_obra: subtotalManoObra,
                              total: total
                            };
                          });
                        }}
                        className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="Precio por unidad"
                      />
                      <p className="text-xs text-blue-600 mt-1">Se calcula automáticamente según el material seleccionado</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1">Subtotal Material</label>
                      <div className="w-full px-3 py-2 bg-blue-100 border border-blue-300 rounded-md text-gray-900 font-semibold">
                        ${newPresupuestoData.subtotal_material.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sección Mano de Obra */}
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 mb-4">
                  <h5 className="font-semibold text-orange-800 mb-3">👷 Costos de Mano de Obra</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-orange-700 mb-1">Tiempo Estimado (horas) *</label>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={newPresupuestoData.tiempo_estimado_horas}
                        onChange={(e) => handleTiempoChange(e.target.value)}
                        className="w-full px-3 py-2 border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                        placeholder="Ej: 8.5"
                        required
                      />
                      <p className="text-xs text-orange-600 mt-1">Tiempo total estimado de trabajo</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-orange-700 mb-1">Precio por Hora</label>
                      <input
                        type="number"
                        min="1000"
                        step="1000"
                        value={newPresupuestoData.precio_hora_mano_obra}
                        onChange={(e) => handlePrecioHoraChange(e.target.value)}
                        className="w-full px-3 py-2 border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                        placeholder="15000"
                      />
                      <p className="text-xs text-orange-600 mt-1">Costo por hora de trabajo</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-orange-700 mb-1">Subtotal Mano de Obra</label>
                      <div className="w-full px-3 py-2 bg-orange-100 border border-orange-300 rounded-md text-gray-900 font-semibold">
                        ${newPresupuestoData.subtotal_mano_obra.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resumen del Cálculo */}
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h5 className="font-semibold text-green-800 mb-3">💰 Resumen del Presupuesto</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-green-700">Material ({newPresupuestoData.cantidad} × ${newPresupuestoData.precio_material_unitario.toLocaleString()}):</span>
                      <span className="font-semibold text-green-600">${newPresupuestoData.subtotal_material.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-green-700">Mano de Obra ({newPresupuestoData.tiempo_estimado_horas}h × ${newPresupuestoData.precio_hora_mano_obra.toLocaleString()}):</span>
                      <span className="font-semibold text-green-600">${newPresupuestoData.subtotal_mano_obra.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-green-200 pt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-green-800">TOTAL:</span>
                        <span className="text-2xl font-bold text-green-600">${newPresupuestoData.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea
                  value={newPresupuestoData.observaciones}
                  onChange={(e) => setNewPresupuestoData({...newPresupuestoData, observaciones: e.target.value})}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  placeholder="Términos y condiciones, notas adicionales..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModals}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  Crear Presupuesto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Estado Presupuesto */}
      {showEditPresupuestoEstadoModal && presupuestoEstadoTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Editar Estado del Presupuesto</h3>
              <button
                onClick={closeModals}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select
                  value={nuevoEstadoPresupuesto}
                  onChange={(e) => setNuevoEstadoPresupuesto(e.target.value as PresupuestoEstado)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                >
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="RESEÑADO">RESEÑADO</option>
                  <option value="FACTURADO">FACTURADO</option>
                  <option value="VENCIDO">VENCIDO</option>
                </select>
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={closeModals}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleUpdatePresupuestoEstado}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nueva Factura */}
      {showNewFacturaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-orange-700 px-8 py-6 flex items-center justify-between rounded-t-xl">
              <div>
                <h3 className="text-2xl font-bold text-white">Nueva Factura</h3>
                <p className="text-orange-100 text-sm mt-1">Crea una nueva factura para tu cliente</p>
              </div>
              <button 
                onClick={closeModals}
                className="text-white hover:bg-orange-800 p-2 rounded-lg transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveFactura} className="p-8 space-y-6" noValidate>
              {/* Sección 1: Cliente, Número y Teléfono */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Cliente *</label>
                  <select
                    value={newFacturaData.cliente_id}
                    onChange={(e) => {
                      setNewFacturaData({
                        ...newFacturaData,
                        cliente_id: e.target.value
                      });
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-gray-900 bg-white transition"
                    required
                  >
                    <option value="">Seleccione un cliente...</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">N° Factura *</label>
                  <input
                    type="text"
                    value={newFacturaData.numero_factura}
                    onChange={(e) => {
                      setNewFacturaData({
                        ...newFacturaData,
                        numero_factura: e.target.value
                      });
                    }}
                    autoComplete="off"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-gray-900 bg-white transition"
                    placeholder="FAC-001"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Teléfono Cliente</label>
                  <input
                    type="tel"
                    value={newFacturaData.telefono_cliente}
                    onChange={(e) => {
                      setNewFacturaData({
                        ...newFacturaData,
                        telefono_cliente: e.target.value
                      });
                    }}
                    autoComplete="off"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-gray-900 bg-white transition"
                    placeholder="+54 9 11 XXXX-XXXX"
                  />
                </div>
              </div>

              {/* Sección 2: Descripción */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Descripción *</label>
                <textarea
                  value={newFacturaData.descripcion}
                  onChange={(e) => {
                    setNewFacturaData({
                      ...newFacturaData,
                      descripcion: e.target.value
                    });
                  }}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-gray-900 bg-white transition resize-none"
                  placeholder="Describe los servicios o productos facturados..."
                  required
                />
              </div>

              {/* Sección 3: Monto */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-lg border-2 border-orange-200">
                <label className="block text-sm font-semibold text-gray-900 mb-3">Monto Total *</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-2xl text-orange-600 font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newFacturaData.monto}
                    onChange={(e) => {
                      setNewFacturaData({
                        ...newFacturaData,
                        monto: parseFloat(e.target.value) || 0
                      });
                    }}
                    autoComplete="off"
                    className="w-full pl-10 pr-4 py-4 border-2 border-orange-300 rounded-lg focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-200 text-xl text-gray-900 bg-white font-bold transition"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              {/* Sección 4: Método de Pago y Vencimiento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Método de Pago *</label>
                  <select
                    value={newFacturaData.metodo_pago}
                    onChange={(e) => {
                      setNewFacturaData({
                        ...newFacturaData,
                        metodo_pago: e.target.value
                      });
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-gray-900 bg-white transition"
                    required
                  >
                    <option value="efectivo">💵 Efectivo</option>
                    <option value="transferencia">🏦 Transferencia Bancaria</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Fecha Vencimiento</label>
                  <input
                    type="date"
                    value={newFacturaData.fecha_vencimiento}
                    onChange={(e) => {
                      setNewFacturaData({
                        ...newFacturaData,
                        fecha_vencimiento: e.target.value
                      });
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-gray-900 bg-white transition"
                  />
                </div>
              </div>

              {/* Sección 5: Observaciones */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Observaciones</label>
                <textarea
                  value={newFacturaData.observaciones}
                  onChange={(e) => {
                    setNewFacturaData({
                      ...newFacturaData,
                      observaciones: e.target.value
                    });
                  }}
                  rows={2}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-gray-900 bg-white transition resize-none"
                  placeholder="Términos de pago, notas especiales..."
                />
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModals}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingFactura}
                  className={`flex-1 px-6 py-3 font-semibold rounded-lg transition shadow-lg ${savingFactura ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-gradient-to-r from-orange-600 to-orange-700 text-white hover:from-orange-700 hover:to-orange-800'}`}
                >
                  {savingFactura ? 'Guardando...' : '✓ Crear Factura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ver Presupuesto */}
      {showViewPresupuestoModal && selectedPresupuesto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Detalles del Presupuesto
                </h3>
                <button
                  onClick={closeModals}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4 space-y-6">
              {(() => {
                const estado = normalizePresupuestoEstado(selectedPresupuesto.estado);
                const vencimientoInfo = getPresupuestoVencimientoInfo(selectedPresupuesto);
                const clienteNombre = selectedPresupuesto.nombre_cliente || selectedPresupuesto.cliente_nombre || selectedPresupuesto.nombreCliente || 'Sin cliente';
                const clienteEmail = selectedPresupuesto.email_cliente || selectedPresupuesto.cliente_email || selectedPresupuesto.email || 'Sin email';
                const clienteTelefono = selectedPresupuesto.telefono_cliente || selectedPresupuesto.cliente_telefono || selectedPresupuesto.telefono || 'Sin teléfono';
                const clienteDireccion = selectedPresupuesto.cliente_direccion || selectedPresupuesto.direccion || 'Sin dirección';
                const fechaCreacion = selectedPresupuesto.created_at || selectedPresupuesto.fecha_creacion || selectedPresupuesto.fecha;

                return (
                  <>
              {/* Información del Cliente */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-3">Información del Cliente</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-blue-700">Cliente:</span>
                    <p className="text-blue-600">{clienteNombre}</p>
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Email:</span>
                    <p className="text-blue-600">{clienteEmail}</p>
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Teléfono:</span>
                    <p className="text-blue-600">{clienteTelefono}</p>
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Dirección:</span>
                    <p className="text-blue-600">{clienteDireccion}</p>
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Fecha creación:</span>
                    <p className="text-blue-600">
                      {fechaCreacion ? formatDate(fechaCreacion) : 'Sin fecha'}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-blue-700">Fecha vencimiento:</span>
                    <p className="text-blue-600">
                      {vencimientoInfo.date ? formatDate(vencimientoInfo.date) : 'Sin fecha'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Detalles del Trabajo */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-3">Detalles del Trabajo</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Tipo de Trabajo:</span>
                    <p className="text-gray-600">{selectedPresupuesto.tipo_trabajo || selectedPresupuesto.tipoTrabajo || 'No especificado'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Material:</span>
                    <p className="text-gray-600">{selectedPresupuesto.tipo_material || 'No especificado'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Estado:</span>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getPresupuestoEstadoClass(estado)}`}>
                      {estado}
                    </span>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="font-medium text-gray-700">Descripción:</span>
                  <p className="text-gray-600 mt-1">{selectedPresupuesto.descripcion || '-'}</p>
                </div>
              </div>

              {/* Cálculo Detallado */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 mb-3">Cálculo del Presupuesto</h4>
                
                {/* Material */}
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-3">
                  <h5 className="font-medium text-blue-800 mb-2">📦 Costos de Material</h5>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-700">
                      {selectedPresupuesto.cantidad || 0} unidades × ${(selectedPresupuesto.precio_material_unitario || 0).toLocaleString()}
                    </span>
                    <span className="font-semibold text-blue-600">
                      ${(selectedPresupuesto.subtotal_material || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                
                {/* Mano de Obra */}
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 mb-3">
                  <h5 className="font-medium text-orange-800 mb-2">👷 Costos de Mano de Obra</h5>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-orange-700">
                      {selectedPresupuesto.tiempo_estimado_horas || 0}h × ${(selectedPresupuesto.precio_hora_mano_obra || 0).toLocaleString()}
                    </span>
                    <span className="font-semibold text-orange-600">
                      ${(selectedPresupuesto.subtotal_mano_obra || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                
                {/* Total */}
                <div className="bg-white p-4 rounded-lg border border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-green-800">TOTAL PRESUPUESTO:</span>
                    <span className="text-2xl font-bold text-green-600">${(selectedPresupuesto.total || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Observaciones */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-2">Observaciones</h4>
                <p className="text-gray-600 text-sm">{selectedPresupuesto.observaciones || 'Sin observaciones'}</p>
              </div>

              {/* Validez */}
              <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-orange-700">Válido por:</span>
                  <span className="text-orange-600">{selectedPresupuesto.validez_dias || 30} días</span>
                </div>
              </div>

              {/* Historial */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-2">Historial de acciones</h4>
                {Array.isArray(selectedPresupuesto.historial) && selectedPresupuesto.historial.length > 0 ? (
                  <ul className="space-y-2 text-sm text-gray-700">
                    {selectedPresupuesto.historial.map((evento: any, index: number) => (
                      <li key={evento.id || `${evento.created_at || 'evento'}-${index}`} className="flex items-start justify-between gap-4 border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                        <span>{evento.accion}</span>
                        <span className="text-gray-500 whitespace-nowrap">{evento.created_at ? formatDateTime(evento.created_at) : 'Sin fecha'}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">Sin acciones registradas.</p>
                )}
              </div>
                  </>
                );
              })()}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
              <div className="flex space-x-3">
                <button
                  onClick={closeModals}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Factura */}
      {showViewFacturaModal && selectedFactura && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Detalles de la Factura {getFacturaNumero(selectedFactura)}
                </h3>
                <button
                  onClick={() => setShowViewFacturaModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4 space-y-6">
              {/* Información de la Factura */}
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <h4 className="font-semibold text-orange-800 mb-3">Información de la Factura</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-orange-700">Número:</span>
                    <p className="text-orange-600 font-semibold">{getFacturaNumero(selectedFactura)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-orange-700">Cliente:</span>
                    <p className="text-orange-600">{getFacturaCliente(selectedFactura)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-orange-700">Fecha:</span>
                    <p className="text-orange-600">{selectedFactura.created_at ? formatDate(selectedFactura.created_at) : 'No disponible'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-orange-700">Estado:</span>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      selectedFactura.estado === 'pagada' ? 'bg-green-100 text-green-800' : 
                      selectedFactura.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedFactura.estado === 'pagada' ? 'PAGADA' :
                       selectedFactura.estado === 'pendiente' ? 'PENDIENTE' : 'VENCIDA'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Monto */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 mb-3">💰 Total de la Factura</h4>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    ${selectedFactura.total?.toLocaleString() || '0'}
                  </div>
                  <p className="text-sm text-green-700 mt-1">Total sin IVA</p>
                </div>
              </div>

              {/* Acciones */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-3">Acciones Disponibles</h4>
                <div className="grid grid-cols-2 gap-3">

                  <button
                    onClick={() => handlePrintPDF(selectedFactura)}
                    className="flex items-center justify-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                  >
                    <span>📄</span>
                    <span>Generar PDF</span>
                  </button>
                  {selectedFactura.estado !== 'pagada' && (
                    <button
                      onClick={() => {
                        handleRegisterPayment(selectedFactura);
                        setShowViewFacturaModal(false);
                      }}
                      className="flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 col-span-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Registrar Pago</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setShowViewFacturaModal(false)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Pago */}
      {showViewPagoModal && selectedPago && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Detalles del {selectedPago.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'} #{selectedPago.id}
                </h3>
                <button
                  onClick={() => setShowViewPagoModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4 space-y-6">
              {/* Información del Pago */}
              <div className={`p-4 rounded-lg border ${selectedPago.tipo === 'ingreso' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <h4 className={`font-semibold mb-3 ${selectedPago.tipo === 'ingreso' ? 'text-green-800' : 'text-red-800'}`}>
                  {selectedPago.tipo === 'ingreso' ? '💰 Información del Ingreso' : '💸 Información del Egreso'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className={`font-medium ${selectedPago.tipo === 'ingreso' ? 'text-green-700' : 'text-red-700'}`}>ID:</span>
                    <p className={`font-semibold ${selectedPago.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>#{selectedPago.id}</p>
                  </div>
                  <div>
                    <span className={`font-medium ${selectedPago.tipo === 'ingreso' ? 'text-green-700' : 'text-red-700'}`}>Fecha:</span>
                    <p className={selectedPago.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}>{formatDate(selectedPago.fecha)}</p>
                  </div>
                  <div>
                    <span className={`font-medium ${selectedPago.tipo === 'ingreso' ? 'text-green-700' : 'text-red-700'}`}>Tipo:</span>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      selectedPago.tipo === 'ingreso' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedPago.tipo === 'ingreso' ? '↗ Ingreso' : '↙ Egreso'}
                    </span>
                  </div>
                  <div>
                    <span className={`font-medium ${selectedPago.tipo === 'ingreso' ? 'text-green-700' : 'text-red-700'}`}>Método:</span>
                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                      {selectedPago.metodo === 'transferencia' ? '🏦 Transferencia' : '💵 Efectivo'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className={`font-medium ${selectedPago.tipo === 'ingreso' ? 'text-green-700' : 'text-red-700'}`}>Cliente/Proveedor:</span>
                    <p className={selectedPago.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}>{selectedPago.cliente || 'Sistema'}</p>
                  </div>
                </div>
              </div>

              {/* Concepto */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-3">📝 Concepto</h4>
                <p className="text-gray-600">{selectedPago.concepto}</p>
              </div>

              {/* Monto */}
              <div className={`p-4 rounded-lg border ${selectedPago.tipo === 'ingreso' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <h4 className={`font-semibold mb-3 ${selectedPago.tipo === 'ingreso' ? 'text-green-800' : 'text-red-800'}`}>
                  💰 Monto Total
                </h4>
                <div className="text-center">
                  <div className={`text-4xl font-bold ${selectedPago.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedPago.tipo === 'ingreso' ? '+' : '-'}${selectedPago.monto.toLocaleString()}
                  </div>
                  <p className={`text-sm mt-1 ${selectedPago.tipo === 'ingreso' ? 'text-green-700' : 'text-red-700'}`}>
                    {selectedPago.tipo === 'ingreso' ? 'Ingreso registrado' : 'Egreso registrado'}
                  </p>
                </div>
              </div>

              {/* Acciones */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-3">Acciones Disponibles</h4>
                <button
                  onClick={() => handlePrintComprobante(selectedPago)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <span>📄</span>
                  <span>Generar Comprobante</span>
                </button>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setShowViewPagoModal(false)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Estado de Cuenta */}
      {selectedCuenta && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                Estado de Cuenta - {selectedCuenta.cliente}
              </h3>
              <button 
                onClick={() => setSelectedCuenta(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[75vh]">
              {/* Resumen de la Cuenta */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2">Información del Cliente</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium text-gray-900">Cliente:</span> <span className="text-gray-900">{selectedCuenta.cliente}</span></p>
                    <p><span className="font-medium text-gray-900">ID:</span> <span className="text-gray-900">{selectedCuenta.id}</span></p>
                    <p><span className="font-medium text-gray-900">Estado:</span> 
                      <span className={`ml-1 px-2 py-1 rounded text-xs ${
                        selectedCuenta.estado === 'al_dia' ? 'bg-green-100 text-green-800' :
                        selectedCuenta.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {selectedCuenta.estado === 'al_dia' ? 'Al día' :
                         selectedCuenta.estado === 'pendiente' ? 'Pendiente' : 'Vencido'}
                      </span>
                    </p>
                  </div>
                </div>
                
                <div className={`p-4 rounded-lg border ${
                  selectedCuenta.saldo > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                }`}>
                  <h4 className={`font-semibold mb-2 ${
                    selectedCuenta.saldo > 0 ? 'text-red-800' : 'text-green-800'
                  }`}>Saldo Actual</h4>
                  <div className={`text-2xl font-bold ${
                    selectedCuenta.saldo > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {selectedCuenta.saldo === 0 ? 'Cuenta al día' : `$${selectedCuenta.saldo.toLocaleString()}`}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedCuenta.saldo > 0 ? 'Saldo deudor' : 'Sin deuda pendiente'}
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-gray-800 mb-2">Último Movimiento</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium text-gray-900">Fecha:</span> <span className="text-gray-900">{formatDate(selectedCuenta.ultimo_pago)}</span></p>
                    <p><span className="font-medium text-gray-900">Días transcurridos:</span> <span className="text-gray-900">{daysSince(selectedCuenta.ultimo_pago)} días</span></p>
                  </div>
                </div>
              </div>

              {/* Historial de Movimientos */}
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="p-4 border-b border-gray-200">
                  <h4 className="font-semibold text-gray-900">Historial de Movimientos</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Concepto</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {/* Movimientos simulados con cálculos correctos */}
                      {selectedCuenta.saldo === 0 ? (
                        /* Juan Pérez - Cuenta al día */
                        <>
                          <tr>
                            <td className="px-4 py-3 text-sm text-gray-900">12/11/2025</td>
                            <td className="px-4 py-3 text-sm text-gray-900">Pago total - Cancelación saldo</td>
                            <td className="px-4 py-3 text-sm">
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Pago</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-green-600">-$49.000</td>
                            <td className="px-4 py-3 text-sm text-right font-medium">$0</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-sm text-gray-900">10/11/2025</td>
                            <td className="px-4 py-3 text-sm text-gray-900">Factura FAC-002</td>
                            <td className="px-4 py-3 text-sm">
                              <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">Cargo</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-red-600">+$32.000</td>
                            <td className="px-4 py-3 text-sm text-right font-medium">$49.000</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-sm text-gray-900">14/10/2025</td>
                            <td className="px-4 py-3 text-sm text-gray-900">Pago parcial</td>
                            <td className="px-4 py-3 text-sm">
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Pago</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-green-600">-$15.000</td>
                            <td className="px-4 py-3 text-sm text-right font-medium">$17.000</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-sm text-gray-900">05/10/2025</td>
                            <td className="px-4 py-3 text-sm text-gray-900">Factura FAC-001</td>
                            <td className="px-4 py-3 text-sm">
                              <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">Cargo</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-red-600">+$32.000</td>
                            <td className="px-4 py-3 text-sm text-right font-medium">$32.000</td>
                          </tr>
                        </>
                      ) : (
                        /* María García - Cuenta con deuda */
                        <>
                          <tr>
                            <td className="px-4 py-3 text-sm text-gray-900">10/11/2025</td>
                            <td className="px-4 py-3 text-sm text-gray-900">Factura FAC-003</td>
                            <td className="px-4 py-3 text-sm">
                              <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">Cargo</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-red-600">+$25.000</td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-red-600">${selectedCuenta.saldo.toLocaleString()}</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-sm text-gray-900">25/10/2025</td>
                            <td className="px-4 py-3 text-sm text-gray-900">Pago parcial</td>
                            <td className="px-4 py-3 text-sm">
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Pago</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-green-600">-$18.000</td>
                            <td className="px-4 py-3 text-sm text-right font-medium">$7.000</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-sm text-gray-900">15/10/2025</td>
                            <td className="px-4 py-3 text-sm text-gray-900">Factura FAC-002</td>
                            <td className="px-4 py-3 text-sm">
                              <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">Cargo</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-red-600">+$25.000</td>
                            <td className="px-4 py-3 text-sm text-right font-medium">$25.000</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Acciones */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (!printWindow) return;
                    
                    const logoSrc = window.location.origin + '/logo.jpg';
                    
                    // Generar filas de la tabla basado en el saldo
                    const movimientosHTML = selectedCuenta.saldo === 0 
                      ? `
                        <tr>
                          <td>12/11/2025</td>
                          <td>Pago total - Cancelación saldo</td>
                          <td><span class="badge badge-pago">Pago</span></td>
                          <td class="text-derecha pago">-$49.000</td>
                          <td class="text-derecha"><strong>$0</strong></td>
                        </tr>
                        <tr>
                          <td>10/11/2025</td>
                          <td>Factura FAC-002</td>
                          <td><span class="badge badge-cargo">Cargo</span></td>
                          <td class="text-derecha cargo">+$32.000</td>
                          <td class="text-derecha"><strong>$49.000</strong></td>
                        </tr>
                        <tr>
                          <td>14/10/2025</td>
                          <td>Pago parcial</td>
                          <td><span class="badge badge-pago">Pago</span></td>
                          <td class="text-derecha pago">-$15.000</td>
                          <td class="text-derecha"><strong>$17.000</strong></td>
                        </tr>
                        <tr>
                          <td>05/10/2025</td>
                          <td>Factura FAC-001</td>
                          <td><span class="badge badge-cargo">Cargo</span></td>
                          <td class="text-derecha cargo">+$32.000</td>
                          <td class="text-derecha"><strong>$32.000</strong></td>
                        </tr>
                      `
                      : `
                        <tr>
                          <td>10/11/2025</td>
                          <td>Factura FAC-003</td>
                          <td><span class="badge badge-cargo">Cargo</span></td>
                          <td class="text-derecha cargo">+$25.000</td>
                          <td class="text-derecha"><strong>$${selectedCuenta.saldo.toLocaleString('es-AR')}</strong></td>
                        </tr>
                        <tr>
                          <td>25/10/2025</td>
                          <td>Pago parcial</td>
                          <td><span class="badge badge-pago">Pago</span></td>
                          <td class="text-derecha pago">-$18.000</td>
                          <td class="text-derecha"><strong>$7.000</strong></td>
                        </tr>
                        <tr>
                          <td>15/10/2025</td>
                          <td>Factura FAC-002</td>
                          <td><span class="badge badge-cargo">Cargo</span></td>
                          <td class="text-derecha cargo">+$25.000</td>
                          <td class="text-derecha"><strong>$25.000</strong></td>
                        </tr>
                      `;
                    
                    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Estado de Cuenta - ${selectedCuenta.cliente}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; background: white; padding: 40px; line-height: 1.6; }
  .container { max-width: 900px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2c3e50; padding-bottom: 30px; margin-bottom: 30px; }
  .logo-section { display: flex; align-items: center; gap: 20px; }
  .logo { height: 80px; width: auto; }

  .empresa-info h2 { font-size: 16px; margin-bottom: 8px; color: #2c3e50; }
  .empresa-info p { font-size: 13px; color: #555; margin: 2px 0; }
  .titulo-centro { text-align: right; }
  .titulo-centro h1 { font-size: 28px; font-weight: bold; color: #2c3e50; margin-bottom: 5px; }
  .fecha-doc { font-size: 12px; color: #7f8c8d; }
  .seccion { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
  .bloque { background: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #3498db; }
  .bloque h3 { font-size: 13px; font-weight: bold; color: #2c3e50; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #ddd; }
  .bloque p { font-size: 13px; margin: 8px 0; line-height: 1.5; }
  .bloque strong { color: #2c3e50; }
  .balance-deudor { color: #e74c3c; font-weight: bold; font-size: 20px; }
  .balance-al-dia { color: #27ae60; font-weight: bold; font-size: 16px; }
  .tabla-movimientos { width: 100%; border-collapse: collapse; margin: 20px 0; background: white; }
  .tabla-movimientos th { background: #34495e; color: white; padding: 12px; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; }
  .tabla-movimientos td { padding: 12px; border-bottom: 1px solid #ecf0f1; font-size: 13px; }
  .tabla-movimientos tr:hover { background: #f8f9fa; }
  .text-derecha { text-align: right; }
  .cargo { color: #e74c3c; }
  .pago { color: #27ae60; }
  .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
  .badge-cargo { background: #fadbd8; color: #c0392b; }
  .badge-pago { background: #d5f4e6; color: #27ae60; }
  .resumen { background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%); color: white; padding: 25px; border-radius: 6px; margin-top: 30px; }
  .resumen h3 { font-size: 14px; text-transform: uppercase; margin-bottom: 15px; border-bottom: 2px solid rgba(255,255,255,0.3); padding-bottom: 10px; }
  .resumen-fila { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
  .pie { border-top: 1px solid #ecf0f1; padding-top: 20px; margin-top: 40px; text-align: center; font-size: 11px; color: #95a5a6; }
  @media print { body { background: white; } }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-section">
        <img src="${logoSrc}" alt="Logo" class="logo" />
        <div class="empresa-info">
          <h2>Herrería Malabia S.H.</h2>
          <p>Tucuman, Argentina</p>
          <p>Teléfono: +54 9 381478-4590</p>
          <p>Email: metalurgicamalabiash@hotmail.com</p>
        </div>
      </div>
      <div class="titulo-centro">
        <h1>ESTADO DE CUENTA</h1>
        <div class="fecha-doc">Fecha: ${new Date().toLocaleDateString('es-AR')}</div>
      </div>
    </div>
    
    <div class="seccion">
      <div class="bloque">
        <h3>Información del Cliente</h3>
        <p><strong>Nombre:</strong> ${selectedCuenta.cliente}</p>
        <p><strong>ID Cliente:</strong> ${selectedCuenta.id}</p>
        <p><strong>Email:</strong> ${selectedCuenta.email || 'No especificado'}</p>
        <p><strong>Teléfono:</strong> ${selectedCuenta.telefono || 'No especificado'}</p>
      </div>
      
      <div class="bloque">
        <h3>Estado de Cuenta</h3>
        ${selectedCuenta.saldo > 0 
          ? '<p class="balance-deudor">Saldo Deudor: $' + selectedCuenta.saldo.toLocaleString('es-AR') + '</p>'
          : '<p class="balance-al-dia">✓ Cuenta al Día</p>'
        }
        <p><strong>Último movimiento:</strong> ${new Date(selectedCuenta.ultimo_pago).toLocaleDateString('es-AR')}</p>
        <p><strong>Días transcurridos:</strong> ${Math.floor((new Date().getTime() - new Date(selectedCuenta.ultimo_pago).getTime()) / (1000 * 3600 * 24))} días</p>
      </div>
    </div>
    
    <h3 style="font-weight: bold; color: #2c3e50; margin-bottom: 10px; text-decoration: underline;">Historial de Movimientos</h3>
    <table class="tabla-movimientos">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Concepto</th>
          <th>Tipo</th>
          <th class="text-derecha">Monto</th>
          <th class="text-derecha">Saldo</th>
        </tr>
      </thead>
      <tbody>
        ${movimientosHTML}
      </tbody>
    </table>
    
    <div class="resumen">
      <h3>Resumen Financiero</h3>
      <div class="resumen-fila">
        <span>Total Débitos:</span>
        <strong>${selectedCuenta.saldo === 0 ? '$64.000' : '$50.000'}</strong>
      </div>
      <div class="resumen-fila">
        <span>Total Créditos:</span>
        <strong>${selectedCuenta.saldo === 0 ? '$64.000' : '$0'}</strong>
      </div>
      <div class="resumen-fila" style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 10px; margin-top: 10px; font-size: 14px;">
        <span>Saldo Final:</span>
        <strong>${selectedCuenta.saldo === 0 ? '$0 (Al Día)' : '$' + selectedCuenta.saldo.toLocaleString('es-AR') + ' (Deudor)'}</strong>
      </div>
    </div>
    
    <div class="pie">
      <p>Documento generado automáticamente el ${new Date().toLocaleDateString('es-AR')} a las ${new Date().toLocaleTimeString('es-AR')}</p>
      <p>Para consultas, contáctese con Herrería Malabia S.H.</p>
    </div>
  </div>
</body>
</html>`;
                    
                    printWindow.document.write(htmlContent);
                    printWindow.document.close();
                    setTimeout(() => printWindow.print(), 250);
                  }}
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                >
                  <span>📄</span>
                  <span>Imprimir Estado</span>
                </button>
                <button
                  onClick={() => setSelectedCuenta(null)}
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 font-medium"
                >
                  <span>✕</span>
                  <span>Cerrar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] px-6 py-4 rounded-lg shadow-lg text-white font-semibold transition-all animate-slide-in ${
          toast.type === 'success' ? 'bg-green-600' : 
          toast.type === 'error' ? 'bg-red-600' : 
          'bg-blue-600'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
