// KE (kompass-einstellungen.js) ohne Browser: node scripts/ke-test.mjs
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const ereignisse = [];
const speicher = new Map();
globalThis.CustomEvent = class { constructor(t, o) { this.type = t; this.detail = o && o.detail; } };
globalThis.window = {
  dispatchEvent(e) { ereignisse.push(e.detail); return true; },
  localStorage: { getItem: (k) => (speicher.has(k) ? speicher.get(k) : null), setItem: (k, v) => speicher.set(k, String(v)), removeItem: (k) => speicher.delete(k), key: (i) => [...speicher.keys()][i] ?? null, get length() { return speicher.size; } },
};
const KE = require("../kompass-einstellungen.js");

let ok = 0, schlecht = 0;
function pruefe(name, bed) { if (bed) ok++; else { schlecht++; console.log("FEHLER:", name); } }
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);
async function wirft(f) { try { await f(); return null; } catch (e) { return e.message; } }

// Fake-Datenbank im Stil von supabase-js
function fakeSb(start, opt) {
  opt = opt || {};
  const zeilen = start || [];
  const sb = {
    zeilen, aufrufe: [],
    from(t) {
      sb.aufrufe.push(t);
      const q = { f: {}, art: "select" };
      const ausfuehren = async () => {
        if (opt.wirft) throw new Error(opt.wirft);
        if (opt.fehler) return { data: null, error: opt.fehler };
        if (opt.verzoegerung) await new Promise((r) => setTimeout(r, opt.verzoegerung[q.f.fahrschule_id] || 0));
        if (q.art === "upsert") {
          const alt = zeilen.find((z) => z.fahrschule_id === q.row.fahrschule_id && z.schluessel === q.row.schluessel);
          if (alt) Object.assign(alt, q.row); else zeilen.push({ ...q.row });
          sb.letzteOpt = q.opt; return { data: null, error: null };
        }
        if (q.art === "delete") {
          const weg = opt.stillKeinRecht ? [] : zeilen.filter((z) => Object.keys(q.f).every((k) => z[k] === q.f[k]));
          weg.forEach((z) => zeilen.splice(zeilen.indexOf(z), 1));
          return { data: weg, error: null };
        }
        return { data: zeilen.filter((z) => Object.keys(q.f).every((k) => z[k] === q.f[k])).map((z) => ({ schluessel: z.schluessel, wert: z.wert })), error: null };
      };
      q.select = () => q; q.eq = (k, v) => { q.f[k] = v; return q; };
      q.upsert = (row, o) => { q.art = "upsert"; q.row = row; q.opt = o; return q; };
      q.delete = () => { q.art = "delete"; return q; };
      q.then = (ok2, nein) => ausfuehren().then(ok2, nein);
      return q;
    },
  };
  return sb;
}
const F1 = "fs-1", F2 = "fs-2";
const reset = () => { KE._leeren(); ereignisse.length = 0; speicher.clear(); };

// 1 wert mit Standard / feldweise
reset();
pruefe("wert ohne Laden = Standard", gleich(KE.wert("fristen.reaktivierung", { monate: 12 }), { monate: 12 }));
pruefe("wert ohne Standard = {}", gleich(KE.wert("fristen.reaktivierung"), {}));
await KE.lade(fakeSb([{ fahrschule_id: F1, schluessel: "fristen.reaktivierung", wert: { monate: 6, hinweis: "x" } }]), F1);
pruefe("feldweise Zusammenführung", gleich(KE.wert("fristen.reaktivierung", { monate: 12, tage: 3 }), { monate: 6, tage: 3, hinweis: "x" }));
const k = KE.wert("fristen.reaktivierung", { a: [1] }); k.monate = 99; k.a.push(2);
pruefe("wert liefert Kopie", KE.wert("fristen.reaktivierung", {}).monate === 6);
const std = { a: [1] }; KE.wert("fristen.nix", std).a.push(5);
pruefe("Standardobjekt unverändert", gleich(std, { a: [1] }));
pruefe("unbekannter Schlüssel = Standard", gleich(KE.wert("fristen.andere", { x: 1 }), { x: 1 }));
pruefe("fsId()", KE.fsId() === F1);
pruefe("Ereignis nach lade", gleich(ereignisse[ereignisse.length - 1], { fsId: F1 }));

