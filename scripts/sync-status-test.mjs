// W23-Test „Sync-Punkt“ (27.11.2026): sieht der Fahrlehrer, ob seine Daten in der Cloud und beim Büro angekommen sind?
// App (index.html) mit nachgebauter Datenbank, nur erfundene Namen „Muster“. Prüft Punkt (grün/gelb/rot), Fenster und Liste:
//   S1  Erfolg: alles angekommen → grün, Fenster zeigt „Zuletzt gesichert um“ für Handy-Stand + 3 Brücken, Liste leer
//   S2  offline: Speichern ohne Netz → gelb, Liste nennt „Keine Verbindung“; wieder online + „Jetzt erneut senden“ → grün
//   S3  abgelehnte Zeile (P0001 Zahlung ausstehend) → rot, Eintrag in „Nicht angekommen“ mit Grund; bleibt nach Neuladen markiert;
//       „Ausblenden“ nimmt ihn aus der Liste; kommt er später an → weg; keine Schülernamen in der Konsole
//   S4  voller Gerätespeicher → rot + Warnung mit „Was tun“; frühe Warnung ab 80 % → gelb + Hinweis
//   S5  Einstellungen zeigen den echten Stand; Punkt 44×44, auf allen Reitern sichtbar, hell und dunkel, 360 px; Büro-Rolle ohne Punkt
//   S6  über 24 h nicht gesichert → rot
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/sync-status-test.mjs        (Exit-Code 1 bei Fehler)
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
    const datei = await readFile(join(ROOT, pfad === "/" ? "index.html" : pfad));
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" });
    res.end(datei);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

