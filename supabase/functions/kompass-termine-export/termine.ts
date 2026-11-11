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
