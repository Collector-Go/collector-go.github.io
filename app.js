/* =====================================================================
   Collector Go · app.js
   Estructura (para parches rápidos):
     1. Utilidades           5. Mapa
     2. Capa de datos (api)  6. Pantallas (muro, colección, perfil)
     3. Juego (logros)       7. Hojas (ficha, registrar, editar, admin…)
     4. Hojas y avisos       8. Acciones de botones (ACCIONES) e inicio
   Cada botón tiene data-act="nombre" y su lógica vive en ACCIONES.nombre
   ===================================================================== */
(function () {
'use strict';
const C = window.CONFIG;

/* ---------------------------------------------------------------------
   1. UTILIDADES
   --------------------------------------------------------------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ICONOS_OK = new Set([].concat(C.ICONOS_CATEGORIA, C.ICONOS_AVATAR));
const okIcon = (n) => (ICONOS_OK.has(n) ? n : 'star');
const okColor = (c) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : C.COLORES.terracota);
function ic(name) {
  const n = /^[a-z0-9-]+$/.test(name || '') ? name : 'star';
  return `<i class="ic" style="--i:url('${C.ICONOS_URL}${n}.svg')" aria-hidden="true"></i>`;
}
function ib(act, icon, tip, attrs = '', cls = '') {
  const t = esc(C.AYUDA[tip] || tip || '');
  return `<button class="ib ${cls}" data-act="${act}" data-tip="${t}" aria-label="${t}" ${attrs}>${ic(icon)}</button>`;
}
function avatar(p, cls = '') {
  return `<span class="avatar ${cls}" style="background:${okColor(p && p.avatar_color)}">${ic(okIcon(p && p.avatar))}</span>`;
}
function catBadge(name, icon, color) {
  return `<span class="catb" style="background:${okColor(color)}">${ic(okIcon(icon))}${esc(name)}</span>`;
}
const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
function hace(ts) {
  const s = (new Date(ts) - Date.now()) / 1000;
  const u = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [n, v] of u) if (Math.abs(s) >= v) return rtf.format(Math.round(s / v), n);
  return 'ahora';
}
const fecha = (ts) => new Date(ts).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
function distancia(a, b) {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const metros = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);
function cajaAlrededor(p, m) {
  const dLat = m / 111320, dLng = m / (111320 * Math.cos(p.lat * Math.PI / 180));
  return { s: p.lat - dLat, n: p.lat + dLat, w: p.lng - dLng, e: p.lng + dLng };
}
function getPos() {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error('NO_GPS'));
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }),
      (e) => rej(e), { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 });
  });
}
function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
}
function mensajeError(e) {
  const m = String((e && (e.message || e.code)) || e || '');
  if (m.includes('MAX_CATEGORIAS')) return `Máximo ${C.MAX_CATEGORIAS} categorías`;
  if ((e && e.code === '23503') || m.includes('foreign key')) return 'Primero borra o mueve sus hallazgos';
  if (e && e.code === '23505') return 'Ya estaba registrado';
  if (m.includes('row-level security') || m.includes('NO_PERMITIDO')) return 'No tienes permiso para eso';
  if (m.includes('Failed to fetch') || m.includes('NetworkError')) return 'Sin conexión. Intenta de nuevo';
  return 'Algo falló. Intenta de nuevo';
}

/* ---------------------------------------------------------------------
   2. CAPA DE DATOS (todo lo que habla con Supabase está aquí)
   --------------------------------------------------------------------- */
function supabaseApi() {
  const sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' }
  });
  const ok = ({ data, error }) => { if (error) throw error; return data; };
  const cards = () => sb.from('find_cards').select('*');
  return {
    async session() { const { data } = await sb.auth.getSession(); return (data.session && data.session.user) || null; },
    onAuth(cb) { sb.auth.onAuthStateChange((ev, s) => cb(ev, (s && s.user) || null)); },
    login() { return sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } }); },
    logout() { return sb.auth.signOut(); },
    getProfile: (id) => sb.from('profiles').select('*').eq('id', id).maybeSingle().then(ok),
    createProfile: (p) => sb.from('profiles').insert(p).select().single().then(ok),
    updateProfile: (id, p) => sb.from('profiles').update(p).eq('id', id).select().single().then(ok),
    listCats: (uid) => sb.from('categories').select('*').eq('user_id', uid).order('created_at').then(ok),
    addCat: (c) => sb.from('categories').insert(c).select().single().then(ok),
    updateCat: (id, c) => sb.from('categories').update(c).eq('id', id).select().single().then(ok),
    delCat: (id) => sb.from('categories').delete().eq('id', id).then(ok),
    cardsInBox(b, o = {}) {
      let q = cards().gte('lat', b.s).lte('lat', b.n).gte('lng', b.w).lte('lng', b.e);
      if (o.uid) q = q.eq('user_id', o.uid);
      if (o.cat) q = q.eq('category_id', o.cat);
      return q.order('created_at', { ascending: false }).limit(o.limit || 400).then(ok);
    },
    feed(before) {
      let q = cards().eq('is_private', false).order('created_at', { ascending: false }).limit(20);
      if (before) q = q.lt('created_at', before);
      return q.then(ok);
    },
    userCards: (uid) => cards().eq('user_id', uid).order('created_at', { ascending: false }).limit(1000).then(ok),
    card: (id) => cards().eq('id', id).maybeSingle().then(ok),
    cardsByIds: (ids) => (ids.length ? cards().in('id', ids).then(ok) : Promise.resolve([])),
    addFind: (f) => sb.from('finds').insert(f).select('id').single().then(ok).then((r) => r.id),
    updateFind: (id, f) => sb.from('finds').update(f).eq('id', id).then(ok),
    delFind: (id) => sb.from('finds').delete().eq('id', id).then(ok),
    addSighting: (s) => sb.from('sightings').insert(s).then(ok),
    react(findId, kind, on, uid) {
      return on ? sb.from('reactions').insert({ find_id: findId, kind }).then(ok)
                : sb.from('reactions').delete().match({ find_id: findId, kind, user_id: uid }).then(ok);
    },
    report: (findId) => sb.from('reports').insert({ find_id: findId }).then(ok),
    stats: (uid) => sb.rpc('profile_stats', { p_uid: uid, tz: C.ZONA_HORARIA }).then(ok),
    leaderboard: (metric) => sb.rpc('leaderboard', { metric, lim: 30 }).then(ok),
    reports: () => sb.from('reports').select('find_id, created_at').then(ok),
    dismiss: (findId) => sb.from('reports').delete().eq('find_id', findId).then(ok),
    setBlocked: (uid, b) => sb.from('profiles').update({ blocked: b }).eq('id', uid).then(ok),
    blockedList: () => sb.from('profiles').select('*').eq('blocked', true).then(ok),
    upload: (path, blob) => sb.storage.from('fotos').upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false }).then(ok),
    removeFiles: (paths) => sb.storage.from('fotos').remove(paths.filter(Boolean)).then(ok),
    photoUrl: (path) => (path ? `${C.SUPABASE_URL}/storage/v1/object/public/fotos/${path}` : ''),
    async colonia(lat, lng) {
      try {
        const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 4000);
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&accept-language=es&lat=${lat}&lon=${lng}`, { signal: ctl.signal });
        clearTimeout(t);
        if (!r.ok) return null;
        const a = (await r.json()).address || {};
        const c = a.neighbourhood || a.suburb || a.quarter || a.city_district || a.village || a.town || a.hamlet;
        return c ? String(c).slice(0, 80) : null;
      } catch (e) { return null; }
    }
  };
}
let api = null;

/* Estado de la app */
const S = {
  user: null, me: null, cats: [], tab: 'map', stats: null,
  filtro: { mios: false, cat: null },
  cache: new Map(), feed: [], feedFin: false, coleccionCat: null,
  map: null, capa: null, yo: null, mini: null, arrancando: false
};
const guarda = (arr) => { (arr || []).forEach((c) => S.cache.set(c.id, c)); return arr || []; };
const foto = (c, mini) => api.photoUrl(mini ? (c.thumb || c.photo) : (c.photo || c.thumb));

/* ---------------------------------------------------------------------
   3. JUEGO: logros a partir de las estadísticas
   --------------------------------------------------------------------- */
function logros(st) {
  const L = [];
  if (!st) return L;
  (st.categorias || []).forEach((c) => C.METAS_CATEGORIA.forEach((m) => L.push({
    k: `cat:${c.id}:${m}`, on: c.total >= m, m, icon: okIcon(c.icon), color: okColor(c.color), grupo: c.name, tipo: 'cat', cat: c.id })));
  const nCol = (st.colonias || []).length;
  C.METAS_COLONIAS.forEach((m) => L.push({ k: 'col:' + m, on: nCol >= m, m, icon: 'map-pin', color: C.COLORES.oliva, grupo: 'colonias', tipo: 'col' }));
  C.METAS_RACHA_SEMANAS.forEach((m) => L.push({ k: 'racha:' + m, on: (st.racha_mejor || 0) >= m, m, icon: 'flame', color: C.COLORES.terracota, grupo: 'racha', tipo: 'racha' }));
  C.METAS_REENCUENTROS.forEach((m) => L.push({ k: 'reen:' + m, on: (st.reencuentros || 0) >= m, m, icon: 'repeat', color: '#3F6E73', grupo: 'reencuentros', tipo: 'reen' }));
  return L;
}
function novedades(antes, despues) {
  const ya = new Set(logros(antes).filter((l) => l.on).map((l) => l.k));
  const nuevos = logros(despues).filter((l) => l.on && !ya.has(l.k));
  const colAntes = new Set(((antes && antes.colonias) || []).map((c) => c.colonia));
  const colonias = ((despues && despues.colonias) || []).map((c) => c.colonia).filter((c) => !colAntes.has(c));
  const records = [];
  if (antes && despues && despues.mejor_dia && (!antes.mejor_dia || despues.mejor_dia.n > antes.mejor_dia.n) && despues.mejor_dia.n > 1)
    records.push({ icon: 'calendar', texto: `Récord: ${despues.mejor_dia.n} en un día` });
  return { nuevos, colonias, records };
}
function medalla(l) {
  return `<div class="medal ${l.on ? '' : 'off'}"><span class="m" style="background:${l.color}">${ic(l.icon)}</span><span>${l.m}</span></div>`;
}

/* ---------------------------------------------------------------------
   4. HOJAS, CONFIRMACIONES Y AVISOS
   --------------------------------------------------------------------- */
const pila = [];
function abrirHoja(render, after, tipo, fija) { pila.push({ render, after, tipo, fija }); dibujarHoja(); }
function dibujarHoja() {
  if (S.mini) { S.mini.remove(); S.mini = null; }
  const root = $('#sheet-root');
  if (!pila.length) { root.innerHTML = ''; return; }
  const top = pila[pila.length - 1];
  root.innerHTML = `<div class="overlay" data-act="fondo"><div class="sheet" role="dialog" aria-modal="true">${top.render()}</div></div>`;
  if (top.after) top.after($('.sheet', root));
}
function cerrarHoja() { pila.pop(); dibujarHoja(); }
function cerrarTodo() { pila.length = 0; dibujarHoja(); }
function cabeza(titulo, extra = '') {
  const top = pila[pila.length - 1];
  const back = pila.length > 1 ? ib('atras', 'arrow-left', 'atras') : '';
  const x = top && top.fija ? '' : ib('cerrar', 'x', 'cerrar');
  return `<div class="sheet-head">${back}<h2 class="grow">${titulo}</h2>${extra}${x}</div>`;
}
let tToast;
function aviso(texto, icono = 'check') {
  const t = $('#toast');
  t.innerHTML = `${ic(icono)}<span>${esc(texto)}</span>`;
  t.classList.add('show');
  clearTimeout(tToast); tToast = setTimeout(() => t.classList.remove('show'), 2600);
}
const fallo = (e) => { console.error(e); aviso(mensajeError(e), 'alert-triangle'); };
function confirmar(texto, icono = 'trash') {
  return new Promise((res) => {
    const d = document.createElement('div');
    d.className = 'overlay'; d.id = 'confirmar'; d.style.zIndex = 2000; d.style.alignItems = 'center';
    d.innerHTML = `<div class="card" style="padding:18px;max-width:320px;margin:16px;text-align:center">
      <div style="font-size:40px;color:var(--terracota)">${ic(icono)}</div><p style="margin:8px 0 16px">${esc(texto)}</p>
      <div class="row" style="justify-content:center;gap:16px">
        <button class="ib" data-si="0" aria-label="No">${ic('x')}</button>
        <button class="ib on" data-si="1" aria-label="Sí">${ic('check')}</button></div></div>`;
    d.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-si]');
      if (b || ev.target === d) { d.remove(); res(!!(b && b.dataset.si === '1')); }
    });
    document.body.appendChild(d);
  });
}
function ocupado(btn, si) {
  if (!btn) return;
  if (si) { btn.dataset.html = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="spin">${ic('loader-2')}</span>`; }
  else { btn.disabled = false; if (btn.dataset.html) btn.innerHTML = btn.dataset.html; }
}

