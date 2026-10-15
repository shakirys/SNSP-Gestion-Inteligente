/* ==========================================================================
   Utilidades: texto seguro, fechas locales, semáforo, CSV, iconos
   ========================================================================== */
(function () {
  const C = SNSP.config;
  const U = {};

  U.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  U.safeUrl = s => {
    try { const u = new URL(s); return ['http:', 'https:'].includes(u.protocol) ? U.esc(u.href) : '#'; }
    catch { return '#'; }
  };
  U.isHttpUrl = s => { try { return ['http:', 'https:'].includes(new URL(s).protocol); } catch { return false; } };

  U.uid = prefix => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  /* ---- Fechas en hora LOCAL (la V1 usaba UTC y adelantaba el día después de las 18:00) ---- */
  const pad = n => String(n).padStart(2, '0');
  U.isoOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  U.today = () => U.isoOf(new Date());
  U.toDate = iso => new Date(iso + 'T12:00:00');
  U.addDays = (iso, n) => { const d = U.toDate(iso); d.setDate(d.getDate() + n); return U.isoOf(d); };
  U.daysUntil = iso => Math.round((U.toDate(iso) - U.toDate(U.today())) / 86400000);
  U.isDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

  U.fmt = d => d ? U.toDate(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Sin fecha';
  U.fmtShort = d => d ? U.toDate(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : 'Sin fecha';
  U.fmtLong = d => U.toDate(d).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  U.fmtDateTime = ts => { try { return new Date(ts).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
  U.monthLabel = (y, m) => new Date(y, m, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  U.cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

  U.relDays = iso => {
    if (!iso) return 'Sin fecha';
    const n = U.daysUntil(iso);
    if (n === 0) return 'Vence hoy';
    if (n === 1) return 'Vence mañana';
    if (n > 1) return `En ${n} días`;
    if (n === -1) return 'Venció ayer';
    return `Vencida hace ${-n} días`;
  };

  /* ---- Semáforo: aplica a actividades y acuerdos ({due, status}) ---- */
  U.semaforo = item => {
    if (item.status === 'done') return 'done';
    if (!item.due) return 'none';
    const n = U.daysUntil(item.due);
    if (n < 0) return 'late';
    if (n <= C.dueSoonDays) return 'soon';
    return 'ontime';
  };
  U.isLate = item => U.semaforo(item) === 'late';

  U.uniq = arr => [...new Set(arr.filter(Boolean).map(s => String(s).trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  U.norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  U.matches = (q, ...fields) => !q || fields.some(f => U.norm(f).includes(U.norm(q)));
  U.pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  U.plural = (n, s, p) => `${n} ${n === 1 ? s : (p || s + 's')}`;

  /* ---- Descargas y CSV (mismo formato que la V1: UTF-8 con BOM, separador coma) ---- */
  U.download = (name, content, type) => {
    const blob = new Blob([content], { type }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };
  U.csv = rows => '﻿' + rows.map(r => r.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n');
  U.stamp = () => U.today().replace(/-/g, '');

  /* ---- Iconos SVG (trazo uniforme 1.8) ---- */
  const P = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    tasks: '<path d="M3 7l2 2 4-4"/><path d="M3 17l2 2 4-4"/><path d="M13 6h8M13 12h8M13 18h8"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="17" rx="2"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>',
    clipboard: '<rect x="8" y="2.5" width="8" height="4" rx="1"/><path d="M16 4.5h2a2 2 0 0 1 2 2V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2h2"/><path d="M9 14l2 2 4-4"/>',
    chart: '<path d="M3 3v18h18"/><path d="M8 17v-5M13 17V8M18 17v-8"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    chevL: '<path d="m15 18-6-6 6-6"/>',
    chevR: '<path d="m9 18 6-6-6-6"/>',
    chevD: '<path d="m6 9 6 6 6-6"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 3.1a4 4 0 0 1 0 7.8M22 21a7 7 0 0 0-5-6.7"/>',
    flag: '<path d="M4 22V4M4 4h12l-2 4 2 4H4"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    columns: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    filter: '<path d="M3 4h18l-7 8v6l-4 2v-8Z"/>',
    arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    flask: '<path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/>',
    pin: '<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="10" r="2.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
    file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>'
  };
  U.icon = (name, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;

  SNSP.util = U;
})();
