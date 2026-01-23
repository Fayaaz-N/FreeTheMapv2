console.log("✅ SCRIPT START");
function pickBestDutchVoice() {
    const voices = speechSynthesis.getVoices() || [];

    // Kandidaten die vaak "beter" klinken (verschilt per OS/browser)
    const preferred = [
        "Microsoft Maarten",
        "Microsoft Xander",
        "Google Nederlands",
        "Google Dutch",
        "nl-NL"
    ];

    // 1) Exacte match op bekende namen
    for (const key of preferred) {
        const v = voices.find(v =>
            (v.name && v.name.toLowerCase().includes(key.toLowerCase())) ||
            (v.lang && v.lang.toLowerCase() === key.toLowerCase())
        );
        if (v) return v;
    }

    // 2) Pak gewoon de eerste NL voice
    return voices.find(v => (v.lang || "").toLowerCase().startsWith("nl")) || null;
}

function speakDutch(text) {
    if (!text || !text.trim()) return;

    speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text.trim());
    u.lang = "nl-NL";

    // Klinkt vaak natuurlijker met iets lagere pitch + iets rustiger tempo
    u.rate = 0.95;
    u.pitch = 0.95;

    const voice = pickBestDutchVoice();
    if (voice) u.voice = voice;

    speechSynthesis.speak(u);
}

// Belangrijk: in sommige browsers laden voices later
speechSynthesis.onvoiceschanged = () => {
    // noop; zorgt dat getVoices() gevuld wordt
};

document.addEventListener("click", (e) => {
    const playBtn = e.target.closest(".tts-btn");
    const stopBtn = e.target.closest(".tts-stop");

    // STOP heeft voorrang
    if (stopBtn) {
        speechSynthesis.cancel();
        return;
    }

    // PLAY
    if (!playBtn) return;

    const panel = document.getElementById("contextPanel");
    const textEl = document.getElementById("contextText");

    speakDutch(textEl?.innerText || panel?.innerText || "");
});


speechSynthesis.getVoices().map(v => ({ name: v.name, lang: v.lang }));

window.addEventListener("error", (e) => console.log("❌ window.error:", e?.message, e));
window.addEventListener("unhandledrejection", (e) => console.log("❌ unhandledrejection:", e?.reason, e));

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { players } from "./src/data/players.js";
import localMap from "./src/data/players_local_map.json" with { type: "json" };
import countryCentroids from "./src/data/players_country_centroids.json" with { type: "json" };

console.log("✅ imports ok:", {
    playersLen: players?.length,
    localMapKeys: Object.keys(localMap || {}).length,
    centroidKeys: Object.keys(countryCentroids || {}).length
});

// ============================================================
// START
// ============================================================
let experienceStarted = false;
let introActive = true;
let introTransition = true;
let introLerp = 0; // 0 → 1

const startPanel = document.getElementById("startPanel");
const btnNext = document.getElementById("btnNext");
const introText = document.querySelector(".centerIntro");

btnNext?.addEventListener("click", async () => {
    if (experienceStarted) return;
    experienceStarted = true;

    introText?.classList.add("explode");
    startPanel?.classList.add("explode");

    await new Promise((r) => setTimeout(r, 900));

    startPanel?.classList.add("hidden");
    showUI();

    introActive = false;
    spawnChaos = false;

    lastUserActivityTs = performance.now();
});



const btnStart = document.getElementById("btnStart");
const startBg = document.getElementById("startBg");

const topTitleEl = document.getElementById("topTitle");
const bottomNavEl = document.getElementById("bottomNav");
const timelineUIEl = document.getElementById("timelineUI");

// Context panel (UI)
const contextPanel = document.getElementById("contextPanel");
const contextTitle = document.getElementById("contextTitle");
const contextText = document.getElementById("contextText");

const GLOBE_START_IMAGE = "/public/team.jpg";

function showUI() {
    topTitleEl?.classList.add("show");
    bottomNavEl?.classList.add("show");
    timelineUIEl?.classList.add("show");

    // panel mag altijd bestaan; story bepaalt tekst/effect
    contextPanel?.classList.add("show");
}
function hideUI() {
    topTitleEl?.classList.remove("show");
    bottomNavEl?.classList.remove("show");
    timelineUIEl?.classList.remove("show");
    contextPanel?.classList.remove("show");
}
hideUI();

// ============================================================
// SETTINGS
// ============================================================
const REQUIRE_DEBUT = true;
const ONLY_WITH_PHOTO = false;

const TIMELINE_START_YEAR = 1905;
const TIMELINE_END_YEAR = 2026;

const CARD_W = 1.5;
const CARD_H = 2.3;

const MIN_CARD_SCALE = 0.52;
const MAX_CARD_SCALE = 0.92;

const HOVER_BOOST = 1.18;

// spacing / globe size
const SPACING_MULT = 1.85;
const MIN_RADIUS = 7.2;
const MAX_RADIUS = 14.0;
const POS_LERP = 0.02;

const ZOOM_MIN = 1;
const ZOOM_MAX = 915;

// clusters: collapsed vs expanded
const CLUSTER_SPREAD_COLLAPSED = 1.45;
const CLUSTER_SPREAD_EXPANDED = 4.8;
const CLUSTER_DEPTH_STEP = 0.085;

// meer ruimte tussen landen (repulsion op bol)
const COUNTRY_MIN_ANGULAR_SEP = 0.72;
const COUNTRY_RELAX_ITERS = 34;

// vlaggen
const FLAG_OFFSET_OUTWARD = 1.05;
const FLAG_SIZE = 1.05;

// autoplay tijd aanpassen
const TL_UNITS_PER_SEC = 17;
const TL_LOOP = false;

const AUTO_ROTATE_IDLE_RESUME_MS = 1800;
let autoRotateUserEnabled = true;
let lastUserActivityTs = performance.now();

