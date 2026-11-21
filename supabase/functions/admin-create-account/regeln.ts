// Regeln für „Zugang bearbeiten“ und „Zugang löschen“ (🗣 Serband 21.11.2026).
// Reine Funktionen ohne Datenbank, damit sie mit Node getestet werden können (scripts/zugang-regeln-test.mjs).

export type Profil = {
  id: string;
  rolle: string;
  fahrschule_id: string | null;
  ohne_app?: boolean | null;
  aktiv?: boolean | null;
  fahrlehrerlaubnis?: string[] | null;
  klassen?: string[] | null;
  name?: string | null;
  faehrt_selbst?: boolean | null;
};

// Unterrichtet diese Person selbst (eigene Schüler)? Fahrlehrer und die Leitung mit Kennzeichen „fährt selbst“.
export function unterrichtet(rolle: string, faehrtSelbst: unknown): boolean {
  return rolle === "fahrlehrer" || (rolle === "fahrschule_admin" && faehrtSelbst === true);
}

export type Wer = {
  requester: Profil;
  isSuperAdmin: boolean;
  isFahrschuleAdmin: boolean;
  isBueroVerwalter: boolean;
};

// Rolle, die ein gelöschter Zugang bekommt: Er fällt so aus allen Listen (die nach Rolle filtern),
// Name und Verlauf (Termine, Fahrstunden, Fahrcheck) bleiben erhalten.
export const ROLLE_ENTFERNT = "entfernt";

export function klassenListe(k: unknown): string[] {
  if (!Array.isArray(k)) return [];
  return [...new Set(k.map((x) => String(x)).filter((x) => /^[A-Z0-9+]{1,6}$/.test(x)))].sort();
}

export function platzhalterEmail(id: string): string {
  return `entfernt-${id}@entfernt.invalid`;
}

// Muster für ilike, das genau diesen Text trifft (ohne Groß/klein): % _ und \ werden entschärft
export function likeGenau(s: string): string {
  return String(s || "").trim().replace(/[\\%_]/g, (c) => "\\" + c);
}

