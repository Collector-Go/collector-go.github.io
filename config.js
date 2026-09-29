/* =====================================================================
   Collector Go · AJUSTES
   Casi todos los cambios se hacen aquí, sin tocar app.js.
   ===================================================================== */
window.CONFIG = {
  VERSION: '1.0.0',

  // Datos de tu proyecto de Supabase (Settings → API). Son públicos por
  // diseño: la seguridad la dan las reglas de la base de datos.
  SUPABASE_URL: 'https://kkgnsylkmjltuphyetss.supabase.co',
  SUPABASE_KEY: 'sb_publishable_5EeawmI8dhBMhH_ZIt8szg_xmhRitx8',

  // Límite de categorías por perfil (igual que en schema.sql)
  MAX_CATEGORIAS: 5,

  // Zona horaria para rachas y "mejor día"
  ZONA_HORARIA: 'America/Mexico_City',

  // Mapa: centro inicial si no hay GPS
  MAPA_CENTRO: [19.4326, -99.1332],
  MAPA_ZOOM: 14,
  // Tono "mapa antiguo" sobre el mapa de OpenStreetMap
  MAPA_FILTRO: 'sepia(.45) saturate(.75) contrast(.95) brightness(1.02)',

  // Paleta Mapa antiguo
  COLORES: {
    papel: '#F3EBDD',
    tinta: '#2E2A26',
    terracota: '#C4532F',
    oliva: '#6E7B3A',
    mostaza: '#D9A21B'
  },
  // Colores que se pueden elegir para categorías y avatares
  COLORES_CATEGORIA: ['#C4532F', '#6E7B3A', '#D9A21B', '#2E2A26', '#3F6E73', '#8A5A44', '#7A4E7E', '#5C8A6E'],

  // Íconos (colección abierta Tabler Icons, se carga solo lo que se usa)
  ICONOS_URL: 'https://cdn.jsdelivr.net/npm/@tabler/icons@3.48.0/icons/outline/',
  ICONOS_CATEGORIA: [
    'cat', 'dog', 'paw', 'fish', 'feather', 'butterfly',
    'tree', 'plant', 'flower', 'leaf', 'cactus', 'mushroom',
    'building', 'home', 'building-church', 'building-store', 'building-castle', 'building-bridge',
    'building-arch', 'door', 'window', 'stairs', 'fountain', 'mailbox',
    'car', 'bike', 'motorbike', 'bus', 'lamp', 'bulb',
    'armchair', 'bottle', 'coffee', 'shirt', 'hanger', 'shoe',
    'book', 'vinyl', 'music', 'palette', 'brush', 'spray',
    'sign-right', 'diamond', 'key', 'bell', 'clock', 'ghost',
    'rocket', 'sparkles', 'star', 'heart'
  ],
  ICONOS_AVATAR: ['user', 'cat', 'dog', 'ghost', 'rocket', 'flower', 'crown', 'diamond', 'star', 'palette', 'camera', 'sparkles'],

  // Reacciones del muro (solo íconos)
  REACCIONES: [
    { tipo: 'heart', icono: 'heart', ayuda: 'Me encanta' },
    { tipo: 'star',  icono: 'star',  ayuda: 'Joya' },
    { tipo: 'flame', icono: 'flame', ayuda: 'Increíble' },
    { tipo: 'eye',   icono: 'eye',   ayuda: 'Yo también lo vi' }
  ],

  // Metas del juego
  METAS_CATEGORIA: [1, 5, 10, 25, 50, 100],
  METAS_COLONIAS: [1, 3, 5, 10, 20, 50],
  METAS_RACHA_SEMANAS: [2, 4, 8, 12, 26, 52],
  METAS_REENCUENTROS: [1, 5, 20, 50],

  // Fotos (tamaño máximo en pixeles y calidad 0–1)
  FOTO_LADO: 1080,
  FOTO_CALIDAD: 0.72,
  MINIATURA_LADO: 320,
  MINIATURA_CALIDAD: 0.7,

  // Recorte de fondo (se descarga solo al usarlo)
  RECORTE_URL: 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm',

  // Reencuentros: distancia para sugerir que ya lo habías registrado
  REENCUENTRO_METROS: 40,
  // "Cerca de mí": radio de búsqueda
  CERCA_METROS: 3000,

  // Textos de ayuda (aparecen al mantener presionado un ícono)
  AYUDA: {
    mapa: 'Mapa', muro: 'Muro', nuevo: 'Registrar hallazgo', coleccion: 'Mi colección', perfil: 'Perfil',
    ubicar: 'Mi ubicación', cerca: 'Cerca de mí', filtro_mios: 'Solo lo mío', filtro_todos: 'Todo',
    ruta: 'Cómo llegar', reencuentro: 'Lo volví a ver', editar: 'Editar', borrar: 'Borrar', avisar: 'Avisar a moderación',
    compartir: 'Compartir', privado: 'Privado: solo tú lo ves', publico: 'Público', recortar: 'Recortar fondo',
    original: 'Usar foto original', tabla: 'Tabla general', admin: 'Moderación', salir: 'Cerrar sesión',
    camara: 'Tomar foto', galeria: 'Elegir de la galería', guardar: 'Guardar', cerrar: 'Cerrar', atras: 'Atrás',
    ver_mapa: 'Ver en el mapa', categorias: 'Editar categorías', gps: 'Volver a leer el GPS',
    bloquear: 'Bloquear cuenta', desbloquear: 'Desbloquear', descartar: 'Descartar aviso', ver: 'Ver',
    mas: 'Cargar más'
  }
};
