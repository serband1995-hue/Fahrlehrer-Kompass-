// W15 Schritt 1: „Reaktivierung entfällt laut Preisliste = keine Sperre“ in Büro und App (echter Browser, erfundene Daten).
// Büro: Attrappe buero-vorfuehrung.js (reakt_regel rechnet dort wie die Datenbank). App: index.html mit kleiner Attrappe.
// Die Datenbank-Seite prüft scripts/reakt-sql-test.mjs.
// Aufruf:  NODE_PATH=$(npm root -g) node scripts/reakt-entfaellt-test.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { bauDaten } = require("../buero-vorfuehrung.js");
const { chromium } = require("playwright");
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const d0 = new Date(); const HEUTE = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, "0")}-${String(d0.getDate()).padStart(2, "0")}`;
function tag(n) { const d = new Date(HEUTE + "T12:00:00"); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }

const server = createServer(async (req, res) => {
  try {
    const pfad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[/\\])+/, "");
    const datei = await readFile(join(ROOT, pfad === "/" ? "buero.html" : pfad));
    res.writeHead(200, { "Content-Type": TYPES[extname(pfad)] || "application/octet-stream" });
    res.end(datei);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const basis = `http://127.0.0.1:${server.address().port}/`;
const fake = await readFile(join(ROOT, "buero-vorfuehrung.js"), "utf8");
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let ok = 0, schlecht = 0;
function pruefe(name, bed, info) { if (bed) { ok++; console.log("ok  " + name); } else { schlecht++; console.log("FEHLER  " + name + (info ? " · " + info : "")); } }

// Reaktivierungs-Zeilen der Preisliste (Attrappe). [gueltig_ab, betrag_cent]
const preise = (liste) => `F.tabellen.fahrschule_preise = ${JSON.stringify(liste.map(([ab, cent], i) => ({ id: "rp" + i, fahrschule_id: "__FS", art: "reaktivierung", klasse: null, bezeichnung: "Reaktivierung", einheit: "pauschal", betrag_cent: cent, gueltig_ab: ab, angelegt_von: "ad-1", angelegt_am: ab + "T10:00:00Z" })))}.map((r) => Object.assign(r, { fahrschule_id: F.tabellen.fahrschulen[0].id }));`;

async function oeffne({ nutzer = "ad-1", hash = "#fristen?ansicht=alle", vorbereiten = "", breite = 1366 }) {
  const daten = bauDaten(HEUTE);
  const session = { user: { id: nutzer, email: nutzer + "@example.org" } };
  const ctx = await browser.newContext({ viewport: { width: breite, height: 860 } });
  const page = await ctx.newPage();
  const konsole = [];
  page.on("console", (m) => { if (m.type() === "error") konsole.push(m.text()); });
  page.on("pageerror", (e) => konsole.push(String(e)));
  await page.route("**/vendor/supabase-js-*.js", (r) => r.fulfill({ contentType: "text/javascript", body: fake }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, body: "" }));
  await page.addInitScript(([d, s, v]) => {
    window.__FAKE = { tabellen: d.tabellen, konten: d.konten, session: s };
    if (v) (new Function("F", v))(window.__FAKE);
  }, [daten, session, vorbereiten]);
  await page.goto(basis + "buero.html" + hash);
  await page.waitForTimeout(400);
  await page.waitForFunction(() => { const a = document.getElementById("ansicht"); return a && !/Daten werden geladen/.test(a.textContent); }, null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(200);
  return { page, ctx, konsole };
}
// Gesperrte (Reaktivierung) laut Büro-Rechnung und die Texte der Fristen-Seite
const stand = (page) => page.evaluate(() => ({
  gesperrt: S.schueler.filter((s) => istAktiv(s) && KR.reaktInfo(s).gesperrt).map((s) => s.id).sort(),
  entfaellt: S.schueler.filter((s) => istAktiv(s) && KR.reaktInfo(s).stufe === "entfaellt").map((s) => s.id).sort(),
  text: document.getElementById("ansicht").innerText,
  regel: (document.querySelector("[data-reaktregel]") || {}).textContent || "",
  zm9: typeof zmAngebote === "function" ? zmAngebote(S.schueler.find((x) => x.id === "s9")).map((a) => a.art) : [],
  pill9: zahlungPill(S.schueler.find((x) => x.id === "s9")),
}));

