/* ====================================================
   Distrito Guaraní — Lógica de navegación
   Controla: navegación con botones, teclado y swipe
   Dots: carril horizontal deslizante con ventana fija
==================================================== */

const slides  = document.querySelectorAll('.slide');
const dotsEl  = document.getElementById('dots');
const counter = document.getElementById('counter');
const progress = document.getElementById('progress');
let cur = 0;
const total = slides.length;

// ── Parámetros del carril ─────────────────────────────
const DOT_SIZE = 6;
const DOT_GAP  = 8;
const STEP     = DOT_SIZE + DOT_GAP;  // 14px por dot
const WIN_W    = 110;  // debe coincidir con #dots { width } en CSS

// ── Crear el carril interior ──────────────────────────
const track = document.createElement('div');
track.className = 'dots-track';
dotsEl.appendChild(track);

for (let i = 0; i < total; i++) {
  const d = document.createElement('div');
  d.className = 'nav-dot' + (i === 0 ? ' active' : '');
  d.addEventListener('click', (function(idx){ return function(){ go(idx); }; })(i));
  track.appendChild(d);
}

// ── Actualizar carril ─────────────────────────────────
function updateTrack() {
  track.querySelectorAll('.nav-dot').forEach(function(d, i) {
    d.classList.toggle('active', i === cur);
  });

  // Centrar el dot activo dentro de la ventana
  const centerInWindow = (WIN_W / 2) - (DOT_SIZE / 2);
  const rawOffset      = centerInWindow - cur * STEP;

  // Clampear para que el carril no pase sus extremos
  const totalTrackW   = total * STEP - DOT_GAP;
  const minOffset     = WIN_W - totalTrackW - DOT_SIZE;
  const offset        = Math.min(0, Math.max(minOffset, rawOffset));

  track.style.transform = 'translateY(-50%) translateX(' + offset + 'px)';
}

// ── Navegar ───────────────────────────────────────────
function go(n) {
  slides[cur].classList.remove('active');
  slides[cur].classList.add('prev');
  const prev = cur;
  setTimeout(function() { slides[prev].classList.remove('prev'); }, 500);

  cur = ((n % total) + total) % total;
  slides[cur].classList.add('active');
  counter.textContent = String(cur + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
  progress.style.width = ((cur + 1) / total * 100) + '%';
  updateTrack();
}

// ── Init ──────────────────────────────────────────────
updateTrack();
progress.style.width = (1 / total * 100) + '%';

// ── Eventos ───────────────────────────────────────────
document.getElementById('nextBtn').onclick = function() { go(cur + 1); };
document.getElementById('prevBtn').onclick = function() { go(cur - 1); };

document.addEventListener('keydown', function(e) {
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); go(cur + 1); }
  if (e.key === 'ArrowLeft') go(cur - 1);
});

let tx0 = null;
document.addEventListener('touchstart', function(e) { tx0 = e.touches[0].clientX; });
document.addEventListener('touchend',   function(e) {
  if (tx0 === null) return;
  const dx = e.changedTouches[0].clientX - tx0;
  if (Math.abs(dx) > 40) go(dx < 0 ? cur + 1 : cur - 1);
  tx0 = null;
});

// ====================================================
// Lightbox / Modal de Imágenes
// ====================================================

// 1. Creamos el contenedor del Modal dinámicamente
const lightbox = document.createElement('div');
lightbox.className = 'lightbox-modal';
lightbox.innerHTML = `
  <span class="lightbox-close">&times;</span>
  <img class="lightbox-content" id="lightbox-img">
`;
document.body.appendChild(lightbox);

const lightboxImg = lightbox.querySelector('#lightbox-img');
const closeBtn = lightbox.querySelector('.lightbox-close');

// 2. Seleccionamos todas las imágenes de las slides (ignoramos la cover)
const slideImages = document.querySelectorAll('.slide:not(.slide-cover) img');

// 3. Le asignamos el evento de click a cada imagen
slideImages.forEach(img => {
  img.style.cursor = 'pointer';
  
  img.addEventListener('click', () => {
    lightboxImg.src = img.src; 
    lightbox.classList.add('show');
  });
});