// 2 zahl
reset();
await KE.lade(fakeSb([{ fahrschule_id: F1, schluessel: "fristen.z", wert: { ok: "7", zahl: 8, text: "abc", neg: "-3", neg2: -3, gross: "9999", komma: "1.5", komma2: 1.5, leer: "", sieben: "1234567", fuehrend: "007", leerz: " 5", obj: { a: 1 } } }]), F1);
const z = (f, s, mi, ma) => KE.zahl("fristen.z", f, s, mi, ma);
pruefe("zahl gültig (Text)", z("ok", 12, 1, 60) === 7);
pruefe("zahl gültig (JSON-Zahl)", z("zahl", 12, 1, 60) === 8);
pruefe("zahl Text → Standard", z("text", 12, 1, 60) === 12);
pruefe("zahl negativ (Text) → Standard", z("neg", 12, 1, 60) === 12);
pruefe("zahl negativ (Zahl) → Standard", z("neg2", 12, -10, 60) === 12);
pruefe("zahl zu groß → Standard", z("gross", 12, 1, 60) === 12);
pruefe("zahl Komma (Text) → Standard", z("komma", 12, 1, 60) === 12);
pruefe("zahl Kommazahl → Standard", z("komma2", 12, 1, 60) === 12);
pruefe("zahl leer → Standard", z("leer", 12, 1, 60) === 12);
pruefe("zahl 7 Ziffern → Standard", z("sieben", 12, 1, 99999999) === 12);
pruefe("zahl führende Nullen gültig", z("fuehrend", 12, 1, 60) === 7);
pruefe("zahl mit Leerzeichen → Standard", z("leerz", 12, 1, 60) === 12);
pruefe("zahl Objekt → Standard", z("obj", 12, 1, 60) === 12);
pruefe("zahl fehlendes Feld → Standard", z("fehlt", 12, 1, 60) === 12);
pruefe("zahl Grenze min", z("ok", 12, 7, 60) === 7);
pruefe("zahl Grenze max", z("ok", 12, 1, 7) === 7);
pruefe("zahl unter min → Standard", z("ok", 12, 8, 60) === 12);
pruefe("zahl fehlender Schlüssel → Standard", KE.zahl("fristen.gibtsnicht", "ok", 5, 1, 9) === 5);

