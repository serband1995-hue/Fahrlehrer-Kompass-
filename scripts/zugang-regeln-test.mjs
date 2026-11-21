// Prüft die Regeln für „Zugang bearbeiten / löschen“ der Server-Funktion admin-create-account (regeln.ts).
// Aufruf:  node scripts/zugang-regeln-test.mjs   (Node 22.18+ liest .ts direkt)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const R = await import(join(ROOT, "supabase/functions/admin-create-account/regeln.ts"));

let fehler = 0, faelle = 0;
function ist(name, a, b) {
  faelle++;
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) { fehler++; console.log("FALSCH", name, "\n  ist:  ", JSON.stringify(a), "\n  soll: ", JSON.stringify(b)); }
}
const FS = "fs-1", ANDERE = "fs-2";
const p = (id, rolle, fs = FS, extra = {}) => ({ id, rolle, fahrschule_id: fs, aktiv: true, name: "N " + id, ...extra });
const wer = (prof, art) => ({ requester: prof, isSuperAdmin: art === "super", isFahrschuleAdmin: art === "leitung", isBueroVerwalter: art === "verwalter" });
const SUPER = wer(p("s", "super_admin", null), "super");
const LEIT = wer(p("l", "fahrschule_admin"), "leitung");
const VERW = wer(p("b", "buero"), "verwalter");
const BUERO = wer(p("b", "buero"), "");          // Büro ohne Verwalten-Recht
const FL = wer(p("f0", "fahrlehrer"), "");        // Fahrlehrer selbst

// --- darfVerwalten ---
const fl = p("f1", "fahrlehrer"), flAndere = p("f2", "fahrlehrer", ANDERE), bu = p("b2", "buero"), leit2 = p("l2", "fahrschule_admin"), sup = p("s", "super_admin", FS);
ist("Super darf Fahrlehrer", R.darfVerwalten(SUPER, fl), null);
ist("Super darf andere Fahrschule", R.darfVerwalten(SUPER, flAndere), null);
ist("Super darf Leitung", R.darfVerwalten(SUPER, leit2), null);
ist("Super nie sich selbst / Super-Admin", R.darfVerwalten(SUPER, sup) !== null, true);
ist("Leitung darf Fahrlehrer", R.darfVerwalten(LEIT, fl), null);
ist("Leitung darf Büro", R.darfVerwalten(LEIT, bu), null);
ist("Leitung nicht andere Leitung", R.darfVerwalten(LEIT, leit2), "Keine Berechtigung");
ist("Leitung nicht andere Fahrschule", R.darfVerwalten(LEIT, flAndere), "Keine Berechtigung");
ist("Leitung nicht Super-Admin", R.darfVerwalten(LEIT, sup) !== null, true);
ist("Leitung nicht sich selbst", R.darfVerwalten(LEIT, p("l", "fahrschule_admin")) !== null, true);
ist("Verwalter darf Fahrlehrer", R.darfVerwalten(VERW, fl), null);
ist("Verwalter nicht Büro", R.darfVerwalten(VERW, bu), "Keine Berechtigung");
ist("Büro ohne Recht nicht", R.darfVerwalten(BUERO, fl), "Keine Berechtigung");
ist("Fahrlehrer selbst darf nicht (Kollege)", R.darfVerwalten(FL, fl), "Keine Berechtigung");
ist("Fahrlehrer selbst darf nicht (sich)", R.darfVerwalten(FL, p("f0", "fahrlehrer")) !== null, true);
ist("schon gelöscht", R.darfVerwalten(SUPER, p("x", "entfernt")), "Dieser Zugang ist schon gelöscht.");
ist("Leitung ohne Fahrschule darf nichts", R.darfVerwalten(wer(p("l", "fahrschule_admin", null), "leitung"), p("f9", "fahrlehrer", null)), "Keine Berechtigung");

ist("Leitung: fremder Betreiber-Zugang verrät nichts", R.darfVerwalten(LEIT, p("s2", "super_admin", ANDERE)), "Keine Berechtigung");
ist("Leitung: fremder gelöschter Zugang verrät nichts", R.darfVerwalten(LEIT, p("x2", "entfernt", ANDERE)), "Keine Berechtigung");

