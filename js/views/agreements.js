/* Acuerdos y compromisos */
(function () {
  const U = SNSP.util, K = SNSP.catalog, S = SNSP.store, UI = SNSP.ui;

  SNSP.views.filteredAgreements = () => {
    const f = SNSP.state.agreements;
    return S.data.agreements.filter(a =>
      (f.status === 'all' || (f.status === 'open' ? a.status !== 'done' : f.status === 'late' ? U.isLate(a) : a.status === f.status)) &&
      (f.owner === 'all' || (a.owner || '') === f.owner) &&
      U.matches(f.q, a.name, a.context, a.owner, a.notes));
  };

  function row(a) {
    return `<tr class="${a.status === 'done' ? 'is-done' : ''}">
      <td data-label="Semáforo">${UI.sem(a)}</td>
      <td data-label="Acuerdo" class="cell-main"><button class="cell-link" data-act="edit" data-entity="agreement" data-id="${U.esc(a.id)}">${U.esc(a.name)}</button>${a.notes ? `<small class="muted clamp">${U.esc(a.notes)}</small>` : ''}${a.project ? `<div class="cell-tags"><span class="ptag">${U.icon('target')}${U.esc(S.pname(a.project))}</span></div>` : ''}${a.demo ? '<div class="cell-tags"><span class="demo-tag">Demostración</span></div>' : ''}</td>
      <td data-label="Reunión / contexto">${U.esc(a.context || 'Sin reunión')}</td>
      <td data-label="Responsable">${U.esc(a.owner || 'Sin asignar')}</td>
      <td data-label="Fecha" class="nowrap">${U.fmt(a.due)}</td>
      <td data-label="Estado">${UI.statusSelect('agreement', a)}</td>
      <td class="row-actions"><button class="btn btn-ghost btn-sm" data-act="edit" data-entity="agreement" data-id="${U.esc(a.id)}">${U.icon('edit')}Editar</button>
        <button class="icon-btn danger" data-act="delete" data-entity="agreement" data-id="${U.esc(a.id)}" aria-label="Eliminar ${U.esc(a.name)}">${U.icon('trash')}</button></td></tr>`;
  }
  const head = `<thead><tr><th>Semáforo</th><th>Acuerdo</th><th>Reunión / contexto</th><th>Responsable</th><th>Fecha</th><th>Estado</th><th><span class="sr">Acciones</span></th></tr></thead>`;

  function grouped(list) {
    const groups = new Map();
    list.forEach(a => { const k = a.context || 'Sin reunión registrada'; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(a); });
    const ordered = [...groups.entries()].sort((x, y) => (y[1][0].meetingDate || '').localeCompare(x[1][0].meetingDate || ''));
    return ordered.map(([ctx, items]) => {
      const done = items.filter(a => a.status === 'done').length, late = items.filter(U.isLate).length;
      const md = items.map(a => a.meetingDate).filter(Boolean).sort().pop();
      return `<section class="panel flush meeting">
        <header class="meeting-head"><div class="meeting-ic">${U.icon('users')}</div><div class="grow"><h3>${U.esc(ctx)}</h3><p>${md ? `Reunión del ${U.fmt(md)} · ` : ''}${U.plural(items.length, 'acuerdo')} · ${done} cumplidos${late ? ` · <span class="t-late">${late} vencidos</span>` : ''}</p></div>
          <div class="meeting-prog">${UI.progress(U.pct(done, items.length))}<b>${U.pct(done, items.length)}%</b></div>
          <button class="btn btn-ghost btn-sm" data-act="new" data-entity="agreement" data-context="${U.esc(ctx === 'Sin reunión registrada' ? '' : ctx)}" data-meeting="${U.esc(md || '')}">${U.icon('plus')}Acuerdo</button></header>
        <div class="table-wrap"><table class="table rtable">${head}<tbody>${items.map(row).join('')}</tbody></table></div></section>`;
    }).join('');
  }

  SNSP.views.agreements = () => {
    const f = SNSP.state.agreements, A = S.data.agreements;
    const list = SNSP.views.filteredAgreements().slice().sort((a, b) => (a.status === 'done') - (b.status === 'done') || (a.due || '9').localeCompare(b.due || '9'));
    const done = A.filter(a => a.status === 'done').length, late = A.filter(U.isLate).length, soon = A.filter(a => U.semaforo(a) === 'soon').length;
    const owners = U.uniq(A.map(a => a.owner));
    const anyFilter = f.status !== 'all' || f.owner !== 'all' || f.q;
    return `
    <div class="page-head"><div><h1>Acuerdos y compromisos</h1><p class="note">Compromisos derivados de reuniones, con responsable y fecha de cumplimiento.</p></div>
      <div class="actions"><button class="btn btn-ghost" data-act="exportAgreementsCSV">${U.icon('download')}CSV</button><button class="btn btn-primary" data-act="new" data-entity="agreement">${U.icon('plus')}Nuevo acuerdo</button></div></div>

    <section class="stats-row">
      <button class="stat" data-act="agFilter" data-arg="all"><span>Acuerdos registrados</span><b>${A.length}</b></button>
      <button class="stat" data-act="agFilter" data-arg="open"><span>En seguimiento</span><b>${A.length - done}</b></button>
      <button class="stat s-warn" data-act="agFilter" data-arg="open"><span>Por vencer (${SNSP.config.dueSoonDays} días)</span><b>${soon}</b></button>
      <button class="stat s-late" data-act="agFilter" data-arg="late"><span>Vencidos</span><b>${late}</b></button>
      <button class="stat s-ok" data-act="agFilter" data-arg="done"><span>Cumplimiento</span><b>${U.pct(done, A.length)}%</b></button>
    </section>

    <div class="toolbar">
      <div class="filters">
        <label class="search-sm">${U.icon('search')}<input id="a-q" type="search" placeholder="Buscar acuerdo, reunión o responsable" value="${U.esc(f.q)}" data-input="agreements.q" aria-label="Buscar acuerdos"></label>
        <select id="a-status" aria-label="Filtrar por estado" data-change="agreements.status">${[['all', 'Todos los estados'], ['open', 'En seguimiento'], ['late', 'Vencidos'], ...Object.entries(K.status)].map(([v, l]) => `<option value="${v}" ${f.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <select id="a-owner" aria-label="Filtrar por responsable" data-change="agreements.owner"><option value="all">Todos los responsables</option>${owners.map(o => `<option value="${U.esc(o)}" ${f.owner === o ? 'selected' : ''}>${U.esc(o)}</option>`).join('')}</select>
        ${anyFilter ? `<button class="link-btn" data-act="clearAgFilters">${U.icon('x')}Limpiar filtros</button>` : ''}
      </div>
      <div class="tools"><span class="count-note">${list.length} de ${A.length}</span>
        <div class="seg-toggle" role="group" aria-label="Vista"><button class="${f.mode === 'group' ? 'on' : ''}" data-act="mode" data-key="agreements" data-arg="group" aria-pressed="${f.mode === 'group'}">${U.icon('users')}<span>Por reunión</span></button><button class="${f.mode === 'list' ? 'on' : ''}" data-act="mode" data-key="agreements" data-arg="list" aria-pressed="${f.mode === 'list'}">${U.icon('list')}<span>Lista</span></button></div></div>
    </div>

    ${!A.length ? `<div class="panel">${UI.empty('clipboard', 'Aún no hay acuerdos registrados', 'Registra los acuerdos de la siguiente reunión de trabajo con su responsable y fecha compromiso.', `<button class="btn btn-primary btn-sm" data-act="new" data-entity="agreement">${U.icon('plus')}Nuevo acuerdo</button>`)}</div>`
      : !list.length ? `<div class="panel">${UI.empty('filter', 'Ningún acuerdo coincide', 'Ajusta o limpia los filtros.', `<button class="btn btn-ghost btn-sm" data-act="clearAgFilters">Limpiar filtros</button>`)}</div>`
      : f.mode === 'group' ? `<div class="stack">${grouped(list)}</div>` : `<div class="panel flush"><div class="table-wrap"><table class="table rtable">${head}<tbody>${list.map(row).join('')}</tbody></table></div></div>`}`;
  };
})();
