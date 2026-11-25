// Rollen-Test (🗣 Serband 21.11.2026: „sorge dafür, dass solche Fehler nicht nochmal vorkommen“).
// Anlass: Jelena (Leitung und Fahrlehrerin) fand in der App keinen Weg, Schüler anzulegen, und bekam nicht
// ihre eigene Fahrlehrer-Ansicht. Dieser Test spielt JEDE Rolle vom Start der App bis zum gespeicherten Schüler durch:
//   Fahrlehrer · Leitung (reine) · Leitung, die selbst fährt · Büro · Super-Admin · gesperrt · gelöscht
// über den echten Anmeldeweg (afterLogin), am Handy hoch (360) und quer (740×360)
// Je Rolle wird geprüft:
//   (1) die richtige Startansicht (eigene Fahrlehrer-Ansicht oder Gesamtansicht der Fahrschule)
//   (2) der Umschalter in die Gesamtübersicht ist genau bei Betreiber und Leitung-fährt-selbst da
//   (3) auf dem Reiter „Schüler“ gibt es einen sichtbaren Knopf zum Anlegen (mind. 44 px hoch)
//   (4) ein neuer Schüler wird wirklich in die Datenbank geschrieben – in der eigenen Ansicht beim eigenen Fahrlehrer
//   (5) keine JS-Fehler
//   (6) K8 „Zahlung ausstehend“ (23.11.2026): R12 Hinweis am bestehenden Termin + Sperre für neue Termine, keine Büro-Knöpfe in der App;
//       R13 Büro-Seite: Büro, Leitung, Super-Admin sehen die Knöpfe, ein Fahrlehrer kommt nicht hinein
//   (7) Paket-Baukasten (Werkstatt 13, 24.11.2026): R19 Büro, Leitung und Super-Admin legen einen Schüler mit Paket an (Verkauf beim Speichern)
//   (8) W16 Büro und Fahrlehrer trennen (🗣 Serband 24.11.2026): Büro öffnet die App → buero.html (R20), Fahrlehrer öffnet buero.html → App (R13),
//       Leitung und Super-Admin wählen die Startseite nur in den Einstellungen (R6–R8, R21), kein Streifen und kein Umschalter mehr (R2),
//       keine Weiterleitungs-Schleife, Passwort-Link und Offline-Start ohne Weiterleitung (R22),
//       Startseite Büro mit eigenem Stand: erst alles oben, nie während einer Eingabe, auch nach dem neuen Passwort (R26)
//       Teil 2 (25.11.2026): Büro nur noch auf der Büro-Seite (R20), dort kein Weg in die App; Leitung und Super-Admin
//       wählen die Startseite auf der Büro-Seite unter Einstellungen › Darstellung & Start (R23)
// Die App läuft lokal mit einer Attrappe statt Datenbank (kein Netz, erfundene Namen „Muster“).
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/rollen-test.mjs        (auch in der GitHub-Prüfung)
// Gegenprobe: ROLLEN_SEITE=/tmp/alt/index.html … (alter Stand muss bei „Leitung fährt selbst“ durchfallen)
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
    const start = pfad === "/" || pfad === "/index.html";
    // ROLLEN_SEITE=/pfad/index.html prüft eine andere Fassung (Gegenprobe gegen einen alten Stand)
    const datei = await readFile(start && process.env.ROLLEN_SEITE ? process.env.ROLLEN_SEITE : join(ROOT, start ? "index.html" : pfad));
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" });
    res.end(datei);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

let fehlerZahl = 0, okZahl = 0;
async function pruefe(id, text, fn) {
  let r;
  try { r = await fn(); } catch (e) { r = "Test-Ausnahme: " + String(e.message || e).split("\n")[0]; }
  if (r === undefined || r === null || r === true || (Array.isArray(r) && !r.length)) { okZahl++; console.log(`ok  ${id} ${text}`); return; }
  fehlerZahl++;
  console.log(`FEHLER  ${id} ${text}: ${Array.isArray(r) ? r.join(" · ") : r}`);
}
const warte = (page, ms = 250) => page.waitForTimeout(ms);

const FS = "fs-muster";
// W16: Schalter in startseite.js – erst wenn auf der Büro-Seite nichts mehr fehlt, was das Büro in der App nutzt, hat es nur noch diese Seite (Teil 3)
const NUR_BUERO = /BUERO_NUR_BUEROSEITE\s*=\s*true/.test(await readFile(join(ROOT, "startseite.js"), "utf8"));
// wahl: Startseiten in den Einstellungen (erste = Vorgabe). zumBuero: die App leitet gleich zu buero.html weiter (W16).
// kurz: nur Start, Menü und Startseite prüfen (Sonderfälle). nurHoch: nur am Handy hoch.
const ROLLEN = [
  { n: "Fahrlehrer", prof: { rolle: "fahrlehrer" }, eigen: true, wahl: [] },
  { n: "Fahrlehrer ohne App", prof: { rolle: "fahrlehrer", ohne_app: true }, eigen: true, wahl: [], kurz: true, nurHoch: true },
  // K12/K17: Kennzeichen „fährt selbst“ bei einem Fahrlehrer (falsch gesetzt) gibt keine Leitungs-Rechte
  { n: "Fahrlehrer mit faehrt_selbst", prof: { rolle: "fahrlehrer", faehrt_selbst: true }, eigen: true, wahl: [] },
  { n: "Leitung", prof: { rolle: "fahrschule_admin" }, eigen: false, wahl: ["gesamt", "buero"] },
  { n: "Leitung fährt selbst", prof: { rolle: "fahrschule_admin", faehrt_selbst: true }, eigen: true, wahl: ["eigen", "gesamt", "buero"] },
  NUR_BUERO ? { n: "Büro", prof: { rolle: "buero" }, zumBuero: true } : { n: "Büro", prof: { rolle: "buero" }, eigen: false, wahl: [] },
  { n: "Super-Admin", prof: { rolle: "super_admin" }, eigen: true, wahl: ["eigen", "gesamt", "buero"] },
  // Super-Admin ohne Fahrschule: keine „Fahrschule“ als Startseite (die Schul-Wahl bleibt im Büro)
  { n: "Super-Admin ohne Fahrschule", prof: { rolle: "super_admin", fahrschule_id: null }, eigen: true, wahl: ["eigen", "buero"], kurz: true, nurHoch: true },
  // Unbekannte oder leere Rolle: nie weiterleiten, keine Wahl (W13: keine Schleifen)
  { n: "Unbekannte Rolle", prof: { rolle: "" }, eigen: true, wahl: [], kurz: true, nurHoch: true },
  // Gesperrter oder gelöschter Zugang (Fable 21.11.): kommt gar nicht erst hinein
  { n: "Gesperrt", prof: { rolle: "fahrlehrer", aktiv: false }, gesperrt: true },
  { n: "Gelöscht", prof: { rolle: "entfernt", aktiv: false }, gesperrt: true },
];
const GROESSEN = [{ n: "360", w: 360, h: 780 }, { n: "quer", w: 740, h: 360 }];

