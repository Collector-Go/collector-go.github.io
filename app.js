/* =====================================================================
   Collector Go · app.js · v1.1
   Estructura (para parches rápidos):
     1. Utilidades            6. Pantallas (muro, colección, perfil)
     2. Capa de datos (api)   7. Hojas (ficha, registrar, editar, grupos…)
     3. Juego (logros)        8. Acciones de botones (ACCIONES)
     4. Hojas y avisos        9. Inicio
     5. Mapa
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
const esEmoji = (n) => typeof n === 'string' && n.startsWith('emoji:') && n.length > 6 && n.length <= 30;
const esIcono = (n) => typeof n === 'string' && (/^[a-z0-9-]{1,60}$/.test(n) || esEmoji(n));
const okIcon = (n) => (esIcono(n) ? n : 'star');
const okColor = (c) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : C.COLORES.terracota);
function ic(name) {
  const n = okIcon(name);
  if (esEmoji(n)) return `<i class="ic emo" aria-hidden="true">${esc(n.slice(6))}</i>`;
  return `<i class="ic" style="--i:url('${C.ICONOS_URL}${n}.svg')" aria-hidden="true"></i>`;
}
function ib(act, icon, tip, attrs = '', cls = '') {
  const t = esc(C.AYUDA[tip] || tip || '');
  return `<button class="ib ${cls}" data-act="${act}" data-tip="${t}" aria-label="${t}" ${attrs}>${ic(icon)}</button>`;
}
function avatar(p, cls = '') {
  return `<span class="avatar ${cls}" style="background:${okColor(p && p.avatar_color)}">${ic(p && p.avatar)}</span>`;
}
function catBadge(name, icon, color) {
  return `<span class="catb" style="background:${okColor(color)}">${ic(icon)}${esc(name)}</span>`;
}
const sinAcentos = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
function primerGrafema(t) {
  const s = String(t || '').trim();
  if (!s) return '';
  if (window.Intl && Intl.Segmenter) { const it = new Intl.Segmenter('es', { granularity: 'grapheme' }).segment(s)[Symbol.iterator]().next(); return it.value ? it.value.segment : ''; }
  return Array.from(s)[0];
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
const errTexto = (e) => String((e && (e.message || e.code)) || e || '');
function mensajeError(e) {
  const m = errTexto(e);
  if (m.includes('MAX_CATEGORIAS')) return `Máximo ${C.MAX_CATEGORIAS} categorías`;
  if (m.includes('NOMBRE_REPETIDO')) return 'Ese nombre ya existe aquí';
  if (m.includes('MAX_COMENTARIOS')) return `Máximo ${C.COMENTARIOS_POR_PERSONA} comentarios por hallazgo`;
  if (m.includes('comments_body_check')) return `Máximo ${C.COMENTARIO_MAX} caracteres`;
  if (m.includes('INVITACION_INVALIDA')) return 'Esa invitación ya no es válida';
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
  // o: { uid, cat, uids, group, comunidad }
  const filtrar = (q, o) => {
    if (o.uid) q = q.eq('user_id', o.uid);
    if (o.cat) q = q.eq('category_id', o.cat);
    if (o.uids) q = q.in('user_id', o.uids.length ? o.uids : ['00000000-0000-0000-0000-000000000000']);
    if (o.group) q = q.eq('group_id', o.group);
    if (o.comunidad) q = q.or('group_id.is.null,group_public.eq.true');
    return q;
  };
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
      const q = cards().gte('lat', b.s).lte('lat', b.n).gte('lng', b.w).lte('lng', b.e);
      return filtrar(q, o).order('created_at', { ascending: false }).limit(o.limit || 400).then(ok);
    },
    feed(before, o = {}) {
      let q = filtrar(cards().eq('is_private', false), o).order('created_at', { ascending: false }).limit(20);
      if (before) q = q.lt('created_at', before);
      return q.then(ok);
    },
    userCards: (uid) => cards().eq('user_id', uid).order('created_at', { ascending: false }).limit(1000).then(ok),
    groupCards: (gid) => cards().eq('group_id', gid).order('created_at', { ascending: false }).limit(1000).then(ok),
    card: (id) => cards().eq('id', id).maybeSingle().then(ok),
    cardsByIds: (ids) => (ids.length ? cards().in('id', ids).then(ok) : Promise.resolve([])),
    history: (findId) => sb.from('sighting_cards').select('*').eq('find_id', findId).order('created_at', { ascending: false }).then(ok),
    comments: (findId) => sb.from('comment_cards').select('*').eq('find_id', findId).order('created_at').then(ok),
    addComment: (findId, body) => sb.from('comments').insert({ find_id: findId, body }).then(ok),
    delComment: (id) => sb.from('comments').delete().eq('id', id).then(ok),
    findByName: (nombre, categoria, grupo) => sb.rpc('find_by_name', { nombre, categoria: categoria || null, grupo: grupo || null }).then(ok),
    addFind: (f) => sb.from('finds').insert(f).select('id').single().then(ok).then((r) => r.id),
    updateFind: (id, f) => sb.from('finds').update(f).eq('id', id).then(ok),
    delFind: (id) => sb.from('finds').delete().eq('id', id).then(ok),
    merge: (origen, destino) => sb.rpc('merge_finds', { origen, destino }).then(ok),
    addSighting: (s) => sb.from('sightings').insert(s).then(ok),
    react(findId, kind, on, uid) {
      return on ? sb.from('reactions').insert({ find_id: findId, kind }).then(ok)
                : sb.from('reactions').delete().match({ find_id: findId, kind, user_id: uid }).then(ok);
    },
    report: (findId) => sb.from('reports').insert({ find_id: findId }).then(ok),
    stats: (uid) => sb.rpc('profile_stats', { p_uid: uid, tz: C.ZONA_HORARIA }).then(ok),
    leaderboard: (metric, grupo) => sb.rpc('leaderboard', { metric, lim: 30, grupo: grupo || null }).then(ok),
    following: (uid) => sb.from('follows').select('followee').eq('follower', uid).then(ok).then((r) => r.map((x) => x.followee)),
    follow(uid, on, me) {
      return on ? sb.from('follows').insert({ followee: uid }).then(ok)
                : sb.from('follows').delete().match({ follower: me, followee: uid }).then(ok);
    },
    myGroups: (uid) => sb.from('group_members').select('group_id, groups(*)').eq('user_id', uid).then(ok)
      .then((r) => r.map((x) => x.groups).filter(Boolean).sort((a, b) => a.created_at.localeCompare(b.created_at))),
    getGroup: (gid) => sb.from('groups').select('*').eq('id', gid).maybeSingle().then(ok),
    groupMembers: (gid) => sb.from('group_members').select('user_id, joined_at, profiles(name, avatar, avatar_color)').eq('group_id', gid).then(ok)
      .then((r) => r.map((m) => Object.assign({ user_id: m.user_id }, m.profiles || {}))),
    createGroup: (g) => sb.from('groups').insert(g).select().single().then(ok),
    updateGroup: (gid, g) => sb.from('groups').update(g).eq('id', gid).select().single().then(ok),
    leaveGroup: (gid, uid) => sb.from('group_members').delete().match({ group_id: gid, user_id: uid }).then(ok),
    invitePreview: (code) => sb.rpc('invite_preview', { code }).then(ok).then((r) => (r && r[0]) || null),
    joinGroup: (code) => sb.rpc('join_group', { code }).then(ok),
    reports: () => sb.from('reports').select('find_id, created_at').then(ok),
    dismiss: (findId) => sb.from('reports').delete().eq('find_id', findId).then(ok),
    setBlocked: (uid, b) => sb.from('profiles').update({ blocked: b }).eq('id', uid).then(ok),
    blockedList: () => sb.from('profiles').select('*').eq('blocked', true).then(ok),
    upload: (path, blob) => sb.storage.from('fotos').upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false }).then(ok),
    removeFiles: (paths) => sb.storage.from('fotos').remove(paths.filter(Boolean)).then(ok),
    async deleteAccount(uid) {
      for (let i = 0; i < 50; i++) {
        const files = ok(await sb.storage.from('fotos').list(uid, { limit: 100 }));
        if (!files || !files.length) break;
        ok(await sb.storage.from('fotos').remove(files.map((f) => `${uid}/${f.name}`)));
      }
      ok(await sb.rpc('delete_my_account'));
      await sb.auth.signOut().catch(() => null);
    },
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
    },
    async iconList() {
      const r = await fetch(C.ICONOS_LISTA_URL);
      if (!r.ok) throw new Error('ICONOS');
      const j = await r.json();
      return Object.values(j).filter((x) => x && x.styles && x.styles.outline)
        .map((x) => ({ n: x.name, t: (x.name + ' ' + (x.tags || []).join(' ')).toLowerCase() }));
    }
  };
}
let api = null;

/* Estado de la app */
const S = {
  user: null, me: null, cats: [], groups: [], following: new Set(), tab: 'map', stats: null,
  filtro: { modo: 'todos', id: null }, muro: { modo: 'todos', id: null },
  cache: new Map(), feed: [], feedFin: false, coleccionCat: null,
  map: null, capa: null, yo: null, mini: null, arrancando: false
};
const guarda = (arr) => { (arr || []).forEach((c) => S.cache.set(c.id, c)); return arr || []; };
const foto = (c, mini) => api.photoUrl(mini ? (c.thumb || c.photo) : (c.photo || c.thumb));
const miGrupo = (gid) => S.groups.find((g) => g.id === gid);
const puedoReencontrar = (c) => c.user_id === S.user.id || (c.group_id && !!miGrupo(c.group_id));
// Opciones de consulta según el filtro elegido (mapa y muro)
function opcionesFiltro(f) {
  if (f.modo === 'mios') return { uid: S.user.id };
  if (f.modo === 'cat') return { uid: S.user.id, cat: f.id };
  if (f.modo === 'siguiendo') return { uids: [...S.following], comunidad: true };
  if (f.modo === 'grupo') return { group: f.id };
  return { comunidad: true };
}

/* ---------------------------------------------------------------------
   3. JUEGO: logros a partir de las estadísticas
   --------------------------------------------------------------------- */
