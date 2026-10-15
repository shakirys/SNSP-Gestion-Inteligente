/* ==========================================================================
   Componentes de interfaz: avisos, diálogos, formularios, validación y gráficas
   ========================================================================== */
(function () {
  const U = SNSP.util, K = SNSP.catalog;
  const $ = id => document.getElementById(id);
  const UI = {};

  /* ---------------- Avisos (toast) ---------------- */
  UI.toast = (msg, type = 'ok') => {
    const box = $('toasts'); if (!box) return;
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.innerHTML = U.icon(type === 'error' ? 'alert' : type === 'info' ? 'info' : 'checkCircle') + `<span>${U.esc(msg)}</span>`;
    box.appendChild(el);
    while (box.children.length > 3) box.firstElementChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, type === 'error' ? 6000 : 3200);
  };

  /* ---------------- Confirmación propia (no depende de window.confirm) ---------------- */
  UI.confirm = ({ title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = false }) => new Promise(resolve => {
    const layer = $('confirm');
    layer.innerHTML = `<div class="confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="cf-title" aria-describedby="cf-msg">
      <div class="confirm-icon ${danger ? 'is-danger' : ''}">${U.icon(danger ? 'alert' : 'info')}</div>
      <div><h3 id="cf-title">${U.esc(title)}</h3><p id="cf-msg">${message}</p></div>
      <footer><button type="button" class="btn btn-ghost" data-cf="0">${U.esc(cancelLabel)}</button>
      <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-cf="1">${U.esc(confirmLabel)}</button></footer></div>`;
    layer.hidden = false;
    const done = v => { layer.hidden = true; layer.innerHTML = ''; document.removeEventListener('keydown', key, true); resolve(v); };
    const key = e => { if (e.key === 'Escape') { e.stopPropagation(); done(false); } };
    document.addEventListener('keydown', key, true);
    layer.onclick = e => { const b = e.target.closest('[data-cf]'); if (b) done(b.dataset.cf === '1'); else if (e.target === layer) done(false); };
    setTimeout(() => layer.querySelector(danger ? '[data-cf="0"]' : '[data-cf="1"]')?.focus(), 30);
  });

  /* ---------------- Campos de formulario ---------------- */
  function fieldHTML(f) {
    const id = 'f_' + f.name, v = f.value ?? '';
    const req = f.required ? ' required aria-required="true"' : '';
    const lab = `<label for="${id}">${U.esc(f.label)}${f.required ? ' <span class="req" aria-hidden="true">*</span>' : ''}</label>`;
    let input;
    if (f.type === 'select') {
      input = `<select id="${id}" name="${f.name}"${req}>${f.options.map(([val, lbl]) => `<option value="${U.esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${U.esc(lbl)}</option>`).join('')}</select>`;
    } else if (f.type === 'textarea') {
      input = `<textarea id="${id}" name="${f.name}" rows="${f.rows || 3}" placeholder="${U.esc(f.placeholder || '')}"${req}>${U.esc(v)}</textarea>`;
    } else if (f.type === 'segmented') {
      input = `<div class="segmented" role="radiogroup" aria-label="${U.esc(f.label)}">${f.options.map(([val, lbl]) => `<label class="seg seg-${U.esc(val)}"><input type="radio" name="${f.name}" value="${U.esc(val)}" ${String(val) === String(v) ? 'checked' : ''}><span>${U.esc(lbl)}</span></label>`).join('')}</div>`;
      return `<div class="field ${f.full ? 'full' : ''}" data-field="${f.name}"><span class="label-like" id="${id}">${U.esc(f.label)}</span>${input}<div class="err" aria-live="polite"></div></div>`;
    } else {
      input = `<input id="${id}" name="${f.name}" type="${f.type || 'text'}" value="${U.esc(v)}" placeholder="${U.esc(f.placeholder || '')}"${f.list ? ` list="${f.list}"` : ''}${req} autocomplete="off">`;
    }
    return `<div class="field ${f.full ? 'full' : ''}" data-field="${f.name}">${lab}${input}${f.help ? `<small class="help">${U.esc(f.help)}</small>` : ''}<div class="err" aria-live="polite"></div></div>`;
  }
  UI.datalist = (id, values) => `<datalist id="${id}">${values.map(v => `<option value="${U.esc(v)}"></option>`).join('')}</datalist>`;

  /* ---------------- Ventana de edición ---------------- */
  let modalDirty = false, modalOpen = false;
  UI.isModalOpen = () => modalOpen;

  UI.form = ({ title, subtitle = '', icon = 'edit', fields, extra = '', onSave, validate, onDelete, saveLabel = 'Guardar' }) => {
    const layer = $('dialog');
    modalDirty = false; modalOpen = true;
    layer.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="m-title">
      <header class="modal-head"><div class="modal-ic">${U.icon(icon)}</div><div><h2 id="m-title">${U.esc(title)}</h2>${subtitle ? `<p>${U.esc(subtitle)}</p>` : ''}</div>
      <button type="button" class="icon-btn" data-m="close" aria-label="Cerrar">${U.icon('x')}</button></header>
      <form id="editor" novalidate><div class="formgrid">${fields.map(fieldHTML).join('')}</div>${extra}
      <p class="req-note"><span class="req">*</span> Campo obligatorio</p>
      <footer class="modal-foot">${onDelete ? `<button type="button" class="btn btn-danger-ghost" data-m="delete">${U.icon('trash')}Eliminar</button>` : ''}<span class="grow"></span>
      <button type="button" class="btn btn-ghost" data-m="close">Cancelar</button><button class="btn btn-primary" type="submit">${U.icon('check')}${U.esc(saveLabel)}</button></footer></form></div>`;
    layer.hidden = false;
    document.body.classList.add('no-scroll');
    const form = $('editor');
    form.addEventListener('input', () => { modalDirty = true; });
    form.addEventListener('change', () => { modalDirty = true; });
    setTimeout(() => form.querySelector('input:not([type=radio]),select,textarea')?.focus(), 40);

    form.onsubmit = e => {
      e.preventDefault();
      const values = Object.fromEntries(new FormData(form));
      Object.keys(values).forEach(k => { if (typeof values[k] === 'string') values[k] = values[k].trim(); });
      const errors = {};
      fields.forEach(f => {
        const v = values[f.name];
        if (f.required && !v) errors[f.name] = 'Este campo es obligatorio.';
        else if (f.type === 'url' && v && !U.isHttpUrl(v)) errors[f.name] = 'Escribe un enlace completo que inicie con https:// o http://';
        else if (f.type === 'date' && v && !U.isDate(v)) errors[f.name] = 'Fecha no válida.';
      });
      Object.assign(errors, validate ? (validate(values) || {}) : {});
      form.querySelectorAll('.field').forEach(el => { el.classList.remove('has-err'); el.querySelector('.err').textContent = ''; });
      const keys = Object.keys(errors);
      if (keys.length) {
        keys.forEach(k => { const el = form.querySelector(`[data-field="${k}"]`); if (el) { el.classList.add('has-err'); el.querySelector('.err').textContent = errors[k]; } });
        form.querySelector(`[data-field="${keys[0]}"] input, [data-field="${keys[0]}"] select, [data-field="${keys[0]}"] textarea`)?.focus();
        UI.toast('Revisa los campos marcados antes de guardar.', 'error');
        return;
      }
      onSave(values);
      UI.closeModal(true);
    };
    layer.onclick = async e => {
      const b = e.target.closest('[data-m]');
      if (!b) return;
      if (b.dataset.m === 'close') UI.closeModal();
      if (b.dataset.m === 'delete') { if (await onDelete()) UI.closeModal(true); }
    };
  };

  UI.closeModal = async (force = false) => {
    if (!modalOpen) return;
    if (!force && modalDirty) {
      const ok = await UI.confirm({ title: '¿Descartar cambios?', message: 'Hay información capturada que aún no se ha guardado.', confirmLabel: 'Descartar', cancelLabel: 'Seguir editando', danger: true });
      if (!ok) return;
    }
    const layer = $('dialog');
    layer.hidden = true; layer.innerHTML = ''; modalOpen = false; modalDirty = false;
    document.body.classList.remove('no-scroll');
  };

  /* ---------------- Insignias ---------------- */
  UI.status = s => `<span class="status st-${U.esc(s)}">${U.esc(K.status[s] || s)}</span>`;
  UI.prio = p => `<span class="prio pr-${U.esc(p)}" title="Prioridad ${U.esc(K.priority[p] || p)}">${U.icon('flag')}${U.esc(K.priority[p] || p)}</span>`;
  UI.sem = (item, withText = true) => {
    const s = U.semaforo(item);
    const extra = (s === 'late' || s === 'soon') ? ` · ${U.relDays(item.due).replace('Vence ', '').replace('Vencida ', '')}` : '';
    return `<span class="sem sem-${s}" title="${U.esc(K.semaforo[s])}"><i aria-hidden="true"></i>${withText ? `<span>${K.semaforo[s]}${s === 'soon' || s === 'late' ? `<small>${U.esc(extra)}</small>` : ''}</span>` : `<span class="sr">${K.semaforo[s]}</span>`}</span>`;
  };
  UI.statusSelect = (entity, rec) => `<select class="inline-status st-${rec.status}" data-act="setStatus" data-entity="${entity}" data-id="${U.esc(rec.id)}" aria-label="Cambiar estado de ${U.esc(rec.name)}">${K.statusOrder.map(s => `<option value="${s}" ${rec.status === s ? 'selected' : ''}>${K.status[s]}</option>`).join('')}</select>`;
  UI.progress = (pct, cls = '') => `<div class="progress ${cls}" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>`;
  UI.empty = (icon, title, text, action = '') => `<div class="empty">${U.icon(icon)}<strong>${U.esc(title)}</strong><p>${text}</p>${action}</div>`;

  /* ---------------- Gráficas (SVG propio, sin librerías externas) ---------------- */
  const STATUS_COLORS = { done: 'var(--c-done)', progress: 'var(--c-progress)', blocked: 'var(--c-blocked)', pending: 'var(--c-pending)' };
  UI.STATUS_COLORS = STATUS_COLORS;

  UI.donut = (segments, centerTop, centerBottom) => {
    const total = segments.reduce((s, x) => s + x.value, 0);
    const r = 70, C = 2 * Math.PI * r, gap = total && segments.filter(s => s.value).length > 1 ? 3 : 0;
    let off = 0;
    const arcs = segments.filter(s => s.value).map(s => {
      const len = s.value / total * C, dash = Math.max(len - gap, 0.5);
      const el = `<circle cx="90" cy="90" r="${r}" fill="none" stroke="${s.color}" stroke-width="22" stroke-dasharray="${dash} ${C - dash}" stroke-dashoffset="${-off}" data-tip="${U.esc(s.label)}: ${s.value} (${U.pct(s.value, total)}%)" tabindex="0"></circle>`;
      off += len; return el;
    }).join('');
    const legend = segments.map(s => `<li><i style="background:${s.color}"></i><span>${U.esc(s.label)}</span><b>${s.value}</b><em>${U.pct(s.value, total)}%</em></li>`).join('');
    return `<div class="donut-wrap"><svg class="donut" viewBox="0 0 180 180" role="img" aria-label="Distribución: ${segments.map(s => s.label + ' ' + s.value).join(', ')}">
      <circle cx="90" cy="90" r="${r}" fill="none" stroke="var(--track)" stroke-width="22"></circle>
      <g transform="rotate(-90 90 90)">${arcs}</g>
      <text x="90" y="88" text-anchor="middle" class="donut-num">${centerTop}</text><text x="90" y="110" text-anchor="middle" class="donut-lbl">${U.esc(centerBottom)}</text></svg>
      <ul class="legend legend-col">${legend}</ul></div>`;
  };

  UI.columns = (cats, series, opts = {}) => {
    const W = 560, H = 230, L = 34, R = 8, T = 26, B = 34;
    const max = Math.max(1, ...cats.map(c => series.reduce((s, se) => s + (c.values[se.key] || 0), 0)));
    const step = max <= 4 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : Math.ceil(max / 5 / 5) * 5;
    const top = Math.ceil(max / step) * step;
    const y = v => T + (H - T - B) * (1 - v / top);
    const bw = Math.min(46, (W - L - R) / cats.length * 0.52);
    let g = '';
    for (let v = 0; v <= top; v += step) g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid-line"></line><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" class="axis-t">${v}</text>`;
    const bars = cats.map((c, i) => {
      const cx = L + (W - L - R) / cats.length * (i + 0.5);
      let acc = 0, segs = '';
      const tot = series.reduce((s, se) => s + (c.values[se.key] || 0), 0);
      const visible = series.filter(se => c.values[se.key]);
      visible.forEach((se, j) => {
        const v = c.values[se.key]; const yb = y(acc), yt = y(acc + v); acc += v;
        const bottom = yb - (j > 0 ? 2 : 0), h = Math.max(bottom - yt, 1), x = cx - bw / 2;
        const rr = j === visible.length - 1 ? Math.min(4, h) : 0;
        const path = `M${x},${bottom} V${yt + rr} Q${x},${yt} ${x + rr},${yt} H${x + bw - rr} Q${x + bw},${yt} ${x + bw},${yt + rr} V${bottom} Z`;
        segs += `<path d="${path}" fill="${se.color}"></path>`;
      });
      const tip = `${c.full || c.label}\n` + series.map(se => `${se.label}: ${c.values[se.key] || 0}`).join('\n') + (opts.rate ? `\nCumplimiento: ${opts.rate(c)}` : '');
      return `<g class="col${c.current ? ' is-current' : ''}" data-tip="${U.esc(tip)}" tabindex="0">
        <rect x="${cx - (W - L - R) / cats.length / 2}" y="${T - 20}" width="${(W - L - R) / cats.length}" height="${H - T - B + 20}" fill="transparent"></rect>${segs}
        ${tot && opts.rate ? `<text x="${cx}" y="${y(tot) - 7}" text-anchor="middle" class="bar-val">${opts.rate(c)}</text>` : ''}
        <text x="${cx}" y="${H - B + 18}" text-anchor="middle" class="axis-t ${c.current ? 'is-current' : ''}">${U.esc(c.label)}</text></g>`;
    }).join('');
    const legend = series.map(s => `<li><i style="background:${s.color}"></i><span>${U.esc(s.label)}</span></li>`).join('');
    return `<ul class="legend legend-row">${legend}</ul><svg class="colchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${U.esc(opts.aria || 'Gráfica de columnas')}">${g}<line x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}" class="base-line"></line>${bars}</svg>`;
  };

  UI.hbars = rows => `<ul class="hbars">${rows.map(r => `<li data-tip="${U.esc(r.tip || '')}">
      <button type="button" class="hb-label" data-act="${r.act || ''}" data-id="${U.esc(r.id || '')}"><span>${U.esc(r.label)}</span><small>${U.esc(r.note || '')}</small></button>
      <div class="hb-track"><span style="width:${r.pct}%"></span></div><b>${r.pct}%</b></li>`).join('')}</ul>`;

  SNSP.ui = UI;
})();
