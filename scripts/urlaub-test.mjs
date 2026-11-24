// W14 (24.11.2026): Urlaub im Kalender der Gesamtansicht über die Fahrlehrer-ID statt über den Namen.
// Anlass: Wer seinen Profilnamen änderte, konnte Urlaub unter fremdem Namen eintragen (Kalender glich über den Namen ab).
// Geprüft wird _fsLoadAggData mit einer Attrappe (kein Netz, erfundene Namen „Muster“):
//   U1 Urlaub mit ID blockiert genau diesen Fahrlehrer – auch wenn ein anderer gleich heißt
//   U2 Urlaub ohne ID (andere Person) blockiert niemanden
//   U3 alte Datenbank ohne Spalte: Abgleich wie bisher über den Namen
//   U4 Liste zeigt den aktuellen Profilnamen, ohne ID den eingetragenen Namen mit „ohne Kalender“
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/urlaub-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const server = createServer(async (req, res) => {
  try {
    const pfad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" });
    res.end(await readFile(join(ROOT, pfad === "/" ? "index.html" : pfad)));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let fehlerZahl = 0, okZahl = 0;
async function pruefe(id, text, fn) {
  let r; try { r = await fn(); } catch (e) { r = ["Ausnahme: " + String(e.message || e).split("\n")[0]]; }
  if (!r || !r.length) { okZahl++; console.log(`ok  ${id} ${text}`); } else { fehlerZahl++; console.log(`FEHLER  ${id} ${text}: ${[].concat(r).join(" · ")}`); }
}

const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, timezoneId: "Europe/Berlin", locale: "de-DE" });
const page = await ctx.newPage();
const jsFehler = [];
page.on("pageerror", (e) => jsFehler.push(e.message));
page.on("dialog", (d) => d.dismiss().catch(() => {}));
await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 });
await page.waitForTimeout(600);