export function istEmail(s: unknown): boolean {
  return typeof s === "string" && s.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

// null = darf; sonst Fehlertext (für Bearbeiten und Löschen gleich)
export function darfVerwalten(wer: Wer, ziel: Profil): string | null {
  // Fremde Fahrschule zuerst: dann verrät die Antwort nichts über Zugänge anderer Fahrschulen
  const gleicheSchule = !!wer.requester.fahrschule_id && ziel.fahrschule_id === wer.requester.fahrschule_id;
  if (!wer.isSuperAdmin && !gleicheSchule) return "Keine Berechtigung";
  if (ziel.rolle === "super_admin") return "Der Zugang des Betreibers kann hier nicht geändert werden.";
  if (ziel.id === wer.requester.id) return "Den eigenen Zugang kann man hier nicht ändern oder löschen.";
  if (ziel.rolle === ROLLE_ENTFERNT) return "Dieser Zugang ist schon gelöscht.";
  if (wer.isSuperAdmin) return null;
  if (wer.isFahrschuleAdmin && ["fahrlehrer", "buero"].includes(ziel.rolle)) return null;
  if (wer.isBueroVerwalter && ziel.rolle === "fahrlehrer") return null;
  return "Keine Berechtigung";
}

export type Wunsch = { name?: unknown; klassen?: unknown; rolle?: unknown; email?: unknown; faehrt_selbst?: unknown };
export type Aenderung = {
  fehler?: string;
  status?: number;
  profil: Record<string, unknown>;   // Felder für profiles
  neueEmail?: string;                // ohne App → mit App
  rolleWeg?: boolean;                // unterrichtet danach nicht mehr (z. B. Fahrlehrer wird Büro): vorher Übergabe nötig
};

const ROLLEN_ERLAUBT = ["fahrlehrer", "buero", "fahrschule_admin"];

export function pruefeAenderung(wer: Wer, ziel: Profil, w: Wunsch): Aenderung {
  const profil: Record<string, unknown> = {};
  const nein = (fehler: string, status = 400): Aenderung => ({ fehler, status, profil: {} });

  if (w.name !== undefined) {
    const name = String(w.name ?? "").trim();
    if (!name) return nein("Bitte einen Namen eintragen.");
    if (name.length > 100) return nein("Der Name ist zu lang (höchstens 100 Zeichen).");
    if (name !== (ziel.name || "")) profil.name = name;
  }

  let rolle = ziel.rolle;
  if (w.rolle !== undefined && w.rolle !== null && w.rolle !== ziel.rolle) {
    rolle = String(w.rolle);
    if (!ROLLEN_ERLAUBT.includes(rolle)) return nein("Unbekannte Rolle.");
    if (wer.isBueroVerwalter && !wer.isSuperAdmin && !wer.isFahrschuleAdmin) return nein("Die Rolle ändert nur die Fahrschul-Leitung.", 403);
    if ((rolle === "fahrschule_admin" || ziel.rolle === "fahrschule_admin") && !wer.isSuperAdmin) return nein("Die Leitung ernennt nur der Betreiber.", 403);
    profil.rolle = rolle;
  }

  let ohneApp = !!ziel.ohne_app;
  if (w.email !== undefined && w.email !== null && w.email !== "") {
    if (!ziel.ohne_app) return nein("Die E-Mail-Adresse kann hier nicht geändert werden.");
    const email = String(w.email).trim().toLowerCase();
    if (!istEmail(email)) return nein("Bitte eine gültige E-Mail-Adresse eintragen.");
    ohneApp = false;
    profil.ohne_app = false;
    profil.email = email;
  }
  if (ohneApp && rolle !== "fahrlehrer") return nein("Ohne App geht nur bei Fahrlehrern. Bitte zuerst eine E-Mail eintragen.");

  // „Fährt selbst“ gibt es nur bei der Leitung; die Leitung bearbeitet nur der Betreiber (darfVerwalten)
  let faehrt = ziel.faehrt_selbst === true;
  if (rolle !== "fahrschule_admin") faehrt = false;
  else if (w.faehrt_selbst !== undefined && w.faehrt_selbst !== null) {
    if (!wer.isSuperAdmin) return nein("„Fährt selbst“ stellt nur der Betreiber ein.", 403);
    faehrt = w.faehrt_selbst === true;
  }
  if (faehrt !== (ziel.faehrt_selbst === true)) profil.faehrt_selbst = faehrt;

  if (w.klassen !== undefined && w.klassen !== null) {
    const kl = klassenListe(w.klassen);
    const alt = klassenListe(ziel.klassen || []);
    if (kl.join(",") !== alt.join(",")) {
      if ((ziel.fahrlehrerlaubnis || []).length) return nein("Die Klassen kommen aus der Fahrlehrerlaubnis. Bitte in der Fahrlehrer-Akte ändern.");
      if (!unterrichtet(rolle, faehrt)) return nein("Klassen gibt es nur bei Fahrlehrern.");
      profil.klassen = kl;
    }
  }

  return {
    profil,
    neueEmail: typeof profil.email === "string" ? profil.email as string : undefined,
    rolleWeg: unterrichtet(ziel.rolle, ziel.faehrt_selbst) && !unterrichtet(rolle, faehrt),
  };
}

// Was hängt noch am Fahrlehrer? Dann erst übergeben (null = frei).
export type Offen = { schueler: number; termine: number; pruefungen: number };
export function uebergabeNoetig(o: Offen, name: string): string | null {
  const teile: string[] = [];
  if (o.schueler) teile.push(`${o.schueler} Schüler`);
  if (o.termine) teile.push(`${o.termine} künftige${o.termine === 1 ? "r" : ""} Termin${o.termine === 1 ? "" : "e"}`);
  if (o.pruefungen) teile.push(`${o.pruefungen} geplante Prüfung${o.pruefungen === 1 ? "" : "en"}`);
  if (!teile.length) return null;
  return `${name || "Dieser Fahrlehrer"} hat noch ${teile.join(", ")}. Bitte zuerst einem anderen Fahrlehrer geben (Schüler öffnen und den Fahrlehrer wechseln), dann noch einmal löschen.`;
}

// Heute (Berlin) und ob ein Termin noch kommt. Termine von heute zählen, solange sie nicht vorbei sind.
export function berlinJetzt(d = new Date()): { datum: string; zeit: string } {
  const f = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  const s = f.format(d); // "2026-11-21 14:05"
  return { datum: s.slice(0, 10), zeit: s.slice(11, 16) };
}
export function terminKommtNoch(t: { datum: string; bis?: string | null }, jetzt: { datum: string; zeit: string }): boolean {
  if (!t.datum) return false;
  if (t.datum > jetzt.datum) return true;
  if (t.datum < jetzt.datum) return false;
  return !t.bis || String(t.bis).slice(0, 5) > jetzt.zeit;
}
