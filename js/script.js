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

  if (slides[cur].id === 'sBalance')    setTimeout(triggerBalanceAnim, 80);
  if (slides[cur].id === 'sCorrientes') setTimeout(triggerBubbles, 200);
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
  { id: "1", label: "Escuela de Arte Municipal",               img: "imagenes/Escuela de Arte Municipal.jpg",               x: 11, y: 20, centroid: { x: 39.7, y: 60.5 } },
  { id: "2", label: "Galería de Arte",                         img: "imagenes/Galería de Arte.jpg",                         x: 16, y: 48, centroid: { x: 38.8, y: 62.3 } },
  { id: "3", label: "Museo del Carnaval",                      img: "imagenes/Museo del Carnaval.jpg",                      x: 25.4, y: 14.4, centroid: { x: 42.8, y: 57.7 } },
  { id: "4", label: "Museo del Chamamé y Peña",                img: "imagenes/Museo del Chamamé y Peña.jpg",                x: 41.6, y: 10.2, centroid: { x: 46.2, y: 60.8 } },
  { id: "5", label: "Museo del Deporte Correntino",            img: "imagenes/Museo del Deporte Correntino.jpg",            x: 33.5, y: 87.6, centroid: { x: 43.7, y: 65.1 } },
  { id: "6", label: "Instituto de Diseño Técnico Industrial",  img: "imagenes/Instituto de Diseño Técnico Industrial.jpg",  x: 45.3, y: 90.2, centroid: { x: 49.6, y: 68.1 } },
  { id: "7", label: "Expo Técnica",                            img: "imagenes/Expo Técnica.jpg",                            x: 58.8, y: 93.6, centroid: { x: 54.5, y: 65.5 } },
  { id: "8", label: "Área Disponible para Equipamientos",      img: "imagenes/Área Disponible para Equipamientos.jpeg",     x: 72.1, y: 90.6, centroid: { x: 60.0, y: 68.1 } },
  { id: "9", label: "Instituto Tecnológico",                   img: "imagenes/Instituto Tecnológico.jpg",                   x: 82.2, y: 80.6, centroid: { x: 63.9, y: 71.1 } },
];

const mapLettered = [
  { id: "a", label: "Plazoleta de los Inmigrantes",            img: "imagenes/Plazoleta de los Inmigrantes.jpg",            x:  11.6, y: 83.4, centroid: { x: 32.5,   y: 69.6   } },
  { id: "b", label: "Predio Caminito",                         img: "imagenes/Predio Caminito.jpg",                         x: 22, y: 87.3,  centroid: { x: 42.9,   y: 60.9   } },
  { id: "c", label: "Plaza de las Américas",                   img: "imagenes/Plaza de las Américas.jpg",                   x: 82.4, y: 38.6,    centroid: { x: 56.6,   y: 60.9   } },
  { id: "d", label: "Refuncionalización espacio público mixto escuela/paseo Lamadrid", img: "imagenes/Refuncionalización espacio público mixto escuela_paseo Lamadrid.jpeg", x: 57.6, y: 25.4, centroid: { x: 54.7, y: 54 } },
  { id: "e", label: "Paseo de Lamadrid",                       img: "imagenes/Paseo de Lamadrid.jpg",                       x: 71.7, y: 26.3, centroid: { x: 57,   y: 56.8   } },  
  { id: "f", label: "Esquina Aviador Correa y República del Líbano", img: "imagenes/Esquina Aviador Correa y República del Líbano.jpg",  x: 84.7, y: 55.1, centroid: { x: 58.8,   y: 63.3   } },  
  { id: "g", label: "Corredor Saludable",                            img: "imagenes/Corredor Saludable.jpeg",                            x: 87.3, y: 69.3, centroid: { x: 62.7,   y: 67.7   } },  
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
/*
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
*/

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
// ====================================================
// GRÁFICO BALANCE DE SUPERFICIES
// ====================================================
(function initBalanceChart() {
  const rowsEl   = document.getElementById('bc-rows');
  const deltasEl = document.getElementById('bc-deltas');
  if (!rowsEl || !deltasEl) return;

  const DATA = [
    { label: 'Educación',         actual: 22941.84, prop: 28511.84 },
    { label: 'Arte y Cultura',    actual:   465.59, prop:  2389.86 },
    { label: 'Deportiva',         actual:    20.00, prop:  5863.00 },
    { label: 'Espacios Públicos', actual:  2833.91, prop:  8726.93 },
  ];

  const MAX = Math.max(...DATA.flatMap(d => [d.actual, d.prop]));
  const fmt = n => Math.round(n).toLocaleString('es-AR') + ' m²';

  DATA.forEach(d => {
    const pctA = (d.actual / MAX * 100).toFixed(2);
    const pctP = (d.prop   / MAX * 100).toFixed(2);
    rowsEl.innerHTML += `
      <div class="bc-row">
        <div class="bc-row-label">${d.label}</div>
        <div class="bc-bars">
          <div class="bc-bar-track">
            <div class="bc-bar-fill bc-bar-fill--actual" data-pct="${pctA}" data-val="${d.actual}"></div>
            <span class="bc-label bc-label--actual" data-pct="${pctA}" data-val="${d.actual}">0 m²</span>
          </div>
          <div class="bc-bar-track">
            <div class="bc-bar-fill bc-bar-fill--prop" data-pct="${pctP}" data-val="${d.prop}"></div>
            <span class="bc-label bc-label--prop" data-pct="${pctP}" data-val="${d.prop}">0 m²</span>
          </div>
        </div>
      </div>`;
  });

  DATA.forEach(d => {
    const pct = Math.round(((d.prop - d.actual) / d.actual) * 100);
    deltasEl.innerHTML += `
      <div class="bc-delta">
        <div class="bc-delta-cat">${d.label}</div>
        <div class="bc-delta-val">+${pct.toLocaleString('es-AR')}%</div>
        <div class="bc-delta-row-sub">
          <span class="bc-delta-sub-item"><span class="bc-delta-sub-label">Actual</span>${fmt(d.actual)}</span>
          <span class="bc-delta-sub-arrow">→</span>
          <span class="bc-delta-sub-item"><span class="bc-delta-sub-label">Propuesta</span>${fmt(d.prop)}</span>
          <span class="bc-delta-sub-item bc-delta-sub-gain">+${fmt(d.prop - d.actual)}</span>
        </div>
      </div>`;
  });
})();

function animateCount(el, target, duration) {
  const start = performance.now();
  const fmtN = v => Math.round(v).toLocaleString('es-AR') + ' m²';
  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    el.textContent = fmtN(ease * target);
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = fmtN(target);
  }
  requestAnimationFrame(step);
}

