/* =====================================================================
   Collector Go · app.js · v1.8
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
// En lo de un grupo, la etiqueta abre el grupo (ahí se puede silenciar si es público y no eres parte)
function etiquetaDe(c) {
  const b = catBadge(c.cat_name, c.cat_icon, c.cat_color);
  if (c.group_id) return `<button class="catb-btn" data-act="grupo" data-id="${c.group_id}" aria-label="${esc(c.cat_name)}">${b.replace('</span>', ` ${ic('users')}</span>`)}</button>`;
  // Tocar la categoría abre esa colección: la tuya, o la galería pública de la otra persona
  const duena = c.owner_id || c.user_id;
  return c.category_id && duena ? `<button class="catb-btn" data-act="galeria_cat" data-id="${duena}" data-cat="${c.category_id}" aria-label="${esc(c.cat_name)}" data-tip="${esc(C.AYUDA.galeria_cat)}">${b}</button>` : b;
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
// Una ruta de foto nunca puede salirse del atributo donde se escribe
const rutaSegura = (t) => String(t || '').replace(/["'<>`\s\\]/g, (c) => encodeURIComponent(c));
const errTexto = (e) => String((e && (e.message || e.code)) || e || '');
function mensajeError(e) {
  const m = errTexto(e);
  if (m.includes('MAX_CATEGORIAS')) return `Máximo ${limiteCategorias()} categorías`;
  if (m.includes('MAX_GRUPOS')) return `Puedes crear hasta ${C.MAX_GRUPOS} grupos`;
  if (m.includes('GRUPO_LLENO')) return `El grupo ya tiene ${C.ENCUENTRO_MAX_MIEMBROS} personas`;
  if (m.includes('ESPERA')) return 'Espera unos segundos para enviar otro aviso';
  if (m.includes('MAX_PUNTOS')) return 'El grupo ya tiene 50 puntos de encuentro';
  if (m.includes('MAX_COADMIN')) return 'Máximo 3 coadministradoras';
  if (m.includes('AUN_ACTIVO')) return 'Aún hay actividad en el grupo';
  if (m.includes('MAX_MIRA')) return 'Llegaste al máximo de "Mira esto" en este grupo';
  if (m.includes('PUSH_NO_LISTO')) return C.PUSH_NO_LISTAS;
  if (m.includes('MAX_ETIQUETAS')) return `Máximo ${C.ETIQUETAS_MAX} personas por hallazgo`;
  if (m.includes('messages_body_check')) return `Máximo ${C.MENSAJE_MAX} caracteres`;
  if (m.includes('"messages"')) return C.CHAT_BLOQUEADO;
  if (m.includes('NOMBRE_REPETIDO')) return 'Ese nombre ya existe aquí';
  if (m.includes('TIENE_COLABORACIONES')) return C.TIENE_COLABORACIONES;
  if (m.includes('MAX_COMENTARIOS')) return `Máximo ${C.COMENTARIOS_POR_PERSONA} comentarios por hallazgo`;
  if (m.includes('comments_body_check')) return `Máximo ${C.COMENTARIO_MAX} caracteres`;
  if (m.includes('INVITACION_INVALIDA')) return 'Esa invitación ya no es válida';
  if (m.includes('YA_ES_MIEMBRO')) return 'Ya es parte del grupo';
  if (m.includes('SIGUE_PRIMERO')) return C.AMISTAD_SIGUE_PRIMERO;
  if (m.includes('SOLICITUD_INVALIDA')) return 'Esa solicitud ya no está disponible';
  if (m.includes('VETADA')) return C.INVITAR_VETADA;
  if (m.includes('DEMASIADAS_BUSQUEDAS')) return C.BUSCAR_ESPERA;
  // La app es más nueva que la base de datos (falta correr la migración o refrescar la lista de funciones)
  if ((e && e.code === 'PGRST202') || m.includes('Could not find the function')) return C.FALTA_MIGRACION;
  if ((e && e.code === '23503') || m.includes('foreign key')) return 'Primero borra o mueve sus hallazgos';
  if (e && e.code === '23505') return 'Ya estaba registrado';
  if (m.includes('"mutes"')) return 'No se puede silenciar a quien comparte un grupo contigo';
  if (m.includes('requests_body_check')) return `Máximo ${C.BUZON_MAX} caracteres`;
  if (m.includes('row-level security') || m.includes('NO_PERMITIDO')) return 'No tienes permiso para eso';
  if (esErrorRed(e)) return 'Sin conexión. Intenta de nuevo';
  return `Algo falló (código ${codigoError(e)}). Intenta de nuevo o escríbenos en el buzón`;
}
// ¿Falló por falta de red? (sin señal o red saturada)
function esErrorRed(e) {
  const m = errTexto(e);
  return /Failed to fetch|NetworkError|Load failed|network connection|fetch failed|ERR_INTERNET|ERR_NETWORK/i.test(m) || (e && e.name === 'TypeError' && /fetch/i.test(m)) || !navigator.onLine;
}
// Código corto para identificar un error: el de la base de datos o uno derivado del mensaje
function codigoError(e) {
  if (e && e.code && /^[0-9A-Z]{3,6}$/.test(String(e.code))) return String(e.code);
  let h = 0; const t = errTexto(e); for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
  return 'E' + (h % 46656).toString(36).toUpperCase().padStart(3, '0');
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
  // Fotos privadas: viven en el almacén cerrado "privadas" y se ven con enlaces temporales.
  // En la base de datos su ruta empieza con "priv:".
  const URLS = new Map();
  const almacen = (path) => (String(path).startsWith('priv:') ? ['privadas', path.slice(5)] : ['fotos', path]);
  async function firmar(filas) {
    const lista = Array.isArray(filas) ? filas : (filas ? [filas] : []);
    const pend = new Set();
    lista.forEach((f) => ['photo', 'thumb', 'last_thumb', 'screenshot'].forEach((k) => {
      const v = f && f[k]; if (v && String(v).startsWith('priv:') && !URLS.has(v)) pend.add(v.slice(5)); }));
    if (pend.size) {
      try {
        const r = ok(await sb.storage.from('privadas').createSignedUrls([...pend], 3600));
        (r || []).forEach((x) => { if (x && x.signedUrl) URLS.set('priv:' + x.path, x.signedUrl); });
      } catch (e) { /* sin enlace: la foto no se muestra */ }
    }
    return filas;
  }
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
      let q2 = filtrar(q, o); if (o.sinSilenciados) q2 = q2.eq('muted', false);
      return q2.order('created_at', { ascending: false }).limit(o.limit || 400).then(ok).then(firmar);
    },
    // Muro: hallazgos y reencuentros con foto, cada uno como novedad
    feed(before, o = {}) {
      let q = sb.from('feed_items').select('*').eq('is_private', false).eq('muted', false);
      if (o.uids) q = q.in('actor_id', o.uids.length ? o.uids : ['00000000-0000-0000-0000-000000000000']);
      if (o.group) q = q.eq('group_id', o.group);
      if (o.comunidad) q = q.or('group_id.is.null,group_public.eq.true');
      q = q.order('at', { ascending: false }).limit(20);
      if (before) q = q.lt('at', before);
      return q.then(ok).then(firmar);
    },
    userCards: (uid) => cards().eq('user_id', uid).order('created_at', { ascending: false }).limit(1000).then(ok).then(firmar),
    groupCards: (gid) => cards().eq('group_id', gid).order('created_at', { ascending: false }).limit(1000).then(ok).then(firmar),
    card: (id) => cards().eq('id', id).maybeSingle().then(ok).then(firmar),
    cardsByIds: (ids) => (ids.length ? cards().in('id', ids).then(ok).then(firmar) : Promise.resolve([])),
    history: (findId) => sb.from('sighting_cards').select('*').eq('find_id', findId).order('created_at', { ascending: false }).then(ok).then(firmar),
    vitrina: (uid) => sb.rpc('vitrina', { persona: uid }).then(ok),
    comparteGrupo: (uid) => sb.rpc('comparte_grupo_conmigo', { otra: uid }).then(ok),
    muteList: () => sb.from('mute_cards').select('*').order('created_at', { ascending: false }).then(ok),
    mute: (m) => sb.from('mutes').insert(m).then(ok),
    unmute: (id) => sb.from('mutes').delete().eq('id', id).then(ok),
    sendRequest: (r) => sb.from('requests').insert(r).then(ok),
    myRequests: (uid) => sb.from('requests').select('*').eq('user_id', uid).order('created_at', { ascending: false }).then(ok).then(firmar),
    allRequests: () => sb.from('request_cards').select('*').order('created_at', { ascending: false }).limit(200).then(ok).then(firmar),
    updateRequest: (id, r) => sb.from('requests').update(r).eq('id', id).then(ok),
    delRequest: (id) => sb.from('requests').delete().eq('id', id).then(ok),
    avisos: () => sb.rpc('mis_avisos', { lim: 30 }).then(ok).then(firmar),
    avisosVistos: () => sb.rpc('avisos_vistos').then(ok),
    usoPlan: () => sb.rpc('uso_plan').then(ok),
    colorPremioGrupo: (gid, color) => sb.rpc('color_premio_grupo', { grupo: gid, color }).then(ok),
    conversaciones: () => sb.rpc('mis_conversaciones').then(ok),
    async hilo(uid) {
      const { data: { user } } = await sb.auth.getUser();
      const yo = user && user.id;
      const r = ok(await sb.from('messages').select('*')
        .or(`and(sender.eq.${yo},recipient.eq.${uid}),and(sender.eq.${uid},recipient.eq.${yo})`)
        .order('created_at', { ascending: false }).limit(100));
      return (r || []).reverse();
    },
    enviarMensaje: (uid, body, findId) => sb.from('messages').insert(Object.assign({ recipient: uid, body: body || '' }, findId ? { find_id: findId } : {})).then(ok),
    estadoAmistad: (uid) => sb.rpc('estado_amistad', { persona: uid }).then(ok),
    pedirAmistad: (uid, mensaje) => sb.rpc('pedir_amistad', { persona: uid, p_mensaje: mensaje || null }).then(ok),
    responderAmistad: (uid, acepta) => sb.rpc('responder_amistad', { persona: uid, acepta }).then(ok),
    amigasParaFicha: (fid) => sb.rpc('amigas_para_ficha', { fid }).then(ok),
    marcarLeidos: (uid) => sb.rpc('marcar_leidos', { con: uid }).then(ok),
    puedoEscribir: (uid) => sb.rpc('puedo_escribir', { destino: uid }).then(ok),
    puedoEtiquetar: () => sb.rpc('puedo_etiquetar').then(ok),
    async misEtiquetas(findId) {
      const { data: { user } } = await sb.auth.getUser();
      return ok(await sb.from('tags').select('user_id').eq('find_id', findId).eq('tagger', user && user.id)).map((x) => x.user_id);
    },
    etiquetar: (findId, ids) => (ids.length ? sb.from('tags').insert(ids.map((u) => ({ find_id: findId, user_id: u }))).then(ok) : Promise.resolve()),
    async desetiquetar(findId, ids) {
      if (!ids.length) return;
      const { data: { user } } = await sb.auth.getUser();
      ok(await sb.from('tags').delete().eq('find_id', findId).eq('tagger', user && user.id).in('user_id', ids));
    },
    marcarVisto: (findId, p) => sb.rpc('marcar_visto', { hallazgo: findId, lat: p.lat, lng: p.lng, precision_m: p.acc == null ? 999 : p.acc }).then(ok),
    marcarAusencia: (findId, p) => sb.rpc('marcar_ausencia', { hallazgo: findId, lat: p.lat, lng: p.lng, precision_m: p.acc == null ? 999 : p.acc }).then(ok),
    historiaAusencias: (findId) => sb.rpc('historia_ausencias', { fid: findId }).then(ok),
    puedoColaborar: (findId) => sb.rpc('puedo_colaborar', { hallazgo: findId }).then(ok),
    buscarPersonas: (q) => sb.rpc('buscar_personas', { q }).then(ok),
    amigasParaInvitar: (gid) => sb.rpc('amigas_para_invitar', { gid }).then(ok),
    invitarAGrupo: (gid, persona) => sb.rpc('invitar_a_grupo', { gid, persona }).then(ok),
    responderInvitacion: (gid, acepta) => sb.rpc('responder_invitacion', { gid, acepta }).then(ok),
    vetadosDeGrupo: (gid) => sb.rpc('vetados_de_grupo', { gid }).then(ok),
    readmitir: (gid, persona) => sb.rpc('readmitir', { gid, persona }).then(ok),
    colaborar: (findId, tipo, p, photo, thumb, nota) => sb.rpc('colaborar', { hallazgo: findId, p_tipo: tipo, lat: p.lat, lng: p.lng,
      precision_m: p.acc == null ? 999 : p.acc, p_photo: photo, p_thumb: thumb, p_nota: nota || null }).then(ok),
    delSighting: (id) => sb.from('sightings').delete().eq('id', id).select('id').then(ok),
    reportarColaboracion: (sid, motivo) => sb.from('reportes_colaboracion').insert({ sighting_id: sid, motivo }).then(ok),
    reportesColaboracion: () => sb.from('reporte_colaboracion_cards').select('*').order('created_at', { ascending: false }).then(ok).then(firmar),
    descartarReporteColaboracion: (id) => sb.from('reportes_colaboracion').delete().eq('id', id).then(ok),
    borrarHallazgo: (findId) => sb.rpc('borrar_hallazgo', { fid: findId }).then(ok),
    sightingsDe: (ids) => (ids.length ? sb.from('sighting_cards').select('*').in('find_id', ids).order('created_at').then(ok).then(firmar) : Promise.resolve([])),
    anuncios: () => sb.from('anuncios').select('*').order('created_at', { ascending: false }).then(ok),
    publicarAnuncio: (texto, destino, dias) => sb.rpc('publicar_anuncio', { p_texto: texto, p_destino: destino || null, p_dias: dias || null }).then(ok),
    duracionAnuncio: (id, dias) => sb.rpc('duracion_anuncio', { p_id: id, p_dias: dias || null }).then(ok),
    retirarAnuncio: (id) => sb.rpc('retirar_anuncio', { p_id: id }).then(ok),
    comments: (findId) => sb.from('comment_cards').select('*').eq('find_id', findId).order('created_at').then(ok),
    addComment: (findId, body) => sb.from('comments').insert({ find_id: findId, body }).then(ok),
    delComment: (id) => sb.from('comments').delete().eq('id', id).then(ok),
    findByName: (nombre, categoria, grupo) => sb.rpc('find_by_name', { nombre, categoria: categoria || null, grupo: grupo || null }).then(ok),
    addFind: (f) => sb.from('finds').insert(f).select('id').single().then(ok).then((r) => r.id),
    updateFind: (id, f) => sb.from('finds').update(f).eq('id', id).then(ok),
    delFind: (id) => sb.from('finds').delete().eq('id', id).then(ok),
    merge: (origen, destino) => sb.rpc('merge_finds', { origen, destino }).then(ok),
    addSighting: (s) => sb.from('sightings').insert(s).then(ok),
    updateSighting: (id, s) => sb.from('sightings').update(s).eq('id', id).then(ok),
    react(findId, kind, on, uid) {
      return on ? sb.from('reactions').insert({ find_id: findId, kind }).then(ok)
                : sb.from('reactions').delete().match({ find_id: findId, kind, user_id: uid }).then(ok);
    },
    report: (findId) => sb.from('reports').insert({ find_id: findId }).then(ok),
    stats: (uid) => sb.rpc('profile_stats', { p_uid: uid, tz: C.ZONA_HORARIA }).then(ok),
    leaderboard: (metric, grupo) => sb.rpc('leaderboard', { metric, lim: 30, grupo: grupo || null }).then(ok),
    topFotos: (grupo) => sb.rpc('top_fotos', { grupo: grupo || null }).then(ok),
    following: (uid) => sb.from('follows').select('followee').eq('follower', uid).then(ok).then((r) => r.map((x) => x.followee)),
    follow(uid, on, me) {
      return on ? sb.from('follows').insert({ followee: uid }).then(ok)
                : sb.from('follows').delete().match({ follower: me, followee: uid }).then(ok);
    },
    myGroups: (uid) => sb.from('group_members').select('group_id, groups(*)').eq('user_id', uid).then(ok)
      .then((r) => r.map((x) => x.groups).filter(Boolean).sort((a, b) => a.created_at.localeCompare(b.created_at))),
    getGroup: (gid) => sb.from('groups').select('*').eq('id', gid).maybeSingle().then(ok),
    groupMembers: (gid) => sb.from('group_members').select('user_id, joined_at, coadmin, profiles(name, avatar, avatar_color)').eq('group_id', gid).then(ok)
      .then((r) => r.map((m) => Object.assign({ user_id: m.user_id, coadmin: !!m.coadmin }, m.profiles || {}))),
    createGroup: (g) => sb.from('groups').insert(g).select().single().then(ok),
    updateGroup: (gid, g) => sb.from('groups').update(g).eq('id', gid).select().single().then(ok),
    leaveGroup: (gid, uid) => sb.from('group_members').delete().match({ group_id: gid, user_id: uid }).then(ok),
    invitePreview: (code) => sb.rpc('invite_preview', { code }).then(ok).then((r) => (r && r[0]) || null),
    joinGroup: (code) => sb.rpc('join_group', { code }).then(ok),
    reports: () => sb.from('reports').select('find_id, created_at').then(ok),
    dismiss: (findId) => sb.from('reports').delete().eq('find_id', findId).then(ok),
    setBlocked: (uid, b) => sb.from('profiles').update({ blocked: b }).eq('id', uid).then(ok),
    blockedList: () => sb.from('profiles').select('*').eq('blocked', true).then(ok),
    upload(path, blob) {
      const [b, n] = almacen(path);
      return sb.storage.from(b).upload(n, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false }).then(ok);
    },
    async removeFiles(paths) {
      const por = { fotos: [], privadas: [] };
      paths.filter(Boolean).forEach((x) => { const [b, n] = almacen(x); por[b].push(n); });
      for (const b of Object.keys(por)) if (por[b].length) ok(await sb.storage.from(b).remove(por[b]));
    },
    // Cambia una foto de almacén (al pasar un hallazgo de privado a público o al revés)
    async moverFoto(path, aPrivado) {
      if (!path || String(path).startsWith('priv:') === aPrivado) return path;
      const [b, n] = almacen(path);
      const blob = ok(await sb.storage.from(b).download(n));
      const nuevo = aPrivado ? 'priv:' + n : n;
      const [b2, n2] = almacen(nuevo);
      ok(await sb.storage.from(b2).upload(n2, blob, { contentType: blob.type, upsert: true }));
      await sb.storage.from(b).remove([n]).catch(() => null);
      URLS.delete(path);
      return nuevo;
    },
    async deleteAccount(uid) {
      // Todas las fotos, también las de las subcarpetas (grupos de encuentro: <persona>/enc/<grupo>/)
      const archivos = async (b, carpeta, nivel) => {
        const l = ok(await sb.storage.from(b).list(carpeta, { limit: 1000 })) || [];
        let out = [];
        for (const f of l) {
          if (f.id) out.push(`${carpeta}/${f.name}`);
          else if (nivel < 3) out = out.concat(await archivos(b, `${carpeta}/${f.name}`, nivel + 1));
        }
        return out;
      };
      for (const b of ['fotos', 'privadas']) {
        for (let i = 0; i < 50; i++) {
          const files = await archivos(b, uid, 0);
          if (!files.length) break;
          for (let j = 0; j < files.length; j += 100) ok(await sb.storage.from(b).remove(files.slice(j, j + 100)));
        }
      }
      ok(await sb.rpc('delete_my_account'));
      await sb.auth.signOut().catch(() => null);
    },
    photoUrl: (path) => (!path ? '' : String(path).startsWith('priv:') ? rutaSegura(URLS.get(path) || '')
      : `${C.SUPABASE_URL}/storage/v1/object/public/fotos/${rutaSegura(path)}`),
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
    // Grupos de encuentro
    async estadoEncuentro(gid) {
      const e = ok(await sb.rpc('estado_encuentro', { gid }));
      if (e) { await firmar(e.puntos || []); await firmar(e.miras || []); }
      return e;
    },
    ajustesEncuentro: (gid, o) => sb.rpc('ajustes_encuentro', { gid, p_juego: !!o.juego, p_tema: o.tema || null, p_acuerdo: o.acuerdo || null }).then(ok),
    nombrarCoadmin: (gid, uid, si) => sb.rpc('nombrar_coadmin', { gid, persona: uid, si }).then(ok),
    sacarMiembro: (gid, uid) => sb.rpc('sacar_miembro', { gid, persona: uid }).then(ok),
    compartirUbicacion: (gid, p, minutos) => sb.rpc('compartir_ubicacion', { gid, lat: p.lat, lng: p.lng, precision_m: p.acc == null ? null : p.acc, minutos: minutos || null }).then(ok),
    dejarDeCompartir: (gid) => sb.rpc('dejar_de_compartir', { gid }).then(ok),
    borrarLoMio: (gid) => sb.rpc('borrar_lo_mio', { gid }).then(ok),
    votarBorrado: (gid, si) => sb.rpc('votar_borrado', { gid, si }).then(ok),
    eliminarPorInactividad: (gid) => sb.rpc('eliminar_por_inactividad', { gid }).then(ok),
    puntoPrincipal: (pid) => sb.rpc('punto_principal', { pid }).then(ok),
    addPunto: (p) => sb.from('meeting_points').insert(p).then(ok),
    delPunto: (id) => sb.from('meeting_points').delete().eq('id', id).then(ok),
    addEstado: (x) => sb.from('group_status').insert(x).then(ok),
    addMira: (m) => sb.from('group_marks').insert(m).then(ok),
    delMira: (id) => sb.from('group_marks').delete().eq('id', id).then(ok),
    fotosPorBorrar: () => sb.from('fotos_por_borrar').select('id, path').limit(200).then(ok),
    quitarFotosPorBorrar: (ids) => sb.from('fotos_por_borrar').delete().in('id', ids).then(ok),
    // Notificaciones
    pushPrefs: () => sb.from('push_prefs').select('*').maybeSingle().then(ok),
    guardarPushPrefs: (uid, p) => sb.from('push_prefs').upsert(Object.assign({ user_id: uid }, p)).then(ok),
    registrarPush: (x) => sb.rpc('registrar_push', { p_endpoint: x.endpoint, p_p256dh: x.p256dh, p_auth: x.auth }).then(ok),
    quitarPush: (endpoint) => sb.rpc('quitar_push', { p_endpoint: endpoint }).then(ok),
    appActiva: (si) => sb.rpc('app_activa', { si }).then(ok),
    async llavePush() {
      const r = await fetch(C.PUSH_FUNCION, { method: 'GET' });
      if (!r.ok) throw new Error('PUSH_NO_LISTO');
      const j = await r.json(); if (!j || !j.publica) throw new Error('PUSH_NO_LISTO');
      return j.publica;
    },
    // Respaldo: además de la base de datos, la app pide a la función que envíe lo pendiente
    dispararPush: () => fetch(C.PUSH_FUNCION, { method: 'POST' }).then(() => null).catch(() => null),
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
  cache: new Map(), feed: [], feedFin: false, coleccionCat: null, grupo: null, colAbierta: false,
  map: null, capa: null, yo: null, mini: null, arrancando: false,
  mutes: [], avisos: [], avisosVistos: new Set(), avisosListo: false
};
// Un hallazgo heredado llega sin colección: se ve con "?" hasta que su nueva dueña elija una
function sinColeccion(c) {
  if (c && !c.category_id && !c.group_id && !c.cat_icon) Object.assign(c, { cat_name: '?', cat_icon: 'question-mark', cat_color: C.COLOR_SIN_COLECCION });
  return c;
}
const guarda = (arr) => { (arr || []).forEach((c) => S.cache.set(c.id, sinColeccion(c))); return arr || []; };
const foto = (c, mini) => api.photoUrl(mini ? (c.thumb || c.photo) : (c.photo || c.thumb));
const miGrupo = (gid) => S.groups.find((g) => g.id === gid);
const esEncuentro = (g) => !!(g && g.tipo === 'encuentro');
const gruposColeccion = () => S.groups.filter((g) => !esEncuentro(g));
const puedoReencontrar = (c) => c.user_id === S.user.id || (c.group_id && !!miGrupo(c.group_id));
// Opciones de consulta según el filtro elegido (mapa y muro)
function opcionesFiltro(f) {
  if (f.modo === 'mios') return { uid: S.user.id };
  if (f.modo === 'cat') return { uid: S.user.id, cat: f.id };
  if (f.modo === 'siguiendo') return { uids: [...S.following], comunidad: true, sinSilenciados: true };
  if (f.modo === 'grupo') return { group: f.id };
  return { comunidad: true, sinSilenciados: true };
}

/* ---------------------------------------------------------------------
   3. JUEGO: logros a partir de las estadísticas
   --------------------------------------------------------------------- */
function logros(st) {
  const L = [];
  if (!st) return L;
  (st.categorias || []).forEach((c) => C.METAS_CATEGORIA.forEach((m) => L.push({
    k: `cat:${c.id}:${m}`, on: c.total >= m, m, v: c.total, icon: okIcon(c.icon), color: okColor(c.color), titulo: c.name, tipo: 'cat', cat: c.id })));
  (st.premios_grupos || []).forEach((g) => C.METAS_CATEGORIA.forEach((m) => L.push({
    k: `grupo:${g.id}:${m}`, on: g.total >= m, m, v: g.total, icon: okIcon(g.icon), color: okColor(g.color), titulo: g.name, tipo: 'grupo', grupo: g.id })));
  const nCol = (st.colonias || []).length;
  C.METAS_COLONIAS.forEach((m) => L.push({ k: 'col:' + m, on: nCol >= m, m, v: nCol, icon: 'map-pin', color: C.COLORES.oliva, titulo: C.TITULOS_MEDALLAS.col, tipo: 'col' }));
  C.METAS_RACHA_SEMANAS.forEach((m) => L.push({ k: 'racha:' + m, on: (st.racha_mejor || 0) >= m, m, v: st.racha_mejor || 0, icon: 'flame', color: C.COLORES.terracota, titulo: C.TITULOS_MEDALLAS.racha, tipo: 'racha' }));
  C.METAS_REENCUENTROS.forEach((m) => L.push({ k: 'reen:' + m, on: (st.reencuentros || 0) >= m, m, v: st.reencuentros || 0, icon: 'repeat', color: '#3F6E73', titulo: C.TITULOS_MEDALLAS.reen, tipo: 'reen' }));
  return L;
}
function novedades(antes, despues) {
  const ya = new Set(logros(antes).filter((l) => l.on).map((l) => l.k));
  const nuevos = logros(despues).filter((l) => l.on && !ya.has(l.k));
  const limA = (antes && antes.limite_categorias) || C.MAX_CATEGORIAS, limD = (despues && despues.limite_categorias) || limA;
  const colecciones = limD > limA ? limD : null;
  const colAntes = new Set(((antes && antes.colonias) || []).map((c) => c.colonia));
  const colonias = ((despues && despues.colonias) || []).map((c) => c.colonia).filter((c) => !colAntes.has(c));
  const records = [];
  if (antes && despues && despues.mejor_dia && (!antes.mejor_dia || despues.mejor_dia.n > antes.mejor_dia.n) && despues.mejor_dia.n > 1)
    records.push({ icon: 'calendar', texto: `Récord: ${despues.mejor_dia.n} en un día` });
  return { nuevos, colonias, records, colecciones };
}
const premioDe = (l) => ((l.tipo === 'cat' || l.tipo === 'grupo') ? C.PREMIOS[l.m] : null);
function textoMedalla(l) {
  const unidad = l.tipo === 'racha' ? ' semanas' : '';
  const pr = premioDe(l);
  if (pr) return l.on ? `${l.titulo}: meta de ${l.m} lograda · Premio: ${pr.nombre}` : `${l.titulo}: ${l.v} de ${l.m} · Hay un premio`;
  return l.on ? `${l.titulo}: meta de ${l.m}${unidad} lograda` : `${l.titulo}: ${l.v} de ${l.m}${unidad}`;
}
function medalla(l) {
  return `<button class="medal ${l.on ? '' : 'off'}" data-act="medalla" data-info="${esc(textoMedalla(l))}" data-icon="${esc(l.icon)}" aria-label="${esc(textoMedalla(l))}">
    <span class="m" style="background:${l.color}">${ic(l.icon)}${premioDe(l) ? `<span class="regalo">${ic('gift')}</span>` : ''}</span><span>${l.m}</span></button>`;
}

/* ---------------------------------------------------------------------
   4. HOJAS, CONFIRMACIONES Y AVISOS
   --------------------------------------------------------------------- */
const pila = [];
function abrirHoja(render, after, tipo, fija) { pila.push({ render, after, tipo, fija }); dibujarHoja(); }
function dibujarHoja() {
  if (S.mini) { S.mini.remove(); S.mini = null; }
  const root = $('#sheet-root');
  if (!pila.length) { soltarFoco(root); root.innerHTML = ''; return; }
  const top = pila[pila.length - 1];
  const antes = $('.sheet', root), arriba = antes && dibujarHoja.ultima === top ? antes.scrollTop : 0;
  // La animación de entrada solo al abrir una hoja nueva; al volver a dibujar la misma, nada se mueve (evita el parpadeo)
  const nueva = dibujarHoja.ultima !== top || !antes;
  soltarFoco(root);
  root.innerHTML = `<div class="overlay" data-act="fondo"><div class="sheet${nueva ? ' entra' : ''}${top.tipo === 'registro' ? ' alta' : ''}" role="dialog" aria-modal="true">${top.render()}</div></div>`;
  dibujarHoja.ultima = top;
  liberarTexto();
  const hoja = $('.sheet', root);
  crecerTextos(hoja); mostrarElegido(hoja);
  if (arriba) hoja.scrollTop = arriba;
  if (top.after) top.after(hoja);
}
// En el iPhone (app instalada), si un campo con el teclado abierto se borra de la pantalla al redibujar,
// el teclado puede quedarse trabado y ya no abrir en ningún campo. Antes de redibujar se suelta el campo.
function soltarFoco(raiz) {
  const a = document.activeElement;
  if (a && a !== document.body && raiz && raiz.contains(a) && typeof a.blur === 'function') { try { a.blur(); } catch (e) { /* nada */ } }
}
// Ningún bloqueo de selección (del mapa u otro) debe llegar a los campos de texto
window.addEventListener('selectstart', (ev) => {
  const t = ev.target && ev.target.nodeType === 1 ? ev.target : ev.target && ev.target.parentElement;
  if (t && t.closest && t.closest('input, textarea, [contenteditable]')) ev.stopImmediatePropagation();
}, true);
// El mapa bloquea la selección de texto mientras se arrastra y en iPhone a veces no la libera,
// lo que impide escribir en los campos. Se libera siempre que aparece una hoja.
function liberarTexto() {
  try { if (window.L && L.DomUtil) { L.DomUtil.enableTextSelection(); L.DomUtil.enableImageDrag(); } } catch (e) { /* nada */ }
  const h = document.documentElement.style; if (h.userSelect === 'none' || h.webkitUserSelect === 'none') { h.userSelect = ''; h.webkitUserSelect = ''; }
}
document.addEventListener('focusin', (ev) => { if (ev.target.matches && ev.target.matches('input, textarea')) liberarTexto(); });
// Se libera también al tocar el campo, antes de que el iPhone decida si abre el teclado
document.addEventListener('touchstart', (ev) => { if (ev.target.closest && ev.target.closest('input, textarea')) liberarTexto(); }, { capture: true, passive: true });
// Las notas empiezan en un renglón y crecen con el texto
function crecer(t) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight + 2, 220) + 'px'; }
function crecerTextos(raiz) { if (raiz) $$('textarea.crece', raiz).forEach((t) => { if (t.value) crecer(t); }); }
document.addEventListener('input', (ev) => { if (ev.target.matches && ev.target.matches('textarea.crece')) crecer(ev.target); });
// En las filas que se deslizan, la opción elegida queda a la vista
function mostrarElegido(raiz) {
  if (!raiz) return;
  $$('.chips.una-fila', raiz).forEach((f) => { const b = $('.on', f); if (b && f.scrollWidth > f.clientWidth) f.scrollLeft = Math.max(0, b.offsetLeft - f.offsetLeft - 12); });
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
const fallo = (e) => {
  console.error(e);
  const texto = mensajeError(e);
  S.ultimoError = { codigo: codigoError(e), texto, detalle: errTexto(e).slice(0, 300), cuando: new Date().toISOString() };
  aviso(texto, 'alert-triangle');
};
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
    visto = false;
    if (ev.target.closest('input, textarea, select')) return;
    const el = ev.target.closest('[data-tip]');
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
// Destino de la cámara: una fila con tus colecciones y otra con tus grupos (primero los de encuentro); las dos se deslizan
function selectorDestino(actual) {
  const chip = (v, color, icon, nombre, despues = '') => `<button type="button" class="chip cc ${v === actual ? 'on' : ''}" style="--c:${okColor(color)}" data-act="elegir" data-v="${v}">${ic(icon)}${esc(nombre)}${despues}</button>`;
  const grupos = [...gruposEncuentro().map((g) => chip('g:' + g.id, g.color, 'lifebuoy', g.name)),
    ...gruposColeccion().map((g) => chip('g:' + g.id, g.color, g.icon, g.name, ic('users')))];
  // Cada fila empieza con un ícono pequeño que dice qué es (colecciones o grupos), sin ocupar un renglón aparte
  return `<div class="dest-filas" data-pick="dest">
    <div class="dest-fila"><span class="dest-et" data-tip="${esc(C.DEST_COLECCIONES)}" aria-label="${esc(C.DEST_COLECCIONES)}">${ic('cards')}</span>
      <div class="chips una-fila">${S.cats.map((c) => chip('c:' + c.id, c.color, c.icon, c.name)).join('')}</div></div>
    ${grupos.length ? `<div class="dest-fila"><span class="dest-et" data-tip="${esc(C.DEST_GRUPOS)}" aria-label="${esc(C.DEST_GRUPOS)}">${ic('users')}</span>
      <div class="chips una-fila">${grupos.join('')}</div></div>` : ''}</div>`;
}
// ¿El destino elegido es un grupo de encuentro? Ahí la foto se guarda como "Mira esto" o como punto de encuentro
const destEncuentro = (d = R.dest) => !!(d && d.startsWith('g:') && esEncuentro(miGrupo(d.slice(2))));
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
  let vivo = true; m.on('unload', () => { vivo = false; });
  return { mover(p) { if (!vivo || m.removed) return; try { mk.setLatLng([p.lat, p.lng]); m.setView([p.lat, p.lng], 17); } catch (e) { /* el mapa ya se cerró */ } } };
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
/* Premios en el pin: patito (10), brote (25), aro de oro con brillo (50), corona (100),
   corona mayor y destellos (250), sombrero vaquero (500). Solo dibujo, sin imágenes. */
const TINTA = '#2E2A26';
const colorPremio = (k) => C.COLORES_PREMIO[k] || C.COLORES_PREMIO.oro;
const trazoPremio = (k) => (k === 'negro' ? '#6B635A' : TINTA);
function svgPremio(id, k) {
  const c = colorPremio(k), o = trazoPremio(k);
  const joya = k === 'negro' ? '#FFC21A' : k === 'oro' ? '#FF5A3C' : '#FFF3B0';
  if (id === 'patito') return `<svg viewBox="0 0 40 30" width="30" height="23" aria-hidden="true"><ellipse cx="23" cy="20" rx="14" ry="8" fill="#FFD23F" stroke="${TINTA}" stroke-width="2"/><path d="M34 16 L39 9 L37 21 Z" fill="#FFD23F" stroke="${TINTA}" stroke-width="2" stroke-linejoin="round"/><circle cx="13" cy="10" r="7" fill="#FFD23F" stroke="${TINTA}" stroke-width="2"/><path d="M6.5 9 L1 11.5 L6.5 14 Z" fill="#FF8A1F" stroke="${TINTA}" stroke-width="1.5" stroke-linejoin="round"/><circle cx="11" cy="8.5" r="1.4" fill="${TINTA}"/><path d="M18 19 Q23 23.5 29 19" fill="none" stroke="${TINTA}" stroke-width="1.5"/></svg>`;
  if (id === 'brote') return `<svg viewBox="0 0 40 32" width="28" height="22" aria-hidden="true"><path d="M20 29 V14" stroke="#4E7D2E" stroke-width="3"/><ellipse cx="11" cy="13" rx="9" ry="5" fill="#7DB83A" stroke="${TINTA}" stroke-width="2" transform="rotate(-15 11 13)"/><ellipse cx="29" cy="9" rx="10" ry="5.5" fill="#7DB83A" stroke="${TINTA}" stroke-width="2" transform="rotate(-10 29 9)"/><ellipse cx="20" cy="29" rx="8" ry="2.6" fill="#8A5A44" stroke="${TINTA}" stroke-width="1.5"/></svg>`;
  if (id === 'corona') return `<svg viewBox="0 0 40 30" width="26" height="20" aria-hidden="true"><path d="M5 26 V10 L13 18 L20 5 L27 18 L35 10 V26 Z" fill="${c}" stroke="${o}" stroke-width="2.5" stroke-linejoin="round"/><circle cx="5" cy="8" r="3" fill="${c}" stroke="${o}" stroke-width="2"/><circle cx="20" cy="4" r="3" fill="${c}" stroke="${o}" stroke-width="2"/><circle cx="35" cy="8" r="3" fill="${c}" stroke="${o}" stroke-width="2"/></svg>`;
  if (id === 'corona2') return `<svg viewBox="0 0 56 40" width="38" height="27" aria-hidden="true"><path d="M5 30 V9 L14 21 L21 5 L28 19 L35 5 L42 21 L51 9 V30 Z" fill="${c}" stroke="${o}" stroke-width="2.5" stroke-linejoin="round"/><rect x="5" y="28" width="46" height="9" fill="${c}" stroke="${o}" stroke-width="2.5"/><circle cx="17" cy="32.5" r="2.6" fill="${joya}" stroke="${o}" stroke-width="1.5"/><circle cx="28" cy="32.5" r="3.6" fill="${joya}" stroke="${o}" stroke-width="1.5"/><circle cx="39" cy="32.5" r="2.6" fill="${joya}" stroke="${o}" stroke-width="1.5"/><circle cx="5" cy="8" r="3" fill="${joya}" stroke="${o}" stroke-width="1.5"/><circle cx="21" cy="4" r="3" fill="${joya}" stroke="${o}" stroke-width="1.5"/><circle cx="35" cy="4" r="3" fill="${joya}" stroke="${o}" stroke-width="1.5"/><circle cx="51" cy="8" r="3" fill="${joya}" stroke="${o}" stroke-width="1.5"/></svg>`;
  if (id === 'sombrero') return `<svg viewBox="0 0 70 34" width="44" height="22" aria-hidden="true"><path d="M20 24 L18 8 Q24 2 30 6 Q35 9 40 6 Q46 2 52 8 L50 24 Z" fill="${c}" stroke="${o}" stroke-width="2.5" stroke-linejoin="round"/><path d="M19 18 H51" stroke="${k === 'negro' ? '#F3EBDD' : TINTA}" stroke-width="3"/><path d="M2 14 Q8 26 35 27 Q62 26 68 14 Q66 30 35 32 Q4 30 2 14 Z" fill="${c}" stroke="${o}" stroke-width="2.5" stroke-linejoin="round"/></svg>`;
  return '';
}
const DESTELLO = (t) => `<svg viewBox="0 0 20 20" width="${t}" height="${t}" aria-hidden="true"><path d="M10 0 L12.5 7.5 L20 10 L12.5 12.5 L10 20 L7.5 12.5 L0 10 L7.5 7.5 Z" fill="#FFFFFF" stroke="${TINTA}" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
const BRILLO = `<svg viewBox="0 0 20 20" width="11" height="11" aria-hidden="true"><path d="M10 0 L12.5 7.5 L20 10 L12.5 12.5 L10 20 L7.5 12.5 L0 10 L7.5 7.5 Z" fill="#FFD84D" stroke="${TINTA}" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
function nivelPremio(n) { return [500, 250, 100, 50, 25, 10].find((m) => n >= m) || 0; }
// HTML del pin con su premio (también se usa grande en las celebraciones)
function pinHTML(color, icono, nivel, colorK, pinCls) {
  const n = nivelPremio(nivel || 0);
  const arriba = n >= 500 ? 'sombrero' : n >= 250 ? 'corona2' : n >= 100 ? 'corona' : n >= 50 ? '' : n >= 25 ? 'brote' : n >= 10 ? 'patito' : '';
  return `<div class="pinw ${n >= 50 ? 'con-aro' : ''}">
    <div class="pin ${n >= 50 ? 'aro' : ''} ${pinCls || ''}" style="background:${okColor(color)}">${ic(icono)}</div>
    ${n >= 50 ? `<span class="brillo">${BRILLO}</span>` : ''}
    ${arriba ? `<span class="premio p-${arriba}">${svgPremio(arriba, colorK)}</span>` : ''}
    ${n >= 250 ? `<span class="destellos"><i>${DESTELLO(14)}</i><i>${DESTELLO(9)}</i></span>` : ''}</div>`;
}
function pinIcono(c) {
  const n = c.premio_nivel || 0;
  const tenue = atenuado(c) ? 'tenue' : '';   // varias personas dicen que ya no está: se atenúa, nunca desaparece
  const base = `<div class="pin ${c.is_private ? 'priv' : ''} ${tenue} ${c.id === S.nuevoId ? 'cae' : ''}" style="background:${okColor(c.cat_color)}">${ic(c.cat_icon)}</div>`;
  return L.divIcon({ className: '', iconSize: [36, 36], iconAnchor: [18, 36],
    html: n >= 10 ? pinHTML(c.cat_color, c.cat_icon, n, c.premio_color, `${c.is_private ? 'priv' : ''} ${tenue} ${c.id === S.nuevoId ? 'cae' : ''}`) : base });
}
function crearMapa() {
  document.documentElement.style.setProperty('--map-filter', C.MAPA_FILTRO);
  S.map = L.map('map', { zoomControl: false }).setView(C.MAPA_CENTRO, C.MAPA_ZOOM);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(S.map);
  S.capa = L.layerGroup().addTo(S.map);
  S.capaEnc = L.layerGroup().addTo(S.map);   // lo del grupo de encuentro activo (modo grupo)
  let t; S.map.on('moveend', () => { clearTimeout(t); t = setTimeout(cargarPines, 250); });
  getPos().then((p) => { ponerYo(p); if (!S.grupo) S.map.setView([p.lat, p.lng], 16); }).catch(() => cargarPines());
  // el grupo que quedó activo la última vez vuelve a abrirse en el mapa
  const g = leerGrupoMapa(); if (g && miGrupo(g) && esEncuentro(miGrupo(g))) abrirEncuentro(g); else if (g) recordarGrupoMapa(null);
}
function ponerYo(p) {
  if (!S.map) return;
  if (!S.yo) S.yo = L.marker([p.lat, p.lng], { interactive: false, icon: L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }) }).addTo(S.map);
  else S.yo.setLatLng([p.lat, p.lng]);
}
/* Instalar la app en el teléfono
   Android (Chrome, Edge, Samsung): botón de un toque con el aviso del propio navegador.
   iPhone: Apple no permite instalar con un toque; se muestran los dos pasos (Compartir → Agregar a inicio).
   Navegador dentro de WhatsApp, Instagram o Facebook: no permite instalar; se pide abrir la liga en el navegador. */
let eventoInstalar = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); eventoInstalar = e; pintarInstalar(); });
window.addEventListener('appinstalled', () => { eventoInstalar = null; noMostrarInstalar(); pintarInstalar(); aviso(C.INSTALAR_LISTO, 'device-mobile'); });
const yaInstalada = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
function tipoInstalacion() {
  if (yaInstalada()) return null;
  const ua = navigator.userAgent || '';
  if (/FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Line\/|TikTok|Snapchat/i.test(ua)) return 'interno';
  if (eventoInstalar) return 'boton';
  if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'iphone';
  if (/Android/.test(ua)) return 'menu';
  return null; // en computadora no se ofrece
}
const instalarDescartado = () => { try { return !!localStorage.getItem('cg_instalar_no'); } catch (e) { return false; } };
const noMostrarInstalar = () => { try { localStorage.setItem('cg_instalar_no', '1'); } catch (e) { /* nada */ } };
// Tarjeta de la entrada, botón del perfil y franja del mapa (una sola vez, se puede cerrar)
function pintarInstalar() {
  const t = tipoInstalacion();
  $$('[data-instalar]').forEach((el) => {
    el.innerHTML = t ? `<button class="btn alt block" data-act="instalar">${ic('device-mobile')} ${esc(C.INSTALAR_BOTON)}</button>` : '';
  });
  const fr = $('#instalar-franja');
  if (fr) fr.hidden = !t || instalarDescartado();
  $$('[data-act="instalar"].ib').forEach((b) => { b.hidden = !t; });
}
async function instalarApp() {
  const t = tipoInstalacion();
  if (t === 'boton' && eventoInstalar) {
    const e = eventoInstalar; eventoInstalar = null;
    try { await e.prompt(); const r = await e.userChoice; if (r && r.outcome === 'accepted') noMostrarInstalar(); }
    catch (err) { console.error(err); }
    return pintarInstalar();
  }
  const pasos = t === 'iphone' ? C.INSTALAR_IPHONE : t === 'interno' ? C.INSTALAR_INTERNO : C.INSTALAR_MENU;
  abrirHoja(() => `${cabeza(`${ic('device-mobile')} ${esc(C.INSTALAR_BOTON)}`)}
    <ol class="pasos-instalar">${pasos.map((x) => `<li><span class="gicon">${ic(x.icono)}</span><span>${esc(x.texto)}</span></li>`).join('')}</ol>
    ${t === 'interno' ? `<button class="btn block" data-act="copiar_liga">${ic('copy')} ${esc(C.INSTALAR_COPIAR)}</button>` : ''}`, null, 'instalar');
}

/* "¡Lo vi!" (reacción "eye"): solo se marca estando en el lugar. La ubicación se usa para medir y no se guarda. */
async function marcarVisto(btn, c) {
  ocupado(btn, true);
  let p;
  try { p = await getPos(); } catch (e) { ocupado(btn, false); return aviso(C.VISTO_SIN_GPS, 'current-location'); }
  try {
    const r = await api.marcarVisto(c.id, p);
    ocupado(btn, false);
    if (r && r.ok) {
      const rs = Object.assign({}, c.reactions || {}); rs.eye = (rs.eye || 0) + 1;
      guarda([Object.assign({}, c, { reactions: rs, my_reactions: (c.my_reactions || []).concat('eye'), ausencias: 0 })]);
      refrescarFicha(c.id);
      $$(`[data-act="reaccion"][data-id="${c.id}"][data-v="eye"]`).forEach((x) => x.classList.add('visto-ok'));
      return ofrecerFotoCol(c, 'visto', C.VISTO_OK);
    }
    const lejos = r && r.motivo === 'lejos';
    abrirHoja(() => `${cabeza(`${ic('eye-check')} ${esc(C.AYUDA.visto)}`)}
      <p>${esc(lejos ? C.VISTO_LEJOS.replace('{d}', metros(r.distancia)) : C.VISTO_APROXIMADA)}</p>
      ${lejos ? `<button class="btn block" data-act="ir_al_punto" data-id="${c.id}">${ic('navigation')} ${esc(C.AYUDA.ir_al_punto)}</button>`
        : `<button class="btn alt block" data-act="info_precision" data-acc="${p.acc || ''}">${ic('current-location')} ${esc(C.PRECISION_TITULO)}</button>`}`, null, 'visto');
  } catch (e) { ocupado(btn, false); fallo(e); }
}

/* "¡Ya no está!": también solo estando en el lugar. Con 2 personas el marcador se atenúa;
   un "¡Lo vi!" o un reencuentro lo devuelve a normal. La ubicación se usa para medir y no se guarda. */
async function marcarAusencia(btn, c) {
  ocupado(btn, true);
  let p;
  try { p = await getPos(); } catch (e) { ocupado(btn, false); return aviso(C.AUSENCIA_SIN_GPS, 'current-location'); }
  try {
    const r = await api.marcarAusencia(c.id, p);
    ocupado(btn, false);
    if (r && r.ok) {
      guarda([Object.assign({}, S.cache.get(c.id) || c, { ausencias: r.ausencias != null ? r.ausencias : (c.ausencias || 0) + 1 })]);
      if (fichaH && fichaH.id === c.id) fichaH.cargar();
      refrescarFicha(c.id);
      if (S.tab === 'map') cargarPines();
      return ofrecerFotoCol(c, 'no_esta', C.AUSENCIA_OK);
    }
    const lejos = r && r.motivo === 'lejos';
    abrirHoja(() => `${cabeza(`${ic('map-pin-off')} ${esc(C.AYUDA.ausencia)}`)}
      <p>${esc(lejos ? C.AUSENCIA_LEJOS.replace('{d}', metros(r.distancia)) : C.AUSENCIA_APROXIMADA)}</p>
      ${lejos ? `<button class="btn block" data-act="ir_al_punto" data-id="${c.id}">${ic('navigation')} ${esc(C.AYUDA.ir_al_punto)}</button>`
        : `<button class="btn alt block" data-act="info_precision" data-acc="${p.acc || ''}">${ic('current-location')} ${esc(C.PRECISION_TITULO)}</button>`}`, null, 'visto');
  } catch (e) { ocupado(btn, false); fallo(e); }
}
const atenuado = (c) => (c.ausencias || 0) >= C.AUSENCIAS_ATENUAR;

/* Fotos de la comunidad: al marcar "Lo vi" o "No está" estando en el lugar se puede sumar una foto de ese día.
   Una por persona en cada hallazgo, cada semana. Se guarda con la ubicación del hallazgo, no la del teléfono. */
const K = {};
async function ofrecerFotoCol(c, tipo, textoOk) {
  let puede = false;
  if (!c.is_private && navigator.onLine) {
    // Si la pregunta falla se dice por qué (antes se ocultaba y solo quedaba el mensaje corto)
    try { puede = await api.puedoColaborar(c.id); } catch (e) { aviso(textoOk, tipo === 'visto' ? 'eye-check' : 'map-pin-off'); return fallo(e); }
  }
  if (!puede) return aviso(textoOk, tipo === 'visto' ? 'eye-check' : 'map-pin-off');
  abrirCol(c, tipo);
}
function abrirCol(c, tipo) {
  limpiarCol();
  Object.assign(K, { fid: c.id, tipo, foto: null, enc: null, vistaUrl: null, nota: '' });
  abrirHoja(colHTML, montarCol, 'colaborar');
}
async function alternarReaccion(c, tipo, mia) {
  const r = Object.assign({}, c.reactions || {});
  r[tipo] = Math.max(0, (r[tipo] || 0) + (mia ? -1 : 1));
  const nueva = Object.assign({}, c, { reactions: r, my_reactions: mia ? c.my_reactions.filter((x) => x !== tipo) : (c.my_reactions || []).concat(tipo) });
  guarda([nueva]); refrescarFicha(c.id);
  try { await api.react(c.id, tipo, !mia, S.user.id); }
  catch (e) { guarda([c]); refrescarFicha(c.id); fallo(e); }
}
// "Lo vi" ya marcado: sumar la foto de hoy o quitar la marca
function hojaVistoMarcado(c, conFoto) {
  abrirHoja(() => `${cabeza(`${ic('eye-check')} ${esc(C.AYUDA.visto)}`)}
    ${conFoto ? `<p class="tiny" style="margin:0 0 12px">${esc(C.VISTO_MARCADO_TEXTO)}</p>
    <button class="btn block" data-act="visto_sumar_foto" data-id="${c.id}">${ic('camera')} ${esc(C.VISTO_SUMAR_FOTO)}</button>` : ''}
    <button class="btn alt block" data-act="visto_quitar" data-id="${c.id}" style="margin-top:8px">${ic('eye-off')} ${esc(C.VISTO_QUITAR)}</button>`, null, 'visto_marcado');
}
function limpiarCol() {
  if (K.vistaUrl) URL.revokeObjectURL(K.vistaUrl);
  if (K.enc) soltarLienzo(K.enc.img);
  Object.assign(K, { foto: null, enc: null, vistaUrl: null });
}
function colHTML() {
  const visto = K.tipo === 'visto';
  return `${cabeza(`${ic(visto ? 'eye-check' : 'map-pin-off')} ${esc(visto ? C.COL_TITULO_VISTO : C.COL_TITULO_NO_ESTA)}`)}
    <p class="tiny" style="margin:0 0 12px">${esc(visto ? C.COL_TEXTO_VISTO : C.COL_TEXTO_NO_ESTA)}</p>
    <div class="col-foto" style="margin-bottom:12px">
      <label class="ib" data-tip="${esc(C.AYUDA.camara)}" aria-label="${esc(C.AYUDA.camara)}">${ic('camera')}<input type="file" accept="image/*" capture="environment" hidden data-in="foto-col"></label>
      <label class="ib" data-tip="${esc(C.AYUDA.galeria)}" aria-label="${esc(C.AYUDA.galeria)}">${ic('upload')}<input type="file" accept="image/*" hidden data-in="foto-col"></label>
      ${K.foto ? `<button type="button" class="foto-mini" data-act="encuadrar_col" data-tip="${esc(C.AYUDA.encuadrar)}" aria-label="${esc(C.AYUDA.encuadrar)}"><img id="vista-col" src="${K.vistaUrl}" alt=""></button>${ib('quitar_foto_col', 'x', 'quitar_captura', '', 'sm')}` : ''}
    </div>
    <label class="campo-ic">${ic('pencil')}<textarea id="col-nota" class="in compacto crece" rows="1" maxlength="${C.COL_NOTA_MAX}" placeholder="${esc(C.COL_NOTA)}" aria-label="${esc(C.COL_NOTA)}">${esc(K.nota)}</textarea></label>
    <button class="btn block" data-act="col_guardar" style="margin-top:12px">${ic(visto ? 'camera' : 'map-pin-off')} ${esc(visto ? C.COL_GUARDAR_VISTO : C.COL_GUARDAR_NO_ESTA)}</button>
    <button class="btn alt block" data-act="cerrar" style="margin-top:8px">${ic('check')} ${esc(C.COL_SIN_FOTO)}</button>
    <p class="tiny" style="text-align:center">${esc(C.COL_SEMANA)}</p>`;
}
function montarCol(raiz) {
  $$('[data-in="foto-col"]', raiz).forEach((inp) => inp.addEventListener('change', () => inp.files[0] && tomarFotoCol(inp.files[0])));
}
function recordarCol() { const t = $('#col-nota'); if (t) K.nota = t.value; }
async function cuadroCol() {
  const E = K.enc; if (!E) return;
  E.sucio = false;
  const cv = cuadroDe(E, C.FOTO_LADO), b = await lienzoABlob(cv, C.FOTO_CALIDAD, false);
  soltarLienzo(cv);
  if (K.enc !== E) return;
  K.foto = b;
  if (K.vistaUrl) URL.revokeObjectURL(K.vistaUrl);
  K.vistaUrl = URL.createObjectURL(b);
  const v = $('#vista-col'); if (v) v.src = K.vistaUrl;
}
async function tomarFotoCol(file) {
  try {
    recordarCol();
    const img = await cargarImagen(file);
    if (K.enc) soltarLienzo(K.enc.img);
    K.enc = nuevoEncuadre(escalar(img, C.ENCUADRE_FUENTE));
    await cuadroCol();
    dibujarHoja();
    hojaEncuadre(K.enc, async () => { await cuadroCol(); });
  } catch (e) { aviso('No se pudo leer la imagen', 'photo'); }
}
async function guardarCol(btn) {
  recordarCol();
  if (!K.foto) return aviso(C.COL_FALTA_FOTO, 'camera');
  const visto = K.tipo === 'visto';
  ocupado(btn, true);
  if (K.enc && K.enc.sucio) await cuadroCol();
  let p;
  try { p = await getPos(); } catch (e) { ocupado(btn, false); return aviso(visto ? C.VISTO_SIN_GPS : C.AUSENCIA_SIN_GPS, 'current-location'); }
  let sub = null;
  try {
    const fotos = await fotosDe(K.foto);
    sub = await subirFotosDe(fotos, S.user.id);
    const r = await api.colaborar(K.fid, K.tipo, p, sub.pFoto, sub.pMini, (K.nota || '').trim().slice(0, C.COL_NOTA_MAX));
    if (!r || !r.ok) {
      api.removeFiles([sub.pFoto, sub.pMini]).catch(() => null);
      ocupado(btn, false);
      if (r && r.motivo === 'semana') return aviso(C.COL_YA_ESTA_SEMANA, 'calendar');
      if (r && r.motivo === 'lejos') return aviso((visto ? C.VISTO_LEJOS : C.AUSENCIA_LEJOS).replace('{d}', metros(r.distancia)), 'navigation');
      return aviso(visto ? C.VISTO_APROXIMADA : C.AUSENCIA_APROXIMADA, 'current-location');
    }
    const fid = K.fid;
    limpiarCol(); cerrarHoja();
    aviso(visto ? C.COL_LISTO_VISTO : C.COL_LISTO_NO_ESTA, visto ? 'camera' : 'map-pin-off');
    const nueva = await api.card(fid).catch(() => null); if (nueva) guarda([nueva]);
    S.feed = [];
    if (fichaH && fichaH.id === fid) await fichaH.cargar();
    refrescarFicha(fid);
  } catch (e) {
    if (sub && sub.pFoto) api.removeFiles([sub.pFoto, sub.pMini]).catch(() => null);
    ocupado(btn, false); fallo(e);
  }
}
// Quien subió una foto de la comunidad la puede borrar completa (foto y nota)
async function borrarColaboracion(btn, sid, fid) {
  const h = fichaH && (fichaH.lista || []).find((x) => x.id === sid);
  if (!h || h.user_id !== S.user.id) return;
  if (!(await confirmar(C.COL_BORRAR_CONFIRMAR, 'trash', api.photoUrl(h.thumb || h.photo)))) return;
  ocupado(btn, true);
  try {
    const borradas = await api.delSighting(sid);
    if (!borradas || !borradas.length) { ocupado(btn, false); await fichaH.cargar(); refrescarFicha(fid); return aviso(C.COL_YA_NO_ESTA, 'alert-triangle'); }
    await api.removeFiles([h.photo, h.thumb]).catch(() => null);
    const nueva = await api.card(fid).catch(() => null); if (nueva) guarda([nueva]);
    S.feed = []; fichaH.i = 0; await fichaH.cargar(); refrescarFicha(fid);
    aviso(C.COL_BORRADA, 'trash');
  } catch (e) { ocupado(btn, false); fallo(e); }
}
// Quien registró el hallazgo no borra fotos ajenas: las reporta con un motivo y decide la administradora
function hojaReportarColaboracion(sid) {
  const h = fichaH && (fichaH.lista || []).find((x) => x.id === sid); if (!h) return;
  abrirHoja(() => `${cabeza(`${ic('flag')} ${esc(C.COL_REPORTAR)}`)}
    <div class="row" style="gap:12px;margin-bottom:10px"><img class="thumb" src="${api.photoUrl(h.thumb || h.photo)}" alt="" style="width:84px;height:84px">
      <span class="tiny">${esc(C.COL_DE.replace('{n}', h.user_name || ''))} · ${esc(fecha(h.created_at))}</span></div>
    <label class="campo-ic">${ic('pencil')}<textarea id="col-motivo" class="in compacto crece" rows="2" maxlength="200" placeholder="${esc(C.COL_REPORTAR_MOTIVO)}" aria-label="${esc(C.COL_REPORTAR_MOTIVO)}"></textarea></label>
    <p class="tiny">${esc(C.COL_REPORTAR_TEXTO)}</p>
    <button class="btn block" data-act="col_reporte_enviar" data-id="${sid}">${ic('send')} ${esc(C.COL_REPORTAR_ENVIAR)}</button>`, null, 'reportar_col');
}

/* Ir al punto: el mapa de la app lleva hasta un hallazgo. La distancia y la dirección
   se calculan en el teléfono; la ubicación no se envía a ningún servicio de mapas. */
const RUMBOS = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'];
function rumbo(a, b) {
  const r = Math.PI / 180, dl = (b.lng - a.lng) * r;
  const y = Math.sin(dl) * Math.cos(b.lat * r);
  const x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos(dl);
  return RUMBOS[Math.round(((Math.atan2(y, x) / r) + 360) % 360 / 45) % 8];
}
function irAlPunto(c) {
  terminarGuia();
  cerrarTodo(); irA('map');
  const G = S.guia = { c, pin: null, watch: null, pos: null, centrado: false, sinGps: false };
  pintarGuia();
  setTimeout(() => {
    if (S.guia !== G || !S.map) return;
    G.pin = L.marker([c.lat, c.lng], { icon: L.divIcon({ className: '', iconSize: [36, 36], iconAnchor: [18, 36],
      html: `<div class="pin destino" style="background:${okColor(c.cat_color)}">${ic(c.cat_icon)}</div>` }) })
      .on('click', () => (c.act === 'encuentro' ? (terminarGuia(), abrirEncuentro(c.actId)) : abrirFicha(c.id))).addTo(S.map);
    S.map.setView([c.lat, c.lng], 18);
    if (!navigator.geolocation) { G.sinGps = true; return pintarGuia(); }
    G.watch = navigator.geolocation.watchPosition((p) => {
      if (S.guia !== G) return;
      G.pos = { lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) };
      ponerYo(G.pos);
      if (!G.centrado) { G.centrado = true; S.map.fitBounds([[G.pos.lat, G.pos.lng], [c.lat, c.lng]], { padding: [70, 70], maxZoom: 18 }); }
      pintarGuia();
    }, () => { if (S.guia === G) { G.sinGps = true; pintarGuia(); } }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
  }, 60);
}
function pintarGuia() {
  const G = S.guia, el = $('#guia-punto'); if (!el) return;
  if (!G) { el.hidden = true; el.innerHTML = ''; return; }
  const d = G.pos ? distancia(G.pos, G.c) : null;
  const txt = d == null ? (G.sinGps ? C.GUIA_SIN_GPS : C.GUIA_BUSCANDO)
    : d <= C.LLEGADA_METROS ? C.GUIA_LLEGASTE : `${metros(d)} al ${rumbo(G.pos, G.c)}`;
  el.hidden = false;
  el.innerHTML = `<button class="row grow" data-act="${G.c.act || 'ficha'}" data-id="${G.c.actId || G.c.id}" style="text-align:left;min-width:0">
      <span class="avatar" style="background:${okColor(G.c.cat_color)}">${ic(G.c.cat_icon)}</span>
      <span class="grow" style="min-width:0"><b class="guia-nombre">${esc(G.c.name)}</b><span class="guia-dist">${ic('navigation')} ${esc(txt)}</span></span></button>
    ${ib('cerrar_guia', 'x', 'cerrar', '', 'sm')}`;
}
function terminarGuia() {
  const G = S.guia; if (!G) return;
  if (G.watch != null && navigator.geolocation) navigator.geolocation.clearWatch(G.watch);
  if (G.pin && S.map) { if (S.map.removeLayer) S.map.removeLayer(G.pin); else if (G.pin.el) G.pin.el.remove(); }
  S.guia = null; pintarGuia();
}

async function cargarPines() {
  if (!S.map) return;
  // En modo grupo solo se ve lo del grupo de encuentro
  if (S.grupo) { if (S.capa) S.capa.clearLayers(); return; }
  const b = S.map.getBounds().pad(0.3);
  const caja = { s: b.getSouth(), n: b.getNorth(), w: b.getWest(), e: b.getEast() };
  try {
    const lista = guarda(await api.cardsInBox(caja, opcionesFiltro(S.filtro)));
    if (S.grupo) return;   // se entró al modo grupo mientras llegaban
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
    ${conPropios ? S.cats.map((c) => chipColor(act, 'cat:' + c.id, c.name, c.icon, c.color, !!on('cat', c.id))).join('') : ''}
    ${gruposColeccion().map((g) => chipColor(act, 'grupo:' + g.id, g.name, g.icon, g.color, !!on('grupo', g.id), ic('users'))).join('')}`;
}
// Botón de colección o grupo: el ícono va en el color de su colección; elegido, el botón entero toma ese color
function chipColor(act, v, nombre, icono, color, elegido, despues = '', attrs = '') {
  return `<button type="button" class="chip cc ${elegido ? 'on' : ''}" style="--c:${okColor(color)}" data-act="${act}" data-v="${v}" ${attrs}>${ic(icono)}${esc(nombre)}${despues}</button>`;
}
/* Mapa: fila 1 se desliza (grupos de encuentro, que abren el modo grupo; colecciones y grupos); fila 2 fija (todo, lo mío, a quien sigo | buzón, ayuda, preguntas) */
function chipsMapa() {
  const f = S.filtro, on = (m, id) => f.modo === m && f.id === id;
  return `${gruposEncuentro().map((g) => `<button type="button" class="chip cc capa" style="--c:${okColor(g.color)}" data-act="grupo_mapa" data-id="${g.id}"
      data-tip="${esc(C.AYUDA.capa_encuentro)}">${ic('lifebuoy')}${esc(g.name)}</button>`).join('')}
    ${S.cats.map((c) => chipColor('filtro', 'cat:' + c.id, c.name, c.icon, c.color, on('cat', c.id))).join('')}
    ${gruposColeccion().map((g) => chipColor('filtro', 'grupo:' + g.id, g.name, g.icon, g.color, on('grupo', g.id), ic('users'))).join('')}`;
}
function filtrosFijos() {
  const b = (v, icono, k) => `<button class="ib sm ${S.filtro.modo === v ? 'sel' : ''}" data-act="filtro" data-v="${v}" data-tip="${esc(C.AYUDA[k])}" aria-label="${esc(C.AYUDA[k])}" aria-pressed="${S.filtro.modo === v}">${ic(icono)}</button>`;
  return b('todos', 'world', 'filtro_todos') + b('mios', S.me.avatar, 'filtro_mios') + b('siguiendo', 'user-check', 'filtro_siguiendo');
}
function pintarFiltrosMapa() {
  const a = $('#chips-mapa'), b = $('#filtros-fijos');
  if (a) { const x = a.scrollLeft; a.innerHTML = chipsMapa(); a.scrollLeft = x; }
  if (b) b.innerHTML = filtrosFijos();
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
      <div class="map-top">
        <div class="grupo-cab" id="grupo-cab" hidden></div>
        <div class="chips" id="chips-mapa">${chipsMapa()}</div>
        <div class="map-fila2"><span class="grupo-ib" id="filtros-fijos">${filtrosFijos()}</span>
          <span class="grupo-ib">${ib('avisos', 'mail-heart', 'avisos', 'data-campana', 'sm')}<span id="atajo-ayuda" class="atajo-ayuda">${gruposEncuentro().length ? botonAyuda() : ''}</span>${ib('dudas', 'help', 'dudas', '', 'sm')}</span></div>
      </div>
      <div class="map-side">${ib('ubicar', 'current-location', 'ubicar')}${ib('cerca', 'walk', 'cerca')}</div>
      <div class="panel-grupo" id="panel-grupo" hidden></div>
      <div id="guia-punto" class="guia-punto" hidden></div>
      <div id="instalar-franja" class="instalar-franja" hidden><button class="row grow" data-act="instalar" style="text-align:left">${ic('device-mobile')}<span class="grow">${esc(C.INSTALAR_FRANJA)}</span></button>${ib('instalar_no', 'x', 'cerrar', '', 'sm ghost')}</div>
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
  pintarCampana();
  pintarInstalar();
}
function irA(tab) {
  soltarFoco($('#app'));
  if (tab !== 'map') terminarGuia();
  S.tab = tab;
  $$('.nav [data-act="tab"]').forEach((b) => b.classList.toggle('on', b.dataset.v === tab));
  const esMapa = tab === 'map';
  $('#scr-map').hidden = !esMapa; $('#scr').hidden = esMapa;
  if (esMapa) { pintarFiltrosMapa(); setTimeout(() => { S.map.invalidateSize(); cargarPines(); if (S.grupo) S.grupo.cargar(); }, 30); return; }
  $('#scr').scrollTop = 0;
  ({ feed: pintarMuro, coleccion: pintarColeccion, perfil: pintarPerfil })[tab]();
}
function refrescarActual() { if (S.tab === 'map') cargarPines(); else if ($('#scr')) irA(S.tab); }

/* Muro */
function reaccionesHTML(c) {
  const propio = c.user_id === S.user.id;
  // En lo tuyo "No está" es solo un ícono, del tamaño de las reacciones
  const noEsta = puedoMarcarAusencia(c) ? `<button class="react ${propio ? '' : 'con-texto'} ausencia ${atenuado(c) ? 'on' : ''}" data-act="ya_no_esta" data-id="${c.id}" data-tip="${esc(C.AYUDA.ausencia_ayuda)}" aria-label="${esc(C.AYUDA.ausencia_ayuda)}">${ic('map-pin-off')}${propio ? '' : `<span class="react-lbl">${esc(C.AYUDA.ausencia)}</span>`}${c.ausencias ? `<span class="n">${c.ausencias}</span>` : ''}</button>` : '';
  return `<div class="reacts">${C.REACCIONES.map((r) => {
    const n = (c.reactions || {})[r.tipo] || 0, mia = (c.my_reactions || []).includes(r.tipo);
    const cara = `${ic(r.icono)}${r.etiqueta ? `<span class="react-lbl">${esc(r.etiqueta)}</span>` : ''}${n ? `<span class="n">${n}</span>` : ''}`;
    if (propio || c.is_private) return n ? `<span class="react ${r.etiqueta ? 'con-texto fija' : ''}" data-tip="${esc(r.ayuda)}">${cara}</span>` : '';
    return `<button class="react ${r.etiqueta ? 'con-texto' : ''} ${mia ? 'on' : ''}" data-act="reaccion" data-id="${c.id}" data-v="${r.tipo}" data-tip="${esc(r.ayuda)}" aria-label="${esc(r.ayuda)}">${cara}</button>`;
  }).join('')}${noEsta}</div>`;
}
// Foto del muro: la mediana del hallazgo; si no tiene (hallazgos anteriores), la grande. Con MURO_FOTO 'mini', la miniatura.
function fotoMuro(c) {
  if (C.MURO_FOTO === 'mini') return foto(c, true);
  return c.media ? api.photoUrl(c.media) : foto(c);
}
function tarjeta(c) {
  return `<article class="card" data-card="${c.id}">
    <div class="body row"><button class="row grow" data-act="perfil" data-id="${c.user_id}" style="text-align:left">${avatar(c)}<b class="grow">${esc(c.user_name)}</b></button>${etiquetaDe(c)}</div>
    ${c.photo || c.thumb ? `<img class="photo" src="${fotoMuro(c)}" alt="${esc(c.name)}" loading="lazy" data-act="ficha" data-id="${c.id}">` : `<div class="photo" data-act="ficha" data-id="${c.id}" style="display:grid;place-items:center;font-size:60px">${ic(c.cat_icon)}</div>`}
    <div class="body"><div class="row between"><div class="grow"><h3>${esc(c.name)}</h3>
      <div class="row meta-fila"><span class="tiny grow">${c.colonia ? ic('map-pin') + ' ' + esc(c.colonia) + ' · ' : ''}${hace(c.created_at)}${c.sightings_count ? ` · ${ic('repeat')} ${c.sightings_count}` : ''}${c.comments_count ? ` · ${ic('message-circle')} ${c.comments_count}` : ''}</span>
        <button class="ver-mas" data-act="ficha" data-id="${c.id}" aria-label="${esc(C.VER_MAS)}: ${esc(c.name)}">${esc(C.VER_MAS)}${ic('chevron-right')}</button></div></div></div>
      <div style="margin-top:8px">${reaccionesHTML(c)}</div></div></article>`;
}
// Novedad del Muro: un reencuentro con foto nueva
function tarjetaReencuentro(it) {
  const col = it.tipo === 'visto' && it.actor_id !== it.owner_id;
  return `<article class="card novedad ${col ? 'colaboracion' : ''}" data-item="${it.item_id}">
    <div class="body row"><button class="row grow" data-act="perfil" data-id="${it.actor_id}" style="text-align:left">${avatar({ avatar: it.actor_avatar, avatar_color: it.actor_color })}<b class="grow">${esc(it.actor_name)}</b></button>${col ? `<span class="catb col-chip">${ic('users')}${esc(C.COL_ETIQUETA)}</span>` : etiquetaDe(it)}</div>
    <img class="photo" src="${api.photoUrl(C.MURO_FOTO === 'mini' ? (it.thumb || it.photo) : (it.photo || it.thumb))}" alt="${esc(it.name)}" loading="lazy" data-act="ficha" data-id="${it.find_id}" data-s="${it.item_id}">
    <div class="body"><h3>${esc(it.name)}</h3>
      <div class="tiny row">${col ? `${ic('eye-check')} ${esc(C.COL_MURO.replace('{n}', it.actor_name).replace('{d}', it.owner_name || ''))}` : `${ic('repeat')} Visto de nuevo · ${it.vez}ª vez`}${it.colonia ? ` · ${esc(it.colonia)}` : ''} · ${hace(it.at)}</div>
      ${col && it.nota ? `<div class="nota-col">«${esc(it.nota)}»</div>` : ''}
      ${reaccionesReencuentro(it)}</div></article>`;
}
// Las reacciones de un reencuentro son las del hallazgo: las mismas que en su tarjeta y en la ficha
function reaccionesReencuentro(it) {
  const c = S.cache.get(it.find_id);
  return c ? `<div style="margin-top:8px" data-reacts-find="${it.find_id}">${reaccionesHTML(c)}</div>` : '';
}
// Convierte una novedad de tipo "hallazgo" en tarjeta (sin ubicación: la ficha la pide completa)
function cartaDeNovedad(it) {
  return { id: it.find_id, user_id: it.owner_id, user_name: it.actor_name, avatar: it.actor_avatar, avatar_color: it.actor_color,
    name: it.name, cat_name: it.cat_name, cat_icon: it.cat_icon, cat_color: it.cat_color, category_id: it.category_id,
    group_id: it.group_id, group_public: it.group_public, is_private: it.is_private, photo: it.photo, thumb: it.thumb, colonia: it.colonia,
    created_at: it.at, reactions: it.reactions, my_reactions: it.my_reactions, sightings_count: it.sightings_count,
    comments_count: it.comments_count, media: it.media || null, parcial: true };
}
// Un reencuentro del muro sin el hallazgo en memoria: tarjeta parcial sin fotos (solo para reaccionar; la ficha pide la completa)
function cartaDeReencuentro(it) {
  return Object.assign(cartaDeNovedad(it), { user_name: it.owner_name || '', avatar: null, avatar_color: null,
    photo: null, thumb: null, media: null, colonia: null, created_at: null, sinFotos: true });
}
// Una tarjeta guardada con sus fotos (las que vienen de un reencuentro del muro no las traen: se piden completas)
const cartaConFotos = (id) => { const c = S.cache.get(id); return c && !c.sinFotos ? c : null; };
// El Muro carga de 20 en 20: al llegar a la tarjeta 19 del último lote se pide el siguiente (sin botón)
let vigiaMuro = null;
const MURO_LOTE = 20;
async function pintarMuro(masViejo) {
  const scr = $('#scr');
  if (!masViejo) {
    scr.innerHTML = `<div class="row between" style="margin-bottom:10px"><h1 class="serif">Collector Go</h1>
      <div class="row">${ib('avisos', 'mail-heart', 'avisos', 'data-campana')}${ib('tabla', 'trophy', 'tabla')}${ib('refrescar', 'refresh', 'Actualizar')}</div></div>
      <div class="chips" id="chips-muro" style="margin-bottom:12px">${chipsFiltro(S.muro, 'muro_filtro', false)}</div>
      <div class="feed" id="feed"><div class="empty"><span class="spin">${ic('loader-2')}</span></div></div>`;
    S.feed = []; S.feedFin = false;
    pintarCampana();
  } else if (S.feedCargando || S.feedFin) return;
  if (vigiaMuro) { vigiaMuro.disconnect(); vigiaMuro = null; }
  const filtro = S.muro, pedido = (S.muroPedido || 0) + 1; S.muroPedido = pedido;
  S.feedCargando = true;
  const html = (l) => l.map((it) => (it.kind === 'find' ? tarjeta(S.cache.get(it.find_id)) : tarjetaReencuentro(it))).join('');
  try {
    const antes = S.feed.length ? S.feed[S.feed.length - 1].at : null;
    const lote = await api.feed(antes, opcionesFiltro(filtro));
    if (pedido !== S.muroPedido) return; // se cambió el filtro mientras cargaba
    lote.forEach(sinColeccion);
    lote.forEach((it) => {
      const ya = S.cache.get(it.find_id);
      if (it.kind === 'find') S.cache.set(it.find_id, ya && !ya.parcial ? Object.assign({}, ya, { reactions: it.reactions, my_reactions: it.my_reactions }) : cartaDeNovedad(it));
      else if (!ya) S.cache.set(it.find_id, cartaDeReencuentro(it));
    });
    S.feed = S.feed.concat(lote);
    if (lote.length < MURO_LOTE) S.feedFin = true;
    S.feedCargando = false;
    const f = $('#feed'); if (!f) return;
    const vacio = filtro.modo === 'siguiendo'
      ? `<div class="empty">${ic('user-plus')}<p>${esc(C.MURO_SIN_SEGUIR)}</p><button class="btn" data-act="buscar_personas">${ic('search')} ${esc(C.BUSCAR_TITULO)}</button></div>`
      : `<div class="empty">${ic('camera')}<p>Aún no hay hallazgos aquí</p><button class="btn" data-act="nuevo">${ic('camera')}</button></div>`;
    const marca = $('.feed-mas', f);
    if (masViejo && marca) marca.insertAdjacentHTML('beforebegin', html(lote));
    else f.innerHTML = S.feed.length ? html(S.feed) + '<div class="feed-mas"></div>' : vacio;
    vigilarMuro();
  } catch (e) {
    if (pedido !== S.muroPedido) return;
    S.feedCargando = false; fallo(e);
    const m = $('#feed .feed-mas'); if (m) m.innerHTML = ib('mas', 'refresh', 'mas'); // si falla, se puede reintentar a mano
    else if (!S.feed.length && $('#feed')) $('#feed').innerHTML = `<div class="empty">${ic('cloud-off')}<p>${esc(C.MURO_FALLO)}</p>${ib('refrescar', 'refresh', 'refrescar', '', 'on')}</div>`;
  }
}
function vigilarMuro() {
  const f = $('#feed'), marca = f && $('.feed-mas', f);
  if (!marca) return;
  if (S.feedFin) { marca.remove(); return; }
  if (!('IntersectionObserver' in window)) { marca.innerHTML = ib('mas', 'plus', 'mas'); return; }
  marca.innerHTML = `<span class="spin">${ic('loader-2')}</span>`;
  const tarjetas = $$(':scope > article.card', f);
  const objetivo = tarjetas[Math.max(0, tarjetas.length - 2)] || marca;
  vigiaMuro = new IntersectionObserver((es, obs) => {
    if (!es.some((x) => x.isIntersecting)) return;
    obs.disconnect(); if (vigiaMuro === obs) vigiaMuro = null;
    pintarMuro(true);
  }, { root: null, threshold: 0 });
  vigiaMuro.observe(objetivo);
  if (objetivo !== marca) vigiaMuro.observe(marca); // por si la tarjeta vigilada se vuelve a dibujar
}
function actualizarTarjeta(c) {
  $$(`[data-card="${c.id}"]`).forEach((el) => { el.outerHTML = tarjeta(c); });
  $$(`[data-reacts-find="${c.id}"]`).forEach((el) => { el.innerHTML = reaccionesHTML(c); });
}

/* Colección: una fila de colecciones sin números; el mosaico la abre en su lugar con todas a la vista (solo íconos) */
function filaColecciones(total, cuenta) {
  const abierta = S.colAbierta, sel = S.coleccionCat, cat = S.cats.find((c) => c.id === sel);
  const mosaico = `<button type="button" class="chip mosaico ${abierta ? 'abierto' : ''}" data-act="col_mosaico" aria-expanded="${abierta}" data-tip="${esc(C.AYUDA.col_mosaico)}" aria-label="${esc(C.AYUDA.col_mosaico)}">${ic('layout-grid')}</button>`;
  const todas = (solo) => `<button type="button" class="chip ${solo ? 'ico' : ''} ${!sel ? 'on' : ''}" data-act="colcat" data-v="" data-tip="${esc(C.COL_TODAS)}" aria-label="${esc(C.COL_TODAS)}">${ic('cards')}${solo ? '' : esc(C.COL_TODAS)}</button>`;
  const fila = abierta
    ? `<div class="col-fila abierta">${mosaico}${todas(true)}${S.cats.map((c) => `<button type="button" class="chip cc ico ${sel === c.id ? 'on' : ''}" style="--c:${okColor(c.color)}" data-act="colcat" data-v="${c.id}" data-tip="${esc(c.name)}" aria-label="${esc(c.name)}">${ic(c.icon)}</button>`).join('')}</div>`
    : `<div class="col-fila">${mosaico}<div class="chips una-fila">${todas(false)}${S.cats.map((c) => chipColor('colcat', c.id, c.name, c.icon, c.color, sel === c.id)).join('')}</div></div>`;
  return `${fila}<div class="row between col-total-fila"><div class="tiny col-total">${esc(cat ? cat.name : C.COL_TODAS)} · ${cat ? cuenta(cat.id) : total} ${esc(C.COL_HALLAZGOS)}</div>
    ${total ? ib('descargar_fichas', 'download', C.PDF_TITULO, `data-tipo="coleccion" data-id="${sel || ''}"`, 'sm') : ''}</div>`;
}
// "rapido": al elegir una colección o abrir el mosaico se usa lo ya cargado, sin volver a pedirlo ni parpadear
async function pintarColeccion(rapido) {
  const scr = $('#scr');
  const arriba = rapido ? scr.scrollTop : 0;
  if (!(rapido && S.colMias)) scr.innerHTML = `<div class="empty"><span class="spin">${ic('loader-2')}</span></div>`;
  try {
    const mias = rapido && S.colMias ? S.colMias : guarda(await api.userCards(S.user.id));
    S.colMias = mias;
    const cuenta = (id) => mias.filter((c) => c.category_id === id).length;
    if (S.coleccionCat && !S.cats.some((c) => c.id === S.coleccionCat)) S.coleccionCat = null;
    const vis = S.coleccionCat ? mias.filter((c) => c.category_id === S.coleccionCat) : mias;
    if (S.tab !== 'coleccion') return;
    scr.innerHTML = `<div class="row between" style="margin-bottom:12px"><h1 class="serif grow">${esc(C.TITULO_COLECCION)}</h1>${ib('categorias', 'pencil', 'categorias')}</div>
      ${filaColecciones(mias.length, cuenta)}
      ${vis.length ? rejilla(vis, true) : `<div class="empty">${ic('camera')}<p>Registra tu primer hallazgo</p><button class="btn" data-act="nuevo">${ic('camera')}</button></div>`}
      <div class="sec"><div class="row between"><h3 class="row">${ic('users')} Grupos</h3>
        <span class="row"><span class="tiny" data-tip="Grupos que creaste">${gruposCreados()} / ${C.MAX_GRUPOS}</span>${ib('grupo_nuevo', 'plus', 'grupo_nuevo')}</span></div>
        <div class="list" style="margin-top:10px">${S.groups.map((g) => esEncuentro(g)
          // Grupo de encuentro: el nombre abre el grupo; el botón de ayuda abre el aviso rápido con ese grupo
          ? `<div class="li grupo-enc"><button class="row grow" data-act="grupo" data-id="${g.id}" style="text-align:left;min-width:0">
              <span class="avatar" style="background:${okColor(g.color)}">${ic(g.icon)}</span><b class="grow">${esc(g.name)}</b></button>${botonAyuda(`data-id="${g.id}"`)}</div>`
          : `<button class="li" data-act="grupo" data-id="${g.id}" style="text-align:left">
          <span class="avatar" style="background:${okColor(g.color)}">${ic(g.icon)}</span><b class="grow">${esc(g.name)}</b>
          <span class="muted" data-tip="${esc(g.is_public ? C.AYUDA.grupo_publico : C.AYUDA.grupo_privado)}">${ic(g.is_public ? 'world' : 'lock')}</span></button>`).join('')
          || `<p class="muted">Crea un grupo para coleccionar con tus amigos en el mismo mapa.</p>`}</div></div>`;
    if (rapido) scr.scrollTop = arriba;
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
// Amistad con otra persona: pedirla (si ya la sigues), ver que está enviada, o aceptarla
function botonAmistad(uid, estado) {
  if (estado === 'puede') return `<button class="btn sm" data-act="pedir_amistad" data-id="${uid}">${ic('heart-handshake')} ${esc(C.AMISTAD_PEDIR)}</button>`;
  if (estado === 'enviada') return `<span class="estado-amistad tiny">${ic('clock')} ${esc(C.AMISTAD_ENVIADA)}</span>`;
  if (estado === 'recibida') return `<button class="btn sm" data-act="amistad_aceptar" data-id="${uid}">${ic('user-check')} ${esc(C.AMISTAD_ACEPTAR_SUYA)}</button>`;
  return '';
}
function hojaPedirAmistad(uid) {
  const D = { texto: '' };
  const hoja = { render: () => `${cabeza(`${ic('heart-handshake')} ${esc(C.AMISTAD_PEDIR)}`)}
      <p class="tiny" style="margin:0 0 10px">${esc(C.AMISTAD_TEXTO)}</p>
      <label class="tiny" for="amistad-in">${esc(C.AMISTAD_MENSAJE)}</label>
      <textarea id="amistad-in" class="in" maxlength="${C.AMISTAD_MAX}" rows="3">${esc(D.texto)}</textarea>
      <div class="tiny" style="text-align:right"><span id="amistad-n">${D.texto.length}</span>/${C.AMISTAD_MAX}</div>
      <button class="btn block" data-act="enviar_amistad" data-id="${uid}" style="margin-top:8px">${ic('send')} ${esc(C.AMISTAD_ENVIAR)}</button>`,
    after: (r) => { const t = $('#amistad-in', r); if (t) t.addEventListener('input', () => { D.texto = t.value; const n = $('#amistad-n'); if (n) n.textContent = t.value.length; }); },
    tipo: 'pedir_amistad' };
  hoja.datos = D;
  pila.push(hoja); dibujarHoja();
}
// Al cambiar una amistad se refresca lo que esté abierto (perfil o chat)
function refrescarAmistad() {
  const top = hojaArriba(); if (!top) return;
  if (top.tipo === 'perfil') { const D = $('.sheet')._perfil; if (D) D.cargar(); }
  if (top.tipo === 'chat' && top.datos) top.datos.cargar();
  if (top.tipo === 'buzon_amigos' && top.datos) top.datos.cargar();
}
function perfilHTML(p, st, propio, tarjetas, o = {}) {
  const ls = logros(st);
  const porCat = (st.categorias || []).map((c) => `<div class="li" style="flex-direction:column;align-items:stretch">
      <div class="row between">${catBadge(c.name, c.icon, c.color)}<span class="muted">${c.total} ${c.total === 1 ? 'hallazgo' : 'hallazgos'}</span></div>
      <div class="medals">${ls.filter((l) => l.tipo === 'cat' && l.cat === c.id).map(medalla).join('')}</div></div>`).join('');
  const grupo = (t) => ls.filter((l) => l.tipo === t).map(medalla).join('');
  const md = st.mejor_dia;
  const sigo = S.following.has(p.id);
  const colecciones = (st.categorias || []).filter((c) => propio || c.total > 0);
  const silencio = propio ? null : S.mutes.find((m) => m.target_user === p.id);
  return `<div class="row" style="gap:14px">${avatar(p, 'lg')}<div class="grow"><h2>${esc(p.name)}</h2>${p.bio ? `<div class="muted">${esc(p.bio)}</div>` : ''}
      ${colecciones.length ? `<div class="colicons">${colecciones.map((c) => `<span class="colicon" style="background:${okColor(c.color)}" data-tip="${esc(c.name)} · ${c.total}" aria-label="${esc(c.name)}">${ic(c.icon)}</span>`).join('')}</div>` : ''}
      <div class="tiny row" style="margin-top:4px"><span data-tip="Seguidores">${ic('users')} ${st.seguidores || 0}</span> · <span data-tip="Siguiendo">${ic('user-check')} ${st.siguiendo || 0}</span></div>
      ${p.blocked ? `<div class="tiny row">${ic('ban')} bloqueada</div>` : ''}
      ${silencio && o.comparte === false ? `<div class="tiny row">${ic('volume-off')} ${esc(C.AYUDA.silenciado)}</div>` : ''}</div></div>
    <div class="row wrap" style="margin:14px 0">
      ${propio ? ib('editar_perfil', 'pencil', 'editar') : ib('seguir', sigo ? 'user-check' : 'user-plus', sigo ? 'dejar_seguir' : 'seguir', `data-id="${p.id}"`, sigo ? '' : 'on')}
      ${propio ? ib('whatsapp_perfil', 'brand-whatsapp', 'whatsapp', `data-id="${p.id}"`) : ''}
      ${propio ? ib('buscar_personas', 'search', 'buscar_personas') : ''}
      ${ib('tabla', 'trophy', 'tabla')}
      ${!propio && o.comparte === false ? (silencio ? ib('quitar_silencio', 'volume', 'quitar_silencio', `data-id="${silencio.id}"`, 'on') : ib('silenciar', 'volume-off', 'silenciar', `data-user="${p.id}"`)) : ''}
      ${!propio && o.puedeChat ? ib('chat', 'messages', 'mensaje', `data-id="${p.id}"`, 'on') : ''}
      ${!propio && !p.blocked ? botonAmistad(p.id, o.amistad) : ''}
      ${propio ? ib('silenciados', 'volume-off', 'silenciados') + ib('buzon', 'mail', 'buzon') + (tipoInstalacion() ? ib('instalar', 'device-mobile', 'instalar') : '') : ''}
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
    ${!propio && tarjetas ? coleccionesPersona(p, st, tarjetas) : ''}
    <div class="sec"><h3>${ic('medal')} Medallas por categoría</h3><div class="list">${porCat || '<div class="muted">—</div>'}</div></div>
    ${(st.premios_grupos || []).length ? `<div class="sec"><h3>${ic('users')} Medallas en grupos</h3><div class="list">${(st.premios_grupos || []).map((g) => `<div class="li" style="flex-direction:column;align-items:stretch">
      <div class="row between">${catBadge(g.name, g.icon, g.color)}<span class="muted">${g.total} ${g.total === 1 ? 'hallazgo' : 'hallazgos'}</span></div>
      <div class="medals">${ls.filter((l) => l.tipo === 'grupo' && l.grupo === g.id).map(medalla).join('')}</div></div>`).join('')}</div></div>` : ''}
    ${propio ? `<div class="sec"><h3>${ic('map-pin')} ${esc(C.TITULOS_MEDALLAS.col)}</h3><div class="medals">${grupo('col')}</div>
      <div class="chips" style="flex-wrap:wrap;margin-top:10px">${(st.colonias || []).map((c) => `<span class="chip" data-tip="${esc(fecha(c.first_at))}">${esc(c.colonia)} · ${c.n}</span>`).join('')}</div></div>
    <div class="sec"><h3>${ic('flame')} ${esc(C.TITULOS_MEDALLAS.racha)}</h3><div class="medals">${grupo('racha')}</div></div>
    <div class="sec"><h3>${ic('repeat')} ${esc(C.TITULOS_MEDALLAS.reen)}</h3><div class="medals">${grupo('reen')}</div></div>` : ''}
    ${propio ? `<div class="sec" id="sec-notif"></div><div class="sec" id="sec-offline"></div>` : ''}
    ${propio ? `<div style="text-align:center;margin-top:30px"><button class="linkbtn" data-act="borrar_cuenta">${ic('trash')} ${esc(C.AYUDA.borrar_cuenta)}</button>
      <p class="tiny">Collector Go · v${esc(C.VERSION)}</p></div>` : ''}`;
}
let ultimaPersona = null;
// Lo que una persona heredó sin colección ("?")
function hojaSinColeccion(uid) {
  const l = ultimaPersona && ultimaPersona.uid === uid ? ultimaPersona.cards.filter((x) => !x.category_id && !x.group_id) : [];
  abrirHoja(() => `${cabeza(catBadge('?', 'question-mark', C.COLOR_SIN_COLECCION))}${l.length ? rejilla(l, false) : `<div class="empty">${ic('photo')}<p>${esc(C.GALERIA_VACIA)}</p></div>`}`, null, 'sin_coleccion');
}
// Perfil de otra persona: sus colecciones con sus fotos públicas más recientes; cada una abre su galería
function coleccionesPersona(p, st, cards) {
  const cols = (st.categorias || []).map((c) => {
    const suyas = cards.filter((x) => x.category_id === c.id);
    return { c, n: suyas.length, fotos: suyas.filter((x) => x.thumb || x.photo) };
  }).filter((x) => x.n);
  // Sus hallazgos en grupos que puedes ver y lo que heredó sin colección
  const grupos = {};
  cards.filter((x) => x.group_id).forEach((x) => { (grupos[x.group_id] = grupos[x.group_id] || { g: { id: x.group_id, name: x.cat_name, icon: x.cat_icon, color: x.cat_color }, l: [] }).l.push(x); });
  Object.values(grupos).forEach(({ g, l }) => cols.push({ c: g, n: l.length, fotos: l.filter((x) => x.thumb || x.photo), grupo: true }));
  const sin = cards.filter((x) => !x.category_id && !x.group_id);
  if (sin.length) cols.push({ c: { id: '', name: '?', icon: 'question-mark', color: C.COLOR_SIN_COLECCION }, n: sin.length, fotos: sin.filter((x) => x.thumb || x.photo), sinCol: true });
  ultimaPersona = { uid: p.id, cards };
  if (!cols.length) return '';
  return `<div class="sec"><h3>${ic('cards')} ${esc(C.PERFIL_COLECCIONES)}</h3><div class="colecciones-persona">${cols.map(({ c, n, fotos, grupo, sinCol }) => {
    const ver = fotos.length >= 4 ? fotos.slice(0, 4) : fotos.slice(0, 1);
    const destino = grupo ? `data-act="grupo" data-id="${c.id}"` : sinCol ? `data-act="persona_sin_col" data-id="${p.id}"` : `data-act="galeria_cat" data-id="${p.id}" data-cat="${c.id}"`;
    return `<button class="col-portada" ${destino} aria-label="${esc(c.name)}">
      <span class="portada ${ver.length < 4 ? 'una' : ''}">${ver.map((x) => `<img src="${foto(x, true)}" alt="" loading="lazy">`).join('') || '<span></span>'}</span>
      ${catBadge(c.name, c.icon, c.color)}<span class="tiny">${n} ${n === 1 ? 'hallazgo' : 'hallazgos'}</span></button>`; }).join('')}</div></div>`;
}
async function pintarPerfil() {
  const scr = $('#scr');
  scr.innerHTML = `<div class="empty"><span class="spin">${ic('loader-2')}</span></div>`;
  try {
    const [me, st] = await Promise.all([api.getProfile(S.user.id), api.stats(S.user.id)]);
    S.me = me || S.me; S.stats = st;
    if (S.tab === 'perfil') {
      scr.innerHTML = perfilHTML(S.me, st, true, null); cuandoDesocupado(() => prepararMosaico(S.user.id));
      pintarNotificaciones().catch(() => null); pintarSinConexion().catch(() => null);
    }
    if (S.me.is_admin) avisoUsoPerfil();
  } catch (e) { fallo(e); }
}
// En el perfil de la administradora: franja de aviso si el plan pasa del 60 %
async function avisoUsoPerfil() {
  let u; try { u = await api.usoPlan(); } catch (e) { return; }
  const peor = (u.recursos || []).reduce((m, r) => (pctUso(r) > m.p ? { p: pctUso(r), r } : m), { p: 0, r: null });
  const scr = $('#scr'); if (S.tab !== 'perfil' || !scr || !peor.r || !nivelUso(peor.p) || $('.banner.uso', scr)) return;
  scr.insertAdjacentHTML('afterbegin', `<button class="banner uso ${nivelUso(peor.p)}" data-act="admin_uso" style="width:100%;margin-bottom:12px;text-align:left">${ic('gauge')}<span>Uso del plan: ${esc(RECURSOS[peor.r.recurso] || peor.r.recurso)} al ${peor.p} %</span></button>`);
}
async function abrirPerfil(uid) {
  if (uid === S.user.id) { cerrarTodo(); irA('perfil'); return; }
  const datos = { p: null, st: null, cards: null };
  abrirHoja(() => datos.p ? cabeza('') + perfilHTML(datos.p, datos.st, false, datos.cards, { comparte: datos.comparte, puedeChat: datos.puedeChat, amistad: datos.amistad }) : cabeza('') + `<div class="empty"><span class="spin">${ic('loader-2')}</span></div>`,
    (r) => { r._perfil = datos; }, 'perfil');
  datos.cargar = async () => {
    try {
      const [p, st, cards, comparte, puedeChat, amistad] = await Promise.all([api.getProfile(uid), api.stats(uid), api.userCards(uid),
        api.comparteGrupo(uid).catch(() => null), api.puedoEscribir(uid).catch(() => false), api.estadoAmistad(uid).catch(() => null)]);
      if (!p) { cerrarHoja(); return aviso('Perfil no disponible', 'alert-triangle'); }
      Object.assign(datos, { p, st, cards: guarda(cards), comparte, puedeChat, amistad }); if (hojaArriba() && hojaArriba().tipo === 'perfil') dibujarHoja();
    } catch (e) { fallo(e); }
  };
  datos.cargar();
}

/* Ayuda de uso (mapa) y privacidad (entrada) */
function hojaDudas() {
  abrirHoja(() => `${cabeza(`${ic('help')} ${esc(C.AYUDA.dudas)}`)}
    <div class="dudas guia">${C.GUIA.map((d) => `<div class="duda"><h3 class="row"><span class="gicon">${ic(d.icono)}</span>${esc(d.titulo)}</h3>
      ${d.texto ? `<p>${esc(d.texto)}</p>` : ''}${d.pasos ? `<ol>${d.pasos.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>` : ''}</div>`).join('')}
    <div class="duda datos"><h3 class="row">${ic('lock')} ${esc(C.DATOS_TITULO)}</h3>${datosHTML(true)}</div>
    <button class="btn alt block" data-act="buzon" style="margin-top:16px">${ic('mail')} ${esc(C.AYUDA.buzon)}</button></div>`, null, 'dudas');
}
function hojaPrivacidad() {
  abrirHoja(() => `${cabeza(`${ic('lock')} ${esc(C.AYUDA.privacidad)}`)}
    <div class="dudas"><div class="duda datos"><h3>${esc(C.DATOS_TITULO)}</h3>${datosHTML(false)}</div></div>`, null, 'privacidad');
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
async function abrirFicha(id, op) {
  let c = S.cache.get(id);
  if (!c || c.parcial) {
    try { c = await api.card(id); } catch (e) { return fallo(e); }
    if (!c) return aviso('Este hallazgo no está disponible', 'alert-triangle');
    guarda([c]);
  }
  const H = { id, lista: null, i: 0, foto: op && op.foto };
  fichaH = H;
  abrirHoja(() => fichaHTML(S.cache.get(id) || c, H), (raiz) => montarFicha(raiz, S.cache.get(id) || c, H), 'ficha');
  H.cargar = async () => {
    const cc = S.cache.get(id) || c;
    try {
      const [lista, coms, aus] = await Promise.all([api.history(id), cc.is_private ? Promise.resolve([]) : api.comments(id),
        api.historiaAusencias(id).catch(() => [])]);
      H.lista = lista; H.coms = coms; H.aus = aus || [];
      if (H.foto) { const i = galeria(S.cache.get(id) || cc, H).filter((h) => h.photo || h.thumb).findIndex((h) => h.id === H.foto); if (i > 0) H.i = i; H.foto = null; }
    } catch (e) { H.lista = H.lista || []; H.coms = H.coms || []; H.aus = H.aus || []; }
    const top = hojaArriba(); if (top && top.tipo === 'ficha' && pila.includes(top)) dibujarHoja();
  };
  H.cargar();
  return H;
}
// "¡Ya no está!": en todo lo que puedes ver (en lo secreto, solo quien lo registró)
const puedoMarcarAusencia = (c) => !S.me.blocked && (!c.is_private || c.user_id === S.user.id) && (!c.group_id || c.group_public || !!miGrupo(c.group_id));
// Comentarios de la ficha
const puedoComentar = (c) => !c.is_private && !S.me.blocked && (!c.group_id || c.group_public || !!miGrupo(c.group_id));
function comentariosHTML(c, H) {
  const coms = H.coms;
  const mios = (coms || []).filter((k) => k.user_id === S.user.id).length;
  const puedoBorrar = (k) => k.user_id === S.user.id || c.user_id === S.user.id || S.me.is_admin;
  // Sin título ni contador: los comentarios se ven directo
  return `<div class="coms-caja" id="comentarios">
    ${coms === undefined ? `<div class="empty" style="padding:10px"><span class="spin">${ic('loader-2')}</span></div>` : `
    <div class="coms">${coms.map((k) => `<div class="com">
      <button data-act="perfil" data-id="${k.user_id}" aria-label="${esc(k.user_name)}">${avatar(k)}</button>
      <div class="grow"><div><b>${esc(k.user_name)}</b> <span class="tiny">${hace(k.created_at)}</span></div><p>${esc(k.body)}</p></div>
      ${puedoBorrar(k) ? ib('borrar_comentario', 'trash', 'borrar_comentario', `data-id="${k.id}" data-find="${c.id}"`, 'sm ghost') : ''}</div>`).join('')}</div>
    ${puedoComentar(c) ? (mios < C.COMENTARIOS_POR_PERSONA ? `<div class="coment-campo">
      <input id="coment-in" class="in compacto" maxlength="${C.COMENTARIO_MAX}" placeholder="Escribe un comentario" aria-label="Comentario" value="${esc(H.borrador || '')}" autocomplete="off">
      ${ib('comentar', 'send', 'comentar', `data-id="${c.id}"`, 'sm on')}</div>
      <div class="tiny coment-n"><span id="coment-n">${(H.borrador || '').length}</span>/${C.COMENTARIO_MAX}</div>`
      : `<p class="tiny">Ya dejaste ${C.COMENTARIOS_POR_PERSONA} comentarios aquí.</p>`) : ''}`}</div>`;
}

// Todas las fotos del sujeto: la más reciente primero
function galeria(c, H) {
  const inicial = { photo: c.photo, thumb: c.thumb, created_at: c.created_at, colonia: c.colonia, lat: c.lat, lng: c.lng, user_name: c.user_name, user_id: c.user_id, inicial: true };
  const resto = (H.lista || []).slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return [inicial].concat(resto);
}
// Debajo de una foto que no es la original: de quién es, cuándo, su nota y qué se puede hacer con ella
function pieFoto(c, h) {
  if (!h || h.inicial) return '';
  const quien = h.tipo === 'no_esta' ? `${ic('map-pin-off')} ${esc(C.AUSENCIA_HISTORIA)}${h.user_name ? ` · ${esc(h.user_name)}` : ''}`
    : h.tipo === 'visto' ? `${ic('users')} ${esc(C.COL_DE.replace('{n}', h.user_name || ''))}`
    : `${ic('repeat')} ${esc(c.group_id && h.user_name ? h.user_name : C.AYUDA.reencuentro)}`;
  // tu foto de la comunidad (y en lo tuyo, tu propia foto de "No está") se puede borrar
  const mia = h.user_id === S.user.id && (c.user_id !== S.user.id || h.tipo === 'no_esta');
  const ajenaEnLoMio = c.user_id === S.user.id && h.user_id && h.user_id !== S.user.id;
  return `<div class="foto-pie"><span class="grow">${quien} · ${esc(fecha(h.created_at))}${h.note ? ` · «${esc(h.note)}»` : ''}</span>
    ${mia ? `<button class="linkbtn" data-act="col_borrar" data-id="${h.id}" data-f="${c.id}">${ic('trash')} ${esc(C.COL_BORRAR)}</button>` : ''}
    ${ajenaEnLoMio ? `<button class="linkbtn" data-act="col_reportar" data-id="${h.id}">${ic('flag')} ${esc(C.COL_REPORTAR)}</button>` : ''}</div>`;
}
const marcaFoto = (f) => (f.tipo === 'visto' ? `<span class="marca-col" aria-hidden="true">${ic('users')}</span>`
  : f.tipo === 'no_esta' ? `<span class="marca-col no-esta" aria-hidden="true">${ic('map-pin-off')}</span>` : '');
// La foto de un hallazgo no se quita sola: para eso se borra el hallazgo completo (ninguna ficha queda sin imagen)
function fichaHTML(c, H) {
  const propio = c.user_id === S.user.id;
  const hist = galeria(c, H);
  const fotos = hist.filter((h) => h.photo || h.thumb);
  if (H.i >= fotos.length) H.i = 0;
  const actual = fotos[H.i];
  const puntos = hist.filter((h) => h.lat != null && h.lng != null);
  return `${cabeza(esc(c.name), c.is_private ? `<span class="ib ghost" data-tip="${C.AYUDA.privado}">${ic('lock')}</span>` : '')}
    ${actual ? `<div class="foto-grande"><img class="big" src="${api.photoUrl(actual.photo || actual.thumb)}" alt="${esc(c.name)}"></div>${pieFoto(c, actual)}` : ''}
    ${fotos.length > 1 ? `<div class="strip">${fotos.map((f, i) => `<button class="${i === H.i ? 'on' : ''}" data-act="galeria" data-i="${i}" aria-label="Foto ${i + 1}">
      <img src="${api.photoUrl(f.thumb || f.photo)}" alt="" loading="lazy">${marcaFoto(f)}</button>`).join('')}</div>` : ''}
    ${c.user_id === S.user.id && !c.category_id && !c.group_id ? `<button class="banner sin-col" data-act="editar_hallazgo" data-id="${c.id}">${ic('question-mark')}<span class="grow">${esc(C.SIN_COLECCION_ELEGIR)}</span>${ic('chevron-right')}</button>` : ''}
    <div class="row between" style="margin:12px 0">
      <button class="row" data-act="perfil" data-id="${c.user_id}">${avatar(c)}<b>${esc(c.user_name)}</b></button>
      ${etiquetaDe(c)}</div>
    ${c.note ? `<p style="margin:6px 0 12px">${esc(c.note)}</p>` : ''}
    ${esAproximada({ acc: c.accuracy }) ? `<button class="linkbtn tiny" data-act="info_precision" data-acc="${c.accuracy}" style="padding:0;color:var(--tinta2)">${ic('alert-triangle')} Ubicación aproximada ±${metros(c.accuracy)}</button>` : ''}
    ${!c.is_private || propio ? `<div style="margin:12px 0 8px">${reaccionesHTML(c)}</div>` : ''}
    ${atenuado(c) ? `<p class="tiny ausencia-tenue">${ic('map-pin-off')} ${esc(C.AUSENCIA_TENUE)}</p>` : ''}
    ${!c.is_private ? comentariosHTML(c, H) : ''}
    <div class="row wrap" style="margin-top:14px">
      ${ib('ir_al_punto', 'navigation', 'ir_al_punto', `data-id="${c.id}"`, 'on')}
      ${propio && !c.is_private ? ib('whatsapp', 'brand-whatsapp', 'whatsapp', `data-id="${c.id}"`) : ''}
      ${puedoReencontrar(c) ? ib('reencuentro', 'repeat', 'reencuentro', `data-id="${c.id}"`) : ''}
      ${!c.is_private ? ib('enviar_ficha', 'send', 'enviar_ficha', `data-id="${c.id}"`) : ''}
      ${!c.is_private ? ib('etiquetar', 'tag', 'etiquetar', `data-id="${c.id}"`) : ''}
      ${propio ? ib('editar_hallazgo', 'pencil', 'editar', `data-id="${c.id}"`) : ''}
      <span class="grow"></span>
      ${!propio ? ib('avisar', 'flag', 'avisar', `data-id="${c.id}"`) : ''}
      ${propio || S.me.is_admin ? ib('borrar_hallazgo', 'trash', 'borrar', `data-id="${c.id}"`) : ''}
    </div>
    ${(() => {
      // Historia: registro, reencuentros y "ya no está", del más reciente al más antiguo
      const items = hist.concat((H.aus || []).map((a) => ({ created_at: a.created_at, user_name: a.user_name, ausencia: true })))
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      return `<div class="sec"><h3>${ic('history')} Historia · ${items.length}</h3>
      ${H.lista === null ? `<div class="empty" style="padding:10px"><span class="spin">${ic('loader-2')}</span></div>` : `
      ${puntos.length > 1 ? '<div class="minimap" id="mapa-historia" style="height:170px;margin-bottom:10px"></div>' : ''}
      <div class="hist">${items.map((h) => h.ausencia ? `<div class="row hist-i ausente">
        <span class="dotline">${ic('map-pin-off')}</span>
        <div class="grow"><b>${fecha(h.created_at)}</b><div class="tiny">${esc(C.AUSENCIA_HISTORIA)}${h.user_name ? ` · ${esc(h.user_name)}` : ''}</div></div></div>`
        : h.tipo === 'no_esta' ? `<div class="row hist-i ausente">
        <span class="dotline">${ic('map-pin-off')}</span>
        <div class="grow"><b>${fecha(h.created_at)}</b><div class="tiny">${esc(C.AUSENCIA_HISTORIA)}${h.user_name ? ` · ${esc(h.user_name)}` : ''}${h.note ? ` · ${esc(h.note)}` : ''}</div></div>
        ${h.photo || h.thumb ? `<span class="tiny">${ic('photo')}</span>` : ''}</div>`
        : h.tipo === 'visto' ? `<div class="row hist-i colaboracion">
        <span class="dotline">${ic('eye-check')}</span>
        <div class="grow"><b>${fecha(h.created_at)}</b><div class="tiny">${esc(C.COL_HISTORIA_VISTO.replace('{n}', h.user_name || ''))}${h.note ? ` · ${esc(h.note)}` : ''}</div></div>
        ${h.photo || h.thumb ? `<span class="tiny">${ic('photo')}</span>` : ''}</div>` : `<div class="row hist-i">
        <span class="dotline">${ic(h.inicial ? 'star' : 'repeat')}</span>
        <div class="grow"><b>${fecha(h.created_at)}</b><div class="tiny">${h.colonia ? esc(h.colonia) : '—'}${c.group_id ? ` · ${esc(h.user_name || '')}` : ''}${h.note ? ` · ${esc(h.note)}` : ''}</div></div>
        ${h.photo || h.thumb ? `<span class="tiny">${ic('photo')}</span>` : ''}</div>`).join('')}</div>`}
    </div>`; })()}`;
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
  const viejo = R.enc;
  if (S.me.blocked) return aviso('Tu cuenta está bloqueada', 'ban');
  const destIni = S.filtro.modo === 'grupo' && S.tab === 'map' ? 'g:' + S.filtro.id
    : (S.coleccionCat ? 'c:' + S.coleccionCat : (S.cats[0] ? 'c:' + S.cats[0].id : null));
  Object.assign(R, { original: null, recorte: null, usarRecorte: false, sinFoto: false, pos: null, gps: 'buscando', vistaUrl: null,
    candidatos: [], dest: destIni, destino: destino || null, nombre: '', nota: '', priv: false, etiquetas: [], etiquetasNombres: [], enc: null, encPromesa: null, encModo: 'mira' });
  abrirHoja(registroHTML, montarRegistro, 'registro');
  leerGPS();
  if (viejo) soltarLienzo(viejo.img);
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
  const esGrupo = (R.dest || '').startsWith('g:'), enc = !R.destino && destEncuentro(), punto = enc && R.encModo === 'punto';
  // Sobre la foto: original o sin fondo, público o secreto y etiquetar, en botones pequeños
  const herr = `<div class="foto-herr">
      <div class="toggle mini">
        <button type="button" class="${!R.usarRecorte ? 'on' : ''}" data-act="usar_original" data-tip="${C.AYUDA.original}" aria-label="${C.AYUDA.original}">${ic('photo')}</button>
        <button type="button" class="${R.usarRecorte ? 'on' : ''}" data-act="recortar" data-tip="${C.AYUDA.recortar}" aria-label="${C.AYUDA.recortar}">${ic('scissors')}</button></div>
      ${R.usarRecorte ? '' : `<button type="button" class="ib mini" data-act="pista_encuadre" data-tip="${esc(C.AYUDA.encuadrar)}" aria-label="${esc(C.AYUDA.encuadrar)}">${ic('arrows-move')}</button>`}
      ${R.destino || enc ? '' : `<div class="toggle mini" data-pick="priv" id="campo-priv" ${esGrupo ? 'hidden' : ''}>
        <button type="button" data-act="elegir" data-v="0" class="${R.priv ? '' : 'on'}" data-tip="${C.AYUDA.publico}" aria-label="${C.AYUDA.publico}">${ic('eye')}</button><button type="button" data-act="elegir" data-v="1" class="${R.priv ? 'on' : ''}" data-tip="${C.AYUDA.privado}" aria-label="${C.AYUDA.privado}">${ic('lock')}</button></div>
      <button type="button" class="ib mini ${R.etiquetas.length ? 'on' : ''}" id="campo-etiquetas" ${R.priv ? 'hidden' : ''} data-act="etiquetar_registro" data-tip="${esc(R.etiquetas.length ? (R.etiquetasNombres.join(', ') || R.etiquetas.length + ' personas') : C.AYUDA.etiquetar)}" aria-label="${esc(C.AYUDA.etiquetar)}">${ic('tag')}${R.etiquetas.length ? `<b class="cuenta">${R.etiquetas.length}</b>` : ''}</button>`}
    </div>`;
  return `${cabeza(titulo)}
    ${R.original ? `<div class="foto-caja">${R.usarRecorte ? `<img class="big" id="vista" src="${R.vistaUrl}" alt="">`
      : `<canvas class="encuadre" id="encuadre" aria-label="${esc(C.AYUDA.encuadrar)}"></canvas>`}
      <div class="progress foto-prog" id="prog" hidden><div></div></div>${herr}</div>` : ''}
    ${R.destino ? '' : `<div class="campo-fila">${selectorDestino(R.dest)}</div>
    ${enc ? `<div class="toggle mini enc-modo" role="group">
      <button type="button" class="${punto ? '' : 'on'}" data-act="reg_enc_modo" data-v="mira" aria-pressed="${!punto}">${ic('eye')} ${esc(C.ENC_MODO_MIRA)}</button>
      <button type="button" class="${punto ? 'on' : ''}" data-act="reg_enc_modo" data-v="punto" aria-pressed="${punto}">${ic('flag')} ${esc(C.ENC_MODO_PUNTO)}</button></div>` : ''}
    ${enc && !punto ? '' : `<label class="campo-ic">${ic(punto ? 'flag' : 'pencil')}<input id="f-nombre" class="in compacto" maxlength="${punto ? 40 : 60}" placeholder="${esc(punto ? C.PUNTO_PISTA : C.NOMBRE_PISTA)}" aria-label="Nombre" autocomplete="off" value="${esc(R.nombre)}"></label>`}`}
    <label class="campo-ic">${ic('info-circle')}<textarea id="f-nota" class="in compacto crece" rows="1" maxlength="140" placeholder="${esc(enc && !punto ? C.MIRA_PISTA : C.NOTA_PISTA)}" aria-label="Nota">${esc(R.nota)}</textarea></label>
    <div id="candidatos"></div>
    ${filaGuardar('guardar_hallazgo', R, 'gps-estado')}
    <div class="mapa-caja"><div class="minimap" id="mini-reg"></div><div class="mapa-lado">${ib('releer_gps', 'current-location', 'gps', '', 'sm')}</div></div>`;
}
// Guardar va antes del mapa, junto a la precisión del GPS
function filaGuardar(act, X, idGps, attrs = '') {
  return `<div class="guardar-fila">${X ? `<button type="button" class="gps-chip ${X.pos && esAproximada(X.pos) ? 'alerta' : ''}" id="${idGps}" data-act="gps_chip" data-tip="${esc(C.AYUDA.gps_estado)}">${gpsCorto(X)}</button>` : ''}
    <button class="btn guardar" data-act="${act}" ${attrs}>${ic('check')} Guardar</button></div>`;
}
function gpsCorto(X) {
  if (X.gps === 'buscando') return `<span class="spin">${ic('loader-2')}</span><span>GPS</span>`;
  if (X.pos) return X.pos.acc == null ? `${ic('hand-finger')}<span>${esc(C.GPS_A_MANO)}</span>`
    : `${ic(esAproximada(X.pos) ? 'alert-triangle' : 'map-pin')}<span>±${metros(X.pos.acc)}</span>`;
  if (X.gps === 'error') return `${ic('map-pin-off')}<span>${esc(C.GPS_SIN)}</span>`;
  return `${ic('map-pin')}<span>GPS</span>`;
}
function gpsTexto(X = R) {
  if (X.gps === 'buscando') return `<span class="spin">${ic('loader-2')}</span> GPS`;
  if (X.gps === 'error') return 'Sin GPS: toca el mapa para marcar';
  if (X.pos) return X.pos.acc == null ? 'Marcado a mano'
    : esAproximada(X.pos) ? `${ic('alert-triangle')} ±${metros(X.pos.acc)} · aproximada <button type="button" class="linkbtn" data-act="info_precision" data-acc="${X.pos.acc}" style="padding:0 4px">¿Cómo activar la exacta?</button>` : `±${X.pos.acc} m`;
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
  const cv = $('#encuadre', raiz);
  if (cv && R.enc) montarEncuadre(cv, R.enc, () => { R.recorte = null; generarCuadro(); });
  const el = $('#mini-reg', raiz);
  if (el) {
    const mm = miniMapa(el, R.pos, (p) => { R.pos = p; R.gps = 'ok'; pintarGPS(); buscarCandidatos(); });
    R.moverMini = mm.mover;
    buscarCandidatos();
  }
}
function pintarGPS() {
  const e = $('#gps-estado'); if (!e) return;
  if (e.classList.contains('gps-chip')) { e.innerHTML = gpsCorto(R); e.classList.toggle('alerta', !!(R.pos && esAproximada(R.pos))); }
  else e.innerHTML = gpsTexto();
}
function leerGPS() {
  R.gps = 'buscando'; pintarGPS();
  getPos().then((p) => { R.pos = p; R.gps = 'ok'; pintarGPS(); if (R.moverMini) R.moverMini(p); buscarCandidatos(); })
    .catch(() => { R.gps = R.pos ? 'ok' : 'error'; pintarGPS(); });
}
// Sugerencia: algo tuyo registrado muy cerca de aquí
async function buscarCandidatos() {
  const box = $('#candidatos'); if (!box || !R.pos || R.destino) return;
  if (destEncuentro()) { box.innerHTML = ''; return; }
  const dest = valor($('.sheet'), 'dest') || R.dest || '';
  if (!dest) { box.innerHTML = ''; return; }
  // Solo lo registrado en la misma categoría (propia) o en el mismo grupo
  const filtro = dest.startsWith('g:') ? { group: dest.slice(2), limit: 5 } : { uid: S.user.id, cat: dest.slice(2), limit: 5 };
  try {
    const cerca = guarda(await api.cardsInBox(cajaAlrededor(R.pos, C.REENCUENTRO_METROS), filtro));
    if ((valor($('.sheet'), 'dest') || R.dest) !== dest) return;
    R.candidatos = cerca.filter((c) => distancia(R.pos, c) <= C.REENCUENTRO_METROS);
    // Una sola fila que se desliza: así Guardar no se va hacia abajo
    box.innerHTML = R.candidatos.length ? `<div class="cand-titulo tiny">${ic('repeat')} ${esc(C.CANDIDATO_PREGUNTA)}</div><div class="cand-fila">${R.candidatos.map((c) => `<button type="button" class="banner cand" data-act="usar_candidato" data-id="${c.id}" aria-label="${esc(C.AYUDA.reencuentro)}: ${esc(c.name)}">
      ${c.thumb ? `<img src="${foto(c, true)}" alt="">` : ic(c.cat_icon)}<b>${esc(c.name)}</b>${ic('repeat')}</button>`).join('')}</div>` : '';
  } catch (e) { /* sin sugerencias, no pasa nada */ }
}
async function tomarFoto(file) {
  try {
    recordarFormulario();
    const img = await cargarImagen(file);
    if (R.enc) soltarLienzo(R.enc.img);
    R.enc = nuevoEncuadre(escalar(img, C.ENCUADRE_FUENTE));
    R.recorte = null; R.usarRecorte = false; R.sinFoto = false;
    await generarCuadro();
    dibujarHoja(); leerGPSsiFalta();
  } catch (e) { fallo(e); }
}
function leerGPSsiFalta() { if (!R.pos && R.gps !== 'buscando') leerGPS(); }
function ponerVista(blob) { if (R.vistaUrl) URL.revokeObjectURL(R.vistaUrl); R.vistaUrl = URL.createObjectURL(blob); const v = $('#vista'); if (v) v.src = R.vistaUrl; }
// La foto encuadrada (cuadrada) es la que se guarda; se rehace al soltar el dedo
function generarCuadro() {
  const E = R.enc; if (!E) return Promise.resolve(R.original);
  E.sucio = false;
  const cv = cuadroDe(E, C.FOTO_LADO), ver = E.ver || 0;
  R.encPromesa = lienzoABlob(cv, C.FOTO_CALIDAD, false).then((b) => {
    soltarLienzo(cv);
    if (R.enc !== E || (E.ver || 0) !== ver) return b;
    R.original = b; if (!R.usarRecorte) ponerVista(b); return b;
  });
  return R.encPromesa;
}
// Si el encuadre cambió y aún no se rehízo la foto (por ejemplo, Guardar justo al soltar), se rehace ahora
async function cuadroAlDia() {
  if (R.enc && R.enc.sucio) return generarCuadro();
  return R.encPromesa || R.original;
}
// En iPhone los lienzos ocupan memoria aparte: se liberan en cuanto ya no hacen falta
function soltarLienzo(cv) { try { if (cv) { cv.width = 0; cv.height = 0; } } catch (e) { /* nada */ } }

/* Encuadre cuadrado: arrastrar para mover, pellizcar (o la rueda del ratón) para acercar.
   El cuadro siempre queda lleno de foto: no hay bandas vacías. */
function nuevoEncuadre(img) { const w = img.width, h = img.height; return { img, w, h, z: 1, cx: w / 2, cy: h / 2 }; }
const ladoVisible = (E) => Math.min(E.w, E.h) / E.z;
// Se puede alejar hasta ver la foto completa (el espacio que sobra queda transparente y se ve el fondo beige); nunca se gira
const zoomMinimo = (E) => Math.min(E.w, E.h) / Math.max(E.w, E.h);
function limitarEncuadre(E) {
  E.z = Math.min(C.ENCUADRE_ZOOM_MAX, Math.max(zoomMinimo(E), E.z));
  const l = ladoVisible(E) / 2;
  // Si la foto es más chica que el cuadro en un sentido, se mueve sin salirse del cuadro
  const ent = (c, t) => Math.min(Math.max(l, t - l), Math.max(Math.min(l, t - l), c));
  E.cx = ent(E.cx, E.w); E.cy = ent(E.cy, E.h);
}
function pintarEncuadre(cv, E) {
  const l = ladoVisible(E), cx = cv.getContext('2d'), k = cv.width / l;
  cx.clearRect(0, 0, cv.width, cv.height);
  cx.imageSmoothingQuality = 'high';
  // La foto completa, colocada y escalada; lo que queda fuera del cuadro no se dibuja
  cx.drawImage(E.img, (l / 2 - E.cx) * k, (l / 2 - E.cy) * k, E.w * k, E.h * k);
}
function cuadroDe(E, lado) {
  limitarEncuadre(E);
  const n = Math.max(1, Math.round(Math.min(lado, ladoVisible(E))));   // resolución real del recorte; al alejar incluye el margen
  const cv = document.createElement('canvas'); cv.width = n; cv.height = n;
  pintarEncuadre(cv, E);
  return cv;
}
function montarEncuadre(cv, E, alSoltar) {
  const ancho = () => cv.getBoundingClientRect().width || 300;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = cv.height = Math.max(1, Math.round(ancho() * dpr));
  limitarEncuadre(E); pintarEncuadre(cv, E);
  const dedos = new Map();
  let base = null, cuadro = 0, tSoltar = 0, toque = null, ultimoToque = 0;
  // En iPhone, Safari toma el pellizco y el arrastre como zoom o desplazamiento de la página y corta los dedos a medias:
  // sobre la foto se bloquean esos gestos del navegador para que todo el movimiento llegue al encuadre
  const bloquear = (ev) => { if (ev.cancelable) ev.preventDefault(); };
  ['touchstart', 'touchmove', 'gesturestart', 'gesturechange', 'gestureend'].forEach((t) => cv.addEventListener(t, bloquear, { passive: false }));
  const repintar = () => { E.sucio = true; E.ver = (E.ver || 0) + 1; if (cuadro) return; cuadro = requestAnimationFrame(() => { cuadro = 0; pintarEncuadre(cv, E); }); };
  const soltar = () => { clearTimeout(tSoltar); tSoltar = setTimeout(alSoltar, 120); };
  const estado = () => {
    const p = [...dedos.values()], k = ladoVisible(E) / ancho();
    const mx = p.reduce((a, q) => a + q.x, 0) / p.length, my = p.reduce((a, q) => a + q.y, 0) / p.length;
    const d = p.length > 1 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0;
    return { mx, my, d, k, z: E.z, cx: E.cx, cy: E.cy };
  };
  cv.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    if (E.ocupado) return;
    // Un dedo nuevo que empieza el gesto: se olvidan dedos viejos cuyo "soltar" se perdió
    // (en iPhone pasa; si no, al arrastrar con un dedo el encuadre se acercaba de golpe)
    if (ev.isPrimary) dedos.clear();
    try { cv.setPointerCapture(ev.pointerId); } catch (e) { /* nada */ }
    dedos.set(ev.pointerId, { x: ev.clientX, y: ev.clientY }); base = estado();
    toque = dedos.size === 1 ? { x: ev.clientX, y: ev.clientY, t: Date.now() } : null;
  });
  cv.addEventListener('pointermove', (ev) => {
    if (!dedos.has(ev.pointerId) || !base) return;
    dedos.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    const ahora = estado();
    // Pellizco solo con dos dedos reales y separados; se mide paso a paso, así un salto raro no dispara el acercamiento
    if (dedos.size === 2 && base.d >= C.ENCUADRE_PELLIZCO_MIN) E.z = base.z * Math.min(1.6, Math.max(0.6, ahora.d / base.d));
    const k = ladoVisible(E) / ancho();
    E.cx = base.cx - (ahora.mx - base.mx) * k; E.cy = base.cy - (ahora.my - base.my) * k;
    limitarEncuadre(E); repintar();
    if (dedos.size === 2) base = estado();
  });
  const fin = (ev) => {
    if (!dedos.has(ev.pointerId)) return;
    dedos.delete(ev.pointerId);
    // Doble toque: vuelve al encuadre inicial
    if (toque && ev.type === 'pointerup' && !dedos.size && Date.now() - toque.t < 300 && Math.hypot(ev.clientX - toque.x, ev.clientY - toque.y) < 10) {
      if (Date.now() - ultimoToque < 350) { E.z = 1; E.cx = E.w / 2; E.cy = E.h / 2; limitarEncuadre(E); repintar(); ultimoToque = 0; }
      else ultimoToque = Date.now();
    }
    toque = null;
    base = dedos.size ? estado() : null;
    if (!dedos.size) soltar();
  };
  cv.addEventListener('pointerup', fin); cv.addEventListener('pointercancel', fin);
  cv.addEventListener('lostpointercapture', (ev) => { if (dedos.has(ev.pointerId)) fin(ev); });
  cv.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    if (E.ocupado) return;
    E.z = E.z * Math.exp(-ev.deltaY * 0.0015); limitarEncuadre(E); repintar(); soltar();
  }, { passive: false });

}


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
  const a = (l, tipo) => new Promise((res) => l.toBlob((b) => res(b), tipo, calidad));
  return a(cv, 'image/webp').then((b) => {
    if (b && b.type === 'image/webp') return b;
    if (alfa) return a(cv, 'image/png');
    // Sin WebP (algunos iPhone) la foto va en JPEG, que no guarda transparencia: el margen se pinta del beige de la app
    const f = document.createElement('canvas'); f.width = cv.width; f.height = cv.height;
    const x = f.getContext('2d'); x.fillStyle = C.FONDO_FOTO; x.fillRect(0, 0, f.width, f.height); x.drawImage(cv, 0, 0);
    return a(f, 'image/jpeg').then((j) => { soltarLienzo(f); return j; });
  });
}
// Quita el espacio transparente y centra el objeto en un cuadro: ocupa el 90 %, con el mismo margen alrededor
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
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const lado = Math.max(1, Math.round(Math.max(bw, bh) / C.RECORTE_OCUPA));
  const out = document.createElement('canvas'); out.width = lado; out.height = lado;
  out.getContext('2d').drawImage(cv, x0, y0, bw, bh, Math.round((lado - bw) / 2), Math.round((lado - bh) / 2), bw, bh);
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
// conMedia: también la foto mediana del muro (solo hallazgos públicos nuevos; si lo recortado cae en PNG, el muro usa la grande)
async function prepararFotos(conMedia) {
  await cuadroAlDia();
  const alfa = R.usarRecorte && R.recorte;
  const fuente = alfa ? R.recorte : R.original;
  const img = await cargarImagen(fuente);
  let grande = await lienzoABlob(escalar(img, alfa ? Math.min(C.FOTO_LADO, C.FOTO_LADO_RECORTE) : C.FOTO_LADO), C.FOTO_CALIDAD, alfa);
  // Sin WebP (algunos iPhone) lo recortado va en PNG, que pesa mucho: si pasa del límite del almacén se hace más chico
  if (alfa && grande && grande.type === 'image/png' && grande.size > C.FOTO_PNG_MAX) grande = await lienzoABlob(escalar(img, 900), C.FOTO_CALIDAD, alfa);
  const mini = await lienzoABlob(escalar(img, C.MINIATURA_LADO), C.MINIATURA_CALIDAD, alfa);
  let media = null;
  if (conMedia && C.FOTO_LADO_MEDIA && grande && grande.type !== 'image/png') {
    media = await lienzoABlob(escalar(img, C.FOTO_LADO_MEDIA), C.FOTO_CALIDAD_MEDIA, alfa);
    if (!media || media.type === 'image/png' || media.size >= grande.size) media = null; // si no ahorra nada, no se guarda
  }
  return { grande, mini, media };
}
const ext = (b) => ({ 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg' }[b.type] || 'jpg');
// Las fotos de hallazgos privados van al almacén cerrado (ruta "priv:…")
async function subirFotos(privado, conMedia) {
  if (!R.original) return { pFoto: null, pMini: null, pMedia: null };
  const { grande, mini, media } = await prepararFotos(conMedia && !privado);
  const id = uuid(), pre = privado ? 'priv:' : '';
  const pFoto = `${pre}${S.user.id}/${id}.${ext(grande)}`, pMini = `${pre}${S.user.id}/${id}_t.${ext(mini)}`;
  const pMedia = media && !privado ? `${S.user.id}/${id}_m.${ext(media)}` : null;
  await api.upload(pFoto, grande);
  try {
    await api.upload(pMini, mini);
    if (pMedia) await api.upload(pMedia, media);
  } catch (e) { api.removeFiles([pFoto, pMini, pMedia].filter(Boolean)).catch(() => null); throw e; }
  return { pFoto, pMini, pMedia };
}

// Con un grupo de encuentro como destino: "Mira esto" (nota obligatoria) o punto de encuentro (con nombre), dentro del grupo
async function guardarEnEncuentro(btn) {
  const gid = R.dest.slice(2), punto = R.encModo === 'punto', nombre = (R.nombre || '').trim(), nota = (R.nota || '').trim();
  if (punto && !nombre) { const n = $('#f-nombre'); if (n) n.focus(); return aviso('Ponle un nombre', 'pencil'); }
  if (!punto && !nota) { const t = $('#f-nota'); if (t) t.focus(); return aviso('Escribe una nota corta', 'pencil'); }
  if (!R.pos) return aviso('Falta la ubicación: toca el mapa', 'map-pin');
  ocupado(btn, true);
  const fila = punto ? { group_id: gid, name: nombre.slice(0, 40), note: nota || null, lat: R.pos.lat, lng: R.pos.lng }
    : { group_id: gid, note: nota.slice(0, C.ENCUENTRO_NOTA_MAX), lat: R.pos.lat, lng: R.pos.lng, created_at: new Date().toISOString() };
  let fotos = null, subidas = null;
  try {
    fotos = R.original ? await prepararFotos() : null;
    if (!navigator.onLine) throw new TypeError('Failed to fetch');
    subidas = await subirFotosDe(fotos, carpetaEncuentro(gid));
    Object.assign(fila, { photo: subidas.pFoto, thumb: subidas.pMini });
    if (punto) await api.addPunto(fila); else { await api.addMira(fila); api.dispararPush(); }
    cerrarHoja(); aviso(punto ? 'Punto propuesto' : 'Marcado en el mapa del grupo', punto ? 'flag' : 'eye');
    const D = encuentroActual(); if (D) D.cargar();
  } catch (err) {
    if (subidas && subidas.pFoto) api.removeFiles([subidas.pFoto, subidas.pMini]).catch(() => null);
    if (!esErrorRed(err)) { ocupado(btn, false); return fallo(err); }
    delete fila.photo; delete fila.thumb;
    try { await guardarPendiente({ tipo: punto ? 'punto' : 'mira', datos: fila, fotos }); }
    catch (err2) { ocupado(btn, false); return fallo(err); }
    cerrarHoja(); aviso(C.PENDIENTE_GUARDADO, 'cloud-off');
  }
}
async function guardarHallazgo(btn) {
  const raiz = $('.sheet');
  recordarFormulario();
  if (R.destino) return guardarReencuentro(btn, R.destino);
  if (destEncuentro()) return guardarEnEncuentro(btn);
  const nombre = R.nombre.trim(), nota = R.nota.trim();
  const dest = R.dest || '';
  const cat = dest.startsWith('c:') ? dest.slice(2) : null, grupo = dest.startsWith('g:') ? dest.slice(2) : null;
  if (!cat && !grupo) return aviso('Elige una categoría', 'cards');
  if (!nombre) { $('#f-nombre', raiz).focus(); return aviso('Ponle un nombre', 'pencil'); }
  if (!R.pos) return aviso('Falta la ubicación: toca el mapa', 'map-pin');
  ocupado(btn, true);
  // Sin señal: se guarda en el teléfono y se sube solo al volver la conexión
  if (!navigator.onLine) return guardarHallazgoSinConexion(btn, { cat, grupo, nombre, nota });
  let guardado = false;
  try {
    // ¿Ya existe con ese nombre en esta categoría o grupo?
    const existente = await api.findByName(nombre, cat, grupo);
    if (existente) {
      let c = cartaConFotos(existente); if (!c) { c = await api.card(existente); if (c) guarda([c]); }
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
    const { pFoto, pMini, pMedia } = await subirFotos(!grupo && R.priv, true);
    const colonia = await api.colonia(R.pos.lat, R.pos.lng);
    let nuevoId;
    try {
      const fila = { category_id: cat, group_id: grupo, name: nombre, note: nota || null, is_private: grupo ? false : R.priv,
        lat: R.pos.lat, lng: R.pos.lng, accuracy: R.pos.acc, colonia, photo: pFoto, thumb: pMini };
      if (pMedia) fila.media = pMedia;
      nuevoId = await api.addFind(fila);
      guardado = true;
    } catch (e) { api.removeFiles([pFoto, pMini, pMedia].filter(Boolean)).catch(() => null); throw e; }
    if (R.etiquetas.length && !(grupo ? false : R.priv)) await api.etiquetar(nuevoId, R.etiquetas).catch((e) => fallo(e));
    const despues = await api.stats(S.user.id);
    S.stats = despues;
    cerrarTodo();
    S.nuevoId = nuevoId; setTimeout(() => { if (S.nuevoId === nuevoId) S.nuevoId = null; }, 4000);
    if (S.tab === 'map' && S.map && !S.grupo) S.map.setView([R.pos.lat, R.pos.lng], Math.max(16, (S.map.getZoom && S.map.getZoom()) || 16));
    const g = grupo ? miGrupo(grupo) : null, ct = cat ? (despues.categorias || []).find((x) => x.id === cat) : null;
    celebrarHallazgo({ icono: (ct || g || {}).icon, color: (ct || g || {}).color, titulo: nombre,
      detalle: ct ? `${ct.name} · ${ct.total}` : (g ? g.name : ''), foto: R.vistaUrl }, () => celebrar(novedades(antes, despues)));
    refrescarActual();
  } catch (e) {
    if (!guardado && esErrorRed(e)) return guardarHallazgoSinConexion(btn, { cat, grupo, nombre, nota });
    ocupado(btn, false); fallo(e);
  }
}
async function guardarReencuentro(btn, c) {
  const nota = (R.nota || '').trim();
  ocupado(btn, true);
  if (!navigator.onLine) return guardarReencuentroSinConexion(btn, c);
  let guardado = false;
  try {
    const antes = S.stats || await api.stats(S.user.id);
    const { pFoto, pMini } = await subirFotos(!!c.is_private);
    const pos = R.pos || null;
    const colonia = pos ? await api.colonia(pos.lat, pos.lng) : null;
    try {
      await api.addSighting({ find_id: c.id, lat: pos ? pos.lat : null, lng: pos ? pos.lng : null, photo: pFoto, thumb: pMini, colonia, note: nota || null });
      guardado = true;
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
  } catch (e) {
    if (!guardado && esErrorRed(e)) return guardarReencuentroSinConexion(btn, c);
    ocupado(btn, false); fallo(e);
  }
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
  const serie = { cat: C.METAS_CATEGORIA, grupo: C.METAS_CATEGORIA, col: C.METAS_COLONIAS, racha: C.METAS_RACHA_SEMANAS, reen: C.METAS_REENCUENTROS }[l.tipo] || [];
  return serie.find((m) => m > l.m) || null;
}
function celebrar(n, textoBase) {
  const hay = n.nuevos.length || n.colonias.length || n.records.length || n.colecciones;
  if (!hay) { if (textoBase) aviso(textoBase); return; }
  // Si una serie ganó varias metas a la vez, se muestra la más alta
  const mejores = Object.values(n.nuevos.reduce((a, l) => { const k = l.tipo + (l.cat || l.grupo || ''); if (!a[k] || a[k].m < l.m) a[k] = l; return a; }, {}));
  const premios = mejores.filter((l) => l.on && nivelPremio(l.m) === l.m && premioDe(l));
  const titulo = n.nuevos.length > 1 ? `¡${n.nuevos.length} nuevas medallas!` : n.nuevos.length ? '¡Nueva medalla!' : '¡Nuevo récord!';
  abrirHoja(() => `${cabeza('')}<div class="unlock">
    <div class="burst" aria-hidden="true"></div>
    <h1 class="serif unlock-t">${titulo}</h1>
    ${n.colonias.map((c) => `<div class="banner" style="margin-bottom:10px;justify-content:center">${ic('map-pin')} Nueva colonia: <b>${esc(c)}</b></div>`).join('')}
    <div class="medals nuevas">${n.nuevos.map(medalla).join('')}</div>
    ${premios.map((l) => premioNuevoHTML(l)).join('')}
    ${n.colecciones ? `<div class="banner coleccion-nueva">${ic('cards')}<span>${esc(n.colecciones >= C.COLECCIONES_MAX ? C.COLECCION_MAXIMO : C.COLECCION_NUEVA.replace('{n}', n.colecciones))}</span></div>` : ''}
    ${mejores.map((l) => { const sig = siguienteMeta(l); return `<div class="meta-sig"><div class="row between tiny"><span>${esc(l.titulo)}</span>
      <span>${sig ? `${l.v} / ${sig}` : 'meta máxima'}</span></div><div class="progress"><div style="width:${sig ? Math.min(100, Math.round(l.v / sig * 100)) : 100}%"></div></div></div>`; }).join('')}
    ${n.records.map((r) => `<p class="row" style="justify-content:center">${ic(r.icon)} ${esc(r.texto)}</p>`).join('')}
    <button class="btn block" data-act="cerrar" style="margin-top:18px">${ic('check')}</button></div>`, null, 'logro');
  confeti(160, 2200);
}

// Bloque de la celebración: el pin con su premio nuevo y, desde la corona, el color a elegir
function colorPremioActual(tipo, id) {
  if (tipo === 'cat') { const c = S.cats.find((x) => x.id === id); return (c && c.premio_color) || 'oro'; }
  const g = ((S.stats && S.stats.premios_grupos) || []).find((x) => x.id === id); return (g && g.premio_color) || 'oro';
}
function selectorColorPremio(tipo, id, actual) {
  return `<div class="swatches premio-colores" role="group" aria-label="${esc(C.AYUDA.color_premio)}">${Object.keys(C.COLORES_PREMIO).map((k) =>
    `<button type="button" data-act="color_premio" data-tipo="${tipo}" data-id="${id}" data-v="${k}" class="${k === actual ? 'on' : ''}" style="background:${C.COLORES_PREMIO[k]}" aria-label="${esc(C.NOMBRES_PREMIO[k])}" data-tip="${esc(C.NOMBRES_PREMIO[k])}"></button>`).join('')}</div>`;
}
function premioNuevoHTML(l) {
  const pr = premioDe(l), tipo = l.tipo, id = l.cat || l.grupo, k = colorPremioActual(tipo, id);
  return `<div class="premio-nuevo"><div class="pin-muestra">${pinHTML(l.color, l.icon, l.m, k)}</div>
    <p><b>${esc(C.PREMIO_GANADO.replace('{titulo}', l.titulo).replace('{premio}', pr.nombre))}</b></p>
    ${l.m >= 100 ? `<p class="tiny">${esc(C.AYUDA.color_premio)}</p>${selectorColorPremio(tipo, id, k)}` : ''}</div>`;
}
const limiteCategorias = () => (S.stats && S.stats.limite_categorias) || C.MAX_CATEGORIAS;
const nivelDe = (tipo, id) => {
  const lista = tipo === 'cat' ? ((S.stats && S.stats.categorias) || []) : ((S.stats && S.stats.premios_grupos) || []);
  const x = lista.find((y) => y.id === id); return x ? x.total : 0;
};

/* Editar hallazgo (si el nombre ya existe, ofrece juntarlos) */
function editarHallazgo(id) {
  const c = S.cache.get(id); if (!c) return;
  const E = { pos: { lat: c.lat, lng: c.lng, acc: c.accuracy }, movido: false };
  abrirHoja(() => `${cabeza(ic('pencil'))}
    ${c.group_id ? `<div class="campo-fila">${catBadge(c.cat_name, c.cat_icon, c.cat_color)} ${ic('users')}</div>`
      : `<div class="campo-fila"><div class="chips una-fila" data-pick="cat">${S.cats.map((x) =>
        chipColor('elegir', x.id, x.name, x.icon, x.color, x.id === c.category_id)).join('')}</div></div>`}
    <div class="row" style="gap:8px;align-items:stretch">
      <label class="campo-ic grow">${ic('pencil')}<input id="e-nombre" class="in compacto" maxlength="60" value="${esc(c.name)}" aria-label="Nombre"></label>
      ${c.group_id ? '' : `<div class="toggle mini" data-pick="priv">
        <button type="button" data-act="elegir" data-v="0" class="${!c.is_private ? 'on' : ''}" data-tip="${C.AYUDA.publico}" aria-label="${C.AYUDA.publico}">${ic('eye')}</button>
        <button type="button" data-act="elegir" data-v="1" class="${c.is_private ? 'on' : ''}" data-tip="${C.AYUDA.privado}" aria-label="${C.AYUDA.privado}">${ic('lock')}</button></div>`}
    </div>
    <label class="campo-ic">${ic('info-circle')}<textarea id="e-nota" class="in compacto crece" rows="1" maxlength="140" placeholder="${esc(C.NOTA_PISTA)}" aria-label="Nota">${esc(c.note || '')}</textarea></label>
    ${filaGuardar('guardar_edicion', null, '', `data-id="${c.id}"`)}
    <div class="mapa-caja"><div class="minimap" id="mini-ed"></div></div>`,
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
    // Si cambió entre privado y público, sus fotos cambian de almacén
    if (!c.group_id) await moverFotosHallazgo(id, cambios.is_private);
    procesarFotosPorBorrar(); // al volverse secreto, su foto mediana del muro se quita del almacén público
    const nueva = await api.card(id); if (nueva) guarda([nueva]);
    S.stats = null;
    cerrarHoja(); refrescarFicha(id); refrescarActual(); aviso('Guardado');
  } catch (e) { ocupado(btn, false); fallo(e); }
}
async function moverFotosHallazgo(id, aPrivado) {
  const f = await api.card(id); if (!f) return;
  const esPriv = (x) => String(x || '').startsWith('priv:');
  if ([f.photo, f.thumb].some((x) => x && esPriv(x) !== aPrivado)) {
    const photo = await api.moverFoto(f.photo, aPrivado), thumb = await api.moverFoto(f.thumb, aPrivado);
    await api.updateFind(id, { photo, thumb });
  }
  const hist = await api.history(id);
  for (const h of hist.filter((x) => x.user_id === S.user.id)) {
    if ([h.photo, h.thumb].some((x) => x && esPriv(x) !== aPrivado)) {
      const photo = await api.moverFoto(h.photo, aPrivado), thumb = await api.moverFoto(h.thumb, aPrivado);
      await api.updateSighting(h.id, { photo, thumb });
    }
  }
}
async function ofrecerJuntar(c, nombre, cat, grupo) {
  try {
    const otroId = await api.findByName(nombre, cat, grupo);
    let otro = otroId && (cartaConFotos(otroId) || await api.card(otroId));
    if (!otro) return aviso('Ese nombre ya existe aquí', 'alert-triangle');
    guarda([otro]);
    if (otro.user_id !== S.user.id) return aviso(`"${otro.name}" ya existe en el grupo. Usa otro nombre`, 'alert-triangle');
    const cambia = !!c.is_private !== !!otro.is_private;
    const si = await confirmar(`Ya existe "${otro.name}". ¿Juntarlos en uno solo? Sus fotos quedan en la misma historia.${cambia ? (otro.is_private ? ' Todo quedará privado.' : ' Todo quedará público, con su ubicación.') : ''}`, 'git-merge', otro.thumb || otro.photo ? foto(otro, true) : '', 'git-merge');
    if (!si) return aviso('Cambia el nombre', 'pencil');
    await api.merge(c.id, otro.id);
    await moverFotosHallazgo(otro.id, !!otro.is_private).catch((e) => console.error(e));
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
        ${ib('ir_al_punto', 'navigation', 'ir_al_punto', `data-id="${c.id}"`, 'sm')}</div>`).join('') || `<div class="empty">${ic('walk')}<p>Nada registrado a menos de ${metros(C.CERCA_METROS)}</p></div>`) : ''}`;
  const hoja = { render, after: (r) => { r._cerca = D; }, tipo: 'cerca' };
  pila.push(hoja); dibujarHoja();
  getPos().then(async (p) => {
    D.pos = p; ponerYo(p);
    const l = guarda(await api.cardsInBox(cajaAlrededor(p, C.CERCA_METROS), { limit: 300, sinSilenciados: true }));
    D.lista = l.map((c) => Object.assign({}, c, { dist: distancia(p, c) })).filter((c) => c.dist <= C.CERCA_METROS).sort((a, b) => a.dist - b.dist);
    D.estado = 'ok';
  }).catch((e) => { D.estado = 'error'; if (!(e && typeof e.code === 'number') && !(e && e.message === 'NO_GPS')) fallo(e); })
    .finally(() => { if (pila.includes(hoja) && hojaArriba() === hoja) dibujarHoja(); });
}

/* Campeones (de toda la comunidad o de un grupo): arriba el top de fotos de 7 días, abajo la tabla con podio */
function tablaGeneral(grupo) {
  const g = grupo ? miGrupo(grupo) : null;
  const D = { metric: 'total', filas: {}, fotos: null, grupo };
  const hoja = { render: () => `${cabeza(`${ic('trophy')} ${esc(g ? g.name : C.CAMPEONES_TITULO)}`)}
    <div class="sec campeones-fotos"><h3>${ic('sparkles')} ${esc(C.TOP_FOTOS)}</h3>
      <p class="tiny top-nota">${esc(C.TOP_TEXTO)}</p>${topFotosHTML(D)}</div>
    <div class="sec"><div class="row between campeones-tabla-cab"><h3>${ic('trophy')} ${esc(C.CAMPEONES_TABLA)}</h3>
      <div class="toggle mini campeones-metrica">
        <button type="button" data-act="tabla_metrica" data-v="total" class="${D.metric === 'total' ? 'on' : ''}" aria-pressed="${D.metric === 'total'}">${ic('photo')} ${esc(C.CAMPEONES_HALLAZGOS)}</button>
        <button type="button" data-act="tabla_metrica" data-v="colonias" class="${D.metric === 'colonias' ? 'on' : ''}" aria-pressed="${D.metric === 'colonias'}">${ic('map-pin')} ${esc(C.CAMPEONES_COLONIAS)}</button></div></div>
      ${podioHTML(D)}</div>`,
    after: (r) => { r._tabla = D; }, tipo: 'tabla' };
  pila.push(hoja); dibujarHoja();
  const pintar = () => { if (hojaArriba() === hoja) dibujarHoja(); };
  // La tabla de cada métrica se pide una vez (colonias solo al tocarla)
  D.cargar = async () => {
    const m = D.metric;
    if (D.filas[m]) return pintar();
    pintar();
    try { D.filas[m] = await api.leaderboard(m, D.grupo); } catch (e) { D.filas[m] = []; fallo(e); }
    pintar();
  };
  (async () => {
    try {
      const top = await api.topFotos(D.grupo);
      const cards = top.length ? guarda(await api.cardsByIds(top.map((t) => t.find_id))) : [];
      D.fotos = top.map((t) => ({ c: cards.find((x) => x.id === t.find_id), puntos: t.puntos })).filter((x) => x.c);
    } catch (e) { D.fotos = []; fallo(e); }
    pintar();
  })();
  D.cargar();
}
// Top de los 7 días: las 5 fotos públicas con más reacciones y comentarios (cada uno vale 1); se desliza de lado
function topFotosHTML(D) {
  if (!D.fotos) return `<div class="empty" style="padding:10px"><span class="spin">${ic('loader-2')}</span></div>`;
  if (!D.fotos.length) return `<div class="empty" style="padding:10px">${ic('sparkles')}<p>${esc(C.TOP_VACIO)}</p></div>`;
  return `<div class="top-carrusel">${D.fotos.map(({ c, puntos }, i) => `
    <button type="button" class="top-ft ${i === 0 ? 'primera' : ''}" data-act="ficha" data-id="${c.id}" aria-label="${esc(c.name)}">
      <span class="top-img"><img src="${foto(c, true)}" alt="" loading="lazy">
        <span class="top-pos">${i === 0 ? ic('crown') : i + 1}</span><span class="top-pts">${ic('heart')}${puntos}</span></span>
      <b>${esc(c.name)}</b><span class="tiny">${esc(c.user_name)}</span></button>`).join('')}</div>`;
}
// Podio de las tres primeras (la primera al centro) y la lista desde el 4.º lugar
function podioHTML(D) {
  const filas = D.filas[D.metric];
  if (!filas) return `<div class="empty"><span class="spin">${ic('loader-2')}</span></div>`;
  if (!filas.length) return `<div class="empty">${ic('trophy')}<p>Todavía no hay nadie en la tabla</p></div>`;
  const valor = (f) => (D.metric === 'colonias' ? f.colonias : f.total);
  const unidad = (n) => (D.metric === 'colonias' ? (n === 1 ? 'colonia' : 'colonias') : (n === 1 ? 'hallazgo' : 'hallazgos'));
  const escalon = (f, k) => (f ? `<button type="button" class="podio-p p${k} ${f.user_id === S.user.id ? 'yo' : ''}" data-act="perfil" data-id="${f.user_id}" aria-label="${k}. ${esc(f.name)}">
      ${avatar(f, k === 1 ? 'lg' : '')}<span class="podio-nom">${esc(f.name)}</span>
      <span class="podio-esc">${ic(k === 1 ? 'crown' : 'medal')}<b>${valor(f)}</b><span>${unidad(valor(f))}</span></span></button>` : '<span></span>');
  return `<div class="podio">${escalon(filas[1], 2)}${escalon(filas[0], 1)}${escalon(filas[2], 3)}</div><div class="podio-base"></div>
    ${filas.length > 3 ? `<div class="list">${filas.slice(3).map((f, i) => `
      <button class="li ${f.user_id === S.user.id ? 'yo' : ''}" data-act="perfil" data-id="${f.user_id}">
        <span class="rank">${i + 4}</span>${avatar(f)}<b class="grow" style="text-align:left">${esc(f.name)}</b><b>${valor(f)}</b></button>`).join('')}</div>` : ''}`;
}

/* Invitar a un grupo: amigas dentro de la app, WhatsApp o enlace, y readmitir (esto último solo administradoras).
   En un grupo normal invita cualquier miembro; en uno de encuentro, quien lo creó y sus coadministradoras. */
function datosGrupo(gid) {
  const h = pila.slice().reverse().find((x) => x.tipo === 'grupo' && x.datos && x.datos.g && x.datos.g.id === gid);
  const E = encuentroActual(), ge = E && E.e && E.e.grupo && E.e.grupo.id === gid ? E.e.grupo : null;
  const g = ge || (h && h.datos.g) || miGrupo(gid);
  return { g, recargar: () => { if (h) h.datos.cargar(); if (ge) E.cargar(); } };
}
function enlaceGrupo(g) { return g && g.invite_code ? `${location.origin + location.pathname}#g=${g.invite_code}` : ''; }
function hojaInvitar(gid) {
  const { g } = datosGrupo(gid); if (!g) return;
  const D = { gid, amigas: null, vetados: [] };
  const fila = (a) => {
    const estado = a.estado === 'pendiente' ? `<span class="tiny invit-estado">${ic('clock')} ${esc(C.INVITAR_ENVIADA)}</span>`
      : a.estado === 'rechazada' ? `<span class="tiny invit-estado">${esc(C.INVITAR_RECHAZADA)}</span>` : '';
    return `<div class="li"><button class="row grow" data-act="perfil" data-id="${a.user_id}" style="text-align:left;min-width:0">${avatar(a)}
        <div class="grow" style="min-width:0"><b>${esc(a.name)}</b>${estado ? `<div>${estado}</div>` : ''}</div></button>
      ${a.estado === 'pendiente' ? '' : `<button class="btn sm" data-act="invitar_amiga" data-g="${gid}" data-id="${a.user_id}">${ic(a.estado === 'rechazada' ? 'refresh' : 'user-plus')} ${esc(a.estado === 'rechazada' ? C.INVITAR_DE_NUEVO : C.INVITAR_BOTON)}</button>`}</div>`;
  };
  const hoja = { render: () => {
      const enlace = enlaceGrupo(datosGrupo(gid).g);
      return `${cabeza(`${ic('user-plus')} ${esc(C.INVITAR_A.replace('{g}', g.name))}`)}
      <div class="sec"><h3>${ic('users')} ${esc(C.INVITAR_AMIGAS)}</h3>
        ${D.amigas === null ? `<div class="empty" style="padding:10px"><span class="spin">${ic('loader-2')}</span></div>`
          : D.amigas.length ? `<div class="list">${D.amigas.map(fila).join('')}</div>` : `<p class="tiny">${esc(C.INVITAR_SIN_AMIGAS)}</p>`}</div>
      ${enlace ? `<div class="sec"><h3>${ic('link')} ${esc(C.INVITAR_FUERA)}</h3><div class="row wrap">
        <button class="btn alt sm" data-act="invitar_whatsapp" data-g="${gid}">${ic('brand-whatsapp')} WhatsApp</button>
        <button class="btn alt sm" data-act="copiar_invitacion" data-g="${gid}">${ic('copy')} ${esc(C.INVITAR_COPIAR)}</button></div></div>` : ''}
      ${D.vetados.length ? `<div class="sec"><h3>${ic('user-minus')} ${esc(C.VETADOS_TITULO)}</h3><p class="tiny">${esc(C.VETADOS_TEXTO)}</p>
        <div class="list">${D.vetados.map((v) => `<div class="li">${avatar(v)}<b class="grow">${esc(v.name)}</b>
          <button class="btn alt sm" data-act="readmitir_persona" data-g="${gid}" data-id="${v.user_id}">${ic('user-check')} ${esc(C.READMITIR)}</button></div>`).join('')}</div></div>` : ''}`;
    }, tipo: 'invitar' };
  hoja.datos = D;
  D.cargar = async () => {
    try { [D.amigas, D.vetados] = await Promise.all([api.amigasParaInvitar(gid), api.vetadosDeGrupo(gid)]); }
    catch (e) { D.amigas = D.amigas || []; D.vetados = D.vetados || []; fallo(e); }
    if (pila.includes(hoja) && hojaArriba() === hoja) dibujarHoja();
  };
  pila.push(hoja); dibujarHoja();
  D.cargar();
}
// Menú de una persona en un grupo normal (en los de encuentro está hojaMiembroEncuentro)
function hojaMiembroGrupo(gid, uid) {
  const h = pila.slice().reverse().find((x) => x.tipo === 'grupo' && x.datos && x.datos.g && x.datos.g.id === gid);
  const m = h && (h.datos.miembros || []).find((x) => x.user_id === uid); if (!m) return;
  const soyDuena = h.datos.g.owner === S.user.id;
  abrirHoja(() => `${cabeza(`<span class="row">${avatar(m)} ${esc(m.name)}</span>`)}
    <div class="list">
      ${soyDuena ? `<button class="li" data-act="coadmin_grupo" data-g="${gid}" data-id="${uid}" data-v="${m.coadmin ? '0' : '1'}">${ic('shield')}<b class="grow" style="text-align:left">${m.coadmin ? 'Quitar cargo de coadministradora' : 'Nombrar coadministradora'}</b></button>` : ''}
      <button class="li" data-act="sacar_grupo" data-g="${gid}" data-id="${uid}">${ic('user-minus')}<b class="grow" style="text-align:left">Sacar del grupo</b></button>
    </div>`, null, 'miembro_grupo');
}

/* Buscar personas por nombre: 1 o 2 letras = nombre exacto; desde 3, nombres que lo contienen (máx. 10) */
function hojaBuscarPersonas() {
  const D = { q: '', res: null, pedido: 0, espera: null };
  const resHTML = () => {
    const t = D.q.trim();
    if (!t) return `<p class="tiny buscar-pista">${esc(C.BUSCAR_PISTA)}</p>`;
    if (D.res === null) return `<div class="empty" style="padding:10px"><span class="spin">${ic('loader-2')}</span></div>`;
    if (!D.res.length) return `<div class="empty" style="padding:10px">${ic('user-search')}<p>${esc(t.length < 3 ? C.BUSCAR_NADA_CORTO : C.BUSCAR_NADA)}</p></div>`;
    return `<div class="list">${D.res.map((p) => { const sigo = S.following.has(p.id);
      return `<div class="li persona-res">
        <button class="row grow" data-act="perfil" data-id="${p.id}" style="text-align:left;min-width:0">${avatar(p)}
          <div class="grow" style="min-width:0"><b>${esc(p.name)}</b><div class="tiny">${p.bio ? esc(p.bio) + ' · ' : ''}${p.hallazgos} ${p.hallazgos === 1 ? 'hallazgo' : 'hallazgos'}</div></div></button>
        ${ib('seguir', sigo ? 'user-check' : 'user-plus', sigo ? 'dejar_seguir' : 'seguir', `data-id="${p.id}"`, sigo ? 'sm' : 'sm on')}</div>`; }).join('')}</div>`;
  };
  D.pintarRes = () => { const el = $('#buscar-res'); if (el) el.innerHTML = resHTML(); };
  const buscar = async () => {
    const t = D.q.trim(), n = ++D.pedido;
    if (!t) { D.res = null; return D.pintarRes(); }
    D.res = null; D.pintarRes();
    try { const r = await api.buscarPersonas(t); if (n === D.pedido) { D.res = r || []; D.pintarRes(); } }
    catch (e) { if (n === D.pedido) { D.res = []; D.pintarRes(); fallo(e); } }
  };
  const hoja = { render: () => `${cabeza(`${ic('search')} ${esc(C.BUSCAR_TITULO)}`)}
      <label class="campo-ic">${ic('search')}<input id="buscar-q" class="in" type="search" maxlength="40" autocomplete="off" enterkeyhint="search"
        placeholder="${esc(C.BUSCAR_CAMPO)}" aria-label="${esc(C.BUSCAR_CAMPO)}" value="${esc(D.q)}"></label>
      <div id="buscar-res" style="margin-top:12px">${resHTML()}</div>`,
    after: (raiz) => {
      const inp = $('#buscar-q', raiz); if (!inp) return;
      inp.addEventListener('input', () => { D.q = inp.value; clearTimeout(D.espera); D.espera = setTimeout(buscar, 400); });
      inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); clearTimeout(D.espera); buscar(); } });
      if (!D.q) setTimeout(() => inp.focus(), 60);
    }, tipo: 'buscar' };
  hoja.datos = D;
  pila.push(hoja); dibujarHoja();
}

/* Categorías */
function hojaCategorias(alTerminar) {
  const render = () => `${cabeza(ic('cards'))}
    <div class="instruccion"><p>${esc(C.TEXTO_CATEGORIAS)}</p>
      <div class="tiny row wrap"><span class="row">${ic('pencil')} editar</span><span class="row">${ic('trash')} borrar</span><span class="row">${ic('plus')} nueva categoría</span></div></div>
    <div class="list">${S.cats.map((c) => `<div class="li"><span class="avatar" style="background:${okColor(c.color)}">${ic(c.icon)}</span>
      <b class="grow">${esc(c.name)}</b>${ib('editar_categoria', 'pencil', 'editar', `data-id="${c.id}"`, 'sm')}${ib('borrar_categoria', 'trash', 'borrar', `data-id="${c.id}"`, 'sm')}</div>`).join('')}</div>
    <p class="tiny" style="margin:10px 0">${S.cats.length} / ${limiteCategorias()}${S.cats.length >= C.COLECCIONES_MAX ? ` · ${esc(C.COLECCION_MAXIMO_CORTO)}` : ''}</p>
    ${S.cats.length < limiteCategorias() ? `<button class="btn alt block" data-act="editar_categoria" data-id="" aria-label="${esc(C.AYUDA.nueva_categoria)}" data-tip="${esc(C.AYUDA.nueva_categoria)}">${ic('plus')}</button>` : ''}
    ${alTerminar ? `<button class="btn block" data-act="listo_categorias" style="margin-top:12px" ${S.cats.length ? '' : 'disabled'}>${ic('check')} Listo</button>` : ''}`;
  abrirHoja(render, null, 'categorias', !!alTerminar);
  const hoja = hojaArriba(); hoja.listo = alTerminar;
  if (!S.stats && S.user && S.me) api.stats(S.user.id).then((st) => { S.stats = st; if (hojaArriba() === hoja) dibujarHoja(); }).catch(() => null);
}
function editarCategoria(id) {
  const c = S.cats.find((x) => x.id === id) || { id: '', name: '', icon: C.ICONOS_GRUPOS[0].iconos[0], color: C.COLORES_CATEGORIA[S.cats.length % C.COLORES_CATEGORIA.length] };
  abrirHoja(() => `${cabeza(ic(c.id ? 'pencil' : 'plus'))}
    <div class="field"><label for="c-nombre">${ic('pencil')} Nombre</label><input id="c-nombre" class="in" maxlength="30" value="${esc(c.name)}" placeholder="Gatos, puertas, autos…"></div>
    <div class="field"><label>${ic('palette')}</label>${selector('color', C.COLORES_CATEGORIA, c.color, 'color')}</div>
    <div class="field"><label>${ic('sparkles')}</label>${iconPicker(c.icon)}</div>
    ${c.id && nivelDe('cat', c.id) >= 100 ? `<div class="field"><label>${ic('crown')} ${esc(C.AYUDA.color_premio)}</label>
      <div class="swatches" data-pick="premio">${Object.keys(C.COLORES_PREMIO).map((k) => `<button type="button" data-act="elegir" data-v="${k}" class="${k === (c.premio_color || 'oro') ? 'on' : ''}" style="background:${C.COLORES_PREMIO[k]}" aria-label="${esc(C.NOMBRES_PREMIO[k])}"></button>`).join('')}</div></div>` : ''}
    <button class="btn block" data-act="guardar_categoria" data-id="${c.id}">${ic('check')} Guardar</button>`, null, 'categoria');
}
async function guardarCategoria(btn, id) {
  const raiz = $('.sheet');
  const d = { name: $('#c-nombre', raiz).value.trim(), icon: iconoElegido(raiz), color: valor(raiz, 'color') };
  const pc = valor(raiz, 'premio'); if (pc) d.premio_color = pc;
  if (!d.name) return aviso('Ponle un nombre', 'pencil');
  if (!esIcono(d.icon) || !d.color) return aviso('Elige ícono y color', 'palette');
  ocupado(btn, true);
  try {
    if (id) await api.updateCat(id, d); else await api.addCat(d);
    S.cats = await api.listCats(S.user.id);
    S.stats = await api.stats(S.user.id).catch(() => null);
    cerrarHoja(); aviso('Guardado');
    if (!$('#scr-map')) return;
    if (S.tab !== 'map') irA(S.tab); else pintarFiltrosMapa();
  } catch (e) { ocupado(btn, false); fallo(e); }
}

/* Grupos */
async function recargarGrupos() { S.groups = await api.myGroups(S.user.id); pintarAtajoMapa(); revisarGrupoMapa(); }
const gruposCreados = () => S.groups.filter((g) => g.owner === S.user.id).length;
function abrirGrupo(gid) {
  if (esEncuentro(miGrupo(gid))) return abrirEncuentro(gid);
  const D = { g: miGrupo(gid) || null, miembros: null, cards: null };
  const render = () => {
    const g = D.g;
    if (!g) return cabeza('') + `<div class="empty"><span class="spin">${ic('loader-2')}</span></div>`;
    const soyDuena = g.owner === S.user.id, soyMiembro = !!miGrupo(g.id);
    const yoM = (D.miembros || []).find((m) => m.user_id === S.user.id), soyAdmin = soyDuena || !!(yoM && yoM.coadmin);
    return `${cabeza(`<span class="row">${ic(g.icon)} ${esc(g.name)}</span>`)}
      <div class="row wrap" style="margin-bottom:12px">
        <span class="catb" style="background:${okColor(g.color)}">${ic(g.is_public ? 'world' : 'lock')}${esc(g.is_public ? C.AYUDA.grupo_publico : C.AYUDA.grupo_privado)}</span>
        <span class="muted row">${ic('users')} ${D.miembros ? D.miembros.length : '…'}</span></div>
      <div class="row wrap" style="margin-bottom:14px">
        ${soyMiembro ? `<button class="btn sm" data-act="invitar_grupo" data-id="${g.id}">${ic('user-plus')} ${esc(C.INVITAR_BOTON)}</button>` : ''}
        ${ib('ver_grupo_mapa', 'map-2', 'ver_mapa', `data-id="${g.id}"`)}
        ${ib('tabla_grupo', 'trophy', 'tabla', `data-id="${g.id}"`)}
        ${soyMiembro ? ib('descargar_fichas', 'download', C.PDF_TITULO, `data-tipo="grupo" data-id="${g.id}"`) : ''}
        ${soyDuena ? ib('editar_grupo', 'pencil', 'editar', `data-id="${g.id}"`) : ''}
        ${g.is_public && !soyMiembro ? (() => { const m = S.mutes.find((x) => x.target_group === g.id);
          return m ? ib('quitar_silencio', 'volume', 'quitar_silencio', `data-id="${m.id}"`, 'on') : ib('silenciar', 'volume-off', 'silenciar', `data-group="${g.id}"`); })() : ''}
        <span class="grow"></span>
        ${soyMiembro && !soyDuena ? ib('salir_grupo', 'door-exit', 'salir_grupo', `data-id="${g.id}"`) : ''}
      </div>
      ${soyMiembro && nivelDe('grupo', g.id) >= 100 ? `<div class="field"><label>${ic('crown')} ${esc(C.AYUDA.color_premio)}</label>${selectorColorPremio('grupo', g.id, colorPremioActual('grupo', g.id))}</div>` : ''}
      ${D.miembros ? (soyAdmin ? `<div class="list miembros-grupo" style="margin-bottom:14px">${D.miembros.map((m) => {
          const duena = m.user_id === g.owner, gestionar = m.user_id !== S.user.id && !duena && (soyDuena || !m.coadmin);
          return `<div class="li"><button class="row grow" data-act="perfil" data-id="${m.user_id}" style="text-align:left;min-width:0">${avatar(m)}<b class="grow">${esc(m.name || '')}</b>
            ${duena ? `<span data-tip="${esc(C.AYUDA.duena)}">${ic('crown')}</span>` : m.coadmin ? `<span data-tip="${esc(C.AYUDA.coadmin)}">${ic('shield')}</span>` : ''}</button>
            ${gestionar ? ib('miembro_grupo', 'dots-vertical', 'miembro', `data-id="${m.user_id}" data-g="${g.id}"`, 'sm') : ''}</div>`; }).join('')}</div>`
        : `<div class="chips" style="flex-wrap:wrap;margin-bottom:14px">${D.miembros.map((m) => `<button class="chip" data-act="perfil" data-id="${m.user_id}">${avatar(m)}${esc(m.name || '')}${m.user_id === g.owner ? ic('crown') : m.coadmin ? ic('shield') : ''}</button>`).join('')}</div>`) : ''}
      ${D.cards === null ? `<div class="empty"><span class="spin">${ic('loader-2')}</span></div>` : D.cards.length ? rejilla(D.cards, false)
        : `<div class="empty">${ic('camera')}<p>Aún no hay hallazgos en este grupo</p></div>`}`;
  };
  abrirHoja(render, null, 'grupo');
  const hoja = hojaArriba();
  D.cargar = async () => {
    try {
      const [g, miembros, cards] = await Promise.all([api.getGroup(gid), api.groupMembers(gid), api.groupCards(gid)]);
      if (!S.stats) S.stats = await api.stats(S.user.id).catch(() => null);
      if (!g) { if (hojaArriba() === hoja) cerrarHoja(); return aviso('Este grupo ya no está disponible', 'alert-triangle'); }
      if (esEncuentro(g)) { if (hojaArriba() === hoja) pila.pop(); return abrirEncuentro(g.id); }
      Object.assign(D, { g, miembros, cards: guarda(cards) });
    } catch (e) { fallo(e); D.cards = D.cards || []; }
    if (hojaArriba() === hoja) dibujarHoja();
  };
  hoja.datos = D;
  D.cargar();
}
// Al crear se elige el tipo (queda fijo): grupo de colección o grupo de encuentro (privado y oculto)
function editarGrupo(gid, tipoInicial) {
  const g = miGrupo(gid) || { id: '', name: '', icon: 'users', color: C.COLORES_CATEGORIA[1], is_public: false, tipo: tipoInicial === 'encuentro' ? 'encuentro' : 'coleccion' };
  const E = { tipo: g.tipo || 'coleccion', uso: g.uso || C.ENCUENTRO_USOS[0].id };
  const render = () => {
    const enc = E.tipo === 'encuentro';
    return `${cabeza(ic(g.id ? 'pencil' : (enc ? 'lifebuoy' : 'users')))}
    ${g.id ? '' : `<div class="field"><div class="toggle tipo-grupo">
      <button type="button" data-act="tipo_grupo" data-v="coleccion" class="${!enc ? 'on' : ''}">${ic('users')} Grupo</button>
      <button type="button" data-act="tipo_grupo" data-v="encuentro" class="${enc ? 'on' : ''}">${ic('lifebuoy')} Grupo de encuentro</button></div>
      ${enc ? `<p class="tiny">${esc(C.ENCUENTRO_TIPO_TEXTO)}</p>` : ''}</div>`}
    ${!g.id && enc ? `<div class="field"><label>${ic('map-pin')} ¿Para qué es?</label><div class="chips" data-pick="uso" style="flex-wrap:wrap">${C.ENCUENTRO_USOS.map((u) =>
      `<button type="button" class="chip ${u.id === E.uso ? 'on' : ''}" data-act="elegir" data-v="${u.id}">${ic(u.icono)}${esc(u.nombre)}</button>`).join('')}</div></div>` : ''}
    <div class="field"><label for="g-nombre">${ic('pencil')} Nombre</label><input id="g-nombre" class="in" maxlength="40" value="${esc(E.nombre != null ? E.nombre : g.name)}" placeholder="${enc ? 'Viaje a Oaxaca' : 'Gatos de San Rafael'}"></div>
    ${enc ? '' : `<div class="field"><label>${ic('eye')}</label><div class="toggle" data-pick="publico">
      <button type="button" data-act="elegir" data-v="0" class="${g.is_public ? '' : 'on'}" data-tip="${esc(C.AYUDA.grupo_privado)}" aria-label="${esc(C.AYUDA.grupo_privado)}">${ic('lock')} Privado</button>
      <button type="button" data-act="elegir" data-v="1" class="${g.is_public ? 'on' : ''}" data-tip="${esc(C.AYUDA.grupo_publico)}" aria-label="${esc(C.AYUDA.grupo_publico)}">${ic('world')} Público</button></div>
      <p class="tiny">Privado: solo lo ven sus miembros. Público: también aparece para toda la comunidad.</p></div>`}
    <div class="field"><label>${ic('palette')}</label>${selector('color', C.COLORES_CATEGORIA, E.color || g.color, 'color')}</div>
    <div class="field"><label>${ic('sparkles')}</label>${iconPicker(E.icon || g.icon)}</div>
    ${!g.id ? `<p class="tiny">${gruposCreados()} / ${C.MAX_GRUPOS} grupos creados</p>` : ''}
    <button class="btn block" data-act="guardar_grupo" data-id="${g.id}">${ic('check')} Guardar</button>`;
  };
  abrirHoja(render, (r) => { r._grupo = E; }, 'editar_grupo');
  hojaArriba().datos = E;
}
async function guardarGrupo(btn, gid) {
  const raiz = $('.sheet'), E = (hojaArriba() && hojaArriba().datos) || { tipo: 'coleccion' };
  const enc = E.tipo === 'encuentro';
  const d = { name: $('#g-nombre', raiz).value.trim(), icon: iconoElegido(raiz), color: valor(raiz, 'color') };
  if (!enc) d.is_public = valor(raiz, 'publico') === '1';
  if (!gid) { d.tipo = E.tipo; if (enc) { d.uso = valor(raiz, 'uso') || E.uso; d.is_public = false; } }
  if (!d.name) return aviso('Ponle un nombre', 'pencil');
  if (!esIcono(d.icon) || !d.color) return aviso('Elige ícono y color', 'palette');
  if (!gid && gruposCreados() >= C.MAX_GRUPOS) return aviso(`Puedes crear hasta ${C.MAX_GRUPOS} grupos`, 'users');
  ocupado(btn, true);
  try {
    const g = gid ? await api.updateGroup(gid, d) : await api.createGroup(d);
    await recargarGrupos();
    cerrarHoja();
    const top = hojaArriba();
    if (top && top.tipo === 'grupo' && top.datos) top.datos.cargar();
    else if (S.grupo && S.grupo.gid === g.id) S.grupo.cargar(true);
    else abrirGrupo(g.id);
    aviso(gid ? 'Guardado' : 'Grupo creado', enc ? 'lifebuoy' : 'users');
    if (S.tab === 'coleccion') pintarColeccion();
    if (!gid && esEncuentro(g)) ofrecerPush();
  } catch (e) { ocupado(btn, false); fallo(e); }
}
async function mostrarInvitacion(code) {
  let inv = null;
  try { inv = await api.invitePreview(code); } catch (e) { return fallo(e); }
  if (!inv) return aviso('Esa invitación ya no es válida', 'alert-triangle');
  if (inv.already) return abrirGrupo(inv.id);
  const enc = inv.tipo === 'encuentro';
  abrirHoja(() => `${cabeza(`${ic(enc ? 'lifebuoy' : 'users')} Invitación`)}
    <div style="text-align:center;padding:10px 0 4px">
      <span class="avatar lg" style="background:${okColor(inv.color)};margin:0 auto 10px">${ic(inv.icon)}</span>
      <h2>${esc(inv.name)}</h2>
      <p class="muted row" style="justify-content:center">${enc ? `${ic('lifebuoy')} Grupo de encuentro` : `${ic(inv.is_public ? 'world' : 'lock')} ${esc(inv.is_public ? C.AYUDA.grupo_publico : C.AYUDA.grupo_privado)}`} · ${ic('users')} ${inv.members}</p>
      ${enc ? `<p class="tiny">${esc(C.ENCUENTRO_TIPO_TEXTO)}</p>` : ''}
      ${inv.lleno ? `<p class="banner">${ic('users')} ${esc(mensajeError('GRUPO_LLENO'))}</p>`
        : `<button class="btn block" data-act="unirme" data-v="${esc(code)}" style="margin-top:14px">${ic('user-plus')} Unirme</button>`}</div>`, null, 'invitacion');
}

/* ---------------------------------------------------------------------
   GRUPOS DE ENCUENTRO: privados y ocultos. Puntos de encuentro, "Todo bien",
   "Necesito ayuda", "Mira esto" (con juego opcional) y ubicación por tiempo limitado.
   --------------------------------------------------------------------- */
const usoDe = (id) => C.ENCUENTRO_USOS.find((u) => u.id === id) || null;
const hora = (ts) => new Date(ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
// El grupo de encuentro activo vive en el mapa principal (modo grupo); no es una hoja
const encuentroActual = () => S.grupo || null;
function getPosRapida() {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error('NO_GPS'));
    navigator.geolocation.getCurrentPosition((p) => res({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }),
      rej, { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 });
  });
}
function premioMini(n, k) {
  const v = nivelPremio(n || 0); if (!v) return '';
  const id = v >= 500 ? 'sombrero' : v >= 250 ? 'corona2' : v >= 100 ? 'corona' : v >= 50 ? '' : v >= 25 ? 'brote' : 'patito';
  return `<span class="premio-mini" data-tip="${esc((C.PREMIOS[v] || {}).nombre || '')}">${id ? svgPremio(id, k) : BRILLO}</span>`;
}
/* Modo grupo: el grupo de encuentro se maneja desde el mapa principal.
   Arriba, su nombre y una X para salir; en el mapa, solo lo del grupo; abajo, un panel que se sube con el dedo. */
const claveGrupoMapa = () => 'cg_grupo_mapa_' + (S.user ? S.user.id : '');
function recordarGrupoMapa(gid) { if (!S.user) return; try { if (gid) localStorage.setItem(claveGrupoMapa(), gid); else localStorage.removeItem(claveGrupoMapa()); } catch (e) { /* sin almacenamiento */ } }
function leerGrupoMapa() { try { return localStorage.getItem(claveGrupoMapa()) || null; } catch (e) { return null; } }
function abrirEncuentro(gid, foco, op) {
  if (!miGrupo(gid)) return aviso('Este grupo ya no está disponible', 'alert-triangle');
  const mira = op && op.mira;
  cerrarTodo();
  if (S.tab !== 'map') irA('map');
  if (S.grupo && S.grupo.gid === gid) {
    const D = S.grupo;
    if (foco) D.foco = foco;
    if (mira) { D.tab = 'mira'; D.miraAbierta = mira; D.irAMira = true; D.abierto = true; }
    pintarPanelGrupo(D); D.cargar(true);
    return;
  }
  if (S.grupo) salirGrupo(true);
  const D = { gid, e: null, foco: foco || null, error: false, premio: null, tab: mira ? 'mira' : 'tablero', lineas: {}, firma: '',
    miraAbierta: mira || null, irAMira: !!mira, abierto: !!mira, primera: true };
  S.grupo = D; recordarGrupoMapa(gid);
  pintarModoGrupo();
  // Cada 20 s se revisa; el panel y los marcadores solo cambian si llegó algo nuevo
  D.cargar = async (forzar) => {
    const antes = D.firma;
    try {
      const e = await api.estadoEncuentro(gid);
      if (S.grupo !== D) return;
      if (!e) {
        salirGrupo();
        await recargarGrupos().catch(() => null);
        if (S.tab === 'coleccion') pintarColeccion();
        return aviso('Este grupo ya no está disponible', 'alert-triangle');
      }
      D.e = e; D.error = false;
      revisarPremioMira(D);
    } catch (err) {
      if (S.grupo !== D) return;
      D.error = true;
      // Sin señal al abrir: el mapa vuelve a lo normal, pero el teléfono recuerda el grupo para la próxima vez
      if (!D.e) { salirGrupo(); if (esErrorRed(err)) recordarGrupoMapa(gid); return fallo(err); }
    }
    D.firma = JSON.stringify(D.e) + '|' + D.error;
    if (forzar || D.firma !== antes || D.foco || D.primera) {
      pintarCabGrupo(D); pintarPanelGrupo(D); pintarMarcasEncuentro(D);
      if (D.foco) enfocarEncuentro(D); else if (D.primera) verTodoEncuentro(D);
      D.primera = false;
    } else pintarCompartirEncuentro(D);
  };
  D.cargar();
}
function salirGrupo(cambiando) {
  if (!S.grupo) return;
  S.grupo = null;
  // Al salir del modo grupo se deja de compartir la ubicación: no sigue enviándose sin nada en pantalla que lo diga
  if (S.comparte) { api.dejarDeCompartir(S.comparte.gid).catch(() => null); pararCompartir(false); }
  if (!cambiando) recordarGrupoMapa(null);
  if (S.capaEnc) S.capaEnc.clearLayers();
  pintarModoGrupo();
  if (!cambiando) cargarPines();
}
// Cabecera y panel del modo grupo; los filtros y los hallazgos se esconden mientras dura
function pintarModoGrupo() {
  const scr = $('#scr-map'); if (!scr) return;
  const D = S.grupo;
  scr.classList.toggle('modo-grupo', !!D);
  const cab = $('#grupo-cab'), panel = $('#panel-grupo');
  if (!D) { if (cab) { cab.hidden = true; cab.innerHTML = ''; } if (panel) { soltarFoco(panel); panel.hidden = true; panel.innerHTML = ''; } scr.style.removeProperty('--panel-alto'); pintarFiltrosMapa(); return; }
  if (S.capa) S.capa.clearLayers();
  pintarCabGrupo(D); pintarPanelGrupo(D);
}
function pintarCabGrupo(D) {
  const cab = $('#grupo-cab'); if (!cab) return;
  const g = (D.e && D.e.grupo) || miGrupo(D.gid) || {};
  cab.hidden = false;
  cab.innerHTML = `<span class="pastilla-grupo" style="--c:${okColor(g.color)}">${ic('lifebuoy')}<span class="grow">${esc(g.name || '')}</span>
      ${D.e ? `<span class="n">${ic('users')} ${D.e.miembros.length}</span>` : ''}${D.error ? `<span class="n">${ic('cloud-off')}</span>` : ''}</span>
    ${ib('avisos', 'mail-heart', 'avisos', 'data-campana', 'sm')}${ib('encuentro_guia', 'help', 'encuentro_guia', '', 'sm')}${ib('salir_grupo_mapa', 'x', 'salir_grupo_mapa', '', 'sm')}`;
  pintarCampana();
}
// La última alerta (o el último aviso) para tenerla a la vista con el panel recogido
function alertaGrupoHTML(D) {
  const e = D.e;
  const con = e.miembros.filter((m) => m.estado).sort((a, b) => (b.estado.kind === 'ayuda') - (a.estado.kind === 'ayuda') || String(b.estado.created_at).localeCompare(String(a.estado.created_at)));
  const m = con[0]; if (!m) return `<p class="tiny panel-pista">${esc(C.GRUPO_PANEL_PISTA)}</p>`;
  const st = m.estado, est = C.ENCUENTRO_ESTADOS[st.kind];
  return `<button type="button" class="li miembro ${st.kind === 'ayuda' ? 'pide-ayuda' : ''}" data-act="${st.lat != null ? 'ver_en_mapa_enc' : 'grupo_panel'}" data-id="${m.user_id}" style="text-align:left;width:100%">
    ${avatar(m)}<div class="grow" style="min-width:0"><b>${esc(m.name)}</b> · ${esc(est.nombre)}<div class="tiny">${esc(hace(st.created_at))}${st.colonia ? ` · ${esc(st.colonia)}` : ''}${st.note ? ` · «${esc(st.note)}»` : ''}</div></div></button>`;
}
function pintarPanelGrupo(D) {
  const p = $('#panel-grupo'); if (!p || S.grupo !== D) return;
  const cuerpoAntes = $('.panel-cuerpo', p), arriba = cuerpoAntes ? cuerpoAntes.scrollTop : 0;
  soltarFoco(p);
  p.hidden = false;
  p.classList.toggle('abierto', !!D.abierto);
  if (!D.e) { p.innerHTML = `<div class="empty" style="padding:16px"><span class="spin">${ic('loader-2')}</span></div>`; return; }
  p.innerHTML = `<button type="button" class="asa" data-act="grupo_panel" aria-expanded="${D.abierto ? 'true' : 'false'}" aria-label="${esc(D.abierto ? C.GRUPO_PANEL_BAJAR : C.GRUPO_PANEL_SUBIR)}"><span></span></button>
    <div class="enc-botones">
      <button class="enc-btn bien" data-act="estado_encuentro" data-v="bien">${ic(C.ENCUENTRO_ESTADOS.bien.icono)}<span>${esc(C.ENCUENTRO_ESTADOS.bien.corto)}</span></button>
      <button class="enc-btn ayuda" data-act="estado_encuentro" data-v="ayuda">${ic(C.ENCUENTRO_ESTADOS.ayuda.icono)}<span>${esc(C.ENCUENTRO_ESTADOS.ayuda.corto)}</span></button>
      <button class="enc-btn mira" data-act="mira_nuevo">${ic('eye')}<span>${esc(C.ENCUENTRO_MIRA)}</span></button>
    </div>
    <div class="row panel-fila"><span id="enc-compartir" class="grow" style="min-width:0">${encCompartirHTML(D)}</span>
      ${ib('punto_nuevo', 'flag', 'punto_nuevo', '', 'sm')}${ib('ubicar', 'current-location', 'ubicar', '', 'sm')}${ib('enc_ver_todo', 'arrows-maximize', 'ver_todo', '', 'sm')}</div>
    ${D.abierto ? `<div class="panel-cuerpo"><div id="enc-arriba">${encArribaHTML(D)}</div><div id="enc-abajo">${encAbajoHTML(D)}</div></div>` : alertaGrupoHTML(D)}`;
  const c = $('.panel-cuerpo', p); if (c && arriba) c.scrollTop = arriba;
  // los créditos del mapa (OpenStreetMap) quedan justo arriba del panel
  $('#scr-map').style.setProperty('--panel-alto', p.offsetHeight + 'px');
  montarPanelGrupo(p, D);
  llevarAMira(D);
}
// Deslizar el asa hacia arriba sube el panel; hacia abajo, lo recoge
function montarPanelGrupo(p, D) {
  const asa = $('.asa', p); if (!asa) return;
  let y0 = null;
  asa.addEventListener('touchstart', (ev) => { y0 = ev.touches[0].clientY; }, { passive: true });
  asa.addEventListener('touchend', (ev) => {
    if (y0 == null) return;
    const dy = ev.changedTouches[0].clientY - y0; y0 = null;
    if (Math.abs(dy) < 30) return;
    ev.preventDefault();
    D.abierto = dy < 0; pintarPanelGrupo(D);
  });
}
function pintarCompartirEncuentro(D) {
  const el = $('#enc-compartir'); if (el && D.e && S.grupo === D) el.innerHTML = encCompartirHTML(D);
}
function encArribaHTML(D) {
  const e = D.e, g = e.grupo, uso = usoDe(g.uso);
  const linea = (k, icono, titulo, texto) => `<button type="button" class="enc-linea ${D.lineas[k] ? 'abierta' : ''}" data-act="enc_linea" data-v="${k}" aria-expanded="${D.lineas[k] ? 'true' : 'false'}">
    ${ic(icono)}<span><b>${esc(titulo)}:</b> ${esc(texto)}</span></button>`;
  return `<div class="row wrap enc-cabeza">
      <span class="catb" style="background:${okColor(g.color)}">${ic('lifebuoy')}${esc(uso ? uso.nombre : 'Grupo de encuentro')}</span>
      <span class="muted row">${ic('users')} ${e.miembros.length}</span>
      ${D.error ? `<span class="tiny row">${ic('cloud-off')} ${esc(C.SIN_CONEXION)}</span>` : ''}
      <span class="grow"></span>${ib('descargar_fichas', 'download', C.PDF_TITULO, `data-tipo="encuentro" data-id="${g.id}"`, 'sm')}${ib('encuentro_refrescar', 'refresh', 'refrescar', '', 'sm')}</div>
    ${g.tema ? linea('tema', 'sparkles', 'Tema', g.tema) : ''}
    ${g.acuerdo ? linea('acuerdo', 'info-circle', 'Acuerdo', g.acuerdo) : ''}`;
}
function encCompartirHTML(D) {
  const g = D.e.grupo, comparte = S.comparte && S.comparte.gid === g.id ? S.comparte : null;
  if (comparte) {
    const quedan = Math.max(1, Math.ceil((comparte.hasta - Date.now()) / 60000));
    return `<span class="pastilla on">${ic('current-location')}<span>${esc(C.ENCUENTRO_COMPARTIENDO.replace('{m}', quedan))}</span>
      <button type="button" data-act="dejar_compartir" aria-label="${esc(C.AYUDA.dejar_compartir)}" data-tip="${esc(C.AYUDA.dejar_compartir)}">${ic('x')}</button></span>`;
  }
  return `<span class="pastilla">${ic('current-location')}<span>${esc(C.ENCUENTRO_COMPARTIR_CORTO)}</span>
    ${C.ENCUENTRO_COMPARTIR_MIN.map((m) => `<button type="button" data-act="compartir_ubicacion" data-v="${m}" aria-label="${esc(C.ENCUENTRO_COMPARTIR)} ${m} min">${m}</button>`).join('')}<span>min</span></span>`;
}
function encAbajoHTML(D) {
  const e = D.e, g = e.grupo, yo = e.yo, v = e.votos;
  const nombrePunto = (id) => (e.puntos.find((p) => p.id === id) || {}).name;
  const ayudas = e.miembros.filter((m) => m.estado && m.estado.kind === 'ayuda').length;
  const tabs = [['tablero', 'Tablero', ayudas ? `<b class="cuenta">${ayudas}</b>` : ''], ['puntos', 'Puntos', `<i>${e.puntos.length}</i>`],
    ['mira', 'Mira', `<i>${e.miras.length}</i>`], ['grupo', 'Grupo', v.n ? `<b class="cuenta">${v.n}</b>` : '']];
  let cuerpo = '';
  if (D.tab === 'puntos') cuerpo = `<div class="row between enc-sub"><span class="muted">${esc(C.ENCUENTRO_PUNTOS_TEXTO)}</span>${ib('punto_nuevo', 'plus', 'punto_nuevo', '', 'sm on')}</div>
    ${e.puntos.length ? `<div class="list">${e.puntos.map((p) => filaPunto(p, e)).join('')}</div>` : `<p class="muted">${esc(C.ENCUENTRO_SIN_PUNTOS)}</p>`}`;
  else if (D.tab === 'mira') cuerpo = e.miras.length ? `<div class="list">${(() => { const l = e.miras.slice(0, 30); const ab = D.miraAbierta && e.miras.find((k) => k.id === D.miraAbierta);
      if (ab && !l.includes(ab)) l.unshift(ab); return l.map((k) => filaMira(k, e, D)).join(''); })()}</div>` : `<p class="muted">${esc(C.ENCUENTRO_SIN_MIRA)}</p>`;
  else if (D.tab === 'grupo') cuerpo = `${v.n ? `<p class="banner">${ic('trash')} ${esc(C.ENCUENTRO_VOTOS.replace('{n}', v.n).replace('{t}', v.total))}</p>` : ''}
      <div class="row wrap">
        ${yo.admin ? `<button class="btn sm" data-act="invitar_grupo" data-id="${g.id}">${ic('user-plus')} ${esc(C.INVITAR_BOTON)}</button>` : ''}
        ${yo.admin ? ib('ajustes_encuentro', 'adjustments', 'encuentro_ajustes') : ''}
        ${yo.duena ? ib('editar_grupo', 'pencil', 'editar', `data-id="${g.id}"`) : ''}
        ${ib('borrar_lo_mio', 'eraser', 'borrar_lo_mio')}
        ${ib('votar_borrado', v.mio ? 'arrow-back-up' : 'trash', v.mio ? 'quitar_voto' : 'votar_borrado')}
        ${yo.duena && e.inactividad.puede_eliminar ? ib('eliminar_inactivo', 'clock-x', 'eliminar_inactivo') : ''}
        <span class="grow"></span>
        ${!yo.duena ? ib('salir_encuentro', 'door-exit', 'salir_grupo') : ''}
      </div>`;
  else cuerpo = `<div class="list">${e.miembros.map((m) => filaMiembro(m, e, nombrePunto)).join('')}</div>`;
  return `<div class="enc-tabs" role="tablist">${tabs.map(([k, n, x]) => `<button type="button" role="tab" class="${D.tab === k ? 'on' : ''}" aria-selected="${D.tab === k}" data-act="enc_tab" data-v="${k}">${esc(n)}${x}</button>`).join('')}</div>
    <div class="enc-cuerpo">${cuerpo}</div>`;
}
function filaMiembro(m, e, nombrePunto) {
  const st = m.estado, est = st ? C.ENCUENTRO_ESTADOS[st.kind] : null;
  const esYo = m.user_id === S.user.id;
  const gestionar = !esYo && !m.duena && (e.yo.duena || (e.yo.admin && !m.coadmin));
  return `<div class="li miembro ${st && st.kind === 'ayuda' ? 'pide-ayuda' : ''}">
    <button class="row grow" data-act="perfil" data-id="${m.user_id}" style="text-align:left;min-width:0">${avatar(m)}
      <div class="grow" style="min-width:0"><div class="row"><b>${esc(m.name)}</b>${m.duena ? `<span data-tip="${esc(C.AYUDA.duena)}">${ic('crown')}</span>` : m.coadmin ? `<span data-tip="${esc(C.AYUDA.coadmin)}">${ic('shield')}</span>` : ''}${e.grupo.juego ? premioMini(m.premio, m.premio_color) : ''}</div>
      <div class="tiny">${st ? `${ic(est.icono)} ${esc(est.nombre)} · ${esc(hace(st.created_at))}${st.colonia ? ` · ${esc(st.colonia)}` : ''}${st.punto_id && nombrePunto(st.punto_id) ? ` · Va a ${esc(nombrePunto(st.punto_id))}` : ''}${st.note ? ` · «${esc(st.note)}»` : ''}` : esc(C.ENCUENTRO_SIN_AVISO)}</div></div></button>
    ${st && st.lat != null ? ib('ver_en_mapa_enc', 'map-pin', 'ver_en_mapa', `data-id="${m.user_id}"`, 'sm') : ''}
    ${gestionar ? ib('miembro_encuentro', 'dots-vertical', 'miembro', `data-id="${m.user_id}"`, 'sm') : ''}</div>`;
}
function filaPunto(p, e) {
  const mio = p.user_id === S.user.id, autora = (e.miembros.find((m) => m.user_id === p.user_id) || {}).name || '';
  return `<div class="li punto">${p.thumb || p.photo ? `<img class="thumb" src="${api.photoUrl(p.thumb || p.photo)}" alt="" data-act="ver_foto" data-src="${esc(api.photoUrl(p.photo || p.thumb))}">` : `<span class="thumb">${ic('flag')}</span>`}
    <div class="grow" style="min-width:0"><b class="row">${esc(p.name)}${p.principal ? `<span data-tip="Punto principal">${ic('star')}</span>` : ''}</b>
      <div class="tiny">${p.note ? esc(p.note) + ' · ' : ''}${esc(autora)}</div></div>
    ${ib('ir_punto_encuentro', 'navigation', 'ir_al_punto', `data-id="${p.id}"`, 'sm on')}
    ${e.yo.admin && !p.principal ? ib('punto_principal', 'star', 'principal', `data-id="${p.id}"`, 'sm') : ''}
    ${mio || e.yo.admin ? ib('borrar_punto', 'trash', 'borrar', `data-id="${p.id}"`, 'sm') : ''}</div>`;
}
function filaMira(k, e, D) {
  const autora = (e.miembros.find((m) => m.user_id === k.user_id) || {}).name || '';
  const abierta = D && D.miraAbierta === k.id, foto = k.photo || k.thumb;
  // Tocar la fila despliega su foto; desplegada, se puede ver en el mapa
  return `<div class="li mira ${abierta ? 'abierta' : ''}" data-id="${k.id}">
    <div class="row" style="gap:10px;width:100%">${k.thumb || k.photo ? `<img class="thumb" src="${api.photoUrl(k.thumb || k.photo)}" alt="">` : `<span class="thumb">${ic('eye')}</span>`}
    <button class="grow" data-act="enc_mira_abrir" data-id="${k.id}" aria-expanded="${abierta}" style="text-align:left;min-width:0"><b>${esc(k.note)}</b><div class="tiny">${esc(autora)} · ${esc(hace(k.created_at))}</div></button>
    ${k.user_id === S.user.id || e.yo.admin ? ib('borrar_mira', 'trash', 'borrar', `data-id="${k.id}"`, 'sm') : ''}</div>
    ${abierta ? `<div class="mira-grande">${foto ? `<img src="${api.photoUrl(k.photo || k.thumb)}" alt="${esc(k.note)}">` : ''}
      <button class="btn alt sm" data-act="ver_mira" data-id="${k.id}">${ic('map-pin')} ${esc(C.AYUDA.ver_en_mapa)}</button></div>` : ''}</div>`;
}
// Marcadores del grupo en el mapa principal: puntos, "Mira esto", quien pidió ayuda y quien comparte su ubicación
function pintarMarcasEncuentro(D) {
  const capa = S.capaEnc; if (!capa || S.grupo !== D || !D.e) return [];
  capa.clearLayers();
  marcasEncuentro(D.e, capa, (foco) => {
    if (foco.tipo === 'mira') return abrirMira(D, foco.id);
    aviso(foco.texto, foco.tipo === 'punto' ? 'flag' : foco.tipo === 'ayuda' ? 'urgent' : 'current-location');
  });
  D.pts = puntosEncuentro(D.e);
  return D.pts;
}
// Todo lo que el grupo tiene en el mapa (para encuadrarlo): puntos, "Mira esto", ayudas con ubicación y ubicaciones compartidas
function puntosEncuentro(e) {
  const pts = [];
  e.puntos.forEach((p) => pts.push([p.lat, p.lng]));
  e.miras.forEach((k) => pts.push([k.lat, k.lng]));
  e.miembros.forEach((x) => { if (x.estado && x.estado.kind === 'ayuda' && x.estado.lat != null) pts.push([x.estado.lat, x.estado.lng]); });
  e.ubicaciones.forEach((u) => pts.push([u.lat, u.lng]));
  return pts;
}
// Marcadores de un grupo de encuentro en el mapa principal (modo grupo)
function marcasEncuentro(e, capa, alTocar) {
  const g = e.grupo;
  const icono = (html) => L.divIcon({ className: '', html, iconSize: [36, 36], iconAnchor: [18, 36] });
  e.puntos.forEach((p) => {
    L.marker([p.lat, p.lng], { icon: icono(`<div class="pin enc-punto ${p.principal ? 'principal' : ''}" style="background:${okColor(g.color)}">${ic('flag')}</div>`) })
      .on('click', () => alTocar({ lat: p.lat, lng: p.lng, tipo: 'punto', texto: p.name })).addTo(capa); });
  e.miras.forEach((k) => { const a = e.miembros.find((x) => x.user_id === k.user_id) || {};
    L.marker([k.lat, k.lng], { icon: icono(pinHTML('#3F6E73', 'eye', g.juego ? a.premio : 0, a.premio_color)) })
      .on('click', () => alTocar({ lat: k.lat, lng: k.lng, tipo: 'mira', id: k.id, texto: k.note })).addTo(capa); });
  e.miembros.forEach((x) => { const st = x.estado;
    if (st && st.kind === 'ayuda' && st.lat != null) {
      L.marker([st.lat, st.lng], { icon: icono(`<div class="pin enc-ayuda">${ic('urgent')}</div>`) })
        .on('click', () => alTocar({ lat: st.lat, lng: st.lng, tipo: 'ayuda', texto: `${x.name}: ${C.ENCUENTRO_ESTADOS.ayuda.nombre}` })).addTo(capa); } });
  e.ubicaciones.forEach((u) => { const x = e.miembros.find((y) => y.user_id === u.user_id) || {};
    L.marker([u.lat, u.lng], { icon: L.divIcon({ className: '', html: `<span class="avatar enc-yo" style="background:${okColor(x.avatar_color)}">${ic(x.avatar)}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] }) })
      .on('click', () => alTocar({ lat: u.lat, lng: u.lng, tipo: 'ubicacion', texto: `${x.name} · ${hace(u.updated_at)}` })).addTo(capa); });
}
function enfocarEncuentro(D) {
  const e = D.e, m = S.map; let foco = null;
  if (D.foco && typeof D.foco === 'object') foco = D.foco;
  else if (D.foco && e) {
    const x = e.miembros.find((y) => y.user_id === D.foco), u = e.ubicaciones.find((y) => y.user_id === D.foco);
    foco = x && x.estado && x.estado.lat != null ? { lat: x.estado.lat, lng: x.estado.lng } : u ? { lat: u.lat, lng: u.lng } : null;
  }
  D.foco = null;
  if (foco && m) m.setView([foco.lat, foco.lng], 17);
}
// Ver a todo el grupo: el encuadre deja libre el espacio del panel de abajo
function verTodoEncuentro(D) {
  const m = S.map; if (!m || !D.e) return;
  const todos = (D.pts || puntosEncuentro(D.e)).slice();
  if (S.yo && S.yo.getLatLng) { const y = S.yo.getLatLng(); todos.push([y.lat, y.lng]); }
  const panel = $('#panel-grupo'), abajo = panel && !panel.hidden ? panel.getBoundingClientRect().height : 0;
  if (todos.length > 1 && m.fitBounds) m.fitBounds(todos, { paddingTopLeft: [40, 110], paddingBottomRight: [40, abajo + 30], maxZoom: 17 });
  else if (todos.length) m.setView(todos[0], 16);
  else aviso(C.CAPA_VACIA, 'lifebuoy');
}
// Un "Mira esto": el panel se sube en su pestaña con la foto desplegada
function abrirMira(D, id) {
  if (!D || !D.e) return;
  D.tab = 'mira'; D.miraAbierta = id; D.irAMira = true; D.abierto = true;
  pintarPanelGrupo(D);
}
function llevarAMira(D) {
  if (!D.irAMira) return;
  const el = $(`#panel-grupo .li.mira[data-id="${D.miraAbierta}"]`);
  if (el) { D.irAMira = false; el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
}
// Centra el mapa donde se pidió y recoge el panel para dejarlo a la vista
function verMapaEncuentro(D) {
  if (D.abierto) { D.abierto = false; pintarPanelGrupo(D); }
  enfocarEncuentro(D);
}
function hojaGuiaEncuentro() {
  abrirHoja(() => `${cabeza(`${ic('lifebuoy')} ${esc(C.AYUDA.encuentro_guia)}`)}
    <div class="dudas guia">${C.GUIA_ENCUENTRO.map((d) => `<div class="duda"><h3 class="row"><span class="gicon">${ic(d.icono)}</span>${esc(d.titulo)}</h3>
      ${d.texto ? `<p>${esc(d.texto)}</p>` : ''}${d.pasos ? `<ul>${d.pasos.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>`).join('')}</div>`, null, 'guia_encuentro');
}

/* "Todo bien" y "Necesito ayuda" */
function hojaEstado(gid, kind) {
  const D = encuentroActual(), e = D && D.e, est = C.ENCUENTRO_ESTADOS[kind];
  abrirHoja(() => `${cabeza(`${ic(est.icono)} ${esc(est.nombre)}`)}
    ${kind === 'bien' && e && e.puntos.length ? `<div class="field"><label>${ic('flag')} ${esc(C.ENCUENTRO_VOY_A)}</label><div class="chips" data-pick="punto" style="flex-wrap:wrap">
      <button type="button" class="chip on" data-act="elegir" data-v="">—</button>${e.puntos.map((p) => `<button type="button" class="chip" data-act="elegir" data-v="${p.id}">${ic('flag')}${esc(p.name)}</button>`).join('')}</div></div>` : ''}
    ${kind === 'ayuda' ? `<label class="check"><input type="checkbox" id="ayuda-exacta"> <span>${esc(C.ENCUENTRO_EXACTA)}</span></label>
      <div class="field"><textarea id="ayuda-nota" class="in" maxlength="${C.ENCUENTRO_NOTA_MAX}" rows="2" placeholder="${esc(C.ENCUENTRO_NOTA_AYUDA)}"></textarea></div>` : ''}
    <button class="btn block enc-enviar ${kind}" data-act="enviar_estado" data-gid="${gid}" data-v="${kind}">${ic(est.icono)} Enviar "${esc(est.nombre)}"</button>`, null, 'estado');
}
async function enviarEstado(btn, gid, kind) {
  const raiz = $('.sheet'), D = encuentroActual(), e = D && D.e;
  const punto = kind === 'bien' ? (valor(raiz, 'punto') || null) : null;
  const exacta = kind === 'ayuda' && !!($('#ayuda-exacta', raiz) || {}).checked;
  const nota = kind === 'ayuda' ? (($('#ayuda-nota', raiz) || {}).value || '').trim() : '';
  ocupado(btn, true);
  const r = await mandarEstado([gid], kind, { punto, exacta, nota });
  if (!r.enviados && !r.enCola) { ocupado(btn, false); return fallo(r.errores[0]); }
  if (hojaArriba() && hojaArriba().tipo === 'estado') cerrarHoja();
  const nombrePunto = punto && e ? (e.puntos.find((p) => p.id === punto) || {}).name : '';
  hojaEstadoListo(kind, { enCola: !!r.enCola, nombrePunto, nota, pos: exacta ? r.pos : null });
  if (D && r.enviados) D.cargar();
}
// Envía "Todo bien" o "Necesito ayuda" a uno o varios grupos. Sin señal, cada aviso queda guardado y se envía al volver.
async function mandarEstado(gids, kind, o) {
  let pos = null;
  try { pos = await getPosRapida(); } catch (err) { pos = null; }
  if (o.exacta && !pos) aviso('Sin GPS: se envía sin tu ubicación exacta', 'current-location');
  let colonia = null;
  if (navigator.onLine && pos) { try { colonia = await api.colonia(pos.lat, pos.lng); } catch (err) { colonia = null; } }
  const r = { pos, enviados: 0, enCola: 0, errores: [], fallidos: [] };
  const cuando = new Date().toISOString();
  for (const gid of gids) {
    const fila = { group_id: gid, kind, punto_id: o.punto || null, note: o.nota || null, created_at: cuando };
    if (o.exacta && pos) Object.assign(fila, { lat: pos.lat, lng: pos.lng, accuracy: pos.acc });
    try {
      if (!navigator.onLine) throw new TypeError('Failed to fetch');
      await api.addEstado(Object.assign({ colonia }, fila));
      r.enviados++;
    } catch (err) {
      if (!esErrorRed(err)) { r.errores.push(err); r.fallidos.push(gid); continue; }
      try { await guardarPendiente({ tipo: 'estado', datos: fila, pos }); r.enCola++; }
      catch (err2) { r.errores.push(err); r.fallidos.push(gid); }
    }
  }
  if (r.enviados) api.dispararPush();
  return r;
}

// Si el grupo activo en el mapa ya no es tuyo (saliste o se borró), el mapa vuelve a lo normal
function revisarGrupoMapa() {
  if (S.grupo && !miGrupo(S.grupo.gid)) salirGrupo();
  pintarFiltrosMapa();
}
// Solo con sesión, en el mapa y sin hojas abiertas encima: el grupo activo se revisa cada 20 s
setInterval(() => { if (S.user && S.grupo && S.tab === 'map' && !document.hidden && !pila.length) S.grupo.cargar(); }, C.ENCUENTRO_REFRESCO_MS);

/* Aviso rápido: "Todo bien" o "Necesito ayuda" a tus grupos de encuentro, sin entrar a cada grupo.
   Se llega desde el mapa, desde la lista de grupos o (en Android) dejando presionado el ícono de la app. */
const gruposEncuentro = () => (S.groups || []).filter(esEncuentro);
const icAyuda = () => `<span class="ic-ayuda" aria-hidden="true"><b>!</b>${ic('lifebuoy')}<b>!</b></span>`;
function botonAyuda(attrs = '') {
  return `<button class="ib sm ayuda-atajo" data-act="aviso_rapido" data-tip="${esc(C.AYUDA.aviso_rapido)}" aria-label="${esc(C.AYUDA.aviso_rapido)}" ${attrs}>${icAyuda()}</button>`;
}
function pintarAtajoMapa() { const el = $('#atajo-ayuda'); if (el) el.innerHTML = gruposEncuentro().length ? botonAyuda() : ''; }
const Q = {};
function hojaAvisoRapido(gid) {
  const grupos = gruposEncuentro();
  if (!grupos.length) {
    return abrirHoja(() => `${cabeza(`${icAyuda()} ${esc(C.AVISO_RAPIDO_TITULO)}`)}
      <div class="empty">${ic('lifebuoy')}<p>${esc(C.AVISO_RAPIDO_SIN_GRUPOS)}</p></div>
      <button class="btn block" data-act="grupo_nuevo">${ic('plus')} ${esc(C.AYUDA.grupo_nuevo)}</button>`, null, 'aviso_rapido');
  }
  Object.assign(Q, { kind: 'ayuda', exacta: false, nota: '',
    sel: new Set(gid && grupos.some((g) => g.id === gid) ? [gid] : grupos.map((g) => g.id)) });
  abrirHoja(avisoRapidoHTML, null, 'aviso_rapido');
}
function avisoRapidoHTML() {
  const grupos = gruposEncuentro(), n = grupos.filter((g) => Q.sel.has(g.id)).length, est = C.ENCUENTRO_ESTADOS;
  const tipo = (k) => `<button type="button" class="enc-btn ${k} ${Q.kind === k ? 'on' : 'apagado'}" data-act="aviso_tipo" data-v="${k}" aria-pressed="${Q.kind === k}">${ic(est[k].icono)}<span>${esc(est[k].nombre)}</span></button>`;
  return `${cabeza(`${icAyuda()} ${esc(C.AVISO_RAPIDO_TITULO)}`)}
    <div class="aviso-tipos">${tipo('bien')}${tipo('ayuda')}</div>
    <div class="tiny aviso-a">${esc(C.AVISO_RAPIDO_A)}</div>
    <div class="list aviso-grupos">${grupos.map((g) => { const uso = usoDe(g.uso), on = Q.sel.has(g.id);
      return `<button type="button" class="li check-grupo ${on ? 'on' : ''}" data-act="aviso_grupo" data-id="${g.id}" aria-pressed="${on}">
        <span class="caja">${on ? ic('check') : ''}</span><span class="avatar sm" style="background:${okColor(g.color)}">${ic(g.icon)}</span>
        <b class="grow">${esc(g.name)}</b>${uso ? `<span class="tiny">${esc(uso.nombre)}</span>` : ''}</button>`; }).join('')}</div>
    ${Q.kind === 'ayuda' ? `<label class="check"><input type="checkbox" id="rapido-exacta" ${Q.exacta ? 'checked' : ''}> <span>${esc(C.ENCUENTRO_EXACTA)}</span></label>
      <label class="campo-ic">${ic('info-circle')}<textarea id="rapido-nota" class="in compacto crece" rows="1" maxlength="${C.ENCUENTRO_NOTA_MAX}" aria-label="Nota" placeholder="${esc(C.ENCUENTRO_NOTA_AYUDA)}">${esc(Q.nota)}</textarea></label>` : ''}
    <button class="btn block enc-enviar ${Q.kind}" data-act="enviar_aviso_rapido" ${n ? '' : 'disabled'}>${ic('send')} ${esc(n > 1 ? C.AVISO_RAPIDO_ENVIAR_N.replace('{n}', n) : C.AVISO_RAPIDO_ENVIAR)}</button>`;
}
function recordarRapido() {
  const x = $('#rapido-exacta'), t = $('#rapido-nota');
  if (x) Q.exacta = x.checked; if (t) Q.nota = t.value;
}
async function enviarAvisoRapido(btn) {
  recordarRapido();
  const grupos = gruposEncuentro().filter((g) => Q.sel.has(g.id));
  if (!grupos.length) return aviso(C.AVISO_RAPIDO_ELIGE, 'users');
  const kind = Q.kind === 'bien' ? 'bien' : 'ayuda', nota = kind === 'ayuda' ? Q.nota.trim() : '', exacta = kind === 'ayuda' && Q.exacta;
  ocupado(btn, true);
  const r = await mandarEstado(grupos.map((g) => g.id), kind, { exacta, nota });
  if (!r.enviados && !r.enCola) { ocupado(btn, false); return fallo(r.errores[0]); }
  if (hojaArriba() && hojaArriba().tipo === 'aviso_rapido') cerrarHoja();
  hojaEstadoListo(kind, { enCola: !!r.enCola, nota, pos: exacta ? r.pos : null });
  if (r.fallidos.length) {
    const nombres = r.fallidos.map((id) => (miGrupo(id) || {}).name).filter(Boolean).join(', ');
    setTimeout(() => aviso(`${C.AVISO_RAPIDO_NO_SALIO} ${nombres}. ${errTexto(r.errores[0]).includes('ESPERA') ? C.AVISO_RAPIDO_ESPERA : ''}`.trim(), 'alert-triangle'), 400);
  }
  const D = encuentroActual(); if (D && r.enviados) D.cargar();
}
function textoWhatsAppEstado(kind, o) {
  const partes = [kind === 'ayuda' ? 'Necesito ayuda.' : 'Todo bien.'];
  if (o.nombrePunto) partes.push(`Voy a: ${o.nombrePunto}.`);
  if (o.nota) partes.push(o.nota);
  if (o.pos) { const la = o.pos.lat.toFixed(5), lo = o.pos.lng.toFixed(5); partes.push(`Estoy aquí: https://www.openstreetmap.org/?mlat=${la}&mlon=${lo}#map=18/${la}/${lo}`); }
  partes.push(`${hora(Date.now())} · Collector Go`);
  return partes.join(' ');
}
function hojaEstadoListo(kind, o) {
  const est = C.ENCUENTRO_ESTADOS[kind], t = textoWhatsAppEstado(kind, o);
  abrirHoja(() => `${cabeza(`${ic(est.icono)} ${esc(est.nombre)}`)}
    <div class="empty" style="padding:16px 0">${ic(o.enCola ? 'cloud-off' : 'circle-check')}<p>${esc(o.enCola ? C.ENCUENTRO_EN_COLA : est.listo)}</p></div>
    <button class="btn block" data-act="whatsapp_estado" data-texto="${esc(t)}">${ic('brand-whatsapp')} ${esc(C.ENCUENTRO_WHATSAPP)}</button>
    <button class="btn alt block" data-act="cerrar" style="margin-top:10px" aria-label="Listo">${ic('check')}</button>`, null, 'estado_listo');
}

/* "Mira esto" y proponer un punto de encuentro: nota (o nombre), foto opcional y ubicación */
const M = {};
function hojaMarca(gid, modo) {
  if (M.enc) soltarLienzo(M.enc.img);
  Object.assign(M, { gid, modo, foto: null, enc: null, vistaUrl: null, nombre: '', nota: '', pos: null, gps: 'buscando', mover: null });
  abrirHoja(marcaHTML, montarMarca, 'marca');
  leerGpsMarca();
}
function leerGpsMarca() {
  const gid = M.gid; M.gps = 'buscando'; pintarGpsMarca();
  getPos().then((p) => { if (M.gid !== gid) return; M.pos = p; M.gps = 'ok'; if (M.mover) M.mover(p); pintarGpsMarca(); })
    .catch(() => { M.gps = M.pos ? 'ok' : 'error'; pintarGpsMarca(); });
}
function marcaHTML() {
  const punto = M.modo === 'punto';
  return `${cabeza(punto ? `${ic('flag')} ${esc(C.AYUDA.punto_nuevo)}` : `${ic('eye')} ${esc(C.ENCUENTRO_MIRA)}`)}
    ${punto ? `<label class="campo-ic">${ic('pencil')}<input id="marca-nombre" class="in compacto" maxlength="40" value="${esc(M.nombre)}" placeholder="${esc(C.PUNTO_PISTA)}" aria-label="Nombre del punto" autocomplete="off"></label>` : ''}
    <label class="campo-ic">${ic('info-circle')}<textarea id="marca-nota" class="in compacto crece" rows="1" maxlength="${C.ENCUENTRO_NOTA_MAX}" aria-label="Nota" placeholder="${esc(punto ? C.NOTA_PISTA : C.MIRA_PISTA)}">${esc(M.nota)}</textarea></label>
    <div class="fotos-fila">
      <label class="ib mini" data-tip="${esc(C.AYUDA.camara)}" aria-label="${esc(C.AYUDA.camara)}">${ic('camera')}<input type="file" accept="image/*" capture="environment" hidden data-in="foto-marca"></label>
      <label class="ib mini" data-tip="${esc(C.AYUDA.galeria)}" aria-label="${esc(C.AYUDA.galeria)}">${ic('upload')}<input type="file" accept="image/*" hidden data-in="foto-marca"></label>
      ${M.foto ? `<button type="button" class="foto-mini" data-act="encuadrar_marca" data-tip="${esc(C.AYUDA.encuadrar)}" aria-label="${esc(C.AYUDA.encuadrar)}"><img id="vista-marca" src="${M.vistaUrl}" alt=""></button>${ib('quitar_foto_marca', 'x', 'quitar_captura', '', 'sm')}` : ''}
    </div>
    ${filaGuardar('guardar_marca', M, 'gps-marca')}
    <div class="mapa-caja"><div class="minimap grande" id="mini-marca"></div><div class="mapa-lado">${ib('releer_gps_marca', 'current-location', 'gps', '', 'sm')}</div></div>`;
}
function recordarMarca() {
  const n = $('#marca-nombre'), t = $('#marca-nota');
  if (n) M.nombre = n.value; if (t) M.nota = t.value;
}
function montarMarca(raiz) {
  $$('[data-in="foto-marca"]', raiz).forEach((inp) => inp.addEventListener('change', () => inp.files[0] && tomarFotoMarca(inp.files[0])));
  const el = $('#mini-marca', raiz);
  if (el) { const mm = miniMapa(el, M.pos, (p) => { M.pos = p; M.gps = 'ok'; pintarGpsMarca(); }); M.mover = mm.mover; }
}
function pintarGpsMarca() { const el = $('#gps-marca'); if (el) { el.innerHTML = gpsCorto(M); el.classList.toggle('alerta', !!(M.pos && esAproximada(M.pos))); } }
async function fotosDe(blob) {
  const img = await cargarImagen(blob);
  return { grande: await lienzoABlob(escalar(img, C.FOTO_LADO), C.FOTO_CALIDAD, false), mini: await lienzoABlob(escalar(img, C.MINIATURA_LADO), C.MINIATURA_CALIDAD, false) };
}
async function cuadroMarca() {
  const E = M.enc; if (!E) return;
  E.sucio = false;
  const cv = cuadroDe(E, C.FOTO_LADO), b = await lienzoABlob(cv, C.FOTO_CALIDAD, false);
  soltarLienzo(cv);
  if (M.enc !== E) return;
  M.foto = b;
  if (M.vistaUrl) URL.revokeObjectURL(M.vistaUrl);
  M.vistaUrl = URL.createObjectURL(M.foto);
  const v = $('#vista-marca'); if (v) v.src = M.vistaUrl;
}
async function tomarFotoMarca(file) {
  try {
    recordarMarca();
    const img = await cargarImagen(file);
    if (M.enc) soltarLienzo(M.enc.img);
    M.enc = nuevoEncuadre(escalar(img, C.ENCUADRE_FUENTE));
    await cuadroMarca();
    dibujarHoja();
    hojaEncuadre(M.enc, async () => { await cuadroMarca(); });
  } catch (e) { aviso('No se pudo leer la imagen', 'photo'); }
}
// Encuadrar en su propia hoja (puntos y "Mira esto"): la foto cuadrada se ve completa y se ajusta con los dedos
function hojaEncuadre(E, alListo) {
  abrirHoja(() => `${cabeza(`${ic('crop')} ${esc(C.AYUDA.encuadrar)}`)}
    <div class="foto-caja"><canvas class="encuadre" id="encuadre-solo"></canvas></div>
    <p class="tiny pista-abajo">${ic('arrows-move')} ${esc(C.ENCUADRE_PISTA)}</p>
    <button class="btn block guardar" data-act="encuadre_listo" style="margin-top:12px">${ic('check')} Listo</button>`,
  (raiz) => { const cv = $('#encuadre-solo', raiz); if (cv) montarEncuadre(cv, E, () => alListo()); raiz._encuadre = alListo; }, 'encuadre');
}
// conMedia: solo para hallazgos públicos (la mediana es la foto del muro); nunca en carpetas privadas
async function subirFotosDe(fotos, carpeta, conMedia) {
  if (!fotos || !fotos.grande) return { pFoto: null, pMini: null, pMedia: null };
  const id = uuid(), pFoto = `${carpeta}/${id}.${ext(fotos.grande)}`, pMini = `${carpeta}/${id}_t.${ext(fotos.mini)}`;
  const pMedia = conMedia && fotos.media && !carpeta.startsWith('priv:') ? `${carpeta}/${id}_m.${ext(fotos.media)}` : null;
  await api.upload(pFoto, fotos.grande);
  try {
    await api.upload(pMini, fotos.mini);
    if (pMedia) await api.upload(pMedia, fotos.media);
  } catch (e) { api.removeFiles([pFoto, pMini, pMedia].filter(Boolean)).catch(() => null); throw e; }
  return { pFoto, pMini, pMedia };
}
const carpetaEncuentro = (gid) => `priv:${S.user.id}/enc/${gid}`;
async function guardarMarca(btn) {
  recordarMarca();
  const punto = M.modo === 'punto', nombre = M.nombre.trim(), nota = M.nota.trim();
  if (punto && !nombre) { const n = $('#marca-nombre'); if (n) n.focus(); return aviso('Ponle un nombre', 'pencil'); }
  if (!punto && !nota) { const t = $('#marca-nota'); if (t) t.focus(); return aviso('Escribe una nota corta', 'pencil'); }
  if (!M.pos) return aviso('Falta la ubicación: toca el mapa', 'map-pin');
  ocupado(btn, true);
  if (M.enc && M.enc.sucio) await cuadroMarca();
  const D = encuentroActual(), gid = M.gid;
  const fila = punto ? { group_id: gid, name: nombre, note: nota || null, lat: M.pos.lat, lng: M.pos.lng }
    : { group_id: gid, note: nota, lat: M.pos.lat, lng: M.pos.lng, created_at: new Date().toISOString() };
  let fotos = null, subidas = null;
  try {
    fotos = M.foto ? await fotosDe(M.foto) : null;
    if (!navigator.onLine) throw new TypeError('Failed to fetch');
    subidas = await subirFotosDe(fotos, carpetaEncuentro(gid));
    Object.assign(fila, { photo: subidas.pFoto, thumb: subidas.pMini });
    if (punto) await api.addPunto(fila); else { await api.addMira(fila); api.dispararPush(); }
    cerrarHoja(); aviso(punto ? 'Punto propuesto' : 'Marcado en el mapa del grupo', punto ? 'flag' : 'eye');
    if (D) await D.cargar();
  } catch (err) {
    if (subidas && subidas.pFoto) api.removeFiles([subidas.pFoto, subidas.pMini]).catch(() => null);
    if (!esErrorRed(err)) { ocupado(btn, false); return fallo(err); }
    delete fila.photo; delete fila.thumb;
    try { await guardarPendiente({ tipo: punto ? 'punto' : 'mira', datos: fila, fotos }); }
    catch (err2) { ocupado(btn, false); return fallo(err); }
    cerrarHoja(); aviso(C.PENDIENTE_GUARDADO, 'cloud-off');
  }
}
// Juego: cuando tus "Mira esto" ganan un premio, se celebra (solo dentro del grupo)
function revisarPremioMira(D) {
  const e = D.e; if (!e || !e.grupo.juego) { D.premio = null; return; }
  const yo = e.miembros.find((m) => m.user_id === S.user.id); if (!yo) return;
  const n = nivelPremio(yo.premio || 0);
  if (D.premio != null && n > D.premio) {
    const pr = C.PREMIOS[n];
    setTimeout(() => {
      abrirHoja(() => `${cabeza('')}<div class="unlock"><div class="burst" aria-hidden="true"></div>
        <h1 class="serif unlock-t">¡Premio!</h1>
        <div class="premio-nuevo"><div class="pin-muestra">${pinHTML('#3F6E73', 'eye', n, yo.premio_color)}</div>
        <p><b>${esc(C.ENCUENTRO_PREMIO.replace('{grupo}', e.grupo.name).replace('{premio}', pr ? pr.nombre : ''))}</b></p>
        ${n >= 100 ? `<p class="tiny">${esc(C.AYUDA.color_premio)}</p>${selectorColorPremio('grupo', e.grupo.id, yo.premio_color || 'oro')}` : ''}</div>
        <button class="btn block" data-act="cerrar" style="margin-top:18px">${ic('check')}</button></div>`, null, 'logro');
      confeti(160, 2200);
    }, 300);
  }
  D.premio = n;
}

/* Ubicación por tiempo limitado: solo con la app abierta; se guarda únicamente el último punto */
async function iniciarCompartir(gid, minutos, btn) {
  ocupado(btn, true);
  let p;
  try { p = await getPos(); } catch (err) { ocupado(btn, false); return aviso(C.GUIA_SIN_GPS, 'current-location'); }
  try {
    const hasta = await api.compartirUbicacion(gid, p, minutos);
    pararCompartir(true);
    S.comparte = { gid, hasta: new Date(hasta).getTime(), ultimo: { p, t: Date.now() }, pos: p, watch: null, tFin: null, tPulso: null };
    vigilarCompartir();
    aviso(`Compartiendo tu ubicación ${minutos} min`, 'current-location');
    const D = encuentroActual(); if (D) D.cargar();
  } catch (err) { ocupado(btn, false); fallo(err); }
}
function vigilarCompartir() {
  const X = S.comparte; if (!X) return;
  if (Date.now() >= X.hasta) return pararCompartir(false);
  clearTimeout(X.tFin);
  X.tFin = setTimeout(() => { pararCompartir(false); const D = encuentroActual(); if (D) D.cargar(); }, X.hasta - Date.now() + 500);
  if (navigator.geolocation && X.watch == null) {
    X.watch = navigator.geolocation.watchPosition((pos) => {
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: Math.round(pos.coords.accuracy) };
      X.pos = p;
      if (distancia(p, X.ultimo.p) >= 50) enviarPosicion(X, p);
    }, () => null, { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 });
  }
  clearInterval(X.tPulso);
  X.tPulso = setInterval(() => { if (X.pos && Date.now() - X.ultimo.t >= 60000) enviarPosicion(X, X.pos); }, 15000);
}
async function enviarPosicion(X, p) {
  X.ultimo = { p, t: Date.now() };
  try { const h = await api.compartirUbicacion(X.gid, p, null); if (!h && S.comparte === X) pararCompartir(false); }
  catch (err) { /* sin red: se intenta con la siguiente lectura */ }
}
function pausarCompartir() {
  const X = S.comparte; if (!X) return;
  if (X.watch != null && navigator.geolocation) navigator.geolocation.clearWatch(X.watch);
  X.watch = null; clearInterval(X.tPulso);
}
function pararCompartir(silencio) {
  const X = S.comparte; if (!X) return;
  pausarCompartir(); clearTimeout(X.tFin); S.comparte = null;
  if (!silencio) aviso('Dejaste de compartir tu ubicación', 'current-location');
}

/* Ajustes (quien administra): juego, tema de colección y acuerdos */
function hojaAjustesEncuentro() {
  const D = encuentroActual(); if (!D || !D.e) return;
  const g = D.e.grupo, uso = usoDe(g.uso);
  abrirHoja(() => `${cabeza(`${ic('adjustments')} ${esc(C.AYUDA.encuentro_ajustes)}`)}
    <div class="field"><label>${ic('gift')} ${esc(C.ENCUENTRO_JUEGO)}</label><div class="toggle" data-pick="juego">
      <button type="button" data-act="elegir" data-v="0" class="${!g.juego ? 'on' : ''}">Apagado</button>
      <button type="button" data-act="elegir" data-v="1" class="${g.juego ? 'on' : ''}">Encendido</button></div>
      <p class="tiny">${esc(C.ENCUENTRO_JUEGO_TEXTO)}</p></div>
    <div class="field"><label for="enc-tema">${ic('sparkles')} Tema de colección</label><input id="enc-tema" class="in" maxlength="${C.ENCUENTRO_TEMA_MAX}" value="${esc(g.tema || '')}" placeholder="${esc(C.ENCUENTRO_TEMA_PISTA)}" autocomplete="off"></div>
    <div class="field"><label for="enc-acuerdo">${ic('info-circle')} Acuerdo</label><textarea id="enc-acuerdo" class="in" maxlength="${C.ENCUENTRO_ACUERDO_MAX}" rows="2" placeholder="${esc((uso && uso.acuerdo) || '')}">${esc(g.acuerdo || '')}</textarea></div>
    <button class="btn block" data-act="guardar_ajustes_encuentro">${ic('check')} Guardar</button>`, null, 'ajustes_encuentro');
}
function hojaMiembroEncuentro(uid) {
  const D = encuentroActual(), e = D && D.e, m = e && e.miembros.find((x) => x.user_id === uid);
  if (!m) return;
  abrirHoja(() => `${cabeza(`<span class="row">${avatar(m)} ${esc(m.name)}</span>`)}
    <div class="list">
      ${e.yo.duena ? `<button class="li" data-act="coadmin_encuentro" data-id="${uid}" data-v="${m.coadmin ? '0' : '1'}">${ic('shield')}<b class="grow" style="text-align:left">${m.coadmin ? 'Quitar cargo de coadministradora' : 'Nombrar coadministradora'}</b></button>` : ''}
      <button class="li" data-act="sacar_encuentro" data-id="${uid}">${ic('user-minus')}<b class="grow" style="text-align:left">Sacar del grupo</b></button>
    </div>`, null, 'miembro_encuentro');
}

/* ---------------------------------------------------------------------
   NOTIFICACIONES (push): texto genérico; el detalle solo dentro de la app
   --------------------------------------------------------------------- */
const pushSoportado = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const esIphone = () => /iPhone|iPad|iPod/.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function bytesDe(b64) {
  const s = atob(String(b64).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((String(b64).length + 3) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}
async function suscripcionActual() {
  if (!pushSoportado() || !navigator.serviceWorker.controller && !(await navigator.serviceWorker.getRegistration())) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}
function datosSuscripcion(sub) { const j = sub.toJSON(); return { endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }; }
async function activarPush() {
  if (!pushSoportado()) { aviso(esIphone() && !yaInstalada() ? C.PUSH_IPHONE : C.PUSH_NO_SOPORTA, 'bell-off'); return false; }
  if (esIphone() && !yaInstalada()) { aviso(C.PUSH_IPHONE, 'device-mobile'); return false; }
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') { aviso(C.PUSH_BLOQUEADAS, 'bell-off'); return false; }
  try {
    const llave = await api.llavePush();
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (sub && sub.options && sub.options.applicationServerKey) {
      const actual = new Uint8Array(sub.options.applicationServerKey), nueva = bytesDe(llave);
      if (actual.length !== nueva.length || actual.some((x, i) => x !== nueva[i])) { await sub.unsubscribe().catch(() => null); sub = null; }
    }
    sub = sub || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytesDe(llave) });
    await api.registrarPush(datosSuscripcion(sub));
    S.push = await api.pushPrefs();
    aviso(C.PUSH_ACTIVAS, 'bell');
    return true;
  } catch (e) { fallo(e); return false; }
}
async function desactivarPush(silencio) {
  try {
    const sub = await suscripcionActual();
    if (sub) { const ep = sub.endpoint; await sub.unsubscribe().catch(() => null); await api.quitarPush(ep).catch(() => null); }
    S.push = null;
    if (!silencio) aviso('Notificaciones desactivadas en este teléfono', 'bell-off');
  } catch (e) { if (!silencio) fallo(e); }
}
// Al abrir la app: si este teléfono ya tiene notificaciones, se confirma con la cuenta actual
async function sincronizarPush() {
  try {
    if (!pushSoportado() || Notification.permission !== 'granted') return;
    const sub = await suscripcionActual(); if (!sub) return;
    await api.registrarPush(datosSuscripcion(sub));
    S.push = await api.pushPrefs();
  } catch (e) { /* sin red: se intenta la próxima vez */ }
}
// Al crear o entrar a un grupo de encuentro
async function ofrecerPush() {
  if (!pushSoportado() && !esIphone()) return;
  try { if (pushSoportado() && Notification.permission === 'granted' && await suscripcionActual()) return; } catch (e) { /* sigue */ }
  if (pushSoportado() && Notification.permission === 'denied') return;
  const P = { paso: 1 };
  const hoja = { render: () => `${cabeza(`${ic('bell')} Notificaciones`)}
    ${P.paso === 1 ? `<p style="font-size:18px">${esc(C.PUSH_OFRECER)}</p>
      ${esIphone() && !yaInstalada() ? `<p class="tiny">${esc(C.PUSH_IPHONE)}</p>` : ''}
      <button class="btn block" data-act="push_ofrecer_si">${ic('bell')} ${esc(C.PUSH_ACTIVAR)}</button>
      <button class="btn alt block" data-act="cerrar" style="margin-top:10px">Ahora no</button>`
    : `<p>${esc(C.PUSH_ACTIVAS)}</p>
      <label class="check"><input type="checkbox" id="push-sonido"> <span>${esc(C.PUSH_PREFS.find((x) => x.k === 'sonido').nombre)}</span></label>
      <button class="btn block" data-act="push_ofrecer_listo">${ic('check')} Listo</button>`}`, tipo: 'push_ofrecer', datos: P };
  pila.push(hoja); dibujarHoja();
}
async function pintarNotificaciones() {
  const el = $('#sec-notif'); if (!el) return;
  let estado = 'apagadas';
  if (!pushSoportado()) estado = esIphone() && !yaInstalada() ? 'iphone' : 'no';
  else if (esIphone() && !yaInstalada()) estado = 'iphone';
  else if (Notification.permission === 'denied') estado = 'bloqueadas';
  else if (Notification.permission === 'granted' && await suscripcionActual().catch(() => null)) estado = 'activas';
  if (estado === 'activas' && !S.push) S.push = await api.pushPrefs().catch(() => null);
  const p = S.push || {};
  const prefs = C.PUSH_PREFS.filter((x) => !x.admin || S.me.is_admin);
  const resumen = estado === 'activas' ? C.PLEGAR_NOTIF_ACTIVAS.replace('{n}', prefs.filter((x) => p[x.k]).length).replace('{t}', prefs.length)
    : C.PLEGAR_NOTIF[estado] || '';
  el.innerHTML = cabezaPlegable('notif', 'bell', 'Notificaciones', resumen) + `<div class="plegable" ${plegadoAbierto('notif') ? '' : 'hidden'}>
    ${estado === 'no' ? `<p class="muted">${esc(C.PUSH_NO_SOPORTA)}</p>` : ''}
    ${estado === 'iphone' ? `<p class="muted">${esc(C.PUSH_IPHONE)}</p>${tipoInstalacion() ? `<button class="btn alt block" data-act="instalar">${ic('device-mobile')} ${esc(C.INSTALAR_BOTON)}</button>` : ''}` : ''}
    ${estado === 'bloqueadas' ? `<p class="muted">${esc(C.PUSH_BLOQUEADAS)}</p>` : ''}
    ${estado === 'apagadas' ? `<button class="btn alt block" data-act="activar_push">${ic('bell')} ${esc(C.PUSH_ACTIVAR)}</button>` : ''}
    ${estado === 'activas' ? `<div class="list">${C.PUSH_PREFS.filter((x) => !x.admin || S.me.is_admin).map((x) =>
      `<button class="li interruptor ${p[x.k] ? 'on' : ''}" data-act="push_pref" data-k="${x.k}" role="switch" aria-checked="${p[x.k] ? 'true' : 'false'}">
        <span class="grow" style="text-align:left">${esc(x.nombre)}</span><span class="sw" aria-hidden="true"></span></button>`).join('')}</div>
      <button class="linkbtn" data-act="desactivar_push" style="margin-top:6px">${ic('bell-off')} ${esc(C.PUSH_DESACTIVAR)}</button>` : ''}</div>`;
}
function resumenNotif() {
  const el = $('#resumen-notif'); if (!el || !S.push) return;
  const prefs = C.PUSH_PREFS.filter((x) => !x.admin || S.me.is_admin);
  el.textContent = '· ' + C.PLEGAR_NOTIF_ACTIVAS.replace('{n}', prefs.filter((x) => S.push[x.k]).length).replace('{t}', prefs.length);
}
/* Secciones plegables del perfil: cerradas de inicio con un resumen; el teléfono recuerda si quedaron abiertas */
function plegadoAbierto(k) { try { return localStorage.getItem('cg_plegado_' + k) === '1'; } catch (e) { return false; } }
function cabezaPlegable(k, icono, titulo, resumen) {
  const ab = plegadoAbierto(k);
  return `<button type="button" class="sec-cab" data-act="plegar" data-k="${k}" aria-expanded="${ab}">${ic(icono)}<span class="grow"><b>${esc(titulo)}</b>
    <span class="tiny" id="resumen-${k}">${resumen ? '· ' + esc(resumen) : ''}</span></span>${ic(ab ? 'chevron-down' : 'chevron-right')}</button>`;
}
function abrirPlegable(k, abrir) {
  try { localStorage.setItem('cg_plegado_' + k, abrir ? '1' : '0'); } catch (e) { /* nada */ }
  const cab = $(`.sec-cab[data-k="${k}"]`); if (!cab) return;
  const cuerpo = cab.nextElementSibling;
  if (cuerpo) cuerpo.hidden = !abrir;
  cab.setAttribute('aria-expanded', abrir ? 'true' : 'false');
  const flecha = cab.querySelector('.ic:last-child'); if (flecha) flecha.outerHTML = ic(abrir ? 'chevron-down' : 'chevron-right');
}

/* ---------------------------------------------------------------------
   SIN CONEXIÓN: registros que esperan señal (guardados en el teléfono)
   --------------------------------------------------------------------- */
const BDP = {
  abrir() {
    return new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error('SIN_BD'));
      const r = indexedDB.open('cg-app', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('pendientes', { keyPath: 'id' });
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  },
  async hacer(modo, fn) {
    const db = await BDP.abrir();
    return new Promise((res, rej) => {
      const tx = db.transaction('pendientes', modo); let out;
      const q = fn(tx.objectStore('pendientes')); if (q) q.onsuccess = () => { out = q.result; };
      tx.oncomplete = () => { db.close(); res(out); }; tx.onerror = () => { db.close(); rej(tx.error); };
    });
  },
  todos: (uid) => BDP.hacer('readonly', (st) => st.getAll()).then((l) => (l || []).filter((x) => x.uid === uid).sort((a, b) => a.creado.localeCompare(b.creado))),
  poner: (x) => BDP.hacer('readwrite', (st) => st.put(x)),
  quitar: (id) => BDP.hacer('readwrite', (st) => st.delete(id))
};
async function guardarPendiente(x) {
  const item = Object.assign({ id: uuid(), uid: S.user.id, creado: new Date().toISOString(), estado: 'pendiente' }, x);
  await BDP.poner(item);
  await contarPendientes();
  return item;
}
async function contarPendientes() {
  try { S.pendientes = S.user ? await BDP.todos(S.user.id) : []; } catch (e) { S.pendientes = []; }
  pintarConexion(); pintarPendientes();
}
function pintarConexion() {
  let el = $('#conexion');
  const sin = !navigator.onLine, n = S.user ? (S.pendientes || []).length : 0;
  if (!sin && !n) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('button'); el.id = 'conexion'; el.className = 'conexion'; el.dataset.act = 'ver_pendientes'; document.body.appendChild(el); }
  el.classList.toggle('sin', sin);
  el.setAttribute('aria-label', sin ? C.SIN_CONEXION : C.PENDIENTES_TITULO);
  el.innerHTML = `${ic(sin ? 'cloud-off' : 'cloud-upload')}<span>${sin ? esc(C.SIN_CONEXION) : esc(C.PENDIENTES_TITULO)}${n ? ` · ${n}` : ''}</span>`;
}
let subiendo = false;
async function subirPendientes() {
  if (subiendo || !S.user || !navigator.onLine) return;
  subiendo = true; let subidos = 0;
  try {
    for (const x of await BDP.todos(S.user.id)) {
      if (x.estado === 'duda' || x.estado === 'error') continue;
      try { await subirUno(x); await BDP.quitar(x.id); subidos++; }
      catch (e) {
        if (e && e.duda) { x.estado = 'duda'; await BDP.poner(x); continue; }
        if (esErrorRed(e)) break;
        x.estado = 'error'; x.error = mensajeError(e); await BDP.poner(x);
      }
    }
  } finally { subiendo = false; await contarPendientes(); }
  if (subidos) {
    aviso(C.PENDIENTES_SUBIDOS.replace('{n}', subidos), 'cloud-upload');
    S.stats = null; S.feed = []; refrescarActual();
    const D = encuentroActual(); if (D) D.cargar();
  }
}
async function subirUno(x) {
  const d = Object.assign({}, x.datos), uid = S.user.id;
  if (x.tipo === 'hallazgo') {
    if (!x.forzar) {
      const ya = await api.findByName(d.name, d.category_id, d.group_id);
      if (ya) { x.existente = ya; throw Object.assign(new Error('NOMBRE_REPETIDO'), { duda: true }); }
    }
    const f = await subirFotosDe(x.fotos, (x.privado ? 'priv:' : '') + uid, !x.privado);
    d.colonia = await api.colonia(d.lat, d.lng);
    let id;
    try { id = await api.addFind(Object.assign(d, { photo: f.pFoto, thumb: f.pMini }, f.pMedia ? { media: f.pMedia } : {})); }
    catch (e) { if (f.pFoto) api.removeFiles([f.pFoto, f.pMini, f.pMedia].filter(Boolean)).catch(() => null); throw e; }
    if (x.etiquetas && x.etiquetas.length && !d.is_private) await api.etiquetar(id, x.etiquetas).catch(() => null);
  } else if (x.tipo === 'reencuentro') {
    const f = await subirFotosDe(x.fotos, (x.privado ? 'priv:' : '') + uid);
    d.colonia = d.lat != null ? await api.colonia(d.lat, d.lng) : null;
    try { await api.addSighting(Object.assign(d, { photo: f.pFoto, thumb: f.pMini })); }
    catch (e) { if (f.pFoto) api.removeFiles([f.pFoto, f.pMini]).catch(() => null); throw e; }
  } else if (x.tipo === 'estado') {
    if (x.pos && d.colonia == null) d.colonia = await api.colonia(x.pos.lat, x.pos.lng);
    try { await api.addEstado(d); } catch (e) { if (!errTexto(e).includes('ESPERA')) throw e; }
    api.dispararPush();
  } else if (x.tipo === 'mira' || x.tipo === 'punto') {
    const f = await subirFotosDe(x.fotos, carpetaEncuentro(d.group_id));
    Object.assign(d, { photo: f.pFoto, thumb: f.pMini });
    try { if (x.tipo === 'mira') { await api.addMira(d); api.dispararPush(); } else await api.addPunto(d); }
    catch (e) { if (f.pFoto) api.removeFiles([f.pFoto, f.pMini]).catch(() => null); throw e; }
  }
}
const ICONO_PENDIENTE = { hallazgo: 'camera', reencuentro: 'repeat', estado: 'circle-check', mira: 'eye', punto: 'flag' };
function textoPendiente(x) {
  const d = x.datos || {};
  if (x.tipo === 'hallazgo') return d.name;
  if (x.tipo === 'reencuentro') return `${C.AYUDA.reencuentro}${x.nombre ? ': ' + x.nombre : ''}`;
  if (x.tipo === 'estado') return (C.ENCUENTRO_ESTADOS[d.kind] || {}).nombre || '';
  if (x.tipo === 'mira') return `${C.ENCUENTRO_MIRA}: ${d.note || ''}`;
  return `${C.AYUDA.punto_nuevo}: ${d.name || ''}`;
}
function pintarPendientes() {
  const el = $('#pendientes'); if (!el) return;
  const l = S.pendientes || [];
  const rs = $('#resumen-offline');
  if (rs) {
    rs.textContent = l.length ? '· ' + C.PLEGAR_PENDIENTES.replace('{n}', l.length) : '';
    if (l.length && !pintarPendientes.habia) abrirPlegable('offline', true);   // se abre sola solo cuando aparecen pendientes
  }
  pintarPendientes.habia = l.length > 0;
  el.innerHTML = l.length ? `<h4 class="row">${ic('cloud-upload')} ${esc(C.PENDIENTES_TITULO)} · ${l.length}</h4>
    <div class="list">${l.map((x) => `<div class="li pendiente ${x.estado}">
      <span class="thumb">${ic(ICONO_PENDIENTE[x.tipo] || 'cloud-upload')}</span>
      <div class="grow" style="min-width:0"><b>${esc(textoPendiente(x))}</b>
        <div class="tiny">${esc(hace(x.creado))}${x.estado === 'duda' ? ` · ${esc(C.PENDIENTE_DUDA)}` : ''}${x.estado === 'error' ? ` · ${esc(x.error || '')}` : ''}</div></div>
      ${x.estado === 'duda' ? `${ib('pendiente_mismo', 'repeat', 'reencuentro', `data-id="${x.id}"`, 'sm')}${ib('pendiente_otro', 'pencil', 'editar', `data-id="${x.id}"`, 'sm')}` : ''}
      ${ib('pendiente_borrar', 'trash', 'borrar', `data-id="${x.id}"`, 'sm')}</div>`).join('')}</div>
    ${navigator.onLine ? `<button class="btn alt block" data-act="subir_ahora" style="margin-top:8px">${ic('cloud-upload')} ${esc(C.AYUDA.subir_ahora)}</button>` : ''}` : '';
}
async function guardarHallazgoSinConexion(btn, o) {
  try {
    const priv = !o.grupo && R.priv;
    const fotos = R.original ? await prepararFotos(!priv) : null;
    await guardarPendiente({ tipo: 'hallazgo', privado: priv, fotos, etiquetas: priv ? [] : R.etiquetas.slice(),
      datos: { category_id: o.cat, group_id: o.grupo, name: o.nombre, note: o.nota || null, is_private: priv,
        lat: R.pos.lat, lng: R.pos.lng, accuracy: R.pos.acc, created_at: new Date().toISOString() } });
    cerrarTodo();
    const g = o.grupo ? miGrupo(o.grupo) : null, ct = o.cat ? S.cats.find((x) => x.id === o.cat) : null;
    celebrarHallazgo({ icono: (ct || g || {}).icon, color: (ct || g || {}).color, titulo: o.nombre, detalle: C.PENDIENTE_GUARDADO, foto: R.vistaUrl });
  } catch (e) { ocupado(btn, false); fallo(e); }
}
async function guardarReencuentroSinConexion(btn, c) {
  try {
    const fotos = R.original ? await prepararFotos() : null, pos = R.pos || null;
    await guardarPendiente({ tipo: 'reencuentro', privado: !!c.is_private, fotos, nombre: c.name,
      datos: { find_id: c.id, lat: pos ? pos.lat : null, lng: pos ? pos.lng : null, note: (R.nota || '').trim() || null, created_at: new Date().toISOString() } });
    cerrarTodo();
    celebrarHallazgo({ icono: 'repeat', color: c.cat_color, titulo: c.name, detalle: C.PENDIENTE_GUARDADO, foto: R.original ? R.vistaUrl : '' });
  } catch (e) { ocupado(btn, false); fallo(e); }
}
// Fotos que quedaron fuera de un grupo de encuentro borrado: cada quien las quita de su almacén
async function procesarFotosPorBorrar() {
  try {
    const l = await api.fotosPorBorrar(); if (!l || !l.length) return;
    await api.removeFiles(l.map((x) => x.path)).catch(() => null);
    await api.quitarFotosPorBorrar(l.map((x) => x.id));
  } catch (e) { /* se reintenta al abrir otra vez */ }
}
// Copias en el teléfono (las administra el trabajador del teléfono)
const fotosSinConexion = () => { try { return localStorage.getItem('cg_fotos_offline') !== '0'; } catch (e) { return true; } };
function alTrabajador(msg) {
  return new Promise((res) => {
    const sw = 'serviceWorker' in navigator && navigator.serviceWorker.controller;
    if (!sw) return res(null);
    const ch = new MessageChannel(); const t = setTimeout(() => res(null), 4000);
    ch.port1.onmessage = (e) => { clearTimeout(t); res(e.data); };
    sw.postMessage(msg, [ch.port2]);
  });
}
async function pintarSinConexion() {
  const el = $('#sec-offline'); if (!el) return;
  const si = fotosSinConexion();
  const n = (S.pendientes || []).length;
  if (n && !pintarPendientes.habia) { try { localStorage.setItem('cg_plegado_offline', '1'); } catch (e) { /* nada */ } }   // con pendientes nuevos se abre sola
  el.innerHTML = cabezaPlegable('offline', 'cloud-off', C.OFFLINE_TITULO, n ? C.PLEGAR_PENDIENTES.replace('{n}', n) : '') + `<div class="plegable" ${plegadoAbierto('offline') ? '' : 'hidden'}>
    <div id="pendientes"></div>
    <button class="li interruptor ${si ? 'on' : ''}" data-act="fotos_offline" role="switch" aria-checked="${si}"><span class="grow" style="text-align:left">${esc(C.GUARDAR_FOTOS)}</span><span class="sw" aria-hidden="true"></span></button>
    <div class="row between" style="margin-top:8px"><span class="tiny grow" id="espacio">…</span><button class="btn alt sm" data-act="liberar_espacio">${ic('eraser')} ${esc(C.LIBERAR)}</button></div></div>`;
  pintarPendientes();
  const r = await alTrabajador({ tipo: 'espacio' });
  const e = $('#espacio'); if (e) e.textContent = r ? textoEspacio(r) : '';
  const rs = $('#resumen-offline'); if (rs && !n && r) rs.textContent = '· ' + C.PLEGAR_ESPACIO.replace('{mb}', (r.fotos / 1048576).toFixed(1));
}
const textoEspacio = (r) => C.ESPACIO.replace('{mb}', (r.fotos / 1048576).toFixed(1)).replace('{tope}', Math.round(r.tope / 1048576)).replace('{t}', r.teselas);

/* Trabajador del teléfono: abrir sin conexión, versión nueva y notificaciones */
let trabajadorEsperando = null;
function registrarTrabajador() {
  if (!('serviceWorker' in navigator) || (window.__API_PRUEBAS__ && !window.__PROBAR_SW__)) return;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    const avisarNueva = () => { if (reg.waiting && navigator.serviceWorker.controller) { trabajadorEsperando = reg.waiting; pintarVersionNueva(); } };
    avisarNueva();
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      if (w) w.addEventListener('statechange', () => { if (w.state === 'installed') avisarNueva(); });
    });
    setInterval(() => { if (!document.hidden) reg.update().catch(() => null); }, 30 * 60 * 1000);
  }).catch((e) => console.error(e));
  let recargando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (S.actualizando && !recargando) { recargando = true; location.reload(); return; }
    if (S.user) alTrabajador({ tipo: 'ajustes', uid: S.user.id, fotos: fotosSinConexion() }); // primera vez que el trabajador toma el control
  });
  navigator.serviceWorker.addEventListener('message', (e) => {
    const d = e.data || {};
    if (d.tipo === 'abrir') abrirRuta(d.url);
    if (d.tipo === 'push') revisarAvisos();
  });
}
function pintarVersionNueva() {
  if (!trabajadorEsperando || $('#version-nueva')) return;
  const b = document.createElement('button');
  b.id = 'version-nueva'; b.className = 'version-nueva'; b.dataset.act = 'actualizar';
  b.innerHTML = `${ic('refresh')}<span>${esc(C.VERSION_NUEVA)}</span>`;
  document.body.appendChild(b);
}
function abrirRuta(url) {
  let h = '';
  try { h = new URL(url, location.href).hash; } catch (e) { h = ''; }
  if (!h) return;
  if (location.hash === h) rutaHash(h); else location.hash = h;
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

/* Silenciar: personas y grupos públicos de los que no formas parte */
async function recargarSilencios() { S.mutes = await api.muteList(); }
function trasSilencio() {
  S.feed = [];
  const top = hojaArriba();
  if (top && top.tipo === 'perfil') { const D = $('.sheet')._perfil; if (D) D.cargar(); else dibujarHoja(); }
  else if (top) dibujarHoja();
  refrescarActual();
}
function hojaSilenciados() {
  const render = () => `${cabeza(`${ic('volume-off')} ${esc(C.AYUDA.silenciados)}`)}
    ${S.mutes.length ? `<div class="list">${S.mutes.map((m) => `<div class="li">
      ${m.target_user ? `<button class="row grow" data-act="perfil" data-id="${m.target_user}" style="text-align:left">${avatar({ avatar: m.avatar, avatar_color: m.avatar_color })}<b class="grow">${esc(m.user_name || '—')}</b></button>`
        : `<button class="row grow" data-act="grupo" data-id="${m.target_group}" style="text-align:left"><span class="avatar" style="background:${okColor(m.group_color)}">${ic(m.group_icon)}</span><b class="grow">${esc(m.group_name || '—')}</b>${ic('users')}</button>`}
      ${ib('quitar_silencio', 'volume', 'quitar_silencio', `data-id="${m.id}"`, 'sm')}</div>`).join('')}</div>`
      : `<div class="empty">${ic('volume')}<p>${esc(C.SILENCIADOS_VACIO)}</p></div>`}`;
  abrirHoja(render, null, 'silenciados');
  recargarSilencios().then(() => { if (hojaArriba() && hojaArriba().tipo === 'silenciados') dibujarHoja(); }).catch(fallo);
}

/* Vitrina: fotos públicas de un perfil, por categoría (se puede ver sin cuenta) */
function invitacionHTML(conId) {
  return `<div class="invita" ${conId ? 'id="invita"' : ''}><p>${esc(C.VITRINA_INVITACION)}</p>
    <button class="btn block" data-act="entrar">${ic('user-plus')} ${esc(C.VITRINA_BOTON)}</button></div>`;
}
function vitrinaHTML(v, uid, conCuenta) {
  const cats = (v.categorias || []).filter((c) => c.hallazgos && c.hallazgos.length);
  return `<div class="vitrina">
    <div class="row" style="gap:14px">${avatar(v, 'lg')}<div class="grow"><h2>${esc(v.name)}</h2>${v.bio ? `<div class="muted">${esc(v.bio)}</div>` : ''}
      ${cats.length ? `<div class="colicons">${cats.map((c) => `<span class="colicon" style="background:${okColor(c.color)}" data-tip="${esc(c.name)} · ${c.total}" aria-label="${esc(c.name)}">${ic(c.icon)}</span>`).join('')}</div>` : ''}</div></div>
    ${conCuenta ? `<div class="row wrap" style="margin:14px 0">${ib('perfil', 'user', 'ver_perfil', `data-id="${uid}"`)}${S.user && uid === S.user.id ? ib('whatsapp_perfil', 'brand-whatsapp', 'whatsapp', `data-id="${uid}"`) : ''}</div>` : invitacionHTML(true)}
    ${cats.length ? cats.map((c) => `<div class="sec"><h3>${catBadge(c.name, c.icon, c.color)}<span class="muted">${c.total}</span></h3>
      <div class="vgrid">${c.hallazgos.map((h) => `<figure class="vtile" data-act="${conCuenta ? 'ficha' : 'vitrina_invitar'}" data-id="${h.id}" role="button" aria-label="${esc(h.name)}">
        <img src="${api.photoUrl(h.thumb || h.photo)}" alt="" loading="lazy"><figcaption><b>${esc(h.name)}</b>${h.colonia ? `<span>${ic('map-pin')} ${esc(h.colonia)}</span>` : ''}</figcaption></figure>`).join('')}</div></div>`).join('')
      : `<div class="empty">${ic('photo')}<p>${esc(C.VITRINA_VACIA)}</p></div>`}
    ${conCuenta || cats.reduce((n, c) => n + c.hallazgos.length, 0) <= 6 ? '' : invitacionHTML(false)}</div>`;
}
// Galería de una categoría de otra persona: solo lo público con foto, igual que su vitrina
function abrirGaleriaCat(uid, cat) {
  const D = { v: undefined };
  const hoja = { render: () => galeriaCatHTML(D, uid, cat), tipo: 'galeria_cat' };
  pila.push(hoja); dibujarHoja();
  api.vitrina(uid).then((v) => { D.v = v || null; }).catch((e) => { D.v = null; fallo(e); })
    .finally(() => { if (hojaArriba() === hoja) dibujarHoja(); });
}
function galeriaCatHTML(D, uid, cat) {
  if (D.v === undefined) return cabeza(ic('photo')) + `<div class="empty"><span class="spin">${ic('loader-2')}</span></div>`;
  if (!D.v) return cabeza(ic('photo')) + `<div class="empty">${ic('alert-triangle')}<p>Este perfil no está disponible</p></div>`;
  const v = D.v, c = (v.categorias || []).find((x) => x.id === cat);
  const items = c && c.hallazgos ? c.hallazgos : [];
  return `${cabeza(c ? `<span class="row">${catBadge(c.name, c.icon, c.color)}<span class="muted">${c.total}</span></span>` : ic('photo'))}
    <button class="row galeria-persona" data-act="perfil" data-id="${uid}" style="text-align:left">${avatar(v)}<div class="grow"><b>${esc(v.name)}</b>${c ? `<div class="muted tiny">${esc(C.GALERIA_DE.replace('{c}', c.name))}</div>` : ''}</div></button>
    ${items.length ? `<div class="vgrid">${items.map((h) => `<figure class="vtile" data-act="ficha" data-id="${h.id}" role="button" aria-label="${esc(h.name)}">
      <img src="${api.photoUrl(h.thumb || h.photo)}" alt="" loading="lazy"><figcaption><b>${esc(h.name)}</b>${h.colonia ? `<span>${ic('map-pin')} ${esc(h.colonia)}</span>` : ''}</figcaption></figure>`).join('')}</div>`
      : `<div class="empty">${ic('photo')}<p>${esc(C.GALERIA_VACIA)}</p></div>`}
    <button class="btn alt block" data-act="ver_vitrina" data-id="${uid}" style="margin-top:14px">${ic('photo')} ${esc(C.GALERIA_VITRINA)}</button>`;
}
function abrirVitrina(uid) {
  const D = { v: undefined };
  const hoja = { render: () => cabeza(ic('photo')) + (D.v === undefined ? `<div class="empty"><span class="spin">${ic('loader-2')}</span></div>`
    : D.v ? vitrinaHTML(D.v, uid, true) : `<div class="empty">${ic('alert-triangle')}<p>Este perfil no está disponible</p></div>`), tipo: 'vitrina' };
  pila.push(hoja); dibujarHoja();
  api.vitrina(uid).then((v) => { D.v = v || null; }).catch((e) => { D.v = null; fallo(e); })
    .finally(() => { if (hojaArriba() === hoja) dibujarHoja(); });
}
// Sin cuenta: la vitrina ocupa la pantalla, con la invitación a unirse
async function pantallaVitrina(uid) {
  $('#app').innerHTML = `<main class="screen vitrina-pub"><div class="row" style="margin-bottom:16px"><img src="icon.svg" alt="" width="40" height="40">
      <div class="grow"><b class="serif" style="font-size:20px">Collector Go</b><div class="tiny">${esc(C.LEMA)}</div></div></div>
    <div id="vit"><div class="empty"><span class="spin">${ic('loader-2')}</span></div></div></main>`;
  let v = null;
  try { v = await api.vitrina(uid); } catch (e) { fallo(e); }
  if (S.user || !$('#vit')) return;
  $('#vit').innerHTML = v ? vitrinaHTML(v, uid, false) : `<div class="empty">${ic('alert-triangle')}<p>Este perfil no está disponible</p></div>${invitacionHTML(true)}`;
}
const destinoVitrina = () => { const m = location.hash.match(/^#v=([0-9a-f-]{36})$/i); return m ? m[1] : null; };

/* Imagen tipo mosaico para compartir la vitrina por WhatsApp */
async function iconoLienzo(nombre, color, lado) {
  const cv = document.createElement('canvas'); cv.width = cv.height = lado;
  const x = cv.getContext('2d');
  const n = okIcon(nombre);
  if (esEmoji(n)) { x.font = `${Math.round(lado * 0.8)}px serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(n.slice(6), lado / 2, lado / 2 + 2); return cv; }
  const r = await fetch(C.ICONOS_URL + n + '.svg');
  if (!r.ok) throw new Error('ICONO');
  const svg = (await r.text()).replace(/currentColor/g, color);
  const img = await cargarImagen(new Blob([svg], { type: 'image/svg+xml' }));
  x.drawImage(img, 0, 0, lado, lado);
  cv.toDataURL(); // si el navegador no permite usar el ícono, falla aquí y no ensucia el mosaico
  return cv;
}
function textoCorto(x, t, max) {
  let s = String(t || '');
  while (s.length > 1 && x.measureText(s).width > max) s = s.slice(0, -1);
  return s === String(t || '') ? s : s.trimEnd() + '…';
}
async function mosaicoImagen(v) {
  const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  x.fillStyle = C.COLORES.papel; x.fillRect(0, 0, W, H);
  x.strokeStyle = C.COLORES.tinta; x.lineWidth = 8; x.strokeRect(40, 40, W - 80, H - 80);
  x.fillStyle = C.COLORES.tinta; x.font = 'bold 66px Georgia, serif'; x.textAlign = 'left';
  x.fillText(textoCorto(x, v.name, W - 180), 90, 150);
  // Hasta 9 fotos, alternando categorías
  const cats = (v.categorias || []).filter((c) => c.hallazgos && c.hallazgos.length);
  const colas = cats.map((c) => c.hallazgos.slice()), fotos = [];
  while (fotos.length < 9 && colas.some((l) => l.length)) colas.forEach((l) => { if (l.length && fotos.length < 9) fotos.push(l.shift()); });
  const imgs = await Promise.all(fotos.map((h) => cargarRemota(api.photoUrl(h.thumb || h.photo)).catch(() => null)));
  const gap = 12, lado = (840 - gap * 2) / 3, x0 = (W - 840) / 2, y0 = 195;
  for (let i = 0; i < 9; i++) {
    const cx = x0 + (i % 3) * (lado + gap), cy = y0 + Math.floor(i / 3) * (lado + gap);
    x.fillStyle = '#EADFCB'; x.fillRect(cx, cy, lado, lado);
    const img = imgs[i];
    if (img) {
      const k = Math.min(lado / img.width, lado / img.height), w = img.width * k, h = img.height * k;
      x.drawImage(img, cx + (lado - w) / 2, cy + (lado - h) / 2, w, h);
    }
    x.strokeStyle = C.COLORES.tinta; x.lineWidth = 3; x.strokeRect(cx, cy, lado, lado);
  }
  // Íconos de las colecciones
  const yI = y0 + 840 + 85, paso = Math.min(190, (W - 180) / Math.max(1, cats.length));
  for (let i = 0; i < cats.length; i++) {
    const c = cats[i], cx = 90 + i * paso + 40;
    x.fillStyle = okColor(c.color); x.beginPath(); x.arc(cx, yI, 40, 0, Math.PI * 2); x.fill();
    x.strokeStyle = C.COLORES.tinta; x.lineWidth = 3; x.stroke();
    try { x.drawImage(await iconoLienzo(c.icon, C.COLORES.papel, 44), cx - 22, yI - 22); }
    catch (e) { x.fillStyle = C.COLORES.papel; x.font = 'bold 38px system-ui, sans-serif'; x.textAlign = 'center'; x.fillText(primerGrafema(c.name).toUpperCase(), cx, yI + 13); x.textAlign = 'left'; }
    x.fillStyle = C.COLORES.tinta; x.font = '26px system-ui, sans-serif'; x.textAlign = 'center';
    x.fillText(textoCorto(x, c.name, paso - 10), cx, yI + 76); x.textAlign = 'left';
  }
  x.fillStyle = C.COLORES.terracota; x.font = 'bold 34px Georgia, serif'; x.fillText('Collector Go', 90, H - 80);
  x.fillStyle = '#6B635A'; x.font = '28px system-ui, sans-serif'; x.fillText(C.LEMA, 330, H - 80);
  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('MOSAICO'))), 'image/jpeg', 0.86));
}
// Solo para tu propio perfil, el mosaico se prepara cuando el teléfono está desocupado, para compartirlo con un solo toque
// (Safari y otros navegadores solo dejan compartir un archivo en el mismo instante del toque).
const MOSAICOS = new Map();
const cuandoDesocupado = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 1200));
function prepararMosaico(uid) {
  const ya = MOSAICOS.get(uid);
  if (ya && (ya.estado === 'cargando' || Date.now() - ya.t < 10 * 60 * 1000)) return ya;
  if (ya && ya.url) URL.revokeObjectURL(ya.url);
  const M = { estado: 'cargando', url: null, file: null, texto: '', t: Date.now() };
  MOSAICOS.set(uid, M);
  M.listo = (async () => {
    let v = null;
    try { v = await api.vitrina(uid); } catch (e) { console.error(e); }
    M.texto = `${S.user && uid === S.user.id ? C.WHATSAPP_VITRINA : C.WHATSAPP_VITRINA_DE.replace('{nombre}', v ? v.name : '')}\n${location.origin + location.pathname}#v=${uid}`;
    if (v && (v.categorias || []).some((c) => c.hallazgos && c.hallazgos.length)) {
      try {
        const blob = await mosaicoImagen(v);
        M.file = new File([blob], `collector-go-${uid.slice(0, 8)}.jpg`, { type: 'image/jpeg' });
        M.url = URL.createObjectURL(blob);
      } catch (e) { console.error(e); }
    }
    M.estado = 'listo'; M.t = Date.now();
    return M;
  })();
  return M;
}
const puedeCompartirArchivo = (f) => !!(f && navigator.canShare && navigator.share && navigator.canShare({ files: [f] }));
function compartirMosaico(M) {
  if (puedeCompartirArchivo(M.file)) {
    navigator.share({ files: [M.file], text: M.texto }).catch((e) => { if (!(e && e.name === 'AbortError')) abrirWhatsApp(M.texto); });
  } else abrirWhatsApp(M.texto);
}
// Si aún no está listo (o el navegador no comparte archivos): vista previa con Enviar y Descargar
function hojaMosaico(uid) {
  const M = prepararMosaico(uid);
  const hoja = { render: () => `${cabeza(`${ic('brand-whatsapp')} ${esc(C.AYUDA.whatsapp)}`)}
    ${M.estado === 'cargando' ? `<div class="empty"><span class="spin">${ic('loader-2')}</span></div>` : ''}
    ${M.url ? `<img class="big mosaico" src="${M.url}" alt="">` : ''}
    ${M.estado === 'listo' ? `<button class="btn block" data-act="enviar_mosaico" data-id="${uid}" style="margin-top:12px">${ic('brand-whatsapp')} Enviar</button>
      ${M.url ? `<a class="btn alt block" href="${M.url}" download="collector-go-${uid.slice(0, 8)}.jpg" style="margin-top:10px">${ic('download')} ${esc(C.AYUDA.descargar)}</a>` : ''}` : ''}`, tipo: 'mosaico' };
  pila.push(hoja); dibujarHoja();
  M.listo.then(() => { if (hojaArriba() === hoja) dibujarHoja(); });
}

/* Buzón de peticiones a la administradora */
const tipoBuzon = (id) => C.BUZON_TIPOS.find((t) => t.id === id) || C.BUZON_TIPOS[C.BUZON_TIPOS.length - 1];
const estadoBuzon = (id) => C.BUZON_ESTADOS[id] || C.BUZON_ESTADOS.recibido;
function metaBuzon() {
  return { version: C.VERSION, dispositivo: String(navigator.userAgent || '').slice(0, 300), pantalla: `${screen.width}x${screen.height}`,
    idioma: navigator.language || '', ultimo_error: S.ultimoError || null };
}
function resumenDispositivo(ua) {
  ua = String(ua || '');
  const so = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac OS/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Otro';
  const nav = /CriOS|Chrome/.test(ua) && !/Edg|SamsungBrowser/.test(ua) ? 'Chrome' : /FxiOS|Firefox/.test(ua) ? 'Firefox' : /SamsungBrowser/.test(ua) ? 'Samsung' : /Edg/.test(ua) ? 'Edge' : /Safari/.test(ua) ? 'Safari' : 'navegador';
  return `${so} · ${nav}`;
}
function peticionHTML(r, admin, editando) {
  const t = tipoBuzon(r.tipo), e = estadoBuzon(r.status), m = r.meta || {};
  return `<div class="peticion">
    <div class="row between">${admin ? `<button class="row" data-act="perfil" data-id="${r.user_id}">${avatar(r)}<b>${esc(r.user_name || '')}</b></button>` : ''}
      <span class="row">${ic(t.icono)} <b>${esc(t.nombre)}</b></span><span class="estado e-${esc(r.status)}">${ic(e.icono)} ${esc(e.nombre)}</span></div>
    <p>${esc(r.body)}</p>
    ${r.screenshot ? `<a href="${api.photoUrl(r.screenshot)}" target="_blank" rel="noopener"><img class="captura" src="${api.photoUrl(r.screenshot)}" alt="Captura"></a>` : ''}
    ${admin ? `<div class="tiny">v${esc(m.version || '?')} · ${esc(resumenDispositivo(m.dispositivo))}${m.ultimo_error ? ` · código ${esc(m.ultimo_error.codigo)}` : ''}</div>
      ${m.ultimo_error ? `<details class="tiny"><summary>Último error</summary><pre>${esc(JSON.stringify(m.ultimo_error, null, 1))}</pre></details>` : ''}
      <div class="toggle" style="margin:8px 0">${Object.keys(C.BUZON_ESTADOS).map((k) => `<button type="button" data-act="peticion_estado" data-id="${r.id}" data-v="${k}" class="${r.status === k ? 'on' : ''}" aria-label="${esc(C.BUZON_ESTADOS[k].nombre)}" data-tip="${esc(C.BUZON_ESTADOS[k].nombre)}">${ic(C.BUZON_ESTADOS[k].icono)}</button>`).join('')}</div>
      ${r.reply && !editando ? `<div class="respuesta enviada">${ic('circle-check')} <span class="grow"><b>${esc(C.RESPUESTA_ENVIADA)}</b> ${esc(r.reply)}
          ${r.replied_at ? `<span class="tiny"> · ${esc(hace(r.replied_at))}</span>` : ''}</span>${ib('editar_respuesta', 'pencil', 'editar', `data-id="${r.id}"`, 'sm')}</div>`
        : `<textarea class="in" id="resp-${r.id}" maxlength="${C.BUZON_RESPUESTA_MAX}" placeholder="${esc(C.RESPUESTA_PISTA)}">${esc(r.reply || '')}</textarea>
          <button class="btn sm" data-act="responder_peticion" data-id="${r.id}" style="margin-top:6px">${ic('send')} ${esc(C.RESPUESTA_ENVIAR)}</button>`}`
      : r.reply ? `<div class="respuesta">${ic('message-circle')} <b>${esc(C.RESPUESTA_DE_ADMIN)}</b> ${esc(r.reply)}</div>` : ''}
    <div class="row between" style="margin-top:6px"><span class="tiny">${esc(fecha(r.created_at))}</span>
      <span class="row">${ib('borrar_peticion', 'trash', 'borrar', `data-id="${r.id}"`, 'sm')}</span></div></div>`;
}
function hojaBuzon() {
  const D = { tipo: C.BUZON_TIPOS[0].id, texto: '', foto: null, fotoUrl: null, lista: null };
  const hoja = { render: () => `${cabeza(`${ic('mail')} ${esc(C.AYUDA.buzon)}`)}
    <p class="muted" style="margin:0 0 12px">${esc(C.BUZON_TEXTO)}</p>
    <div class="toggle" style="margin-bottom:6px">${C.BUZON_TIPOS.map((t) => `<button type="button" data-act="buzon_tipo" data-v="${t.id}" class="${D.tipo === t.id ? 'on' : ''}" aria-label="${esc(t.nombre)}">${ic(t.icono)}<span style="font-size:15px">${esc(t.nombre)}</span></button>`).join('')}</div>
    <div class="field"><textarea id="buzon-in" class="in" maxlength="${C.BUZON_MAX}" rows="4" placeholder="${esc(C.BUZON_PISTA)}">${esc(D.texto)}</textarea>
      <div class="tiny" style="text-align:right"><span id="buzon-n">${D.texto.length}</span>/${C.BUZON_MAX}</div></div>
    <div class="row" style="margin-bottom:12px">${D.fotoUrl ? `<img class="captura sm" src="${D.fotoUrl}" alt="">${ib('buzon_quitar_foto', 'x', 'quitar_captura', '', 'sm')}`
      : `<label class="ib" data-tip="${esc(C.AYUDA.captura)}" aria-label="${esc(C.AYUDA.captura)}">${ic('photo-plus')}<input type="file" accept="image/*" hidden data-in="captura"></label>`}
      <span class="tiny grow">${esc(C.AYUDA.captura)}</span></div>
    <button class="btn block" data-act="enviar_buzon">${ic('send')} ${esc(C.AYUDA.enviar)}</button>
    <div class="sec"><h3>${ic('inbox')} ${esc(C.BUZON_MIS)}</h3>
      ${D.lista === null ? `<div class="empty"><span class="spin">${ic('loader-2')}</span></div>` : D.lista.length ? `<div class="list">${D.lista.map((r) => peticionHTML(r, false)).join('')}</div>` : `<p class="muted">—</p>`}</div>`,
  after: (r) => {
    r._buzon = D;
    $$('[data-in="captura"]', r).forEach((inp) => inp.addEventListener('change', () => inp.files[0] && ponerCaptura(D, inp.files[0])));
  }, tipo: 'buzon' };
  pila.push(hoja); dibujarHoja();
  D.cargar = async () => { try { D.lista = await api.myRequests(S.user.id); } catch (e) { D.lista = []; fallo(e); } if (pila.includes(hoja)) dibujarHoja(); };
  D.cargar();
}
async function ponerCaptura(D, file) {
  try {
    const cv = escalar(await cargarImagen(file), 1280);
    const blob = await new Promise((res) => cv.toBlob((b) => res(b), 'image/jpeg', 0.8));
    if (!blob) throw new Error('IMAGEN');
    if (D.fotoUrl) URL.revokeObjectURL(D.fotoUrl);
    D.foto = blob; D.fotoUrl = URL.createObjectURL(blob);
    const t = $('#buzon-in'); if (t) D.texto = t.value;
    dibujarHoja();
  } catch (e) { aviso('No se pudo leer la imagen', 'photo'); }
}

// Las fotos de hallazgos privados guardadas antes de la versión 1.4 pasan al almacén cerrado (una sola vez)
async function protegerFotosAntiguas() {
  const k = 'cg_privadas_' + S.user.id;
  try { if (localStorage.getItem(k)) return; } catch (e) { /* sin almacenamiento: se revisa cada vez */ }
  try {
    const mias = await api.userCards(S.user.id);
    const pend = mias.filter((c) => c.is_private && [c.photo, c.thumb].some((x) => x && !String(x).startsWith('priv:')));
    for (const c of pend) await moverFotosHallazgo(c.id, true);
    if (pend.length) { S.cache.clear(); refrescarActual(); }
    try { localStorage.setItem(k, '1'); } catch (e) { /* nada */ }
  } catch (e) { console.error(e); }
}

/* Avisos (solo con la app abierta): reacciones, comentarios, reencuentros y seguidores;
   para la administradora también personas nuevas, buzón, moderación y uso del plan */
const claveAviso = (a) => `${a.kind}|${a.find_id}|${a.actor_id}|${a.reaccion || ''}|${a.texto || ''}|${a.at}|${a.grupo_id || ''}`;
const RECURSOS = { fotos: 'fotos', base: 'base de datos' };
function textoAviso(a) {
  const k = a.kind;
  if (k === 'comentario') return `${a.actor_name} comentó en ${a.find_name}: «${a.texto}»`;
  if (k === 'reencuentro') return a.reaccion === 'visto' ? `${a.actor_name} sumó una foto a tu ${a.find_name}${a.texto ? `: «${a.texto}»` : ''}` : `${a.actor_name} volvió a ver ${a.find_name}`;
  if (k === 'traspaso') return C.TRASPASO_AVISO.replace('{h}', a.find_name || '').replace('{d}', a.texto || '');
  if (k === 'reporte_col') return `${a.actor_name} reportó una foto de la comunidad: «${a.texto}»`;
  if (k === 'seguidor') return `${a.actor_name} empezó a seguirte`;
  if (k === 'etiqueta') return `${a.actor_name} te etiquetó en ${a.find_name}`;
  if (k === 'mensaje') return a.texto ? `${a.actor_name} te escribió: «${a.texto}»` : C.FICHA_AVISO.replace('{n}', a.actor_name || '');
  if (k === 'nuevo_miembro') return `Nueva persona en la comunidad: ${a.actor_name}`;
  if (k === 'buzon') return `${a.actor_name} escribió al buzón: «${a.texto}»`;
  if (k === 'reporte') return `Aviso a moderación: ${a.find_name || 'un hallazgo'}`;
  if (k === 'uso') { const [rec, , pct] = String(a.texto || '').split(':'); return `Uso del plan: ${RECURSOS[rec] || rec} al ${pct} %`; }
  if (k === 'ayuda') return `${a.actor_name} pidió ayuda en ${a.texto}`;
  if (k === 'votacion') return `${a.actor_name} propone borrar ${a.texto}`;
  if (k === 'ausencia') return `${a.actor_name} dice que ${a.find_name} ya no está`;
  if (k === 'anuncio') return a.texto || '';
  if (k === 'amistad') return C.AMISTAD_AVISO.replace('{n}', a.actor_name || '') + (a.texto ? `: «${a.texto}»` : '');
  if (k === 'respuesta') return C.RESPUESTA_AVISO.replace('{t}', a.texto || '');
  if (k === 'invitacion') return (a.reaccion === 'rechazada' ? C.INVITACION_RECHAZASTE : C.INVITACION_RECIBIDA).replace('{n}', a.actor_name || '').replace('{g}', a.texto || '');
  if (k === 'invitacion_resp') return (a.reaccion === 'aceptada' ? C.INVITACION_ACEPTO : C.INVITACION_RECHAZO).replace('{n}', a.actor_name || '').replace('{g}', a.texto || '');
  if (k === 'grupo_borrado') { const t = String(a.texto || ''), i = t.lastIndexOf(':'); return `Se borró ${t.slice(0, i)} ${t.slice(i + 1) === 'votacion' ? 'por votación' : 'por inactividad'}`; }
  if (k === 'reaccion' && a.reaccion === 'eye') return C.VISTO_AVISO.replace('{n}', a.actor_name || '').replace('{h}', a.find_name || '');
  const r = C.REACCIONES.find((x) => x.tipo === a.reaccion);
  return `${a.actor_name} reaccionó a ${a.find_name}${r ? ` (${r.ayuda.toLowerCase()})` : ''}`;
}
function iconoAviso(a) {
  const fijo = { comentario: 'message-circle', reencuentro: 'repeat', seguidor: 'user-plus', nuevo_miembro: 'user-plus', buzon: 'mail', reporte: 'flag', uso: 'gauge', etiqueta: 'tag', mensaje: 'messages',
    ayuda: 'urgent', votacion: 'trash', grupo_borrado: 'lifebuoy', ausencia: 'map-pin-off', anuncio: 'speakerphone', traspaso: 'heart-handshake', reporte_col: 'flag' };
  if (a.kind === 'reencuentro' && a.reaccion === 'visto') return 'users';
  if (a.kind === 'invitacion') return 'user-plus';
  if (a.kind === 'respuesta') return 'message-circle';
  if (a.kind === 'amistad') return 'heart-handshake';
  if (a.kind === 'invitacion_resp') return a.reaccion === 'aceptada' ? 'user-check' : 'user-x';
  if (fijo[a.kind]) return fijo[a.kind];
  const r = C.REACCIONES.find((x) => x.tipo === a.reaccion); return r ? r.icono : 'heart';
}
const nivelAviso = (a) => (a.kind === 'uso' && /:80:/.test(a.texto || '') ? 'rojo' : a.kind === 'uso' ? 'amarillo' : '');
// Qué abre cada aviso: la ficha, un perfil o una pestaña del escudo
function destinoAviso(a) {
  if (['seguidor', 'nuevo_miembro', 'amistad'].includes(a.kind)) return `data-kind="perfil" data-id="${a.actor_id}"`;
  if (a.kind === 'mensaje') return `data-kind="chat" data-id="${a.actor_id}"`;
  if (a.kind === 'buzon') return 'data-kind="admin" data-id="buzon"';
  if (a.kind === 'reporte' || a.kind === 'reporte_col') return 'data-kind="admin" data-id="avisos"';
  if (a.kind === 'reencuentro' && a.reaccion === 'visto') return `data-kind="colaboracion" data-id="${a.find_id}" data-foto="${esc(a.thumb || '')}" data-n="${esc(a.actor_name || '')}" data-h="${esc(a.find_name || '')}"`;
  if (a.kind === 'uso') return 'data-kind="admin" data-id="uso"';
  if (a.kind === 'ayuda' || a.kind === 'votacion') return `data-kind="encuentro" data-id="${a.grupo_id}" data-foco="${a.kind === 'ayuda' ? a.actor_id : ''}"`;
  if (a.kind === 'grupo_borrado') return 'data-kind="nada" data-id=""';
  if (a.kind === 'invitacion') return 'data-kind="buzon" data-id=""';
  if (a.kind === 'respuesta') return 'data-kind="mis_mensajes" data-id="-"';
  if (a.kind === 'invitacion_resp') return a.reaccion === 'aceptada' ? `data-kind="grupo" data-id="${a.grupo_id}"` : `data-kind="perfil" data-id="${a.actor_id}"`;
  if (a.kind === 'anuncio') return a.reaccion === 'encuentro_nuevo' ? 'data-kind="encuentro_nuevo" data-id="-"' : 'data-kind="nada" data-id=""';
  return `data-kind="ficha" data-id="${a.find_id}"`;
}
function caraAviso(a) {
  if (a.kind === 'grupo_borrado') return `<span class="avatar" style="background:var(--tinta)">${ic('lifebuoy')}</span>`;
  if (a.kind === 'traspaso') return `<span class="avatar" style="background:var(--terracota)">${ic('heart-handshake')}</span>`;
  return a.actor_id ? avatar({ avatar: a.actor_avatar, avatar_color: a.actor_color })
    : `<span class="avatar ${nivelAviso(a)}" style="background:var(--tinta)">${ic('shield')}</span>`;
}
const marcaAdmin = (a) => (a.admin ? `<span class="marca-admin" aria-label="Administración">${ic('shield')}</span>` : '');
function pintarCampana() {
  const n = S.avisos.filter((a) => a.nuevo).length;
  $$('[data-campana]').forEach((b) => {
    let s = $('.badge-n', b);
    if (!n) { if (s) s.remove(); return; }
    if (!s) { s = document.createElement('span'); s.className = 'badge-n'; b.appendChild(s); }
    s.textContent = n > 9 ? '9+' : String(n);
  });
}
let tNotif;
function notificar(html, act, attrs) {
  let el = $('#notif');
  if (!el) { el = document.createElement('div'); el.id = 'notif'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.innerHTML = `<button class="notif-cuerpo row" data-act="${act}" ${attrs || ''}>${html}</button>${ib('cerrar_notif', 'x', 'cerrar', '', 'sm ghost')}`;
  el.classList.add('show');
  clearTimeout(tNotif); tNotif = setTimeout(() => el.classList.remove('show'), C.AVISO_MS);
}
function cerrarNotif() { const el = $('#notif'); if (el) el.classList.remove('show'); }
const adminDatos = () => { const a = adminAbierto(); return a ? a.datos : null; };
function recordarAnuncio(D) { const t = $('#anuncio-in'); if (t) D.nuevo.texto = t.value; }
async function revisarAvisos() {
  if (!S.user || !S.me || S.me.blocked || document.hidden || !api.avisos) return;
  let lista;
  try { lista = await api.avisos(); } catch (e) { return; } // sin avisos si falla: no interrumpe
  S.avisos = lista || [];
  let nuevos = S.avisos.filter((a) => a.nuevo && !S.avisosVistos.has(claveAviso(a)));
  nuevos.forEach((a) => S.avisosVistos.add(claveAviso(a)));
  const primera = !S.avisosListo; S.avisosListo = true;
  pintarCampana();
  if (!nuevos.length) return;
  // Si la conversación con esa persona está abierta, el mensaje aparece ahí mismo
  const top = hojaArriba();
  if (top && top.tipo === 'chat' && top.datos && nuevos.some((a) => a.kind === 'mensaje' && a.actor_id === top.datos.uid)) top.datos.cargar();
  const aNotificar = nuevos.filter((a) => !(top && top.tipo === 'chat' && top.datos && a.kind === 'mensaje' && a.actor_id === top.datos.uid));
  if (!aNotificar.length) return;
  if (top && top.tipo === 'buzon_amigos' && top.datos) top.datos.cargar();
  nuevos = aNotificar;
  if (primera && nuevos.length > 1) return notificar(`${ic('mail-heart')}<span class="grow">${esc(C.AVISOS_NUEVOS.replace('{n}', nuevos.length))}</span>`, 'avisos');
  const a = nuevos[0];
  notificar(`${caraAviso(a)}<span class="grow">${marcaAdmin(a)}${ic(iconoAviso(a))} ${esc(textoAviso(a))}${nuevos.length > 1 ? ` <b>+${nuevos.length - 1}</b>` : ''}</span>
    ${a.thumb && a.find_id ? `<img class="notif-img" src="${api.photoUrl(a.thumb)}" alt="">` : ''}`, nuevos.length > 1 ? 'avisos' : 'aviso_abrir', nuevos.length > 1 ? '' : destinoAviso(a));
}
// Buzón: una sola lista con las conversaciones (una fila por amiga) y los avisos, de lo más reciente a lo más antiguo.
// Los avisos desaparecen 12 h después de verlos; las conversaciones se quedan.
function filaAviso(a) {
  const seguirVuelta = a.kind === 'seguidor' && !S.following.has(a.actor_id);
  return `<div class="li aviso ${a.nuevo ? 'nuevo' : ''} ${a.admin ? 'de-admin' : ''}">
    <button class="row grow" data-act="aviso_abrir" ${destinoAviso(a)} style="text-align:left;min-width:0">
      ${caraAviso(a)}<div class="grow" style="min-width:0"><div>${marcaAdmin(a)}${ic(iconoAviso(a))} ${esc(textoAviso(a))}</div><div class="tiny">${esc(hace(a.at))}</div></div>
      ${a.thumb && a.find_id ? `<img class="thumb" src="${api.photoUrl(a.thumb)}" alt="">` : ''}</button>
    ${seguirVuelta ? `<button class="btn sm" data-act="seguir" data-id="${a.actor_id}">${ic('user-plus')} ${esc(C.AYUDA.seguir_vuelta)}</button>` : ''}
    ${a.kind === 'amistad' ? `<div class="row invit-botones">
      <button class="btn sm" data-act="amistad_aceptar" data-id="${a.actor_id}">${ic('user-check')} ${esc(C.AMISTAD_ACEPTAR)}</button>
      <button class="btn alt sm" data-act="amistad_rechazar" data-id="${a.actor_id}">${ic('x')} ${esc(C.INVITACION_RECHAZAR)}</button></div>` : ''}
    ${a.kind === 'invitacion' ? `<div class="row invit-botones">
      <button class="btn sm" data-act="invitacion_unirme" data-g="${a.grupo_id}">${ic('user-plus')} ${esc(C.INVITACION_UNIRME)}</button>
      ${a.reaccion === 'pendiente' ? `<button class="btn alt sm" data-act="invitacion_rechazar" data-g="${a.grupo_id}">${ic('x')} ${esc(C.INVITACION_RECHAZAR)}</button>` : ''}</div>` : ''}</div>`;
}
function filaConversacion(c) {
  return `<button class="li conv ${c.sin_leer ? 'nuevo' : ''}" data-act="chat" data-id="${c.persona}" style="text-align:left">
    ${avatar(c)}<div class="grow" style="min-width:0"><b>${esc(c.name)}</b>
      <div class="tiny conv-ultimo">${ic(c.ultimo_ficha ? 'cards' : 'messages')} ${c.ultimo_mio ? 'Tú: ' : ''}${esc(c.ultimo || (c.ultimo_ficha ? C.FICHA_EN_CHAT : ''))}</div></div>
    <span class="tiny">${esc(hace(c.ultimo_at))}</span>${c.sin_leer ? `<span class="badge-n fijo">${c.sin_leer > 9 ? '9+' : c.sin_leer}</span>` : ''}</button>`;
}
function hojaAvisos() {
  cerrarNotif();
  const D = { conv: null };
  const hoja = { render: () => {
      const avisos = S.avisos.filter((a) => a.kind !== 'mensaje');
      const conv = D.conv || [];
      const filas = conv.filter((c) => c.ultimo_at).map((c) => ({ at: c.ultimo_at, html: filaConversacion(c) }))
        .concat(avisos.map((a) => ({ at: a.at, html: filaAviso(a) })))
        .sort((x, y) => String(y.at).localeCompare(String(x.at)));
      const amigasSin = conv.filter((c) => !c.ultimo_at && c.amigas);
      return `${cabeza(`${ic('mail-heart')} ${esc(C.AYUDA.buzon_amigos)}`)}
        ${D.conv === null && !avisos.length ? `<div class="empty"><span class="spin">${ic('loader-2')}</span></div>`
          : filas.length ? `<div class="list">${filas.map((f) => f.html).join('')}</div>` : `<div class="empty">${ic('mail-heart')}<p>${esc(C.AVISOS_VACIO)}</p></div>`}
        ${amigasSin.length ? `<div class="sec"><h3>${ic('messages')} ${esc(C.BUZON_EMPEZAR)}</h3><div class="chips" style="flex-wrap:wrap">${amigasSin.map((c) =>
          `<button class="chip" data-act="chat" data-id="${c.persona}">${avatar(c)}${esc(c.name)} ${ic('messages')}</button>`).join('')}</div></div>` : ''}`;
    }, tipo: 'buzon_amigos' };
  hoja.datos = D;
  pila.push(hoja); dibujarHoja();
  D.cargar = async () => {
    try {
      const [conv, avisos] = await Promise.all([api.conversaciones(), api.avisos()]);
      D.conv = conv; S.avisos = avisos || [];
      S.avisos.forEach((x) => S.avisosVistos.add(claveAviso(x))); // lo que ya se ve aquí no vuelve a notificarse
      pintarCampana();
    } catch (e) { D.conv = D.conv || []; }
    if (hojaArriba() === hoja) dibujarHoja();
  };
  D.cargar().then(() => api.avisosVistos()).then(() => {
    S.avisos = S.avisos.map((a) => (a.kind === 'mensaje' ? a : Object.assign({}, a, { nuevo: false }))); pintarCampana();
  }).catch(() => null);
}

// Conversación con una amiga: solo texto, hasta 300 caracteres
function hojaChat(uid) {
  cerrarNotif();
  const D = { uid, p: null, msgs: null, puede: null, borrador: '' };
  const hoja = { render: () => {
      const p = D.p;
      const cab = p ? `<button class="row" data-act="perfil" data-id="${uid}">${avatar(p)}<b>${esc(p.name)}</b></button>` : '';
      return `${cabeza(cab)}
        <div class="chat" id="chat-lista">${listaChatHTML(D)}</div>
        ${D.puede === false ? `<div class="banner" style="margin-top:12px">${ic('lock')}<span class="grow">${esc(D.amistad === 'enviada' ? C.CHAT_ENVIADA : D.amistad === 'recibida' ? C.CHAT_RECIBIDA : D.amistad === 'puede' ? C.CHAT_PIDE : D.amistad === 'no' ? C.CHAT_SIGUE : C.CHAT_BLOQUEADO)}</span>
            ${D.amistad === 'no' && !S.following.has(uid) ? `<button class="btn sm" data-act="seguir" data-id="${uid}">${ic('user-plus')} ${esc(C.AYUDA.seguir)}</button>` : botonAmistad(uid, D.amistad === 'enviada' ? null : D.amistad)}</div>`
          : D.puede ? `<div class="chat-escribir"><textarea id="chat-in" class="in" maxlength="${C.MENSAJE_MAX}" rows="2" placeholder="${esc(C.CHAT_PISTA)}">${esc(D.borrador)}</textarea>
            <div class="row between"><span class="tiny"><span id="chat-n">${D.borrador.length}</span>/${C.MENSAJE_MAX}</span>
            <button class="btn" data-act="enviar_mensaje" data-id="${uid}">${ic('send')} ${esc(C.AYUDA.enviar)}</button></div></div>` : ''}`;
    },
    after: (r) => { const l = $('#chat-lista', r); if (l) l.scrollTop = l.scrollHeight; }, tipo: 'chat' };
  hoja.datos = D;
  pila.push(hoja); dibujarHoja();
  D.cargar = async () => {
    try {
      const [p, msgs, puede, amistad] = await Promise.all([api.getProfile(uid), api.hilo(uid), api.puedoEscribir(uid), api.estadoAmistad(uid).catch(() => null)]);
      // las fichas del chat: solo se piden las que no están ya guardadas; si no se pueden ver, dicen "ya no está disponible"
      const faltan = [...new Set(msgs.filter((m) => m.find_id && !cartaConFotos(m.find_id)).map((m) => m.find_id))];
      if (faltan.length) guarda(await api.cardsByIds(faltan).catch(() => []));
      Object.assign(D, { p, msgs, puede: !!puede, amistad });
      if (msgs.some((m) => m.recipient === S.user.id && !m.read_at)) await api.marcarLeidos(uid).catch(() => null);
      S.avisos = S.avisos.filter((a) => !(a.kind === 'mensaje' && a.actor_id === uid)); pintarCampana();
    } catch (e) { D.msgs = D.msgs || []; fallo(e); }
    if (hojaArriba() !== hoja) return;
    const t = $('#chat-in'), l = $('#chat-lista');
    if (t) D.borrador = t.value;
    // Si solo llegaron mensajes (se puede seguir escribiendo igual), se redibuja solo la lista: el teclado no se cierra
    const firma = `${D.puede}|${D.amistad}|${D.p ? D.p.name : ''}`;
    if (t && l && D.firma === firma) {
      const abajo = l.scrollHeight - l.scrollTop - l.clientHeight < 60;
      l.innerHTML = listaChatHTML(D);
      if (abajo) l.scrollTop = l.scrollHeight;
    } else dibujarHoja();
    D.firma = firma;
  };
  D.cargar();
}
function listaChatHTML(D) {
  if (D.msgs === null) return `<div class="empty"><span class="spin">${ic('loader-2')}</span></div>`;
  return D.msgs.length ? D.msgs.map((m) => `<div class="burbuja ${m.sender === S.user.id ? 'mia' : ''}">${m.body ? `<p>${esc(m.body)}</p>` : ''}${m.find_id || m.con_ficha ? fichaChatHTML(m) : ''}<span class="tiny">${esc(hace(m.created_at))}</span></div>`).join('')
    : `<p class="muted" style="text-align:center">${esc(C.CHAT_VACIO)}</p>`;
}

// Ficha dentro del chat: foto chica, nombre y colonia; al tocarla se abre la ficha
function fichaChatHTML(m) {
  const c = m.find_id ? S.cache.get(m.find_id) : null;
  if (!c || c.is_private) return `<div class="ficha-chat no-disp"><span class="ft"></span><span class="ficha-chat-tx"><b>${esc(C.FICHA_NO_DISPONIBLE)}</b><span class="tiny">${esc(C.FICHA_NO_DISPONIBLE_TEXTO)}</span></span></div>`;
  return `<button type="button" class="ficha-chat" data-act="ficha" data-id="${c.id}">${c.thumb || c.photo ? `<img class="ft" src="${foto(c, true)}" alt="" loading="lazy">` : `<span class="ft">${ic(c.cat_icon)}</span>`}
    <span class="ficha-chat-tx"><b>${esc(c.name)}</b>${c.colonia ? `<span class="tiny">${ic('map-pin')} ${esc(c.colonia)}</span>` : ''}</span></button>`;
}
// Enviar una ficha a una amiga (solo a quienes pueden verla)
function hojaEnviarFicha(fid) {
  const c = S.cache.get(fid); if (!c || c.is_private) return;
  const D = { amigas: null, enviadas: new Set(), linea: '' };
  const hoja = { render: () => `${cabeza(`${ic('send')} ${esc(C.FICHA_ENVIAR)}`)}
      <div class="ficha-chat" style="margin:0 0 10px">${c.thumb || c.photo ? `<img class="ft" src="${foto(c, true)}" alt="">` : `<span class="ft">${ic(c.cat_icon)}</span>`}
        <span class="ficha-chat-tx"><b>${esc(c.name)}</b>${c.colonia ? `<span class="tiny">${ic('map-pin')} ${esc(c.colonia)}</span>` : ''}</span></div>
      <label class="campo-ic">${ic('pencil')}<input id="ficha-linea" class="in compacto" maxlength="${C.MENSAJE_MAX}" placeholder="${esc(C.FICHA_LINEA)}" value="${esc(D.linea)}"></label>
      ${D.amigas === null ? `<div class="empty"><span class="spin">${ic('loader-2')}</span></div>`
        : D.amigas.length ? `<div class="list" style="margin-top:10px">${D.amigas.map((a) => `<div class="li">${avatar(a)}<b class="grow">${esc(a.name)}</b>
          ${D.enviadas.has(a.user_id) ? `<span class="tiny estado-amistad">${ic('check')} ${esc(C.FICHA_ENVIADA)}</span>`
            : `<button class="btn sm" data-act="mandar_ficha" data-id="${a.user_id}" data-f="${fid}">${ic('send')} ${esc(C.AYUDA.enviar)}</button>`}</div>`).join('')}</div>`
        : `<p class="tiny" style="margin-top:10px">${esc(C.FICHA_SIN_AMIGAS)}</p>`}`,
    after: (r) => { const t = $('#ficha-linea', r); if (t) t.addEventListener('input', () => { D.linea = t.value; }); },
    tipo: 'enviar_ficha' };
  hoja.datos = D;
  pila.push(hoja); dibujarHoja();
  api.amigasParaFicha(fid).then((l) => { D.amigas = l || []; }).catch((e) => { D.amigas = []; fallo(e); })
    .finally(() => { if (hojaArriba() === hoja) dibujarHoja(); });
}

// Etiquetar: elige hasta 5 personas que sigues o te siguen
function hojaEtiquetar(findId, inicial, alGuardar) {
  const D = { gente: null, sel: new Set(inicial || []), antes: new Set(inicial || []) };
  const hoja = { render: () => `${cabeza(`${ic('tag')} ${esc(C.AYUDA.etiquetar)}`)}
      <p class="muted" style="margin:0 0 12px">${esc(C.ETIQUETAR_TEXTO)}</p>
      ${D.gente === null ? `<div class="empty"><span class="spin">${ic('loader-2')}</span></div>` : D.gente.length ? `<div class="list">${D.gente.map((g) =>
        `<button class="li etiqueta-op ${D.sel.has(g.persona) ? 'on' : ''}" data-act="etiqueta_toggle" data-id="${g.persona}" style="text-align:left">${avatar(g)}<b class="grow">${esc(g.name)}</b>${ic(D.sel.has(g.persona) ? 'circle-check' : 'circle')}</button>`).join('')}</div>`
        : `<div class="empty">${ic('user-plus')}<p>${esc(C.ETIQUETAR_VACIO)}</p></div>`}
      <p class="tiny" style="margin:10px 0">${D.sel.size} / ${C.ETIQUETAS_MAX}</p>
      <button class="btn block" data-act="guardar_etiquetas">${ic('check')} Guardar</button>`, tipo: 'etiquetar' };
  hoja.datos = D;
  D.guardar = alGuardar;
  pila.push(hoja); dibujarHoja();
  (async () => {
    try {
      const [gente, mias] = await Promise.all([api.puedoEtiquetar(), findId ? api.misEtiquetas(findId) : Promise.resolve(null)]);
      D.gente = gente;
      if (mias) { D.sel = new Set(mias); D.antes = new Set(mias); }
    } catch (e) { D.gente = []; fallo(e); }
    if (hojaArriba() === hoja) dibujarHoja();
  })();
}

let tAvisos;
function vigilarAvisos() {
  clearInterval(tAvisos);
  revisarAvisos();
  tAvisos = setInterval(revisarAvisos, C.AVISOS_CADA_MS);
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pausarCompartir();
    if (S.user && pushSoportado() && Notification.permission === 'granted') api.appActiva(false).catch(() => null); // fuera de la vista vuelven las notificaciones
    return;
  }
  revisarAvisos(); vigilarCompartir(); subirPendientes();
  if (navigator.clearAppBadge) navigator.clearAppBadge().catch(() => null);
  alTrabajador({ tipo: 'insignia' });
});
window.addEventListener('online', () => { pintarConexion(); subirPendientes(); revisarAvisos(); });
window.addEventListener('offline', () => pintarConexion());

/* Moderación: avisos de contenido y buzón */
const tamano = (b) => (b >= 1073741824 ? `${(b / 1073741824).toFixed(2)} GB` : b >= 1048576 ? `${Math.round(b / 1048576)} MB` : `${Math.round(b / 1024)} KB`);
const pctUso = (r) => Math.round(100 * r.usado / Math.max(1, r.limite));
const nivelUso = (p) => (p >= 80 ? 'rojo' : p >= 60 ? 'amarillo' : '');
function usoHTML(u) {
  if (!u) return `<div class="empty"><span class="spin">${ic('loader-2')}</span></div>`;
  const rs = u.recursos || [], peor = Math.max(0, ...rs.map(pctUso));
  return `${rs.map((r) => { const p = pctUso(r); return `<div class="medidor">
      <div class="row between"><b>${esc(RECURSOS[r.recurso] || r.recurso)}</b><span class="tiny">${tamano(r.usado)} de ${tamano(r.limite)} · <b>${p} %</b></span></div>
      <div class="barra ${nivelUso(p)}"><div style="width:${Math.min(100, p)}%"></div></div></div>`; }).join('')}
    ${nivelUso(peor) ? `<div class="banner uso ${nivelUso(peor)}">${ic('alert-triangle')}<span>${esc(peor >= 80 ? C.USO_ROJO : C.USO_AMARILLO)}</span></div>` : ''}
    <div class="stats" style="margin-top:14px">
      <div class="stat">${ic('photo')}<div class="v">${u.fotos_n}</div><div class="lbl">fotos</div></div>
      <div class="stat">${ic('users')}<div class="v">${u.personas}</div><div class="lbl">personas · +${u.personas_semana} esta semana</div></div>
      <div class="stat">${ic('activity')}<div class="v">${u.activas_semana}</div><div class="lbl">activas esta semana</div></div>
      <div class="stat">${ic('camera')}<div class="v">${u.hallazgos_semana}</div><div class="lbl">hallazgos esta semana</div></div>
      <div class="stat">${ic('repeat')}<div class="v">${u.reencuentros_semana}</div><div class="lbl">reencuentros esta semana</div></div>
      <div class="stat">${ic('cards')}<div class="v">${u.hallazgos}</div><div class="lbl">hallazgos en total</div></div></div>
    ${ritmoHTML(u)}
    <p class="tiny" style="margin-top:12px">${esc(C.USO_TRANSFERENCIA)}</p>
    ${panelUsoURL() ? `<a class="btn" style="margin-top:8px" href="${esc(panelUsoURL())}" target="_blank" rel="noopener">${ic('external-link')}${esc(C.USO_PANEL)}</a>` : ''}`;
}
/* Ritmo del almacén: con lo subido en los últimos 7 días, cuántas semanas faltan para llenarlo */
function semanasParaLlenar(u) {
  const r = (u && u.recursos || []).find((x) => x.recurso === 'fotos');
  const semana = Number(u && u.fotos_bytes_semana) || 0;
  if (!r || semana <= 0) return null;
  return Math.max(0, (r.limite - r.usado) / semana);
}
function ritmoHTML(u) {
  const n = semanasParaLlenar(u);
  if (n == null) return `<p class="tiny ritmo" style="margin-top:12px">${esc(C.USO_RITMO_SIN)}</p>`;
  const semanas = n < 1 ? C.USO_RITMO_MENOS : n > 520 ? C.USO_RITMO_MUCHO : C.USO_RITMO.replace('{n}', Math.round(n));
  const aviso = n <= C.USO_SEMANAS_R2 ? `<span class="tiny" style="display:block">${esc(C.USO_RITMO_R2)}</span>` : '';
  return `<div class="ritmo ${n <= C.USO_SEMANAS_R2 ? 'amarillo' : ''}" style="margin-top:12px">
    <div class="row between"><b>${esc(C.USO_RITMO_TITULO)}</b><span class="tiny">+${tamano(Number(u.fotos_bytes_semana))} ${esc(C.USO_RITMO_SEMANA)}</span></div>
    <p class="tiny" style="margin:4px 0 0">${esc(semanas)}</p>${aviso}</div>`;
}
// El panel de uso de Supabase (transferencia y todo lo demás), con el proyecto sacado de SUPABASE_URL
function panelUsoURL() {
  const m = /^https:\/\/([a-z0-9]+)\.supabase\.co/i.exec(C.SUPABASE_URL || '');
  return m ? `https://supabase.com/dashboard/project/${m[1]}/usage` : '';
}
// Privacidad: primero lo más importante (en negritas), después los detalles
function datosHTML(conExtra) {
  return `<div class="datos-clave">${C.DATOS_CLAVE.map((d) => `<p><b>${esc(d.titulo)}</b> ${esc(d.texto)}</p>`).join('')}</div>
    <h4>${esc(C.DATOS_ADEMAS)}</h4><ul class="datos-mas">${C.DATOS.concat(conExtra ? (C.DATOS_EXTRA || []) : []).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;
}
/* Anuncios a toda la comunidad: llegan al buzón (también a quien se una después) hasta que terminan o se retiran.
   La notificación dice solo "Tienes un aviso nuevo". */
const estadoAnuncio = (a) => (a.retirado ? 'retirado' : a.hasta && new Date(a.hasta) <= new Date() ? 'terminado' : 'activo');
function anunciosHTML(D) {
  const N = D.nuevo, primero = D.anuncios && !D.anuncios.length;
  if (N.texto == null) N.texto = primero ? C.ANUNCIO_PRIMERO : '';
  const dur = (sel, act, extra = '') => `<div class="chips" style="flex-wrap:wrap">${C.ANUNCIO_DURACIONES.map((d) =>
    `<button type="button" class="chip ${String(d.dias) === String(sel) ? 'on' : ''}" data-act="${act}" data-v="${d.dias == null ? '' : d.dias}" ${extra}>${esc(d.nombre)}</button>`).join('')}</div>`;
  const vista = { kind: 'anuncio', texto: N.texto || '…', actor_avatar: S.me.avatar, actor_color: S.me.avatar_color, actor_id: S.user.id };
  return `<div class="sec" style="margin-top:0"><h3>${ic('speakerphone')} ${esc(C.ANUNCIO_NUEVO)}</h3>
      <div class="field"><textarea id="anuncio-in" class="in" maxlength="${C.ANUNCIO_MAX}" rows="3" placeholder="${esc(C.ANUNCIO_PISTA)}">${esc(N.texto)}</textarea>
        <div class="tiny" style="text-align:right"><span id="anuncio-n">${(N.texto || '').length}</span>/${C.ANUNCIO_MAX}</div></div>
      <div class="field"><label>${ic('pointer')} ${esc(C.ANUNCIO_DESTINO)}</label><div class="toggle" style="display:flex">
        <button type="button" class="${N.destino ? '' : 'on'}" data-act="anuncio_destino" data-v="" style="flex:1;font-size:14px">${esc(C.ANUNCIO_SIN_DESTINO)}</button>
        <button type="button" class="${N.destino === 'encuentro_nuevo' ? 'on' : ''}" data-act="anuncio_destino" data-v="encuentro_nuevo" style="flex:1;font-size:14px">${ic('lifebuoy')} ${esc(C.ANUNCIO_DESTINO_ENCUENTRO)}</button></div></div>
      <div class="field"><label>${ic('clock')} ${esc(C.ANUNCIO_DURACION)}</label>${dur(N.dias, 'anuncio_dias')}</div>
      <div class="field"><label>${ic('eye')} ${esc(C.ANUNCIO_VISTA)}</label>
        <div class="li aviso nuevo anuncio-vista">${caraAviso(vista)}<span class="grow">${ic('speakerphone')} <span id="anuncio-vista-t">${esc(vista.texto)}</span></span></div></div>
      <button class="btn block" data-act="publicar_anuncio">${ic('send')} ${esc(C.ANUNCIO_PUBLICAR)}</button></div>
    <div class="sec"><h3>${ic('list')} ${esc(C.ANUNCIO_LISTA)}</h3>
      ${D.anuncios === null ? `<div class="empty"><span class="spin">${ic('loader-2')}</span></div>` : D.anuncios.length ? `<div class="list">${D.anuncios.map((a) => {
        const est = estadoAnuncio(a);
        return `<div class="li anuncio ${est}" style="flex-direction:column;align-items:stretch">
          <div class="row"><span class="grow">${esc(a.texto)}</span></div>
          <div class="tiny">${esc(fecha(a.created_at))} · ${esc(C.ANUNCIO_ESTADO[est])}${est === 'activo' ? ` · ${a.hasta ? esc(C.ANUNCIO_HASTA.replace('{f}', fecha(a.hasta))) : esc(C.ANUNCIO_SIN_FIN)}` : ''}</div>
          ${est === 'retirado' ? '' : `<div class="tiny">${esc(C.ANUNCIO_CAMBIAR)}</div>${dur('ninguna', 'anuncio_cambiar', `data-id="${a.id}"`)}
          <button class="btn alt sm" data-act="retirar_anuncio" data-id="${a.id}" style="align-self:flex-start">${ic('x')} ${esc(C.ANUNCIO_RETIRAR)}</button>`}</div>`; }).join('')}</div>`
        : `<p class="muted">${esc(C.ANUNCIO_NINGUNO)}</p>`}</div>`;
}
function hojaAdmin(vista) {
  const D = { vista: vista || 'avisos', avisos: null, cols: [], bloqueados: [], peticiones: null, uso: null, anuncios: null,
    nuevo: { texto: null, destino: 'encuentro_nuevo', dias: null } };
  const pendientes = () => (D.peticiones || []).filter((r) => r.status === 'recibido').length;
  const hoja = { render: () => `${cabeza(ic('shield'))}
    <div class="toggle" style="margin-bottom:14px">
      <button type="button" data-act="admin_vista" data-v="avisos" class="${D.vista === 'avisos' ? 'on' : ''}" aria-label="Avisos">${ic('flag')}<span style="font-size:15px">${D.avisos ? D.avisos.length + D.cols.length : ''}</span></button>
      <button type="button" data-act="admin_vista" data-v="buzon" class="${D.vista === 'buzon' ? 'on' : ''}" aria-label="${esc(C.AYUDA.buzon)}">${ic('mail')}<span style="font-size:15px">${pendientes() || ''}</span></button>
      <button type="button" data-act="admin_vista" data-v="uso" class="${D.vista === 'uso' ? 'on' : ''}" aria-label="${esc(C.AYUDA.uso)}" data-tip="${esc(C.AYUDA.uso)}">${ic('gauge')}</button>
      <button type="button" data-act="admin_vista" data-v="anuncios" class="${D.vista === 'anuncios' ? 'on' : ''}" aria-label="${esc(C.AYUDA.anuncios)}" data-tip="${esc(C.AYUDA.anuncios)}">${ic('speakerphone')}</button></div>
    ${D.vista === 'anuncios' ? anunciosHTML(D) : D.vista === 'uso' ? usoHTML(D.uso) : D.vista === 'buzon' ? (D.peticiones === null ? `<div class="empty"><span class="spin">${ic('loader-2')}</span></div>`
      : D.peticiones.length ? `<div class="list">${D.peticiones.map((r) => peticionHTML(r, true, D.editandoResp === r.id)).join('')}</div>` : `<div class="empty">${ic('mail')}<p>Sin mensajes</p></div>`) : `
    <div class="sec" style="margin-top:0"><h3>${ic('flag')} ${D.avisos ? D.avisos.length : ''}</h3>
    ${!D.avisos ? `<div class="empty"><span class="spin">${ic('loader-2')}</span></div>` : D.avisos.length ? `<div class="list">${D.avisos.map((a) => a.card ? `
      <div class="li">${a.card.thumb ? `<img class="thumb" src="${foto(a.card, true)}" alt="">` : `<span class="thumb">${ic(a.card.cat_icon)}</span>`}
        <div class="grow"><b>${esc(a.card.name)}</b><div class="tiny">${esc(a.card.user_name)} · ${ic('flag')} ${a.n}</div></div>
        ${ib('ficha', 'eye', 'ver', `data-id="${a.card.id}"`, 'sm')}${ib('descartar', 'check', 'descartar', `data-id="${a.card.id}"`, 'sm')}${ib('borrar_hallazgo', 'trash', 'borrar', `data-id="${a.card.id}"`, 'sm')}${ib('bloquear', 'ban', 'bloquear', `data-id="${a.card.user_id}"`, 'sm')}
      </div>` : `<div class="li"><div class="grow tiny">—</div>${ib('descartar', 'check', 'descartar', `data-id="${a.find_id}"`, 'sm')}</div>`).join('')}</div>` : D.cols.length ? '' : `<div class="empty">${ic('check')}<p>Sin avisos</p></div>`}</div>
    ${D.cols.length ? `<div class="sec"><h3>${ic('users')} ${esc(C.COL_MODERACION)} · ${D.cols.length}</h3><div class="list">${D.cols.map((r) => `
      <div class="li reporte-col" style="flex-direction:column;align-items:stretch">
        <div class="row">${r.thumb || r.photo ? `<img class="thumb" src="${api.photoUrl(r.thumb || r.photo)}" alt="">` : ''}
          <div class="grow" style="min-width:0"><b>${esc(r.find_name)}</b><div class="tiny">${esc(C.COL_DE.replace('{n}', r.autora_nombre || ''))} · ${ic('flag')} ${esc(r.quien_reporta_nombre || '')}</div>
          <div class="tiny">«${esc(r.motivo)}»</div></div></div>
        <div class="row">${ib('ficha', 'eye', 'ver', `data-id="${r.find_id}" data-s="${r.sighting_id}"`, 'sm')}${ib('col_descartar', 'check', 'descartar', `data-id="${r.id}"`, 'sm')}${ib('col_quitar', 'trash', C.COL_QUITAR, `data-id="${r.sighting_id}"`, 'sm')}</div>
      </div>`).join('')}</div></div>` : ''}
    <div class="sec"><h3>${ic('ban')} ${D.bloqueados.length}</h3><div class="list">${D.bloqueados.map((p) => `
      <div class="li">${avatar(p)}<b class="grow">${esc(p.name)}</b>${ib('desbloquear', 'lock-open', 'desbloquear', `data-id="${p.id}"`, 'sm')}</div>`).join('')}</div></div>`}`,
    after: (r) => { r._admin = D; }, tipo: 'admin' };
  hoja.datos = D;
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
    try { D.cols = await api.reportesColaboracion(); } catch (e) { D.cols = []; }
    try { D.peticiones = await api.allRequests(); } catch (e) { D.peticiones = []; fallo(e); }
    try { D.uso = await api.usoPlan(); } catch (e) { D.uso = { recursos: [] }; fallo(e); }
    try { D.anuncios = await api.anuncios(); } catch (e) { D.anuncios = []; }
    if (pila.includes(hoja)) dibujarHoja();
  };
  D.cargar();
  return D;
}
const adminAbierto = () => pila.find((h) => h.tipo === 'admin');

/* ---------------------------------------------------------------------
   Fichas en PDF (plantilla C: portada y cuatro hallazgos por página).
   El archivo se arma en el teléfono, sin librerías ni servidores: fotos en JPEG y
   letras estándar del PDF (Helvetica y Times), con acentos en codificación WinAnsi.
   --------------------------------------------------------------------- */
const PDF_W = 612, PDF_H = 792, PDF_M = 24;
const WIN_ANSI = { 0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89,
  0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96,
  0x2014: 0x97, 0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F, 0x2212: 0x2D };
// Texto para un string del PDF: un byte por letra (lo que no existe en WinAnsi se vuelve "?")
function pdfTexto(t) {
  let out = '';
  for (const ch of String(t == null ? '' : t)) {
    const cp = ch.codePointAt(0);
    let b = cp < 0x80 || (cp >= 0xA0 && cp <= 0xFF) ? cp : WIN_ANSI[cp];
    if (b == null) b = 0x3F;
    const c = String.fromCharCode(b);
    out += c === '(' || c === ')' || c === '\\' ? '\\' + c : c;
  }
  return out;
}
const pdfNum = (n) => (Math.round(n * 100) / 100).toString();
// Medida aproximada del texto (Arial tiene las mismas medidas que Helvetica)
let lienzoMedida = null;
function anchoTexto(t, tam, fuente) {
  if (!lienzoMedida) lienzoMedida = document.createElement('canvas').getContext('2d');
  lienzoMedida.font = fuente === 'serif' ? `bold ${tam}px "Times New Roman", Times, serif` : `${fuente === 'bold' ? 'bold ' : fuente === 'italic' ? 'italic ' : ''}${tam}px Helvetica, Arial, sans-serif`;
  return lienzoMedida.measureText(String(t)).width;
}
function recortarTexto(t, ancho, tam, fuente) {
  t = String(t || '');
  if (anchoTexto(t, tam, fuente) <= ancho) return t;
  while (t.length > 1 && anchoTexto(t + '…', tam, fuente) > ancho) t = t.slice(0, -1);
  return t.trimEnd() + '…';
}
// Reparte un texto en renglones; el último lleva "…" si no cabe
function renglones(t, ancho, tam, fuente, max) {
  const palabras = String(t || '').split(/\s+/).filter(Boolean), out = [];
  let linea = '';
  for (let i = 0; i < palabras.length; i++) {
    const prueba = linea ? linea + ' ' + palabras[i] : palabras[i];
    if (anchoTexto(prueba, tam, fuente) <= ancho) { linea = prueba; continue; }
    if (linea) out.push(linea);
    linea = palabras[i];
    if (out.length === max) break;
  }
  if (linea && out.length < max) out.push(linea);
  if (out.length === max && palabras.join(' ') !== out.join(' ')) out[max - 1] = recortarTexto(out[max - 1] + '…', ancho, tam, fuente);
  return out.map((l) => recortarTexto(l, ancho, tam, fuente));
}

function nuevoPDF() {
  const objs = [];   // cada objeto: lista de partes (texto o bytes)
  const nuevoObj = (partes) => { objs.push(partes); return objs.length; };
  const catalogo = nuevoObj(null), paginas = nuevoObj(null), xobjs = nuevoObj(null);
  const fuentes = { F1: 'Helvetica', F2: 'Helvetica-Bold', F3: 'Times-Bold', F4: 'Helvetica-Oblique' };
  const idFuente = {};
  Object.keys(fuentes).forEach((k) => { idFuente[k] = nuevoObj([`<< /Type /Font /Subtype /Type1 /BaseFont /${fuentes[k]} /Encoding /WinAnsiEncoding >>`]); });
  const imagenes = [], hojas = [];
  return {
    imagen(bytes, w, h) {
      const id = nuevoObj([`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`, bytes, '\nendstream']);
      imagenes.push(id); return 'Im' + id;
    },
    pagina(contenido, enlaces) {
      const cont = nuevoObj([`<< /Length ${contenido.length} >>\nstream\n`, contenido, '\nendstream']);
      const annots = (enlaces || []).map((e) => nuevoObj([`<< /Type /Annot /Subtype /Link /Rect [${e.r.map(pdfNum).join(' ')}] /Border [0 0 0] /A << /S /URI /URI (${pdfTexto(e.url)}) >> >>`]));
      hojas.push(nuevoObj([`<< /Type /Page /Parent ${paginas} 0 R /MediaBox [0 0 ${PDF_W} ${PDF_H}] /Contents ${cont} 0 R /Resources << /Font << ${Object.keys(idFuente).map((k) => `/${k} ${idFuente[k]} 0 R`).join(' ')} >> /XObject ${xobjs} 0 R >>${annots.length ? ` /Annots [${annots.map((a) => a + ' 0 R').join(' ')}]` : ''} >>`]));
    },
    terminar(titulo) {
      objs[catalogo - 1] = [`<< /Type /Catalog /Pages ${paginas} 0 R >>`];
      objs[paginas - 1] = [`<< /Type /Pages /Kids [${hojas.map((h) => h + ' 0 R').join(' ')}] /Count ${hojas.length} >>`];
      objs[xobjs - 1] = [`<< ${imagenes.map((i) => `/Im${i} ${i} 0 R`).join(' ')} >>`];
      const info = nuevoObj([`<< /Title (${pdfTexto(titulo)}) /Producer (Collector Go) /CreationDate (D:${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}) >>`]);
      const bytesDe = (p) => (typeof p === 'string' ? Uint8Array.from(p, (c) => c.charCodeAt(0) & 0xFF) : p);
      const trozos = [bytesDe('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')];
      let pos = trozos[0].length;
      const offs = [];
      objs.forEach((partes, i) => {
        offs.push(pos);
        [`${i + 1} 0 obj\n`].concat(partes, ['\nendobj\n']).forEach((p) => { const b = bytesDe(p); trozos.push(b); pos += b.length; });
      });
      const xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('')}`
        + `trailer\n<< /Size ${objs.length + 1} /Root ${catalogo} 0 R /Info ${info} 0 R >>\nstartxref\n${pos}\n%%EOF\n`;
      trozos.push(bytesDe(xref));
      return new Blob(trozos, { type: 'application/pdf' });
    }
  };
}
// Lápiz para el contenido de una página: coordenadas desde arriba a la izquierda, como en pantalla
function lapizPDF() {
  const ops = [], enlaces = [];
  const Y = (y) => PDF_H - y;
  const color = (hex) => { const n = parseInt(String(hex || '#2E2A26').slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255].map(pdfNum).join(' '); };
  return {
    ops, enlaces,
    texto(x, y, t, tam, fuente, hex) {
      const f = { serif: 'F3', bold: 'F2', italic: 'F4' }[fuente] || 'F1';
      ops.push(`BT /${f} ${tam} Tf ${color(hex)} rg ${pdfNum(x)} ${pdfNum(Y(y))} Td (${pdfTexto(t)}) Tj ET`);
    },
    imagen(nombre, x, y, w, h) { ops.push(`q ${pdfNum(w)} 0 0 ${pdfNum(h)} ${pdfNum(x)} ${pdfNum(Y(y + h))} cm /${nombre} Do Q`); },
    marco(x, y, w, h, hex, grueso) { ops.push(`${color(hex)} RG ${grueso || 0.8} w ${pdfNum(x)} ${pdfNum(Y(y + h))} ${pdfNum(w)} ${pdfNum(h)} re S`); },
    caja(x, y, w, h, hex) { ops.push(`${color(hex)} rg ${pdfNum(x)} ${pdfNum(Y(y + h))} ${pdfNum(w)} ${pdfNum(h)} re f`); },
    linea(x1, y1, x2, y2, hex, grueso) { ops.push(`${color(hex)} RG ${grueso || 0.8} w ${pdfNum(x1)} ${pdfNum(Y(y1))} m ${pdfNum(x2)} ${pdfNum(Y(y2))} l S`); },
    // Candado pequeño (lo secreto)
    candado(x, y, hex) {
      ops.push(`${color(hex)} rg ${pdfNum(x)} ${pdfNum(Y(y + 7))} 7 4.6 re f`);
      ops.push(`${color(hex)} RG 1 w ${pdfNum(x + 1.6)} ${pdfNum(Y(y + 2.6))} m ${pdfNum(x + 1.6)} ${pdfNum(Y(y - 0.4))} ${pdfNum(x + 5.4)} ${pdfNum(Y(y - 0.4))} ${pdfNum(x + 5.4)} ${pdfNum(Y(y + 2.6))} c S`);
    },
    enlace(x, y, w, h, url) { enlaces.push({ r: [x, Y(y + h), x + w, Y(y)], url }); },
    contenido() { return ops.join('\n'); }
  };
}
// Foto a JPEG para el PDF: cuadrada, con el fondo beige de la app detrás de lo transparente
async function jpegPDF(url, lado) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const cv = document.createElement('canvas'); cv.width = cv.height = lado;
  const x = cv.getContext('2d'); x.fillStyle = C.FONDO_FOTO; x.fillRect(0, 0, lado, lado);
  const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, k = Math.min(lado / w, lado / h);
  x.imageSmoothingQuality = 'high';
  x.drawImage(img, (lado - w * k) / 2, (lado - h * k) / 2, w * k, h * k);
  const b = await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.8));
  soltarLienzo(cv);
  return { bytes: new Uint8Array(await b.arrayBuffer()), lado };
}
const fechaHora = (iso) => { try { return new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: C.ZONA_HORARIA }); } catch (e) { return fecha(iso); } };
const coordTexto = (f) => `${Number(f.lat).toFixed(5)}, ${Number(f.lng).toFixed(5)}`;
const urlMapa = (f) => `https://www.openstreetmap.org/?mlat=${Number(f.lat).toFixed(6)}&mlon=${Number(f.lng).toFixed(6)}#map=18/${Number(f.lat).toFixed(6)}/${Number(f.lng).toFixed(6)}`;
// Orden: la fecha (de lo más antiguo a lo más reciente) es la base de todos
function ordenarFichas(items, orden) {
  const porFecha = (a, b) => String(a.fecha).localeCompare(String(b.fecha));
  const texto = (v) => (v == null || v === '' ? '￿' : String(v));
  const l = items.slice();
  if (orden === 'recientes') return l.sort((a, b) => porFecha(b, a));
  if (orden === 'colonia') return l.sort((a, b) => texto(a.colonia).localeCompare(texto(b.colonia), 'es') || porFecha(a, b));
  if (orden === 'persona') return l.sort((a, b) => texto(a.persona).localeCompare(texto(b.persona), 'es') || porFecha(a, b));
  return l.sort(porFecha);
}
async function crearPDF(P, alAvanzar) {
  const pdf = nuevoPDF(), items = ordenarFichas(P.items, P.orden);
  const total = items.length;
  const tinta = '#2E2A26', gris = '#6B635A', terracota = C.COLORES.terracota;
  // 1) Fotos (una por ficha y miniaturas de sus avistamientos)
  for (let i = 0; i < total; i++) {
    const it = items[i];
    alAvanzar(i, total);
    if (it.foto) { try { const j = await jpegPDF(it.foto, 512); it.img = pdf.imagen(j.bytes, j.lado, j.lado); } catch (e) { it.img = null; } }
    it.mini = [];
    for (const u of (it.tira || []).slice(0, 8)) { try { const j = await jpegPDF(u, 64); it.mini.push(pdf.imagen(j.bytes, j.lado, j.lado)); } catch (e) { /* sin miniatura */ } }
  }
  alAvanzar(total, total);
  const paginasFichas = Math.max(1, Math.ceil(total / 4)), totalPaginas = paginasFichas + 1;
  const fechas = items.map((x) => x.fecha).filter(Boolean).sort();
  // 2) Portada
  {
    const L = lapizPDF(), x = 54;
    L.caja(0, 0, PDF_W, 6, terracota);
    L.texto(x, 120, P.etiqueta.toUpperCase(), 10, 'bold', terracota);
    L.texto(x, 160, recortarTexto(P.titulo, PDF_W - 2 * x, 34, 'serif'), 34, 'serif', tinta);
    const sub = [P.subtitulo, `${total} ${total === 1 ? 'hallazgo' : 'hallazgos'}`,
      fechas.length ? `${fecha(fechas[0])} – ${fecha(fechas[fechas.length - 1])}` : ''].filter(Boolean).join(' · ');
    L.texto(x, 186, recortarTexto(sub, PDF_W - 2 * x, 12, ''), 12, '', gris);
    const lado = 120, gap = 6, cols = 4;
    items.filter((it) => it.img).slice(0, 12).forEach((it, i) => {
      const cx = x + (i % cols) * (lado + gap), cy = 220 + Math.floor(i / cols) * (lado + gap);
      L.imagen(it.img, cx, cy, lado, lado); L.marco(cx, cy, lado, lado, tinta, 0.6);
    });
    L.texto(x, PDF_H - 54, C.PDF_PIE.replace('{f}', fecha(new Date().toISOString())), 9, '', gris);
    L.texto(PDF_W - x - anchoTexto('Collector Go', 12, 'serif'), PDF_H - 54, 'Collector Go', 12, 'serif', terracota);
    pdf.pagina(L.contenido(), L.enlaces);
  }
  // 3) Fichas: cuatro por página
  const cw = (PDF_W - 2 * PDF_M - 16) / 2, top = 60, ch = (PDF_H - top - PDF_M - 16) / 2, foto = 256;
  for (let p = 0; p < paginasFichas; p++) {
    const L = lapizPDF(), grupo = items.slice(p * 4, p * 4 + 4);
    let izq = `${P.titulo}${P.subtitulo ? ' · ' + P.subtitulo : ''}`;
    if (P.orden === 'colonia' || P.orden === 'persona') {
      const vals = [...new Set(grupo.map((x) => (P.orden === 'colonia' ? x.colonia || C.PDF_SIN_COLONIA : x.persona || '—')))];
      izq += ' · ' + vals.join(' · ');
    }
    const der = `Página ${p + 2} de ${totalPaginas}`;
    L.texto(PDF_M, 40, recortarTexto(izq, PDF_W - 2 * PDF_M - anchoTexto(der, 8.5, '') - 16, 8.5, ''), 8.5, '', gris);
    L.texto(PDF_W - PDF_M - anchoTexto(der, 8.5, ''), 40, der, 8.5, '', gris);
    L.linea(PDF_M, 47, PDF_W - PDF_M, 47, tinta, 0.8);
    grupo.forEach((it, i) => {
      const x = PDF_M + (i % 2) * (cw + 16), y = top + Math.floor(i / 2) * (ch + 16);
      if (it.img) L.imagen(it.img, x, y, foto, foto); else L.caja(x, y, foto, foto, C.FONDO_FOTO);
      L.marco(x, y, foto, foto, tinta, 0.8);
      let yy = y + foto + 16;
      const nombre = recortarTexto(it.nombre, cw - (it.privado ? 12 : 0), 12, 'serif');
      L.texto(x, yy, nombre, 12, 'serif', tinta);
      if (it.privado) L.candado(x + anchoTexto(nombre, 12, 'serif') + 4, yy - 8, tinta);
      yy += 12;
      L.texto(x, yy, recortarTexto([fechaHora(it.fecha), it.colonia, it.persona && P.conPersona ? it.persona : ''].filter(Boolean).join(' · '), cw, 8.5, ''), 8.5, '', gris);
      yy += 11;
      if (it.lat != null && it.lng != null) {
        const t = coordTexto(it);
        L.texto(x, yy, t, 8.5, '', terracota);
        L.linea(x, yy + 1.5, x + anchoTexto(t, 8.5, ''), yy + 1.5, terracota, 0.4);
        L.enlace(x, yy - 9, anchoTexto(t, 8.5, ''), 12, urlMapa(it));
      }
      yy += 3;
      renglones(it.nota, cw, 8, 'italic', 2).forEach((l) => { yy += 10; L.texto(x, yy, l, 8, 'italic', tinta); });
      if (it.mini.length || it.vistas) {
        yy += 6;
        it.mini.forEach((m, k) => { L.imagen(m, x + k * 22, yy, 20, 20); L.marco(x + k * 22, yy, 20, 20, tinta, 0.4); });
        const tx = x + it.mini.length * 22 + (it.mini.length ? 4 : 0);
        if (it.vistas) L.texto(tx, yy + 13, recortarTexto(`Visto ${it.vistas + 1} veces${it.colaboran ? ' · ' + it.colaboran : ''}`, cw - (tx - x), 8, ''), 8, '', gris);
      }
    });
    pdf.pagina(L.contenido(), L.enlaces);
  }
  return pdf.terminar(P.titulo);
}

// Qué se descarga: una colección tuya (o todas), un grupo o un grupo de encuentro
async function datosPDF(fuente) {
  if (fuente.tipo === 'coleccion') {
    const mias = S.colMias || guarda(await api.userCards(S.user.id));
    const cat = S.cats.find((c) => c.id === fuente.cat);
    const lista = cat ? mias.filter((c) => c.category_id === cat.id) : mias;
    return { etiqueta: 'Colección', titulo: cat ? cat.name : C.COL_TODAS, subtitulo: S.me.name, conPersona: false, cards: lista };
  }
  const g = miGrupo(fuente.gid);
  if (fuente.tipo === 'grupo') {
    const lista = guarda(await api.groupCards(fuente.gid));
    return { etiqueta: 'Grupo', titulo: g ? g.name : 'Grupo', subtitulo: '', conPersona: true, cards: lista };
  }
  const e = await api.estadoEncuentro(fuente.gid);
  const nombre = (uid) => { const m = (e.miembros || []).find((x) => x.user_id === uid); return m ? m.name : ''; };
  const items = (e.puntos || []).map((x) => ({ nombre: x.name, nota: x.note, fecha: x.created_at, lat: x.lat, lng: x.lng, persona: nombre(x.user_id),
      foto: x.photo || x.thumb ? api.photoUrl(x.photo || x.thumb) : null, colonia: null }))
    .concat((e.miras || []).map((k) => ({ nombre: C.ENCUENTRO_MIRA, nota: k.note, fecha: k.created_at, lat: k.lat, lng: k.lng, persona: nombre(k.user_id),
      foto: k.photo || k.thumb ? api.photoUrl(k.photo || k.thumb) : null, colonia: null })));
  return { etiqueta: 'Grupo de encuentro', titulo: e.grupo.name, subtitulo: '', conPersona: true, items };
}
async function fichasDeCards(cards) {
  const ids = cards.map((c) => c.id), hist = [];
  for (let i = 0; i < ids.length; i += 100) hist.push(...(await api.sightingsDe(ids.slice(i, i + 100)).catch(() => [])));
  return cards.map((c) => {
    const suyas = hist.filter((h) => h.find_id === c.id && h.tipo !== 'no_esta');
    const otras = [...new Set(suyas.filter((h) => h.user_id && h.user_id !== c.user_id).map((h) => h.user_name).filter(Boolean))];
    return { nombre: c.name, nota: c.note, fecha: c.created_at, lat: c.lat, lng: c.lng, colonia: c.colonia, persona: c.user_name, privado: c.is_private,
      foto: c.photo || c.thumb ? foto(c, false) : null, vistas: c.sightings_count || 0, colaboran: otras.join(', '),
      tira: suyas.filter((h) => h.thumb || h.photo).slice(-8).map((h) => api.photoUrl(h.thumb || h.photo)) };
  });
}
const P_PDF = {};
function hojaPDF(fuente) {
  let orden = 'antiguos'; try { orden = localStorage.getItem('cg_pdf_orden') || 'antiguos'; } catch (e) { /* sin almacenamiento */ }
  if (orden === 'persona' && fuente.tipo === 'coleccion') orden = 'antiguos';
  Object.assign(P_PDF, { fuente, orden, estado: 'cargando', datos: null, items: null, i: 0, n: 0, file: null });
  abrirHoja(pdfHTML, null, 'pdf');
  (async () => {
    try {
      const d = await datosPDF(fuente);
      P_PDF.datos = d;
      P_PDF.items = d.items || await fichasDeCards(d.cards);
      P_PDF.estado = 'listo';
    } catch (e) { P_PDF.estado = 'error'; fallo(e); }
    const top = hojaArriba(); if (top && top.tipo === 'pdf') dibujarHoja();
  })();
}
function pdfHTML() {
  const P = P_PDF, d = P.datos, n = P.items ? P.items.length : 0;
  if (P.estado === 'cargando') return cabeza(`${ic('download')} ${esc(C.PDF_TITULO)}`) + `<div class="empty"><span class="spin">${ic('loader-2')}</span></div>`;
  if (!d) return cabeza(`${ic('download')} ${esc(C.PDF_TITULO)}`) + `<div class="empty">${ic('alert-triangle')}<p>${esc(C.PDF_VACIO)}</p></div>`;
  const ordenes = C.PDF_ORDENES.filter((o) => o.id !== 'persona' || P.fuente.tipo !== 'coleccion');
  const mb = Math.max(0.1, Math.round((0.15 + n * 0.06) * 10) / 10);
  return `${cabeza(`${ic('download')} ${esc(C.PDF_TITULO)}`)}
    <div class="resumen-pdf list" style="margin-bottom:10px">
      <div class="row between"><span class="muted">${esc(d.etiqueta)}</span><b>${esc(d.titulo)}</b></div>
      <div class="row between"><span class="muted">Hallazgos</span><b>${n}</b></div>
      <div class="row between"><span class="muted">Páginas</span><b>${n ? 1 + Math.ceil(n / 4) : 0}</b></div>
      <div class="row between"><span class="muted">Peso</span><b>${esc(C.PDF_PESO.replace('{m}', String(mb).replace('.', ',')))}</b></div></div>
    <p class="tiny">${esc(C.PDF_TEXTO)}</p>
    ${n ? `<div class="field"><label>${ic('arrows-sort')} ${esc(C.PDF_ORDEN)}</label><div class="chips pdf-orden">${ordenes.map((o) =>
      `<button type="button" class="chip ${P.orden === o.id ? 'on' : ''}" data-act="pdf_orden" data-v="${o.id}" ${P.estado === 'creando' ? 'disabled' : ''}>${esc(o.nombre)}</button>`).join('')}</div></div>
    ${P.estado === 'creando' ? `<div class="pdf-barra"><i style="width:${P.n ? Math.round(P.i / P.n * 100) : 0}%"></i></div><p class="tiny" id="pdf-avance">${esc(C.PDF_PREPARANDO.replace('{i}', P.i).replace('{n}', P.n))}</p>`
      : P.estado === 'hecho' ? `<button class="btn block" data-act="pdf_compartir">${ic('share')} ${esc(C.PDF_GUARDAR)}</button>
        <button class="btn alt block" data-act="pdf_crear" style="margin-top:8px">${ic('refresh')} ${esc(C.PDF_CREAR)}</button>`
      : `<button class="btn block" data-act="pdf_crear">${ic('download')} ${esc(C.PDF_CREAR)}</button>`}`
    : `<div class="empty">${ic('photo')}<p>${esc(C.PDF_VACIO)}</p></div>`}`;
}
async function generarPDF(btn) {
  const P = P_PDF; if (!P.items || !P.items.length || P.estado === 'creando') return;
  P.estado = 'creando'; P.i = 0; P.n = P.items.length; P.file = null; dibujarHoja();
  try {
    const blob = await crearPDF(Object.assign({}, P.datos, { items: P.items.map((x) => Object.assign({}, x)), orden: P.orden }), (i, n) => {
      P.i = i; P.n = n;
      const b = $('.pdf-barra i'), t = $('#pdf-avance');
      if (b) b.style.width = `${n ? Math.round(i / n * 100) : 0}%`;
      if (t) t.textContent = C.PDF_PREPARANDO.replace('{i}', i).replace('{n}', n);
    });
    const nombre = `collector-go-${sinAcentos(P.datos.titulo).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'fichas'}.pdf`;
    P.file = new File([blob], nombre, { type: 'application/pdf' });
    P.estado = 'hecho'; aviso(C.PDF_LISTO, 'file-check');
  } catch (e) { P.estado = 'listo'; fallo(e); }
  const top = hojaArriba(); if (top && top.tipo === 'pdf') dibujarHoja();
}
async function compartirPDF() {
  const f = P_PDF.file; if (!f) return;
  try {
    if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: P_PDF.datos.titulo }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const u = URL.createObjectURL(f), a = document.createElement('a');
  a.href = u; a.download = f.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 60000);
}

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
    if (g.dataset.pick === 'dest') {
      const antes = destEncuentro(R.dest), ahora = destEncuentro(b.dataset.v);
      if (antes !== ahora) { recordarFormulario(); R.dest = b.dataset.v; return dibujarHoja(); }
      const p = $('#campo-priv'); if (p) p.hidden = b.dataset.v.startsWith('g:'); R.dest = b.dataset.v; buscarCandidatos();
    }
    if (g.dataset.pick === 'priv') { R.priv = b.dataset.v === '1'; const e = $('#campo-etiquetas'); if (e) e.hidden = R.priv; }
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
    pintarFiltrosMapa(); cargarPines();
  },
  grupo_mapa: (b) => abrirEncuentro(b.dataset.id),
  salir_grupo_mapa: () => salirGrupo(),
  grupo_panel() { const D = encuentroActual(); if (!D) return; D.abierto = !D.abierto; pintarPanelGrupo(D); },
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
  ficha: (b) => abrirFicha(b.dataset.id, b.dataset.s ? { foto: b.dataset.s } : null),
  perfil: (b) => abrirPerfil(b.dataset.id),
  galeria(b) { const top = hojaArriba(); if (!top || top.tipo !== 'ficha' || !fichaH) return; fichaH.i = +b.dataset.i; dibujarHoja(); },
  async reaccion(b) {
    const c = S.cache.get(b.dataset.id), tipo = b.dataset.v; if (!c) return;
    const mia = (c.my_reactions || []).includes(tipo);
    if (tipo === 'eye' && !mia) return marcarVisto(b, c);
    // "Lo vi" ya marcado: si todavía puedes sumar foto esta semana, se pregunta qué hacer en vez de quitarlo
    if (tipo === 'eye' && mia && !c.is_private && navigator.onLine) {
      if (b.disabled) return;
      let puede = false;
      ocupado(b, true);
      try { puede = await api.puedoColaborar(c.id); } catch (e) { ocupado(b, false); fallo(e); return hojaVistoMarcado(c, false); }
      ocupado(b, false);
      if (puede) return hojaVistoMarcado(c, true);
    }
    return alternarReaccion(c, tipo, mia);
  },
  // Antes de tomar la foto se revisa que estés en el lugar (igual que al marcar "Lo vi")
  async visto_sumar_foto(b) {
    const c = S.cache.get(b.dataset.id); if (!c) return;
    ocupado(b, true);
    let p;
    try { p = await getPos(); } catch (e) { ocupado(b, false); return aviso(C.VISTO_SIN_GPS, 'current-location'); }
    ocupado(b, false);
    if (p.acc == null || p.acc > 100) return aviso(C.VISTO_APROXIMADA, 'current-location');
    const d = distancia(p, c), radio = Math.min(Math.max(50, c.accuracy || 0), 300);
    if (d > radio) return aviso(C.VISTO_LEJOS.replace('{d}', metros(d)), 'navigation');
    cerrarHoja(); abrirCol(c, 'visto');
  },
  visto_quitar(b) { const c = S.cache.get(b.dataset.id); cerrarHoja(); if (c && (c.my_reactions || []).includes('eye')) alternarReaccion(c, 'eye', true); },
  ir_al_punto(b) { const c = S.cache.get(b.dataset.id); if (!c) return; cerrarTodo(); irAlPunto(c); },
  cerrar_guia: () => terminarGuia(),
  // Solo se comparte lo propio: tus hallazgos y tu vitrina
  whatsapp: (b) => { const c = S.cache.get(b.dataset.id); if (c && c.user_id === S.user.id) compartirHallazgo(c, b); },
  whatsapp_perfil(b) {
    if (b.dataset.id !== S.user.id) return;
    const M = MOSAICOS.get(b.dataset.id);
    if (M && M.estado === 'listo' && puedeCompartirArchivo(M.file)) return compartirMosaico(M);
    hojaMosaico(b.dataset.id);
  },
  enviar_mosaico(b) { const M = MOSAICOS.get(b.dataset.id); if (M && M.estado === 'listo') compartirMosaico(M); },
  galeria_cat(b) {
    const uid = b.dataset.id, cat = b.dataset.cat; if (!uid || !cat) return;
    if (uid === S.user.id) { cerrarTodo(); S.coleccionCat = cat; return irA('coleccion'); }
    abrirGaleriaCat(uid, cat);
  },
  ver_vitrina: (b) => abrirVitrina(b.dataset.id),
  aviso_rapido: (b) => hojaAvisoRapido(b.dataset.id || null),
  ya_no_esta(b) { const c = S.cache.get(b.dataset.id); if (c) marcarAusencia(b, c); },
  pista_encuadre: () => aviso(C.ENCUADRE_PISTA, 'arrows-move'),
  col_guardar: (b) => guardarCol(b),
  persona_sin_col: (b) => hojaSinColeccion(b.dataset.id),
  descargar_fichas(b) { const t = b.dataset.tipo; hojaPDF(t === 'coleccion' ? { tipo: t, cat: b.dataset.id || null } : { tipo: t, gid: b.dataset.id }); },
  pdf_orden(b) { if (P_PDF.estado === 'creando') return; P_PDF.orden = b.dataset.v; P_PDF.file = null; if (P_PDF.estado === 'hecho') P_PDF.estado = 'listo';
    try { localStorage.setItem('cg_pdf_orden', P_PDF.orden); } catch (e) { /* sin almacenamiento */ } dibujarHoja(); },
  pdf_crear: (b) => generarPDF(b),
  async salir_bloqueada() { try { await api.logout(); } catch (e) { /* nada */ } location.hash = ''; location.reload(); },
  pdf_compartir: () => compartirPDF(),
  encuadrar_col() { if (!K.enc) return; recordarCol(); hojaEncuadre(K.enc, async () => { await cuadroCol(); }); },
  quitar_foto_col() { recordarCol(); limpiarCol(); dibujarHoja(); },
  col_borrar: (b) => borrarColaboracion(b, b.dataset.id, b.dataset.f),
  async col_descartar(b) {
    const D = adminDatos(); if (!D) return;
    try { await api.descartarReporteColaboracion(b.dataset.id); await D.cargar(); } catch (e) { fallo(e); }
  },
  async col_quitar(b) {
    const D = adminDatos(); if (!D) return;
    if (!(await confirmar(C.COL_QUITAR_CONFIRMAR, 'trash'))) return;
    ocupado(b, true);
    // La foto queda en la lista de su autora: su app la quita del almacén al abrirse
    try { await api.delSighting(b.dataset.id); S.feed = []; await D.cargar(); aviso(C.COL_BORRADA.replace('Tu foto', 'La foto'), 'trash'); }
    catch (e) { ocupado(b, false); fallo(e); }
  },
  col_reportar: (b) => hojaReportarColaboracion(b.dataset.id),
  async col_reporte_enviar(b) {
    const t = $('#col-motivo'), motivo = t ? t.value.trim() : '';
    if (!motivo) { if (t) t.focus(); return aviso(C.COL_REPORTE_VACIO, 'flag'); }
    ocupado(b, true);
    try { await api.reportarColaboracion(b.dataset.id, motivo.slice(0, 200)); api.dispararPush(); cerrarHoja(); aviso(C.COL_REPORTE_LISTO, 'flag'); }
    catch (e) { ocupado(b, false); if (e && e.code === '23505') { cerrarHoja(); aviso(C.COL_REPORTE_YA, 'flag'); } else fallo(e); }
  },
  reg_enc_modo(b) { recordarFormulario(); R.encModo = b.dataset.v === 'punto' ? 'punto' : 'mira'; dibujarHoja(); },
  aviso_tipo(b) { recordarRapido(); Q.kind = b.dataset.v === 'bien' ? 'bien' : 'ayuda'; dibujarHoja(); },
  aviso_grupo(b) { recordarRapido(); const id = b.dataset.id; if (Q.sel.has(id)) Q.sel.delete(id); else Q.sel.add(id); dibujarHoja(); },
  enviar_aviso_rapido: (b) => enviarAvisoRapido(b),
  vitrina_invitar() {
    const el = $('#invita'); if (!el) return;
    el.scrollIntoView({ behavior: menosMovimiento() ? 'auto' : 'smooth', block: 'center' });
    el.classList.remove('pulso'); void el.offsetWidth; el.classList.add('pulso');
  },
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
    const propio = c.user_id === S.user.id;
    let hist = []; try { hist = await api.history(c.id); } catch (e) { hist = []; }
    // Con fotos de la comunidad, el hallazgo sigue con la siguiente persona que lo retrató
    const conCol = propio && !c.is_private && hist.some((h) => h.user_id && h.user_id !== S.user.id && (h.photo || h.thumb) && h.tipo !== 'no_esta');
    if (!(await confirmar((conCol ? C.BORRAR_CONFIRMAR_COL : C.BORRAR_CONFIRMAR).replace('{h}', c.name)))) return;
    ocupado(b, true);
    try {
      let traspaso = false;
      if (propio) {
        const r = await api.borrarHallazgo(c.id);
        traspaso = !!(r && r.traspaso);
        await api.removeFiles((r && r.quitar) || []).catch(() => null);
      } else {
        await api.removeFiles([c.photo, c.thumb]).catch(() => null);
        await api.delFind(c.id);
      }
      if (propio) procesarFotosPorBorrar(); // su foto mediana (si tenía) también se quita
      S.cache.delete(c.id); S.feed = S.feed.filter((x) => x.find_id !== c.id); S.stats = null;
      const adm = adminAbierto();
      if (adm) { await api.dismiss(c.id).catch(() => null); while (hojaArriba() !== adm) pila.pop(); dibujarHoja(); $('.sheet')._admin.cargar(); }
      else cerrarTodo();
      aviso(traspaso ? C.BORRADO_TRASPASO : 'Borrado', 'trash'); refrescarActual();
    } catch (e) { ocupado(b, false); fallo(e); }
  },
  async avisar(b) {
    if (!(await confirmar('¿Avisar a moderación sobre este hallazgo?', 'flag'))) return;
    try { await api.report(b.dataset.id); aviso('Aviso enviado', 'flag'); }
    catch (e) { if (e && e.code === '23505') aviso('Ya habías avisado', 'flag'); else fallo(e); }
  },

  /* registrar */
  usar_original() {
    if (!R.usarRecorte) return;
    recordarFormulario(); R.usarRecorte = false; if (R.original) ponerVista(R.original); dibujarHoja();
  },
  async recortar(b) {
    if (R.recorte) { recordarFormulario(); R.usarRecorte = true; ponerVista(R.recorte); return dibujarHoja(); }
    const prog = $('#prog'); if (prog) prog.hidden = false; ocupado(b, true);
    const E = R.enc; if (E) E.ocupado = true;   // mientras se quita el fondo, el encuadre no se mueve
    try {
      const cuadro = await cuadroAlDia(), ver = E ? E.ver || 0 : 0;
      const r = await recortarFondo(cuadro, (k) => { const p = $('#prog'); if (p) p.firstElementChild.style.width = Math.round(k * 100) + '%'; });
      if (R.enc !== E || (E && (E.ver || 0) !== ver)) return;
      recordarFormulario(); R.recorte = r; R.usarRecorte = true; ponerVista(R.recorte); dibujarHoja();
    } catch (e) {
      console.error(e); ocupado(b, false);
      aviso('No se pudo recortar. Se usará la foto original', 'scissors');
    } finally { if (E) E.ocupado = false; const p = $('#prog'); if (p) p.hidden = true; }
  },
  gps_chip() {
    const top = hojaArriba(), X = top && top.tipo === 'marca' ? M : R;
    if (X.pos && X.pos.acc != null && esAproximada(X.pos)) { if (X === R) recordarFormulario(); else recordarMarca(); return avisarPrecision({ acc: X.pos.acc }, true); }
    if (X.pos && X.pos.acc == null) return aviso(C.GPS_MARCADO_A_MANO, 'hand-finger');   // no se pierde el punto corregido a mano
    if (X.gps === 'error' || !X.pos) aviso(C.GPS_TOCA_MAPA, 'map-pin');
    if (X === R) leerGPS(); else leerGpsMarca();
  },
  releer_gps: () => leerGPS(),
  guardar_hallazgo: (b) => guardarHallazgo(b),

  /* colección y categorías */
  colcat: (b) => { S.coleccionCat = b.dataset.v || null; S.colAbierta = false; pintarColeccion(true); },
  col_mosaico: () => { S.colAbierta = !S.colAbierta; pintarColeccion(true); },
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
  ver_grupo_mapa(b) {
    if (!miGrupo(b.dataset.id)) return aviso('Únete al grupo para verlo en tu mapa', 'users');
    S.filtro = { modo: 'grupo', id: b.dataset.id }; cerrarTodo(); salirGrupo(); irA('map');
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
      if (esEncuentro(miGrupo(gid))) ofrecerPush();
    } catch (e) { ocupado(b, false); fallo(e); }
  },

  /* grupos de encuentro */
  tipo_grupo(b) {
    const top = hojaArriba(), E = top && top.datos; if (!E) return;
    const raiz = $('.sheet'), n = $('#g-nombre', raiz);
    E.nombre = n ? n.value : E.nombre; E.color = valor(raiz, 'color') || E.color; E.icon = iconoElegido(raiz) || E.icon;
    const u = valor(raiz, 'uso'); if (u) E.uso = u;
    E.tipo = b.dataset.v === 'encuentro' ? 'encuentro' : 'coleccion';
    dibujarHoja();
  },
  // Desde la guía al punto: se termina la guía y vuelve el panel del grupo
  encuentro: (b) => { terminarGuia(); abrirEncuentro(b.dataset.id); },
  encuentro_guia: () => hojaGuiaEncuentro(),
  encuentro_refrescar(b) { const D = encuentroActual(); if (D) { ocupado(b, true); D.cargar(true); } },
  estado_encuentro(b) { const D = encuentroActual(); if (D) hojaEstado(D.gid, b.dataset.v === 'ayuda' ? 'ayuda' : 'bien'); },
  enviar_estado: (b) => enviarEstado(b, b.dataset.gid, b.dataset.v === 'ayuda' ? 'ayuda' : 'bien'),
  whatsapp_estado: (b) => abrirWhatsApp(b.dataset.texto || ''),
  mira_nuevo() { const D = encuentroActual(); if (D) hojaMarca(D.gid, 'mira'); },
  punto_nuevo() { const D = encuentroActual(); if (D) hojaMarca(D.gid, 'punto'); },
  quitar_foto_marca() { recordarMarca(); if (M.vistaUrl) URL.revokeObjectURL(M.vistaUrl); if (M.enc) soltarLienzo(M.enc.img); M.foto = null; M.enc = null; M.vistaUrl = null; dibujarHoja(); },
  encuadrar_marca() { if (!M.enc) return; recordarMarca(); hojaEncuadre(M.enc, async () => { await cuadroMarca(); }); },
  async encuadre_listo(b) {
    const raiz = $('.sheet'), fn = raiz && raiz._encuadre;
    ocupado(b, true);
    try { if (fn) await fn(); } catch (e) { console.error(e); }
    cerrarHoja();
  },
  releer_gps_marca: () => leerGpsMarca(),
  guardar_marca: (b) => guardarMarca(b),
  ver_foto(b) { const src = b.dataset.src; if (src) abrirHoja(() => `${cabeza('')}<img class="big" src="${esc(src)}" alt="">`, null, 'foto'); },
  ver_mira(b) {
    const D = encuentroActual(), k = D && D.e && D.e.miras.find((x) => x.id === b.dataset.id); if (!k) return;
    D.foco = { lat: k.lat, lng: k.lng }; verMapaEncuentro(D);
  },
  enc_mira_abrir(b) {
    const D = encuentroActual(); if (!D) return;
    D.miraAbierta = D.miraAbierta === b.dataset.id ? null : b.dataset.id;
    const el = $('#enc-abajo'); if (el) el.innerHTML = encAbajoHTML(D); else pintarPanelGrupo(D);
  },
  ver_en_mapa_enc(b) { const D = encuentroActual(); if (!D) return; D.foco = b.dataset.id; verMapaEncuentro(D); },
  enc_tab(b) {
    const D = encuentroActual(); if (!D || !D.e) return;
    D.tab = b.dataset.v; const el = $('#enc-abajo'); if (el) el.innerHTML = encAbajoHTML(D); else pintarPanelGrupo(D);
  },
  enc_linea(b) {
    const D = encuentroActual(); if (!D || !D.e) return;
    D.lineas[b.dataset.v] = !D.lineas[b.dataset.v]; const el = $('#enc-arriba'); if (el) el.innerHTML = encArribaHTML(D); else pintarPanelGrupo(D);
  },
  enc_ver_todo() { const D = encuentroActual(); if (D) verTodoEncuentro(D); },
  async borrar_mira(b) {
    const D = encuentroActual(); if (!D) return;
    if (!(await confirmar('¿Quitar este "Mira esto"?'))) return;
    try { await api.delMira(b.dataset.id); procesarFotosPorBorrar(); aviso('Quitado', 'trash'); D.cargar(); } catch (e) { fallo(e); }
  },
  ir_punto_encuentro(b) {
    const D = encuentroActual(), p = D && D.e && D.e.puntos.find((x) => x.id === b.dataset.id); if (!p) return;
    const g = D.e.grupo; cerrarTodo();
    irAlPunto({ id: 'punto-' + p.id, lat: p.lat, lng: p.lng, name: p.name, cat_color: g.color, cat_icon: 'flag', act: 'encuentro', actId: g.id });
  },
  async punto_principal(b) {
    const D = encuentroActual(); if (!D) return;
    try { await api.puntoPrincipal(b.dataset.id); aviso('Punto principal', 'star'); D.cargar(); } catch (e) { fallo(e); }
  },
  async borrar_punto(b) {
    const D = encuentroActual(); if (!D) return;
    if (!(await confirmar('¿Borrar este punto de encuentro?'))) return;
    try { await api.delPunto(b.dataset.id); procesarFotosPorBorrar(); aviso('Borrado', 'trash'); D.cargar(); } catch (e) { fallo(e); }
  },
  miembro_encuentro: (b) => hojaMiembroEncuentro(b.dataset.id),
  async coadmin_encuentro(b) {
    const D = encuentroActual(); if (!D) return;
    ocupado(b, true);
    try { await api.nombrarCoadmin(D.gid, b.dataset.id, b.dataset.v === '1'); cerrarHoja(); aviso(b.dataset.v === '1' ? 'Ahora es coadministradora' : 'Ya no es coadministradora', 'shield'); D.cargar(); }
    catch (e) { ocupado(b, false); fallo(e); }
  },
  async sacar_encuentro(b) {
    const D = encuentroActual(); if (!D) return;
    if (!(await confirmar('¿Sacar a esta persona del grupo? Se borra todo lo suyo aquí.', 'user-minus'))) return;
    try { await api.sacarMiembro(D.gid, b.dataset.id); cerrarHoja(); aviso('Ya no es parte del grupo', 'user-minus'); D.cargar(); } catch (e) { fallo(e); }
  },
  ajustes_encuentro: () => hojaAjustesEncuentro(),
  invitar_grupo: (b) => hojaInvitar(b.dataset.id),
  async invitacion_unirme(b) {
    const gid = b.dataset.g; ocupado(b, true);
    try { await api.responderInvitacion(gid, true); await recargarGrupos(); }
    catch (e) { ocupado(b, false); return fallo(e); }
    S.avisos = S.avisos.filter((a) => !(a.kind === 'invitacion' && a.grupo_id === gid)); pintarCampana();
    const top = hojaArriba(); if (top && top.tipo === 'buzon_amigos' && top.datos) top.datos.cargar();
    aviso(C.INVITACION_DENTRO, 'users');
    abrirGrupo(gid);
  },
  async invitacion_rechazar(b) {
    const gid = b.dataset.g; ocupado(b, true);
    try { await api.responderInvitacion(gid, false); }
    catch (e) { ocupado(b, false); return fallo(e); }
    S.avisos = S.avisos.map((a) => (a.kind === 'invitacion' && a.grupo_id === gid ? Object.assign({}, a, { reaccion: 'rechazada', nuevo: false }) : a)); pintarCampana();
    const top = hojaArriba(); if (top && top.tipo === 'buzon_amigos' && top.datos) top.datos.cargar();
    aviso(C.INVITACION_RECHAZADA_OK, 'x');
  },
  async invitar_amiga(b) {
    ocupado(b, true);
    try { await api.invitarAGrupo(b.dataset.g, b.dataset.id); aviso(C.INVITAR_LISTO, 'user-plus'); }
    catch (e) { ocupado(b, false); return fallo(e); }
    const top = hojaArriba(); if (top && top.tipo === 'invitar' && top.datos) top.datos.cargar();
  },
  invitar_whatsapp(b) {
    const g = datosGrupo(b.dataset.g).g, enlace = enlaceGrupo(g); if (!enlace) return;
    abrirWhatsApp(`${C.WHATSAPP_INVITACION} "${g.name}"\n${enlace}`);
  },
  async copiar_invitacion(b) {
    const enlace = enlaceGrupo(datosGrupo(b.dataset.g).g); if (!enlace) return;
    try { await navigator.clipboard.writeText(enlace); aviso(C.INVITAR_COPIADO, 'copy'); }
    catch (e) { aviso(enlace, 'copy'); }
  },
  async readmitir_persona(b) {
    ocupado(b, true);
    try { await api.readmitir(b.dataset.g, b.dataset.id); aviso(C.READMITIDA, 'user-check'); }
    catch (e) { ocupado(b, false); return fallo(e); }
    const top = hojaArriba(); if (top && top.tipo === 'invitar' && top.datos) top.datos.cargar();
  },
  miembro_grupo: (b) => hojaMiembroGrupo(b.dataset.g, b.dataset.id),
  async coadmin_grupo(b) {
    ocupado(b, true);
    try { await api.nombrarCoadmin(b.dataset.g, b.dataset.id, b.dataset.v === '1'); cerrarHoja(); aviso(b.dataset.v === '1' ? 'Ahora es coadministradora' : 'Ya no es coadministradora', 'shield'); datosGrupo(b.dataset.g).recargar(); }
    catch (e) { ocupado(b, false); fallo(e); }
  },
  async sacar_grupo(b) {
    if (b.disabled) return; b.disabled = true;
    if (!(await confirmar(C.SACAR_GRUPO_CONFIRMAR, 'user-minus'))) { b.disabled = false; return; }
    try { await api.sacarMiembro(b.dataset.g, b.dataset.id); cerrarHoja(); aviso('Ya no es parte del grupo', 'user-minus'); datosGrupo(b.dataset.g).recargar(); } catch (e) { b.disabled = false; fallo(e); }
  },
  async guardar_ajustes_encuentro(b) {
    const D = encuentroActual(); if (!D) return;
    const raiz = $('.sheet');
    const o = { juego: valor(raiz, 'juego') === '1', tema: $('#enc-tema', raiz).value.trim(), acuerdo: $('#enc-acuerdo', raiz).value.trim() };
    ocupado(b, true);
    try { await api.ajustesEncuentro(D.gid, o); api.dispararPush(); cerrarHoja(); aviso('Guardado'); D.cargar(); } catch (e) { ocupado(b, false); fallo(e); }
  },
  async borrar_lo_mio(b) {
    const D = encuentroActual(); if (!D) return;
    if (!(await confirmar(C.ENCUENTRO_BORRAR_MIO, 'eraser'))) return;
    ocupado(b, true);
    try {
      await api.borrarLoMio(D.gid);
      if (S.comparte && S.comparte.gid === D.gid) pararCompartir(true);
      procesarFotosPorBorrar(); aviso('Se borró todo lo tuyo en este grupo', 'eraser'); D.cargar();
    } catch (e) { ocupado(b, false); fallo(e); }
  },
  async votar_borrado(b) {
    const D = encuentroActual(), v = D && D.e && D.e.votos; if (!v) return;
    if (!v.mio && !(await confirmar(v.n ? C.ENCUENTRO_VOTAR_APOYO : C.ENCUENTRO_VOTAR, 'trash'))) return;
    ocupado(b, true);
    try {
      const r = await api.votarBorrado(D.gid, !v.mio);
      if (!v.mio) api.dispararPush();
      if (r === 'borrado') { await recargarGrupos(); cerrarTodo(); salirGrupo(); procesarFotosPorBorrar(); aviso('El grupo se borró', 'trash'); if (S.tab === 'coleccion') pintarColeccion(); return; }
      aviso(v.mio ? 'Retiraste tu voto' : 'Voto registrado', 'trash'); D.cargar();
    } catch (e) { ocupado(b, false); fallo(e); }
  },
  async eliminar_inactivo(b) {
    const D = encuentroActual(), e = D && D.e; if (!e) return;
    if (!(await confirmar(C.ENCUENTRO_INACTIVO.replace('{d}', e.inactividad.dias), 'clock-x'))) return;
    ocupado(b, true);
    try { await api.eliminarPorInactividad(D.gid); api.dispararPush(); await recargarGrupos(); cerrarTodo(); salirGrupo(); procesarFotosPorBorrar(); aviso('El grupo se eliminó', 'trash'); if (S.tab === 'coleccion') pintarColeccion(); }
    catch (err) { ocupado(b, false); fallo(err); }
  },
  async salir_encuentro(b) {
    const D = encuentroActual(); if (!D) return;
    if (!(await confirmar(C.ENCUENTRO_SALIR, 'door-exit'))) return;
    ocupado(b, true);
    try {
      await api.leaveGroup(D.gid, S.user.id);
      if (S.comparte && S.comparte.gid === D.gid) pararCompartir(true);
      await recargarGrupos(); cerrarTodo(); salirGrupo(); procesarFotosPorBorrar(); aviso('Saliste del grupo', 'door-exit');
      if (S.tab === 'coleccion') pintarColeccion();
    } catch (e) { ocupado(b, false); fallo(e); }
  },
  compartir_ubicacion(b) { const D = encuentroActual(); if (D) iniciarCompartir(D.gid, +b.dataset.v === 30 ? 30 : 15, b); },
  async dejar_compartir(b) {
    const X = S.comparte; if (!X) return;
    ocupado(b, true);
    try { await api.dejarDeCompartir(X.gid); } catch (e) { /* sin red: deja de verse al terminar el tiempo */ }
    pararCompartir(false);
    const D = encuentroActual(); if (D) D.cargar();
  },

  /* notificaciones */
  async activar_push(b) { ocupado(b, true); await activarPush(); ocupado(b, false); pintarNotificaciones(); },
  async desactivar_push() { if (!(await confirmar(`${C.PUSH_DESACTIVAR}?`, 'bell-off'))) return; await desactivarPush(); pintarNotificaciones(); },
  async push_pref(b) {
    const k = b.dataset.k, p = Object.assign({}, S.push || {});
    const nuevo = !p[k]; p[k] = nuevo;
    b.classList.toggle('on', nuevo); b.setAttribute('aria-checked', String(nuevo));
    try { await api.guardarPushPrefs(S.user.id, { [k]: nuevo }); S.push = p; resumenNotif(); }
    catch (e) { b.classList.toggle('on', !nuevo); b.setAttribute('aria-checked', String(!nuevo)); fallo(e); }
  },
  async push_ofrecer_si(b) {
    const top = hojaArriba(); ocupado(b, true);
    const ok = await activarPush();
    if (!ok) { ocupado(b, false); return; }
    if (top && top.datos) { top.datos.paso = 2; dibujarHoja(); }
  },
  async push_ofrecer_listo(b) {
    const s = $('#push-sonido'), si = !!(s && s.checked);
    ocupado(b, true);
    try { if (si) { await api.guardarPushPrefs(S.user.id, { sonido: true }); S.push = Object.assign({}, S.push || {}, { sonido: true }); } cerrarHoja(); }
    catch (e) { ocupado(b, false); fallo(e); }
  },

  /* sin conexión */
  async fotos_offline(b) {
    const si = !fotosSinConexion();
    try { localStorage.setItem('cg_fotos_offline', si ? '1' : '0'); } catch (e) { /* nada */ }
    b.classList.toggle('on', si); b.setAttribute('aria-checked', String(si));
    await alTrabajador({ tipo: 'ajustes', uid: S.user.id, fotos: si });
  },
  async liberar_espacio(b) {
    ocupado(b, true);
    const r = await alTrabajador({ tipo: 'liberar' });
    ocupado(b, false);
    const e = $('#espacio'); if (e && r) e.textContent = textoEspacio(r);
    aviso('Espacio liberado', 'eraser');
  },
  subir_ahora: () => subirPendientes(),
  ver_pendientes() { try { localStorage.setItem('cg_plegado_offline', '1'); } catch (e) { /* nada */ } cerrarTodo(); irA('perfil'); setTimeout(() => { abrirPlegable('offline', true); const el = $('#sec-offline'); if (el) el.scrollIntoView({ block: 'start' }); }, 400); },
  plegar: (b) => abrirPlegable(b.dataset.k, b.getAttribute('aria-expanded') !== 'true'),
  async pendiente_borrar(b) {
    if (!(await confirmar('¿Borrar este registro sin subir?'))) return;
    await BDP.quitar(b.dataset.id).catch(() => null); await contarPendientes();
  },
  async pendiente_mismo(b) {
    const x = (S.pendientes || []).find((y) => y.id === b.dataset.id); if (!x || !x.existente) return;
    try {
      const c = await api.card(x.existente); if (!c) return aviso('Ese hallazgo ya no está disponible', 'alert-triangle');
      const d = x.datos;
      Object.assign(x, { tipo: 'reencuentro', privado: !!c.is_private, nombre: c.name, estado: 'pendiente', existente: null,
        datos: { find_id: c.id, lat: d.lat, lng: d.lng, note: d.note, created_at: d.created_at } });
      await BDP.poner(x); await contarPendientes(); subirPendientes();
    } catch (e) { fallo(e); }
  },
  pendiente_otro(b) {
    const x = (S.pendientes || []).find((y) => y.id === b.dataset.id); if (!x) return;
    abrirHoja(() => `${cabeza(ic('pencil'))}<div class="field"><label for="p-renombrar">${ic('pencil')} Nombre</label>
      <input id="p-renombrar" class="in" maxlength="60" value="${esc(x.datos.name)}"></div>
      <button class="btn block" data-act="guardar_nombre_pendiente" data-id="${x.id}">${ic('check')} Guardar</button>`, null, 'renombrar');
  },
  async guardar_nombre_pendiente(b) {
    const x = (S.pendientes || []).find((y) => y.id === b.dataset.id), n = $('#p-renombrar'); if (!x || !n) return;
    const nombre = n.value.trim(); if (!nombre) return aviso('Ponle un nombre', 'pencil');
    if (sinAcentos(nombre) === sinAcentos(x.datos.name)) return aviso('Cambia el nombre para registrarlo como nuevo', 'pencil');
    x.datos.name = nombre; x.estado = 'pendiente'; x.existente = null;
    await BDP.poner(x); cerrarHoja(); await contarPendientes(); subirPendientes();
  },
  actualizar() { if (!trabajadorEsperando) return location.reload(); S.actualizando = true; trabajadorEsperando.postMessage({ tipo: 'saltar' }); },

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
      if (top && (top.tipo === 'buzon_amigos' || top.tipo === 'chat') && top.datos) { dibujarHoja(); top.datos.cargar(); }
      if (top && top.tipo === 'buscar' && top.datos) top.datos.pintarRes();
      if (top && top.tipo === 'invitar' && top.datos) top.datos.cargar();
    } catch (e) { ocupado(b, false); fallo(e); }
  },
  tabla: () => tablaGeneral(),
  buscar_personas: () => hojaBuscarPersonas(),

  /* silenciar */
  async silenciar(b) {
    const m = b.dataset.user ? { target_user: b.dataset.user } : { target_group: b.dataset.group };
    if (!(await confirmar(C.SILENCIAR_CONFIRMAR, 'volume-off'))) return;
    ocupado(b, true);
    try { await api.mute(m); await recargarSilencios(); aviso(C.SILENCIADO_LISTO, 'volume-off'); trasSilencio(); }
    catch (e) { ocupado(b, false); fallo(e); }
  },
  async quitar_silencio(b) {
    ocupado(b, true);
    try { await api.unmute(b.dataset.id); await recargarSilencios(); aviso(C.SILENCIO_QUITADO, 'volume'); trasSilencio(); }
    catch (e) { ocupado(b, false); fallo(e); }
  },
  silenciados: () => hojaSilenciados(),

  /* buzón */
  buzon: () => hojaBuzon(),
  buzon_tipo(b) { const D = $('.sheet')._buzon; if (!D) return; const t = $('#buzon-in'); if (t) D.texto = t.value; D.tipo = b.dataset.v; dibujarHoja(); },
  buzon_quitar_foto() { const D = $('.sheet')._buzon; if (!D) return; const t = $('#buzon-in'); if (t) D.texto = t.value; if (D.fotoUrl) URL.revokeObjectURL(D.fotoUrl); D.foto = null; D.fotoUrl = null; dibujarHoja(); },
  async enviar_buzon(b) {
    const D = $('.sheet')._buzon; if (!D) return;
    const t = $('#buzon-in'), texto = (t ? t.value : '').trim();
    if (!texto) { if (t) t.focus(); return aviso('Escribe tu mensaje', 'mail'); }
    if (texto.length > C.BUZON_MAX) return aviso(`Máximo ${C.BUZON_MAX} caracteres`, 'mail');
    ocupado(b, true);
    let ruta = null;
    try {
      if (D.foto) { ruta = `priv:${S.user.id}/buzon-${uuid()}.jpg`; await api.upload(ruta, D.foto); }
      await api.sendRequest({ tipo: D.tipo, body: texto, screenshot: ruta, meta: metaBuzon() });
      if (D.fotoUrl) URL.revokeObjectURL(D.fotoUrl);
      Object.assign(D, { texto: '', foto: null, fotoUrl: null, lista: null });
      aviso(C.BUZON_ENVIADO, 'mail'); dibujarHoja(); D.cargar();
    } catch (e) { if (ruta) api.removeFiles([ruta]).catch(() => null); ocupado(b, false); fallo(e); }
  },
  async borrar_peticion(b) {
    const sh = $('.sheet'), D = sh && (sh._buzon || sh._admin); if (!D) return;
    const r = (D.lista || D.peticiones || []).find((x) => x.id === b.dataset.id); if (!r) return;
    if (!(await confirmar('¿Borrar este mensaje?'))) return;
    try {
      await api.delRequest(r.id);
      if (r.screenshot) await api.removeFiles([r.screenshot]).catch(() => null);
      aviso('Borrado', 'trash'); D.cargar();
    } catch (e) { fallo(e); }
  },
  admin_vista(b) { const D = $('.sheet')._admin; if (!D) return; D.vista = b.dataset.v; dibujarHoja(); },
  async peticion_estado(b) {
    const D = $('.sheet')._admin; if (!D) return;
    try { await api.updateRequest(b.dataset.id, { status: b.dataset.v }); aviso(C.BUZON_ESTADOS[b.dataset.v].nombre, C.BUZON_ESTADOS[b.dataset.v].icono); D.cargar(); }
    catch (e) { fallo(e); }
  },
  async responder_peticion(b) {
    const D = adminDatos(); if (!D) return;
    const t = $('#resp-' + b.dataset.id), texto = (t ? t.value : '').trim();
    if (!texto) return aviso(C.RESPUESTA_VACIA, 'message-circle');
    if (texto.length > C.BUZON_RESPUESTA_MAX) return aviso(`Máximo ${C.BUZON_RESPUESTA_MAX} caracteres`, 'message-circle');
    if (t) t.blur();
    ocupado(b, true);
    try {
      await api.updateRequest(b.dataset.id, { reply: texto });
      const r = (D.peticiones || []).find((x) => x.id === b.dataset.id); if (r) Object.assign(r, { reply: texto, replied_at: new Date().toISOString() });
      D.editandoResp = null; dibujarHoja();
      aviso(C.RESPUESTA_LISTA, 'circle-check'); D.cargar();
    } catch (e) { ocupado(b, false); fallo(e); }
  },
  editar_respuesta(b) { const D = adminDatos(); if (!D) return; D.editandoResp = b.dataset.id; dibujarHoja(); const t = $('#resp-' + b.dataset.id); if (t) t.focus(); },

  /* avisos */
  avisos: () => hojaAvisos(),
  aviso_abrir(b) {
    cerrarNotif();
    const id = b.dataset.id, k = b.dataset.kind;
    if (k === 'nada') return;
    if (k === 'buzon') { const t = hojaArriba(); if (t && t.tipo === 'buzon_amigos') return; return hojaAvisos(); }
    if (!id) return hojaAvisos();
    if (k === 'encuentro') { if (!miGrupo(id)) return aviso('Este grupo ya no está disponible', 'alert-triangle'); return abrirEncuentro(id, b.dataset.foco || null); }
    if (k === 'encuentro_nuevo') { cerrarTodo(); return editarGrupo('', 'encuentro'); }
    // Una foto de la comunidad en lo tuyo se celebra antes de abrir la ficha
    if (k === 'colaboracion') {
      S.cache.delete(id);
      return celebrarHallazgo({ foto: b.dataset.foto ? api.photoUrl(b.dataset.foto) : '', icono: 'users', color: C.COLORES.terracota, titulo: C.COL_CELEBRA,
        detalle: C.COL_CELEBRA_TEXTO.replace('{n}', b.dataset.n || '').replace('{h}', b.dataset.h || '') }, () => abrirFicha(id));
    }
    if (k === 'mis_mensajes') return hojaBuzon();
    if (k === 'perfil') return abrirPerfil(id);
    if (k === 'grupo') { if (!miGrupo(id)) return aviso('Este grupo ya no está disponible', 'alert-triangle'); return abrirGrupo(id); }
    if (k === 'chat') return hojaChat(id);
    if (k === 'admin') { if (!S.me.is_admin) return; const adm = adminAbierto(); if (adm) { while (hojaArriba() !== adm) pila.pop(); adm.datos.vista = id; dibujarHoja(); return; } return hojaAdmin(id); }
    S.cache.delete(id); abrirFicha(id);
  },
  admin_uso: () => hojaAdmin('uso'),
  anuncio_destino(b) { const D = adminDatos(); if (!D) return; recordarAnuncio(D); D.nuevo.destino = b.dataset.v || null; dibujarHoja(); },
  anuncio_dias(b) { const D = adminDatos(); if (!D) return; recordarAnuncio(D); D.nuevo.dias = b.dataset.v ? +b.dataset.v : null; dibujarHoja(); },
  async publicar_anuncio(b) {
    const D = adminDatos(); if (!D) return; recordarAnuncio(D);
    const t = (D.nuevo.texto || '').trim();
    if (!t) { const x = $('#anuncio-in'); if (x) x.focus(); return aviso(C.ANUNCIO_VACIO, 'speakerphone'); }
    if (!(await confirmar(C.ANUNCIO_CONFIRMAR, 'speakerphone'))) return;
    ocupado(b, true);
    try { await api.publicarAnuncio(t, D.nuevo.destino, D.nuevo.dias); api.dispararPush(); D.nuevo = { texto: '', destino: null, dias: null };
      D.anuncios = await api.anuncios(); aviso(C.ANUNCIO_LISTO, 'speakerphone'); dibujarHoja(); }
    catch (e) { ocupado(b, false); fallo(e); }
  },
  async anuncio_cambiar(b) {
    const D = adminDatos(); if (!D) return; recordarAnuncio(D);
    try { await api.duracionAnuncio(b.dataset.id, b.dataset.v ? +b.dataset.v : null); D.anuncios = await api.anuncios(); aviso(C.ANUNCIO_CAMBIADO, 'clock'); dibujarHoja(); }
    catch (e) { fallo(e); }
  },
  async retirar_anuncio(b) {
    const D = adminDatos(); if (!D) return; recordarAnuncio(D);
    if (!(await confirmar(C.ANUNCIO_RETIRAR_CONFIRMAR, 'x'))) return;
    try { await api.retirarAnuncio(b.dataset.id); D.anuncios = await api.anuncios(); aviso(C.ANUNCIO_RETIRADO, 'x'); dibujarHoja(); }
    catch (e) { fallo(e); }
  },
  chat: (b) => hojaChat(b.dataset.id),
  pedir_amistad: (b) => hojaPedirAmistad(b.dataset.id),
  async enviar_amistad(b) {
    const t = $('#amistad-in'), texto = (t ? t.value : '').trim().slice(0, C.AMISTAD_MAX);
    if (t) t.blur();
    ocupado(b, true);
    let r;
    try { r = await api.pedirAmistad(b.dataset.id, texto); } catch (e) { ocupado(b, false); return fallo(e); }
    cerrarHoja();
    aviso(r === 'amigas' ? C.AMISTAD_LISTA : C.AMISTAD_ENVIADA_OK, r === 'amigas' ? 'user-check' : 'heart-handshake');
    if (r === 'amigas') S.following.add(b.dataset.id);
    refrescarAmistad();
  },
  async amistad_aceptar(b) {
    const uid = b.dataset.id; ocupado(b, true);
    try { await api.responderAmistad(uid, true); } catch (e) { ocupado(b, false); return fallo(e); }
    S.following.add(uid);
    S.avisos = S.avisos.filter((a) => !(a.kind === 'amistad' && a.actor_id === uid)); pintarCampana();
    aviso(C.AMISTAD_LISTA, 'user-check');
    refrescarAmistad();
  },
  async amistad_rechazar(b) {
    const uid = b.dataset.id; ocupado(b, true);
    try { await api.responderAmistad(uid, false); } catch (e) { ocupado(b, false); return fallo(e); }
    S.avisos = S.avisos.filter((a) => !(a.kind === 'amistad' && a.actor_id === uid)); pintarCampana();
    refrescarAmistad();
  },
  enviar_ficha: (b) => hojaEnviarFicha(b.dataset.id),
  async mandar_ficha(b) {
    const top = hojaArriba(), D = top && top.tipo === 'enviar_ficha' ? top.datos : null; if (!D) return;
    const t = $('#ficha-linea'), linea = (t ? t.value : D.linea || '').trim().slice(0, C.MENSAJE_MAX);
    if (t) t.blur();
    ocupado(b, true);
    try { await api.enviarMensaje(b.dataset.id, linea, b.dataset.f); } catch (e) { ocupado(b, false); return fallo(e); }
    D.enviadas.add(b.dataset.id); D.linea = linea; dibujarHoja(); aviso(C.FICHA_ENVIADA, 'send');
  },
  async enviar_mensaje(b) {
    const t = $('#chat-in'), texto = (t ? t.value : '').trim(), top = hojaArriba();
    if (!texto) { if (t) t.focus(); return aviso('Escribe tu mensaje', 'messages'); }
    if (texto.length > C.MENSAJE_MAX) return aviso(`Máximo ${C.MENSAJE_MAX} caracteres`, 'messages');
    ocupado(b, true);
    try {
      await api.enviarMensaje(b.dataset.id, texto);
      if (top && top.datos) {
        top.datos.borrador = ''; if (t) t.value = '';
        const n = $('#chat-n'); if (n) n.textContent = '0';
        await top.datos.cargar();
        const l = $('#chat-lista'); if (l) l.scrollTop = l.scrollHeight;
      }
      if (b.isConnected) ocupado(b, false);
    } catch (e) { ocupado(b, false); fallo(e); }
  },
  etiquetar(b) { const c = S.cache.get(b.dataset.id); if (c && !c.is_private) hojaEtiquetar(c.id, null, null); },
  etiquetar_registro() {
    recordarFormulario();
    hojaEtiquetar(null, R.etiquetas, (ids, gente) => { R.etiquetas = ids; R.etiquetasNombres = gente.filter((g) => ids.includes(g.persona)).map((g) => g.name); });
  },
  etiqueta_toggle(b) {
    const D = hojaArriba() && hojaArriba().datos; if (!D) return;
    const id = b.dataset.id;
    if (D.sel.has(id)) D.sel.delete(id);
    else { if (D.sel.size >= C.ETIQUETAS_MAX) return aviso(`Máximo ${C.ETIQUETAS_MAX} personas por hallazgo`, 'tag'); D.sel.add(id); }
    dibujarHoja();
  },
  async guardar_etiquetas(b) {
    const top = hojaArriba(), D = top && top.datos; if (!D) return;
    const ids = [...D.sel];
    if (D.guardar) { D.guardar(ids, D.gente || []); cerrarHoja(); return; }
    const fid = (fichaH && fichaH.id) || null; if (!fid) return;
    ocupado(b, true);
    try {
      await api.etiquetar(fid, ids.filter((x) => !D.antes.has(x)));
      await api.desetiquetar(fid, [...D.antes].filter((x) => !D.sel.has(x)));
      cerrarHoja(); aviso(ids.length ? C.ETIQUETAS_LISTO : 'Etiquetas quitadas', 'tag');
    } catch (e) { ocupado(b, false); fallo(e); }
  },
  async color_premio(b) {
    const { tipo, id, v } = b.dataset;
    try {
      if (tipo === 'cat') { await api.updateCat(id, { premio_color: v }); S.cats = await api.listCats(S.user.id); }
      else {
        await api.colorPremioGrupo(id, v);
        const g = ((S.stats && S.stats.premios_grupos) || []).find((x) => x.id === id); if (g) g.premio_color = v;
      }
      $$('[data-act="color_premio"]', b.parentNode).forEach((x) => x.classList.toggle('on', x === b));
      const muestra = b.closest('.premio-nuevo');
      if (muestra) $$('.premio', muestra).forEach((el) => { el.innerHTML = svgPremio(el.className.replace(/.*p-/, '').trim(), v); });
      aviso(C.COLOR_PREMIO_LISTO, 'crown');
      if (S.tab === 'map') cargarPines();
      const D = encuentroActual(); if (D && D.gid === id) D.cargar();
    } catch (e) { fallo(e); }
  },
  instalar: () => instalarApp(),
  instalar_no() { noMostrarInstalar(); pintarInstalar(); },
  async copiar_liga() {
    const liga = location.origin + location.pathname;
    try { await navigator.clipboard.writeText(liga); aviso(C.INSTALAR_COPIADA, 'copy'); }
    catch (e) { aviso(liga, 'copy'); }
  },
  cerrar_notif: () => cerrarNotif(),
  tabla_metrica(b) { const D = $('.sheet')._tabla; if (!D || D.metric === b.dataset.v) return; D.metric = b.dataset.v; D.cargar(); },
  async salir() {
    const n = (S.pendientes || []).length;
    if (!(await confirmar(n ? C.PENDIENTES_SALIR.replace('{n}', n) : '¿Cerrar sesión?', 'logout'))) return;
    await limpiarTelefono();
    await api.logout().catch(() => null); location.hash = ''; location.reload();
  },
  async borrar_cuenta(b) {
    if (!(await confirmar('¿Borrar tu cuenta?', 'trash'))) return;
    if (!(await confirmar('Se borrarán tu perfil, tus hallazgos y tus fotos. No se puede deshacer.', 'alert-triangle', '', 'trash'))) return;
    ocupado(b, true);
    try { await desactivarPush(true); await api.deleteAccount(S.user.id); await limpiarTelefono(); location.hash = ''; location.reload(); }
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
// Al cerrar sesión: se quitan las notificaciones de este teléfono, las copias y lo pendiente
async function limpiarTelefono() {
  pararCompartir(true);
  await desactivarPush(true).catch(() => null);
  await alTrabajador({ tipo: 'salir' });
  try { for (const x of await BDP.todos(S.user.id)) await BDP.quitar(x.id); } catch (e) { /* nada */ }
  try { [claveGrupoMapa(), 'cg_plegado_notif', 'cg_plegado_offline'].forEach((k) => localStorage.removeItem(k)); } catch (e) { /* nada */ }
  S.grupo = null; S.colMias = null;
}
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
  if (ev.target.id === 'anuncio-in') {
    const n = $('#anuncio-n'); if (n) n.textContent = ev.target.value.length;
    const v = $('#anuncio-vista-t'); if (v) v.textContent = ev.target.value || '…';
  }
  if (ev.target.id === 'coment-in') { if (fichaH) fichaH.borrador = ev.target.value; const n = $('#coment-n'); if (n) n.textContent = ev.target.value.length; }
  if (ev.target.id === 'chat-in') { const top = hojaArriba(); if (top && top.datos) top.datos.borrador = ev.target.value; const n = $('#chat-n'); if (n) n.textContent = ev.target.value.length; }
  if (ev.target.id === 'buzon-in') { const D = $('.sheet') && $('.sheet')._buzon; if (D) D.texto = ev.target.value; const n = $('#buzon-n'); if (n) n.textContent = ev.target.value.length; }
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
    <div data-instalar style="width:100%;max-width:300px"></div>
    <button class="linkbtn" data-act="privacidad" style="color:var(--tinta2)">${ic('lock')} ${esc(C.DATOS_TITULO)}</button></div>`;
  pintarInstalar();
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
    if (S.me.blocked) return pantallaBloqueada();
    const [cats, groups, following] = await Promise.all([api.listCats(user.id), api.myGroups(user.id), api.following(user.id)]);
    S.cats = cats; S.groups = groups; S.following = new Set(following);
    S.grupo = null;
    S.mutes = await api.muteList().catch(() => []);
    vigilarAvisos();
    cuandoDesocupado(protegerFotosAntiguas);
    alTrabajador({ tipo: 'ajustes', uid: user.id, fotos: fotosSinConexion() });
    contarPendientes().then(() => subirPendientes());
    cuandoDesocupado(() => { sincronizarPush(); procesarFotosPorBorrar(); });
    if (!S.cats.length) return pedirCategorias();
    pintarApp(); rutaHash();
  } catch (e) { fallo(e); S.user = null; pantallaEntrada(); }
  finally { S.arrancando = false; }
}
// Enlaces compartidos: #f= hallazgo, #u= perfil, #v= vitrina, #g= invitación a grupo.
// Se recuerdan durante el inicio de sesión con Google.
const RX_DESTINO = /^#([fuvc])=([0-9a-f-]{36})$|^#g=([0-9a-f]{6,40})$|^#e=([0-9a-f-]{36})(?:\.([0-9a-f-]{36}))?$|^#b$|^#ayuda$|^#nuevo$/i;
function guardarDestino() {
  if (RX_DESTINO.test(location.hash)) { try { localStorage.setItem('cg_destino', location.hash); } catch (e) { /* sin almacenamiento */ } }
}
function rutaHash(forzada) {
  let h = forzada || location.hash;
  if (!RX_DESTINO.test(h)) { try { h = localStorage.getItem('cg_destino') || ''; } catch (e) { h = ''; } }
  try { localStorage.removeItem('cg_destino'); } catch (e) { /* nada */ }
  const m = h.match(RX_DESTINO);
  if (location.hash) history.replaceState(null, '', location.pathname);
  if (!m) return;
  const fijo = m[0].toLowerCase();
  if (fijo === '#b') hojaAvisos();
  else if (fijo === '#ayuda') { cerrarTodo(); hojaAvisoRapido(); }    // atajo del ícono de la app (Android)
  else if (fijo === '#nuevo') { cerrarTodo(); nuevoRegistro(); }
  else if (m[3]) mostrarInvitacion(m[3]);
  else if (m[4]) { if (miGrupo(m[4])) abrirEncuentro(m[4], m[5] || null); else aviso('Este grupo ya no está disponible', 'alert-triangle'); }
  else if (m[1] === 'f') abrirFicha(m[2]); else if (m[1] === 'v') abrirVitrina(m[2]); else if (m[1] === 'c') hojaChat(m[2]); else abrirPerfil(m[2]);
}
window.addEventListener('hashchange', () => {
  guardarDestino();
  if (S.me && S.cats.length && $('#scr-map')) rutaHash();
  else if (!S.user && destinoVitrina()) pantallaVitrina(destinoVitrina());
});
// Una cuenta bloqueada no tiene ningún acceso: solo puede salir
function pantallaBloqueada() {
  $('#app').innerHTML = `<main class="screen bloqueada"><div class="empty">${ic('ban')}<h2 class="serif">${esc(C.BLOQUEADA_TITULO)}</h2><p>${esc(C.BLOQUEADA_TEXTO)}</p>
    <button class="btn" data-act="salir_bloqueada">${ic('logout')} ${esc(C.AYUDA.salir || 'Salir')}</button></div></main>`;
}
// Sin sesión: la vitrina compartida se ve sin cuenta; lo demás pide entrar
function pantallaSinCuenta() { const v = destinoVitrina(); if (v) pantallaVitrina(v); else pantallaEntrada(); }

async function iniciar() {
  guardarDestino();
  registrarTrabajador();
  api = window.__API_PRUEBAS__ || (/^https:\/\//.test(C.SUPABASE_URL) ? supabaseApi() : null);
  if (!api) return pantallaConfig();
  api.onAuth((ev, u) => {
    if (ev === 'SIGNED_OUT') { S.user = null; S.grupo = null; S.colMias = null; if (S.capaEnc) S.capaEnc.clearLayers(); clearInterval(tAvisos); pararCompartir(true); alTrabajador({ tipo: 'salir' }); pantallaEntrada(); }
    else if (u && (ev === 'SIGNED_IN' || ev === 'INITIAL_SESSION')) arrancar(u);
  });
  try { const u = await api.session(); if (u) arrancar(u); else if (!S.user) pantallaSinCuenta(); }
  catch (e) { fallo(e); pantallaSinCuenta(); }
}
window.__CG__ = { ACCIONES, S, logros, novedades, recortarVacio, protegerFotosAntiguas, tipoInstalacion,
  subirPendientes, contarPendientes, BDP, encuentroActual, textoAviso, salirGrupo, fotoMuro, textoWhatsAppEstado, abrirEncuentro, pararCompartir, R, dibujarHoja, recargarGrupos, arrancar, crearPDF, ordenarFichas,
  versionNueva: (w) => { trabajadorEsperando = w; pintarVersionNueva(); } };
iniciar();
})();
