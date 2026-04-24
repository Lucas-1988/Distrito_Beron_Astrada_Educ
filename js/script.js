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

// 3. Configurar el estilo de las capas GeoJSON
const stylePredios = { color: "#ffffffec", weight: 2, fillOpacity: 0.6, fillColor: "#006d0db0" };
const stylePropuestas = { color: "#E2711f", weight: 2, fillOpacity: 0.6, fillColor: "#E2711f" };
const styleCaminito = { color: "#fffb00d7", weight: 2, /*dashArray: "5, 7"*/ fillOpacity: 0.6 , fillColor: "#fffb00d7" }; 

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

// 4. Crear los contenedores vacíos para las capas e inyectar la función del Popup
const capaPredios = L.geoJSON(null, { style: stylePredios, onEachFeature: crearPopup });
const capaPropuestas = L.geoJSON(null, { style: stylePropuestas, onEachFeature: crearPopup });
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
  { id: "1", label: "Escuela de Arte Municipal", img: "imagenes/Escuela de Arte Municipal.jpg", x: 18, y: 40 },
  { id: "2", label: "Galería de Arte", img: "imagenes/Galería de Arte.jpg", x: 16, y: 48 },
  { id: "3", label: "Museo del Carnaval", img: "imagenes/Museo del Carnaval.jpg", x: 30, y: 30 },
  { id: "4", label: "Museo del Chamamé y Peña", img: "imagenes/Museo del Chamamé y Peña.jpg", x: 44, y: 43 },
  { id: "5", label: "Museo del Deporte Correntino", img: "imagenes/Museo del Deporte Correntino.jpg", x: 30, y: 58 },
  { id: "6", label: "Instituto de Diseño Técnico Industrial", img: "imagenes/Instituto de Diseño Técnico Industrial.jpg", x: 44, y: 72},
  { id: "7", label: "Expo Técnica", img: "imagenes/Expo Técnica.jpg", x: 61, y: 62 },
  { id: "8", label: "Área Disponible para Equipamientos", img: "imagenes/Área Disponible para Equipamientos.jpeg", x: 68, y: 70 },
  { id: "9", label: "Instituto Tecnológico", img: "imagenes/Instituto Tecnológico.jpg", x: 78, y: 78 },
];