// --- pruefeAenderung ---
ist("Name ändern", R.pruefeAenderung(LEIT, fl, { name: "  Anna Neu " }).profil, { name: "Anna Neu" });
ist("Name leer", R.pruefeAenderung(LEIT, fl, { name: "  " }).fehler, "Bitte einen Namen eintragen.");
ist("Name gleich = nichts", R.pruefeAenderung(LEIT, fl, { name: "N f1" }).profil, {});
ist("Klassen setzen", R.pruefeAenderung(LEIT, fl, { klassen: ["BE", "B", "B", "x<"] }).profil, { klassen: ["B", "BE"] });
ist("Klassen bei Fahrlehrerlaubnis gesperrt", !!R.pruefeAenderung(LEIT, p("f3", "fahrlehrer", FS, { fahrlehrerlaubnis: ["BE"], klassen: ["B"] }), { klassen: ["B", "C"] }).fehler, true);
ist("Klassen unverändert bei Fahrlehrerlaubnis ok", R.pruefeAenderung(LEIT, p("f3", "fahrlehrer", FS, { fahrlehrerlaubnis: ["BE"], klassen: ["B", "BE"] }), { klassen: ["BE", "B"] }).fehler, undefined);
ist("Leitung: Fahrlehrer → Büro", R.pruefeAenderung(LEIT, fl, { rolle: "buero" }), { profil: { rolle: "buero" }, rolleWeg: true });
ist("Leitung: Büro → Fahrlehrer", R.pruefeAenderung(LEIT, bu, { rolle: "fahrlehrer" }), { profil: { rolle: "fahrlehrer" }, rolleWeg: false });
ist("Leitung ernennt keine Leitung", R.pruefeAenderung(LEIT, fl, { rolle: "fahrschule_admin" }).status, 403);
ist("Super ernennt Leitung", R.pruefeAenderung(SUPER, fl, { rolle: "fahrschule_admin" }).profil, { rolle: "fahrschule_admin" });
ist("Super: Leitung → Büro", R.pruefeAenderung(SUPER, leit2, { rolle: "buero" }).profil, { rolle: "buero" });
ist("Keine Super-Admin-Rolle vergeben", R.pruefeAenderung(SUPER, fl, { rolle: "super_admin" }).fehler, "Unbekannte Rolle.");
ist("Verwalter ändert keine Rolle", R.pruefeAenderung(VERW, fl, { rolle: "buero" }).status, 403);
ist("Verwalter ändert Name", R.pruefeAenderung(VERW, fl, { name: "X" }).profil, { name: "X" });
const oa = p("f4", "fahrlehrer", FS, { ohne_app: true });
ist("Ohne App → Büro geht nicht", !!R.pruefeAenderung(LEIT, oa, { rolle: "buero" }).fehler, true);
ist("Ohne App → mit App", R.pruefeAenderung(LEIT, oa, { email: " Neu@Beispiel.de " }), { profil: { ohne_app: false, email: "neu@beispiel.de" }, neueEmail: "neu@beispiel.de", rolleWeg: false });
ist("Ohne App → mit App und Büro", R.pruefeAenderung(LEIT, oa, { email: "neu@beispiel.de", rolle: "buero" }).fehler, undefined);
ist("Ungültige E-Mail", R.pruefeAenderung(LEIT, oa, { email: "kaputt" }).fehler, "Bitte eine gültige E-Mail-Adresse eintragen.");
ist("E-Mail bei App-Zugang nicht änderbar", !!R.pruefeAenderung(LEIT, fl, { email: "neu@beispiel.de" }).fehler, true);
ist("Klassen bei Büro nicht", !!R.pruefeAenderung(LEIT, bu, { klassen: ["B"] }).fehler, true);

