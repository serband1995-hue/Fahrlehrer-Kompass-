// Startseiten-Test (Werkstatt 16, 24.11.2026): prüft startseite.js ohne Browser.
// Wer welche Startseite haben kann, was gemerkt wird, und dass die Weiterleitung nie im Kreis läuft.
// Aufruf:  node scripts/startseite-test.mjs        (auch in der GitHub-Prüfung)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import vm from "node:vm";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const CODE = readFileSync(join(ROOT, "startseite.js"), "utf8");
let ok = 0, fehler = 0;
function pruefe(id, text, ergebnis) {
  if (ergebnis === true || ergebnis == null) { ok++; console.log(`ok  ${id} ${text}`); return; }
  fehler++; console.log(`FEHLER  ${id} ${text}: ${ergebnis}`);
}
function speicher(kaputt) {
  const m = new Map();
  return { getItem: (k) => { if (kaputt) throw new Error("gesperrt"); return m.has(k) ? m.get(k) : null; }, setItem: (k, v) => { if (kaputt) throw new Error("voll"); m.set(k, String(v)); },
    removeItem: (k) => m.delete(k), _m: m };
}
// Neue Umgebung: pfad = aktuelle Seite; gibt KS_START und die Liste der Weiterleitungen zurück
function umgebung(pfad = "/Fahrlehrer-Kompass-/index.html", { kaputt = false, jetzt, zurueck = false } = {}) {
  const ziele = [];
  const g = { localStorage: speicher(kaputt), sessionStorage: speicher(kaputt), location: { pathname: pfad, replace: (u) => ziele.push(u) }, document: null,
    performance: { getEntriesByType: (t) => (t === "navigation" ? [{ type: zurueck ? "back_forward" : "navigate" }] : []) } };
  g.window = g;
  const ctx = vm.createContext(Object.assign(g, { Date: jetzt ? class extends Date { static now() { return jetzt(); } } : Date, JSON, Math, String, Object, Array }));
  vm.runInContext(CODE, ctx);
  return { KS: g.KS_START, ziele, g };
}
const P = {
  fahrlehrer: { id: "f1", rolle: "fahrlehrer", fahrschule_id: "s1", aktiv: true },
  buero: { id: "b1", rolle: "buero", fahrschule_id: "s1", aktiv: true },
  leitung: { id: "l1", rolle: "fahrschule_admin", fahrschule_id: "s1", aktiv: true },
  leitungFaehrt: { id: "l2", rolle: "fahrschule_admin", faehrt_selbst: true, fahrschule_id: "s1", aktiv: true },
  sa: { id: "a1", rolle: "super_admin", fahrschule_id: "s1", aktiv: true },
  saOhne: { id: "a2", rolle: "super_admin", fahrschule_id: null, aktiv: true },
  gesperrt: { id: "g1", rolle: "buero", fahrschule_id: "s1", aktiv: false },
  leer: { id: "u1", rolle: "", aktiv: true },
  fremd: { id: "u2", rolle: "irgendwas", aktiv: true },
};

