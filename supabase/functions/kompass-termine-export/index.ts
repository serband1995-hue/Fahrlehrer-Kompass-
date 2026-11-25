import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { berlinHeute, termineBauen, mehrdeutigeNummern, bestandenBauen, type ExportSchueler } from "./termine.ts";

/*
  kompass-termine-export (10.10.2026)
  -----------------------------------
  Lese-Schnittstelle neben kompass-schueler-export: die Fahr-Akademie holt hier naechtlich die kommenden
  Praxispruefungs-Termine ab, damit der Countdown in der Akademie zaehlt.
  Es wird NICHTS geschrieben. Herausgegeben werden je aktivem Schueler nur zwei Felder: Telefon und Datum
  (frueheste geplante Praxispruefung ab heute). Keine Namen, keine Ergebnisse, keine Pruefer.
  Absicherung wie beim Schueler-Export: geteiltes Geheimnis im Kopf x-bridge-secret (Maschine zu Maschine,
  daher verify_jwt aus, keine CORS-Kopfzeilen).

  --- K1, 11.11.2026 (KD9, Teil von BR15 und BR6) ---
  Die Schueler kommen nicht mehr aus der Tabelle schueler, sondern aus der Sicht v_akademie_export_schueler.
  Sie enthaelt nur Fahrschulen mit eingeschaltetem Akademie-Export. Termine gibt es nur noch fuer Schueler
  in Ausbildung (in_ausbildung = true). Fuer die Pruefung auf doppelte Nummern zaehlen weiter alle aktiv
  gefuehrten Schueler dieser Fahrschulen.

  --- v4, 25.11.2026 (Akademie) ---
  Zusaetzlich "bestanden": je Telefonnummer die juengste bestandene Praxispruefung der letzten 120 Tage mit Klasse
  ({telefon, datum, klasse}, keine Namen). Schueler aus der Sicht OHNE Filter in_ausbildung. Eine Nummer, die bei mehr als
  einem Schueler im Export steht, wird weggelassen (gezaehlt ueber ALLE Schueler der Sicht). Ein Fehler in diesem Teil
  verhindert nie die Termine: dann bestanden = [].
*/
function secretsMatch(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
}
const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const antwort = (status: number, body: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...extra } });

async function geheimnisErmitteln(client: ReturnType<typeof createClient> | null): Promise<string | null> {
  const ausEnv = Deno.env.get("kompass_bridge_secret");
  if (ausEnv && ausEnv.length >= 16) return ausEnv;
  try {
    if (!client) return null;
    const { data, error } = await client.rpc("get_bridge_secret");
    if (error) { console.error("Vault-Zugriff fehlgeschlagen:", error.message); return null; }
    return typeof data === "string" && data.length >= 16 ? data : null;
  } catch (e) { console.error("Vault-Zugriff fehlgeschlagen:", e instanceof Error ? e.message : String(e)); return null; }
}

