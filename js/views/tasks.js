/* Seguimiento de actividades: lista con semáforo y tablero por estado */
(function () {
  const U = SNSP.util, K = SNSP.catalog, S = SNSP.store, UI = SNSP.ui;

  SNSP.views.filteredTasks = () => {
    const f = SNSP.state.tasks;
    return S.data.tasks.filter(t =>
      (f.status === 'all' || (f.status === 'open' ? t.status !== 'done' : t.status === f.status)) &&
      (f.project === 'all' || t.project === f.project) &&
      (f.owner === 'all' || (t.owner || '') === f.owner) &&
      (f.light === 'all' || U.semaforo(t) === f.light) &&
      U.matches(f.q, t.name, t.detail, t.owner, S.pname(t.project)));
  };

  const sortTasks = list => {
    const order = { late: 0, soon: 1, ontime: 2, none: 3, done: 4 };
    return list.slice().sort((a, b) => order[U.semaforo(a)] - order[U.semaforo(b)] || (a.due || '9').localeCompare(b.due || '9'));
  };

  function evidence(t) {
    return t.evidence ? `<a class="evi" href="${U.safeUrl(t.evidence)}" target="_blank" rel="noopener">${U.icon('link')}Abrir enlace</a>` : '<span class="muted">Pendiente</span>';
  }

  function listView(list) {
    return `<div class="table-wrap"><table class="table rtable tasks-table"><thead><tr><th>Semáforo</th><th>Actividad</th><th>Proyecto</th><th>Responsable</th><th>Fecha compromiso</th><th>Estado</th><th>Evidencia</th><th><span class="sr">Acciones</span></th></tr></thead><tbody>
    ${list.map(t => `<tr class="${t.status === 'done' ? 'is-done' : ''}">
      <td data-label="Semáforo">${UI.sem(t)}</td>
      <td data-label="Actividad" class="cell-main"><button class="cell-link" data-act="edit" data-entity="task" data-id="${U.esc(t.id)}">${U.esc(t.name)}</button>${t.detail ? `<small class="muted clamp">${U.esc(t.detail)}</small>` : ''}<div class="cell-tags">${UI.prio(t.priority)}${t.demo ? '<span class="demo-tag">Demostración</span>' : ''}</div></td>
      <td data-label="Proyecto">${U.esc(S.pname(t.project))}</td>
      <td data-label="Responsable">${U.esc(t.owner || 'Sin asignar')}</td>
      <td data-label="Fecha compromiso" class="nowrap">${U.fmt(t.due)}${U.isLate(t) ? ` <span class="late-ic" title="Vencida">${U.icon('alert')}</span>` : ''}</td>
      <td data-label="Estado">${UI.statusSelect('task', t)}</td>
      <td data-label="Evidencia">${evidence(t)}</td>
      <td class="row-actions"><button class="btn btn-ghost btn-sm" data-act="edit" data-entity="task" data-id="${U.esc(t.id)}">${U.icon('edit')}Editar</button>
        <button class="icon-btn danger" data-act="delete" data-entity="task" data-id="${U.esc(t.id)}" aria-label="Eliminar ${U.esc(t.name)}">${U.icon('trash')}</button></td></tr>`).join('')}
    </tbody></table></div>`;
  }

  function boardView(list) {
    return `<div class="board">${K.statusOrder.map(s => {
      const col = list.filter(t => t.status === s);
      return `<section class="bcol bcol-${s}" data-drop="${s}" aria-label="${K.status[s]}">
        <header><span class="dot"></span><h3>${K.status[s]}</h3><span class="count">${col.length}</span></header>
        <div class="bcol-body">${col.map(t => `<article class="bcard" draggable="true" data-drag="${U.esc(t.id)}">
          <button class="bcard-main" data-act="edit" data-entity="task" data-id="${U.esc(t.id)}"><strong>${U.esc(t.name)}</strong><small>${U.esc(S.pname(t.project))}</small></button>
          <div class="bcard-meta">${UI.sem(t)}${UI.prio(t.priority)}</div>
          <div class="bcard-foot"><span>${U.icon('user')}${U.esc(t.owner || 'Sin asignar')}</span><span>${U.icon('calendar')}${U.fmtShort(t.due)}</span></div>
          <label class="bcard-move"><span class="sr">Mover a</span>${UI.statusSelect('task', t)}</label>
        </article>`).join('') || '<p class="bcol-empty">Sin actividades</p>'}</div></section>`;
    }).join('')}</div>`;
  }

  SNSP.views.tasks = () => {
    const f = SNSP.state.tasks, D = S.data;
    const list = sortTasks(SNSP.views.filteredTasks());
    const owners = U.uniq(D.tasks.map(t => t.owner));
    const anyFilter = f.status !== 'all' || f.project !== 'all' || f.owner !== 'all' || f.light !== 'all' || f.q;
    const lightCount = s => D.tasks.filter(t => U.semaforo(t) === s).length;
    const statusOpts = [['all', 'Todos los estados'], ['open', 'No terminadas'], ...Object.entries(K.status)];
    return `
    <div class="page-head"><div><h1>Actividades y entregables</h1><p class="note">Responsables, fechas, evidencias y seguimiento con semáforo.</p></div>
      <div class="actions"><button class="btn btn-ghost" data-act="exportCSV">${U.icon('download')}CSV</button><button class="btn btn-primary" data-act="new" data-entity="task">${U.icon('plus')}Nueva actividad</button></div></div>

    <div class="lights" role="group" aria-label="Filtrar por semáforo">
      ${['late', 'soon', 'ontime', 'done', 'none'].map(s => `<button class="light light-${s} ${f.light === s ? 'on' : ''}" data-act="light" data-arg="${s}" aria-pressed="${f.light === s}"><i></i><span>${K.semaforo[s]}</span><b>${lightCount(s)}</b></button>`).join('')}
    </div>

    <div class="toolbar">
      <div class="filters">
        <label class="search-sm">${U.icon('search')}<input id="t-q" type="search" placeholder="Buscar actividad, nota o responsable" value="${U.esc(f.q)}" data-input="tasks.q" aria-label="Buscar actividades"></label>
        <select id="t-status" aria-label="Filtrar por estado" data-change="tasks.status">${statusOpts.map(([v, l]) => `<option value="${v}" ${f.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <select id="t-project" aria-label="Filtrar por proyecto" data-change="tasks.project"><option value="all">Todos los proyectos</option>${D.projects.map(p => `<option value="${U.esc(p.id)}" ${f.project === p.id ? 'selected' : ''}>${U.esc(p.name)}</option>`).join('')}<option value="" ${f.project === '' ? 'selected' : ''}>Sin proyecto</option></select>
        <select id="t-owner" aria-label="Filtrar por responsable" data-change="tasks.owner"><option value="all">Todos los responsables</option>${owners.map(o => `<option value="${U.esc(o)}" ${f.owner === o ? 'selected' : ''}>${U.esc(o)}</option>`).join('')}</select>
        ${anyFilter ? `<button class="link-btn" data-act="clearTaskFilters">${U.icon('x')}Limpiar filtros</button>` : ''}
      </div>
      <div class="tools"><span class="count-note">${list.length} de ${D.tasks.length}</span>
        <div class="seg-toggle" role="group" aria-label="Vista"><button class="${f.mode === 'list' ? 'on' : ''}" data-act="mode" data-key="tasks" data-arg="list" aria-pressed="${f.mode === 'list'}">${U.icon('list')}<span>Lista</span></button><button class="${f.mode === 'board' ? 'on' : ''}" data-act="mode" data-key="tasks" data-arg="board" aria-pressed="${f.mode === 'board'}">${U.icon('columns')}<span>Tablero</span></button></div></div>
    </div>

    ${!D.tasks.length ? `<div class="panel">${UI.empty('tasks', 'No hay actividades', 'Registra la primera para comenzar el seguimiento.', `<button class="btn btn-primary btn-sm" data-act="new" data-entity="task">${U.icon('plus')}Nueva actividad</button> <button class="btn btn-ghost btn-sm" data-act="demoAdd">${U.icon('flask')}Cargar demostración</button>`)}</div>`
      : !list.length ? `<div class="panel">${UI.empty('filter', 'Ninguna actividad coincide', 'Ajusta o limpia los filtros para ver más resultados.', `<button class="btn btn-ghost btn-sm" data-act="clearTaskFilters">Limpiar filtros</button>`)}</div>`
      : f.mode === 'board' ? boardView(list) : `<div class="panel flush">${listView(list)}</div>`}
    <p class="legend-note">${U.icon('info')}Semáforo: <b class="t-late">rojo</b> vencida, <b class="t-soon">ámbar</b> vence en ${SNSP.config.dueSoonDays} días o menos, <b class="t-ok">verde</b> en tiempo o cumplida, <b class="t-none">gris</b> sin fecha compromiso.</p>`;
  };
})();