function registerUserActivity(reason = "unknown") {
    lastUserActivityTs = performance.now();
}
function shouldAutoRotate(now) {
    if (!autoRotateUserEnabled) return false;
    if (isDragging) return false;
    return now - lastUserActivityTs > AUTO_ROTATE_IDLE_RESUME_MS;
}

const steps = [
    {
        title: "💡 Vrij bewegen",
        text: "Deze kaart is geen vaste wereldkaart. Spelers beginnen in clusters."
    },
    {
        title: "🌍 Van cluster naar wereldbol",
        text: "Spelers beginnen in clusters op basis van hun herkomst. Naarmate je door de tijd beweegt, verspreiden zij zich en vormen samen een wereldbol. Zo wordt zichtbaar hoe Nederland groeit als netwerk, niet als grens."
    },
    {
        title: "🕰 Tijdlijn",
        text: "De tijdlijn laat zien hoe het elftal groeit door de jaren heen."
    },
    {
        title: "👤 Spelers als verhalen",
        text: "Op sommige jaren springt één speler naar voren als highlight."
    },
    {
        title: "🔍 Ontdek zelf",
        text: "Je kunt draaien, zoomen en zelf verbanden ontdekken."
    }
];

let currentStep = 0;

const gtContent = document.getElementById("gtContent");
const gtStep = document.getElementById("gtStep");
const gtNext = document.getElementById("gtNext");

gtNext?.addEventListener("click", () => {
    currentStep++;
    if (currentStep >= steps.length) {
        document.querySelector(".guidedTour")?.style && (document.querySelector(".guidedTour").style.display = "none");
        return;
    }

    const s = steps[currentStep];
    if (gtContent) gtContent.innerHTML = `<h3>${s.title}</h3><p>${s.text}</p>`;
    if (gtStep) gtStep.textContent = `${currentStep + 1} / ${steps.length}`;
});

// ============================================================
// HELPERS
// ============================================================
const cleanKey = (s) =>
    String(s || "")
        .replace(/\u00A0/g, " ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");

function parseDateSafe(s) {
    const d = new Date(s);
    return Number.isFinite(d.getTime()) ? d : null;
}
const yearFromDate = (s) => {
    const d = parseDateSafe(s);
    return d ? d.getFullYear() : null;
};

function getCountryLabel(p) {
    const c = p?.country;
    if (Array.isArray(c)) return c.filter(Boolean).join(" / ") || "–";
    return String(c || "–");
}
function getCountryKey(p) {
    const c = p?.country;
    const first = Array.isArray(c) ? c.find(Boolean) || "" : c || "";
    return cleanKey(first) || "unknown";
}

const centroidNormalized = new Map(Object.entries(countryCentroids || {}).map(([label, obj]) => [cleanKey(label), obj]));

function latLonToVec3(latDeg, lonDeg, radius) {
    const lat = THREE.MathUtils.degToRad(latDeg);
    const lon = THREE.MathUtils.degToRad(lonDeg);
    const x = radius * Math.cos(lat) * Math.sin(lon);
    const y = radius * Math.sin(lat);
    const z = radius * Math.cos(lat) * Math.cos(lon);
    return new THREE.Vector3(x, y, z);
}

function hash01(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 100000) / 100000;
}

function distributeAroundAnchor(anchorVec, count, radius, spread) {
    const pts = [];
    const n = anchorVec.clone().normalize();

    const up = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const t = new THREE.Vector3().crossVectors(up, n).normalize();
    const b = new THREE.Vector3().crossVectors(n, t).normalize();

    const golden = Math.PI * (3 - Math.sqrt(5));
    const minStep = 0.18;

    for (let i = 0; i < count; i++) {
        if (count === 1) {
            pts.push(anchorVec.clone());
            continue;
        }

        const rr = Math.max(minStep * Math.sqrt(i), spread * Math.sqrt((i + 0.5) / count));
        const a = i * golden;

        const offset = t
            .clone()
            .multiplyScalar(Math.cos(a) * rr)
            .add(b.clone().multiplyScalar(Math.sin(a) * rr));

        pts.push(anchorVec.clone().add(offset).normalize().multiplyScalar(radius));
    }
    return pts;
}

function computeRadius(n) {
    const desired = CARD_W * SPACING_MULT;
    const r = desired * Math.sqrt(Math.max(1, n) / (4 * Math.PI));
    return Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, r));
}

function computeCardBaseScale(n) {
    const REF = 140;
    const s = Math.sqrt(REF / Math.max(1, n));
    return Math.max(MIN_CARD_SCALE, Math.min(MAX_CARD_SCALE, s));
}

function relaxCountryAnchors(anchorByKey, keys, fixedKey) {
    if (keys.length < 2) return;

    const clamp = (v) => Math.max(-1, Math.min(1, v));
    const axis = new THREE.Vector3();

    for (let iter = 0; iter < COUNTRY_RELAX_ITERS; iter++) {
        for (let i = 0; i < keys.length; i++) {
            for (let j = i + 1; j < keys.length; j++) {
                const ka = keys[i],
                    kb = keys[j];
                const a = anchorByKey.get(ka);
                const b = anchorByKey.get(kb);
                if (!a || !b) continue;

                const dot = clamp(a.dot(b));
                const ang = Math.acos(dot);
                if (ang >= COUNTRY_MIN_ANGULAR_SEP) continue;

                const push = (COUNTRY_MIN_ANGULAR_SEP - ang) * 0.55;

                axis.crossVectors(a, b);
                const axisLen = axis.length();
                if (axisLen < 1e-6) continue;
                axis.multiplyScalar(1 / axisLen);

                const dirA = new THREE.Vector3().crossVectors(axis, a).normalize();
                const dirB = new THREE.Vector3().crossVectors(axis, b).normalize();

                const aFixed = ka === fixedKey;
                const bFixed = kb === fixedKey;

                if (!aFixed) a.addScaledVector(dirA, -push).normalize();
                if (!bFixed) b.addScaledVector(dirB, +push).normalize();
            }
        }
    }
}

