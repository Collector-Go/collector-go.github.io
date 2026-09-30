/* =====================================================================
   Collector Go · AJUSTES
   Casi todos los cambios se hacen aquí, sin tocar app.js.
   ===================================================================== */
window.CONFIG = {
  VERSION: '1.1.0',

  // Datos de tu proyecto de Supabase (Settings → API). Son públicos por
  // diseño: la seguridad la dan las reglas de la base de datos.
  SUPABASE_URL: 'https://kkgnsylkmjltuphyetss.supabase.co',
  SUPABASE_KEY: 'sb_publishable_5EeawmI8dhBMhH_ZIt8szg_xmhRitx8',

  // Texto bajo el logo en la pantalla de entrada
  LEMA: 'Mapa de hallazgos colaborativo',

  // Límite de categorías por perfil (igual que en schema.sql). Los grupos van aparte.
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
  // Colores que se pueden elegir para categorías, grupos y avatares
  COLORES_CATEGORIA: ['#C4532F', '#6E7B3A', '#D9A21B', '#2E2A26', '#3F6E73', '#8A5A44', '#7A4E7E', '#5C8A6E'],

  // Íconos (colección abierta Tabler Icons, se carga solo lo que se usa)
  ICONOS_URL: 'https://cdn.jsdelivr.net/npm/@tabler/icons@3.48.0/icons/outline/',
  // Lista completa para el buscador (se descarga solo al buscar)
  ICONOS_LISTA_URL: 'https://cdn.jsdelivr.net/npm/@tabler/icons@3.48.0/icons.json',

  // Selector de íconos en tres grupos
  ICONOS_GRUPOS: [
    { id: 'animales', icono: 'paw', nombre: 'Animales',
      iconos: ['cat', 'dog', 'paw', 'fish', 'feather', 'butterfly', 'bug', 'spider', 'horse', 'pig', 'deer', 'bat'] },
    { id: 'cosas', icono: 'armchair', nombre: 'Cosas y plantas',
      iconos: ['armchair', 'lamp', 'bulb', 'clock', 'eyeglass', 'hanger', 'shirt', 'shoe', 'bottle', 'coffee', 'book', 'vinyl',
               'music', 'palette', 'brush', 'spray', 'key', 'bell', 'diamond', 'umbrella', 'camera', 'car', 'bike', 'motorbike',
               'bus', 'tree', 'trees', 'plant', 'flower', 'leaf', 'cactus', 'mushroom'] },
    { id: 'lugares', icono: 'building', nombre: 'Lugares',
      iconos: ['building', 'home', 'building-church', 'building-store', 'building-castle', 'building-bridge', 'building-arch',
               'building-monument', 'building-skyscraper', 'building-lighthouse', 'building-factory', 'building-community',
               'door', 'window', 'stairs', 'fountain', 'mailbox', 'sign-right', 'road', 'mountain', 'beach', 'tent', 'world', 'map-pin'] }
  ],
  ICONOS_AVATAR: ['user', 'cat', 'dog', 'ghost', 'rocket', 'flower', 'crown', 'diamond', 'star', 'palette', 'camera', 'sparkles'],

  // Palabras en español para el buscador de íconos (la biblioteca está en inglés)
  DICCIONARIO: {
    gato: 'cat', gatos: 'cat', michi: 'cat', perro: 'dog', perros: 'dog', huella: 'paw', pata: 'paw', pez: 'fish', peces: 'fish',
    pajaro: 'bird feather', pajaros: 'bird feather', ave: 'bird feather', aves: 'bird feather', paloma: 'bird feather', pluma: 'feather',
    mariposa: 'butterfly', insecto: 'bug', bicho: 'bug', arana: 'spider', caballo: 'horse', cerdo: 'pig', puerco: 'pig', venado: 'deer',
    murcielago: 'bat', raton: 'mouse', conejo: 'rabbit', tortuga: 'turtle', vaca: 'cow', pato: 'duck', abeja: 'bee', caracol: 'snail',
    hueso: 'bone', animal: 'paw pet', mascota: 'pet paw',
    arbol: 'tree', arboles: 'trees', planta: 'plant', plantas: 'plant', flor: 'flower', flores: 'flower', hoja: 'leaf', hojas: 'leaf',
    cactus: 'cactus', hongo: 'mushroom', hongos: 'mushroom', semilla: 'seed', jardin: 'garden plant', maceta: 'plant',
    edificio: 'building', edificios: 'building', casa: 'home house', casas: 'home house', iglesia: 'church', templo: 'church',
    tienda: 'store shop', mercado: 'store market', castillo: 'castle', puente: 'bridge', arco: 'arch', monumento: 'monument',
    rascacielos: 'skyscraper', faro: 'lighthouse', fabrica: 'factory', puerta: 'door', puertas: 'door', ventana: 'window',
    ventanas: 'window', escalera: 'stairs', escaleras: 'stairs', fuente: 'fountain', buzon: 'mailbox', letrero: 'sign',
    anuncio: 'sign ad', calle: 'road street', camino: 'road', montana: 'mountain', playa: 'beach', parque: 'trees park',
    mundo: 'world', lugar: 'map-pin', mapa: 'map', museo: 'building-museum', escuela: 'school', hospital: 'hospital',
    estadio: 'stadium', banca: 'bench', estatua: 'statue monument', mural: 'palette paint', grafiti: 'spray', graffiti: 'spray',
    auto: 'car', autos: 'car', carro: 'car', coche: 'car', bici: 'bike', bicicleta: 'bike', moto: 'motorbike', motocicleta: 'motorbike',
    autobus: 'bus', camion: 'truck bus', tren: 'train', avion: 'plane', barco: 'ship boat', patineta: 'skateboard',
    sillon: 'armchair', silla: 'chair armchair', sofa: 'sofa armchair', mesa: 'table', lampara: 'lamp', foco: 'bulb', luz: 'bulb lamp',
    reloj: 'clock', lentes: 'eyeglass glasses', gafas: 'eyeglass', anteojos: 'eyeglass', gancho: 'hanger', ropa: 'shirt hanger',
    camisa: 'shirt', playera: 'shirt', vestido: 'shirt hanger', zapato: 'shoe', zapatos: 'shoe', tenis: 'shoe', sombrero: 'hat',
    gorra: 'hat', bolsa: 'bag shopping-bag', bolso: 'bag', botella: 'bottle', taza: 'coffee cup', cafe: 'coffee', vaso: 'glass cup',
    copa: 'glass', plato: 'tools-kitchen', cocina: 'tools-kitchen', libro: 'book', libros: 'book', disco: 'vinyl disc', vinilo: 'vinyl',
    musica: 'music', guitarra: 'guitar', piano: 'piano', radio: 'radio', television: 'device-tv', tele: 'device-tv', telefono: 'phone',
    camara: 'camera', foto: 'photo camera', paleta: 'palette', pintura: 'palette paint brush', pincel: 'brush', aerosol: 'spray',
    llave: 'key', llaves: 'key', campana: 'bell', diamante: 'diamond', joya: 'diamond jewelry', joyas: 'diamond jewelry',
    anillo: 'diamond ring', collar: 'diamond', paraguas: 'umbrella', sombrilla: 'umbrella', juguete: 'toy', juguetes: 'toy',
    muneca: 'toy', pelota: 'ball', globo: 'balloon', vela: 'candle', espejo: 'mirror', jarron: 'vase', florero: 'vase',
    maleta: 'luggage briefcase', caja: 'box', regalo: 'gift', carta: 'mail letter', sobre: 'mail', fantasma: 'ghost', cohete: 'rocket',
    estrella: 'star', corazon: 'heart', luna: 'moon', sol: 'sun', nube: 'cloud', lluvia: 'cloud-rain', fuego: 'flame',
    comida: 'tools-kitchen food', pan: 'bread', pizza: 'pizza', helado: 'ice-cream', fruta: 'apple', manzana: 'apple',
    herramienta: 'tool', martillo: 'hammer', tijeras: 'scissors', basura: 'trash', bandera: 'flag', corona: 'crown'
  },

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
  // Títulos de cada fila de medallas
  TITULOS_MEDALLAS: {
    col: 'Colonias exploradas',
    racha: 'Racha semanal',
    reen: 'Reencuentros'
  },

  // Fotos (tamaño máximo en pixeles y calidad 0–1)
  FOTO_LADO: 1080,
  FOTO_CALIDAD: 0.72,
  MINIATURA_LADO: 320,
  MINIATURA_CALIDAD: 0.7,
  // Margen que se deja alrededor del sujeto al recortar el fondo (0.08 = 8 %)
  RECORTE_MARGEN: 0.08,

  // Recorte de fondo (se descarga solo al usarlo)
  RECORTE_URL: 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm',

  // Reencuentros: distancia para sugerir que ya lo habías registrado
  REENCUENTRO_METROS: 40,
  // "Cerca de mí": radio de búsqueda
  CERCA_METROS: 3000,

  // Sección de dudas (pantalla de entrada y perfil)
  DUDAS: [
    { p: '¿Qué es Collector Go?', r: 'Un mapa donde guardas lo que encuentras en la calle para coleccionarlo y volver a encontrarlo.' },
    { p: '¿Cómo registro un hallazgo?', r: 'Toca la cámara, toma la foto, elige la categoría, ponle nombre y guarda. La ubicación se guarda sola.' },
    { p: '¿Y si lo vuelvo a ver?', r: 'Regístralo con el mismo nombre en la misma categoría. La app te pregunta si es el mismo y agrega la foto a su historia.' },
    { p: '¿Quién ve lo que registro?', r: 'Lo público lo ve la comunidad. Lo que marcas con candado solo lo ves tú.' },
    { p: '¿Cómo vuelvo a un hallazgo?', r: 'Abre su ficha y toca el botón de ruta.' },
    { p: '¿Qué son las medallas?', r: 'Premios por coleccionar: por cantidad en cada categoría, por colonias exploradas, por semanas seguidas y por reencuentros. Toca una para ver cuánto te falta.' },
    { p: '¿Cómo me uno a un grupo?', r: 'Abre el enlace de invitación que te mandaron por WhatsApp y entra con Google.' },
    { p: '¿Qué significa cada ícono?', r: 'Mantén presionado cualquier botón y aparece su nombre.' }
  ],
  DATOS_TITULO: '¿Qué pasa con mis datos?',
  DATOS: [
    'Guardamos lo necesario para que la app funcione: tu nombre, frase y avatar; tu correo de Google, que solo sirve para entrar; y de cada hallazgo la foto, el nombre, la nota, la fecha y la ubicación exacta. También a quién sigues, tus grupos y tus reacciones.',
    'Tu nombre, frase y avatar los ve cualquier persona con cuenta. Tu correo no aparece en la app; solo lo ve la administradora en el panel de la base de datos.',
    'Lo público, incluida su ubicación exacta, lo ve cualquier persona con cuenta. Lo que marcas con candado solo lo ves tú. Lo de un grupo privado solo lo ven sus miembros.',
    'Los datos y las fotos se guardan en Supabase. Google solo confirma quién eres al entrar. Para saber el nombre de la colonia, la app envía las coordenadas a OpenStreetMap, que también dibuja el mapa. El recorte de fondo se hace en tu teléfono.',
    'No vendemos tus datos ni hay publicidad.',
    'Puedes borrar cualquier hallazgo cuando quieras. "Borrar mi cuenta", en tu perfil, elimina tu perfil, tus hallazgos y tus fotos.',
    'La administradora puede quitar contenido público que alguien reporte y bloquear cuentas que no respeten la comunidad.'
  ],

  // Mensaje que acompaña lo que se comparte por WhatsApp
  WHATSAPP_TEXTO: 'Mira mi hallazgo en Collector Go',
  WHATSAPP_INVITACION: 'Te invito a mi grupo en Collector Go',

  // Textos de ayuda (aparecen al mantener presionado un ícono)
  AYUDA: {
    mapa: 'Mapa', muro: 'Muro', nuevo: 'Registrar hallazgo', coleccion: 'Mi colección', perfil: 'Perfil',
    ubicar: 'Mi ubicación', cerca: 'Cerca de mí', filtro_mios: 'Solo lo mío', filtro_todos: 'Todo', filtro_siguiendo: 'Personas que sigo',
    ruta: 'Cómo llegar', reencuentro: 'Lo volví a ver', editar: 'Editar', borrar: 'Borrar', avisar: 'Avisar a moderación',
    compartir: 'Compartir', whatsapp: 'Compartir por WhatsApp', privado: 'Privado: solo tú lo ves', publico: 'Público',
    recortar: 'Recortar fondo', original: 'Usar foto original', tabla: 'Tabla general', admin: 'Moderación', salir: 'Cerrar sesión',
    camara: 'Tomar foto', galeria: 'Elegir de la galería', sin_foto: 'Solo marcar, sin foto', guardar: 'Guardar', cerrar: 'Cerrar', atras: 'Atrás',
    ver_mapa: 'Ver en el mapa', categorias: 'Editar categorías', gps: 'Volver a leer el GPS',
    bloquear: 'Bloquear cuenta', desbloquear: 'Desbloquear', descartar: 'Descartar aviso', ver: 'Ver',
    mas: 'Cargar más', dudas: 'Dudas', seguir: 'Seguir', dejar_seguir: 'Dejar de seguir',
    grupo_nuevo: 'Crear grupo', invitar: 'Invitar por WhatsApp', salir_grupo: 'Salir del grupo', grupo_publico: 'Grupo público',
    grupo_privado: 'Grupo privado', borrar_cuenta: 'Borrar mi cuenta', buscar: 'Buscar ícono', emoji: 'Usar un emoji'
  }
};