/* Etiquetas al mantener presionado un ícono */
(function ayudas() {
  let t = null, visto = false;
  const tip = () => $('#tip');
  const ocultar = () => { clearTimeout(t); tip().classList.remove('show'); };
  document.addEventListener('pointerdown', (ev) => {
    const el = ev.target.closest('[data-tip]'); visto = false;
    if (!el || !el.dataset.tip) return;
    t = setTimeout(() => {
      const r = el.getBoundingClientRect(), tp = tip();
      tp.textContent = el.dataset.tip; tp.classList.add('show');
      const w = tp.offsetWidth;
      tp.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
      tp.style.top = Math.max(8, r.top - 40) + 'px';
      visto = true;
    }, 450);
  });
  ['pointerup', 'pointercancel', 'scroll'].forEach((e) => document.addEventListener(e, ocultar, true));
  document.addEventListener('click', (ev) => { if (visto) { ev.stopPropagation(); ev.preventDefault(); visto = false; } }, true);
  document.addEventListener('contextmenu', (ev) => { if (ev.target.closest('[data-tip]')) ev.preventDefault(); });
})();

/* Selectores de ícono/color/categoría dentro de formularios */
function selector(nombre, opciones, actual, tipo) {
  if (tipo === 'color')
    return `<div class="swatches" data-pick="${nombre}">${opciones.map((c) => `<button type="button" data-act="elegir" data-v="${c}" class="${c === actual ? 'on' : ''}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div>`;
  return `<div class="pick" data-pick="${nombre}">${opciones.map((n) => `<button type="button" data-act="elegir" data-v="${n}" class="${n === actual ? 'on' : ''}" aria-label="${n}">${ic(n)}</button>`).join('')}</div>`;
}
function selectorCategorias(actual) {
  return `<div class="chips" data-pick="cat" style="flex-wrap:wrap">${S.cats.map((c) =>
    `<button type="button" class="chip ${c.id === actual ? 'on' : ''}" data-act="elegir" data-v="${c.id}"><span class="dot" style="background:${okColor(c.color)}"></span>${ic(okIcon(c.icon))}${esc(c.name)}</button>`).join('')}</div>`;
}
const valor = (raiz, nombre) => { const b = $(`[data-pick="${nombre}"] .on`, raiz); return b ? b.dataset.v : null; };

/* Mini mapa para elegir o mover la ubicación */
function miniMapa(el, pos, alMover) {
  const centro = pos ? [pos.lat, pos.lng] : (S.map ? [S.map.getCenter().lat, S.map.getCenter().lng] : C.MAPA_CENTRO);
  const m = L.map(el, { zoomControl: false, attributionControl: false }).setView(centro, 17);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(m);
  const mk = L.marker(centro, { draggable: true, icon: L.divIcon({ className: '', html: `<div class="pin" style="background:${C.COLORES.terracota}">${ic('map-pin')}</div>`, iconSize: [36, 36], iconAnchor: [18, 36] }) }).addTo(m);
  mk.on('dragend', () => { const p = mk.getLatLng(); alMover({ lat: p.lat, lng: p.lng, acc: null }); });
  m.on('click', (e) => { mk.setLatLng(e.latlng); alMover({ lat: e.latlng.lat, lng: e.latlng.lng, acc: null }); });
  S.mini = m;
  return { mover(p) { mk.setLatLng([p.lat, p.lng]); m.setView([p.lat, p.lng], 17); } };
}

/* ---------------------------------------------------------------------
   5. MAPA
   --------------------------------------------------------------------- */
function pinIcono(c) {
  return L.divIcon({ className: '', iconSize: [36, 36], iconAnchor: [18, 36],
    html: `<div class="pin ${c.is_private ? 'priv' : ''}" style="background:${okColor(c.cat_color)}">${ic(okIcon(c.cat_icon))}</div>` });
}
function crearMapa() {
  document.documentElement.style.setProperty('--map-filter', C.MAPA_FILTRO);
  S.map = L.map('map', { zoomControl: false }).setView(C.MAPA_CENTRO, C.MAPA_ZOOM);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(S.map);
  S.capa = L.layerGroup().addTo(S.map);
  let t; S.map.on('moveend', () => { clearTimeout(t); t = setTimeout(cargarPines, 250); });
  getPos().then((p) => { ponerYo(p); S.map.setView([p.lat, p.lng], 16); }).catch(() => cargarPines());
}
function ponerYo(p) {
  if (!S.map) return;
  if (!S.yo) S.yo = L.marker([p.lat, p.lng], { interactive: false, icon: L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }) }).addTo(S.map);
  else S.yo.setLatLng([p.lat, p.lng]);
}
async function cargarPines() {
  if (!S.map) return;
  const b = S.map.getBounds().pad(0.3);
  const caja = { s: b.getSouth(), n: b.getNorth(), w: b.getWest(), e: b.getEast() };
  try {
    const o = {};
    if (S.filtro.mios || S.filtro.cat) o.uid = S.user.id;
    if (S.filtro.cat) o.cat = S.filtro.cat;
    const lista = guarda(await api.cardsInBox(caja, o));
    S.capa.clearLayers();
    lista.forEach((c) => L.marker([c.lat, c.lng], { icon: pinIcono(c) }).on('click', () => abrirFicha(c.id)).addTo(S.capa));
  } catch (e) { fallo(e); }
}
function chipsMapa() {
  const f = S.filtro;
  return `<button class="chip ${!f.mios && !f.cat ? 'on' : ''}" data-act="filtro" data-v="todos" data-tip="${C.AYUDA.filtro_todos}" aria-label="${C.AYUDA.filtro_todos}">${ic('map-2')}</button>
    <button class="chip ${f.mios && !f.cat ? 'on' : ''}" data-act="filtro" data-v="mios" data-tip="${C.AYUDA.filtro_mios}" aria-label="${C.AYUDA.filtro_mios}">${ic(okIcon(S.me.avatar))}</button>
    ${S.cats.map((c) => `<button class="chip ${f.cat === c.id ? 'on' : ''}" data-act="filtro" data-v="${c.id}"><span class="dot" style="background:${okColor(c.color)}"></span>${ic(okIcon(c.icon))}${esc(c.name)}</button>`).join('')}`;
}