function triggerBalanceAnim() {
  document.querySelectorAll('#sBalance .bc-bar-fill').forEach(b => b.style.width = '0%');
  document.querySelectorAll('#sBalance .bc-label').forEach(s => {
    s.textContent = '0 m²';
    s.style.transition = 'none';
    s.style.left = '8px';
  });
  document.querySelectorAll('#sBalance .bc-delta').forEach(d => d.classList.remove('visible'));

  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.querySelectorAll('#sBalance .bc-bar-fill').forEach(bar => {
      const pct   = parseFloat(bar.dataset.pct);
      const val   = parseFloat(bar.dataset.val);
      const track = bar.closest('.bc-bar-track');
      const label = track && track.querySelector('.bc-label');
      const delay = parseFloat(getComputedStyle(bar).transitionDelay) * 1000 || 0;

      bar.style.width = pct + '%';

      if (label) {
        label.style.transition = `left 1.1s cubic-bezier(0.4,0,0.2,1) ${delay}ms`;
        label.style.left = `clamp(8px, calc(${pct}% - 100px), calc(100% - 108px))`;
        setTimeout(() => animateCount(label, val, 900), delay);
      }
    });

    setTimeout(() => {
      document.querySelectorAll('#sBalance .bc-delta').forEach(d => d.classList.add('visible'));
    }, 600);
  }));
}

// ====================================================
// BURBUJAS — La Ciudad de Corrientes
// ────────────────────────────────────────────────────
// Para ajustar cada burbuja editá solo el array BUBBLES:
//   x   → posición horizontal en % del panel derecho (0=izq, 100=der)
//   y   → posición vertical   en % del panel derecho (0=arr, 100=aba)
//   size→ diámetro en px (dejá en null para usar el tamaño por defecto 140px)
// ====================================================
const BUBBLES = [    

  { img: 'imagenes/pesca.png',        label: 'Pesca',      x: 32, y: 58, size: 180 },
  { img: 'imagenes/iglesia.png',      label: 'Patrimonio', x: 39, y: 8, size: 150 },
  { img: 'imagenes/esteros.png',      label: 'Iberá',      x: 52, y: 47, size: 180 },
  { img: 'imagenes/mate.png',         label: 'mate',       x: 57, y: 23, size: 130 },
  { img: 'imagenes/costanera.png',    label: 'Costanera',  x: 29, y: 13, size: 130 },
  { img: 'imagenes/carnaval.png',     label: 'Carnaval',   x: 42.9, y: 29, size: 200 },
  { img: 'imagenes/chamame_prov.png', label: 'Chamamé',    x: 29, y: 36, size: 250 },
];

