/* =====================================================================
   Collector Go · AJUSTES
   Casi todos los cambios se hacen aquí, sin tocar app.js.
   ===================================================================== */
window.CONFIG = {
  VERSION: '1.4.0',

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

  // Ubicación exacta: más allá de esta precisión (metros) se considera aproximada
  GPS_PRECISION_MAX: 100,
  PRECISION_TITULO: 'Ubicación aproximada',
  PRECISION_TEXTO: 'Tu teléfono está compartiendo una ubicación aproximada. El hallazgo se guarda igual, con la marca "ubicación aproximada". Para volver a encontrarlo con precisión, activa la ubicación exacta.',
  PRECISION_PASOS: [
    { so: 'iPhone', paso: 'Ajustes → Privacidad y seguridad → Localización → Safari (o Chrome) → activa "Ubicación exacta".' },
    { so: 'Android', paso: 'Ajustes → Ubicación → Permisos de apps → Chrome → elige "Permitir solo mientras se usa la app" y activa "Usar ubicación precisa".' }
  ],
  PRECISION_MANUAL: 'También puedes tocar el mapa del registro para marcar el punto exacto a mano.',

  // Comentarios
  COMENTARIO_MAX: 60,        // caracteres (igual que en migracion-1.2.sql)
  COMENTARIOS_POR_PERSONA: 10, // por hallazgo (igual que en migracion-1.2.sql)

  // Emojis sugeridos (pestaña de emoji del selector de íconos)
  EMOJIS: ['🐈', '🐕', '🐦', '🦋', '🐿️', '🐢', '🦎', '🐝', '🌳', '🌵', '🌸', '🌻', '🍄', '🪴', '🏛️', '⛪',
           '🏠', '🚪', '🪟', '🗿', '⛲', '🚗', '🚲', '🛵', '🪑', '🛋️', '💡', '🕰️', '👓', '👒', '👗', '👠',
           '💍', '📚', '💿', '🎨', '🖼️', '🧸', '🏺', '🗝️', '🔔', '👻', '⭐', '❤️', '✨', '🦖'],

  // Reencuentros: distancia para sugerir que ya lo habías registrado
  REENCUENTRO_METROS: 40,
  // "Cerca de mí": radio de búsqueda
  CERCA_METROS: 3000,

  // Títulos y textos de pantallas
  TITULO_COLECCION: 'Colección por categorías',
  TEXTO_CATEGORIAS: 'Elige tu categoría y añade un ícono',

  // Guía completa de uso (botón de ayuda en el mapa). Cada sección: ícono, título y pasos.
  GUIA: [
    { icono: 'map-2', titulo: '¿Qué es Collector Go?',
      texto: 'Un mapa donde guardas lo que encuentras en la calle para coleccionarlo y volver a encontrarlo. Cada persona arma hasta 5 colecciones por categoría: gatos, puertas, letreros, lo que quieras.' },
    { icono: 'camera', titulo: 'Registrar un hallazgo',
      pasos: ['Toca la cámara del centro, abajo.', 'Toma la foto o elígela de tu galería. Si quieres, toca las tijeras para quitar el fondo.',
              'Elige la categoría (o un grupo) y ponle un nombre.', 'Revisa el punto en el mapa: puedes tocarlo para corregirlo.', 'Toca Guardar y celebra.'] },
    { icono: 'repeat', titulo: 'Volver a verlo (reencuentros)',
      pasos: ['Regístralo con el mismo nombre en la misma categoría: la app te pregunta si es el mismo.',
              'O abre su ficha y toca el botón de flechas.', 'Cada reencuentro suma una foto, una fecha y un punto a su historia.',
              'Si registraste dos veces lo mismo, edita el nombre de uno igual al otro y la app los junta.'] },
    { icono: 'route', titulo: 'Volver a encontrarlo en la calle',
      pasos: ['Abre su ficha y toca el botón de ruta: se abre el camino en el mapa de tu teléfono.',
              'En el mapa, el botón de caminar muestra lo que hay cerca de ti, ordenado por distancia.'] },
    { icono: 'cards', titulo: 'Tu colección y tus categorías',
      pasos: ['La pestaña de tarjetas muestra todo lo que has registrado, por categoría.', 'El lápiz abre tus categorías: edítalas, bórralas o crea nuevas (máximo 5).',
              'Cada categoría lleva un ícono: elige uno de las tres pestañas, búscalo por nombre o usa un emoji.'] },
    { icono: 'lock', titulo: 'Público o privado',
      texto: 'Al registrar eliges el ojo (público: lo ve la comunidad) o el candado (privado: solo tú). Lo de un grupo privado solo lo ven sus miembros.' },
    { icono: 'layout-grid', titulo: 'Muro, seguir y reacciones',
      pasos: ['El Muro muestra lo más reciente. Arriba filtras: todos, personas que sigues o un grupo.', 'Abre un perfil y toca el botón de seguir.'] },
    { icono: 'volume-off', titulo: 'Silenciar',
      texto: 'Si no quieres ver el contenido de alguien, o de un grupo del que no formas parte, abre su perfil y toca silenciar. Deja de aparecer en tu Muro y tu mapa; no se le avisa. No es posible silenciar a quienes comparten un grupo contigo.' },
    { icono: 'users', titulo: 'Grupos',
      pasos: ['En tu colección, abajo, toca + para crear un grupo público o privado.', 'Invita por WhatsApp: quien abra el enlace y entre con Google queda dentro.',
              'Todos los miembros agregan hallazgos y reencuentros al mismo mapa. Cada grupo tiene su tabla.'] },
    { icono: 'medal', titulo: 'Medallas y récords',
      texto: 'Ganas medallas por cantidad en cada categoría, por colonias exploradas, por semanas seguidas y por reencuentros. Toca una medalla para ver cuánto te falta. La copa muestra la tabla general.' },
    { icono: 'current-location', titulo: 'Ubicación',
      texto: 'La app guarda el punto de cada hallazgo. Puedes compartir la ubicación exacta o la aproximada; lo aproximado queda marcado y puedes corregirlo tocando el mapa.' },
    { icono: 'brand-whatsapp', titulo: 'Compartir',
      texto: 'En la ficha, el botón de WhatsApp crea una tarjeta con la foto de tu hallazgo para enviarla.' },
    { icono: 'hand-finger', titulo: '¿Qué significa cada ícono?',
      texto: 'Mantén presionado cualquier botón y aparece su nombre.' }
  ],
  // Privacidad: la pantalla de entrada muestra DATOS; la guía del mapa agrega DATOS_EXTRA
  DATOS_TITULO: '¿Qué pasa con mis datos?',
  DATOS: [
    'Guardamos lo necesario para que la app funcione: tu nombre, frase y avatar; tu correo de Google, que solo sirve para entrar; y de cada hallazgo la foto, el nombre, la nota, la fecha y la ubicación. También a quién sigues, tus grupos y tus reacciones.',
    'Tu nombre, frase y avatar los ve cualquier persona. Tu correo no aparece en la app; solo lo ve la administradora en el panel de la base de datos.',
    'Lo público, incluida su ubicación, lo ve cualquier persona. Lo que marcas con candado solo lo ves tú. Lo de un grupo privado solo lo ven sus miembros.',
    'Los datos y las fotos se guardan en Supabase. Google solo confirma quién eres al entrar. Para saber el nombre de la colonia, la app envía las coordenadas a OpenStreetMap, que también dibuja el mapa. El recorte de fondo se hace en tu teléfono.',
    'No vendemos tus datos ni hay publicidad.',
    'Puedes borrar cualquier hallazgo cuando quieras. "Borrar mi cuenta", en tu perfil, elimina tu perfil, tus hallazgos y tus fotos.',
    'La administradora puede quitar contenido público que alguien reporte y bloquear cuentas que no respeten la comunidad.'
  ],
  DATOS_EXTRA: [
    'Los comentarios los ve cualquier persona que pueda ver el hallazgo. Puedes borrar los tuyos, y quien registró el hallazgo también puede borrarlos.'
  ],

  // Celebraciones (solo visuales: sin sonido ni vibración)
  CELEBRACION_MS: 1500,
  CONFETI_COLORES: ['#C4532F', '#6E7B3A', '#D9A21B', '#2E2A26', '#3F6E73', '#F3EBDD'],

  // Mensaje que acompaña lo que se comparte por WhatsApp
  WHATSAPP_TEXTO: 'Mira mi hallazgo en Collector Go',
  WHATSAPP_INVITACION: 'Te invito a mi grupo en Collector Go',
  // Compartir perfil: vitrina de fotos públicas por categoría
  WHATSAPP_VITRINA: 'Mira mi colección en Collector Go',
  WHATSAPP_VITRINA_DE: 'Mira la colección de {nombre} en Collector Go',
  VITRINA_INVITACION: 'Esto es solo una parte. Únete a la comunidad de hallazgos para ver dónde se encontró cada cosa, seguir colecciones y empezar la tuya.',
  VITRINA_BOTON: 'Unirme a la comunidad',
  VITRINA_VACIA: 'Aún no hay fotos públicas',

  // Silenciar
  SILENCIAR_CONFIRMAR: '¿Silenciar? Deja de aparecer en tu Muro y tu mapa. No se le avisa.',
  SILENCIADO_LISTO: 'Silenciado',
  SILENCIO_QUITADO: 'Ya no está silenciado',
  SILENCIADOS_VACIO: 'No has silenciado a nadie',

  // Avisos dentro de la app (solo con la app abierta) cuando reaccionan, comentan o vuelven a ver tus hallazgos.
  // Sin sonido ni vibración.
  AVISOS_CADA_MS: 60000,   // cada cuánto se revisa si hay avisos nuevos
  AVISO_MS: 6000,          // cuánto dura la notificación en pantalla
  AVISOS_NUEVOS: 'Tienes {n} avisos nuevos',
  AVISOS_VACIO: 'Aquí verás quién reacciona, comenta o vuelve a ver tus hallazgos',

  // Buzón de peticiones a la administradora
  BUZON_MAX: 500,              // caracteres (igual que en migracion-1.4.sql)
  BUZON_RESPUESTA_MAX: 300,
  BUZON_TEXTO: 'Cuéntanos un error o una idea para mejorar. Solo lo ve la administradora.',
  BUZON_PISTA: '¿Qué pasó o qué te gustaría?',
  BUZON_ENVIADO: 'Mensaje enviado. Gracias',
  BUZON_MIS: 'Tus mensajes',
  BUZON_TIPOS: [
    { id: 'error', icono: 'bug', nombre: 'Error' },
    { id: 'mejora', icono: 'bulb', nombre: 'Mejora' },
    { id: 'otro', icono: 'dots', nombre: 'Otro' }
  ],
  BUZON_ESTADOS: {
    recibido: { icono: 'mail', nombre: 'Recibido' },
    revision: { icono: 'progress', nombre: 'En revisión' },
    resuelto: { icono: 'circle-check', nombre: 'Resuelto' }
  },

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
    mas: 'Cargar más', dudas: 'Cómo funciona', privacidad: 'Privacidad de datos', seguir: 'Seguir', dejar_seguir: 'Dejar de seguir',
    grupo_nuevo: 'Crear grupo', invitar: 'Invitar por WhatsApp', salir_grupo: 'Salir del grupo', grupo_publico: 'Grupo público',
    grupo_privado: 'Grupo privado', comentar: 'Enviar comentario', borrar_comentario: 'Borrar comentario', nueva_categoria: 'Nueva categoría', borrar_cuenta: 'Borrar mi cuenta', buscar: 'Buscar ícono', emoji: 'Usar un emoji',
    silenciar: 'Silenciar', quitar_silencio: 'Quitar silencio', silenciado: 'silenciado', silenciados: 'Silenciados',
    buzon: 'Buzón: errores e ideas', captura: 'Agregar captura de pantalla (opcional)', quitar_captura: 'Quitar captura',
    enviar: 'Enviar', responder: 'Guardar respuesta', ver_perfil: 'Ver perfil', avisos: 'Avisos', descargar: 'Descargar imagen'
  }
};