/* ---------------------------------------------------------------------
   6. PANTALLAS
   --------------------------------------------------------------------- */
function pintarApp() {
  $('#app').innerHTML = `
    <section id="scr-map" class="screen map-screen">
      <div id="map"></div>
      <div class="map-top"><div class="chips grow" id="chips-mapa">${chipsMapa()}</div></div>
      <div class="map-side">${ib('ubicar', 'current-location', 'ubicar')}${ib('cerca', 'walk', 'cerca')}</div>
    </section>
    <main id="scr" class="screen" hidden></main>
    <nav class="nav">
      <button data-act="tab" data-v="map" data-tip="${C.AYUDA.mapa}" aria-label="${C.AYUDA.mapa}">${ic('map-2')}</button>
      <button data-act="tab" data-v="feed" data-tip="${C.AYUDA.muro}" aria-label="${C.AYUDA.muro}">${ic('layout-grid')}</button>
      <button class="fab" data-act="nuevo" data-tip="${C.AYUDA.nuevo}" aria-label="${C.AYUDA.nuevo}">${ic('camera')}</button>
      <button data-act="tab" data-v="coleccion" data-tip="${C.AYUDA.coleccion}" aria-label="${C.AYUDA.coleccion}">${ic('cards')}</button>
      <button data-act="tab" data-v="perfil" data-tip="${C.AYUDA.perfil}" aria-label="${C.AYUDA.perfil}">${ic('user')}</button>
    </nav>`;
  crearMapa();
  irA('map');
}
function irA(tab) {
  S.tab = tab;
  $$('.nav [data-act="tab"]').forEach((b) => b.classList.toggle('on', b.dataset.v === tab));
  const esMapa = tab === 'map';
  $('#scr-map').hidden = !esMapa; $('#scr').hidden = esMapa;
  if (esMapa) { $('#chips-mapa').innerHTML = chipsMapa(); setTimeout(() => { S.map.invalidateSize(); cargarPines(); }, 30); return; }
  $('#scr').scrollTop = 0;
  ({ feed: pintarMuro, coleccion: pintarColeccion, perfil: pintarPerfil })[tab]();
}
function refrescarActual() { if (S.tab === 'map') cargarPines(); else irA(S.tab); }

/* Muro */
function reaccionesHTML(c) {
  const propio = c.user_id === S.user.id;
  return `<div class="reacts">${C.REACCIONES.map((r) => {
    const n = (c.reactions || {})[r.tipo] || 0, mia = (c.my_reactions || []).includes(r.tipo);
    if (propio || c.is_private) return n ? `<span class="react" data-tip="${esc(r.ayuda)}">${ic(r.icono)}<span class="n">${n}</span></span>` : '';
    return `<button class="react ${mia ? 'on' : ''}" data-act="reaccion" data-id="${c.id}" data-v="${r.tipo}" data-tip="${esc(r.ayuda)}" aria-label="${esc(r.ayuda)}">${ic(r.icono)}<span class="n">${n || ''}</span></button>`;
  }).join('')}</div>`;
}
function tarjeta(c) {
  return `<article class="card" data-card="${c.id}">
    <div class="body row"><button class="row grow" data-act="perfil" data-id="${c.user_id}" style="text-align:left">${avatar(c)}<b class="grow">${esc(c.user_name)}</b></button>${catBadge(c.cat_name, c.cat_icon, c.cat_color)}</div>
    ${c.photo || c.thumb ? `<img class="photo" src="${foto(c)}" alt="${esc(c.name)}" loading="lazy" data-act="ficha" data-id="${c.id}">` : `<div class="photo" data-act="ficha" data-id="${c.id}" style="display:grid;place-items:center;font-size:60px">${ic(okIcon(c.cat_icon))}</div>`}
    <div class="body"><div class="row between"><div class="grow"><h3>${esc(c.name)}</h3>
      <div class="tiny">${c.colonia ? ic('map-pin') + ' ' + esc(c.colonia) + ' · ' : ''}${hace(c.created_at)}</div></div></div>
      <div style="margin-top:8px">${reaccionesHTML(c)}</div></div></article>`;
}
async function pintarMuro(masViejo) {
  const scr = $('#scr');
  if (!masViejo) {
    scr.innerHTML = `<div class="row between" style="margin-bottom:14px"><h1 class="serif">Collector Go</h1>
      <div class="row">${ib('tabla', 'trophy', 'tabla')}${ib('refrescar', 'refresh', 'Actualizar')}</div></div>
      <div class="feed" id="feed"><div class="empty"><span class="spin">${ic('loader-2')}</span></div></div>`;
    S.feed = []; S.feedFin = false;
  }
  try {
    const antes = S.feed.length ? S.feed[S.feed.length - 1].created_at : null;
    const lote = guarda(await api.feed(antes));
    S.feed = S.feed.concat(lote);
    if (lote.length < 20) S.feedFin = true;
    const f = $('#feed'); if (!f) return;
    f.innerHTML = S.feed.length
      ? S.feed.map(tarjeta).join('') + (S.feedFin ? '' : `<div class="row" style="justify-content:center">${ib('mas', 'plus', 'mas')}</div>`)
      : `<div class="empty">${ic('camera')}<p>Aún no hay hallazgos públicos</p><button class="btn" data-act="nuevo">${ic('camera')}</button></div>`;
  } catch (e) { fallo(e); }
}
function actualizarTarjeta(c) {
  $$(`[data-card="${c.id}"]`).forEach((el) => { el.outerHTML = tarjeta(c); });
}

/* Colección */
async function pintarColeccion() {
  const scr = $('#scr');
  scr.innerHTML = `<div class="empty"><span class="spin">${ic('loader-2')}</span></div>`;
  try {
    const mias = guarda(await api.userCards(S.user.id));
    const cuenta = (id) => mias.filter((c) => c.category_id === id).length;
    if (S.coleccionCat && !S.cats.some((c) => c.id === S.coleccionCat)) S.coleccionCat = null;
    const vis = S.coleccionCat ? mias.filter((c) => c.category_id === S.coleccionCat) : mias;
    scr.innerHTML = `<div class="row between" style="margin-bottom:12px"><h1 class="row">${ic('cards')} ${mias.length}</h1>${ib('categorias', 'pencil', 'categorias')}</div>
      <div class="chips" style="margin-bottom:14px">
        <button class="chip ${!S.coleccionCat ? 'on' : ''}" data-act="colcat" data-v="" aria-label="Todas">${ic('layout-grid')} ${mias.length}</button>
        ${S.cats.map((c) => `<button class="chip ${S.coleccionCat === c.id ? 'on' : ''}" data-act="colcat" data-v="${c.id}"><span class="dot" style="background:${okColor(c.color)}"></span>${ic(okIcon(c.icon))}${esc(c.name)} · ${cuenta(c.id)}</button>`).join('')}
      </div>
      ${vis.length ? rejilla(vis, true) : `<div class="empty">${ic('camera')}<p>Registra tu primer hallazgo</p><button class="btn" data-act="nuevo">${ic('camera')}</button></div>`}`;
  } catch (e) { fallo(e); }
}
function rejilla(lista, mostrarPrivado) {
  return `<div class="grid">${lista.map((c) => `<div class="tile" data-act="ficha" data-id="${c.id}" role="button" aria-label="${esc(c.name)}">
    ${c.thumb || c.photo ? `<img src="${foto(c, true)}" alt="" loading="lazy">` : `<div class="noimg">${ic(okIcon(c.cat_icon))}</div>`}
    <span class="badge" style="background:${okColor(c.cat_color)}">${ic(okIcon(c.cat_icon))}</span>
    ${mostrarPrivado && c.is_private ? `<span class="lock">${ic('lock')}</span>` : ''}</div>`).join('')}</div>`;
}