// Inyectar burbujas en el DOM al cargar
(function buildBubbles() {
  const panel = document.getElementById('bubblePanel');
  if (!panel) return;

  BUBBLES.forEach((b, i) => {
    const size = b.size || 140;
    const el   = document.createElement('div');
    el.className = 'bubble';
    el.style.left   = b.x + '%';
    el.style.top    = b.y + '%';
    el.style.width  = size + 'px';
    el.style.height = size + 'px';

    el.innerHTML = `
      <img src="${b.img}" alt="${b.label}">
      <span class="bubble-label">${b.label}</span>`;

    panel.appendChild(el);
  });
})();

function triggerBubbles() {
  const bubbles = document.querySelectorAll('#sCorrientes .bubble');
  // Reset
  bubbles.forEach(b => b.classList.remove('bubble-in'));
  // Aparecen de a una con 220 ms de separación
  bubbles.forEach((b, i) => {
    setTimeout(() => b.classList.add('bubble-in'), i * 220);
  });
}

// ====================================================
// SLIDE ACTIVIDAD URBANA — sub-pasos navegables
// ====================================================
(function () {
  const SLIDE_ID   = 'sActividad';
  const TOTAL_CAPS = 6; // capas 0..5

  // ── CONFIGURACIÓN DE CÍRCULOS (capa 3) ──────────────
  // x, y  → posición en % del panel derecho (0=izq/arr, 100=der/aba)
  // size  → diámetro en vw
  // color → color de fondo con transparencia
  // label → array de líneas de texto (vacío = sin label)
  // labelOffset → { x, y } en % respecto al centro del círculo
// ── CONFIGURACIÓN DE CÍRCULOS (capa 3) ──────────────
  const ACAP_CIRCLES = [
    {
      x: 50, y: 34,
      size: '18vw',
      color: 'rgba(160, 110, 210, 0.35)',
      border: '2px solid rgba(140, 90, 190, 0.5)',
      label: ['Centro', 'Histórico'],
      labelX: 57, // Ajustá este valor para mover horizontalmente (0 a 100)
      labelY: 30, // Ajustá este valor para mover verticalmente (0 a 100)
      shadow: "0 0 6px white, 0 0 12px white, 0 0 18px white" // Buffer blanco reforzado
    },
    {
      x: 25, y: 50,
      size: '18vw',
      color: 'rgba(160, 110, 210, 0.35)',
      border: '2px solid rgba(140, 90, 190, 0.5)',
      label: ['Centro comercial', 'costero'],
      labelX: 35, // Ajustá este valor para mover horizontalmente
      labelY: 53, // Ajustá este valor para mover verticalmente
      shadow: "0 0 6px white, 0 0 12px white, 0 0 18px white"
    },
  ];

  // ── CONFIGURACIÓN DEL NUEVO NODO (capa 4) ───────────
  const ACAP_NODO = {
    x: 60, y: 66,
    size: '15vw',
    color: 'rgba(210, 80, 200, 0.35)',
    border: '2px dashed rgba(190, 60, 180, 0.6)',
    textposition: 'center',
    label: ['Nuevo Nodo Cultural'],
    labelX: 72, // Ajustá este valor para mover horizontalmente
    labelY: 67, // Ajustá este valor para mover verticalmente
    shadow: "0 0 6px white, 0 0 12px white, 0 0 18px white"
  };



  // ────────────────────────────────────────────────────

  let acapStep = 0;

  function getSlide() { return document.getElementById(SLIDE_ID); }
  function isActive()  { const s = getSlide(); return s && s.classList.contains('active'); }

  // ── Construir DOM de círculos (capa 3) ──
  function buildCircles() {
    const layer = document.getElementById('acapCirclesLayer');
    if (!layer) return;
    layer.innerHTML = '';
    ACAP_CIRCLES.forEach(function (c) {
      // Círculo
      const div = document.createElement('div');
      div.className = 'acap-circulo';
      div.style.cssText = [
        'left:'   + c.x    + '%',
        'top:'    + c.y    + '%',
        'width:'  + c.size,
        'height:' + c.size,
        'background:' + c.color,
        'border:' + c.border,
      ].join(';');
      layer.appendChild(div);

      // Label
      if (c.label && c.label.length) {
        const lbl = document.createElement('div');
        lbl.className = 'acap-label';
        lbl.style.cssText = [
          'left:'+ (c.x + (c.labelOffset ? c.labelOffset.x : 0)) + '%',
          'top:' + (c.y + (c.labelOffset ? c.labelOffset.y : 0)) + '%',
          'transform: translate(-50%, -50%)',
          'text-align: center',
        ].join(';');
        lbl.innerHTML = c.label.map(function(l, i) {
          return '<span class="acap-label-line' + (i === 0 ? '1' : '2') + '">' + l + '</span>';
        }).join('');
        layer.appendChild(lbl);
      }
    });
  }

  // ── Construir DOM del Nuevo Nodo (capa 4) ──
  function buildNodo() {
    const layer = document.getElementById('acapNodoLayer');
    if (!layer) return;
    layer.innerHTML = '';
    const c = ACAP_NODO;

    const div = document.createElement('div');
    div.className = 'acap-circulo';
    div.style.cssText = [
      'left:'   + c.x    + '%',
      'top:'    + c.y    + '%',
      'width:'  + c.size,
      'height:' + c.size,
      'background:' + c.color,
      'border:' + c.border,
    ].join(';');
    layer.appendChild(div);

    if (c.label && c.label.length) {
      const lbl = document.createElement('div');
      lbl.className = 'acap-label';
      lbl.style.cssText = [
        'left:'+ (c.x + (c.labelOffset ? c.labelOffset.x : 0)) + '%',
        'top:' + (c.y + (c.labelOffset ? c.labelOffset.y : 0)) + '%',
        'transform: translate(-50%, -50%)',
        'text-align: center',
      ].join(';');
      lbl.innerHTML = c.label.map(function(l, i) {
        return '<span class="acap-label-line' + (i === 0 ? '1' : '2') + '">' + l + '</span>';
      }).join('');
      layer.appendChild(lbl);
    }
  }

  // ── Construir flechas SVG (capa 5) ──
  function buildArrows() {
    const g = document.getElementById('acapArrowsGroup');
    if (!g) return;
    g.innerHTML = '';
    ACAP_ARROWS.forEach(function (a) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'acap-arrow');
      path.setAttribute('d', a.d);
      path.setAttribute('marker-end', 'url(#arr)');
      g.appendChild(path);
    });
  }

  // ── Construir stepper ──
  function buildStepper() {
    const st = document.getElementById('acapStepper');
    if (!st) return;
    st.innerHTML = '';
    for (let i = 0; i < TOTAL_CAPS; i++) {
      const d = document.createElement('span');
      d.className = 'acap-step-dot' + (i === 0 ? ' active' : '');
      st.appendChild(d);
    }
  }

  // ── Renderizar estado actual ──
  function render() {
    const slide = getSlide();
    if (!slide) return;
    for (let i = 1; i < TOTAL_CAPS; i++) {
      const cap = slide.querySelector('.acap-' + i);
      if (cap) cap.classList.toggle('acap-visible', i <= acapStep);
    }
    slide.querySelectorAll('.acap-step-dot').forEach(function (d, i) {
      d.classList.toggle('active', i === acapStep);
    });
  }

  function reset() { acapStep = 0; render(); }

  function next() {
    if (acapStep < TOTAL_CAPS - 1) { acapStep++; render(); return true; }
    return false;
  }
  function prev() {
    if (acapStep > 0) { acapStep--; render(); return true; }
    return false;
  }

  // ── Init: construir elementos al cargar ──
  window.addEventListener('DOMContentLoaded', function () {
    buildCircles();
    buildNodo();
    buildArrows();
    buildStepper();
  });

  // ── Observer para reset al entrar a la slide ──
  const observer = new MutationObserver(function () {
    if (isActive()) reset();
  });
  window.addEventListener('DOMContentLoaded', function () {
    const s = getSlide();
    if (s) observer.observe(s, { attributes: true, attributeFilter: ['class'] });
  });

  // ── Intercepción de navegación ──
  // Botones — sobreescribir onclick después de que el script original los asigne
  window.addEventListener('load', function () {
    document.getElementById('nextBtn').onclick = function () {
      if (isActive() && next()) return;
      go(cur + 1);
    };
    document.getElementById('prevBtn').onclick = function () {
      if (isActive() && prev()) return;
      go(cur - 1);
    };
  });

  // Teclado (capture para interceptar antes del listener original)
  document.addEventListener('keydown', function (e) {
    if (!isActive()) return;
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!next()) go(cur + 1);
    }
    if (e.key === 'ArrowLeft') {
      e.stopImmediatePropagation();
      if (!prev()) go(cur - 1);
    }
  }, true);

  // Swipe
  let tx0 = null;
  document.addEventListener('touchstart', function (e) { tx0 = e.touches[0].clientX; }, true);
  document.addEventListener('touchend', function (e) {
    if (!isActive() || tx0 === null) return;
    const dx = e.changedTouches[0].clientX - tx0;
    tx0 = null;
    if (Math.abs(dx) < 40) return;
    e.stopImmediatePropagation();
    if (dx < 0) { if (!next()) go(cur + 1); }
    else        { if (!prev()) go(cur - 1); }
  }, true);

})();