try {
  // E1 ohne Preisliste: alte Regel (s9 und s18 sind seit 20 Tagen überfällig)
  {
    const { page, ctx, konsole } = await oeffne({});
    const st = await stand(page);
    pruefe("E1a ohne Preisliste: s9 und s18 gesperrt wie bisher", JSON.stringify(st.gesperrt) === JSON.stringify(["s18", "s9"]), st.gesperrt.join(","));
    pruefe("E1b Seite zeigt „überfällig · gesperrt“", /überfällig · gesperrt/.test(st.text));
    pruefe("E1c Hinweis nennt „12 Monate … jährlich“", /fällig 12 Monate nach Vertragsabschluss und dann jährlich/.test(st.regel), st.regel);
    pruefe("E1d Akte: Pill „Reaktivierung offen“, Mail-Knopf Reaktivierung", /Reaktivierung offen/.test(st.pill9) && st.zm9.includes("reaktivierung"));
    pruefe("E1e keine Konsolenfehler", konsole.length === 0, konsole.join(" | "));
    await ctx.close();
  }
  // E2 240 € seit langem, entfällt seit gestern → niemand gesperrt
  {
    const { page, ctx, konsole } = await oeffne({ vorbereiten: preise([[tag(-900), 24000], [tag(-1), null]]) });
    const st = await stand(page);
    pruefe("E2a entfällt seit gestern: niemand gesperrt", st.gesperrt.length === 0, st.gesperrt.join(","));
    pruefe("E2b Seite ohne „überfällig · gesperrt“, mit Pill „entfällt“", !/überfällig · gesperrt/.test(st.text) && await page.locator(".marke-pill", { hasText: /^entfällt$/ }).count() > 0);
    pruefe("E2c Hinweis „entfällt laut Preisliste“", /entfällt laut Preisliste/.test(st.regel), st.regel);
    pruefe("E2d Kachel: 0 Reaktivierungen überfällig", /offen: 0 Reaktivierungen überfällig/.test(st.text));
    pruefe("E2e Akte: keine Pill, kein Mail-Knopf Reaktivierung", st.pill9 === "" && !st.zm9.includes("reaktivierung"), st.pill9 + " / " + st.zm9.join(","));
    const knopf = await page.locator('[data-zahlung="s9"]').count();
    pruefe("E2f kein „… erhalten“-Knopf für s9", knopf === 0);
    pruefe("E2g Server wurde gefragt (rpc reakt_regel)", await page.evaluate(() => window.__FAKE.log.some((l) => l.rpc === "reakt_regel")));
    pruefe("E2h keine Konsolenfehler", konsole.length === 0, konsole.join(" | "));
    await ctx.close();
  }
  // E3 Datenbank ohne Update (rpc fehlt): Büro rechnet wie der alte Server, auch wenn die Preisliste „entfällt“ sagt
  {
    const { page, ctx, konsole } = await oeffne({ vorbereiten: preise([[tag(-900), 24000], [tag(-1), null]]) + " F.reaktRegelFehlt = true;" });
    const st = await stand(page);
    pruefe("E3a ohne Datenbank-Update: Sperre wie der Server (s9, s18)", JSON.stringify(st.gesperrt) === JSON.stringify(["s18", "s9"]), st.gesperrt.join(","));
    pruefe("E3b keine Konsolenfehler", konsole.length === 0, konsole.join(" | "));
    await ctx.close();
  }
  // E4 entfiel nur früher (Vertragstag s9 liegt darin, s18 nicht): s9 frei, s18 gesperrt
  {
    const { page, ctx } = await oeffne({ vorbereiten: preise([[tag(-1500), null], [tag(-300), 24000]]) });
    const st = await stand(page);
    pruefe("E4a entfiel am Vertragstag: s9 frei, s18 weiter gesperrt", JSON.stringify(st.gesperrt) === JSON.stringify(["s18"]) && st.entfaellt.includes("s9") && !st.entfaellt.includes("s18"), st.gesperrt.join(",") + " / " + st.entfaellt.join(","));
    pruefe("E4b Hinweis nennt wieder die Fälligkeit (heute nicht frei)", /fällig 12 Monate/.test(st.regel), st.regel);
    await ctx.close();
  }
  // E5 0 € (Entscheidung 2a): keine Sperre
  {
    const { page, ctx } = await oeffne({ vorbereiten: preise([[tag(-900), 24000], [tag(-2), 0]]) });
    const st = await stand(page);
    pruefe("E5 0 € seit vorgestern: niemand gesperrt", st.gesperrt.length === 0, st.gesperrt.join(","));
    await ctx.close();
  }
  // E6 in der Preisliste auf „entfällt“ stellen → Fristen-Seite folgt ohne Neuladen
  {
    const { page, ctx, konsole } = await oeffne({ hash: "#preise", vorbereiten: preise([[tag(-900), 24000]]) });
    await page.locator("[data-pr-aendern]").first().click();
    const dlg = page.locator("dialog[open]").last();
    await dlg.locator("input[name=entfaellt]").check();
    await dlg.locator("footer button[value=ok]").click();
    await page.waitForTimeout(400);
    const zeilen = await page.evaluate(() => window.__FAKE.tabellen.fahrschule_preise.length);
    pruefe("E6a „entfällt“ gespeichert (neue Zeile)", zeilen === 2);
    await page.evaluate(() => { location.hash = "#fristen?ansicht=alle"; });
    await page.waitForTimeout(300);
    const st = await stand(page);
    pruefe("E6b danach niemand gesperrt, ohne Neuladen", st.gesperrt.length === 0, st.gesperrt.join(","));
    pruefe("E6c Regel neu geholt (2× rpc)", (await page.evaluate(() => window.__FAKE.log.filter((l) => l.rpc === "reakt_regel").length)) >= 2);
    pruefe("E6d keine Konsolenfehler", konsole.length === 0, konsole.join(" | "));
    await ctx.close();
  }
  // E8 W15 S3 (Fable-Hinweis): „Ohne Vertragsdatum“ zeigt auch Schüler, bei denen die Reaktivierung entfällt, mit Grund
  {
    const { page, ctx, konsole } = await oeffne({ hash: "#fristen?ansicht=ohne", vorbereiten: preise([[tag(-900), 24000], [tag(-1), null]]) });
    const st = await page.evaluate(() => {
      const ohne = S.schueler.filter((s) => !s.inaktiv_seit && !s.vertrag_am && !s.reakt_bezahlt_bis && s.reakt_status !== "befreit");
      return { soll: ohne.length, kachel: zaehleFristen().ohneDatum, zeilen: document.querySelectorAll("#ansicht .tabelle tbody tr").length,
        grund: document.querySelectorAll("[data-ohnedatum]").length, hinweis: !!document.querySelector("[data-ohnehinweis]") };
    });
    pruefe("E8a entfällt heute: „Ohne Vertragsdatum“ zählt trotzdem alle ohne Datum (Kachel = Liste)", st.soll > 0 && st.kachel === st.soll && st.zeilen === st.soll, JSON.stringify(st));
    pruefe("E8b jede dieser Zeilen sagt „Vertragsdatum fehlt“, dazu der Hinweis unter der Liste", st.grund === st.soll && st.hinweis, JSON.stringify(st));
    pruefe("E8c keine JS-Fehler", konsole.length === 0, konsole.join(" | "));
    await ctx.close();
  }
  // E9 W15 S3: Hinweis im Reiter „Antrag & Frist“ nennt die eingestellte Dauer (gesetzliche 12 Monate nach der Theorie bleiben)
  {
    const { page, ctx, konsole } = await oeffne({ hash: "#fristen?ansicht=antrag" });
    const text = () => page.evaluate(() => document.getElementById("ansicht").innerText);
    pruefe("E9a Standard: „gilt 12 Monate“", /Führerscheinstelle gilt 12 Monate\. Nach bestandener Theorieprüfung gilt er 12 Monate ab dem Prüfungsdatum \(§ 18 FeV\)/.test(await text()));
    await page.evaluate(() => { KR.setzeFristen({ antrag: { monate: 18 } }); zeichne(); });
    await page.waitForTimeout(150);
    pruefe("E9b eingestellt 18: „gilt 18 Monate“, nach der Theorie weiter 12", /Führerscheinstelle gilt 18 Monate\. Nach bestandener Theorieprüfung gilt er 12 Monate/.test(await text()));
    pruefe("E9c keine JS-Fehler", konsole.length === 0, konsole.join(" | "));
    await ctx.close();
  }
  // E7 Handy-Breite: Fristen-Seite mit „entfällt“ ohne Überlauf
  {
    const { page, ctx } = await oeffne({ breite: 360, vorbereiten: preise([[tag(-900), 24000], [tag(-1), null]]) });
    const ueber = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    pruefe("E7 360 px: kein waagrechtes Scrollen", ueber <= 1, "überstand " + ueber + " px");
    await ctx.close();
  }

  // ---------- App (index.html) ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
    const page = await ctx.newPage();
    const konsole = [];
    page.on("pageerror", (e) => konsole.push(String(e)));
    await page.route(/vendor\/supabase-js|fonts\.(googleapis|gstatic)/, (r) => r.abort());
    await page.goto(basis + "index.html");
    await page.waitForTimeout(1200);
    // kleine Attrappe: rpc reakt_regel steuerbar, schueler-Abfrage liefert zwei Schüler
    await page.evaluate(([h, vor20, vor13m]) => {
      window.__regel = { art: "ok", data: null };
      window.__rpcLog = [];
      const zeilen = [
        { id: "a1", fahrschule_id: "fs-1", fahrlehrer_id: "fl-1", name: "Anna Muster", status: "aktiv", ausbildung: {}, reakt_status: "bezahlt", reakt_bezahlt_bis: vor20, vertrag_am: vor13m },
        { id: "a2", fahrschule_id: "fs-1", fahrlehrer_id: "fl-1", name: "Ben Muster", status: "aktiv", ausbildung: {}, reakt_status: "pruefen", reakt_bezahlt_bis: null, vertrag_am: vor13m },
      ];
      const bauer = (t) => { const b = { select() { return b; }, eq() { return b; }, in() { return b; }, is() { return b; }, neq() { return b; }, order() { return b; }, gte() { return b; }, lte() { return b; }, limit() { return b; }, range() { return b; },
        maybeSingle() { return Promise.resolve({ data: null, error: null }); }, single() { return Promise.resolve({ data: null, error: null }); },
        then(ok, f) { return Promise.resolve({ data: t === "schueler" ? JSON.parse(JSON.stringify(zeilen)) : [], error: null }).then(ok, f); } }; return b; };
      window.__client = {
        from: bauer,
        rpc(name, args) {
          window.__rpcLog.push(name + ":" + (args && args.p_fs));
          if (name !== "reakt_regel") return Promise.resolve({ data: null, error: null });
          const r = (window.__regelJe && args && window.__regelJe[args.p_fs]) || window.__regel;
          if (r.art === "netz") return Promise.reject(new Error("Failed to fetch"));
          if (r.art === "fehlt") return Promise.resolve({ data: null, error: { code: "PGRST202", message: "Could not find the function public.reakt_regel(p_fs)" } });
          return Promise.resolve({ data: r.data, error: null });
        },
        auth: { getSession: async () => ({ data: { session: { user: { id: "fl-1" } } }, error: null }) },
      };
      window.getSupa = () => window.__client;
      _authUser = { id: "fl-1" }; _authProfile = { id: "fl-1", fahrschule_id: "fs-1", rolle: null };
      try { Object.keys(localStorage).filter((k) => k.startsWith("kompass_reakt_regel")).forEach((k) => localStorage.removeItem(k)); } catch (e) {}
      KR.setzeReaktRegel(null);
    }, [HEUTE, tag(-20), tag(-400)]);
    const ziehe = async (regel) => {
      await page.evaluate((r) => { window.__regel = r; _schuelerAbrufLaeuft = false; _fsAgg = null; }, regel);
      await page.evaluate(() => pullSchuelerZuweisungen()).catch(() => {});
      await page.waitForTimeout(150);
      return page.evaluate(() => ({ a1: _zahlungGesperrt("a1"), a2: _zahlungGesperrt("a2"), regel: KR.holeReaktRegel(), speicher: localStorage.getItem("kompass_reakt_regel:fs-1") }));
    };
    let st = await ziehe({ art: "ok", data: { monate: 12, frei: [] } });
    pruefe("A1 Regel ohne freie Zeit: a1 gesperrt, a2 (ungeprüft) nicht", st.a1 === true && st.a2 === false, JSON.stringify(st));
    st = await ziehe({ art: "ok", data: { monate: 12, frei: [{ ab: tag(-1), bis: null }] } });
    pruefe("A2 entfällt seit gestern: a1 nicht mehr gesperrt", st.a1 === false, JSON.stringify(st));
    pruefe("A2b Regel für offline gemerkt (nur Regel, keine Preise)", !!st.speicher && JSON.parse(st.speicher).fs === "fs-1" && !/betrag|cent|240/.test(st.speicher), st.speicher);
    const stopp = await page.evaluate((d) => _zahlungStopp("a1", d, "fahrstunde"), tag(3));
    pruefe("A2c neuer Termin für a1 ist erlaubt", stopp === false);
    st = await ziehe({ art: "netz" });
    pruefe("A3 Netzfehler: gemerkte Regel bleibt (a1 frei)", st.a1 === false && !!st.regel, JSON.stringify(st));
    // Neustart offline: Regel kommt aus dem Speicher
    await page.evaluate(() => { KR.setzeReaktRegel(null); });
    st = await ziehe({ art: "netz" });
    pruefe("A4 nach Neustart ohne Netz: Regel aus dem Speicher", st.a1 === false && !!st.regel, JSON.stringify(st));
    st = await ziehe({ art: "fehlt" });
    pruefe("A5 Datenbank ohne Update: alte Regel (a1 gesperrt), Speicher geleert", st.a1 === true && st.regel === null && st.speicher === null, JSON.stringify(st));
    st = await ziehe({ art: "ok", data: { monate: 18, frei: [] } });
    pruefe("A6 18 Monate: a1 (bezahlt bis vor 20 Tagen) bleibt gesperrt, a2 nicht", st.a1 === true && st.a2 === false, JSON.stringify(st));
    const fall18 = await page.evaluate((v) => KR.reaktInfo({ reakt_status: "bezahlt", vertrag_am: v }).stufe, tag(-400));
    pruefe("A6b 18 Monate: Vertrag vor 400 Tagen noch nicht fällig", fall18 === "ok" || fall18 === "demnaechst" || fall18 === "bald", fall18);
    await page.evaluate(() => { _authProfile = { id: "fl-1", fahrschule_id: "fs-2", rolle: null }; KR.setzeReaktRegel(null); });
    st = await ziehe({ art: "netz" });
    pruefe("A7 andere Fahrschule: gemerkte Regel der ersten gilt nicht", st.regel === null, JSON.stringify(st));
    // A9 Gesamtansicht (Büro, Leitung, Super-Admin): Regel der gewählten Fahrschule, beim Verlassen wieder die eigene (Prüf-Team W15)
    await page.evaluate(([vor20, vor13m]) => {
      _authProfile = { id: "fl-1", fahrschule_id: "fs-1", rolle: "fahrschule_admin" };
      window.__regelJe = { "fs-1": { art: "ok", data: { monate: 12, frei: [] } }, "fs-9": { art: "ok", data: { monate: 12, frei: [{ ab: "2020-01-01", bis: null }] } } };
    }, [tag(-20), tag(-400)]);
    const agg = await page.evaluate(async () => {
      const ok = await _fsLoadAggData("fs-9");
      return { ok, soll: _reaktRegelSoll, frei: KR.reaktFreiAm(undefined, todayISO()) };
    });
    pruefe("A9a Gesamtansicht fremde Fahrschule: deren Regel (frei)", agg.ok === true && agg.soll === "fs-9" && agg.frei === true, JSON.stringify(agg));
    const rpcAgg = await page.evaluate(() => window.__rpcLog.filter((x) => x === "reakt_regel:fs-9").length);
    pruefe("A9b rpc mit der Fahrschule der Gesamtansicht gefragt", rpcAgg >= 1);
    const zur = await page.evaluate(async () => { try { await _fsExitAggModeJetzt(); } catch (e) { return { fehler: String(e) }; } await new Promise((r) => setTimeout(r, 150)); return { soll: _reaktRegelSoll, frei: KR.reaktFreiAm(undefined, todayISO()), agg: _fsAgg }; });
    pruefe("A9c Gesamtansicht verlassen: wieder die eigene Regel (nicht frei)", zur.soll === "fs-1" && zur.frei === false && zur.agg === null, JSON.stringify(zur));
    // A9e (Fable B1): eine Änderung in der Gesamtansicht während die Regel geladen wird, darf beim Neuladen nicht verloren gehen
    const b1 = await page.evaluate(async () => {
      window.__regelJe = null; window.__regel = { art: "ok", data: { monate: 12, frei: [] } };
      const c = getSupa(), rpcAlt = c.rpc.bind(c);
      const ok1 = await _fsLoadAggData("fs-1");
      c.rpc = (name, args) => (name === "reakt_regel"
        ? new Promise((r) => { setTimeout(() => { if (DB.students[0]) DB.students[0].name = "Geaendert Muster"; }, 30); setTimeout(() => r(rpcAlt(name, args)), 120); })
        : rpcAlt(name, args));
      const ok2 = await _fsLoadAggData("fs-1");
      c.rpc = rpcAlt;
      const name = DB.students[0] && DB.students[0].name;
      try { await _fsExitAggModeJetzt(); } catch (e) {}
      return { ok1, ok2, name };
    });
    pruefe("A9e Änderung während des Neuladens bleibt (kein stilles Überschreiben)", b1.ok1 === true && b1.ok2 === false && b1.name === "Geaendert Muster", JSON.stringify(b1));
    await page.evaluate(() => { _authProfile = { id: "sa-1", fahrschule_id: null, rolle: "super_admin" }; });
    const ohne = await page.evaluate(async () => { await _ladeReaktRegel(getSupa()); return { soll: _reaktRegelSoll, regel: KR.holeReaktRegel() }; });
    pruefe("A9d Super-Admin ohne eigene Fahrschule: keine fremde Regel übrig", ohne.soll === null && ohne.regel === null, JSON.stringify(ohne));
    pruefe("A8 keine Seitenfehler", konsole.length === 0, konsole.join(" | "));
    await ctx.close();
  }
} catch (e) {
  schlecht++; console.log("FEHLER  Abbruch: " + (e && e.stack || e));
} finally {
  await browser.close();
  server.close();
}
console.log(`\nReaktivierung-entfällt-Test: ${ok} ok, ${schlecht} Fehler`);
process.exit(schlecht ? 1 : 0);