let okZahl = 0, fehlerZahl = 0;
async function pruefe(id, text, fn) {
  let r;
  try { r = await fn(); } catch (e) { r = "Test-Ausnahme: " + String(e.message || e).split("\n")[0]; }
  if (r === undefined || r === null || r === true || (Array.isArray(r) && !r.length)) { okZahl++; console.log(`ok  ${id} ${text}`); return; }
  fehlerZahl++;
  console.log(`FEHLER  ${id} ${text}: ${Array.isArray(r) ? r.join(" · ") : r}`);
}
const warte = (page, ms = 250) => page.waitForTimeout(ms);
const offeneCtx = [];
async function abschnitt(name, fn) {
  try { await fn(); } catch (e) {
    fehlerZahl++; console.log(`FEHLER  ${name} abgebrochen: ${String(e.message || e).split("\n")[0]}`);
    for (const c of offeneCtx.splice(0)) await c.close().catch(() => {});
  }
}
const JETZT = new Date("2026-11-23T10:30:00+01:00");
const FSA = "fs-muster";
function appSchueler() {
  const sch = (id, name, extra) => Object.assign({ id, fahrschule_id: FSA, fahrlehrer_id: "u-ich", name, status: "aktiv", telefon: null, ausbildung: {}, vertrag_am: "2026-11-01", reakt_status: "bezahlt", reakt_bezahlt_bis: "2027-11-01", bogen_ausgefuellt: true, erstellt_am: "2026-11-01T10:00:00Z" }, extra || {});
  return [sch("s-a", "Anna Muster"), sch("s-b", "Berta Muster")];
}
async function neueApp({ rolle = "fahrlehrer", faehrtSelbst = false, tabellen, nachLogin, breite = 412, hoehe = 780 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE" });
  const page = await ctx.newPage();
  ctx.setDefaultTimeout(8000); offeneCtx.push(ctx);
  const jsFehler = [];
  page.on("pageerror", (e) => jsFehler.push(e.message));
  const konsole = []; page.on("console", (m) => konsole.push(m.text()));
  page.on("dialog", (d) => { jsFehler.push(`echtes Browser-Fenster (${d.type()}): ${d.message().slice(0, 60)}`); d.dismiss().catch(() => {}); });
  await page.clock.setFixedTime(JETZT);
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 });
  await warte(page, 600);
  await page.evaluate(async ({ tabellen, rolle, faehrtSelbst, FS }) => {
    for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
    const user = { id: "u-ich", email: "ich@example.org" };
    const prof = { rolle }; if (faehrtSelbst) prof.faehrt_selbst = true;
    const T = window.__T = tabellen; window.__schreib = []; window.__hook = null; window.__confirm = 0;
    window.confirm = () => { window.__confirm++; return true; };
    const antwort = (tab, einzeln) => {
      if (tab === "fahrschulen") return { data: einzeln ? { id: FS, name: "Fahrschule Muster", aktiv: true, konfiguration: {} } : [{ id: FS, name: "Fahrschule Muster", aktiv: true, konfiguration: {} }], error: null };
      if (tab === "profiles" && einzeln) return { data: Object.assign({ id: "u-ich", name: "Ich Muster", email: user.email, fahrschule_id: FS, aktiv: true, agb_akzeptiert_version: typeof AGB_VERSION !== "undefined" ? AGB_VERSION : "1.0" }, prof), error: null };
      if (tab === "profiles") return { data: [{ id: "u-ich", name: "Ich Muster", email: user.email, fahrschule_id: FS, aktiv: true, ...prof }, { id: "u-anna", name: "Anna Fahrlehrerin-Muster", email: "anna@example.org", rolle: "fahrlehrer", fahrschule_id: FS, aktiv: true }], error: null };
      const rows = T[tab] || [];
      return einzeln ? { data: rows[0] || null, error: null } : { data: rows, error: null, count: rows.length };
    };
    const baue = (tab) => {
      const st = { art: "select", einzeln: false, werte: null };
      const q = new Proxy(function () {}, {
        get: (_t, k) => {
          if (k === "then") return (ok, nein) => {
            let r;
            if (st.art === "select") r = antwort(tab, st.einzeln);
            else {
              const fehler = window.__hook ? window.__hook(tab, st.art, st.werte) : null;
              window.__schreib.push({ tab, art: st.art, werte: JSON.parse(JSON.stringify(st.werte === undefined ? null : st.werte)), fehler: fehler ? fehler.code || fehler.message : null });
              if (fehler) r = { data: null, error: fehler };
              else {
                if (st.art === "upsert" || st.art === "insert") { const l = Array.isArray(st.werte) ? st.werte : [st.werte]; T[tab] = T[tab] || []; l.forEach((z) => { const i = T[tab].findIndex((x) => x.id === z.id); if (i >= 0) T[tab][i] = Object.assign({}, T[tab][i], z); else T[tab].push(JSON.parse(JSON.stringify(z))); }); }
                r = { data: Array.isArray(st.werte) ? st.werte : (st.werte ? [st.werte] : []), error: null };
              }
            }
            return Promise.resolve(r).then(ok, nein);
          };
          if (k === "single" || k === "maybeSingle") return () => { st.einzeln = true; return q; };
          if (["insert", "upsert", "update", "delete"].includes(k)) return (w) => { st.art = k; st.werte = w; return q; };
          return () => q;
        },
        apply: () => q,
      });
      return q;
    };
    const auth = { getUser: async () => ({ data: { user }, error: null }), getSession: async () => ({ data: { session: { user, access_token: "x" } }, error: null }), signOut: async () => ({ error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) };
    const supa = { from: baue, rpc: async () => ({ data: null, error: null }), auth, functions: { invoke: async () => ({ data: {}, error: null }) }, channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel() {} };
    window.getSupa = () => supa;
    try { localStorage.clear(); localStorage.setItem(OWNER_KEY, user.id); } catch (e) {}
    _dbEigentuemer = user.id;
    ensureDB(); DB.students = []; DB.lessons = []; DB.exams = [];
    _authUser = user;
    await afterLogin(user);
  }, { tabellen, rolle, faehrtSelbst, FS: FSA });
  await warte(page, 1500);
  await page.evaluate(() => { for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) { e.classList.add("hidden"); e.style.display = "none"; } } document.getElementById("bueroNotizPopup")?.remove(); });
  if (nachLogin) await page.evaluate(nachLogin);
  return { ctx, page, jsFehler, konsole };
}