// ============================================================
// MAP IMAGES
// ============================================================
const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/Fayaaz-N/FreeTheMapv2/main/public";

function getImgUrl(p) {
    let src = String(p?.img || "").trim();
    if (!src) return `${GITHUB_RAW_BASE}/img/players/fallback.jpg`;

    src = src.replace(/^\/?public\//, "");
    src = src.replace(/^\/+/, "");

    if (src.startsWith("img/")) return `${GITHUB_RAW_BASE}/${src}`;
    if (src.startsWith("http")) return src;
    return `${GITHUB_RAW_BASE}/${src}`;
}

const localMapNormalized = new Map(Object.entries(localMap || {}).map(([name, url]) => [cleanKey(name), url]));
players.forEach((p) => {
    const hit = localMapNormalized.get(cleanKey(p?.name));
    if (hit) p.img = hit;
});

// ============================================================
// BUILD LIST
// ============================================================
let usedPlayers = [...players];

if (ONLY_WITH_PHOTO) {
    usedPlayers = usedPlayers.filter((p) => String(p?.img || "").trim().length > 0);
}
if (REQUIRE_DEBUT) {
    usedPlayers = usedPlayers.filter((p) => parseDateSafe(p?.debut));
}

usedPlayers = usedPlayers.map((p) => ({ ...p, __debutYear: yearFromDate(p?.debut) }));
usedPlayers.sort((a, b) => {
    const ya = typeof a.__debutYear === "number" ? a.__debutYear : 9999;
    const yb = typeof b.__debutYear === "number" ? b.__debutYear : 9999;
    return ya - yb;
});

// ============================================================
// AURA
// ============================================================
const state = { x: innerWidth * 0.5, y: innerHeight * 0.5, tx: innerWidth * 0.5, ty: innerHeight * 0.5 };
const bRed = document.getElementById("bRed");
const bWhite = document.getElementById("bWhite");
const bBlue = document.getElementById("bBlue");
const bNeutral = document.getElementById("bNeutral");

window.addEventListener("pointermove", (e) => {
    state.tx = e.clientX;
    state.ty = e.clientY;
    registerUserActivity("pointermove");
});

function place(el, x, y, s = 1) {
    if (el) el.style.transform = `translate3d(${x}px, ${y}px,0) scale(${s})`;
}
(function auraLoop() {
    state.x += (state.tx - state.x) * 0.08;
    state.y += (state.ty - state.y) * 0.08;
    place(bRed, state.x - 560 * 0.42, state.y - 560 * 0.62, 1.05);
    place(bWhite, state.x - 560 * 0.12, state.y - 560 * 0.25, 0.95);
    place(bBlue, state.x - 560 * 0.62, state.y - 560 * 0.08, 1.10);
    place(bNeutral, state.x - 760 * 0.45, state.y - 760 * 0.40, 1.0);
    requestAnimationFrame(auraLoop);
})();

// ============================================================
// THREE
// ============================================================
const app = document.getElementById("app");
const tip = document.getElementById("tip");

const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 900);
camera.position.set(0, 0, 22);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
app?.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 1.1));
const dir = new THREE.DirectionalLight(0xffffff, 0.35);
dir.position.set(10, 12, 14);
scene.add(dir);

// controls
let targetRotX = 0,
    targetRotY = 0;
let rotX = 0,
    rotY = 0;
let zoom = 22;

let isDragging = false;
let lastX = 0,
    lastY = 0;

renderer.domElement.addEventListener("pointerdown", (e) => {
    if (!experienceStarted) return;
    registerUserActivity("pointerdown");
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    renderer.domElement.setPointerCapture(e.pointerId);
});

renderer.domElement.addEventListener("pointermove", (e) => {
    if (!experienceStarted) return;
    registerUserActivity("drag-move");
    if (!isDragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    targetRotY += dx * 0.005;
    targetRotX += dy * 0.005;
    targetRotX = Math.max(-1.2, Math.min(1.2, targetRotX));
});

renderer.domElement.addEventListener("pointerup", () => {
    if (!experienceStarted) return;
    registerUserActivity("pointerup");
    isDragging = false;
});

window.addEventListener(
    "wheel",
    (e) => {
        if (!experienceStarted) return;
        registerUserActivity("wheel");
        const delta = Math.sign(e.deltaY);
        zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom + delta * 1.1));
    },
    { passive: true }
);

// ============================================================
// CARDS
// ============================================================
const group = new THREE.Group();
scene.add(group);

THREE.Cache.enabled = true;
const texLoader = new THREE.TextureLoader();
texLoader.setCrossOrigin("anonymous");

const geo = new THREE.PlaneGeometry(CARD_W, CARD_H);

function addFrame(mesh) {
    const frameGeo = new THREE.PlaneGeometry(CARD_W + 0.07, CARD_H + 0.07);
    const frameMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(0, 0, -0.03);
    frame.renderOrder = 0;
    mesh.renderOrder = 1;
    mesh.add(frame);
}

const cards = [];
let spawnChaos = true;

for (let i = 0; i < usedPlayers.length; i++) {
    const p = usedPlayers[i];

    const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: true,
        alphaTest: 0.06
    });

    texLoader.load(
        getImgUrl(p),
        (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            mat.map = tex;
            mat.needsUpdate = true;
        },
        undefined,
        () => {
            mat.color.setHex(0xededed);
            mat.needsUpdate = true;
        }
    );

    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData = p;
    mesh.userData.__countryKey = getCountryKey(p);
    mesh.userData.__idx = i; // ✅ nodig voor story center/zoom

    mesh.visible = false;
    mesh.userData.__baseScale = 1;
    mesh.scale.setScalar(1);

    mesh.position.set((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40);

    addFrame(mesh);
    group.add(mesh);
    cards.push(mesh);
}

// ============================================================
// STORY SYSTEM (fixed timing + correct zoom/aim + play behavior)
// ============================================================