// 3 setze / Schlüsselprüfung
reset();
let sb = fakeSb([]);
await KE.lade(sb, F1);
ereignisse.length = 0;
await KE.setze(sb, F1, "fristen.reaktivierung", { monate: 9 });
pruefe("setze: Zeile gespeichert", sb.zeilen.length === 1 && sb.zeilen[0].wert.monate === 9 && sb.zeilen[0].fahrschule_id === F1);
pruefe("setze: onConflict", sb.letzteOpt && sb.letzteOpt.onConflict === "fahrschule_id,schluessel");
pruefe("setze: Speicher aktuell", KE.zahl("fristen.reaktivierung", "monate", 12, 1, 60) === 9);
pruefe("setze: localStorage", JSON.parse(speicher.get("ke:" + F1)).werte["fristen.reaktivierung"].monate === 9 && JSON.parse(speicher.get("ke:" + F1)).zeit > 0);
pruefe("setze: Ereignis", ereignisse.length === 1 && ereignisse[0].geaendert === "fristen.reaktivierung" && ereignisse[0].fsId === F1);
const eingabe = { monate: 3 }; await KE.setze(sb, F1, "fristen.reaktivierung", eingabe); eingabe.monate = 77;
pruefe("setze: Kopie, nicht Verweis", KE.zahl("fristen.reaktivierung", "monate", 12, 1, 60) === 3);
for (const schlecht2 of ["", "fristen", "fristen.", "Fristen.x", "fristen.X", "fristen.1a", "unbekannt.x", "fristen.x-y", "fristen..x", "fristen.x y", "x.fristen.a", "fristen." + "a".repeat(80), null, 5]) {
  pruefe("Schlüssel abgelehnt: " + String(schlecht2).slice(0, 20), (await wirft(() => KE.setze(sb, F1, schlecht2, {}))) !== null);
}
for (const gut of ["fristen.a", "vorlagen.zahlung_mail", "fahrstunden.sonderfahrt.laenge", "papierkorb.tage", "rueckgaengig.sek"]) {
  pruefe("Schlüssel ok: " + gut, (await wirft(() => KE.setze(sb, F1, gut, { a: 1 }))) === null);
}
for (const schlecht3 of [null, undefined, [], [1], "x", 5, new Date(), () => 1]) {
  pruefe("Objekt abgelehnt: " + Object.prototype.toString.call(schlecht3), (await wirft(() => KE.setze(sb, F1, "fristen.a", schlecht3))) !== null);
}
pruefe("zu großes Objekt abgelehnt", (await wirft(() => KE.setze(sb, F1, "fristen.a", { t: "x".repeat(20000) }))) !== null);
pruefe("ohne fsId abgelehnt", (await wirft(() => KE.setze(sb, "", "fristen.a", {}))) !== null);

// 4 Fehler beim Speichern: Text, kein Ereignis, Speicher unverändert
reset();
sb = fakeSb([]); await KE.lade(sb, F1); await KE.setze(sb, F1, "fristen.a", { monate: 5 }); ereignisse.length = 0;
const fallE = [
  [{ fehler: { code: "42501", message: "new row violates row-level security policy" } }, "Keine Berechtigung zum Ändern"],
  [{ fehler: { status: 403, message: "x" } }, "Keine Berechtigung zum Ändern"],
  [{ wirft: "TypeError: Failed to fetch" }, "Keine Verbindung – nicht gespeichert"],
  [{ fehler: { message: "TypeError: Failed to fetch" } }, "Keine Verbindung – nicht gespeichert"],
  [{ fehler: { code: "42P01", message: 'relation "x" does not exist' } }, "Die Einstellungen sind noch nicht eingerichtet"],
];
for (const [o, text] of fallE) {
  const m = await wirft(() => KE.setze(fakeSb([], o), F1, "fristen.a", { monate: 99 }));
  pruefe("setze Fehler: " + text, m === text);
}
pruefe("Fehler: kein Ereignis", ereignisse.length === 0);
pruefe("Fehler: Speicher unverändert", KE.zahl("fristen.a", "monate", 12, 1, 60) === 5);
pruefe("Fehler: localStorage unverändert", JSON.parse(speicher.get("ke:" + F1)).werte["fristen.a"].monate === 5);