const lesson = (id, sid, date, von, bis) => ({ id, date, von, bis, art: "fahrstunde", sid, name: "", status: "geplant", note: "", fc: null });
const farbe = (page) => page.evaluate(() => { const b = document.getElementById("syncBtn"); return b && !b.hidden ? b.getAttribute("data-sync") : "versteckt"; });
// warten, bis der Punkt eine Farbe hat (Speichern läuft mit 4 s Verzögerung)
const warteFarbe = (page, f, ms = 15000) => page.waitForFunction((f) => { const b = document.getElementById("syncBtn"); return b && !b.hidden && b.getAttribute("data-sync") === f; }, f, { timeout: ms }).catch(() => {});
const fenster = async (page) => { await page.evaluate(() => { try { closeSheet(); } catch (e) {} }); await warte(page, 200); await page.click("#syncBtn"); await warte(page, 400); return page.evaluate(() => (document.getElementById("syncFenster") || {}).innerText || ""); };
const start = { tabellen: { schueler: appSchueler(), kalender_termine: [], kalender_pruefungen: [], schueler_notizen: [] },
  nachLogin: () => { DB.lessons = [{ id: "L1", date: "2026-11-24", von: "08:00", bis: "09:30", art: "fahrstunde", sid: "s-a", name: "", status: "geplant", note: "", fc: null }]; save(); } };

// ---- S1 Erfolg + S5 Anzeige ----
await abschnitt("S1/S5", async () => {
  const { ctx, page, jsFehler } = await neueApp(start);
  await warteFarbe(page, "gruen");
  await pruefe("S1a", "Erfolg: Punkt ist grün", async () => ((await farbe(page)) === "gruen" ? null : "Farbe " + (await farbe(page))));
  const t = await fenster(page);
  await pruefe("S1b", "Fenster: „Zuletzt gesichert um hh:mm“ für Handy-Stand, Schüler, Termine, Prüfungsergebnisse", () => {
    const f = [];
    for (const k of ["auf diesem Handy", "Schüler", "Termine", "Prüfungsergebnisse"]) if (!new RegExp(k + "[^\\n]*\\n?Zuletzt gesichert um \\d\\d:\\d\\d").test(t)) f.push(k + " ohne Zeit");
    return f.length ? f.concat([t.slice(0, 300)]) : null;
  });
  await pruefe("S1c", "Fenster: „Nicht angekommen“ ist leer, Knopf „Jetzt erneut senden“ da", async () =>
    /Nicht angekommen\s*\n?Nichts/.test(t) && (await page.isVisible("#syncJetzt")) ? null : t.slice(0, 300));
  await page.evaluate(() => { try { closeSheet(); } catch (e) {} });
  // S5: auf allen Reitern sichtbar, 44×44
  for (const r of ["heute", "kalender", "schueler", "pruefungen", "mehr"]) {
    await page.evaluate((r) => tabGo(r), r); await warte(page, 350);
    await pruefe("S5a-" + r, "Punkt sichtbar auf Reiter „" + r + "“ mit Tippfläche ≥ 44×44", async () => {
      const b = await page.locator("#syncBtn").boundingBox();
      return b && b.width >= 44 && b.height >= 44 && (await page.isVisible("#syncBtn")) ? null : JSON.stringify(b);
    });
  }
  await page.evaluate(() => routeSettings()); await warte(page, 600);
  await pruefe("S5b", "Einstellungen: echter Stand statt „Daten werden automatisch gesichert“", () => page.evaluate(() => {
    const el = document.querySelector("[data-sync-text]"); if (!el) return "kein Feld [data-sync-text] (Einstellungen nicht offen?)";
    return /Alles in der Cloud und beim Büro angekommen – zuletzt gesichert um \d\d:\d\d/.test(el.textContent) ? null : el.textContent; }));
  // hell und dunkel: Punkt hat Farbe mit Kontrast ≥ 3:1 zum Kopf
  for (const hell of [false, true]) {
    await page.evaluate((h) => document.body.classList.toggle("light", h), hell); await warte(page, 150);
    await pruefe("S5c-" + (hell ? "hell" : "dunkel"), "Punkt im " + (hell ? "Hellmodus" : "Dunkelmodus") + " gut sichtbar (Kontrast ≥ 3:1 zum Hintergrund)", () => page.evaluate(() => {
      const p = document.querySelector("#syncBtn .sync-punkt"); const c = getComputedStyle(p).backgroundColor;
      let bg = "rgb(0,0,0)"; for (let e = document.querySelector(".topbar"); e; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) { bg = b; break; } }
      const lum = (s) => { const m = s.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
      const a = lum(c), b = lum(bg); const k = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      return k >= 3 ? null : `Kontrast ${k.toFixed(2)} (${c} auf ${bg})`; }));
  }
  await pruefe("S1d", "keine JS-Fehler", () => jsFehler);
  await ctx.close();
});