const meshByName = new Map();
for (const m of cards) {
    const name = (m.userData?.name || "").trim();
    if (name) meshByName.set(name, m);
}

/* =======================================================================
   VERHALEN + SPELERS (plak dit in je script.js)
   - Zet dit blok 1x in je file (bijv. onder je helpers / cleanKey)
   - Daarna roep je updateStoryForYear(chosenYear) aan in je timeline input.
   ======================================================================= */

// Mini helper (jij hebt cleanKey al)
const nameKey = (s) => cleanKey(String(s || ""));

// 1) Stories (alle verhalen + spelers + bronnen)
const stories = new Map([
    [1905, {
        year: 1905,
        title: "1905 — Het begin van het Nederlands elftal",
        text: `In 1905 speelt Nederland zijn eerste officiële interland tegen België. Het elftal bestaat uit amateurspelers uit Nederlandse steden, voor wie voetbal geen beroep is maar een bijzaak naast werk of studie.

Binnen deze eerste selectie bevinden zich Eddy de Neve en Dolph Kessler, beiden geboren in Nederlands-Indië. Door hun juridische status kunnen zij voor Oranje uitkomen.

Hun deelname laat zien dat het Nederlands elftal vanaf het begin verbonden is met het koloniale rijk, al blijft die verbinding nog beperkt.`,
        players: [
            "Eddy de Neve",
            "Dolph Kessler"
        ],
        sources: [
            "https://nl.wikipedia.org/wiki/Eddy_de_Neve",
            "https://nl.wikipedia.org/wiki/Dolph_Kessler",
            "https://en.wikipedia.org/wiki/Netherlands_national_football_team",
            "https://www.rsssf.org/tablesn/ned-intres.html"
        ]
    }],

    [1912, {
        year: 1912,
        title: "1912 — Nationale selectie buiten het rijk",
        text: `In 1912 maakt Joop Boutmy zijn debuut voor het Nederlands elftal. Hij is geboren in Penang, het huidige Maleisië, een gebied buiten Nederland en het koloniale rijk.

Zijn debuut laat zien dat nationale vertegenwoordiging niet alleen werd bepaald door geboorteplaats. Afkomst, opvoeding en toegang tot Nederlandse clubs waren doorslaggevend.

Oranje blijkt al vroeg verbonden met een wereld buiten de eigen grenzen.`,
        players: [
            "Joop Boutmy"
        ],
        sources: [
            "https://en.wikipedia.org/wiki/Joop_Boutmy"
        ]
    }],

    [1954, {
        year: 1954,
        title: "1954 — Van amateur naar prof",
        text: `Tot 1954 is voetbal in Nederland een amateursport. Spelers komen vooral in beeld via clubs en sociale netwerken, die sterk samenhangen met status en achtergrond.

Met de invoering van betaald voetbal verandert dit. Clubs worden professioneler en spelers kunnen zich volledig richten op voetbal.

De weg naar Oranje wordt daarmee opener en meer gebaseerd op talent.`,
        players: [],
        sources: [
            "https://nl.wikipedia.org/wiki/Betaald_voetbal_in_Nederland"
        ]
    }],

    [1960, {
        year: 1960,
        title: "1960 — Het debuut van Humphrey Mijnals",
        text: `Op 3 april 1960 debuteert Humphrey Mijnals voor het Nederlands elftal. Hij is geboren in Suriname, dat op dat moment deel uitmaakt van het Koninkrijk der Nederlanden.

Met zijn debuut wordt voor het eerst een speler met Surinaamse achtergrond zichtbaar onderdeel van Oranje.

Diversiteit blijft nog uitzonderlijk, maar een verandering is ingezet.`,
        players: [
            "Humphrey Mijnals"
        ],
        sources: [
            "https://nl.wikipedia.org/wiki/Humphrey_Mijnals"
        ]
    }],

    [1975, {
        year: 1975,
        title: "1975 — Onafhankelijkheid van Suriname",
        text: `In 1975 wordt Suriname onafhankelijk van Nederland. In deze periode verhuizen veel Surinaamse families naar Nederland.

Hun kinderen groeien op in Nederlandse steden en vinden hun weg naar het voetbal. Hierdoor ontstaat een bredere basis van talent voor Oranje.

De invloed van Suriname wordt structureel en generatiegebonden.`,
        players: [],
        sources: [
            "https://nl.wikipedia.org/wiki/Onafhankelijkheid_van_Suriname"
        ]
    }],

    [1988, {
        year: 1988,
        title: "1988 — Succes maakt verandering zichtbaar",
        text: `In 1988 wint Nederland het Europees kampioenschap. Het elftal bestaat uit spelers met verschillende achtergronden die samen succesvol zijn.

De overwinning zorgt ervoor dat deze verandering breed wordt geaccepteerd. Oranje wordt nationaal omarmd als “onze jongens van Oranje”.

Samenwerking en succes komen centraal te staan.`,
        players: [
            "Ruud Gullit"
        ],
        sources: [
            "https://nl.wikipedia.org/wiki/Europees_kampioenschap_voetbal_1988"
        ]
    }],

    [2010, {
        year: 2010,
        title: "2010 — Oranje verbindt",
        text: `In 2010 laat het Nederlands elftal zien hoe breed de herkomst van internationals is geworden. Spelers hebben wortels in onder meer Suriname, Indonesië en Noord-Afrika.

Met het bereiken van de WK-finale wordt duidelijk dat succes voortkomt uit samenwerking.

Verschillende achtergronden vormen samen één team.`,
        players: [
            "Nigel de Jong"
        ],
        sources: [
            "https://www.onsoranje.nl/teams/185184/uitslagen/wedstrijd/16478",
            "https://nl.wikipedia.org/wiki/Khalid_Boulahrouz"
        ]
    }],

    [2025, {
        year: 2025,
        title: "2025 — Oranje zonder grenzen",
        text: `In het heden is het Nederlands elftal sterk veranderd. Veel spelers die debuteren voor Oranje hebben ook banden met andere landen.

Dit contrasteert met 1905, toen het elftal vooral bestond uit spelers uit Nederland of het koloniale rijk.

Oranje is uitgegroeid tot een netwerk van internationale verbindingen.`,
        players: [],
        sources: []
    }]
]);