// 4. Lógica para cerrar el Modal
const closeLightbox = () => {
  lightbox.classList.remove('show');
  setTimeout(() => { lightboxImg.src = ''; }, 300);
};

closeBtn.addEventListener('click', closeLightbox);

lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) {
    closeLightbox();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && lightbox.classList.contains('show')) {
    closeLightbox();
  }
});

// ====================================================
// LEAFLET WEBMAP - DISTRITO DE ARTE, DISEÑO Y CULTURA
// ====================================================

// 1. Inicializar el mapa
const map = L.map('map').setView([-27.482600354503184, -58.82922631349665], 17);

// 2. Definir los Mapas Base (Basemaps)
const googleSat = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '© Google Maps'
});

const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
});

const esriDark = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 16
});

googleSat.addTo(map);

// 3. Configurar el estilo de las capas GeoJSON dinámicamente

// Función para clasificar los Predios
function estiloPredios(feature) {
    switch (feature.properties.Tipo) {
        case 'Predio':
            // Verde oscuro semitransparente para predios normales
            return { color: "#fffffff6", weight: 2, fillOpacity: 0.6, fillColor: "#6d6d6da1" };
        case 'A intervenir':
            // Verde claro para espacios a intervenir
            return { color: "#ebebeb", weight: 2, fillOpacity: 0.6, fillColor: "#a3eb30" };
        default:
            return { color: "#ffffffec", weight: 2, fillOpacity: 0.6, fillColor: "#ffffff" };
    }
}

// Función para clasificar las Propuestas
function estiloPropuestas(feature) {
    switch (feature.properties.Tipo) {
        case 'Existente':
            // Gris para lo que ya está construido (ej. Club Huracán)
            return { color: "#494949", weight: 1, fillOpacity: 0.8, fillColor: "#ffffffe0" };
        case 'Propuesta':
            // Naranja/Dorado para las nuevas propuestas
            return { color: "#000000", weight: 2, fillOpacity: 0.7, fillColor: "#e21f70" };
        default:
            return { color: "#e21f70", weight: 2, fillOpacity: 0.6, fillColor: "#e21f70" };
    }
}

// El Caminito se mantiene fijo porque es un solo tipo
const styleCaminito = { color: "#000000d7", weight: 1, fillOpacity: 0.6 , fillColor: "#f7a121c9" };

// Función dinámica para leer la tabla de atributos y crear el Popup
function crearPopup(feature, layer) {
    if (feature.properties) {
        let popupContent = '<div style="max-height: 200px; overflow-y: auto; padding-right: 5px;">';
        
        for (const propiedad in feature.properties) {
            if (feature.properties[propiedad] !== null && feature.properties[propiedad] !== '') {
                popupContent += `<b>${propiedad}:</b> ${feature.properties[propiedad]}<br>`;
            }
        }
        popupContent += '</div>';
        layer.bindPopup(popupContent);
    }
}

// 4. Crear los contenedores vacíos para las capas e inyectar la función de Estilo y Popup
const capaPredios = L.geoJSON(null, { style: estiloPredios, onEachFeature: crearPopup });
const capaPropuestas = L.geoJSON(null, { style: estiloPropuestas, onEachFeature: crearPopup });
const capaCaminito = L.geoJSON(null, { style: styleCaminito, onEachFeature: crearPopup });

// 5. Control de Capas
const baseMaps = {
    "Google Satelital": googleSat,
    "OSM": osm,
    "Esri Dark": esriDark
};

const overlayMaps = {
    "Predios del Distrito": capaPredios,
    "Propuestas Generales": capaPropuestas,
    "Propuesta Caminito": capaCaminito
};

L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);

// 6. Cargar los archivos GeoJSON 
fetch('Predios_Distrito.geojson')
    .then(response => response.json())
    .then(data => capaPredios.addData(data).addTo(map))
    .catch(err => console.error("Error cargando Predios:", err));

fetch('Propuestas_Distrito.geojson')
    .then(response => response.json())
    .then(data => capaPropuestas.addData(data).addTo(map))
    .catch(err => console.error("Error cargando Propuestas:", err));