// ---- S2 offline ----
await abschnitt("S2", async () => {
  const { ctx, page, jsFehler } = await neueApp(start);
  await warteFarbe(page, "gruen");
  await ctx.setOffline(true);
  await page.evaluate(() => { window.__hook = (tab, art) => (art === "select" ? null : { message: "TypeError: Failed to fetch" }); DB.lessons.push({ id: "L2", date: "2026-11-25", von: "10:00", bis: "11:30", art: "fahrstunde", sid: "s-a", name: "", status: "geplant", note: "", fc: null }); save(); });
  await pruefe("S2a", "direkt nach dem Speichern: gelb (wird gesendet)", async () => ((await farbe(page)) === "gelb" ? null : "Farbe " + (await farbe(page))));
  await page.waitForTimeout(6500);
  await pruefe("S2b", "offline nach dem Sendeversuch: gelb (nicht rot)", async () => ((await farbe(page)) === "gelb" ? null : "Farbe " + (await farbe(page))));
  const t = await fenster(page);
  await pruefe("S2c", "Liste „Nicht angekommen“ nennt „Keine Verbindung“", () => (/Nicht angekommen[\s\S]*Keine Verbindung/.test(t) ? null : t.slice(0, 400)));
  await ctx.setOffline(false);
  await page.evaluate(() => { window.__hook = null; });
  await page.click("#syncJetzt");
  await warteFarbe(page, "gruen");
  await pruefe("S2d", "wieder online + „Jetzt erneut senden“ → grün, Termin L2 beim Büro angekommen", async () => {
    const f = []; if ((await farbe(page)) !== "gruen") f.push("Farbe " + (await farbe(page)));
    if (!(await page.evaluate(() => (window.__T.kalender_termine || []).some((x) => x.id === "L2")))) f.push("L2 nicht auf dem Server");
    return f; });
  await pruefe("S2e", "keine JS-Fehler", () => jsFehler);
  await ctx.close();
});