/* Perfil (propio en pestaña, ajeno en hoja) */
function perfilHTML(p, st, propio, tarjetas) {
  const ls = logros(st);
  const porCat = (st.categorias || []).map((c) => `<div class="li" style="flex-direction:column;align-items:stretch">
      <div class="row between">${catBadge(c.name, c.icon, c.color)}<b>${c.total}</b></div>
      <div class="medals">${ls.filter((l) => l.tipo === 'cat' && l.cat === c.id).map(medalla).join('')}</div></div>`).join('');
  const grupo = (t) => ls.filter((l) => l.tipo === t).map(medalla).join('');
  const md = st.mejor_dia;
  return `<div class="row" style="gap:14px">${avatar(p, 'lg')}<div class="grow"><h2>${esc(p.name)}</h2>${p.bio ? `<div class="muted">${esc(p.bio)}</div>` : ''}
      ${p.blocked ? `<div class="tiny row">${ic('ban')} bloqueada</div>` : ''}</div></div>
    <div class="row wrap" style="margin:14px 0">
      ${propio ? ib('editar_perfil', 'pencil', 'editar') : ''}
      ${ib('compartir_perfil', 'share', 'compartir', `data-id="${p.id}"`)}
      ${ib('tabla', 'trophy', 'tabla')}
      ${propio && S.me.is_admin ? ib('admin', 'shield', 'admin') : ''}
      ${!propio && S.me.is_admin && !p.is_admin ? ib(p.blocked ? 'desbloquear' : 'bloquear', p.blocked ? 'lock-open' : 'ban', p.blocked ? 'desbloquear' : 'bloquear', `data-id="${p.id}"`) : ''}
      <span class="grow"></span>${propio ? ib('salir', 'logout', 'salir') : ''}
    </div>
    <div class="stats">
      <div class="stat" data-tip="Hallazgos">${ic('photo')}<div class="v">${st.total || 0}</div></div>
      <div class="stat" data-tip="Colonias">${ic('map-pin')}<div class="v">${(st.colonias || []).length}</div></div>
      <div class="stat" data-tip="Racha de semanas (actual / mejor)">${ic('flame')}<div class="v">${st.racha_actual || 0}<span class="tiny">/${st.racha_mejor || 0}</span></div></div>
      <div class="stat" data-tip="${md ? 'Mejor día: ' + fecha(md.fecha) : 'Mejor día'}">${ic('calendar')}<div class="v">${md ? md.n : 0}</div></div>
      <div class="stat" data-tip="Reencuentros">${ic('repeat')}<div class="v">${st.reencuentros || 0}</div></div>
      <div class="stat" data-tip="Reacciones recibidas">${ic('heart')}<div class="v">${st.reacciones || 0}</div></div>
    </div>
    <div class="sec"><h3>${ic('medal')}</h3><div class="list">${porCat || '<div class="muted">—</div>'}</div></div>
    <div class="sec"><h3>${ic('map-pin')} ${(st.colonias || []).length}</h3><div class="medals">${grupo('col')}</div>
      <div class="chips" style="flex-wrap:wrap;margin-top:10px">${(st.colonias || []).map((c) => `<span class="chip" data-tip="${esc(fecha(c.first_at))}">${esc(c.colonia)} · ${c.n}</span>`).join('')}</div></div>
    <div class="sec"><h3>${ic('flame')}</h3><div class="medals">${grupo('racha')}</div></div>
    <div class="sec"><h3>${ic('repeat')}</h3><div class="medals">${grupo('reen')}</div></div>
    ${tarjetas ? `<div class="sec"><h3>${ic('cards')} ${tarjetas.length}</h3>${tarjetas.length ? rejilla(tarjetas, false) : '<div class="muted">—</div>'}</div>` : ''}
    ${propio ? `<p class="tiny" style="text-align:center;margin-top:28px">Collector Go · v${esc(C.VERSION)}</p>` : ''}`;
}
async function pintarPerfil() {
  const scr = $('#scr');
  scr.innerHTML = `<div class="empty"><span class="spin">${ic('loader-2')}</span></div>`;
  try {
    const [me, st] = await Promise.all([api.getProfile(S.user.id), api.stats(S.user.id)]);
    S.me = me || S.me; S.stats = st;
    if (S.tab === 'perfil') scr.innerHTML = perfilHTML(S.me, st, true, null);
  } catch (e) { fallo(e); }
}
async function abrirPerfil(uid) {
  if (uid === S.user.id) { cerrarTodo(); irA('perfil'); return; }
  const datos = { p: null, st: null, cards: null };
  abrirHoja(() => datos.p ? cabeza('') + perfilHTML(datos.p, datos.st, false, datos.cards) : cabeza('') + `<div class="empty"><span class="spin">${ic('loader-2')}</span></div>`);
  try {
    const [p, st, cards] = await Promise.all([api.getProfile(uid), api.stats(uid), api.userCards(uid)]);
    if (!p) { cerrarHoja(); return aviso('Perfil no disponible', 'alert-triangle'); }
    Object.assign(datos, { p, st, cards: guarda(cards) }); dibujarHoja();
  } catch (e) { fallo(e); }
}

/* ---------------------------------------------------------------------
   7. HOJAS
   --------------------------------------------------------------------- */
/* Ficha de un hallazgo */
async function abrirFicha(id) {
  let c = S.cache.get(id);
  if (!c) {
    try { c = await api.card(id); } catch (e) { return fallo(e); }
    if (!c) return aviso('Este hallazgo no está disponible', 'alert-triangle');
    guarda([c]);
  }
  abrirHoja(() => fichaHTML(S.cache.get(id) || c), null, 'ficha');
}
function fichaHTML(c) {
  const propio = c.user_id === S.user.id;
  return `${cabeza(esc(c.name), c.is_private ? `<span class="ib ghost" data-tip="${C.AYUDA.privado}">${ic('lock')}</span>` : '')}
    ${c.photo || c.thumb ? `<img class="big" src="${foto(c)}" alt="${esc(c.name)}">` : ''}
    <div class="row between" style="margin:12px 0">
      <button class="row" data-act="perfil" data-id="${c.user_id}">${avatar(c)}<b>${esc(c.user_name)}</b></button>
      ${catBadge(c.cat_name, c.cat_icon, c.cat_color)}</div>
    ${c.note ? `<p style="margin:6px 0 12px">${esc(c.note)}</p>` : ''}
    <div class="list">
      <div class="row muted">${ic('calendar')} ${fecha(c.created_at)}${c.colonia ? ` · ${ic('map-pin')} ${esc(c.colonia)}` : ''}</div>
      ${c.sightings_count ? `<div class="row muted">${ic('repeat')} ${c.sightings_count} · ${hace(c.last_seen_at)}</div>` : ''}
    </div>
    ${!c.is_private ? `<div style="margin:12px 0">${reaccionesHTML(c)}</div>` : ''}
    <div class="row wrap" style="margin-top:14px">
      ${ib('ruta', 'route', 'ruta', `data-id="${c.id}"`, 'on')}
      ${ib('ver_mapa', 'map-pin', 'ver_mapa', `data-id="${c.id}"`)}
      ${!c.is_private ? ib('compartir', 'share', 'compartir', `data-id="${c.id}"`) : ''}
      ${propio ? ib('reencuentro', 'repeat', 'reencuentro', `data-id="${c.id}"`) : ''}
      ${propio ? ib('editar_hallazgo', 'pencil', 'editar', `data-id="${c.id}"`) : ''}
      <span class="grow"></span>
      ${!propio ? ib('avisar', 'flag', 'avisar', `data-id="${c.id}"`) : ''}
      ${propio || S.me.is_admin ? ib('borrar_hallazgo', 'trash', 'borrar', `data-id="${c.id}"`) : ''}
    </div>`;
}
function refrescarFicha(id) {
  const top = pila[pila.length - 1];
  if (top && top.tipo === 'ficha') dibujarHoja();
  const c = S.cache.get(id); if (c) actualizarTarjeta(c);
}