fetch('Propuesta_caminito_Distrito.geojson')
    .then(response => response.json())
    .then(data => capaCaminito.addData(data).addTo(map))
    .catch(err => console.error("Error cargando Caminito:", err));

// 7. FIX IMPORTANTE: Recalcular tamaño del mapa al mostrar la slide
const webmapSlide = document.getElementById('webmap');
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.target.classList.contains('active')) {
            setTimeout(() => { map.invalidateSize(); }, 600); 
        }
    });
});
observer.observe(webmapSlide, { attributes: true, attributeFilter: ['class'] });

// ====================================================
// MAPA INTERACTIVO SVG: ZONIFICACIÓN Y PROPUESTAS
// ====================================================

const mapNumbered = [
  // centroid = centro del polígono naranja correspondiente en coords % (x*9, y*6.2 = SVG px)
  // Ajustá estos valores según tu mapa real
  { id: "1", label: "Escuela de Arte Municipal",               img: "imagenes/Escuela de Arte Municipal.jpg",               x: 11, y: 20, centroid: { x: 26, y: 40.2 } },
  { id: "2", label: "Galería de Arte",                         img: "imagenes/Galería de Arte.jpg",                         x: 16, y: 48, centroid: { x: 23.1, y: 45.8 } },
  { id: "3", label: "Museo del Carnaval",                      img: "imagenes/Museo del Carnaval.jpg",                      x: 25.4, y: 14.4, centroid: { x: 32.2, y: 32.3 } },
  { id: "4", label: "Museo del Chamamé y Peña",                img: "imagenes/Museo del Chamamé y Peña.jpg",                x: 41.6, y: 10.2, centroid: { x: 42.1, y: 40.2 } },
  { id: "5", label: "Museo del Deporte Correntino",            img: "imagenes/Museo del Deporte Correntino.jpg",            x: 30, y: 58, centroid: { x: 34.5, y: 52.3 } },
  { id: "6", label: "Instituto de Diseño Técnico Industrial",  img: "imagenes/Instituto de Diseño Técnico Industrial.jpg",  x: 40, y: 88, centroid: { x: 46, y: 65 } },
  { id: "7", label: "Expo Técnica",                            img: "imagenes/Expo Técnica.jpg",                            x: 57, y: 75, centroid: { x: 60.3, y: 52 } },
  { id: "8", label: "Área Disponible para Equipamientos",      img: "imagenes/Área Disponible para Equipamientos.jpeg",     x: 70.5, y: 80.9, centroid: { x: 71, y: 62 } },
  { id: "9", label: "Instituto Tecnológico",                   img: "imagenes/Instituto Tecnológico.jpg",                   x: 78, y: 78, centroid: { x: 78, y: 68 } },
];

const mapLettered = [
  { id: "a", label: "Plazoleta de los Inmigrantes",            img: "imagenes/Plazoleta de los Inmigrantes.jpg",            x:  7, y: 59.9}, 
  { id: "b", label: "Predio Caminito",                         img: "imagenes/Predio Caminito.jpg",                         x: 37.5, y: 31},
  { id: "c", label: "Plaza de las Américas",                   img: "imagenes/Plaza de las Américas.jpg",                   x: 59, y: 41 },
  { id: "d", label: "Refuncionalización espacio público mixto escuela/paseo Lamadrid", img: "imagenes/Refuncionalización espacio público mixto escuela_paseo Lamadrid.jpeg", x: 49, y: 22 },
  { id: "e", label: "Paseo de Lamadrid",                       img: "imagenes/Paseo de Lamadrid.jpg",                       x: 62.6, y: 31.7 },  // sin centroid → no migra
  { id: "f", label: "Esquina Aviador Correa y República del Líbano", img: "imagenes/Esquina Aviador Correa y República del Líbano.jpg",  x: 67.1, y: 48.3 },  // sin centroid → no migra
  { id: "g", label: "Corredor Saludable",                            img: "imagenes/Corredor Saludable.jpeg",                            x: 92, y: 70 },  // sin centroid → no migra
];

