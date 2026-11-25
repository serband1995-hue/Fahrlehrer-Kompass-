// Fahrlehrer-Kompass – Zahlungsaufforderung per Mail (Auftrag 4, Werkstatt 11, 24.11.2026).
// Büro drückt „Zahlungsaufforderung verschicken“ -> diese Funktion ruft rpc zahlungs_mail_vorbereiten (prüft ALLES:
// Rolle, Fahrschule, Betrag, Zahlungsdaten, Limit, bestimmt den Empfänger selbst) und verschickt dann über Resend.
// Deploy mit verify_jwt = false (die Funktion prüft den Anmelde-Token über die Datenbank-Funktion selbst).
// Nie die volle Empfänger-Adresse zurückgeben. Im Testmodus: [TEST] im Betreff und gelber Kasten in der Mail.
// W15 S4: Den Satz der Mail füllt mail.js aus der Vorlage der Fahrschule (Rückgabe der RPC: vorlage_art, vorlage, faellig_am,
// tage). Beim Deploy alle drei Dateien mitgeben: index.ts, mail.js, vorlagen.js (= Kopie von kompass-vorlagen.js).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { absender, base64, betreff, epcText, mailHtml, mailText, qrPng } from "./mail.js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ fehler: "nur_post" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ fehler: "ungueltige_anfrage" }, 400); }
  const { requester_token, buero_sitzung, schueler_id, art, betrag_cent, wofuer, erwarteter_modus, erwartete_empfaenger } = body || {};
  if (!requester_token) return json({ fehler: "nicht_angemeldet" }, 401);
  if (!schueler_id || !art || !Number.isInteger(betrag_cent) || !["test", "echt"].includes(String(erwarteter_modus))) return json({ fehler: "ungueltige_anfrage" }, 400);

  const headers: Record<string, string> = { Authorization: "Bearer " + requester_token };
  if (buero_sitzung) headers["x-buero-sitzung"] = String(buero_sitzung);
  const user = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, { global: { headers }, auth: { persistSession: false } });
  const service = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

  const { data: d, error: rpcErr } = await user.rpc("zahlungs_mail_vorbereiten", {
    p_schueler: String(schueler_id), p_art: String(art), p_betrag_cent: betrag_cent, p_wofuer: String(wofuer ?? ""),
  });
  if (rpcErr) return json({ fehler: "vorbereiten_fehlgeschlagen" }, 400);
  if (!d || d.fehler || !d.ok) return json({ fehler: d?.fehler || "unbekannt" }, 400);

  const merke = async (felder: Record<string, unknown>) => {
    const { error } = await service.from("zahlungs_mails").update(felder).eq("id", d.id);
    if (error) console.warn("zahlungs_mails update:", error.message);
  };
  // Der Bildschirm zeigte einen anderen Modus (jemand hat inzwischen umgeschaltet): nichts senden.
  // „Zahlung ausstehend“ nur, solange der Schüler wirklich gesperrt ist (K8; Fable M3)
  if (d.art === "zahlung_offen") {
    const { data: sperre, error: sperreErr } = await service.rpc("schueler_buchung_gesperrt", { sid: String(schueler_id) });
    if (sperreErr) {
      await merke({ status: "fehler", fehler: "Sperre nicht prüfbar, nicht gesendet" });
      return json({ fehler: "versand_fehlgeschlagen" }, 500);
    }
    if (!sperre) {
      await merke({ status: "fehler", fehler: "Keine Zahlung offen, nicht gesendet" });
      return json({ fehler: "nicht_gesperrt" }, 409);
    }
  }
  if (String(erwarteter_modus) !== String(d.modus)) {
    await merke({ status: "fehler", fehler: "Modus geändert, nicht gesendet" });
    return json({ fehler: "modus_geaendert", modus: d.modus }, 409);
  }
  // W14: Der Bildschirm zeigte andere Empfänger (z. B. Eltern-Wahl an einem anderen PC geändert): nichts senden.
  // Ältere Büro-Seiten schicken die Liste nicht mit: dann wie bisher.
  if (d.modus === "echt" && Array.isArray(erwartete_empfaenger)) {
    const norm = (l: unknown[]) => l.map((x) => String(x).trim().toLowerCase()).sort().join(",");
    const ist = Array.isArray(d.empfaenger_alle) && d.empfaenger_alle.length ? d.empfaenger_alle : [d.empfaenger];
    if (norm(erwartete_empfaenger) !== norm(ist)) {
      await merke({ status: "fehler", fehler: "Empfänger geändert, nicht gesendet" });
      return json({ fehler: "empfaenger_geaendert" }, 409);
    }
  }
  const scheitern = async (kurz: string, status = 500) => {
    await merke({ status: "fehler", fehler: kurz.slice(0, 200) });
    return json({ fehler: "versand_fehlgeschlagen", grund: kurz.split(":")[0].slice(0, 40) }, status);
  };

  try {
    const { data: key, error: keyErr } = await service.rpc("get_decrypted_secret", { secret_name: "resend_api_key" });
    if (keyErr || !key) return await scheitern("Resend-Schluessel fehlt");

    // Sichere Seite: alles außer „echt“ gilt als Test
    if (d.modus !== "echt") d.modus = "test";
    // W14: Empfänger nach der Wahl in der Akte (Schüler, Eltern oder beide); bestimmt hat sie der Server (RPC).
    // Test: nur die Test-Adresse. Ältere Datenbank ohne empfaenger_alle: wie bisher nur „empfaenger“.
    const empfaenger: string[] = d.modus === "echt" && Array.isArray(d.empfaenger_alle) && d.empfaenger_alle.length
      ? d.empfaenger_alle.map(String).slice(0, 2) : [String(d.empfaenger)];
    const png = await qrPng(epcText(d));
    const kurzVon = (e: string) => e.slice(0, 1) + "***@" + e.split("@")[1];
    // W14 (Hauptsitzung 24.11.): je Empfänger eine eigene Mail, niemand sieht die Adresse des anderen.
    // Bei „beide“ liefert der Server zuerst den Schüler, dann die Eltern: jede Mail bekommt die passende Anrede.
    const anFuer = (i: number) => (d.an === "beide" && empfaenger.length === 2 ? (i === 0 ? "schueler" : "eltern") : d.an);
    const ids: string[] = [], nichtAn: string[] = [], bedient: string[] = [];
    let ersterFehler = "";
    for (let i = 0; i < empfaenger.length; i++) {
      const dm = { ...d, an: anFuer(i) };
      let betrf = betreff(dm);
      if (d.modus === "test" && !betrf.startsWith("[TEST] ")) betrf = "[TEST] " + betrf;
      let grund = "";
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          signal: AbortSignal.timeout(15000),
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: absender(d),
            to: [empfaenger[i]],
            subject: betrf,
            html: mailHtml(dm),
            text: mailText(dm),
            attachments: [{ filename: "girocode.png", content: base64(png), content_type: "image/png", content_id: "girocode" }],
          }),
        });
        const antwort: any = await res.json().catch(() => ({}));
        if (res.ok) { if (antwort?.id) ids.push(String(antwort.id)); bedient.push(empfaenger[i]); continue; }
        grund = "Resend " + res.status + ": " + String(antwort?.message || antwort?.name || "").slice(0, 120);
      } catch (e) {
        grund = "Versand abgebrochen: " + String(e).slice(0, 100); // Zeitgrenze oder Netz (Fable): wie eine Fehlerantwort behandeln
      }
      if (i === 0) return await scheitern(grund, 502); // erste Mail gescheitert: nichts gesendet
      ersterFehler = grund;
      nichtAn.push(anFuer(i) === "eltern" ? "Eltern" : "Schüler");
    }

    const gesendetAm = new Date().toISOString();
    const kurz = bedient.map(kurzVon).join(", "); // nur, wer die Mail wirklich bekommen hat (Verlauf im Büro)
    await merke({ status: "gesendet", resend_id: ids.join(",") || null, gesendet_am: gesendetAm, empfaenger_kurz: kurz,
      fehler: nichtAn.length ? ("Nicht an " + nichtAn.join(", ") + ": " + ersterFehler).slice(0, 200) : null });
    return json({ ok: true, id: d.id, modus: d.modus, gesendet_am: gesendetAm, empfaenger_kurz: kurz, nicht_an: nichtAn.length ? nichtAn : undefined });
  } catch (e) {
    console.warn("zahlungs-mail:", String(e).slice(0, 200));
    return await scheitern("Fehler beim Versand");
  }
});
