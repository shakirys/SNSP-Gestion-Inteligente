/* Calendario institucional */
(function () {
  const U = SNSP.util, K = SNSP.catalog, S = SNSP.store, UI = SNSP.ui;
  const KIND = {
    event: { label: 'Reuniones y eventos', short: 'Reunión' },
    task: { label: 'Entregas de actividades', short: 'Entrega' },
    agreement: { label: 'Acuerdos', short: 'Acuerdo' },
    project: { label: 'Fechas meta de proyecto', short: 'Meta' }
  };
  const visible = () => SNSP.state.cal.show;
  const itemsOn = iso => S.itemsOn(iso).filter(x => visible()[x.kind]);

  function chip(x) {
    const r = x.rec, late = (x.kind === 'task' || x.kind === 'agreement') && U.isLate(r), done = r.status === 'done';
    const time = x.kind === 'event' && r.time ? `<b>${U.esc(r.time)}</b> ` : '';
    return `<button type="button" class="chip k-${x.kind}${late ? ' is-late' : ''}${done ? ' is-done' : ''}" data-act="edit" data-entity="${x.kind}" data-id="${U.esc(r.id)}" title="${U.esc(KIND[x.kind].short + ': ' + r.name)}">${time}${U.esc(r.name)}</button>`;
  }

  function dayItem(x) {
    const r = x.rec;
    const sub = x.kind === 'event' ? [K.eventType[r.type], r.time, r.place].filter(Boolean).join(' · ')
      : x.kind === 'project' ? `Fecha meta · ${r.owner || 'Sin responsable'}`
      : `${r.owner || 'Sin responsable'}${x.kind === 'task' ? ' · ' + S.pname(r.project) : r.context ? ' · ' + r.context : ''}`;
    return `<li><button class="day-item k-${x.kind}" data-act="edit" data-entity="${x.kind}" data-id="${U.esc(r.id)}">
      <span class="kbar"></span><span class="di-body"><span class="agenda-tag">${KIND[x.kind].short}</span><strong>${U.esc(r.name)}</strong><small>${U.esc(sub)}</small></span>
      ${x.kind === 'task' || x.kind === 'agreement' ? UI.status(r.status) : ''}</button></li>`;
  }

  SNSP.views.calendar = () => {
    const c = SNSP.state.cal, T = U.today();
    const y = c.year, m = c.month;
    const firstDow = (new Date(y, m, 1).getDay() + 6) % 7; // semana inicia en lunes
    const days = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDow; i++) cells.push('<div class="cday off" aria-hidden="true"></div>');
    let monthCount = 0;
    for (let d = 1; d <= days; d++) {
      const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const items = itemsOn(iso); monthCount += items.length;
      const dow = (firstDow + d - 1) % 7;
      const cls = ['cday', iso === T ? 'is-today' : '', iso === c.selected ? 'is-sel' : '', dow >= 5 ? 'is-wkend' : ''].join(' ');
      const kinds = [...new Set(items.map(x => x.kind))];
      cells.push(`<div class="${cls}" data-act="selectDay" data-arg="${iso}" role="gridcell" tabindex="0" aria-label="${U.esc(U.fmtLong(iso))}: ${U.plural(items.length, 'compromiso')}">
        <span class="cnum">${d}</span>
        <div class="chips">${items.slice(0, 3).map(chip).join('')}${items.length > 3 ? `<span class="more">+${items.length - 3} más</span>` : ''}</div>
        <div class="dots" aria-hidden="true">${kinds.map(k => `<i class="k-${k}"></i>`).join('')}</div></div>`);
    }
    while (cells.length % 7) cells.push('<div class="cday off" aria-hidden="true"></div>');

    const sel = c.selected, selItems = itemsOn(sel);
    const next = [];
    for (let i = 0; i <= 14; i++) { const iso = U.addDays(T, i); itemsOn(iso).filter(x => x.rec.status !== 'done').forEach(x => next.push({ iso, ...x })); }

    return `
    <div class="page-head"><div><h1>Calendario institucional</h1><p class="note">Reuniones, entregas de actividades, acuerdos y fechas meta. Selecciona un día para ver el detalle o agendar.</p></div>
      <div class="actions"><button class="btn btn-ghost" data-act="new" data-entity="task" data-due="${sel}">${U.icon('tasks')}Actividad</button><button class="btn btn-primary" data-act="new" data-entity="event" data-date="${sel}">${U.icon('plus')}Nueva reunión</button></div></div>

    <div class="cal-layout">
      <section class="panel cal-panel">
        <div class="cal-head">
          <div class="cal-nav"><button class="icon-btn" data-act="shift" data-arg="-1" aria-label="Mes anterior">${U.icon('chevL')}</button>
            <h2>${U.cap(U.monthLabel(y, m))}</h2>
            <button class="icon-btn" data-act="shift" data-arg="1" aria-label="Mes siguiente">${U.icon('chevR')}</button>
            <button class="btn btn-ghost btn-sm" data-act="calToday">Hoy</button></div>
          <div class="cal-legend" role="group" aria-label="Mostrar en el calendario">${Object.entries(KIND).map(([k, v]) => `<label class="lg k-${k}"><input type="checkbox" data-act="calShow" data-arg="${k}" ${visible()[k] ? 'checked' : ''}><i></i>${v.label}</label>`).join('')}</div>
        </div>
        <div class="cal-grid" role="grid" aria-label="${U.esc(U.monthLabel(y, m))}">
          ${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(x => `<div class="cweek" role="columnheader">${x}</div>`).join('')}
          ${cells.join('')}
        </div>
        ${!monthCount ? `<p class="cal-empty">${U.icon('info')}No hay compromisos con fecha en este mes.</p>` : ''}
      </section>

      <aside class="cal-side">
        <section class="panel">
          <header class="panel-head"><div><h2>${U.cap(U.fmtLong(sel))}</h2><p>${sel === T ? 'Hoy · ' : ''}${U.plural(selItems.length, 'compromiso')}</p></div></header>
          ${selItems.length ? `<ul class="day-list">${selItems.map(dayItem).join('')}</ul>` : `<p class="muted small">Sin compromisos para este día.</p>`}
          <div class="day-actions">
            <button class="btn btn-ghost btn-sm" data-act="new" data-entity="event" data-date="${sel}">${U.icon('users')}Reunión</button>
            <button class="btn btn-ghost btn-sm" data-act="new" data-entity="task" data-due="${sel}">${U.icon('tasks')}Actividad</button>
            <button class="btn btn-ghost btn-sm" data-act="new" data-entity="agreement" data-due="${sel}">${U.icon('clipboard')}Acuerdo</button>
          </div>
        </section>
        <section class="panel">
          <header class="panel-head"><div><h2>Próximos 15 días</h2><p>Pendientes por atender</p></div></header>
          ${next.length ? `<ul class="next-list">${next.slice(0, 10).map(x => `<li><button data-act="edit" data-entity="${x.kind}" data-id="${U.esc(x.rec.id)}" class="k-${x.kind}"><span class="nl-date">${U.fmtShort(x.iso)}</span><i></i><span class="nl-name">${U.esc(x.rec.name)}</span></button></li>`).join('')}</ul>${next.length > 10 ? `<p class="muted small">y ${next.length - 10} más</p>` : ''}` : '<p class="muted small">Sin compromisos pendientes en los próximos 15 días.</p>'}
        </section>
      </aside>
    </div>`;
  };
})();