// Attrappe: liefert je Tabelle die Zeilen aus window.__T (Filter werden nicht ausgewertet, die Testdaten sind passend)
await page.evaluate(() => {
  for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
  const user = { id: "u-buero", email: "buero@example.org" };
  window.__T = {};
  const baue = (tab) => {
    const st = { einzeln: false };
    const q = new Proxy(function () {}, {
      get: (_t, k) => {
        if (k === "then") return (ok, nein) => Promise.resolve(st.einzeln ? { data: (window.__T[tab] || [])[0] || null, error: null } : { data: (window.__T[tab] || []).slice(), error: null }).then(ok, nein);
        if (k === "single" || k === "maybeSingle") return () => { st.einzeln = true; return q; };
        return () => q;
      },
      apply: () => q,
    });
    return q;
  };
  const supa = { from: baue, rpc: async () => ({ data: null, error: null }), auth: { getSession: async () => ({ data: { session: { user, access_token: "x" } }, error: null }), getUser: async () => ({ data: { user }, error: null }),
    signOut: async () => ({ error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    functions: { invoke: async () => ({ data: {}, error: null }) }, channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel: () => {} };
  window.getSupa = () => supa;
  // Gerätespeicher gehört diesem Konto (wie nach einer echten Anmeldung), sonst startet die App zum Schutz neu
  try { localStorage.clear(); localStorage.setItem(OWNER_KEY, user.id); } catch (e) {}
  _dbEigentuemer = user.id; ensureDB();
  _authUser = user;
  _authProfile = { id: "u-buero", rolle: "buero", fahrschule_id: "fs-muster", name: "Büro Muster" };
});
const heute = await page.evaluate(() => todayISO());
const LEHRER = [{ id: "fl-anna", name: "Anna Muster", rolle: "fahrlehrer", fahrschule_id: "fs-muster", aktiv: true },
  // Ben hat seinen Profilnamen auf „Anna Muster“ geändert (der Fall aus dem Auftrag)
  { id: "fl-ben", name: "Anna Muster", rolle: "fahrlehrer", fahrschule_id: "fs-muster", aktiv: true },
  { id: "fl-cem", name: "Cem Muster", rolle: "fahrlehrer", fahrschule_id: "fs-muster", aktiv: true }];
const lade = (urlaub) => page.evaluate(async ({ L, U }) => {
  window.__T = { fahrschulen: [{ id: "fs-muster", name: "Fahrschule Muster" }], profiles: L, fahrschule_urlaub: U };
  const ok = await _fsLoadAggData("fs-muster");
  const bl = (DB.lessons || []).filter((l) => l._synthetic && /^urlaub_/.test(l.id));
  return { ok, wer: [...new Set(bl.map((l) => l._fahrlehrerId))].sort(), tage: bl.length };
}, { L: LEHRER, U: urlaub });

await pruefe("U1", "Urlaub mit ID blockiert genau diesen Fahrlehrer (gleicher Name eines anderen zählt nicht)", async () => {
  const r = await lade([{ id: "u1", fahrschule_id: "fs-muster", fahrlehrer_id: "fl-ben", mitarbeiter_name: "Anna Muster", von: heute, bis: heute }]);
  return r.wer.join(",") === "fl-ben" && r.tage === 1 ? [] : ["blockiert: " + r.wer.join(",") + " (" + r.tage + " Tage)"];
});
await pruefe("U2", "Urlaub ohne ID (andere Person) blockiert niemanden", async () => {
  const r = await lade([{ id: "u2", fahrschule_id: "fs-muster", fahrlehrer_id: null, mitarbeiter_name: "Cem Muster", von: heute, bis: heute }]);
  return r.wer.length ? ["blockiert: " + r.wer.join(",")] : [];
});
await pruefe("U3", "Alte Datenbank ohne Spalte: Abgleich über den Namen wie bisher", async () => {
  const r = await lade([{ id: "u3", fahrschule_id: "fs-muster", mitarbeiter_name: "Cem Muster", von: heute, bis: heute }]);
  return r.wer.join(",") === "fl-cem" ? [] : ["blockiert: " + r.wer.join(",")];
});
await pruefe("U4", "Liste: aktueller Profilname über die ID, ohne ID der eingetragene Name mit „ohne Kalender“", async () => {
  await page.evaluate(async ({ L, h }) => {
    window.__T = { fahrschulen: [{ id: "fs-muster", name: "Fahrschule Muster" }], profiles: L,
      fahrschule_urlaub: [{ id: "u4", fahrschule_id: "fs-muster", fahrlehrer_id: "fl-cem", mitarbeiter_name: "Alter Name", von: h, bis: h },
        { id: "u5", fahrschule_id: "fs-muster", fahrlehrer_id: null, mitarbeiter_name: "Dora Muster", von: h, bis: h }] };
    await _fsLoadAggData("fs-muster");
    routeFahrschuleUrlaub();
  }, { L: LEHRER, h: heute });
  await page.waitForTimeout(400);
  const t = await page.evaluate(() => [...document.querySelectorAll("#fsUrlaubWrap .fs-card")].map((c) => c.textContent.replace(/\s+/g, " ").trim()));
  const f = [];
  if (!t.some((x) => /Cem Muster/.test(x) && !/Alter Name/.test(x))) f.push("Profilname fehlt: " + t.join(" | "));
  if (!t.some((x) => /Dora Muster/.test(x) && /ohne Kalender/i.test(x))) f.push("andere Person ohne Hinweis: " + t.join(" | "));
  return f;
});
await pruefe("U5", "Blatt „Urlaub eintragen“: andere Person braucht einen Namen, bis vor von wird abgelehnt", async () => {
  const f = [];
  await page.evaluate(() => { window.__ins = []; const alt = getSupa(); const from = alt.from; alt.from = (t) => { const q = from(t); if (t === "fahrschule_urlaub") return { insert: (w) => { window.__ins.push(w); return Promise.resolve({ error: null }); }, select: () => q }; return q; }; fsUrlaubHinzufuegen(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const w = document.getElementById("urWer"); w.value = "_andere"; w.dispatchEvent(new Event("change")); document.getElementById("urSpeichern").click(); });
  if (await page.evaluate(() => window.__ins.length)) f.push("ohne Namen gespeichert");
  await page.evaluate(() => { document.getElementById("urName").value = "Dora Muster"; document.getElementById("urBis").value = "2020-01-01"; document.getElementById("urSpeichern").click(); });
  if (await page.evaluate(() => window.__ins.length)) f.push("bis vor von gespeichert");
  await page.evaluate(() => { document.getElementById("urBis").value = document.getElementById("urVon").value; document.getElementById("urSpeichern").click(); });
  await page.waitForTimeout(200);
  const ins = await page.evaluate(() => window.__ins);
  if (ins.length !== 1 || ins[0].fahrlehrer_id !== null || ins[0].mitarbeiter_name !== "Dora Muster") f.push("Eintrag falsch: " + JSON.stringify(ins));
  return f;
});
await pruefe("U7", "Blatt: Zeitraum in der Vergangenheit abgelehnt; andere Person mit Fahrlehrer-Namen wird ihm zugeordnet", async () => {
  const f = [];
  await page.evaluate(() => { window.__ins = []; fsUrlaubHinzufuegen(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const w = document.getElementById("urWer"); w.value = "fl-cem"; w.dispatchEvent(new Event("change")); document.getElementById("urVon").value = "2020-01-01"; document.getElementById("urBis").value = "2020-01-02"; document.getElementById("urSpeichern").click(); });
  if (await page.evaluate(() => window.__ins.length)) f.push("Vergangenheit gespeichert");
  await page.evaluate(() => { const w = document.getElementById("urWer"); w.value = "_andere"; w.dispatchEvent(new Event("change")); document.getElementById("urName").value = "cem muster"; const h = todayISO(); document.getElementById("urVon").value = h; document.getElementById("urBis").value = h; document.getElementById("urSpeichern").click(); });
  await page.waitForTimeout(200);
  const ins = await page.evaluate(() => window.__ins);
  if (ins.length !== 1 || ins[0].fahrlehrer_id !== "fl-cem") f.push("nicht dem Fahrlehrer zugeordnet: " + JSON.stringify(ins));
  return f;
});
await pruefe("U8", "Fehlermeldung: nur die Trigger-Ausnahme heißt „gehört nicht zur Fahrschule“", async () => {
  const f = [];
  // Attrappe: profiles.single() liefert die erste Zeile (ein Fahrlehrer) – Büro-Zustand vor jedem Fall neu setzen
  const zurueck = async () => page.evaluate(async (L) => { _authProfile = { id: "u-buero", rolle: "buero", fahrschule_id: "fs-muster", name: "Büro Muster" }; window.__T = { fahrschulen: [{ id: "fs-muster", name: "Fahrschule Muster" }], profiles: L, fahrschule_urlaub: [] }; await _fsLoadAggData("fs-muster"); }, LEHRER);
  for (const [fehler, erwartet] of [[{ code: "42501", message: 'new row violates row-level security policy for table "fahrschule_urlaub"' }, /bitte später nochmal/],
    [{ code: "PGRST204", message: "Could not find the 'fahrlehrer_id' column of 'fahrschule_urlaub' in the schema cache" }, /bitte später nochmal/],
    [{ code: "22023", message: "Diese Person gehört nicht zu dieser Fahrschule" }, /gehört nicht zur Fahrschule/]]) {
    await zurueck();
    await page.evaluate((fe) => { const alt = getSupa(); const from = alt.from; window.__ins = []; window.getSupa = () => Object.assign({}, alt, { from: (t) => (t === "fahrschule_urlaub" ? { insert: async () => ({ error: fe }), select: () => from(t) } : from(t)) }); fsUrlaubHinzufuegen(); }, fehler);
    await page.waitForTimeout(250);
    await page.evaluate(() => { const w = document.getElementById("urWer"); w.value = "fl-cem"; w.dispatchEvent(new Event("change")); document.getElementById("urSpeichern").click(); });
    await page.waitForTimeout(250);
    const t = await page.evaluate(() => document.getElementById("toast").textContent);
    if (!erwartet.test(t)) f.push(fehler.code + ": " + t);
    await page.evaluate(() => { try { closeSheet(); } catch (e) {} });
  }
  return f;
});
await pruefe("U6", "keine JS-Fehler", async () => jsFehler);
await browser.close(); server.close();
console.log(fehlerZahl ? `\n${fehlerZahl} FEHLER, ${okZahl} ok` : `\nAlles grün (${okZahl} Fälle)`);
process.exit(fehlerZahl ? 1 : 0);