// Startet die App mit der Attrappe über den echten Anmeldeweg. behalte: gemerkte Startseite (Gerätespeicher) nicht löschen.
// vorher: Code, der vor afterLogin läuft (z. B. Passwort-Link offen). Leitet die App weiter, gibt das die Adresse zurück.
async function starteApp(page, prof, { behalte = false, vorher = "" } = {}) {
  try {
    await page.evaluate(async ({ prof, FS, behalte, vorher }) => {
      for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) e.style.display = "none"; }
      window.__schreib = [];
      const user = { id: "u-ich", email: "ich@example.org" };
      const antwort = (tab, art, einzeln) => {
        if (tab === "fahrschulen" && einzeln) return { data: { id: FS, name: "Fahrschule Muster", aktiv: true, konfiguration: {} }, error: null };
        if (tab === "profiles" && einzeln) return { data: Object.assign({ id: "u-ich", name: "Ich Muster", email: user.email, fahrschule_id: FS, aktiv: true, agb_akzeptiert_version: typeof AGB_VERSION !== "undefined" ? AGB_VERSION : "1.0" }, prof), error: null };
        if (tab === "profiles") return { data: [{ id: "u-ich", name: "Ich Muster", fahrschule_id: FS, aktiv: true, ...prof }, { id: "u-anna", name: "Anna Muster", rolle: "fahrlehrer", fahrschule_id: FS, aktiv: true }], error: null };
        return { data: einzeln ? null : [], error: null, count: 0 };
      };
      const baue = (tab) => {
        const st = { tab, art: "select", einzeln: false, werte: null };
        const q = new Proxy(function () {}, {
          get: (_t, k) => {
            if (k === "then") return (ok, nein) => {
              if (st.art !== "select") window.__schreib.push({ tab: st.tab, art: st.art, werte: st.werte });
              return Promise.resolve(st.art === "select" ? antwort(st.tab, st.art, st.einzeln) : { data: Array.isArray(st.werte) ? st.werte : (st.werte ? [st.werte] : []), error: null }).then(ok, nein);
            };
            if (k === "single" || k === "maybeSingle") return () => { st.einzeln = true; return q; };
            if (["insert", "upsert", "update", "delete"].includes(k)) return (w) => { st.art = k; st.werte = w; return q; };
            return () => q;
          },
          apply: () => q,
        });
        return q;
      };
      const auth = { getUser: async () => ({ data: { user }, error: null }), getSession: async () => ({ data: { session: { user, access_token: "x" } }, error: null }), signOut: async () => ({ error: null }), updateUser: async () => ({ data: { user }, error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) };
      const supa = { from: baue, rpc: async () => ({ data: null, error: null }), auth, functions: { invoke: async () => ({ data: {}, error: null }) }, channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel() {} };
      window.getSupa = () => supa;
      // Gerätespeicher gehört diesem Konto (wie nach einer echten Anmeldung), sonst startet die App zum Schutz neu
      try { const ks = localStorage.getItem("kompass-startseite"); localStorage.clear(); if (behalte && ks) localStorage.setItem("kompass-startseite", ks); localStorage.setItem(OWNER_KEY, user.id); } catch (e) {}
      _dbEigentuemer = user.id;
      ensureDB(); DB.students = []; DB.lessons = []; DB.exams = [];
      if (vorher) (0, eval)(vorher);
      // Der echte Anmeldeweg der App (Profil laden, Sperre, Fahrschule, Menü, Startansicht) – keine Abkürzung
      _authUser = user;
      await afterLogin(user);
    }, { prof, FS, behalte, vorher });
  } catch (e) {
    // Weiterleitung mitten im Aufruf: die Seite ist weg, das ist hier gewollt (W16)
    if (!/context was destroyed|navigation|Target closed|closed/i.test(String(e.message || e))) throw e;
  }
  await warte(page, 800);
  return page.url();
}
const aufBuero = (url) => /buero\.html/.test(url);