const mapAllNodes = [...mapNumbered, ...mapLettered];

// 1. Inyectar ítems de leyenda
const legNums = document.getElementById('legend-nums');
const legLetters = document.getElementById('legend-letters');

if (legNums && legLetters) {
  mapNumbered.forEach(p => {
    const el = document.createElement('div');
    el.className = 'legend-item';
    el.innerHTML = `<span class="legend-num">${p.id}.</span><span>${p.label}</span>`;
    el.addEventListener('click', () => openMapLightbox(p));
    legNums.appendChild(el);
  });

  mapLettered.forEach(p => {
    const el = document.createElement('div');
    el.className = 'legend-item';
    el.innerHTML = `<span class="legend-letter">${p.id}.</span><span>${p.label}</span>`;
    el.addEventListener('click', () => openMapLightbox(p));
    legLetters.appendChild(el);
  });
}

// 2. Inyectar Nodos en el mapa y Lógica de Zoom/Paneo
const nodesContainerSvg = document.getElementById('nodes-container-svg');
const svgNS = "http://www.w3.org/2000/svg";
const svgMap = document.querySelector('.map-svg-interactive');

// --- LÓGICA DE ZOOM Y PANEO (SUAVIZADO CON RAF + LERP) ---
// "target" es hacia donde queremos ir; "current" es donde estamos animando
let targetVB  = { x: 0, y: 0, w: 900, h: 620 };
let currentVB = { x: 0, y: 0, w: 900, h: 620 };
let rafId = null;

// Velocidad de interpolación (0.0 lento – 1.0 instantáneo)
const LERP_SPEED = 0.14;

function animateViewBox() {
  currentVB.x += (targetVB.x - currentVB.x) * LERP_SPEED;
  currentVB.y += (targetVB.y - currentVB.y) * LERP_SPEED;
  currentVB.w += (targetVB.w - currentVB.w) * LERP_SPEED;
  currentVB.h += (targetVB.h - currentVB.h) * LERP_SPEED;

  if (svgMap) {
    svgMap.setAttribute('viewBox',
      `${currentVB.x} ${currentVB.y} ${currentVB.w} ${currentVB.h}`);
  }
  updateAllNodes(); // mantener nodos en sincronía con el viewBox

  const delta = Math.abs(targetVB.x - currentVB.x) + Math.abs(targetVB.y - currentVB.y)
              + Math.abs(targetVB.w - currentVB.w) + Math.abs(targetVB.h - currentVB.h);
  if (delta > 0.05) {
    rafId = requestAnimationFrame(animateViewBox);
  } else {
    currentVB = { ...targetVB };
    if (svgMap) svgMap.setAttribute('viewBox',
      `${currentVB.x} ${currentVB.y} ${currentVB.w} ${currentVB.h}`);
    updateAllNodes(); // snap final
    rafId = null;
  }
}

function kickAnim() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(animateViewBox);
}

// Banderas para distinguir click de drag
let panStart  = null;   // { x, y, vx, vy } al inicio del mousedown
let hasDragged = false; // true si el mouse se movió lo suficiente como para ser un pan

if (svgMap) {
  // ── ZOOM con rueda ──────────────────────────────────
  svgMap.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.12 : 1 / 1.12;
    if (targetVB.w * zoomFactor > 3000 || targetVB.w * zoomFactor < 200) return;

    const rect   = svgMap.getBoundingClientRect();
    const ratioX = (e.clientX - rect.left)  / rect.width;
    const ratioY = (e.clientY - rect.top)   / rect.height;
    const pivotX = ratioX * targetVB.w + targetVB.x;
    const pivotY = ratioY * targetVB.h + targetVB.y;

    targetVB.w *= zoomFactor;
    targetVB.h *= zoomFactor;
    targetVB.x  = pivotX - ratioX * targetVB.w;
    targetVB.y  = pivotY - ratioY * targetVB.h;

    kickAnim();
  }, { passive: false });

  // ── PANEO: comienza solo si el mouse REALMENTE se mueve ─
  // y solo si NO se hizo click sobre un nodo (clase node-hit)
  svgMap.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('node-hit')) return; // deja el click pasar limpio
    panStart   = { x: e.clientX, y: e.clientY,
                   vx: targetVB.x, vy: targetVB.y };
    hasDragged = false;
  });

  window.addEventListener('mouseup', () => {
    panStart   = null;
    hasDragged = false;
    if (svgMap) svgMap.style.cursor = 'grab';
  });

  window.addEventListener('mousemove', (e) => {
    if (!panStart) return;
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;

    // Umbral de 5 px antes de considerar que es un drag
    if (!hasDragged && Math.hypot(dx, dy) < 5) return;
    hasDragged = true;
    svgMap.style.cursor = 'grabbing';

    const rect  = svgMap.getBoundingClientRect();
    targetVB.x  = panStart.vx - (dx * targetVB.w / rect.width);
    targetVB.y  = panStart.vy - (dy * targetVB.h / rect.height);

    kickAnim();
  });
}

