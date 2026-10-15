/* ==========================================================================
   SNSP Gestión Inteligente · Configuración general
   Punto único para adaptar la aplicación a otras áreas del SNSP.
   ========================================================================== */
window.SNSP = window.SNSP || {};

SNSP.config = {
  appName: 'SNSP Gestión Inteligente',
  version: '2.1',
  unit: 'Inteligencia e Información',
  place: 'Querétaro',
  /* Clave de almacenamiento: se conserva la de la V1 para no perder datos. */
  storageKey: 'snsp-gestion-v1',
  uiKey: 'snsp-gestion-ui',
  schemaVersion: 2,
  /* Área de trabajo por defecto. Preparado para varias áreas (ver README). */
  defaultArea: 'Inteligencia e Información',
  areas: ['Inteligencia e Información'],
  /* Días de anticipación para marcar un compromiso como "por vencer". */
  dueSoonDays: 7,
  /* Máximo de movimientos guardados en el historial local. */
  logLimit: 300,
  /* Solo la vista publicada de prueba lo activa. */
  autoDemo: false
};

SNSP.catalog = {
  status: { pending: 'Pendiente', progress: 'En proceso', blocked: 'Bloqueada', done: 'Terminada' },
  statusOrder: ['pending', 'progress', 'blocked', 'done'],
  priority: { alta: 'Alta', media: 'Media', baja: 'Baja' },
  priorityOrder: ['alta', 'media', 'baja'],
  projectStatus: { active: 'Activo', paused: 'En pausa', closed: 'Concluido' },
  eventType: { reunion: 'Reunión', capacitacion: 'Capacitación', entrega: 'Entrega', otro: 'Otro' },
  semaforo: {
    late: 'Vencida',
    soon: 'Por vencer',
    ontime: 'En tiempo',
    done: 'Cumplida',
    none: 'Sin fecha'
  },
  entity: { project: 'Proyecto', task: 'Actividad', agreement: 'Acuerdo', event: 'Reunión', person: 'Responsable', data: 'Datos' }
};

/* Menú lateral. Para agregar un módulo: registrar aquí y en SNSP.views. */
SNSP.nav = [
  { group: 'Seguimiento', items: [
    { id: 'dashboard',  slug: 'tablero',     label: 'Tablero ejecutivo',     icon: 'dashboard', sub: 'Resumen de avance y cumplimiento del área' },
    { id: 'projects',   slug: 'proyectos',   label: 'Proyectos y metas',     icon: 'target',    sub: 'Plan de trabajo, responsables, prioridades y avance' },
    { id: 'tasks',      slug: 'actividades', label: 'Actividades',           icon: 'tasks',     sub: 'Entregables, fechas compromiso, evidencias y semáforo' }
  ]},
  { group: 'Agenda', items: [
    { id: 'calendar',   slug: 'calendario',  label: 'Calendario',            icon: 'calendar',  sub: 'Reuniones, entregas, acuerdos y metas por fecha' },
    { id: 'agreements', slug: 'acuerdos',    label: 'Acuerdos y compromisos', icon: 'clipboard', sub: 'Acuerdos de reunión, responsables y cumplimiento' }
  ]},
  { group: 'Análisis', items: [
    { id: 'reports',    slug: 'reportes',    label: 'Reportes',              icon: 'chart',     sub: 'Indicadores para reuniones de trabajo, exportación y respaldo' }
  ]}
];