for (const R of ROLLEN) {
  for (const g of R.gesperrt || R.nurHoch || R.zumBuero ? GROESSEN.slice(0, 1) : GROESSEN) {
    const ctx = await browser.newContext({ viewport: { width: g.w, height: g.h }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE" });
    const page = await ctx.newPage();
    const jsFehler = [];
    // Fehler zählen nur in der App; nach einer gewollten Weiterleitung lädt buero.html hier ohne Datenbank (W16)
    page.on("pageerror", (e) => { if (!aufBuero(page.url())) jsFehler.push(e.message); });
    let dialogZahl = 0; // K7: Löschen/Stornieren darf keinen Dialog öffnen
    page.on("dialog", (d) => { dialogZahl++; d.dismiss().catch(() => {}); });
    if (process.env.ROLLEN_DEBUG) page.on("console", (m) => { if (m.type() === "warning" || m.type() === "error") console.log("  konsole:", m.text().slice(0, 200)); });
    await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
    await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 });
    await warte(page, 600);
    const P = `[${R.n} ${g.n}]`;
    const url = await starteApp(page, R.prof);
    // W16: Das Büro arbeitet nur auf der Büro-Seite. Die App schickt es nach der Anmeldung gleich dorthin.
    if (R.zumBuero) {
      await pruefe("R20", `${P} App leitet nach der Anmeldung zur Büro-Seite weiter`, () => (aufBuero(url) ? null : "bleibt auf " + url));
      await pruefe("R5", `${P} keine JS-Fehler`, () => jsFehler);
      await ctx.close();
      continue;
    }
    await pruefe("R20", `${P} bleibt in der App (keine Weiterleitung)`, () => (aufBuero(url) ? "zur Büro-Seite weitergeleitet" : null));
    // Die Anmeldemaske ist hier nicht Gegenstand (sie wird über die Attrappe übersprungen)
    const maskeWeg = () => page.evaluate(() => { for (const id of ["loginOverlay", "splash"]) { const e = document.getElementById(id); if (e) { e.classList.add("hidden"); e.style.display = "none"; } } });
    if (R.gesperrt) {
      await pruefe("R0", `${P} kommt nicht hinein, sieht die Sperr-Meldung`, () => page.evaluate(() => {
        const err = (document.getElementById("loErr") || {}).textContent || "";
        return !_authUser && /gesperrt/i.test(err) ? null : "angemeldet=" + !!_authUser + " Meldung: " + String(err).slice(0, 80);
      }));
      await pruefe("R5", `${P} keine JS-Fehler`, () => jsFehler);
      await ctx.close();
      continue;
    }
    await maskeWeg();
    // K10 (Fable 22.11.): direkt nach der Anmeldung kein Zurück-Pfeil (es gibt keine vorige Seite) – in jeder Rolle
    const pfeilStart = await page.evaluate(() => { const b = document.getElementById("navBackBtn"); return !!b && !b.hidden; });
    await pruefe("R10", `${P} beim Start kein Zurück-Pfeil (keine tote Taste)`, async () => (pfeilStart ? "Pfeil sichtbar, Stapel: " + (await page.evaluate(() => _navStack.map((x) => x.name + (x.agg ? "*" : "")).join(" > "))) : null));

    await pruefe("R1", `${P} Startansicht: ${R.eigen ? "eigene Fahrlehrer-Ansicht" : "Gesamtansicht der Fahrschule"}`, () => page.evaluate(() => (_fsAgg ? "gesamt" : "eigen")).then((v) => (v === (R.eigen ? "eigen" : "gesamt") ? null : "ist " + v)));
    // W16: kein Umschalter im Menü und kein Streifen oben mehr; gewechselt wird nur in den Einstellungen (Startseite)
    await pruefe("R2", `${P} kein Umschalter im Menü, kein Streifen oben`, () => page.evaluate(() => {
      const f = [];
      if (/Admin-Gesamtübersicht|Zu meiner Fahrlehrer-Ansicht/.test(document.querySelector(".drawer-nav").textContent)) f.push("Umschalter im Menü");
      if (document.querySelector('#drawer [data-nav="__fstoggle"], #drawer [data-nav="fs_exit"]')) f.push("Umschalt-Knopf im Menü");
      const st = document.getElementById("saStreifen"); if (st && !st.hidden) f.push("Streifen oben sichtbar");
      return f;
    }));
    // W16: Startseite in den Einstellungen (in der Gesamtansicht über „Einstellungen“ im Menü)
    const startseite = () => page.evaluate(async () => {
      if (_fsAgg) {
        openDrawer(); const b = document.querySelector('#drawer [data-nav="settings"]');
        if (!b) { closeDrawer(); return { keinMenue: true, werte: [], an: [], minH: 0, agg: true }; }
        b.click(); await new Promise((r) => setTimeout(r, 450));
      } else routeSettings();
      const k = [...document.querySelectorAll("#ksStartKasten [data-ks-start]")];
      return { werte: k.map((b) => b.dataset.ksStart), an: k.filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.dataset.ksStart),
        minH: k.length ? Math.min(...k.map((b) => b.getBoundingClientRect().height)) : 0, agg: !!_fsAgg };
    });
    await maskeWeg();
    const sw = await startseite();
    await pruefe("R6", `${P} Einstellungen › Startseite: ${R.wahl.length ? R.wahl.join(" / ") : "keine Wahl"}`, () => {
      const f = [];
      if (sw.keinMenue && R.wahl.length) f.push("„Einstellungen“ fehlt im Menü der Gesamtansicht");
      if (sw.werte.join() !== R.wahl.join()) f.push("Wahl: " + (sw.werte.join(" / ") || "keine"));
      if (R.wahl.length && sw.an.join() !== R.wahl[0]) f.push("markiert: " + (sw.an.join() || "nichts"));
      if (R.wahl.length && sw.minH < 43.5) f.push("Knopf nur " + Math.round(sw.minH) + " px hoch");
      return f;
    });
    // Verlauf wie nach dem Start (die Prüfung oben hat nur nachgesehen; sonst führte ein späteres Zurück in die Einstellungen)
    await page.evaluate(() => { try { _navStack.length = 0; if (_fsAgg) routeFahrschuleDashboard(); else routeDashboard(); } catch (e) {} });

    // K12/K17/K13 (Werkstatt 12): Gesamtübersicht und Büro-Seite nur für Büro, Leitung, Super-Admin; Abmelden unter „Mehr“
    const darfGesamt = ["fahrschule_admin", "buero", "super_admin"].includes(R.prof.rolle);
    const gesamtWeg = !R.eigen || R.wahl.includes("gesamt"); // W16: Weg in die Gesamtübersicht = Startseite in den Einstellungen
    const sichtbar = (sel) => page.evaluate((q) => [...document.querySelectorAll(q)].filter((e) => !e.closest("#loginOverlay") && getComputedStyle(e).display !== "none" && !e.closest("[hidden]")).length, sel);
    const GESAMT_SEL = '#drawer [data-nav="__fstoggle"], #drawer [data-nav="fs_dash"], #drawer [data-nav="fs_exit"], #saStreifen:not([hidden])';
    const BUERO_SEL = '#drawer a[href="buero.html"], a.fs-buero-link, #fsBueroLink';
    await maskeWeg();
    await pruefe("R15", `${P} Weg in die Gesamtübersicht ${gesamtWeg ? "da (Startseite)" : darfGesamt ? "–" : "nicht da"}`, async () => {
      const n = await sichtbar(GESAMT_SEL);
      const menueText = await page.evaluate(() => (document.querySelector(".drawer-nav") || {}).textContent || "");
      const f = [];
      if (gesamtWeg && !sw.agg && !sw.werte.includes("gesamt")) f.push("kein Weg in die Gesamtübersicht");
      if (!darfGesamt && (n || /Übersicht|Büro/.test(menueText))) f.push("Fahrlehrer sieht Gesamtübersicht/Büro im Menü: " + menueText.replace(/\s+/g, " ").slice(0, 120));
      return f;
    });
    if (R.kurz) {
      await pruefe("R5", `${P} keine JS-Fehler`, () => jsFehler);
      await ctx.close();
      continue;
    }
    await pruefe("R16", `${P} Knopf „Büro“ (Büro-Seite) ${darfGesamt ? "erreichbar" : "nirgends"}`, async () => {
      const f = [];
      if (!darfGesamt) {
        if (await sichtbar(BUERO_SEL)) f.push("Büro-Knopf sichtbar");
        const r = await page.evaluate(async () => { const a = await _fsEnterAggMode("fs-muster"); try { await _fsZurBueroSeite(null); } catch (e) {} return { a, agg: !!_fsAgg, href: location.pathname }; });
        if (r.a !== false || r.agg) f.push("Gesamtansicht per Funktion geöffnet");
        if (/buero\.html/.test(r.href)) f.push("Büro-Seite per Funktion geöffnet");
        if (await sichtbar(BUERO_SEL)) f.push("Büro-Knopf nach Versuch sichtbar");
      } else {
        await page.evaluate(async () => { if (!_fsAgg) await _fsEnterAggMode((_authProfile && _authProfile.fahrschule_id) || "fs-muster"); }); await warte(page, 600);
        const d = await page.evaluate(() => { openDrawer(); const n = document.querySelectorAll('#drawer a[href="buero.html"]').length; closeDrawer(); return { n, dash: !!document.getElementById("fsBueroLink") }; });
        if (!d.n) f.push("Büro-Seite am PC fehlt im Menü");
        if (!d.dash) f.push("„Zur Büro-Seite“ fehlt auf der Übersicht");
        await page.evaluate(async () => { if (_hatAdminUmschalter() && _fsAgg) await _fsExitAggMode(); }); await warte(page, 500);
      }
      return f;
    });
    // W14 (24.11.2026): Urlaub trägt die Gesamtansicht per Blatt ein (Person aus der Liste), gespeichert mit Fahrlehrer-ID
    if (darfGesamt) await pruefe("R19", `${P} W14 Urlaub eintragen: Person aus der Liste, mit Fahrlehrer-ID, ohne Eingabefenster`, async () => {
      const f = [];
      await page.evaluate(async () => { if (!_fsAgg) await _fsEnterAggMode((_authProfile && _authProfile.fahrschule_id) || "fs-muster"); }); await warte(page, 600);
      const vorher = dialogZahl;
      await page.evaluate(() => { window.__schreib = []; routeFahrschuleUrlaub(); fsUrlaubHinzufuegen(); }); await warte(page, 500);
      const opt = await page.evaluate(() => [...document.querySelectorAll("#urWer option")].map((o) => o.value));
      if (!opt.includes("u-anna")) f.push("Fahrlehrerin fehlt in der Auswahl: " + opt.join(","));
      const knopf = await page.evaluate(() => { const b = document.getElementById("urSpeichern"); const r = b && b.getBoundingClientRect(); return r ? r.height : 0; });
      if (knopf < 43.5) f.push("Knopf „Eintragen“ nur " + knopf + " px hoch");
      await page.evaluate(() => { const w = document.getElementById("urWer"); w.value = "u-anna"; w.dispatchEvent(new Event("change")); document.getElementById("urSpeichern").click(); }); await warte(page, 600);
      const ins = await page.evaluate(() => window.__schreib.filter((x) => x.tab === "fahrschule_urlaub" && x.art === "insert").map((x) => x.werte));
      if (ins.length !== 1 || ins[0].fahrlehrer_id !== "u-anna" || ins[0].mitarbeiter_name !== "Anna Muster") f.push("Eintrag falsch: " + JSON.stringify(ins));
      if (dialogZahl !== vorher) f.push("Eingabefenster (prompt) geöffnet");
      await page.evaluate(async () => { try { closeSheet(); } catch (e) {} if (_hatAdminUmschalter() && _fsAgg) await _fsExitAggMode(); }); await warte(page, 500);
      return f;
    });
    if (!darfGesamt) {
      await pruefe("R17", `${P} #fs_dash und eingeschleuster Menüpunkt öffnen nichts`, async () => {
        const f = [];
        const vorher = await page.evaluate(() => (view.firstElementChild || {}).className + "|" + $("#tbTitle").textContent);
        await page.evaluate(() => { location.hash = "#fs_dash"; routeFahrschuleDashboard(); routeFahrschuleLehrer(); routeFahrschuleFahrzeuge(); routeFahrschuleStatistik(); });
        await page.evaluate(() => { const b = document.createElement("button"); b.className = "nav-item"; b.dataset.nav = "fs_dash"; b.id = "fakeFs"; document.querySelector(".drawer-nav").appendChild(b); b.click(); }); await warte(page, 500);
        const nachher = await page.evaluate(() => (view.firstElementChild || {}).className + "|" + $("#tbTitle").textContent + "|" + !!_fsAgg);
        if (/true$/.test(nachher)) f.push("Gesamtansicht offen");
        if (nachher.replace(/\|(true|false)$/, "") !== vorher) f.push("Ansicht hat gewechselt: " + vorher + " → " + nachher);
        await page.evaluate(() => { document.getElementById("fakeFs")?.remove(); location.hash = ""; });
        return f;
      });
    }
    await pruefe("R18", `${P} „Abmelden“ ganz unten unter „Mehr“, nicht in den Einstellungen`, async () => {
      const f = [];
      await page.evaluate(() => openDrawer()); await warte(page, 600);
      const d = await page.evaluate(() => {
        const b = document.getElementById("drawerLogoutBtn"), nav = document.querySelector(".drawer-nav");
        const r = b ? b.getBoundingClientRect() : null, nr = nav.getBoundingClientRect();
        const frei = r && r.width > 0 && r.top >= 0 && r.bottom <= innerHeight + 1 && (() => { const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return e && (e === b || b.contains(e)); })();
        const o = { da: !!r && r.height > 0, frei: !!frei, unterNav: !!r && r.top >= nr.bottom - 1, nachNav: !!b && !!(nav.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING), imNav: !!nav.querySelector("[onclick*='doLogout']"), h: r ? Math.round(r.height) : 0 };
        closeDrawer(); routeSettings();
        o.einst = /Abmelden/.test(view.textContent) || !!view.querySelector("[onclick*='doLogout']");
        return o;
      });
      if (!d.da) f.push("Abmelden im Menü nicht sichtbar");
      else { if (!d.frei) f.push("Abmelden verdeckt oder außerhalb des Bildschirms"); if (!d.nachNav || !d.unterNav) f.push("Abmelden steht nicht unter den Menüpunkten"); if (d.h < 43.5) f.push("nur " + d.h + " px hoch"); }
      if (d.imNav) f.push("Abmelden doppelt im Menü");
      if (d.einst) f.push("Abmelden steht noch in den Einstellungen");
      return f;
    });
    await page.evaluate(() => { try { routeDashboard(); } catch (e) {} });

    // Reiter „Schüler“: Knopf zum Anlegen sichtbar
    await page.evaluate(() => tabGo("schueler")); await warte(page, 400);
    // Ein Knopf zählt nur, wenn er ganz zu sehen ist und nichts darüber liegt (Mitte und beide Enden wirklich antippbar)
    const knopf = await page.evaluate(() => {
      const frei = (b) => {
        const r = b.getBoundingClientRect();
        if (getComputedStyle(b).display === "none" || r.height <= 0 || r.top < 0 || r.bottom > innerHeight + 1) return false;
        return [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 6, r.top + r.height / 2], [r.right - 6, r.top + r.height / 2]].every(([x, y]) => { const e = document.elementFromPoint(x, y); return e && (e === b || b.contains(e)); });
      };
      const kand = [document.getElementById("emptyAdd"), document.getElementById("fab")].filter(Boolean);
      const b = kand.find(frei); if (!b) return { keiner: kand.filter((x) => getComputedStyle(x).display !== "none").map((x) => x.id).join(",") || "–" };
      return { id: b.id, h: Math.round(b.getBoundingClientRect().height) };
    });
    await pruefe("R3", `${P} Reiter „Schüler“ hat einen freien, antippbaren Knopf zum Anlegen`, () => (knopf.keiner ? "kein Knopf frei (verdeckt oder außerhalb): " + knopf.keiner : knopf.h < 43.5 ? `nur ${knopf.h} px hoch` : null));

    // Schüler anlegen und speichern
    if (knopf && knopf.id) {
      await maskeWeg();
      await page.click("#" + knopf.id, { timeout: 5000 }); await warte(page, 400);
      await page.fill("#f_name", "Rollen Muster");
      await page.evaluate(() => { window.__schreib = []; });
      await page.click("#saveBtn"); await warte(page, 300);
      await page.evaluate(() => { try { closeSheet(); } catch (e) {} });
      // Eigene Ansicht: Abgleich nach ~4 s; Gesamtansicht: Speichern nach kurzer Pause
      await page.waitForFunction(() => window.__schreib.some((x) => x.tab === "schueler" && x.art === "upsert"), null, { timeout: 15000 }).catch(() => {});
      await pruefe("R4", `${P} neuer Schüler landet in der Datenbank${R.eigen ? " beim eigenen Fahrlehrer" : ""}`, () => page.evaluate((eigen) => {
        const z = window.__schreib.filter((x) => x.tab === "schueler" && x.art === "upsert").flatMap((x) => (Array.isArray(x.werte) ? x.werte : [x.werte]));
        const s = z.find((r) => r && r.name === "Rollen Muster");
        if (!s) return "nicht geschrieben (" + window.__schreib.map((x) => x.tab + ":" + x.art).join(", ") + ")";
        if (eigen && s.fahrlehrer_id !== "u-ich") return "falscher Fahrlehrer: " + s.fahrlehrer_id;
        return null;
      }, R.eigen));
    }
    // K3 (22.11.2026): Menüpunkt „Buchungs-QR fürs Auto“ nur mit eigenem Buchungslink und nur in der eigenen Ansicht
    // (Fahrlehrer, fahrende Leitung, Super-Admin); Leitung ohne Fahren und Büro haben ihn nie.
    await maskeWeg();
    const bq = await page.evaluate(() => {
      document.getElementById("bueroNotizPopup")?.remove();
      const blick = () => { openDrawer(); const b = [...document.querySelectorAll('#drawer [data-nav="buchqr"]')].filter((x) => getComputedStyle(x).display !== "none" && x.getBoundingClientRect().height > 0).length; closeDrawer(); return b; };
      const alt = _authProfile.slug; _authProfile.slug = null; const ohne = blick();
      _authProfile.slug = "ich-muster"; const mit = blick(); _authProfile.slug = alt;
      return { ohne, mit };
    });
    await pruefe("R9", `${P} Menüpunkt „Buchungs-QR fürs Auto“: ohne Buchungslink weg, mit Link ${R.eigen ? "sichtbar" : "nicht da"}`, () => {
      const f = [];
      if (bq.ohne) f.push("ohne Link sichtbar");
      if (R.eigen && bq.mit !== 1) f.push(`mit Link ${bq.mit}× sichtbar statt 1×`);
      if (!R.eigen && bq.mit) f.push("mit Link sichtbar, obwohl Gesamtansicht");
      return f.length ? f : null;
    });
    // W16: Leitung, die selbst fährt, und Super-Admin wechseln über die Startseite in den Einstellungen (statt Streifen und Menü)
    if (R.wahl.includes("eigen") && R.wahl.includes("gesamt")) {
      await maskeWeg();
      // Abbruch (z. B. ungespeicherte Eingabe, „Seite verlassen?“ verneint) → die alte Startseite bleibt, keine Weiterleitung
      await page.evaluate(() => { try { closeSheet(); } catch (e) {} routeSettings(); window.__svo = window._seiteVerlassenOk; window._seiteVerlassenOk = () => false; }); await warte(page, 300);
      await page.click('#ksStartKasten [data-ks-start="buero"]', { timeout: 5000 }).catch(() => {}); await warte(page, 700);
      await pruefe("R24", `${P} Wechsel abgebrochen → alte Startseite bleibt, keine Weiterleitung`, () => page.evaluate(() => {
        const f = [];
        if (/buero\.html/.test(location.pathname)) f.push("doch weitergeleitet");
        if (KS_START.lesen(_authProfile) !== "eigen") f.push("gemerkt: " + KS_START.lesen(_authProfile));
        const an = [...document.querySelectorAll('#ksStartKasten [aria-pressed="true"]')].map((b) => b.dataset.ksStart).join();
        if (an !== "eigen") f.push("markiert: " + an);
        window._seiteVerlassenOk = window.__svo;
        return f;
      }));
      // R25 (Daten-Prüfer): Schüler anlegen und sofort „Büro-Seite“ wählen → der Schüler ist oben, bevor die Seite wechselt
      if (g.n === "360") {
        await maskeWeg();
        await page.evaluate(() => { try { closeSheet(); } catch (e) {} routeSchuelerForm(null); }); await warte(page, 400);
        await page.fill("#f_name", "Bruecke Muster");
        await page.evaluate(() => { window.__schreib = []; });
        await page.click("#saveBtn"); await warte(page, 150);
        await page.evaluate(() => { try { closeSheet(); } catch (e) {} window.__gehe = null; window.__geheAlt = KS_START.gehe;
          KS_START.gehe = (n) => { window.__gehe = { n, schueler: window.__schreib.some((x) => x.tab === "schueler" && x.art === "upsert" && JSON.stringify(x.werte).includes("Bruecke Muster")) }; };
          routeSettings(); });
        await warte(page, 200);
        await page.click('#ksStartKasten [data-ks-start="buero"]', { timeout: 5000 }).catch(() => {});
        await page.waitForFunction(() => window.__gehe, null, { timeout: 12000 }).catch(() => {});
        await pruefe("R25", `${P} neuer Schüler, sofort „Büro-Seite“: erst hochgeladen, dann gewechselt`, () => page.evaluate(() => {
          const g = window.__gehe; KS_START.gehe = window.__geheAlt; KS_START.setzen(_authProfile, "eigen");
          return !g ? "nicht gewechselt" : g.n !== "buero" ? "Ziel " + g.n : g.schueler ? null : "Schüler beim Wechsel noch nicht auf dem Server";
        }));
      }
      await page.evaluate(() => routeSettings()); await warte(page, 300);
      await page.click('#ksStartKasten [data-ks-start="gesamt"]', { timeout: 5000 }).catch(() => {}); await warte(page, 1000);
      await pruefe("R7", `${P} Startseite „Fahrschule“ antippen → ganze Fahrschule, gemerkt`, () => page.evaluate(() => {
        const f = [];
        if (!_fsAgg) f.push("nicht in der Gesamtansicht");
        if (KS_START.lesen(_authProfile) !== "gesamt") f.push("gemerkt: " + KS_START.lesen(_authProfile));
        if (/Zu meiner Fahrlehrer-Ansicht|Admin-Gesamtübersicht/.test(document.querySelector(".drawer-nav").textContent)) f.push("Umschalter im Menü der Gesamtansicht");
        // Super-Admin: Admin-Panel auch in den Einstellungen der Gesamtansicht (ohne die Startseite umzustellen)
        if (isSuperAdmin()) { routeSettings(); if (!view.querySelector('[onclick="openAdminPanel()"]')) f.push("Admin-Panel fehlt in den Einstellungen der Gesamtansicht"); }
        return f;
      }));
      await page.evaluate(() => openDrawer()); await warte(page, 350);
      await page.click('#drawer [data-nav="settings"]', { timeout: 5000 }).catch(() => {}); await warte(page, 600);
      await page.click('#ksStartKasten [data-ks-start="eigen"]', { timeout: 5000 }).catch(() => {}); await warte(page, 1000);
      await pruefe("R8", `${P} Gesamtansicht › Menü › Einstellungen › „Fahrlehrer-Ansicht“ → zurück zu den eigenen Schülern, gemerkt`, () => page.evaluate(() => (!_fsAgg && KS_START.lesen(_authProfile) === "eigen" ? null : "ist " + (_fsAgg ? "gesamt" : "eigen") + ", gemerkt " + KS_START.lesen(_authProfile))));
      await pruefe("R11", `${P} nach dem Umschalten nur Zurück-Einträge der aktuellen Ansicht (kein toter Pfeil)`, () => page.evaluate(() => { const a = !!_fsAgg; const fremd = _navStack.filter((x) => x.agg !== undefined && x.agg !== a).length; return fremd ? fremd + " Einträge der anderen Ansicht" : null; }));
    }
    // K7 (22.11.2026): in der eigenen Ansicht wird eine gelaufene Stunde nicht gelöscht, sondern storniert (mit Grund), ohne Dialog
    if (R.eigen) {
      await maskeWeg();
      await pruefe("R12", `${P} gelaufene Stunde: „Stornieren“ statt „Termin löschen“, Grund wählen, ohne Dialog`, async () => {
        const f = []; const d0 = dialogZahl;
        await page.evaluate(() => {
          closeSheet(); ensureAusbildungsplaene(); const c = DB.ausbildungsplaene.find((x) => x.standard) || DB.ausbildungsplaene[0];
          const g = new Date(Date.now() - 864e5), iso = g.getFullYear() + "-" + String(g.getMonth() + 1).padStart(2, "0") + "-" + String(g.getDate()).padStart(2, "0");
          DB.students = [{ id: "stk1", name: "Storno Muster", form: "B", created: Date.now(), plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)), telefon: "", todos: [] }];
          DB.lessons = [{ id: "stl1", sid: "stk1", date: iso, von: "10:00", bis: "11:30", art: "fahrstunde", name: "", status: "geplant", note: "", fc: null }];
          openEventSheet("lesson", "stl1", "stk1");
        });
        await warte(page, 350);
        const k = await page.evaluate(() => (document.getElementById("esDelete") || {}).textContent);
        if ((k || "").trim() !== "Stornieren") f.push("Knopf heißt „" + (k || "").trim() + "“");
        await page.click("#esDelete", { timeout: 4000 }); await warte(page, 450);
        const so = await page.evaluate(() => ({ g: document.querySelectorAll("[data-stogrund]").length, t: !!document.getElementById("stoText"), noch: DB.lessons.some((l) => l.id === "stl1") }));
        if (so.g !== 3 || !so.t) f.push("Storno-Fenster unvollständig (" + so.g + " Grund-Knöpfe)");
        if (!so.noch) f.push("Stunde schon vor der Grund-Wahl weg");
        await page.click('[data-stogrund="0"]', { timeout: 4000 }); await warte(page, 400);
        const nach = await page.evaluate(() => { let o = {}; try { o = JSON.parse(localStorage.getItem("kompass-storno-offen") || "{}"); } catch (e) {} return { weg: !DB.lessons.some((l) => l.id === "stl1"), grund: o.stl1 && o.stl1.grund }; });
        if (!nach.weg) f.push("Stunde nach dem Stornieren noch da");
        if (nach.grund !== "Falsch eingetragen") f.push("Grund nicht gemerkt: " + nach.grund);
        if (dialogZahl !== d0) f.push("Dialog erschienen");
        return f;
      });
    }
    // K8 (23.11.2026): „Zahlung ausstehend“. Fahrlehrer und Leitung sehen am bestehenden künftigen Termin einen Hinweis und
    // können für den Schüler keinen neuen Termin anlegen; die Büro-Knöpfe gibt es in der App nirgends.
    await maskeWeg();
    const k8 = await page.evaluate(() => {
      try { closeSheet(); } catch (e) {}
      const iso = KR.addDaysISO(todayISO(), 1);
      ensureAusbildungsplaene();
      const c = DB.ausbildungsplaene.find((p) => p.standard) || DB.ausbildungsplaene[0];
      const mk = (id, name) => { const st = { id, name, form: "B", created: Date.now(), plan: newPlan(), planId: c.id, planSnapshot: JSON.parse(JSON.stringify(c.stufen)), telefon: "" }; ensure(st); return st; };
      DB.students = [mk("s-zahl", "Zahl Muster"), mk("s-frei", "Frei Muster")];
      const fl = _fsAgg ? { _fahrlehrerId: "u-anna", _fahrlehrerName: "Anna Muster" } : {};
      DB.lessons = [Object.assign({ id: "L-zahl", date: iso, von: "09:00", bis: "10:30", art: "fahrstunde", sid: "s-zahl", name: "", status: "geplant", note: "", fc: null }, fl),
        Object.assign({ id: "L-frei", date: iso, von: "11:00", bis: "12:30", art: "fahrstunde", sid: "s-frei", name: "", status: "geplant", note: "", fc: null }, fl)];
      _merkeFristen([{ id: "s-zahl", zahlung_gesperrt_seit: "2026-11-20T09:00:00Z", zahlung_gesperrt_grund: "Rechnung offen" }]);
      if (_fsAgg) _fsCalLehrerFilter = ["u-anna"];
      _calView = "woche"; _calDate = iso; routeKalender();
      const ev = (id) => { const e = document.querySelector(`[data-evedit^="lesson|${id}|"]`); return e ? e.querySelector("[data-zahlung-hinweis]") !== null : null; };
      const r = { gesperrt: _zahlungGesperrt("s-zahl"), frei: _zahlungGesperrt("s-frei"), hinweisZahl: ev("L-zahl"), hinweisFrei: ev("L-frei"),
        stoppZahl: _zahlungStopp("s-zahl", iso, "fahrstunde"), stoppFrei: _zahlungStopp("s-frei", iso, "fahrstunde"), toast: document.getElementById("toast").textContent,
        buero: document.querySelectorAll("[data-zsperre],[data-zbezahlt],[data-zreakt],[data-zahlungpill]").length };
      return r;
    });
    await pruefe("R14", `${P} K8: Hinweis „Zahlung ausstehend“ am Termin des gesperrten Schülers, neuer Termin geblockt, keine Büro-Knöpfe in der App`, () => {
      const f = [];
      if (!k8.gesperrt || k8.frei) f.push(`Sperre: gesperrt=${k8.gesperrt} frei=${k8.frei}`);
      if (k8.hinweisZahl !== true) f.push("kein Hinweis am Termin (" + k8.hinweisZahl + ")");
      if (k8.hinweisFrei !== false) f.push("Hinweis am freien Schüler (" + k8.hinweisFrei + ")");
      if (k8.stoppZahl !== true || !/Zahlung ausstehend/.test(k8.toast)) f.push("neuer Termin nicht geblockt: " + k8.stoppZahl + " · " + k8.toast);
      if (k8.stoppFrei !== false) f.push("freier Schüler geblockt");
      if (k8.buero) f.push(k8.buero + " Büro-Knöpfe in der App");
      return f;
    });
    // W16: Die Startseite bleibt nach einem Neustart (je Gerät und Konto); ein Wert, der nicht zur Rolle passt, gilt nicht
    if (R.wahl.length > 1 && g.n === "360") {
      const faelle = R.wahl.slice(1).concat(R.eigen ? [] : ["eigen"]).sort((x, y) => (x === "buero") - (y === "buero"));
      for (const w of faelle) {
        await page.evaluate((w) => { localStorage.setItem("kompass-startseite", JSON.stringify({ "u-ich": w })); sessionStorage.clear(); }, w);
        await page.reload({ waitUntil: "load" }); await warte(page, 600);
        const u = await starteApp(page, R.prof, { behalte: true });
        const erwartet = R.wahl.includes(w) ? w : R.wahl[0];
        const ist = aufBuero(u) ? "buero" : await page.evaluate(() => (_fsAgg ? "gesamt" : "eigen"));
        await pruefe("R21", `${P} Startseite „${w}“ gemerkt → nach Neustart ${erwartet === "buero" ? "Büro-Seite" : erwartet === "gesamt" ? "Gesamtansicht" : "eigene Ansicht"}`, () => (ist === erwartet ? null : "ist " + ist));
      }
    }
    await pruefe("R5", `${P} keine JS-Fehler`, () => jsFehler);
    await ctx.close();
  }
}