// --- LÓGICA DE INYECCIÓN DE NODOS ---
const BASE_RADIUS  = 35;
const nodeRegistry = []; // { outerG, zoomG, data, connectorLine? }

// Grupo de líneas conectoras — se inserta ANTES que los nodos para quedar debajo
const linesGroup = document.createElementNS(svgNS, "g");
linesGroup.setAttribute("id", "connector-lines");
if (nodesContainerSvg) nodesContainerSvg.appendChild(linesGroup);

if (nodesContainerSvg) {
  mapAllNodes.forEach(p => {
    const isLetter = isNaN(p.id);
    const r  = BASE_RADIUS;
    const bx = p.x * 9;
    const by = p.y * 6.2;

    // Línea conectora (solo para nodos con centroide definido)
    let connectorLine = null;
    if (p.centroid) {
      connectorLine = document.createElementNS(svgNS, "line");
      connectorLine.setAttribute("x1", bx);
      connectorLine.setAttribute("y1", by);
      connectorLine.setAttribute("x2", p.centroid.x * 9);
      connectorLine.setAttribute("y2", p.centroid.y * 6.2);
      connectorLine.setAttribute("stroke", "#1a1a1a");
      connectorLine.setAttribute("stroke-width", "1.5");
      connectorLine.setAttribute("stroke-dasharray", "5,4");
      connectorLine.setAttribute("stroke-linecap", "round");
      connectorLine.style.pointerEvents = 'none';
      linesGroup.appendChild(connectorLine);
    }

    // Capa 1: posición
    const outerG = document.createElementNS(svgNS, "g");
    outerG.setAttribute('transform', `translate(${bx}, ${by})`);

    // Capa 2: escala por zoom (sin transición — sigue al viewBox frame a frame)
    const zoomG = document.createElementNS(svgNS, "g");
    zoomG.style.transformOrigin = '0 0';

    // Capa 3: hover con transición suave
    const hoverG = document.createElementNS(svgNS, "g");
    hoverG.style.transformOrigin = '0 0';
    hoverG.style.transition = 'transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)';

    // ClipPath en coordenadas locales (0,0 = centro del círculo)
    const clipDef = document.createElementNS(svgNS, "clipPath");
    const clipId  = `clip-${p.id}`;
    clipDef.setAttribute("id", clipId);
    const clipCircle = document.createElementNS(svgNS, "circle");
    clipCircle.setAttribute("cx", "0");
    clipCircle.setAttribute("cy", "0");
    clipCircle.setAttribute("r",  r - 1.5);
    clipDef.appendChild(clipCircle);
    nodesContainerSvg.appendChild(clipDef);

    // Ring cx=0, cy=0
    const ring = document.createElementNS(svgNS, "circle");
    ring.setAttribute("cx", "0");
    ring.setAttribute("cy", "0");
    ring.setAttribute("r",  r);
    ring.setAttribute("fill",   "#222");
    ring.setAttribute("stroke", "#C8A96E");
    ring.setAttribute("stroke-width", "3");
    ring.style.pointerEvents = 'none';
    ring.style.filter = 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))';

    // Imagen de -r,-r a +r,+r
    const imgSvg = document.createElementNS(svgNS, "image");
    imgSvg.setAttribute("href",  p.img);
    imgSvg.setAttribute("x",     -r);
    imgSvg.setAttribute("y",     -r);
    imgSvg.setAttribute("width",  r * 2);
    imgSvg.setAttribute("height", r * 2);
    imgSvg.setAttribute("preserveAspectRatio", "xMidYMid slice");
    imgSvg.setAttribute("clip-path", `url(#${clipId})`);
    imgSvg.style.pointerEvents = 'none';

    // Badge
    const bRx = r - 6, bRy = r - 6;
    const badgeRing = document.createElementNS(svgNS, "circle");
    badgeRing.setAttribute("cx", bRx);
    badgeRing.setAttribute("cy", bRy);
    badgeRing.setAttribute("r",  13);
    badgeRing.setAttribute("fill",   "#0a0a0a");
    badgeRing.setAttribute("stroke", isLetter ? '#8dbf8e' : '#d4763a');
    badgeRing.setAttribute("stroke-width", "2");
    badgeRing.style.pointerEvents = 'none';

    const badgeText = document.createElementNS(svgNS, "text");
    badgeText.setAttribute("x", bRx);
    badgeText.setAttribute("y", bRy + 1);
    badgeText.setAttribute("text-anchor", "middle");
    badgeText.setAttribute("dominant-baseline", "central");
    badgeText.setAttribute("font-family", "DM Sans, sans-serif");
    badgeText.setAttribute("font-size",   "11px");
    badgeText.setAttribute("font-weight", "700");
    badgeText.setAttribute("fill", isLetter ? '#38cc13' : '#fff');
    badgeText.style.pointerEvents = 'none';
    badgeText.textContent = p.id;

    // HitArea invisible
    const hitArea = document.createElementNS(svgNS, "circle");
    hitArea.setAttribute("cx",   "0");
    hitArea.setAttribute("cy",   "0");
    hitArea.setAttribute("r",    r + 5);
    hitArea.setAttribute("fill", "transparent");
    hitArea.setAttribute("class","node-hit");
    hitArea.style.pointerEvents = 'all';
    hitArea.style.cursor = 'pointer';

    hitArea.addEventListener('mouseenter', () => {
      nodesContainerSvg.appendChild(outerG);   // trae al frente
      hoverG.style.transform = 'scale(1.1)';   // solo la capa hover escala
    });
    hitArea.addEventListener('mouseleave', () => {
      hoverG.style.transform = 'scale(1)';
    });
    hitArea.addEventListener('pointerup', (e) => {
      e.stopPropagation();
      openMapLightbox(p);
    });

    hoverG.appendChild(ring);
    hoverG.appendChild(imgSvg);
    hoverG.appendChild(badgeRing);
    hoverG.appendChild(badgeText);
    hoverG.appendChild(hitArea);
    zoomG.appendChild(hoverG);
    outerG.appendChild(zoomG);
    nodesContainerSvg.appendChild(outerG);

    nodeRegistry.push({ outerG, zoomG, data: p, connectorLine });
  });
}