// 2) OPTIONAL: als jij per se “1958” als trigger wil (ipv 1960), doe dit 1x:
// if (!stories.has(1958) && stories.has(1960)) {
//     stories.set(1958, { ...stories.get(1960), year: 1958, title: "1958 — (moment) Humphrey Mijnals (route naar debuut)" });
// }

// 3) Speler-lookup: map name -> mesh (na cards build)
const meshByKey = new Map();
for (const m of cards) {
    const n = m.userData?.name;
    if (n) meshByKey.set(nameKey(n), m);
}

// Fuzzy finder (pakt ook kleine verschillen in naam)
function findPlayerMesh(name) {
    const wanted = nameKey(name);
    if (!wanted) return null;

    if (meshByKey.has(wanted)) return meshByKey.get(wanted);

    for (const [k, mesh] of meshByKey.entries()) {
        if (k.includes(wanted) || wanted.includes(k)) return mesh;
    }

    const parts = wanted.split(" ").filter(Boolean);
    if (parts.length) {
        let best = null, bestScore = 0;
        for (const [k, mesh] of meshByKey.entries()) {
            let score = 0;
            for (const p of parts) if (k.includes(p)) score++;
            if (score > bestScore) { bestScore = score; best = mesh; }
        }
        if (bestScore >= 2 || (bestScore === 1 && parts.length === 1)) return best;
    }

    return null;
}

// 4) Story-state
let storyActive = false;
let storyTargets = [];
let storyOldZoom = null;
let storyOldRotX = null;
let storyOldRotY = null;
let storySuppressYear = null;
let storyOldAutoRotateEnabled = null;

// Instellingen voor highlight
const STORY_FADE_OTHER = 0.08;
const STORY_FADE_LERP = 0.12;
const STORY_HIGHLIGHT_SCALE = 1.35;

function setMeshOpacity(mesh, opacity) {
    const mat = mesh?.material;
    if (!mat) return;
    mat.transparent = true;
    mat.opacity = opacity;
    mat.needsUpdate = true;
}

function aimCameraAtPoint(point) {
    if (!point) return;
    const p = point.clone();
    const len = p.length() || 1;
    const n = p.clone().multiplyScalar(1 / len);

    targetRotY = Math.atan2(n.x, n.z);
    targetRotX = Math.asin(n.y);
    targetRotX = Math.max(-1.2, Math.min(1.2, targetRotX));
}

// Context panel refs (moet je HTML ids hebben)
// const contextPanel = document.getElementById("contextPanel");
// const contextTitle = document.getElementById("contextTitle");
// const contextText  = document.getElementById("contextText");

function showContextPanel(story){
    if (contextPanel) {
        contextPanel.style.display = "block";
        // reset hide state als ie net aan het sluiten was
        contextPanel.classList.remove("isHiding");
        // force reflow zodat animation altijd triggert
        void contextPanel.offsetWidth;
        contextPanel.classList.add("show");
    }
    if (contextTitle) contextTitle.textContent = String(story.title ?? story.year ?? "");
    if (contextText)  contextText.textContent  = String(story.text ?? "");
}


function hideContextPanel(){
    if (!contextPanel) return;

    contextPanel.classList.remove("show");
    contextPanel.classList.add("isHiding");

    // na animatie pas echt verbergen
    window.setTimeout(() => {
        contextPanel.classList.remove("isHiding");
        contextPanel.style.display = "none";
    }, 240);
}


function enterStory(story) {
    if (!story) return;

    storyActive = true;
    setFlagsVisible(false);


    // Pauze autoplay
    if (timelineIsPlaying) pauseTimeline();

    // Stop idle rotate tijdens story
    storyOldAutoRotateEnabled = autoRotateUserEnabled;
    autoRotateUserEnabled = false;

    // Save cam
    storyOldZoom = zoom;
    storyOldRotX = targetRotX;
    storyOldRotY = targetRotY;

    // Panel
    showContextPanel(story);

    // Targets
    const names = Array.isArray(story.players) ? story.players : [];
    storyTargets = names.map(findPlayerMesh).filter(Boolean);

    // Als geen targets (speler niet in dataset): alleen tekst tonen
    if (!storyTargets.length) return;

    // Dim iedereen behalve targets + scale targets
    for (let i = 0; i < activeCount; i++) {
        const m = cards[i];
        const isTarget = storyTargets.includes(m);
        setMeshOpacity(m, isTarget ? 1 : STORY_FADE_OTHER);
        if (isTarget) {
            const base = m.userData?.__baseScale || 1;
            m.scale.setScalar(base * STORY_HIGHLIGHT_SCALE);
        }
    }

    // Zoom safe (niet te ver)
    zoom = Math.max(18, Math.min(ZOOM_MAX, targetRadius + 12));

    // Center targets (op huidige positie / targetCollapsed)
    const center = new THREE.Vector3();
    let count = 0;

    for (const m of storyTargets) {
        // best effort: probeer layout-punt als aanwezig
        const idx = m.userData?.__idx;
        const pos = (typeof idx === "number" && targetCollapsed?.[idx]) ? targetCollapsed[idx] : m.position;
        center.add(pos);
        count++;
    }

    if (count > 0) {
        center.multiplyScalar(1 / count);
        aimCameraAtPoint(center);
    }
}

