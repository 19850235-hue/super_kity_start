// ==========================================
// --- MÓDULO PRINCIPAL GAME.JS (SUPER SANRIO VS DEMONIOS) ---
// Estructura: 3 MUNDOS x 5 NIVELES (niveles 1-4 dan llave, nivel 5 = jefe)
// ==========================================

const CHARACTERS = {
    kitty: {
        name: 'Hello Kitty',
        speed: 14,
        jump: 17,
        maxLives: 3,
        label: '🎀 Lluvia Dulce (AoE)',
        abilityName: 'Lluvia de Galletas',
        cooldown: 8,
        color: '#ff4d94',
        emoji: '🎀'
    },
    mymelody: {
        name: 'My Melody',
        speed: 12,
        jump: 20,
        maxLives: 3,
        label: '🌸 Escudo Arcoíris',
        abilityName: 'Burbuja de Invulnerabilidad',
        cooldown: 12,
        color: '#f06292',
        emoji: '🌸'
    },
    kuromi: {
        name: 'Kuromi',
        speed: 18,
        jump: 15,
        maxLives: 3,
        label: '😈 Embestida Sombría',
        abilityName: 'Dash Demoniaco',
        cooldown: 6,
        color: '#9575cd',
        emoji: '😈'
    },
    cinnamon: {
        name: 'Cinnamoroll',
        speed: 13,
        jump: 22,
        maxLives: 3,
        label: '☁️ Triple Salto / Tornado',
        abilityName: 'Vuelo Alto',
        maxJumps: 3,
        cooldown: 7,
        color: '#4fc3f7',
        emoji: '☁️'
    },
    purin: {
        name: 'Pompompurin',
        speed: 11,
        jump: 16,
        maxLives: 4,
        label: '💛 Tanque (4 Vidas)',
        abilityName: 'Onda Expansiva',
        cooldown: 9,
        color: '#ffca28',
        emoji: '💛'
    }
};

// --- 3 MUNDOS, cada uno con 5 niveles (índices 0-3 = niveles normales con llave, índice 4 = jefe) ---
const WORLDS = [
    { name: 'Jardín Rosa', icon: '🎀', bg: 0xffd1e6, platform: 0xff5c9d, cardFrom: '#ffb3d1', cardTo: '#ff4d94', theme: 'garden' },
    { name: 'Valle Dorado', icon: '🪙', bg: 0xffd78a, platform: 0xc77800, cardFrom: '#ffe082', cardTo: '#ffa726', theme: 'golden' },
    { name: 'Castillo Dulce', icon: '🏰', bg: 0x6a2c91, platform: 0x7e57c2, cardFrom: '#ce93d8', cardTo: '#8e24aa', theme: 'night' }
];

// Enemigo terrestre/volador propio de cada mundo (Mundo 1: demonio + gárgola clásicos; Mundo 2: golem de hielo tanque; Mundo 3: fantasma errático)
const WORLD_ENEMIES = [
    // special = enemigo nuevo propio del mundo: Jardín Rosa → lanzador (dispara), Valle Dorado → escudado (bloquea balas de frente),
    // Castillo Dulce → espectral (se vuelve intangible cada cierto tiempo). tint/flyTint = matiz propio del mundo.
    { ground: () => Render3D.createEnemyMesh(), groundHP: 1, flying: () => Render3D.createFlyingEnemyMesh(), special: 'shooter', tint: null, flyTint: null },
    { ground: () => Render3D.createGolemEnemyMesh(), groundHP: 2, flying: () => Render3D.createFlyingEnemyMesh(), special: 'shield', tint: null, flyTint: 0xffc107 },
    { ground: () => Render3D.createEnemyMesh(), groundHP: 1, flying: () => Render3D.createGhostEnemyMesh(), special: 'ghost', tint: 0x9c27b0, flyTint: null }
];

// Adornos de plataforma propios de cada mundo
const THEME_PROPS = {
    garden: ['flower', 'tulip', 'flower', 'bush', 'picket', 'applekitty', 'mushroom'],
    golden: ['wheat', 'haystack', 'pumpkin', 'rock', 'wheat', 'goldpot'],
    night: ['candycane', 'lollipop', 'gumdrop', 'cupcake', 'banner', 'candycane']
};

// Power-ups temporales
const POWERUPS = {
    speed:  { emoji: '⚡', secs: 9,  label: '¡Velocidad!', color: '#ffb300' },
    jump:   { emoji: '🦘', secs: 10, label: '¡Súper salto!', color: '#00c853' },
    magnet: { emoji: '🧲', secs: 14, label: '¡Imán de tesoros!', color: '#e53935' }
};
const LEVELS_PER_WORLD = 5;

function levelLabel(levelIdx) {
    return levelIdx === LEVELS_PER_WORLD - 1 ? `Nivel ${levelIdx + 1}: 👺 Jefe Final` : `Nivel ${levelIdx + 1}: 🔑 Llave`;
}

// --- PROGRESO DEL JUGADOR ---
// Dificultades: vidas extra/menos, cantidad de diablitos y velocidad de persecución
const DIFFICULTIES = {
    easy:   { label: '😊 Fácil',   lives: 1,  enemyMul: 0.7,  speedMul: 0.85 },
    normal: { label: '🙂 Normal',  lives: 0,  enemyMul: 1,    speedMul: 1 },
    hard:   { label: '😈 Difícil', lives: -1, enemyMul: 1.25, speedMul: 1.2 }
};

let gameProgress = {
    selectedSkin: 'kitty',
    difficulty: 'normal',
    score: 0,
    worlds: [
        { unlocked: true, keys: 0, unlockedLevels: [true, false, false, false, false], completed: false },
        { unlocked: false, keys: 0, unlockedLevels: [false, false, false, false, false], completed: false },
        { unlocked: false, keys: 0, unlockedLevels: [false, false, false, false, false], completed: false }
    ]
};

// --- GUARDADO AUTOMÁTICO (localStorage) ---
const SAVE_KEY = 'superKittyVsDemonios_progress';
function saveProgress() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(gameProgress)); } catch (err) { /* sin localStorage: se juega igual */ }
}
function loadProgress() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        const okWorlds = saved && Array.isArray(saved.worlds) && saved.worlds.length === gameProgress.worlds.length
            && saved.worlds.every(w => w && typeof w.unlocked === 'boolean' && typeof w.keys === 'number'
                && Array.isArray(w.unlockedLevels) && w.unlockedLevels.length === LEVELS_PER_WORLD);
        if (!okWorlds || typeof saved.score !== 'number') return;
        gameProgress = saved;
        if (!CHARACTERS[gameProgress.selectedSkin]) gameProgress.selectedSkin = 'kitty';
        if (!DIFFICULTIES[gameProgress.difficulty]) gameProgress.difficulty = 'normal';
    } catch (err) { /* datos dañados: se empieza de cero */ }
}

// --- GENERACIÓN PROCEDURAL DE NIVELES (determinista por semilla, no se repite el mismo layout copiado) ---
function seededRandom(seed) {
    let t = seed >>> 0;
    return function () {
        t += 0x6D2B79F5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

function generateLayout(seed, platformCount, wideEndPlatform) {
    const rand = seededRandom(seed);
    const layout = [];
    let x = 0;
    for (let i = 0; i < platformCount; i++) {
        const isLast = i === platformCount - 1;
        const w = (isLast && wideEndPlatform) ? 40 : 14 + Math.floor(rand() * 8); // 14-21, última ancha si hay jefe
        const y = i === 0 ? 0 : Math.floor(rand() * 7); // 0-6
        layout.push({ x, y, w });
        x += Math.floor(w / 2) + 10 + Math.floor(rand() * 10);
    }
    // Separación mínima entre BORDES de plataformas consecutivas. Antes el hueco podía ser
    // negativo (plataformas solapadas), sobre todo con la plataforma ancha del jefe (w=40).
    // Si un hueco queda corto se desplaza esa plataforma y todas las siguientes.
    const MIN_GAP = 2;
    for (let i = 1; i < layout.length; i++) {
        const prev = layout[i - 1], cur = layout[i];
        const gap = (cur.x - cur.w / 2) - (prev.x + prev.w / 2);
        if (gap < MIN_GAP) {
            const shift = MIN_GAP - gap;
            for (let j = i; j < layout.length; j++) layout[j].x += shift;
        }
    }
    return layout;
}

const container = document.getElementById('game-container');
container.style.position = 'relative';

// Guarda el renderer 3D activo para poder liberarlo antes de crear uno nuevo.
// Sin esto, cada nivel jugado (y sus reintentos) deja abierto un contexto WebGL
// que el navegador nunca cierra solo; tras varios niveles se agota el cupo de
// contextos y el siguiente nivel (típicamente el jefe, al ser el más lejano)
// sale en pantalla negra porque ya no hay dónde crear uno nuevo.
let currentGameRenderer = null;
let currentGameScene = null;

// Libera geometrías, materiales y texturas de la escena anterior. Antes solo se cerraba el
// contexto WebGL y la memoria de la escena se iba acumulando partida tras partida.
function disposeScene(scene) {
    scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        const mats = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : [];
        mats.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
    });
}

function disposeCurrentRenderer() {
    if (currentGameScene) {
        try { disposeScene(currentGameScene); } catch (err) { /* seguimos igual */ }
        currentGameScene = null;
    }
    if (currentGameRenderer) {
        try {
            currentGameRenderer.forceContextLoss();
            currentGameRenderer.dispose();
        } catch (err) { /* nada más que hacer, seguimos igual */ }
        currentGameRenderer = null;
    }
}

// ==========================================
// --- MODO GRANDE / PANTALLA COMPLETA (persiste al cambiar de mundo, nivel o menú) ---
// ==========================================
let isLargeMode = false;

function updateContainerSizeClass() {
    container.classList.toggle('game-container-large', isLargeMode);
    const cabinet = document.querySelector('.arcade-cabinet');
    if (cabinet) cabinet.classList.toggle('cabinet-large', isLargeMode);
}

function toggleFullscreenMode() {
    isLargeMode = !isLargeMode;
    const cabinet = document.querySelector('.arcade-cabinet');
    const target = cabinet || container;

    if (isLargeMode) {
        // Se intenta pantalla completa real del navegador; si no está disponible
        // (o el navegador la bloquea), igual se aplica el modo grande por CSS.
        const req = target.requestFullscreen || target.webkitRequestFullscreen;
        if (req) {
            try {
                const p = req.call(target);
                if (p && p.catch) p.catch(() => { /* pantalla completa no disponible aquí: se queda en modo grande por CSS */ });
            } catch (err) { /* nada más que hacer, seguimos con el modo grande por CSS */ }
        }
    } else if (document.fullscreenElement || document.webkitFullscreenElement) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) {
            try {
                const p = exit.call(document);
                if (p && p.catch) p.catch(() => {});
            } catch (err) { /* nada más que hacer */ }
        }
    }

    updateContainerSizeClass();
    if (window.__resizeGameCanvas) window.__resizeGameCanvas();
}

// Si el usuario sale de pantalla completa con Esc (o el navegador la cierra por su cuenta),
// el modo grande también se apaga para que todo quede sincronizado.
function handleFullscreenExit() {
    const stillFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
    if (!stillFullscreen && isLargeMode) {
        isLargeMode = false;
        updateContainerSizeClass();
        if (window.__resizeGameCanvas) window.__resizeGameCanvas();
    }
}
document.addEventListener('fullscreenchange', handleFullscreenExit);
document.addEventListener('webkitfullscreenchange', handleFullscreenExit);

// Al terminar la transición de tamaño del contenedor, se reajusta el canvas 3D (si hay uno activo)
container.addEventListener('transitionend', () => { if (window.__resizeGameCanvas) window.__resizeGameCanvas(); });

window.addEventListener('keydown', (e) => {
    if ((e.key === 'p' || e.key === 'P') && !e.repeat) toggleFullscreenMode();
});

