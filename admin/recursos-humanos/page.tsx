'use client';
import { jsPDF } from "jspdf";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRequireEmployee } from '@/contexts/AuthContext';
import KpiCard from '../../../components/rh/KpiCard';
import { 
  ArrowLeft,
  Users2,
  Clock,
  Calculator,
  Calendar,
  User,
  Phone,
  Mail,
  Timer,
  Edit,
  Eye,
  Plus,
  MessageCircle
} from 'lucide-react';

export default function RecursosHumanos() {
  const auth = useRequireEmployee();
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState('empleados');
  const [liquidacionSearch, setLiquidacionSearch] = useState('');

  // Actualizar el título de la página
  useEffect(() => {
    document.title = 'Recursos Humanos - Herrería Malabia S.H.';
  }, []);

  // Manejar parámetros de query para acciones rápidas
  useEffect(() => {
    const view = searchParams.get('view');
    
    if (view === 'empleados') {
      setActiveSection('empleados');
    }
  }, [searchParams]);

  const secciones = [
    {
      id: 'empleados',
      titulo: 'Registro de Empleados',
      icon: Users2,
      descripcion: 'Gestión de personal y datos'
    },
    {
      id: 'asistencia',
      titulo: 'Control de Asistencia',
      icon: Clock,
      descripcion: 'Horarios y asistencia diaria'
    },
    {
      id: 'horas',
      titulo: 'Cálculo de Horas',
      icon: Timer,
      descripcion: 'Horas trabajadas y extras'
    },
    {
      id: 'liquidacion',
      titulo: 'Liquidación de Sueldos',
      icon: Calculator,
      descripcion: 'Cálculo de haberes y descuentos'
    },
    {
      id: 'vacaciones',
      titulo: 'Gestión de Vacaciones',
      icon: Calendar,
      descripcion: 'Períodos y solicitudes'
    }
  ];

  // Empleados (estado) — cargar desde localStorage si existe, si no usar valores por defecto
  const defaultEmpleados = [
    { id: 1, nombre: 'Juan', apellido: 'Acosta', dni: '', telefono: '', email: 'juan.acosta@herreria.com', puesto: 'Herrero', fechaIngreso: '2023-01-01', salario: 80000, horasPorDia: 8, activo: true },
    { id: 2, nombre: 'Antonio', apellido: 'Brandan', dni: '', telefono: '', email: 'antonio.brandan@herreria.com', puesto: 'Herrero', fechaIngreso: '2023-01-01', salario: 80000, horasPorDia: 8, activo: true },
    { id: 3, nombre: 'Germán', apellido: 'Acuña', dni: '', telefono: '', email: 'german.acuna@herreria.com', puesto: 'Herrero', fechaIngreso: '2023-01-01', salario: 80000, horasPorDia: 8, activo: true },
    { id: 4, nombre: 'Gustavo', apellido: 'Saracho', dni: '', telefono: '', email: 'gustavo.saracho@herreria.com', puesto: 'Herrero', fechaIngreso: '2023-01-01', salario: 80000, horasPorDia: 8, activo: true },
    { id: 5, nombre: 'Claudio', apellido: 'Mamami', dni: '', telefono: '', email: 'claudio.mamami@herreria.com', puesto: 'Herrero', fechaIngreso: '2023-01-01', salario: 80000, horasPorDia: 8, activo: true },
    { id: 6, nombre: 'Enrique', apellido: 'Morales', dni: '', telefono: '', email: 'enrique.morales@herreria.com', puesto: 'Herrero', fechaIngreso: '2023-01-01', salario: 80000, horasPorDia: 8, activo: true },
    { id: 7, nombre: 'Jose', apellido: 'Coronel', dni: '', telefono: '', email: 'jose.coronel@herreria.com', puesto: 'Herrero', fechaIngreso: '2023-01-01', salario: 80000, horasPorDia: 8, activo: true },
  ];

  const [empleados, setEmpleados] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('rh_empleados');
        if (saved) return JSON.parse(saved);
      }
    } catch (err) {
      console.warn('No se pudo leer empleados desde localStorage:', err);
    }
    return defaultEmpleados;
  });

  // Persistir empleados en localStorage cuando cambian
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('rh_empleados', JSON.stringify(empleados));
      }
    } catch (err) {
      console.warn('No se pudo guardar empleados en localStorage:', err);
    }
  }, [empleados]);

  const empleadosActivos = empleados.filter((emp: Employee) => emp.activo);
  const [empleadosFilter, setEmpleadosFilter] = useState<'activos' | 'inactivos' | 'todos'>('activos');
  const empleadosFiltrados = empleados.filter((emp: Employee) => {
    if (empleadosFilter === 'activos') return emp.activo;
    if (empleadosFilter === 'inactivos') return !emp.activo;
    return true;
  });

  // Definición del tipo Employee
  type Employee = {
    id: number;
    nombre: string;
    apellido: string;
    dni: string;
    telefono: string;
    email: string;
    puesto: string;
    fechaIngreso: string;
    salario: number;
    horasPorDia: number;
    activo: boolean;
  };

  type Vacacion = {
    empleadoId: number;
    diasDisponibles: number;
    diasTomados: number;
  };

  type RegistroAsistencia = {
    id: number;
    empleadoId: number;
    fecha: string;
    entrada: string;
    salida: string;
    presente: boolean;
    horas: number;
    horasExtras: number;
    descuentos: number;
  };

  type LiquidacionDetalle = {
    empleadoNombre: string;
    fecha: string;
    sueldoBasico: number;
    horasExtras: number;
    valorHoraExtra: number;
    descuentos: number;
    totalNeto: number;
    detalle: string;
  };

  // Estados para modales y empleado seleccionado
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLiquidacionDetalleModal, setShowLiquidacionDetalleModal] = useState(false);
  const [liquidacionDetalle, setLiquidacionDetalle] = useState<LiquidacionDetalle | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);

  // Handler para ver empleado
  const handleViewEmployee = (emp: Employee) => {
    setSelectedEmployee(emp);
    setShowViewModal(true);
  };

  // Handler para editar empleado
  const handleEditEmployee = (emp: Employee) => {
    setEditEmployee(emp);
    setShowEditModal(true);
  };


  // Guardar edición
  const handleSaveEditEmployee = () => {
    if (editEmployee) {
      // Si la fecha viene en formato yyyy-mm-dd, se guarda tal cual
      // Si viene en otro formato, convertir correctamente
      let fechaIngreso = editEmployee.fechaIngreso;
      // Si la fecha tiene formato dd/mm/yyyy, convertir a yyyy-mm-dd
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(fechaIngreso)) {
        const [dia, mes, anio] = fechaIngreso.split('/');
        fechaIngreso = `${anio}-${mes}-${dia}`;
      }
      setEmpleados((prev: Employee[]) => prev.map((e: Employee) => e.id === editEmployee.id ? { ...editEmployee, fechaIngreso } : e));
    }
    setShowEditModal(false);
    setEditEmployee(null);
  };

  // Toast notification
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: '', visible: false }), 3000);
  };

  // Estado + formulario para crear nuevo empleado
  const [showNewEmployeeModal, setShowNewEmployeeModal] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    nombre: '', apellido: '', dni: '', telefono: '', email: '', puesto: '', fechaIngreso: '', salario: '', horasPorDia: 8
  });

  const handleOpenNewEmployee = () => {
    setNewEmployee({ nombre: '', apellido: '', dni: '', telefono: '', email: '', puesto: '', fechaIngreso: '', salario: '', horasPorDia: 8 });
    setShowNewEmployeeModal(true);
  };

  const handleSaveNewEmployee = () => {
    if (!newEmployee.nombre || !newEmployee.apellido) {
      alert('Ingrese nombre y apellido del empleado');
      return;
    }
    const emp = {
      id: Date.now(),
      nombre: newEmployee.nombre,
      apellido: newEmployee.apellido,
      dni: newEmployee.dni,
      telefono: newEmployee.telefono,
      email: newEmployee.email,
      puesto: newEmployee.puesto || 'Herrero',
      fechaIngreso: newEmployee.fechaIngreso || getTodayString(),
      salario: Number(newEmployee.salario) || 0,
      horasPorDia: Number(newEmployee.horasPorDia) || 8,
      activo: true
    };
    setEmpleados((prev: Employee[]) => [...prev, emp]);
    setShowNewEmployeeModal(false);
  };

  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const [registrosAsistencia, setRegistrosAsistencia] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('rh_registros_asistencia');
        if (saved) return JSON.parse(saved);
      }
    } catch (err) {
      console.warn('No se pudo leer registros de asistencia desde localStorage:', err);
    }
    // Generar fecha dentro del initializer para garantizar zona horaria local
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    
    return [
      { id: 1, empleadoId: 1, fecha: todayStr, entrada: '08:00', salida: '17:00', presente: true, horas: 8, horasExtras: 0, descuentos: 0 },
      { id: 2, empleadoId: 2, fecha: todayStr, entrada: '08:15', salida: '17:00', presente: true, horas: 7.75, horasExtras: 0, descuentos: 0 },
      { id: 3, empleadoId: 3, fecha: todayStr, entrada: '08:00', salida: '18:00', presente: true, horas: 9, horasExtras: 0, descuentos: 0 }
    ];
  });

  // Estado para gestión de vacaciones
  const [vacacionesSearch, setVacacionesSearch] = useState('');
  const [vacacionesAntiguedadMin, setVacacionesAntiguedadMin] = useState<'todos' | '0-1' | '1-3' | '3-5' | '5+'>('todos');
  const [vacaciones, setVacaciones] = useState<Vacacion[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('rh_vacaciones');
        if (saved) return JSON.parse(saved);
      }
    } catch (err) {
      console.warn('No se pudo leer vacaciones desde localStorage:', err);
    }
    return empleadosActivos.map((emp: Employee) => ({ empleadoId: emp.id, diasDisponibles: 20, diasTomados: 0 }));
  });
  const [attendanceDate, setAttendanceDate] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [attendanceEmployeeId, setAttendanceEmployeeId] = useState<number | null>(null);
  const [attendanceEntrada, setAttendanceEntrada] = useState<string>('');
  const [attendanceSalida, setAttendanceSalida] = useState<string>('');

  // Validar fecha al cambiar
  useEffect(() => {
    if (!attendanceDate) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      setAttendanceDate(`${year}-${month}-${day}`);
    }
  }, [attendanceDate]);

  const openAttendanceModal = () => {
    setAttendanceDate(getTodayString());
    setAttendanceEmployeeId(empleadosActivos.length ? empleadosActivos[0].id : null);
    setAttendanceEntrada('');
    setAttendanceSalida('');
    setShowAttendanceModal(true);
  };

  // Mantener vacaciones sincronizadas cuando cambian los empleados (evita perder registros al recargar desde localStorage)
  useEffect(() => {
    setVacaciones((prev: Vacacion[]) => {
      return empleadosActivos.map((emp: Employee) => {
        const existing = prev.find((v: Vacacion) => v.empleadoId === emp.id);
        return existing ? existing : { empleadoId: emp.id, diasDisponibles: 20, diasTomados: 0 };
      });
    });
  }, [empleados]);

  // Persistir registros de asistencia en localStorage cuando cambian
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && registrosAsistencia && registrosAsistencia.length > 0) {
        const dataToSave = JSON.stringify(registrosAsistencia);
        localStorage.setItem('rh_registros_asistencia', dataToSave);
        console.log('Guardado registrosAsistencia:', registrosAsistencia);
      }
    } catch (err) {
      console.error('Error guardando registros de asistencia:', err);
    }
  }, [registrosAsistencia]);

  // Persistir vacaciones en localStorage cuando cambian
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('rh_vacaciones', JSON.stringify(vacaciones));
      }
    } catch (err) {
      console.warn('No se pudo guardar vacaciones en localStorage:', err);
    }
  }, [vacaciones]);

  const formatNowTime = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    return `${hh}:${mm}`;
  };

  const computeHours = (entrada: string | null, salida: string | null) => {
    if (!entrada || !salida) return 0;
    const [eh, em] = entrada.split(':').map(Number);
    const [sh, sm] = salida.split(':').map(Number);
    const start = eh + em/60;
    const end = sh + sm/60;
    const diff = Math.max(0, end - start);
    return Math.round(diff * 100) / 100;
  };

  const registerEntradaSalida = () => {
    if (!attendanceEmployeeId) {
      alert('Seleccione un empleado');
      return;
    }
    if (!attendanceEntrada && !attendanceSalida) {
      alert('Ingrese al menos un horario de entrada o salida');
      return;
    }
    const fecha = attendanceDate;
    const empleadoId = attendanceEmployeeId;
    // Si hay entrada y salida, calcular horas
    const horas = computeHours(attendanceEntrada || null, attendanceSalida || null);
    const nuevo = {
      id: Date.now(),
      empleadoId,
      fecha,
      entrada: attendanceEntrada || '',
      salida: attendanceSalida || '',
      presente: true,
      horas,
      horasExtras: 0,
      descuentos: 0
    };
    setRegistrosAsistencia((prev: RegistroAsistencia[]) => [nuevo, ...prev]);
    setShowAttendanceModal(false);
  };

  const asistenciaDelDia = registrosAsistencia.filter((r: RegistroAsistencia) => r.fecha === attendanceDate);
  const asistenciaPresentesDelDia = asistenciaDelDia.filter((r: RegistroAsistencia) => r.presente).length;
  const asistenciaHorasDelDia = asistenciaDelDia.reduce((sum: number, r: RegistroAsistencia) => sum + (r.horas || 0), 0);

  const empleadosInactivos = empleados.filter((emp: Employee) => !emp.activo).length;

  const liquidacionResumen = empleadosActivos.reduce((acc, emp: Employee) => {
    const registro = registrosAsistencia.find((r: RegistroAsistencia) => r.empleadoId === emp.id && r.fecha === attendanceDate);
    const horasExtras = registro ? registro.horasExtras ?? 0 : 0;
    const descuentos = registro?.descuentos ?? 0;
    const valorHoraExtra = 3000;
    const totalNeto = emp.salario + (horasExtras * valorHoraExtra) - descuentos;

    acc.nominaNeta += totalNeto;
    acc.totalDescuentos += descuentos;
    acc.totalHorasExtras += horasExtras;
    return acc;
  }, { nominaNeta: 0, totalDescuentos: 0, totalHorasExtras: 0 });

  const vacacionesResumen = empleadosActivos.reduce((acc, emp: Employee) => {
    const anioIngreso = parseInt(emp.fechaIngreso.slice(0, 4));
    const anioActual = new Date().getFullYear();
    const añosAntiguedad = anioActual - anioIngreso;
    const diasVacaciones = CalcularVacaciones(añosAntiguedad);
    const registro = vacaciones.find(v => v.empleadoId === emp.id);
    const diasTomados = registro ? registro.diasTomados : 0;
    const diasDisponibles = Math.max(0, diasVacaciones - diasTomados);

    acc.totalDisponibles += diasDisponibles;
    acc.totalTomados += diasTomados;
    return acc;
  }, { totalDisponibles: 0, totalTomados: 0 });

  /**
 * Calcula los días de vacaciones de un empleado según la ley laboral argentina.
 * @param añosAntiguedad - Años de antigüedad del empleado (entero)
 * @returns Número de días de vacaciones correspondientes
 *
 * Reglas:
 * - 0 a 5 años: 14 días
 * - Más de 5 y hasta 10 años: 21 días
 * - Más de 10 y hasta 20 años: 28 días
 * - Más de 20 años: 35 días
 * - Si la antigüedad es negativa, devuelve 0
 */