function exitStory({ suppressYear = null } = {}) {
    if (!storyActive) return;

    storyActive = false;
    setFlagsVisible(true);

    storySuppressYear = suppressYear;

    // Restore idle rotate
    if (storyOldAutoRotateEnabled !== null) {
        autoRotateUserEnabled = storyOldAutoRotateEnabled;
        storyOldAutoRotateEnabled = null;
    }

    // Restore cam
    if (typeof storyOldZoom === "number") zoom = storyOldZoom;
    if (typeof storyOldRotX === "number") targetRotX = storyOldRotX;
    if (typeof storyOldRotY === "number") targetRotY = storyOldRotY;

    // Restore cards
    for (let i = 0; i < activeCount; i++) {
        const m = cards[i];
        m.visible = true;
        const base = m.userData?.__baseScale || 1;
        m.scale.setScalar(base);
        setMeshOpacity(m, 1);
    }

    storyTargets = [];
    hideContextPanel();
}

function updateStoryForYear(year) {
    // Als je weg beweegt van suppressed jaar, reset suppress
    if (storySuppressYear !== null && year !== storySuppressYear) {
        storySuppressYear = null;
    }

    // Als suppressed jaar nog actief: niet retriggeren
    if (storySuppressYear !== null && year === storySuppressYear) return;

    const story = stories.get(year);

    if (story) {
        if (!storyActive) enterStory(story);
        return;
    }

    if (storyActive) exitStory();
}

// Smooth fade loop (call in tick)
function storyFadeLoop() {
    if (!storyActive || !storyTargets.length) return;

    for (let i = 0; i < activeCount; i++) {
        const m = cards[i];
        if (!m.visible) continue;

        const isTarget = storyTargets.includes(m);
        const mat = m.material;
        if (!mat) continue;

        const want = isTarget ? 1 : STORY_FADE_OTHER;
        const cur = typeof mat.opacity === "number" ? mat.opacity : 1;
        const next = cur + (want - cur) * STORY_FADE_LERP;

        setMeshOpacity(m, next);

        if (isTarget) {
            const base = m.userData?.__baseScale || 1;
            m.scale.setScalar(base * STORY_HIGHLIGHT_SCALE);
        }
    }
}


// ============================================================
// FLAGS (Sprite)
// ============================================================
const flagSprites = new Map();
function setFlagsVisible(visible) {
    for (const spr of flagSprites.values()) {
        spr.visible = visible;
    }
}

function ensureFlagSprite(countryKey, iso2) {
    if (flagSprites.has(countryKey)) return flagSprites.get(countryKey);
    if (!iso2 || typeof iso2 !== "string") return null;

    const url = `https://flagcdn.com/w80/${iso2.toLowerCase()}.png`;
    const mat = new THREE.SpriteMaterial({
        transparent: true,
        depthTest: true,
        depthWrite: false
    });

    const spr = new THREE.Sprite(mat);
    spr.userData.__countryKey = countryKey;
    spr.renderOrder = 2;

    texLoader.load(
        url,
        (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            mat.map = tex;
            mat.needsUpdate = true;
        },
        undefined,
        () => {
            spr.visible = false;
        }
    );

    scene.add(spr);
    flagSprites.set(countryKey, spr);
    return spr;
}

// ============================================================
// TOOLTIP + HOVER
// ============================================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hovered = null;
let hoveredCountryKey = null;

function setTip(show, x = 0, y = 0, html = "") {
    if (!tip) return;
    tip.style.opacity = show ? 1 : 0;
    if (show) {
        tip.style.left = x + 14 + "px";
        tip.style.top = y + 14 + "px";
        tip.innerHTML = html;
    }
}

function setMouseFromEvent(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    mouse.x = x * 2 - 1;
    mouse.y = -(y * 2 - 1);
}

renderer.domElement.addEventListener("pointermove", (e) => {
    if (!experienceStarted) {
        if (hovered) hovered.scale.setScalar(hovered.userData.__baseScale || 1);
        hovered = null;
        hoveredCountryKey = null;
        setTip(false);
        return;
    }

    setMouseFromEvent(e);
    raycaster.setFromCamera(mouse, camera);

    const visibleCards = cards.slice(0, activeCount);
    const hits = raycaster.intersectObjects(visibleCards, true);
    const hit = hits.length ? hits[0].object : null;

    if (hit && hit.userData?.name) {
        if (hovered !== hit) {
            if (hovered) hovered.scale.setScalar(hovered.userData.__baseScale || 1);
            hovered = hit;

            const base = hovered.userData.__baseScale || 1;
            hovered.scale.setScalar(base * HOVER_BOOST);
        }

        const p = hit.userData;
        hoveredCountryKey = p.__countryKey || getCountryKey(p);

        const dy = yearFromDate(p.debut);
        setTip(
            true,
            e.clientX,
            e.clientY,
            `<b>${p.name}</b>
       <div style="font-size:11px;color:#555;margin-top:4px">
         ${getCountryLabel(p)} • ${p.club || "–"}<br>
         Debuut: <b>${dy ?? "–"}</b>
       </div>`
        );
    } else {
        if (hovered) hovered.scale.setScalar(hovered.userData.__baseScale || 1);
        hovered = null;
        hoveredCountryKey = null;
        setTip(false);
    }
});

renderer.domElement.addEventListener("pointerleave", () => {
    if (hovered) hovered.scale.setScalar(hovered.userData.__baseScale || 1);
    hovered = null;
    hoveredCountryKey = null;
    setTip(false);
});

// ============================================================
// TIMELINE + PLAY/PAUSE
// ============================================================
const tlRange = document.getElementById("tlRange");
const tlLabel = document.getElementById("tlLabel");
const tlDot = document.getElementById("tlDot");
const tlMinEl = document.getElementById("tlMin");
const tlMidEl = document.getElementById("tlMid");
const tlMaxEl = document.getElementById("tlMax");

const tlPlayBtn = document.getElementById("tlPlayBtn");
let timelineIsPlaying = false;
let lastAutoTs = performance.now();
let autoCarry = 0;

function setPlayBtnUI() {
    if (!tlPlayBtn) return;
    tlPlayBtn.classList.toggle("isPlaying", timelineIsPlaying);
    tlPlayBtn.textContent = timelineIsPlaying ? "❚❚" : "▶";
    tlPlayBtn.setAttribute("aria-pressed", timelineIsPlaying ? "true" : "false");
}