// 5 zuruecksetzen
reset();
sb = fakeSb([{ fahrschule_id: F1, schluessel: "fristen.a", wert: { monate: 5 } }, { fahrschule_id: F2, schluessel: "fristen.a", wert: { monate: 8 } }]);
await KE.lade(sb, F1); ereignisse.length = 0;
await KE.zuruecksetzen(sb, F1, "fristen.a");
pruefe("zurück: Zeile weg, andere Fahrschule bleibt", sb.zeilen.length === 1 && sb.zeilen[0].fahrschule_id === F2);
pruefe("zurück: wieder Standard", KE.zahl("fristen.a", "monate", 12, 1, 60) === 12);
pruefe("zurück: localStorage", !JSON.parse(speicher.get("ke:" + F1)).werte["fristen.a"]);
pruefe("zurück: Ereignis", ereignisse.length === 1 && ereignisse[0].geaendert === "fristen.a");
pruefe("zurück: Schlüssel geprüft", (await wirft(() => KE.zuruecksetzen(sb, F1, "quatsch"))) !== null);
pruefe("zurück: nicht vorhandene Zeile ist kein Fehler", (await wirft(() => KE.zuruecksetzen(sb, F1, "fristen.b"))) === null);
sb = fakeSb([{ fahrschule_id: F1, schluessel: "fristen.a", wert: { monate: 5 } }], { stillKeinRecht: true });
await KE.lade(sb, F1); ereignisse.length = 0;
pruefe("zurück: still verweigert → Berechtigung", (await wirft(() => KE.zuruecksetzen(sb, F1, "fristen.a"))) === "Keine Berechtigung zum Ändern");
pruefe("zurück: Fehler → Wert bleibt, kein Ereignis", KE.zahl("fristen.a", "monate", 12, 1, 60) === 5 && ereignisse.length === 0);
{ // Zeile lokal unbekannt (Speicher nicht geladen), in der DB vorhanden, aber kein Recht
  reset();
  const sbk = fakeSb([{ fahrschule_id: F1, schluessel: "fristen.a", wert: { monate: 5 } }], { stillKeinRecht: true });
  await KE.lade(fakeSb([]), F1); ereignisse.length = 0;
  pruefe("zurück ohne Recht, lokal unbekannt → Berechtigung", (await wirft(() => KE.zuruecksetzen(sbk, F1, "fristen.a"))) === "Keine Berechtigung zum Ändern");
  pruefe("zurück ohne Recht, lokal unbekannt: kein Ereignis", ereignisse.length === 0);
  pruefe("zurück ohne Recht, Zeile nicht vorhanden → kein Fehler", (await wirft(() => KE.zuruecksetzen(sbk, F1, "fristen.zz"))) === null);
}
pruefe("zurück: Netz", (await wirft(() => KE.zuruecksetzen(fakeSb([], { wirft: "Failed to fetch" }), F1, "fristen.a"))) === "Keine Verbindung – nicht zurückgesetzt");

// 6 Wechsel der Fahrschule ersetzt den Speicher
reset();
sb = fakeSb([{ fahrschule_id: F1, schluessel: "fristen.a", wert: { monate: 5 } }, { fahrschule_id: F2, schluessel: "fristen.b", wert: { monate: 8 } }]);
await KE.lade(sb, F1);
pruefe("F1 geladen", KE.zahl("fristen.a", "monate", 1, 1, 60) === 5 && KE.zahl("fristen.b", "monate", 1, 1, 60) === 1);
await KE.lade(sb, F2);
pruefe("F2 ersetzt F1", KE.fsId() === F2 && KE.zahl("fristen.a", "monate", 1, 1, 60) === 1 && KE.zahl("fristen.b", "monate", 1, 1, 60) === 8);
// langsame Antwort der alten Fahrschule darf die neue nicht überschreiben
reset();
sb = fakeSb([{ fahrschule_id: F1, schluessel: "fristen.a", wert: { monate: 5 } }, { fahrschule_id: F2, schluessel: "fristen.b", wert: { monate: 8 } }], { verzoegerung: { [F1]: 40, [F2]: 0 } });
const p1 = KE.lade(sb, F1), p2 = KE.lade(sb, F2); await Promise.all([p1, p2]);
pruefe("späte Antwort der alten Fahrschule verworfen", KE.fsId() === F2 && KE.zahl("fristen.a", "monate", 1, 1, 60) === 1 && KE.zahl("fristen.b", "monate", 1, 1, 60) === 8);
pruefe("localStorage der alten Fahrschule nicht aus F2 überschrieben", !speicher.has("ke:" + F1));
// setze für eine andere Fahrschule als die im Speicher: Speicher bleibt
await KE.setze(sb, F1, "fristen.a", { monate: 2 });
pruefe("setze für andere Fahrschule rührt den Speicher nicht an", KE.fsId() === F2 && KE.zahl("fristen.a", "monate", 1, 1, 60) === 1);