function logros(st) {
  const L = [];
  if (!st) return L;
  (st.categorias || []).forEach((c) => C.METAS_CATEGORIA.forEach((m) => L.push({
    k: `cat:${c.id}:${m}`, on: c.total >= m, m, v: c.total, icon: okIcon(c.icon), color: okColor(c.color), titulo: c.name, tipo: 'cat', cat: c.id })));
  const nCol = (st.colonias || []).length;
  C.METAS_COLONIAS.forEach((m) => L.push({ k: 'col:' + m, on: nCol >= m, m, v: nCol, icon: 'map-pin', color: C.COLORES.oliva, titulo: C.TITULOS_MEDALLAS.col, tipo: 'col' }));
  C.METAS_RACHA_SEMANAS.forEach((m) => L.push({ k: 'racha:' + m, on: (st.racha_mejor || 0) >= m, m, v: st.racha_mejor || 0, icon: 'flame', color: C.COLORES.terracota, titulo: C.TITULOS_MEDALLAS.racha, tipo: 'racha' }));
  C.METAS_REENCUENTROS.forEach((m) => L.push({ k: 'reen:' + m, on: (st.reencuentros || 0) >= m, m, v: st.reencuentros || 0, icon: 'repeat', color: '#3F6E73', titulo: C.TITULOS_MEDALLAS.reen, tipo: 'reen' }));
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
function textoMedalla(l) {
  const unidad = l.tipo === 'racha' ? ' semanas' : '';
  return l.on ? `${l.titulo}: meta de ${l.m}${unidad} lograda` : `${l.titulo}: ${l.v} de ${l.m}${unidad}`;
}
function medalla(l) {
  return `<button class="medal ${l.on ? '' : 'off'}" data-act="medalla" data-info="${esc(textoMedalla(l))}" data-icon="${esc(l.icon)}" aria-label="${esc(textoMedalla(l))}">
    <span class="m" style="background:${l.color}">${ic(l.icon)}</span><span>${l.m}</span></button>`;
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
const hojaArriba = () => pila[pila.length - 1];
function cabeza(titulo, extra = '') {
  const top = hojaArriba();
  const back = pila.length > 1 ? ib('atras', 'arrow-left', 'atras') : '';
  const x = top && top.fija ? '' : ib('cerrar', 'x', 'cerrar');
  return `<div class="sheet-head">${back}<h2 class="grow">${titulo}</h2>${extra}${x}</div>`;
}
let tToast;
function aviso(texto, icono = 'check') {
  const t = $('#toast');
  t.innerHTML = `${ic(icono)}<span>${esc(texto)}</span>`;
  t.classList.add('show');
  clearTimeout(tToast); tToast = setTimeout(() => t.classList.remove('show'), 2800);
}
const fallo = (e) => { console.error(e); aviso(mensajeError(e), 'alert-triangle'); };
// Confirmación con dos botones de ícono (sí / no) y una imagen opcional
function confirmar(texto, icono = 'trash', imagen = '', iconoSi = 'check') {
  return new Promise((res) => {
    const d = document.createElement('div');
    d.className = 'overlay'; d.id = 'confirmar'; d.style.zIndex = 2000; d.style.alignItems = 'center';
    d.innerHTML = `<div class="card" style="padding:18px;max-width:320px;margin:16px;text-align:center">
      ${imagen ? `<img src="${esc(imagen)}" alt="" style="width:120px;height:120px;object-fit:contain;display:block;margin:0 auto 8px;background:var(--papel2);border-radius:12px;border:1px solid var(--tinta)">`
               : `<div style="font-size:40px;color:var(--terracota)">${ic(icono)}</div>`}
      <p style="margin:8px 0 16px">${esc(texto)}</p>
      <div class="row" style="justify-content:center;gap:16px">
        <button class="ib" data-si="0" aria-label="No">${ic('x')}</button>
        <button class="ib on" data-si="1" aria-label="Sí">${ic(iconoSi)}</button></div></div>`;
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

/* Selectores dentro de formularios */
function selector(nombre, opciones, actual, tipo) {
  if (tipo === 'color')
    return `<div class="swatches" data-pick="${nombre}">${opciones.map((c) => `<button type="button" data-act="elegir" data-v="${c}" class="${c === actual ? 'on' : ''}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div>`;
  return `<div class="pick" data-pick="${nombre}">${opciones.map((n) => `<button type="button" data-act="elegir" data-v="${n}" class="${n === actual ? 'on' : ''}" aria-label="${n}">${ic(n)}</button>`).join('')}</div>`;
}
// Destino de un hallazgo: una categoría propia (c:ID) o un grupo (g:ID)
function selectorDestino(actual) {
  const chip = (v, color, icon, nombre, grupo) => `<button type="button" class="chip ${v === actual ? 'on' : ''}" data-act="elegir" data-v="${v}">
    <span class="dot" style="background:${okColor(color)}"></span>${ic(icon)}${esc(nombre)}${grupo ? ` ${ic('users')}` : ''}</button>`;
  return `<div class="chips" data-pick="dest" style="flex-wrap:wrap">
    ${S.cats.map((c) => chip('c:' + c.id, c.color, c.icon, c.name)).join('')}
    ${S.groups.map((g) => chip('g:' + g.id, g.color, g.icon, g.name, true)).join('')}</div>`;
}
const valor = (raiz, nombre) => { const b = $(`[data-pick="${nombre}"] .on`, raiz); return b ? b.dataset.v : null; };

/* Selector de íconos: tres grupos, buscador en toda la biblioteca y emoji */
let LISTA_ICONOS = null;
function iconPicker(actual) {
  const sel = okIcon(actual);
  const g = esEmoji(sel) ? 'emoji' : ((C.ICONOS_GRUPOS.find((x) => x.iconos.includes(sel)) || C.ICONOS_GRUPOS[0]).id);
  return `<div class="iconpick" data-iconpick data-sel="${esc(sel)}">
    <div class="row" style="margin-bottom:10px"><span class="avatar" id="icono-elegido" style="background:var(--tinta)">${ic(sel)}</span>
      <input class="in grow" data-in="buscar-icono" id="buscar-icono" placeholder="Buscar: gato, puerta, silla…" autocomplete="off" aria-label="${esc(C.AYUDA.buscar)}" ${g === 'emoji' ? 'hidden' : ''}></div>
    <div class="toggle tabs" style="margin-bottom:10px">
      ${C.ICONOS_GRUPOS.map((x) => `<button type="button" data-act="icon_tab" data-v="${x.id}" class="${x.id === g ? 'on' : ''}" data-tip="${esc(x.nombre)}" aria-label="${esc(x.nombre)}">${ic(x.icono)}</button>`).join('')}
      <button type="button" data-act="icon_tab" data-v="emoji" class="${g === 'emoji' ? 'on' : ''}" data-tip="${esc(C.AYUDA.emoji)}" aria-label="${esc(C.AYUDA.emoji)}">${ic('mood-smile')}</button>
    </div>
    <div id="icon-lista">${listaIconos(g, sel)}</div></div>`;
}
function botonesIconos(nombres, sel) {
  return `<div class="pick">${nombres.map((n) => `<button type="button" data-act="elegir_icono" data-v="${esc(n)}" class="${n === sel ? 'on' : ''}" aria-label="${esc(n)}">${ic(n)}</button>`).join('')}</div>`;
}
function listaIconos(grupo, sel) {
  if (grupo === 'emoji') return `${botonesIconos(C.EMOJIS.map((e) => 'emoji:' + e), sel)}
    <p class="tiny" style="margin:10px 0 6px">¿Otro? Escríbelo con el teclado de emojis de tu teléfono:</p>
    <div class="row"><input class="in grow" id="emoji-in" maxlength="16" placeholder="😀" value="${esEmoji(sel) && !C.EMOJIS.includes(sel.slice(6)) ? esc(sel.slice(6)) : ''}" style="font-size:24px">
    ${ib('usar_emoji', 'check', 'emoji', '', 'on')}</div>`;
  const x = C.ICONOS_GRUPOS.find((y) => y.id === grupo) || C.ICONOS_GRUPOS[0];
  return botonesIconos(x.iconos, sel);
}
const esEmojiTexto = (t) => !!t && /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(t);
async function buscarIconos(q) {
  const box = $('#icon-lista'), raiz = $('[data-iconpick]'); if (!box || !raiz) return;
  const emo = primerGrafema(q);
  if (esEmojiTexto(emo)) {
    raiz.dataset.sel = 'emoji:' + emo;
    $('#icono-elegido', raiz).innerHTML = ic(raiz.dataset.sel);
    box.innerHTML = `<p class="muted row">${ic(raiz.dataset.sel)} Emoji elegido</p>`;
    return;
  }
  const texto = sinAcentos(q);
  if (!texto) { const tab = $('[data-act="icon_tab"].on', raiz); box.innerHTML = listaIconos(tab ? tab.dataset.v : 'animales', raiz.dataset.sel); return; }
  box.innerHTML = `<div class="empty" style="padding:16px"><span class="spin">${ic('loader-2')}</span></div>`;
  try {
    if (!LISTA_ICONOS) LISTA_ICONOS = await api.iconList();
  } catch (e) { box.innerHTML = '<p class="muted">Sin conexión para buscar íconos</p>'; return; }
  if (sinAcentos($('#buscar-icono') ? $('#buscar-icono').value : '') !== texto) return;
  const palabras = texto.split(/\s+/).filter(Boolean);
  const terminos = palabras.map((p) => [p].concat(String(C.DICCIONARIO[p] || '').split(' ').filter(Boolean)));
  const res = [];
  LISTA_ICONOS.forEach((x) => {
    let puntos = 0;
    for (const ts of terminos) {
      let mejor = 99;
      for (const t of ts) {
        if (x.n === t) mejor = Math.min(mejor, 0);
        else if (x.n.startsWith(t + '-') || x.n.startsWith(t)) mejor = Math.min(mejor, 1);
        else if (x.n.includes(t)) mejor = Math.min(mejor, 2);
        else if (t.length >= 3 && x.t.includes(t)) mejor = Math.min(mejor, 3);
      }
      if (mejor === 99) return;
      puntos += mejor;
    }
    res.push({ n: x.n, p: puntos });
  });
  res.sort((a, b) => a.p - b.p || a.n.length - b.n.length);
  box.innerHTML = res.length ? botonesIconos(res.slice(0, 60).map((r) => r.n), raiz.dataset.sel)
    : `<p class="muted">Sin resultados. Prueba otra palabra o usa un emoji ${ic('mood-smile')}</p>`;
}
const iconoElegido = (raiz) => { const p = $('[data-iconpick]', raiz); return p ? p.dataset.sel : null; };

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
// Mapa de solo lectura con varios puntos (historia de un hallazgo)
function mapaPuntos(el, puntos, color, icono) {
  const m = L.map(el, { zoomControl: false, attributionControl: false });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(m);
  puntos.forEach((p, i) => L.marker([p.lat, p.lng], { interactive: false, icon: L.divIcon({ className: '', iconSize: [30, 30], iconAnchor: [15, 30],
    html: `<div class="pin sm ${i ? 'old' : ''}" style="background:${okColor(color)}">${ic(icono)}</div>` }) }).addTo(m));
  if (puntos.length > 1 && m.fitBounds) m.fitBounds(puntos.map((p) => [p.lat, p.lng]), { padding: [30, 30], maxZoom: 18 });
  else m.setView([puntos[0].lat, puntos[0].lng], 17);
  S.mini = m;
}

/* ---------------------------------------------------------------------
   5. MAPA
   --------------------------------------------------------------------- */
function pinIcono(c) {
  return L.divIcon({ className: '', iconSize: [36, 36], iconAnchor: [18, 36],
    html: `<div class="pin ${c.is_private ? 'priv' : ''} ${c.id === S.nuevoId ? 'cae' : ''}" style="background:${okColor(c.cat_color)}">${ic(c.cat_icon)}</div>` });
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
    const lista = guarda(await api.cardsInBox(caja, opcionesFiltro(S.filtro)));
    S.capa.clearLayers();
    lista.forEach((c) => L.marker([c.lat, c.lng], { icon: pinIcono(c) }).on('click', () => abrirFicha(c.id)).addTo(S.capa));
  } catch (e) { fallo(e); }
}
// Fila de filtros compartida por el mapa y el muro
function chipsFiltro(f, act, conPropios) {
  const on = (modo, id) => f.modo === modo && (id == null || f.id === id) ? 'on' : '';
  const t = (k) => esc(C.AYUDA[k]);
  return `<button class="chip ${on('todos')}" data-act="${act}" data-v="todos" data-tip="${t('filtro_todos')}" aria-label="${t('filtro_todos')}">${ic('world')}</button>
    ${conPropios ? `<button class="chip ${on('mios')}" data-act="${act}" data-v="mios" data-tip="${t('filtro_mios')}" aria-label="${t('filtro_mios')}">${ic(S.me.avatar)}</button>` : ''}
    <button class="chip ${on('siguiendo')}" data-act="${act}" data-v="siguiendo" data-tip="${t('filtro_siguiendo')}" aria-label="${t('filtro_siguiendo')}">${ic('user-check')}</button>
    ${conPropios ? S.cats.map((c) => `<button class="chip ${on('cat', c.id)}" data-act="${act}" data-v="cat:${c.id}"><span class="dot" style="background:${okColor(c.color)}"></span>${ic(c.icon)}${esc(c.name)}</button>`).join('') : ''}
    ${S.groups.map((g) => `<button class="chip ${on('grupo', g.id)}" data-act="${act}" data-v="grupo:${g.id}"><span class="dot" style="background:${okColor(g.color)}"></span>${ic(g.icon)}${esc(g.name)} ${ic('users')}</button>`).join('')}`;
}
function leerFiltro(v) {
  if (v === 'todos' || v === 'mios' || v === 'siguiendo') return { modo: v, id: null };
  const [modo, id] = v.split(':');
  return { modo, id };
}

/* ---------------------------------------------------------------------
   6. PANTALLAS
   --------------------------------------------------------------------- */
function pintarApp() {
  $('#app').innerHTML = `
    <section id="scr-map" class="screen map-screen">
      <div id="map"></div>
      <div class="map-top"><div class="chips grow" id="chips-mapa">${chipsFiltro(S.filtro, 'filtro', true)}</div>${ib('dudas', 'help', 'dudas', '', 'sm')}</div>
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
  if (esMapa) { $('#chips-mapa').innerHTML = chipsFiltro(S.filtro, 'filtro', true); setTimeout(() => { S.map.invalidateSize(); cargarPines(); }, 30); return; }
  $('#scr').scrollTop = 0;
  ({ feed: pintarMuro, coleccion: pintarColeccion, perfil: pintarPerfil })[tab]();
}
function refrescarActual() { if (S.tab === 'map') cargarPines(); else if ($('#scr')) irA(S.tab); }

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
    ${c.photo || c.thumb ? `<img class="photo" src="${foto(c)}" alt="${esc(c.name)}" loading="lazy" data-act="ficha" data-id="${c.id}">` : `<div class="photo" data-act="ficha" data-id="${c.id}" style="display:grid;place-items:center;font-size:60px">${ic(c.cat_icon)}</div>`}
    <div class="body"><div class="row between"><div class="grow"><h3>${esc(c.name)}</h3>
      <div class="tiny">${c.colonia ? ic('map-pin') + ' ' + esc(c.colonia) + ' · ' : ''}${hace(c.created_at)}${c.sightings_count ? ` · ${ic('repeat')} ${c.sightings_count}` : ''}${c.comments_count ? ` · ${ic('message-circle')} ${c.comments_count}` : ''}</div></div></div>
      <div style="margin-top:8px">${reaccionesHTML(c)}</div></div></article>`;
}
async function pintarMuro(masViejo) {
  const scr = $('#scr');
  if (!masViejo) {
    scr.innerHTML = `<div class="row between" style="margin-bottom:10px"><h1 class="serif">Collector Go</h1>
      <div class="row">${ib('tabla', 'trophy', 'tabla')}${ib('refrescar', 'refresh', 'Actualizar')}</div></div>
      <div class="chips" id="chips-muro" style="margin-bottom:12px">${chipsFiltro(S.muro, 'muro_filtro', false)}</div>
      <div class="feed" id="feed"><div class="empty"><span class="spin">${ic('loader-2')}</span></div></div>`;
    S.feed = []; S.feedFin = false;
  }
  try {
    const antes = S.feed.length ? S.feed[S.feed.length - 1].created_at : null;
    const lote = guarda(await api.feed(antes, opcionesFiltro(S.muro)));
    S.feed = S.feed.concat(lote);
    if (lote.length < 20) S.feedFin = true;
    const f = $('#feed'); if (!f) return;
    const vacio = S.muro.modo === 'siguiendo'
      ? `<div class="empty">${ic('user-plus')}<p>Aún no sigues a nadie. Abre un perfil y toca ${ic('user-plus')}</p></div>`
      : `<div class="empty">${ic('camera')}<p>Aún no hay hallazgos aquí</p><button class="btn" data-act="nuevo">${ic('camera')}</button></div>`;
    f.innerHTML = S.feed.length
      ? S.feed.map(tarjeta).join('') + (S.feedFin ? '' : `<div class="row" style="justify-content:center">${ib('mas', 'plus', 'mas')}</div>`)
      : vacio;
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
    if (S.tab !== 'coleccion') return;
    scr.innerHTML = `<div class="row between" style="margin-bottom:12px"><h1 class="serif grow">${esc(C.TITULO_COLECCION)}</h1>${ib('categorias', 'pencil', 'categorias')}</div>
      <div class="chips" style="margin-bottom:14px">
        <button class="chip ${!S.coleccionCat ? 'on' : ''}" data-act="colcat" data-v="" aria-label="Todas">${ic('layout-grid')} ${mias.length}</button>
        ${S.cats.map((c) => `<button class="chip ${S.coleccionCat === c.id ? 'on' : ''}" data-act="colcat" data-v="${c.id}"><span class="dot" style="background:${okColor(c.color)}"></span>${ic(c.icon)}${esc(c.name)} · ${cuenta(c.id)}</button>`).join('')}
      </div>
      ${vis.length ? rejilla(vis, true) : `<div class="empty">${ic('camera')}<p>Registra tu primer hallazgo</p><button class="btn" data-act="nuevo">${ic('camera')}</button></div>`}
      <div class="sec"><div class="row between"><h3 class="row">${ic('users')} Grupos</h3>${ib('grupo_nuevo', 'plus', 'grupo_nuevo')}</div>
        <div class="list" style="margin-top:10px">${S.groups.map((g) => `<button class="li" data-act="grupo" data-id="${g.id}" style="text-align:left">
          <span class="avatar" style="background:${okColor(g.color)}">${ic(g.icon)}</span><b class="grow">${esc(g.name)}</b>
          <span class="muted" data-tip="${esc(g.is_public ? C.AYUDA.grupo_publico : C.AYUDA.grupo_privado)}">${ic(g.is_public ? 'world' : 'lock')}</span></button>`).join('')
          || `<p class="muted">Crea un grupo para coleccionar con tus amigos en el mismo mapa.</p>`}</div></div>`;
  } catch (e) { fallo(e); }
}
function rejilla(lista, mostrarPrivado) {
  return `<div class="grid">${lista.map((c) => `<div class="tile" data-act="ficha" data-id="${c.id}" role="button" aria-label="${esc(c.name)}">
    ${c.thumb || c.photo ? `<img src="${foto(c, true)}" alt="" loading="lazy">` : `<div class="noimg">${ic(c.cat_icon)}</div>`}
    <span class="badge" style="background:${okColor(c.cat_color)}">${ic(c.cat_icon)}</span>
    ${c.sightings_count ? `<span class="count">${ic('repeat')}${c.sightings_count}</span>` : ''}
    ${mostrarPrivado && c.is_private ? `<span class="lock">${ic('lock')}</span>` : ''}</div>`).join('')}</div>`;
}

/* Perfil (propio en pestaña, ajeno en hoja) */
function perfilHTML(p, st, propio, tarjetas) {
  const ls = logros(st);
  const porCat = (st.categorias || []).map((c) => `<div class="li" style="flex-direction:column;align-items:stretch">
      <div class="row between">${catBadge(c.name, c.icon, c.color)}<span class="muted">${c.total} ${c.total === 1 ? 'hallazgo' : 'hallazgos'}</span></div>
      <div class="medals">${ls.filter((l) => l.tipo === 'cat' && l.cat === c.id).map(medalla).join('')}</div></div>`).join('');
  const grupo = (t) => ls.filter((l) => l.tipo === t).map(medalla).join('');
  const md = st.mejor_dia;
  const sigo = S.following.has(p.id);
  const colecciones = (st.categorias || []).filter((c) => propio || c.total > 0);
  return `<div class="row" style="gap:14px">${avatar(p, 'lg')}<div class="grow"><h2>${esc(p.name)}</h2>${p.bio ? `<div class="muted">${esc(p.bio)}</div>` : ''}
      ${colecciones.length ? `<div class="colicons">${colecciones.map((c) => `<span class="colicon" style="background:${okColor(c.color)}" data-tip="${esc(c.name)} · ${c.total}" aria-label="${esc(c.name)}">${ic(c.icon)}</span>`).join('')}</div>` : ''}
      <div class="tiny row" style="margin-top:4px"><span data-tip="Seguidores">${ic('users')} ${st.seguidores || 0}</span> · <span data-tip="Siguiendo">${ic('user-check')} ${st.siguiendo || 0}</span></div>
      ${p.blocked ? `<div class="tiny row">${ic('ban')} bloqueada</div>` : ''}</div></div>
    <div class="row wrap" style="margin:14px 0">
      ${propio ? ib('editar_perfil', 'pencil', 'editar') : ib('seguir', sigo ? 'user-check' : 'user-plus', sigo ? 'dejar_seguir' : 'seguir', `data-id="${p.id}"`, sigo ? '' : 'on')}
      ${ib('whatsapp_perfil', 'brand-whatsapp', 'whatsapp', `data-id="${p.id}"`)}
      ${ib('tabla', 'trophy', 'tabla')}
      ${propio && S.me.is_admin ? ib('admin', 'shield', 'admin') : ''}
      ${!propio && S.me.is_admin && !p.is_admin ? ib(p.blocked ? 'desbloquear' : 'bloquear', p.blocked ? 'lock-open' : 'ban', p.blocked ? 'desbloquear' : 'bloquear', `data-id="${p.id}"`) : ''}
      <span class="grow"></span>${propio ? ib('salir', 'logout', 'salir') : ''}
    </div>
    <div class="stats">
      <div class="stat" data-tip="Hallazgos">${ic('photo')}<div class="v">${st.total || 0}</div><div class="lbl">hallazgos</div></div>
      <div class="stat" data-tip="Colonias">${ic('map-pin')}<div class="v">${(st.colonias || []).length}</div><div class="lbl">colonias</div></div>
      <div class="stat" data-tip="Racha de semanas (actual / mejor)">${ic('flame')}<div class="v">${st.racha_actual || 0}<span class="tiny">/${st.racha_mejor || 0}</span></div><div class="lbl">semanas</div></div>
      <div class="stat" data-tip="${md ? 'Mejor día: ' + fecha(md.fecha) : 'Mejor día'}">${ic('calendar')}<div class="v">${md ? md.n : 0}</div><div class="lbl">mejor día</div></div>
      <div class="stat" data-tip="Reencuentros">${ic('repeat')}<div class="v">${st.reencuentros || 0}</div><div class="lbl">reencuentros</div></div>
      <div class="stat" data-tip="Reacciones recibidas">${ic('heart')}<div class="v">${st.reacciones || 0}</div><div class="lbl">reacciones</div></div>
    </div>
    <div class="sec"><h3>${ic('medal')} Medallas por categoría</h3><div class="list">${porCat || '<div class="muted">—</div>'}</div></div>
    <div class="sec"><h3>${ic('map-pin')} ${esc(C.TITULOS_MEDALLAS.col)}</h3><div class="medals">${grupo('col')}</div>
      <div class="chips" style="flex-wrap:wrap;margin-top:10px">${(st.colonias || []).map((c) => `<span class="chip" data-tip="${esc(fecha(c.first_at))}">${esc(c.colonia)} · ${c.n}</span>`).join('')}</div></div>
    <div class="sec"><h3>${ic('flame')} ${esc(C.TITULOS_MEDALLAS.racha)}</h3><div class="medals">${grupo('racha')}</div></div>
    <div class="sec"><h3>${ic('repeat')} ${esc(C.TITULOS_MEDALLAS.reen)}</h3><div class="medals">${grupo('reen')}</div></div>
    ${tarjetas ? `<div class="sec"><h3>${ic('cards')} ${tarjetas.length}</h3>${tarjetas.length ? rejilla(tarjetas, false) : '<div class="muted">—</div>'}</div>` : ''}
    ${propio ? `<div style="text-align:center;margin-top:30px"><button class="linkbtn" data-act="borrar_cuenta">${ic('trash')} ${esc(C.AYUDA.borrar_cuenta)}</button>
      <p class="tiny">Collector Go · v${esc(C.VERSION)}</p></div>` : ''}`;
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
  abrirHoja(() => datos.p ? cabeza('') + perfilHTML(datos.p, datos.st, false, datos.cards) : cabeza('') + `<div class="empty"><span class="spin">${ic('loader-2')}</span></div>`,
    (r) => { r._perfil = datos; }, 'perfil');
  datos.cargar = async () => {
    try {
      const [p, st, cards] = await Promise.all([api.getProfile(uid), api.stats(uid), api.userCards(uid)]);
      if (!p) { cerrarHoja(); return aviso('Perfil no disponible', 'alert-triangle'); }
      Object.assign(datos, { p, st, cards: guarda(cards) }); if (hojaArriba() && hojaArriba().tipo === 'perfil') dibujarHoja();
    } catch (e) { fallo(e); }
  };
  datos.cargar();
}

/* Ayuda de uso (mapa) y privacidad (entrada) */
function hojaDudas() {
  abrirHoja(() => `${cabeza(`${ic('help')} ${esc(C.AYUDA.dudas)}`)}
    <div class="dudas guia">${C.GUIA.map((d) => `<div class="duda"><h3 class="row"><span class="gicon">${ic(d.icono)}</span>${esc(d.titulo)}</h3>
      ${d.texto ? `<p>${esc(d.texto)}</p>` : ''}${d.pasos ? `<ol>${d.pasos.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}</div>`).join('')}
    <div class="duda datos"><h3 class="row">${ic('lock')} ${esc(C.DATOS_TITULO)}</h3>${C.DATOS.concat(C.DATOS_EXTRA || []).map((t) => `<p>${esc(t)}</p>`).join('')}</div></div>`, null, 'dudas');
}
function hojaPrivacidad() {
  abrirHoja(() => `${cabeza(`${ic('lock')} ${esc(C.AYUDA.privacidad)}`)}
    <div class="dudas"><div class="duda datos"><h3>${esc(C.DATOS_TITULO)}</h3>${C.DATOS.map((t) => `<p>${esc(t)}</p>`).join('')}</div></div>`, null, 'privacidad');
}
/* Ubicación exacta: si el teléfono da una aproximada, explica cómo activarla */
const esAproximada = (p) => p && p.acc != null && p.acc > C.GPS_PRECISION_MAX;
let precisionAvisada = false;
function avisarPrecision(p, forzar) {
  if (!esAproximada(p) || (precisionAvisada && !forzar)) return;
  precisionAvisada = true;
  abrirHoja(() => `${cabeza(`${ic('current-location')} ${esc(C.PRECISION_TITULO)}`)}
    <p>${esc(C.PRECISION_TEXTO)}</p>
    <p class="banner" style="margin:12px 0">${ic('alert-triangle')} Precisión actual: ±${metros(p.acc)}</p>
    <div class="dudas">${C.PRECISION_PASOS.map((x) => `<div class="duda"><h3>${esc(x.so)}</h3><p>${esc(x.paso)}</p></div>`).join('')}
    <p class="muted">${esc(C.PRECISION_MANUAL)}</p></div>
    <button class="btn block" data-act="cerrar" style="margin-top:14px">${ic('check')} Entendido</button>`, null, 'precision');
}

/* ---------------------------------------------------------------------
   7. HOJAS
   --------------------------------------------------------------------- */
/* Ficha de un hallazgo con su historia */
let fichaH = null; // historia de la ficha abierta (para la galería)
async function abrirFicha(id) {
  let c = S.cache.get(id);
  if (!c) {
    try { c = await api.card(id); } catch (e) { return fallo(e); }
    if (!c) return aviso('Este hallazgo no está disponible', 'alert-triangle');
    guarda([c]);
  }
  const H = { id, lista: null, i: 0 };
  fichaH = H;
  abrirHoja(() => fichaHTML(S.cache.get(id) || c, H), (raiz) => montarFicha(raiz, S.cache.get(id) || c, H), 'ficha');
  H.cargar = async () => {
    const cc = S.cache.get(id) || c;
    try {
      const [lista, coms] = await Promise.all([api.history(id), cc.is_private ? Promise.resolve([]) : api.comments(id)]);
      H.lista = lista; H.coms = coms;
    } catch (e) { H.lista = H.lista || []; H.coms = H.coms || []; }
    const top = hojaArriba(); if (top && top.tipo === 'ficha' && pila.includes(top)) dibujarHoja();
  };
  H.cargar();
  return H;
}
// Comentarios de la ficha
const puedoComentar = (c) => !c.is_private && !S.me.blocked && (!c.group_id || c.group_public || !!miGrupo(c.group_id));
function comentariosHTML(c, H) {
  const coms = H.coms;
  const mios = (coms || []).filter((k) => k.user_id === S.user.id).length;
  const puedoBorrar = (k) => k.user_id === S.user.id || c.user_id === S.user.id || S.me.is_admin;
  return `<div class="sec" id="comentarios" style="margin-top:14px"><h3>${ic('message-circle')} Comentarios${coms ? ` · ${coms.length}` : ''}</h3>
    ${coms === undefined ? `<div class="empty" style="padding:10px"><span class="spin">${ic('loader-2')}</span></div>` : `
    <div class="coms">${coms.map((k) => `<div class="com">
      <button data-act="perfil" data-id="${k.user_id}" aria-label="${esc(k.user_name)}">${avatar(k)}</button>
      <div class="grow"><div><b>${esc(k.user_name)}</b> <span class="tiny">${hace(k.created_at)}</span></div><p>${esc(k.body)}</p></div>
      ${puedoBorrar(k) ? ib('borrar_comentario', 'trash', 'borrar_comentario', `data-id="${k.id}" data-find="${c.id}"`, 'sm ghost') : ''}</div>`).join('')}</div>
    ${puedoComentar(c) ? (mios < C.COMENTARIOS_POR_PERSONA ? `<div class="row" style="align-items:flex-end;margin-top:8px">
      <div class="grow"><input id="coment-in" class="in" maxlength="${C.COMENTARIO_MAX}" placeholder="Escribe un comentario" value="${esc(H.borrador || '')}" autocomplete="off">
      <div class="tiny" style="text-align:right"><span id="coment-n">${(H.borrador || '').length}</span>/${C.COMENTARIO_MAX}</div></div>
      ${ib('comentar', 'send', 'comentar', `data-id="${c.id}"`, 'on')}</div>`
      : `<p class="tiny">Ya dejaste ${C.COMENTARIOS_POR_PERSONA} comentarios aquí.</p>`) : ''}`}</div>`;
}

// Todas las fotos del sujeto: la más reciente primero
function galeria(c, H) {
  const inicial = { photo: c.photo, thumb: c.thumb, created_at: c.created_at, colonia: c.colonia, lat: c.lat, lng: c.lng, user_name: c.user_name, inicial: true };
  const todas = (H.lista || []).concat([inicial]).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return todas;
}
function fichaHTML(c, H) {
  const propio = c.user_id === S.user.id;
  const hist = galeria(c, H);
  const fotos = hist.filter((h) => h.photo || h.thumb);
  if (H.i >= fotos.length) H.i = 0;
  const actual = fotos[H.i];
  const puntos = hist.filter((h) => h.lat != null && h.lng != null);
  return `${cabeza(esc(c.name), c.is_private ? `<span class="ib ghost" data-tip="${C.AYUDA.privado}">${ic('lock')}</span>` : '')}
    ${actual ? `<img class="big" src="${api.photoUrl(actual.photo || actual.thumb)}" alt="${esc(c.name)}">` : ''}
    ${fotos.length > 1 ? `<div class="strip">${fotos.map((f, i) => `<button class="${i === H.i ? 'on' : ''}" data-act="galeria" data-i="${i}" aria-label="Foto ${i + 1}">
      <img src="${api.photoUrl(f.thumb || f.photo)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
    <div class="row between" style="margin:12px 0">
      <button class="row" data-act="perfil" data-id="${c.user_id}">${avatar(c)}<b>${esc(c.user_name)}</b></button>
      ${catBadge(c.cat_name, c.cat_icon, c.cat_color)}</div>
    ${c.note ? `<p style="margin:6px 0 12px">${esc(c.note)}</p>` : ''}
    ${esAproximada({ acc: c.accuracy }) ? `<button class="linkbtn tiny" data-act="info_precision" data-acc="${c.accuracy}" style="padding:0;color:var(--tinta2)">${ic('alert-triangle')} Ubicación aproximada ±${metros(c.accuracy)}</button>` : ''}
    ${!c.is_private ? `<div style="margin:12px 0">${reaccionesHTML(c)}</div>` : ''}
    ${!c.is_private ? comentariosHTML(c, H) : ''}
    <div class="row wrap" style="margin-top:14px">
      ${ib('ruta', 'route', 'ruta', `data-id="${c.id}"`, 'on')}
      ${ib('ver_mapa', 'map-pin', 'ver_mapa', `data-id="${c.id}"`)}
      ${!c.is_private ? ib('whatsapp', 'brand-whatsapp', 'whatsapp', `data-id="${c.id}"`) : ''}
      ${puedoReencontrar(c) ? ib('reencuentro', 'repeat', 'reencuentro', `data-id="${c.id}"`) : ''}
      ${propio ? ib('editar_hallazgo', 'pencil', 'editar', `data-id="${c.id}"`) : ''}
      <span class="grow"></span>
      ${!propio ? ib('avisar', 'flag', 'avisar', `data-id="${c.id}"`) : ''}
      ${propio || S.me.is_admin ? ib('borrar_hallazgo', 'trash', 'borrar', `data-id="${c.id}"`) : ''}
    </div>
    <div class="sec"><h3>${ic('history')} Historia · ${hist.length}</h3>
      ${H.lista === null ? `<div class="empty" style="padding:10px"><span class="spin">${ic('loader-2')}</span></div>` : `
      ${puntos.length > 1 ? '<div class="minimap" id="mapa-historia" style="height:170px;margin-bottom:10px"></div>' : ''}
      <div class="hist">${hist.map((h) => `<div class="row hist-i">
        <span class="dotline">${ic(h.inicial ? 'star' : 'repeat')}</span>
        <div class="grow"><b>${fecha(h.created_at)}</b><div class="tiny">${h.colonia ? esc(h.colonia) : '—'}${c.group_id ? ` · ${esc(h.user_name || '')}` : ''}${h.note ? ` · ${esc(h.note)}` : ''}</div></div>
        ${h.photo || h.thumb ? `<span class="tiny">${ic('photo')}</span>` : ''}</div>`).join('')}</div>`}
    </div>`;
}
function montarFicha(raiz, c, H) {
  const el = $('#mapa-historia', raiz);
  if (el) mapaPuntos(el, galeria(c, H).filter((h) => h.lat != null && h.lng != null), c.cat_color, c.cat_icon);
}
function refrescarFicha(id) {
  const top = hojaArriba();
  if (top && top.tipo === 'ficha') dibujarHoja();
  const c = S.cache.get(id); if (c) actualizarTarjeta(c);
}

/* Registrar hallazgo o reencuentro */
const R = {};
function nuevoRegistro(destino) {
  if (S.me.blocked) return aviso('Tu cuenta está bloqueada', 'ban');
  const destIni = S.filtro.modo === 'grupo' && S.tab === 'map' ? 'g:' + S.filtro.id
    : (S.coleccionCat ? 'c:' + S.coleccionCat : (S.cats[0] ? 'c:' + S.cats[0].id : null));
  Object.assign(R, { original: null, recorte: null, usarRecorte: false, sinFoto: false, pos: null, gps: 'buscando', vistaUrl: null,
    candidatos: [], dest: destIni, destino: destino || null, nombre: '', nota: '', priv: false });
  abrirHoja(registroHTML, montarRegistro, 'registro');
  leerGPS();
}
function registroHTML() {
  const titulo = R.destino ? `${ic('repeat')} ${esc(R.destino.name)}` : ic('camera');
  if (!R.original && !R.sinFoto) return `${cabeza(titulo)}
    <div class="row" style="gap:14px;margin:30px 0">
      <label class="btn block" style="min-height:120px;font-size:44px" data-tip="${C.AYUDA.camara}" aria-label="${C.AYUDA.camara}">${ic('camera')}<input type="file" accept="image/*" capture="environment" hidden data-in="foto"></label>
      <label class="btn alt block" style="min-height:120px;font-size:44px" data-tip="${C.AYUDA.galeria}" aria-label="${C.AYUDA.galeria}">${ic('upload')}<input type="file" accept="image/*" hidden data-in="foto"></label>
    </div>
    ${R.destino ? `<div class="row" style="justify-content:center;margin-bottom:12px">${ib('sin_foto', 'map-pin', 'sin_foto')}</div>` : ''}
    <div class="tiny row" id="gps-estado">${gpsTexto()}</div>`;
  const esGrupo = (R.dest || '').startsWith('g:');
  return `${cabeza(titulo)}
    ${R.original ? `<img class="big" id="vista" src="${R.vistaUrl}" alt="">
    <div class="row" style="margin:10px 0">
      <div class="toggle">
        <button type="button" class="${!R.usarRecorte ? 'on' : ''}" data-act="usar_original" data-tip="${C.AYUDA.original}" aria-label="${C.AYUDA.original}">${ic('photo')}</button>
        <button type="button" class="${R.usarRecorte ? 'on' : ''}" data-act="recortar" data-tip="${C.AYUDA.recortar}" aria-label="${C.AYUDA.recortar}">${ic('scissors')}</button>
      </div>
      <div class="grow"><div class="progress" id="prog" hidden><div></div></div></div>
    </div>` : ''}
    ${R.destino ? '' : `
    <div class="field"><label>${ic('cards')}</label>${selectorDestino(R.dest)}</div>
    <div class="field"><label for="f-nombre">${ic('pencil')} Nombre</label><input id="f-nombre" class="in" maxlength="60" placeholder="Michi naranja" autocomplete="off" value="${esc(R.nombre)}"></div>`}
    <div class="field"><label for="f-nota">${ic('info-circle')} Nota</label><textarea id="f-nota" class="in" maxlength="140" placeholder="Duerme sobre el puesto de periódicos">${esc(R.nota)}</textarea></div>
    ${R.destino ? '' : `<div class="field" id="campo-priv" ${esGrupo ? 'hidden' : ''}><label>${ic('eye')}</label>
      <div class="toggle" data-pick="priv"><button type="button" data-act="elegir" data-v="0" class="${R.priv ? '' : 'on'}" data-tip="${C.AYUDA.publico}" aria-label="${C.AYUDA.publico}">${ic('eye')}</button><button type="button" data-act="elegir" data-v="1" class="${R.priv ? 'on' : ''}" data-tip="${C.AYUDA.privado}" aria-label="${C.AYUDA.privado}">${ic('lock')}</button></div></div>`}
    <div class="field"><label class="row between"><span class="row">${ic('map-pin')} <span id="gps-estado">${gpsTexto()}</span></span>${ib('releer_gps', 'current-location', 'gps', '', 'sm')}</label>
      <div class="minimap" id="mini-reg"></div></div>
    <div id="candidatos"></div>
    <button class="btn block" data-act="guardar_hallazgo" style="margin-top:14px">${ic('check')} Guardar</button>`;
}
function gpsTexto() {
  if (R.gps === 'buscando') return `<span class="spin">${ic('loader-2')}</span> GPS`;
  if (R.gps === 'error') return 'Sin GPS: toca el mapa para marcar';
  if (R.pos) return R.pos.acc == null ? 'Marcado a mano'
    : esAproximada(R.pos) ? `${ic('alert-triangle')} ±${metros(R.pos.acc)} · aproximada <button type="button" class="linkbtn" data-act="info_precision" style="padding:0 4px">¿Cómo activar la exacta?</button>` : `±${R.pos.acc} m`;
  return '';
}
// Guarda lo escrito antes de volver a dibujar el formulario
function recordarFormulario() {
  const raiz = $('.sheet'); if (!raiz) return;
  const n = $('#f-nombre', raiz), t = $('#f-nota', raiz);
  if (n) R.nombre = n.value; if (t) R.nota = t.value;
  const d = valor(raiz, 'dest'); if (d) R.dest = d;
  const p = valor(raiz, 'priv'); if (p) R.priv = p === '1';
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
// Sugerencia: algo tuyo registrado muy cerca de aquí
async function buscarCandidatos() {
  const box = $('#candidatos'); if (!box || !R.pos || R.destino) return;
  const dest = valor($('.sheet'), 'dest') || R.dest || '';
  if (!dest) { box.innerHTML = ''; return; }
  // Solo lo registrado en la misma categoría (propia) o en el mismo grupo
  const filtro = dest.startsWith('g:') ? { group: dest.slice(2), limit: 5 } : { uid: S.user.id, cat: dest.slice(2), limit: 5 };
  try {
    const cerca = guarda(await api.cardsInBox(cajaAlrededor(R.pos, C.REENCUENTRO_METROS), filtro));
    if ((valor($('.sheet'), 'dest') || R.dest) !== dest) return;
    R.candidatos = cerca.filter((c) => distancia(R.pos, c) <= C.REENCUENTRO_METROS);
    box.innerHTML = R.candidatos.map((c) => `<div class="banner" style="margin-top:10px">
      ${c.thumb ? `<img src="${foto(c, true)}" alt="" style="width:44px;height:44px;object-fit:contain;border-radius:8px">` : ic(c.cat_icon)}
      <div class="grow"><b>${esc(c.name)}</b><div class="tiny">${ic('repeat')} ¿Lo volviste a ver?</div></div>
      ${ib('usar_candidato', 'repeat', 'reencuentro', `data-id="${c.id}"`, 'sm')}</div>`).join('');
  } catch (e) { /* sin sugerencias, no pasa nada */ }
}
async function tomarFoto(file) {
  try {
    recordarFormulario();
    const img = await cargarImagen(file);
    R.original = await lienzoABlob(escalar(img, C.FOTO_LADO), C.FOTO_CALIDAD, false);
    R.recorte = null; R.usarRecorte = false; R.sinFoto = false;
    ponerVista(R.original);
    dibujarHoja(); leerGPSsiFalta();
  } catch (e) { fallo(e); }
}
function leerGPSsiFalta() { if (!R.pos && R.gps !== 'buscando') leerGPS(); }
function ponerVista(blob) { if (R.vistaUrl) URL.revokeObjectURL(R.vistaUrl); R.vistaUrl = URL.createObjectURL(blob); const v = $('#vista'); if (v) v.src = R.vistaUrl; }

/* Fotos: redimensionar, recortar y comprimir en el teléfono */
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
// Quita el espacio transparente alrededor del sujeto y deja un margen
async function recortarVacio(blob) {
  const img = await cargarImagen(blob);
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
  const d = cx.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (d[(y * w + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return blob;
  const m = Math.round(Math.max(x1 - x0, y1 - y0) * C.RECORTE_MARGEN);
  x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(w - 1, x1 + m); y1 = Math.min(h - 1, y1 + m);
  const out = document.createElement('canvas'); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext('2d').drawImage(cv, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return new Promise((res) => out.toBlob((b) => res(b || blob), 'image/png'));
}
async function recortarFondo(blob, alProgreso) {
  const mod = await import(C.RECORTE_URL);
  const fn = mod.removeBackground || mod.default;
  const base = { output: { format: 'image/png' }, progress: (k, a, t) => alProgreso(t ? a / t : 0) };
  let r;
  try { r = await fn(blob, Object.assign({ model: 'isnet_quint8' }, base)); }
  catch (e) { r = await fn(blob, base); }
  return recortarVacio(r);
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
async function subirFotos() {
  if (!R.original) return { pFoto: null, pMini: null };
  const { grande, mini } = await prepararFotos();
  const id = uuid();
  const pFoto = `${S.user.id}/${id}.${ext(grande)}`, pMini = `${S.user.id}/${id}_t.${ext(mini)}`;
  await api.upload(pFoto, grande);
  await api.upload(pMini, mini);
  return { pFoto, pMini };
}

async function guardarHallazgo(btn) {
  const raiz = $('.sheet');
  recordarFormulario();
  if (R.destino) return guardarReencuentro(btn, R.destino);
  const nombre = R.nombre.trim(), nota = R.nota.trim();
  const dest = R.dest || '';
  const cat = dest.startsWith('c:') ? dest.slice(2) : null, grupo = dest.startsWith('g:') ? dest.slice(2) : null;
  if (!cat && !grupo) return aviso('Elige una categoría', 'cards');
  if (!nombre) { $('#f-nombre', raiz).focus(); return aviso('Ponle un nombre', 'pencil'); }
  if (!R.pos) return aviso('Falta la ubicación: toca el mapa', 'map-pin');
  ocupado(btn, true);
  try {
    // ¿Ya existe con ese nombre en esta categoría o grupo?
    const existente = await api.findByName(nombre, cat, grupo);
    if (existente) {
      let c = S.cache.get(existente); if (!c) { c = await api.card(existente); if (c) guarda([c]); }
      ocupado(btn, false);
      if (!c) return aviso('Ese nombre ya existe aquí', 'alert-triangle');
      const donde = grupo ? 'en este grupo' : `en ${(S.cats.find((x) => x.id === cat) || {}).name || 'esta categoría'}`;
      const quien = grupo && c.user_id !== S.user.id ? `${c.user_name} ya registró` : 'Ya tienes';
      const mismo = await confirmar(`${quien} "${c.name}" ${donde}. ¿Es el mismo?`, 'repeat', c.thumb || c.photo ? foto(c, true) : '', 'repeat');
      if (mismo) { R.destino = c; return guardarReencuentro(btn, c); }
      const n = $('#f-nombre'); if (n) { n.focus(); n.select(); }
      return aviso('Cambia el nombre para registrarlo como nuevo', 'pencil');
    }
    const antes = S.stats || await api.stats(S.user.id);
    const { pFoto, pMini } = await subirFotos();
    const colonia = await api.colonia(R.pos.lat, R.pos.lng);
    let nuevoId;
    try {
      nuevoId = await api.addFind({ category_id: cat, group_id: grupo, name: nombre, note: nota || null, is_private: grupo ? false : R.priv,
        lat: R.pos.lat, lng: R.pos.lng, accuracy: R.pos.acc, colonia, photo: pFoto, thumb: pMini });
    } catch (e) { api.removeFiles([pFoto, pMini]).catch(() => null); throw e; }
    const despues = await api.stats(S.user.id);
    S.stats = despues;
    cerrarTodo();
    S.nuevoId = nuevoId; setTimeout(() => { if (S.nuevoId === nuevoId) S.nuevoId = null; }, 4000);
    if (S.tab === 'map' && S.map) S.map.setView([R.pos.lat, R.pos.lng], Math.max(16, (S.map.getZoom && S.map.getZoom()) || 16));
    const g = grupo ? miGrupo(grupo) : null, ct = cat ? (despues.categorias || []).find((x) => x.id === cat) : null;
    celebrarHallazgo({ icono: (ct || g || {}).icon, color: (ct || g || {}).color, titulo: nombre,
      detalle: ct ? `${ct.name} · ${ct.total}` : (g ? g.name : ''), foto: R.vistaUrl }, () => celebrar(novedades(antes, despues)));
    refrescarActual();
  } catch (e) { ocupado(btn, false); fallo(e); }
}
async function guardarReencuentro(btn, c) {
  const nota = (R.nota || '').trim();
  ocupado(btn, true);
  try {
    const antes = S.stats || await api.stats(S.user.id);
    const { pFoto, pMini } = await subirFotos();
    const pos = R.pos || null;
    const colonia = pos ? await api.colonia(pos.lat, pos.lng) : null;
    try {
      await api.addSighting({ find_id: c.id, lat: pos ? pos.lat : null, lng: pos ? pos.lng : null, photo: pFoto, thumb: pMini, colonia, note: nota || null });
    } catch (e) { api.removeFiles([pFoto, pMini]).catch(() => null); throw e; }
    const nueva = await api.card(c.id); if (nueva) guarda([nueva]);
    const despues = await api.stats(S.user.id); S.stats = despues;
    // Volver a la ficha (con la historia actualizada) si se abrió desde ahí
    const habiaFicha = pila.some((h) => h.tipo === 'ficha');
    cerrarTodo();
    if (habiaFicha) abrirFicha(c.id);
    celebrarHallazgo({ icono: 'repeat', color: c.cat_color, titulo: c.name, detalle: 'Reencuentro · ' + ((nueva && nueva.sightings_count) || ''), foto: R.original ? R.vistaUrl : '' },
      () => celebrar(novedades(antes, despues)));
    refrescarActual();
  } catch (e) { ocupado(btn, false); fallo(e); }
}
/* Celebraciones (solo visuales: sin sonido ni vibración) */
const menosMovimiento = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
function confeti(cantidad, duracion) {
  if (menosMovimiento()) return;
  const cv = document.createElement('canvas'); cv.className = 'confeti';
  const W = cv.width = innerWidth, H = cv.height = innerHeight; document.body.appendChild(cv);
  const x = cv.getContext('2d'), cols = C.CONFETI_COLORES;
  const ps = Array.from({ length: cantidad }, () => ({
    x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.45, vx: (Math.random() - 0.5) * 14, vy: -8 - Math.random() * 10,
    w: 6 + Math.random() * 7, h: 9 + Math.random() * 9, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[Math.floor(Math.random() * cols.length)] }));
  const t0 = performance.now();
  (function paso(t) {
    const k = (t - t0) / duracion; x.clearRect(0, 0, W, H);
    ps.forEach((p) => { p.vy += 0.45; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      x.save(); x.globalAlpha = Math.max(0, 1 - Math.max(0, k - 0.6) / 0.4); x.translate(p.x, p.y); x.rotate(p.r);
      x.fillStyle = p.c; x.strokeStyle = '#2E2A26'; x.lineWidth = 1; x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); x.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h); x.restore(); });
    if (k < 1) requestAnimationFrame(paso); else cv.remove();
  })(t0);
}
// Tarjeta "+1" al guardar un hallazgo o reencuentro; luego sigue con las medallas
function celebrarHallazgo(d, luego) {
  const el = document.createElement('div'); el.className = 'celebra'; el.setAttribute('role', 'status');
  el.innerHTML = `<div class="celebra-card">
    ${d.foto ? `<img src="${esc(d.foto)}" alt="">` : `<span class="celebra-icono" style="background:${okColor(d.color)}">${ic(d.icono)}</span>`}
    <div class="mas1">+1</div><h2>${esc(d.titulo)}</h2>${d.detalle ? `<p class="row" style="justify-content:center">${ic(d.icono)} ${esc(d.detalle)}</p>` : ''}</div>`;
  document.body.appendChild(el);
  confeti(90, C.CELEBRACION_MS);
  let hecho = false;
  const fin = () => { if (hecho) return; hecho = true; el.classList.add('sale'); setTimeout(() => { el.remove(); if (luego) luego(); }, 250); };
  el.addEventListener('click', fin);
  setTimeout(fin, menosMovimiento() ? 900 : C.CELEBRACION_MS);
}
// Siguiente meta de la misma serie de una medalla
function siguienteMeta(l) {
  const serie = { cat: C.METAS_CATEGORIA, col: C.METAS_COLONIAS, racha: C.METAS_RACHA_SEMANAS, reen: C.METAS_REENCUENTROS }[l.tipo] || [];
  return serie.find((m) => m > l.m) || null;
}
function celebrar(n, textoBase) {
  const hay = n.nuevos.length || n.colonias.length || n.records.length;
  if (!hay) { if (textoBase) aviso(textoBase); return; }
  // Si una serie ganó varias metas a la vez, se muestra la más alta
  const mejores = Object.values(n.nuevos.reduce((a, l) => { const k = l.tipo + (l.cat || ''); if (!a[k] || a[k].m < l.m) a[k] = l; return a; }, {}));
  const titulo = n.nuevos.length > 1 ? `¡${n.nuevos.length} nuevas medallas!` : n.nuevos.length ? '¡Nueva medalla!' : '¡Nuevo récord!';
  abrirHoja(() => `${cabeza('')}<div class="unlock">
    <div class="burst" aria-hidden="true"></div>
    <h1 class="serif unlock-t">${titulo}</h1>
    ${n.colonias.map((c) => `<div class="banner" style="margin-bottom:10px;justify-content:center">${ic('map-pin')} Nueva colonia: <b>${esc(c)}</b></div>`).join('')}
    <div class="medals nuevas">${n.nuevos.map(medalla).join('')}</div>
    ${mejores.map((l) => { const sig = siguienteMeta(l); return `<div class="meta-sig"><div class="row between tiny"><span>${esc(l.titulo)}</span>
      <span>${sig ? `${l.v} / ${sig}` : 'meta máxima'}</span></div><div class="progress"><div style="width:${sig ? Math.min(100, Math.round(l.v / sig * 100)) : 100}%"></div></div></div>`; }).join('')}
    ${n.records.map((r) => `<p class="row" style="justify-content:center">${ic(r.icon)} ${esc(r.texto)}</p>`).join('')}
    <button class="btn block" data-act="cerrar" style="margin-top:18px">${ic('check')}</button></div>`, null, 'logro');
  confeti(160, 2200);
}

/* Editar hallazgo (si el nombre ya existe, ofrece juntarlos) */
function editarHallazgo(id) {
  const c = S.cache.get(id); if (!c) return;
  const E = { pos: { lat: c.lat, lng: c.lng, acc: c.accuracy }, movido: false };
  abrirHoja(() => `${cabeza(ic('pencil'))}
    ${c.group_id ? `<div class="field"><label>${ic('users')}</label>${catBadge(c.cat_name, c.cat_icon, c.cat_color)}</div>`
      : `<div class="field"><label>${ic('cards')}</label><div class="chips" data-pick="cat" style="flex-wrap:wrap">${S.cats.map((x) =>
        `<button type="button" class="chip ${x.id === c.category_id ? 'on' : ''}" data-act="elegir" data-v="${x.id}"><span class="dot" style="background:${okColor(x.color)}"></span>${ic(x.icon)}${esc(x.name)}</button>`).join('')}</div></div>`}
    <div class="field"><label for="e-nombre">${ic('pencil')} Nombre</label><input id="e-nombre" class="in" maxlength="60" value="${esc(c.name)}"></div>
    <div class="field"><label for="e-nota">${ic('info-circle')} Nota</label><textarea id="e-nota" class="in" maxlength="140">${esc(c.note || '')}</textarea></div>
    ${c.group_id ? '' : `<div class="field"><label>${ic('eye')}</label><div class="toggle" data-pick="priv">
      <button type="button" data-act="elegir" data-v="0" class="${!c.is_private ? 'on' : ''}" aria-label="${C.AYUDA.publico}">${ic('eye')}</button>
      <button type="button" data-act="elegir" data-v="1" class="${c.is_private ? 'on' : ''}" aria-label="${C.AYUDA.privado}">${ic('lock')}</button></div></div>`}
    <div class="field"><label>${ic('map-pin')}</label><div class="minimap" id="mini-ed"></div></div>
    <button class="btn block" data-act="guardar_edicion" data-id="${c.id}">${ic('check')} Guardar</button>`,
  (raiz) => { miniMapa($('#mini-ed', raiz), E.pos, (p) => { E.pos = p; E.movido = true; }); raiz._edicion = E; }, 'editar');
}
async function guardarEdicion(btn, id) {
  const raiz = $('.sheet'), E = raiz._edicion, c = S.cache.get(id);
  const nombre = $('#e-nombre', raiz).value.trim();
  if (!nombre) return aviso('Ponle un nombre', 'pencil');
  const cambios = { name: nombre, note: $('#e-nota', raiz).value.trim() || null };
  if (!c.group_id) { cambios.category_id = valor(raiz, 'cat') || c.category_id; cambios.is_private = valor(raiz, 'priv') === '1'; }
  ocupado(btn, true);
  try {
    if (E.movido && distancia(E.pos, c) > 5) {
      Object.assign(cambios, { lat: E.pos.lat, lng: E.pos.lng, accuracy: null });
      cambios.colonia = await api.colonia(E.pos.lat, E.pos.lng);
    }
    try { await api.updateFind(id, cambios); }
    catch (e) {
      if (!errTexto(e).includes('NOMBRE_REPETIDO')) throw e;
      ocupado(btn, false);
      return ofrecerJuntar(c, nombre, cambios.category_id || null, c.group_id || null);
    }
    const nueva = await api.card(id); if (nueva) guarda([nueva]);
    S.stats = null;
    cerrarHoja(); refrescarFicha(id); refrescarActual(); aviso('Guardado');
  } catch (e) { ocupado(btn, false); fallo(e); }
}
async function ofrecerJuntar(c, nombre, cat, grupo) {
  try {
    const otroId = await api.findByName(nombre, cat, grupo);
    let otro = otroId && (S.cache.get(otroId) || await api.card(otroId));
    if (!otro) return aviso('Ese nombre ya existe aquí', 'alert-triangle');
    guarda([otro]);
    if (otro.user_id !== S.user.id) return aviso(`"${otro.name}" ya existe en el grupo. Usa otro nombre`, 'alert-triangle');
    const si = await confirmar(`Ya existe "${otro.name}". ¿Juntarlos en uno solo? Sus fotos quedan en la misma historia.`, 'git-merge', otro.thumb || otro.photo ? foto(otro, true) : '', 'git-merge');
    if (!si) return aviso('Cambia el nombre', 'pencil');
    await api.merge(c.id, otro.id);
    S.cache.delete(c.id); S.stats = null;
    const nueva = await api.card(otro.id); if (nueva) guarda([nueva]);
    cerrarTodo(); aviso('Juntados en uno solo', 'git-merge');
    abrirFicha(otro.id); refrescarActual();
  } catch (e) { fallo(e); }
}

/* Cerca de mí */
function cercaDeMi() {
  const D = { estado: 'buscando', lista: [], mios: false, pos: null };
  const render = () => `${cabeza(ic('walk'))}
    <div class="toggle" style="margin-bottom:12px">
      <button type="button" data-act="cerca_filtro" data-v="0" class="${!D.mios ? 'on' : ''}" aria-label="${C.AYUDA.filtro_todos}">${ic('world')}</button>
      <button type="button" data-act="cerca_filtro" data-v="1" class="${D.mios ? 'on' : ''}" aria-label="${C.AYUDA.filtro_mios}">${ic(S.me.avatar)}</button></div>
    ${D.estado === 'buscando' ? `<div class="empty"><span class="spin">${ic('loader-2')}</span></div>` : ''}
    ${D.estado === 'error' ? `<div class="empty">${ic('current-location')}<p>Activa el GPS para ver lo que hay cerca</p></div>` : ''}
    ${D.estado === 'ok' ? (D.lista.filter((c) => !D.mios || c.user_id === S.user.id).map((c) => `<div class="li" style="margin-bottom:10px">
        ${c.thumb ? `<img class="thumb" src="${foto(c, true)}" alt="" data-act="ficha" data-id="${c.id}">` : `<span class="thumb" data-act="ficha" data-id="${c.id}">${ic(c.cat_icon)}</span>`}
        <div class="grow" data-act="ficha" data-id="${c.id}"><b>${esc(c.name)}</b><div class="tiny">${ic(c.cat_icon)} ${metros(c.dist)} · ${esc(c.user_name)}</div></div>
        ${ib('ruta', 'route', 'ruta', `data-id="${c.id}"`, 'sm')}</div>`).join('') || `<div class="empty">${ic('walk')}<p>Nada registrado a menos de ${metros(C.CERCA_METROS)}</p></div>`) : ''}`;
  const hoja = { render, after: (r) => { r._cerca = D; }, tipo: 'cerca' };
  pila.push(hoja); dibujarHoja();
  getPos().then(async (p) => {
    D.pos = p; ponerYo(p);
    const l = guarda(await api.cardsInBox(cajaAlrededor(p, C.CERCA_METROS), { limit: 300 }));
    D.lista = l.map((c) => Object.assign({}, c, { dist: distancia(p, c) })).filter((c) => c.dist <= C.CERCA_METROS).sort((a, b) => a.dist - b.dist);
    D.estado = 'ok';
  }).catch((e) => { D.estado = 'error'; if (!(e && typeof e.code === 'number') && !(e && e.message === 'NO_GPS')) fallo(e); })
    .finally(() => { if (pila.includes(hoja) && hojaArriba() === hoja) dibujarHoja(); });
}

/* Tabla general (de toda la comunidad o de un grupo) */
function tablaGeneral(grupo) {
  const g = grupo ? miGrupo(grupo) : null;
  const D = { metric: 'total', filas: null, grupo };
  const hoja = { render: () => `${cabeza(`${ic('trophy')} ${g ? esc(g.name) : ''}`)}
    <div class="toggle" style="margin-bottom:12px">
      <button type="button" data-act="tabla_metrica" data-v="total" class="${D.metric === 'total' ? 'on' : ''}" data-tip="Hallazgos" aria-label="Hallazgos">${ic('photo')}</button>
      <button type="button" data-act="tabla_metrica" data-v="colonias" class="${D.metric === 'colonias' ? 'on' : ''}" data-tip="Colonias" aria-label="Colonias">${ic('map-pin')}</button></div>
    ${!D.filas ? `<div class="empty"><span class="spin">${ic('loader-2')}</span></div>` : D.filas.length ? `<div class="list">${D.filas.map((f, i) => `
      <button class="li" data-act="perfil" data-id="${f.user_id}" style="${f.user_id === S.user.id ? 'background:var(--mostaza)' : ''}">
        <span class="rank">${i < 3 ? ic(['crown', 'medal', 'medal'][i]) : i + 1}</span>${avatar(f)}<b class="grow" style="text-align:left">${esc(f.name)}</b>
        <b>${D.metric === 'colonias' ? f.colonias : f.total}</b></button>`).join('')}</div>` : `<div class="empty">${ic('trophy')}<p>Todavía no hay nadie en la tabla</p></div>`}`,
    after: (r) => { r._tabla = D; }, tipo: 'tabla' };
  pila.push(hoja); dibujarHoja();
  D.cargar = async () => { D.filas = null; dibujarHoja(); try { D.filas = await api.leaderboard(D.metric, D.grupo); } catch (e) { D.filas = []; fallo(e); } if (hojaArriba() === hoja) dibujarHoja(); };
  D.cargar();
}

/* Categorías */
function hojaCategorias(alTerminar) {
  const render = () => `${cabeza(ic('cards'))}
    <div class="instruccion"><p>${esc(C.TEXTO_CATEGORIAS)}</p>
      <div class="tiny row wrap"><span class="row">${ic('pencil')} editar</span><span class="row">${ic('trash')} borrar</span><span class="row">${ic('plus')} nueva categoría</span></div></div>
    <div class="list">${S.cats.map((c) => `<div class="li"><span class="avatar" style="background:${okColor(c.color)}">${ic(c.icon)}</span>
      <b class="grow">${esc(c.name)}</b>${ib('editar_categoria', 'pencil', 'editar', `data-id="${c.id}"`, 'sm')}${ib('borrar_categoria', 'trash', 'borrar', `data-id="${c.id}"`, 'sm')}</div>`).join('')}</div>
    <p class="tiny" style="margin:10px 0">${S.cats.length} / ${C.MAX_CATEGORIAS}</p>
    ${S.cats.length < C.MAX_CATEGORIAS ? `<button class="btn alt block" data-act="editar_categoria" data-id="" aria-label="${esc(C.AYUDA.nueva_categoria)}" data-tip="${esc(C.AYUDA.nueva_categoria)}">${ic('plus')}</button>` : ''}
    ${alTerminar ? `<button class="btn block" data-act="listo_categorias" style="margin-top:12px" ${S.cats.length ? '' : 'disabled'}>${ic('check')} Listo</button>` : ''}`;
  abrirHoja(render, null, 'categorias', !!alTerminar);
  hojaArriba().listo = alTerminar;
}
function editarCategoria(id) {
  const c = S.cats.find((x) => x.id === id) || { id: '', name: '', icon: C.ICONOS_GRUPOS[0].iconos[0], color: C.COLORES_CATEGORIA[S.cats.length % C.COLORES_CATEGORIA.length] };
  abrirHoja(() => `${cabeza(ic(c.id ? 'pencil' : 'plus'))}
    <div class="field"><label for="c-nombre">${ic('pencil')} Nombre</label><input id="c-nombre" class="in" maxlength="30" value="${esc(c.name)}" placeholder="Gatos, puertas, autos…"></div>
    <div class="field"><label>${ic('palette')}</label>${selector('color', C.COLORES_CATEGORIA, c.color, 'color')}</div>
    <div class="field"><label>${ic('sparkles')}</label>${iconPicker(c.icon)}</div>
    <button class="btn block" data-act="guardar_categoria" data-id="${c.id}">${ic('check')} Guardar</button>`, null, 'categoria');
}
async function guardarCategoria(btn, id) {
  const raiz = $('.sheet');
  const d = { name: $('#c-nombre', raiz).value.trim(), icon: iconoElegido(raiz), color: valor(raiz, 'color') };
  if (!d.name) return aviso('Ponle un nombre', 'pencil');
  if (!esIcono(d.icon) || !d.color) return aviso('Elige ícono y color', 'palette');
  ocupado(btn, true);
  try {
    if (id) await api.updateCat(id, d); else await api.addCat(d);
    S.cats = await api.listCats(S.user.id);
    S.stats = null;
    cerrarHoja(); aviso('Guardado');
    if (!$('#scr-map')) return;
    if (S.tab !== 'map') irA(S.tab); else $('#chips-mapa').innerHTML = chipsFiltro(S.filtro, 'filtro', true);
  } catch (e) { ocupado(btn, false); fallo(e); }
}

/* Grupos */
async function recargarGrupos() { S.groups = await api.myGroups(S.user.id); }
function abrirGrupo(gid) {
  const D = { g: miGrupo(gid) || null, miembros: null, cards: null };
  const render = () => {
    const g = D.g;
    if (!g) return cabeza('') + `<div class="empty"><span class="spin">${ic('loader-2')}</span></div>`;
    const soyDuena = g.owner === S.user.id, soyMiembro = !!miGrupo(g.id);
    return `${cabeza(`<span class="row">${ic(g.icon)} ${esc(g.name)}</span>`)}
      <div class="row wrap" style="margin-bottom:12px">
        <span class="catb" style="background:${okColor(g.color)}">${ic(g.is_public ? 'world' : 'lock')}${esc(g.is_public ? C.AYUDA.grupo_publico : C.AYUDA.grupo_privado)}</span>
        <span class="muted row">${ic('users')} ${D.miembros ? D.miembros.length : '…'}</span></div>
      <div class="row wrap" style="margin-bottom:14px">
        ${soyMiembro ? ib('invitar', 'brand-whatsapp', 'invitar', `data-id="${g.id}"`, 'on') : ''}
        ${ib('ver_grupo_mapa', 'map-2', 'ver_mapa', `data-id="${g.id}"`)}
        ${ib('tabla_grupo', 'trophy', 'tabla', `data-id="${g.id}"`)}
        ${soyDuena ? ib('editar_grupo', 'pencil', 'editar', `data-id="${g.id}"`) : ''}
        <span class="grow"></span>
        ${soyMiembro && !soyDuena ? ib('salir_grupo', 'door-exit', 'salir_grupo', `data-id="${g.id}"`) : ''}
      </div>
      ${D.miembros ? `<div class="chips" style="flex-wrap:wrap;margin-bottom:14px">${D.miembros.map((m) => `<button class="chip" data-act="perfil" data-id="${m.user_id}">${avatar(m)}${esc(m.name || '')}</button>`).join('')}</div>` : ''}
      ${D.cards === null ? `<div class="empty"><span class="spin">${ic('loader-2')}</span></div>` : D.cards.length ? rejilla(D.cards, false)
        : `<div class="empty">${ic('camera')}<p>Aún no hay hallazgos en este grupo</p></div>`}`;
  };
  abrirHoja(render, null, 'grupo');
  const hoja = hojaArriba();
  D.cargar = async () => {
    try {
      const [g, miembros, cards] = await Promise.all([api.getGroup(gid), api.groupMembers(gid), api.groupCards(gid)]);
      if (!g) { if (hojaArriba() === hoja) cerrarHoja(); return aviso('Este grupo ya no está disponible', 'alert-triangle'); }
      Object.assign(D, { g, miembros, cards: guarda(cards) });
    } catch (e) { fallo(e); D.cards = D.cards || []; }
    if (hojaArriba() === hoja) dibujarHoja();
  };
  hoja.datos = D;
  D.cargar();
}
function editarGrupo(gid) {
  const g = miGrupo(gid) || { id: '', name: '', icon: 'users', color: C.COLORES_CATEGORIA[1], is_public: false };
  abrirHoja(() => `${cabeza(ic(g.id ? 'pencil' : 'users'))}
    <div class="field"><label for="g-nombre">${ic('pencil')} Nombre</label><input id="g-nombre" class="in" maxlength="40" value="${esc(g.name)}" placeholder="Gatos de San Rafael"></div>
    <div class="field"><label>${ic('eye')}</label><div class="toggle" data-pick="publico">
      <button type="button" data-act="elegir" data-v="0" class="${g.is_public ? '' : 'on'}" data-tip="${esc(C.AYUDA.grupo_privado)}" aria-label="${esc(C.AYUDA.grupo_privado)}">${ic('lock')} Privado</button>
      <button type="button" data-act="elegir" data-v="1" class="${g.is_public ? 'on' : ''}" data-tip="${esc(C.AYUDA.grupo_publico)}" aria-label="${esc(C.AYUDA.grupo_publico)}">${ic('world')} Público</button></div>
      <p class="tiny">Privado: solo lo ven sus miembros. Público: también aparece para toda la comunidad.</p></div>
    <div class="field"><label>${ic('palette')}</label>${selector('color', C.COLORES_CATEGORIA, g.color, 'color')}</div>
    <div class="field"><label>${ic('sparkles')}</label>${iconPicker(g.icon)}</div>
    <button class="btn block" data-act="guardar_grupo" data-id="${g.id}">${ic('check')} Guardar</button>`, null, 'editar_grupo');
}
async function guardarGrupo(btn, gid) {
  const raiz = $('.sheet');
  const d = { name: $('#g-nombre', raiz).value.trim(), icon: iconoElegido(raiz), color: valor(raiz, 'color'), is_public: valor(raiz, 'publico') === '1' };
  if (!d.name) return aviso('Ponle un nombre', 'pencil');
  if (!esIcono(d.icon) || !d.color) return aviso('Elige ícono y color', 'palette');
  ocupado(btn, true);
  try {
    const g = gid ? await api.updateGroup(gid, d) : await api.createGroup(d);
    await recargarGrupos();
    cerrarHoja();
    const top = hojaArriba();
    if (top && top.tipo === 'grupo' && top.datos) top.datos.cargar(); else abrirGrupo(g.id);
    aviso(gid ? 'Guardado' : 'Grupo creado', 'users');
    if (S.tab === 'coleccion') pintarColeccion();
  } catch (e) { ocupado(btn, false); fallo(e); }
}
async function mostrarInvitacion(code) {
  let inv = null;
  try { inv = await api.invitePreview(code); } catch (e) { return fallo(e); }
  if (!inv) return aviso('Esa invitación ya no es válida', 'alert-triangle');
  if (inv.already) return abrirGrupo(inv.id);
  abrirHoja(() => `${cabeza(`${ic('users')} Invitación`)}
    <div style="text-align:center;padding:10px 0 4px">
      <span class="avatar lg" style="background:${okColor(inv.color)};margin:0 auto 10px">${ic(inv.icon)}</span>
      <h2>${esc(inv.name)}</h2>
      <p class="muted row" style="justify-content:center">${ic(inv.is_public ? 'world' : 'lock')} ${esc(inv.is_public ? C.AYUDA.grupo_publico : C.AYUDA.grupo_privado)} · ${ic('users')} ${inv.members}</p>
      <button class="btn block" data-act="unirme" data-v="${esc(code)}" style="margin-top:14px">${ic('user-plus')} Unirme</button></div>`, null, 'invitacion');
}

/* Tarjeta para compartir por WhatsApp */
function cargarRemota(url) {
  return new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = url; });
}
async function tarjetaImagen(c) {
  const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  x.fillStyle = C.COLORES.papel; x.fillRect(0, 0, W, H);
  x.strokeStyle = C.COLORES.tinta; x.lineWidth = 8; x.strokeRect(40, 40, W - 80, H - 80);
  x.fillStyle = '#EADFCB'; x.fillRect(90, 90, W - 180, W - 180);
  if (c.photo || c.thumb) {
    const img = await cargarRemota(foto(c));
    const k = Math.min((W - 220) / img.width, (W - 220) / img.height);
    const w = img.width * k, h = img.height * k;
    x.drawImage(img, (W - w) / 2, 90 + (W - 180 - h) / 2, w, h);
  }
  x.fillStyle = C.COLORES.tinta; x.textAlign = 'left';
  x.font = 'bold 76px Georgia, serif'; x.fillText(String(c.name).slice(0, 24), 90, W + 20);
  x.fillStyle = okColor(c.cat_color); x.font = 'bold 40px system-ui, sans-serif'; x.fillText(String(c.cat_name || '').slice(0, 30), 90, W + 85);
  x.fillStyle = '#6B635A'; x.font = '36px system-ui, sans-serif';
  x.fillText([c.colonia, fecha(c.created_at)].filter(Boolean).join(' · '), 90, W + 140);
  x.fillStyle = C.COLORES.terracota; x.font = 'bold 34px Georgia, serif'; x.fillText('Collector Go', 90, H - 80);
  x.fillStyle = '#6B635A'; x.font = '28px system-ui, sans-serif'; x.fillText(C.LEMA, 330, H - 80);
  return new Promise((res) => cv.toBlob((b) => res(b), 'image/jpeg', 0.86));
}
function abrirWhatsApp(texto) { window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank', 'noopener'); }
async function compartirHallazgo(c, btn) {
  const url = location.origin + location.pathname + '#f=' + c.id;
  const texto = `${C.WHATSAPP_TEXTO}: ${c.name}\n${url}`;
  ocupado(btn, true);
  try {
    if (navigator.canShare) {
      const blob = await tarjetaImagen(c);
      const file = new File([blob], `collector-go-${c.id.slice(0, 8)}.jpg`, { type: 'image/jpeg' });
      if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: texto }); return; }
    }
    abrirWhatsApp(texto);
  } catch (e) {
    if (!(e && e.name === 'AbortError')) abrirWhatsApp(texto);
  } finally { ocupado(btn, false); }
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
      <div class="li">${a.card.thumb ? `<img class="thumb" src="${foto(a.card, true)}" alt="">` : `<span class="thumb">${ic(a.card.cat_icon)}</span>`}
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
  dudas: () => hojaDudas(),
  privacidad: () => hojaPrivacidad(),
  info_precision(b) { const acc = +(b.dataset.acc || (R.pos && R.pos.acc) || C.GPS_PRECISION_MAX + 1); if (hojaArriba() && hojaArriba().tipo === 'registro') recordarFormulario(); avisarPrecision({ acc }, true); },
  async comentar(b) {
    const t = $('#coment-in'); const texto = (t ? t.value : '').trim();
    if (!texto) { if (t) t.focus(); return aviso('Escribe un comentario', 'message-circle'); }
    if (texto.length > C.COMENTARIO_MAX) return aviso(`Máximo ${C.COMENTARIO_MAX} caracteres`, 'message-circle');
    ocupado(b, true);
    try {
      await api.addComment(b.dataset.id, texto);
      if (fichaH) { fichaH.borrador = ''; fichaH.coms = await api.comments(b.dataset.id); }
      const nueva = await api.card(b.dataset.id); if (nueva) guarda([nueva]);
      refrescarFicha(b.dataset.id); aviso('Comentario publicado', 'message-circle');
    } catch (e) { ocupado(b, false); fallo(e); }
  },
  async borrar_comentario(b) {
    if (!(await confirmar('¿Borrar este comentario?'))) return;
    try {
      await api.delComment(b.dataset.id);
      if (fichaH) fichaH.coms = await api.comments(b.dataset.find);
      const nueva = await api.card(b.dataset.find); if (nueva) guarda([nueva]);
      refrescarFicha(b.dataset.find); aviso('Comentario borrado', 'trash');
    } catch (e) { fallo(e); }
  },
  tab: (b) => irA(b.dataset.v),
  nuevo: () => nuevoRegistro(),
  fondo: (b, ev) => { const top = hojaArriba(); if (ev.target === b && top && !top.fija) cerrarHoja(); },
  cerrar: () => cerrarHoja(),
  atras: () => cerrarHoja(),
  elegir(b) {
    const g = b.closest('[data-pick]'); $$('[data-v]', g).forEach((x) => x.classList.toggle('on', x === b));
    if (g.dataset.pick === 'dest') { const p = $('#campo-priv'); if (p) p.hidden = b.dataset.v.startsWith('g:'); R.dest = b.dataset.v; buscarCandidatos(); }
  },
  medalla: (b) => aviso(b.dataset.info, b.dataset.icon || 'medal'),

  /* íconos */
  icon_tab(b) {
    const raiz = b.closest('[data-iconpick]');
    $$('[data-act="icon_tab"]', raiz).forEach((x) => x.classList.toggle('on', x === b));
    const q = $('#buscar-icono', raiz); if (q) { q.value = ''; q.hidden = b.dataset.v === 'emoji'; }
    $('#icon-lista', raiz).innerHTML = listaIconos(b.dataset.v, raiz.dataset.sel);
  },
  elegir_icono(b) {
    const raiz = b.closest('[data-iconpick]');
    raiz.dataset.sel = b.dataset.v;
    $$('[data-act="elegir_icono"]', raiz).forEach((x) => x.classList.toggle('on', x === b));
    $('#icono-elegido', raiz).innerHTML = ic(b.dataset.v);
  },
  usar_emoji(b) {
    const raiz = b.closest('[data-iconpick]');
    const e = primerGrafema($('#emoji-in', raiz).value);
    if (!esEmojiTexto(e)) return aviso('Escribe un emoji, no letras', 'mood-smile');
    raiz.dataset.sel = 'emoji:' + e;
    $$('[data-act="elegir_icono"]', raiz).forEach((x) => x.classList.remove('on'));
    $('#icono-elegido', raiz).innerHTML = ic(raiz.dataset.sel);
    aviso('Emoji elegido', 'mood-smile');
  },

  /* mapa */
  filtro(b) {
    S.filtro = leerFiltro(b.dataset.v);
    if (S.filtro.modo === 'siguiendo' && !S.following.size) aviso('Aún no sigues a nadie', 'user-plus');
    $('#chips-mapa').innerHTML = chipsFiltro(S.filtro, 'filtro', true); cargarPines();
  },
  ubicar(b) {
    ocupado(b, true);
    getPos().then((p) => { ponerYo(p); S.map.setView([p.lat, p.lng], 17); })
      .catch(() => aviso('No se pudo leer el GPS', 'current-location')).finally(() => ocupado(b, false));
  },
  cerca: () => cercaDeMi(),
  cerca_filtro(b) { const D = $('.sheet')._cerca; D.mios = b.dataset.v === '1'; dibujarHoja(); },

  /* muro, tarjetas y fichas */
  muro_filtro(b) { S.muro = leerFiltro(b.dataset.v); pintarMuro(); },
  refrescar: () => pintarMuro(),
  mas: () => pintarMuro(true),
  ficha: (b) => abrirFicha(b.dataset.id),
  perfil: (b) => abrirPerfil(b.dataset.id),
  galeria(b) { const top = hojaArriba(); if (!top || top.tipo !== 'ficha' || !fichaH) return; fichaH.i = +b.dataset.i; dibujarHoja(); },
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
  whatsapp: (b) => { const c = S.cache.get(b.dataset.id); if (c) compartirHallazgo(c, b); },
  whatsapp_perfil: (b) => abrirWhatsApp(`Mira mi colección en Collector Go\n${location.origin + location.pathname}#u=${b.dataset.id}`),
  reencuentro(b) {
    const c = S.cache.get(b.dataset.id); if (!c) return;
    nuevoRegistro(c);
  },
  usar_candidato(b) {
    const c = S.cache.get(b.dataset.id); if (!c) return;
    recordarFormulario(); R.destino = c; dibujarHoja();
  },
  sin_foto() { R.sinFoto = true; dibujarHoja(); },
  editar_hallazgo: (b) => editarHallazgo(b.dataset.id),
  guardar_edicion: (b) => guardarEdicion(b, b.dataset.id),
  async borrar_hallazgo(b) {
    const c = S.cache.get(b.dataset.id); if (!c) return;
    if (!(await confirmar(`¿Borrar "${c.name}" y toda su historia?`))) return;
    ocupado(b, true);
    try {
      let hist = []; try { hist = await api.history(c.id); } catch (e) { hist = []; }
      const mias = hist.filter((h) => h.user_id === S.user.id).flatMap((h) => [h.photo, h.thumb]);
      await api.removeFiles([c.photo, c.thumb].concat(c.user_id === S.user.id ? mias : [])).catch(() => null);
      await api.delFind(c.id);
      S.cache.delete(c.id); S.feed = S.feed.filter((x) => x.id !== c.id); S.stats = null;
      const adm = adminAbierto();
      if (adm) { await api.dismiss(c.id).catch(() => null); while (hojaArriba() !== adm) pila.pop(); dibujarHoja(); $('.sheet')._admin.cargar(); }
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
      if (S.filtro.modo === 'cat' && S.filtro.id === c.id) S.filtro = { modo: 'todos', id: null };
      dibujarHoja(); aviso('Borrado', 'trash');
    } catch (e) { fallo(e); }
  },
  listo_categorias() {
    if (!S.cats.length) return aviso('Crea al menos una categoría', 'plus');
    const top = hojaArriba(); cerrarTodo(); if (top && top.listo) top.listo();
  },

  /* grupos */
  grupo: (b) => abrirGrupo(b.dataset.id),
  grupo_nuevo: () => editarGrupo(''),
  editar_grupo: (b) => editarGrupo(b.dataset.id),
  guardar_grupo: (b) => guardarGrupo(b, b.dataset.id),
  invitar(b) {
    const g = miGrupo(b.dataset.id); if (!g) return;
    abrirWhatsApp(`${C.WHATSAPP_INVITACION} "${g.name}"\n${location.origin + location.pathname}#g=${g.invite_code}`);
  },
  ver_grupo_mapa(b) {
    if (!miGrupo(b.dataset.id)) return aviso('Únete al grupo para verlo en tu mapa', 'users');
    S.filtro = { modo: 'grupo', id: b.dataset.id }; cerrarTodo(); irA('map');
  },
  tabla_grupo: (b) => tablaGeneral(b.dataset.id),
  async salir_grupo(b) {
    const g = miGrupo(b.dataset.id); if (!g) return;
    if (!(await confirmar(`¿Salir de "${g.name}"? Tus hallazgos se quedan en el grupo.`, 'door-exit'))) return;
    try {
      await api.leaveGroup(g.id, S.user.id); await recargarGrupos();
      if (S.filtro.modo === 'grupo' && S.filtro.id === g.id) S.filtro = { modo: 'todos', id: null };
      if (S.muro.modo === 'grupo' && S.muro.id === g.id) S.muro = { modo: 'todos', id: null };
      cerrarTodo(); aviso('Saliste del grupo', 'door-exit'); refrescarActual();
    } catch (e) { fallo(e); }
  },
  async unirme(b) {
    ocupado(b, true);
    try {
      const gid = await api.joinGroup(b.dataset.v); await recargarGrupos();
      cerrarTodo(); aviso('Ya eres parte del grupo', 'users'); abrirGrupo(gid); refrescarActual();
    } catch (e) { ocupado(b, false); fallo(e); }
  },

  /* perfil */
  async crear_perfil(b) {
    const d = leerPerfil($('.sheet') || document);
    if (!d.name) return aviso('Escribe tu nombre', 'user');
    ocupado(b, true);
    try { S.me = await api.createProfile(Object.assign({ id: S.user.id }, d)); cerrarTodo(); pedirCategorias(); }
    catch (e) { ocupado(b, false); fallo(e); }
  },
  editar_perfil: () => abrirHoja(() => hojaPerfil(S.me, false), null, 'editar_perfil'),
  async guardar_perfil(b) {
    const d = leerPerfil($('.sheet'));
    if (!d.name) return aviso('Escribe tu nombre', 'user');
    ocupado(b, true);
    try { S.me = await api.updateProfile(S.user.id, d); cerrarHoja(); aviso('Guardado'); if (S.tab === 'perfil') pintarPerfil(); }
    catch (e) { ocupado(b, false); fallo(e); }
  },
  async seguir(b) {
    const uid = b.dataset.id, sigo = S.following.has(uid);
    ocupado(b, true);
    try {
      await api.follow(uid, !sigo, S.user.id);
      if (sigo) S.following.delete(uid); else S.following.add(uid);
      aviso(sigo ? 'Dejaste de seguir' : 'Siguiendo', sigo ? 'user-x' : 'user-check');
      const top = hojaArriba(); if (top && top.tipo === 'perfil') { const D = $('.sheet')._perfil; if (D) D.cargar(); }
    } catch (e) { ocupado(b, false); fallo(e); }
  },
  tabla: () => tablaGeneral(),
  tabla_metrica(b) { const D = $('.sheet')._tabla; D.metric = b.dataset.v; D.cargar(); },
  async salir() { if (await confirmar('¿Cerrar sesión?', 'logout')) { await api.logout().catch(() => null); location.hash = ''; location.reload(); } },
  async borrar_cuenta(b) {
    if (!(await confirmar('¿Borrar tu cuenta?', 'trash'))) return;
    if (!(await confirmar('Se borrarán tu perfil, tus hallazgos y tus fotos. No se puede deshacer.', 'alert-triangle', '', 'trash'))) return;
    ocupado(b, true);
    try { await api.deleteAccount(S.user.id); location.hash = ''; location.reload(); }
    catch (e) { ocupado(b, false); fallo(e); }
  },

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
document.addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-act]');
  if (!b || b.disabled) return;
  const f = ACCIONES[b.dataset.act];
  if (!f) { console.warn('Acción sin lógica:', b.dataset.act); return; }
  f(b, ev);
});
let tBuscar;
document.addEventListener('input', (ev) => {
  if (ev.target.id === 'coment-in') { if (fichaH) fichaH.borrador = ev.target.value; const n = $('#coment-n'); if (n) n.textContent = ev.target.value.length; }
  if (ev.target.matches('[data-in="buscar-icono"]')) { clearTimeout(tBuscar); const v = ev.target.value; tBuscar = setTimeout(() => buscarIconos(v), 300); }
});

/* ---------------------------------------------------------------------
   9. INICIO
   --------------------------------------------------------------------- */
function pantallaEntrada() {
  $('#app').innerHTML = `<div class="login">
    <img class="logo" src="icon.svg" alt="">
    <h1 class="serif" style="font-size:36px">Collector Go</h1>
    <p class="muted" style="max-width:280px;font-size:18px">${ic('map-pin')} ${esc(C.LEMA)}</p>
    <button class="btn" data-act="entrar">${ic('brand-google')} Entrar con Google</button>
    <button class="linkbtn" data-act="privacidad" style="color:var(--tinta2)">${ic('lock')} ${esc(C.DATOS_TITULO)}</button></div>`;
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
    const [cats, groups, following] = await Promise.all([api.listCats(user.id), api.myGroups(user.id), api.following(user.id)]);
    S.cats = cats; S.groups = groups; S.following = new Set(following);
    if (!S.cats.length) return pedirCategorias();
    pintarApp(); rutaHash();
  } catch (e) { fallo(e); S.user = null; pantallaEntrada(); }
  finally { S.arrancando = false; }
}
// Enlaces compartidos: #f= hallazgo, #u= perfil, #g= invitación a grupo.
// Se recuerdan durante el inicio de sesión con Google.
const RX_DESTINO = /^#([fu])=([0-9a-f-]{36})$|^#g=([0-9a-f]{6,40})$/i;
function guardarDestino() {
  if (RX_DESTINO.test(location.hash)) { try { localStorage.setItem('cg_destino', location.hash); } catch (e) { /* sin almacenamiento */ } }
}
function rutaHash() {
  let h = location.hash;
  if (!RX_DESTINO.test(h)) { try { h = localStorage.getItem('cg_destino') || ''; } catch (e) { h = ''; } }
  try { localStorage.removeItem('cg_destino'); } catch (e) { /* nada */ }
  const m = h.match(RX_DESTINO);
  if (location.hash) history.replaceState(null, '', location.pathname);
  if (!m) return;
  if (m[3]) mostrarInvitacion(m[3]);
  else if (m[1] === 'f') abrirFicha(m[2]); else abrirPerfil(m[2]);
}
window.addEventListener('hashchange', () => { guardarDestino(); if (S.me && S.cats.length && $('#scr-map')) rutaHash(); });

async function iniciar() {
  guardarDestino();
  api = window.__API_PRUEBAS__ || (/^https:\/\//.test(C.SUPABASE_URL) ? supabaseApi() : null);
  if (!api) return pantallaConfig();
  api.onAuth((ev, u) => {
    if (ev === 'SIGNED_OUT') { S.user = null; pantallaEntrada(); }
    else if (u && (ev === 'SIGNED_IN' || ev === 'INITIAL_SESSION')) arrancar(u);
  });
  try { const u = await api.session(); if (u) arrancar(u); else if (!S.user) pantallaEntrada(); }
  catch (e) { fallo(e); pantallaEntrada(); }
}
window.__CG__ = { ACCIONES, S, logros, novedades, recortarVacio };
iniciar();
})();
