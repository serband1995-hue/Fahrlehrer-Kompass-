// K5-Test: Prüfer-Wissen gemeinsam je Fahrschule (🗣 Serband 21.11.2026).
// Spielt mit einer Datenbank-Attrappe (erfundene Namen „Muster“, kein Netz) durch:
//   P1 alte Prüfer-Infos des Geräts (Prüfer, Tags, Notiz) gehen einmal in die gemeinsame Akte
//   P2 Prüfer eines Kollegen erscheint in der Liste und in der Auswahl
//   P3 Statistik zählt die Prüfungen der anderen Fahrlehrer mit
//   P4 Fahrlehrer: keine fremden Schülernamen, nur Zahlen je Fahrlehrer
//   P5 Notizen zeigen Verfasser und Datum, Hinweis „sachlich“, neue Notiz geht an den Server
//   P6 Leitung sieht Namen mit „bei …“
//   P7 Alte Datenbank (Tabelle fehlt): Akte wie bisher (eigenes Notizfeld), keine Fehler
//   P8 neuer Prüfer / neuer Tag gehen als Unterschied an den Server
//   P9 keine JS-Fehler
// Aufruf: NODE_PATH=$(npm root -g) node scripts/pruefer-gemeinsam-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const server = createServer(async (req, res) => {
  try {
    const pfad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    const datei = await readFile(join(ROOT, pfad === "/" ? "index.html" : pfad));
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" }); res.end(datei);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let fehlerZahl = 0, okZahl = 0;
async function pruefe(id, text, fn) {
  let r; try { r = await fn(); } catch (e) { r = "Test-Ausnahme: " + String(e.message || e).split("\n")[0]; }
  if (r === undefined || r === null || r === true || (Array.isArray(r) && !r.length)) { okZahl++; console.log(`ok  ${id} ${text}`); return; }
  fehlerZahl++; console.log(`FEHLER  ${id} ${text}: ${Array.isArray(r) ? r.join(" · ") : r}`);
}
const warte = (page, ms = 250) => page.waitForTimeout(ms);

async function starte({ rolle = "fahrlehrer", alteDB = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE" });
  const page = await ctx.newPage();
  const jsFehler = [];
  page.on("pageerror", (e) => jsFehler.push(e.message));
  page.on("dialog", (d) => d.accept(d.type() === "prompt" ? "Neu Muster" : undefined).catch(() => {}));
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 });
  await warte(page, 600);
  await page.evaluate(async ({ rolle, alteDB }) => {
    for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
    const FS = "fs-muster";
    const user = { id: "u-ich", email: "ich@example.org" };
    const voll = ["buero", "fahrschule_admin", "super_admin"].includes(rolle);
    window.__db = {
      fahrschule_pruefer: [{ id: "p-schmidt", fahrschule_id: FS, name: "Schmidt", behoerde: null, tags: ["Streng: Schulterblick"], routen: [["TÜV", "Bieber"]], angelegt_von: "u-jelena", geloescht: false }],
      fahrschule_pruefer_notizen: [{ id: "n-1", fahrschule_id: FS, pruefer_name: "Schmidt", text: "Achtet sehr auf Tempo 30.", verfasser_id: "u-jelena", verfasser_name: "Jelena", erstellt_am: "2026-11-20T10:00:00Z", geloescht: false }],
    };
    window.__schreib = [];
    const ergebnisse = [
      { id: "x-1", fahrlehrer_id: "u-jelena", fahrlehrer_name: "Jelena", eigen: false, pruefer: "Schmidt", datum: "2026-11-10", result: "pass", attempt: 1, b197: false, note: "Strecke über Bieber", faults: [], eingriff: false, eing_note: null, schueler_id: voll ? "s-fremd" : null, schueler_name: voll ? "Fremd Muster" : null },
      { id: "x-2", fahrlehrer_id: "u-jelena", fahrlehrer_name: "Jelena", eigen: false, pruefer: "Schmidt", datum: "2026-11-12", result: "fail", attempt: 1, b197: false, note: null, faults: ["vorfahrt"], eingriff: false, eing_note: null, schueler_id: voll ? "s-fremd2" : null, schueler_name: voll ? "Zweit Muster" : null },
    ];
    const tabellenFehler = { data: null, error: { code: "42P01", message: 'relation "fahrschule_pruefer" does not exist' } };
    const antwort = (st) => {
      if (alteDB && st.tab.startsWith("fahrschule_pruefer")) return tabellenFehler;
      if (st.tab === "fahrschulen" && st.einzeln) return { data: { id: FS, name: "Fahrschule Muster", aktiv: true, konfiguration: {} }, error: null };
      if (st.tab === "profiles" && st.einzeln) return { data: { id: "u-ich", name: "Ich Muster", email: user.email, fahrschule_id: FS, aktiv: true, rolle, agb_akzeptiert_version: typeof AGB_VERSION !== "undefined" ? AGB_VERSION : "1.0" }, error: null };
      const t = window.__db[st.tab];
      if (!t) return { data: st.einzeln ? null : [], error: null, count: 0 };
      if (st.art === "select") {
        let rows = t.filter((r) => st.filter.every(([k, v]) => r[k] === v));
        return { data: st.einzeln ? rows[0] || null : rows.map((r) => JSON.parse(JSON.stringify(r))), error: null };
      }
      if (st.art === "insert") {
        const neu = (Array.isArray(st.werte) ? st.werte : [st.werte]).map((w) => Object.assign({ id: "neu-" + Math.random().toString(36).slice(2), geloescht: false, erstellt_am: new Date().toISOString() }, w, st.tab.endsWith("notizen") ? { verfasser_name: "Ich Muster" } : {}));
        if (st.tab === "fahrschule_pruefer" && neu.some((n) => t.some((r) => !r.geloescht && r.name.toLowerCase() === n.name.toLowerCase()))) return { data: null, error: { code: "23505", message: "doppelt" } };
        t.push(...neu); return { data: neu, error: null };
      }
      if (st.art === "update") {
        const rows = t.filter((r) => st.filter.every(([k, v]) => r[k] === v)); rows.forEach((r) => Object.assign(r, st.werte));
        return { data: rows.map((r) => JSON.parse(JSON.stringify(r))), error: null };
      }
      return { data: [], error: null };
    };
    const baue = (tab) => {
      const st = { tab, art: "select", einzeln: false, werte: null, filter: [] };
      const q = new Proxy(function () {}, {
        get: (_t, k) => {
          if (k === "then") return (ok, nein) => { if (st.art !== "select") window.__schreib.push({ tab: st.tab, art: st.art, werte: st.werte }); return Promise.resolve(antwort(st)).then(ok, nein); };
          if (k === "single" || k === "maybeSingle") return () => { st.einzeln = true; return q; };
          if (k === "eq") return (a, b) => { st.filter.push([a, b]); return q; };
          if (["insert", "upsert", "update", "delete"].includes(k)) return (w) => { st.art = k; st.werte = w; return q; };
          return () => q;
        },
        apply: () => q,
      });
      return q;
    };
    const rpc = async (name, args) => {
      window.__schreib.push({ tab: "rpc:" + name, art: "rpc", werte: args });
      if (alteDB) return { data: null, error: { code: "PGRST202", message: "Could not find the function" } };
      if (name === "fs_pruefer_ergebnisse") return { data: JSON.parse(JSON.stringify(ergebnisse)), error: null };
      return { data: null, error: null };
    };
    const auth = { getUser: async () => ({ data: { user }, error: null }), getSession: async () => ({ data: { session: { user, access_token: "x" } }, error: null }), signOut: async () => ({ error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) };
    const supa = { from: baue, rpc, auth, functions: { invoke: async () => ({ data: {}, error: null }) }, channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel() {} };
    window.getSupa = () => supa;
    try { localStorage.clear(); localStorage.setItem(OWNER_KEY, user.id); } catch (e) {}
    _dbEigentuemer = user.id;
    ensureDB(); DB.students = [{ id: "s-eigen", name: "Eigen Muster", plan: [], skills: {} }]; DB.lessons = [];
    DB.exams = [{ id: "e-1", sid: "s-eigen", name: "Eigen Muster", date: "2026-11-05", result: "pass", pruefer: "Schmidt", attempt: 1, note: "Meine Strecke", faults: [] }];
    DB.pruefer = ["Müller"]; DB.prueferData = { "Müller": { behoerde: "", tags: ["Freundlich"], routen: [], notiz: "Lässt Zeit beim Einparken.", created: 1 } };
    _authUser = user;
    await afterLogin(user);
  }, { rolle, alteDB });
  await warte(page, 900);
  await page.evaluate(() => { for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) { e.classList.add("hidden"); e.style.display = "none"; } } });
  if (!alteDB) await page.evaluate(() => PW.laden({ sofort: true }));
  await warte(page, 300);
  return { ctx, page, jsFehler };
}

