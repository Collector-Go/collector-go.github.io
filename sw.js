/* =====================================================================
   Collector Go · trabajador del teléfono (service worker) · v1.8.0
   1. La app abre al instante y sin conexión (archivos guardados en el teléfono).
   2. Copias para ver sin conexión: datos, fotos (tope ~50 MB) y mapa ya visto.
   3. Notificaciones: el texto es genérico y se escribe aquí, en el teléfono.
   Cada parche cambia VERSION: así el teléfono sabe que hay una versión nueva.
   ===================================================================== */
const VERSION = '1.8.0';
self.window = self;
importScripts('config.js');
const C = self.CONFIG;
const SUPA = C.SUPABASE_URL;
const CACHE_APP = 'cg-app-' + VERSION;
const CACHE_ICONOS = 'cg-iconos', CACHE_MAPA = 'cg-mapa', CACHE_FOTOS = 'cg-fotos', CACHE_DATOS = 'cg-datos';
const TOPE_FOTOS = C.OFFLINE_FOTOS_MB * 1048576;
const TOPE_TESELAS = C.OFFLINE_TESELAS;
const ESPERA_RED_MS = C.OFFLINE_ESPERA_MS;
const ARCHIVOS = ['./', 'index.html', 'app.js', 'config.js', 'styles.css', 'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
const EXTERNOS = C.OFFLINE_EXTERNOS;
// Consultas de solo lectura que se guardan para verlas sin conexión
const LECTURAS = ['profile_stats', 'leaderboard', 'mis_avisos', 'mis_conversaciones', 'estado_encuentro', 'puedo_etiquetar',
  'puedo_escribir', 'comparte_grupo_conmigo', 'vitrina', 'uso_plan'];

/* ---------- pequeña base de datos del trabajador ---------- */
function bd() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('cg-sw', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('fotos', { keyPath: 'k' }); r.result.createObjectStore('ajustes', { keyPath: 'k' }); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function op(tienda, modo, fn) {
  const db = await bd();
  return new Promise((res, rej) => {
    const tx = db.transaction(tienda, modo), st = tx.objectStore(tienda);
    let out; const r = fn(st); if (r) r.onsuccess = () => { out = r.result; };
    tx.oncomplete = () => { db.close(); res(out); }; tx.onerror = () => { db.close(); rej(tx.error); };
  });
}
const leerAjuste = (k, def) => op('ajustes', 'readonly', (st) => st.get(k)).then((x) => (x ? x.v : def)).catch(() => def);
const ponerAjuste = (k, v) => op('ajustes', 'readwrite', (st) => st.put({ k, v })).catch(() => null);

/* ---------- instalar y activar ---------- */
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE_APP);
    await c.addAll(ARCHIVOS.map((u) => new Request(u, { cache: 'reload' })));
    await Promise.all(EXTERNOS.map((u) => fetch(u, { mode: 'cors' }).then((r) => (r.ok ? c.put(u, r) : null)).catch(() => null)));
  })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('cg-app-') && k !== CACHE_APP) await caches.delete(k);
    await self.clients.claim();
  })());
});

/* ---------- respuestas ---------- */
const clave = (url) => { const u = new URL(url); u.search = ''; u.hash = ''; return u.toString(); };
function rutaFoto(url) {
  const m = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/(fotos|privadas)\/(.+)$/);
  return m ? { almacen: m[1], ruta: decodeURIComponent(m[2]) } : null;
}
async function deCache(nombre, k) { const c = await caches.open(nombre); return c.match(k); }