// 7 localStorage-Vorladen
reset();
speicher.set("ke:" + F1, JSON.stringify({ zeit: 1, werte: { "fristen.a": { monate: 4 }, "boese.x": { a: 1 }, "fristen.b": [1] } }));
sb = fakeSb([{ fahrschule_id: F1, schluessel: "fristen.a", wert: { monate: 6 } }], { verzoegerung: { [F1]: 20 } });
const pl = KE.lade(sb, F1);
pruefe("sofort aus Speicher gefüllt (vor Datenbank)", KE.zahl("fristen.a", "monate", 12, 1, 60) === 4);
pruefe("Ereignis ausSpeicher", ereignisse.length === 1 && ereignisse[0].ausSpeicher === true && ereignisse[0].fsId === F1);
pruefe("ungültige Schlüssel/Werte aus Speicher verworfen", gleich(KE.wert("boese.x", {}), {}) && gleich(KE.wert("fristen.b", { q: 1 }), { q: 1 }));
await pl;
pruefe("danach Datenbank", KE.zahl("fristen.a", "monate", 12, 1, 60) === 6);
pruefe("danach 2. Ereignis ohne ausSpeicher", ereignisse.length === 2 && !ereignisse[1].ausSpeicher && !ereignisse[1].fehler);
// kaputtes localStorage
reset(); speicher.set("ke:" + F1, "{kaputt");
await KE.lade(fakeSb([]), F1);
pruefe("kaputter Speicher stört nicht", KE.fsId() === F1 && KE.zahl("fristen.a", "monate", 12, 1, 60) === 12);
reset();
const alt = window.localStorage; window.localStorage = { getItem() { throw new Error("gesperrt"); }, setItem() { throw new Error("gesperrt"); } };
const sb7 = fakeSb([]); await KE.lade(sb7, F1); await KE.setze(sb7, F1, "fristen.a", { monate: 3 });
pruefe("gesperrter Speicher: lade/setze laufen", KE.zahl("fristen.a", "monate", 12, 1, 60) === 3);
window.localStorage = alt;

// 8 Fehler beim Laden → Standard + detail.fehler, Promise wirft nicht
for (const [o, name] of [[{ wirft: "Failed to fetch" }, "Netz"], [{ fehler: { code: "42P01", message: "x" } }, "42P01"], [{ fehler: { code: "PGRST205", message: "x" } }, "PGRST205"], [{ fehler: { code: "XX000", message: "kaputt" } }, "sonst"]]) {
  reset();
  let geworfen = false;
  try { await KE.lade(fakeSb([], o), F1); } catch (e) { geworfen = true; }
  const letzte = ereignisse[ereignisse.length - 1];
  pruefe("Laden " + name + ": wirft nicht", !geworfen);
  pruefe("Laden " + name + ": Ereignis mit Text", letzte && letzte.fsId === F1 && typeof letzte.fehler === "string" && letzte.fehler.length > 3);
  pruefe("Laden " + name + ": Standard", gleich(KE.wert("fristen.a", { m: 1 }), { m: 1 }) && KE.zahl("fristen.a", "m", 7, 1, 9) === 7);
}
// Netzfehler: der gespeicherte Stand bleibt nutzbar (offline)
reset();
speicher.set("ke:" + F1, JSON.stringify({ zeit: 1, werte: { "fristen.a": { monate: 4 } } }));
await KE.lade(fakeSb([], { wirft: "Failed to fetch" }), F1);
pruefe("Offline: gespeicherter Stand bleibt", KE.zahl("fristen.a", "monate", 12, 1, 60) === 4 && ereignisse[ereignisse.length - 1].fehler);
pruefe("lade ohne fsId wirft nicht", (await wirft(() => KE.lade(fakeSb([]), null))) === null);
{ const s = fakeSb([]); await KE.lade(s, F1); pruefe("lade: nur die Einstellungs-Tabelle", s.aufrufe.length === 1 && s.aufrufe[0] === "fahrschule_einstellungen"); }