function applyTimelineValue(v) {
    tlRange.value = String(v);
    tlRange.dispatchEvent(new Event("input", { bubbles: true }));
}

function playTimeline() {
    const max = Number(tlRange.max);
    let v = Number(tlRange.value);

    if (!TL_LOOP && v >= max - 0.001) {
        v = 0;
        applyTimelineValue(v);
    }

    timelineIsPlaying = true;
    lastAutoTs = performance.now();
    autoCarry = 0;
    setPlayBtnUI();
}

function pauseTimeline() {
    timelineIsPlaying = false;
    setPlayBtnUI();
}

tlPlayBtn?.addEventListener("click", () => {
    if (!experienceStarted) return;
    registerUserActivity("timeline-playbtn");

    // ✅ als story actief is: exit story + suppress huidig jaar + meteen play
    if (storyActive) {
        exitStory({ suppressYear: chosenYear }); // <- KEY FIX
        playTimeline();
        return;
    }

    timelineIsPlaying ? pauseTimeline() : playTimeline();
});


["pointerdown", "mousedown", "touchstart"].forEach((evt) => {
    tlRange?.addEventListener(
        evt,
        () => {
            if (!experienceStarted) return;
            pauseTimeline();
        },
        evt === "touchstart" ? { passive: true } : undefined
    );
});

tlMinEl.textContent = TIMELINE_START_YEAR;
tlMidEl.textContent = Math.round((TIMELINE_START_YEAR + TIMELINE_END_YEAR) * 0.5);
tlMaxEl.textContent = TIMELINE_END_YEAR;

tlRange.min = 0;
tlRange.max = 2000;
tlRange.value = 0;

let chosenYear = TIMELINE_START_YEAR;

let activeCount = 0;
let targetRadius = MIN_RADIUS;

function setDotFromRange() {
    const v = Number(tlRange.value);
    const f = v / Number(tlRange.max);
    const x = f * tlRange.clientWidth;
    tlDot.style.left = `${x}px`;
}

// ✅ let op: hier GEEN story trigger meer
function setYearFromSlider() {
    const v = Number(tlRange.value);
    const f = v / Number(tlRange.max);
    const y = TIMELINE_START_YEAR + (TIMELINE_END_YEAR - TIMELINE_START_YEAR) * f;

    chosenYear = Math.round(y);
    tlLabel.textContent = `Gekozen jaar: ${chosenYear}`;
    setDotFromRange();
}

function computeActiveCountByYear(y) {
    let lo = 0;
    let hi = usedPlayers.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        const dY = typeof usedPlayers[mid].__debutYear === "number" ? usedPlayers[mid].__debutYear : 9999;
        if (dY <= y) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

// ✅ FIX: story pas NA rebuild triggeren
tlRange.addEventListener("input", ()=>{
    if (!experienceStarted) return;
    registerUserActivity("timeline");
    setYearFromSlider();
    rebuildLayoutIfNeeded();
    updateStoryForYear(chosenYear);
});


// ============================================================
// CLUSTERS + FLAGS
// ============================================================
const countryClusters = new Map();
let targetCollapsed = [];
let targetExpanded = [];

function rebuildCountryLayoutPoints() {
    targetCollapsed = new Array(activeCount);
    targetExpanded = new Array(activeCount);
    countryClusters.clear();

    const buckets = new Map();
    for (let i = 0; i < activeCount; i++) {
        const p = usedPlayers[i];
        const k = getCountryKey(p);
        if (!buckets.has(k)) buckets.set(k, []);
        buckets.get(k).push(i);
    }

    const anchorByKey = new Map();
    const keys = [];
    const unknownIdxs = [];

    for (const [countryKey, idxs] of buckets.entries()) {
        const centroid = centroidNormalized.get(countryKey);
        if (!centroid || typeof centroid.lat !== "number" || typeof centroid.lon !== "number") {
            unknownIdxs.push(...idxs);
            continue;
        }

        let anchorN = latLonToVec3(centroid.lat, centroid.lon, 1).normalize();

        const j = 0.3;
        const up = Math.abs(anchorN.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
        const t = new THREE.Vector3().crossVectors(up, anchorN).normalize();
        const b = new THREE.Vector3().crossVectors(anchorN, t).normalize();

        const r1 = (hash01(countryKey + "_a") * 2 - 1) * j;
        const r2 = (hash01(countryKey + "_b") * 2 - 1) * j;

        anchorN = anchorN
            .clone()
            .add(t.clone().multiplyScalar(r1))
            .add(b.clone().multiplyScalar(r2))
            .normalize();

        anchorByKey.set(countryKey, anchorN);
        keys.push(countryKey);
    }

    const fixedKey = keys.includes("nederland") ? "nederland" : keys[0] || null;
    if (fixedKey) relaxCountryAnchors(anchorByKey, keys, fixedKey);

    for (const [countryKey, idxs] of buckets.entries()) {
        const centroid = centroidNormalized.get(countryKey);
        if (!centroid || typeof centroid.lat !== "number" || typeof centroid.lon !== "number") continue;

        const anchorN = anchorByKey.get(countryKey);
        if (!anchorN) {
            unknownIdxs.push(...idxs);
            continue;
        }

        const anchorVec = anchorN.clone().multiplyScalar(targetRadius);

        countryClusters.set(countryKey, {
            idxs,
            anchorN,
            t: 0,
            tWanted: 0,
            iso2: centroid.iso || centroid.ISO || centroid.iso2 || centroid.alpha2 || null
        });

        const ptsC = distributeAroundAnchor(anchorVec, idxs.length, targetRadius, CLUSTER_SPREAD_COLLAPSED);
        const ptsE = distributeAroundAnchor(anchorVec, idxs.length, targetRadius, CLUSTER_SPREAD_EXPANDED);

        for (let jj = 0; jj < idxs.length; jj++) {
            const depth = (jj % 9) * CLUSTER_DEPTH_STEP;

            const nC = ptsC[jj].clone().normalize();
            const nE = ptsE[jj].clone().normalize();

            targetCollapsed[idxs[jj]] = ptsC[jj].clone().addScaledVector(nC, depth);
            targetExpanded[idxs[jj]] = ptsE[jj].clone().addScaledVector(nE, depth);
        }

        const iso2 = centroid.iso || centroid.ISO || centroid.iso2 || centroid.alpha2 || null;
        const spr = ensureFlagSprite(countryKey, iso2);
        if (spr) {
            spr.visible = true;
            spr.position.copy(anchorN.clone().multiplyScalar(targetRadius + FLAG_OFFSET_OUTWARD));
            spr.scale.set(FLAG_SIZE, FLAG_SIZE * 0.66, 1);
        }
    }

    for (const [k, spr] of flagSprites.entries()) {
        if (!countryClusters.has(k)) spr.visible = false;
    }

    if (unknownIdxs.length) {
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));
        for (let i = 0; i < unknownIdxs.length; i++) {
            const tt = unknownIdxs.length === 1 ? 0 : i / (unknownIdxs.length - 1);
            const yy = 1 - 2 * tt;
            const rad = Math.sqrt(1 - yy * yy);
            const theta = goldenAngle * i;
            const xx = Math.cos(theta) * rad;
            const zz = Math.sin(theta) * rad;
            const v = new THREE.Vector3(xx, yy, zz).multiplyScalar(targetRadius);
            targetCollapsed[unknownIdxs[i]] = v;
            targetExpanded[unknownIdxs[i]] = v;
        }
    }
}