async function appPrimero(req) {
  const c = await caches.open(CACHE_APP);
  const k = req.mode === 'navigate' ? './' : req;
  const r = await c.match(k, { ignoreSearch: req.mode === 'navigate' });
  if (r) return r;
  return fetch(req);
}
async function cachePrimero(req, nombre, tope) {
  const k = clave(req.url);
  const ya = await deCache(nombre, k);
  if (ya) return ya;
  let r;
  // con CORS para poder guardar la copia; si el servidor no lo permite, se pide como siempre (sin copia)
  try { r = await fetch(req.url, { mode: 'cors', credentials: 'omit' }); } catch (e) { return fetch(req); }
  if (r.ok) {
    const c = await caches.open(nombre);
    await c.put(k, r.clone());
    if (tope) recortarCuenta(nombre, tope);
  }
  return r;
}
let recortando = false;
async function recortarCuenta(nombre, tope) {
  if (recortando) return; recortando = true;
  try {
    const c = await caches.open(nombre), ks = await c.keys();
    if (ks.length > tope) for (const k of ks.slice(0, ks.length - Math.floor(tope * 0.9))) await c.delete(k);
  } finally { recortando = false; }
}
// Red primero; si no hay red (o tarda demasiado), lo último guardado
async function redPrimero(req, k, guardar) {
  const c = await caches.open(CACHE_DATOS);
  const red = fetch(req).then(async (r) => { if (r.ok && guardar) await c.put(k, r.clone()); return r; });
  red.catch(() => null); // si la red falla después de responder con la copia, no pasa nada
  const espera = new Promise((res) => setTimeout(() => res(null), ESPERA_RED_MS));
  try {
    const r = await Promise.race([red, espera]);
    if (r) return r;
    const g = await c.match(k);
    return g || await red;
  } catch (err) {
    const g = await c.match(k);
    if (g) return g;
    throw err;
  }
}
// Las copias de datos son de cada cuenta: la clave lleva a la persona; sin persona no se guarda nada
async function datos(req, k) {
  const uid = await leerAjuste('uid', null);
  if (!uid) return fetch(req);
  return redPrimero(req, `${k}${k.includes('?') ? '&' : '?'}__u=${uid}`, true);
}
async function fotos(req, url) {
  const f = rutaFoto(url), k = clave(req.url);
  const c = await caches.open(CACHE_FOTOS);
  const ya = await c.match(k);
  if (ya) { op('fotos', 'readwrite', (st) => st.get(k)).then((m) => m && op('fotos', 'readwrite', (st) => st.put(Object.assign(m, { at: Date.now() })))).catch(() => null); return ya; }
  let r;
  try { r = await fetch(req.url, { mode: 'cors', credentials: 'omit' }); } catch (e) { return fetch(req); }
  if (r.ok && f) {
    const uid = await leerAjuste('uid', null), si = await leerAjuste('fotos', true);
    const prio = /(^|\/)enc\//.test(f.ruta) ? 2 : (uid && f.ruta.startsWith(uid + '/') ? 1 : 0);
    if (uid && (si || prio === 2)) {
      const blob = await r.clone().blob();
      await c.put(k, new Response(blob, { headers: { 'Content-Type': r.headers.get('Content-Type') || blob.type } }));
      await op('fotos', 'readwrite', (st) => st.put({ k, size: blob.size, at: Date.now(), prio }));
      recortarFotos();
    }
  }
  return r;
}
let limpiando = false;
async function recortarFotos() {
  if (limpiando) return; limpiando = true;
  try {
    const lista = await op('fotos', 'readonly', (st) => st.getAll()) || [];
    let total = lista.reduce((n, x) => n + (x.size || 0), 0);
    if (total <= TOPE_FOTOS) return;
    // primero lo visto hace más tiempo; lo propio y los grupos de encuentro al final
    lista.sort((a, b) => (a.prio - b.prio) || (a.at - b.at));
    const c = await caches.open(CACHE_FOTOS);
    for (const x of lista) {
      if (total <= TOPE_FOTOS * 0.85) break;
      await c.delete(x.k); await op('fotos', 'readwrite', (st) => st.delete(x.k)); total -= x.size || 0;
    }
  } finally { limpiando = false; }
}
async function huella(texto) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto)));
  return Array.from(h.slice(0, 12)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method === 'GET') {
    if (req.mode === 'navigate' && url.origin === self.location.origin) return e.respondWith(appPrimero(req));
    if (url.origin === self.location.origin) return e.respondWith(appPrimero(req));
    if (EXTERNOS.includes(req.url)) return e.respondWith(caches.match(req.url).then((r) => r || fetch(req)));
    if (url.hostname === 'cdn.jsdelivr.net' && url.pathname.includes('/@tabler/icons@') && url.pathname.endsWith('.svg'))
      return e.respondWith(cachePrimero(req, CACHE_ICONOS, 800));
    if (url.hostname === 'tile.openstreetmap.org') return e.respondWith(cachePrimero(req, CACHE_MAPA, TOPE_TESELAS));
    // solo fotos públicas y enlaces temporales; las descargas con sesión (mover una foto) pasan directo
    if (url.origin === SUPA && rutaFoto(url) && !req.headers.get('authorization')) return e.respondWith(fotos(req, url));
    if (url.origin === SUPA && url.pathname.startsWith('/rest/v1/')) return e.respondWith(datos(req, req.url));
    return;
  }
  if (req.method === 'POST' && url.origin === SUPA && url.pathname.startsWith('/rest/v1/rpc/')) {
    const nombre = url.pathname.split('/').pop();
    if (!LECTURAS.includes(nombre)) return;
    e.respondWith((async () => {
      const cuerpo = await req.clone().text();
      return datos(req, `${SUPA}/__cg/${nombre}?h=${await huella(cuerpo)}`);
    })());
  }
});

