/* ==========================================================================
   Formularios de captura y edición (proyectos, actividades, acuerdos, reuniones)
   Conservan todos los campos de la V1 y agregan campos opcionales.
   ========================================================================== */
(function () {
  const U = SNSP.util, K = SNSP.catalog, S = SNSP.store, UI = SNSP.ui;
  const E = {};
  const opts = obj => Object.entries(obj);
  const refresh = () => SNSP.app.render();

  async function confirmDelete(entity, rec, extraMsg = '') {
    const ok = await UI.confirm({
      title: `¿Eliminar ${K.entity[entity].toLowerCase()}?`,
      message: `Se eliminará <strong>${U.esc(rec.name || 'sin nombre')}</strong>. ${extraMsg}Esta acción no se puede deshacer; si lo necesitas, descarga antes un respaldo JSON desde Reportes.`,
      confirmLabel: 'Eliminar', danger: true
    });
    if (!ok) return false;
    S.remove(entity, rec.id);
    UI.toast(`${K.entity[entity]} ${entity === 'task' || entity === 'event' ? 'eliminada' : 'eliminado'}.`);
    refresh();
    return true;
  }
  E.confirmDelete = confirmDelete;
  E.deleteById = (entity, id) => { const rec = S.find(entity, id); if (!rec) return; return confirmDelete(entity, rec, deleteNote(entity, rec)); };
  function deleteNote(entity, rec) {
    if (entity !== 'project') return '';
    const n = S.data.tasks.filter(t => t.project === rec.id).length + S.data.agreements.filter(a => a.project === rec.id).length;
    return n ? `Sus ${U.plural(n, 'registro asociado', 'registros asociados')} (actividades o acuerdos) se conservarán como <em>Sin proyecto</em>. ` : '';
  }


  /* ---------------- Campo Responsable con catálogo ---------------- */
  const NEW = '__nuevo__';
  function ownerOptions(current) {
    const key = S.personKey(current);
    const opt = r => `<option value="${U.esc(r.name)}" ${S.personKey(r.name) === key ? 'selected' : ''}>${U.esc(r.name)}${r.role ? ' · ' + U.esc(r.role) : ''}</option>`;
    const list = S.people();
    const persons = list.filter(r => r.kind !== 'team'), teams = list.filter(r => r.kind === 'team');
    return `<option value="" ${key ? '' : 'selected'}>Sin asignar</option>
      ${persons.length ? `<optgroup label="Personas">${persons.map(opt).join('')}</optgroup>` : ''}
      ${teams.length ? `<optgroup label="Equipos">${teams.map(opt).join('')}</optgroup>` : ''}
      <option value="${NEW}">+ Nuevo responsable</option>`;
  }
  function ownerFieldHTML(current) {
    return `<label for="f_owner">Responsable</label>
      <select id="f_owner" name="owner">${ownerOptions(current)}</select>
      <small class="help owner-hint" id="owner-hint"></small>
      <div class="newperson" id="np" hidden>
        <p class="np-title">${U.icon('user')}Nuevo responsable</p>
        <div class="np-grid">
          <div class="field"><label for="np_name">Nombre completo <span class="req" aria-hidden="true">*</span></label><input id="np_name" type="text" autocomplete="off" placeholder="Ej. Dra. María López Hernández"></div>
          <div class="field"><label for="np_role">Cargo <span class="muted">(opcional)</span></label><input id="np_role" type="text" autocomplete="off" placeholder="Ej. Analista de datos"></div>
        </div>
        <label class="np-team"><input id="np_team" type="checkbox"> Es un equipo o responsable colectivo</label>
        <div class="err np-err" aria-live="polite"></div>
        <div class="np-actions"><button type="button" class="btn btn-ghost btn-sm" data-np="cancel">Cancelar</button><button type="button" class="btn btn-primary btn-sm" data-np="add">${U.icon('plus')}Agregar y seleccionar</button></div>
      </div>`;
  }
  function bindOwnerField(form) {
    const sel = form.querySelector('#f_owner'), np = form.querySelector('#np'), hint = form.querySelector('#owner-hint');
    const nm = form.querySelector('#np_name'), rl = form.querySelector('#np_role'), tm = form.querySelector('#np_team'), err = form.querySelector('.np-err');
    let prev = sel.value;
    const showHint = () => {
      const p = S.findPerson(sel.value);
      hint.textContent = p ? (p.role ? `Cargo: ${p.role}` : 'Sin cargo registrado') : sel.value === NEW ? '' : 'El proyecto quedará sin responsable asignado.';
    };
    const close = restore => { np.hidden = true; err.textContent = ''; if (restore) sel.value = prev; showHint(); };
    const add = () => {
      const name = S.cleanName(nm.value);
      if (name.length < 3) { err.textContent = 'Escribe el nombre completo del responsable.'; nm.focus(); return; }
      const { person, existed } = S.addPerson(name, rl.value, tm.checked ? 'team' : 'person');
      sel.innerHTML = ownerOptions(person.name);
      prev = sel.value = person.name;
      close(false);
      sel.closest('.field').classList.remove('has-err'); sel.closest('.field').querySelector(':scope > .err').textContent = '';
      UI.toast(existed ? `«${person.name}» ya estaba registrado; quedó seleccionado.` : `Responsable agregado: ${person.name}.`, existed ? 'info' : 'ok');
      sel.focus();
    };
    sel.addEventListener('change', () => {
      if (sel.value === NEW) { np.hidden = false; nm.value = ''; rl.value = ''; tm.checked = false; err.textContent = ''; hint.textContent = ''; setTimeout(() => nm.focus(), 20); }
      else { prev = sel.value; close(false); }
    });
    np.addEventListener('click', e => { const b = e.target.closest('[data-np]'); if (!b) return; b.dataset.np === 'add' ? add() : (close(true), sel.focus()); });
    np.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.matches('input[type=text]')) { e.preventDefault(); add(); }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); sel.focus(); }
    });
    showHint();
  }

  /* ---------------- Proyecto ---------------- */
  E.project = id => {
    const p = id ? S.find('project', id) : null;
    if (id && !p) return UI.toast('El proyecto ya no existe.', 'error');
    const v = p || { priority: 'media', status: 'active', owner: '' };
    UI.form({
      title: p ? 'Editar proyecto' : 'Nuevo proyecto', icon: 'target',
      subtitle: p ? `Avance actual: ${S.stats(p.id).pct}% según sus actividades` : 'Registra un proyecto o meta del plan de trabajo',
      fields: [
        { name: 'name', label: 'Nombre', value: v.name, full: true, required: true, placeholder: 'Ej. ASIS por localidad' },
        { name: 'goal', label: 'Objetivo / meta', value: v.goal, type: 'textarea', rows: 2, full: true, required: true },
        { name: 'owner', type: 'custom', full: true, html: ownerFieldHTML(v.owner) },
        { name: 'status', label: 'Estado del proyecto', type: 'select', options: opts(K.projectStatus), value: v.status },
        { name: 'start', label: 'Fecha de inicio', type: 'date', value: v.start },
        { name: 'target', label: 'Fecha meta', type: 'date', value: v.target },
        { name: 'priority', label: 'Prioridad', type: 'segmented', options: opts(K.priority), value: v.priority, full: true }
      ],
      validate: x => {
        const e = {};
        if (x.start && x.target && x.target < x.start) e.target = 'La fecha meta no puede ser anterior a la fecha de inicio.';
        if (x.owner === NEW) e.owner = 'Termina de agregar el nuevo responsable o elige uno de la lista.';
        return e;
      },
      onMount: bindOwnerField,
      onDelete: p ? () => confirmDelete('project', p, deleteNote('project', p)) : null,
      onSave: vals => {
        const person = S.findPerson(vals.owner);
        vals.owner = person ? person.name : '';
        vals.ownerId = person ? person.id : '';
        S.upsert('project', id, vals); UI.toast(p ? 'Proyecto actualizado.' : 'Proyecto creado.'); refresh();
      }
    });
  };

  /* ---------------- Actividad ---------------- */
  E.task = (id, preset = {}) => {
    const t = id ? S.find('task', id) : null;
    if (id && !t) return UI.toast('La actividad ya no existe.', 'error');
    const projOpts = S.data.projects.map(p => [p.id, p.name]).concat([['', 'Sin proyecto']]);
    const v = t || { status: 'pending', priority: 'media', project: preset.project ?? (S.data.projects[0]?.id || ''), due: preset.due || '' };
    UI.form({
      title: t ? 'Editar actividad' : 'Nueva actividad', icon: 'tasks',
      subtitle: t ? `${U.relDays(t.due)} · ${K.status[t.status]}` : 'Actividad o entregable con fecha compromiso',
      fields: [
        { name: 'name', label: 'Actividad / entregable', value: v.name, full: true, required: true },
        { name: 'project', label: 'Proyecto', type: 'select', options: projOpts, value: v.project },
        { name: 'owner', label: 'Responsable', value: v.owner, required: true, list: 'dl-owners' },
        { name: 'due', label: 'Fecha compromiso', type: 'date', value: v.due },
        { name: 'status', label: 'Estado', type: 'select', options: opts(K.status), value: v.status },
        { name: 'priority', label: 'Prioridad', type: 'segmented', options: opts(K.priority), value: v.priority, full: true },
        { name: 'evidence', label: 'Enlace a evidencia (https://...)', type: 'url', value: v.evidence, full: true, placeholder: 'https://drive.google.com/…', help: 'Carpeta o documento donde se resguarda el entregable.' },
        { name: 'detail', label: 'Notas / seguimiento', type: 'textarea', value: v.detail, full: true }
      ],
      extra: UI.datalist('dl-owners', S.owners()),
      onDelete: t ? () => confirmDelete('task', t) : null,
      onSave: vals => { S.upsert('task', id, vals); UI.toast(t ? 'Actividad actualizada.' : 'Actividad registrada.'); refresh(); }
    });
  };

  /* ---------------- Acuerdo ---------------- */
  E.agreement = (id, preset = {}) => {
    const a = id ? S.find('agreement', id) : null;
    if (id && !a) return UI.toast('El acuerdo ya no existe.', 'error');
    const v = a || { status: 'pending', due: preset.due || '', context: preset.context || '', meetingDate: preset.meetingDate || '', project: '' };
    UI.form({
      title: a ? 'Editar acuerdo' : 'Nuevo acuerdo', icon: 'clipboard',
      subtitle: a ? `${U.relDays(a.due)} · ${K.status[a.status]}` : 'Compromiso derivado de una reunión de trabajo',
      fields: [
        { name: 'name', label: 'Acuerdo', value: v.name, full: true, required: true },
        { name: 'context', label: 'Reunión / contexto', value: v.context, list: 'dl-contexts', placeholder: 'Ej. Reunión de seguimiento ASIS' },
        { name: 'meetingDate', label: 'Fecha de la reunión', type: 'date', value: v.meetingDate },
        { name: 'owner', label: 'Responsable', value: v.owner, list: 'dl-owners' },
        { name: 'due', label: 'Fecha compromiso', type: 'date', value: v.due },
        { name: 'status', label: 'Estado', type: 'select', options: opts(K.status), value: v.status },
        { name: 'project', label: 'Proyecto relacionado', type: 'select', options: [['', 'Ninguno']].concat(S.data.projects.map(p => [p.id, p.name])), value: v.project },
        { name: 'notes', label: 'Observaciones', type: 'textarea', rows: 2, value: v.notes, full: true }
      ],
      extra: UI.datalist('dl-owners', S.owners()) + UI.datalist('dl-contexts', S.contexts()),
      validate: x => (x.meetingDate && x.due && x.due < x.meetingDate) ? { due: 'La fecha compromiso no puede ser anterior a la reunión.' } : {},
      onDelete: a ? () => confirmDelete('agreement', a) : null,
      onSave: vals => { S.upsert('agreement', id, vals); UI.toast(a ? 'Acuerdo actualizado.' : 'Acuerdo registrado.'); refresh(); }
    });
  };

  /* ---------------- Reunión / evento de calendario (nuevo) ---------------- */
  E.event = (id, preset = {}) => {
    const ev = id ? S.find('event', id) : null;
    if (id && !ev) return UI.toast('La reunión ya no existe.', 'error');
    const v = ev || { type: 'reunion', date: preset.date || U.today() };
    UI.form({
      title: ev ? 'Editar reunión o evento' : 'Nueva reunión o evento', icon: 'users',
      subtitle: 'Se muestra en el calendario institucional',
      fields: [
        { name: 'name', label: 'Título', value: v.name, full: true, required: true, placeholder: 'Ej. Reunión de seguimiento ASIS' },
        { name: 'type', label: 'Tipo', type: 'select', options: opts(K.eventType), value: v.type },
        { name: 'date', label: 'Fecha', type: 'date', value: v.date, required: true },
        { name: 'time', label: 'Hora', type: 'time', value: v.time },
        { name: 'place', label: 'Lugar o enlace', value: v.place },
        { name: 'participants', label: 'Participantes', value: v.participants, full: true },
        { name: 'notes', label: 'Notas', type: 'textarea', rows: 2, value: v.notes, full: true }
      ],
      onDelete: ev ? () => confirmDelete('event', ev) : null,
      onSave: vals => { S.upsert('event', id, vals); UI.toast(ev ? 'Reunión actualizada.' : 'Reunión agendada.'); refresh(); }
    });
  };

  E.open = (entity, id, preset) => E[entity] && E[entity](id, preset);
  SNSP.editors = E;
})();