// ---- S3 abgelehnte Zeile ----
await abschnitt("S3", async () => {
  const { ctx, page, jsFehler, konsole } = await neueApp(start);
  await warteFarbe(page, "gruen");
  await page.evaluate(() => {
    window.__hook = (tab, art, werte) => (tab === "kalender_termine" && art === "upsert" && (Array.isArray(werte) ? werte : [werte]).some((r) => r.schueler_id === "s-b") ? { code: "P0001", message: "Zahlung ausstehend: Rechnung offen" } : null);
    DB.lessons.push({ id: "L-b", date: "2026-11-26", von: "14:00", bis: "15:30", art: "fahrstunde", sid: "s-b", name: "", status: "geplant", note: "", fc: null }); save();
  });
  await warteFarbe(page, "rot");
  await pruefe("S3a", "Server lehnt Bertas Termin ab → Punkt rot", async () => ((await farbe(page)) === "rot" ? null : "Farbe " + (await farbe(page))));
  let t = await fenster(page);
  await pruefe("S3b", "Liste: „Termin am 26.11. um 14:00 · Berta Muster“ mit Grund „Zahlung ausstehend – das Büro hat gesperrt“", () =>
    /Termin am 26\.11\. um 14:00 · Berta Muster[\s\S]*Zahlung ausstehend – das Büro hat gesperrt/.test(t) ? null : t.slice(0, 500));
  await pruefe("S3b2", "Fenster rot: Zeile „Termine“ ist rot mit „1 Eintrag nicht angekommen“ (nie „angekommen“), Liste steht oben", () => page.evaluate(() => {
    const z = document.querySelector('#syncFenster [data-kanal="termine"]'); const f = [];
    if (!z || z.getAttribute("data-sync") !== "rot" || !/1 Eintrag nicht angekommen/.test(z.textContent)) f.push("Termine-Zeile: " + (z && z.getAttribute("data-sync") + " " + z.textContent));
    const l = document.querySelector("#syncFenster .sync-liste"); if (!l || (l.compareDocumentPosition(z) & Node.DOCUMENT_POSITION_FOLLOWING) === 0) f.push("Liste nicht vor den Kanälen");
    return f; }));
  await pruefe("S3c", "keine Schülernamen in der Konsole", () => konsole.filter((k) => /Muster/.test(k)));
  // nach Neuladen weiter markiert (Merker im Gerät)
  await pruefe("S3d", "abgelehnte Zeile bleibt gemerkt (überlebt Neuladen: Eintrag im Gerätespeicher, ohne Namen)", () => page.evaluate(() => {
    const o = JSON.parse(localStorage.getItem("kompass-sync-v1") || "null"); if (!o || !o.abgelehnt || !o.abgelehnt["kalender_termine:L-b"]) return "nicht gemerkt";
    return /Muster/.test(JSON.stringify(o)) ? "Name im Merker" : null; }));
  // erneut senden: weiter abgelehnt → bleibt rot
  await page.click("#syncJetzt"); await warte(page, 2500);
  await pruefe("S3e", "„Jetzt erneut senden“, Server lehnt weiter ab → bleibt rot und in der Liste", async () => ((await farbe(page)) === "rot" && /Berta Muster/.test(await page.evaluate(() => document.getElementById("syncFenster").innerText)) ? null : "Farbe " + (await farbe(page))));
  // Ausblenden
  await page.click('[data-sync-aus="kalender_termine:L-b"]'); await warte(page, 400);
  await pruefe("S3f", "„Ausblenden“ → nicht mehr in der Liste, Punkt grün, Termin bleibt auf dem Handy", async () => {
    const f = []; const t2 = await page.evaluate(() => document.getElementById("syncFenster").innerText);
    if (/Berta Muster/.test(t2)) f.push("noch in der Liste"); if ((await farbe(page)) !== "gruen") f.push("Farbe " + (await farbe(page)));
    if (!(await page.evaluate(() => DB.lessons.some((l) => l.id === "L-b")))) f.push("Termin lokal weg"); return f; });
  // Termin geändert → wieder abgelehnt → wieder sichtbar
  await page.evaluate(() => { try { closeSheet(); } catch (e) {} DB.lessons.find((l) => l.id === "L-b").von = "15:00"; save(); });
  await warteFarbe(page, "rot");
  await pruefe("S3g", "nach einer Änderung erneut abgelehnt → wieder rot in der Liste", async () => ((await farbe(page)) === "rot" ? null : "Farbe " + (await farbe(page))));
  // Büro gibt frei → kommt an → aus der Liste
  await page.evaluate(() => { window.__hook = null; DB.lessons.find((l) => l.id === "L-b").bis = "16:30"; save(); });
  await warteFarbe(page, "gruen");
  await pruefe("S3h", "Server nimmt den Termin an → Eintrag weg, Punkt grün", async () => ((await farbe(page)) === "gruen" && (await page.evaluate(() => !JSON.parse(localStorage.getItem("kompass-sync-v1")).abgelehnt["kalender_termine:L-b"])) ? null : "Farbe " + (await farbe(page))));
  await pruefe("S3i", "keine JS-Fehler", () => jsFehler);
  await ctx.close();
});