function CalcularVacaciones(añosAntiguedad: number): number {
  if (añosAntiguedad < 0) return 0; // No puede haber antigüedad negativa
  if (añosAntiguedad <= 5) return 14;
  if (añosAntiguedad <= 10) return 21;
  if (añosAntiguedad <= 20) return 28;
  return 35;
}

  if (auth.isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast.visible && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded shadow-lg text-sm font-medium">
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
                className="flex items-center space-x-2 text-gray-600 hover:text-indigo-600 transition"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Volver al Panel de Gestión</span>
              </Link>
              <div className="h-6 border-l border-gray-300"></div>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Users2 className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Recursos Humanos</h1>
                  <p className="text-sm text-gray-600">Gestión integral del personal</p>
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
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                      : 'border-transparent text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
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
        {showViewModal && selectedEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Detalle del Empleado</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-gray-900"><span className="font-bold">Nombre:</span> {selectedEmployee.nombre}</div>
                <div className="text-gray-900"><span className="font-bold">Apellido:</span> {selectedEmployee.apellido}</div>
                <div className="text-gray-900"><span className="font-bold">DNI:</span> {selectedEmployee.dni}</div>
                <div className="text-gray-900"><span className="font-bold">Teléfono:</span> {selectedEmployee.telefono}</div>
                <div className="text-gray-900"><span className="font-bold">Email:</span> {selectedEmployee.email}</div>
                <div className="text-gray-900"><span className="font-bold">Puesto:</span> {selectedEmployee.puesto}</div>
                <div className="text-gray-900"><span className="font-bold">Ingreso:</span> {selectedEmployee.fechaIngreso}</div>
                <div className="text-gray-900"><span className="font-bold">Salario:</span> ${selectedEmployee.salario}</div>
                <div className="text-gray-900"><span className="font-bold">Estado:</span> {selectedEmployee.activo ? 'Activo' : 'Inactivo'}</div>
              </div>
              <div className="mt-4 flex justify-end">
                <button onClick={() => setShowViewModal(false)} className="px-4 py-2 bg-indigo-600 text-white rounded">Cerrar</button>
              </div>
            </div>
          </div>
        )}

        {showEditModal && editEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Editar Empleado</h3>
              <div className="grid grid-cols-2 gap-3">
                <input value={editEmployee.nombre} onChange={e => setEditEmployee({ ...editEmployee, nombre: e.target.value })} placeholder="Nombre" className="px-3 py-2 border rounded" />
                <input value={editEmployee.apellido} onChange={e => setEditEmployee({ ...editEmployee, apellido: e.target.value })} placeholder="Apellido" className="px-3 py-2 border rounded" />
                <input value={editEmployee.dni} onChange={e => setEditEmployee({ ...editEmployee, dni: e.target.value })} placeholder="DNI" className="px-3 py-2 border rounded" />
                <input value={editEmployee.telefono} onChange={e => setEditEmployee({ ...editEmployee, telefono: e.target.value })} placeholder="Teléfono" className="px-3 py-2 border rounded" />
                <input value={editEmployee.email} onChange={e => setEditEmployee({ ...editEmployee, email: e.target.value })} placeholder="Email" className="px-3 py-2 border rounded" />
                <input value={editEmployee.puesto} onChange={e => setEditEmployee({ ...editEmployee, puesto: e.target.value })} placeholder="Puesto" className="px-3 py-2 border rounded" />
                <input type="date" value={editEmployee.fechaIngreso} onChange={e => setEditEmployee({ ...editEmployee, fechaIngreso: e.target.value })} min="1900-01-01" className="px-3 py-2 border rounded col-span-1" />
                <input value={editEmployee.salario} onChange={e => setEditEmployee({ ...editEmployee, salario: Number(e.target.value) })} placeholder="Salario" className="px-3 py-2 border rounded" />
                <select
                  value={editEmployee.activo ? 'activo' : 'inactivo'}
                  onChange={e => setEditEmployee({ ...editEmployee, activo: e.target.value === 'activo' })}
                  className="px-3 py-2 border rounded"
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                <button onClick={() => setShowEditModal(false)} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Cancelar</button>
                <button onClick={handleSaveEditEmployee} className="px-4 py-2 bg-indigo-600 text-white rounded">Guardar Cambios</button>
              </div>
            </div>
          </div>
        )}

        {showLiquidacionDetalleModal && liquidacionDetalle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Detalle de Liquidación</h3>
              <div className="space-y-2 text-sm text-gray-800">
                <p><span className="font-semibold">Empleado:</span> {liquidacionDetalle.empleadoNombre}</p>
                <p><span className="font-semibold">Fecha:</span> {liquidacionDetalle.fecha}</p>
                <p><span className="font-semibold">Sueldo básico:</span> ${liquidacionDetalle.sueldoBasico.toLocaleString()}</p>
                <p><span className="font-semibold">Horas extras:</span> {liquidacionDetalle.horasExtras}h × ${liquidacionDetalle.valorHoraExtra.toLocaleString()}</p>
                <p><span className="font-semibold">Descuentos:</span> ${liquidacionDetalle.descuentos.toLocaleString()}</p>
                <p><span className="font-semibold">Total neto:</span> ${liquidacionDetalle.totalNeto.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                <p className="text-xs text-gray-600 bg-gray-50 border rounded p-2 mt-2">{liquidacionDetalle.detalle}</p>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    setShowLiquidacionDetalleModal(false);
                    setLiquidacionDetalle(null);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'empleados' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Registro de Empleados</h2>
                <div className="flex items-center space-x-3">
                  <select
                    value={empleadosFilter}
                    onChange={(e) => setEmpleadosFilter(e.target.value as 'activos' | 'inactivos' | 'todos')}
                    className="px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  >
                    <option value="activos">Activos</option>
                    <option value="inactivos">Inactivos</option>
                    <option value="todos">Todos</option>
                  </select>
                  <button onClick={handleOpenNewEmployee} className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                    <MessageCircle className="w-4 h-4" />
                    <span>Nuevo Empleado</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <KpiCard label="Total empleados" value={empleados.length} />
                <KpiCard label="Activos" value={empleadosActivos.length} valueClassName="text-xl font-semibold text-green-700" />
                <KpiCard label="Inactivos" value={empleadosInactivos} valueClassName="text-xl font-semibold text-red-700" />
              </div>
            </div>
            
            {showNewEmployeeModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
                  <h3 className="text-lg font-semibold mb-4">Registrar Nuevo Empleado</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <input value={newEmployee.nombre} onChange={e => setNewEmployee({ ...newEmployee, nombre: e.target.value })} placeholder="Nombre" className="px-3 py-2 border rounded" />
                    <input value={newEmployee.apellido} onChange={e => setNewEmployee({ ...newEmployee, apellido: e.target.value })} placeholder="Apellido" className="px-3 py-2 border rounded" />
                    <input value={newEmployee.dni} onChange={e => setNewEmployee({ ...newEmployee, dni: e.target.value })} placeholder="DNI" className="px-3 py-2 border rounded" />
                    <input value={newEmployee.telefono} onChange={e => setNewEmployee({ ...newEmployee, telefono: e.target.value })} placeholder="Teléfono" className="px-3 py-2 border rounded" />
                    <input value={newEmployee.email} onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })} placeholder="Email" className="px-3 py-2 border rounded" />
                    <input value={newEmployee.puesto} onChange={e => setNewEmployee({ ...newEmployee, puesto: e.target.value })} placeholder="Puesto" className="px-3 py-2 border rounded" />
                    <input type="date" value={newEmployee.fechaIngreso} onChange={e => setNewEmployee({ ...newEmployee, fechaIngreso: e.target.value })} min="1900-01-01" className="px-3 py-2 border rounded col-span-1" />
                    <input value={newEmployee.salario} onChange={e => setNewEmployee({ ...newEmployee, salario: e.target.value })} placeholder="Salario" className="px-3 py-2 border rounded" />
                  </div>
                  <div className="mt-4 flex justify-end space-x-2">
                    <button onClick={() => setShowNewEmployeeModal(false)} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
                    <button onClick={handleSaveNewEmployee} className="px-4 py-2 bg-indigo-600 text-white rounded">Guardar Empleado</button>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Puesto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ingreso</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salario</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {empleadosFiltrados.map((empleado: Employee) => (
                    <tr key={empleado.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-indigo-600" />
                          </div>
                          <div className="ml-3">
                            <div className="font-medium text-gray-900">
                              {empleado.nombre} {empleado.apellido}
                            </div>
                            <div className="text-sm text-gray-500">DNI: {empleado.dni}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{empleado.puesto}</div>
                        <div className="text-sm text-gray-500">{empleado.horasPorDia}h por día</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1 mb-1">
                          <Phone className="w-3 h-3" />
                          <span>{empleado.telefono}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Mail className="w-3 h-3" />
                          <span>{empleado.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {empleado.fechaIngreso}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        ${empleado.salario.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          empleado.activo 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {empleado.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button className="p-1 text-blue-600 hover:bg-blue-100 rounded" onClick={() => handleViewEmployee(empleado)}>
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-green-600 hover:bg-green-100 rounded" onClick={() => handleEditEmployee(empleado)}>
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSection === 'asistencia' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Control de Asistencia y Horarios</h2>
                  <div className="flex items-center space-x-3">
                  <input 
                    type="date" 
                    value={attendanceDate}
                    onChange={e => setAttendanceDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  />
                  <button onClick={openAttendanceModal} className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                    <Plus className="w-4 h-4" />
                    <span>Registrar Entrada/Salida</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <KpiCard label="Registros del día" value={asistenciaDelDia.length} />
                <KpiCard label="Presentes" value={asistenciaPresentesDelDia} valueClassName="text-xl font-semibold text-green-700" />
                <KpiCard label="Horas registradas" value={`${asistenciaHorasDelDia.toFixed(2)}h`} valueClassName="text-xl font-semibold text-indigo-700" />
              </div>
            </div>

              <div className="p-6">
                {showAttendanceModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                      <h3 className="text-lg font-semibold mb-4">Registrar Entrada/Salida</h3>
                      <div className="grid grid-cols-1 gap-3">
                        <label className="text-sm text-gray-700">Empleado</label>
                        <select value={attendanceEmployeeId ?? ''} onChange={e => setAttendanceEmployeeId(Number(e.target.value))} className="px-3 py-2 border rounded">
                          {empleadosActivos.map((emp: Employee) => (
                            <option key={emp.id} value={emp.id}>{emp.nombre} {emp.apellido}</option>
                          ))}
                        </select>
                        <label className="text-sm text-gray-700">Fecha</label>
                        <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} className="px-3 py-2 border rounded" />
                        <label className="text-sm text-gray-700">Horario de Entrada</label>
                        <input type="time" value={attendanceEntrada} onChange={e => setAttendanceEntrada(e.target.value)} className="px-3 py-2 border rounded" />
                        <label className="text-sm text-gray-700">Horario de Salida</label>
                        <input type="time" value={attendanceSalida} onChange={e => setAttendanceSalida(e.target.value)} className="px-3 py-2 border rounded" />
                      </div>
                      <div className="mt-4 flex justify-end space-x-2">
                        <button onClick={() => setShowAttendanceModal(false)} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
                        <button onClick={registerEntradaSalida} className="px-4 py-2 bg-indigo-600 text-white rounded">Registrar Entrada/Salida</button>
                      </div>
                    </div>
                  </div>
                )}
              {/* Tarjetas de resumen eliminadas por solicitud */}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entrada</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salida</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horas</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {registrosAsistencia.filter((r: RegistroAsistencia) => r.fecha === attendanceDate).map((registro: RegistroAsistencia) => {
                      const empleado = empleadosActivos.find((e: Employee) => e.id === registro.empleadoId);
                      return (
                        <tr key={registro.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">
                              {empleado?.nombre} {empleado?.apellido}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {registro.entrada || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {registro.salida || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {registro.horas}h
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              registro.presente
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {registro.presente ? 'Presente' : 'Ausente'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'horas' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-blue-900 mb-4">Horas trabajadas por empleado</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <KpiCard
                label="Horas del día"
                value={`${asistenciaHorasDelDia.toFixed(2)}h`}
                cardClassName="bg-gray-50 border rounded-lg p-3"
                valueClassName="text-xl font-semibold text-blue-700"
              />
              <KpiCard
                label="Empleados con registro"
                value={asistenciaDelDia.length}
                cardClassName="bg-gray-50 border rounded-lg p-3"
              />
              <KpiCard
                label="Promedio por registro"
                value={`${asistenciaDelDia.length ? (asistenciaHorasDelDia / asistenciaDelDia.length).toFixed(2) : '0.00'}h`}
                cardClassName="bg-gray-50 border rounded-lg p-3"
                valueClassName="text-xl font-semibold text-indigo-700"
              />
            </div>
            <form onSubmit={e => {
              e.preventDefault();
            }}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horas Trabajadas</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {empleadosActivos.length === 0 ? (
                      <tr><td colSpan={3} className="px-6 py-4 text-center text-gray-400">No hay empleados registrados</td></tr>
                    ) : empleadosActivos.map((emp: Employee) => {
                      let horas = 0;
                      // Sumar todas las horas del empleado para el día seleccionado
                      const registrosDelEmpleado = registrosAsistencia.filter((r: RegistroAsistencia) => r.empleadoId === emp.id && r.fecha === attendanceDate);
                      horas = registrosDelEmpleado.reduce((sum: number, r: RegistroAsistencia) => sum + (r.horas || 0), 0);
                      const registro = registrosDelEmpleado.length > 0 ? registrosDelEmpleado[0] : null;
                      return (
                        <tr key={emp.id}>
                          <td className="px-6 py-4 text-gray-900 font-medium">{emp.nombre} {emp.apellido}</td>
                          <td className="px-6 py-4">
                            <input
                              type="number"
                              min={0}
                              value={horas}
                              onChange={e => {
                                const valor = Number(e.target.value);
                                setRegistrosAsistencia((prev: RegistroAsistencia[]) => {
                                  // Si ya existe registro para la fecha, actualiza; si no, agrega uno nuevo
                                  const otros = prev.filter((r: RegistroAsistencia) => !(r.empleadoId === emp.id && r.fecha === attendanceDate));
                                  const actual = registro ? registro : {
                                    id: Date.now(),
                                    empleadoId: emp.id,
                                    fecha: attendanceDate,
                                    entrada: '',
                                    salida: '',
                                    presente: true,
                                    horas: 0,
                                    horasExtras: 0,
                                    descuentos: 0
                                  };
                                  return [
                                    ...otros,
                                    {
                                      ...actual,
                                      horas: valor
                                    }
                                  ];
                                });
                              }}
                              className="px-2 py-1 border rounded w-20"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <button
                              type="button"
                              className="px-3 py-1 bg-indigo-600 text-white rounded"
                              onClick={() => {
                                showToast('Horas actualizadas correctamente');
                              }}
                            >Guardar</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </form>
          </div>
        )}

        {activeSection === 'liquidacion' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-green-900 mb-4">Liquidación de Sueldos</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <KpiCard
                label={`Nómina neta (${attendanceDate})`}
                value={`$${liquidacionResumen.nominaNeta.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                cardClassName="bg-green-50 border border-green-200 rounded-lg p-3"
                labelClassName="text-xs text-gray-600"
                valueClassName="text-xl font-semibold text-green-700"
              />
              <KpiCard
                label="Descuentos totales"
                value={`$${liquidacionResumen.totalDescuentos.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                cardClassName="bg-red-50 border border-red-200 rounded-lg p-3"
                labelClassName="text-xs text-gray-600"
                valueClassName="text-xl font-semibold text-red-700"
              />
              <KpiCard
                label="Horas extras totales"
                value={`${liquidacionResumen.totalHorasExtras}h`}
                cardClassName="bg-blue-50 border border-blue-200 rounded-lg p-3"
                labelClassName="text-xs text-gray-600"
                valueClassName="text-xl font-semibold text-blue-700"
              />
            </div>
            <div className="mb-4">
              <input
                type="text"
                value={liquidacionSearch}
                onChange={(e) => setLiquidacionSearch(e.target.value)}
                placeholder="Buscar empleado..."
                className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sueldo Básico</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horas Extras</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descuentos</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Neto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {empleadosActivos.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-400">No hay empleados registrados</td></tr>
                  ) : empleadosActivos
                    .filter((emp: Employee) => {
                      const q = liquidacionSearch.trim().toLowerCase();
                      if (!q) return true;
                      return `${emp.nombre} ${emp.apellido}`.toLowerCase().includes(q);
                    })
                    .map((emp: Employee) => {
                    let horas = 0;
                    // Sumar todas las horas del empleado para el día seleccionado
                    const registrosDelEmpleado = registrosAsistencia.filter((r: RegistroAsistencia) => r.empleadoId === emp.id && r.fecha === attendanceDate);
                    horas = registrosDelEmpleado.reduce((sum: number, r: RegistroAsistencia) => sum + (r.horas || 0), 0);
                    const registro = registrosDelEmpleado.length > 0 ? registrosDelEmpleado[0] : null;
                    const sueldoBasico = emp.salario;
                    const horasExtras = registro ? registro.horasExtras ?? 0 : 0;
                    const valorHoraExtra = 3000;
                    // Descuentos: ausencias, adelantos, retenciones
                    const descuentos = registro?.descuentos ?? 0;
                    // Detalle de cálculo
                    const detalle = `Sueldo: $${sueldoBasico.toLocaleString()} + Horas extras: $${(horasExtras * valorHoraExtra).toLocaleString()} - Descuentos: $${descuentos.toLocaleString()}`;
                    const totalNeto = sueldoBasico + (horasExtras * valorHoraExtra) - descuentos;
                    return (
                      <tr key={emp.id}>
                        <td className="px-6 py-4 text-gray-900 font-medium">{emp.nombre} {emp.apellido}</td>
                        <td className="px-6 py-4 text-gray-900 font-medium">${sueldoBasico.toLocaleString()}</td>
                        <td className="px-6 py-4 text-gray-900 font-medium">
                          <input
                            type="number"
                            min={0}
                            value={horasExtras}
                            onChange={e => {
                              const valor = Number(e.target.value);
                              setRegistrosAsistencia((prev: RegistroAsistencia[]) => {
                                const otros = prev.filter((r: RegistroAsistencia) => !(r.empleadoId === emp.id && r.fecha === attendanceDate));
                                const actual = registro ? registro : {
                                  id: Date.now(),
                                  empleadoId: emp.id,
                                  fecha: attendanceDate,
                                  entrada: '',
                                  salida: '',
                                  presente: true,
                                  horas: emp.horasPorDia,
                                  horasExtras: 0,
                                  descuentos: 0
                                };
                                return [
                                  ...otros,
                                  {
                                    ...actual,
                                    horasExtras: valor
                                  }
                                ];
                              });
                            }}
                            className="px-2 py-1 border rounded w-16"
                          /> h
                        </td>
                        <td className="px-6 py-4 text-gray-900 font-medium">
                          <input
                            type="number"
                            min={0}
                            value={descuentos}
                            onChange={e => {
                              const valor = Number(e.target.value);
                              setRegistrosAsistencia((prev: RegistroAsistencia[]) => {
                                const otros = prev.filter((r: RegistroAsistencia) => !(r.empleadoId === emp.id && r.fecha === attendanceDate));
                                const actual = registro ? registro : {
                                  id: Date.now(),
                                  empleadoId: emp.id,
                                  fecha: attendanceDate,
                                  entrada: '',
                                  salida: '',
                                  presente: true,
                                  horas: emp.horasPorDia,
                                  horasExtras: 0,
                                  descuentos: 0
                                };
                                return [
                                  ...otros,
                                  {
                                    ...actual,
                                    descuentos: valor
                                  }
                                ];
                              });
                            }}
                            className="px-2 py-1 border rounded w-20"
                          />
                        </td>
                        <td className="px-6 py-4 text-gray-900 font-bold">${totalNeto.toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                        <td className="px-6 py-4 flex gap-2">
                          <button
                            type="button"
                            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded text-sm font-medium transition"
                            onClick={() => {
                              setLiquidacionDetalle({
                                empleadoNombre: `${emp.nombre} ${emp.apellido}`,
                                fecha: attendanceDate,
                                sueldoBasico,
                                horasExtras,
                                valorHoraExtra,
                                descuentos,
                                totalNeto,
                                detalle
                              });
                              setShowLiquidacionDetalleModal(true);
                            }}
                          >
                            Ver
                          </button>
                          <button
                            type="button"
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition"
                            onClick={() => {
                              const liquidacion = {
                                empleadoId: emp.id,
                                empleadoNombre: `${emp.nombre} ${emp.apellido}`,
                                fecha: attendanceDate,
                                sueldoBasico,
                                horasExtras,
                                descuentos,
                                totalNeto,
                                guardadoEn: new Date().toLocaleString()
                              };
                              try {
                                const liquidaciones = JSON.parse(localStorage.getItem('rh_liquidaciones') || '[]');
                                const existe = liquidaciones.findIndex((l: any) => l.empleadoId === emp.id && l.fecha === attendanceDate);
                                if (existe >= 0) {
                                  liquidaciones[existe] = liquidacion;
                                } else {
                                  liquidaciones.push(liquidacion);
                                }
                                localStorage.setItem('rh_liquidaciones', JSON.stringify(liquidaciones));
                                showToast('Liquidación guardada exitosamente');
                              } catch (e) {
                                showToast('Error al guardar');
                              }
                            }}
                          >Guardar</button>
                          <button
                            type="button"
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition"
                            onClick={() => {
                              const doc = new jsPDF();
                              const pageWidth = doc.internal.pageSize.getWidth();
                              const pageHeight = doc.internal.pageSize.getHeight();
                              
                              // Colores
                              const colorOrange = [234, 88, 12];
                              const colorGray = [55, 65, 81];
                              
                              // Header con fondo
                              doc.setFillColor(colorOrange[0], colorOrange[1], colorOrange[2]);
                              doc.rect(0, 0, pageWidth, 35, 'F');
                              
                              // Logo
                              try {
                                const img = new Image();
                                img.src = '/logo.jpg';
                                doc.addImage(img, 'JPEG', 10, 3, 25, 25);
                              } catch (e) {
                                console.log('Logo no disponible');
                              }
                              
                              // Título en negro
                              doc.setTextColor(0, 0, 0);
                              doc.setFontSize(16);
                              doc.text('HERRERÍA MALABIA S.H.', 45, 15);
                              doc.setFontSize(10);
                              doc.text('Recibo de Sueldo Liquidado', 45, 22);
                              
                              // Línea separadora
                              doc.setDrawColor(colorOrange[0], colorOrange[1], colorOrange[2]);
                              doc.setLineWidth(0.5);
                              doc.line(0, 37, pageWidth, 37);
                              
                              // Contenido
                              doc.setTextColor(colorGray[0], colorGray[1], colorGray[2]);
                              doc.setFontSize(11);
                              
                              let y = 45;
                              const spacing = 7;
                              
                              // Datos del empleado
                              doc.setFont('', 'bold');
                              doc.text('Datos del Empleado', 15, y);
                              y += spacing;
                              
                              doc.setFont('', 'normal');
                              doc.text(`Nombre: ${emp.nombre} ${emp.apellido}`, 15, y);
                              y += spacing;
                              doc.text(`Puesto: ${emp.puesto}`, 15, y);
                              y += spacing;
                              doc.text(`Fecha de Liquidación: ${new Date(attendanceDate).toLocaleDateString('es-AR')}`, 15, y);
                              y += spacing * 1.5;
                              
                              // Detalle de cálculo
                              doc.setFont('', 'bold');
                              doc.text('Detalle de Cálculo', 15, y);
                              y += spacing;
                              
                              doc.setFont('', 'normal');
                              doc.text(`Sueldo Básico:`, 15, y);
                              doc.text(`$${sueldoBasico.toLocaleString()}`, pageWidth - 20, y, { align: 'right' });
                              y += spacing;
                              
                              doc.text(`Horas Extras (${horasExtras}h × $${valorHoraExtra.toLocaleString()}):`, 15, y);
                              doc.text(`$${(horasExtras * valorHoraExtra).toLocaleString()}`, pageWidth - 20, y, { align: 'right' });
                              y += spacing;
                              
                              doc.setTextColor(colorGray[0], colorGray[1], colorGray[2]);
                              doc.text(`Descuentos:`, 15, y);
                              doc.text(`-$${descuentos.toLocaleString()}`, pageWidth - 20, y, { align: 'right' });
                              y += spacing;
                              
                              // Total neto con fondo
                              doc.setFillColor(colorOrange[0], colorOrange[1], colorOrange[2]);
                              doc.rect(15, y - 3, pageWidth - 30, 8, 'F');
                              
                              doc.setTextColor(255, 255, 255);
                              doc.setFont('', 'bold');
                              doc.setFontSize(13);
                              doc.text(`TOTAL NETO A COBRAR: $${totalNeto.toLocaleString()}`, pageWidth / 2, y + 2, { align: 'center' });
                              
                              // Footer
                              doc.setTextColor(150, 150, 150);
                              doc.setFontSize(8);
                              doc.text(`Generado: ${new Date().toLocaleString('es-AR')}`, 15, pageHeight - 10);
                              doc.text('Herrería Malabia S.H. - Documento válido y generado automáticamente', pageWidth / 2, pageHeight - 10, { align: 'center' });
                              
                              doc.save(`recibo_sueldo_${emp.nombre}_${emp.apellido}_${attendanceDate}.pdf`);
                            }}
                          >Exportar PDF</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSection === 'vacaciones' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-blue-900 mb-4">Gestión de Vacaciones</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <KpiCard
                label="Días disponibles (equipo)"
                value={vacacionesResumen.totalDisponibles}
                cardClassName="bg-blue-50 border border-blue-200 rounded-lg p-3"
                labelClassName="text-xs text-gray-600"
                valueClassName="text-xl font-semibold text-blue-700"
              />
              <KpiCard
                label="Días tomados (equipo)"
                value={vacacionesResumen.totalTomados}
                cardClassName="bg-amber-50 border border-amber-200 rounded-lg p-3"
                labelClassName="text-xs text-gray-600"
                valueClassName="text-xl font-semibold text-amber-700"
              />
              <KpiCard
                label="Promedio disponible"
                value={`${empleadosActivos.length ? (vacacionesResumen.totalDisponibles / empleadosActivos.length).toFixed(1) : '0.0'} días`}
                cardClassName="bg-green-50 border border-green-200 rounded-lg p-3"
                labelClassName="text-xs text-gray-600"
                valueClassName="text-xl font-semibold text-green-700"
              />
            </div>
            <div className="flex flex-wrap gap-3 mb-4">
              <input
                type="text"
                value={vacacionesSearch}
                onChange={(e) => setVacacionesSearch(e.target.value)}
                placeholder="Buscar empleado..."
                className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 w-48"
              />
              <div className="flex items-center gap-2">
                <select
                  value={vacacionesAntiguedadMin}
                  onChange={(e) => setVacacionesAntiguedadMin(e.target.value as 'todos' | '0-1' | '1-3' | '3-5' | '5+')}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
                >
                  <option value="todos">Toda antigüedad</option>
                  <option value="0-1">6 meses – 1 año</option>
                  <option value="1-3">1–3 años</option>
                  <option value="3-5">3–5 años</option>
                  <option value="5+">5+ años</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ingreso</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Antigüedad</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Días de Vacaciones</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Días Tomados</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Días Disponibles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {empleadosActivos
                    .filter((emp: Employee) => {
                      const q = vacacionesSearch.trim().toLowerCase();
                      const nombreOk = !q || `${emp.nombre} ${emp.apellido}`.toLowerCase().includes(q);
                      const ingreso = new Date(emp.fechaIngreso);
                      const hoy = new Date();
                      const meses = (hoy.getFullYear() - ingreso.getFullYear()) * 12 + (hoy.getMonth() - ingreso.getMonth());
                      const anios = meses / 12;
                      const antiguedadOk = vacacionesAntiguedadMin === 'todos'
                        || (vacacionesAntiguedadMin === '0-1' && meses >= 6 && anios <= 1)
                        || (vacacionesAntiguedadMin === '1-3' && anios > 1 && anios <= 3)
                        || (vacacionesAntiguedadMin === '3-5' && anios > 3 && anios <= 5)
                        || (vacacionesAntiguedadMin === '5+' && anios > 5);
                      return nombreOk && antiguedadOk;
                    })
                    .map((emp: Employee) => {
                    // Calcular antigüedad en meses reales
                    const fechaIngreso = emp.fechaIngreso;
                    const ingresoDate = new Date(fechaIngreso);
                    const hoyDate = new Date();
                    const mesesAntiguedad = (hoyDate.getFullYear() - ingresoDate.getFullYear()) * 12 + (hoyDate.getMonth() - ingresoDate.getMonth());
                    const añosAntiguedad = Math.floor(mesesAntiguedad / 12);
                    const mesesRestantes = mesesAntiguedad % 12;
                    const antiguedadLabel = añosAntiguedad === 0
                      ? `${mesesAntiguedad} mes${mesesAntiguedad !== 1 ? 'es' : ''}`
                      : mesesRestantes === 0
                        ? `${añosAntiguedad} año${añosAntiguedad !== 1 ? 's' : ''}`
                        : `${añosAntiguedad} año${añosAntiguedad !== 1 ? 's' : ''} y ${mesesRestantes} mes${mesesRestantes !== 1 ? 'es' : ''}`;
                    const diasVacaciones = CalcularVacaciones(añosAntiguedad);
                    // Buscar registro de vacaciones
                    const registro = vacaciones.find(v => v.empleadoId === emp.id);
                    const diasTomados = registro ? registro.diasTomados : 0;
                    const diasDisponibles = diasVacaciones - diasTomados;
                    return (
                      <tr key={emp.id}>
                        <td className="px-6 py-4 text-gray-900 font-medium">{emp.nombre} {emp.apellido}</td>
                        <td className="px-6 py-4 text-gray-900">{emp.fechaIngreso}</td>
                        <td className="px-6 py-4 text-gray-900">{antiguedadLabel}</td>
                        <td className="px-6 py-4 font-bold text-blue-700">{diasVacaciones}</td>
                        <td className="px-6 py-4">
                          <input
                            type="number"
                            min={0}
                            max={diasVacaciones}
                            value={diasTomados}
                            onChange={e => {
                              const valor = Math.min(Number(e.target.value), diasVacaciones);
                              setVacaciones((prev: Vacacion[]) =>
                                prev.map(v => v.empleadoId === emp.id ? { ...v, diasTomados: valor } : v)
                              );
                            }}
                            className="px-2 py-1 border rounded w-20 text-gray-900"
                          />
                        </td>
                        <td className="px-6 py-4 font-bold text-green-700">{diasDisponibles}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}