/* =====================================================================
   Collector Go · AJUSTES
   Casi todos los cambios se hacen aquí, sin tocar app.js.
   ===================================================================== */
window.CONFIG = {
  VERSION: '1.9.6',

  // Datos de tu proyecto de Supabase (Settings → API). Son públicos por
  // diseño: la seguridad la dan las reglas de la base de datos.
  SUPABASE_URL: 'https://kkgnsylkmjltuphyetss.supabase.co',
  SUPABASE_KEY: 'sb_publishable_5EeawmI8dhBMhH_ZIt8szg_xmhRitx8',

  // Texto bajo el logo en la pantalla de entrada
  LEMA: 'Mapa de hallazgos colaborativo',

  // Colecciones con las que se empieza (igual que en schema.sql); con logros se llega a COLECCIONES_MAX
  MAX_CATEGORIAS: 5,
  // Grupos que cada persona puede crear (igual que en migracion-1.8.sql); unirse no tiene límite
  MAX_GRUPOS: 10,

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
  COLORES_CATEGORIA: ['#C4532F', '#6E7B3A', '#D9A21B', '#2E2A26', '#3F6E73', '#8A5A44', '#7A4E7E', '#5C8A6E', '#B5687A', '#4B5C8E'],

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

  // Reacciones a las fotos (ícono; "etiqueta" muestra su nombre a la vista; "ayuda" aparece al mantener presionado)
  REACCIONES: [
    { tipo: 'heart', icono: 'heart',      ayuda: 'Me encanta' },
    { tipo: 'flame', icono: 'flame',      ayuda: 'Increíble' },
    { tipo: 'laugh', icono: 'mood-xd',    ayuda: 'Me da risa' },
    { tipo: 'sad',   icono: 'mood-sad',   ayuda: 'Me entristece' },
    { tipo: 'eye',   icono: 'eye-check',  ayuda: 'Lo vi (solo estando ahí)', etiqueta: 'Lo vi' }
  ],

  // Metas del juego
  METAS_CATEGORIA: [1, 5, 10, 25, 50, 100, 250, 500],
  // Premios en el pin (por categoría y, en los grupos, por persona). Las medallas solo muestran un regalo:
  // el premio se descubre al llegar.
  PREMIOS: {
    10:  { id: 'patito',  nombre: 'un patito' },
    25:  { id: 'brote',   nombre: 'un brote' },
    50:  { id: 'aro',     nombre: 'un aro de oro' },
    100: { id: 'corona',  nombre: 'una corona' },
    250: { id: 'corona2', nombre: 'una corona mayor' },
    500: { id: 'sombrero', nombre: 'un sombrero vaquero' }
  },
  // Colores de premio: solo se ganan (corona, corona mayor y sombrero)
  COLORES_PREMIO: { oro: '#FFC21A', coral: '#FF5A3C', negro: '#1C1917' },
  COLECCIONES_MAX: 15,
  NOMBRES_PREMIO: { oro: 'Oro', coral: 'Coral', negro: 'Negro' },
  PREMIO_GANADO: 'Tus pines de {titulo} ganan {premio}.',
  COLECCION_NUEVA: 'Desbloqueaste una nueva colección: ahora puedes tener {n}.',
  COLECCION_MAXIMO: 'Desbloqueaste tu colección número 15. Llegaste al máximo de colecciones.',
  COLECCION_MAXIMO_CORTO: 'llegaste al máximo de colecciones',
  COLOR_PREMIO_LISTO: 'Color guardado',
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
  FOTO_LADO: 1600,
  FOTO_LADO_RECORTE: 1200,     // fotos con el fondo quitado
  FOTO_PNG_MAX: 1800000,       // en teléfonos sin WebP lo recortado va en PNG; si pesa más, se reduce a 900 px
  FOTO_CALIDAD: 0.82,
  MINIATURA_LADO: 320,
  MINIATURA_CALIDAD: 0.7,
  // Foto mediana del muro (solo hallazgos públicos nuevos): nítida en el teléfono y ~4 veces más ligera que la grande.
  // La ficha sigue mostrando la grande; el mapa y las listas, la miniatura.
  FOTO_LADO_MEDIA: 900,
  FOTO_CALIDAD_MEDIA: 0.8,
  // Qué foto usa el muro: 'mediana' (la mediana; en hallazgos anteriores, la grande) o 'mini' (miniaturas, para ahorrar transferencia)
  MURO_FOTO: 'mediana',
  // Margen que se deja alrededor del sujeto al recortar el fondo (0.08 = 8 %)
  RECORTE_OCUPA: 0.9,          // con el fondo quitado, el objeto ocupa el 90 % del cuadro, centrado
  ENCUADRE_FUENTE: 2400,       // lado máximo de la foto mientras se encuadra
  ENCUADRE_ZOOM_MAX: 4,
  ENCUADRE_PELLIZCO_MIN: 30,   // px entre los dos dedos para tomarlo como pellizco
  AVISO_RAPIDO_TITULO: 'Avisar a mi grupo',
  AVISO_RAPIDO_A: 'Enviar a',
  AVISO_RAPIDO_ENVIAR: 'Enviar',
  AVISO_RAPIDO_ENVIAR_N: 'Enviar a {n} grupos',
  AVISO_RAPIDO_ELIGE: 'Elige al menos un grupo',
  AVISO_RAPIDO_NO_SALIO: 'No se envió a:',
  AVISO_RAPIDO_ESPERA: 'Espera unos segundos y vuelve a intentarlo.',
  AVISO_RAPIDO_SIN_GRUPOS: 'Para avisar rápido, primero crea un grupo de encuentro o únete a uno.',
  CAPA_VACIA: 'Ese grupo aún no tiene nada en el mapa',
  GRUPO_PANEL_PISTA: 'Sube el panel para ver el tablero, los puntos y "Mira esto".',
  GRUPO_PANEL_SUBIR: 'Subir el panel del grupo',
  GRUPO_PANEL_BAJAR: 'Bajar el panel del grupo',
  COL_TODAS: 'Todas',
  COL_HALLAZGOS: 'hallazgos',
  PLEGAR_NOTIF_ACTIVAS: 'activadas, {n} de {t}',
  PLEGAR_NOTIF: { apagadas: 'apagadas', bloqueadas: 'bloqueadas en el teléfono', no: 'no disponibles aquí', iphone: 'instala la app para activarlas' },
  PLEGAR_PENDIENTES: '{n} por subir',
  PLEGAR_ESPACIO: '{mb} MB guardados',
  DEST_COLECCIONES: 'Mis colecciones',
  DEST_GRUPOS: 'Grupos',
  ENC_MODO_MIRA: 'Mira esto',
  ENC_MODO_PUNTO: 'Punto de encuentro',
  VER_MAS: 'Ver más',
  AUSENCIAS_ATENUAR: 2,
  AUSENCIA_OK: 'Quedó anotado que ya no está. Si alguien lo vuelve a ver, se quita.',
  AUSENCIA_LEJOS: 'Para marcar que ya no está, tienes que estar en el lugar. Estás a {d}.',
  AUSENCIA_APROXIMADA: 'Tu teléfono está dando una ubicación aproximada. Activa la ubicación exacta para marcar que ya no está.',
  AUSENCIA_SIN_GPS: 'Activa el GPS para marcar que ya no está',
  AUSENCIA_TENUE: 'Varias personas dicen que ya no está',
  AUSENCIA_HISTORIA: 'Ya no está',
  // Fotos de la comunidad ("Lo vi" y "No está" con foto)
  COL_NOTA_MAX: 60,
  COL_TITULO_VISTO: '¡Lo viste!',
  COL_TITULO_NO_ESTA: 'No está',
  COL_TEXTO_VISTO: 'Suma una foto de hoy (opcional). La verá la comunidad.',
  COL_TEXTO_NO_ESTA: 'Foto del lugar (opcional). Queda en la historia con tu nombre y le avisa a quien lo registró.',
  COL_NOTA: 'Nota (opcional)',
  COL_GUARDAR_VISTO: 'Sumar mi foto',
  COL_GUARDAR_NO_ESTA: 'Guardar foto',
  COL_SIN_FOTO: 'Listo, sin foto',
  COL_FALTA_FOTO: 'Toma o elige una foto',
  COL_SEMANA: 'Una foto por persona en cada hallazgo, cada semana.',
  COL_YA_ESTA_SEMANA: 'Ya sumaste una foto a este hallazgo esta semana.',
  COL_LISTO_VISTO: 'Tu foto se sumó al hallazgo',
  COL_LISTO_NO_ESTA: 'La foto quedó en la historia',
  COL_ETIQUETA: 'Colaboración',
  COL_DE: 'Foto de {n}',
  COL_BORRAR: 'Borrar mi foto',
  COL_BORRAR_CONFIRMAR: '¿Borrar tu foto y tu nota de este hallazgo?',
  COL_BORRADA: 'Tu foto se borró',
  COL_YA_NO_ESTA: 'Esa foto ya no está aquí',
  TIENE_COLABORACIONES: 'Tiene fotos de la comunidad: no puede volverse secreto',
  COL_REPORTAR: 'Reportar foto',
  COL_REPORTAR_TEXTO: 'La foto sigue publicada hasta que la administradora la revise.',
  COL_REPORTAR_MOTIVO: 'Motivo',
  COL_REPORTAR_ENVIAR: 'Enviar a la administradora',
  COL_REPORTE_VACIO: 'Escribe el motivo',
  COL_REPORTE_LISTO: 'Enviado a la administradora',
  COL_REPORTE_YA: 'Ya habías reportado esta foto',
  COL_CELEBRA: '¡La comunidad lo encontró!',
  COL_CELEBRA_TEXTO: '{n} volvió a ver tu {h}',
  COL_MURO: '{n} lo vio de nuevo · hallazgo de {d}',
  COL_HISTORIA_VISTO: 'Visto por {n}',
  COL_MODERACION: 'Fotos de la comunidad reportadas',
  COL_QUITAR: 'Quitar la foto',
  COL_QUITAR_CONFIRMAR: '¿Quitar esta foto de la comunidad? Se borra también su nota.',
  // Hallazgos heredados (traspaso)
  PERFIL_COLECCIONES: 'Colecciones',
  TOP_FOTOS: 'Top de los 7 días',
  TOP_TEXTO: 'Las fotos públicas con más reacciones, "Lo vi" y comentarios esta semana.',
  // 1.9.5 · Campeones
  CAMPEONES_TITULO: 'Campeones',
  CAMPEONES_TABLA: 'Tabla',
  CAMPEONES_HALLAZGOS: 'Hallazgos',
  CAMPEONES_COLONIAS: 'Colonias',
  // 1.9.5 · Muro y búsqueda de personas
  // 1.9.5 · Amistad y fichas en el chat
  AMISTAD_PEDIR: 'Pedir amistad',
  AMISTAD_TEXTO: 'Al aceptar quedan como amigas: pueden conversar, etiquetarse e invitarse a grupos.',
  AMISTAD_MENSAJE: 'Mensaje breve (opcional)',
  AMISTAD_MAX: 140,
  AMISTAD_ENVIAR: 'Enviar solicitud',
  AMISTAD_ENVIADA: 'Solicitud enviada',
  AMISTAD_ENVIADA_OK: 'Solicitud enviada',
  AMISTAD_ACEPTAR: 'Aceptar',
  AMISTAD_ACEPTAR_SUYA: 'Aceptar amistad',
  AMISTAD_LISTA: 'Ahora son amigas',
  AMISTAD_AVISO: '{n} quiere ser tu amiga',
  AMISTAD_SIGUE_PRIMERO: 'Primero síguela para pedirle amistad',
  CHAT_PIDE: 'Para conversar, pídele amistad.',
  CHAT_SIGUE: 'Para conversar, síguela y pídele amistad.',
  CHAT_ENVIADA: 'Tu solicitud de amistad está enviada.',
  CHAT_RECIBIDA: 'Te pidió amistad. Al aceptar pueden conversar.',
  FICHA_ENVIAR: 'Enviar a una amiga',
  FICHA_LINEA: 'Agrega una línea (opcional)',
  FICHA_ENVIADA: 'Enviada',
  FICHA_SIN_AMIGAS: 'Aquí aparecen tus amigas que pueden ver este hallazgo.',
  FICHA_NO_DISPONIBLE: 'Ya no está disponible',
  FICHA_NO_DISPONIBLE_TEXTO: 'La ficha se borró o ya no es pública',
  FICHA_EN_CHAT: 'Ficha',
  FICHA_AVISO: '{n} te mandó una ficha',
  // 1.9.5 · Respuestas del buzón
  RESPUESTA_PISTA: 'Escribe tu respuesta',
  RESPUESTA_ENVIAR: 'Enviar respuesta',
  RESPUESTA_ENVIADA: 'Respondiste:',
  RESPUESTA_LISTA: 'Respuesta enviada. Le llegará un aviso.',
  RESPUESTA_VACIA: 'Escribe la respuesta',
  RESPUESTA_DE_ADMIN: 'Respuesta:',
  RESPUESTA_AVISO: 'La administradora respondió tu mensaje: «{t}»',
  MURO_FALLO: 'No se pudo cargar el Muro.',
  MURO_SIN_SEGUIR: 'Aún no sigues a nadie. Busca a tus amigas por su nombre.',
  BUSCAR_TITULO: 'Buscar personas',
  BUSCAR_CAMPO: 'Nombre',
  BUSCAR_PISTA: 'Escribe el nombre. Con 1 o 2 letras se busca el nombre exacto.',
  BUSCAR_NADA: 'No hay nadie con ese nombre',
  BUSCAR_NADA_CORTO: 'Nadie se llama exactamente así. Escribe 3 letras o más para buscar parecidos.',
  BUSCAR_ESPERA: 'Muchas búsquedas seguidas. Espera un minuto.',
  FALTA_MIGRACION: 'La base de datos necesita la actualización de esta versión. Avisa a la administradora.',
  // 1.9.5 · "Lo vi" ya marcado
  VISTO_MARCADO_TEXTO: 'Ya marcaste que lo viste. Si estás en el lugar, puedes sumar una foto de hoy.',
  VISTO_SUMAR_FOTO: 'Sumar foto de hoy',
  VISTO_QUITAR: 'Quitar "Lo vi"',
  // 1.9.5 · Invitaciones dentro de la app
  INVITAR_BOTON: 'Invitar',
  INVITAR_A: 'Invitar a {g}',
  INVITAR_AMIGAS: 'Tus amigas en la app',
  INVITAR_SIN_AMIGAS: 'Aquí aparecen las personas que se siguen contigo mutuamente y aún no están en el grupo.',
  INVITAR_FUERA: 'Fuera de la app',
  INVITAR_COPIAR: 'Copiar enlace',
  INVITAR_COPIADO: 'Enlace copiado',
  INVITAR_ENVIADA: 'Invitación enviada',
  INVITAR_RECHAZADA: 'La rechazó',
  INVITAR_DE_NUEVO: 'Otra vez',
  INVITAR_LISTO: 'Invitación enviada',
  INVITAR_VETADA: 'Salió por decisión del grupo. Primero readmítela.',
  VETADOS_TITULO: 'Salieron por decisión del grupo',
  VETADOS_TEXTO: 'No pueden volver con el enlace ni con invitación hasta que las readmitas.',
  READMITIR: 'Readmitir',
  READMITIDA: 'Readmitida. Ya puedes invitarla.',
  SACAR_GRUPO_CONFIRMAR: '¿Sacar a esta persona del grupo? No podrá volver hasta que la readmitas. Sus hallazgos en el grupo se quedan.',
  INVITACION_RECIBIDA: '{n} te invitó al grupo {g}',
  INVITACION_RECHAZASTE: 'Rechazaste la invitación de {n} a {g}. Si cambias de opinión, aún puedes unirte.',
  INVITACION_ACEPTO: '{n} aceptó tu invitación a {g}',
  INVITACION_RECHAZO: '{n} rechazó tu invitación a {g}',
  INVITACION_UNIRME: 'Unirme',
  INVITACION_RECHAZAR: 'Rechazar',
  INVITACION_DENTRO: 'Ya eres parte del grupo',
  INVITACION_RECHAZADA_OK: 'Rechazada. Si fue un error, puedes unirte desde el buzón.',
  TOP_VACIO: 'Esta semana todavía no hay fotos con interacción',
  BLOQUEADA_TITULO: 'Tu cuenta está bloqueada',
  BLOQUEADA_TEXTO: 'No puedes usar Collector Go con esta cuenta. Si crees que es un error, habla con quien te invitó.',
  SIN_COLECCION: 'Sin colección',
  COLOR_SIN_COLECCION: '#8A8278',
  SIN_COLECCION_ELEGIR: 'Elige en qué colección guardarlo',
  TRASPASO_AVISO: '{h} ahora es tuyo: {d} borró su registro',
  BORRAR_CONFIRMAR: '¿Borrar "{h}" y toda su historia?',
  BORRAR_CONFIRMAR_COL: '¿Borrar "{h}"? Tiene fotos de la comunidad: seguirá con la siguiente persona que lo retrató, sin tu foto ni tus datos.',
  BORRADO_TRASPASO: 'Borrado. Sigue en la comunidad con otra persona.',
  // Fichas en PDF
  PDF_TITULO: 'Descargar fichas',
  PDF_TEXTO: 'Un PDF con foto, fecha, colonia y coordenadas de cada hallazgo. Se arma en tu teléfono.',
  PDF_ORDEN: 'Orden',
  PDF_ORDENES: [{ id: 'antiguos', nombre: 'Antiguos' }, { id: 'recientes', nombre: 'Recientes' }, { id: 'colonia', nombre: 'Colonia' }, { id: 'persona', nombre: 'Persona' }],
  PDF_CREAR: 'Crear PDF',
  PDF_PREPARANDO: 'Preparando fotos… {i} de {n}',
  PDF_GUARDAR: 'Guardar o compartir',
  PDF_VACIO: 'No hay nada que descargar aquí',
  PDF_LISTO: 'PDF listo',
  PDF_SIN_COLONIA: 'Sin colonia',
  PDF_PIE: 'Descargado de Collector Go el {f}',
  PDF_PESO: 'unos {m} MB',
  ANUNCIO_MAX: 220,
  ANUNCIO_PRIMERO: 'Nueva función: grupos de encuentro. Dinámicas de exploración, organización y emergencias para tu red de personas. Créalos en Colección → Grupos → +.',
  ANUNCIO_NUEVO: 'Nuevo anuncio',
  ANUNCIO_PISTA: 'Lo que quieres contarle a toda la comunidad',
  ANUNCIO_DESTINO: 'Al tocarlo',
  ANUNCIO_SIN_DESTINO: 'Solo se lee',
  ANUNCIO_DESTINO_ENCUENTRO: 'Crear grupo de encuentro',
  ANUNCIO_DURACION: 'Cuánto dura',
  ANUNCIO_DURACIONES: [{ dias: null, nombre: 'Sin fecha de fin' }, { dias: 7, nombre: '1 semana' }, { dias: 30, nombre: '1 mes' }, { dias: 90, nombre: '3 meses' }],
  ANUNCIO_VISTA: 'Así se verá en el buzón',
  ANUNCIO_PUBLICAR: 'Enviar a toda la comunidad',
  ANUNCIO_CONFIRMAR: '¿Enviar este anuncio a toda la comunidad? Llega a su buzón; quien tenga notificaciones recibe "Tienes un aviso nuevo".',
  ANUNCIO_VACIO: 'Escribe el anuncio',
  ANUNCIO_LISTO: 'Anuncio enviado',
  ANUNCIO_LISTA: 'Anuncios enviados',
  ANUNCIO_NINGUNO: 'Aún no has enviado anuncios',
  ANUNCIO_ESTADO: { activo: 'Activo', terminado: 'Terminado', retirado: 'Retirado' },
  ANUNCIO_HASTA: 'hasta el {f}',
  ANUNCIO_SIN_FIN: 'sin fecha de fin',
  ANUNCIO_CAMBIAR: 'Cambiar duración (desde hoy):',
  ANUNCIO_CAMBIADO: 'Duración cambiada',
  ANUNCIO_RETIRAR: 'Retirar anuncio',
  ANUNCIO_RETIRAR_CONFIRMAR: '¿Retirar este anuncio? Sale del buzón de todas las personas.',
  ANUNCIO_RETIRADO: 'Anuncio retirado',
  GALERIA_DE: 'Colección de {c}',
  GALERIA_VACIA: 'Aún no hay hallazgos públicos con foto en esta colección',
  GALERIA_VITRINA: 'Ver toda su vitrina',
  CANDIDATO_PREGUNTA: '¿Lo volviste a ver? Tócalo para sumarlo como reencuentro',
  FONDO_FOTO: '#EADFCB',   // beige de la app detrás de las fotos (mismo tono que --papel2)
  ENCUADRE_PISTA: 'Arrastra para mover y pellizca para acercar o alejar (hasta ver la foto completa). Dos toques: volver al inicio.',
  NOMBRE_PISTA: 'Nombre (Michi naranja)',
  NOTA_PISTA: 'Nota (opcional)',
  PUNTO_PISTA: 'Nombre del punto',
  MIRA_PISTA: '¿Qué hay aquí? (Reparten agua)',
  GPS_A_MANO: 'A mano',
  GPS_SIN: 'Sin GPS',
  GPS_TOCA_MAPA: 'Sin GPS: toca el mapa para marcar',
  GPS_MARCADO_A_MANO: 'Marcado a mano en el mapa. Para volver al GPS, toca el botón del mapa',

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
  COMENTARIOS_POR_PERSONA: 20, // por hallazgo (igual que en migracion-1.6.sql)

  // Emojis sugeridos (pestaña de emoji del selector de íconos)
  EMOJIS: ['🐈', '🐕', '🐦', '🦋', '🐿️', '🐢', '🦎', '🐝', '🌳', '🌵', '🌸', '🌻', '🍄', '🪴', '🏛️', '⛪',
           '🏠', '🚪', '🪟', '🗿', '⛲', '🚗', '🚲', '🛵', '🪑', '🛋️', '💡', '🕰️', '👓', '👒', '👗', '👠',
           '💍', '📚', '💿', '🎨', '🖼️', '🧸', '🏺', '🗝️', '🔔', '👻', '⭐', '❤️', '✨', '🦖'],

  // Instalar la app en el teléfono
  INSTALAR_BOTON: 'Instalar en mi teléfono',
  INSTALAR_FRANJA: 'Instala Collector Go en tu teléfono',
  INSTALAR_LISTO: 'Collector Go quedó instalada',
  INSTALAR_COPIADA: 'Liga copiada. Pégala en Safari o Chrome',
  INSTALAR_COPIAR: 'Copiar la liga',
  INSTALAR_IPHONE: [
    { icono: 'share-2', texto: 'Toca el botón Compartir del navegador (el cuadro con la flecha hacia arriba).' },
    { icono: 'square-plus', texto: 'Elige "Agregar a inicio" y toca Agregar.' },
    { icono: 'device-mobile', texto: 'Collector Go aparece en tu pantalla de inicio como una app.' }
  ],
  INSTALAR_MENU: [
    { icono: 'dots-vertical', texto: 'Toca el menú del navegador (los tres puntos).' },
    { icono: 'square-plus', texto: 'Elige "Instalar app" o "Agregar a la pantalla principal".' },
    { icono: 'device-mobile', texto: 'Collector Go aparece en tu pantalla de inicio como una app.' }
  ],
  INSTALAR_INTERNO: [
    { icono: 'alert-triangle', texto: 'Estás dentro de WhatsApp u otra app, y desde aquí no se puede instalar.' },
    { icono: 'dots-vertical', texto: 'Toca el menú (los tres puntos o el botón de compartir) y elige "Abrir en el navegador".' },
    { icono: 'device-mobile', texto: 'Ya en Safari o Chrome, vuelve a tocar "Instalar en mi teléfono".' }
  ],

  // "¡Lo vi!": solo estando en el lugar (la distancia la comprueba la base de datos)
  VISTO_OK: 'Lo viste en el lugar. Quedó marcado.',
  VISTO_LEJOS: 'Para marcar que lo viste, tienes que estar en el lugar. Estás a {d}.',
  VISTO_APROXIMADA: 'Tu teléfono está dando una ubicación aproximada. Activa la ubicación exacta para marcar que lo viste.',
  VISTO_SIN_GPS: 'Activa el GPS para marcar que lo viste',

  // Quitar una sola foto de la historia de un hallazgo

  // Ir al punto: la guía en el mapa de la app (sin servicios externos)
  LLEGADA_METROS: 15,
  GUIA_BUSCANDO: 'Buscando tu ubicación…',
  GUIA_SIN_GPS: 'Activa el GPS para ver la distancia',
  GUIA_LLEGASTE: 'Llegaste: está a unos pasos',

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
      texto: 'Un mapa donde guardas lo que encuentras en la calle para coleccionarlo y volver a encontrarlo. Empiezas con 5 colecciones por categoría (gatos, puertas, letreros, lo que quieras) y puedes llegar a 15 a medida que crecen.' },
    { icono: 'users', titulo: 'Grupos',
      pasos: ['En tu colección, abajo, toca + para crear un grupo público o privado.', 'Toca "Invitar" para invitar a tus amigas de la app o mandar el enlace por WhatsApp.',
              'Todos los miembros agregan hallazgos y reencuentros al mismo mapa. Cada grupo tiene su tabla.',
              'Puedes crear hasta 10 grupos y unirte a todos los que quieras.'] },
    { icono: 'lifebuoy', titulo: 'Grupos de encuentro',
      texto: 'Un grupo privado y oculto para cuidarse en un viaje, un rally, una marcha, un festival o un sismo. Al crear un grupo, elige "Grupo de encuentro". Se maneja desde el mapa: toca su botón arriba y usa el panel de abajo. El botón de ayuda explica cómo funciona.' },
    { icono: 'camera', titulo: 'Registrar un hallazgo',
      pasos: ['Toca la cámara del centro, abajo.', 'Toma la foto o elígela de tu galería. Encuádrala con los dedos; si quieres, toca las tijeras para quitar el fondo.',
              'Elige la categoría (o un grupo) y ponle un nombre.', 'Toca Guardar. Si el punto no quedó bien, corrígelo en el mapa de abajo antes de guardar.'] },
    { icono: 'repeat', titulo: 'Volver a verlo (reencuentros)',
      pasos: ['Regístralo con el mismo nombre en la misma categoría: la app te pregunta si es el mismo.',
              'O abre su ficha y toca el botón de flechas.', 'Cada reencuentro suma una foto, una fecha y un punto a su historia.',
              'Si registraste dos veces lo mismo, edita el nombre de uno igual al otro y la app los junta.'] },
    { icono: 'navigation', titulo: 'Volver a encontrarlo en la calle',
      pasos: ['Abre su ficha y toca la flecha: el mapa de la app muestra el hallazgo, tu ubicación, la distancia y la dirección (por ejemplo, "120 m al noreste"). Nada sale de la app.',
              'En el mapa, el botón de caminar muestra lo que hay cerca de ti, ordenado por distancia.'] },
    { icono: 'cards', titulo: 'Tu colección y tus categorías',
      pasos: ['La pestaña de tarjetas muestra todo lo que has registrado, por categoría.', 'El lápiz abre tus categorías: edítalas, bórralas o crea nuevas.',
              'Cada categoría lleva un ícono: elige uno de las tres pestañas, búscalo por nombre o usa un emoji.'] },
    { icono: 'lock', titulo: 'Público o privado',
      texto: 'Al registrar eliges el ojo (público: lo ve la comunidad) o el candado (privado: solo tú). Lo de un grupo privado solo lo ven sus miembros.' },
    { icono: 'layout-grid', titulo: 'Muro, seguir y reacciones',
      pasos: ['El Muro muestra lo más reciente. Arriba filtras: todos, personas que sigues o un grupo.', 'Abre un perfil y toca el botón de seguir.'] },
    { icono: 'eye-check', titulo: 'Lo vi y No está',
      texto: 'Solo se marcan estando en el lugar, a menos de 50 m del hallazgo. Al marcarlos puedes sumar una foto de ese día, que queda en la historia del hallazgo con tu nombre. Si ya marcaste "Lo vi", tócalo de nuevo para sumar la foto o quitar la marca. Una foto por hallazgo cada semana.' },
    { icono: 'search', titulo: 'Buscar personas',
      texto: 'En tu perfil toca la lupa y escribe un nombre. Con 1 o 2 letras se busca el nombre exacto; con 3 o más, los nombres parecidos.' },
    { icono: 'user-plus', titulo: 'Invitar a un grupo',
      texto: 'Toca "Invitar" dentro del grupo: puedes invitar a tus amigas de la app o mandar el enlace. En un grupo normal invita cualquier miembro; en uno de encuentro, quien lo creó y sus coadministradoras. La invitación llega al buzón con Unirme y Rechazar; si la rechazas por error, aún puedes unirte desde ahí.' },
    { icono: 'download', titulo: 'Descargar fichas',
      texto: 'En tu colección (o dentro de un grupo) toca el botón de descarga: obtienes un PDF con cada hallazgo, su foto, fecha, lugar y coordenadas. Ábrelo con la app de archivos de tu teléfono o mándalo por WhatsApp o correo.' },
    { icono: 'mail-heart', titulo: 'Buzón',
      texto: 'Para conversar, sigue a la persona y pídele amistad desde su perfil (con un mensaje breve si quieres). Al aceptar quedan como amigas: pueden escribirse, mandarse fichas de hallazgos y etiquetarse.' },
    { icono: 'volume-off', titulo: 'Silenciar',
      texto: 'Si no quieres ver el contenido de alguien, o de un grupo del que no formas parte, abre su perfil y toca silenciar. Deja de aparecer en tu Muro y tu mapa, y no puede escribirte ni etiquetarte; no se le avisa. No es posible silenciar a quienes comparten un grupo contigo.' },
    { icono: 'medal', titulo: 'Medallas y récords',
      texto: 'Ganas medallas por cantidad en cada categoría, por colonias exploradas, por semanas seguidas y por reencuentros. Toca una medalla para ver cuánto te falta. La copa muestra la tabla general.' },
    { icono: 'current-location', titulo: 'Ubicación',
      texto: 'La app guarda el punto de cada hallazgo. Puedes compartir la ubicación exacta o la aproximada; lo aproximado queda marcado y puedes corregirlo tocando el mapa.' },
    { icono: 'cloud-off', titulo: 'Sin conexión',
      texto: 'La app abre y registra aunque no tengas señal. Lo que registres se sube solo cuando vuelve la conexión. En tu perfil puedes liberar espacio.' },
    { icono: 'bell', titulo: 'Notificaciones',
      texto: 'Si las activas, te llega un aviso breve. Los detalles solo se ven dentro de la app.' },
    { icono: 'brand-whatsapp', titulo: 'Compartir',
      texto: 'En la ficha, el botón de WhatsApp crea una tarjeta con la foto de tu hallazgo para enviarla.' },
    { icono: 'hand-finger', titulo: '¿Qué significa cada ícono?',
      texto: 'Mantén presionado cualquier botón y aparece su nombre.' }
  ],
  // Privacidad: la pantalla de entrada muestra DATOS; la guía del mapa agrega DATOS_EXTRA
  DATOS_TITULO: '¿Qué pasa con mis datos?',
  // Privacidad: primero lo más importante, después los detalles
  DATOS_CLAVE: [
    { titulo: 'Tus datos están protegidos.', texto: 'Todo lo que sale de tu teléfono viaja y se guarda cifrado. Solo la administradora puede entrar a la base de datos, y únicamente para mantener la app y atender reportes.' },
    { titulo: 'Nadie hace negocio con tu información.', texto: 'No hay publicidad, no vendemos datos y no usamos herramientas de rastreo ni de analítica. Tu información no pasa por algoritmos de recomendación ni por inteligencia artificial. El Muro se ordena solo por fecha.' },
    { titulo: 'Una comunidad por invitación.', texto: 'Collector Go no se publica: llegas porque alguien te compartió el enlace. Tú decides quién ve cada cosa: lo público es para la comunidad; lo que marcas con candado solo lo ves tú; a los grupos y grupos de encuentro solo se entra por invitación de sus miembros.' }
  ],
  DATOS_ADEMAS: 'Además',
  DATOS: [
    'Guardamos solo lo necesario: tu nombre, frase y avatar; tu correo de Google, que solo sirve para entrar y no aparece en la app; y de cada hallazgo, la foto, el nombre, la nota, la fecha y la ubicación.',
    'Los datos se guardan en Supabase. Google solo confirma quién eres al entrar. OpenStreetMap dibuja el mapa y recibe las coordenadas para saber el nombre de la colonia. El recorte de fondo se hace en tu teléfono.',
    'Si compartes tu vitrina por WhatsApp, quien reciba el enlace puede ver esas fotos públicas sin tener cuenta.',
    'Las notificaciones solo dicen algo general.',
    'Al marcar "Lo vi" o "No está", tu ubicación solo se usa para comprobar que estás cerca y no se guarda.',
    'Si compartes tu ubicación con un grupo de encuentro, solo se guarda tu último punto, y se borra al terminar el tiempo.',
    'Los mensajes del buzón solo los ven las dos personas de la conversación.',
    'Las copias para usar sin conexión viven en tu teléfono y se borran al cerrar sesión.',
    'Puedes borrar cualquier hallazgo cuando quieras. "Borrar mi cuenta" elimina tu perfil, tus hallazgos y tus fotos.',
    'La administradora puede quitar contenido público reportado y bloquear cuentas que no respeten la comunidad.'
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
  AVISOS_NUEVOS: 'Tienes {n} novedades en tu buzón',
  AVISOS_VACIO: 'Aquí verás tus conversaciones y quién reacciona, comenta, te etiqueta o empieza a seguirte',
  // Buzón entre amigas (se siguen mutuamente)
  MENSAJE_MAX: 300,
  ETIQUETAS_MAX: 5,
  CHAT_BLOQUEADO: 'Para conversar, se tienen que seguir mutuamente.',
  ETIQUETAR_TEXTO: 'Puedes etiquetar a quien sigues o te sigue (hasta 5 personas).',
  ETIQUETAR_VACIO: 'Sigue a alguien para poder etiquetarle.',
  ETIQUETAS_LISTO: 'Etiquetas guardadas',
  CHAT_VACIO: 'Aún no hay mensajes. Escribe el primero.',
  BUZON_EMPEZAR: 'Empieza una conversación',
  CHAT_PISTA: 'Escribe un mensaje…',

  // Medidor de uso del plan gratuito (escudo de la administradora)
  USO_AMARILLO: 'Más del 60 %. Nadie tiene que irse: es momento de preparar el segundo almacén de fotos gratuito (ver la guía de administración). Mientras tanto, si hace falta, el muro puede usar miniaturas (MURO_FOTO: \'mini\' en config.js).',
  USO_ROJO: 'Más del 80 %. Activa el segundo almacén de fotos gratuito (ver la guía de administración). Ninguna foto se borra ni pierde resolución.',
  VISTO_AVISO: '{n} estuvo ahí y vio {h}',
  USO_RITMO_TITULO: 'Ritmo del almacén de fotos',
  USO_RITMO_SEMANA: 'en los últimos 7 días',
  USO_RITMO: 'A este ritmo, el almacén se llena en ~{n} semanas.',
  USO_RITMO_MENOS: 'A este ritmo, el almacén se llena en menos de una semana.',
  USO_RITMO_MUCHO: 'A este ritmo, el almacén tardaría más de 10 años en llenarse.',
  USO_RITMO_SIN: 'Esta semana no se subieron fotos: todavía no hay ritmo que calcular.',
  USO_SEMANAS_R2: 8,
  USO_RITMO_R2: 'Quedan unas 8 semanas o menos: es el momento de activar el segundo almacén gratuito.',
  USO_PANEL: 'Abrir el uso en Supabase',
  USO_TRANSFERENCIA: 'La transferencia mensual (5 GB) no se puede medir desde la app: revísala en el panel de Supabase, en Usage.',

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

  // Grupos de encuentro: una sola plantilla; el uso solo sugiere el texto del acuerdo
  ENCUENTRO_USOS: [
    { id: 'viaje',    nombre: 'Viaje',    icono: 'luggage',      acuerdo: 'Salida a las …' },
    { id: 'rally',    nombre: 'Rally',    icono: 'flag',         acuerdo: '' },
    { id: 'marcha',   nombre: 'Marcha',   icono: 'speakerphone', acuerdo: 'Si nos separamos, nos vemos en … a las …' },
    { id: 'festival', nombre: 'Festival', icono: 'music',        acuerdo: 'Si te pierdes, aquí a las 11' },
    { id: 'sismo',    nombre: 'Sismo',    icono: 'home-shield',  acuerdo: 'Si no hay señal, nos vemos en el punto principal' }
  ],
  ENCUENTRO_MAX_MIEMBROS: 50,
  ENCUENTRO_REFRESCO_MS: 20000,   // cada cuánto se actualiza el grupo abierto
  ENCUENTRO_COMPARTIR_MIN: [15, 30],
  ENCUENTRO_TEMA_MAX: 60,
  ENCUENTRO_ACUERDO_MAX: 200,
  ENCUENTRO_NOTA_MAX: 140,
  ENCUENTRO_TIPO_TEXTO: 'Privado y oculto: solo lo ven sus miembros. Para viajes, rallies, marchas, festivales o un sismo.',
  ENCUENTRO_ESTADOS: {
    bien:  { nombre: 'Todo bien',      corto: 'Todo bien', icono: 'circle-check', listo: 'Tu grupo ya sabe que todo está bien' },
    ayuda: { nombre: 'Necesito ayuda', corto: 'Ayuda',     icono: 'urgent',       listo: 'Tu grupo ya sabe que necesitas ayuda' }
  },
  ENCUENTRO_MIRA: 'Mira esto',
  ENCUENTRO_EXACTA: 'Compartir mi ubicación exacta con el grupo',
  ENCUENTRO_NOTA_AYUDA: '¿Qué pasa? (opcional)',
  ENCUENTRO_VOY_A: 'Voy a (opcional)',
  ENCUENTRO_SIN_AVISO: 'Sin aviso todavía',
  ENCUENTRO_EN_COLA: 'Sin conexión: se enviará al volver la señal',
  ENCUENTRO_WHATSAPP: 'Enviar también por WhatsApp',
  ENCUENTRO_SIN_PUNTOS: 'Aún no hay puntos de encuentro. Propón el primero.',
  ENCUENTRO_SIN_MIRA: 'Aún no hay nada marcado',
  ENCUENTRO_COMPARTIENDO: 'Compartiendo tu ubicación · quedan {m} min',
  ENCUENTRO_COMPARTIR: 'Compartir mi ubicación',
  ENCUENTRO_COMPARTIR_CORTO: 'Compartir',
  ENCUENTRO_PUNTOS_TEXTO: 'Cualquiera puede proponer uno',
  ENCUENTRO_SALIR: '¿Salir del grupo? Se borra todo lo tuyo aquí: avisos, "Mira esto", puntos y ubicación.',
  ENCUENTRO_BORRAR_MIO: '¿Borrar todo lo tuyo en este grupo? Avisos, "Mira esto", puntos y ubicación. Sigues en el grupo.',
  ENCUENTRO_VOTAR: '¿Proponer borrar el grupo completo? Se borra cuando más de la mitad está de acuerdo.',
  ENCUENTRO_VOTAR_APOYO: '¿Estás de acuerdo en borrar el grupo completo? Se borra cuando más de la mitad está de acuerdo.',
  ENCUENTRO_VOTOS: '{n} de {t} quieren borrar el grupo',
  ENCUENTRO_INACTIVO: '¿Eliminar el grupo? Nadie más ha tenido actividad en {d} días. Sus miembros reciben un aviso.',
  ENCUENTRO_PREMIO: 'Tus "Mira esto" en {grupo} ganan {premio}.',
  ENCUENTRO_TEMA_PISTA: 'Puertas azules',
  ENCUENTRO_JUEGO: 'Juego en el grupo',
  ENCUENTRO_JUEGO_TEXTO: 'Encendido, cada "Mira esto" suma premios dentro del grupo. Solo los ve el grupo.',
  // Guía propia de los grupos de encuentro (aparte de la guía general)
  GUIA_ENCUENTRO: [
    { icono: 'lifebuoy', titulo: '¿Qué es?', texto: 'Un grupo privado y oculto con puntos de encuentro. Solo lo ven sus miembros.' },
    { icono: 'map-2', titulo: 'En el mapa', texto: 'Al tocar el botón del grupo, el mapa muestra solo lo del grupo. Abajo está el panel: súbelo con el dedo para ver el tablero, los puntos, "Mira esto" y las opciones del grupo. La X de arriba regresa al mapa normal.' },
    { icono: 'flag', titulo: 'Puntos de encuentro', texto: 'Cualquier miembro puede proponer uno; ponle foto para reconocerlo. "Ir al punto" te guía aunque no tengas datos.' },
    { icono: 'circle-check', titulo: 'Avisos', texto: '"Todo bien" y "Necesito ayuda" avisan al grupo. Al pedir ayuda puedes compartir tu ubicación exacta. Después puedes enviarlo también por WhatsApp.' },
    { icono: 'lifebuoy', titulo: 'Aviso rápido', texto: 'El botón de ayuda (el salvavidas entre signos de exclamación) del mapa, o el que está junto al grupo en Colección, manda "Todo bien" o "Necesito ayuda" a tus grupos de encuentro de una vez. En Android también aparece al dejar presionado el ícono de la app.' },
    { icono: 'eye', titulo: 'Mira esto', texto: 'Marca algo en el mapa del grupo. Si el juego está encendido, suma premios dentro del grupo.' },
    { icono: 'sparkles', titulo: 'Tema de colección', texto: 'Quien administra puede proponer uno. Es posible cambiarlo sin límites.' },
    { icono: 'current-location', titulo: 'Mi ubicación', texto: 'El botón de ubicación del panel te muestra solo a ti dónde estás. Para que el grupo te vea, compártela por 15 o 30 minutos mientras la app está abierta.' },
    { icono: 'trash', titulo: 'Borrar', texto: 'Borra lo tuyo cuando quieras. El grupo se borra si la mayoría lo vota.' },
    { icono: 'bulb', titulo: 'Ideas para aprovecharlo', pasos: [
      'Viaje: el hotel y el punto del día; "Mira esto" para guardar lo que descubren.',
      'Rally: puntos de control y un tema de colección; gana quien más "Mira esto" sume.',
      'Marcha: dónde se ven antes y a dónde van si se separan.',
      'Festival: un punto fijo "si te pierdes, aquí a las 11".',
      'Sismo: casa, escuela y trabajo; practícalo antes con tu gente.'] }
  ],

  // Notificaciones: texto genérico (el detalle solo se ve dentro de la app)
  PUSH_FUNCION: 'https://kkgnsylkmjltuphyetss.supabase.co/functions/v1/avisos-push',
  PUSH_TEXTOS: {
    ayuda: 'Alguien de tu grupo pidió ayuda',
    grupo: 'Hay novedades en tu grupo',
    mensaje: 'Tienes un mensaje nuevo',
    aviso: 'Tienes un aviso nuevo'
  },
  PUSH_PREFS: [
    { k: 'encuentro', nombre: 'Grupos de encuentro' },
    { k: 'mira',      nombre: '"Mira esto" y tema de colección' },
    { k: 'mensajes',  nombre: 'Mensajes y etiquetas' },
    { k: 'sonido',    nombre: 'Sonar y vibrar cuando alguien pida ayuda' },
    { k: 'admin',     nombre: 'Avisos de administración', admin: true }
  ],
  PUSH_OFRECER: '¿Quieres que te avisemos si alguien del grupo pide ayuda?',
  PUSH_ACTIVAR: 'Activar notificaciones',
  PUSH_ACTIVAS: 'Notificaciones activadas',
  PUSH_DESACTIVAR: 'Desactivar en este teléfono',
  PUSH_NO_SOPORTA: 'Este navegador no permite notificaciones.',
  PUSH_IPHONE: 'En iPhone, las notificaciones funcionan con la app instalada en tu pantalla de inicio.',
  PUSH_BLOQUEADAS: 'Las notificaciones están bloqueadas para Collector Go. Actívalas en los ajustes de tu teléfono o del navegador.',
  PUSH_NO_LISTAS: 'Las notificaciones aún no están listas. Intenta más tarde.',

  // Sin conexión
  OFFLINE_FOTOS_MB: 50,      // tope de copias de fotos en el teléfono
  OFFLINE_TESELAS: 2000,     // pedazos de mapa ya vistos que se guardan
  OFFLINE_ESPERA_MS: 6000,   // si la red tarda más, se muestra lo guardado
  OFFLINE_EXTERNOS: [
    'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css',
    'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/dist/umd/supabase.js'
  ],
  SIN_CONEXION: 'Sin conexión',
  PENDIENTE_GUARDADO: 'Guardado en tu teléfono. Se sube solo al volver la conexión',
  PENDIENTES_TITULO: 'Pendientes de subir',
  PENDIENTES_SUBIDOS: '{n} subidos',
  PENDIENTE_DUDA: 'Ya existe con ese nombre. ¿Es el mismo?',
  PENDIENTES_SALIR: 'Tienes {n} registros sin subir. Si cierras sesión se pierden. ¿Cerrar sesión?',
  VERSION_NUEVA: 'Hay una versión nueva, toca para actualizar',
  OFFLINE_TITULO: 'Sin conexión',
  GUARDAR_FOTOS: 'Guardar fotos para ver sin conexión',
  LIBERAR: 'Liberar espacio',
  ESPACIO: 'Fotos guardadas: {mb} MB de {tope} MB · mapa: {t} pedazos',

  // Textos de ayuda (aparecen al mantener presionado un ícono)
  AYUDA: {
    mapa: 'Mapa', muro: 'Muro', nuevo: 'Registrar hallazgo', coleccion: 'Mi colección', perfil: 'Perfil',
    ubicar: 'Mi ubicación', cerca: 'Cerca de mí', filtro_mios: 'Solo lo mío', filtro_todos: 'Todo', filtro_siguiendo: 'Personas que sigo',
    ir_al_punto: 'Ir al punto', visto: '¡Lo vi!', instalar: 'Instalar en mi teléfono', reencuentro: 'Lo volví a ver', editar: 'Editar', borrar: 'Borrar', avisar: 'Avisar a moderación',
    compartir: 'Compartir', whatsapp: 'Compartir por WhatsApp', privado: 'Privado: solo tú lo ves', publico: 'Público',
    recortar: 'Recortar fondo', original: 'Usar foto original', tabla: 'Tabla general', admin: 'Moderación', salir: 'Cerrar sesión',
    camara: 'Tomar foto', galeria: 'Elegir de la galería', sin_foto: 'Solo marcar, sin foto', guardar: 'Guardar', cerrar: 'Cerrar', atras: 'Atrás',
    ver_mapa: 'Ver en el mapa', categorias: 'Editar categorías', gps: 'Volver a leer el GPS',
    bloquear: 'Bloquear cuenta', desbloquear: 'Desbloquear', descartar: 'Descartar aviso', ver: 'Ver',
    mas: 'Cargar más', dudas: 'Cómo funciona', privacidad: 'Privacidad de datos', seguir: 'Seguir', dejar_seguir: 'Dejar de seguir',
    grupo_nuevo: 'Crear grupo', invitar: 'Invitar', buscar_personas: 'Buscar personas', enviar_ficha: 'Enviar a una amiga', salir_grupo: 'Salir del grupo', grupo_publico: 'Grupo público',
    grupo_privado: 'Grupo privado', comentar: 'Enviar comentario', borrar_comentario: 'Borrar comentario', nueva_categoria: 'Nueva categoría', borrar_cuenta: 'Borrar mi cuenta', buscar: 'Buscar ícono', emoji: 'Usar un emoji',
    silenciar: 'Silenciar', quitar_silencio: 'Quitar silencio', silenciado: 'silenciado', silenciados: 'Silenciados',
    buzon: 'Escribir a la administradora', buzon_amigos: 'Buzón', color_premio: 'Color de tu corona', mensaje: 'Enviar mensaje', etiquetar: 'Etiquetar', seguir_vuelta: 'Seguir de vuelta', captura: 'Agregar captura de pantalla (opcional)', quitar_captura: 'Quitar captura',
    enviar: 'Enviar', responder: 'Guardar respuesta', ver_perfil: 'Ver perfil', avisos: 'Buzón', descargar: 'Descargar imagen', uso: 'Uso del plan',
    encuentro_guia: 'Cómo funciona el grupo de encuentro', encuentro_ajustes: 'Juego, tema y acuerdos', punto_nuevo: 'Proponer un punto',
    principal: 'Hacer punto principal', borrar_lo_mio: 'Borrar lo mío', votar_borrado: 'Proponer borrar el grupo', quitar_voto: 'Retirar mi voto',
    eliminar_inactivo: 'Eliminar por inactividad', refrescar: 'Actualizar', ver_en_mapa: 'Ver en el mapa', miembro: 'Opciones de esta persona',
    coadmin: 'Coadministradora', duena: 'Creó el grupo', dejar_compartir: 'Dejar de compartir', subir_ahora: 'Subir ahora',
    ver_todo: 'Ver a todo el grupo', encuadrar: 'Encuadrar la foto', galeria_cat: 'Ver esta colección', anuncios: 'Anuncios a la comunidad', ausencia: 'No está', ausencia_ayuda: 'Ya no está en el lugar (solo estando ahí)', capa_encuentro: 'Ver el grupo en el mapa', salir_grupo_mapa: 'Salir del grupo en el mapa', col_mosaico: 'Ver todas las colecciones', aviso_rapido: 'Avisar a mi grupo', gps_estado: 'Precisión del GPS'
  }
};