/* Registrar hallazgo */
const R = {};
function nuevoRegistro() {
  if (S.me.blocked) return aviso('Tu cuenta está bloqueada', 'ban');
  Object.assign(R, { original: null, recorte: null, usarRecorte: false, pos: null, gps: 'buscando', vistaUrl: null, candidatos: [], cat: S.coleccionCat || (S.cats[0] && S.cats[0].id) });
  abrirHoja(registroHTML, montarRegistro);
  leerGPS();
}
function registroHTML() {
  if (!R.original) return `${cabeza(ic('camera'))}
    <div class="row" style="gap:14px;margin:30px 0">
      <label class="btn block" style="min-height:120px;font-size:44px" data-tip="${C.AYUDA.camara}" aria-label="${C.AYUDA.camara}">${ic('camera')}<input type="file" accept="image/*" capture="environment" hidden data-in="foto"></label>
      <label class="btn alt block" style="min-height:120px;font-size:44px" data-tip="${C.AYUDA.galeria}" aria-label="${C.AYUDA.galeria}">${ic('upload')}<input type="file" accept="image/*" hidden data-in="foto"></label>
    </div><div class="tiny row" id="gps-estado">${gpsTexto()}</div>`;
  return `${cabeza(ic('camera'))}
    <img class="big" id="vista" src="${R.vistaUrl}" alt="">
    <div class="row" style="margin:10px 0">
      <div class="toggle">
        <button type="button" class="${!R.usarRecorte ? 'on' : ''}" data-act="usar_original" data-tip="${C.AYUDA.original}" aria-label="${C.AYUDA.original}">${ic('photo')}</button>
        <button type="button" class="${R.usarRecorte ? 'on' : ''}" data-act="recortar" data-tip="${C.AYUDA.recortar}" aria-label="${C.AYUDA.recortar}">${ic('scissors')}</button>
      </div>
      <div class="grow"><div class="progress" id="prog" hidden><div></div></div></div>
    </div>
    <div class="field"><label>${ic('cards')}</label>${selectorCategorias(R.cat)}</div>
    <div class="field"><label for="f-nombre">${ic('pencil')} Nombre</label><input id="f-nombre" class="in" maxlength="60" placeholder="Michi naranja" autocomplete="off"></div>
    <div class="field"><label for="f-nota">${ic('info-circle')} Nota</label><textarea id="f-nota" class="in" maxlength="140" placeholder="Duerme sobre el puesto de periódicos"></textarea></div>
    <div class="field"><label>${ic('eye')}</label>
      <div class="toggle" data-pick="priv"><button type="button" data-act="elegir" data-v="0" class="on" data-tip="${C.AYUDA.publico}" aria-label="${C.AYUDA.publico}">${ic('eye')}</button><button type="button" data-act="elegir" data-v="1" data-tip="${C.AYUDA.privado}" aria-label="${C.AYUDA.privado}">${ic('lock')}</button></div></div>
    <div class="field"><label class="row between"><span class="row">${ic('map-pin')} <span id="gps-estado">${gpsTexto()}</span></span>${ib('releer_gps', 'current-location', 'gps', '', 'sm')}</label>
      <div class="minimap" id="mini-reg"></div></div>
    <div id="candidatos"></div>
    <button class="btn block" data-act="guardar_hallazgo" style="margin-top:14px">${ic('check')} Guardar</button>`;
}
function gpsTexto() {
  if (R.gps === 'buscando') return `<span class="spin">${ic('loader-2')}</span> GPS`;
  if (R.gps === 'error') return 'Sin GPS: toca el mapa para marcar';
  if (R.pos) return R.pos.acc != null ? `±${R.pos.acc} m` : 'Marcado a mano';
  return '';
}
function montarRegistro(raiz) {
  $$('[data-in="foto"]', raiz).forEach((inp) => inp.addEventListener('change', () => inp.files[0] && tomarFoto(inp.files[0])));
  const el = $('#mini-reg', raiz);
  if (el) {
    const mm = miniMapa(el, R.pos, (p) => { R.pos = p; R.gps = 'ok'; pintarGPS(); buscarCandidatos(); });
    R.moverMini = mm.mover;
    buscarCandidatos();
  }
}
function pintarGPS() { const e = $('#gps-estado'); if (e) e.innerHTML = gpsTexto(); }
function leerGPS() {
  R.gps = 'buscando'; pintarGPS();
  getPos().then((p) => { R.pos = p; R.gps = 'ok'; pintarGPS(); if (R.moverMini) R.moverMini(p); buscarCandidatos(); })
    .catch(() => { R.gps = R.pos ? 'ok' : 'error'; pintarGPS(); });
}
async function buscarCandidatos() {
  const box = $('#candidatos'); if (!box || !R.pos) return;
  try {
    const cerca = guarda(await api.cardsInBox(cajaAlrededor(R.pos, C.REENCUENTRO_METROS), { uid: S.user.id, limit: 5 }));
    R.candidatos = cerca.filter((c) => distancia(R.pos, c) <= C.REENCUENTRO_METROS);
    box.innerHTML = R.candidatos.map((c) => `<div class="banner" style="margin-top:10px">
      ${c.thumb ? `<img src="${foto(c, true)}" alt="" style="width:44px;height:44px;object-fit:contain;border-radius:8px">` : ic(okIcon(c.cat_icon))}
      <div class="grow"><b>${esc(c.name)}</b><div class="tiny">${ic('repeat')} ¿Lo volviste a ver?</div></div>
      ${ib('reencuentro', 'repeat', 'reencuentro', `data-id="${c.id}"`, 'sm')}</div>`).join('');
  } catch (e) { /* sin sugerencias, no pasa nada */ }
}
async function tomarFoto(file) {
  try {
    const img = await cargarImagen(file);
    R.original = await lienzoABlob(escalar(img, C.FOTO_LADO), C.FOTO_CALIDAD, false);
    R.recorte = null; R.usarRecorte = false;
    ponerVista(R.original);
    dibujarHoja(); leerGPSsiFalta();
  } catch (e) { fallo(e); }
}
function leerGPSsiFalta() { if (!R.pos && R.gps !== 'buscando') leerGPS(); }
function ponerVista(blob) { if (R.vistaUrl) URL.revokeObjectURL(R.vistaUrl); R.vistaUrl = URL.createObjectURL(blob); const v = $('#vista'); if (v) v.src = R.vistaUrl; }

