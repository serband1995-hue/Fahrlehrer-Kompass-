// Fahrlehrer-Kompass – Erinnerung an eine Frist per Mail, ohne Zahlung (W15 Schritt 5, 🗣 Serband 24.11.2026).
// Büro drückt „Erinnerung schicken“ -> diese Funktion ruft rpc erinnerungs_mail_vorbereiten (prüft ALLES: Rolle, Fahrschule,
// aktiver Schüler, Frist und Warnzeit selbst gerechnet, gemeinsames Limit mit den Zahlungs-Mails, bestimmt den Empfänger selbst;
// Test: nur die Test-Adresse) und verschickt dann über Resend. Gleicher Ablauf wie zahlungs-mail (W11/W14).
// Deploy mit verify_jwt = false (die Funktion prüft den Anmelde-Token über die Datenbank-Funktion selbst). Beim Deploy alle drei
// Dateien mitgeben: index.ts, mail.js, vorlagen.js (= Kopie von kompass-vorlagen.js). Nie die volle Empfänger-Adresse zurückgeben.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { absender, betreff, mailHtml, mailText } from "./mail.js";

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
  const { requester_token, buero_sitzung, schueler_id, art, erwarteter_modus, erwartete_empfaenger } = body || {};
  if (!requester_token) return json({ fehler: "nicht_angemeldet" }, 401);
  if (!schueler_id || !art || !["test", "echt"].includes(String(erwarteter_modus))) return json({ fehler: "ungueltige_anfrage" }, 400);

  const headers: Record<string, string> = { Authorization: "Bearer " + requester_token };
  if (buero_sitzung) headers["x-buero-sitzung"] = String(buero_sitzung);
  const user = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, { global: { headers }, auth: { persistSession: false } });
  const service = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

  const { data: d, error: rpcErr } = await user.rpc("erinnerungs_mail_vorbereiten", { p_schueler: String(schueler_id), p_art: String(art) });
  if (rpcErr) return json({ fehler: "vorbereiten_fehlgeschlagen" }, 400);
  if (!d || d.fehler || !d.ok) return json({ fehler: d?.fehler || "unbekannt" }, 400);

  const merke = async (felder: Record<string, unknown>) => {
    const { error } = await service.from("erinnerungs_mails").update(felder).eq("id", d.id);
    if (error) console.warn("erinnerungs_mails update:", error.message);
  };
  // Der Bildschirm zeigte einen anderen Modus oder andere Empfänger: nichts senden (wie zahlungs-mail)
  if (String(erwarteter_modus) !== String(d.modus)) {
    await merke({ status: "fehler", fehler: "Modus geändert, nicht gesendet" });
    return json({ fehler: "modus_geaendert", modus: d.modus }, 409);
  }
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
    if (d.modus !== "echt") d.modus = "test"; // sichere Seite
    const empfaenger: string[] = d.modus === "echt" && Array.isArray(d.empfaenger_alle) && d.empfaenger_alle.length
      ? d.empfaenger_alle.map(String).slice(0, 2) : [String(d.empfaenger)];
    const kurzVon = (e: string) => e.slice(0, 1) + "***@" + e.split("@")[1];
    const anFuer = (i: number) => (d.an === "beide" && empfaenger.length === 2 ? (i === 0 ? "schueler" : "eltern") : d.an);
    const ids: string[] = [], nichtAn: string[] = [], bedient: string[] = [];
    let ersterFehler = "";
    for (let i = 0; i < empfaenger.length; i++) {
      const dm = { ...d, an: anFuer(i) };
      let grund = "";
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          signal: AbortSignal.timeout(15000),
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: absender(d), to: [empfaenger[i]], subject: betreff(dm), html: mailHtml(dm), text: mailText(dm) }),
        });
        const antwort: any = await res.json().catch(() => ({}));
        if (res.ok) { if (antwort?.id) ids.push(String(antwort.id)); bedient.push(empfaenger[i]); continue; }
        grund = "Resend " + res.status + ": " + String(antwort?.message || antwort?.name || "").slice(0, 120);
      } catch (e) {
        grund = "Versand abgebrochen: " + String(e).slice(0, 100);
      }
      if (i === 0) return await scheitern(grund, 502);
      ersterFehler = grund;
      nichtAn.push(anFuer(i) === "eltern" ? "Eltern" : "Schüler");
    }
    const gesendetAm = new Date().toISOString();
    const kurz = bedient.map(kurzVon).join(", ");
    await merke({ status: "gesendet", resend_id: ids.join(",") || null, gesendet_am: gesendetAm, empfaenger_kurz: kurz,
      fehler: nichtAn.length ? ("Nicht an " + nichtAn.join(", ") + ": " + ersterFehler).slice(0, 200) : null });
    return json({ ok: true, id: d.id, modus: d.modus, gesendet_am: gesendetAm, empfaenger_kurz: kurz, frist_am: d.frist_am, nicht_an: nichtAn.length ? nichtAn : undefined });
  } catch (e) {
    console.warn("erinnerungs-mail:", String(e).slice(0, 200));
    return await scheitern("Fehler beim Versand");
  }
});
