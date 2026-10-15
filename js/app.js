/* ==========================================================================
   Aplicación: estado de vista, navegación, eventos y búsqueda global
   ========================================================================== */
(function () {
  const C = SNSP.config, U = SNSP.util, K = SNSP.catalog, S = SNSP.store, UI = SNSP.ui, E = SNSP.editors;
  const $ = id => document.getElementById(id);
  const NAV = SNSP.nav.flatMap(g => g.items);
  const now = new Date();

  /* ---------------- Estado de la interfaz (preferencias por navegador) ---------------- */
  const defaults = () => ({
    view: 'dashboard',
    projects: { status: 'all', q: '', sort: 'none', mode: 'cards' },
    tasks: { status: 'all', project: 'all', owner: 'all', light: 'all', q: '', mode: 'list' },
    agreements: { status: 'all', owner: 'all', q: '', mode: 'group' },
    cal: { year: now.getFullYear(), month: now.getMonth(), selected: U.today(), show: { event: true, task: true, agreement: true, project: true } }
  });
  const state = defaults();
  try {
    const ui = JSON.parse(localStorage.getItem(C.uiKey) || '{}');
    if (ui.projects?.mode) state.projects.mode = ui.projects.mode;
    if (ui.tasks?.mode) state.tasks.mode = ui.tasks.mode;
    if (ui.agreements?.mode) state.agreements.mode = ui.agreements.mode;
    if (ui.cal?.show) Object.assign(state.cal.show, ui.cal.show);
  } catch { /* preferencias opcionales */ }
  const saveUI = () => { try { localStorage.setItem(C.uiKey, JSON.stringify({ projects: { mode: state.projects.mode }, tasks: { mode: state.tasks.mode }, agreements: { mode: state.agreements.mode }, cal: { show: state.cal.show } })); } catch { /* sin almacenamiento */ } };
  SNSP.state = state;

  /* ---------------- Estructura general ---------------- */
  function shell() {
    document.getElementById('app').innerHTML = `
    <aside class="sidebar" id="sidebar" aria-label="Menú principal">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true"><span>SN</span><span>SP</span></div>
        <div class="brand-text"><strong>Gestión Inteligente</strong><small>${U.esc(C.unit)}</small></div>
        <button class="icon-btn only-mobile on-dark" data-act="closeNav" aria-label="Cerrar menú">${U.icon('x')}</button>
      </div>
      <nav id="nav"></nav>
      <div class="side-foot" id="sideFoot"></div>
    </aside>
    <div class="scrim" id="scrim" data-act="closeNav" hidden></div>
    <div class="main-col">
      <header class="topbar">
        <button class="icon-btn only-mobile" data-act="openNav" aria-label="Abrir menú">${U.icon('menu')}</button>
        <div class="crumb" id="crumb"></div>
        <div class="gsearch" id="gsearch">
          <label>${U.icon('search')}<input id="gq" type="search" placeholder="Buscar en proyectos, actividades, acuerdos…" autocomplete="off" aria-label="Búsqueda global" aria-controls="gresults"></label>
          <div class="gresults" id="gresults" role="listbox" hidden></div>
        </div>
        <div class="quick">
          <button class="btn btn-primary" data-act="quickMenu" aria-haspopup="menu" aria-expanded="false" id="quickBtn">${U.icon('plus')}<span>Registrar</span>${U.icon('chevD', 'ic-sm')}</button>
          <div class="menu" id="quickMenu" role="menu" hidden>
            <button role="menuitem" data-act="new" data-entity="task">${U.icon('tasks')}Actividad</button>
            <button role="menuitem" data-act="new" data-entity="project">${U.icon('target')}Proyecto</button>
            <button role="menuitem" data-act="new" data-entity="agreement">${U.icon('clipboard')}Acuerdo</button>
            <button role="menuitem" data-act="new" data-entity="event">${U.icon('users')}Reunión o evento</button>
          </div>
        </div>
      </header>
      <main id="main" tabindex="-1"></main>
    </div>
    <div id="dialog" class="dialog" hidden></div>
    <div id="confirm" class="dialog confirm-layer" hidden></div>
    <div id="toasts" class="toasts" aria-live="polite"></div>
    <div id="tip" class="tip" role="tooltip" hidden></div>`;
  }

  function renderNav() {
    const D = S.data, late = D.tasks.filter(U.isLate).length, agLate = D.agreements.filter(U.isLate).length;
    const badge = { tasks: late, agreements: agLate };
    $('nav').innerHTML = SNSP.nav.map(g => `<div class="nav-group"><span class="nav-title">${g.group}</span>${g.items.map(it => `
      <a href="#${it.slug}" class="nav-item ${state.view === it.id ? 'active' : ''}" ${state.view === it.id ? 'aria-current="page"' : ''} data-nav="${it.id}">
        ${U.icon(it.icon)}<span>${it.label}</span>${badge[it.id] ? `<b class="nav-badge" title="${badge[it.id]} vencidas">${badge[it.id]}</b>` : ''}</a>`).join('')}</div>`).join('');
    const saved = S.lastSaved ? `Guardado ${S.lastSaved.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}` : 'Datos en este navegador';
    $('sideFoot').innerHTML = `<div class="store-state ${S.storageOK ? '' : 'is-err'}">${U.icon(S.storageOK ? 'database' : 'alert')}<span>${S.storageOK ? saved : 'No se puede guardar en este navegador'}</span></div>
      <div class="ver">Piloto local · V${C.version}<br>${U.esc(C.place)}</div>`;
  }

  function render() {
    const it = NAV.find(n => n.id === state.view) || NAV[0];
    const active = document.activeElement, keepId = active && active.id && active.matches('[data-input]') ? active.id : null, caret = keepId ? active.selectionStart : null;
    renderNav();
    $('crumb').innerHTML = `<span class="crumb-ic">${U.icon(it.icon)}</span><div><strong>${it.label}</strong><small>${it.sub}</small></div>`;
    $('main').innerHTML = `<div class="view view-${it.id}">${SNSP.views[it.id]()}</div>`;
    document.title = `${it.label} · ${C.appName}`;
    if (keepId && $(keepId)) { const el = $(keepId); el.focus(); try { el.setSelectionRange(caret, caret); } catch { } }
  }

  function go(view, { hash = true, focus = true } = {}) {
    if (!SNSP.views[view]) view = 'dashboard';
    state.view = view;
    const slug = NAV.find(n => n.id === view).slug;
    if (hash && location.hash.slice(1) !== slug) { try { history.pushState(null, '', '#' + slug); } catch { location.hash = slug; } }
    closeNav();
    render();
    window.scrollTo(0, 0);
    if (focus) $('main').focus({ preventScroll: true });
  }
  function fromHash() {
    const slug = location.hash.slice(1);
    const it = NAV.find(n => n.slug === slug || n.id === slug);
    if (slug === 'historial' || slug === 'respaldo') { state.view = 'reports'; render(); setTimeout(() => $(slug)?.scrollIntoView({ behavior: 'smooth' }), 50); return; }
    state.view = it ? it.id : 'dashboard'; render();
  }

  const openNav = () => { $('sidebar').classList.add('open'); $('scrim').hidden = false; };
  const closeNav = () => { $('sidebar')?.classList.remove('open'); if ($('scrim')) $('scrim').hidden = true; };
  const toggleQuick = force => { const m = $('quickMenu'), open = force ?? m.hidden; m.hidden = !open; $('quickBtn').setAttribute('aria-expanded', String(open)); };

  /* ---------------- Acciones (delegación de eventos) ---------------- */
  const A = {
    go: (b) => { go(b.dataset.arg); if (b.dataset.hash) setTimeout(() => $(b.dataset.hash)?.scrollIntoView({ behavior: 'smooth' }), 60); },
    openNav, closeNav,
    quickMenu: () => toggleQuick(),
    new: b => { toggleQuick(false); const d = b.dataset; E.open(d.entity, null, { project: d.project, due: d.due, date: d.date, context: d.context, meetingDate: d.meeting }); },
    edit: b => E.open(b.dataset.entity, b.dataset.id),
    delete: b => E.deleteById(b.dataset.entity, b.dataset.id),
    taskFilter: b => {
      Object.assign(state.tasks, { status: 'all', project: 'all', owner: 'all', light: 'all', q: '' });
      const v = b.dataset.arg; if (v === 'open' || v === 'done') state.tasks.status = v; else state.tasks.light = v;
      go('tasks');
    },
    goProjectTasks: b => { Object.assign(state.tasks, { status: 'all', project: b.dataset.id, owner: 'all', light: 'all', q: '' }); go('tasks'); },
    light: b => { state.tasks.light = state.tasks.light === b.dataset.arg ? 'all' : b.dataset.arg; render(); },
    clearTaskFilters: () => { Object.assign(state.tasks, { status: 'all', project: 'all', owner: 'all', light: 'all', q: '' }); render(); },
    clearAgFilters: () => { Object.assign(state.agreements, { status: 'all', owner: 'all', q: '' }); render(); },
    agFilter: b => { state.agreements.status = b.dataset.arg; render(); },
    pFilter: b => { state.projects.status = b.dataset.arg; render(); },
    mode: b => { state[b.dataset.key].mode = b.dataset.arg; saveUI(); render(); },
    shift: b => { const c = state.cal; c.month += +b.dataset.arg; if (c.month > 11) { c.month = 0; c.year++; } if (c.month < 0) { c.month = 11; c.year--; } render(); },
    calToday: () => { Object.assign(state.cal, { year: now.getFullYear(), month: new Date().getMonth(), selected: U.today() }); state.cal.year = new Date().getFullYear(); render(); },
    selectDay: b => { state.cal.selected = b.dataset.arg; render(); if (window.matchMedia('(max-width: 1080px)').matches) document.querySelector('.cal-side')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
    exportCSV: () => SNSP.exporter.tasksCSV(),
    exportAgreementsCSV: () => SNSP.exporter.agreementsCSV(),
    exportProjectsCSV: () => SNSP.exporter.projectsCSV(),
    exportJSON: () => SNSP.exporter.json(),
    importJSON: () => $('import')?.click(),
    print: () => { window.print(); },
    demoAdd: async () => {
      const ok = await UI.confirm({ title: '¿Cargar datos de demostración?', message: 'Se agregarán actividades, acuerdos y reuniones de ejemplo marcados como <em>Demostración</em>. Tus registros no se modifican y podrás quitarlos desde Reportes.', confirmLabel: 'Cargar demostración' });
      if (!ok) return; S.addDemo(); render(); UI.toast('Datos de demostración cargados.');
    },
    demoRemove: async () => {
      const ok = await UI.confirm({ title: '¿Quitar datos de demostración?', message: 'Se eliminarán solo los registros marcados como demostración. Tus registros se conservan.', confirmLabel: 'Quitar', danger: true });
      if (!ok) return; S.removeDemo(); render(); UI.toast('Datos de demostración eliminados.');
    }
  };

  function bind() {
    document.addEventListener('click', e => {
      if (!e.target.closest('.quick')) toggleQuick(false);
      if (!e.target.closest('#gsearch')) $('gresults').hidden = true;
      if (e.target.matches('input, select, textarea')) return;
      const nav = e.target.closest('[data-nav]');
      if (nav) { e.preventDefault(); go(nav.dataset.nav); return; }
      const b = e.target.closest('[data-act]');
      if (!b || b.closest('#dialog') || b.closest('#confirm')) return;
      const fn = A[b.dataset.act];
      if (fn) { e.preventDefault(); fn(b); }
    });

    document.addEventListener('change', e => {
      const t = e.target;
      if (t.id === 'import') return SNSP.exporter.importFile(t);
      if (t.matches('[data-act="setStatus"]')) {
        const rec = S.setStatus(t.dataset.entity, t.dataset.id, t.value);
        UI.toast(`Estado actualizado: ${K.status[t.value]}${rec ? ' · ' + rec.name : ''}`);
        return render();
      }
      if (t.matches('[data-act="calShow"]')) { state.cal.show[t.dataset.arg] = t.checked; saveUI(); return render(); }
      if (t.dataset.change) { const [k, f] = t.dataset.change.split('.'); state[k][f] = t.value; render(); }
    });

    let deb;
    document.addEventListener('input', e => {
      const t = e.target;
      if (t.dataset.input) { const [k, f] = t.dataset.input.split('.'); state[k][f] = t.value; clearTimeout(deb); deb = setTimeout(render, 160); }
      if (t.id === 'gq') globalSearch(t.value);
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (!$('confirm').hidden) return;
        if (UI.isModalOpen()) { UI.closeModal(); return; }
        toggleQuick(false); $('gresults').hidden = true; closeNav();
      }
      if (e.key === 'Enter' && e.target.matches('.cday')) { e.preventDefault(); A.selectDay(e.target); }
      if (e.key === '/' && !e.target.matches('input, textarea, select') && !UI.isModalOpen()) { e.preventDefault(); $('gq').focus(); }
      if (e.key === 'Enter' && e.target.id === 'gq') { const first = $('gresults').querySelector('button'); if (first) first.click(); }
    });

    window.addEventListener('popstate', fromHash);
    window.addEventListener('hashchange', fromHash);

    /* Información emergente de las gráficas */
    const tip = $('tip');
    const showTip = (el, x, y) => { tip.innerHTML = U.esc(el.dataset.tip).replace(/\n/g, '<br>'); tip.hidden = false; const r = tip.getBoundingClientRect(); tip.style.left = Math.min(window.innerWidth - r.width - 8, Math.max(8, x - r.width / 2)) + 'px'; tip.style.top = Math.max(8, y - r.height - 12) + 'px'; };
    document.addEventListener('mousemove', e => { const el = e.target.closest('[data-tip]'); if (el && el.dataset.tip) showTip(el, e.clientX, e.clientY); else tip.hidden = true; });
    document.addEventListener('focusin', e => { const el = e.target.closest?.('[data-tip]'); if (el && el.dataset.tip) { const r = el.getBoundingClientRect(); showTip(el, r.left + r.width / 2, r.top); } else tip.hidden = true; });
    document.addEventListener('scroll', () => { tip.hidden = true; }, true);

    /* Arrastrar y soltar en el tablero de actividades */
    document.addEventListener('dragstart', e => { const c = e.target.closest?.('[data-drag]'); if (!c) return; e.dataTransfer.setData('text/plain', c.dataset.drag); e.dataTransfer.effectAllowed = 'move'; c.classList.add('dragging'); });
    document.addEventListener('dragend', e => { e.target.closest?.('[data-drag]')?.classList.remove('dragging'); document.querySelectorAll('.drop-on').forEach(x => x.classList.remove('drop-on')); });
    document.addEventListener('dragover', e => { const col = e.target.closest?.('[data-drop]'); if (!col) return; e.preventDefault(); document.querySelectorAll('.drop-on').forEach(x => x !== col && x.classList.remove('drop-on')); col.classList.add('drop-on'); });
    document.addEventListener('drop', e => {
      const col = e.target.closest?.('[data-drop]'); if (!col) return; e.preventDefault();
      const id = e.dataTransfer.getData('text/plain'), t = S.find('task', id);
      if (t && t.status !== col.dataset.drop) { S.setStatus('task', id, col.dataset.drop); UI.toast(`Movida a ${K.status[col.dataset.drop]}: ${t.name}`); }
      render();
    });
  }

  /* ---------------- Búsqueda global ---------------- */
  function globalSearch(q) {
    const box = $('gresults');
    if (!q.trim()) { box.hidden = true; return; }
    const D = S.data, res = [];
    D.projects.forEach(p => U.matches(q, p.name, p.goal, p.owner) && res.push(['project', p, p.goal]));
    D.tasks.forEach(t => U.matches(q, t.name, t.detail, t.owner) && res.push(['task', t, `${S.pname(t.project)} · ${U.fmt(t.due)}`]));
    D.agreements.forEach(a => U.matches(q, a.name, a.context, a.owner) && res.push(['agreement', a, `${a.context || 'Sin reunión'} · ${U.fmt(a.due)}`]));
    D.events.forEach(ev => U.matches(q, ev.name, ev.place, ev.participants) && res.push(['event', ev, `${U.fmt(ev.date)} ${ev.time || ''}`]));
    const ic = { project: 'target', task: 'tasks', agreement: 'clipboard', event: 'users' };
    box.innerHTML = res.length ? res.slice(0, 8).map(([k, r, sub]) => `<button role="option" data-act="edit" data-entity="${k}" data-id="${U.esc(r.id)}">${U.icon(ic[k])}<span><strong>${U.esc(r.name)}</strong><small>${K.entity[k]} · ${U.esc(sub)}</small></span></button>`).join('') + (res.length > 8 ? `<p class="gmore">${res.length - 8} resultados más; escribe más palabras para acotar.</p>` : '')
      : `<p class="gmore">Sin resultados para “${U.esc(q)}”.</p>`;
    box.hidden = false;
  }
  document.addEventListener('click', e => { if (e.target.closest('#gresults [data-act]')) { $('gresults').hidden = true; $('gq').value = ''; } }, true);

  /* ---------------- Inicio ---------------- */
  function init() {
    const existed = S.load();
    shell(); bind();
    if (!existed && C.autoDemo && !S.data.tasks.length) S.addDemo();
    fromHash();
    if (!S.storageOK) UI.toast('Este navegador no permite guardar datos. Los cambios se perderán al cerrar; usa el respaldo JSON.', 'error');
  }

  SNSP.app = { render, go, state };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
