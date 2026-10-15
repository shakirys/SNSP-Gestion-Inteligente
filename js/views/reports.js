/* Reportes, exportación y respaldo */
(function () {
  const U = SNSP.util, K = SNSP.catalog, S = SNSP.store, UI = SNSP.ui;

  /* ---------- Exportación (formatos de la V1 conservados) ---------- */
  SNSP.exporter = {
    tasksCSV() {
      const D = S.data;
      const rows = [['Actividad', 'Proyecto', 'Responsable', 'Fecha', 'Estado', 'Evidencia', 'Detalle'], ...D.tasks.map(t => [t.name, S.pname(t.project), t.owner, t.due, K.status[t.status], t.evidence, t.detail])];
      U.download('SNSP_Gestion_Actividades.csv', U.csv(rows), 'text/csv;charset=utf-8');
      UI.toast(`Se descargó el CSV con ${U.plural(D.tasks.length, 'actividad', 'actividades')}.`);
    },
    agreementsCSV() {
      const D = S.data;
      const rows = [['Acuerdo', 'Reunión / contexto', 'Fecha de reunión', 'Responsable', 'Fecha compromiso', 'Estado', 'Semáforo', 'Proyecto', 'Observaciones'], ...D.agreements.map(a => [a.name, a.context, a.meetingDate, a.owner, a.due, K.status[a.status], K.semaforo[U.semaforo(a)], a.project ? S.pname(a.project) : '', a.notes])];
      U.download('SNSP_Gestion_Acuerdos.csv', U.csv(rows), 'text/csv;charset=utf-8');
      UI.toast(`Se descargó el CSV con ${U.plural(D.agreements.length, 'acuerdo')}.`);
    },
    projectsCSV() {
      const D = S.data;
      const rows = [['Proyecto', 'Objetivo / meta', 'Responsable', 'Estado', 'Prioridad', 'Fecha de inicio', 'Fecha meta', 'Actividades', 'Terminadas', 'Vencidas', 'Avance %'], ...D.projects.map(p => { const s = S.stats(p.id); return [p.name, p.goal, p.owner, K.projectStatus[p.status], K.priority[p.priority], p.start, p.target, s.total, s.done, s.late, s.pct]; })];
      U.download('SNSP_Gestion_Proyectos.csv', U.csv(rows), 'text/csv;charset=utf-8');
      UI.toast('Se descargó el CSV de proyectos.');
    },
    json() {
      U.download('SNSP_Gestion_Respaldo.json', JSON.stringify(S.data, null, 2), 'application/json');
      UI.toast('Respaldo JSON descargado. Guárdalo en una carpeta segura.');
    },
    async importFile(input) {
      const file = input.files[0]; input.value = '';
      if (!file) return;
      try {
        const d = S.validateBackup(JSON.parse(await file.text()));
        const ok = await UI.confirm({ title: '¿Restaurar este respaldo?', message: `El archivo <strong>${U.esc(file.name)}</strong> contiene ${d.projects.length} proyectos, ${d.tasks.length} actividades y ${d.agreements.length} acuerdos. Se reemplazarán los datos actuales.`, confirmLabel: 'Restaurar', danger: true });
        if (!ok) return;
        S.replaceAll(d); SNSP.app.render(); UI.toast('Respaldo restaurado correctamente.');
      } catch (e) { UI.toast('No se pudo restaurar: ' + (e instanceof SyntaxError ? 'el archivo no es un JSON válido.' : e.message), 'error'); }
    }
  };

  SNSP.views.reports = () => {
    const D = S.data, T = U.today(), tasks = D.tasks, ags = D.agreements;
    const by = s => tasks.filter(t => t.status === s).length;
    const late = tasks.filter(U.isLate);
    const agDone = ags.filter(a => a.status === 'done').length;
    const owners = U.uniq([...tasks.map(t => t.owner), ...ags.map(a => a.owner)]);
    const verb = { create: 'Registro', update: 'Edición', delete: 'Eliminación', import: 'Restauración' };

    const projRows = D.projects.map(p => { const s = S.stats(p.id); return `<tr><td data-label="Proyecto"><strong>${U.esc(p.name)}</strong><small class="muted block">${U.esc(K.projectStatus[p.status])} · prioridad ${U.esc(K.priority[p.priority].toLowerCase())}</small></td><td data-label="Responsable">${U.esc(p.owner)}</td><td class="num" data-label="Actividades">${s.total}</td><td class="num" data-label="Terminadas">${s.done}</td><td class="num" data-label="En curso">${s.open - s.late}</td><td class="num ${s.late ? 't-late' : ''}" data-label="Vencidas">${s.late}</td><td data-label="Avance"><div class="mini-prog">${UI.progress(s.pct)}<b>${s.pct}%</b></div></td></tr>`; }).join('');

    const ownerRows = owners.map(o => {
      const t = tasks.filter(x => (x.owner || '') === o), a = ags.filter(x => (x.owner || '') === o);
      const tl = t.filter(U.isLate).length, al = a.filter(U.isLate).length, td = t.filter(x => x.status === 'done').length;
      return `<tr><td data-label="Responsable"><strong>${U.esc(o)}</strong></td><td class="num" data-label="Actividades">${t.length}</td><td class="num" data-label="Terminadas">${td}</td><td class="num ${tl ? 't-late' : ''}" data-label="Act. vencidas">${tl}</td><td class="num" data-label="Acuerdos">${a.length}</td><td class="num ${al ? 't-late' : ''}" data-label="Acu. vencidos">${al}</td><td data-label="Cumplimiento"><div class="mini-prog">${UI.progress(U.pct(td + a.filter(x => x.status === 'done').length, t.length + a.length))}<b>${U.pct(td + a.filter(x => x.status === 'done').length, t.length + a.length)}%</b></div></td></tr>`;
    }).join('');

    const lateRows = [...late.map(r => ({ k: 'Actividad', e: 'task', r })), ...ags.filter(U.isLate).map(r => ({ k: 'Acuerdo', e: 'agreement', r }))].sort((a, b) => a.r.due.localeCompare(b.r.due));

    return `
    <div class="page-head"><div><h1>Reportes de seguimiento</h1><p class="note">Resumen generado a partir de los registros de este navegador. Corte al ${U.fmtLong(T)}.</p></div>
      <div class="actions no-print"><button class="btn btn-ghost" data-act="print">${U.icon('printer')}Imprimir o guardar PDF</button></div></div>
    <div class="print-head"><strong>${U.esc(SNSP.config.appName)}</strong> · ${U.esc(SNSP.config.unit)} · ${U.esc(SNSP.config.place)}<br>Reporte de seguimiento · corte al ${U.fmtLong(T)}</div>

    <section class="stats-row">
      <div class="stat"><span>Proyectos</span><b>${D.projects.length}</b></div>
      <div class="stat"><span>Pendientes</span><b>${by('pending')}</b></div>
      <div class="stat"><span>En proceso</span><b>${by('progress')}</b></div>
      <div class="stat s-ok"><span>Terminadas</span><b>${by('done')}</b></div>
      <div class="stat"><span>Bloqueadas</span><b>${by('blocked')}</b></div>
      <div class="stat s-late"><span>Vencidas</span><b>${late.length}</b></div>
      <div class="stat"><span>Avance general</span><b>${S.pct()}%</b></div>
      <div class="stat"><span>Acuerdos cumplidos</span><b>${agDone}/${ags.length}</b></div>
    </section>

    <section class="grid-3 avoid-break">
      <article class="panel span-2"><header class="panel-head"><div><h2>Cumplimiento mensual</h2><p>Actividades por mes de fecha compromiso</p></div></header>${SNSP.views.monthlyChart()}</article>
      <article class="panel"><header class="panel-head"><div><h2>Estado de actividades</h2><p>Distribución actual</p></div></header>${SNSP.views.statusDonut(tasks)}</article>
    </section>

    <article class="panel flush avoid-break"><header class="panel-head pad"><div><h2>Cumplimiento por proyecto</h2><p>Actividades registradas, terminadas y vencidas</p></div><button class="btn btn-ghost btn-sm no-print" data-act="exportProjectsCSV">${U.icon('download')}CSV</button></header>
      ${D.projects.length ? `<div class="table-wrap"><table class="table rtable"><thead><tr><th>Proyecto</th><th>Responsable</th><th class="num">Actividades</th><th class="num">Terminadas</th><th class="num">En curso</th><th class="num">Vencidas</th><th>Avance</th></tr></thead><tbody>${projRows}</tbody></table></div>` : UI.empty('target', 'Sin proyectos', '')}</article>

    <article class="panel flush avoid-break"><header class="panel-head pad"><div><h2>Carga y cumplimiento por responsable</h2><p>Actividades y acuerdos asignados</p></div></header>
      ${owners.length ? `<div class="table-wrap"><table class="table rtable"><thead><tr><th>Responsable</th><th class="num">Actividades</th><th class="num">Terminadas</th><th class="num">Act. vencidas</th><th class="num">Acuerdos</th><th class="num">Acu. vencidos</th><th>Cumplimiento</th></tr></thead><tbody>${ownerRows}</tbody></table></div>` : UI.empty('users', 'Sin responsables asignados', 'Aparecerán al registrar actividades o acuerdos con responsable.')}</article>

    <article class="panel flush avoid-break"><header class="panel-head pad"><div><h2>Compromisos vencidos</h2><p>Actividades y acuerdos sin cumplir después de su fecha</p></div></header>
      ${lateRows.length ? `<div class="table-wrap"><table class="table rtable"><thead><tr><th>Tipo</th><th>Compromiso</th><th>Responsable</th><th>Fecha</th><th>Atraso</th><th>Estado</th></tr></thead><tbody>${lateRows.map(x => `<tr><td data-label="Tipo">${x.k}</td><td data-label="Compromiso"><button class="cell-link" data-act="edit" data-entity="${x.e}" data-id="${U.esc(x.r.id)}">${U.esc(x.r.name)}</button></td><td data-label="Responsable">${U.esc(x.r.owner || 'Sin asignar')}</td><td data-label="Fecha" class="nowrap">${U.fmt(x.r.due)}</td><td data-label="Atraso" class="t-late nowrap">${-U.daysUntil(x.r.due)} días</td><td data-label="Estado">${UI.status(x.r.status)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="pad-sm">${UI.empty('checkCircle', 'Sin compromisos vencidos', 'Todas las actividades y acuerdos están en tiempo o cumplidos.')}</div>`}</article>

    <article class="panel no-print" id="respaldo"><header class="panel-head"><div><h2>Exportación y respaldo</h2><p>Descarga los datos para compartirlos o respaldarlos. Esta versión no sincroniza cambios entre personas.</p></div></header>
      ${SNSP.config.previewNote ? `<div class="banner" style="margin-bottom:14px">${U.icon('info')}<div>${U.esc(SNSP.config.previewNote)}</div></div>` : ''}
      <div class="export-grid">
        <button class="export-btn primary" data-act="exportCSV">${U.icon('download')}<span><strong>Descargar actividades CSV</strong><small>Formato compatible con Excel</small></span></button>
        <button class="export-btn" data-act="exportAgreementsCSV">${U.icon('download')}<span><strong>Descargar acuerdos CSV</strong><small>Con semáforo y responsable</small></span></button>
        <button class="export-btn" data-act="exportProjectsCSV">${U.icon('download')}<span><strong>Descargar proyectos CSV</strong><small>Con avance calculado</small></span></button>
        <button class="export-btn" data-act="exportJSON">${U.icon('database')}<span><strong>Respaldar datos JSON</strong><small>Copia completa para restaurar</small></span></button>
        <button class="export-btn" data-act="importJSON">${U.icon('upload')}<span><strong>Restaurar respaldo JSON</strong><small>Reemplaza los datos actuales</small></span></button>
        <input id="import" type="file" accept="application/json,.json" hidden>
      </div>
      <div class="data-note"><span class="pill">${U.icon('info')}Piloto local: sin autenticación ni servidor</span>
        ${S.hasDemo() ? `<button class="btn btn-ghost btn-sm" data-act="demoRemove">${U.icon('trash')}Quitar datos de demostración</button>` : `<button class="btn btn-ghost btn-sm" data-act="demoAdd">${U.icon('flask')}Cargar datos de demostración</button>`}</div>
    </article>

    <article class="panel no-print" id="historial"><header class="panel-head"><div><h2>Historial de cambios</h2><p>Últimos ${Math.min(D.log.length, 40)} movimientos registrados en este navegador</p></div></header>
      ${D.log.length ? `<div class="table-wrap"><table class="table rtable compact"><thead><tr><th>Fecha y hora</th><th>Movimiento</th><th>Tipo</th><th>Registro</th></tr></thead><tbody>${D.log.slice(0, 40).map(l => `<tr><td data-label="Fecha" class="nowrap">${U.fmtDateTime(l.ts)}</td><td data-label="Movimiento"><span class="tl-badge tl-${l.action}">${verb[l.action] || l.action}</span></td><td data-label="Tipo">${U.esc(K.entity[l.entity] || l.entity)}</td><td data-label="Registro">${U.esc(l.name)}</td></tr>`).join('')}</tbody></table></div>` : UI.empty('history', 'Sin movimientos registrados', 'El historial inicia a partir de esta versión.')}
    </article>`;
  };
})();