// ── updateAllNodes ────────────────────────────────────────────────────────
// Sincroniza posición y escala con el viewBox en cada frame de animateViewBox.
// Para centrar los círculos sobre sus polígonos al hacer zoom in,
// ajustá los valores `centroid` en mapNumbered según tu mapa real.
function updateAllNodes() {
  const zoomRatio = currentVB.w / 900; // 1 = sin zoom, 0.33 = 3× zoom in

  // t: progreso de migración base → centroide (0=sin zoom, 1=3× zoom)
  const t = Math.max(0, Math.min(1, (1 - zoomRatio) / 0.67));

  nodeRegistry.forEach(({ outerG, zoomG, connectorLine, data }) => {
    const bx = data.x * 9;
    const by = data.y * 6.2;
    const cx = data.centroid ? data.centroid.x * 9   : bx;
    const cy = data.centroid ? data.centroid.y * 6.2 : by;

    const px = bx + (cx - bx) * t;
    const py = by + (cy - by) * t;

    outerG.setAttribute('transform', `translate(${px}, ${py})`);
    zoomG.style.transform = `scale(${zoomRatio})`;

    // Actualizar línea conectora: va del círculo al centroide del polígono
    if (connectorLine) {
      connectorLine.setAttribute("x1", px);
      connectorLine.setAttribute("y1", py);
      connectorLine.setAttribute("x2", cx);
      connectorLine.setAttribute("y2", cy);
      // La línea se desvanece a medida que el círculo llega al centroide
      connectorLine.setAttribute("opacity", 1 - t);
    }
  });
}