// R22 (W16): keine Weiterleitungs-Schleife, Passwort-Link, Offline-Start
{
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE" });
  const page = await ctx.newPage();
  const jsFehler = [];
  page.on("pageerror", (e) => { if (!aufBuero(page.url())) jsFehler.push(e.message); });
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  const neu = async () => { await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 }); await warte(page, 600); };
  // Leitung mit der Startseite „Büro-Seite“ (dieselbe Weiterleitung wie später für die Rolle Büro)
  const LEITUNG = { rolle: "fahrschule_admin" };
  const merkeBuero = () => page.evaluate(() => localStorage.setItem("kompass-startseite", JSON.stringify({ "u-ich": "buero" })));
  // a) Die Büro-Seite hat in diesem Tab eben erst hierher geschickt → die App leitet nicht zurück (wie früher: Gesamtansicht)
  await neu();
  await merkeBuero();
  await page.evaluate(() => sessionStorage.setItem("kompass-weiterleitung", JSON.stringify({ nach: "app", t: Date.now() })));
  let u = await starteApp(page, LEITUNG, { behalte: true });
  await pruefe("R22", "[Leitung, Startseite Büro] eben von der Büro-Seite gekommen → keine Schleife, App zeigt die Gesamtansicht", async () => (aufBuero(u) ? "wieder weitergeleitet" : (await page.evaluate(() => !!_fsAgg)) ? null : "keine Gesamtansicht"));
  // b) Passwort-Link offen → erst das neue Passwort, dann zur Büro-Seite
  await neu();
  await merkeBuero();
  await page.evaluate(() => sessionStorage.clear());
  u = await starteApp(page, LEITUNG, { behalte: true, vorher: "_startWeiterWartet = true;" });
  await pruefe("R22", "[Leitung, Startseite Büro] Passwort-Link offen → bleibt, bis das neue Passwort gespeichert ist", () => (aufBuero(u) ? "zu früh weitergeleitet" : null));
  if (!aufBuero(u)) {
    await page.evaluate(() => { try { closeSheet(); } catch (e) {} _openNeuesPasswortSheet(); }); await warte(page, 400);
    await page.fill("#npwNeu", "Muster-1234"); await page.fill("#npwWdh", "Muster-1234");
    await page.click("#npwSave");
    const weiter = await page.waitForURL(/buero\.html/, { timeout: 8000 }).then(() => true).catch(() => false);
    await pruefe("R22", "[Leitung, Startseite Büro] nach dem neuen Passwort → Büro-Seite", () => (weiter ? null : "bleibt auf " + page.url()));
  }
  // d) Bedienungs-Prüfer: nach dem Sprung zur Büro-Seite führt „Zurück“ in die App, und die darf nicht wieder wegschicken
  await neu();
  await merkeBuero();
  await page.evaluate(() => { sessionStorage.clear(); history.pushState({ w16: 1 }, ""); }); // ein Eintrag davor wie in der echten App
  u = await starteApp(page, LEITUNG, { behalte: true });
  if (aufBuero(u)) {
    await page.goBack({ waitUntil: "load" }).catch(() => {}); await warte(page, 500);
    const art = await page.evaluate(() => { try { return performance.getEntriesByType("navigation")[0].type; } catch (e) { return "?"; } }).catch(() => "?");
    // Neu geladen (kein Zwischenspeicher des Browsers): die App meldet sich an wie beim echten Start
    const u2 = art === "back_forward" && !aufBuero(page.url()) ? await starteApp(page, LEITUNG, { behalte: true }) : page.url();
    await warte(page, 600);
    await pruefe("R22", "[Leitung, Startseite Büro] Zurück von der Büro-Seite → bleibt in der App (keine Schleife)", () => (!aufBuero(u2) && !aufBuero(page.url()) ? null : "wieder zur Büro-Seite (" + art + ")"));
  } else await pruefe("R22", "[Leitung, Startseite Büro] Weiterleitung für den Zurück-Test", () => "nicht weitergeleitet: " + u);
  // c) Offline-Start der PWA: die Rolle ist unbekannt → nie weiterleiten
  await neu();
  const off = await page.evaluate(async () => {
    localStorage.clear();
    localStorage.setItem("sb-oectrvkjunntzsggyhxv-auth-token", JSON.stringify({ refresh_token: "x", user: { id: "u-off", email: "off@example.org" } }));
    localStorage.setItem(OWNER_KEY, "u-off");
    localStorage.setItem("kompass-profil-cache", JSON.stringify({ id: "u-off", rolle: "buero", aktiv: true }));
    window._bioVerifyOnUnlock = async () => true;
    const ok = await _tryOfflineSession();
    return { ok, ziel: _startZiel() };
  });
  await warte(page, 800);
  await pruefe("R22", "[Büro im Zwischenspeicher] Offline-Start: Rolle unbekannt → keine Weiterleitung", () => (off.ok && off.ziel === null && !aufBuero(page.url()) ? null : JSON.stringify(off) + " " + page.url()));
  await pruefe("R5", "[R22] keine JS-Fehler", () => jsFehler);
  await ctx.close();
}