// ---- S4 Gerätespeicher ----
await abschnitt("S4", async () => {
  const { ctx, page, jsFehler } = await neueApp(start);
  await warteFarbe(page, "gruen");
  await page.evaluate(() => { const orig = Storage.prototype.setItem; window.__voll = true;
    Storage.prototype.setItem = function (k, v) { if (window.__voll && k === STORE_KEY) { const e = new Error("QuotaExceededError"); e.name = "QuotaExceededError"; throw e; } return orig.call(this, k, v); };
    DB.lessons.push({ id: "L3", date: "2026-11-27", von: "08:00", bis: "09:30", art: "fahrstunde", sid: "s-a", name: "", status: "geplant", note: "", fc: null }); save(); });
  await warte(page, 400);
  await pruefe("S4a", "voller Gerätespeicher → rot", async () => ((await farbe(page)) === "rot" ? null : "Farbe " + (await farbe(page))));
  const t = await fenster(page);
  await pruefe("S4b", "Fenster: Warnung „Gerätespeicher voll“ mit „Was tun“ (Internet anlassen, nicht abmelden)", () => (/Gerätespeicher voll[\s\S]*Was tun[\s\S]*Nicht abmelden/.test(t) ? null : t.slice(0, 500)));
  await page.evaluate(() => { window.__voll = false; try { closeSheet(); } catch (e) {} save(); });
  await warteFarbe(page, "gruen");
  await pruefe("S4c", "Platz wieder da → Warnung weg (grün)", async () => ((await farbe(page)) === "gruen" ? null : "Farbe " + (await farbe(page))));
  // frühe Warnung: Belegung über 80 % der Grenze
  const gefuellt = await page.evaluate(() => { try { localStorage.setItem("test-fuellung", "x".repeat(Math.ceil(SYNC.GRENZE * SYNC.WARN_AB) + 1000)); return true; } catch (e) { SYNC._intern().speicher.nutzung = SYNC.GRENZE * 0.85; return false; } });
  await page.evaluate(() => { SYNC._intern().speicher.geprueftAm = 0; save(); });
  await warte(page, 400);
  const t2 = await fenster(page);
  await pruefe("S4d", "frühe Warnung ab 80 %: Hinweis „Gerätespeicher fast voll“ im Fenster" + (gefuellt ? "" : " (Belegung nachgestellt)"), () => (/Gerätespeicher fast voll \(\d+ %\)/.test(t2) ? null : t2.slice(0, 400)));
  await pruefe("S4e", "frühe Warnung: Hinweis erscheint einmal", () => page.evaluate(() => /Gerätespeicher fast voll/.test(document.getElementById("toast").textContent) || SYNC._intern().speicher.nahGemeldet ? null : "kein Hinweis"));
  await page.evaluate(() => { try { localStorage.removeItem("test-fuellung"); } catch (e) {} });
  await pruefe("S4f", "keine JS-Fehler", () => jsFehler);
  await ctx.close();
});

// ---- S6 über 24 h + Büro-Rolle + 360 px ----
await abschnitt("S6", async () => {
  const { ctx, page, jsFehler } = await neueApp(Object.assign({ breite: 360, hoehe: 740 }, start));
  await warteFarbe(page, "gruen");
  await ctx.setOffline(true);
  await page.evaluate(() => { window.__hook = (tab, art) => (art === "select" ? null : { message: "TypeError: Failed to fetch" }); DB.lessons.push({ id: "L9", date: "2026-11-28", von: "08:00", bis: "09:30", art: "fahrstunde", sid: "s-a", name: "", status: "geplant", note: "", fc: null }); save(); });
  await page.waitForTimeout(6000);
  await page.evaluate(() => { const K = SYNC._intern().K; Object.keys(K).forEach((k) => { if (K[k].offenSeit) K[k].offenSeit -= 25 * 3600 * 1000; }); SYNC.zeichnen(); });
  await warte(page, 300);
  await pruefe("S6a", "über 24 h nicht gesichert → rot mit „seit über einem Tag nicht gesichert“", async () =>
    (await farbe(page)) === "rot" && /seit über einem Tag/.test(await page.getAttribute("#syncBtn", "aria-label")) ? null : (await farbe(page)) + " · " + (await page.getAttribute("#syncBtn", "aria-label")));
  await pruefe("S6b", "360 px: Kopfzeile ohne Überlauf, Punkt im Bild", () => page.evaluate(() => {
    const b = document.getElementById("syncBtn").getBoundingClientRect(); const tb = document.querySelector(".topbar");
    const f = []; if (b.right > innerWidth || b.left < 0) f.push("Punkt außerhalb"); if (tb.scrollWidth > tb.clientWidth + 1) f.push("Kopf läuft über");
    const bell = document.getElementById("bellBtn").getBoundingClientRect(); if (b.right > bell.left + 1) f.push("überdeckt Glocke"); return f; }));
  await ctx.setOffline(false);
  await pruefe("S6c", "keine JS-Fehler", () => jsFehler);
  await ctx.close();
});
await abschnitt("S7", async () => {
  const { ctx, page, jsFehler } = await neueApp({ rolle: "buero", tabellen: start.tabellen });
  await pruefe("S7a", "Büro-Rolle (kein eigener Stand): kein Sync-Punkt", async () => ((await farbe(page)) === "versteckt" ? null : "Farbe " + (await farbe(page))));
  await pruefe("S7b", "keine JS-Fehler", () => jsFehler);
  await ctx.close();
});

await browser.close();
server.close();
console.log(`\nSync-Status-Test: ${okZahl} ok, ${fehlerZahl} Fehler`);
process.exit(fehlerZahl ? 1 : 0);
