// Reine Rechenlogik (ohne Datenbank), damit sie getestet werden kann: werkzeuge/edge-functions/pruefe-termine.mjs
// Aus den kommenden, geplanten Praxisprüfungen und den aktiven Schülern wird je Telefonnummer der FRÜHESTE Termin.
export type Pruefung = { schueler_id: string | null; datum: string };
export type Schueler = { id: string; telefon: string | null; status: string | null };

export function berlinHeute(jetzt = new Date()): string {
  // sv-SE liefert JJJJ-MM-TT
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(jetzt);
}

// Gleiche Nummer bei mehreren aktiven Schülern (Geschwister, Familie): nicht eindeutig, wird nicht ausgeliefert.
export function mehrdeutigeNummern(schueler: Schueler[]): Set<string> {
  const z = new Map<string, number>();
  for (const s of schueler) { if (s && s.status === "aktiv" && s.telefon) { const t = String(s.telefon).replace(/\(0\)/g, "").replace(/[\s\-\/().]/g, ""); z.set(t, (z.get(t) || 0) + 1); } }
  return new Set(Array.from(z.entries()).filter(([, n]) => n > 1).map(([t]) => t));
}
export function termineBauen(pruefungen: Pruefung[], schueler: Schueler[], heute: string, ausgeschlossen: Set<string> = new Set()): { telefon: string; datum: string }[] {
  const nachId = new Map<string, Schueler>();
  schueler.forEach((s) => { if (s && s.id) nachId.set(String(s.id), s); });
  const frueh = new Map<string, string>();
  for (const p of pruefungen) {
    if (!p || !p.schueler_id || !/^\d{4}-\d{2}-\d{2}$/.test(String(p.datum))) continue;
    if (String(p.datum) < heute) continue;
    const s = nachId.get(String(p.schueler_id));
    if (!s || s.status !== "aktiv") continue;
    const tel = String(s.telefon || "").trim();
    if (!tel) continue;
    if (ausgeschlossen.has(tel.replace(/\(0\)/g, "").replace(/[\s\-\/().]/g, ""))) continue;
    const alt = frueh.get(tel);
    if (!alt || p.datum < alt) frueh.set(tel, p.datum);
  }
  return Array.from(frueh.entries()).map(([telefon, datum]) => ({ telefon, datum }));
}

// v4 (Akademie, 25.11.2026): je Telefonnummer UND Klasse die JUENGSTE bestandene Praxispruefung im Zeitraum [ab, heute].
// alle = ALLE Schueler im Export (Sicht v_akademie_export_schueler, ohne Filter in_ausbildung): eine Nummer, die dort
// mehr als einmal vorkommt (Geschwister, Familie), wird nie ausgeliefert -- auch wenn nur ein Geschwister bestanden hat.
// klasse: aus der Pruefung, sonst die Klasse des Schuelers, sonst null. Keine Namen.
export type BestandenPruefung = { schueler_id: string | null; datum: string; klasse?: string | null };
export type ExportSchueler = { id: string; telefon: string | null; klasse?: string | null };
// +49 / 0049 am Anfang gilt wie 0 (gleiche Nummer in zwei Schreibweisen = Geschwister erkannt). Nur fuer "bestanden".
export function telefonNorm(t: string): string { return String(t || "").replace(/\(0\)/g, "").replace(/[\s\-\/().]/g, "").replace(/^(\+|00)490?/, "0"); }
export function bestandenBauen(pruefungen: BestandenPruefung[], alle: ExportSchueler[], ab: string, heute: string): { telefon: string; datum: string; klasse: string | null }[] {
  const nachId = new Map<string, ExportSchueler>();
  const zaehl = new Map<string, number>();
  for (const s of alle) {
    if (!s || !s.id || nachId.has(String(s.id))) continue;   // doppelt geladene Zeile (Seitenwechsel) nur einmal zaehlen
    nachId.set(String(s.id), s);
    const n = telefonNorm(String(s.telefon || "").trim());
    if (n) zaehl.set(n, (zaehl.get(n) || 0) + 1);
  }
  const best = new Map<string, { telefon: string; datum: string; klasse: string | null }>();
  for (const p of pruefungen) {
    if (!p || !p.schueler_id || !/^\d{4}-\d{2}-\d{2}$/.test(String(p.datum))) continue;
    if (String(p.datum) < ab || String(p.datum) > heute) continue;
    const s = nachId.get(String(p.schueler_id));
    if (!s) continue;                                   // nicht im Export (andere Fahrschule, inaktiv, geloescht)
    const tel = String(s.telefon || "").trim();
    const n = telefonNorm(tel);
    if (!n || (zaehl.get(n) || 0) > 1) continue;        // keine oder mehrdeutige Nummer
    const k = String(p.klasse || s.klasse || "").trim();
    const schluessel = n + "|" + k.toUpperCase();      // je Nummer UND Klasse (B und CE = zwei Eintraege)
    const alt = best.get(schluessel);
    if (alt && alt.datum >= String(p.datum)) continue;  // juengste je Kombination gewinnt
    best.set(schluessel, { telefon: tel, datum: String(p.datum), klasse: k || null });
  }
  return Array.from(best.values());
}

// v4.1 (26.11.2026): zweite Quelle. Die Fahrlehrer-App schreibt Pruefungsergebnisse nie in pruefungstermine, sondern in
// kalender_pruefungen (schueler_id, datum, result 'pass'/'fail', payload.b197, geloescht). Ohne Klasse: bestandenBauen nimmt
// dann die Klasse des Schuelers aus der Sicht. Wie buero.js pruefErgebnisse: B197-Schaltkompetenz zaehlt nicht, und ein
// App-Eintrag am selben Tag wie ein Tafel-Eintrag desselben Schuelers wird uebersprungen. Unbekannte Werte -> Eintrag weg.
export type AppPruefung = { schueler_id?: unknown; datum?: unknown; result?: unknown; payload?: unknown; geloescht?: unknown };
export function appBestanden(zeilen: AppPruefung[], tafel: BestandenPruefung[]): BestandenPruefung[] {
  const schonDa = new Set<string>();
  for (const t of tafel) if (t && t.schueler_id) schonDa.add(String(t.schueler_id) + "|" + String(t.datum).slice(0, 10));
  const aus: BestandenPruefung[] = [];
  for (const z of zeilen || []) {
    if (!z || typeof z !== "object") continue;
    if (z.result !== "pass" && z.result !== "bestanden") continue;
    if (z.geloescht !== false && z.geloescht !== null && z.geloescht !== undefined) continue;   // nur sicher nicht geloescht
    const pl = z.payload;
    if (pl !== null && pl !== undefined && (typeof pl !== "object" || Array.isArray(pl))) continue;
    const b197 = pl ? (pl as Record<string, unknown>).b197 : undefined;
    if (b197 !== undefined && b197 !== null && b197 !== false && b197 !== "false") continue;   // B197 oder unbekannt
    if (typeof z.schueler_id !== "string" || !z.schueler_id) continue;
    const roh = typeof z.datum === "string" ? z.datum : "";
    const m = /^(\d{4}-\d{2}-\d{2})(?:$|[T ])/.exec(roh);
    if (!m) continue;
    if (schonDa.has(z.schueler_id + "|" + m[1])) continue;   // dieselbe Pruefung steht schon auf der Tafel
    schonDa.add(z.schueler_id + "|" + m[1]);
    aus.push({ schueler_id: z.schueler_id, datum: m[1], klasse: null });
  }
  return aus;
}