// 1) Wer welche Startseite haben kann (erste = Vorgabe = so startet die App schon heute)
{
  const { KS } = umgebung();
  // Rolle Büro: seit W16 Teil 3 B (Schalter BUERO_NUR_BUEROSEITE an) nur die Büro-Seite, keine Wahl
  pruefe("S1", "Schalter BUERO_NUR_BUEROSEITE ist an", KS.bueroNurBueroseite === true || "aus");
  const erwartet = { fahrlehrer: "eigen", buero: "buero", leitung: "gesamt,buero", leitungFaehrt: "eigen,gesamt,buero", sa: "eigen,gesamt,buero", saOhne: "eigen,buero", gesperrt: "", leer: "", fremd: "" };
  for (const [k, w] of Object.entries(erwartet)) pruefe("S1", `${k}: ${w || "nichts"}`, KS.erlaubt(P[k]).join() === w || "ist " + KS.erlaubt(P[k]).join());
  pruefe("S1", "ohne Profil: nichts", KS.erlaubt(null).length === 0 || "nicht leer");
  pruefe("S1", "Wahl nur bei Leitung und Super-Admin", ["leitung", "leitungFaehrt", "sa", "saOhne"].every((k) => KS.hatWahl(P[k])) && ["fahrlehrer", "buero", "gesperrt", "leer"].every((k) => !KS.hatWahl(P[k])) || "falsch");
}
// 2) Merken je Konto, Vorgabe, unpassende Werte
{
  const { KS, g } = umgebung();
  pruefe("S2", "ohne Wahl gilt die Vorgabe", KS.lesen(P.sa) === "eigen" && KS.lesen(P.leitung) === "gesamt" && KS.lesen(P.buero) === "buero" || "falsch");
  pruefe("S2", "setzen + lesen", KS.setzen(P.sa, "buero") && KS.lesen(P.sa) === "buero" || "nicht gemerkt");
  pruefe("S2", "anderes Konto auf demselben Gerät bleibt bei seiner Vorgabe", KS.lesen(P.leitungFaehrt) === "eigen" || "ist " + KS.lesen(P.leitungFaehrt));
  pruefe("S2", "unpassender Wert wird nicht gemerkt (reine Leitung „eigen“, Fahrlehrer „buero“)", !KS.setzen(P.leitung, "eigen") && !KS.setzen(P.fahrlehrer, "buero") && !KS.setzen(P.sa, "quatsch") || "gemerkt");
  // Rolle hat sich geändert: gemerkter Wert passt nicht mehr → Vorgabe
  g.localStorage.setItem(KS.KEY, JSON.stringify({ l1: "eigen", f1: "buero" }));
  pruefe("S2", "gemerkter Wert passt nicht mehr zur Rolle → Vorgabe", KS.lesen(P.leitung) === "gesamt" && KS.lesen(P.fahrlehrer) === "eigen" || "falsch");
  g.localStorage.setItem(KS.KEY, "kaputt{");
  pruefe("S2", "kaputter Speicher → Vorgabe", KS.lesen(P.sa) === "eigen" || "ist " + KS.lesen(P.sa));
  for (let i = 0; i < 12; i++) KS.setzen({ id: "x" + i, rolle: "super_admin", fahrschule_id: "s1" }, "gesamt");
  const m = JSON.parse(g.localStorage.getItem(KS.KEY));
  pruefe("S2", "höchstens 8 Konten je Gerät, die neuesten bleiben", Object.keys(m).length === 8 && m.x11 === "gesamt" && !m.x0 || JSON.stringify(m));
  const { KS: K2 } = umgebung(undefined, { kaputt: true });
  pruefe("S2", "Gerätespeicher gesperrt: Vorgabe, setzen meldet false", K2.lesen(P.sa) === "eigen" && K2.setzen(P.sa, "buero") === false || "falsch");
}
// 3) Weiterleitung und Schleifenschutz
{
  let t = 1_000_000;
  const { KS, ziele, g } = umgebung("/Fahrlehrer-Kompass-/index.html", { jetzt: () => t });
  pruefe("S3", "in der App: „app“ leitet nicht weiter (schon da)", KS.weiter("app") === false && !ziele.length || "weitergeleitet");
  pruefe("S3", "in der App: „buero“ leitet zu buero.html weiter", KS.weiter("buero") === true && ziele[0] === "buero.html" || ziele.join());
  // Büro-Seite schickt eben zurück → in der App: nicht wieder weg, auch nicht beim zweiten Start-Lauf
  g.sessionStorage.setItem(KS.WEITER_KEY, JSON.stringify({ nach: "app", t: t - 5000 }));
  ziele.length = 0;
  pruefe("S3", "eben von der Büro-Seite zurückgeschickt → keine Weiterleitung", KS.weiter("buero") === false && !ziele.length || ziele.join());
  pruefe("S3", "auch der zweite Lauf leitet nicht weiter", KS.weiter("buero") === false && !ziele.length || ziele.join());
  t += 21000; // Merker verfallen
  pruefe("S3", "nach 20 s gilt die Weiterleitung wieder", KS.weiter("buero") === true && ziele[0] === "buero.html" || ziele.join());
  pruefe("S3", "unbekanntes Ziel: nichts", KS.weiter("woanders") === false || "weitergeleitet");
  // bewusster Wechsel ignoriert den Schleifenschutz und setzt den Merker
  ziele.length = 0;
  g.sessionStorage.setItem(KS.WEITER_KEY, JSON.stringify({ nach: "app", t }));
  KS.gehe("buero");
  pruefe("S3", "bewusster Wechsel (Einstellungen) geht immer", ziele[0] === "buero.html" && JSON.parse(g.sessionStorage.getItem(KS.WEITER_KEY)).nach === "buero" || ziele.join());
}
{
  const { KS, ziele } = umgebung("/Fahrlehrer-Kompass-/buero.html");
  pruefe("S4", "auf buero.html: „buero“ leitet nicht weiter (z. B. Offline-Ersatz der App unter dieser Adresse)", KS.weiter("buero") === false && !ziele.length || ziele.join());
  pruefe("S4", "auf buero.html: „app“ → index.html", KS.weiter("app") === true && ziele[0] === "index.html" || ziele.join());
}
{
  const { KS, ziele } = umgebung("/Fahrlehrer-Kompass-/buero");
  pruefe("S4", "Adresse /buero ohne Endung gilt als Büro-Seite", KS.weiter("buero") === false && KS.weiter("app") === true && ziele[0] === "index.html" || ziele.join());
}
{
  const { KS, ziele, g } = umgebung("/Fahrlehrer-Kompass-/buero.html");
  g.sessionStorage.setItem(KS.WEITER_KEY, JSON.stringify({ nach: "buero", t: Date.now() }));
  pruefe("S4", "auf buero.html, eben von der App geschickt: nicht zurück", KS.weiter("app") === false && !ziele.length || ziele.join());
}
{
  const { KS, ziele } = umgebung("/Fahrlehrer-Kompass-/", { kaputt: true });
  pruefe("S4", "Startadresse ohne Dateinamen gilt als App; ohne Tab-Speicher trotzdem weiter", KS.weiter("app") === false && KS.weiter("buero") === true && ziele[0] === "buero.html" || ziele.join());
}
{
  const { KS, ziele } = umgebung("/Fahrlehrer-Kompass-/index.html", { zurueck: true });
  pruefe("S5", "mit „Zurück“ in die App gekommen: nicht wieder zur Büro-Seite (sonst käme man nie weg)", KS.weiterMoeglich("buero") === false && KS.weiter("buero") === false && !ziele.length || ziele.join());
  const b = umgebung("/Fahrlehrer-Kompass-/buero.html", { zurueck: true });
  pruefe("S5", "mit „Zurück“ auf die Büro-Seite gekommen: nicht wieder zur App", b.KS.weiter("app") === false && !b.ziele.length || b.ziele.join());
  const n = umgebung();
  pruefe("S5", "normaler Start: weiterMoeglich ohne Nebenwirkung", n.KS.weiterMoeglich("buero") === true && !n.ziele.length && n.g.sessionStorage.getItem(n.KS.WEITER_KEY) === null || "Nebenwirkung");
}
console.log(`\nStartseiten-Test: ${ok} ok, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