// ====================================================
// PANEL DE CALIBRACIÓN — siempre visible en el mapa
// Pasá el mouse sobre el centro de cada polígono y
// copiá los valores al campo centroid: { x, y }
// del nodo correspondiente en mapNumbered/mapLettered.
// Eliminá este bloque cuando termines de calibrar.
// ====================================================
(function setupCalibration() {
  const panel = document.createElement('div');
  Object.assign(panel.style, {
    position: 'fixed', bottom: '72px', right: '20px',
    background: 'rgba(10,10,10,0.95)', border: '1px solid #C8A96E',
    borderRadius: '6px', padding: '8px 16px',
    fontFamily: 'monospace', fontSize: '12px', color: '#C8A96E',
    zIndex: '99999', pointerEvents: 'none', display: 'none',
    boxShadow: '0 4px 20px rgba(0,0,0,0.6)', whiteSpace: 'nowrap',
  });
  document.body.appendChild(panel);

  document.addEventListener('mousemove', ev => {
    // Buscar el SVG en cada movimiento (por si cargó tarde)
    const svg = svgMap || document.querySelector('.map-svg-interactive');
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const inside = ev.clientX >= rect.left && ev.clientX <= rect.right &&
                   ev.clientY >= rect.top  && ev.clientY <= rect.bottom;
    if (!inside) { panel.style.display = 'none'; return; }

    const vb = currentVB || { x: 0, y: 0, w: 900, h: 620 };
    const svgX = ((ev.clientX - rect.left)  / rect.width)  * vb.w + vb.x;
    const svgY = ((ev.clientY - rect.top)   / rect.height) * vb.h + vb.y;
    const dx = (svgX / 9).toFixed(1);
    const dy = (svgY / 6.2).toFixed(1);

    panel.style.display = 'block';
    panel.innerHTML =
      `<span style="color:#888">x:</span> <b style="color:#fff">${dx}</b> &nbsp; ` +
      `<span style="color:#888">y:</span> <b style="color:#fff">${dy}</b><br>` +
      `<span style="color:#555; font-size:10px">centroid: { x: ${dx}, y: ${dy} }</span>`;
  });
})();

// 3. Lógica del Lightbox
const mapLb = document.getElementById('mapLightbox');
const mapLbImg = document.getElementById('lbImg');
const mapLbTitle = document.getElementById('lbTitle');
const mapLbBadge = document.getElementById('lbBadge');

function openMapLightbox(p) {
  if(!mapLb) return;
  mapLbImg.src = p.img;
  mapLbTitle.textContent = p.label;
  const isLetter = isNaN(p.id);
  mapLbBadge.textContent = isLetter ? `Espacio público · ${p.id}` : `Propuesta · ${p.id}`;
  mapLbBadge.style.color = isLetter ? '#8dbf8e' : '#d4763a';
  mapLb.classList.add('open');
}

function closeMapLightbox() {
  if(mapLb) {
    mapLb.classList.remove('open');
    setTimeout(() => { mapLbImg.src = ''; }, 350); 
  }
}

// Eventos para cerrar el Lightbox
const mapLbCloseBtn = document.getElementById('lbClose');
const mapLbBackdrop = document.getElementById('lbBackdrop');

if (mapLbCloseBtn) mapLbCloseBtn.addEventListener('click', closeMapLightbox);
if (mapLbBackdrop) mapLbBackdrop.addEventListener('click', closeMapLightbox);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && mapLb && mapLb.classList.contains('open')) {
    closeMapLightbox();
  }
});