// ---------- Fahrlehrer ----------
{
  const { ctx, page, jsFehler } = await starte({ rolle: "fahrlehrer" });
  await pruefe("P1", "alte Prüfer-Infos gehen einmal in die gemeinsame Akte (Prüfer, Tag, Notiz)", () => page.evaluate(() => {
    const p = __db.fahrschule_pruefer.find((x) => x.name === "Müller"); const n = __db.fahrschule_pruefer_notizen.find((x) => x.pruefer_name === "Müller");
    if (!p) return "Prüfer Müller nicht hochgeladen"; if (!p.tags.includes("Freundlich")) return "Tag fehlt";
    if (!n || n.text !== "Lässt Zeit beim Einparken.") return "Notiz fehlt"; return null;
  }));
  await pruefe("P2", "Prüfer des Kollegen ist in der Auswahl (DB.pruefer) mit seinen Tags", () => page.evaluate(() => (DB.pruefer.includes("Schmidt") && DB.prueferData.Schmidt.tags.includes("Streng: Schulterblick") ? null : JSON.stringify(DB.pruefer))));
  await pruefe("P3", "Statistik zählt eigene + fremde Prüfungen (3)", () => page.evaluate(() => { const s = prueferStats("Schmidt"); return s.total === 3 ? null : "total=" + s.total; }));
  await page.evaluate(() => { _pfTab = "schueler"; routePrueferAkte("Schmidt"); }); await warte(page, 300);
  await pruefe("P4", "Fahrlehrer: eigener Schüler mit Namen, fremde nur als Zahlen je Fahrlehrer", () => page.evaluate(() => {
    const t = document.getElementById("view").textContent;
    if (!/Eigen Muster/.test(t)) return "eigener Name fehlt"; if (/Fremd Muster|Zweit Muster/.test(t)) return "fremder Name sichtbar";
    return /Andere Fahrlehrer/.test(t) && /Jelena/.test(t) && /2 Prüfungen · 1 bestanden/.test(t) ? null : "Zusammenfassung fehlt: " + t.slice(0, 200);
  }));
  await page.evaluate(() => { _pfTab = "strecken"; routePrueferAkte("Schmidt"); }); await warte(page, 200);
  await pruefe("P4b", "Strecken: fremde Strecke mit „von Jelena“, ohne Schülernamen", () => page.evaluate(() => { const t = document.getElementById("view").textContent; return /Strecke über Bieber/.test(t) && /von Jelena/.test(t) && !/Fremd Muster/.test(t) ? null : t.slice(0, 200); }));
  await page.evaluate(() => { _pfTab = "profil"; routePrueferAkte("Schmidt"); }); await warte(page, 200);
  await pruefe("P5", "Notiz zeigt Verfasser + Datum, Hinweis sachlich/alle sehen es", () => page.evaluate(() => {
    const t = document.getElementById("view").textContent; const ph = (document.getElementById("pwNeu") || {}).placeholder || "";
    if (!/Achtet sehr auf Tempo 30\./.test(t)) return "Notiz fehlt"; if (!/Jelena · 20\.11\.2026/.test(t)) return "Verfasser/Datum fehlt";
    if (!/Worauf achtet/.test(ph) || !/Alle Fahrlehrer deiner Fahrschule sehen das\. Bitte sachlich\./.test(t)) return "Hinweis fehlt";
    const kette = [...document.querySelectorAll("#pwNotizen > *")].map((x) => x.id || x.className); if (kette.indexOf("pwListe") > kette.indexOf("pwSenden")) return "Liste nicht vor dem Schreibfeld"; if (document.getElementById("pfNote")) return "altes Einzel-Notizfeld noch da";
    return /Löschen/.test(document.querySelector("#pwNotizen").textContent) && document.querySelector('[data-weg="n-1"]') ? "fremde Notiz löschbar" : null;
  }));
  await page.fill("#pwNeu", "Fährt gern Autobahn.");
  await page.click("#pwSenden"); await warte(page, 400);
  await pruefe("P5b", "neue Notiz geht an den Server und steht oben mit eigenem Namen", () => page.evaluate(() => {
    const n = __db.fahrschule_pruefer_notizen.find((x) => x.text === "Fährt gern Autobahn."); if (!n || n.verfasser_id !== "u-ich") return "nicht gespeichert";
    const erste = document.querySelector(".pw-notiz .pw-text"); return erste && /Autobahn/.test(erste.textContent) && /Ich Muster/.test(document.querySelector(".pw-notiz .pw-meta").textContent) ? null : "Anzeige fehlt";
  }));
  await pruefe("P5c", "Lösch-Knopf ≥ 44 px", () => page.evaluate(() => { const b = document.querySelector(".pw-weg"); if (!b) return "kein Knopf"; const r = b.getBoundingClientRect(); return r.height >= 43.5 ? null : "nur " + r.height; }));
  await page.evaluate(() => { ensurePruefer("Neu Muster"); DB.pruefer.push("Neu Muster"); DB.prueferData.Schmidt.tags.push("Mag Kreisel"); save(); });
  await warte(page, 2600);
  await pruefe("P8", "neuer Prüfer und neuer Tag gehen als Unterschied an den Server", () => page.evaluate(() => {
    const a = __db.fahrschule_pruefer.find((x) => x.name === "Neu Muster"), s = __db.fahrschule_pruefer.find((x) => x.name === "Schmidt");
    return a && s.tags.includes("Mag Kreisel") && s.tags.includes("Streng: Schulterblick") ? null : "neu=" + !!a + " tags=" + JSON.stringify(s.tags);
  }));
  await pruefe("P8b", "Löschen-Knopf beim fremden Prüfer nicht da (nur Ersteller/Büro/Leitung)", () => page.evaluate(() => { _pfTab = "profil"; routePrueferAkte("Schmidt"); return document.getElementById("delPruefer") ? "Knopf da" : null; }));
  // Funde Prüf-Team 22.11.2026
  await page.evaluate(() => { DB.prueferData.Schmidt.tags.push("Mag Parken"); save(); PW.laden({ sofort: true }); });
  await warte(page, 3500);
  await pruefe("P10", "neuer Tag geht nicht verloren, wenn gleichzeitig nachgeladen wird", () => page.evaluate(() => {
    const s = __db.fahrschule_pruefer.find((x) => x.name === "Schmidt");
    return DB.prueferData.Schmidt.tags.includes("Mag Parken") && s.tags.includes("Mag Parken") ? null : "lokal=" + DB.prueferData.Schmidt.tags.includes("Mag Parken") + " server=" + s.tags.includes("Mag Parken");
  }));
  await page.evaluate(async () => { DB.exams.push({ id: "e-2", sid: "s-eigen", name: "Eigen Muster", date: "2026-11-06", result: "fail", pruefer: "Müller", attempt: 1, faults: [] });
    _pfTab = "profil"; routePrueferAkte("Müller"); });
  await warte(page, 200);
  await pruefe("P11", "eigener Prüfer: Löschen und Umbenennen da", () => page.evaluate(() => (document.getElementById("delPruefer") && document.getElementById("renamePruefer") ? null : "Knöpfe fehlen")));
  await page.click("#delPruefer"); await warte(page, 600);
  await page.evaluate(() => { routePrueferAkte("Müller"); DB.prueferData.Müller && DB.prueferData.Müller.tags.push("x"); save(); });
  await warte(page, 2600);
  await pruefe("P12", "gelöschter Prüfer mit Prüfungen kommt durch Öffnen der Akte nicht zurück", () => page.evaluate(() => {
    const z = __db.fahrschule_pruefer.filter((x) => x.name === "Müller"); return z.length === 1 && z[0].geloescht ? null : JSON.stringify(z.map((x) => x.geloescht));
  }));
  await page.evaluate(() => { _pfTab = "profil"; routePrueferAkte("Schmidt"); });
  await warte(page, 200);
  await pruefe("P13", "fremder Prüfer: kein Umbenennen-Knopf", () => page.evaluate(() => (document.getElementById("renamePruefer") ? "Knopf da" : null)));
  await page.fill("#pwNeu", "Angefangen");
  await page.evaluate(() => document.getElementById("pwNeu").blur());
  const eigene = await page.evaluate(() => { const b = document.querySelector("#pwListe [data-weg]"); return b ? b.dataset.weg : null; });
  if (eigene) await page.click(`[data-weg="${eigene}"]`);
  await warte(page, 400);
  await page.evaluate(() => PW.laden({ sofort: true })); await warte(page, 600);
  await pruefe("P14", "angefangener Text bleibt beim Löschen und Nachladen stehen", () => page.evaluate(() => { const t = document.getElementById("pwNeu"); return t && t.value === "Angefangen" ? null : "Text: " + (t && t.value); }));
  await page.evaluate(() => routePrueferListe()); await warte(page, 200);
  await page.evaluate(() => { const b = document.querySelector("#toast .ut-btn"); if (b) b.click(); }); await warte(page, 600);
  await pruefe("P15", "Rückgängig in der Liste springt nicht in die Akte, Notiz ist wieder da", () => page.evaluate((id) => {
    if (document.querySelector(".pf-hero-name")) return "in die Akte gesprungen";
    const n = __db.fahrschule_pruefer_notizen.find((x) => x.id === id); return !id || (n && !n.geloescht) ? null : "nicht zurück";
  }, eigene));
  // E2 (Fable K5): angefangene Notiz bleibt beim Zurück (Liste → wieder in die Akte) erhalten, beim anderen Prüfer nicht
  await page.evaluate(() => { _pfTab = "profil"; routePrueferAkte("Müller"); }); await warte(page, 200);
  const beiMueller = await page.evaluate(() => (document.getElementById("pwNeu") || {}).value);
  await page.evaluate(() => { _pfTab = "profil"; routePrueferAkte("Schmidt"); }); await warte(page, 200);
  await pruefe("P14b", "E2: angefangene Notiz ist nach Zurück wieder da (nur beim selben Prüfer)", () => page.evaluate((m) => {
    const t = document.getElementById("pwNeu"); if (m) return "Entwurf steht auch bei Müller";
    return t && t.value === "Angefangen" ? null : "Text: " + (t && t.value);
  }, beiMueller));
  // Fable 22.11.2026: Änderung eines Kollegen darf durch eigene Änderung nicht verschwinden
  await page.evaluate(() => { const z = __db.fahrschule_pruefer.find((x) => x.name === "Schmidt"); z.tags = z.tags.concat(["Kollege X"]); z.routen = z.routen.concat([["Kollege", "Strecke"]]);
    DB.prueferData.Schmidt.tags.push("Mein Y"); PW.nachSpeichern(); });
  await warte(page, 4500);
  await pruefe("P18", "eigener Tag kommt dazu, Tag und Strecke des Kollegen bleiben", () => page.evaluate(() => {
    const z = __db.fahrschule_pruefer.find((x) => x.name === "Schmidt");
    const fehlt = ["Streng: Schulterblick", "Kollege X", "Mein Y"].filter((t) => !z.tags.includes(t));
    if (!z.routen.some((r) => r[0] === "Kollege")) fehlt.push("Strecke Kollege");
    return fehlt.length ? "fehlt: " + fehlt.join(", ") : null;
  }));
  // Fable 22.11.2026: gelöschte alte Notiz wird beim zweiten Gerät / neu Anmelden nicht wieder veröffentlicht
  await page.evaluate(async () => { const n = __db.fahrschule_pruefer_notizen.find((x) => x.pruefer_name === "Müller" && !x.geloescht); if (n) await PW.notizLoeschen(n.id, true); DB.prueferData["Müller"].notiz = "Lässt Zeit beim Einparken."; // wie ein zweites Gerät mit altem Stand
   
    Object.keys(localStorage).filter((k) => /^kompass-pw-hoch-/.test(k)).forEach((k) => localStorage.removeItem(k)); await PW.laden({ sofort: true }); });
  await warte(page, 800);
  await pruefe("P19", "gelöschte alte Prüfer-Notiz kommt nach erneutem Hochladen nicht zurück", () => page.evaluate(() => {
    const n = __db.fahrschule_pruefer_notizen.filter((x) => x.pruefer_name === "Müller");
    if (!n.length) return "Notiz war nie hochgeladen"; return n.some((x) => !x.geloescht) ? "wieder sichtbar (" + n.length + " Einträge)" : null;
  }));
  await pruefe("P16", "Abmelden entfernt das Prüfer-Wissen vom Gerät", () => page.evaluate(() => { _lokaleNutzerdatenLoeschen(); const k = Object.keys(localStorage).filter((x) => /^kompass-pw/.test(x)); return k.length ? k.join(",") : (PW.aktiv() ? "noch aktiv" : null); }));
  await pruefe("P9", "keine JS-Fehler (Fahrlehrer)", () => jsFehler);
  await ctx.close();
}
// ---------- Leitung ----------
{
  const { ctx, page, jsFehler } = await starte({ rolle: "fahrschule_admin" });
  await page.evaluate(() => { _pfTab = "schueler"; routePrueferAkte("Schmidt"); }); await warte(page, 300);
  await pruefe("P6", "Leitung sieht fremde Schüler mit „bei Jelena“", () => page.evaluate(() => { const t = document.getElementById("view").textContent; return /Fremd Muster/.test(t) && /bei Jelena/.test(t) ? null : t.slice(0, 200); }));
  await pruefe("P9b", "keine JS-Fehler (Leitung)", () => jsFehler);
  await ctx.close();
}
// ---------- Alte Datenbank ----------
{
  const { ctx, page, jsFehler } = await starte({ rolle: "fahrlehrer", alteDB: true });
  await page.evaluate(() => PW.laden({ sofort: true })); await warte(page, 300);
  await page.evaluate(() => { _pfTab = "profil"; routePrueferAkte("Müller"); }); await warte(page, 300);
  await pruefe("P7", "alte Datenbank: PW aus, eigenes Notizfeld wie bisher mit alter Notiz", () => page.evaluate(() => (!PW.aktiv() && document.getElementById("pfNote") && /Einparken/.test(document.getElementById("pfNote").value) ? null : "aktiv=" + PW.aktiv())));
  await pruefe("P7b", "alte Datenbank: Statistik nur eigene (1)", () => page.evaluate(() => { const s = prueferStats("Schmidt"); return s.total === 1 ? null : "total=" + s.total; }));
  await pruefe("P9c", "keine JS-Fehler (alte Datenbank)", () => jsFehler);
  await ctx.close();
}
// ---------- Migration: Umbenennen ohne gemeinsamen Eintrag (Richter 22.11.2026) ----------
{
  const sql = await readFile(join(fileURLToPath(new URL("..", import.meta.url)), "supabase/migrations/20261122_k5_01_pruefer_gemeinsam.sql"), "utf8");
  await pruefe("P17", "Umbenennen ohne gemeinsamen Eintrag ändert bei Fahrlehrern nur eigene Prüfungen und Notizen", async () => {
    const f = sql.slice(sql.indexOf("function public.fs_pruefer_umbenennen"));
    const fehlt = [/nur_eigene := a\.id is null and not k5_darf_verwalten\(\)/, /not nur_eigene or verfasser_id = auth\.uid\(\)/, /not nur_eigene or fahrlehrer_id = auth\.uid\(\)/].filter((r) => !r.test(f));
    return fehlt.length ? "fehlt: " + fehlt.join(" ") : null;
  });
}
await browser.close(); server.close();
console.log(`\nPrüfer-gemeinsam-Test: ${okZahl} ok, ${fehlerZahl} Fehler`);
process.exit(fehlerZahl ? 1 : 0);