/* Fotos: redimensionar y comprimir en el teléfono */
function cargarImagen(blob) {
  return new Promise((res, rej) => {
    const u = URL.createObjectURL(blob), img = new Image();
    img.onload = () => { URL.revokeObjectURL(u); res(img); };
    img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('IMAGEN')); };
    img.src = u;
  });
}
function escalar(img, lado) {
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const k = Math.min(1, lado / Math.max(w, h));
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(h * k));
  cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
  return cv;
}
function lienzoABlob(cv, calidad, alfa) {
  const a = (tipo) => new Promise((res) => cv.toBlob((b) => res(b), tipo, calidad));
  return a('image/webp').then((b) => (b && b.type === 'image/webp') ? b : a(alfa ? 'image/png' : 'image/jpeg'));
}
async function recortarFondo(blob, alProgreso) {
  const mod = await import(C.RECORTE_URL);
  const fn = mod.removeBackground || mod.default;
  const base = { output: { format: 'image/png' }, progress: (k, a, t) => alProgreso(t ? a / t : 0) };
  try { return await fn(blob, Object.assign({ model: 'isnet_quint8' }, base)); }
  catch (e) { return await fn(blob, base); }
}
async function prepararFotos() {
  const alfa = R.usarRecorte && R.recorte;
  const fuente = alfa ? R.recorte : R.original;
  const img = await cargarImagen(fuente);
  const grande = await lienzoABlob(escalar(img, alfa ? Math.min(C.FOTO_LADO, 900) : C.FOTO_LADO), C.FOTO_CALIDAD, alfa);
  const mini = await lienzoABlob(escalar(img, C.MINIATURA_LADO), C.MINIATURA_CALIDAD, alfa);
  return { grande, mini };
}
const ext = (b) => ({ 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg' }[b.type] || 'jpg');

async function guardarHallazgo(btn) {
  const raiz = $('.sheet');
  const nombre = $('#f-nombre', raiz).value.trim();
  const nota = $('#f-nota', raiz).value.trim();
  const cat = valor(raiz, 'cat');
  const priv = valor(raiz, 'priv') === '1';
  if (!cat) return aviso('Elige una categoría', 'cards');
  if (!nombre) { $('#f-nombre', raiz).focus(); return aviso('Ponle un nombre', 'pencil'); }
  if (!R.pos) return aviso('Falta la ubicación: toca el mapa', 'map-pin');
  ocupado(btn, true);
  try {
    const antes = S.stats || await api.stats(S.user.id);
    const { grande, mini } = await prepararFotos();
    const id = uuid();
    const pFoto = `${S.user.id}/${id}.${ext(grande)}`, pMini = `${S.user.id}/${id}_t.${ext(mini)}`;
    await api.upload(pFoto, grande);
    await api.upload(pMini, mini);
    const colonia = await api.colonia(R.pos.lat, R.pos.lng);
    try {
      await api.addFind({ category_id: cat, name: nombre, note: nota || null, is_private: priv,
        lat: R.pos.lat, lng: R.pos.lng, accuracy: R.pos.acc, colonia, photo: pFoto, thumb: pMini });
    } catch (e) { api.removeFiles([pFoto, pMini]).catch(() => null); throw e; }
    const despues = await api.stats(S.user.id);
    S.stats = despues;
    cerrarTodo();
    celebrar(novedades(antes, despues), 'Guardado');
    refrescarActual();
  } catch (e) { ocupado(btn, false); fallo(e); }
}
function celebrar(n, textoBase) {
  const hay = n.nuevos.length || n.colonias.length || n.records.length;
  if (!hay) return aviso(textoBase);
  abrirHoja(() => `${cabeza(ic('sparkles'))}<div class="unlock">
    ${n.colonias.map((c) => `<div class="banner" style="margin-bottom:10px;justify-content:center">${ic('map-pin')} <b>${esc(c)}</b></div>`).join('')}
    <div class="medals" style="justify-content:center">${n.nuevos.map(medalla).join('')}</div>
    ${n.records.map((r) => `<p class="row" style="justify-content:center">${ic(r.icon)} ${esc(r.texto)}</p>`).join('')}
    <button class="btn block" data-act="cerrar" style="margin-top:18px">${ic('check')}</button></div>`);
}

/* Editar hallazgo */
function editarHallazgo(id) {
  const c = S.cache.get(id); if (!c) return;
  const E = { pos: { lat: c.lat, lng: c.lng, acc: c.accuracy }, movido: false };
  abrirHoja(() => `${cabeza(ic('pencil'))}
    <div class="field"><label>${ic('cards')}</label>${selectorCategorias(c.category_id)}</div>
    <div class="field"><label for="e-nombre">${ic('pencil')} Nombre</label><input id="e-nombre" class="in" maxlength="60" value="${esc(c.name)}"></div>
    <div class="field"><label for="e-nota">${ic('info-circle')} Nota</label><textarea id="e-nota" class="in" maxlength="140">${esc(c.note || '')}</textarea></div>
    <div class="field"><label>${ic('eye')}</label><div class="toggle" data-pick="priv">
      <button type="button" data-act="elegir" data-v="0" class="${!c.is_private ? 'on' : ''}" aria-label="${C.AYUDA.publico}">${ic('eye')}</button>
      <button type="button" data-act="elegir" data-v="1" class="${c.is_private ? 'on' : ''}" aria-label="${C.AYUDA.privado}">${ic('lock')}</button></div></div>
    <div class="field"><label>${ic('map-pin')}</label><div class="minimap" id="mini-ed"></div></div>
    <button class="btn block" data-act="guardar_edicion" data-id="${c.id}">${ic('check')} Guardar</button>`,
  (raiz) => { miniMapa($('#mini-ed', raiz), E.pos, (p) => { E.pos = p; E.movido = true; }); raiz._edicion = E; });
}
async function guardarEdicion(btn, id) {
  const raiz = $('.sheet'), E = raiz._edicion, c = S.cache.get(id);
  const nombre = $('#e-nombre', raiz).value.trim();
  if (!nombre) return aviso('Ponle un nombre', 'pencil');
  const cambios = { name: nombre, note: $('#e-nota', raiz).value.trim() || null, category_id: valor(raiz, 'cat') || c.category_id, is_private: valor(raiz, 'priv') === '1' };
  ocupado(btn, true);
  try {
    if (E.movido && distancia(E.pos, c) > 5) {
      Object.assign(cambios, { lat: E.pos.lat, lng: E.pos.lng, accuracy: null });
      cambios.colonia = await api.colonia(E.pos.lat, E.pos.lng);
    }
    await api.updateFind(id, cambios);
    const nueva = await api.card(id); if (nueva) guarda([nueva]);
    S.stats = null;
    cerrarHoja(); refrescarFicha(id); refrescarActual(); aviso('Guardado');
  } catch (e) { ocupado(btn, false); fallo(e); }
}

/* Cerca de mí */
function cercaDeMi() {
  const D = { estado: 'buscando', lista: [], mios: false, pos: null };
  const render = () => `${cabeza(ic('walk'))}
    <div class="toggle" style="margin-bottom:12px">
      <button type="button" data-act="cerca_filtro" data-v="0" class="${!D.mios ? 'on' : ''}" aria-label="${C.AYUDA.filtro_todos}">${ic('map-2')}</button>
      <button type="button" data-act="cerca_filtro" data-v="1" class="${D.mios ? 'on' : ''}" aria-label="${C.AYUDA.filtro_mios}">${ic(okIcon(S.me.avatar))}</button></div>
    ${D.estado === 'buscando' ? `<div class="empty"><span class="spin">${ic('loader-2')}</span></div>` : ''}
    ${D.estado === 'error' ? `<div class="empty">${ic('current-location')}<p>Activa el GPS para ver lo que hay cerca</p></div>` : ''}
    ${D.estado === 'ok' ? (D.lista.filter((c) => !D.mios || c.user_id === S.user.id).map((c) => `<div class="li" style="margin-bottom:10px">
        ${c.thumb ? `<img class="thumb" src="${foto(c, true)}" alt="" data-act="ficha" data-id="${c.id}">` : `<span class="thumb" data-act="ficha" data-id="${c.id}">${ic(okIcon(c.cat_icon))}</span>`}
        <div class="grow" data-act="ficha" data-id="${c.id}"><b>${esc(c.name)}</b><div class="tiny">${ic(okIcon(c.cat_icon))} ${metros(c.dist)} · ${esc(c.user_name)}</div></div>
        ${ib('ruta', 'route', 'ruta', `data-id="${c.id}"`, 'sm')}</div>`).join('') || `<div class="empty">${ic('walk')}<p>Nada registrado a menos de ${metros(C.CERCA_METROS)}</p></div>`) : ''}`;
  const hoja = { render, after: (r) => { r._cerca = D; } };
  pila.push(hoja); dibujarHoja();
  getPos().then(async (p) => {
    D.pos = p; ponerYo(p);
    const l = guarda(await api.cardsInBox(cajaAlrededor(p, C.CERCA_METROS), { limit: 300 }));
    D.lista = l.map((c) => Object.assign({}, c, { dist: distancia(p, c) })).filter((c) => c.dist <= C.CERCA_METROS).sort((a, b) => a.dist - b.dist);
    D.estado = 'ok';
  }).catch((e) => { D.estado = 'error'; if (!(e && typeof e.code === 'number') && !(e && e.message === 'NO_GPS')) fallo(e); })
    .finally(() => { if (pila.includes(hoja) && pila[pila.length - 1] === hoja) dibujarHoja(); });
}

/* Tabla general */
function tablaGeneral() {
  const D = { metric: 'total', filas: null };
  const hoja = { render: () => `${cabeza(ic('trophy'))}
    <div class="toggle" style="margin-bottom:12px">
      <button type="button" data-act="tabla_metrica" data-v="total" class="${D.metric === 'total' ? 'on' : ''}" data-tip="Hallazgos" aria-label="Hallazgos">${ic('photo')}</button>
      <button type="button" data-act="tabla_metrica" data-v="colonias" class="${D.metric === 'colonias' ? 'on' : ''}" data-tip="Colonias" aria-label="Colonias">${ic('map-pin')}</button></div>
    ${!D.filas ? `<div class="empty"><span class="spin">${ic('loader-2')}</span></div>` : D.filas.length ? `<div class="list">${D.filas.map((f, i) => `
      <button class="li" data-act="perfil" data-id="${f.user_id}" style="${f.user_id === S.user.id ? 'background:var(--mostaza)' : ''}">
        <span class="rank">${i < 3 ? ic(['crown', 'medal', 'medal'][i]) : i + 1}</span>${avatar(f)}<b class="grow" style="text-align:left">${esc(f.name)}</b>
        <b>${D.metric === 'colonias' ? f.colonias : f.total}</b></button>`).join('')}</div>` : `<div class="empty">${ic('trophy')}<p>Todavía no hay nadie en la tabla</p></div>`}`,
    after: (r) => { r._tabla = D; } };
  pila.push(hoja); dibujarHoja();
  D.cargar = async () => { D.filas = null; dibujarHoja(); try { D.filas = await api.leaderboard(D.metric); } catch (e) { D.filas = []; fallo(e); } if (pila[pila.length - 1] === hoja) dibujarHoja(); };
  D.cargar();
}

/* Categorías */
function hojaCategorias(alTerminar) {
  const render = () => `${cabeza(ic('cards'))}
    <div class="list">${S.cats.map((c) => `<div class="li"><span class="avatar" style="background:${okColor(c.color)}">${ic(okIcon(c.icon))}</span>
      <b class="grow">${esc(c.name)}</b>${ib('editar_categoria', 'pencil', 'editar', `data-id="${c.id}"`, 'sm')}${ib('borrar_categoria', 'trash', 'borrar', `data-id="${c.id}"`, 'sm')}</div>`).join('')}</div>
    <p class="tiny" style="margin:10px 0">${S.cats.length} / ${C.MAX_CATEGORIAS}</p>
    ${S.cats.length < C.MAX_CATEGORIAS ? `<button class="btn alt block" data-act="editar_categoria" data-id="">${ic('plus')}</button>` : ''}
    ${alTerminar ? `<button class="btn block" data-act="listo_categorias" style="margin-top:12px" ${S.cats.length ? '' : 'disabled'}>${ic('check')} Listo</button>` : ''}`;
  abrirHoja(render, null, 'categorias', !!alTerminar);
  pila[pila.length - 1].listo = alTerminar;
}
function editarCategoria(id) {
  const c = S.cats.find((x) => x.id === id) || { id: '', name: '', icon: C.ICONOS_CATEGORIA[0], color: C.COLORES_CATEGORIA[S.cats.length % C.COLORES_CATEGORIA.length] };
  abrirHoja(() => `${cabeza(ic(c.id ? 'pencil' : 'plus'))}
    <div class="field"><label for="c-nombre">${ic('pencil')} Nombre</label><input id="c-nombre" class="in" maxlength="30" value="${esc(c.name)}" placeholder="Gatos, puertas, autos…"></div>
    <div class="field"><label>${ic('palette')}</label>${selector('color', C.COLORES_CATEGORIA, c.color, 'color')}</div>
    <div class="field"><label>${ic('sparkles')}</label>${selector('icono', C.ICONOS_CATEGORIA, c.icon)}</div>
    <button class="btn block" data-act="guardar_categoria" data-id="${c.id}">${ic('check')} Guardar</button>`);
}
async function guardarCategoria(btn, id) {
  const raiz = $('.sheet');
  const d = { name: $('#c-nombre', raiz).value.trim(), icon: valor(raiz, 'icono'), color: valor(raiz, 'color') };
  if (!d.name) return aviso('Ponle un nombre', 'pencil');
  if (!d.icon || !d.color) return aviso('Elige ícono y color', 'palette');
  ocupado(btn, true);
  try {
    if (id) await api.updateCat(id, d); else await api.addCat(d);
    S.cats = await api.listCats(S.user.id);
    S.stats = null;
    cerrarHoja(); aviso('Guardado');
    if (!$('#scr-map')) return;
    if (S.tab !== 'map') irA(S.tab); else $('#chips-mapa').innerHTML = chipsMapa();
  } catch (e) { ocupado(btn, false); fallo(e); }
}

/* Perfil: crear y editar */
function hojaPerfil(p, nuevo) {
  const d = p || { name: '', bio: '', avatar: C.ICONOS_AVATAR[0], avatar_color: C.COLORES_CATEGORIA[0] };
  return `${nuevo ? `<h1 class="serif" style="margin:6px 0 4px">Collector Go</h1><p class="muted">${ic('user')} Tu perfil</p>` : cabeza(ic('pencil'))}
    <div class="field"><label for="p-nombre">${ic('user')} Nombre</label><input id="p-nombre" class="in" maxlength="40" value="${esc(d.name)}" placeholder="Laura"></div>
    <div class="field"><label for="p-bio">${ic('info-circle')} Frase</label><input id="p-bio" class="in" maxlength="120" value="${esc(d.bio || '')}" placeholder="Coleccionista de puertas"></div>
    <div class="field"><label>${ic('sparkles')}</label>${selector('avatar', C.ICONOS_AVATAR, d.avatar)}</div>
    <div class="field"><label>${ic('palette')}</label>${selector('color', C.COLORES_CATEGORIA, d.avatar_color, 'color')}</div>
    <button class="btn block" data-act="${nuevo ? 'crear_perfil' : 'guardar_perfil'}">${ic('check')} ${nuevo ? 'Continuar' : 'Guardar'}</button>`;
}
function leerPerfil(raiz) {
  return { name: $('#p-nombre', raiz).value.trim(), bio: $('#p-bio', raiz).value.trim() || null, avatar: valor(raiz, 'avatar'), avatar_color: valor(raiz, 'color') };
}

/* Moderación */
function hojaAdmin() {
  const D = { avisos: null, bloqueados: [] };
  const hoja = { render: () => `${cabeza(ic('shield'))}
    <div class="sec" style="margin-top:0"><h3>${ic('flag')} ${D.avisos ? D.avisos.length : ''}</h3>
    ${!D.avisos ? `<div class="empty"><span class="spin">${ic('loader-2')}</span></div>` : D.avisos.length ? `<div class="list">${D.avisos.map((a) => a.card ? `
      <div class="li">${a.card.thumb ? `<img class="thumb" src="${foto(a.card, true)}" alt="">` : `<span class="thumb">${ic(okIcon(a.card.cat_icon))}</span>`}
        <div class="grow"><b>${esc(a.card.name)}</b><div class="tiny">${esc(a.card.user_name)} · ${ic('flag')} ${a.n}</div></div>
        ${ib('ficha', 'eye', 'ver', `data-id="${a.card.id}"`, 'sm')}${ib('descartar', 'check', 'descartar', `data-id="${a.card.id}"`, 'sm')}${ib('borrar_hallazgo', 'trash', 'borrar', `data-id="${a.card.id}"`, 'sm')}${ib('bloquear', 'ban', 'bloquear', `data-id="${a.card.user_id}"`, 'sm')}
      </div>` : `<div class="li"><div class="grow tiny">—</div>${ib('descartar', 'check', 'descartar', `data-id="${a.find_id}"`, 'sm')}</div>`).join('')}</div>` : `<div class="empty">${ic('check')}<p>Sin avisos</p></div>`}</div>
    <div class="sec"><h3>${ic('ban')} ${D.bloqueados.length}</h3><div class="list">${D.bloqueados.map((p) => `
      <div class="li">${avatar(p)}<b class="grow">${esc(p.name)}</b>${ib('desbloquear', 'lock-open', 'desbloquear', `data-id="${p.id}"`, 'sm')}</div>`).join('')}</div></div>`,
    after: (r) => { r._admin = D; }, tipo: 'admin' };
  pila.push(hoja); dibujarHoja();
  D.cargar = async () => {
    try {
      const rs = await api.reports();
      const n = {}; rs.forEach((r) => { n[r.find_id] = (n[r.find_id] || 0) + 1; });
      const ids = Object.keys(n);
      const cards = guarda(await api.cardsByIds(ids));
      D.avisos = ids.map((id) => ({ find_id: id, n: n[id], card: cards.find((c) => c.id === id) }));
      D.bloqueados = await api.blockedList();
    } catch (e) { D.avisos = []; fallo(e); }
    if (pila.includes(hoja)) dibujarHoja();
  };
  D.cargar();
  return D;
}
const adminAbierto = () => pila.find((h) => h.tipo === 'admin');

/* ---------------------------------------------------------------------
   8. ACCIONES DE BOTONES
   --------------------------------------------------------------------- */
const ACCIONES = {
  entrar: (b) => { ocupado(b, true); api.login().catch((e) => { ocupado(b, false); fallo(e); }); },
  tab: (b) => irA(b.dataset.v),
  nuevo: () => nuevoRegistro(),
  fondo: (b, ev) => { const top = pila[pila.length - 1]; if (ev.target === b && top && !top.fija) cerrarHoja(); },
  cerrar: () => cerrarHoja(),
  atras: () => cerrarHoja(),
  elegir: (b) => { const g = b.closest('[data-pick]'); $$('[data-v]', g).forEach((x) => x.classList.toggle('on', x === b)); },

  /* mapa */
  filtro(b) {
    const v = b.dataset.v;
    S.filtro = v === 'todos' ? { mios: false, cat: null } : v === 'mios' ? { mios: true, cat: null } : { mios: true, cat: v };
    $('#chips-mapa').innerHTML = chipsMapa(); cargarPines();
  },
  ubicar(b) {
    ocupado(b, true);
    getPos().then((p) => { ponerYo(p); S.map.setView([p.lat, p.lng], 17); })
      .catch(() => aviso('No se pudo leer el GPS', 'current-location')).finally(() => ocupado(b, false));
  },
  cerca: () => cercaDeMi(),
  cerca_filtro(b) { const D = $('.sheet')._cerca; D.mios = b.dataset.v === '1'; dibujarHoja(); },

  /* muro, tarjetas y fichas */
  refrescar: () => pintarMuro(),
  mas: () => pintarMuro(true),
  ficha: (b) => abrirFicha(b.dataset.id),
  perfil: (b) => abrirPerfil(b.dataset.id),
  async reaccion(b) {
    const c = S.cache.get(b.dataset.id), tipo = b.dataset.v; if (!c) return;
    const mia = (c.my_reactions || []).includes(tipo);
    const r = Object.assign({}, c.reactions || {});
    r[tipo] = Math.max(0, (r[tipo] || 0) + (mia ? -1 : 1));
    const nueva = Object.assign({}, c, { reactions: r, my_reactions: mia ? c.my_reactions.filter((x) => x !== tipo) : (c.my_reactions || []).concat(tipo) });
    guarda([nueva]); refrescarFicha(c.id);
    try { await api.react(c.id, tipo, !mia, S.user.id); }
    catch (e) { guarda([c]); refrescarFicha(c.id); fallo(e); }
  },
  ruta(b) {
    const c = S.cache.get(b.dataset.id); if (!c) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`, '_blank', 'noopener');
  },
  ver_mapa(b) {
    const c = S.cache.get(b.dataset.id); if (!c) return;
    cerrarTodo(); irA('map');
    setTimeout(() => S.map.setView([c.lat, c.lng], 18), 60);
  },
  compartir: (b) => compartir(`#f=${b.dataset.id}`, (S.cache.get(b.dataset.id) || {}).name),
  compartir_perfil: (b) => compartir(`#u=${b.dataset.id}`, 'Collector Go'),
  async reencuentro(b) {
    const c = S.cache.get(b.dataset.id); if (!c) return;
    ocupado(b, true);
    try {
      let p = null; try { p = await getPos(); } catch (e) { p = null; }
      const antes = S.stats || await api.stats(S.user.id);
      await api.addSighting({ find_id: c.id, lat: p ? p.lat : null, lng: p ? p.lng : null });
      const nueva = await api.card(c.id); if (nueva) guarda([nueva]);
      const despues = await api.stats(S.user.id); S.stats = despues;
      if (pila.some((h) => h.render === registroHTML)) cerrarTodo(); else refrescarFicha(c.id);
      celebrar(novedades(antes, despues), 'Reencuentro guardado');
    } catch (e) { ocupado(b, false); fallo(e); }
  },
  editar_hallazgo: (b) => editarHallazgo(b.dataset.id),
  guardar_edicion: (b) => guardarEdicion(b, b.dataset.id),
  async borrar_hallazgo(b) {
    const c = S.cache.get(b.dataset.id); if (!c) return;
    if (!(await confirmar(`¿Borrar "${c.name}"?`))) return;
    ocupado(b, true);
    try {
      await api.removeFiles([c.photo, c.thumb]).catch(() => null);
      await api.delFind(c.id);
      S.cache.delete(c.id); S.feed = S.feed.filter((x) => x.id !== c.id); S.stats = null;
      const adm = adminAbierto();
      if (adm) { await api.dismiss(c.id).catch(() => null); while (pila[pila.length - 1] !== adm) pila.pop(); dibujarHoja(); $('.sheet')._admin.cargar(); }
      else cerrarTodo();
      aviso('Borrado', 'trash'); refrescarActual();
    } catch (e) { ocupado(b, false); fallo(e); }
  },
  async avisar(b) {
    if (!(await confirmar('¿Avisar a moderación sobre este hallazgo?', 'flag'))) return;
    try { await api.report(b.dataset.id); aviso('Aviso enviado', 'flag'); }
    catch (e) { if (e && e.code === '23505') aviso('Ya habías avisado', 'flag'); else fallo(e); }
  },

  /* registrar */
  usar_original(b) {
    R.usarRecorte = false; ponerVista(R.original);
    $$('.toggle [data-act]', b.parentNode).forEach((x) => x.classList.toggle('on', x === b));
  },
  async recortar(b) {
    const botones = $$('.toggle [data-act]', b.parentNode);
    if (R.recorte) { R.usarRecorte = true; ponerVista(R.recorte); botones.forEach((x) => x.classList.toggle('on', x === b)); return; }
    const prog = $('#prog'); prog.hidden = false; ocupado(b, true);
    try {
      R.recorte = await recortarFondo(R.original, (k) => { prog.firstElementChild.style.width = Math.round(k * 100) + '%'; });
      R.usarRecorte = true; ponerVista(R.recorte);
      ocupado(b, false); botones.forEach((x) => x.classList.toggle('on', x === b));
    } catch (e) {
      console.error(e); ocupado(b, false);
      aviso('No se pudo recortar. Se usará la foto original', 'scissors');
    } finally { prog.hidden = true; }
  },
  releer_gps: () => leerGPS(),
  guardar_hallazgo: (b) => guardarHallazgo(b),

  /* colección y categorías */
  colcat: (b) => { S.coleccionCat = b.dataset.v || null; pintarColeccion(); },
  categorias: () => hojaCategorias(false),
  editar_categoria: (b) => editarCategoria(b.dataset.id),
  guardar_categoria: (b) => guardarCategoria(b, b.dataset.id),
  async borrar_categoria(b) {
    const c = S.cats.find((x) => x.id === b.dataset.id); if (!c) return;
    if (!(await confirmar(`¿Borrar la categoría "${c.name}"?`))) return;
    try {
      await api.delCat(c.id);
      S.cats = await api.listCats(S.user.id);
      if (S.filtro.cat === c.id) S.filtro = { mios: false, cat: null };
      dibujarHoja(); aviso('Borrado', 'trash');
    } catch (e) { fallo(e); }
  },
  listo_categorias() {
    if (!S.cats.length) return aviso('Crea al menos una categoría', 'plus');
    const top = pila[pila.length - 1]; cerrarTodo(); if (top && top.listo) top.listo();
  },

  /* perfil */
  async crear_perfil(b) {
    const d = leerPerfil($('.sheet') || document);
    if (!d.name) return aviso('Escribe tu nombre', 'user');
    ocupado(b, true);
    try { S.me = await api.createProfile(Object.assign({ id: S.user.id }, d)); cerrarTodo(); pedirCategorias(); }
    catch (e) { ocupado(b, false); fallo(e); }
  },
  editar_perfil: () => abrirHoja(() => hojaPerfil(S.me, false)),
  async guardar_perfil(b) {
    const d = leerPerfil($('.sheet'));
    if (!d.name) return aviso('Escribe tu nombre', 'user');
    ocupado(b, true);
    try { S.me = await api.updateProfile(S.user.id, d); cerrarHoja(); aviso('Guardado'); if (S.tab === 'perfil') pintarPerfil(); }
    catch (e) { ocupado(b, false); fallo(e); }
  },
  tabla: () => tablaGeneral(),
  tabla_metrica(b) { const D = $('.sheet')._tabla; D.metric = b.dataset.v; D.cargar(); },
  async salir() { if (await confirmar('¿Cerrar sesión?', 'logout')) { await api.logout().catch(() => null); location.hash = ''; location.reload(); } },

  /* moderación */
  admin: () => hojaAdmin(),
  async descartar(b) { try { await api.dismiss(b.dataset.id); aviso('Aviso descartado'); $('.sheet')._admin.cargar(); } catch (e) { fallo(e); } },
  async bloquear(b) {
    if (!(await confirmar('¿Bloquear esta cuenta? Sus hallazgos se ocultan', 'ban'))) return;
    try { await api.setBlocked(b.dataset.id, true); aviso('Cuenta bloqueada', 'ban'); trasModerar(); } catch (e) { fallo(e); }
  },
  async desbloquear(b) {
    try { await api.setBlocked(b.dataset.id, false); aviso('Cuenta desbloqueada', 'lock-open'); trasModerar(); } catch (e) { fallo(e); }
  }
};
function trasModerar() {
  const sh = $('.sheet');
  if (sh && sh._admin) sh._admin.cargar();
  else if (pila.length) { cerrarHoja(); }
  refrescarActual();
}
async function compartir(hash, titulo) {
  const url = location.origin + location.pathname + hash;
  try {
    if (navigator.share) { await navigator.share({ title: titulo || 'Collector Go', url }); return; }
    await navigator.clipboard.writeText(url); aviso('Enlace copiado', 'share');
  } catch (e) { if (!(e && e.name === 'AbortError')) aviso(url, 'share'); }
}
document.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-act]');
  if (!b || b.disabled) return;
  const f = ACCIONES[b.dataset.act];
  if (!f) { console.warn('Acción sin lógica:', b.dataset.act); return; }
  f(b, ev);
});

