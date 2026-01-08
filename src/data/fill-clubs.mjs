import fs from "node:fs";
import { pathToFileURL } from "node:url";

// === instellingen ===
const PLAYERS_JS = "./players.js";
const LINKS_JSON = "./players_url.json";
const OUT_JS = "./players.updated.js";

// === normalizer (lost nbsp + accents + rare tekens op) ===
function key(s) {
    return String(s || "")
        .replace(/\u00A0/g, " ")                    // nbsp -> space
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // accents weg (Aké -> Ake, Jaïro -> Jairo)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")                // alles wat geen letter/cijfer is -> spatie
        .trim()
        .replace(/\s+/g, " ");                      // multiple spaces -> single
}

function toJS(players) {
    return `export const players = ${JSON.stringify(players, null, 2)};\n`;
}

async function main() {
    // 1) laad players.js (ESM export const players = [...])
    const mod = await import(pathToFileURL(process.cwd() + "/" + PLAYERS_JS));
    const players = mod.players;
    if (!Array.isArray(players)) throw new Error("players.js exporteert geen `players` array");

    // 2) laad links JSON
    const links = JSON.parse(fs.readFileSync(LINKS_JSON, "utf8"));

    // 3) bouw map name->img (laatste wint als dubbele naam voorkomt)
    const map = new Map();
    for (const row of links) {
        if (!row?.name || !row?.img) continue;
        map.set(key(row.name), row.img);
    }

    // 4) merge
    let matched = 0;
    const updated = players.map(p => {
        const k = key(p?.name);
        const img = map.get(k);
        if (img) {
            matched++;
            return { ...p, img };
        }
        return p;
    });

    // 5) schrijf output
    fs.writeFileSync(OUT_JS, toJS(updated), "utf8");

    // 6) debug: welke players hebben nog geen match?
    const notMatched = players
        .filter(p => !map.has(key(p?.name)))
        .map(p => p?.name)
        .filter(Boolean);

    console.log(`✅ Matches: ${matched}/${players.length}`);
    console.log(`➡️ Output: ${OUT_JS}`);

    if (notMatched.length) {
        console.log("\n⚠️ Niet gematcht (eerste 30):");
        notMatched.slice(0, 30).forEach(n => console.log(" -", n));
        console.log(`... totaal: ${notMatched.length}`);
    }
}

main().catch(e => {
    console.error("❌", e.message);
    process.exit(1);
});