// v4: Bestandene Praxispruefungen. Nur lesen. Jeder Fehler ergibt eine leere Liste (die Termine gehen trotzdem raus).
async function bestandenLaden(client: ReturnType<typeof createClient>, heute: string): Promise<{ telefon: string; datum: string; klasse: string | null }[]> {
  try {
    const ab = berlinHeute(new Date(Date.now() - 120 * 86400000));
    const { data: pb, error: e2 } = await client.from("pruefungstermine")
      .select("schueler_id, datum, klasse").eq("art", "praxis").eq("status", "bestanden")
      .gte("datum", ab).lte("datum", heute).not("schueler_id", "is", null)
      .order("datum", { ascending: false }).limit(5000);
    if (e2) { console.error("Datenbankfehler (Bestanden):", e2.message); return []; }
    if (!(pb || []).length) return [];
    if ((pb || []).length >= 1000) { console.error("Zu viele bestandene Pruefungen fuer eine Abfrage"); return []; }
    // ALLE Schueler im Export (seitenweise, PostgREST liefert hoechstens 1000 je Abfrage), damit Geschwister sicher erkannt werden
    const alle: ExportSchueler[] = [];
    for (let seite = 0; ; seite++) {
      if (seite >= 50) { console.error("Zu viele Schueler im Export"); return []; }
      const { data, error } = await client.from("v_akademie_export_schueler").select("id, telefon, klasse")
        .order("id", { ascending: true }).range(seite * 1000, seite * 1000 + 999);
      if (error) { console.error("Datenbankfehler (Bestanden-Schueler):", error.message); return []; }
      alle.push(...((data || []) as ExportSchueler[]));
      if ((data || []).length < 1000) break;
    }
    return bestandenBauen(pb || [], alle, ab, heute);
  } catch (e) {
    console.error("Fehler (Bestanden):", e instanceof Error ? e.message : String(e));
    return [];
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return antwort(405, { fehler: "Nur POST erlaubt" }, { Allow: "POST" });
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) { console.error("SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt"); return antwort(500, { fehler: "Serverfehler" }); }
  // Ohne plausiblen Kopf sofort abweisen, bevor die Datenbank oder der Tresor angefasst wird (kein Aufwand fuer Unberechtigte).
  const kopf = req.headers.get("x-bridge-secret") ?? "";
  if (kopf.length < 16 || kopf.length > 256) return antwort(401, { fehler: "Nicht berechtigt" });
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const erwartet = await geheimnisErmitteln(client);
  if (!erwartet) { console.error("kompass_bridge_secret fehlt oder ist zu kurz - Anfrage abgewiesen"); return antwort(401, { fehler: "Nicht berechtigt" }); }
  if (!secretsMatch(req.headers.get("x-bridge-secret") ?? "", erwartet)) return antwort(401, { fehler: "Nicht berechtigt" });

  try {
    const heute = berlinHeute();
    const { data: pt, error: e1 } = await client.from("pruefungstermine")
      .select("schueler_id, datum").eq("art", "praxis").eq("status", "geplant").gte("datum", heute)
      .not("schueler_id", "is", null).order("datum", { ascending: true }).limit(5000);
    if (e1) { console.error("Datenbankfehler (Termine):", e1.message); return antwort(500, { fehler: "Serverfehler" }); }
    // PostgREST liefert hoechstens 1000 Zeilen je Abfrage. Wuerde abgeschnitten, fehlten spaete Termine und die Akademie
    // wuerde sie faelschlich entfernen -- lieber ein Fehler als stilles Abschneiden.
    if ((pt || []).length >= 1000) { console.error("Zu viele Termine fuer eine Abfrage"); return antwort(500, { fehler: "Serverfehler" }); }
    const ids = Array.from(new Set((pt || []).map((p: { schueler_id: string }) => String(p.schueler_id))));
    const schueler: { id: string; telefon: string | null; status: string | null }[] = [];
    for (let i = 0; i < ids.length; i += 200) {
      // Nur Schueler in Ausbildung aus Fahrschulen mit Akademie-Export (Sicht filtert die Fahrschule)
      const { data, error } = await client.from("v_akademie_export_schueler").select("id, telefon, status")
        .eq("in_ausbildung", true).in("id", ids.slice(i, i + 200));
      if (error) { console.error("Datenbankfehler (Schueler):", error.message); return antwort(500, { fehler: "Serverfehler" }); }
      schueler.push(...(data || []));
    }
    // Mehrdeutige Nummern: alle aktiv gefuehrten Schueler (auch bestandene) mit einer der betroffenen Nummern laden und zaehlen
    const nummern = Array.from(new Set(schueler.map((x) => String(x.telefon || "").trim()).filter((x) => x)));
    const gleiche: { id: string; telefon: string | null; status: string | null }[] = [];
    for (let i = 0; i < nummern.length; i += 100) {
      const { data, error } = await client.from("v_akademie_export_schueler").select("id, telefon, status").in("telefon", nummern.slice(i, i + 100));
      if (error) { console.error("Datenbankfehler (Nummern):", error.message); return antwort(500, { fehler: "Serverfehler" }); }
      gleiche.push(...(data || []));
    }
    const termine = termineBauen(pt || [], schueler, heute, mehrdeutigeNummern(gleiche));
    // Haengt der Bestanden-Teil, gehen die Termine nach hoechstens 10 Sekunden trotzdem raus (dann bestanden = []).
    let uhr: ReturnType<typeof setTimeout> | undefined;
    const bestanden = await Promise.race([
      bestandenLaden(client, heute),
      new Promise<{ telefon: string; datum: string; klasse: string | null }[]>((r) => { uhr = setTimeout(() => { console.error("Bestanden-Teil zu langsam"); r([]); }, 10000); }),
    ]);
    clearTimeout(uhr);
    console.log("Termine ausgeliefert: " + termine.length + ", bestanden: " + bestanden.length);   // nur Anzahlen, keine Daten
    return antwort(200, { termine, bestanden });
  } catch (e) {
    console.error("Unerwarteter Fehler:", e instanceof Error ? e.message : String(e));
    return antwort(500, { fehler: "Serverfehler" });
  }
});
