/* ==========================================================================
   Datos: carga, compatibilidad con la V1, guardado, historial y consultas.
   Estructura (compatible hacia atrás con snsp-gestion-v1):
   {
     projects:   [{id,name,goal,owner,target,progress, +start,priority,status,area}],
     tasks:      [{id,name,project,owner,due,status,evidence,detail, +priority,doneAt,area}],
     agreements: [{id,name,context,owner,due,status, +meetingDate,project,notes,area}],
     events:     [{id,name,type,date,time,place,participants,notes,area}]   (nuevo)
     log:        [{ts,action,entity,id,name}]                              (nuevo)
     meta:       {schemaVersion,area,created,updated}                       (nuevo)
   }
   Los campos marcados con + son opcionales; si faltan se completan sin alterar los existentes.
   Todo este módulo está aislado: en una versión con servidor solo cambia load()/save().
   ========================================================================== */
(function () {
  const C = SNSP.config, U = SNSP.util;

  const seedProjects = [
    { id: 'p1', name: 'ASIS por localidad', goal: 'Concluir y validar los ASIS programados' },
    { id: 'p2', name: 'Morbilidad', goal: 'Consolidar indicadores y comparativos epidemiológicos' },
    { id: 'p3', name: 'Canales endémicos', goal: 'Desarrollar y validar los canales prioritarios' },
    { id: 'p4', name: 'SNSP Inteligencia Digital', goal: 'Mejorar módulos, visualizaciones y pruebas' },
    { id: 'p5', name: 'CUSCO 2026', goal: 'Seguimiento de implementación y operación' },
    { id: 'p6', name: 'Seguimiento PAT 2026', goal: 'Organizar compromisos e indicadores del PAT' }
  ].map(p => ({ ...p, owner: 'Equipo de Inteligencia e Información', target: '', progress: 0 }));

  const seed = () => ({ projects: structuredClone(seedProjects), tasks: [], agreements: [], events: [], log: [], meta: {} });

  const fill = (obj, defaults) => { for (const k in defaults) if (obj[k] === undefined || obj[k] === null) obj[k] = defaults[k]; return obj; };
  const str = v => (v === undefined || v === null) ? '' : String(v);

  function normalize(d) {
    d = (d && typeof d === 'object') ? d : seed();
    ['projects', 'tasks', 'agreements', 'events', 'log'].forEach(k => { if (!Array.isArray(d[k])) d[k] = []; });
    d.meta = fill(d.meta && typeof d.meta === 'object' ? d.meta : {}, { area: C.defaultArea, created: new Date().toISOString() });
    d.meta.schemaVersion = C.schemaVersion;
    const valid = (r, p) => { if (!r || typeof r !== 'object') return false; if (!r.id) r.id = U.uid(p); r.id = String(r.id); return true; };
    d.projects = d.projects.filter(r => valid(r, 'p')).map(p => fill(p, { name: '', goal: '', owner: '', target: '', progress: 0, start: '', priority: 'media', status: 'active', area: d.meta.area }));
    d.tasks = d.tasks.filter(r => valid(r, 't')).map(t => fill(t, { name: '', project: '', owner: '', due: '', status: 'pending', evidence: '', detail: '', priority: 'media', area: d.meta.area }));
    d.agreements = d.agreements.filter(r => valid(r, 'a')).map(a => fill(a, { name: '', context: '', owner: '', due: '', status: 'pending', meetingDate: '', project: '', notes: '', area: d.meta.area }));
    d.events = d.events.filter(r => valid(r, 'e')).map(e => fill(e, { name: '', type: 'reunion', date: '', time: '', place: '', participants: '', notes: '', area: d.meta.area }));
    [...d.tasks, ...d.agreements].forEach(x => { if (!SNSP.catalog.status[x.status]) x.status = 'pending'; x.due = str(x.due); });
    return d;
  }

  let data, storageOK = true, lastSaved = null;

  function load() {
    let raw = null;
    try { raw = localStorage.getItem(C.storageKey); } catch { storageOK = false; }
    let parsed = null;
    try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = null; }
    data = normalize(parsed || seed());
    return !!parsed;
  }

  function syncProgress() {
    data.projects.forEach(p => { p.progress = stats(p.id).pct; });
  }

  function save() {
    syncProgress();
    data.meta.updated = new Date().toISOString();
    try { localStorage.setItem(C.storageKey, JSON.stringify(data)); storageOK = true; lastSaved = new Date(); return true; }
    catch { storageOK = false; SNSP.ui && SNSP.ui.toast('No se pudieron guardar los cambios en este navegador. Descarga un respaldo JSON desde Reportes.', 'error'); return false; }
  }

  function log(action, entity, rec) {
    data.log.unshift({ ts: new Date().toISOString(), action, entity, id: rec?.id || '', name: rec?.name || '' });
    if (data.log.length > C.logLimit) data.log.length = C.logLimit;
  }

  const coll = { project: 'projects', task: 'tasks', agreement: 'agreements', event: 'events' };
  const prefix = { project: 'p', task: 't', agreement: 'a', event: 'e' };

  function find(entity, id) { return data[coll[entity]].find(x => x.id === id); }

  /* Crea o actualiza conservando cualquier campo existente que el formulario no maneje. */
  function upsert(entity, id, values) {
    const list = data[coll[entity]];
    let rec = id ? list.find(x => x.id === id) : null;
    if ((entity === 'task' || entity === 'agreement')) {
      const was = rec?.status;
      if (values.status === 'done' && was !== 'done') values.doneAt = new Date().toISOString();
      if (values.status && values.status !== 'done') values.doneAt = '';
    }
    if (rec) { Object.assign(rec, values); log('update', entity, rec); }
    else { rec = { ...values, id: U.uid(prefix[entity]), area: data.meta.area, created: new Date().toISOString() }; list.push(rec); log('create', entity, rec); }
    normalize(data);
    save();
    return rec;
  }

  function setStatus(entity, id, status) {
    const rec = find(entity, id); if (!rec || rec.status === status) return rec;
    return upsert(entity, id, { status });
  }

  function remove(entity, id) {
    const list = data[coll[entity]], i = list.findIndex(x => x.id === id);
    if (i < 0) return;
    const [rec] = list.splice(i, 1);
    if (entity === 'project') {
      data.tasks.forEach(t => { if (t.project === id) t.project = ''; });
      data.agreements.forEach(a => { if (a.project === id) a.project = ''; });
    }
    log('delete', entity, rec);
    save();
  }

  /* Restauración de respaldo: misma validación mínima que la V1. */
  function validateBackup(d) {
    if (!d || !Array.isArray(d.projects) || !Array.isArray(d.tasks) || !Array.isArray(d.agreements)) throw Error('Formato inválido: el archivo no contiene proyectos, actividades y acuerdos.');
    return d;
  }
  function replaceAll(d) { data = normalize(d); log('import', 'data', { name: 'Respaldo restaurado' }); save(); }

  /* ---------- Consultas ---------- */
  function stats(projectId) {
    const a = data.tasks.filter(t => t.project === projectId);
    const done = a.filter(t => t.status === 'done').length;
    const late = a.filter(U.isLate).length;
    const soon = a.filter(t => U.semaforo(t) === 'soon').length;
    const blocked = a.filter(t => t.status === 'blocked').length;
    const next = a.filter(t => t.status !== 'done' && t.due).sort((x, y) => x.due.localeCompare(y.due))[0] || null;
    return { total: a.length, done, late, soon, blocked, open: a.length - done, pct: U.pct(done, a.length), next };
  }
  const pct = () => U.pct(data.tasks.filter(t => t.status === 'done').length, data.tasks.length);
  const pname = id => data.projects.find(p => p.id === id)?.name || 'Sin proyecto';
  const owners = () => U.uniq([...data.tasks, ...data.agreements, ...data.projects].map(x => x.owner));
  const contexts = () => U.uniq([...data.agreements.map(a => a.context), ...data.events.map(e => e.name)]);

  /* Compromisos con fecha: actividades, acuerdos, reuniones y fechas meta de proyecto. */
  function itemsOn(iso) {
    const out = [];
    data.events.filter(e => e.date === iso).sort((a, b) => (a.time || '').localeCompare(b.time || '')).forEach(e => out.push({ kind: 'event', rec: e }));
    data.tasks.filter(t => t.due === iso).forEach(t => out.push({ kind: 'task', rec: t }));
    data.agreements.filter(a => a.due === iso).forEach(a => out.push({ kind: 'agreement', rec: a }));
    data.projects.filter(p => p.target === iso).forEach(p => out.push({ kind: 'project', rec: p }));
    return out;
  }

  /* ---------- Datos de demostración (marcados con demo:true y removibles) ---------- */
  function addDemo() {
    const T = U.today(), d = n => U.addDays(T, n);
    const pid = i => (data.projects[i] || data.projects[0] || {}).id || '';
    const roles = ['Coordinación de Inteligencia', 'Análisis de datos', 'Enlace de Estadística', 'Vigilancia epidemiológica'];
    const tasks = [
      ['Integrar ASIS de localidad Santa Rosa Jáuregui', 0, 0, d(-12), 'done', 'alta'],
      ['Validar tablas de población por localidad', 0, 2, d(-3), 'progress', 'alta'],
      ['Redactar capítulo de daños a la salud', 0, 1, d(5), 'progress', 'media'],
      ['Consolidar morbilidad semanal SUIVE', 1, 3, d(-20), 'done', 'media'],
      ['Comparativo de morbilidad 2025 vs 2026', 1, 1, d(-2), 'pending', 'alta'],
      ['Canal endémico de dengue', 2, 3, d(-35), 'done', 'alta'],
      ['Canal endémico de IRAS', 2, 3, d(3), 'progress', 'media'],
      ['Canal endémico de EDAS', 2, 1, d(18), 'pending', 'baja'],
      ['Pruebas de módulo de visualización', 3, 1, d(-48), 'done', 'media'],
      ['Ajustes de navegación y reportes', 3, 0, d(9), 'blocked', 'media'],
      ['Reporte mensual de operación CUSCO', 4, 2, d(-60), 'done', 'media'],
      ['Capacitación a brigadas en captura', 4, 0, d(1), 'pending', 'alta'],
      ['Matriz de indicadores PAT 2026', 5, 0, d(-75), 'done', 'alta'],
      ['Informe trimestral de avance PAT', 5, 2, d(25), 'pending', 'alta']
    ];
    tasks.forEach(([name, p, r, due, status, priority]) => data.tasks.push({ id: U.uid('t'), name, project: pid(p), owner: roles[r], due, status, priority, evidence: status === 'done' ? 'https://www.gob.mx/salud' : '', detail: 'Registro de demostración', demo: true, doneAt: status === 'done' ? new Date().toISOString() : '' }));
    const ag = [
      ['Enviar base depurada de localidades', 'Reunión de seguimiento ASIS', d(-14), roles[1], d(-4), 'pending'],
      ['Presentar avance de canales endémicos', 'Reunión de seguimiento ASIS', d(-14), roles[3], d(6), 'progress'],
      ['Definir responsables por indicador PAT', 'Comité de planeación', d(-7), roles[0], d(-1), 'done'],
      ['Compartir calendario de capacitaciones CUSCO', 'Comité de planeación', d(-7), roles[2], d(12), 'pending']
    ];
    ag.forEach(([name, context, meetingDate, owner, due, status]) => data.agreements.push({ id: U.uid('a'), name, context, meetingDate, owner, due, status, project: '', notes: '', demo: true }));
    [['Reunión de seguimiento ASIS', d(2), '10:00', 'Sala de juntas, Jurisdicción 1', 'reunion'], ['Comité de planeación', d(8), '09:00', 'Videollamada', 'reunion'], ['Capacitación CUSCO a brigadas', d(1), '11:30', 'Auditorio', 'capacitacion']]
      .forEach(([name, date, time, place, type]) => data.events.push({ id: U.uid('e'), name, date, time, place, type, participants: 'Equipo de Inteligencia e Información', notes: '', demo: true }));
    data = normalize(data); log('create', 'data', { name: 'Datos de demostración' }); save();
  }
  function removeDemo() {
    ['tasks', 'agreements', 'events'].forEach(k => { data[k] = data[k].filter(x => !x.demo); });
    log('delete', 'data', { name: 'Datos de demostración' }); save();
  }
  const hasDemo = () => ['tasks', 'agreements', 'events'].some(k => data[k].some(x => x.demo));

  SNSP.store = {
    load, save, normalize, upsert, setStatus, remove, find, validateBackup, replaceAll,
    stats, pct, pname, owners, contexts, itemsOn, addDemo, removeDemo, hasDemo,
    get data() { return data; },
    get storageOK() { return storageOK; },
    get lastSaved() { return lastSaved; }
  };
})();