// R26 (W16, Richter): Startseite „Büro-Seite“ mit eigenem Stand (Leitung, die selbst fährt). Erst alles hochladen
// (auch die Fragebogen-Kopie), nie wegschicken, während jemand etwas eingibt; nach dem neuen Passwort derselbe Weg.
{
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, timezoneId: "Europe/Berlin", locale: "de-DE" });
  const page = await ctx.newPage();
  const jsFehler = [];
  page.on("pageerror", (e) => { if (!aufBuero(page.url())) jsFehler.push(e.message); });
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  await page.route("**/*", (r) => (r.request().url().startsWith(basis) ? r.continue() : r.abort()));
  const FAEHRT = { rolle: "fahrschule_admin", faehrt_selbst: true };
  // Vor dem Anmelden: Startseite merken, Weiterleitung nur aufzeichnen (die Seite bleibt zum Nachsehen), Hinweise mitschreiben.
  // pushMs: eigener Stand kommt langsam an. bogen: Fragebogen-Kopie langsam (ms) oder ohne Netz ("netz").
  const lauf = async ({ pushMs = 0, bogen = 0, tippen = false, pw = false } = {}) => {
    await page.goto(basis + "index.html", { waitUntil: "load", timeout: 20000 }); await warte(page, 600);
    await page.evaluate(() => { sessionStorage.clear(); localStorage.setItem("kompass-startseite", JSON.stringify({ "u-ich": "buero" })); });
    const vorher = `
      window.__toasts = []; const t0 = toast; toast = (m, ...a) => { window.__toasts.push(String(m)); return t0(m, ...a); };
      window.__push = 0; const p0 = pushToCloud; pushToCloud = (...a) => { window.__push++; return new Promise((r) => setTimeout(() => r(p0(...a)), ${pushMs})); };
      window.__weiter = null; KS_START.weiter = (n) => { window.__weiter = { n, push: window.__push, privat: window.__schreib.some((x) => x.tab === "schueler_privat" && x.art === "upsert") }; return true; };
      DB.students.push({ id: "s-bogen-1", name: "Bogen Muster", bogen: { a: 1 } });
      const s = getSupa(), f0 = s.from;
      s.from = (tab) => { const q = f0(tab); if (tab !== "schueler_privat" || !${JSON.stringify(bogen)}) return q;
        return new Proxy(q, { get: (t, k) => k !== "upsert" ? t[k] : (w, o) => ({ then: (ok, no) => new Promise((r) => setTimeout(r, ${typeof bogen === "number" ? bogen : 300}))
          .then(() => ${JSON.stringify(bogen)} === "netz" ? { data: null, error: { message: "Failed to fetch" } } : q.upsert(w, o)).then(ok, no) }) }); };
      ${pw ? "_startWeiterWartet = true;" : ""}
      ${tippen ? `setTimeout(() => { try { closeSheet(); } catch (e) {} routeSchuelerForm(null);
        setTimeout(() => { const f = document.getElementById("f_name"); if (f) { f.focus(); f.value = "Tipp Muster"; f.dispatchEvent(new Event("input", { bubbles: true })); } }, 150); }, 300);` : ""}`;
    await starteApp(page, FAEHRT, { behalte: true, vorher });
    await warte(page, 600);
    return page.evaluate(() => ({ weiter: window.__weiter, toasts: window.__toasts, name: (document.getElementById("f_name") || {}).value || "", geaendert: _seiteGeaendert }));
  };
  let r = await lauf({ pushMs: 300 });
  await pruefe("R26", "[Leitung fährt selbst, Startseite Büro] Start ohne Eingabe → eigener Stand oben, dann Büro-Seite", () => (r.weiter && r.weiter.n === "buero" && r.weiter.push >= 1 ? null : JSON.stringify(r)));
  r = await lauf({ pushMs: 1500, tippen: true });
  await pruefe("R26", "[Leitung fährt selbst, Startseite Büro] während des Sicherns etwas eingetippt → bleibt in der App, Eingabe da, Hinweis", () => {
    const f = [];
    if (r.weiter) f.push("doch weggeschickt");
    if (r.name !== "Tipp Muster" || !r.geaendert) f.push("Eingabe weg: " + JSON.stringify(r.name));
    if (!r.toasts.some((t) => /weil du gerade etwas eingibst/.test(t))) f.push("kein Hinweis: " + r.toasts.join(" | "));
    return f;
  });
  r = await lauf({ bogen: 1500 });
  await pruefe("R26", "[Leitung fährt selbst, Startseite Büro] Fragebogen-Kopie langsam → erst nach ihr zur Büro-Seite", () => (r.weiter && r.weiter.privat ? null : JSON.stringify(r)));
  r = await lauf({ bogen: "netz" });
  await pruefe("R26", "[Leitung fährt selbst, Startseite Büro] Fragebogen-Kopie ohne Netz → bleibt in der App mit Hinweis", () => (!r.weiter && r.toasts.some((t) => /Nicht alles gesichert/.test(t)) ? null : JSON.stringify(r)));
  r = await lauf({ pw: true });
  await pruefe("R26", "[Leitung fährt selbst, Startseite Büro] Passwort-Link offen → noch nicht weg", () => (r.weiter ? "zu früh weggeschickt" : null));
  await page.evaluate(() => { try { closeSheet(); } catch (e) {} _openNeuesPasswortSheet(); window.__push = 0; }); await warte(page, 400);
  await page.fill("#npwNeu", "Muster-1234"); await page.fill("#npwWdh", "Muster-1234");
  await page.click("#npwSave");
  await page.waitForFunction(() => window.__weiter, null, { timeout: 12000 }).catch(() => {});
  const nachPw = await page.evaluate(() => window.__weiter);
  await pruefe("R26", "[Leitung fährt selbst, Startseite Büro] nach dem neuen Passwort: erst gesichert, dann Büro-Seite", () => (nachPw && nachPw.n === "buero" && nachPw.push >= 1 ? null : JSON.stringify(nachPw)));
  await pruefe("R5", "[R26] keine JS-Fehler", () => jsFehler);
  await ctx.close();
}