function rebuildLayoutIfNeeded() {
    const nextCount = computeActiveCountByYear(chosenYear);

    if (nextCount !== activeCount) {
        activeCount = nextCount;

        targetRadius = computeRadius(activeCount);
        rebuildCountryLayoutPoints();

        const baseS = computeCardBaseScale(activeCount);
        for (let i = 0; i < cards.length; i++) {
            const m = cards[i];
            const on = i < activeCount;

            m.visible = on;
            if (on) {
                m.userData.__baseScale = baseS;
                m.scale.setScalar(baseS);
                setMeshOpacity(m, 1);
            }
        }

        if (hovered) hovered = null;
        hoveredCountryKey = null;
        setTip(false);

        zoom = Math.max(zoom, targetRadius + 8);
    }
}

function updateClusterExpandState() {
    for (const [k, c] of countryClusters.entries()) {
        c.tWanted = hoveredCountryKey && hoveredCountryKey === k ? 1 : 0;
    }
    for (const c of countryClusters.values()) {
        c.t += (c.tWanted - c.t) * 0.12;
    }
}

function updateLayoutPositions() {
    for (let i = 0; i < activeCount; i++) {
        const m = cards[i];
        const k = m.userData?.__countryKey || getCountryKey(m.userData);
        const c = countryClusters.get(k);
        const t = c ? c.t : 0;

        const a = targetCollapsed[i];
        const b = targetExpanded[i];
        if (!a || !b) continue;

        let target;
        if (spawnChaos) {
            target = new THREE.Vector3((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40);
        } else {
            target = a.clone().lerp(b, t);
        }

        const lerpSpeed = introTransition ? 0.02 : POS_LERP;
        m.position.lerp(target, lerpSpeed);

        m.lookAt(0, 0, 0);
    }

    for (const spr of flagSprites.values()) {
        if (spr.visible) spr.quaternion.copy(camera.quaternion);
    }
}

// init
setYearFromSlider();
activeCount = 0;
setPlayBtnUI();
rebuildLayoutIfNeeded();

// ============================================================
// MAIN LOOP
// ============================================================
function tick() {
    const now = performance.now();

    if (experienceStarted && timelineIsPlaying) {
        let dt = (now - lastAutoTs) / 1000;
        lastAutoTs = now;

        dt = Math.max(0, Math.min(dt, 0.05));

        const max = Number(tlRange.max);
        let v = Number(tlRange.value);

        autoCarry += TL_UNITS_PER_SEC * dt;

        const step = Math.floor(autoCarry);
        if (step > 0) {
            autoCarry -= step;
            v += step;

            if (v >= max) {
                if (TL_LOOP) {
                    v = 0;
                } else {
                    v = max;
                    pauseTimeline();
                }
            }
            applyTimelineValue(v);
        }
    }

    rotX += (targetRotX - rotX) * 0.08;
    rotY += (targetRotY - rotY) * 0.08;

// ✅ extra globe spin bij jaar 2025
    if (experienceStarted) {
        if (chosenYear === 2025) {
            group.rotation.y += 0.0025;   // globe draait zelf
        } else if (shouldAutoRotate(now)) {
            targetRotY += 0.0035;        // normale idle rotate
        }
    }

    const r = zoom;
    const x = r * Math.sin(rotY) * Math.cos(rotX);
    const y = r * Math.sin(rotX);
    const z = r * Math.cos(rotY) * Math.cos(rotX);

    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);

    if (!introActive) {
        updateClusterExpandState();
        updateLayoutPositions();

        // ✅ story fade frame-by-frame
        storyFadeLoop();
    }

    if (introTransition) {
        introLerp += 0.01;
        if (introLerp >= 1) introTransition = false;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
   const openColofon = document.getElementById("openColofon");
const closeColofon = document.getElementById("closeColofon");
const colofonOverlay = document.getElementById("colofonOverlay");

openColofon.addEventListener("click", () => {
  colofonOverlay.classList.add("show");
});

closeColofon.addEventListener("click", () => {
  colofonOverlay.classList.remove("show");
});

/* ESC sluiten */
window.addEventListener("keydown", (e) => {
  if(e.key === "Escape"){
    colofonOverlay.classList.remove("show");
  }
});

window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});

console.log("✅ INIT DONE");