// Botón flotante de pantalla completa: se crea UNA sola vez fuera de #game-container,
// para que sobreviva a los container.innerHTML = '' de cada cambio de pantalla/menú.
function ensureFullscreenButton() {
    const cabinet = document.querySelector('.arcade-cabinet');
    if (!cabinet || document.getElementById('fs-toggle-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'fs-toggle-btn';
    btn.title = 'Pantalla completa (P)';
    btn.textContent = '⛶';
    btn.style.cssText = `
        position: absolute; top: 14px; right: 14px; width: 38px; height: 38px;
        border-radius: 50%; border: 3px solid #ff80ab; background: #fff; color: #ff2a70;
        font-size: 18px; cursor: pointer; z-index: 30; box-shadow: 0 3px 8px rgba(0,0,0,0.15);
        font-family: inherit; display: flex; align-items: center; justify-content: center;
    `;
    btn.onclick = () => toggleFullscreenMode();
    cabinet.appendChild(btn);
}
ensureFullscreenButton();

// Aviso de error visible en pantalla: si algo falla, se ve el motivo aquí mismo
// (evita quedarse con una pantalla negra/colgada sin saber por qué).
function showGameError(err) {
    const cabinet = document.querySelector('.arcade-cabinet');
    if (!cabinet) return;
    let box = document.getElementById('game-error-box');
    if (!box) {
        box = document.createElement('div');
        box.id = 'game-error-box';
        box.style.cssText = `
            position: absolute; bottom: 10px; left: 10px; right: 10px;
            background: #fff0f0; border: 2px solid #e53935; border-radius: 12px;
            color: #b71c1c; font-family: monospace; font-size: 11px; text-align: left;
            padding: 8px 12px; z-index: 40; max-height: 110px; overflow-y: auto;
            white-space: pre-wrap; box-shadow: 0 3px 8px rgba(0,0,0,0.2);
        `;
        cabinet.appendChild(box);
    }
    const msg = (err && err.message) ? err.message : String(err);
    box.textContent = '⚠️ ' + msg;
    box.style.display = 'block';
}
window.addEventListener('error', (e) => showGameError(e.error || e.message || e));

// Genera las partículas de fondo animadas para la tarjeta de un mundo (según su tema)
function worldPreviewHTML(theme) {
    let bits = '';
    if (theme === 'garden') {
        for (let i = 0; i < 8; i++) {
            const left = Math.round(Math.random() * 95);
            const size = 5 + Math.random() * 4;
            const dur = 3 + Math.random() * 3;
            const delay = -Math.random() * 5;
            const color = ['#ffb3d1', '#ff80ab', '#fff'][i % 3];
            bits += `<span class="preview-bit preview-petal" style="left:${left}%; width:${size}px; height:${size}px; background:${color}; animation-duration:${dur}s; animation-delay:${delay}s;"></span>`;
        }
    } else if (theme === 'golden') {
        for (let i = 0; i < 10; i++) {
            const left = Math.round(Math.random() * 95);
            const size = 4 + Math.random() * 4;
            const dur = 2.5 + Math.random() * 3;
            const delay = -Math.random() * 5;
            const color = ['#ffd54f', '#ffb300', '#fff3c4'][i % 3];
            bits += `<span class="preview-bit preview-petal" style="left:${left}%; width:${size}px; height:${size}px; background:${color}; animation-duration:${dur}s; animation-delay:${delay}s;"></span>`;
        }
    } else if (theme === 'night') {
        for (let i = 0; i < 9; i++) {
            const left = Math.round(Math.random() * 95);
            const top = Math.round(Math.random() * 70);
            const size = 6 + Math.random() * 5;
            const dur = 1.4 + Math.random() * 1.6;
            const delay = -Math.random() * 3;
            bits += `<span class="preview-bit preview-star" style="left:${left}%; top:${top}%; width:${size}px; height:${size}px; animation-duration:${dur}s; animation-delay:${delay}s;"></span>`;
        }
    }
    return `<div class="world-preview">${bits}</div>`;
}

// --- ESTILOS KAWAII (una sola inyección) ---
function ensureKawaiiStyles() {
    if (document.getElementById('kawaii-menu-styles')) return;
    const style = document.createElement('style');
    style.id = 'kawaii-menu-styles';
    style.textContent = `
        @keyframes kawaiiFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes kawaiiPop { 0% { transform: scale(0.85); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .kawaii-menu { animation: kawaiiPop 0.25s ease; }
        .kawaii-title { text-shadow: 2px 2px 0 #fff, 4px 4px 0 #ffb2dd, 0 0 18px rgba(255,64,129,0.35); letter-spacing: 1px; }
        .kawaii-char-btn { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .kawaii-char-btn:active { transform: scale(0.92); }
        .kawaii-char-btn.selected { animation: kawaiiFloat 1.4s ease-in-out infinite; }
        .kawaii-world-card { transition: transform 0.15s ease, box-shadow 0.15s ease; position: relative; overflow: hidden; }
        .kawaii-world-card:active { transform: scale(0.97); }
        .kawaii-level-btn { transition: transform 0.15s ease; }
        .kawaii-level-btn:active { transform: scale(0.94); }
        .kawaii-scroll::-webkit-scrollbar { width: 8px; }
        .kawaii-scroll::-webkit-scrollbar-thumb { background: #ff80ab; border-radius: 8px; }
        .kawaii-scroll::-webkit-scrollbar-track { background: #ffe4ec; }

        /* Vista previa animada por mundo (dentro de la tarjeta) */
        .world-preview { position: absolute; inset: 0; pointer-events: none; overflow: hidden; border-radius: 17px; }
        .preview-bit { position: absolute; top: -10%; border-radius: 50%; opacity: 0.85; }
        @keyframes petalFall { 0% { transform: translateY(-10%) translateX(0) rotate(0deg); } 100% { transform: translateY(220%) translateX(14px) rotate(200deg); } }
        @keyframes snowFall { 0% { transform: translateY(-10%) translateX(0); } 100% { transform: translateY(220%) translateX(-10px); } }
        @keyframes starTwinkle { 0%,100% { opacity: 0.2; transform: scale(0.7); } 50% { opacity: 1; transform: scale(1.15); } }
        .preview-petal { animation: petalFall linear infinite; background: #fff; }
        .preview-snow { animation: snowFall linear infinite; background: #fff; }
        .preview-star { animation: starTwinkle ease-in-out infinite; background: #fff; border-radius: 0; clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); }

        /* Pantalla de inicio tipo "Super Kitty" */
        .home-scene { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
        .home-deco { position: absolute; filter: drop-shadow(0 3px 4px rgba(0,0,0,0.12)); animation: kawaiiFloat 3.5s ease-in-out infinite; }
        .home-nav-btn { display: flex; align-items: center; gap: 14px; width: 100%; max-width: 300px; padding: 12px 18px; border: 4px solid #fff; border-radius: 30px; cursor: pointer; font-family: inherit; box-shadow: 0 6px 0 rgba(0,0,0,0.12), 0 8px 14px rgba(0,0,0,0.18); transition: transform 0.12s ease; }
        .home-nav-btn:active { transform: translateY(3px); box-shadow: 0 3px 0 rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.15); }
        .home-nav-icon { width: 46px; height: 46px; border-radius: 50%; background: #fff; display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0; box-shadow: inset 0 0 0 2px rgba(0,0,0,0.06); }
        .home-nav-text { color: #fff; font-size: 17px; text-shadow: 1px 2px 0 rgba(0,0,0,0.15); flex: 1; text-align: left; }
    `;
    document.head.appendChild(style);
}

// ==========================================
// --- PANTALLA DE INICIO (estilo "Super Kitty") ---
// ==========================================

function renderHomeMenu() {
    saveProgress();
    const img = new Image();
    img.onload = () => {
        container.innerHTML = '';
        const menu = document.createElement('div');
        menu.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:#ffc6dc;display:flex;align-items:center;justify-content:center;overflow:hidden;';
        const art = document.createElement('div');
        art.style.cssText = 'position:relative;height:100%;max-width:100%;aspect-ratio:3/2;background:url("menu.png") center/100% 100% no-repeat;';
        // Zonas clicables sobre los tres botones dibujados en la imagen (porcentajes de la imagen 1536x1024)
        const addHotspot = (label, topPct, heightPct, onClick) => {
            const b = document.createElement('button');
            b.setAttribute('aria-label', label);
            b.style.cssText = `position:absolute;left:32.9%;width:38.1%;top:${topPct}%;height:${heightPct}%;background:transparent;border:0;border-radius:22px;cursor:pointer;outline:none;transition:box-shadow 0.15s;`;
            b.onmouseenter = b.onfocus = () => { b.style.boxShadow = '0 0 0 4px rgba(255,255,255,0.85), 0 0 18px rgba(255,64,129,0.7)'; };
            b.onmouseleave = b.onblur = () => { b.style.boxShadow = 'none'; };
            b.onclick = () => { if (window.AudioFX) AudioFX.init(); onClick(); };
            art.appendChild(b);
        };
        addHotspot('Jugar', 48.8, 14.2, renderWorldMenu);
        addHotspot('Personajes', 64.6, 13.5, renderCharacterMenu);
        addHotspot('Opciones', 79.6, 13.7, renderOptionsMenu);
        const score = document.createElement('div');
        score.textContent = `⭐ ${gameProgress.score} puntos`;
        score.style.cssText = "position:absolute;top:8px;left:8px;font-family:'Fredoka One',cursive;font-size:12px;color:#d81b60;background:#fff;padding:3px 12px;border-radius:20px;border:2px solid #ff80ab;";
        art.appendChild(score);
        menu.appendChild(art);
        container.appendChild(menu);
    };
    img.onerror = () => renderHomeMenuClassic(); // si menu.png no está, se usa el menú anterior
    img.src = 'menu.png';
}

function renderHomeMenuClassic() {
    ensureKawaiiStyles();
    container.innerHTML = '';
    const menu = document.createElement('div');
    menu.className = 'kawaii-menu';
    menu.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: linear-gradient(180deg, #ffd6e8 0%, #ffb8d9 100%);
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        font-family: 'Fredoka One', cursive; color: #d81b60; padding: 14px; box-sizing: border-box; overflow: hidden;
    `;

    const currentChar = CHARACTERS[gameProgress.selectedSkin];

    menu.innerHTML = `
        <div class="home-scene">
            <span class="home-deco" style="top: 4%; left: 3%; font-size: 46px; animation-delay: 0s;">🌈</span>
            <span class="home-deco" style="top: 6%; left: 30%; font-size: 22px; animation-delay: 0.5s;">☁️</span>
            <span class="home-deco" style="top: 10%; right: 4%; font-size: 50px; animation-delay: 0.8s;">🌳</span>
            <span class="home-deco" style="top: 8%; left: 60%; font-size: 20px; animation-delay: 1.2s;">✨</span>
            <span class="home-deco" style="bottom: 6%; left: 4%; font-size: 42px; animation-delay: 0.3s;">🏠</span>
            <span class="home-deco" style="bottom: 8%; right: 8%; font-size: 34px; animation-delay: 1s;">🧸</span>
            <span class="home-deco" style="bottom: 4%; left: 38%; font-size: 22px; animation-delay: 0.6s;">🌷</span>
            <span class="home-deco" style="bottom: 5%; right: 32%; font-size: 20px; animation-delay: 1.4s;">🌼</span>
        </div>
        <h1 class="kawaii-title" style="font-size: 30px; margin: 0 0 2px; color: #ff2a70; position: relative; z-index: 1;">🎀 SUPER KITTY 🎀</h1>
        <h2 class="kawaii-title" style="font-size: 22px; margin: 0 0 14px; color: #ff2a70; position: relative; z-index: 1;">VS DEMONIOS</h2>
        <div style="display: flex; flex-direction: column; gap: 12px; width: 100%; align-items: center; position: relative; z-index: 1;">
            <button id="nav-jugar" class="home-nav-btn" style="background: #ff4d94;">
                <span class="home-nav-icon">${currentChar.emoji}</span>
                <span class="home-nav-text">JUGAR</span>
            </button>
            <button id="nav-personajes" class="home-nav-btn" style="background: #9575cd;">
                <span class="home-nav-icon">🎭</span>
                <span class="home-nav-text">PERSONAJES</span>
            </button>
            <button id="nav-opciones" class="home-nav-btn" style="background: #4fc3f7;">
                <span class="home-nav-icon">⚙️</span>
                <span class="home-nav-text">OPCIONES</span>
            </button>
        </div>
        <p style="font-weight: bold; font-size: 12px; background: #fff; padding: 3px 12px; border-radius: 20px; border: 2px solid #ff80ab; margin-top: 16px; position: relative; z-index: 1;">⭐ ${gameProgress.score} puntos</p>
    `;
    container.appendChild(menu);

    menu.querySelector('#nav-jugar').onclick = () => { if (window.AudioFX) AudioFX.init(); renderWorldMenu(); };
    menu.querySelector('#nav-personajes').onclick = () => { if (window.AudioFX) AudioFX.init(); renderCharacterMenu(); };
    menu.querySelector('#nav-opciones').onclick = () => { if (window.AudioFX) AudioFX.init(); renderOptionsMenu(); };
}

function renderCharacterMenu() {
    ensureKawaiiStyles();
    container.innerHTML = '';
    const menu = document.createElement('div');
    menu.className = 'kawaii-menu kawaii-scroll';
    menu.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: linear-gradient(180deg, #ede7f6 0%, #d1c4e9 100%);
        display: flex; flex-direction: column; align-items: center;
        font-family: 'Fredoka One', cursive; color: #4527a0; padding: 12px; box-sizing: border-box; overflow-y: auto;
    `;
    menu.innerHTML = `
        <button id="back-btn" style="align-self: flex-start; padding: 6px 14px; border: none; border-radius: 20px; background: #fff; color: #4527a0; font-family: inherit; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.12); font-size: 12px;">⬅ Volver</button>
        <h2 class="kawaii-title" style="font-size: 20px; margin: 10px 0 12px; color: #7b1fa2;">🎭 Elige tu personaje 🎭</h2>
        <div id="char-list" style="display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 340px; padding-bottom: 6px;"></div>
    `;
    container.appendChild(menu);
    menu.querySelector('#back-btn').onclick = () => renderHomeMenu();

    const list = menu.querySelector('#char-list');
    Object.keys(CHARACTERS).forEach(key => {
        const c = CHARACTERS[key];
        const selected = gameProgress.selectedSkin === key;
        const btn = document.createElement('button');
        btn.className = 'kawaii-world-card';
        btn.style.cssText = `
            display: flex; align-items: center; gap: 12px; padding: 10px 16px;
            border: 3px solid ${selected ? '#ffd700' : '#fff'}; border-radius: 20px; cursor: pointer;
            background: ${c.color}; color: #fff; font-family: inherit; text-align: left;
            box-shadow: ${selected ? '0 0 0 3px #ffd70088, 0 5px 12px rgba(0,0,0,0.2)' : '0 5px 12px rgba(0,0,0,0.15)'};
        `;
        btn.innerHTML = `
            <div style="width: 46px; height: 46px; border-radius: 50%; background: rgba(255,255,255,0.3); display: flex; align-items: center; justify-content: center; font-size: 24px; border: 2px solid #fff;">${c.emoji}</div>
            <div style="flex: 1;">
                <div style="font-size: 14px; text-shadow: 1px 1px 0 rgba(0,0,0,0.15);">${c.name}${selected ? ' ✔️' : ''}</div>
                <div style="font-size: 10px; opacity: 0.95; margin-top: 2px;">${c.label}</div>
            </div>
        `;
        btn.onclick = () => { gameProgress.selectedSkin = key; renderCharacterMenu(); };
        list.appendChild(btn);
    });
}

function renderOptionsMenu() {
    saveProgress();
    ensureKawaiiStyles();
    container.innerHTML = '';
    const menu = document.createElement('div');
    menu.className = 'kawaii-menu';
    menu.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: linear-gradient(180deg, #e1f5fe 0%, #b3e5fc 100%);
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        font-family: 'Fredoka One', cursive; color: #0277bd; padding: 12px; box-sizing: border-box;
    `;
    menu.innerHTML = `
        <button id="back-btn" style="position: absolute; top: 12px; left: 14px; padding: 6px 14px; border: none; border-radius: 20px; background: #fff; color: #0277bd; font-family: inherit; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.12); font-size: 12px;">⬅ Volver</button>
        <h2 class="kawaii-title" style="font-size: 22px; margin-bottom: 14px; color: #0288d1;">⚙️ OPCIONES ⚙️</h2>
        <div style="background: #fff; border-radius: 20px; padding: 16px 22px; text-align: center; box-shadow: 0 5px 12px rgba(0,0,0,0.1); max-width: 280px; width: 100%;">
            <p style="font-size: 13px; margin-bottom: 6px;">⭐ Puntos totales</p>
            <p style="font-size: 22px; color: #0288d1; margin-bottom: 14px;">${gameProgress.score}</p>
            <div style="border-top: 2px dashed #b3e5fc; padding-top: 12px; margin-bottom: 12px;">
                <p style="font-size: 13px; margin-bottom: 8px;">🎮 Dificultad</p>
                <div id="diff-btns" style="display: flex; gap: 6px; justify-content: center;"></div>
                <p id="diff-desc" style="font-size: 10px; margin-top: 6px; color: #0288d1; min-height: 12px;"></p>
            </div>
            <div style="border-top: 2px dashed #b3e5fc; padding-top: 12px; margin-bottom: 12px;">
                <p style="font-size: 13px; margin-bottom: 8px;">🔊 Sonido</p>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <button id="mute-btn" style="border: none; border-radius: 12px; width: 38px; height: 38px; font-size: 16px; cursor: pointer; background: #e1f5fe; flex-shrink: 0;">${window.AudioFX && AudioFX.muted ? '🔇' : '🔊'}</button>
                    <input id="volume-slider" type="range" min="0" max="100" value="${window.AudioFX ? Math.round(AudioFX.volume * 100) : 80}" style="flex: 1;">
                </div>
            </div>
            <button id="reset-btn" style="padding: 8px 16px; border: none; border-radius: 14px; background: #ef5350; color: #fff; font-family: inherit; cursor: pointer; font-size: 12px;">🗑️ Reiniciar progreso</button>
        </div>
    `;
    container.appendChild(menu);
    menu.querySelector('#back-btn').onclick = () => renderHomeMenu();

    const DIFF_TEXT = { easy: '+1 vida · menos diablitos · más lentos', normal: 'La experiencia original', hard: '-1 vida · más diablitos · más rápidos' };
    const diffBox = menu.querySelector('#diff-btns');
    const diffDesc = menu.querySelector('#diff-desc');
    const paintDiff = () => {
        diffBox.innerHTML = '';
        Object.keys(DIFFICULTIES).forEach(k => {
            const b = document.createElement('button');
            const sel = gameProgress.difficulty === k;
            b.textContent = DIFFICULTIES[k].label;
            b.style.cssText = `border: 2px solid ${sel ? '#0288d1' : '#b3e5fc'}; border-radius: 12px; padding: 6px 8px; font-family: inherit; font-size: 11px; cursor: pointer; background: ${sel ? '#0288d1' : '#e1f5fe'}; color: ${sel ? '#fff' : '#0277bd'};`;
            b.onclick = () => { gameProgress.difficulty = k; saveProgress(); paintDiff(); };
            diffBox.appendChild(b);
        });
        diffDesc.textContent = DIFF_TEXT[gameProgress.difficulty];
    };
    paintDiff();

    const muteBtn = menu.querySelector('#mute-btn');
    const volumeSlider = menu.querySelector('#volume-slider');
    muteBtn.onclick = () => {
        if (!window.AudioFX) return;
        const nowMuted = AudioFX.toggleMuted();
        muteBtn.textContent = nowMuted ? '🔇' : '🔊';
    };
    volumeSlider.oninput = (e) => {
        if (!window.AudioFX) return;
        AudioFX.setVolume(e.target.value / 100);
        if (AudioFX.muted && e.target.value > 0) {
            AudioFX.setMuted(false);
            muteBtn.textContent = '🔊';
        }
    };

    menu.querySelector('#reset-btn').onclick = () => {
        if (confirm('¿Seguro que quieres reiniciar todo tu progreso (mundos, llaves y puntos)?')) {
            gameProgress = {
                selectedSkin: gameProgress.selectedSkin,
                difficulty: gameProgress.difficulty,
                score: 0,
                worlds: [
                    { unlocked: true, keys: 0, unlockedLevels: [true, false, false, false, false], completed: false },
                    { unlocked: false, keys: 0, unlockedLevels: [false, false, false, false, false], completed: false },
                    { unlocked: false, keys: 0, unlockedLevels: [false, false, false, false, false], completed: false }
                ]
            };
            renderOptionsMenu();
        }
    };
}

// ==========================================
// --- MENÚ: MUNDO -> NIVEL ---
// ==========================================

function renderWorldMenu() {
    saveProgress();
    ensureKawaiiStyles();
    container.innerHTML = '';
    const menu = document.createElement('div');
    menu.className = 'kawaii-menu kawaii-scroll';
    menu.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: radial-gradient(circle at 50% 0%, #fff0f6 0%, #ffd6e8 45%, #ffb8d9 100%);
        display: flex; flex-direction: column; align-items: center;
        font-family: 'Fredoka One', cursive; color: #d81b60;
        padding: 14px 10px; overflow-y: auto; box-sizing: border-box;
    `;

    menu.innerHTML = `
        <button id="back-btn" style="align-self: flex-start; padding: 6px 14px; border: none; border-radius: 20px; background: #fff; color: #d81b60; font-family: inherit; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.12); font-size: 12px; margin-bottom: 6px;">⬅ Inicio</button>
        <h2 class="kawaii-title" style="font-size: 22px; margin: 4px 0 10px; color: #ff2a70;">🗺️ Selecciona tu mundo 🗺️</h2>
        <div id="world-btns" style="display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 340px; padding-bottom: 6px;"></div>
    `;
    container.appendChild(menu);
    menu.querySelector('#back-btn').onclick = () => renderHomeMenu();

    const worldBox = menu.querySelector('#world-btns');
    WORLDS.forEach((world, idx) => {
        const wp = gameProgress.worlds[idx];
        const btn = document.createElement('button');
        btn.className = 'kawaii-world-card';
        btn.disabled = !wp.unlocked;

        const badge = wp.completed ? '👑 ¡Completado!' : wp.unlocked ? `🔑 ${wp.keys}/4 llaves` : '🔒 Bloqueado';
        const gradient = wp.unlocked ? `linear-gradient(135deg, ${world.cardFrom}, ${world.cardTo})` : 'linear-gradient(135deg, #cfd8dc, #90a4ae)';

        btn.style.cssText = `
            display: flex; align-items: center; gap: 12px; padding: 12px 16px;
            border: 3px solid #fff; border-radius: 20px; cursor: ${wp.unlocked ? 'pointer' : 'not-allowed'};
            background: ${gradient}; color: #fff; font-family: inherit;
            box-shadow: 0 5px 12px rgba(216, 27, 96, 0.25); text-align: left;
        `;
        btn.innerHTML = `
            ${wp.unlocked ? worldPreviewHTML(world.theme) : ''}
            <div style="font-size: 30px; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.2)); position: relative; z-index: 1;">${wp.unlocked ? world.icon : '🔒'}</div>
            <div style="flex: 1; position: relative; z-index: 1;">
                <div style="font-size: 14px; text-shadow: 1px 1px 0 rgba(0,0,0,0.15);">${world.name}</div>
                <div style="font-size: 11px; opacity: 0.95; margin-top: 2px;">${badge}</div>
            </div>
        `;
        btn.onclick = () => { if (window.AudioFX) AudioFX.init(); renderLevelMenu(idx); };
        worldBox.appendChild(btn);
    });
}

function renderLevelMenu(worldIdx) {
    saveProgress();
    ensureKawaiiStyles();
    container.innerHTML = '';
    const world = WORLDS[worldIdx];
    const wp = gameProgress.worlds[worldIdx];

    const menu = document.createElement('div');
    menu.className = 'kawaii-menu kawaii-scroll';
    menu.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: linear-gradient(160deg, ${world.cardFrom}, #fff0f6 60%);
        display: flex; flex-direction: column; align-items: center;
        font-family: 'Fredoka One', cursive; color: #d81b60;
        padding: 12px; overflow-y: auto; box-sizing: border-box;
    `;

    menu.innerHTML = `
        <button id="back-btn" style="align-self: flex-start; padding: 6px 14px; border: none; border-radius: 20px; background: #fff; color: #d81b60; font-family: inherit; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.12); font-size: 12px;">⬅ Mundos</button>
        <h2 class="kawaii-title" style="font-size: 20px; margin: 8px 0 2px; color: #ff2a70;">${world.icon} ${world.name}</h2>
        <p style="font-weight: bold; font-size: 12px; background: #fff; padding: 3px 12px; border-radius: 20px; border: 2px solid #ff80ab; margin-bottom: 12px;">🔑 ${wp.keys}/4 llaves · ⭐ ${(wp.stars || []).reduce((a, b) => a + (b || 0), 0)}/${LEVELS_PER_WORLD * 3} estrellas</p>
        <div id="lvl-btns" style="display: flex; flex-direction: column; gap: 8px; width: 100%; max-width: 320px;"></div>
    `;
    container.appendChild(menu);

    menu.querySelector('#back-btn').onclick = () => renderWorldMenu();

    const lvlBox = menu.querySelector('#lvl-btns');
    for (let i = 0; i < LEVELS_PER_WORLD; i++) {
        const unlocked = wp.unlockedLevels[i];
        const isBossLvl = i === LEVELS_PER_WORLD - 1;
        const btn = document.createElement('button');
        btn.className = 'kawaii-level-btn';
        btn.disabled = !unlocked;

        const gradient = !unlocked ? 'linear-gradient(135deg, #cfd8dc, #90a4ae)' : isBossLvl ? 'linear-gradient(135deg, #ce93d8, #8e24aa)' : 'linear-gradient(135deg, #a5d6a7, #43a047)';
        const icon = !unlocked ? '🔒' : isBossLvl ? '👺' : '🔑';
        const starCount = (wp.stars && wp.stars[i]) || 0;
        const starText = starCount ? ' · ' + '★'.repeat(starCount) + '☆'.repeat(3 - starCount) : '';
        const desc = (!unlocked ? 'Bloqueado' : isBossLvl ? 'Jefe Final' : 'Recolecta la llave') + starText;

        btn.style.cssText = `
            display: flex; align-items: center; gap: 12px; padding: 10px 16px;
            border: 3px solid #fff; border-radius: 18px; cursor: ${unlocked ? 'pointer' : 'not-allowed'};
            background: ${gradient}; color: #fff; font-family: inherit; text-align: left;
            box-shadow: 0 4px 10px rgba(216, 27, 96, 0.2);
        `;
        btn.innerHTML = `
            <div style="font-size: 22px;">${icon}</div>
            <div style="flex: 1;">
                <div style="font-size: 13px;">Nivel ${i + 1}</div>
                <div style="font-size: 10px; opacity: 0.9;">${desc}</div>
            </div>
        `;
        btn.onclick = () => { if (window.AudioFX) AudioFX.init(); startLevel(worldIdx, i); };
        lvlBox.appendChild(btn);
    }
}

// ==========================================
// --- NIVEL JUGABLE ---
// ==========================================

function startLevel(worldIdx, levelIdx) {
    disposeCurrentRenderer();
    container.innerHTML = '';
    const world = WORLDS[worldIdx];
    const wp = gameProgress.worlds[worldIdx];
    const currentChar = CHARACTERS[gameProgress.selectedSkin];
    const isBoss = levelIdx === LEVELS_PER_WORLD - 1;
    const scoreAtStart = gameProgress.score; // para no conservar puntos de un intento fallido ni farmear niveles ya completados

    if (window.AudioFX) AudioFX.playBackgroundMusic(worldIdx); // cada mundo con su melodía

    const { scene, camera, renderer } = Render3D.setupScene(container, container.clientWidth || 800, container.clientHeight || 400, world.bg);
    currentGameRenderer = renderer;
    currentGameScene = scene;
    const physWorld = PhysicsEngine.initWorld();

    // Mantiene el canvas 3D ajustado al tamaño real del contenedor (modo normal o grande/pantalla completa)
    function resizeRenderer() {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }
    window.__resizeGameCanvas = resizeRenderer;
    window.addEventListener('resize', resizeRenderer);

    // Crear MESH del Personaje
    const playerMesh = Render3D.createPlayerMesh(gameProgress.selectedSkin);
    scene.add(playerMesh);
    const playerBody = PhysicsEngine.createPlayerBody(0, 4, 0);
    physWorld.addBody(playerBody);

    // Malla para Escudo de Habilidad Especial
    let shieldMesh = null;

    const diffCfg = DIFFICULTIES[gameProgress.difficulty] || DIFFICULTIES.normal;
    const maxLivesNow = Math.max(2, currentChar.maxLives + diffCfg.lives);
    let lives = maxLivesNow;
    let isInvulnerable = false;
    let abilityTimer = 0;
    let abilityCooldown = 0;
    let isDashing = false;
    let flashInterval = null; // parpadeo tras recibir daño (se limpia al terminar el nivel)
    let lastShotAt = 0;       // cadencia mínima de disparo

    // --- Cámara temblorosa (screen shake) y pausa de impacto (hit-stop) ---
    // Le dan peso a los golpes: un empujoncito de cámara al recibir/dar daño,
    // y una micro-pausa al conectar un golpe fuerte contra el jefe.
    let shakeTimer = 0, shakeDuration = 0, shakeMag = 0;
    let hitStopTimer = 0;
    function triggerShake(magnitude, duration) {
        shakeMag = Math.max(shakeMag, magnitude);
        shakeTimer = duration;
        shakeDuration = duration;
    }
    function triggerHitStop(duration) {
        hitStopTimer = Math.max(hitStopTimer, duration);
    }

    // Estallido visual reutilizable para las ultis: anillo + partículas que se expanden y desvanecen
    function spawnAbilityBurst(colorHex, x, y, z, endScale = 6, duration = 0.45) {
        const burst = Render3D.createAbilityBurstMesh(colorHex);
        burst.position.set(x, y, z);
        scene.add(burst);
        abilityFX.push({ mesh: burst, life: duration, maxLife: duration, endScale });
    }

    // Llave del nivel (solo niveles normales)
    let keyMesh = null;
    let keyCollected = isBoss; // en niveles jefe no hace falta llave
    let hintTimer = 0;

    // "boss" se declara aquí (temprano) aunque los niveles normales no lo usen, porque el HUD
    // lo lee más abajo desde su primera actualización — declararlo tarde causaba que el nivel
    // del jefe final se quedara en pantalla negra (error de "usar boss antes de inicializarlo").
    let boss = { active: false };

    // Estado de las mecánicas nuevas. Se declara aquí, antes del HUD, porque updateHUD() lo lee en su primera llamada.
    let checkpoint = null, coinsGot = 0, coinsTotal = 0;
    const effects = { speed: 0, jump: 0, magnet: 0 };  // segundos restantes de cada power-up
    let graceTimer = 0, hudTick = 0;                   // gracia sin daño tras continuar desde el checkpoint
    let bossUI = null, bossFill = null, bossGhost = null, bossLabel = null, bossGhostPct = 100;
    const tmpV = new THREE.Vector3();

    // Cartel grande que aparece un momento (mundo, fases del jefe, power-ups...)
    function showBanner(text, color = '#d81b60') {
        const el = document.createElement('div');
        el.textContent = text;
        el.style.cssText = `position:absolute;top:26%;left:50%;transform:translateX(-50%);font-family:'Fredoka One',cursive;font-size:30px;color:${color};text-shadow:2px 2px 0 #fff,-2px -2px 0 #fff,2px -2px 0 #fff,-2px 2px 0 #fff;pointer-events:none;z-index:15;white-space:nowrap;opacity:1;transition:opacity 0.5s, transform 0.5s;`;
        container.appendChild(el);
        setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(-50%) translateY(-18px)'; }, 1300);
        setTimeout(() => el.remove(), 1900);
    }

    // Da un matiz propio del mundo a un modelo (los materiales son únicos de cada modelo)
    function tintMesh(mesh, hex, amount) {
        const c = new THREE.Color(hex);
        mesh.traverse(o => {
            const m = o.isMesh && o.material;
            if (m && m.color && !m.userData.tinted) { m.userData.tinted = true; m.color.lerp(c, amount); }
        });
    }
    function setEmissive(mesh, hex) {
        if (hex === null) return;
        mesh.traverse(o => { if (o.isMesh && o.material && o.material.emissive) o.material.emissive.setHex(hex); });
    }
    function setMeshOpacity(mesh, v) {
        mesh.traverse(o => {
            const m = o.isMesh && o.material;
            if (!m) return;
            if (m.userData.baseOpacity === undefined) m.userData.baseOpacity = m.opacity;
            m.transparent = true;
            m.opacity = v >= 1 ? m.userData.baseOpacity : v;
        });
    }
    function attract(mesh) { // power-up imán: los tesoros cercanos vuelan hacia el jugador
        tmpV.copy(playerMesh.position).sub(mesh.position);
        const len = tmpV.length();
        if (len < 9 && len > 0.05) mesh.position.addScaledVector(tmpV.normalize(), Math.min(len, 13 * (1 / 60)));
    }

    // HUD
    const hud = document.createElement('div');
    hud.style.cssText = `position: absolute; top: 12px; left: 15px; color: #d81b60; font-family: 'Fredoka One', cursive; font-size: 14px; font-weight: bold; text-shadow: 1px 1px 2px #fff; pointer-events: none; line-height: 1.4;`;
    container.appendChild(hud);

    function updateHUD(extraText = '') {
        const cdText = abilityCooldown > 0 ? `⏳ Special (${Math.ceil(abilityCooldown)}s)` : `✨ Special (E) LISTO!`;
        const keyText = isBoss ? '' : ` | 🔑 ${keyCollected ? '¡Obtenida!' : 'Búscala'}`;
        let extra = extraText;
        if (!extra && hintTimer > 0) extra = `<br>🔒 ¡Consigue la llave antes de la meta!`;
        const fxText = Object.keys(effects).filter(k => effects[k] > 0).map(k => ` | ${POWERUPS[k].emoji}${Math.ceil(effects[k])}s`).join('');
        const cpText = checkpoint ? (checkpoint.used ? ' | 🚩 usado' : checkpoint.active ? ' | 🚩 ¡guardado!' : ' | 🚩') : '';
        const coinText = coinsTotal ? ` | 🪙 ${coinsGot}/${coinsTotal}` : '';
        const html = `${world.icon} ${world.name} - Nivel ${levelIdx + 1}<br>Vidas: ${'💖'.repeat(lives)} | Puntos: ${gameProgress.score}${coinText}${keyText}<br>${cdText}${fxText}${cpText} ${extra}`;
        if (hud._html !== html) { hud._html = html; hud.innerHTML = html; } // solo toca el DOM si algo cambió
    }
    updateHUD();
    showBanner(`${world.icon} ${world.name}`, '#ff2a70');

    // Generación del Nivel (procedural, determinista por semilla)
    const seed = worldIdx * 1000 + levelIdx * 97 + 13;
    const platformCount = isBoss ? 14 : 6 + levelIdx * 2; // 6, 8, 10, 12, (14 en jefe)
    const layout = generateLayout(seed, platformCount, isBoss);
    const rand = seededRandom(seed + 999);
    const difficulty = worldIdx + levelIdx * 0.4; // sube con mundo y nivel

    const enemies = [], flyingEnemies = [], bullets = [], hearts = [], movingPlatforms = [], hazards = [], chests = [], abilityFX = [];
    const enemyShots = [], coins = [], powerUps = [];
    const solidPlatforms = []; // {x, y, w, mp}: para saber con certeza si el jugador está parado en una
    const worldEnemyFn = WORLD_ENEMIES[worldIdx];
    const worldEnemyHP = worldEnemyFn.groundHP;

    // Plataformas candidatas a moverse (nunca la primera, la última, ni la del jefe)
    const movingChance = Math.min(0.55, 0.15 + difficulty * 0.08);
    const spikesOnPlatformChance = Math.min(0.4, 0.1 + difficulty * 0.07);

    layout.forEach((plat, i) => {
        let pMesh = Render3D.createPlatformMesh(plat.w, 1.4, 6, world.platform, world.theme);
        pMesh.position.set(plat.x, plat.y, 0);
        scene.add(pMesh);

        let pBody = PhysicsEngine.createPlatformBody(plat.x, plat.y, 0, plat.w, 1.4, 6);
        physWorld.addBody(pBody);

        // Plataforma móvil (horizontal o vertical) - dificultad sube probabilidad y rango
        const isEndpoint = i === 0 || i === layout.length - 1;
        let isMoving = false;
        let movingRef = null;
        if (!isEndpoint && rand() < movingChance) {
            isMoving = true;
            const vertical = rand() < 0.5;
            const range = 3.5 + rand() * 2.5 + difficulty * 0.5;
            const speed = 0.6 + rand() * 0.4 + difficulty * 0.08;
            movingRef = {
                mesh: pMesh, body: pBody, w: plat.w,
                baseX: plat.x, baseY: plat.y,
                lastX: plat.x, lastY: plat.y,
                vertical, range, speed,
                phase: rand() * Math.PI * 2
            };
            movingPlatforms.push(movingRef);
        }
        solidPlatforms.push({ x: plat.x, y: plat.y, w: plat.w, mp: movingRef });

        // Picos sobre la plataforma (no en la primera, ni en móviles, ni donde vaya la meta/llave)
        if (!isEndpoint && !isMoving && rand() < spikesOnPlatformChance) {
            const spikeW = Math.min(plat.w * 0.4, 4);
            const spikeOffset = (rand() - 0.5) * (plat.w - spikeW - 2);
            const spikeMesh = Render3D.createSpikeMesh(spikeW);
            spikeMesh.position.set(plat.x + spikeOffset, plat.y + 0.7, 0);
            scene.add(spikeMesh);
            hazards.push({
                type: 'platformSpikes', mesh: spikeMesh,
                x1: plat.x + spikeOffset - spikeW / 2, x2: plat.x + spikeOffset + spikeW / 2,
                y: plat.y
            });
        }

        // Hueco entre esta plataforma y la siguiente: puede tener lava o picos
        if (i < layout.length - 1) {
            const nextPlat = layout[i + 1];
            const gapStart = plat.x + plat.w / 2;
            const gapEnd = nextPlat.x - nextPlat.w / 2;
            const gapWidth = gapEnd - gapStart;
            const hazardChance = Math.min(0.65, 0.2 + difficulty * 0.1);
            if (gapWidth > 3 && rand() < hazardChance) {
                const hazardY = Math.min(plat.y, nextPlat.y);
                const isLava = rand() < 0.5;
                const hMesh = isLava ? Render3D.createLavaMesh(gapWidth) : Render3D.createSpikeMesh(gapWidth);
                hMesh.position.set(gapStart + gapWidth / 2, hazardY - (isLava ? 0.9 : 0.55), 0);
                scene.add(hMesh);
                hazards.push({
                    type: 'gap', mesh: hMesh, x1: gapStart, x2: gapEnd, y: hazardY - (isLava ? 1.0 : 0.4),
                    safeX: plat.x, safeY: plat.y, isLava
                });
            }
        }

        // Decoraciones sobre plataformas
        const propTypes = THEME_PROPS[world.theme] || ['flower', 'mushroom', 'candycane', 'lollipop', 'gumdrop', 'applekitty', 'bush'];
        if (plat.w > 10) {
            const prop = Render3D.createProp(propTypes[Math.floor(rand() * propTypes.length)]);
            prop.position.set(plat.x - plat.w / 3, plat.y + 0.7, plat.w > 15 ? -1.2 : 0);
            scene.add(prop);

            const prop2 = Render3D.createProp(propTypes[Math.floor(rand() * propTypes.length)]);
            prop2.position.set(plat.x + plat.w / 4, plat.y + 0.7, plat.w > 15 ? 1.2 : 0);
            scene.add(prop2);

            if (plat.w > 16) {
                const prop3 = Render3D.createProp(propTypes[Math.floor(rand() * propTypes.length)]);
                prop3.position.set(plat.x, plat.y + 0.7, plat.w > 20 ? -2.2 : -1.5);
                scene.add(prop3);
            }
        } else if (i % 2 === 0) {
            const prop = Render3D.createProp(propTypes[Math.floor(rand() * propTypes.length)]);
            prop.position.set(plat.x, plat.y + 0.7, 0);
            scene.add(prop);
        } else {
            // Antes las plataformas angostas en índice impar se quedaban vacías; ahora siempre hay algo de vida
            const prop = Render3D.createProp(propTypes[Math.floor(rand() * propTypes.length)]);
            prop.position.set(plat.x + (rand() - 0.5) * plat.w * 0.4, plat.y + 0.7, 0);
            scene.add(prop);
        }

        // Enemigos Terrestres (probabilidad sube con la dificultad del mundo/nivel)
        const spawnChance = Math.min(0.95, (0.45 + difficulty * 0.1) * diffCfg.enemyMul);
        if (i > 0 && i < layout.length - 1 && rand() < spawnChance) {
            let eMesh = worldEnemyFn.ground();
            // El modelo nace con los pies en el origen pero el cuerpo físico es una esfera de radio 0.85:
            // se baja el modelo para que pise el suelo (antes flotaba a media altura).
            eMesh.children.forEach(c => { c.position.y -= 0.85; });
            scene.add(eMesh);
            // Rango de patrullaje: solo su plataforma, con margen al borde para no caerse
            const patrolHalf = Math.max(0.8, plat.w / 2 - 1.3);
            const spawnX = plat.x + (Math.random() - 0.5) * patrolHalf;
            let eBody = PhysicsEngine.createEnemyBody(spawnX, plat.y + 3, 0);
            physWorld.addBody(eBody);
            // Algunos diablitos son "saltarines": brillan en naranja y saltan al verte (más frecuentes con la dificultad)
            const isHopper = Math.random() < Math.min(0.4, 0.04 + difficulty * 0.06);
            // Enemigo especial del mundo (lanzador / escudado / espectral); los saltarines no se mezclan con ellos
            let kind = 'normal';
            if (!isHopper && Math.random() < Math.min(0.45, 0.14 + difficulty * 0.07)) kind = worldEnemyFn.special;
            if (worldEnemyFn.tint) tintMesh(eMesh, worldEnemyFn.tint, 0.55);
            setEmissive(eMesh, isHopper ? 0x8a3a00 : kind === 'shooter' ? 0x0a4d8f : kind === 'ghost' ? 0x6a1b9a : null);
            let enemyShield = null;
            if (kind === 'shield') {
                enemyShield = Render3D.createEnemyShieldMesh();
                enemyShield.position.set(0.95, 0.15, 0);
                eMesh.add(enemyShield);
            } else if (kind === 'shooter') {
                const orb = Render3D.createEnemyShotMesh();
                orb.scale.set(0.6, 0.6, 0.6);
                orb.position.set(0, 0.35, 0.55);
                eMesh.add(orb);
            }
            enemies.push({
                mesh: eMesh, body: eBody, isFrozen: false, freezeTimer: 0, active: true, iceBlock: null, hp: worldEnemyHP,
                plat: solidPlatforms[solidPlatforms.length - 1], patrolHalf, dir: Math.random() < 0.5 ? -1 : 1,
                hopper: isHopper, hopTimer: 0.8 + Math.random(),
                kind, shieldMesh: enemyShield, shootTimer: 1 + Math.random() * 1.5, ghostT: 1.5 + Math.random() * 2, ethereal: false
            });
        }

        // Enemigos Voladores
        if (i > 1 && i % 2 === 0 && i < layout.length - 1 && rand() < spawnChance * 0.8) {
            let fMesh = worldEnemyFn.flying();
            if (worldEnemyFn.flyTint) tintMesh(fMesh, worldEnemyFn.flyTint, 0.5);
            fMesh.position.set(plat.x, plat.y + 5, 0);
            scene.add(fMesh);
            flyingEnemies.push({ mesh: fMesh, origY: plat.y + 5, angle: rand() * Math.PI, isFrozen: false, freezeTimer: 0, active: true, iceBlock: null });
        }

        // Corazones
        if ((plat.y >= 4 && i % 4 === 0) || (i > 0 && i < layout.length - 2 && i % 4 === 2)) {
            let hMesh = Render3D.createHeartMesh();
            hMesh.position.set(plat.x, plat.y + 2.5, 0);
            scene.add(hMesh);
            hearts.push({ mesh: hMesh, active: true });
        }
    });

    const lastPlat = layout[layout.length - 1];
    // La meta ahora se apoya SOBRE la última plataforma (antes estaba fija en y=1.2 y en muchos
    // niveles caía fuera de la plataforma, por lo que solo se alcanzaba cayendo junto al borde).
    const goalX = lastPlat.x + lastPlat.w / 2 - 3;
    const goalY = lastPlat.y + 0.9;

    // Llave (solo niveles normales), colocada en la penúltima plataforma
    if (!isBoss && layout.length > 1) {
        const keyPlat = layout[layout.length - 2];
        keyMesh = Render3D.createKeyMesh();
        keyMesh.position.set(keyPlat.x, keyPlat.y + 2.2, 0);
        scene.add(keyMesh);
    }

    // Cofre secreto opcional: bonus de puntos, escondido en alto sobre una plataforma intermedia (no es obligatorio para pasar el nivel)
    if (layout.length > 3) {
        const chestPlatIdx = 1 + Math.floor(rand() * (layout.length - 3));
        const chestPlat = layout[chestPlatIdx];
        const chestMesh = Render3D.createChestMesh();
        chestMesh.position.set(chestPlat.x + (rand() - 0.5) * chestPlat.w * 0.5, chestPlat.y + 6.5, 0);
        scene.add(chestMesh);
        chests.push({ mesh: chestMesh, active: true });
    }

    // MONEDAS: arcos sobre cada hueco y filas en las plataformas anchas (+50 puntos; todas = bonus y estrella extra)
    const coinProto = Render3D.createCoinMesh();
    function addCoin(x, y) {
        const m = coinProto.clone();
        m.position.set(x, y, 0);
        scene.add(m);
        coins.push({ mesh: m, active: true, baseY: y, phase: Math.random() * 6.28 });
    }
    for (let i = 0; i < layout.length - 1; i++) {
        const a = layout[i], b = layout[i + 1];
        const x1 = a.x + a.w / 2 - 1, x2 = b.x - b.w / 2 + 1;
        if (x2 - x1 < 2) continue;
        for (let k = 0; k < 4; k++) {
            const t = (k + 1) / 5;
            addCoin(x1 + (x2 - x1) * t, a.y + (b.y - a.y) * t + 2.3 + Math.sin(t * Math.PI) * 2.0);
        }
    }
    layout.forEach((p, i) => {
        if (i > 0 && i < layout.length - 1 && p.w > 10) [-2.4, -1.2, 1.2, 2.4].forEach(dx => addCoin(p.x + dx, p.y + 2.2));
    });
    coinsTotal = coins.length;

    // POWER-UPS: 2-3 por nivel, sobre plataformas intermedias
    const puTypes = Object.keys(POWERUPS);
    const puPlats = [];
    const puCount = isBoss ? 2 : 2 + (levelIdx >= 2 ? 1 : 0);
    for (let n = 0; n < puCount; n++) {
        const pi = 1 + Math.floor(rand() * (layout.length - 3));
        if (puPlats.includes(pi)) continue;
        puPlats.push(pi);
        const pl = layout[pi];
        const type = puTypes[Math.floor(rand() * puTypes.length)];
        const pm = Render3D.createPowerUpMesh(type);
        pm.position.set(pl.x + (rand() < 0.5 ? -1 : 1) * Math.min(pl.w * 0.3, 4), pl.y + 2.6, 0);
        scene.add(pm);
        powerUps.push({ mesh: pm, type, active: true, baseY: pm.position.y });
    }

    // CHECKPOINT a mitad del nivel (no en el jefe): en una plataforma fija y sin picos
    if (!isBoss && layout.length >= 6) {
        const mid = Math.floor(layout.length / 2);
        let cpIdx = -1;
        for (let off = 0; off < layout.length && cpIdx < 0; off++) {
            for (const i of [mid + off, mid - off]) {
                if (i < 2 || i > layout.length - 3) continue;
                const sp = solidPlatforms[i];
                if (sp.mp) continue;
                const spikes = hazards.some(h => h.type === 'platformSpikes' && Math.abs(h.y - sp.y) < 0.01 && h.x2 > sp.x - sp.w / 2 && h.x1 < sp.x + sp.w / 2);
                if (spikes) continue;
                cpIdx = i; break;
            }
        }
        if (cpIdx >= 0) {
            const sp = solidPlatforms[cpIdx];
            const flagX = sp.x - sp.w / 2 + 1.4;
            const cm = Render3D.createCheckpointMesh();
            cm.position.set(flagX, sp.y + 0.7, 0);
            scene.add(cm);
            checkpoint = { mesh: cm, x: flagX, y: sp.y + 0.7, active: false, used: false, respawnX: flagX + 1.8 };
        }
    }
    updateHUD();

    // JEFE DEMONIACO (solo nivel 5 de cada mundo, escala con el mundo)
    // Cada mundo tiene un ataque especial propio a partir de la Fase 2 (50% HP):
    // Mundo 0 (Jardín Rosa): bolas de fuego cayendo. Mundo 1 (Valle Dorado): picos de hielo del suelo.
    // Mundo 2 (Castillo Dulce): orbes sombra que persiguen. La Fase 3 (25% HP) intensifica el ataque de su mundo.
    const fireballs = [];
    const groundSpikes = [];
    const shadowOrbs = [];
    // La patrulla del jefe se queda DENTRO de su plataforma (antes llegaba a x+30 con una plataforma de x±20).
    const bossPatrolMin = lastPlat.x - lastPlat.w / 2 + 8;
    const bossPatrolMax = lastPlat.x + lastPlat.w / 2 - 5;
    const bossStartX = lastPlat.x + 8;

    if (isBoss) {
        const bossMesh = Render3D.createBossMesh();
        if (worldIdx === 1) tintMesh(bossMesh, 0xffb300, 0.45);        // jefe dorado
        else if (worldIdx === 2) tintMesh(bossMesh, 0xe040fb, 0.4);    // jefe del castillo
        // Altura relativa a SU plataforma: antes era fija (3.5) y en los mundos 2 y 3 la plataforma final
        // quedaba tan alta que las balas nunca llegaban al jefe (distancia > 2.3).
        bossMesh.position.set(bossStartX, lastPlat.y + 3.5, 0);
        scene.add(bossMesh);

        const baseSpeed = 7.5 + worldIdx * 1.2;
        boss = {
            mesh: bossMesh,
            hp: 10 + worldIdx * 4,
            maxHP: 10 + worldIdx * 4,
            active: true,
            dir: -1,
            speed: baseSpeed,
            baseSpeed,
            isFrozen: false,
            freezeTimer: 0,
            freezeImmune: 0, // breve inmunidad tras descongelarse
            phase: 1, // 1: solo patrulla | 2: ataque especial de su mundo | 3: ataque especial intensificado
            iceBlock: null,
            attackTimer: 2.6,
            baseY: lastPlat.y + 3.5, charge: 'idle', chargeCd: 2.5, chargeT: 0 // embestida de la fase 4
        };

        // Barra de vida propia y persistente: se anima y deja una estela amarilla al recibir daño
        const bossNames = ['👺 Rey Demonio del Jardín', '👺 Demonio Dorado', '👺 Demonio del Castillo'];
        bossUI = document.createElement('div');
        bossUI.style.cssText = "position:absolute;top:10px;left:50%;transform:translateX(-50%);width:260px;text-align:center;font-family:'Fredoka One',cursive;font-size:13px;color:#d81b60;text-shadow:1px 1px 2px #fff;pointer-events:none;z-index:6;";
        bossUI.innerHTML = `<div class="boss-label">${bossNames[worldIdx] || '👺 JEFE DEMONIO'}</div>` +
            `<div style="position:relative;height:16px;background:#f0f0f0;border-radius:9px;border:2px solid #fff;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.3);">` +
            `<div class="boss-ghost" style="position:absolute;left:0;top:0;height:100%;width:100%;background:#ffd54f;"></div>` +
            `<div class="boss-fill" style="position:absolute;left:0;top:0;height:100%;width:100%;background:#7e57c2;transition:width 0.2s ease, background 0.3s;"></div></div>`;
        container.appendChild(bossUI);
        bossLabel = bossUI.querySelector('.boss-label');
        bossGhost = bossUI.querySelector('.boss-ghost');
        bossFill = bossUI.querySelector('.boss-fill');
        boss.names = bossNames;
    }

    // Encuentra la altura de plataforma más cercana a una posición X (para las bolas de fuego)
    function getGroundYAt(x) {
        let best = layout[0], bestDist = Infinity;
        layout.forEach(p => {
            const halfW = p.w / 2;
            if (x >= p.x - halfW && x <= p.x + halfW) { best = p; bestDist = 0; }
            else {
                const d = Math.min(Math.abs(x - (p.x - halfW)), Math.abs(x - (p.x + halfW)));
                if (d < bestDist) { bestDist = d; best = p; }
            }
        });
        return best.y;
    }

    function spawnBossFireball() {
        const targetX = playerMesh.position.x + (Math.random() - 0.5) * 5;
        const groundY = getGroundYAt(targetX) + 0.75;
        const warnRadius = 2.0;

        const warnMesh = Render3D.createWarningRing(warnRadius);
        warnMesh.position.set(targetX, groundY + 0.05, 0);
        scene.add(warnMesh);

        const fireMesh = Render3D.createFireballMesh();
        const startY = groundY + 22;
        fireMesh.position.set(targetX, startY, 0);
        scene.add(fireMesh);

        fireballs.push({ warnMesh, fireMesh, targetX, groundY, warnRadius, startY, timer: 1.1, duration: 1.1, landed: false });
        if (window.AudioFX) AudioFX.playUlti();
    }

    // Ataque especial del jefe de Valle Dorado: pico de hielo que erupciona del suelo cerca del jugador
    function spawnBossIceSpike() {
        const targetX = playerMesh.position.x + (Math.random() - 0.5) * 6;
        const groundY = getGroundYAt(targetX);

        const warnMesh = Render3D.createWarningRing(1.3, 0xffc107);
        warnMesh.position.set(targetX, groundY + 0.05, 0);
        scene.add(warnMesh);

        groundSpikes.push({ warnMesh, spikeMesh: null, targetX, groundY, timer: 0.85, erupted: false, life: 0 });
        if (window.AudioFX) AudioFX.playFreeze();
    }

    // Ataque especial del jefe de Castillo Dulce: orbe sombra que persigue lentamente al jugador
    function spawnBossShadowOrb() {
        const orbMesh = Render3D.createShadowOrbMesh();
        orbMesh.position.set(boss.mesh.position.x, boss.mesh.position.y + 1.5, 0);
        scene.add(orbMesh);
        shadowOrbs.push({ mesh: orbMesh, life: 4.5, speed: 8.5 + worldIdx * 0.6 });
        if (window.AudioFX) AudioFX.playUlti();
    }

    // Quita un enemigo por completo: malla Y cuerpo físico. Antes varias habilidades solo quitaban la
    // malla y el cuerpo quedaba como un obstáculo invisible que seguía chocando con el jugador.
    // Pisotón: caer sobre un diablito lo daña y te hace rebotar (en vez de recibir daño)
    function tryStomp(e) {
        if (playerBody.velocity.y > -1) return false;
        const dx = Math.abs(playerBody.position.x - e.body.position.x);
        const dy = playerBody.position.y - e.body.position.y;
        if (dx > 1.5 || dy < 0.6 || dy > 2.6) return false;
        playerBody.velocity.y = 13;
        jumpCount = 1;
        stompCombo++;
        gameProgress.score += 200 * Math.min(stompCombo, 5);
        if (window.AudioFX) AudioFX.playStomp();
        e.hp = (e.hp || 1) - 1;
        if (e.hp <= 0) {
            removeEnemy(e);
        } else {
            e.mesh.traverse(child => {
                const m = child.isMesh && child.material;
                if (m && m.color && !m.userData.flashing) {
                    m.userData.flashing = true;
                    m.userData.origHex = m.color.getHex();
                    m.color.setHex(0xffffff);
                    setTimeout(() => { m.color.setHex(m.userData.origHex); m.userData.flashing = false; }, 100);
                }
            });
        }
        return true;
    }

    function removeEnemy(e) {
        if (!e.active) return;
        e.active = false;
        scene.remove(e.mesh);
        if (e.body) physWorld.removeBody(e.body);
    }

    // Derrota del jefe (un solo lugar, para que la muerte no dependa de CÓMO recibió el daño)
    const BOSS_PHASE_UI = {
        1: { text: '', color: '#7e57c2' },
        2: { text: '😡 Enfurecido', color: '#ff6d00' },
        3: { text: '🔥 ¡FURIA MÁXIMA!', color: '#ff1744' },
        4: { text: '💀 ¡DESESPERACIÓN!', color: '#d500f9' }
    };
    function bossPhaseChanged(phase) {
        const ui = BOSS_PHASE_UI[phase];
        if (bossFill) bossFill.style.background = ui.color;
        if (bossLabel) bossLabel.textContent = `${(boss.names && boss.names[worldIdx]) || '👺 JEFE'} ${ui.text}`;
        showBanner(ui.text, ui.color);
        triggerShake(0.4, 0.35);
        if (window.AudioFX) AudioFX.playUlti();
        updateHUD();
    }
    function updateBossBar(dt) {
        if (!bossFill || !boss.active) return;
        const pct = Math.max(0, (boss.hp / boss.maxHP) * 100);
        bossFill.style.width = pct + '%';
        bossGhostPct = Math.max(pct, bossGhostPct - dt * 22); // la estela baja despacio detrás de la vida real
        bossGhost.style.width = bossGhostPct + '%';
    }

    function defeatBoss() {
        if (!boss.active) return;
        boss.active = false;
        if (bossUI) { bossUI.remove(); bossUI = null; bossFill = null; }
        scene.remove(boss.mesh);
        fireballs.forEach(fb => { scene.remove(fb.fireMesh); scene.remove(fb.warnMesh); });
        fireballs.length = 0;
        groundSpikes.forEach(gs => { if (gs.warnMesh) scene.remove(gs.warnMesh); if (gs.spikeMesh) scene.remove(gs.spikeMesh); });
        groundSpikes.length = 0;
        shadowOrbs.forEach(so => scene.remove(so.mesh));
        shadowOrbs.length = 0;
        triggerShake(0.55, 0.4);
        triggerHitStop(0.12);
        if (window.AudioFX) AudioFX.playBossDown();
        gameProgress.score += 2000;
        updateHUD();
    }

    function damageBoss(amount) {
        if (!boss.active) return;
        boss.hp -= amount;
        if (boss.hp <= 0) defeatBoss();
    }

    // ¿El jugador está realmente parado sobre una plataforma? (sustituye al viejo "velocidad Y ~ 0",
    // que también se cumplía en el punto más alto del salto y regalaba saltos extra)
    function isGrounded() {
        if (playerBody.velocity.y > 1.5) return false;
        const px = playerBody.position.x, py = playerBody.position.y;
        for (let i = 0; i < solidPlatforms.length; i++) {
            const p = solidPlatforms[i];
            const cx = p.mp ? p.mp.lastX : p.x;
            const cy = p.mp ? p.mp.lastY : p.y;
            // Esfera de radio 0.8 apoyada sobre una caja de 1.4 de alto: su centro queda ~1.5 sobre el centro de la plataforma
            if (Math.abs(px - cx) <= p.w / 2 + 0.4 && py - cy > 1.2 && py - cy < 1.9) return p;
        }
        return false;
    }

    // Meta Final
    const goalMesh = Render3D.createGoalPost();
    goalMesh.position.set(goalX, goalY, 0);
    scene.add(goalMesh);

    // Fondo Kawaii / Sanrio
    const bgDecor = Render3D.createBackgroundDecor(scene, lastPlat.x + lastPlat.w + 40, world.theme);

    // Controles
    const keys = { left: false, right: false };
    const lastSafe = { plat: solidPlatforms[0], dx: 0 }; // última plataforma firme donde estuvo parado
    let facingRight = true, jumpCount = 0, coyoteTimer = 0;
    let stompCombo = 0; // pisotones seguidos sin tocar el suelo: 200, 400, 600... puntos
    let knockTimer = 0, jumpBuffer = 0; // retroceso tras un golpe / salto anticipado (se "guarda" 0.12 s antes de aterrizar)
    let isPaused = false, gameTime = 0; // gameTime no avanza en pausa (las plataformas móviles no se desfasan)
    const maxJumpsAllowed = currentChar.maxJumps || 2;

    const onKeyDown = (e) => {
        // Se compara en minúscula: antes solo funcionaban 'a', 'd', 'w'... y no con Bloq Mayús o Shift
        const k = (e.key || '').toLowerCase();
        if (k === 'arrowleft' || k === 'a') keys.left = true;
        if (k === 'arrowright' || k === 'd') keys.right = true;
        // Mantener una tecla no debe repetir salto, disparo ni habilidad (antes gastaba todos los saltos)
        if (e.repeat) return;
        if (k === 'enter') { togglePause(); return; }
        if (isPaused) return;
        if (k === ' ' || k === 'w' || k === 'arrowup') {
            if (k === ' ' || k === 'arrowup') e.preventDefault();
            doJump();
        }
        if (k === 'f' || k === 'z' || k === 'k') shoot('normal');
        if (k === 'x' || k === 'c' || k === 'l') shoot('ice');
        if (k === 'e') useSpecialAbility();
    };

    window.addEventListener('keydown', onKeyDown);
    const onKeyUp = (e) => {
        const k = (e.key || '').toLowerCase();
        if (k === 'arrowleft' || k === 'a') keys.left = false;
        if (k === 'arrowright' || k === 'd') keys.right = false;
    };
    window.addEventListener('keyup', onKeyUp);
    const onBlur = () => { keys.left = false; keys.right = false; if (isRunning && !isPaused) togglePause(); }; // pausa sola al cambiar de ventana
    window.addEventListener('blur', onBlur);

    function doJump() {
        if (jumpCount < maxJumpsAllowed + (effects.jump > 0 ? 1 : 0)) {
            playerBody.velocity.y = currentChar.jump * (effects.jump > 0 ? 1.18 : 1);
            jumpCount++;
            if (window.AudioFX) AudioFX.playJump();
        } else {
            jumpBuffer = 0.12;
        }
    }

    let pauseOverlay = null;
    function togglePause() {
        if (!isRunning) return;
        isPaused = !isPaused;
        keys.left = false; keys.right = false;
        if (isPaused) {
            pauseOverlay = document.createElement('div');
            pauseOverlay.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(255,192,220,0.72);display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Fredoka One',cursive;font-size:44px;color:#d81b60;text-shadow:2px 2px 0 #fff;cursor:pointer;z-index:20;";
            pauseOverlay.innerHTML = '⏸ PAUSA<span style="font-size:16px;margin-top:8px;">Enter o toca la pantalla para continuar</span>';
            pauseOverlay.onclick = togglePause;
            container.appendChild(pauseOverlay);
            if (window.AudioFX && AudioFX.ctx) AudioFX.ctx.suspend();
        } else {
            if (pauseOverlay) { pauseOverlay.remove(); pauseOverlay = null; }
            if (window.AudioFX && AudioFX.ctx) AudioFX.ctx.resume();
        }
    }

    // Controles táctiles (solo en pantallas táctiles)
    if (('ontouchstart' in window) || navigator.maxTouchPoints > 0) {
        const pad = document.createElement('div');
        pad.style.cssText = 'position:absolute;left:0;right:0;bottom:8px;display:flex;justify-content:space-between;padding:0 10px;pointer-events:none;z-index:5;';
        const mkBtn = (label, onDown, onUp) => {
            const b = document.createElement('button');
            b.textContent = label;
            b.style.cssText = 'width:52px;height:52px;border-radius:50%;border:3px solid #fff;background:rgba(255,64,129,0.65);color:#fff;font-size:20px;pointer-events:auto;touch-action:none;user-select:none;margin:0 3px;';
            const down = (ev) => { ev.preventDefault(); if (!isPaused || label === '⏸') onDown(); };
            const up = (ev) => { ev.preventDefault(); if (onUp) onUp(); };
            b.addEventListener('touchstart', down, { passive: false });
            b.addEventListener('touchend', up, { passive: false });
            b.addEventListener('touchcancel', up, { passive: false });
            return b;
        };
        const leftGroup = document.createElement('div');
        leftGroup.style.cssText = 'display:flex;';
        leftGroup.appendChild(mkBtn('◀', () => { keys.left = true; }, () => { keys.left = false; }));
        leftGroup.appendChild(mkBtn('▶', () => { keys.right = true; }, () => { keys.right = false; }));
        const rightGroup = document.createElement('div');
        rightGroup.style.cssText = 'display:flex;';
        rightGroup.appendChild(mkBtn('⏸', togglePause));
        rightGroup.appendChild(mkBtn('✨', () => useSpecialAbility()));
        rightGroup.appendChild(mkBtn('🧊', () => shoot('ice')));
        rightGroup.appendChild(mkBtn('🎂', () => shoot('normal')));
        rightGroup.appendChild(mkBtn('🦘', doJump));
        pad.appendChild(leftGroup);
        pad.appendChild(rightGroup);
        container.appendChild(pad);
    }

    function shoot(type) {
        const now = performance.now();
        if (now - lastShotAt < 150) return; // cadencia mínima
        lastShotAt = now;
        const mesh = Render3D.createCakeBulletMesh(type);
        mesh.position.set(playerMesh.position.x, playerMesh.position.y + 0.5, 0);
        scene.add(mesh);
        bullets.push({ mesh, vx: facingRight ? 28 : -28, type, life: 0.92 }); // segundos (antes 55 frames)
        if (window.AudioFX) {
            if (type === 'normal') AudioFX.playShoot();
            else AudioFX.playFreeze();
        }
    }

    // --- SISTEMA DE HABILIDADES ESPECIALES (ULTIS) ---
    function useSpecialAbility() {
        if (abilityCooldown > 0) return;
        abilityCooldown = currentChar.cooldown;

        if (gameProgress.selectedSkin === 'kitty') {
            enemies.concat(flyingEnemies).forEach(e => {
                if (e.active && playerMesh.position.distanceTo(e.mesh.position) < 16) {
                    removeEnemy(e);
                    gameProgress.score += 200;
                }
            });
            if (boss.active && playerMesh.position.distanceTo(boss.mesh.position) < 18) {
                damageBoss(2);
            }
            spawnAbilityBurst(currentChar.color, playerMesh.position.x, playerMesh.position.y + 0.1, playerMesh.position.z, 10, 0.5);
            triggerShake(0.22, 0.18);
        } else if (gameProgress.selectedSkin === 'mymelody') {
            isInvulnerable = true;
            abilityTimer = 5.0;
            if (!shieldMesh) {
                shieldMesh = Render3D.createShieldBubble();
                playerMesh.add(shieldMesh);
            }
            spawnAbilityBurst(currentChar.color, playerMesh.position.x, playerMesh.position.y + 0.6, playerMesh.position.z, 3.2, 0.4);
        } else if (gameProgress.selectedSkin === 'kuromi') {
            isDashing = true;
            abilityTimer = 0.6;
            spawnAbilityBurst(currentChar.color, playerMesh.position.x, playerMesh.position.y + 0.1, playerMesh.position.z, 2.6, 0.35);
            playerBody.velocity.x = facingRight ? 42 : -42;
        } else if (gameProgress.selectedSkin === 'cinnamon') {
            enemies.concat(flyingEnemies).forEach(e => {
                if (e.active && playerMesh.position.distanceTo(e.mesh.position) < 14) {
                    e.isFrozen = true;
                    e.freezeTimer = 4.0;
                }
            });
            spawnAbilityBurst(currentChar.color, playerMesh.position.x, playerMesh.position.y + 0.1, playerMesh.position.z, 8, 0.5);
        } else if (gameProgress.selectedSkin === 'purin') {
            playerBody.velocity.y = 18;
            enemies.concat(flyingEnemies).forEach(e => {
                if (e.active && playerMesh.position.distanceTo(e.mesh.position) < 12) {
                    removeEnemy(e);
                }
            });
            spawnAbilityBurst(currentChar.color, playerMesh.position.x, playerMesh.position.y + 0.1, playerMesh.position.z, 7, 0.45);
            triggerShake(0.2, 0.15);
        }
        updateHUD();
    }

    function takeDamage() {
        // Si el nivel ya terminó (o murió en este mismo cuadro por otro golpe) no se procesa más daño:
        // evita pantallas de "Game Over" duplicadas.
        if (!isRunning || isInvulnerable || isDashing || graceTimer > 0) return;
        if (window.AudioFX) AudioFX.playPlayerHit();
        lives--;
        updateHUD();
        // Empuje en sentido contrario a la amenaza más cercana (antes dependía solo de hacia dónde mirabas)
        let threatX = null, best = 7;
        enemies.concat(flyingEnemies).forEach(e => {
            if (!e.active) return;
            const d = Math.abs(e.mesh.position.x - playerBody.position.x);
            if (d < best) { best = d; threatX = e.mesh.position.x; }
        });
        if (boss.active && Math.abs(boss.mesh.position.x - playerBody.position.x) < best) threatX = boss.mesh.position.x;
        const pushDir = threatX === null ? (facingRight ? -1 : 1) : (playerBody.position.x >= threatX ? 1 : -1);
        playerBody.velocity.set(pushDir * 14, 11, 0);
        knockTimer = 0.25;
        triggerShake(0.3, 0.22);

        if (lives <= 0 && checkpoint && checkpoint.active && !checkpoint.used) {
            // Segunda oportunidad: sigues desde el checkpoint con media vida (una sola vez por nivel)
            checkpoint.used = true;
            lives = Math.max(2, Math.ceil(maxLivesNow / 2));
            playerBody.position.set(checkpoint.respawnX, checkpoint.y + 2.5, 0);
            playerBody.velocity.set(0, 0, 0);
            knockTimer = 0;
            graceTimer = 2.0;
            showBanner('💾 ¡Continúas desde el checkpoint!', '#00c853');
            updateHUD();
            return;
        }
        if (lives <= 0) {
            isRunning = false;
            gameProgress.score = scoreAtStart;
            if (window.AudioFX) { AudioFX.stopBackgroundMusic(); AudioFX.playGameOver(); }
            cleanupListeners();
            showEndScreen({
                emoji: '💔',
                title: '¡Oh no!',
                subtitle: 'Te quedaste sin vidas',
                accent: '#ff4081',
                buttonLabel: 'Reintentar',
                onContinue: () => renderLevelMenu(worldIdx)
            });
        } else {
            isInvulnerable = true;
            if (flashInterval) clearInterval(flashInterval);
            let flashes = 0;
            flashInterval = setInterval(() => {
                playerMesh.visible = !playerMesh.visible;
                flashes++;
                if (flashes > 4) {
                    clearInterval(flashInterval);
                    flashInterval = null;
                    playerMesh.visible = true;
                    if (abilityTimer <= 0) isInvulnerable = false;
                }
            }, 150);
        }
    }

    function cleanupListeners() {
        if (flashInterval) { clearInterval(flashInterval); flashInterval = null; }
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('blur', onBlur);
        window.removeEventListener('resize', resizeRenderer);
        if (window.__resizeGameCanvas === resizeRenderer) window.__resizeGameCanvas = null;
    }

    // Pantalla de cierre (Game Over / victoria) sobre el último cuadro del juego, antes de volver al menú
    function showEndScreen({ emoji, title, subtitle, accent, buttonLabel, onContinue }) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: absolute; inset: 0; display: flex; flex-direction: column;
            align-items: center; justify-content: center; text-align: center;
            background: rgba(255,255,255,0.95); z-index: 25; font-family: 'Fredoka One', cursive;
            opacity: 0; transition: opacity 0.25s ease;
        `;
        overlay.innerHTML = `
            <div style="font-size:54px; margin-bottom:6px;">${emoji}</div>
            <div style="font-size:26px; color:${accent}; text-shadow:2px 2px 0 #fff;">${title}</div>
            <div style="font-size:14px; color:#888; margin-top:8px; font-family:sans-serif;">${subtitle}</div>
            <button id="end-continue-btn" style="margin-top:20px; padding:10px 26px; border-radius:20px; border:3px solid ${accent}; background:#fff; color:${accent}; font-family:inherit; font-size:14px; cursor:pointer;">${buttonLabel}</button>
        `;
        container.appendChild(overlay);
        requestAnimationFrame(() => { overlay.style.opacity = '1'; });
        overlay.querySelector('#end-continue-btn').onclick = () => { overlay.remove(); onContinue(); };
    }

    // Aviso rápido que se autodesvanece (usado al superar un nivel normal, para no frenar el ritmo)
    function showQuickToast(text, accent, thenCallback, ms = 950) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
            background: rgba(255,255,255,0.9); z-index: 25; font-family: 'Fredoka One', cursive;
            font-size: 24px; color: ${accent}; text-shadow: 2px 2px 0 #fff;
            opacity: 0; transition: opacity 0.2s ease;
        `;
        toast.textContent = text;
        container.appendChild(toast);
        requestAnimationFrame(() => { toast.style.opacity = '1'; });
        setTimeout(() => { toast.remove(); thenCallback(); }, ms);
    }

    // 3 estrellas si terminas casi sin daño, 2 con algo de daño, 1 si llegas justo
    function calcStars() {
        const ratio = lives / maxLivesNow;
        const base = ratio >= 1 ? 3 : ratio >= 0.6 ? 2 : 1;
        return (coinsTotal > 0 && coinsGot === coinsTotal) ? Math.min(3, base + 1) : base; // todas las monedas = +1 estrella
    }
    function recordStars(stars) {
        wp.stars = wp.stars || [0, 0, 0, 0, 0];
        wp.stars[levelIdx] = Math.max(wp.stars[levelIdx] || 0, stars);
    }

    function completeNormalLevel() {
        isRunning = false;
        const stars = calcStars();
        recordStars(stars);
        if (window.AudioFX) AudioFX.stopBackgroundMusic();
        cleanupListeners();
        wp.doneLevels = wp.doneLevels || [false, false, false, false, false];
        const firstTime = !wp.doneLevels[levelIdx];
        if (firstTime) {
            wp.doneLevels[levelIdx] = true;
            gameProgress.score += 1000;
            wp.keys = Math.min(4, wp.keys + 1);
        } else {
            gameProgress.score = scoreAtStart; // repetir un nivel no da puntos ni llaves
        }
        if (levelIdx + 1 < LEVELS_PER_WORLD) wp.unlockedLevels[levelIdx + 1] = true;
        saveProgress();
        if (window.AudioFX) AudioFX.playVictory();
        showQuickToast((firstTime ? '🔑 ¡Llave obtenida!' : '✅ ¡Nivel superado!') + ' ' + '⭐'.repeat(stars) + ` · 🪙 ${coinsGot}/${coinsTotal}`, '#ff4081', () => renderLevelMenu(worldIdx));
    }

    function completeBossLevel() {
        isRunning = false;
        const stars = calcStars();
        recordStars(stars);
        if (window.AudioFX) AudioFX.stopBackgroundMusic();
        cleanupListeners();
        const firstTime = !wp.completed;
        if (firstTime) gameProgress.score += 2500;
        else gameProgress.score = scoreAtStart;
        wp.completed = true;
        const isLastWorld = !(worldIdx + 1 < WORLDS.length);
        if (!isLastWorld) {
            const nextWp = gameProgress.worlds[worldIdx + 1];
            nextWp.unlocked = true;
            nextWp.unlockedLevels[0] = true; // sin esto el mundo nuevo quedaba con todos los niveles bloqueados
            if (firstTime && window.AudioFX) AudioFX.playWorldUnlock();
        }
        saveProgress();
        if (window.AudioFX && (isLastWorld || !firstTime)) AudioFX.playVictory();
        showEndScreen({
            emoji: isLastWorld ? '👑' : '🏆',
            title: isLastWorld ? '¡Juego completado!' : '¡Mundo superado!',
            subtitle: '⭐'.repeat(stars) + ' · ' + (firstTime ? '+2500 puntos · ' : '') + (isLastWorld ? '¡Venciste a todos los jefes!' : '¡Nuevo mundo desbloqueado!'),
            accent: '#ffab00',
            buttonLabel: 'Continuar',
            onContinue: () => renderWorldMenu()
        });
    }

    const clock = new THREE.Clock();
    let isRunning = true;
    let animFrame = 0, animTimer = 0;

    function animate() {
        if (!isRunning) return;
        requestAnimationFrame(animate);
        try {

        const delta = Math.min(Math.max(clock.getDelta(), 0.001), 0.05); // acotado: pestaña en segundo plano / delta 0

        // Pausa: se sigue dibujando el cuadro, pero la lógica y la física se congelan
        if (isPaused) { renderer.render(scene, camera); return; }

        // Hit-stop: micro-pausa de un instante al conectar un golpe fuerte (ej. contra el jefe).
        // Se sigue dibujando el cuadro para que no parpadee, pero la física/lógica se congela un momento.
        if (hitStopTimer > 0) {
            hitStopTimer -= delta;
            renderer.render(scene, camera);
            return;
        }

        gameTime += delta;
        for (const k of ['speed', 'jump', 'magnet']) {
            if (effects[k] > 0) { effects[k] -= delta; if (effects[k] <= 0) { effects[k] = 0; updateHUD(); } }
        }
        hudTick += delta;
        if (hudTick > 0.25) { hudTick = 0; if (effects.speed > 0 || effects.jump > 0 || effects.magnet > 0) updateHUD(); }
        if (graceTimer > 0) graceTimer -= delta;
        updateBossBar(delta);
        physWorld.step(1 / 60, delta, 3);

        // Mantiene a jugador y enemigos en el plano z = 0 (los choques podían sacarlos de él)
        playerBody.position.z = 0; playerBody.velocity.z = 0;
        enemies.forEach(e => { if (e.active) { e.body.position.z = 0; e.body.velocity.z = 0; } });

        if (hintTimer > 0) { hintTimer -= delta; if (hintTimer <= 0) updateHUD(); }

        // Actualizar Cooldowns y Habilidades
        if (abilityCooldown > 0) {
            abilityCooldown -= delta;
            if (abilityCooldown < 0) abilityCooldown = 0;
            updateHUD();
        }

        if (abilityTimer > 0) {
            abilityTimer -= delta;
            if (abilityTimer <= 0) {
                if (gameProgress.selectedSkin === 'mymelody') {
                    isInvulnerable = false;
                    if (shieldMesh) { playerMesh.remove(shieldMesh); shieldMesh = null; }
                }
                if (gameProgress.selectedSkin === 'kuromi') isDashing = false;
            }
        }

        // Animación del Sprite / Personaje
        animTimer += delta;
        if (animTimer > 0.1) {
            animFrame++;
            animTimer = 0;
        }

        playerMesh.position.copy(playerBody.position);
        const isAirborne = Math.abs(playerBody.velocity.y) > 0.5;

        if (knockTimer > 0) {
            knockTimer -= delta;
            playerBody.velocity.x *= 0.97;
        } else if (!isDashing) {
            if (keys.left) {
                playerBody.velocity.x = -currentChar.speed * (effects.speed > 0 ? 1.35 : 1);
                facingRight = false;
                Render3D.updatePlayerSpriteAnim(playerMesh, 'left', animFrame, isAirborne);
            } else if (keys.right) {
                playerBody.velocity.x = currentChar.speed * (effects.speed > 0 ? 1.35 : 1);
                facingRight = true;
                Render3D.updatePlayerSpriteAnim(playerMesh, 'right', animFrame, isAirborne);
            } else {
                playerBody.velocity.x *= 0.8;
                Render3D.updatePlayerSpriteAnim(playerMesh, facingRight ? 'right' : 'left', 0, isAirborne);
            }
        } else {
            enemies.concat(flyingEnemies).forEach(e => {
                if (e.active && playerMesh.position.distanceTo(e.mesh.position) < 2.0) {
                    removeEnemy(e);
                }
            });
        }

        // Los saltos se recuperan solo al estar realmente sobre una plataforma. Si el jugador se cae de un
        // borde sin saltar, tras un instante de gracia (coyote time) eso cuenta como su primer salto.
        if (jumpBuffer > 0) jumpBuffer -= delta;
        const groundPlat = isGrounded();
        if (groundPlat) {
            stompCombo = 0;
            jumpCount = 0;
            coyoteTimer = 0.1;
            const gcx = groundPlat.mp ? groundPlat.mp.lastX : groundPlat.x;
            const margin = Math.min(2, groundPlat.w * 0.25);
            const half = groundPlat.w / 2 - margin;
            lastSafe.plat = groundPlat;
            lastSafe.dx = Math.max(-half, Math.min(half, playerBody.position.x - gcx));
            if (jumpBuffer > 0) { jumpBuffer = 0; doJump(); }
        } else {
            coyoteTimer -= delta;
            if (coyoteTimer <= 0 && jumpCount === 0) jumpCount = 1;
        }

        // Enemigos Terrestres
        enemies.forEach(e => {
            if (!e.active) return;
            // Enemigos que cayeron al vacío: se retiran (antes seguían "activos" y cayendo para siempre)
            if (e.body.position.y < -15) { removeEnemy(e); return; }
            e.mesh.position.copy(e.body.position);

            if (e.isFrozen) {
                e.body.velocity.x = 0;
                if (!e.ethereal && playerMesh.position.distanceTo(e.mesh.position) < 1.9 && tryStomp(e)) return;
                e.freezeTimer -= delta;
                if (!e.iceBlock) {
                    e.iceBlock = Render3D.createIceBlock();
                    e.iceBlock.position.y -= 0.85; // acompaña al modelo, que se bajó al suelo
                    e.mesh.add(e.iceBlock);
                }
                if (e.freezeTimer <= 0) {
                    e.isFrozen = false;
                    if (e.iceBlock) { e.mesh.remove(e.iceBlock); e.iceBlock = null; }
                }
            } else {
                // Patrulla de un lado a otro de SU plataforma. Si el jugador está cerca y a una altura parecida
                // lo persigue, pero sin pasar nunca del límite (antes corría tras él y se caía al vacío).
                const pcx = e.plat.mp ? e.plat.mp.lastX : e.plat.x;
                const minX = pcx - e.patrolHalf, maxX = pcx + e.patrolHalf;
                if (e.body.position.x < minX) e.body.position.x = minX;
                else if (e.body.position.x > maxX) e.body.position.x = maxX;
                const ex = e.body.position.x;
                const pdx = playerMesh.position.x - ex;
                const pdy = Math.abs(playerMesh.position.y - e.mesh.position.y);
                let espeed = 3 * diffCfg.speedMul;
                if (Math.abs(pdx) < 10 && pdy < 4) {
                    e.dir = pdx < 0 ? -1 : 1;
                    espeed = Math.abs(pdx) < 0.4 ? 0 : 6 * diffCfg.speedMul;
                } else if (ex <= minX) e.dir = 1;
                else if (ex >= maxX) e.dir = -1;
                if ((ex <= minX && e.dir < 0) || (ex >= maxX && e.dir > 0)) espeed = 0;
                e.body.velocity.x = e.dir * espeed;
                if (e.hopper) {
                    e.hopTimer -= delta;
                    if (e.hopTimer <= 0 && Math.abs(e.body.velocity.y) < 0.4 && Math.abs(pdx) < 12 && pdy < 4) {
                        e.body.velocity.y = 14;
                        e.hopTimer = 1.3 + Math.random() * 0.9;
                    }
                }
                if (e.kind === 'shield' && e.shieldMesh) e.shieldMesh.position.x = e.dir * 0.95; // el escudo mira hacia donde camina
                if (e.kind === 'shooter') {
                    e.shootTimer -= delta;
                    if (e.shootTimer <= 0 && Math.abs(pdx) < 13 && pdy < 3) {
                        e.shootTimer = 2.3 + Math.random() * 0.9;
                        const sdir = pdx < 0 ? -1 : 1;
                        const sm = Render3D.createEnemyShotMesh();
                        sm.position.set(e.body.position.x + sdir * 0.9, e.body.position.y + 0.3, 0);
                        scene.add(sm);
                        enemyShots.push({ mesh: sm, vx: sdir * 9.5, life: 2.4 });
                        if (window.AudioFX) AudioFX.playEnemyShot();
                    }
                }
                if (e.kind === 'ghost') {
                    e.ghostT -= delta;
                    if (e.ghostT <= 0) {
                        e.ethereal = !e.ethereal;
                        e.ghostT = e.ethereal ? 1.6 : 2.4;
                        setMeshOpacity(e.mesh, e.ethereal ? 0.22 : 1); // intangible: no hace daño ni recibe golpes
                    }
                }

                if (!e.ethereal && playerMesh.position.distanceTo(e.mesh.position) < 1.9 && !tryStomp(e)) takeDamage();
            }
        });

        // Disparos de los diablitos lanzadores
        for (let i = enemyShots.length - 1; i >= 0; i--) {
            const sh = enemyShots[i];
            sh.mesh.position.x += sh.vx * delta;
            sh.life -= delta;
            if (playerMesh.position.distanceTo(sh.mesh.position) < 1.0) { takeDamage(); sh.life = 0; }
            if (sh.life <= 0) { scene.remove(sh.mesh); enemyShots.splice(i, 1); }
        }

        // Enemigos Voladores
        flyingEnemies.forEach(fe => {
            if (!fe.active) return;

            if (fe.isFrozen) {
                fe.freezeTimer -= delta;
                if (!fe.iceBlock) {
                    fe.iceBlock = Render3D.createIceBlock();
                    fe.mesh.add(fe.iceBlock);
                }
                if (fe.freezeTimer <= 0) {
                    fe.isFrozen = false;
                    if (fe.iceBlock) { fe.mesh.remove(fe.iceBlock); fe.iceBlock = null; }
                }
            } else {
                fe.angle += delta * 3.2;
                fe.mesh.position.y = fe.origY + Math.sin(fe.angle) * 1.5;
                let hdist = playerMesh.position.x - fe.mesh.position.x;
                if (Math.abs(hdist) < 16) {
                    fe.mesh.position.x += Math.sign(hdist) * 3.5 * delta;
                }
                if (playerMesh.position.distanceTo(fe.mesh.position) < 1.4) takeDamage();
            }
        });

        // Lógica del Jefe Demoniaco: patrulla + ataque especial propio de cada mundo, con 2 fases de furia
        if (boss.active) {
            if (boss.phase === 1 && boss.hp <= boss.maxHP * 0.5) {
                boss.phase = 2;
                boss.speed = boss.baseSpeed * 1.3;
                boss.attackTimer = 1.6;
                bossPhaseChanged(2);
            } else if (boss.phase === 2 && boss.hp <= boss.maxHP * 0.25) {
                boss.phase = 3;
                boss.speed = boss.baseSpeed * 1.55;
                boss.attackTimer = 1.0;
                bossPhaseChanged(3);
            } else if (boss.phase === 3 && boss.hp <= boss.maxHP * 0.12) {
                boss.phase = 4;
                boss.speed = boss.baseSpeed * 1.8;
                boss.attackTimer = 0.8;
                boss.chargeCd = 2.0;
                bossPhaseChanged(4);
            }

            if (boss.freezeImmune > 0) boss.freezeImmune -= delta;
            if (boss.isFrozen) {
                boss.freezeTimer -= delta;
                if (!boss.iceBlock) {
                    boss.iceBlock = Render3D.createIceBlock();
                    boss.iceBlock.scale.set(2, 2, 2);
                    boss.mesh.add(boss.iceBlock);
                }
                if (boss.freezeTimer <= 0) {
                    boss.isFrozen = false;
                    boss.freezeImmune = 2.0;
                    if (boss.iceBlock) { boss.mesh.remove(boss.iceBlock); boss.iceBlock = null; }
                }
            } else {
                // Fase 4: cada pocos segundos se queda temblando (aviso) y luego embiste
                let bossMove = boss.speed;
                if (boss.phase >= 4) {
                    if (boss.charge === 'idle') {
                        boss.chargeCd -= delta;
                        if (boss.chargeCd <= 0) { boss.charge = 'windup'; boss.chargeT = 0.7; showBanner('⚠️ ¡EMBESTIDA!', '#ff1744'); }
                    } else if (boss.charge === 'windup') {
                        bossMove = 0;
                        boss.chargeT -= delta;
                        boss.mesh.position.y = boss.baseY + Math.sin(Date.now() * 0.06) * 0.15;
                        if (boss.chargeT <= 0) { boss.charge = 'go'; boss.chargeT = 1.0; boss.dir = playerMesh.position.x >= boss.mesh.position.x ? 1 : -1; }
                    } else {
                        bossMove = boss.baseSpeed * 3.3;
                        boss.chargeT -= delta;
                        if (boss.chargeT <= 0) { boss.charge = 'idle'; boss.chargeCd = 4.5; boss.mesh.position.y = boss.baseY; }
                    }
                }
                boss.mesh.position.x += boss.dir * bossMove * delta;
                boss.mesh.position.x = Math.max(bossPatrolMin, Math.min(bossPatrolMax, boss.mesh.position.x));
                boss.mesh.rotation.y += delta * (boss.phase >= 2 ? 3.6 : 1.8);

                if (boss.mesh.position.x <= bossPatrolMin) boss.dir = 1;
                if (boss.mesh.position.x >= bossPatrolMax) boss.dir = -1;

                if (playerMesh.position.distanceTo(boss.mesh.position) < 2.5) takeDamage();

                if (boss.phase >= 2) {
                    boss.attackTimer -= delta;
                    if (boss.attackTimer <= 0) {
                        if (worldIdx === 0) {
                            spawnBossFireball();
                            if (boss.phase >= 3) spawnBossFireball();
                            if (boss.phase >= 4) spawnBossFireball();
                        } else if (worldIdx === 1) {
                            spawnBossIceSpike();
                            spawnBossIceSpike();
                            if (boss.phase >= 3) spawnBossIceSpike();
                            if (boss.phase >= 4) spawnBossIceSpike();
                        } else {
                            spawnBossShadowOrb();
                            if (boss.phase >= 3) spawnBossShadowOrb();
                            if (boss.phase >= 4 && shadowOrbs.length < 5) spawnBossShadowOrb();
                        }
                        boss.attackTimer = boss.phase >= 4 ? 1.1 : boss.phase === 3 ? 1.4 : 2.2;
                    }
                }
            }
        }

        // Bolas de fuego cayendo
        for (let i = fireballs.length - 1; i >= 0; i--) {
            const fb = fireballs[i];
            fb.timer -= delta;
            const t = Math.min(1, Math.max(0, 1 - fb.timer / fb.duration));
            fb.fireMesh.position.y = fb.startY + (fb.groundY - fb.startY) * t;
            fb.fireMesh.rotation.y += delta * 6;

            const pulse = 0.35 + Math.abs(Math.sin(Date.now() * 0.012)) * 0.35;
            if (fb.warnMesh.children[0]) fb.warnMesh.children[0].material.opacity = pulse;

            if (fb.timer <= 0 && !fb.landed) {
                fb.landed = true;
                scene.remove(fb.fireMesh);
                scene.remove(fb.warnMesh);
                const dist = Math.abs(playerMesh.position.x - fb.targetX);
                if (dist < fb.warnRadius && Math.abs(playerMesh.position.y - fb.groundY) < 3) {
                    takeDamage();
                }
                if (window.AudioFX) AudioFX.playFreeze();
                fireballs.splice(i, 1);
            }
        }

        // Picos de hielo del jefe (Valle Dorado): aviso -> erupción -> daño si el jugador está encima
        for (let i = groundSpikes.length - 1; i >= 0; i--) {
            const gs = groundSpikes[i];
            if (!gs.erupted) {
                gs.timer -= delta;
                const pulse = 0.35 + Math.abs(Math.sin(Date.now() * 0.012)) * 0.35;
                if (gs.warnMesh.children[0]) gs.warnMesh.children[0].material.opacity = pulse;
                if (gs.timer <= 0) {
                    gs.erupted = true;
                    scene.remove(gs.warnMesh);
                    gs.spikeMesh = Render3D.createIceSpikeMesh();
                    gs.spikeMesh.position.set(gs.targetX, gs.groundY - 1.4, 0);
                    scene.add(gs.spikeMesh);
                    gs.life = 1.3;
                }
            } else {
                gs.spikeMesh.position.y = Math.min(gs.groundY + 0.3, gs.spikeMesh.position.y + delta * 5);
                const dist = Math.abs(playerMesh.position.x - gs.targetX);
                if (dist < 1.1 && Math.abs(playerMesh.position.y - gs.groundY) < 2.6) takeDamage();
                gs.life -= delta;
                if (gs.life <= 0) { scene.remove(gs.spikeMesh); groundSpikes.splice(i, 1); }
            }
        }

        // Orbes sombra del jefe (Castillo Dulce): persiguen lentamente al jugador
        for (let i = shadowOrbs.length - 1; i >= 0; i--) {
            const so = shadowOrbs[i];
            so.life -= delta;
            const dx = playerMesh.position.x - so.mesh.position.x;
            const dy = playerMesh.position.y - so.mesh.position.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 0.1) {
                so.mesh.position.x += (dx / dist) * so.speed * delta;
                so.mesh.position.y += (dy / dist) * so.speed * delta;
            }
            so.mesh.rotation.y += delta * 4;
            if (dist < 1.3) { takeDamage(); so.life = 0; }
            if (so.life <= 0) { scene.remove(so.mesh); shadowOrbs.splice(i, 1); }
        }

        // Corazones
        hearts.forEach(h => {
            if (h.active) {
                h.mesh.rotation.y += delta * 2.4;
                if (effects.magnet > 0) attract(h.mesh);
                if (playerMesh.position.distanceTo(h.mesh.position) < 1.4) {
                    h.active = false;
                    scene.remove(h.mesh);
                    if (window.AudioFX) AudioFX.playHeal();
                    if (lives < maxLivesNow) { lives++; updateHUD(); }
                    gameProgress.score += 300;
                }
            }
        });

        // Monedas
        coins.forEach(c => {
            if (!c.active) return;
            c.mesh.rotation.y += delta * 3;
            if (effects.magnet > 0) { attract(c.mesh); c.baseY = c.mesh.position.y; }
            else c.mesh.position.y = c.baseY + Math.sin(gameTime * 3 + c.phase) * 0.15;
            if (playerMesh.position.distanceTo(c.mesh.position) < 1.15) {
                c.active = false;
                scene.remove(c.mesh);
                coinsGot++;
                gameProgress.score += 50;
                if (window.AudioFX) AudioFX.playCoin();
                if (coinsGot === coinsTotal) {
                    gameProgress.score += 500;
                    showBanner('🪙 ¡Todas las monedas!', '#ffab00');
                }
                updateHUD();
            }
        });

        // Power-ups
        powerUps.forEach(pu => {
            if (!pu.active) return;
            pu.mesh.rotation.y += delta * 2;
            pu.mesh.position.y = pu.baseY + Math.sin(gameTime * 2.6 + pu.baseY) * 0.25;
            const ring = pu.mesh.getObjectByName('puRing');
            if (ring) ring.rotation.z += delta * 3;
            if (playerMesh.position.distanceTo(pu.mesh.position) < 1.4) {
                pu.active = false;
                scene.remove(pu.mesh);
                const def = POWERUPS[pu.type];
                effects[pu.type] = def.secs;
                showBanner(`${def.emoji} ${def.label}`, def.color);
                if (window.AudioFX) AudioFX.playPowerUp();
                updateHUD();
            }
        });

        // Checkpoint
        if (checkpoint && !checkpoint.active
            && Math.abs(playerBody.position.x - checkpoint.x) < 2.2 && Math.abs(playerBody.position.y - (checkpoint.y + 1.0)) < 3.2) {
            checkpoint.active = true;
            const flag = checkpoint.mesh.getObjectByName('flag');
            if (flag) flag.material.color.setHex(0x00e676);
            showBanner('🚩 ¡Checkpoint!', '#00c853');
            if (window.AudioFX) AudioFX.playCheckpoint();
            updateHUD();
        }

        // Llave del nivel
        if (keyMesh && !keyCollected) {
            keyMesh.rotation.y += delta * 2.2;
            keyMesh.position.y += Math.sin(Date.now() * 0.003) * 0.18 * delta;
            if (playerMesh.position.distanceTo(keyMesh.position) < 1.5) {
                keyCollected = true;
                scene.remove(keyMesh);
                gameProgress.score += 500;
                if (window.AudioFX) AudioFX.playKeyGet();
                updateHUD();
            }
        }

        // Cofre secreto (opcional, bonus de puntos)
        chests.forEach(ch => {
            if (!ch.active) return;
            ch.mesh.rotation.y += delta * 0.8;
            const sparkle = ch.mesh.getObjectByName('chestSparkle');
            if (sparkle) sparkle.position.y = 0.95 + Math.sin(Date.now() * 0.004) * 0.08;
            if (playerMesh.position.distanceTo(ch.mesh.position) < 1.6) {
                ch.active = false;
                scene.remove(ch.mesh);
                gameProgress.score += 800;
                if (window.AudioFX) AudioFX.playWorldUnlock();
                updateHUD();
            }
        });

        // Proyectiles y Congelamiento
        for (let idx = bullets.length - 1; idx >= 0; idx--) {
            const b = bullets[idx];
            b.mesh.position.x += b.vx * delta;
            b.life -= delta;

            if (boss.active && b.mesh.position.distanceTo(boss.mesh.position) < 2.3) {
                if (window.AudioFX) AudioFX.playEnemyHit();
                if (b.type === 'ice') {
                    if (!boss.isFrozen && boss.freezeImmune <= 0) {
                        boss.isFrozen = true;
                        boss.freezeTimer = 3.0;
                    }
                } else {
                    triggerHitStop(0.05);
                    triggerShake(0.14, 0.12);
                    damageBoss(1);
                }
                b.life = 0;
                gameProgress.score += 150;
            }

            enemies.forEach(e => {
                if (e.active && !e.ethereal && b.mesh.position.distanceTo(e.mesh.position) < 1.3) {
                    if (e.kind === 'shield' && b.vx * e.dir < 0) { // golpea el escudo de frente: rebota sin hacer nada
                        b.life = 0;
                        if (window.AudioFX) AudioFX.playShieldBlock();
                        return;
                    }
                    if (window.AudioFX) AudioFX.playEnemyHit();
                    if (b.type === 'ice') {
                        e.isFrozen = true;
                        e.freezeTimer = 3.5;
                    } else {
                        e.hp = (e.hp || 1) - 1;
                        if (e.hp <= 0) {
                            removeEnemy(e);
                        } else {
                            // Flash al recibir daño sin morir (aún le quedan golpes)
                            // Los materiales se comparten entre piezas: se guarda el color original una sola vez
                            e.mesh.traverse(child => {
                                const m = child.isMesh && child.material;
                                if (m && m.color && !m.userData.flashing) {
                                    m.userData.flashing = true;
                                    m.userData.origHex = m.color.getHex();
                                    m.color.setHex(0xffffff);
                                    setTimeout(() => { m.color.setHex(m.userData.origHex); m.userData.flashing = false; }, 100);
                                }
                            });
                        }
                    }
                    b.life = 0;
                    gameProgress.score += 200;
                }
            });

            flyingEnemies.forEach(fe => {
                if (fe.active && b.mesh.position.distanceTo(fe.mesh.position) < 1.3) {
                    if (window.AudioFX) AudioFX.playEnemyHit();
                    if (b.type === 'ice') {
                        fe.isFrozen = true;
                        fe.freezeTimer = 3.5;
                    } else {
                        removeEnemy(fe);
                    }
                    b.life = 0;
                    gameProgress.score += 250;
                }
            });

            if (b.life <= 0) { scene.remove(b.mesh); bullets.splice(idx, 1); }
        }

        // Animación de lava: brasas subiendo y llamas titilando
        hazards.forEach(hz => {
            if (hz.isLava && hz.mesh) {
                hz.mesh.children.forEach(child => {
                    if (child.name === 'lavaEmber') {
                        child.position.y += delta * 0.6;
                        if (child.position.y > 1.1) child.position.y = 0.4;
                    } else if (child.name === 'lavaFlame') {
                        child.scale.y = 0.85 + Math.abs(Math.sin(Date.now() * 0.006 + child.position.x)) * 0.3;
                    }
                });
            }
        });

        // Plataformas móviles: se mueven en seno; si el jugador está parado encima, se mueve con ella
        movingPlatforms.forEach(mp => {
            const t = gameTime * mp.speed + mp.phase;
            const offset = Math.sin(t) * mp.range;
            const newX = mp.vertical ? mp.baseX : mp.baseX + offset;
            const newY = mp.vertical ? mp.baseY + offset : mp.baseY;
            const dx = newX - mp.lastX;
            const dy = newY - mp.lastY;

            mp.body.position.set(newX, newY, 0);
            if (mp.body.velocity) mp.body.velocity.set(dx / delta, dy / delta, 0);
            mp.mesh.position.set(newX, newY, 0);

            // ¿El jugador está parado sobre esta plataforma? -> se mueve junto con ella
            const onTop = Math.abs(playerBody.position.x - mp.lastX) < mp.w / 2 + 0.6
                && (playerBody.position.y - mp.lastY) > 0.5 && (playerBody.position.y - mp.lastY) < 2.4;
            if (onTop) {
                playerBody.position.x += dx;
                playerBody.position.y += dy;
            }

            enemies.forEach(e => {
                if (!e.active || e.plat.mp !== mp) return;
                const rdy = e.body.position.y - mp.lastY;
                if (Math.abs(e.body.position.x - mp.lastX) < mp.w / 2 + 0.6 && rdy > 0.5 && rdy < 3) {
                    e.body.position.x += dx;
                    e.body.position.y += dy;
                }
            });

            mp.lastX = newX;
            mp.lastY = newY;
        });

        // Peligros: picos sobre plataforma golpean al pisarlos; lava/picos en huecos dañan y reposicionan
        hazards.forEach(hz => {
            if (playerBody.position.x < hz.x1 || playerBody.position.x > hz.x2) return;
            if (hz.type === 'platformSpikes') {
                if (Math.abs(playerBody.position.y - (hz.y + 1.3)) < 0.9) takeDamage();
            } else if (playerBody.position.y < hz.y + 1.2) {
                takeDamage();
                playerBody.position.set(hz.safeX, hz.safeY + 2.5, 0);
                playerBody.velocity.set(0, 5, 0);
                knockTimer = 0;
            }
        });

        // Caída
        if (playerBody.position.y < -10) {
            takeDamage();
            // Vuelve a la última plataforma firme (antes seguía cayendo y perdía todas las vidas)
            const sp = lastSafe.plat;
            const scx = sp.mp ? sp.mp.lastX : sp.x;
            const scy = sp.mp ? sp.mp.lastY : sp.y;
            playerBody.position.set(scx + lastSafe.dx, scy + 2.5, 0);
            playerBody.velocity.set(0, 0, 0);
            knockTimer = 0;
        }

        // Meta Final
        if (playerMesh.position.distanceTo(goalMesh.position) < 2.2) {
            if (isBoss) {
                if (!boss.active) completeBossLevel();
            } else if (keyCollected) {
                completeNormalLevel();
            } else if (hintTimer <= 0) {
                hintTimer = 2.0;
                updateHUD();
            }
        }

        // Cámara Seguidora Suave + temblor (screen shake) que decae con el tiempo
        let shakeX = 0, shakeY = 0;
        if (shakeTimer > 0) {
            shakeTimer -= delta;
            const decay = Math.max(0, shakeTimer / shakeDuration);
            shakeX = (Math.random() - 0.5) * shakeMag * decay;
            shakeY = (Math.random() - 0.5) * shakeMag * decay;
            if (shakeTimer <= 0) shakeMag = 0;
        }
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, playerMesh.position.x + 3, 0.08) + shakeX;
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, playerMesh.position.y + 3, 0.08) + shakeY;
        camera.position.z = 15;
        camera.lookAt(playerMesh.position.x + 2, playerMesh.position.y + 1, 0);

        // Estallidos visuales de las ultis: se expanden y se desvanecen
        for (let i = abilityFX.length - 1; i >= 0; i--) {
            const fx = abilityFX[i];
            fx.life -= delta;
            const t = 1 - Math.max(0, fx.life / fx.maxLife);
            const scale = 1 + (fx.endScale - 1) * t;
            fx.mesh.scale.set(scale, 1, scale);
            const fade = Math.max(0, 1 - t);
            const ring = fx.mesh.getObjectByName('burstRing');
            const glow = fx.mesh.getObjectByName('burstGlow');
            const sparkles = fx.mesh.getObjectByName('burstSparkles');
            if (ring) ring.material.opacity = 0.65 * fade;
            if (glow) glow.material.opacity = 0.28 * fade;
            if (sparkles) sparkles.material.opacity = 0.8 * fade;
            if (fx.life <= 0) { scene.remove(fx.mesh); abilityFX.splice(i, 1); }
        }

        // Fondo animado
        if (bgDecor) bgDecor.children.forEach(c => {
          try {
            if (c.userData && c.userData.isWindmill) {
                const bl = c.getObjectByName('blades');
                if (bl) bl.rotation.z -= delta * 1.1;
                return;
            }
            if (c.userData && c.userData.isSunRays) { c.rotation.z += delta * 0.04; return; }
            if (c.userData && c.userData.isStaticDecor) return;
            if (c.userData && c.userData.isSnowflake) {
                c.position.y -= delta * c.userData.fallSpeed;
                c.position.x += Math.sin(Date.now() * 0.001 + c.userData.driftOffset) * delta * 0.4;
                if (c.position.y < -3) c.position.y = c.userData.baseY;
                return;
            }
            if (c.userData && c.userData.isTwinkleStar) {
                const mat = c.material;
                if (mat) mat.opacity = 0.4 + Math.abs(Math.sin(Date.now() * 0.002 + c.userData.twinkleOffset)) * 0.6;
                if (mat) mat.transparent = true;
                return;
            }
            if (c.userData && (c.userData.isButterfly || c.userData.isBird)) {
                const t = Date.now() * 0.001 * c.userData.roamSpeed + c.userData.roamOffset;
                c.position.x = (c.userData.baseX ?? c.position.x) + Math.sin(t) * 4;
                c.position.y = c.userData.baseY + Math.sin(t * 1.7) * 1.2;
                c.rotation.y = Math.cos(t) > 0 ? 0 : Math.PI;
                const wingL = c.getObjectByName('wingL');
                const wingR = c.getObjectByName('wingR');
                const flap = Math.sin(Date.now() * 0.001 * c.userData.flapSpeed) * 0.9;
                if (wingL) wingL.rotation.z = flap;
                if (wingR) wingR.rotation.z = -flap;
                return;
            }
            if (c.userData && c.userData.isFirefly) {
                const t = Date.now() * 0.001 * c.userData.roamSpeed + c.userData.roamOffset;
                c.position.x = (c.userData.baseX ?? c.position.x) + Math.sin(t) * 2.2;
                c.position.y = c.userData.baseY + Math.sin(t * 1.4) * 0.9 + Math.cos(t * 0.6) * 0.4;
                const pulse = 0.6 + Math.abs(Math.sin(Date.now() * 0.004 + c.userData.roamOffset)) * 0.4;
                c.scale.set(pulse, pulse, pulse);
                return;
            }
            if (c.userData && c.userData.isMagicTree) {
                const glow = c.getObjectByName('magicGlow');
                const halo = c.getObjectByName('magicHalo');
                const pulse = 0.7 + Math.abs(Math.sin(Date.now() * 0.003 + c.userData.twinkleOffset)) * 0.5;
                if (glow) glow.scale.set(pulse, pulse, pulse);
                if (halo) halo.scale.set(pulse * 1.1, pulse * 1.1, pulse * 1.1);
                return;
            }
            c.rotation.y += delta * 0.15;
            if (c.userData && c.userData.isFloatDecor) {
                c.rotation.y += delta * 0.6;
                c.position.y = c.userData.baseY + Math.sin(Date.now() * 0.001 * c.userData.floatSpeed + c.userData.floatOffset) * c.userData.floatAmp;
            }
          } catch (decorErr) {
            // Una pieza decorativa rota ya no tumba el resto del fondo animado.
            console.warn('Fondo: se omitió una decoración con error', decorErr);
          }
        });

        renderer.render(scene, camera);

        } catch (frameErr) {
            // Red de seguridad: si algo falla en medio del cuadro, no se
            // queda la pantalla congelada en negro sin explicación — se avisa
            // en consola Y en pantalla, y se sigue intentando dibujar.
            console.error('⚠️ Error en el cuadro de animación:', frameErr);
            showGameError(frameErr);
            try { renderer.render(scene, camera); } catch (renderErr) { /* nada más que hacer aquí */ }
        }
    }
    animate();
}

loadProgress();
renderHomeMenu();