/* ---------- mensajes de la app ---------- */
async function espacio() {
  const lista = await op('fotos', 'readonly', (st) => st.getAll()).catch(() => []) || [];
  const teselas = (await (await caches.open(CACHE_MAPA)).keys()).length;
  return { fotos: lista.reduce((n, x) => n + (x.size || 0), 0), nFotos: lista.length, teselas, tope: TOPE_FOTOS };
}
async function borrarCopias(todo) {
  await caches.delete(CACHE_FOTOS); await caches.delete(CACHE_MAPA);
  await op('fotos', 'readwrite', (st) => st.clear()).catch(() => null);
  if (todo) { await caches.delete(CACHE_DATOS); await ponerAjuste('uid', null); await ponerAjuste('badge', 0); }
}
self.addEventListener('message', (e) => {
  const d = e.data || {};
  const responder = (x) => { if (e.ports && e.ports[0]) e.ports[0].postMessage(x); };
  e.waitUntil((async () => {
    if (d.tipo === 'saltar') return self.skipWaiting();
    if (d.tipo === 'ajustes') { await ponerAjuste('uid', d.uid || null); await ponerAjuste('fotos', d.fotos !== false); return responder(await espacio()); }
    if (d.tipo === 'espacio') return responder(await espacio());
    if (d.tipo === 'liberar') { await borrarCopias(false); return responder(await espacio()); }
    if (d.tipo === 'salir') { await borrarCopias(true); responder({ ok: true }); return insignia(0); }
    if (d.tipo === 'insignia') { await ponerAjuste('badge', 0); return insignia(0); }
  })());
});

/* ---------- notificaciones ---------- */
// Número sobre el ícono (iPhone con la app instalada); donde no existe, no hace nada
function insignia(n) {
  try {
    const nav = self.navigator;
    if (/HeadlessChrome/.test(nav.userAgent || '')) return; // el navegador de pruebas automáticas no tiene ícono
    if (n && nav.setAppBadge) nav.setAppBadge(n).catch(() => null);
    else if (!n && nav.clearAppBadge) nav.clearAppBadge().catch(() => null);
  } catch (e) { /* sin número */ }
}
function destino(d) {
  if (d.t === 'ayuda' && d.g) return `./#e=${d.g}${d.r ? '.' + d.r : ''}`;
  if (d.t === 'grupo' && d.g) return `./#e=${d.g}`;
  if (d.t === 'mensaje' && d.r) return `./#c=${d.r}`;
  return './#b';
}
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = {}; }
  const tipo = C.PUSH_TEXTOS[d.t] ? d.t : 'aviso';
  const conSonido = tipo === 'ayuda' && d.s === 1;
  const opciones = {
    body: C.PUSH_TEXTOS[tipo], icon: 'icon-192.png', badge: 'icon-192.png', lang: 'es',
    tag: tipo === 'ayuda' || tipo === 'grupo' ? `${tipo}-${d.g || ''}` : tipo,
    renotify: tipo === 'ayuda', requireInteraction: tipo === 'ayuda', silent: !conSonido,
    data: { url: destino(Object.assign({}, d, { t: tipo })) }
  };
  if (conSonido) opciones.vibrate = [300, 150, 300, 150, 300];
  e.waitUntil((async () => {
    const n = (await leerAjuste('badge', 0)) + 1;
    await ponerAjuste('badge', n);
    await self.registration.showNotification('Collector Go', opciones);
    insignia(n);
    for (const c of await self.clients.matchAll({ type: 'window' })) c.postMessage({ tipo: 'push' });
  })());
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of ventanas) {
      if (new URL(c.url).origin === self.location.origin) {
        c.postMessage({ tipo: 'abrir', url });
        return c.focus();
      }
    }
    return self.clients.openWindow(url);
  })());
});