// 9 Prüf-Team: alter Stand darf Frischgespeichertes nicht überschreiben
reset();
{
  const zeilen = [{ fahrschule_id: F1, schluessel: "fristen.a", wert: { monate: 12 } }];
  let freigeben;
  const langsam = { zeilen, from(t) { // erste Leseanfrage hängt, liefert den ALTEN Stand erst später
    const q = fakeSb(zeilen).from(t); const orig = q.then; let erste = !langsam.schon; langsam.schon = true;
    if (erste) { q.then = (a, b) => new Promise((r) => { freigeben = () => r(); }).then(() => ({ data: [{ schluessel: "fristen.a", wert: { monate: 12 } }], error: null })).then(a, b); }
    return q; } };
  const sbl = fakeSb(zeilen);
  const lade1 = KE.lade(langsam, F1);
  await KE.setze(sbl, F1, "fristen.a", { monate: 6 });
  freigeben(); await lade1;
  pruefe("alter lade-Stand überschreibt setze nicht", KE.zahl("fristen.a", "monate", 12, 1, 60) === 6);
  await new Promise((r) => setTimeout(r, 10));
  pruefe("nach Nachladen weiter 6", KE.zahl("fristen.a", "monate", 12, 1, 60) === 6);
}
reset();
{
  const zeilen = [{ fahrschule_id: F1, schluessel: "fristen.a", wert: { monate: 5 } }];
  let freigeben;
  const langsam = { from(t) { const q = fakeSb(zeilen).from(t); q.then = (a, b) => new Promise((r) => { freigeben = r; }).then(() => ({ data: [{ schluessel: "fristen.a", wert: { monate: 5 } }], error: null })).then(a, b); return q; } };
  const sbl = fakeSb(zeilen);
  const lade1 = KE.lade(langsam, F1);
  await KE.zuruecksetzen(sbl, F1, "fristen.a");
  freigeben(); await lade1;
  pruefe("alter lade-Stand bringt gelöschte Zeile nicht zurück", KE.zahl("fristen.a", "monate", 12, 1, 60) === 12);
}
// Nachladen holt Änderung eines anderen
reset();
{
  const zeilen = [];
  const sbn = fakeSb(zeilen); await KE.lade(sbn, F1); ereignisse.length = 0;
  let nr = 0; // 1. Aufruf = Speichern (upsert), 2. Aufruf = stilles Nachladen: dazwischen speichert jemand anderes
  const nebenbei = { from(t) { nr++; if (nr === 2) zeilen.push({ fahrschule_id: F1, schluessel: "fristen.b", wert: { monate: 3 } }); return sbn.from(t); } };
  await KE.setze(nebenbei, F1, "fristen.a", { monate: 4 });
  await new Promise((r) => setTimeout(r, 10));
  pruefe("Nachladen: eigene Änderung bleibt", KE.zahl("fristen.a", "monate", 12, 1, 60) === 4);
  pruefe("Nachladen: fremde Änderung kommt an", KE.zahl("fristen.b", "monate", 12, 1, 60) === 3);
  pruefe("Nachladen: Ereignis dafür", ereignisse.length === 2 && ereignisse[1].geaendert === undefined);
  pruefe("Nachladen: localStorage hat beides", JSON.parse(speicher.get("ke:" + F1)).werte["fristen.b"].monate === 3);
}
// geladen() bleibt nicht hängen, wenn setze() das erste lade() entwertet (Nachladen gleich oder kaputt)
for (const [nachFehler, name] of [[false, "gleich"], [true, "scheitert"]]) {
  reset();
  const zeilen = [{ fahrschule_id: F1, schluessel: "fristen.a", wert: { monate: 12 } }];
  const sbo = fakeSb(zeilen); let frei, nr = 0;
  const erst = { from(t) { nr++; const q = sbo.from(t); if (nr === 1) q.then = (a, b2) => new Promise((r) => { frei = r; }).then(() => ({ data: [], error: null })).then(a, b2); else if (nr === 3 && nachFehler) q.then = (a, b2) => Promise.resolve({ data: null, error: { message: "Failed to fetch" } }).then(a, b2); return q; } };
  const l1 = KE.lade(erst, F1);
  await KE.setze(erst, F1, "fristen.a", { monate: 6 });
  await new Promise((r) => setTimeout(r, 10));
  pruefe("geladen() nach entwertetem lade (Nachladen " + name + ")", KE.geladen() === true);
  frei(); await l1;
}