// R13 (K8): Büro-Seite je Rolle. Büro, Leitung und Super-Admin sehen „Zahlung ausstehend“ bei den Schülern, ein Fahrlehrer kommt nicht hinein.
{
  const { bauDaten } = require("../buero-vorfuehrung.js");
  const fake = await readFile(join(ROOT, "buero-vorfuehrung.js"), "utf8");
  const bServer = createServer(async (req, res) => {
    try { const pfad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, ""); const datei = await readFile(join(ROOT, pfad === "/" ? "buero.html" : pfad)); res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" }); res.end(datei); }
    catch { res.writeHead(404); res.end(); }
  });
  await new Promise((ok) => bServer.listen(0, "127.0.0.1", ok));
  const bBasis = `http://127.0.0.1:${bServer.address().port}/`;
  // W16: wahl = Startseiten unter Einstellungen › Darstellung & Start; Fahrlehrer werden gleich zur App geschickt, außer die App hat sie eben erst hergeschickt (schleife)
  const BUERO_ROLLEN = [{ n: "Büro", id: "bu-1", knoepfe: true, wahl: [] }, { n: "Leitung", id: "ad-1", knoepfe: true, wahl: ["gesamt", "buero"] }, { n: "Super-Admin", id: "sa-1", knoepfe: true, wahl: ["eigen", "gesamt", "buero"] },
    { n: "Fahrlehrer", id: "fl-x", knoepfe: false }, { n: "Fahrlehrer ohne App", id: "fl-4", knoepfe: false }, { n: "Fahrlehrer, eben von der App geschickt", id: "fl-x", knoepfe: false, schleife: true }];
  for (const B of BUERO_ROLLEN) {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 } });
    const page = await ctx.newPage();
    const konsole = [];
    page.on("pageerror", (e) => konsole.push(String(e)));
    await page.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", (r) => r.fulfill({ contentType: "text/javascript", body: fake }));
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: "" }));
    const daten = bauDaten(new Date().toISOString().slice(0, 10));
    await page.addInitScript(([d, ses, schleife]) => {
      window.__FAKE = { tabellen: d.tabellen, konten: d.konten, session: ses };
      const sa = d.tabellen.schueler.find((x) => x.status === "aktiv" && !x.inaktiv_seit); if (sa) { sa.zahlung_gesperrt_seit = new Date().toISOString(); sa.zahlung_gesperrt_grund = "Rechnung offen"; }
      // Werkstatt 13: eine Vorlage mit festem Preis, damit „Schüler anlegen mit Paket“ ohne Preisliste geht
      d.tabellen.fahrschule_pakete.push({ id: "p-rolle", fahrschule_id: d.tabellen.fahrschulen[0].id, name: "Rollen-Paket", reihenfolge: 9, aktiv: true, klasse: "B", posten: [{ art: "grundbetrag", bezeichnung: "Grundbetrag", anzahl: 1, preis_cent_fest: 30000 }] });
      d.tabellen.schueler_pakete = [];
      if (schleife) try { sessionStorage.setItem("kompass-weiterleitung", JSON.stringify({ nach: "buero", t: Date.now() })); } catch (e) {}
    }, [daten, { user: { id: B.id, email: B.id + "@example.org" } }, !!B.schleife]);
    await page.goto(bBasis + "buero.html#schueler");
    await warte(page, 700);
    if (!B.knoepfe) {
      const weg = await page.waitForURL(/index\.html/, { timeout: 4000 }).then(() => true).catch(() => false);
      if (B.schleife) await pruefe("R13", `[${B.n}] Büro-Seite: keine Schleife, Hinweis „Nur für das Büro“ bleibt`, async () => (weg ? "wieder zur App geschickt" : /Nur für das Büro/.test(await page.textContent("#hinweisTitel").catch(() => "")) ? null : "kein Hinweis"));
      else await pruefe("R13", `[${B.n}] Büro-Seite leitet sofort zur App weiter`, () => (weg ? null : "bleibt auf " + page.url()));
      await ctx.close();
      continue;
    }
    const frage = await page.waitForSelector("#wer:not([hidden])", { timeout: 1200 }).catch(() => null);
    if (frage) { await page.click('#werListe button:has-text("Paula Muster")'); await page.keyboard.type("7352", { delay: 20 }); await warte(page, 500); }
    const r = await page.evaluate(() => ({ sperre: document.querySelectorAll("[data-zsperre]").length, bezahlt: document.querySelectorAll("[data-zbezahlt]").length, pill: document.querySelectorAll("[data-zahlungpill]").length, app: !!document.getElementById("app") && !document.getElementById("app").hidden }));
    await pruefe("R13", `[${B.n}] Büro-Seite: Knöpfe „Zahlung ausstehend“ / „Bezahlt“ ${B.knoepfe ? "sichtbar" : "nicht da (kein Zugang)"}`, () => {
      const f = [];
      if (B.knoepfe) { if (!r.app) f.push("Seite nicht offen"); if (!r.sperre) f.push("kein Knopf „Zahlung ausstehend“"); if (!r.bezahlt) f.push("kein Knopf „Bezahlt“ beim gesperrten Schüler"); if (!r.pill) f.push("keine Pill"); }
      else if (r.sperre || r.bezahlt || r.pill) f.push(`Fahrlehrer sieht Knöpfe (${r.sperre}/${r.bezahlt}/${r.pill})`);
      return f.concat(konsole);
    });
    // R19 (Werkstatt 13): Schüler anlegen mit Paket – Büro, Leitung und Super-Admin verkaufen es beim Speichern (feste Kopie)
    if (B.knoepfe) {
      const v = await page.evaluate(async () => {
        schuelerDialog(null); await new Promise((r) => setTimeout(r, 150));
        const d = [...document.querySelectorAll("dialog[open]")].pop();
        const sel = d.querySelector("[data-bk-wahl]"); if (!sel) return { fehler: "keine Auswahl „Anmeldung“" };
        d.querySelector('input[name="name"]').value = "Rolf Rollentest";
        sel.value = "v:p-rolle"; sel.dispatchEvent(new Event("change", { bubbles: true }));
        d.querySelector("footer button[value=ok]").click(); await new Promise((r) => setTimeout(r, 600));
        const s = window.__FAKE.tabellen.schueler.find((x) => x.name === "Rolf Rollentest");
        const p = s && (window.__FAKE.tabellen.schueler_pakete || []).find((x) => x.schueler_id === s.id && !x.storniert_am);
        return { schueler: !!s, paket: p ? p.gesamt_cent : null, paketId: s ? s.paket_id : null, offen: document.querySelectorAll("dialog[open]").length };
      });
      await pruefe("R19", `[${B.n}] Schüler anlegen mit Paket: gespeichert, Paket verkauft (300 €), Fenster zu`, () => {
        if (v.fehler) return v.fehler;
        const f = [];
        if (!v.schueler) f.push("Schüler nicht angelegt");
        if (v.paket !== 30000) f.push("Paket nicht verkauft: " + v.paket);
        if (v.paketId !== "p-rolle") f.push("paket_id: " + v.paketId);
        if (v.offen) f.push("Fenster noch offen");
        return f.concat(konsole);
      });
    }
    // W16 Teil 2: Leitung und Super-Admin wählen die Startseite unter Einstellungen › Darstellung & Start (🗣 Serband: nur in den
    // Einstellungen), ohne Link zur App in der Leiste. Das Büro hat dort keine Wahl; seit W16 Teil 3 B hat es auch keinen Link zur App mehr (Schalter BUERO_NUR_BUEROSEITE).
    if (B.knoepfe) {
      await page.evaluate(() => { location.hash = "#einstellungen?thema=darstellung"; }); await warte(page, 900);
      const st = await page.evaluate(() => {
        const sichtbar = (e) => !!e && !e.hidden && e.getClientRects().length > 0;
        const k = [...document.querySelectorAll("[data-ks-start]")].filter(sichtbar);
        return { appLinks: [...new Set(document.querySelectorAll('#app a[href="index.html"], #app a[href="./index.html"], #zurApp, #startWahl'))].filter(sichtbar).length,
          werte: k.map((b) => b.dataset.ksStart), an: k.filter((b) => b.getAttribute("aria-pressed") === "true").map((b) => b.dataset.ksStart),
          minH: k.length ? Math.min(...k.map((b) => b.getBoundingClientRect().height)) : 0 };
      });
      const linkSoll = !B.wahl.length && !NUR_BUERO ? 1 : 0; // nur das Büro, und nur solange der Schalter aus ist
      await pruefe("R23", `[${B.n}] Büro-Seite: ${B.wahl.length ? "Startseite " + B.wahl.join(" / ") + " unter Einstellungen › Darstellung & Start, kein Link zur App" : linkSoll ? "keine Startseiten-Wahl, Link zur App wie bisher" : "keine Startseiten-Wahl, kein Weg in die App"}`, () => {
        const f = [];
        if (st.appLinks !== linkSoll) f.push(st.appLinks + " Link(s) zur App in der Seite statt " + linkSoll);
        if (st.werte.join() !== B.wahl.join()) f.push("Wahl: " + (st.werte.join(" / ") || "keine"));
        if (B.wahl.length && st.an.join() !== B.wahl[0]) f.push("markiert: " + (st.an.join() || "nichts"));
        if (B.wahl.length && st.minH < 43.5) f.push("Knopf nur " + Math.round(st.minH) + " px hoch");
        return f;
      });
      if (B.wahl.length) {
        await page.click(`[data-ks-start="${B.wahl[0]}"]`, { timeout: 5000 }).catch(() => {});
        const weg = await page.waitForURL(/index\.html/, { timeout: 5000 }).then(() => true).catch(() => false);
        const gemerkt = await page.evaluate((id) => { try { return JSON.parse(localStorage.getItem("kompass-startseite") || "{}")[id] || null; } catch (e) { return "?"; } }, B.id).catch(() => "?");
        await pruefe("R23", `[${B.n}] Einstellungen: „${B.wahl[0]}“ antippen → zur App, gemerkt`, () => (weg && gemerkt === B.wahl[0] ? null : `zur App: ${weg}, gemerkt: ${gemerkt}`));
      }
    }
    await ctx.close();
  }
  bServer.close();
}

await browser.close();
server.close();
console.log(`\nRollen-Test: ${okZahl} ok, ${fehlerZahl} Fehler`);
process.exit(fehlerZahl ? 1 : 0);