const mapLettered = [
  { id: "a", label: "Plazoleta de los Inmigrantes", img: "imagenes/Plazoleta de los Inmigrantes.jpg", x:  8, y: 70},
  { id: "b", label: "Predio Caminito", img: "imagenes/Predio Caminito.jpg", x: 38, y: 38},
  { id: "c", label: "Plaza de las Américas", img: "imagenes/Plaza de las Américas.jpg", x: 67, y: 41 },
  { id: "d", label: "Refuncionalización espacio público mixto escuela/paseo Lamadrid", img: "imagenes/Refuncionalización espacio público mixto escuela_paseo Lamadrid.jpeg", x: 49, y: 22 },
  { id: "e", label: "Paseo de Lamadrid", img: "imagenes/Paseo de Lamadrid.jpg", x: 58, y: 34 },
  { id: "f", label: "Esquina Aviador Correa y República del Líbano", img: "imagenes/Esquina Aviador Correa y República del Líbano.jpg", x: 70, y: 50 },
  { id: "g", label: "Corredor Saludable", img: "imagenes/Corredor Saludable.jpeg", x: 92, y: 70 },
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

  const delta = Math.abs(targetVB.x - currentVB.x) + Math.abs(targetVB.y - currentVB.y)
              + Math.abs(targetVB.w - currentVB.w) + Math.abs(targetVB.h - currentVB.h);
  if (delta > 0.05) {
    rafId = requestAnimationFrame(animateViewBox);
  } else {
    // Snap final exacto
    currentVB = { ...targetVB };
    if (svgMap) svgMap.setAttribute('viewBox',
      `${currentVB.x} ${currentVB.y} ${currentVB.w} ${currentVB.h}`);
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
if (nodesContainerSvg) {
  mapAllNodes.forEach(p => {
    const nodeRadius = 35; 
    const gridX = p.x * 9;   // Ajustado a la escala 900
    const gridY = p.y * 6.2; // Ajustado a la escala 620
    const isLetter = isNaN(p.id);

    const nodeGroup = document.createElementNS(svgNS, "g");
    nodeGroup.setAttribute("class", "node-svg");
    // Anclar transform-origin al centro del círculo para que no se mueva al escalar
    nodeGroup.style.transformBox    = 'fill-box';
    nodeGroup.style.transformOrigin = `${gridX}px ${gridY}px`;
    nodeGroup.style.transition      = 'transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)';

    const ring = document.createElementNS(svgNS, "circle");
    ring.setAttribute("cx", gridX);
    ring.setAttribute("cy", gridY);
    ring.setAttribute("r", nodeRadius);
    ring.setAttribute("fill", "#222"); 
    ring.setAttribute("stroke", "#C8A96E"); 
    ring.setAttribute("stroke-width", "3");
    ring.setAttribute("style", "filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5)); pointer-events: none;");
    nodeGroup.appendChild(ring);

    const clipDef = document.createElementNS(svgNS, "clipPath");
    const clipId = `clip-${p.id}`;
    clipDef.setAttribute("id", clipId);
    const clipCircle = document.createElementNS(svgNS, "circle");
    clipCircle.setAttribute("cx", gridX);
    clipCircle.setAttribute("cy", gridY);
    clipCircle.setAttribute("r", nodeRadius - 1.5); 
    clipDef.appendChild(clipCircle);
    nodesContainerSvg.appendChild(clipDef); 

    const imgSvg = document.createElementNS(svgNS, "image");
    imgSvg.setAttribute("href", p.img);
    imgSvg.setAttribute("x", gridX - nodeRadius);
    imgSvg.setAttribute("y", gridY - nodeRadius);
    imgSvg.setAttribute("width", nodeRadius * 2);
    imgSvg.setAttribute("height", nodeRadius * 2);
    imgSvg.setAttribute("preserveAspectRatio", "xMidYMid slice"); 
    imgSvg.setAttribute("clip-path", `url(#${clipId})`); 
    imgSvg.setAttribute("style", "pointer-events: none;");
    nodeGroup.appendChild(imgSvg);

    const badgeRadius = 13;
    const badgeRing = document.createElementNS(svgNS, "circle");
    badgeRing.setAttribute("cx", gridX + nodeRadius - 6);
    badgeRing.setAttribute("cy", gridY + nodeRadius - 6);
    badgeRing.setAttribute("r", badgeRadius);
    badgeRing.setAttribute("fill", "#0a0a0a"); 
    badgeRing.setAttribute("stroke", isLetter ? '#8dbf8e' : '#d4763a');
    badgeRing.setAttribute("stroke-width", "2");
    badgeRing.setAttribute("style", "pointer-events: none;");
    nodeGroup.appendChild(badgeRing);

    const badgeText = document.createElementNS(svgNS, "text");
    badgeText.setAttribute("x", gridX + nodeRadius - 6);
    badgeText.setAttribute("y", gridY + nodeRadius - 6 + 1); 
    badgeText.setAttribute("text-anchor", "middle");
    badgeText.setAttribute("dominant-baseline", "central"); 
    badgeText.setAttribute("font-family", "DM Sans, sans-serif");
    badgeText.setAttribute("font-size", "11px");
    badgeText.setAttribute("font-weight", "700");
    badgeText.setAttribute("fill", isLetter ? '#38cc13' : '#fff');
    badgeText.setAttribute("style", "pointer-events: none;");
    badgeText.textContent = p.id;
    nodeGroup.appendChild(badgeText);

    // ATRAPADOR DE CLICS INVISIBLE (Soluciona que no reaccionen al cursor)
    const hitArea = document.createElementNS(svgNS, "circle");
    hitArea.setAttribute("cx", gridX);
    hitArea.setAttribute("cy", gridY);
    hitArea.setAttribute("r", nodeRadius + 5); 
    hitArea.setAttribute("fill", "transparent");
    hitArea.setAttribute("class", "node-hit"); // identificador para bloquear el pan
    hitArea.style.pointerEvents = 'all';
    hitArea.style.cursor = 'pointer';

    hitArea.addEventListener('mouseenter', () => {
      nodesContainerSvg.appendChild(nodeGroup); // trae al frente sin romper transform
      nodeGroup.style.transform = 'scale(1.1)';
    });
    hitArea.addEventListener('mouseleave', () => {
      nodeGroup.style.transform = 'scale(1)';
    });

    // pointerup sobre el propio nodo = click real (no pan)
    hitArea.addEventListener('pointerup', (e) => {
      e.stopPropagation();
      openMapLightbox(p);
    });
    
    nodeGroup.appendChild(hitArea);
    nodesContainerSvg.appendChild(nodeGroup);
  });
}

// 3. Lógica del Lightbox (Ventana emergente)
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