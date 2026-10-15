/* Proyectos y metas */
(function () {
  const U = SNSP.util, K = SNSP.catalog, S = SNSP.store, UI = SNSP.ui;

  const ownerHTML = p => {
    if (!p.owner) return '<span class="muted">Sin asignar</span>';
    const role = S.personRole(p.owner);
    return `<span class="owner-name">${U.esc(p.owner)}</span>${role ? `<small class="owner-role">${U.esc(role)}</small>` : ''}`;
  };
  const pstatus = s => `<span class="pstatus ps-${U.esc(s)}">${U.esc(K.projectStatus[s] || s)}</span>`;

  function card(p) {
    const s = S.stats(p.id);
    const targetTxt = p.target ? `${U.fmt(p.target)}${p.status !== 'closed' && U.daysUntil(p.target) < 0 ? ' · vencida' : ''}` : 'Sin fecha meta';
    return `<article class="pcard">
      <header><div class="pcard-tags">${UI.prio(p.priority)}${pstatus(p.status)}</div>
        <button class="icon-btn" data-act="edit" data-entity="project" data-id="${U.esc(p.id)}" aria-label="Editar ${U.esc(p.name)}">${U.icon('edit')}</button></header>
      <h3>${U.esc(p.name)}</h3>
      <p class="pcard-goal">${U.esc(p.goal)}</p>
      <div class="pcard-progress"><div class="pp-top"><span>Avance</span><b>${s.pct}%</b></div>${UI.progress(s.pct)}
        <div class="pp-counts"><span>${U.plural(s.total, 'actividad', 'actividades')}</span><span class="ok">${s.done} terminadas</span>${s.late ? `<span class="late">${s.late} vencidas</span>` : ''}${s.blocked ? `<span class="blk">${s.blocked} bloqueadas</span>` : ''}</div></div>
      <dl class="pcard-meta">
        <div class="full"><dt>${U.icon('user')}Responsable</dt><dd>${ownerHTML(p)}</dd></div>
        <div><dt>${U.icon('flag')}Fecha meta</dt><dd>${U.esc(targetTxt)}</dd></div>
        <div><dt>${U.icon('file')}Próximo entregable</dt><dd>${s.next ? `${U.esc(s.next.name)} <small>· ${U.fmtShort(s.next.due)}</small>` : '<span class="muted">Sin entregables con fecha</span>'}</dd></div>
      </dl>
      <footer><button class="btn btn-ghost btn-sm" data-act="goProjectTasks" data-id="${U.esc(p.id)}">${U.icon('tasks')}Ver actividades</button>
        <button class="btn btn-ghost btn-sm" data-act="new" data-entity="task" data-project="${U.esc(p.id)}">${U.icon('plus')}Actividad</button>
        <button class="icon-btn danger" data-act="delete" data-entity="project" data-id="${U.esc(p.id)}" aria-label="Eliminar ${U.esc(p.name)}">${U.icon('trash')}</button></footer>
    </article>`;
  }

  function table(list) {
    return `<div class="table-wrap"><table class="table rtable"><thead><tr><th>Proyecto</th><th>Objetivo / meta</th><th>Responsable</th><th>Prioridad</th><th>Fecha meta</th><th>Actividades</th><th>Avance</th><th><span class="sr">Acciones</span></th></tr></thead><tbody>
      ${list.map(p => { const s = S.stats(p.id); return `<tr>
        <td data-label="Proyecto"><strong>${U.esc(p.name)}</strong><div>${pstatus(p.status)}</div></td>
        <td data-label="Objetivo">${U.esc(p.goal)}</td><td data-label="Responsable">${ownerHTML(p)}</td>
        <td data-label="Prioridad">${UI.prio(p.priority)}</td><td data-label="Fecha meta" class="nowrap">${U.fmt(p.target)}</td>
        <td data-label="Actividades" class="num">${s.total}</td>
        <td data-label="Avance"><div class="mini-prog">${UI.progress(s.pct)}<b>${s.pct}%</b></div></td>
        <td class="row-actions"><button class="btn btn-ghost btn-sm" data-act="edit" data-entity="project" data-id="${U.esc(p.id)}">${U.icon('edit')}Editar</button>
        <button class="icon-btn danger" data-act="delete" data-entity="project" data-id="${U.esc(p.id)}" aria-label="Eliminar ${U.esc(p.name)}">${U.icon('trash')}</button></td></tr>`; }).join('')}
    </tbody></table></div>`;
  }

  SNSP.views.projects = () => {
    const st = SNSP.state.projects, D = S.data;
    let list = D.projects.filter(p => (st.status === 'all' || p.status === st.status) && U.matches(st.q, p.name, p.goal, p.owner));
    const prioRank = { alta: 0, media: 1, baja: 2 };
    list = list.slice().sort((a, b) => (st.sort === 'target' ? (a.target || '9').localeCompare(b.target || '9') : st.sort === 'progress' ? S.stats(b.id).pct - S.stats(a.id).pct : st.sort === 'priority' ? prioRank[a.priority] - prioRank[b.priority] : 0));
    const count = s => D.projects.filter(p => s === 'all' || p.status === s).length;
    return `
    <div class="page-head"><div><h1>Proyectos y metas</h1><p class="note">Objetivos y proyectos del área. El avance se calcula con las actividades terminadas de cada proyecto.</p></div>
      <div class="actions"><button class="btn btn-primary" data-act="new" data-entity="project">${U.icon('plus')}Nuevo proyecto</button></div></div>
    <div class="toolbar">
      <div class="tabs" role="tablist" aria-label="Filtrar por estado del proyecto">${[['all', 'Todos'], ...Object.entries(K.projectStatus)].map(([v, l]) => `<button role="tab" aria-selected="${st.status === v}" class="tab ${st.status === v ? 'on' : ''}" data-act="pFilter" data-arg="${v}">${l}<span>${count(v)}</span></button>`).join('')}</div>
      <div class="tools">
        <label class="search-sm">${U.icon('search')}<input id="p-q" type="search" placeholder="Buscar proyecto" value="${U.esc(st.q)}" data-input="projects.q" aria-label="Buscar proyecto"></label>
        <select id="p-sort" data-change="projects.sort" aria-label="Ordenar proyectos"><option value="none" ${st.sort === 'none' ? 'selected' : ''}>Orden de registro</option><option value="priority" ${st.sort === 'priority' ? 'selected' : ''}>Por prioridad</option><option value="target" ${st.sort === 'target' ? 'selected' : ''}>Por fecha meta</option><option value="progress" ${st.sort === 'progress' ? 'selected' : ''}>Por avance</option></select>
        <div class="seg-toggle" role="group" aria-label="Vista"><button class="${st.mode === 'cards' ? 'on' : ''}" data-act="mode" data-key="projects" data-arg="cards" aria-pressed="${st.mode === 'cards'}">${U.icon('grid')}<span>Tarjetas</span></button><button class="${st.mode === 'table' ? 'on' : ''}" data-act="mode" data-key="projects" data-arg="table" aria-pressed="${st.mode === 'table'}">${U.icon('list')}<span>Tabla</span></button></div>
      </div>
    </div>
    ${!list.length ? `<div class="panel">${UI.empty('target', D.projects.length ? 'Ningún proyecto coincide' : 'Sin proyectos', D.projects.length ? 'Cambia el filtro o la búsqueda.' : 'Registra el primer proyecto del plan de trabajo.', `<button class="btn btn-primary btn-sm" data-act="new" data-entity="project">${U.icon('plus')}Nuevo proyecto</button>`)}</div>`
      : st.mode === 'table' ? `<div class="panel flush">${table(list)}</div>` : `<div class="pgrid">${list.map(card).join('')}</div>`}`;
  };
})();