// 10 Größe in Bytes (Umlaute zählen doppelt)
reset();
sb = fakeSb([]); await KE.lade(sb, F1);
pruefe("7000 Umlaute = 14000 Bytes + Rahmen ok? (unter 15000)", (await wirft(() => KE.setze(sb, F1, "vorlagen.a", { t: "ä".repeat(7000) }))) === null);
pruefe("8000 Umlaute (16000 Bytes) abgelehnt, Text", (await wirft(() => KE.setze(sb, F1, "vorlagen.a", { t: "ä".repeat(8000) }))) === "Text zu lang – bitte kürzen");
pruefe("14000 ASCII ok", (await wirft(() => KE.setze(sb, F1, "vorlagen.b", { t: "a".repeat(14000) }))) === null);
// Postgres zählt jsonb-Text mit Leerzeichen nach ':' und ',' (octet_length(wert::text) <= 16000)
const jb = (o) => JSON.stringify(o).replace(/":/g, '": ').replace(/,"/g, ', "'); // nur für einfache Testdaten
const viele = (n) => { const o = {}; for (let i = 0; i < n; i++) o["k" + String(i).padStart(4, "0")] = 1; return o; };
pruefe("Testdaten: 1300 kleine Felder passen als jsonb", Buffer.byteLength(jb(viele(1300))) <= 16000);
pruefe("Testdaten: 1400 kleine Felder = unter 15000 als JSON, aber über 16000 als jsonb", JSON.stringify(viele(1400)).length < 15000 && Buffer.byteLength(jb(viele(1400))) > 16000);
pruefe("1300 kleine Felder ok", (await wirft(() => KE.setze(sb, F1, "vorlagen.c", viele(1300)))) === null);
pruefe("1400 kleine Felder abgelehnt (jsonb-Leerzeichen)", (await wirft(() => KE.setze(sb, F1, "vorlagen.c", viele(1400)))) === "Text zu lang – bitte kürzen");
pruefe("Grenze genau: 16000 Bytes ok", Buffer.byteLength(jb({ t: "a".repeat(15991) })) === 16000 && (await wirft(() => KE.setze(sb, F1, "vorlagen.d", { t: "a".repeat(15991) }))) === null);
pruefe("Grenze genau: 16001 Bytes abgelehnt", (await wirft(() => KE.setze(sb, F1, "vorlagen.d", { t: "a".repeat(15992) }))) === "Text zu lang – bitte kürzen");
pruefe("verschachtelt/Liste: Leerzeichen gezählt", (await wirft(() => KE.setze(sb, F1, "vorlagen.e", { l: Array.from({ length: 5400 }, () => 1) }))) === "Text zu lang – bitte kürzen"); // als JSON ca. 10800, als jsonb ca. 16200 Bytes
pruefe("16000 ASCII abgelehnt (jsonb 16009)", (await wirft(() => KE.setze(sb, F1, "vorlagen.b", { t: "a".repeat(16000) }))) === "Text zu lang – bitte kürzen");

// 11 leeren / geladen
reset();
sb = fakeSb([{ fahrschule_id: F1, schluessel: "fristen.a", wert: { monate: 5 } }]);
pruefe("geladen() vor lade = false", KE.geladen() === false);
const pg = KE.lade(sb, F1);
pruefe("geladen() während lade = false", KE.geladen() === false);
await pg;
pruefe("geladen() nach lade = true", KE.geladen() === true);
await KE.lade(fakeSb([], { wirft: "Failed to fetch" }), F2);
pruefe("geladen() nach Fehler = true", KE.geladen() === true);
await KE.lade(sb, F1); ereignisse.length = 0;
KE.leeren();
pruefe("leeren: fsId null, Standard, nicht geladen", KE.fsId() === null && KE.geladen() === false && KE.zahl("fristen.a", "monate", 12, 1, 60) === 12);
pruefe("leeren: Ereignis {fsId:null}", ereignisse.length === 1 && ereignisse[0].fsId === null);
pruefe("leeren: localStorage der Fahrschule weg", !speicher.has("ke:" + F1));
{ // Super-Admin hat mehrere Schulen angesehen: alle ke:* weg, Fremdes bleibt
  reset(); speicher.set("ke:" + F1, "{}"); speicher.set("ke:" + F2, "{}"); speicher.set("anderes", "1");
  await KE.lade(fakeSb([]), F1); KE.leeren();
  pruefe("leeren: alle ke:*-Schlüssel weg", ![...speicher.keys()].some((k) => k.startsWith("ke:")));
  pruefe("leeren: fremde Schlüssel bleiben", speicher.get("anderes") === "1");
}
{ // späte Antwort nach leeren() wird verworfen
  reset(); let frei;
  const spaet = { from() { const q = fakeSb([]).from("x"); q.then = (a, b) => new Promise((r) => { frei = r; }).then(() => ({ data: [{ schluessel: "fristen.a", wert: { monate: 5 } }], error: null })).then(a, b); return q; } };
  const p = KE.lade(spaet, F1); await new Promise((r) => setTimeout(r, 0)); KE.leeren(); frei(); await p;
  pruefe("lade nach leeren: Antwort verworfen", KE.fsId() === null && KE.zahl("fristen.a", "monate", 12, 1, 60) === 12);
}

// 12 ausSpeicher nur mit Werten
reset();
speicher.set("ke:" + F1, JSON.stringify({ zeit: 1, werte: {} }));
await KE.lade(fakeSb([]), F1);
pruefe("leerer Speicher: kein ausSpeicher-Ereignis", ereignisse.every((e) => !e.ausSpeicher) && ereignisse.length === 1);

// 13 abgelaufene Sitzung
for (const fe of [{ status: 401, message: "x" }, { code: "PGRST301", message: "x" }, { message: "JWT expired" }]) {
  pruefe("Sitzung abgelaufen: " + (fe.code || fe.status || fe.message), (await wirft(() => KE.setze(fakeSb([], { fehler: fe }), F1, "fristen.a", { m: 1 }))) === "Bitte neu anmelden – nicht gespeichert");
}

// 14 zahl: 5.0 (JSON.stringify(5.0) === "5")
reset();
await KE.lade(fakeSb([{ fahrschule_id: F1, schluessel: "fristen.z", wert: JSON.parse('{"a":5.0,"b":5.5,"c":1e2}') }]), F1);
pruefe("5.0 zählt als 5", KE.zahl("fristen.z", "a", 12, 1, 60) === 5);
pruefe("5.5 → Standard", KE.zahl("fristen.z", "b", 12, 1, 60) === 12);
pruefe("1e2 (=100) in JS ganze Zahl 100", KE.zahl("fristen.z", "c", 12, 1, 600) === 100);

console.log(`\nke-test: ${ok} ok, ${schlecht} Fehler`);
process.exit(schlecht ? 1 : 0);