// --- Leitung, die selbst fährt ---
const leitF = p("l3", "fahrschule_admin", FS, { faehrt_selbst: true, klassen: ["B"] });
ist("Super: Leitung fährt selbst an", R.pruefeAenderung(SUPER, leit2, { faehrt_selbst: true }).profil, { faehrt_selbst: true });
ist("Super: fährt selbst aus = Übergabe nötig", R.pruefeAenderung(SUPER, leitF, { faehrt_selbst: false }), { profil: { faehrt_selbst: false }, rolleWeg: true });
ist("Leitung fährt selbst: Klassen erlaubt", R.pruefeAenderung(SUPER, leitF, { klassen: ["B", "BE"] }).profil, { klassen: ["B", "BE"] });
ist("Reine Leitung: keine Klassen", !!R.pruefeAenderung(SUPER, leit2, { klassen: ["B"] }).fehler, true);
ist("Fahrlehrer → Leitung fährt selbst: keine Übergabe", R.pruefeAenderung(SUPER, fl, { rolle: "fahrschule_admin", faehrt_selbst: true }), { profil: { rolle: "fahrschule_admin", faehrt_selbst: true }, rolleWeg: false });
ist("Fahrlehrer → reine Leitung: Übergabe", R.pruefeAenderung(SUPER, fl, { rolle: "fahrschule_admin" }).rolleWeg, true);
ist("Leitung fährt selbst → Büro: Kennzeichen weg", R.pruefeAenderung(SUPER, leitF, { rolle: "buero" }).profil, { rolle: "buero", faehrt_selbst: false });
ist("Kennzeichen bei Fahrlehrer wirkungslos", R.pruefeAenderung(LEIT, fl, { faehrt_selbst: true }).profil, {});
ist("unterrichtet()", [R.unterrichtet("fahrlehrer"), R.unterrichtet("fahrschule_admin", true), R.unterrichtet("fahrschule_admin", false), R.unterrichtet("buero", true)], [true, true, false, false]);

// --- Übergabe ---
ist("nichts offen", R.uebergabeNoetig({ schueler: 0, termine: 0, pruefungen: 0 }, "Anna"), null);
ist("Schüler offen", R.uebergabeNoetig({ schueler: 3, termine: 1, pruefungen: 0 }, "Anna").startsWith("Anna hat noch 3 Schüler, 1 künftiger Termin."), true);
const jetzt = { datum: "2026-11-21", zeit: "14:05" };
ist("Termin morgen kommt", R.terminKommtNoch({ datum: "2026-11-22", bis: "08:00" }, jetzt), true);
ist("Termin gestern nicht", R.terminKommtNoch({ datum: "2026-11-20", bis: "18:00" }, jetzt), false);
ist("heute vorbei nicht", R.terminKommtNoch({ datum: "2026-11-21", bis: "14:00" }, jetzt), false);
ist("heute später kommt", R.terminKommtNoch({ datum: "2026-11-21", bis: "15:30" }, jetzt), true);
ist("Berlin-Zeit Winter", R.berlinJetzt(new Date("2026-11-21T23:30:00Z")), { datum: "2026-11-22", zeit: "00:30" });
ist("Berlin-Zeit Sommer", R.berlinJetzt(new Date("2026-07-01T22:15:00Z")), { datum: "2026-07-02", zeit: "00:15" });
ist("likeGenau entschärft", R.likeGenau(" Anna_Muster 100% "), "Anna\\_Muster 100\\%");
ist("Platzhalter-E-Mail", R.platzhalterEmail("abc"), "entfernt-abc@entfernt.invalid");

// --- index.ts nutzt die Regeln wirklich (nicht nur hier getestet) ---
const ts = readFileSync(join(ROOT, "supabase/functions/admin-create-account/index.ts"), "utf8");
for (const w of ["darfVerwalten(wer, ziel)", "pruefeAenderung(wer, ziel", "uebergabeNoetig(offen", '"update_account"', '"delete_account"', "ban_duration", 'ban_duration: "none"', "likeGenau(ziel.name)", 'eq("status", "bestaetigt")', '.is("inaktiv_seit", null)', 'from("buero_sitzungen").delete()']) ist("index.ts enthält " + w, ts.includes(w), true);

console.log(`${faelle - fehler} von ${faelle} Fällen richtig.`);
process.exit(fehler ? 1 : 0);