/* ---------------------------------------------------------------------
   INICIO
   --------------------------------------------------------------------- */
function pantallaEntrada() {
  $('#app').innerHTML = `<div class="login">
    <img class="logo" src="icon.svg" alt="">
    <h1 class="serif" style="font-size:36px">Collector Go</h1>
    <p class="muted" style="max-width:280px">${ic('map-pin')} Colecciona lo que encuentras en la calle y vuelve a encontrarlo.</p>
    <button class="btn" data-act="entrar">${ic('brand-google')} Entrar con Google</button></div>`;
}
function pantallaConfig() {
  $('#app').innerHTML = `<div class="login"><h1 class="serif">Collector Go</h1>
    <p class="muted">${ic('alert-triangle')} Falta pegar la URL y la llave pública de Supabase en config.js</p></div>`;
}
function pedirPerfil() { $('#app').innerHTML = ''; abrirHoja(() => hojaPerfil(null, true), null, 'perfil_nuevo', true); }
function pedirCategorias() { $('#app').innerHTML = ''; hojaCategorias(() => { pintarApp(); rutaHash(); }); }
async function arrancar(user) {
  if (S.arrancando || (S.user && S.user.id === user.id)) return;
  S.arrancando = true; S.user = user;
  try {
    S.me = await api.getProfile(user.id);
    if (!S.me) return pedirPerfil();
    S.cats = await api.listCats(user.id);
    if (!S.cats.length) return pedirCategorias();
    pintarApp(); rutaHash();
  } catch (e) { fallo(e); S.user = null; pantallaEntrada(); }
  finally { S.arrancando = false; }
}
function rutaHash() {
  const m = location.hash.match(/^#([fu])=([0-9a-f-]{36})$/i);
  if (!m) return;
  history.replaceState(null, '', location.pathname);
  if (m[1] === 'f') abrirFicha(m[2]); else abrirPerfil(m[2]);
}
window.addEventListener('hashchange', () => { if (S.me && S.cats.length && $('#scr-map')) rutaHash(); });

async function iniciar() {
  api = window.__API_PRUEBAS__ || (/^https:\/\//.test(C.SUPABASE_URL) ? supabaseApi() : null);
  if (!api) return pantallaConfig();
  api.onAuth((ev, u) => {
    if (ev === 'SIGNED_OUT') { S.user = null; pantallaEntrada(); }
    else if (u && (ev === 'SIGNED_IN' || ev === 'INITIAL_SESSION')) arrancar(u);
  });
  try { const u = await api.session(); if (u) arrancar(u); else if (!S.user) pantallaEntrada(); }
  catch (e) { fallo(e); pantallaEntrada(); }
}
window.__CG__ = { ACCIONES, S, logros, novedades };
iniciar();
})();
