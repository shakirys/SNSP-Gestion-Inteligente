/* Tablero ejecutivo */
(function () {
  const U = SNSP.util, K = SNSP.catalog, S = SNSP.store, UI = SNSP.ui;
  SNSP.views = SNSP.views || {};

  /* Cumplimiento por mes de fecha compromiso (actividades). Reutilizado en Reportes. */
  SNSP.views.monthlySeries = (back = 4, ahead = 1) => {
    const now = new Date(), T = U.today(), cats = [];
    for (let i = -back; i <= ahead; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const items = S.data.tasks.filter(t => t.due && t.due.slice(0, 7) === key);
      const done = items.filter(t => t.status === 'done').length;
      const late = items.filter(t => t.status !== 'done' && t.due < T).length;
      cats.push({
        label: d.toLocaleDateString('es-MX', { month: 'short' }).replace('.', ''),
        full: U.cap(U.monthLabel(d.getFullYear(), d.getMonth())), current: i === 0,
        values: { done, late, open: items.length - done - late }, total: items.length
      });
    }
    return cats;
  };
  SNSP.views.monthlyChart = () => {
    const cats = SNSP.views.monthlySeries();
    if (!cats.some(c => c.total)) return UI.empty('chart', 'Sin fechas compromiso en el periodo', 'Registra actividades con fecha compromiso para ver el cumplimiento mensual.');
    return UI.columns(cats, [
      { key: 'done', label: 'Terminadas', color: 'var(--c-done)' },
      { key: 'open', label: 'En curso, a tiempo', color: 'var(--c-open)' },
      { key: 'late', label: 'Vencidas', color: 'var(--c-late)' }
    ], { rate: c => c.total ? U.pct(c.values.done, c.total) + '%' : '', aria: 'Actividades por mes de fecha compromiso y su cumplimiento' });
  };
  SNSP.views.statusDonut = list => {
    if (!list.length) return UI.empty('tasks', 'Sin actividades registradas', 'La distribución por estado aparecerá al registrar actividades.');
    return UI.donut(K.statusOrder.slice().reverse().map(s => ({ label: K.status[s], value: list.filter(t => t.status === s).length, color: UI.STATUS_COLORS[s] })), U.pct(list.filter(t => t.status === 'done').length, list.length) + '%', 'terminadas');
  };
  SNSP.views.projectBars = () => {
    const rows = S.data.projects.filter(p => p.status !== 'closed').map(p => { const s = S.stats(p.id); return { id: p.id, act: 'goProjectTasks', label: p.name, pct: s.pct, note: s.total ? `${s.done}/${s.total} terminadas${s.late ? ` · ${s.late} vencidas` : ''}` : 'Sin actividades', tip: `${p.name}\n${s.done} de ${s.total} actividades terminadas` }; });
    if (!rows.length) return UI.empty('target', 'Sin proyectos activos', 'Registra un proyecto para dar seguimiento a su avance.');
    return UI.hbars(rows.sort((a, b) => b.pct - a.pct));
  };

  function kpi({ icon, label, value, foot, tone = '', act = '', arg = '' }) {
    return `<button type="button" class="kpi ${tone}" data-act="${act}" data-arg="${arg}">
      <span class="kpi-ic">${U.icon(icon)}</span><span class="kpi-label">${label}</span>
      <span class="kpi-num">${value}</span><span class="kpi-foot">${foot}</span></button>`;
  }

  function agendaRow(kind, rec) {
    const isEv = kind === 'event', date = isEv ? rec.date : rec.due;
    const d = U.toDate(date);
    const tag = { task: 'Actividad', agreement: 'Acuerdo', event: K.eventType[rec.type] || 'Reunión' }[kind];
    const sub = isEv ? [rec.time, rec.place].filter(Boolean).join(' · ') : (rec.owner || 'Sin responsable');
    return `<li><button type="button" class="agenda-row k-${kind}" data-act="edit" data-entity="${kind}" data-id="${U.esc(rec.id)}">
      <span class="agenda-date"><b>${d.getDate()}</b><small>${d.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '')}</small></span>
      <span class="agenda-body"><span class="agenda-tag">${tag}</span><strong>${U.esc(rec.name)}</strong><small>${U.esc(sub)}</small></span>
      ${isEv ? '' : UI.sem(rec)}</button></li>`;
  }

  SNSP.views.dashboard = () => {
    const D = S.data, T = U.today();
    const tasks = D.tasks, ags = D.agreements;
    const active = D.projects.filter(p => p.status === 'active').length;
    const open = tasks.filter(t => t.status !== 'done');
    const done = tasks.length - open.length;
    const lateT = tasks.filter(U.isLate), lateA = ags.filter(U.isLate);
    const soon = [...tasks, ...ags].filter(x => U.semaforo(x) === 'soon');
    const pct = S.pct();

    const upcoming = [
      ...open.filter(t => t.due && t.due >= T).map(rec => ({ kind: 'task', rec, d: rec.due })),
      ...ags.filter(a => a.status !== 'done' && a.due && a.due >= T).map(rec => ({ kind: 'agreement', rec, d: rec.due })),
      ...D.events.filter(e => e.date >= T).map(rec => ({ kind: 'event', rec, d: rec.date + (rec.time || '') }))
    ].sort((a, b) => a.d.localeCompare(b.d)).slice(0, 7);

    const attention = [...lateT.map(rec => ({ kind: 'task', rec })), ...lateA.map(rec => ({ kind: 'agreement', rec })), ...tasks.filter(t => t.status === 'blocked' && !U.isLate(t)).map(rec => ({ kind: 'task', rec }))]
      .sort((a, b) => (a.rec.due || '9').localeCompare(b.rec.due || '9')).slice(0, 6);

    const recent = D.log.slice(0, 6);
    const verb = { create: 'registró', update: 'actualizó', delete: 'eliminó', import: 'restauró' };

    return `
    <div class="page-head">
      <div><h1>Tablero ejecutivo</h1><p class="note">Resumen operativo al ${U.fmtLong(T)}. Los proyectos precargados son referencias; no representan avances oficiales.</p></div>
      <div class="actions"><button class="btn btn-ghost" data-act="go" data-arg="reports">${U.icon('chart')}Ver reportes</button><button class="btn btn-primary" data-act="new" data-entity="task">${U.icon('plus')}Nueva actividad</button></div>
    </div>
    ${!tasks.length && !ags.length ? `<div class="banner">${U.icon('info')}<div><strong>Aún no hay actividades ni acuerdos registrados.</strong> Registra la primera actividad o carga datos de demostración para conocer el tablero. Los datos de demostración se pueden quitar después.</div><button class="btn btn-ghost btn-sm" data-act="demoAdd">${U.icon('flask')}Cargar demostración</button></div>` : ''}
    <section class="kpis" aria-label="Indicadores principales">
      ${kpi({ icon: 'target', label: 'Proyectos activos', value: active, foot: `de ${D.projects.length} registrados`, act: 'go', arg: 'projects' })}
      ${kpi({ icon: 'clock', label: 'Actividades pendientes', value: open.length, foot: `${open.filter(t => t.status === 'progress').length} en proceso · ${open.filter(t => t.status === 'blocked').length} bloqueadas`, act: 'taskFilter', arg: 'open' })}
      ${kpi({ icon: 'checkCircle', label: 'Actividades concluidas', value: done, foot: `de ${tasks.length} registradas`, tone: 'tone-ok', act: 'taskFilter', arg: 'done' })}
      ${kpi({ icon: 'alert', label: 'Próximas a vencer', value: soon.length, foot: `en los próximos ${SNSP.config.dueSoonDays} días`, tone: soon.length ? 'tone-warn' : '', act: 'taskFilter', arg: 'soon' })}
      ${kpi({ icon: 'alert', label: 'Actividades vencidas', value: lateT.length, foot: lateA.length ? `y ${U.plural(lateA.length, 'acuerdo vencido', 'acuerdos vencidos')}` : 'sin acuerdos vencidos', tone: lateT.length ? 'tone-late' : 'tone-ok', act: 'taskFilter', arg: 'late' })}
      <button type="button" class="kpi kpi-progress" data-act="go" data-arg="reports"><span class="kpi-ic">${U.icon('chart')}</span><span class="kpi-label">Avance general</span>
        <span class="kpi-num">${pct}<small>%</small></span>${UI.progress(pct, 'on-dark')}<span class="kpi-foot">actividades terminadas</span></button>
    </section>

    <section class="grid-3">
      <article class="panel span-2"><header class="panel-head"><div><h2>Cumplimiento mensual</h2><p>Actividades por mes de fecha compromiso. La cifra sobre cada columna es el porcentaje terminado.</p></div></header>${SNSP.views.monthlyChart()}</article>
      <article class="panel"><header class="panel-head"><div><h2>Estado de actividades</h2><p>${U.plural(tasks.length, 'actividad registrada', 'actividades registradas')}</p></div></header>${SNSP.views.statusDonut(tasks)}</article>
    </section>

    <section class="grid-3">
      <article class="panel span-2"><header class="panel-head"><div><h2>Avance por proyecto</h2><p>Porcentaje de actividades terminadas. Selecciona un proyecto para ver sus actividades.</p></div><button class="link-btn" data-act="go" data-arg="projects">Ver proyectos ${U.icon('chevR')}</button></header>${SNSP.views.projectBars()}</article>
      <article class="panel"><header class="panel-head"><div><h2>Próximos compromisos</h2><p>Actividades, acuerdos y reuniones</p></div><button class="link-btn" data-act="go" data-arg="calendar">Calendario ${U.icon('chevR')}</button></header>
        ${upcoming.length ? `<ul class="agenda">${upcoming.map(x => agendaRow(x.kind, x.rec)).join('')}</ul>` : UI.empty('calendar', 'Sin compromisos próximos', 'Aún no hay actividades con fechas compromiso.', `<button class="btn btn-primary btn-sm" data-act="new" data-entity="task">${U.icon('plus')}Nueva actividad</button>`)}
      </article>
    </section>

    <section class="grid-2">
      <article class="panel"><header class="panel-head"><div><h2>Requieren atención</h2><p>Vencidas y bloqueadas</p></div></header>
        ${attention.length ? `<ul class="agenda">${attention.map(x => agendaRow(x.kind, x.rec)).join('')}</ul>` : UI.empty('checkCircle', 'Todo en orden', 'No hay actividades ni acuerdos vencidos o bloqueados.')}
      </article>
      <article class="panel"><header class="panel-head"><div><h2>Movimientos recientes</h2><p>Historial de cambios en este navegador</p></div><button class="link-btn" data-act="go" data-arg="reports" data-hash="historial">Historial ${U.icon('chevR')}</button></header>
        ${recent.length ? `<ul class="timeline">${recent.map(l => `<li><span class="tl-dot tl-${l.action}"></span><div><strong>${U.esc(l.name || K.entity[l.entity] || '')}</strong><small>${U.esc(K.entity[l.entity] || '')} · se ${verb[l.action] || l.action} · ${U.fmtDateTime(l.ts)}</small></div></li>`).join('')}</ul>` : UI.empty('history', 'Sin movimientos', 'Aquí aparecerán los registros, cambios y eliminaciones.')}
      </article>
    </section>`;
  };
})();
